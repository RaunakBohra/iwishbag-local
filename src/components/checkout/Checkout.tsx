import React, { useState, useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  CreditCard,
  Package, 
  Truck, 
  Shield, 
  Clock, 
  MapPin,
  User,
  Mail,
  Phone,
  Star,
  Heart,
  ArrowLeft,
  Lock,
  Tag,
  Zap,
  CheckCircle,
  AlertCircle,
  ShoppingCart
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { QuoteStatusBadge } from '@/components/ui/QuoteStatusBadge';
import { getBreakdownSourceCurrency } from '@/utils/currencyMigration';
import { getOriginCurrency, getDestinationCurrency } from '@/utils/originCurrency';
import { COMMON_QUERIES } from '@/lib/queryColumns';
import { PaymentMethodSelector } from '@/components/payment/PaymentMethodSelector';

interface CheckoutItem {
  id: string;
  quote: {
    id: string;
    quote_number?: string;
    status: string;
    total_origin_currency?: number;
    total_usd?: number;
    origin_country?: string;
    destination_country?: string;
    customer_currency?: string;
    items?: any[];
    calculation_data?: any;
    expires_at?: string;
    customer_data?: any;
    created_at: string;
    updated_at?: string;
  };
  quantity: number;
  imageUrl?: string;
  productName: string;
}

// Checkout Progress component
const CheckoutProgress = ({ currentStep }: { currentStep: number }) => {
  const steps = [
    { label: 'Browse', step: 1 },
    { label: 'Quote Approved', step: 2 },
    { label: 'Cart Review', step: 3 },
    { label: 'Checkout', step: 4 },
    { label: 'Payment', step: 5 },
    { label: 'Confirmed', step: 6 }
  ];

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        {steps.map((step, index) => (
          <div key={step.step} className="flex flex-col items-center">
            <div 
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                step.step <= currentStep 
                  ? 'bg-green-500 text-white' 
                  : step.step === currentStep + 1 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-gray-200 text-gray-500'
              }`}
            >
              {step.step <= currentStep ? (
                <CheckCircle className="w-4 h-4" />
              ) : (
                step.step
              )}
            </div>
            <span className={`text-xs mt-2 ${
              step.step <= currentStep ? 'text-green-600 font-medium' : 'text-gray-500'
            }`}>
              {step.label}
            </span>
          </div>
        ))}
      </div>
      <Progress value={(currentStep / steps.length) * 100} className="h-2" />
    </div>
  );
};

// Order summary component
const OrderSummary = ({ 
  items,
  formatDisplayCurrency,
  displayCurrency 
}: {
  items: CheckoutItem[];
  formatDisplayCurrency: (amount: number, currency?: string) => Promise<string>;
  displayCurrency: string;
}) => {
  const [totalFormatted, setTotalFormatted] = useState<string>('...');
  const [itemTotals, setItemTotals] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    const updateTotals = async () => {
      // Update individual item totals
      const newItemTotals: { [key: string]: string } = {};
      for (const item of items) {
        const amount = item.quote?.total_origin_currency || item.quote?.total_usd || 0;
        const sourceCurrency = getBreakdownSourceCurrency(item.quote);
        const formatted = await formatDisplayCurrency(amount * item.quantity, sourceCurrency);
        newItemTotals[item.id] = formatted;
      }
      setItemTotals(newItemTotals);

      // Update total
      const total = items.reduce((sum, item) => {
        const amount = item.quote?.total_origin_currency || item.quote?.total_usd || 0;
        return sum + (amount * item.quantity);
      }, 0);

      const sourceCurrency = items.length > 0 ? getBreakdownSourceCurrency(items[0].quote) : 'USD';
      const totalFormatted = await formatDisplayCurrency(total, sourceCurrency);
      setTotalFormatted(totalFormatted);
    };

    updateTotals();
  }, [items, formatDisplayCurrency, displayCurrency]);

  return (
    <Card className="sticky top-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShoppingCart className="w-5 h-5" />
          Order Summary
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Items */}
        {items.map((item) => {
          const firstItem = item.quote?.items?.[0];
          const totalItems = item.quote?.items?.length || 0;
          
          return (
            <div key={item.id} className="flex justify-between items-start border-b pb-4">
              <div className="flex gap-3 flex-1">
                {item.imageUrl && (
                  <img
                    src={item.imageUrl}
                    alt={item.productName}
                    className="w-12 h-12 object-cover rounded border flex-shrink-0"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-sm line-clamp-2">
                    {firstItem?.name || item.productName}
                  </h4>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-xs">
                      Qty: {item.quantity}
                    </Badge>
                    {totalItems > 1 && (
                      <Badge variant="secondary" className="text-xs">
                        +{totalItems - 1} more
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-gray-600 mt-1">
                    From {item.quote.origin_country} → {item.quote.destination_country}
                  </p>
                </div>
              </div>
              <div className="text-right font-medium">
                {itemTotals[item.id] || '...'}
              </div>
            </div>
          );
        })}

        <div className="space-y-3 pt-4">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Subtotal</span>
            <span>{totalFormatted}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Shipping</span>
            <span className="text-green-600">FREE</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Insurance</span>
            <span className="text-green-600">Included</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Tax & Customs</span>
            <span className="text-gray-600">Calculated</span>
          </div>
        </div>

        <Separator />

        <div className="flex justify-between items-center">
          <span className="text-lg font-semibold">Total</span>
          <span className="text-2xl font-bold">{totalFormatted}</span>
        </div>

        {/* Trust Badges */}
        <div className="flex items-center justify-center gap-4 pt-4 text-sm text-gray-600">
          <div className="flex items-center gap-1">
            <Shield className="h-4 w-4 text-green-600" />
            <span>Secure</span>
          </div>
          <div className="flex items-center gap-1">
            <Lock className="h-4 w-4 text-gray-600" />
            <span>Encrypted</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Address form component
const AddressForm = ({ 
  address, 
  onAddressChange 
}: {
  address: any;
  onAddressChange: (address: any) => void;
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="w-5 h-5" />
          Delivery Address
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="firstName">First Name</Label>
            <Input
              id="firstName"
              value={address.firstName || ''}
              onChange={(e) => onAddressChange({ ...address, firstName: e.target.value })}
              placeholder="Enter first name"
            />
          </div>
          <div>
            <Label htmlFor="lastName">Last Name</Label>
            <Input
              id="lastName"
              value={address.lastName || ''}
              onChange={(e) => onAddressChange({ ...address, lastName: e.target.value })}
              placeholder="Enter last name"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={address.email || ''}
            onChange={(e) => onAddressChange({ ...address, email: e.target.value })}
            placeholder="your@email.com"
          />
        </div>

        <div>
          <Label htmlFor="phone">Phone Number</Label>
          <Input
            id="phone"
            type="tel"
            value={address.phone || ''}
            onChange={(e) => onAddressChange({ ...address, phone: e.target.value })}
            placeholder="Your phone number"
          />
        </div>

        <div>
          <Label htmlFor="address1">Address Line 1</Label>
          <Input
            id="address1"
            value={address.address1 || ''}
            onChange={(e) => onAddressChange({ ...address, address1: e.target.value })}
            placeholder="Street address"
          />
        </div>

        <div>
          <Label htmlFor="address2">Address Line 2 (Optional)</Label>
          <Input
            id="address2"
            value={address.address2 || ''}
            onChange={(e) => onAddressChange({ ...address, address2: e.target.value })}
            placeholder="Apartment, suite, etc."
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="city">City</Label>
            <Input
              id="city"
              value={address.city || ''}
              onChange={(e) => onAddressChange({ ...address, city: e.target.value })}
              placeholder="City"
            />
          </div>
          <div>
            <Label htmlFor="postalCode">Postal Code</Label>
            <Input
              id="postalCode"
              value={address.postalCode || ''}
              onChange={(e) => onAddressChange({ ...address, postalCode: e.target.value })}
              placeholder="Postal code"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="notes">Special Instructions (Optional)</Label>
          <Textarea
            id="notes"
            value={address.notes || ''}
            onChange={(e) => onAddressChange({ ...address, notes: e.target.value })}
            placeholder="Any special delivery instructions..."
            rows={3}
          />
        </div>
      </CardContent>
    </Card>
  );
};

export const Checkout: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();

  const [address, setAddress] = useState<any>({});
  const [paymentMethod, setPaymentMethod] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);

  const quoteIds = searchParams.get('quotes')?.split(',') || [];

  // Fetch checkout items
  const { data: checkoutItems = [], isLoading: loading } = useQuery({
    queryKey: ['checkout', quoteIds],
    queryFn: async () => {
      if (quoteIds.length === 0) return [];

      const { data: quotes, error } = await supabase
        .from('quotes_v2')
        .select(COMMON_QUERIES.cartItems)
        .in('id', quoteIds)
        .eq('status', 'approved');

      if (error) throw error;

      return quotes.map(quote => ({
        id: quote.id,
        quote,
        quantity: 1, // Default quantity
        productName: quote.items?.[0]?.name || 'Unknown Product',
        imageUrl: quote.items?.[0]?.image_url || quote.image_url
      })) as CheckoutItem[];
    },
    enabled: quoteIds.length > 0,
  });

  // Fetch user profile
  const { data: userProfile } = useQuery({
    queryKey: ['user-profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Pre-fill address from user profile
  useEffect(() => {
    if (userProfile) {
      setAddress({
        firstName: userProfile.full_name?.split(' ')[0] || '',
        lastName: userProfile.full_name?.split(' ').slice(1).join(' ') || '',
        email: userProfile.email || user?.email || '',
        phone: userProfile.phone || '',
        // Add other address fields from profile if available
      });
    }
  }, [userProfile, user]);

  // Currency logic matching quote page
  const getDisplayCurrency = useCallback(() => {
    if (user?.id && userProfile?.preferred_display_currency) {
      return userProfile.preferred_display_currency;
    }
    if (checkoutItems.length > 0 && checkoutItems[0].quote?.destination_country) {
      return getDestinationCurrency(checkoutItems[0].quote.destination_country);
    }
    return 'USD';
  }, [user?.id, userProfile?.preferred_display_currency, checkoutItems]);

  const displayCurrency = getDisplayCurrency();

  const convertCurrency = useCallback(async (amount: number, fromCurrency: string, toCurrency: string) => {
    if (fromCurrency === toCurrency) {
      return amount;
    }
    
    try {
      const { currencyService } = await import('@/services/CurrencyService');
      return await currencyService.convertAmount(amount, fromCurrency, toCurrency);
    } catch (error) {
      console.warn(`Currency conversion failed ${fromCurrency}->${toCurrency}:`, error);
      return amount;
    }
  }, []);

  const formatDisplayCurrency = useCallback(async (amount: number, sourceCurrency?: string) => {
    const fromCurrency = sourceCurrency || 'USD';
    
    if (fromCurrency === displayCurrency) {
      return formatCurrency(amount, displayCurrency);
    }
    
    try {
      const convertedAmount = await convertCurrency(amount, fromCurrency, displayCurrency);
      return formatCurrency(convertedAmount, displayCurrency);
    } catch (error) {
      console.warn('Currency formatting failed, using original:', error);
      return formatCurrency(amount, fromCurrency);
    }
  }, [displayCurrency, convertCurrency]);

  const handlePlaceOrder = async () => {
    if (!address.firstName || !address.lastName || !address.email || !address.address1) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required address fields.",
        variant: "destructive",
      });
      return;
    }

    if (!paymentMethod) {
      toast({
        title: "Payment Method Required",
        description: "Please select a payment method.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);

    try {
      // Create orders from quotes
      const orders = await Promise.all(
        checkoutItems.map(async (item) => {
          const { data: order, error } = await supabase
            .from('orders')
            .insert({
              quote_id: item.quote.id,
              customer_id: user?.id,
              status: 'pending_payment',
              shipping_address: address,
              payment_method: paymentMethod,
              total_amount: item.quote.total_origin_currency || item.quote.total_usd || 0,
              currency: getBreakdownSourceCurrency(item.quote),
            })
            .select()
            .single();

          if (error) throw error;

          // Update quote status
          await supabase
            .from('quotes_v2')
            .update({ status: 'ordered' })
            .eq('id', item.quote.id);

          return order;
        })
      );

      toast({
        title: "Order Placed Successfully!",
        description: `${orders.length} order(s) created. Redirecting to confirmation...`,
      });

      // Redirect to order confirmation
      const orderIds = orders.map(o => o.id).join(',');
      navigate(`/order-confirmation?orders=${orderIds}`);

    } catch (error) {
      console.error('Error placing order:', error);
      toast({
        title: "Order Failed",
        description: "There was an error processing your order. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading checkout...</p>
        </div>
      </div>
    );
  }

  if (checkoutItems.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="max-w-md mx-4">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">No Items to Checkout</h2>
            <p className="text-muted-foreground mb-6">
              Your checkout session has expired or no items were found.
            </p>
            <Button onClick={() => navigate('/cart')} className="w-full">
              Back to Cart
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container max-w-7xl mx-auto px-4 py-8 pb-24 md:pb-8">
        {/* Back Button */}
        <Button 
          variant="ghost" 
          className="mb-6 p-0 h-auto font-normal text-muted-foreground hover:text-foreground"
          onClick={() => navigate('/cart')}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Cart
        </Button>

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-4">Secure Checkout</h1>
          <p className="text-muted-foreground">
            Complete your order securely and safely
          </p>
        </div>

        {/* Progress Indicator */}
        <div className="hidden md:block">
          <CheckoutProgress currentStep={4} />
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column - Checkout Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Address Form */}
            <AddressForm address={address} onAddressChange={setAddress} />

            {/* Payment Method */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5" />
                  Payment Method
                </CardTitle>
              </CardHeader>
              <CardContent>
                <PaymentMethodSelector
                  selectedMethod={paymentMethod}
                  onMethodChange={setPaymentMethod}
                  currency={displayCurrency}
                  country={checkoutItems[0]?.quote?.destination_country || 'US'}
                  availableGateways={[]} // Will be populated by the selector
                  disabled={isProcessing}
                />
              </CardContent>
            </Card>

            {/* Place Order Button - Mobile */}
            <div className="block lg:hidden">
              <Button
                onClick={handlePlaceOrder}
                disabled={isProcessing}
                className="w-full h-12 bg-black hover:bg-gray-800 text-white font-semibold text-base"
              >
                {isProcessing ? 'Processing...' : 'Place Order'}
              </Button>
            </div>
          </div>

          {/* Right Column - Order Summary */}
          <div className="lg:col-span-1">
            <OrderSummary
              items={checkoutItems}
              formatDisplayCurrency={formatDisplayCurrency}
              displayCurrency={displayCurrency}
            />

            {/* Place Order Button - Desktop */}
            <div className="hidden lg:block mt-6">
              <Button
                onClick={handlePlaceOrder}
                disabled={isProcessing}
                className="w-full h-12 bg-black hover:bg-gray-800 text-white font-semibold text-base"
              >
                {isProcessing ? 'Processing...' : 'Place Order'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};