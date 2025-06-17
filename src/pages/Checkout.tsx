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
import { ShoppingCart, MapPin, CreditCard, Banknote, Landmark, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { Tables } from "@/integrations/supabase/types"; // Import Tables
import { useUserProfile } from "@/hooks/useUserProfile";
import { useUserCurrency } from "@/hooks/useUserCurrency";
import { useOrderMutations } from "@/hooks/useOrderMutations";
import { formatCurrency } from "@/lib/utils"; // Import formatCurrency

type QuoteType = Tables<'quotes'>; // Define QuoteType
type ProfileType = Tables<'profiles'>; // Define ProfileType

export default function Checkout() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const [selectedAddress, setSelectedAddress] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("stripe");

  // Get selected quote IDs from URL params
  const selectedQuoteIds = searchParams.get('quotes')?.split(',') || [];

  const { data: userProfile } = useUserProfile();
  const { formatAmount } = useUserCurrency();

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

  // Automatically select default address
  useEffect(() => {
    if (addresses && addresses.length > 0) {
      const defaultAddr = addresses.find(addr => addr.is_default);
      if (defaultAddr) {
        setSelectedAddress(defaultAddr.id);
      } else {
        setSelectedAddress(addresses[0].id);
      }
    }
  }, [addresses]);

  const { data: selectedQuotes, isLoading: quotesLoading } = useQuery<QuoteType[], Error>({
    queryKey: ['checkout-quotes', selectedQuoteIds],
    queryFn: async () => {
      if (selectedQuoteIds.length === 0) return [];

      const { data, error } = await supabase
        .from('quotes')
        .select('*')
        .in('id', selectedQuoteIds)
        .eq('user_id', user?.id)
        .eq('approval_status', 'approved');

      if (error) throw error;
      return data;
    },
    enabled: selectedQuoteIds.length > 0 && !!user,
  });

  // Unified mutation for updating quotes status (COD/Bank Transfer)
  const updateQuotesMutation = useMutation({
    mutationFn: async ({ ids, status, method }: { ids: string[], status: string, method: string }) => {
      const { error } = await supabase
        .from('quotes')
        .update({ status, payment_method: method, in_cart: false })
        .in('id', ids);
      if (error) throw new Error(error.message);
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['checkout-quotes', selectedQuoteIds] });
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      queryClient.invalidateQueries({ queryKey: ['admin-quotes']});
      queryClient.invalidateQueries({ queryKey: ['admin-orders']});

      const orderId = variables.ids[0];
      navigate(`/order-confirmation/${orderId}`);
    },
    onError: (error: Error) => {
      toast({ title: "Order Placement Failed", description: error.message, variant: "destructive" });
    },
  });

  const allowCod = userProfile?.cod_enabled ?? false;

  // Calculate total amount
  const totalAmount = selectedQuotes?.reduce((sum, quote) => sum + (quote.final_total || 0), 0) || 0; // Use quote.final_total

  const handleStripePayment = async () => {
    setIsProcessing(true);
    try {
      const orderId = selectedQuoteIds[0];
      const res = await fetch(
        `${window.location.origin.replace(/^http/, 'https')}/functions/v1/create-payment`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${localStorage.getItem('sb-access-token')}`,
          },
          body: JSON.stringify({
            quoteIds: selectedQuoteIds,
            currency: selectedQuotes?.[0]?.final_currency || 'USD', // Use final_currency
            amount: totalAmount,
            success_url: `<span class="math-inline">\{window\.location\.origin\}/order\-confirmation/</span>{orderId}?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${window.location.origin}/checkout`,
          }),
        }
      );

      const data = await res.json();
      if (res.ok && data.url) {
        window.location.href = data.url;
      } else {
        throw new Error(data.error || "Failed to create payment session.");
      }
    } catch (error: any) {
      toast({
        title: "Payment Error",
        description: error.message,
        variant: "destructive",
      });
      setIsProcessing(false);
    }
  };

  const handlePlaceOrder = async () => {
    if (!selectedAddress) {
      toast({
        title: "Address Required",
        description: "Please select a shipping address to continue.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);

    const quoteIds = selectedQuotes.map(q => q.id!);
    const orderId = quoteIds.length > 0 ? quoteIds[0] : undefined;

    if (paymentMethod === 'stripe') {
      await handleStripePayment();
    } else if (paymentMethod === 'cod') {
      updateQuotesMutation.mutate({ ids: quoteIds, status: 'cod_pending', method: 'cod' });
    } else if (paymentMethod === 'bank_transfer') {
      updateQuotesMutation.mutate({ ids: quoteIds, status: 'bank_transfer_pending', method: 'bank_transfer' });
    } else {
      toast({ title: "Invalid payment method", variant: "destructive" });
      setIsProcessing(false);
    }
  };

  if (quotesLoading || addressesLoading) {
    return (
      <div className="container py-12 text-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Loading checkout...</p>
      </div>
    );
  }

  if (!selectedQuotes || selectedQuotes.length === 0) {
    return (
      <div className="container py-12">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No items selected for checkout.</p>
            <Button onClick={() => navigate('/dashboard')} className="mt-4">
              Return to Cart
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-12">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <ShoppingCart className="h-8 w-8" />
            Checkout
          </h1>
          <p className="text-muted-foreground">
            Review your order and complete your purchase
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Shipping Address and Payment Method */}
          <div className="space-y-6">
            {/* Shipping Address Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Shipping Address
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!addresses || addresses.length === 0 ? (
                  <div className="text-center py-4">
                    <p className="text-muted-foreground mb-4">
                      No shipping addresses found. Please add an address first.
                    </p>
                    <Button onClick={() => navigate('/profile')}>
                      Add Shipping Address
                    </Button>
                  </div>
                ) : (
                  <RadioGroup value={selectedAddress} onValueChange={setSelectedAddress}>
                    <div className="space-y-4">
                      {addresses.map((address) => (
                        <div key={address.id} className="flex items-center space-x-3 p-3 border rounded-lg">
                          <RadioGroupItem value={address.id} id={address.id} />
                          <Label htmlFor={address.id} className="flex-1 cursor-pointer">
                            <div>
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
                              <p className="text-sm text-muted-foreground">
                                {address.country}
                              </p>
                            </div>
                          </Label>
                        </div>
                      ))}
                    </div>
                  </RadioGroup>
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
                <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod} className="space-y-4">
                  <Label htmlFor="stripe" className="flex items-center space-x-3 p-3 border rounded-lg has-[:checked]:bg-muted">
                    <RadioGroupItem value="stripe" id="stripe" />
                    <div className="flex-1 cursor-pointer">
                      <div className="font-medium flex items-center gap-2"><CreditCard className="h-4 w-4" /> Pay with Card</div>
                      <p className="text-sm text-muted-foreground">Secure payment via Stripe.</p>
                    </div>
                  </Label>
                  {allowCod && (
                    <Label htmlFor="cod" className="flex items-center space-x-3 p-3 border rounded-lg has-[:checked]:bg-muted">
                      <RadioGroupItem value="cod" id="cod" />
                      <div className="flex-1 cursor-pointer">
                        <div className="font-medium flex items-center gap-2"><Banknote className="h-4 w-4" /> Cash on Delivery</div>
                        <p className="text-sm text-muted-foreground">Pay in cash when your order arrives.</p>
                      </div>
                    </Label>
                  )}
                    <Label htmlFor="bank_transfer" className="flex items-center space-x-3 p-3 border rounded-lg has-[:checked]:bg-muted">
                      <RadioGroupItem value="bank_transfer" id="bank_transfer" />
                      <div className="flex-1 cursor-pointer">
                        <div className="font-medium flex items-center gap-2"><Landmark className="h-4 w-4" /> Bank Transfer</div>
                        <p className="text-sm text-muted-foreground">Pay via bank transfer. Details will be provided.</p>
                      </div>
                    </Label>
                </RadioGroup>
              </CardContent>
            </Card>
          </div>

          {/* Order Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                Order Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedQuotes.map((quote) => (
                <div key={quote.id} className="flex justify-between items-start p-3 border rounded-lg">
                  <div className="flex-1">
                    {/* Make product name clickable */}
                    <Link to={`/quote-details/${quote.id}`} className="font-medium hover:underline text-primary">
                        <h4>{quote.product_name}</h4>
                    </Link>
                    <p className="text-sm text-muted-foreground">
                      {quote.quantity} item{quote.quantity !== 1 ? 's' : ''}
                    </p>
                    {/* Corrected property access here */}
                    <Badge variant="outline">{quote.country_code}</Badge> 
                  </div>
                  <div className="text-right">
                    {/* Corrected property access here */}
                    <div className="font-bold">{formatAmount(quote.final_total || 0)}</div>
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
                disabled={!selectedAddress || isProcessing || !addresses || addresses.length === 0}
                className="w-full"
                size="lg"
              >
                {isProcessing ? "Processing..." : `Place Order - ${formatAmount(totalAmount)}`}
              </Button>

              <p className="text-xs text-muted-foreground text-center">
                By placing this order, you agree to our terms and conditions.
              </p>

              {(quote.status === 'sent' || quote.status === 'accepted') && (
                <div className="mt-2 text-center">
                  <button
                    type="button"
                    className="text-xs text-muted-foreground underline hover:text-destructive transition"
                    onClick={openRejectDialog} // <-- replace with your actual handler
                  >
                    Not happy with this quote? <span className="font-medium text-destructive">Reject Quote</span>
                  </button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}