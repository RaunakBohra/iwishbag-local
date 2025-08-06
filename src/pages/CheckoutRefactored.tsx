import React, { useState, useEffect, useMemo } from 'react';
import { customerDisplayUtils } from '@/utils/customerDisplayUtils';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, ShoppingCart, Truck } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { ProgressiveAuthModal } from '@/components/auth/ProgressiveAuthModal';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useCart } from '@/hooks/useCart';
import { useAllCountries } from '@/hooks/useAllCountries';
import { useLocationDetection } from '@/hooks/useLocationDetection';
import { PaymentMethodSelector } from '@/components/payment/PaymentMethodSelector';
import { useStatusManagement } from '@/hooks/useStatusManagement';
import { QRPaymentModal } from '@/components/payment/QRPaymentModal';
import { PaymentStatusTracker } from '@/components/payment/PaymentStatusTracker';
import { PaymentGateway, PaymentRequest } from '@/types/payment';
import {
  isAddressComplete,
} from '@/lib/addressUtils';
import { checkoutSessionService } from '@/services/CheckoutSessionService';
import { useEmailNotifications } from '@/hooks/useEmailNotifications';
import { formatBankDetailsForEmail } from '@/lib/bankDetailsFormatter';
import { AddressModal } from '@/components/checkout/AddressModal';

// Import our refactored components
import { OrderSummary } from '@/components/checkout/OrderSummary';
import { CurrencySelection } from '@/components/checkout/CurrencySelection';
import { ContactInformation } from '@/components/checkout/ContactInformation';
import { CheckoutAddressManagement } from '@/components/checkout/CheckoutAddressManagement';

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
  save_to_profile?: boolean;
}

export default function CheckoutRefactored() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();

  // Cart store with enforced loading
  const {
    items: cartItems,
    selectedItems: _selectedItems,
    selectedItemsTotal: _selectedItemsTotal,
    formattedSelectedTotal: _formattedSelectedTotal,
    getSelectedCartItems: _getSelectedCartItems,
    isLoading: cartLoading,
    hasLoadedFromServer,
    loadFromServer,
  } = useCart();

  // Get selected quote IDs from URL params
  const selectedQuoteIds = searchParams.get('quotes')?.split(',') || [];

  // Check if this is a guest checkout
  const guestQuoteId = searchParams.get('quote');
  const isGuestCheckout = !!guestQuoteId;

  // State
  const [selectedAddress, setSelectedAddress] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentGateway>('bank_transfer');
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [qrPaymentData, setQrPaymentData] = useState<{
    qrCodeUrl: string;
    transactionId: string;
    gateway: PaymentGateway;
  } | null>(null);
  const [showPaymentStatus, setShowPaymentStatus] = useState(false);
  const [currentTransactionId, setCurrentTransactionId] = useState<string>('');

  // Inline editing state
  const [isEditingContact, setIsEditingContact] = useState(false);
  const [editEmail, setEditEmail] = useState('');
  const [isSavingContact, setIsSavingContact] = useState(false);
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
    save_to_profile: true,
  });

  // Guest contact info (for guest checkout) - simplified to email only
  const [guestContact, setGuestContact] = useState({
    email: '',
  });

  // Guest checkout flow state
  const [guestFlowChoice, setGuestFlowChoice] = useState<'guest' | 'member' | null>(null);
  const [contactStepCompleted, setContactStepCompleted] = useState(false);

  // Auth modal state
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Guest currency selection (defaults to destination country currency)
  const [guestSelectedCurrency, setGuestSelectedCurrency] = useState<string>('');

  // Logged-in user currency override (allows changing from profile default)
  const [userSelectedCurrency, setUserSelectedCurrency] = useState<string>('');

  const { data: userProfile } = useUserProfile();
  const { data: countries } = useAllCountries();
  const { sendBankTransferEmail } = useEmailNotifications();
  const { findStatusForPaymentMethod } = useStatusManagement();

  // Location detection for currency
  const { data: locationData, isLoading: locationLoading } = useLocationDetection();

  // Fetch guest quote if this is a guest checkout
  const {
    data: guestQuote,
    isLoading: guestQuoteLoading,
    refetch: refetchGuestQuote,
  } = useQuery({
    queryKey: ['guest-quote', guestQuoteId],
    queryFn: async () => {
      if (!guestQuoteId) return null;

      const { data, error } = await supabase
        .from('quotes')
        .select('*')
        .eq('id', guestQuoteId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!guestQuoteId,
  });

  // Get selected cart items with fallback to guest quote
  const selectedCartItems = useMemo(() => {
    if (isGuestCheckout && guestQuote) {
      // Convert guest quote to cart item format
      return [{
        quoteId: guestQuote.id,
        productName: guestQuote.items?.[0]?.name || 'Quote Item',
        quantity: guestQuote.items?.[0]?.quantity || 1,
        finalTotal: guestQuote.total_usd || 0,
        finalCurrency: guestQuote.customer_currency || 'USD',
        countryCode: guestQuote.destination_country || 'US',
        purchaseCountryCode: guestQuote.origin_country || 'US',
        destinationCountryCode: guestQuote.destination_country || 'IN'
      }];
    }
    return _getSelectedCartItems();
  }, [isGuestCheckout, guestQuote, _getSelectedCartItems]);

  // Fetch user addresses (if logged in)
  const {
    data: addresses,
    isLoading: addressesLoading,
  } = useQuery({
    queryKey: ['user-addresses', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('delivery_addresses')
        .select('*')
        .eq('user_id', user.id)
        .order('is_default', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id && !isGuestCheckout,
  });

  // Currency and location detection
  const autoDetectedCurrency = locationData?.currency || 'USD';
  
  // Available currencies based on selected items
  const availableCurrencies = useMemo(() => {
    if (!selectedCartItems.length) return null;
    
    // For simplicity, return common currencies
    const currencies = [
      { code: 'USD', symbol: '$' },
      { code: 'INR', symbol: '₹' },
      { code: 'NPR', symbol: 'Rs' },
      { code: 'EUR', symbol: '€' },
      { code: 'GBP', symbol: '£' },
    ];
    
    return currencies;
  }, [selectedCartItems]);

  // Purchase and shipping countries
  const purchaseCountry = selectedCartItems[0]?.purchaseCountryCode;
  const shippingCountry = selectedCartItems[0]?.destinationCountryCode;

  // Can place order validation
  const canPlaceOrder = useMemo(() => {
    if (selectedCartItems.length === 0) return false;
    if (!paymentMethod) return false;
    
    if (isGuestCheckout) {
      return contactStepCompleted && guestContact.email && isAddressComplete(addressFormData);
    } else {
      return selectedAddress && addresses && addresses.length > 0;
    }
  }, [selectedCartItems, paymentMethod, isGuestCheckout, contactStepCompleted, guestContact, addressFormData, selectedAddress, addresses]);

  // Contact editing functions
  const handleEditContact = () => {
    setEditEmail(guestQuote?.email || '');
    setIsEditingContact(true);
  };

  const handleCancelEdit = () => {
    setIsEditingContact(false);
    setEditEmail('');
  };

  const handleSaveContact = async () => {
    if (!editEmail) {
      toast({
        title: 'Error',
        description: 'Please enter an email address',
        variant: 'destructive',
      });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(editEmail)) {
      toast({
        title: 'Error',
        description: 'Please enter a valid email address',
        variant: 'destructive',
      });
      return;
    }

    setIsSavingContact(true);
    try {
      const { error } = await supabase
        .from('quotes')
        .update({
          email: editEmail,
        })
        .eq('id', guestQuoteId);

      if (error) throw error;

      await refetchGuestQuote();

      toast({
        title: 'Success',
        description: 'Email updated successfully',
      });

      setIsEditingContact(false);
    } catch (error) {
      console.error('Error updating email:', error);
      toast({
        title: 'Error',
        description: 'Failed to update email',
        variant: 'destructive',
      });
    } finally {
      setIsSavingContact(false);
    }
  };

  const handlePlaceOrder = async () => {
    if (!canPlaceOrder) {
      toast({
        title: 'Cannot place order',
        description: 'Please complete all required fields',
        variant: 'destructive',
      });
      return;
    }

    setIsProcessing(true);
    try {
      // Simulate order placement
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast({
        title: 'Order placed successfully!',
        description: 'You will receive a confirmation email shortly.',
      });
      
      navigate('/order-confirmation');
    } catch (error) {
      console.error('Order placement error:', error);
      toast({
        title: 'Order failed',
        description: 'Please try again or contact support',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const saveAddressHandler = async (addressData: AddressFormData) => {
    // Implementation for saving address
    console.log('Saving address:', addressData);
  };

  // Loading states
  if (cartLoading || guestQuoteLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="h-10 w-10 animate-spin text-muted-foreground mb-2" />
        <span className="text-muted-foreground text-sm">
          {isGuestCheckout ? 'Loading your quote...' : 'Loading your cart...'}
        </span>
      </div>
    );
  }

  if (addressesLoading && !isGuestCheckout) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <h2 className="text-xl font-semibold">Preparing your checkout...</h2>
          <p className="text-muted-foreground">Please wait while we load your order details.</p>
        </div>
      </div>
    );
  }

  // Show no items message only after cart has loaded and is empty
  if (!cartLoading && !guestQuoteLoading && selectedCartItems.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="py-12 text-center space-y-4">
            <ShoppingCart className="h-16 w-16 text-muted-foreground mx-auto" />
            <h2 className="text-xl font-semibold">No items selected</h2>
            <p className="text-muted-foreground">Please select items from your cart to checkout.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-medium text-gray-900 mb-2">Checkout (Refactored)</h1>
            <p className="text-gray-600 text-sm">Complete your order securely</p>
          </div>

          {/* Shipping Route Display */}
          {purchaseCountry && shippingCountry && (
            <Card className="mb-6 bg-white border border-gray-200 shadow-sm">
              <CardContent className="py-4">
                <div className="flex items-center justify-center space-x-8">
                  <div className="text-center">
                    <div className="text-xs font-medium text-gray-500 mb-1">From</div>
                    <div className="text-sm font-medium text-gray-900">
                      {countries?.find((c) => c.code === purchaseCountry)?.name || purchaseCountry}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-px bg-gray-300"></div>
                    <Truck className="h-4 w-4 text-gray-400" />
                    <div className="w-8 h-px bg-gray-300"></div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs font-medium text-gray-500 mb-1">To</div>
                    <div className="text-sm font-medium text-gray-900">
                      {countries?.find((c) => c.code === shippingCountry)?.name || shippingCountry}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid gap-6 lg:grid-cols-5">
            {/* Main Checkout Form */}
            <div className="lg:col-span-3 space-y-6">
              {/* Currency Selection */}
              <CurrencySelection
                availableCurrencies={availableCurrencies}
                isGuestCheckout={isGuestCheckout}
                guestSelectedCurrency={guestSelectedCurrency}
                onGuestCurrencyChange={setGuestSelectedCurrency}
                userSelectedCurrency={userSelectedCurrency}
                onUserCurrencyChange={setUserSelectedCurrency}
                userProfile={userProfile}
                autoDetectedCurrency={autoDetectedCurrency}
                locationData={locationData}
                isProcessing={isProcessing}
              />

              {/* Contact Information (Guest Checkout Only) */}
              <ContactInformation
                isGuestCheckout={isGuestCheckout}
                contactStepCompleted={contactStepCompleted}
                guestFlowChoice={guestFlowChoice}
                guestContact={guestContact}
                isEditingContact={isEditingContact}
                editEmail={editEmail}
                isSavingContact={isSavingContact}
                onContactStepCompletedChange={setContactStepCompleted}
                onGuestFlowChoiceChange={setGuestFlowChoice}
                onGuestContactChange={setGuestContact}
                onEditContactToggle={setIsEditingContact}
                onEditEmailChange={setEditEmail}
                onShowAuthModal={() => setShowAuthModal(true)}
                onSaveContact={handleSaveContact}
                onCancelEdit={handleCancelEdit}
              />

              {/* Address Management */}
              <CheckoutAddressManagement
                addresses={addresses}
                selectedAddress={selectedAddress}
                onSelectedAddressChange={setSelectedAddress}
                onShowAddressModal={() => setShowAddressModal(true)}
                isGuestCheckout={isGuestCheckout}
                addressFormData={addressFormData}
                onAddressFormDataChange={setAddressFormData}
                countries={countries}
              />

              {/* Payment Method Selector */}
              {(contactStepCompleted || !isGuestCheckout) && (
                <Card className="bg-white border border-gray-200 shadow-sm">
                  <PaymentMethodSelector
                    selectedMethod={paymentMethod}
                    onMethodChange={setPaymentMethod}
                    availableMethods={['bank_transfer', 'stripe', 'paypal']}
                    destinationCountry={shippingCountry || 'US'}
                  />
                </Card>
              )}
            </div>

            {/* Order Summary Sidebar */}
            <OrderSummary
              selectedCartItems={selectedCartItems}
              canPlaceOrder={canPlaceOrder}
              isProcessing={isProcessing}
              isGuestCheckout={isGuestCheckout}
              addresses={addresses}
              onPlaceOrder={handlePlaceOrder}
            />
          </div>
        </div>
      </div>

      {/* QR Payment Modal */}
      {qrPaymentData && (
        <QRPaymentModal
          isOpen={showQRModal}
          onClose={() => setShowQRModal(false)}
          gateway={qrPaymentData.gateway}
          qrCodeUrl={qrPaymentData.qrCodeUrl}
          transactionId={qrPaymentData.transactionId}
          amount={selectedCartItems.reduce((sum, item) => sum + item.finalTotal, 0)}
          currency={guestSelectedCurrency || userSelectedCurrency || 'USD'}
        />
      )}

      {/* Payment Status Tracker */}
      {showPaymentStatus && currentTransactionId && (
        <PaymentStatusTracker
          isOpen={showPaymentStatus}
          onClose={() => setShowPaymentStatus(false)}
          transactionId={currentTransactionId}
          gateway={paymentMethod}
        />
      )}

      {/* Address Modal */}
      <AddressModal
        open={showAddressModal}
        onOpenChange={setShowAddressModal}
        onSave={saveAddressHandler}
        isGuest={isGuestCheckout}
      />

      {/* Auth Modal for guest to member conversion */}
      <Dialog open={showAuthModal} onOpenChange={setShowAuthModal}>
        <DialogContent className="max-w-md">
          <ProgressiveAuthModal
            isOpen={showAuthModal}
            onClose={() => setShowAuthModal(false)}
            initialMode="signin"
            onSuccess={() => {
              setShowAuthModal(false);
              // Redirect to member checkout flow
              navigate('/checkout');
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}