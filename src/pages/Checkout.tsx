// src/pages/Checkout.tsx
import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  ShoppingCart,
  MapPin,
  CreditCard,
  Loader2,
  Shield,
  Truck,
  Plus,
  Edit3,
  User,
  Phone,
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Tables } from '@/integrations/supabase/types';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useUserCurrency } from '@/hooks/useUserCurrency';
import { useQuoteDisplayCurrency } from '@/hooks/useQuoteDisplayCurrency';
import { useCart } from '@/hooks/useCart';
import { CartItem } from '@/stores/cartStore';
import { usePaymentGateways } from '@/hooks/usePaymentGateways';
import { useAllCountries } from '@/hooks/useAllCountries';
import { currencyService } from '@/services/CurrencyService';
import { PaymentMethodSelector } from '@/components/payment/PaymentMethodSelector';
import { StripePaymentForm } from '@/components/payment/StripePaymentForm';
import { useStatusManagement } from '@/hooks/useStatusManagement';
import { QRPaymentModal } from '@/components/payment/QRPaymentModal';
import { PaymentStatusTracker } from '@/components/payment/PaymentStatusTracker';
import { PaymentGateway, PaymentRequest } from '@/types/payment';
import {
  quoteAddressToCheckoutForm,
  checkoutFormToQuoteAddress,
  isAddressComplete,
  extractQuoteShippingAddress,
} from '@/lib/addressUtils';
import { formatAmountForDisplay, getExchangeRate, convertCurrency, getCurrencySymbol } from '@/lib/currencyUtils';
import { checkoutSessionService } from '@/services/CheckoutSessionService';
import { useEmailNotifications } from '@/hooks/useEmailNotifications';
import { formatBankDetailsForEmail } from '@/lib/bankDetailsFormatter';

type QuoteType = Tables<'quotes'>;

// Declare Airwallex SDK types
declare global {
  interface Window {
    AirwallexComponentsSDK?: {
      init: (config: { env: 'demo' | 'prod' | 'staging'; enabledElements: string[] }) => Promise<{
        payments: {
          redirectToCheckout: (params: {
            env: 'demo' | 'prod' | 'staging';
            mode: 'payment' | 'recurring';
            intent_id: string;
            client_secret: string;
            currency: string;
            country_code: string;
            successUrl?: string;
            failUrl?: string;
          }) => void;
        };
      }>;
    };
  }
}

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

// Component to display checkout item price with proper currency conversion
const CheckoutItemPrice = ({
  item,
  displayCurrency,
  selectedPaymentMethod,
  currencyConversion,
}: {
  item: CartItem;
  displayCurrency?: string;
  selectedPaymentMethod?: string;
  currencyConversion?: { rate: number; source: string; confidence: string };
}) => {
  // Always call hooks at the top
  const { data: _userProfile } = useUserProfile();

  // Create mock quote for hook with correct field mappings
  const mockQuote = {
    id: item.quoteId,
    origin_country: item.purchaseCountryCode || item.countryCode, // Where buying from
    destination_country: item.destinationCountryCode || item.countryCode, // Where shipping to
    shipping_address: {
      destination_country: item.destinationCountryCode || item.countryCode,
    },
  };

  const { formatAmount } = useQuoteDisplayCurrency({
    quote: mockQuote as QuoteType,
  });

  // Determine gateway type
  const isLocalGateway = selectedPaymentMethod && ['khalti', 'fonepay', 'esewa', 'payu'].includes(selectedPaymentMethod);
  const isInternationalGateway = selectedPaymentMethod && ['paypal', 'stripe', 'airwallex'].includes(selectedPaymentMethod);
  
  // Get quote currency and amount
  const quoteCurrency = item.finalCurrency || 'USD';
  const quoteAmount = item.finalTotal || 0;
  
  // Show currency conversion info only when gateway currency differs from quote currency
  if (selectedPaymentMethod && isLocalGateway && quoteCurrency === 'USD') {
    // Local gateway with USD quote - show conversion using dynamic rate
    const convertedAmount = currencyConversion?.rate 
      ? (quoteAmount * currencyConversion.rate).toFixed(0)
      : (quoteAmount * 133).toFixed(0); // fallback to hardcoded
    return (
      <div className="text-right">
        <div className="text-sm text-muted-foreground">
          ${quoteAmount.toFixed(2)} USD
        </div>
        <div className="font-medium">
          ≈ {getCurrencySymbol(displayCurrency || 'NPR')}{convertedAmount} {displayCurrency || 'NPR'}
        </div>
      </div>
    );
  } else if (selectedPaymentMethod && isInternationalGateway && quoteCurrency !== 'USD') {
    // International gateway with local currency quote - show conversion using dynamic rate
    const convertedAmount = currencyConversion?.rate 
      ? (quoteAmount * currencyConversion.rate).toFixed(2)
      : (quoteAmount / 133).toFixed(2); // fallback to hardcoded
    return (
      <div className="text-right">
        <div className="text-sm text-muted-foreground">
          {getCurrencySymbol(quoteCurrency)}{quoteAmount.toFixed(0)} {quoteCurrency}
        </div>
        <div className="font-medium">
          ≈ ${convertedAmount} USD
        </div>
      </div>
    );
  } else {
    // No conversion needed - show original amount
    if (displayCurrency) {
      return <>{formatAmountForDisplay(item.finalTotal, displayCurrency, 1)}</>;
    }
    return <>{formatAmount(item.finalTotal)}</>;
  }
};

// Component to display checkout total with proper currency conversion
const CheckoutTotal = ({
  items,
  displayCurrency,
  selectedPaymentMethod,
  currencyConversion,
}: {
  items: CartItem[];
  displayCurrency?: string;
  selectedPaymentMethod?: string;
  currencyConversion?: { rate: number; source: string; confidence: string };
}) => {
  // Use the first item to determine the quote format (all items should have same destination)
  const firstItem = items[0];

  // Create mock quote for hook with correct field mappings - provide default values to ensure hook is always called consistently
  const mockQuote = {
    id: firstItem?.quoteId || 'default',
    origin_country: firstItem?.purchaseCountryCode || firstItem?.countryCode || 'US',
    destination_country: firstItem?.destinationCountryCode || firstItem?.countryCode || 'US',
    shipping_address: {
      destination_country: firstItem?.destinationCountryCode || firstItem?.countryCode || 'US',
    },
  };

  // Always call hooks at the top with consistent parameters
  const { formatAmount } = useQuoteDisplayCurrency({
    quote: mockQuote as QuoteType,
  });

  if (!firstItem) return <>$0.00</>;

  // Calculate total from all items
  const totalAmount = items.reduce((sum, item) => sum + item.finalTotal, 0);
  
  // Determine gateway type
  const isLocalGateway = selectedPaymentMethod && ['khalti', 'fonepay', 'esewa', 'payu'].includes(selectedPaymentMethod);
  const isInternationalGateway = selectedPaymentMethod && ['paypal', 'stripe', 'airwallex'].includes(selectedPaymentMethod);
  
  // Get quote currency (assuming all items have same currency)
  const quoteCurrency = firstItem.finalCurrency || 'USD';
  
  // Show currency conversion info only when gateway currency differs from quote currency
  if (selectedPaymentMethod && isLocalGateway && quoteCurrency === 'USD') {
    // Local gateway with USD quote - show conversion using dynamic rate
    const convertedAmount = currencyConversion?.rate 
      ? (totalAmount * currencyConversion.rate).toFixed(0)
      : (totalAmount * 133).toFixed(0); // fallback to hardcoded
    return (
      <div className="text-right">
        <div className="text-sm text-muted-foreground">
          ${totalAmount.toFixed(2)} USD
        </div>
        <div className="font-medium">
          ≈ {getCurrencySymbol(displayCurrency || 'NPR')}{convertedAmount} {displayCurrency || 'NPR'}
        </div>
      </div>
    );
  } else if (selectedPaymentMethod && isInternationalGateway && quoteCurrency !== 'USD') {
    // International gateway with local currency quote - show conversion using dynamic rate
    const convertedAmount = currencyConversion?.rate 
      ? (totalAmount * currencyConversion.rate).toFixed(2)
      : (totalAmount / 133).toFixed(2); // fallback to hardcoded
    return (
      <div className="text-right">
        <div className="text-sm text-muted-foreground">
          {getCurrencySymbol(quoteCurrency)}{totalAmount.toFixed(0)} {quoteCurrency}
        </div>
        <div className="font-medium">
          ≈ ${convertedAmount} USD
        </div>
      </div>
    );
  } else {
    // No conversion needed - show original amount
    if (displayCurrency) {
      return <>{formatAmountForDisplay(totalAmount, displayCurrency, 1)}</>;
    }
    return <>{formatAmount(totalAmount)}</>;
  }
};

export default function Checkout() {
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
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [qrPaymentData, setQrPaymentData] = useState<{
    qrCodeUrl: string;
    transactionId: string;
    gateway: PaymentGateway;
  } | null>(null);
  const [showPaymentStatus, setShowPaymentStatus] = useState(false);
  const [currentTransactionId, setCurrentTransactionId] = useState<string>('');
  const [stripeClientSecret, setStripeClientSecret] = useState<string | null>(null);
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
    save_to_profile: true, // Default to true for better UX
  });

  // Guest checkout mode: 'guest', 'signup', 'signin'
  const [checkoutMode, setCheckoutMode] = useState<'guest' | 'signup' | 'signin'>('guest');

  // Account creation fields (only used for signup/signin)
  const [accountData, setAccountData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  // Guest contact info (for guest checkout)
  const [guestContact, setGuestContact] = useState({
    email: '',
    fullName: '',
  });

  // Guest currency selection (defaults to destination country currency)
  const [guestSelectedCurrency, setGuestSelectedCurrency] = useState<string>('');

  // Guest checkout session token (for temporary data storage)
  const [guestSessionToken, setGuestSessionToken] = useState<string>('');

  const { data: userProfile } = useUserProfile();
  const { formatAmount: _formatAmount, userCurrency } = useUserCurrency();
  const { data: countries } = useAllCountries();
  const { sendBankTransferEmail } = useEmailNotifications();
  const { findStatusForPaymentMethod } = useStatusManagement();

  // Fetch available currencies for guest selection using CurrencyService
  const { data: availableCurrencies } = useQuery({
    queryKey: ['available-currencies-service'],
    queryFn: async () => {
      const currencies = await currencyService.getAllCurrencies();
      return currencies.map((currency) => ({
        code: currency.code,
        name: currency.name,
        symbol: currency.symbol,
        formatted: `${currency.name} (${currency.code})`,
      }));
    },
    enabled: isGuestCheckout,
  });

  // Fetch guest quote if this is a guest checkout
  const { data: guestQuote, isLoading: guestQuoteLoading } = useQuery({
    queryKey: ['guest-quote', guestQuoteId],
    queryFn: async () => {
      if (!guestQuoteId) return null;

      const { data, error } = await supabase
        .from('quotes')
        .select(
          `
          *,
          quote_items (*)
        `,
        )
        .eq('id', guestQuoteId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!guestQuoteId,
  });

  // Determine currency to use for payment methods
  // For guest checkout, use guest selected currency or default to destination country currency
  // For authenticated users, their preferred currency will be used automatically

  // Load cart data from server when component mounts (same as Cart component)
  useEffect(() => {
    if (user && !cartLoading && !hasLoadedFromServer && !isGuestCheckout) {
      // Only load from server if not already loading and not already loaded, and not guest checkout
      loadFromServer(user.id);
    }
  }, [user, loadFromServer, cartLoading, hasLoadedFromServer, isGuestCheckout]);

  // Get selected cart items based on quote IDs
  // If no URL parameters, use all cart items (for direct navigation to /checkout)
  const selectedCartItems = isGuestCheckout
    ? guestQuote
      ? [
          {
            quoteId: guestQuote.id,
            productName: guestQuote.quote_items?.[0]?.product_name || 'Product',
            quantity: guestQuote.quote_items?.reduce((sum, item) => sum + item.quantity, 0) || 1,
            finalTotal: guestQuote.final_total || 0,
            countryCode: guestQuote.destination_country || 'Unknown',
            purchaseCountryCode: guestQuote.destination_country || 'Unknown',
            destinationCountryCode: (() => {
              // Extract destination from shipping address for guest quotes
              if (guestQuote.shipping_address) {
                try {
                  const addr =
                    typeof guestQuote.shipping_address === 'string'
                      ? JSON.parse(guestQuote.shipping_address)
                      : guestQuote.shipping_address;
                  return (
                    addr?.destination_country ||
                    addr?.countryCode ||
                    addr?.country ||
                    guestQuote.destination_country ||
                    'Unknown'
                  );
                } catch {
                  return guestQuote.destination_country || 'Unknown';
                }
              }
              return guestQuote.destination_country || 'Unknown';
            })(),
          },
        ]
      : []
    : selectedQuoteIds.length > 0
      ? cartItems.filter((item) => selectedQuoteIds.includes(item.quoteId))
      : cartItems; // Use all cart items when no specific quotes are selected

  // Get the shipping country from selected items
  // All quotes in checkout should have the same destination country
  const shippingCountry =
    selectedCartItems.length > 0
      ? selectedCartItems[0].destinationCountryCode ||
        selectedCartItems[0].countryCode ||
        selectedCartItems[0].purchaseCountryCode
      : null;

  // Get default currency for guest checkout using CurrencyService
  const { data: defaultGuestCurrency } = useQuery({
    queryKey: [
      'default-guest-currency',
      selectedCartItems[0]?.destinationCountryCode || selectedCartItems[0]?.countryCode,
    ],
    queryFn: async () => {
      if (!isGuestCheckout || !guestQuote || selectedCartItems.length === 0) {
        return undefined;
      }

      const countryCode =
        selectedCartItems[0].destinationCountryCode || selectedCartItems[0].countryCode || 'US';
      return await currencyService.getCurrencyForCountry(countryCode);
    },
    enabled: isGuestCheckout && !!guestQuote && selectedCartItems.length > 0,
  });

  // Now that defaultGuestCurrency is available, define guestCurrency with fallback
  // Always provide a valid currency for guest checkout to ensure payment methods load
  const guestCurrency = isGuestCheckout
    ? guestSelectedCurrency || defaultGuestCurrency || 'USD'
    : undefined;

  // Payment gateway hook with currency override for guests
  const {
    availableMethods,
    methodsLoading,
    getRecommendedPaymentMethod,
    createPayment: _createPayment,
    createPaymentAsync,
    isCreatingPayment: _isCreatingPayment,
    validatePaymentRequest,
    isMobileOnlyPayment,
    requiresQRCode,
  } = usePaymentGateways(guestCurrency, shippingCountry);

  // Debug logging for payment gateway loading (development only)
  useEffect(() => {
    if (import.meta.env.DEV) {
      console.log('💳 Payment gateway loading state:', {
        isGuestCheckout,
        guestCurrency,
        guestSelectedCurrency,
        defaultGuestCurrency,
        shippingCountry,
        selectedCartItems: selectedCartItems.map(item => ({
          id: item.id,
          finalCurrency: item.finalCurrency,
          destinationCountryCode: item.destinationCountryCode,
          countryCode: item.countryCode,
          purchaseCountryCode: item.purchaseCountryCode
        })),
        availableMethods,
        methodsLoading,
        userCurrency
      });
    }
  }, [isGuestCheckout, guestCurrency, guestSelectedCurrency,
        defaultGuestCurrency,
        availableMethods,
        methodsLoading,
        shippingCountry,
        selectedCartItems.length,
        guestQuote,
        userCurrency
      ]);

  // Set recommended payment method when available methods load
  useEffect(() => {
    if (availableMethods && availableMethods.length > 0) {
      const recommended = getRecommendedPaymentMethod();

      // Check if current payment method is still available
      if (availableMethods.includes(paymentMethod)) {
        // Current method is still available, keep it
        return;
      }

      // Current method is not available, set to recommended
      setPaymentMethod(recommended);
    }
  }, [availableMethods, getRecommendedPaymentMethod, paymentMethod]);

  // Determine the currency for payment - defined here so it's available throughout the component
  const paymentCurrency = isGuestCheckout
    ? guestSelectedCurrency || defaultGuestCurrency || 'USD'
    : userProfile?.preferred_display_currency || 'USD';

  // Get purchase country for route display (where we buy from)
  const purchaseCountry =
    selectedCartItems.length > 0 ? selectedCartItems[0].purchaseCountryCode : null;

  // 🚨 CRITICAL FIX: Add currency conversion state for proper amount calculation
  const [currencyConversion, setCurrencyConversion] = useState<{
    rate: number;
    source: string;
    confidence: string;
  } | null>(null);

  // Get destination country for currency conversion
  const destinationCountry = shippingCountry || 
    (isGuestCheckout ? addressFormData.country : userProfile?.country) || 'US';

  // 🚨 CRITICAL FIX: Calculate currency conversion rate when payment currency changes
  useEffect(() => {
    const calculateCurrencyConversion = async () => {
      console.log('🏦 [Checkout] ===== CURRENCY CONVERSION CALCULATION =====');
      
      // Get quote currency from the first cart item
      const quoteCurrency = selectedCartItems[0]?.finalCurrency || 'USD';
      
      console.log('📊 STEP 1: CONVERSION INPUTS');
      console.log('  Conversion Parameters:', {
        purchaseCountry,
        destinationCountry,
        quoteCurrency,
        paymentCurrency,
        needsConversion: quoteCurrency !== paymentCurrency
      });

      if (!purchaseCountry || !destinationCountry || quoteCurrency === paymentCurrency) {
        console.log('💰 STEP 2: NO CONVERSION NEEDED');
        console.log('  Reason:', !purchaseCountry ? 'No purchase country' : 
                    !destinationCountry ? 'No destination country' : 
                    'Quote currency equals payment currency');
        setCurrencyConversion({ rate: 1, source: 'no_conversion', confidence: 'high' });
        console.log('🏦 [Checkout] ===== END CURRENCY CONVERSION (NO CONVERSION) =====');
        return;
      }

      try {
        console.log('💱 STEP 2: CALLING EXCHANGE RATE SERVICE');
        console.log('  Exchange Rate Lookup:', {
          from: quoteCurrency,
          to: paymentCurrency,
          purchaseCountry,
          destinationCountry,
        });

        // Get exchange rate from quote currency to payment currency
        const exchangeRateResult = await getExchangeRate(
          destinationCountry,
          purchaseCountry,
          quoteCurrency,
          paymentCurrency
        );

        console.log('🎯 STEP 3: EXCHANGE RATE RESULT');
        console.log('  Exchange Rate Details:', {
          rate: exchangeRateResult.rate,
          source: exchangeRateResult.source,
          confidence: exchangeRateResult.confidence,
          warning: exchangeRateResult.warning
        });

        setCurrencyConversion({
          rate: exchangeRateResult.rate,
          source: exchangeRateResult.source,
          confidence: exchangeRateResult.confidence,
        });
        
        console.log('✅ STEP 4: CONVERSION STATE SET');
        console.log('  Final Conversion State:', {
          rate: exchangeRateResult.rate,
          source: exchangeRateResult.source,
          confidence: exchangeRateResult.confidence,
        });
        
        console.log('🏦 [Checkout] ===== END CURRENCY CONVERSION (SUCCESS) =====');
      } catch (error) {
        console.error('🚨 [Checkout] Error calculating currency conversion:', error);
        // Fallback to 1:1 rate to prevent payment failures
        setCurrencyConversion({ rate: 1, source: 'fallback', confidence: 'low' });
        console.log('🏦 [Checkout] ===== END CURRENCY CONVERSION (ERROR - FALLBACK) =====');
      }
    };

    calculateCurrencyConversion();
  }, [purchaseCountry, destinationCountry, paymentCurrency, selectedCartItems]);

  // Pre-fill guest contact info and address from quote if available
  useEffect(() => {
    if (guestQuote && isGuestCheckout) {
      // Set guest contact info
      setGuestContact({
        email: guestQuote.email || '',
        fullName: guestQuote.customer_name || '',
      });

      // Set default currency based on destination country if not already set
      if (!guestSelectedCurrency && defaultGuestCurrency) {
        setGuestSelectedCurrency(defaultGuestCurrency);
      }

      // Extract and set shipping address if available
      const quoteAddress = extractQuoteShippingAddress(guestQuote.shipping_address);
      const checkoutAddress = quoteAddressToCheckoutForm(quoteAddress);

      if (checkoutAddress && isAddressComplete(checkoutAddress)) {
        // Set the address form data
        setAddressFormData({
          ...checkoutAddress,
          country: shippingCountry || checkoutAddress.country,
          destination_country:
            shippingCountry || checkoutAddress.destination_country || checkoutAddress.country,
        });

        // Mark as having a guest address
        setSelectedAddress('guest-address-loaded');
        setShowAddressForm(false); // Don't show the form if we have a complete address
      }
    }
  }, [guestQuote, isGuestCheckout, shippingCountry, defaultGuestCurrency, guestSelectedCurrency]);

  // Update address form country when shippingCountry changes
  useEffect(() => {
    if (shippingCountry) {
      setAddressFormData((prev) => ({
        ...prev,
        country: shippingCountry,
        destination_country: shippingCountry,
      }));
    }
  }, [shippingCountry]);

  // Queries
  const { data: addresses, isLoading: addressesLoading } = useQuery({
    queryKey: ['user_addresses', user?.id, shippingCountry],
    queryFn: async () => {
      if (!user || !shippingCountry) return [];

      // Try filtering by destination_country first, fallback to country field
      let { data, error } = await supabase
        .from('user_addresses')
        .select('*')
        .eq('user_id', user.id)
        .eq('destination_country', shippingCountry)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false });

      // If no addresses found and destination_country exists, try fallback to country field
      if ((!data || data.length === 0) && !error) {
        const fallbackResult = await supabase
          .from('user_addresses')
          .select('*')
          .eq('user_id', user.id)
          .eq('country', shippingCountry)
          .order('is_default', { ascending: false })
          .order('created_at', { ascending: false });

        if (fallbackResult.data && fallbackResult.data.length > 0) {
          data = fallbackResult.data;
          error = fallbackResult.error;
        }
      }

      if (error) {
        console.error('Address query error:', error);
        throw error;
      }
      return data || [];
    },
    enabled: !!user && !isGuestCheckout && !!shippingCountry, // Don't load for guest checkout
  });

  // Auto-select default address or single address
  useEffect(() => {
    if (addresses && addresses.length > 0 && !selectedAddress) {
      // If only one address, select it automatically
      if (addresses.length === 1) {
        setSelectedAddress(addresses[0].id);
      } else {
        // Otherwise, select the default one or the first one
        const defaultAddr = addresses.find((addr) => addr.is_default);
        setSelectedAddress(defaultAddr ? defaultAddr.id : addresses[0].id);
      }
    }
  }, [addresses, selectedAddress]);

  // Mutations
  const updateQuotesMutation = useMutation({
    mutationFn: async ({
      ids,
      status,
      method,
      paymentStatus,
    }: {
      ids: string[];
      status: string;
      method: string;
      paymentStatus?: string;
    }) => {
      const updateData: Partial<QuoteType> = {
        status,
        payment_method: method,
        in_cart: false,
      };

      // Set payment status for non-redirect payment methods
      if (paymentStatus) {
        updateData.payment_status = paymentStatus;
      }

      const { data, error } = await supabase
        .from('quotes')
        .update(updateData)
        .in('id', ids)
        .select();

      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: (data) => {
      if (data && data.length > 0) {
        queryClient.invalidateQueries({ queryKey: ['quotes'] });
        queryClient.invalidateQueries({ queryKey: ['admin-quotes'] });
        queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
        // Use the first quote ID for order confirmation page
        navigate(`/order-confirmation/${data[0].id}`);
      }
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const addAddressMutation = useMutation({
    mutationFn: async (addressData: AddressFormData) => {
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('user_addresses')
        .insert({
          user_id: user.id,
          ...addressData,
          destination_country: shippingCountry, // Ensure destination_country is set
          country: shippingCountry,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (newAddress) => {
      queryClient.invalidateQueries({ queryKey: ['user_addresses', user?.id] });
      setSelectedAddress(newAddress.id);
      setShowAddressForm(false);
      setAddressFormData({
        address_line1: '',
        address_line2: '',
        city: '',
        state_province_region: '',
        postal_code: '',
        country: shippingCountry || '',
        destination_country: shippingCountry || '',
        recipient_name: '',
        phone: '',
        is_default: false,
        save_to_profile: true, // Default to true for better UX
      });
      toast({ title: 'Success', description: 'Address added successfully.' });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // 🚨 CRITICAL FIX: Calculate total amount with proper currency conversion
  const totalAmount = selectedCartItems.reduce((total, item) => {
    // Add null checks for item properties
    if (!item || typeof item.finalTotal !== 'number' || typeof item.quantity !== 'number') {
      console.warn('Invalid cart item data:', item);
      return total;
    }
    
    // 🚨 FIXED: Use quote currency directly, convert only when gateway requires different currency
    // Key principle: final_total is already in the quote's currency (NPR/INR/USD)
    // Only convert if payment gateway requires different currency than quote currency
    
    const isLocalGateway = ['khalti', 'fonepay', 'esewa', 'payu'].includes(paymentMethod || '');
    const isInternationalGateway = ['paypal', 'stripe', 'airwallex'].includes(paymentMethod || '');
    
    let itemAmount: number;
    let itemCurrency: string;
    
    // Get quote's original currency and amount
    const quoteCurrency = item.finalCurrency || 'USD';
    const quoteAmount = item.finalTotal || 0;
    
    if (isLocalGateway) {
      // Local gateways: use quote amount directly if it's already in local currency
      if (quoteCurrency === 'NPR' || quoteCurrency === 'INR') {
        // Quote is already in local currency - use as is
        itemAmount = quoteAmount * (item.quantity || 1);
        itemCurrency = quoteCurrency;
        console.log(`🏦 [Checkout] Using quote currency directly for ${paymentMethod}: ${itemAmount} ${itemCurrency}`);
      } else {
        // Quote is in USD, convert to local currency
        const targetCurrency = paymentCurrency || 'USD';
        if (currencyConversion && currencyConversion.rate && currencyConversion.rate !== 1) {
          const convertedAmount = convertCurrency(quoteAmount, currencyConversion.rate, targetCurrency);
          itemAmount = convertedAmount * (item.quantity || 1);
          itemCurrency = targetCurrency;
          console.log(`🏦 [Checkout] Converting USD to local for ${paymentMethod}: $${quoteAmount} USD → ${convertedAmount} ${targetCurrency} (rate: ${currencyConversion.rate})`);
        } else {
          itemAmount = quoteAmount * (item.quantity || 1);
          itemCurrency = quoteCurrency;
          console.log(`🏦 [Checkout] Using USD for local gateway ${paymentMethod}: $${itemAmount} USD`);
        }
      }
    } else if (isInternationalGateway) {
      // International gateways: prefer USD, convert if needed
      if (quoteCurrency === 'USD') {
        // Quote is already in USD - use as is
        itemAmount = quoteAmount * (item.quantity || 1);
        itemCurrency = 'USD';
        console.log(`🏦 [Checkout] Using USD directly for ${paymentMethod}: $${itemAmount} USD`);
      } else {
        // Quote is in local currency, convert to USD
        if (currencyConversion && currencyConversion.rate && currencyConversion.rate !== 1) {
          const convertedAmount = convertCurrency(quoteAmount, 1 / currencyConversion.rate, 'USD');
          itemAmount = convertedAmount * (item.quantity || 1);
          itemCurrency = 'USD';
          console.log(`🏦 [Checkout] Converting local to USD for ${paymentMethod}: ${quoteAmount} ${quoteCurrency} → $${convertedAmount} USD (rate: ${1 / currencyConversion.rate})`);
        } else {
          itemAmount = quoteAmount * (item.quantity || 1);
          itemCurrency = quoteCurrency;
          console.log(`🏦 [Checkout] Using quote currency for international gateway ${paymentMethod}: ${itemAmount} ${itemCurrency}`);
        }
      }
    } else {
      // Fallback to USD
      itemAmount = (item.finalTotal || 0) * (item.quantity || 1);
      itemCurrency = 'USD';
      console.log(`🏦 [Checkout] Fallback to USD: $${itemAmount} USD`);
    }
    
    return total + itemAmount;
  }, 0);

  const cartQuoteIds = selectedCartItems
    .filter((item) => item && item.quoteId) // Filter out items without quoteId
    .map((item) => item.quoteId);

  // Validation
  const hasValidGuestAddress =
    isGuestCheckout &&
    (selectedAddress === 'guest-address' || selectedAddress === 'guest-address-loaded') &&
    isAddressComplete(addressFormData);

  const hasValidTempAddress =
    !isGuestCheckout && selectedAddress === 'temp-address' && isAddressComplete(addressFormData);

  const canPlaceOrder =
    (selectedAddress || hasValidGuestAddress || hasValidTempAddress) &&
    paymentMethod &&
    selectedCartItems.length > 0 &&
    (!isGuestCheckout ||
      (checkoutMode === 'guest'
        ? guestContact.email && guestContact.fullName
        : checkoutMode === 'signin'
          ? accountData.email && accountData.password
          : accountData.email &&
            accountData.password &&
            accountData.fullName &&
            accountData.password === accountData.confirmPassword));

  const handleAddAddress = async () => {
    if (
      !addressFormData.recipient_name ||
      !addressFormData.address_line1 ||
      !addressFormData.city ||
      !addressFormData.state_province_region ||
      !addressFormData.postal_code ||
      !addressFormData.country
    ) {
      toast({
        title: 'Missing Information',
        description: 'Please fill in all required fields.',
        variant: 'destructive',
      });
      return;
    }

    if (isGuestCheckout) {
      // For guest checkout, we'll save the address after account creation
      // For now, just close the form and mark address as "provided"
      setShowAddressForm(false);
      setSelectedAddress('guest-address'); // Use a placeholder ID
      toast({
        title: 'Address Added',
        description: 'Address will be saved when you complete your order.',
      });
      return;
    }

    // For authenticated users, check if they want to save the address to profile
    if (addressFormData.save_to_profile) {
      await addAddressMutation.mutateAsync(addressFormData);
    } else {
      // Just use the address for this order without saving it
      setShowAddressForm(false);
      setSelectedAddress('temp-address'); // Use a temporary placeholder ID
      toast({
        title: 'Address Added',
        description: 'Address added for this order only.',
      });
    }
  };

  const handlePaymentMethodChange = (method: PaymentGateway) => {
    setPaymentMethod(method);
  };

  const _handlePaymentSuccess = (data: { id: string }) => {
    toast({
      title: 'Payment Successful',
      description: 'Your payment has been processed successfully.',
    });
    navigate(`/order-confirmation/${data.id}`);
  };

  const handleQRPaymentComplete = () => {
    setShowQRModal(false);
    toast({
      title: 'Payment Successful',
      description: 'Your payment has been processed successfully.',
    });
    navigate('/dashboard/orders');
  };

  const handleQRPaymentFailed = () => {
    setShowQRModal(false);
    toast({
      title: 'Payment Failed',
      description: 'There was an issue processing your payment. Please try again.',
      variant: 'destructive',
    });
  };

  const handlePlaceOrder = async () => {
    if (!paymentMethod) {
      toast({
        title: 'Payment Error',
        description: 'Please select a payment method.',
        variant: 'destructive',
      });
      return;
    }

    if (isMobileOnlyPayment(paymentMethod) && !requiresQRCode(paymentMethod)) {
      toast({
        title: 'Device Incompatible',
        description: 'This payment method can only be used on a mobile device.',
        variant: 'destructive',
      });
      return;
    }

    // Validate guest checkout data
    if (isGuestCheckout) {
      if (checkoutMode === 'guest') {
        if (!guestContact.email || !guestContact.fullName) {
          toast({
            title: 'Missing Information',
            description: 'Please fill in your contact details.',
            variant: 'destructive',
          });
          return;
        }

        // Validate shipping address
        if (!isAddressComplete(addressFormData)) {
          toast({
            title: 'Missing Shipping Address',
            description: 'Please provide a complete shipping address.',
            variant: 'destructive',
          });
          return;
        }
      } else if (checkoutMode === 'signin') {
        if (!accountData.email || !accountData.password) {
          toast({
            title: 'Missing Information',
            description: 'Please fill in email and password.',
            variant: 'destructive',
          });
          return;
        }
      } else if (checkoutMode === 'signup') {
        if (!accountData.email || !accountData.password || !accountData.fullName) {
          toast({
            title: 'Missing Information',
            description: 'Please fill in all account details.',
            variant: 'destructive',
          });
          return;
        }

        if (accountData.password !== accountData.confirmPassword) {
          toast({
            title: 'Password Mismatch',
            description: 'Passwords do not match.',
            variant: 'destructive',
          });
          return;
        }
      }
    }

    // 🚨 CRITICAL FIX: Calculate payment amount based on gateway type
    const isLocalGateway = ['khalti', 'fonepay', 'esewa', 'payu'].includes(paymentMethod || '');
    const isInternationalGateway = ['paypal', 'stripe', 'airwallex'].includes(paymentMethod || '');
    
    let paymentAmount: number;
    let paymentCurrency: string;
    
    if (isLocalGateway) {
      // For local gateways: use quote currency directly if it's local currency
      paymentAmount = selectedCartItems.reduce((total, item) => {
        const quoteCurrency = item.finalCurrency || 'USD';
        const quoteAmount = item.finalTotal || 0;
        
        // If quote is already in local currency (NPR/INR), use as is
        if (quoteCurrency === 'NPR' || quoteCurrency === 'INR') {
          return total + (quoteAmount * (item.quantity || 1));
        } else {
          // Quote is in USD, convert to local currency if needed
          // For now, use finalTotalLocal if available, otherwise finalTotal
          const localAmount = item.finalTotalLocal && item.finalTotalLocal > 0 ? item.finalTotalLocal : item.finalTotal;
          return total + (localAmount * (item.quantity || 1));
        }
      }, 0);
      paymentCurrency = selectedCartItems[0]?.finalCurrency || userCurrency || 'USD';
    } else {
      // For international gateways: convert to USD if needed
      paymentAmount = selectedCartItems.reduce((total, item) => {
        const quoteCurrency = item.finalCurrency || 'USD';
        const quoteAmount = item.finalTotal || 0;
        
        // If quote is already in USD, use as is
        if (quoteCurrency === 'USD') {
          return total + (quoteAmount * (item.quantity || 1));
        } else {
          // Quote is in local currency, we need USD for international gateway
          // For now, use the current logic but this should be improved
          return total + (quoteAmount * (item.quantity || 1));
        }
      }, 0);
      paymentCurrency = 'USD';
    }
    
    console.log(`🏦 [Checkout] Payment amount calculation:`, {
      gateway: paymentMethod,
      isLocalGateway,
      isInternationalGateway,
      paymentAmount,
      paymentCurrency,
      userCurrency,
      itemDetails: selectedCartItems.map(item => ({
        id: item.id,
        finalTotal: item.finalTotal,
        finalTotalLocal: item.finalTotalLocal,
        finalCurrency: item.finalCurrency,
        quantity: item.quantity,
      }))
    });

    // Validate payment amount before creating payment request
    if (!paymentAmount || paymentAmount <= 0 || isNaN(paymentAmount) || !isFinite(paymentAmount)) {
      toast({
        title: 'Invalid Amount',
        description: 'The total amount is invalid. Please check your cart items.',
        variant: 'destructive',
      });
      setIsProcessing(false);
      return;
    }

    // 🚨 CRITICAL FIX: Validate USD amount (what we're sending to backend)
    if (!paymentAmount || paymentAmount <= 0 || isNaN(paymentAmount) || !isFinite(paymentAmount)) {
      toast({
        title: 'Invalid USD Amount',
        description: 'The USD amount calculation is invalid. Please refresh and try again.',
        variant: 'destructive',
      });
      setIsProcessing(false);
      return;
    }

    console.log('🏦 [Checkout] ===== COMPREHENSIVE PAYMENT AMOUNT TRACKING =====');
    console.log('📊 STEP 1: RAW CART ITEMS FROM DATABASE');
    selectedCartItems.forEach((item, index) => {
      console.log(`  Item ${index + 1}:`, {
        id: item.id,
        productName: item.productName,
        quantity: item.quantity,
        finalTotal_USD: item.finalTotal, // USD amount from database
        finalTotalLocal: item.finalTotalLocal, // Local currency amount from database
        finalCurrency: item.finalCurrency, // Local currency code
        subtotal_USD: (item.finalTotal || 0) * (item.quantity || 1),
        subtotal_Local: (item.finalTotalLocal || 0) * (item.quantity || 1),
        originCountry: item.originCountry,
        destinationCountry: item.destinationCountry
      });
    });
    
    console.log('💰 STEP 2: PAYMENT AMOUNT CALCULATION (Gateway-Specific)');
    console.log('  Gateway Type:', {
      code: paymentMethod,
      isLocalGateway,
      isInternationalGateway
    });
    console.log('  Payment Amount:', paymentAmount);
    console.log('  Payment Currency:', paymentCurrency);
    console.log('  Payment Amount Breakdown:', {
      calculation: selectedCartItems.map(item => {
        const amount = isLocalGateway && item.finalTotalLocal ? item.finalTotalLocal : item.finalTotal;
        return `${amount} × ${item.quantity} = ${amount * (item.quantity || 1)}`;
      }).join(' + '),
      total: paymentAmount,
      currency: paymentCurrency
    });
    
    console.log('💱 STEP 3: CURRENCY CONVERSION (USD → Display Currency)');
    console.log('  Currency Conversion Details:', {
      fromCurrency: 'USD',
      toCurrency: paymentCurrency,
      rate: currencyConversion?.rate || 1,
      source: currencyConversion?.source || 'no_conversion',
      confidence: currencyConversion?.confidence || 'high'
    });
    
    console.log('🎯 STEP 4: DISPLAY AMOUNT CALCULATION');
    console.log('  Display Amount Calculation:', {
      paymentAmount: paymentAmount,
      conversionRate: currencyConversion?.rate || 1,
      expectedDisplayAmount: paymentAmount,
      actualDisplayAmount: totalAmount,
      displayCurrency: paymentCurrency,
      amountMatches: Math.abs(paymentAmount - totalAmount) < 0.01
    });
    
    console.log('🚨 STEP 5: PAYMENT REQUEST (What We Send to Backend)');
    console.log('  Payment Request Structure:', {
      amount: paymentAmount,
      currency: paymentCurrency,
      gateway: paymentMethod,
      metadata: {
        currency_context: {
          source_currency: 'USD',
          target_currency: paymentCurrency,
          conversion_rate: currencyConversion?.rate || 1,
          amount_in_source_currency: paymentAmount,
          amount_in_target_currency: totalAmount
        }
      }
    });
    
    console.log('🔍 STEP 6: WHAT USER SEES VS WHAT GATEWAY GETS');
    console.log('  User Display:', {
      displayAmount: totalAmount,
      displayCurrency: paymentCurrency,
      displayFormatted: `${totalAmount.toFixed(2)} ${paymentCurrency}`
    });
    console.log('  Gateway Receives:', {
      amount: paymentAmount,
      currency: paymentCurrency,
      gatewayFormatted: `${paymentAmount.toFixed(2)} ${paymentCurrency}`
    });
    
    console.log('⚠️ STEP 7: POTENTIAL ISSUES TO CHECK');
    console.log('  Validation Checks:', {
      paymentAmountValid: paymentAmount > 0 && isFinite(paymentAmount),
      displayAmountValid: totalAmount > 0 && isFinite(totalAmount),
      conversionRateValid: (currencyConversion?.rate || 1) > 0,
      amountsConsistent: Math.abs(paymentAmount - totalAmount) < 0.01,
      currencyMismatch: paymentCurrency !== 'USD' && (!currencyConversion || currencyConversion.rate === 1)
    });
    
    console.log('🏦 [Checkout] ===== END PAYMENT AMOUNT TRACKING =====');

    // 🚨 CRITICAL FIX: Send appropriate currency amounts to backend based on gateway type
    const paymentRequest: PaymentRequest = {
      quoteIds: cartQuoteIds,
      amount: paymentAmount, // Local currency for local gateways, USD for international
      currency: paymentCurrency, // Gateway-appropriate currency
      gateway: paymentMethod,
      success_url: `${window.location.origin}/order-confirmation?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${window.location.origin}/checkout?quotes=${cartQuoteIds.join(',')}`,
      customerInfo: {
        name: isGuestCheckout
          ? addressFormData.recipient_name || guestContact.fullName
          : addressFormData.recipient_name || userProfile?.full_name || '',
        email: isGuestCheckout ? guestContact.email : user?.email || '',
        phone: addressFormData.phone || '',
        address: addressFormData.address_line1,
      },
      metadata: {
        // Include guest session token for webhook processing
        guest_session_token: isGuestCheckout ? guestSessionToken : undefined,
        checkout_type: isGuestCheckout ? 'guest' : 'authenticated',
        // 🚨 CRITICAL FIX: Currency context for payment gateways
        currency_context: {
          source_currency: paymentCurrency, // Currency being sent to gateway
          target_currency: paymentCurrency, // Same as source for new logic
          conversion_rate: 1, // No conversion needed as we're sending correct currency
          conversion_source: 'direct', // Direct currency amount
          conversion_confidence: 'high',
          amount_in_source_currency: paymentAmount, // Amount in gateway currency (what we're sending)
          amount_in_target_currency: totalAmount, // Amount in user's preferred currency (for display)
          gateway_type: isLocalGateway ? 'local' : 'international',
          converted_at: new Date().toISOString(),
        },
        // Quote context
        quote_context: {
          quote_ids: selectedCartItems.map(item => item.id),
          origin_countries: [...new Set(selectedCartItems.map(item => item.originCountry).filter(Boolean))],
          destination_countries: [...new Set(selectedCartItems.map(item => item.destinationCountry).filter(Boolean))],
        }
      },
    };

    const { isValid, errors } = validatePaymentRequest(paymentRequest);
    if (!isValid) {
      toast({
        title: 'Payment Request Invalid',
        description: errors.join(', '),
        variant: 'destructive',
      });
      return;
    }

    setIsProcessing(true);

    try {
      // Handle guest checkout
      if (isGuestCheckout) {
        try {
          const _userId: string | null = null;

          if (checkoutMode === 'guest') {
            // Pure guest checkout - store details temporarily without updating quote

            // Prepare shipping address for session storage
            const shippingAddressForSession = {
              streetAddress: addressFormData.address_line1,
              city: addressFormData.city,
              state: addressFormData.state_province_region,
              postalCode: addressFormData.postal_code,
              country: addressFormData.country,
              destination_country: addressFormData.destination_country || addressFormData.country,
              fullName: addressFormData.recipient_name || guestContact.fullName,
              phone: addressFormData.phone,
            };

            // Create or update guest checkout session instead of updating quote
            let sessionResult;
            if (guestSessionToken) {
              // Update existing session
              sessionResult = await checkoutSessionService.updateSession({
                session_token: guestSessionToken,
                guest_name: guestContact.fullName,
                guest_email: guestContact.email,
                shipping_address: shippingAddressForSession,
                payment_currency: paymentCurrency,
                payment_method: paymentMethod,
                payment_amount: totalAmount,
              });
            } else {
              // Create new session
              sessionResult = await checkoutSessionService.createSession({
                quote_id: guestQuoteId!,
                guest_name: guestContact.fullName,
                guest_email: guestContact.email,
                shipping_address: shippingAddressForSession,
                payment_currency: paymentCurrency,
                payment_method: paymentMethod,
                payment_amount: totalAmount,
              });

              // Store session token for future updates
              if (sessionResult.success && sessionResult.session) {
                setGuestSessionToken(sessionResult.session.session_token);
              }
            }

            if (!sessionResult.success) {
              throw new Error(sessionResult.error || 'Failed to create checkout session');
            }

            toast({
              title: 'Processing Order',
              description:
                'Processing your order as a guest. Your quote remains available to others until payment is confirmed.',
            });
          } else {
            // For signin/signup modes, this shouldn't be reached
            toast({
              title: 'Action Required',
              description:
                checkoutMode === 'signin'
                  ? "Please use the 'Sign In' button above first."
                  : "Please use the 'Create Account' button above first.",
              variant: 'destructive',
            });
            setIsProcessing(false);
            return;
          }
        } catch (error) {
          console.error('Guest checkout failed:', error);
          const errorMessage =
            error instanceof Error
              ? error.message
              : 'An error occurred during checkout. Please try again.';
          toast({
            title: 'Checkout Failed',
            description: errorMessage,
            variant: 'destructive',
          });
          setIsProcessing(false);
          return;
        }
      }

      // Handle authenticated user checkout with session storage
      if (!isGuestCheckout) {
        try {
          let authSessionToken = null;

          // If using temporary address, store it in session instead of updating quotes immediately
          if (selectedAddress === 'temp-address') {
            const temporaryShippingAddress = checkoutFormToQuoteAddress({
              ...addressFormData,
              recipient_name: addressFormData.recipient_name || userProfile?.full_name || '',
            });

            // Create authenticated checkout session to store temporary data
            const sessionResult = await checkoutSessionService.createAuthenticatedSession({
              quote_ids: cartQuoteIds,
              user_id: user!.id,
              temporary_shipping_address: temporaryShippingAddress,
              payment_currency: paymentCurrency,
              payment_method: paymentMethod,
              payment_amount: totalAmount,
            });

            if (!sessionResult.success) {
              throw new Error(sessionResult.error || 'Failed to create checkout session');
            }

            authSessionToken = sessionResult.session!.session_token;
          } else {
            // For saved addresses, create session without temporary address
            const sessionResult = await checkoutSessionService.createAuthenticatedSession({
              quote_ids: cartQuoteIds,
              user_id: user!.id,
              payment_currency: paymentCurrency,
              payment_method: paymentMethod,
              payment_amount: totalAmount,
            });

            if (!sessionResult.success) {
              throw new Error(sessionResult.error || 'Failed to create checkout session');
            }

            authSessionToken = sessionResult.session!.session_token;
          }

          // Update payment request metadata to include session token
          paymentRequest.metadata = {
            ...paymentRequest.metadata,
            auth_session_token: authSessionToken,
            checkout_type: 'authenticated',
          };

          toast({
            title: 'Processing Order',
            description:
              'Processing your order. Your quotes will be updated upon payment confirmation.',
          });
        } catch (error) {
          console.error('Authenticated checkout session failed:', error);
          const errorMessage =
            error instanceof Error ? error.message : 'Failed to create checkout session';
          toast({
            title: 'Checkout Failed',
            description: errorMessage,
            variant: 'destructive',
          });
          setIsProcessing(false);
          return;
        }
      }

      const paymentResponse = await createPaymentAsync(paymentRequest);

      // Add null check for payment response
      if (!paymentResponse) {
        throw new Error('No response received from payment gateway');
      }

      if (paymentMethod === 'stripe' && paymentResponse.client_secret) {
        // --- New Stripe inline payment logic ---
        console.log('🎯 Stripe PaymentIntent created, showing inline form');
        setStripeClientSecret(paymentResponse.client_secret);
        // Do NOT redirect. We will now show our inline form.
      } else if (paymentMethod === 'airwallex' && paymentResponse.client_secret) {
        // Airwallex requires using their SDK for hosted payment page
        console.log('🎯 Airwallex PaymentIntent created:', {
          client_secret: paymentResponse.client_secret,
          transactionId: paymentResponse.transactionId,
          airwallexData: paymentResponse.airwallexData,
          fullResponse: paymentResponse,
        });

        // Payment data is now stored in the redirectToCheckout handlers

        // Check if we have airwallexData with the required fields
        if (paymentResponse.airwallexData) {
          const { intent_id, client_secret, currency, env } = paymentResponse.airwallexData;

          // Load Airwallex SDK if not already loaded
          if (!window.AirwallexComponentsSDK) {
            const script = document.createElement('script');
            script.src = 'https://static.airwallex.com/components/sdk/v1/index.js';
            script.async = true;
            script.onload = async () => {
              // SDK loaded, now initialize and redirect
              try {
                const { payments } = await window.AirwallexComponentsSDK.init({
                  env: env || 'demo',
                  enabledElements: ['payments'],
                });

                // Get country code from shipping address or default
                const countryCode = addressFormData?.country || 'US';

                // Store complete payment data for success page
                const airwallexPaymentData = {
                  paymentIntentId: intent_id,
                  transactionId: paymentResponse.transactionId,
                  amount: paymentRequest.amount || totalAmount, // Use the actual amount from payment request
                  currency: currency || paymentRequest.currency || 'USD',
                  quoteIds: paymentRequest.quoteIds,
                  timestamp: Date.now(),
                };
                sessionStorage.setItem(
                  'airwallex_payment_pending',
                  JSON.stringify(airwallexPaymentData),
                );

                // Redirect to Airwallex hosted payment page
                payments.redirectToCheckout({
                  env: env || 'demo',
                  mode: 'payment',
                  intent_id: intent_id,
                  client_secret: client_secret,
                  currency: currency,
                  country_code: countryCode,
                  successUrl: window.location.origin + '/payment-success?gateway=airwallex',
                  failUrl: window.location.origin + '/payment-failure?gateway=airwallex',
                });
              } catch (error) {
                console.error('Airwallex SDK initialization failed:', error);
                toast({
                  title: 'Payment Error',
                  description: 'Failed to initialize Airwallex payment. Please try again.',
                  variant: 'destructive',
                });
                setIsProcessing(false);
              }
            };
            script.onerror = () => {
              console.error('Failed to load Airwallex SDK');
              toast({
                title: 'Payment Error',
                description: 'Failed to load payment provider. Please try again.',
                variant: 'destructive',
              });
              setIsProcessing(false);
            };
            document.body.appendChild(script);
          } else {
            // SDK already loaded, initialize and redirect
            try {
              const { payments } = await window.AirwallexComponentsSDK.init({
                env: env || 'demo',
                enabledElements: ['payments'],
              });

              // Get country code from shipping address or default
              const countryCode = addressFormData?.country || 'US';

              // Store complete payment data for success page
              const airwallexPaymentData = {
                paymentIntentId: intent_id,
                transactionId: paymentResponse.transactionId,
                amount: paymentRequest.amount || totalAmount, // Use the actual amount from payment request
                currency: currency || paymentRequest.currency || 'USD',
                quoteIds: paymentRequest.quoteIds,
                timestamp: Date.now(),
              };
              sessionStorage.setItem(
                'airwallex_payment_pending',
                JSON.stringify(airwallexPaymentData),
              );

              // Redirect to Airwallex hosted payment page
              payments.redirectToCheckout({
                env: env || 'demo',
                mode: 'payment',
                intent_id: intent_id,
                client_secret: client_secret,
                currency: currency,
                country_code: countryCode,
                successUrl: window.location.origin + '/payment-success?gateway=airwallex',
                failUrl: window.location.origin + '/payment-failure?gateway=airwallex',
              });
            } catch (error) {
              console.error('Airwallex redirect failed:', error);
              toast({
                title: 'Payment Error',
                description: 'Failed to redirect to payment page. Please try again.',
                variant: 'destructive',
              });
              setIsProcessing(false);
            }
          }
        } else {
          // Fallback error if airwallexData is missing
          console.error('Airwallex payment response missing required data');
          toast({
            title: 'Payment Error',
            description: 'Payment configuration error. Please try again.',
            variant: 'destructive',
          });
          setIsProcessing(false);
        }
      } else if (requiresQRCode(paymentMethod) && paymentResponse.qrCode) {
        // QR-based payments (Khalti, eSewa, Fonepay)
        console.log('🎯 QR payment initiated:', paymentMethod);

        // Update quote status to processing for QR payments
        const statusConfig = findStatusForPaymentMethod(paymentMethod);
        const processingStatus = statusConfig?.name || 'processing';

        console.log(`Setting ${paymentMethod} quotes to ${processingStatus} status for QR payment`);

        await updateQuotesMutation.mutateAsync({
          ids: cartQuoteIds,
          status: processingStatus,
          method: paymentMethod,
          paymentStatus: 'unpaid', // Will be updated to 'paid' by webhook
        });

        // Show QR modal
        setQrPaymentData({
          qrCodeUrl:
            paymentResponse.qrCode ||
            paymentResponse.qr_code ||
            paymentResponse.qrCodeUrl ||
            paymentResponse.url ||
            '',
          transactionId:
            paymentResponse.transactionId || `${paymentMethod.toUpperCase()}_${Date.now()}`,
          gateway: paymentMethod,
        });
        setShowQRModal(true);

        if (paymentMethod === 'khalti') {
          // For Khalti, redirect to payment URL for better UX
          window.location.href = paymentResponse.url;
        } else if (paymentMethod === 'fonepay') {
          // For Fonepay, redirect to payment URL immediately like Khalti
          window.location.href = paymentResponse.url;
        }
      } else if (paymentResponse.url) {
        // For redirect-based payments (PayU Hosted Checkout)
        // First update quote status to processing for payment gateways
        if (paymentMethod === 'payu' || paymentMethod === 'esewa') {
          const statusConfig = findStatusForPaymentMethod(paymentMethod);
          const processingStatus = statusConfig?.name || 'processing';

          console.log(
            `Setting ${paymentMethod} quotes to ${processingStatus} status before redirect`,
          );

          await updateQuotesMutation.mutateAsync({
            ids: cartQuoteIds,
            status: processingStatus,
            method: paymentMethod,
            paymentStatus: 'unpaid', // Will be updated to 'paid' by webhook/success page
          });
        }

        if (paymentMethod === 'payu') {
          // Direct PayU form submission (same as working test page)
          console.log('🔧 PayU: Direct form submission approach');

          const payuConfig = {
            merchant_key: 'u7Ui5I',
            merchant_id: '8725115',
            salt_key: 'VIen2EwWiQbvsILF4Wt9p9Gh5ixOpSMe',
            environment: 'test',
          };

          const txnid = 'PAYU_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
          const productinfo = 'iWishBag Order (' + txnid + ')';

          // Create form data exactly like test page
          const formData = {
            key: payuConfig.merchant_key,
            txnid: txnid,
            amount: totalAmount.toFixed(2),
            productinfo: productinfo,
            firstname: isGuestCheckout
              ? guestContact.fullName || 'Test Customer'
              : userProfile?.full_name || 'Test Customer',
            email: isGuestCheckout
              ? guestContact.email || 'test@example.com'
              : user?.email || 'test@example.com',
            phone: addressFormData.phone || '9999999999',
            surl: window.location.origin + '/payment-success?gateway=payu',
            furl: window.location.origin + '/payment-failure?gateway=payu',
            udf1: '',
            udf2: '',
            udf3: '',
            udf4: '',
            udf5: '',
          };

          // Generate hash exactly like test page
          const generatePayUHash = async (data: any) => {
            const hashString = [
              data.key,
              data.txnid,
              data.amount,
              data.productinfo,
              data.firstname,
              data.email,
              data.udf1 || '',
              data.udf2 || '',
              data.udf3 || '',
              data.udf4 || '',
              data.udf5 || '',
              '',
              '',
              '',
              '',
              '', // 5 empty fields
              payuConfig.salt_key,
            ].join('|');

            console.log('🔐 Hash string: ' + hashString);

            const encoder = new TextEncoder();
            const data_encoded = encoder.encode(hashString);
            const hashBuffer = await crypto.subtle.digest('SHA-512', data_encoded);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

            console.log('✅ Hash generated: ' + hashHex.substring(0, 30) + '...');
            return hashHex;
          };

          console.log('📝 Form data prepared:');
          console.log('- Key: ' + formData.key);
          console.log('- Transaction ID: ' + formData.txnid);
          console.log('- Amount: ' + formData.amount);

          // Generate hash
          console.log('🔐 Generating hash...');
          const hash = await generatePayUHash(formData);
          formData.hash = hash;

          // Validate required fields
          const requiredFields = [
            'key',
            'txnid',
            'amount',
            'productinfo',
            'firstname',
            'email',
            'phone',
            'surl',
            'furl',
            'hash',
          ];
          const missingFields = requiredFields.filter((field) => !formData[field]);

          if (missingFields.length > 0) {
            console.log('❌ Missing required fields: ' + missingFields.join(', '));
            return;
          } else {
            console.log('✅ All required fields present');
          }

          // Create and submit form exactly like test page
          console.log('📋 Creating form for PayU submission...');

          const form = document.createElement('form');
          form.method = 'POST';
          form.action = 'https://test.payu.in/_payment';
          form.target = '_self'; // Use same window like test page
          form.style.display = 'none';

          // Add all form fields
          Object.entries(formData).forEach(([key, value]) => {
            const input = document.createElement('input');
            input.type = 'hidden';
            input.name = key;
            input.value = value;
            form.appendChild(input);
          });

          document.body.appendChild(form);

          console.log('✅ Form created with ' + form.elements.length + ' fields');
          console.log('🚀 Submitting to PayU...');

          // Submit form immediately
          form.submit();
        } else if (paymentMethod === 'esewa') {
          // For eSewa, use form POST submission (similar to PayU)
          console.log('🔍 eSewa payment response:', paymentResponse);
          console.log('🔍 Has formData?', !!paymentResponse.formData);
          console.log('🔍 Has URL?', !!paymentResponse.url);
          console.log('🔍 Method?', paymentResponse.method);
          console.log('🔍 Full response:', JSON.stringify(paymentResponse, null, 2));

          if (paymentResponse.formData && paymentResponse.url) {
            console.log('📋 Creating form for eSewa submission...');
            console.log('📋 Form action URL:', paymentResponse.url);
            console.log('📋 Form data:', paymentResponse.formData);
            console.log('✅ Condition met: formData and URL exist, proceeding to new window...');

            // Enhanced validation to match working test HTML
            const requiredFields = [
              'amount',
              'tax_amount',
              'total_amount',
              'transaction_uuid',
              'product_code',
              'product_service_charge',
              'product_delivery_charge',
              'success_url',
              'failure_url',
              'signed_field_names',
              'signature',
            ];
            const missingFields = requiredFields.filter(
              (field) => !paymentResponse.formData[field],
            );

            if (missingFields.length > 0) {
              console.error('❌ Missing required fields:', missingFields);
              throw new Error(`Missing required eSewa fields: ${missingFields.join(', ')}`);
            }
            console.log('✅ All required fields present');

            // Validate signature format (should be base64)
            if (
              !paymentResponse.formData.signature ||
              paymentResponse.formData.signature.length < 10
            ) {
              console.error('❌ Invalid signature:', paymentResponse.formData.signature);
              throw new Error('Invalid eSewa signature format');
            }
            console.log('✅ Signature validation passed');

            // Validate signed_field_names format (should match working test)
            if (
              paymentResponse.formData.signed_field_names !==
              'total_amount,transaction_uuid,product_code'
            ) {
              console.error(
                '❌ Invalid signed_field_names format:',
                paymentResponse.formData.signed_field_names,
              );
              throw new Error('Invalid eSewa signed_field_names format');
            }
            console.log('✅ signed_field_names validation passed');

            // Safety check: Fix URL corruption if detected
            let cleanUrl = paymentResponse.url;
            if (cleanUrl.includes('e  pay') || cleanUrl.includes('e%20%20pay')) {
              console.warn('⚠️ URL corruption detected, fixing...');
              cleanUrl = cleanUrl.replace(/e\s+pay/g, 'epay').replace(/e%20%20pay/g, 'epay');
              console.log('🔧 Fixed URL:', cleanUrl);
            }

            // Validate URL format
            const expectedTestUrl = 'https://rc-epay.esewa.com.np/api/epay/main/v2/form';
            const expectedLiveUrl = 'https://epay.esewa.com.np/api/epay/main/v2/form';
            if (cleanUrl !== expectedTestUrl && cleanUrl !== expectedLiveUrl) {
              console.error('❌ Unexpected eSewa URL:', cleanUrl);
              console.error('❌ Expected:', expectedTestUrl, 'or', expectedLiveUrl);
              throw new Error('Invalid eSewa URL format');
            }
            console.log('✅ URL validation passed, proceeding to new window creation...');

            // Use immediate form submission with new window approach to bypass React interference
            console.log('🚀 Using new window approach to bypass React interference...');

            // Create form HTML exactly like working test
            const formHTML = `
              <!DOCTYPE html>
              <html>
              <head>
                <title>eSewa Payment</title>
                <style>
                  body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
                  .loading { font-size: 18px; color: #666; }
                </style>
              </head>
              <body>
                <div class="loading">Redirecting to eSewa...</div>
                <form id="esewaForm" method="POST" action="${cleanUrl}" style="display: none;">
                  ${Object.entries(paymentResponse.formData)
                    .map(
                      ([key, value]) =>
                        `<input type="hidden" name="${key}" value="${String(value)}" />`,
                    )
                    .join('')}
                </form>
                <script>
                  console.log('eSewa form created in new window');
                  console.log('Method:', document.getElementById('esewaForm').method);
                  console.log('Action:', document.getElementById('esewaForm').action);
                  
                  // Log all form fields for debugging
                  const form = document.getElementById('esewaForm');
                  console.log('Form fields:');
                  for (let i = 0; i < form.elements.length; i++) {
                    const element = form.elements[i];
                    console.log('  ' + element.name + ': ' + element.value);
                  }
                  
                  // Submit form immediately
                  setTimeout(() => {
                    console.log('Submitting eSewa form...');
                    document.getElementById('esewaForm').submit();
                  }, 500);
                </script>
              </body>
              </html>
            `;

            // Open new window and write the form
            console.log('🪟 Attempting to open new window...');
            const paymentWindow = window.open('', '_blank', 'width=800,height=600');
            if (paymentWindow) {
              console.log('✅ New window opened successfully');
              paymentWindow.document.write(formHTML);
              paymentWindow.document.close();
              console.log('✅ eSewa payment window created successfully');
            } else {
              console.error('❌ Failed to open payment window (pop-up blocked?)');
              toast({
                title: 'Pop-up Blocked',
                description: 'Please allow pop-ups for this site to complete payment.',
                variant: 'destructive',
              });
            }
          } else {
            console.error('❌ eSewa formData or URL missing, falling back to direct redirect');
            console.error('❌ formData:', paymentResponse.formData);
            console.error('❌ url:', paymentResponse.url);
            window.location.href = paymentResponse.url;
          }
        } else {
          // For other redirect-based payments (not Stripe)
          window.location.href = paymentResponse.url;
        }
      } else if (paymentResponse.transactionId) {
        // For non-redirect payments, show status tracker
        setCurrentTransactionId(paymentResponse.transactionId);
        setShowPaymentStatus(true);
        toast({
          title: 'Payment Initiated',
          description: 'Your payment is being processed.',
        });
      } else {
        // This case would be for non-redirect flows like COD or Bank Transfer
        toast({
          title: 'Order Submitted',
          description: 'Your order has been received.',
        });

        // DYNAMIC: Set appropriate status based on payment method using configuration
        const statusConfig = findStatusForPaymentMethod(paymentMethod);
        const orderStatus = statusConfig?.name || 'ordered'; // Fallback to 'ordered' if not found

        // Set payment status based on payment method
        let paymentStatus = 'unpaid'; // Default for all orders
        if (paymentMethod === 'cod') {
          // COD orders are considered "paid" upon delivery
          paymentStatus = 'unpaid'; // Will be updated to 'paid' after delivery
        }

        console.log(
          `Payment method: ${paymentMethod} → Order Status: ${orderStatus} (${statusConfig?.label || 'Default'}), Payment Status: ${paymentStatus}`,
        );

        // Log status resolution for debugging
        if (!statusConfig) {
          console.warn(
            `No specific status configuration found for payment method: ${paymentMethod}, using default 'ordered'`,
          );
        }

        const updateResult = await updateQuotesMutation.mutateAsync({
          ids: cartQuoteIds,
          status: orderStatus,
          method: paymentMethod,
          paymentStatus: paymentStatus,
        });

        // Send bank transfer email if payment method is bank_transfer
        if (paymentMethod === 'bank_transfer' && updateResult) {
          try {
            // Get bank details for the destination country
            const destinationCountry =
              selectedCartItems[0]?.destinationCountryCode ||
              selectedCartItems[0]?.countryCode ||
              'US';

            const { data: countrySettings } = await supabase
              .from('country_settings')
              .select('bank_accounts')
              .eq('code', destinationCountry)
              .single();

            if (countrySettings?.bank_accounts) {
              const formattedBankDetails = formatBankDetailsForEmail(
                countrySettings.bank_accounts,
                paymentCurrency,
              );

              // Create a quote object for the email
              const _quoteForEmail = {
                id: updateResult.id,
                display_id: updateResult.display_id,
                email: isGuestCheckout ? guestContact.email : user?.email || '',
                customer_name: isGuestCheckout
                  ? guestContact.fullName
                  : userProfile?.full_name || '',
                final_total: totalAmount,
                currency: paymentCurrency,
              };

              // Create a properly typed quote for email
              const typedQuoteForEmail: Parameters<typeof sendBankTransferEmail>[0] = {
                id: updateResult[0].id,
                display_id: updateResult[0].display_id || '',
                email: isGuestCheckout ? guestContact.email : user?.email || '',
                customer_name: isGuestCheckout
                  ? guestContact.fullName
                  : userProfile?.full_name || '',
                final_total: totalAmount,
                currency: paymentCurrency,
                status: updateResult[0].status,
                created_at: updateResult[0].created_at,
                user_id: updateResult[0].user_id || null,
              };

              sendBankTransferEmail(typedQuoteForEmail, formattedBankDetails);

              toast({
                title: 'Bank Transfer Details Sent',
                description: "We've sent bank transfer instructions to your email.",
              });
            }
          } catch (error) {
            console.warn('Failed to send bank transfer email:', error);
            // Don't fail the order if email fails
          }
        }
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      toast({
        title: 'An Error Occurred',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Show loading spinner while cart is rehydrating or guest quote is loading
  if (cartLoading || (isGuestCheckout && guestQuoteLoading)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="h-10 w-10 animate-spin text-muted-foreground mb-2" />
        <span className="text-muted-foreground text-sm">
          {isGuestCheckout ? 'Loading your quote...' : 'Loading your cart...'}
        </span>
      </div>
    );
  }

  // Loading states
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
            <Button onClick={() => navigate('/cart')} className="w-full">
              Return to Cart
            </Button>
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
            <h1 className="text-3xl font-bold text-gray-900">Checkout</h1>
            <p className="text-gray-600 mt-2">Complete your order securely</p>
          </div>

          {/* Shipping Route Display */}
          {purchaseCountry && shippingCountry && (
            <Card className="mb-8 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
              <CardContent className="py-4">
                <div className="flex items-center justify-center space-x-4">
                  <div className="text-center">
                    <div className="text-sm font-medium text-blue-800">From</div>
                    <div className="text-lg font-bold text-blue-900">
                      🌍{' '}
                      {countries?.find((c) => c.code === purchaseCountry)?.name || purchaseCountry}
                    </div>
                    <div className="text-xs text-blue-600">Purchase Country</div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-0.5 bg-blue-300"></div>
                    <Truck className="h-5 w-5 text-blue-500" />
                    <div className="w-8 h-0.5 bg-blue-300"></div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm font-medium text-blue-800">To</div>
                    <div className="text-lg font-bold text-blue-900">
                      🌍{' '}
                      {countries?.find((c) => c.code === shippingCountry)?.name || shippingCountry}
                    </div>
                    <div className="text-xs text-blue-600">Delivery Country</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid gap-8 lg:grid-cols-3">
            {/* Main Checkout Form */}
            <div className="lg:col-span-2 space-y-6">
              {/* Guest Checkout Options */}
              {isGuestCheckout && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <User className="h-5 w-5" />
                      Checkout Options
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Three checkout mode buttons */}
                    <div className="grid grid-cols-3 gap-2">
                      <Button
                        type="button"
                        variant={checkoutMode === 'guest' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setCheckoutMode('guest')}
                        className="text-xs"
                      >
                        Guest Checkout
                      </Button>
                      <Button
                        type="button"
                        variant={checkoutMode === 'signup' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setCheckoutMode('signup')}
                        className="text-xs"
                      >
                        Create Account
                      </Button>
                      <Button
                        type="button"
                        variant={checkoutMode === 'signin' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setCheckoutMode('signin')}
                        className="text-xs"
                      >
                        Sign In
                      </Button>
                    </div>

                    {/* Currency Selection for Guest Checkout */}
                    {checkoutMode === 'guest' && availableCurrencies && (
                      <div className="mb-4">
                        <Label htmlFor="guest-currency">Payment Currency</Label>
                        <select
                          id="guest-currency"
                          className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          value={guestSelectedCurrency}
                          onChange={(e) => setGuestSelectedCurrency(e.target.value)}
                        >
                          {availableCurrencies?.map((currency) => (
                            <option key={currency.code} value={currency.code}>
                              {currency.symbol} {currency.formatted}
                            </option>
                          ))}
                        </select>
                        <p className="text-xs text-muted-foreground mt-1">
                          Choose your preferred payment currency. Payment methods will be filtered
                          accordingly.
                        </p>
                      </div>
                    )}

                    {/* Dynamic form based on checkout mode */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {checkoutMode === 'guest' && (
                        <>
                          <div>
                            <Label htmlFor="guest-full-name">Full Name *</Label>
                            <Input
                              id="guest-full-name"
                              value={guestContact.fullName}
                              onChange={(e) =>
                                setGuestContact({
                                  ...guestContact,
                                  fullName: e.target.value,
                                })
                              }
                              placeholder="John Doe"
                              required
                            />
                          </div>
                          <div>
                            <Label htmlFor="guest-email">Email Address *</Label>
                            <Input
                              id="guest-email"
                              type="email"
                              value={guestContact.email}
                              onChange={(e) =>
                                setGuestContact({
                                  ...guestContact,
                                  email: e.target.value,
                                })
                              }
                              placeholder="john@example.com"
                              required
                            />
                          </div>
                        </>
                      )}

                      {(checkoutMode === 'signup' || checkoutMode === 'signin') && (
                        <>
                          {checkoutMode === 'signup' && (
                            <div>
                              <Label htmlFor="account-full-name">Full Name *</Label>
                              <Input
                                id="account-full-name"
                                value={accountData.fullName}
                                onChange={(e) =>
                                  setAccountData({
                                    ...accountData,
                                    fullName: e.target.value,
                                  })
                                }
                                placeholder="John Doe"
                                required
                              />
                            </div>
                          )}
                          <div className={checkoutMode === 'signup' ? '' : 'md:col-span-2'}>
                            <Label htmlFor="account-email">Email Address *</Label>
                            <Input
                              id="account-email"
                              type="email"
                              value={accountData.email}
                              onChange={(e) =>
                                setAccountData({
                                  ...accountData,
                                  email: e.target.value,
                                })
                              }
                              placeholder="john@example.com"
                              required
                            />
                          </div>
                          <div className={checkoutMode === 'signup' ? '' : 'md:col-span-2'}>
                            <Label htmlFor="account-password">Password *</Label>
                            <Input
                              id="account-password"
                              type="password"
                              value={accountData.password}
                              onChange={(e) =>
                                setAccountData({
                                  ...accountData,
                                  password: e.target.value,
                                })
                              }
                              placeholder={
                                checkoutMode === 'signin'
                                  ? 'Enter your password'
                                  : 'Create a secure password'
                              }
                              required
                            />
                          </div>
                          {checkoutMode === 'signup' && (
                            <div>
                              <Label htmlFor="account-confirm-password">Confirm Password *</Label>
                              <Input
                                id="account-confirm-password"
                                type="password"
                                value={accountData.confirmPassword}
                                onChange={(e) =>
                                  setAccountData({
                                    ...accountData,
                                    confirmPassword: e.target.value,
                                  })
                                }
                                placeholder="Confirm your password"
                                required
                              />
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    <div className="text-sm text-muted-foreground bg-blue-50 p-3 rounded-lg">
                      <p>
                        {checkoutMode === 'guest' &&
                          "Complete your order without creating an account. You'll receive order updates via email."}
                        {checkoutMode === 'signin' &&
                          'Sign in to your existing account to track your order and access your purchase history.'}
                        {checkoutMode === 'signup' &&
                          'Create an account to easily track your order and manage future purchases.'}
                      </p>
                    </div>

                    {/* Action buttons for signin/signup */}
                    {checkoutMode === 'signin' && (
                      <div className="flex justify-between items-center">
                        <Button
                          type="button"
                          onClick={async () => {
                            if (!accountData.email || !accountData.password) {
                              toast({
                                title: 'Missing Information',
                                description: 'Please enter your email and password',
                                variant: 'destructive',
                              });
                              return;
                            }

                            setIsProcessing(true);
                            try {
                              const { data: signInData, error: signInError } =
                                await supabase.auth.signInWithPassword({
                                  email: accountData.email,
                                  password: accountData.password,
                                });

                              if (signInError) {
                                toast({
                                  title: 'Sign In Failed',
                                  description:
                                    'Invalid email or password. Please check your credentials.',
                                  variant: 'destructive',
                                });
                                return;
                              }

                              // Update quote ownership
                              if (signInData.user) {
                                await supabase
                                  .from('quotes')
                                  .update({
                                    user_id: signInData.user.id,
                                    is_anonymous: false,
                                  })
                                  .eq('id', guestQuoteId);
                              }

                              toast({
                                title: 'Welcome Back!',
                                description: 'Successfully signed in. Redirecting...',
                              });

                              // Reload to refresh auth state
                              setTimeout(() => window.location.reload(), 1000);
                            } catch {
                              toast({
                                title: 'Error',
                                description: 'Failed to sign in. Please try again.',
                                variant: 'destructive',
                              });
                            } finally {
                              setIsProcessing(false);
                            }
                          }}
                          disabled={isProcessing}
                          className="w-full"
                        >
                          {isProcessing ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Signing in...
                            </>
                          ) : (
                            <>
                              <User className="mr-2 h-4 w-4" />
                              Sign In
                            </>
                          )}
                        </Button>
                      </div>
                    )}

                    {checkoutMode === 'signup' && (
                      <div className="flex justify-between items-center">
                        <Button
                          type="button"
                          onClick={async () => {
                            if (
                              !accountData.email ||
                              !accountData.password ||
                              !accountData.fullName
                            ) {
                              toast({
                                title: 'Missing Information',
                                description: 'Please fill in all required fields',
                                variant: 'destructive',
                              });
                              return;
                            }

                            if (accountData.password !== accountData.confirmPassword) {
                              toast({
                                title: 'Password Mismatch',
                                description: 'Passwords do not match',
                                variant: 'destructive',
                              });
                              return;
                            }

                            setIsProcessing(true);
                            try {
                              const { data: authData, error: authError } =
                                await supabase.auth.signUp({
                                  email: accountData.email,
                                  password: accountData.password,
                                  options: {
                                    data: {
                                      full_name: accountData.fullName,
                                      created_via: 'guest_checkout',
                                    },
                                  },
                                });

                              if (authError) {
                                if (authError.message.includes('already registered')) {
                                  toast({
                                    title: 'Account Already Exists',
                                    description:
                                      'An account with this email already exists. Please sign in instead.',
                                    variant: 'destructive',
                                  });
                                  setCheckoutMode('signin');
                                  return;
                                }
                                throw authError;
                              }

                              // Update quote ownership
                              if (authData.user) {
                                await supabase
                                  .from('quotes')
                                  .update({
                                    user_id: authData.user.id,
                                    is_anonymous: false,
                                  })
                                  .eq('id', guestQuoteId);
                              }

                              toast({
                                title: 'Account Created!',
                                description: 'Please check your email to verify your account.',
                              });

                              // Sign in immediately after signup
                              const { error: signInError } = await supabase.auth.signInWithPassword(
                                {
                                  email: accountData.email,
                                  password: accountData.password,
                                },
                              );

                              if (!signInError) {
                                setTimeout(() => window.location.reload(), 1000);
                              }
                            } catch (error) {
                              const errorMessage =
                                error instanceof Error
                                  ? error.message
                                  : 'Failed to create account. Please try again.';
                              toast({
                                title: 'Error',
                                description: errorMessage,
                                variant: 'destructive',
                              });
                            } finally {
                              setIsProcessing(false);
                            }
                          }}
                          disabled={isProcessing}
                          className="w-full"
                        >
                          {isProcessing ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Creating Account...
                            </>
                          ) : (
                            <>
                              <User className="mr-2 h-4 w-4" />
                              Create Account
                            </>
                          )}
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Shipping Address */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Shipping Address
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Guest checkout with loaded address */}
                  {isGuestCheckout &&
                  (selectedAddress === 'guest-address-loaded' ||
                    selectedAddress === 'guest-address') &&
                  isAddressComplete(addressFormData) ? (
                    <div className="space-y-4">
                      <div className="p-4 border rounded-lg bg-gray-50">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">
                                  {addressFormData.recipient_name ||
                                    guestContact.fullName ||
                                    'Guest'}
                                </span>
                                <Badge variant="secondary">Guest Address</Badge>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {addressFormData.address_line1}
                              </p>
                              {addressFormData.address_line2 && (
                                <p className="text-sm text-muted-foreground">
                                  {addressFormData.address_line2}
                                </p>
                              )}
                              <p className="text-sm text-muted-foreground">
                                {addressFormData.city}, {addressFormData.state_province_region}{' '}
                                {addressFormData.postal_code}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {countries?.find((c) => c.code === addressFormData.country)?.name ||
                                  addressFormData.country}
                              </p>
                              {addressFormData.phone && (
                                <p className="text-sm text-muted-foreground">
                                  <Phone className="h-3 w-3 inline mr-1" />
                                  {addressFormData.phone}
                                </p>
                              )}
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowAddressForm(true)}
                          >
                            <Edit3 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : !isGuestCheckout &&
                    selectedAddress === 'temp-address' &&
                    isAddressComplete(addressFormData) ? (
                    // Temporary address for authenticated users
                    <div className="space-y-4">
                      <div className="p-4 border rounded-lg bg-gray-50">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">
                                  {addressFormData.recipient_name ||
                                    userProfile?.full_name ||
                                    'User'}
                                </span>
                                <Badge variant="secondary">One-time Address</Badge>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {addressFormData.address_line1}
                              </p>
                              {addressFormData.address_line2 && (
                                <p className="text-sm text-muted-foreground">
                                  {addressFormData.address_line2}
                                </p>
                              )}
                              <p className="text-sm text-muted-foreground">
                                {addressFormData.city}, {addressFormData.state_province_region}{' '}
                                {addressFormData.postal_code}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {countries?.find((c) => c.code === addressFormData.country)?.name ||
                                  addressFormData.country}
                              </p>
                              {addressFormData.phone && (
                                <p className="text-sm text-muted-foreground">
                                  <Phone className="h-3 w-3 inline mr-1" />
                                  {addressFormData.phone}
                                </p>
                              )}
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowAddressForm(true)}
                          >
                            <Edit3 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : !addresses || addresses.length === 0 || isGuestCheckout ? (
                    <div className="text-center py-6">
                      <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-medium mb-2">
                        {isGuestCheckout
                          ? 'Add Shipping Address'
                          : `No addresses found for ${countries?.find((c) => c.code === shippingCountry)?.name || shippingCountry}`}
                      </h3>
                      <p className="text-muted-foreground mb-4">
                        {isGuestCheckout
                          ? 'Please provide a shipping address for your order.'
                          : `Please add a shipping address for delivery to ${countries?.find((c) => c.code === shippingCountry)?.name || shippingCountry}.`}
                      </p>
                      <Button onClick={() => setShowAddressForm(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Address
                      </Button>
                    </div>
                  ) : (
                    <>
                      <RadioGroup value={selectedAddress} onValueChange={setSelectedAddress}>
                        <div className="space-y-3">
                          {addresses.map((address) => (
                            <div
                              key={address.id}
                              className="flex items-start space-x-3 p-4 border rounded-lg hover:border-primary transition-colors"
                            >
                              <RadioGroupItem value={address.id} id={address.id} className="mt-1" />
                              <Label htmlFor={address.id} className="flex-1 cursor-pointer">
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium">{address.address_line1}</span>
                                    {address.is_default && (
                                      <Badge variant="secondary">Default</Badge>
                                    )}
                                  </div>
                                  {address.address_line2 && (
                                    <p className="text-sm text-muted-foreground">
                                      {address.address_line2}
                                    </p>
                                  )}
                                  <p className="text-sm text-muted-foreground">
                                    {address.city}, {address.state_province_region}{' '}
                                    {address.postal_code}
                                  </p>
                                  <p className="text-sm text-muted-foreground">
                                    {address.destination_country}
                                  </p>
                                </div>
                              </Label>
                            </div>
                          ))}
                        </div>
                      </RadioGroup>

                      <div className="pt-4 border-t">
                        <Button
                          variant="outline"
                          onClick={() => setShowAddressForm(true)}
                          className="w-full"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add New Address
                        </Button>
                      </div>
                    </>
                  )}

                  {/* Inline Address Form */}
                  {showAddressForm && (
                    <div className="border rounded-lg p-6 bg-gray-50 space-y-4 mt-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">Add New Address</h4>
                        <Button variant="ghost" size="sm" onClick={() => setShowAddressForm(false)}>
                          Cancel
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="recipient_name">Recipient Name *</Label>
                          <Input
                            id="recipient_name"
                            value={addressFormData.recipient_name || ''}
                            onChange={(e) =>
                              setAddressFormData({
                                ...addressFormData,
                                recipient_name: e.target.value,
                              })
                            }
                            placeholder="John Doe"
                          />
                        </div>
                        <div>
                          <Label htmlFor="phone">Phone Number</Label>
                          <Input
                            id="phone"
                            value={addressFormData.phone || ''}
                            onChange={(e) =>
                              setAddressFormData({
                                ...addressFormData,
                                phone: e.target.value,
                              })
                            }
                            placeholder="+1 234 567 8900"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <Label htmlFor="address_line1">Street Address *</Label>
                          <Input
                            id="address_line1"
                            value={addressFormData.address_line1}
                            onChange={(e) =>
                              setAddressFormData({
                                ...addressFormData,
                                address_line1: e.target.value,
                              })
                            }
                            placeholder="123 Main St"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <Label htmlFor="address_line2">Apartment, suite, etc. (optional)</Label>
                          <Input
                            id="address_line2"
                            value={addressFormData.address_line2}
                            onChange={(e) =>
                              setAddressFormData({
                                ...addressFormData,
                                address_line2: e.target.value,
                              })
                            }
                            placeholder="Apt 4B"
                          />
                        </div>
                        <div>
                          <Label htmlFor="city">City *</Label>
                          <Input
                            id="city"
                            value={addressFormData.city}
                            onChange={(e) =>
                              setAddressFormData({
                                ...addressFormData,
                                city: e.target.value,
                              })
                            }
                            placeholder="New York"
                          />
                        </div>
                        <div>
                          <Label htmlFor="state">State/Province *</Label>
                          <Input
                            id="state"
                            value={addressFormData.state_province_region}
                            onChange={(e) =>
                              setAddressFormData({
                                ...addressFormData,
                                state_province_region: e.target.value,
                              })
                            }
                            placeholder="NY"
                          />
                        </div>
                        <div>
                          <Label htmlFor="postal_code">Postal Code *</Label>
                          <Input
                            id="postal_code"
                            value={addressFormData.postal_code}
                            onChange={(e) =>
                              setAddressFormData({
                                ...addressFormData,
                                postal_code: e.target.value,
                              })
                            }
                            placeholder="10001"
                          />
                        </div>
                        <div>
                          <Label htmlFor="country">Country *</Label>
                          <Input
                            id="country"
                            value={
                              countries?.find((c) => c.code === shippingCountry)?.name ||
                              shippingCountry ||
                              ''
                            }
                            disabled
                            className="bg-gray-100"
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            Country is determined by your quote's destination
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="is_default"
                          checked={addressFormData.is_default}
                          onCheckedChange={(checked) =>
                            setAddressFormData({
                              ...addressFormData,
                              is_default: checked as boolean,
                            })
                          }
                        />
                        <Label htmlFor="is_default">Set as default address</Label>
                      </div>

                      {/* Show save to profile option only for authenticated users */}
                      {!isGuestCheckout && (
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="save_to_profile"
                            checked={addressFormData.save_to_profile}
                            onCheckedChange={(checked) =>
                              setAddressFormData({
                                ...addressFormData,
                                save_to_profile: checked as boolean,
                              })
                            }
                          />
                          <Label htmlFor="save_to_profile">Save this address to my profile</Label>
                        </div>
                      )}

                      <Button
                        onClick={handleAddAddress}
                        disabled={addAddressMutation.isPending}
                        className="w-full"
                      >
                        {addAddressMutation.isPending ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Adding Address...
                          </>
                        ) : (
                          'Add Address'
                        )}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Payment Method */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Payment Method
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <PaymentMethodSelector
                    selectedMethod={paymentMethod}
                    onMethodChange={handlePaymentMethodChange}
                    amount={totalAmount}
                    currency={paymentCurrency}
                    showRecommended={true}
                    disabled={isProcessing}
                    availableMethods={availableMethods}
                    methodsLoading={methodsLoading}
                    originCountry={selectedCartItems[0]?.purchaseCountryCode || selectedCartItems[0]?.countryCode || 'US'}
                  />
                </CardContent>
              </Card>

              {/* Security Notice */}
              <Card className="border-blue-200 bg-blue-50">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-blue-900">Secure Checkout</h4>
                      <p className="text-sm text-blue-700 mt-1">
                        Your payment information is encrypted and secure. We never store your card
                        details.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Order Summary Sidebar */}
            <div className="space-y-6">
              <Card className="sticky top-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ShoppingCart className="h-5 w-5" />
                    Order Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {selectedCartItems.map((item) => (
                    <div
                      key={item.quoteId}
                      className="flex justify-between items-start p-3 border rounded-lg"
                    >
                      <div className="flex-1">
                        <Link
                          to={`/quote-details/${item.quoteId}`}
                          className="font-medium hover:underline text-primary"
                        >
                          <h4>{item.productName}</h4>
                        </Link>
                        <p className="text-sm text-muted-foreground">
                          {item.quantity} item{item.quantity !== 1 ? 's' : ''}
                        </p>
                        <Badge variant="outline">{item.countryCode}</Badge>
                      </div>
                      <div className="text-right">
                        <div className="font-bold">
                          <CheckoutItemPrice
                            item={item}
                            displayCurrency={isGuestCheckout ? paymentCurrency : undefined}
                            selectedPaymentMethod={paymentMethod}
                            currencyConversion={currencyConversion}
                          />
                        </div>
                      </div>
                    </div>
                  ))}

                  <Separator />

                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Subtotal:</span>
                      <span>
                        <CheckoutTotal
                          items={selectedCartItems}
                          displayCurrency={isGuestCheckout ? paymentCurrency : undefined}
                          selectedPaymentMethod={paymentMethod}
                          currencyConversion={currencyConversion}
                        />
                      </span>
                    </div>
                    <div className="flex justify-between font-bold text-lg">
                      <span>Total:</span>
                      <span>
                        <CheckoutTotal
                          items={selectedCartItems}
                          displayCurrency={isGuestCheckout ? paymentCurrency : undefined}
                          selectedPaymentMethod={paymentMethod}
                          currencyConversion={currencyConversion}
                        />
                      </span>
                    </div>
                    
                    {/* Show payment information only when currency conversion is needed */}
                    {(() => {
                      const isLocalGateway = ['khalti', 'fonepay', 'esewa', 'payu'].includes(paymentMethod || '');
                      const isInternationalGateway = ['paypal', 'stripe', 'airwallex'].includes(paymentMethod || '');
                      const quoteCurrency = selectedCartItems[0]?.finalCurrency || 'USD';
                      const showConversion = (
                        (isLocalGateway && quoteCurrency === 'USD') || 
                        (isInternationalGateway && quoteCurrency !== 'USD')
                      );
                      
                      if (!showConversion || !paymentMethod) return null;
                      
                      const totalAmount = selectedCartItems.reduce((total, item) => total + ((item.finalTotal || 0) * (item.quantity || 1)), 0);
                      
                      if (isLocalGateway && quoteCurrency === 'USD') {
                        // Local gateway with USD quote - show USD to local currency conversion
                        const exchangeRate = currencyConversion?.rate || 133;
                        const convertedAmount = (totalAmount * exchangeRate).toFixed(0);
                        return (
                          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                            <p className="text-sm text-blue-800 font-medium">
                              💡 Payment Information
                            </p>
                            <p className="text-xs text-blue-700 mt-1">
                              Your ${totalAmount.toFixed(2)} USD quote will be charged as ≈ {getCurrencySymbol(paymentCurrency || 'NPR')}{convertedAmount} {paymentCurrency || 'NPR'} via {paymentMethod}.
                            </p>
                            <p className="text-xs text-blue-600 mt-1">
                              Exchange rate: 1 USD = {exchangeRate} {paymentCurrency || 'NPR'} {currencyConversion?.source ? `(${currencyConversion.source})` : ''}
                            </p>
                          </div>
                        );
                      } else if (isInternationalGateway && quoteCurrency !== 'USD') {
                        // International gateway with local currency quote - show local to USD conversion
                        const exchangeRate = currencyConversion?.rate || (1/133);
                        const convertedAmount = (totalAmount * exchangeRate).toFixed(2);
                        return (
                          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                            <p className="text-sm text-blue-800 font-medium">
                              💡 Payment Information
                            </p>
                            <p className="text-xs text-blue-700 mt-1">
                              Your {getCurrencySymbol(quoteCurrency)}{totalAmount.toFixed(0)} {quoteCurrency} quote will be charged as ≈ ${convertedAmount} USD via {paymentMethod}.
                            </p>
                            <p className="text-xs text-blue-600 mt-1">
                              Exchange rate: 1 {quoteCurrency} = {exchangeRate} USD {currencyConversion?.source ? `(${currencyConversion.source})` : ''}
                            </p>
                          </div>
                        );
                      }
                      
                      return null;
                    })()}
                  </div>

                  <Button
                    onClick={handlePlaceOrder}
                    disabled={
                      !canPlaceOrder ||
                      isProcessing ||
                      (!isGuestCheckout && (!addresses || addresses.length === 0)) ||
                      (isGuestCheckout && checkoutMode !== 'guest' && !user)
                    }
                    className="w-full"
                    size="lg"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        {isGuestCheckout &&
                          checkoutMode === 'signin' &&
                          'Please Sign In Above First'}
                        {isGuestCheckout &&
                          checkoutMode === 'signup' &&
                          'Please Create Account Above First'}
                        {(!isGuestCheckout || checkoutMode === 'guest') && (
                          <>
                            Place Order
                          </>
                        )}
                      </>
                    )}
                  </Button>

                  <p className="text-xs text-muted-foreground text-center">
                    By placing this order, you agree to our terms and conditions.
                  </p>
                </CardContent>
              </Card>
            </div>
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
          amount={totalAmount}
          currency={paymentCurrency}
          transactionId={qrPaymentData.transactionId}
          onPaymentComplete={handleQRPaymentComplete}
          onPaymentFailed={handleQRPaymentFailed}
        />
      )}

      {/* Stripe Payment Form Modal */}
      {stripeClientSecret && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="mb-4">
              <h2 className="text-xl font-semibold text-center">Complete Your Payment</h2>
              <p className="text-sm text-muted-foreground text-center mt-2">
                Enter your card details to complete your order
              </p>
            </div>
            <StripePaymentForm
              client_secret={stripeClientSecret}
              amount={totalAmount}
              currency={paymentCurrency}
              customerInfo={{
                name: isGuestCheckout
                  ? addressFormData.recipient_name || guestContact.fullName
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
              onSuccess={async (paymentIntent) => {
                console.log('Payment Succeeded!', paymentIntent);

                // Update quote status to processing for Stripe payments
                try {
                  const statusConfig = findStatusForPaymentMethod('stripe');
                  const processingStatus = statusConfig?.name || 'processing';

                  console.log(
                    `Setting Stripe quotes to ${processingStatus} status after successful payment`,
                  );

                  await updateQuotesMutation.mutateAsync({
                    ids: cartQuoteIds,
                    status: processingStatus,
                    method: 'stripe',
                    paymentStatus: 'paid', // Mark as paid since payment succeeded
                  });

                  toast({
                    title: 'Payment Successful',
                    description: 'Your payment has been processed successfully.',
                  });

                  // Hide the form
                  setStripeClientSecret(null);

                  // Navigate to order confirmation
                  // The updateQuotesMutation will handle the redirect
                } catch (error) {
                  console.error('Error updating quotes after payment:', error);
                  toast({
                    title: 'Payment Successful',
                    description:
                      'Payment completed, but there was an issue updating your order. Please contact support.',
                  });
                  setStripeClientSecret(null);
                }
              }}
              onError={(error) => {
                console.error('Payment Failed:', error);
                toast({
                  title: 'Payment Failed',
                  description:
                    error || 'There was an issue processing your payment. Please try again.',
                  variant: 'destructive',
                });
                // Hide the form to allow retry
                setStripeClientSecret(null);
              }}
            />

            {/* Cancel button */}
            <div className="mt-4 text-center">
              <button
                onClick={() => setStripeClientSecret(null)}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                Cancel Payment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Status Tracker */}
      {showPaymentStatus && currentTransactionId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <PaymentStatusTracker
              transactionId={currentTransactionId}
              gateway={paymentMethod}
              onStatusChange={(status) => {
                if (status === 'completed') {
                  setShowPaymentStatus(false);
                  toast({
                    title: 'Payment Successful',
                    description: 'Your payment has been processed successfully.',
                  });
                  navigate('/dashboard/orders');
                } else if (status === 'failed') {
                  setShowPaymentStatus(false);
                  toast({
                    title: 'Payment Failed',
                    description: 'There was an issue processing your payment. Please try again.',
                    variant: 'destructive',
                  });
                }
              }}
              autoRefresh={true}
              refreshInterval={3000}
            />
          </div>
        </div>
      )}
    </div>
  );
}
