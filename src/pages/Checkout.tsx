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
import { useCart } from "@/hooks/useCart";
import { usePaymentGateways } from "@/hooks/usePaymentGateways";
import { PaymentMethodSelector } from "@/components/payment/PaymentMethodSelector";
import { QRPaymentModal } from "@/components/payment/QRPaymentModal";
import { PaymentStatusTracker } from "@/components/payment/PaymentStatusTracker";
import { PaymentDebug } from "@/components/debug/PaymentDebug";
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
  is_default: boolean;
}

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
    is_default: false
  });

  // Get selected quote IDs from URL params
  const selectedQuoteIds = searchParams.get('quotes')?.split(',') || [];

  const { data: userProfile } = useUserProfile();
  const { formatAmount } = useUserCurrency();

  // Load cart data from server when component mounts (same as Cart component)
  useEffect(() => {
    if (user && !cartLoading && !hasLoadedFromServer) {
      // Only load from server if not already loading and not already loaded
      loadFromServer(user.id);
    }
  }, [user, loadFromServer, cartLoading, hasLoadedFromServer]);

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
          ...addressData
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
        country: '',
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
  const canPlaceOrder = selectedAddress && paymentMethod && selectedCartItems.length > 0;

  const handleAddAddress = async () => {
    if (!addressFormData.address_line1 || !addressFormData.city || 
        !addressFormData.state_province_region || !addressFormData.postal_code || 
        !addressFormData.country) {
      toast({ 
        title: "Missing Information", 
        description: "Please fill in all required fields.", 
        variant: "destructive"
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
      const paymentResponse = await createPaymentAsync(paymentRequest);

      if (paymentResponse.url) {
        // For redirect-based payments (Stripe)
        if (paymentMethod === 'payu' && paymentResponse.method === 'POST') {
          // Handle PayU POST form submission
          const form = document.createElement('form');
          form.method = 'POST';
          form.action = paymentResponse.url;
          form.target = '_blank';
          
          // Add form data
          Object.entries(paymentResponse.formData).forEach(([key, value]) => {
            const input = document.createElement('input');
            input.type = 'hidden';
            input.name = key;
            input.value = value as string;
            form.appendChild(input);
          });
          
          document.body.appendChild(form);
          form.submit();
          document.body.removeChild(form);
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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Checkout</h1>
            <p className="text-gray-600 mt-2">Complete your order securely</p>
          </div>

          <div className="grid gap-8 lg:grid-cols-3">
            {/* Main Checkout Form */}
            <div className="lg:col-span-2 space-y-6">
              {/* Shipping Address */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Shipping Address
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {!addresses || addresses.length === 0 ? (
                    <div className="text-center py-6">
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

                  <Button 
                    onClick={handlePlaceOrder} 
                    disabled={!canPlaceOrder || isProcessing || !addresses || addresses.length === 0}
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

      {/* Debug Component - Remove after testing */}
      <div className="mt-8">
        <PaymentDebug />
      </div>
    </div>
  );
}