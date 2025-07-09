// src/pages/Checkout.tsx
import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  ShoppingCart, 
  MapPin, 
  CreditCard, 
  Banknote, 
  Landmark, 
  Loader2, 
  CheckCircle2,
  Shield,
  Lock,
  Truck,
  Clock,
  AlertCircle,
  Plus,
  Edit3,
  User,
  Mail,
  Phone
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { Tables } from "@/integrations/supabase/types";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useUserCurrency } from "@/hooks/useUserCurrency";
import { useQuoteDisplayCurrency } from "@/hooks/useQuoteDisplayCurrency";
import { useCart } from "@/hooks/useCart";
import { usePaymentGateways } from "@/hooks/usePaymentGateways";
import { useAllCountries } from "@/hooks/useAllCountries";
import { PaymentMethodSelector } from "@/components/payment/PaymentMethodSelector";
import { QRPaymentModal } from "@/components/payment/QRPaymentModal";
import { PaymentStatusTracker } from "@/components/payment/PaymentStatusTracker";
import { PaymentGateway, PaymentRequest } from "@/types/payment";
import { cn } from "@/lib/utils";

type QuoteType = Tables<'quotes'>;
type ProfileType = Tables<'profiles'>;

interface AddressFormData {
  address_line1: string;
  address_line2?: string;
  city: string;
  state_province_region: string;
  postal_code: string;
  country: string;
  country_code?: string;
  recipient_name?: string;
  phone?: string;
  is_default: boolean;
}

// Component to display checkout item price with proper currency conversion
const CheckoutItemPrice = ({ item }: { item: any }) => {
  // Create a mock quote object for the cart item
  const mockQuote = {
    id: item.quoteId,
    country_code: item.purchaseCountryCode || item.countryCode,
    shipping_address: {
      country_code: item.destinationCountryCode || item.countryCode
    }
  };
  
  // Use the quote display currency hook
  const { formatAmount } = useQuoteDisplayCurrency({ quote: mockQuote as any });
  
  return <>{formatAmount(item.finalTotal)}</>;
};

// Component to display checkout total with proper currency conversion
const CheckoutTotal = ({ items }: { items: any[] }) => {
  // Use the first item to determine the quote format (all items should have same destination)
  const firstItem = items[0];
  if (!firstItem) return <>$0.00</>;
  
  const mockQuote = {
    id: firstItem.quoteId,
    country_code: firstItem.purchaseCountryCode || firstItem.countryCode,
    shipping_address: {
      country_code: firstItem.destinationCountryCode || firstItem.countryCode
    }
  };
  
  // Calculate total from all items
  const totalAmount = items.reduce((sum, item) => sum + item.finalTotal, 0);
  
  // Use the quote display currency hook
  const { formatAmount } = useQuoteDisplayCurrency({ quote: mockQuote as any });
  
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
    selectedItems, 
    selectedItemsTotal, 
    formattedSelectedTotal,
    getSelectedCartItems,
    isLoading: cartLoading,
    hasLoadedFromServer,
    loadFromServer
  } = useCart();
  
  // Payment gateway hook
  const {
    availableMethods,
    methodsLoading,
    getRecommendedPaymentMethod,
    createPayment,
    createPaymentAsync,
    isCreatingPayment,
    validatePaymentRequest,
    isMobileOnlyPayment,
    requiresQRCode
  } = usePaymentGateways();
  
  // State
  const [selectedAddress, setSelectedAddress] = useState<string>("");
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
  const [addressFormData, setAddressFormData] = useState<AddressFormData>({
    address_line1: '',
    address_line2: '',
    city: '',
    state_province_region: '',
    postal_code: '',
    country: '',
    recipient_name: '',
    phone: '',
    is_default: false
  });

  // Get selected quote IDs from URL params
  const selectedQuoteIds = searchParams.get('quotes')?.split(',') || [];
  
  // Check if this is a guest checkout
  const guestQuoteId = searchParams.get('quote');
  const isGuestCheckout = !!guestQuoteId;

  // Guest checkout mode: 'guest', 'signup', 'signin'
  const [checkoutMode, setCheckoutMode] = useState<'guest' | 'signup' | 'signin'>('guest');
  
  // Account creation fields (only used for signup/signin)
  const [accountData, setAccountData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  
  // Guest contact info (for guest checkout)
  const [guestContact, setGuestContact] = useState({
    email: '',
    fullName: ''
  });

  const { data: userProfile } = useUserProfile();
  const { formatAmount } = useUserCurrency();
  const { data: countries } = useAllCountries();

  // Load cart data from server when component mounts (same as Cart component)
  useEffect(() => {
    if (user && !cartLoading && !hasLoadedFromServer && !isGuestCheckout) {
      // Only load from server if not already loading and not already loaded, and not guest checkout
      loadFromServer(user.id);
    }
  }, [user, loadFromServer, cartLoading, hasLoadedFromServer, isGuestCheckout]);

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

  // Fetch guest quote if this is a guest checkout
  const { data: guestQuote, isLoading: guestQuoteLoading } = useQuery({
    queryKey: ['guest-quote', guestQuoteId],
    queryFn: async () => {
      if (!guestQuoteId) return null;
      
      const { data, error } = await supabase
        .from('quotes')
        .select(`
          *,
          quote_items (*)
        `)
        .eq('id', guestQuoteId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!guestQuoteId,
  });

  // Get selected cart items based on quote IDs
  // If no URL parameters, use all cart items (for direct navigation to /checkout)
  const selectedCartItems = isGuestCheckout 
    ? (guestQuote ? [{
        quoteId: guestQuote.id,
        productName: guestQuote.quote_items?.[0]?.product_name || "Product",
        quantity: guestQuote.quote_items?.reduce((sum, item) => sum + item.quantity, 0) || 1,
        finalTotal: guestQuote.final_total || 0,
        countryCode: guestQuote.country_code || "Unknown",
        purchaseCountryCode: guestQuote.country_code || "Unknown",
        destinationCountryCode: (() => {
          // Extract destination from shipping address for guest quotes
          if (guestQuote.shipping_address) {
            try {
              const addr = typeof guestQuote.shipping_address === 'string' 
                ? JSON.parse(guestQuote.shipping_address) 
                : guestQuote.shipping_address;
              return addr?.country_code || addr?.countryCode || guestQuote.country_code || "Unknown";
            } catch (e) {
              return guestQuote.country_code || "Unknown";
            }
          }
          return guestQuote.country_code || "Unknown";
        })()
      }] : [])
    : selectedQuoteIds.length > 0 
    ? cartItems.filter(item => selectedQuoteIds.includes(item.quoteId))
    : cartItems; // Use all cart items when no specific quotes are selected

  // Get the shipping country from selected items
  // All quotes in checkout should have the same destination country
  const shippingCountry = selectedCartItems.length > 0 
    ? (selectedCartItems[0].destinationCountryCode || selectedCartItems[0].countryCode) 
    : null;
  
  // Get purchase country for route display
  const purchaseCountry = selectedCartItems.length > 0 
    ? (selectedCartItems[0].purchaseCountryCode || selectedCartItems[0].countryCode) 
    : null;

  // Pre-fill guest contact info from quote if available
  useEffect(() => {
    if (guestQuote && isGuestCheckout) {
      setGuestContact({
        email: guestQuote.email || '',
        fullName: guestQuote.customer_name || ''
      });
    }
  }, [guestQuote, isGuestCheckout]);

  // Update address form country when shippingCountry changes
  useEffect(() => {
    if (shippingCountry) {
      setAddressFormData(prev => ({
        ...prev,
        country: shippingCountry
      }));
    }
  }, [shippingCountry]);

  // Queries
  const { data: addresses, isLoading: addressesLoading } = useQuery({
    queryKey: ['user_addresses', user?.id, shippingCountry],
    queryFn: async () => {
      if (!user || !shippingCountry) return [];
      const { data, error } = await supabase
        .from('user_addresses')
        .select('*')
        .eq('user_id', user.id)
        .eq('country_code', shippingCountry)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
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
        const defaultAddr = addresses.find(addr => addr.is_default);
        setSelectedAddress(defaultAddr ? defaultAddr.id : addresses[0].id);
      }
    }
  }, [addresses, selectedAddress]);

  // Mutations
  const updateQuotesMutation = useMutation({
    mutationFn: async ({ ids, status, method }: { ids: string[], status: string, method: string }) => {
      const { data, error } = await supabase
        .from('quotes')
        .update({ status, payment_method: method, in_cart: false })
        .in('id', ids)
        .select()
        .single();
      
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: (data) => {
      if (data) {
        queryClient.invalidateQueries({ queryKey: ['quotes'] });
        queryClient.invalidateQueries({ queryKey: ['admin-quotes']});
        queryClient.invalidateQueries({ queryKey: ['admin-orders']});
        navigate(`/order-confirmation/${data.id}`);
      }
    },
    onError: (error: Error) => {
      toast({ 
        title: "Error", 
        description: error.message, 
        variant: "destructive"
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
          country_code: shippingCountry, // Ensure country_code is set
          country: countries?.find(c => c.code === shippingCountry)?.name || shippingCountry
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
        recipient_name: '',
        phone: '',
        is_default: false
      });
      toast({ title: "Success", description: "Address added successfully." });
    },
    onError: (error: Error) => {
      toast({ 
        title: "Error", 
        description: error.message, 
        variant: "destructive"
      });
    },
  });

  // Calculations
  const totalAmount = selectedCartItems.reduce((total, item) => {
    return total + ((item.finalTotal || 0) * (item.quantity || 1));
  }, 0);

  const cartQuoteIds = selectedCartItems.map(item => item.quoteId);

  // Validation
  const canPlaceOrder = selectedAddress && paymentMethod && selectedCartItems.length > 0 && 
    (!isGuestCheckout || (
      checkoutMode === 'guest' 
        ? (guestContact.email && guestContact.fullName)
        : checkoutMode === 'signin'
        ? (accountData.email && accountData.password)
        : (accountData.email && accountData.password && accountData.fullName && 
           accountData.password === accountData.confirmPassword)
    ));

  const handleAddAddress = async () => {
    if (!addressFormData.recipient_name || !addressFormData.address_line1 || 
        !addressFormData.city || !addressFormData.state_province_region || 
        !addressFormData.postal_code || !addressFormData.country) {
      toast({ 
        title: "Missing Information", 
        description: "Please fill in all required fields.", 
        variant: "destructive"
      });
      return;
    }

    if (isGuestCheckout) {
      // For guest checkout, we'll save the address after account creation
      // For now, just close the form and mark address as "provided"
      setShowAddressForm(false);
      setSelectedAddress('guest-address'); // Use a placeholder ID
      toast({ 
        title: "Address Added", 
        description: "Address will be saved when you complete your order." 
      });
      return;
    }

    await addAddressMutation.mutateAsync(addressFormData);
  };

  const handlePaymentMethodChange = (method: PaymentGateway) => {
    setPaymentMethod(method);
  };

  const handlePaymentSuccess = (data: any) => {
    toast({ title: "Payment Successful", description: "Your payment has been processed successfully." });
    navigate(`/order-confirmation/${data.id}`);
  };

  const handleQRPaymentComplete = () => {
    setShowQRModal(false);
    toast({ title: "Payment Successful", description: "Your payment has been processed successfully." });
    navigate('/dashboard/orders');
  };

  const handleQRPaymentFailed = () => {
    setShowQRModal(false);
    toast({ 
      title: "Payment Failed", 
      description: "There was an issue processing your payment. Please try again.", 
      variant: "destructive"
    });
  };

  // Function to submit PayU form with data
  const submitPayUForm = (url: string, formData: any) => {
    console.log('🔧 Submitting PayU form...');
    console.log('URL:', url);
    console.log('Form Data:', formData);
    
    // Create a temporary form element
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = url;
    form.style.display = 'none';
    form.target = '_self'; // Ensure it opens in same window

    // Add all form fields
    Object.keys(formData).forEach(key => {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = key;
      input.value = formData[key];
      form.appendChild(input);
    });

    // Add form to page and submit
    document.body.appendChild(form);
    
    // Add a small delay to ensure form is properly added
    setTimeout(() => {
      console.log('📤 Submitting form to PayU...');
      form.submit();
    }, 100);
  };

  const handlePlaceOrder = async () => {
    if (!paymentMethod) {
      toast({ title: "Payment Error", description: "Please select a payment method.", variant: "destructive" });
      return;
    }

    if (isMobileOnlyPayment(paymentMethod) && !requiresQRCode(paymentMethod)) {
      toast({ title: "Device Incompatible", description: "This payment method can only be used on a mobile device.", variant: "destructive" });
      return;
    }

    // Validate guest checkout data
    if (isGuestCheckout) {
      if (checkoutMode === 'guest') {
        if (!guestContact.email || !guestContact.fullName) {
          toast({ title: "Missing Information", description: "Please fill in your contact details.", variant: "destructive" });
          return;
        }
      } else if (checkoutMode === 'signin') {
        if (!accountData.email || !accountData.password) {
          toast({ title: "Missing Information", description: "Please fill in email and password.", variant: "destructive" });
          return;
        }
      } else if (checkoutMode === 'signup') {
        if (!accountData.email || !accountData.password || !accountData.fullName) {
          toast({ title: "Missing Information", description: "Please fill in all account details.", variant: "destructive" });
          return;
        }
        
        if (accountData.password !== accountData.confirmPassword) {
          toast({ title: "Password Mismatch", description: "Passwords do not match.", variant: "destructive" });
          return;
        }
      }
    }

    const paymentRequest: PaymentRequest = {
      quoteIds: cartQuoteIds,
      amount: totalAmount,
      currency: userProfile?.preferred_display_currency || 'USD',
      gateway: paymentMethod,
      success_url: `${window.location.origin}/order-confirmation?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${window.location.origin}/checkout?quotes=${cartQuoteIds.join(',')}`,
    };

    const { isValid, errors } = validatePaymentRequest(paymentRequest);
    if (!isValid) {
      toast({ title: "Payment Request Invalid", description: errors.join(', '), variant: "destructive" });
      return;
    }

    setIsProcessing(true);

    try {
      // Handle guest checkout
      if (isGuestCheckout) {
        try {
          let userId: string | null = null;


          if (checkoutMode === 'guest') {
            // Pure guest checkout - no account creation
            
            // Update quote with guest contact info - set is_anonymous to false since we now have email
            const { error: quoteUpdateError } = await supabase
              .from('quotes')
              .update({
                customer_name: guestContact.fullName,
                email: guestContact.email,
                is_anonymous: false, // Set to false since we now have email (satisfies constraint)
                user_id: null, // Keep user_id as null for guest checkout
              })
              .eq('id', guestQuoteId);

            if (quoteUpdateError) {
              console.error('Quote update error:', quoteUpdateError);
              throw new Error(`Failed to update quote: ${quoteUpdateError.message}`);
            }

            toast({ 
              title: "Processing Order", 
              description: "Processing your order as a guest." 
            });

          } else {
            // For signin/signup modes, this shouldn't be reached
            toast({ 
              title: "Action Required", 
              description: checkoutMode === 'signin' 
                ? "Please use the 'Sign In' button above first." 
                : "Please use the 'Create Account' button above first.", 
              variant: "destructive" 
            });
            setIsProcessing(false);
            return;
          }


        } catch (error: any) {
          console.error('Guest checkout failed:', error);
          toast({ 
            title: "Checkout Failed", 
            description: error.message, 
            variant: "destructive" 
          });
          return;
        }
      }

      const paymentResponse = await createPaymentAsync(paymentRequest);

      if (paymentResponse.url) {
        // For redirect-based payments (Stripe, PayU Hosted Checkout)
        if (paymentMethod === 'payu' && paymentResponse.formData) {
          // Handle PayU Hosted Checkout - submit form with data
          console.log('🎯 PayU payment detected with form data');
          console.log('Payment Response:', paymentResponse);
          submitPayUForm(paymentResponse.url, paymentResponse.formData);
        } else if (paymentMethod === 'payu') {
          // PayU without form data - fallback to redirect
          console.log('⚠️ PayU payment without form data, using redirect');
          window.location.href = paymentResponse.url;
        } else {
          // For other redirect-based payments (Stripe)
          window.location.href = paymentResponse.url;
        }
      } else if (paymentResponse.transactionId) {
        // For non-redirect payments, show status tracker
        setCurrentTransactionId(paymentResponse.transactionId);
        setShowPaymentStatus(true);
        toast({ title: "Payment Initiated", description: "Your payment is being processed." });
      } else {
        // This case would be for non-redirect flows like COD or Bank Transfer
        toast({ title: "Order Submitted", description: "Your order has been received." });
        
        await updateQuotesMutation.mutateAsync({ 
          ids: cartQuoteIds, 
          status: 'ordered', 
          method: paymentMethod 
        });
      }
    } catch (error: any) {
      toast({ title: "An Error Occurred", description: error.message, variant: "destructive" });
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
          {isGuestCheckout ? "Loading your quote..." : "Loading your cart..."}
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
                      🌍 {countries?.find(c => c.code === purchaseCountry)?.name || purchaseCountry}
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
                      🌍 {countries?.find(c => c.code === shippingCountry)?.name || shippingCountry}
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
                        variant={checkoutMode === 'guest' ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCheckoutMode('guest')}
                        className="text-xs"
                      >
                        Guest Checkout
                      </Button>
                      <Button
                        type="button"
                        variant={checkoutMode === 'signup' ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCheckoutMode('signup')}
                        className="text-xs"
                      >
                        Create Account
                      </Button>
                      <Button
                        type="button"
                        variant={checkoutMode === 'signin' ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCheckoutMode('signin')}
                        className="text-xs"
                      >
                        Sign In
                      </Button>
                    </div>

                    {/* Dynamic form based on checkout mode */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {checkoutMode === 'guest' && (
                        <>
                          <div>
                            <Label htmlFor="guest-full-name">Full Name *</Label>
                            <Input
                              id="guest-full-name"
                              value={guestContact.fullName}
                              onChange={(e) => setGuestContact({...guestContact, fullName: e.target.value})}
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
                              onChange={(e) => setGuestContact({...guestContact, email: e.target.value})}
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
                                onChange={(e) => setAccountData({...accountData, fullName: e.target.value})}
                                placeholder="John Doe"
                                required
                              />
                            </div>
                          )}
                          <div className={checkoutMode === 'signup' ? "" : "md:col-span-2"}>
                            <Label htmlFor="account-email">Email Address *</Label>
                            <Input
                              id="account-email"
                              type="email"
                              value={accountData.email}
                              onChange={(e) => setAccountData({...accountData, email: e.target.value})}
                              placeholder="john@example.com"
                              required
                            />
                          </div>
                          <div className={checkoutMode === 'signup' ? "" : "md:col-span-2"}>
                            <Label htmlFor="account-password">Password *</Label>
                            <Input
                              id="account-password"
                              type="password"
                              value={accountData.password}
                              onChange={(e) => setAccountData({...accountData, password: e.target.value})}
                              placeholder={checkoutMode === 'signin' ? "Enter your password" : "Create a secure password"}
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
                                onChange={(e) => setAccountData({...accountData, confirmPassword: e.target.value})}
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
                        {checkoutMode === 'guest' && "Complete your order without creating an account. You'll receive order updates via email."}
                        {checkoutMode === 'signin' && "Sign in to your existing account to track your order and access your purchase history."}
                        {checkoutMode === 'signup' && "Create an account to easily track your order and manage future purchases."}
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
                                title: "Missing Information", 
                                description: "Please enter your email and password", 
                                variant: "destructive" 
                              });
                              return;
                            }
                            
                            setIsProcessing(true);
                            try {
                              const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
                                email: accountData.email,
                                password: accountData.password,
                              });

                              if (signInError) {
                                toast({ 
                                  title: "Sign In Failed", 
                                  description: "Invalid email or password. Please check your credentials.", 
                                  variant: "destructive" 
                                });
                                return;
                              }

                              // Update quote ownership
                              if (signInData.user) {
                                await supabase
                                  .from('quotes')
                                  .update({
                                    user_id: signInData.user.id,
                                    is_anonymous: false
                                  })
                                  .eq('id', guestQuoteId);
                              }

                              toast({ 
                                title: "Welcome Back!", 
                                description: "Successfully signed in. Redirecting...", 
                              });
                              
                              // Reload to refresh auth state
                              setTimeout(() => window.location.reload(), 1000);
                            } catch (error) {
                              toast({ 
                                title: "Error", 
                                description: "Failed to sign in. Please try again.", 
                                variant: "destructive" 
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
                            if (!accountData.email || !accountData.password || !accountData.fullName) {
                              toast({ 
                                title: "Missing Information", 
                                description: "Please fill in all required fields", 
                                variant: "destructive" 
                              });
                              return;
                            }
                            
                            if (accountData.password !== accountData.confirmPassword) {
                              toast({ 
                                title: "Password Mismatch", 
                                description: "Passwords do not match", 
                                variant: "destructive" 
                              });
                              return;
                            }
                            
                            setIsProcessing(true);
                            try {
                              const { data: authData, error: authError } = await supabase.auth.signUp({
                                email: accountData.email,
                                password: accountData.password,
                                options: {
                                  data: {
                                    full_name: accountData.fullName,
                                    created_via: 'guest_checkout'
                                  }
                                }
                              });

                              if (authError) {
                                if (authError.message.includes('already registered')) {
                                  toast({ 
                                    title: "Account Already Exists", 
                                    description: "An account with this email already exists. Please sign in instead.", 
                                    variant: "destructive" 
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
                                    is_anonymous: false
                                  })
                                  .eq('id', guestQuoteId);
                              }

                              toast({ 
                                title: "Account Created!", 
                                description: "Please check your email to verify your account.", 
                              });
                              
                              // Sign in immediately after signup
                              const { error: signInError } = await supabase.auth.signInWithPassword({
                                email: accountData.email,
                                password: accountData.password,
                              });
                              
                              if (!signInError) {
                                setTimeout(() => window.location.reload(), 1000);
                              }
                            } catch (error: any) {
                              toast({ 
                                title: "Error", 
                                description: error.message || "Failed to create account. Please try again.", 
                                variant: "destructive" 
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
                  {(!addresses || addresses.length === 0) || isGuestCheckout ? (
                    <div className="text-center py-6">
                      <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-medium mb-2">
                        {isGuestCheckout ? "Add Shipping Address" : `No addresses found for ${countries?.find(c => c.code === shippingCountry)?.name || shippingCountry}`}
                      </h3>
                      <p className="text-muted-foreground mb-4">
                        {isGuestCheckout 
                          ? "Please provide a shipping address for your order." 
                          : `Please add a shipping address for delivery to ${countries?.find(c => c.code === shippingCountry)?.name || shippingCountry}.`}
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
                            <div key={address.id} className="flex items-start space-x-3 p-4 border rounded-lg hover:border-primary transition-colors">
                              <RadioGroupItem value={address.id} id={address.id} className="mt-1" />
                              <Label htmlFor={address.id} className="flex-1 cursor-pointer">
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium">{address.address_line1}</span>
                                    {address.is_default && <Badge variant="secondary">Default</Badge>}
                                  </div>
                                  {address.address_line2 && (
                                    <p className="text-sm text-muted-foreground">{address.address_line2}</p>
                                  )}
                                  <p className="text-sm text-muted-foreground">
                                    {address.city}, {address.state_province_region} {address.postal_code}
                                  </p>
                                  <p className="text-sm text-muted-foreground">{address.country}</p>
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
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => setShowAddressForm(false)}
                        >
                          Cancel
                        </Button>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="recipient_name">Recipient Name *</Label>
                          <Input
                            id="recipient_name"
                            value={addressFormData.recipient_name || ''}
                            onChange={(e) => setAddressFormData({...addressFormData, recipient_name: e.target.value})}
                            placeholder="John Doe"
                          />
                        </div>
                        <div>
                          <Label htmlFor="phone">Phone Number</Label>
                          <Input
                            id="phone"
                            value={addressFormData.phone || ''}
                            onChange={(e) => setAddressFormData({...addressFormData, phone: e.target.value})}
                            placeholder="+1 234 567 8900"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <Label htmlFor="address_line1">Street Address *</Label>
                          <Input
                            id="address_line1"
                            value={addressFormData.address_line1}
                            onChange={(e) => setAddressFormData({...addressFormData, address_line1: e.target.value})}
                            placeholder="123 Main St"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <Label htmlFor="address_line2">Apartment, suite, etc. (optional)</Label>
                          <Input
                            id="address_line2"
                            value={addressFormData.address_line2}
                            onChange={(e) => setAddressFormData({...addressFormData, address_line2: e.target.value})}
                            placeholder="Apt 4B"
                          />
                        </div>
                        <div>
                          <Label htmlFor="city">City *</Label>
                          <Input
                            id="city"
                            value={addressFormData.city}
                            onChange={(e) => setAddressFormData({...addressFormData, city: e.target.value})}
                            placeholder="New York"
                          />
                        </div>
                        <div>
                          <Label htmlFor="state">State/Province *</Label>
                          <Input
                            id="state"
                            value={addressFormData.state_province_region}
                            onChange={(e) => setAddressFormData({...addressFormData, state_province_region: e.target.value})}
                            placeholder="NY"
                          />
                        </div>
                        <div>
                          <Label htmlFor="postal_code">Postal Code *</Label>
                          <Input
                            id="postal_code"
                            value={addressFormData.postal_code}
                            onChange={(e) => setAddressFormData({...addressFormData, postal_code: e.target.value})}
                            placeholder="10001"
                          />
                        </div>
                        <div>
                          <Label htmlFor="country">Country *</Label>
                          <Input
                            id="country"
                            value={countries?.find(c => c.code === shippingCountry)?.name || shippingCountry || ''}
                            disabled
                            className="bg-gray-100"
                          />
                          <p className="text-xs text-muted-foreground mt-1">Country is determined by your quote's destination</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="is_default"
                          checked={addressFormData.is_default}
                          onCheckedChange={(checked) => setAddressFormData({...addressFormData, is_default: checked as boolean})}
                        />
                        <Label htmlFor="is_default">Set as default address</Label>
                      </div>
                      
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
                    currency={userProfile?.preferred_display_currency || 'USD'}
                    showRecommended={true}
                    disabled={isProcessing}
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
                        Your payment information is encrypted and secure. We never store your card details.
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
                    <div key={item.quoteId} className="flex justify-between items-start p-3 border rounded-lg">
                      <div className="flex-1">
                        <Link to={`/quote-details/${item.quoteId}`} className="font-medium hover:underline text-primary">
                          <h4>{item.productName}</h4>
                        </Link>
                        <p className="text-sm text-muted-foreground">
                          {item.quantity} item{item.quantity !== 1 ? 's' : ''}
                        </p>
                        <Badge variant="outline">{item.countryCode}</Badge> 
                      </div>
                      <div className="text-right">
                        <div className="font-bold"><CheckoutItemPrice item={item} /></div>
                      </div>
                    </div>
                  ))}

                  <Separator />

                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Subtotal:</span>
                      <span><CheckoutTotal items={selectedCartItems} /></span>
                    </div>
                    <div className="flex justify-between font-bold text-lg">
                      <span>Total:</span>
                      <span><CheckoutTotal items={selectedCartItems} /></span>
                    </div>
                  </div>

                  <Button 
                    onClick={handlePlaceOrder} 
                    disabled={!canPlaceOrder || isProcessing || (!isGuestCheckout && (!addresses || addresses.length === 0)) || (isGuestCheckout && checkoutMode !== 'guest')}
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
                        {isGuestCheckout && checkoutMode === 'signin' && "Please Sign In Above First"}
                        {isGuestCheckout && checkoutMode === 'signup' && "Please Create Account Above First"}
                        {(!isGuestCheckout || checkoutMode === 'guest') && (
                          <>
                            Place Order - <CheckoutTotal items={selectedCartItems} />
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
          currency={userProfile?.preferred_display_currency || 'USD'}
          transactionId={qrPaymentData.transactionId}
          onPaymentComplete={handleQRPaymentComplete}
          onPaymentFailed={handleQRPaymentFailed}
        />
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
                  toast({ title: "Payment Successful", description: "Your payment has been processed successfully." });
                  navigate('/dashboard/orders');
                } else if (status === 'failed') {
                  setShowPaymentStatus(false);
                  toast({ 
                    title: "Payment Failed", 
                    description: "There was an issue processing your payment. Please try again.", 
                    variant: "destructive"
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