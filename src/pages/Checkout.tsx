// src/pages/Checkout.tsx
import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Tables } from '@/integrations/supabase/types';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useQuoteCurrency } from '@/hooks/useCurrency';
import { useCart } from '@/hooks/useCart';
import { CartItem } from '@/stores/cartStore';
import { usePaymentGateways } from '@/hooks/usePaymentGateways';
import { useLocationDetection } from '@/hooks/useLocationDetection';
import { useStatusManagement } from '@/hooks/useStatusManagement';
import { useEmailNotifications } from '@/hooks/useEmailNotifications';
import { PaymentGateway, PaymentRequest } from '@/types/payment';
import {
  quoteAddressToCheckoutForm,
  checkoutFormToQuoteAddress,
  isAddressComplete,
  extractQuoteShippingAddress,
} from '@/lib/addressUtils';
import { checkoutSessionService } from '@/services/CheckoutSessionService';
import { formatBankDetailsForEmail } from '@/lib/bankDetailsFormatter';
import { logger } from '@/utils/logger';

// Import focused components
import { CheckoutSummary } from '@/components/checkout/CheckoutSummary';
import { CheckoutAddressForm } from '@/components/checkout/CheckoutAddressForm';
import { PaymentMethodSection } from '@/components/checkout/PaymentMethodSection';
import { PaymentProcessor } from '@/components/checkout/PaymentProcessor';
import { CheckoutActions } from '@/components/checkout/CheckoutActions';
import { CheckoutModals } from '@/components/checkout/CheckoutModals';

type QuoteType = Tables<'quotes'>;

interface AddressFormData {
  address_line1: string;
  address_line2?: string;
  city: string;
  state_province_region: string;
  postal_code: string;
  country: string;
  destination_country?: string;
  recipient_name?: string;
  phone?: string;
  is_default: boolean;
}

interface ContactFormData {
  email: string;
  phone: string;
}

interface QRPaymentData {
  qrCodeUrl: string;
  transactionId: string;
  gateway: string;
}

export default function Checkout() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  
  // Hooks
  const { userProfile } = useUserProfile();
  const { detectedCountry, isLocationLoading } = useLocationDetection();
  const { items: cartItems, loadFromServer, removeFromCart } = useCart();
  const { sendOrderConfirmationEmail } = useEmailNotifications();
  const { findStatusForPaymentMethod } = useStatusManagement();

  // Core state
  const [addressFormData, setAddressFormData] = useState<AddressFormData>({
    address_line1: '',
    address_line2: '',
    city: '',
    state_province_region: '',
    postal_code: '',
    country: '',
    recipient_name: '',
    phone: '',
    is_default: false,
  });

  const [guestContact, setGuestContact] = useState<ContactFormData>({
    email: '',
    phone: '',
  });

  const [paymentMethod, setPaymentMethod] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Modal states
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [stripeClientSecret, setStripeClientSecret] = useState<string | null>(null);
  const [showQRModal, setShowQRModal] = useState(false);
  const [qrPaymentData, setQrPaymentData] = useState<QRPaymentData | null>(null);
  const [showPaymentStatus, setShowPaymentStatus] = useState(false);
  const [currentTransactionId, setCurrentTransactionId] = useState<string | null>(null);

  // Derived state
  const guestQuoteId = searchParams.get('quotes');
  const isGuestCheckout = !user || user.is_anonymous;
  const shippingCountry = addressFormData.country || detectedCountry || 'US';
  const cartQuoteIds = cartItems.map(item => item.quote.id);
  const totalAmount = cartItems.reduce((sum, item) => sum + (item.quote.calculation_data?.total_cost_usd || 0), 0);

  // Currency formatting (use first quote for currency context)
  const { formatAmount, quoteCurrency: paymentCurrency } = useQuoteCurrency(cartItems[0]?.quote);

  // Payment gateways
  const { 
    availableGateways, 
    isLoading: gatewaysLoading 
  } = usePaymentGateways({
    country: shippingCountry,
    currency: paymentCurrency,
    amount: totalAmount
  });

  // Saved addresses query
  const { data: savedAddresses = [], isLoading: addressesLoading } = useQuery({
    queryKey: ['delivery_addresses', user?.id],
    queryFn: async () => {
      if (!user || user.is_anonymous) return [];
      const { data, error } = await supabase
        .from('delivery_addresses')
        .select('*')
        .eq('user_id', user.id)
        .order('is_default', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user && !user.is_anonymous,
  });

  // Mutations
  const updateQuotesMutation = useMutation({
    mutationFn: async ({ ids, status, method, paymentStatus }: {
      ids: string[];
      status: string;
      method: string;
      paymentStatus: 'paid' | 'unpaid' | 'processing';
    }) => {
      const { error } = await supabase
        .from('quotes')
        .update({ 
          status, 
          payment_method: method,
          payment_status: paymentStatus 
        })
        .in('id', ids);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      navigate('/dashboard/orders');
    },
  });

  const addAddressMutation = useMutation({
    mutationFn: async (addressData: AddressFormData) => {
      if (!user || user.is_anonymous) return;
      
      const { error } = await supabase
        .from('delivery_addresses')
        .insert({
          user_id: user.id,
          ...addressData,
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery_addresses'] });
      setShowAddressModal(false);
      toast({ title: 'Address saved successfully' });
    },
  });

  // Load initial data
  useEffect(() => {
    if (user && !user.is_anonymous) {
      loadFromServer(user.id);
    }

    // Pre-populate address if available
    if (savedAddresses.length > 0) {
      const defaultAddress = savedAddresses.find(addr => addr.is_default) || savedAddresses[0];
      if (defaultAddress) {
        setAddressFormData({
          address_line1: defaultAddress.address_line1 || '',
          address_line2: defaultAddress.address_line2 || '',
          city: defaultAddress.city || '',
          state_province_region: defaultAddress.state_province_region || '',
          postal_code: defaultAddress.postal_code || '',
          country: defaultAddress.country || shippingCountry,
          recipient_name: defaultAddress.recipient_name || userProfile?.full_name || '',
          phone: defaultAddress.phone || '',
          is_default: defaultAddress.is_default || false,
        });
      }
    }
  }, [user, savedAddresses, userProfile, shippingCountry]);

  // Validation
  const getValidationErrors = (): string[] => {
    const errors: string[] = [];
    
    if (cartItems.length === 0) {
      errors.push('No items in cart');
    }
    
    if (!isAddressComplete(addressFormData)) {
      errors.push('Complete shipping address required');
    }
    
    if (isGuestCheckout && !guestContact.email.includes('@')) {
      errors.push('Valid email address required');
    }
    
    if (!paymentMethod) {
      errors.push('Payment method selection required');
    }
    
    return errors;
  };

  const validationErrors = getValidationErrors();
  const canPlaceOrder = validationErrors.length === 0 && !isProcessing;

  // Event handlers
  const handlePlaceOrder = async () => {
    if (!canPlaceOrder) return;

    setIsProcessing(true);
    
    try {
      // Create payment request
      const paymentRequest: PaymentRequest = {
        amount: totalAmount,
        currency: paymentCurrency,
        quoteIds: cartQuoteIds,
        customerInfo: {
          name: isGuestCheckout 
            ? addressFormData.recipient_name || 'Guest Customer'
            : addressFormData.recipient_name || userProfile?.full_name || '',
          email: isGuestCheckout ? guestContact.email : user?.email || '',
          phone: addressFormData.phone || guestContact.phone || '',
          address: isAddressComplete(addressFormData) ? {
            line1: addressFormData.address_line1,
            city: addressFormData.city,
            state: addressFormData.state_province_region,
            postal_code: addressFormData.postal_code,
            country: addressFormData.country || shippingCountry,
          } : undefined,
        },
      };

      // Process payment based on method
      await processPayment(paymentRequest);
      
    } catch (error) {
      console.error('Order placement failed:', error);
      toast({
        title: 'Order Failed',
        description: 'There was an error processing your order. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const processPayment = async (paymentRequest: PaymentRequest) => {
    const gateway = availableGateways.find(g => g.id === paymentMethod);
    if (!gateway) throw new Error('Payment gateway not found');

    // Handle different payment methods
    if (paymentMethod === 'stripe') {
      // Create Stripe payment intent
      const response = await fetch('/api/payments/stripe/create-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(paymentRequest),
      });
      
      const data = await response.json();
      if (data.client_secret) {
        setStripeClientSecret(data.client_secret);
      }
    } else if (['bank_transfer', 'wire_transfer'].includes(paymentMethod)) {
      // Handle bank transfers
      await handleBankTransfer(paymentRequest);
    } else {
      // Handle other payment gateways
      await handleExternalPayment(paymentRequest);
    }
  };

  const handleBankTransfer = async (paymentRequest: PaymentRequest) => {
    // Update quotes status
    const statusConfig = findStatusForPaymentMethod(paymentMethod);
    const pendingStatus = statusConfig?.name || 'payment_pending';

    await updateQuotesMutation.mutateAsync({
      ids: cartQuoteIds,
      status: pendingStatus,
      method: paymentMethod,
      paymentStatus: 'unpaid',
    });

    // Send email with bank details
    if (paymentRequest.customerInfo.email) {
      const bankDetails = formatBankDetailsForEmail(paymentMethod, totalAmount, paymentCurrency);
      await sendOrderConfirmationEmail(
        paymentRequest.customerInfo.email,
        cartQuoteIds[0],
        bankDetails
      );
    }

    toast({
      title: 'Order Placed',
      description: 'Bank transfer details have been sent to your email.',
    });
  };

  const handleExternalPayment = async (paymentRequest: PaymentRequest) => {
    // Placeholder for external payment processing
    console.log('Processing external payment:', paymentMethod, paymentRequest);
    
    setCurrentTransactionId(`${paymentMethod.toUpperCase()}_${Date.now()}`);
    setShowPaymentStatus(true);
  };

  // Component event handlers
  const handleRemoveItem = (quoteId: string) => {
    removeFromCart(quoteId);
  };

  const handleAddAddress = (addressData: AddressFormData) => {
    if (!user || user.is_anonymous) {
      // For guests, just update the form
      setAddressFormData(addressData);
      setShowAddressModal(false);
    } else {
      // For authenticated users, save to database
      addAddressMutation.mutate(addressData);
    }
  };

  const handleShowAuthModal = () => {
    setShowAuthModal(true);
  };

  const handleSendGuestLink = () => {
    // TODO: Implement guest checkout link email
    toast({
      title: 'Email Sent',
      description: 'A checkout link has been sent to your email.',
    });
  };

  const handleStripeSuccess = async (paymentIntent: any) => {
    console.log('Payment Succeeded!', paymentIntent);

    try {
      const statusConfig = findStatusForPaymentMethod('stripe');
      const processingStatus = statusConfig?.name || 'processing';

      await updateQuotesMutation.mutateAsync({
        ids: cartQuoteIds,
        status: processingStatus,
        method: 'stripe',
        paymentStatus: 'paid',
      });

      toast({
        title: 'Payment Successful',
        description: 'Your payment has been processed successfully.',
      });

      setStripeClientSecret(null);
    } catch (error) {
      console.error('Error updating quotes after payment:', error);
      toast({
        title: 'Payment Successful',
        description: 'Payment completed, but there was an issue updating your order. Please contact support.',
      });
      setStripeClientSecret(null);
    }
  };

  const handleStripeError = (error: string) => {
    console.error('Payment Failed:', error);
    toast({
      title: 'Payment Failed',
      description: error || 'There was an issue processing your payment. Please try again.',
      variant: 'destructive',
    });
    setStripeClientSecret(null);
  };

  const handleQRSuccess = () => {
    toast({
      title: 'Payment Successful',
      description: 'Your payment has been processed successfully.',
    });
    setShowQRModal(false);
    navigate('/dashboard/orders');
  };

  const handleQRError = (error: string) => {
    toast({
      title: 'Payment Failed',
      description: error,
      variant: 'destructive',
    });
    setShowQRModal(false);
  };

  const handlePaymentStatusChange = (status: string) => {
    console.log('Payment status changed:', status);
  };

  const loading = gatewaysLoading || addressesLoading || isLocationLoading;

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Checkout</h1>
        <p className="text-gray-600 mt-2">
          Complete your order and arrange shipping for your items
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content - Left Column */}
        <div className="lg:col-span-2 space-y-8">
          {/* Order Summary */}
          <CheckoutSummary
            items={cartItems}
            loading={loading}
            onRemoveItem={handleRemoveItem}
          />

          {/* Address Form */}
          <CheckoutAddressForm
            addressFormData={addressFormData}
            setAddressFormData={setAddressFormData}
            guestContact={guestContact}
            setGuestContact={setGuestContact}
            isGuestCheckout={isGuestCheckout}
            shippingCountry={shippingCountry}
            savedAddresses={savedAddresses}
            onCreateNewAddress={() => setShowAddressModal(true)}
            loading={loading}
          />

          {/* Payment Method */}
          <PaymentMethodSection
            paymentMethod={paymentMethod}
            setPaymentMethod={setPaymentMethod}
            paymentCurrency={paymentCurrency}
            shippingCountry={shippingCountry}
            availableGateways={availableGateways}
            isProcessing={isProcessing}
            loading={loading}
          />
        </div>

        {/* Sidebar - Right Column */}
        <div className="lg:col-span-1">
          <CheckoutActions
            addressFormData={addressFormData}
            guestContact={guestContact}
            paymentMethod={paymentMethod}
            isGuestCheckout={isGuestCheckout}
            isProcessing={isProcessing}
            hasItems={cartItems.length > 0}
            onPlaceOrder={handlePlaceOrder}
            onShowAuthModal={handleShowAuthModal}
            onSendGuestLink={handleSendGuestLink}
            canPlaceOrder={canPlaceOrder}
            validationErrors={validationErrors}
            totalAmount={totalAmount}
            paymentCurrency={paymentCurrency}
            loading={loading}
          />
        </div>
      </div>

      {/* Payment Processing Components */}
      <PaymentProcessor
        stripeClientSecret={stripeClientSecret}
        onCancelStripePayment={() => setStripeClientSecret(null)}
        paymentCurrency={paymentCurrency}
        totalAmount={totalAmount}
        customerInfo={{
          name: isGuestCheckout
            ? addressFormData.recipient_name || 'Guest Customer'
            : addressFormData.recipient_name || userProfile?.full_name || '',
          email: isGuestCheckout ? guestContact.email : user?.email || '',
          phone: addressFormData.phone || '',
          address: isAddressComplete(addressFormData)
            ? {
                line1: addressFormData.address_line1,
                city: addressFormData.city,
                state: addressFormData.state_province_region,
                postal_code: addressFormData.postal_code,
                country: addressFormData.country || shippingCountry || 'US',
              }
            : undefined,
        }}
        onStripeSuccess={handleStripeSuccess}
        onStripeError={handleStripeError}
        showQRModal={showQRModal}
        setShowQRModal={setShowQRModal}
        qrPaymentData={qrPaymentData}
        onQRSuccess={handleQRSuccess}
        onQRError={handleQRError}
        showPaymentStatus={showPaymentStatus}
        setShowPaymentStatus={setShowPaymentStatus}
        currentTransactionId={currentTransactionId}
        paymentMethod={paymentMethod}
        onPaymentStatusChange={handlePaymentStatusChange}
      />

      {/* Modals */}
      <CheckoutModals
        showAddressModal={showAddressModal}
        setShowAddressModal={setShowAddressModal}
        onSaveAddress={handleAddAddress}
        addressFormData={addressFormData}
        shippingCountry={shippingCountry}
        isGuestCheckout={isGuestCheckout}
        addAddressLoading={addAddressMutation.isPending}
        showAuthModal={showAuthModal}
        setShowAuthModal={setShowAuthModal}
        guestContact={guestContact}
        guestQuoteId={guestQuoteId}
        onAuthSuccess={() => console.log('Auth success handled')}
        loadFromServer={loadFromServer}
      />
    </div>
  );
}