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
  Globe,
  CheckCircle,
  X,
  Check,
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
import { PaymentCurrencyConversion } from '@/components/payment/PaymentCurrencyConversion';
import { StripePaymentForm } from '@/components/payment/StripePaymentForm';
import { useStatusManagement } from '@/hooks/useStatusManagement';
import { usePaymentCurrencyConversion } from '@/hooks/usePaymentCurrencyConversion';
import { QRPaymentModal } from '@/components/payment/QRPaymentModal';
import { PaymentStatusTracker } from '@/components/payment/PaymentStatusTracker';
import { PaymentGateway, PaymentRequest } from '@/types/payment';
import {
  quoteAddressToCheckoutForm,
  checkoutFormToQuoteAddress,
  isAddressComplete,
  extractQuoteShippingAddress,
} from '@/lib/addressUtils';
import { formatAmountForDisplay } from '@/lib/currencyUtils';
import { checkoutSessionService } from '@/services/CheckoutSessionService';
import { useEmailNotifications } from '@/hooks/useEmailNotifications';
import { formatBankDetailsForEmail } from '@/lib/bankDetailsFormatter';
import { AddressModal } from '@/components/checkout/AddressModal';

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
  paymentConversion,
}: {
  item: CartItem;
  displayCurrency?: string;
  paymentConversion?: {
    convertedAmount: number;
    convertedCurrency: string;
    needsConversion: boolean;
    originalAmount: number;
  } | null;
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

  // If payment conversion is active, show the converted amount proportionally
  if (paymentConversion?.needsConversion) {
    const itemTotalOriginal = (item.finalTotal || 0) * (item.quantity || 1);
    const conversionRatio = paymentConversion.convertedAmount / paymentConversion.originalAmount;
    const convertedItemTotal = itemTotalOriginal * conversionRatio;
    const convertedItemPrice = convertedItemTotal / (item.quantity || 1);
    
    return <>{formatAmountForDisplay(convertedItemPrice, paymentConversion.convertedCurrency, 1)}</>;
  }

  // If displayCurrency is provided (for guest checkout), use that currency directly
  if (displayCurrency) {
    return <>{formatAmountForDisplay(item.finalTotal, displayCurrency, 1)}</>;
  }

  // For authenticated users, use the existing quote display currency logic
  return <>{formatAmount(item.finalTotal)}</>;
};

// Component to display checkout total with proper currency conversion
const CheckoutTotal = ({
  items,
  displayCurrency,
  paymentConversion,
}: {
  items: CartItem[];
  displayCurrency?: string;
  paymentConversion?: {
    convertedAmount: number;
    convertedCurrency: string;
    needsConversion: boolean;
    originalAmount: number;
  } | null;
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

  // If payment conversion is active, show the converted total amount
  if (paymentConversion?.needsConversion) {
    return <>{formatAmountForDisplay(paymentConversion.convertedAmount, paymentConversion.convertedCurrency, 1)}</>;
  }

  // Calculate total from all items
  const totalAmount = items.reduce((sum, item) => sum + item.finalTotal, 0);

  // If displayCurrency is provided (for guest checkout), use that currency directly
  if (displayCurrency) {
    return <>{formatAmountForDisplay(totalAmount, displayCurrency, 1)}</>;
  }

  // For authenticated users, use the existing quote display currency logic
  return <>{formatAmount(totalAmount)}</>;
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
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [qrPaymentData, setQrPaymentData] = useState<{
    qrCodeUrl: string;
    transactionId: string;
    gateway: PaymentGateway;
  } | null>(null);
  const [showPaymentStatus, setShowPaymentStatus] = useState(false);
  const [currentTransactionId, setCurrentTransactionId] = useState<string>('');
  const [stripeClientSecret, setStripeClientSecret] = useState<string | null>(null);
  
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
  
  // Logged-in user currency override (allows changing from profile default)
  const [userSelectedCurrency, setUserSelectedCurrency] = useState<string>('');

  // Guest checkout session token (for temporary data storage)
  const [guestSessionToken, setGuestSessionToken] = useState<string>('');

  const { data: userProfile } = useUserProfile();
  const { formatAmount: _formatAmount } = useUserCurrency();
  const { data: countries } = useAllCountries();
  const { sendBankTransferEmail } = useEmailNotifications();
  const { findStatusForPaymentMethod } = useStatusManagement();

  // Fetch available currencies for both guest and logged-in user selection using CurrencyService
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
    // CHANGED: Enable for both guest and logged-in users
    enabled: true,
  });

  // Fetch guest quote if this is a guest checkout
  const { data: guestQuote, isLoading: guestQuoteLoading, refetch: refetchGuestQuote } = useQuery({
    queryKey: ['guest-quote', guestQuoteId],
    queryFn: async () => {
      if (!guestQuoteId) return null;

      const { data, error } = await supabase
        .from('quotes')
        .select(
          `
          *,
          quote_items (*),
          share_token
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
            finalTotal: guestQuote.final_total_usd || 0,
            countryCode: guestQuote.destination_country || 'US', // FIXED: Use 'US' instead of 'Unknown'
            purchaseCountryCode: guestQuote.origin_country || 'US', // FIXED: Use origin_country for purchase country
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
                    'US' // FIXED: Use 'US' instead of 'Unknown'
                  );
                } catch {
                  return guestQuote.destination_country || 'US'; // FIXED: Use 'US' instead of 'Unknown'
                }
              }
              return guestQuote.destination_country || 'US'; // FIXED: Use 'US' instead of 'Unknown'
            })(),
          },
        ]
      : []
    : selectedQuoteIds.length > 0
      ? cartItems.filter((item) => selectedQuoteIds.includes(item.quoteId))
      : cartItems; // Use all cart items when no specific quotes are selected

  // Get the shipping country from selected items
  // All quotes in checkout should have the same destination country
  // FIXED: Provide 'US' fallback instead of null to ensure payment methods can load
  const shippingCountry =
    selectedCartItems.length > 0
      ? selectedCartItems[0].destinationCountryCode ||
        selectedCartItems[0].countryCode ||
        selectedCartItems[0].purchaseCountryCode ||
        'US' // FIXED: Add fallback
      : 'US'; // FIXED: Use 'US' instead of null

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
  // FIXED: Ensure guestCurrency is never undefined to prevent payment methods from failing to load
  const guestCurrency = isGuestCheckout
    ? guestSelectedCurrency || defaultGuestCurrency || 'USD'
    : undefined;

  // FIXED: For guest checkout, ensure we always pass a valid currency to prevent empty payment methods
  // The hook should be called with USD as fallback if no currency is determined yet
  // UPDATED: Also pass user-selected currency for logged-in users when they override their profile
  const paymentGatewayCurrency = isGuestCheckout
    ? guestCurrency || 'USD' // Always provide USD as final fallback
    : userSelectedCurrency; // Pass user override currency, or undefined to use profile

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
  } = usePaymentGateways(paymentGatewayCurrency, shippingCountry);

  // Debug logging for payment state (development only)
  useEffect(() => {
    if (import.meta.env.DEV) {
      console.log(isGuestCheckout ? '💳 Guest checkout payment state:' : '💳 Logged-in user payment state:', {
        isGuestCheckout,
        // Guest specific
        guestCurrency: isGuestCheckout ? guestCurrency : undefined,
        guestSelectedCurrency: isGuestCheckout ? guestSelectedCurrency : undefined,
        defaultGuestCurrency: isGuestCheckout ? defaultGuestCurrency : undefined,
        // User specific
        userSelectedCurrency: !isGuestCheckout ? userSelectedCurrency : undefined,
        userProfileCurrency: !isGuestCheckout ? userProfile?.preferred_display_currency : undefined,
        // Common
        paymentCurrency,
        paymentGatewayCurrency,
        availableMethods,
        methodsLoading,
        shippingCountry,
        selectedCartItems: selectedCartItems.length,
        '🔍 Hook Result': { availableMethods, methodsLoading },
      });
    }
  }, [
    isGuestCheckout,
    guestCurrency,
    guestSelectedCurrency,
    defaultGuestCurrency,
    userSelectedCurrency,
    userProfile?.preferred_display_currency,
    paymentCurrency,
    paymentGatewayCurrency,
    availableMethods,
    methodsLoading,
    shippingCountry,
    selectedCartItems,
    guestQuote,
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
    : userSelectedCurrency || userProfile?.preferred_display_currency || 'USD';

  // Get purchase country for route display (where we buy from)
  const purchaseCountry =
    selectedCartItems.length > 0 ? selectedCartItems[0].purchaseCountryCode : null;

  // Calculate total amount for currency conversion
  const totalAmount = selectedCartItems.reduce((total, item) => {
    if (!item || typeof item.finalTotal !== 'number' || typeof item.quantity !== 'number') {
      console.warn('Invalid cart item data:', item);
      return total;
    }
    return total + item.finalTotal * item.quantity;
  }, 0);

  // Get currency conversion for the selected payment method
  const { conversion: paymentConversion } = usePaymentCurrencyConversion({
    gateway: paymentMethod,
    amount: totalAmount,
    currency: paymentCurrency,
    originCountry: purchaseCountry || 'US',
    enabled: !!paymentMethod && totalAmount > 0,
  });

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
        setShowAddressModal(false); // Don't show the form if we have a complete address
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
      setShowAddressModal(false);
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

  // Calculations (totalAmount is already defined above)

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
        ? guestContact.email && (guestContact.fullName || guestQuote?.email) // Allow approved quotes without fullName
        : checkoutMode === 'signin'
          ? accountData.email && accountData.password
          : accountData.email &&
            accountData.password &&
            accountData.fullName &&
            accountData.password === accountData.confirmPassword));

  const handleAddAddress = async (data?: AddressFormData) => {
    const formData = data || addressFormData;
    if (
      !formData.recipient_name ||
      !formData.address_line1 ||
      !formData.city ||
      !formData.state_province_region ||
      !formData.postal_code ||
      !formData.country
    ) {
      toast({
        title: 'Missing Information',
        description: 'Please fill in all required fields.',
        variant: 'destructive',
      });
      return;
    }

    // Update the addressFormData with the new data if provided
    if (data) {
      setAddressFormData(data);
    }

    if (isGuestCheckout) {
      // For guest checkout, we'll save the address after account creation
      // For now, just close the form and mark address as "provided"
      setShowAddressModal(false);
      setSelectedAddress('guest-address'); // Use a placeholder ID
      toast({
        title: 'Address Added',
        description: 'Address will be saved when you complete your order.',
      });
      return;
    }

    // For authenticated users, check if they want to save the address to profile
    if (formData.save_to_profile) {
      await addAddressMutation.mutateAsync(formData);
    } else {
      // Just use the address for this order without saving it
      setShowAddressModal(false);
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

    // Simple email validation
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

      // Refresh the quote data
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

    // Validate total amount before creating payment request
    if (!totalAmount || totalAmount <= 0 || isNaN(totalAmount) || !isFinite(totalAmount)) {
      toast({
        title: 'Invalid Amount',
        description: 'The total amount is invalid. Please check your cart items.',
        variant: 'destructive',
      });
      setIsProcessing(false);
      return;
    }

    const paymentRequest: PaymentRequest = {
      quoteIds: cartQuoteIds,
      amount: paymentConversion?.convertedAmount || totalAmount,
      currency: paymentConversion?.convertedCurrency || paymentCurrency,
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
                payment_amount: paymentConversion?.convertedAmount || totalAmount,
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
                payment_amount: paymentConversion?.convertedAmount || totalAmount,
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
            amount: (paymentConversion?.convertedAmount || totalAmount).toFixed(2),
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
                final_total_usd: totalAmount,
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
                final_total_usd: totalAmount,
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
            <h1 className="text-2xl font-medium text-gray-900 mb-2">
              Checkout
            </h1>
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
              {/* Guest Checkout - Streamlined for approved quotes */}
              {isGuestCheckout && guestQuote?.email ? (
                <Card className="bg-white border border-gray-200 shadow-sm">
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-2 text-base font-medium text-gray-900">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      Quote Approved
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className={`rounded-lg p-4 ${isEditingContact ? 'bg-teal-50 border border-teal-200' : 'bg-green-50 border border-green-200'}`}>
                      {isEditingContact ? (
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 flex-1">
                            <Edit3 className="h-5 w-5 text-teal-600" />
                            <div className="flex-1">
                              <Input
                                type="email"
                                value={editEmail}
                                onChange={(e) => setEditEmail(e.target.value)}
                                placeholder="Enter your email address"
                                className="text-sm"
                              />
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              onClick={handleSaveContact}
                              disabled={isSavingContact}
                              size="sm"
                              className="bg-teal-600 hover:bg-teal-700 text-xs px-2 py-1"
                            >
                              {isSavingContact ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <Check className="h-3 w-3" />
                              )}
                            </Button>
                            <Button
                              variant="outline"
                              onClick={handleCancelEdit}
                              disabled={isSavingContact}
                              size="sm"
                              className="text-xs px-2 py-1"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <CheckCircle className="h-5 w-5 text-green-600" />
                            <div>
                              <p className="font-medium text-green-900">{guestQuote.customer_name || 'Guest Customer'}</p>
                              <p className="text-sm text-green-700">{guestQuote.email}</p>
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleEditContact}
                            className="text-xs"
                            title="Edit email address"
                          >
                            <Edit3 className="h-3 w-3 mr-1" />
                            Edit
                          </Button>
                        </div>
                      )}
                    </div>
                    
                  </CardContent>
                </Card>
              ) : isGuestCheckout && (
                <Card className="bg-white border border-gray-200 shadow-sm">
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-2 text-base font-medium text-gray-900">
                      <User className="h-4 w-4 text-gray-600" />
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
                          className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
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

                    <div className="text-sm text-gray-600 bg-teal-50 p-3 rounded-lg">
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
                      <div className="p-4 border border-gray-200 rounded-lg bg-white shadow-sm">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-gray-900">
                                  {addressFormData.recipient_name ||
                                    guestContact.fullName ||
                                    'Guest'}
                                </span>
                                <Badge variant="outline" className="text-xs text-teal-600 border-teal-200 bg-teal-50">Guest Address</Badge>
                              </div>
                              <p className="text-sm text-gray-600">
                                {addressFormData.address_line1}
                              </p>
                              {addressFormData.address_line2 && (
                                <p className="text-sm text-gray-600">
                                  {addressFormData.address_line2}
                                </p>
                              )}
                              <p className="text-sm text-gray-600">
                                {addressFormData.city}, {addressFormData.state_province_region}{' '}
                                {addressFormData.postal_code}
                              </p>
                              <p className="text-sm text-gray-600">
                                {countries?.find((c) => c.code === addressFormData.country)?.name ||
                                  addressFormData.country}
                              </p>
                              {addressFormData.phone && (
                                <p className="text-sm text-gray-600">
                                  <Phone className="h-3 w-3 inline mr-1 text-gray-500" />
                                  {addressFormData.phone}
                                </p>
                              )}
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowAddressModal(true)}
                            className="border-gray-300 text-gray-600 hover:bg-gray-50 hover:text-gray-900"
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
                      <div className="p-4 border border-gray-200 rounded-lg bg-white shadow-sm">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-gray-900">
                                  {addressFormData.recipient_name ||
                                    userProfile?.full_name ||
                                    'User'}
                                </span>
                                <Badge variant="outline" className="text-xs text-teal-600 border-teal-200 bg-teal-50">One-time Address</Badge>
                              </div>
                              <p className="text-sm text-gray-600">
                                {addressFormData.address_line1}
                              </p>
                              {addressFormData.address_line2 && (
                                <p className="text-sm text-gray-600">
                                  {addressFormData.address_line2}
                                </p>
                              )}
                              <p className="text-sm text-gray-600">
                                {addressFormData.city}, {addressFormData.state_province_region}{' '}
                                {addressFormData.postal_code}
                              </p>
                              <p className="text-sm text-gray-600">
                                {countries?.find((c) => c.code === addressFormData.country)?.name ||
                                  addressFormData.country}
                              </p>
                              {addressFormData.phone && (
                                <p className="text-sm text-gray-600">
                                  <Phone className="h-3 w-3 inline mr-1 text-gray-500" />
                                  {addressFormData.phone}
                                </p>
                              )}
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowAddressModal(true)}
                            className="border-gray-300 text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                          >
                            <Edit3 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : !addresses || addresses.length === 0 || isGuestCheckout ? (
                    <div className="text-center py-6">
                      <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        {isGuestCheckout
                          ? 'Add Shipping Address'
                          : `No addresses found for ${countries?.find((c) => c.code === shippingCountry)?.name || shippingCountry}`}
                      </h3>
                      <p className="text-gray-600 mb-4">
                        {isGuestCheckout
                          ? 'Please provide a shipping address for your order.'
                          : `Please add a shipping address for delivery to ${countries?.find((c) => c.code === shippingCountry)?.name || shippingCountry}.`}
                      </p>
                      <Button onClick={() => setShowAddressModal(true)} className="bg-teal-600 hover:bg-teal-700 text-white">
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
                              className="flex items-start space-x-3 p-4 border border-gray-200 rounded-lg bg-white shadow-sm hover:border-teal-300 transition-colors"
                            >
                              <RadioGroupItem value={address.id} id={address.id} className="mt-1" />
                              <Label htmlFor={address.id} className="flex-1 cursor-pointer">
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium text-gray-900">{address.address_line1}</span>
                                    {address.is_default && (
                                      <Badge variant="outline" className="text-xs text-green-600 border-green-200 bg-green-50">Default</Badge>
                                    )}
                                  </div>
                                  {address.address_line2 && (
                                    <p className="text-sm text-gray-600">
                                      {address.address_line2}
                                    </p>
                                  )}
                                  <p className="text-sm text-gray-600">
                                    {address.city}, {address.state_province_region}{' '}
                                    {address.postal_code}
                                  </p>
                                  <p className="text-sm text-gray-600">
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
                          onClick={() => setShowAddressModal(true)}
                          className="w-full border-gray-300 text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add New Address
                        </Button>
                      </div>
                    </>
                  )}

                  {/* Inline Address Form */}
                  {showAddressModal && (
                    <div className="border rounded-lg p-6 bg-gray-50 space-y-4 mt-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">Add New Address</h4>
                        <Button variant="ghost" size="sm" onClick={() => setShowAddressModal(false)}>
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
              <Card className="bg-white border border-gray-200 shadow-sm">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-base font-medium text-gray-900">
                      <CreditCard className="h-4 w-4 text-gray-600" />
                      Payment Method
                    </CardTitle>
                    
                    {/* Compact Currency Selector for Both Guest and Logged-in Users */}
                    {availableCurrencies && (
                      <div className="flex items-center gap-2">
                        <Label 
                          htmlFor="compact-currency" 
                          className="text-xs text-gray-600"
                        >
                          {isGuestCheckout ? 'Currency:' : 'Pay in:'}
                        </Label>
                        <select
                          id="compact-currency"
                          className="text-xs border border-gray-300 rounded px-2 py-1 focus:ring-1 focus:ring-teal-500 focus:border-teal-500"
                          value={isGuestCheckout ? guestSelectedCurrency : userSelectedCurrency || userProfile?.preferred_display_currency || 'USD'}
                          onChange={(e) => {
                            if (isGuestCheckout) {
                              setGuestSelectedCurrency(e.target.value);
                            } else {
                              setUserSelectedCurrency(e.target.value);
                            }
                          }}
                        >
                          {/* Show default option for logged-in users */}
                          {!isGuestCheckout && userProfile?.preferred_display_currency && !userSelectedCurrency && (
                            <option value={userProfile.preferred_display_currency}>
                              {availableCurrencies.find(c => c.code === userProfile.preferred_display_currency)?.symbol || ''} {userProfile.preferred_display_currency} (Default)
                            </option>
                          )}
                          {availableCurrencies?.map((currency) => (
                            <option key={currency.code} value={currency.code}>
                              {currency.symbol} {currency.code}
                              {!isGuestCheckout && currency.code === userProfile?.preferred_display_currency && userSelectedCurrency ? ' (Your default)' : ''}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <PaymentMethodSelector
                    selectedMethod={paymentMethod}
                    onMethodChange={handlePaymentMethodChange}
                    amount={paymentConversion?.convertedAmount || totalAmount}
                    currency={paymentConversion?.convertedCurrency || paymentCurrency}
                    showRecommended={true}
                    disabled={isProcessing}
                    availableMethods={availableMethods}
                    methodsLoading={methodsLoading}
                  />
                </CardContent>
              </Card>

              {/* Security Notice */}
              <Card className="bg-white border border-gray-200 shadow-sm">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-start gap-2">
                    <Shield className="h-4 w-4 text-gray-500 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-gray-900 text-sm">Secure Checkout</h4>
                      <p className="text-xs text-gray-600 mt-1">
                        Your payment information is encrypted and secure. We never store your card
                        details.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Order Summary Sidebar */}
            <div className="lg:col-span-2 space-y-6">
              <Card className="sticky top-6 bg-white border border-gray-200 shadow-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-base font-medium text-gray-900">
                    <ShoppingCart className="h-4 w-4 text-gray-600" />
                    Order Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Items List */}
                  <div className="space-y-2">
                    {selectedCartItems.map((item) => (
                      <div
                        key={item.quoteId}
                        className="flex justify-between items-start py-2 border-b border-gray-100 last:border-b-0"
                      >
                        <div className="flex-1 pr-3">
                          <Link
                            to={`/quote-details/${item.quoteId}`}
                            className="font-medium hover:underline text-primary text-sm leading-tight"
                          >
                            {item.productName}
                          </Link>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-muted-foreground">
                              Qty: {item.quantity}
                            </span>
                            <Badge variant="outline" className="text-xs px-1.5 py-0">
                              {item.countryCode}
                            </Badge>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-sm">
                            <CheckoutItemPrice
                              item={item}
                              displayCurrency={isGuestCheckout ? paymentCurrency : undefined}
                              paymentConversion={paymentConversion}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Total Section */}
                  <div className="space-y-2 pt-3 border-t">
                    <div className="flex justify-between text-lg font-bold">
                      <span>Total:</span>
                      <span>
                        <CheckoutTotal
                          items={selectedCartItems}
                          displayCurrency={isGuestCheckout ? paymentCurrency : undefined}
                          paymentConversion={paymentConversion}
                        />
                      </span>
                    </div>
                    
                    {/* Compact Currency conversion - only show if conversion is needed */}
                    {paymentConversion?.needsConversion && (
                      <div className="text-xs text-gray-500 text-right">
                        Exchange rate applied: {paymentConversion.convertedCurrency} calculation
                      </div>
                    )}
                  </div>

                  <Button
                    onClick={handlePlaceOrder}
                    disabled={
                      !canPlaceOrder ||
                      isProcessing ||
                      (!isGuestCheckout && (!addresses || addresses.length === 0)) ||
                      (isGuestCheckout && checkoutMode !== 'guest' && !user)
                    }
                    className="w-full h-12 bg-teal-600 hover:bg-teal-700 text-white font-medium transition-colors duration-200"
                    size="default"
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
                            Place Order -{' '}
                            <CheckoutTotal
                              items={selectedCartItems}
                              displayCurrency={isGuestCheckout ? paymentCurrency : undefined}
                              paymentConversion={paymentConversion}
                            />
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
          amount={paymentConversion?.convertedAmount || totalAmount}
          currency={paymentConversion?.convertedCurrency || paymentCurrency}
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
              <p className="text-sm text-gray-600 text-center mt-2">
                Enter your card details to complete your order
              </p>
            </div>
            <StripePaymentForm
              client_secret={stripeClientSecret}
              amount={paymentConversion?.convertedAmount || totalAmount}
              currency={paymentConversion?.convertedCurrency || paymentCurrency}
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
                className="text-sm text-gray-600 hover:text-foreground"
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

      {/* Address Modal */}
      <AddressModal
        open={showAddressModal}
        onOpenChange={setShowAddressModal}
        onSave={handleAddAddress}
        initialData={{
          ...addressFormData,
          country: addressFormData.country || shippingCountry || ''
        }}
        isGuest={isGuestCheckout}
        isLoading={addAddressMutation.isPending}
      />
    </div>
  );
}
