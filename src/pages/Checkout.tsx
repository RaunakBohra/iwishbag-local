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
  ArrowRight,
  ArrowLeft,
  Shield,
  Lock,
  Truck,
  Clock,
  AlertCircle,
  Plus,
  Edit3
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { Tables } from "@/integrations/supabase/types";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useUserCurrency } from "@/hooks/useUserCurrency";
import { useCart } from "@/hooks/useCart";
import { usePaymentGateways } from "@/hooks/usePaymentGateways";
import { PaymentMethodSelector } from "@/components/payment/PaymentMethodSelector";
import { QRPaymentModal } from "@/components/payment/QRPaymentModal";
import { PaymentGateway, PaymentRequest } from "@/types/payment";
import { cn } from "@/lib/utils";

type QuoteType = Tables<'quotes'>;
type ProfileType = Tables<'profiles'>;

type CheckoutStep = 'address' | 'payment' | 'review';

interface AddressFormData {
  address_line1: string;
  address_line2?: string;
  city: string;
  state_province_region: string;
  postal_code: string;
  country: string;
  is_default: boolean;
}

export default function Checkout() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  
  // Cart store
  const { 
    items: cartItems, 
    selectedItems, 
    selectedItemsTotal, 
    formattedSelectedTotal,
    getSelectedCartItems,
    isLoading: cartLoading
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
  const [currentStep, setCurrentStep] = useState<CheckoutStep>('address');
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
  const [addressFormData, setAddressFormData] = useState<AddressFormData>({
    address_line1: '',
    address_line2: '',
    city: '',
    state_province_region: '',
    postal_code: '',
    country: '',
    is_default: false
  });

  // Get selected quote IDs from URL params
  const selectedQuoteIds = searchParams.get('quotes')?.split(',') || [];

  const { data: userProfile } = useUserProfile();
  const { formatAmount } = useUserCurrency();

  // Get selected cart items based on quote IDs
  // If no URL parameters, use all cart items (for direct navigation to /checkout)
  const selectedCartItems = selectedQuoteIds.length > 0 
    ? cartItems.filter(item => selectedQuoteIds.includes(item.quoteId))
    : cartItems; // Use all cart items when no specific quotes are selected

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

  // Queries
  const { data: addresses, isLoading: addressesLoading } = useQuery({
    queryKey: ['user_addresses', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('user_addresses')
        .select('*')
        .eq('user_id', user.id)
        .order('is_default', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Auto-select default address
  useEffect(() => {
    if (addresses && addresses.length > 0 && !selectedAddress) {
      const defaultAddr = addresses.find(addr => addr.is_default);
      if (defaultAddr) {
        setSelectedAddress(defaultAddr.id);
      } else {
        setSelectedAddress(addresses[0].id);
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
      toast({ title: "Order Placement Failed", description: error.message, variant: "destructive" });
    },
  });

  const addAddressMutation = useMutation({
    mutationFn: async (addressData: AddressFormData) => {
      const { data, error } = await supabase
        .from('user_addresses')
        .insert([{ ...addressData, user_id: user?.id }])
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
        country: '',
        is_default: false
      });
      toast({ title: "Address Added", description: "Your new address has been saved." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Computed values using cart store
  const allowCod = userProfile?.cod_enabled ?? false;
  const totalAmount = selectedCartItems.reduce((sum, item) => sum + (item.finalTotal * item.quantity), 0);
  const canProceedToPayment = selectedAddress && addresses && addresses.length > 0;
  const canProceedToReview = canProceedToPayment && paymentMethod;

  // Handlers
  const handleNextStep = () => {
    if (currentStep === 'address' && canProceedToPayment) {
      setCurrentStep('payment');
    } else if (currentStep === 'payment' && canProceedToReview) {
      setCurrentStep('review');
    }
  };

  const handlePreviousStep = () => {
    if (currentStep === 'payment') {
      setCurrentStep('address');
    } else if (currentStep === 'review') {
      setCurrentStep('payment');
    }
  };

  const handleAddAddress = () => {
    if (!addressFormData.address_line1 || !addressFormData.city || !addressFormData.state_province_region || !addressFormData.postal_code || !addressFormData.country) {
      toast({ title: "Missing Information", description: "Please fill in all required fields.", variant: "destructive" });
      return;
    }
    addAddressMutation.mutate(addressFormData);
  };

  const handlePaymentMethodChange = (method: PaymentGateway) => {
    setPaymentMethod(method);
  };

  const handlePaymentSuccess = (data: any) => {
    if (data.qr_code) {
      // Show QR modal for mobile payments
      setQrPaymentData({
        qrCodeUrl: data.qr_code,
        transactionId: data.transaction_id,
        gateway: paymentMethod
      });
      setShowQRModal(true);
    } else if (data.url) {
      // Redirect to payment gateway
      window.location.href = data.url;
    }
  };

  const handleQRPaymentComplete = () => {
    setShowQRModal(false);
    setQrPaymentData(null);
    // Navigate to order confirmation
    const orderId = selectedQuoteIds[0];
    navigate(`/order-confirmation/${orderId}`);
  };

  const handleQRPaymentFailed = () => {
    setShowQRModal(false);
    setQrPaymentData(null);
    toast({
      title: "Payment Failed",
      description: "The payment was not completed. Please try again.",
      variant: "destructive"
    });
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

    const paymentRequest: PaymentRequest = {
      quoteIds: selectedQuoteIds,
      amount: totalAmount,
      currency: userProfile?.preferred_display_currency || 'USD',
      gateway: paymentMethod,
      success_url: `${window.location.origin}/order-confirmation?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${window.location.origin}/checkout?quotes=${selectedQuoteIds.join(',')}`,
    };

    const { isValid, errors } = validatePaymentRequest(paymentRequest);
    if (!isValid) {
      toast({ title: "Payment Request Invalid", description: errors.join(', '), variant: "destructive" });
      return;
    }

    setIsProcessing(true);

    try {
      const paymentResponse = await createPaymentAsync(paymentRequest);

      if (paymentResponse.url) {
        window.location.href = paymentResponse.url;
      } else {
        // This case would be for non-redirect flows like COD or Bank Transfer
        toast({ title: "Order Submitted", description: "Your order for has been received." });
        
        await updateQuotesMutation.mutateAsync({ 
          ids: selectedQuoteIds, 
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

  // Show loading spinner while cart is rehydrating
  if (cartLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="h-10 w-10 animate-spin text-muted-foreground mb-2" />
        <span className="text-muted-foreground text-sm">Loading your cart...</span>
      </div>
    );
  }

  // Loading states
  if (addressesLoading) {
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

  // Show loading state while cart is loading
  if (cartLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="py-12 text-center space-y-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <h2 className="text-xl font-semibold">Loading your cart...</h2>
            <p className="text-muted-foreground">Please wait while we load your items.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show no items message only after cart has loaded and is empty
  if (!cartLoading && selectedCartItems.length === 0) {
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

  const steps = [
    { id: 'address', title: 'Shipping Address', icon: MapPin },
    { id: 'payment', title: 'Payment Method', icon: CreditCard },
    { id: 'review', title: 'Review & Place Order', icon: CheckCircle2 },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50">
      <div className="container py-8">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Header */}
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">Complete Your Order</h1>
            <p className="text-muted-foreground">Just a few steps to complete your purchase</p>
          </div>

          {/* Progress Stepper */}
          <div className="flex items-center justify-center">
            <div className="backdrop-blur-xl bg-white/20 border border-white/30 rounded-2xl p-6 shadow-2xl">
              <div className="flex items-center space-x-6">
                {steps.map((step, index) => {
                  const Icon = step.icon;
                  const isActive = currentStep === step.id;
                  const isCompleted = steps.findIndex(s => s.id === currentStep) > index;
                  
                  return (
                    <div key={step.id} className="flex items-center">
                      <div className={cn(
                        "flex items-center justify-center w-12 h-12 rounded-full border-2 transition-all duration-300 backdrop-blur-xl",
                        isActive 
                          ? "bg-gradient-to-r from-primary to-primary/80 border-primary text-white shadow-lg shadow-primary/20 scale-110" : 
                        isCompleted 
                          ? "bg-gradient-to-r from-green-500 to-green-600 border-green-500 text-white shadow-md shadow-green-500/20" :
                          "bg-white/20 border-white/30 text-gray-500 hover:border-primary/50 hover:bg-white/30"
                      )}>
                        {isCompleted ? (
                          <CheckCircle2 className="h-6 w-6" />
                        ) : (
                          <Icon className="h-6 w-6" />
                        )}
                      </div>
                      <span className={cn(
                        "ml-3 text-sm font-medium hidden sm:block transition-colors duration-300",
                        isActive ? "text-primary font-semibold" : 
                        isCompleted ? "text-green-600 font-medium" : "text-gray-500"
                      )}>
                        {step.title}
                      </span>
                      {index < steps.length - 1 && (
                        <div className={cn(
                          "w-12 h-1 mx-6 rounded-full transition-all duration-300",
                          isCompleted ? "bg-gradient-to-r from-green-500 to-green-600" : "bg-white/30"
                        )} />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="grid gap-8 lg:grid-cols-3">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Step 1: Shipping Address */}
              {currentStep === 'address' && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MapPin className="h-5 w-5" />
                      Shipping Address
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {!addresses || addresses.length === 0 ? (
                      <div className="text-center py-8">
                        <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-lg font-medium mb-2">No addresses found</h3>
                        <p className="text-muted-foreground mb-4">Please add a shipping address to continue.</p>
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
                      <div className="border rounded-lg p-6 bg-gray-50 space-y-4">
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
                              value={addressFormData.country}
                              onChange={(e) => setAddressFormData({...addressFormData, country: e.target.value})}
                              placeholder="United States"
                            />
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
              )}

              {/* Step 2: Payment Method */}
              {currentStep === 'payment' && (
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
              )}

              {/* Step 3: Review */}
              {currentStep === 'review' && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5" />
                      Review Your Order
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Selected Address */}
                    <div className="space-y-2">
                      <h4 className="font-medium">Shipping Address</h4>
                      {addresses?.find(addr => addr.id === selectedAddress) && (
                        <div className="p-3 border rounded-lg bg-gray-50">
                          <p className="font-medium">{addresses.find(addr => addr.id === selectedAddress)?.address_line1}</p>
                          {addresses.find(addr => addr.id === selectedAddress)?.address_line2 && (
                            <p className="text-sm text-muted-foreground">{addresses.find(addr => addr.id === selectedAddress)?.address_line2}</p>
                          )}
                          <p className="text-sm text-muted-foreground">
                            {addresses.find(addr => addr.id === selectedAddress)?.city}, {addresses.find(addr => addr.id === selectedAddress)?.state_province_region} {addresses.find(addr => addr.id === selectedAddress)?.postal_code}
                          </p>
                          <p className="text-sm text-muted-foreground">{addresses.find(addr => addr.id === selectedAddress)?.country}</p>
                        </div>
                      )}
                    </div>

                    {/* Payment Method */}
                    <div className="space-y-2">
                      <h4 className="font-medium">Payment Method</h4>
                      <div className="p-3 border rounded-lg bg-gray-50">
                        <div className="flex items-center gap-2">
                          {paymentMethod === 'stripe' && <CreditCard className="h-4 w-4" />}
                          {paymentMethod === 'payu' && <CreditCard className="h-4 w-4" />}
                          {paymentMethod === 'esewa' && <Banknote className="h-4 w-4" />}
                          {paymentMethod === 'khalti' && <Banknote className="h-4 w-4" />}
                          {paymentMethod === 'fonepay' && <Banknote className="h-4 w-4" />}
                          {paymentMethod === 'airwallex' && <CreditCard className="h-4 w-4" />}
                          {paymentMethod === 'cod' && <Banknote className="h-4 w-4" />}
                          {paymentMethod === 'bank_transfer' && <Landmark className="h-4 w-4" />}
                          <span className="font-medium">
                            {paymentMethod === 'stripe' && 'Credit Card (Stripe)'}
                            {paymentMethod === 'payu' && 'PayU'}
                            {paymentMethod === 'esewa' && 'eSewa'}
                            {paymentMethod === 'khalti' && 'Khalti'}
                            {paymentMethod === 'fonepay' && 'Fonepay'}
                            {paymentMethod === 'airwallex' && 'Airwallex'}
                            {paymentMethod === 'cod' && 'Cash on Delivery'}
                            {paymentMethod === 'bank_transfer' && 'Bank Transfer'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Security Notice */}
                    <div className="p-4 border border-blue-200 rounded-lg bg-blue-50">
                      <div className="flex items-start gap-3">
                        <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
                        <div>
                          <h4 className="font-medium text-blue-900">Secure Checkout</h4>
                          <p className="text-sm text-blue-700 mt-1">
                            Your payment information is encrypted and secure. We never store your card details.
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Navigation */}
              <div className="flex justify-between">
                <Button
                  variant="outline"
                  onClick={handlePreviousStep}
                  disabled={currentStep === 'address'}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Previous
                </Button>
                
                {currentStep !== 'review' && (
                  <Button
                    onClick={handleNextStep}
                    disabled={
                      (currentStep === 'address' && !canProceedToPayment) ||
                      (currentStep === 'payment' && !canProceedToReview)
                    }
                  >
                    Next
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                )}
              </div>
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
                        <div className="font-bold">{formatAmount(item.finalTotal)}</div>
                      </div>
                    </div>
                  ))}

                  <Separator />

                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Subtotal:</span>
                      <span>{formatAmount(totalAmount)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-lg">
                      <span>Total:</span>
                      <span>{formatAmount(totalAmount)}</span>
                    </div>
                  </div>

                  {currentStep === 'review' && (
                    <Button 
                      onClick={handlePlaceOrder} 
                      disabled={!selectedAddress || isProcessing || !addresses || addresses.length === 0}
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
                          Place Order - {formatAmount(totalAmount)}
                        </>
                      )}
                    </Button>
                  )}

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
    </div>
  );
}