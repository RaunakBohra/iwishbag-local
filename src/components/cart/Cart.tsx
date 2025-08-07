import React, { useState, useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { 
  ShoppingCart, 
  Package, 
  Truck, 
  Shield, 
  Clock, 
  Trash2,
  Plus,
  Minus,
  Star,
  Heart,
  ArrowLeft,
  Lock,
  CreditCard,
  Tag,
  Zap,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { QuoteStatusBadge } from '@/components/ui/QuoteStatusBadge';
import { getBreakdownSourceCurrency } from '@/utils/currencyMigration';
import { getOriginCurrency, getDestinationCurrency } from '@/utils/originCurrency';
import { COMMON_QUERIES } from '@/lib/queryColumns';

interface CartItem {
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

// Cart Progress component matching quote page style
const CartProgress = ({ currentStep }: { currentStep: number }) => {
  const steps = [
    { label: 'Browse', step: 1 },
    { label: 'Quote Approved', step: 2 },
    { label: 'In Cart', step: 3 },
    { label: 'Checkout', step: 4 },
    { label: 'Ordered', step: 5 }
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

// Mobile-optimized cart item component
const MobileCartItem = ({ 
  item, 
  onUpdateQuantity, 
  onRemove, 
  formatDisplayCurrency,
  displayCurrency 
}: {
  item: CartItem;
  onUpdateQuantity: (id: string, quantity: number) => void;
  onRemove: (id: string) => void;
  formatDisplayCurrency: (amount: number, currency?: string) => Promise<string>;
  displayCurrency: string;
}) => {
  const [formattedPrice, setFormattedPrice] = useState<string>('...');

  useEffect(() => {
    const updatePrice = async () => {
      const amount = item.quote?.total_origin_currency || item.quote?.total_usd || 0;
      const sourceCurrency = getBreakdownSourceCurrency(item.quote);
      const formatted = await formatDisplayCurrency(amount * item.quantity, sourceCurrency);
      setFormattedPrice(formatted);
    };
    updatePrice();
  }, [item, formatDisplayCurrency, displayCurrency]);

  const firstItem = item.quote?.items?.[0];
  const totalItems = item.quote?.items?.length || 0;

  return (
    <Card className="mb-4">
      <CardContent className="p-4">
        <div className="flex gap-4">
          {/* Product Image */}
          {item.imageUrl && (
            <div className="flex-shrink-0">
              <img
                src={item.imageUrl}
                alt={item.productName}
                className="w-16 h-16 object-cover rounded-lg border"
              />
            </div>
          )}

          {/* Product Details */}
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-start mb-2">
              <div>
                <h3 className="font-semibold text-gray-900 text-sm">
                  {firstItem?.name || item.productName}
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  <QuoteStatusBadge status={item.quote.status} />
                  <Badge variant="outline" className="text-xs">
                    Quote #{item.quote.quote_number || item.quote.id.slice(0, 8)}
                  </Badge>
                </div>
                {totalItems > 1 && (
                  <p className="text-xs text-gray-600 mt-1">
                    +{totalItems - 1} more items
                  </p>
                )}
              </div>
              <button
                onClick={() => onRemove(item.id)}
                className="text-gray-400 hover:text-red-500 p-1"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>

            {/* Shipping Route */}
            <div className="flex items-center gap-1 text-xs text-gray-600 mb-3">
              <Truck className="h-3 w-3" />
              <span>From {item.quote.origin_country} → {item.quote.destination_country}</span>
            </div>

            {/* Price and Quantity */}
            <div className="flex items-center justify-between">
              <div className="flex items-center border border-gray-300 rounded-lg">
                <button
                  onClick={() => onUpdateQuantity(item.id, Math.max(1, item.quantity - 1))}
                  className="p-2 hover:bg-gray-50 rounded-l-lg"
                  disabled={item.quantity <= 1}
                >
                  <Minus className="h-3 w-3" />
                </button>
                <span className="px-3 py-2 text-sm font-medium border-x min-w-[3rem] text-center">
                  {item.quantity}
                </span>
                <button
                  onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                  className="p-2 hover:bg-gray-50 rounded-r-lg"
                >
                  <Plus className="h-3 w-3" />
                </button>
              </div>

              <div className="text-right">
                <div className="font-semibold text-lg text-gray-900">
                  {formattedPrice}
                </div>
                <div className="text-xs text-green-600">
                  Free shipping
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Cart total summary matching quote page design
const CartSummary = ({ 
  items, 
  formatDisplayCurrency,
  displayCurrency,
  onCheckout 
}: {
  items: CartItem[];
  formatDisplayCurrency: (amount: number, currency?: string) => Promise<string>;
  displayCurrency: string;
  onCheckout: () => void;
}) => {
  const [totalFormatted, setTotalFormatted] = useState<string>('...');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const updateTotal = async () => {
      const total = items.reduce((sum, item) => {
        const amount = item.quote?.total_origin_currency || item.quote?.total_usd || 0;
        return sum + (amount * item.quantity);
      }, 0);

      // Use first item's currency as source
      const sourceCurrency = items.length > 0 ? getBreakdownSourceCurrency(items[0].quote) : 'USD';
      const formatted = await formatDisplayCurrency(total, sourceCurrency);
      setTotalFormatted(formatted);
    };
    updateTotal();
  }, [items, formatDisplayCurrency, displayCurrency]);

  return (
    <Card className="sticky top-4">
      <CardContent className="p-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <ShoppingCart className="w-5 h-5" />
          Order Summary
        </h2>

        <div className="space-y-3 mb-4">
          <div className="flex justify-between">
            <span className="text-gray-600">Subtotal ({items.length} items)</span>
            <span className="font-medium">{totalFormatted}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Shipping</span>
            <span className="text-green-600 font-medium">FREE</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Insurance</span>
            <span className="text-green-600">Included</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Tax & Customs</span>
            <span className="text-gray-600">Calculated at checkout</span>
          </div>
        </div>

        <Separator className="my-4" />

        <div className="flex justify-between items-center mb-6">
          <span className="text-lg font-semibold">Total</span>
          <span className="text-2xl font-bold">{totalFormatted}</span>
        </div>

        {/* Trust Badges */}
        <div className="flex items-center justify-center gap-4 mb-6 text-sm text-gray-600">
          <div className="flex items-center gap-1">
            <Shield className="h-4 w-4 text-green-600" />
            <span>Secure</span>
          </div>
          <div className="flex items-center gap-1">
            <Truck className="h-4 w-4 text-blue-600" />
            <span>Fast delivery</span>
          </div>
          <div className="flex items-center gap-1">
            <Lock className="h-4 w-4 text-gray-600" />
            <span>Safe checkout</span>
          </div>
        </div>

        <Button
          onClick={onCheckout}
          disabled={items.length === 0 || loading}
          className="w-full h-12 bg-black hover:bg-gray-800 text-white font-semibold text-base"
        >
          {loading ? 'Processing...' : `Checkout • ${totalFormatted}`}
        </Button>

        <div className="text-center mt-4">
          <p className="text-xs text-gray-500">Secure checkout powered by iwishBag</p>
        </div>
      </CardContent>
    </Card>
  );
};

export const Cart: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch cart items (approved quotes)
  const { data: cartItems = [], isLoading: loading, refetch: refetchCart } = useQuery({
    queryKey: ['cart', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data: quotes, error } = await supabase
        .from('quotes_v2')
        .select(COMMON_QUERIES.cartItems)
        .eq('customer_id', user.id)
        .eq('status', 'approved')
        .order('updated_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      // Convert quotes to cart items
      return quotes.map(quote => ({
        id: quote.id,
        quote,
        quantity: 1, // Default quantity
        productName: quote.items?.[0]?.name || 'Unknown Product',
        imageUrl: quote.items?.[0]?.image_url || quote.image_url
      })) as CartItem[];
    },
    enabled: !!user?.id,
    staleTime: 0,
    gcTime: 5 * 60 * 1000,
  });

  // Fetch user profile for currency preferences
  const { data: userProfile } = useQuery({
    queryKey: ['user-profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('preferred_display_currency, country')
        .eq('id', user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Currency logic matching quote page exactly
  const getDisplayCurrency = useCallback(() => {
    if (user?.id && userProfile?.preferred_display_currency) {
      return userProfile.preferred_display_currency;
    }
    if (cartItems.length > 0 && cartItems[0].quote?.destination_country) {
      return getDestinationCurrency(cartItems[0].quote.destination_country);
    }
    return 'USD';
  }, [user?.id, userProfile?.preferred_display_currency, cartItems]);

  const displayCurrency = getDisplayCurrency();

  // Currency conversion matching quote page
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

  // Cart actions
  const handleUpdateQuantity = (itemId: string, newQuantity: number) => {
    // Update quantity in local state
    queryClient.setQueryData(['cart', user?.id], (oldData: CartItem[] = []) => {
      return oldData.map(item => 
        item.id === itemId ? { ...item, quantity: newQuantity } : item
      );
    });
  };

  const handleRemoveItem = async (itemId: string) => {
    try {
      // Update quote status back to open
      await supabase
        .from('quotes_v2')
        .update({ status: 'open' })
        .eq('id', itemId);

      toast({
        title: "Item removed",
        description: "Item has been removed from your cart.",
      });

      refetchCart();
    } catch (error) {
      console.error('Error removing item:', error);
      toast({
        title: "Error",
        description: "Failed to remove item. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleCheckout = () => {
    const quoteIds = cartItems.map(item => item.id).join(',');
    navigate(`/checkout?quotes=${quoteIds}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your cart...</p>
        </div>
      </div>
    );
  }

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="max-w-md mx-4">
          <CardContent className="pt-6 text-center">
            <ShoppingCart className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">Your cart is empty</h2>
            <p className="text-muted-foreground mb-6">
              Looks like you haven't approved any quotes yet. Get started by creating a new quote!
            </p>
            <Button onClick={() => navigate('/')} className="w-full mb-4">
              Start Shopping
            </Button>
            <Button 
              variant="outline" 
              onClick={() => navigate('/dashboard/quotes')}
              className="w-full"
            >
              View My Quotes
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
          onClick={() => navigate('/dashboard/quotes')}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>

        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <h1 className="text-3xl font-bold">Your Shopping Cart</h1>
            <Badge variant="secondary">{cartItems.length} items</Badge>
          </div>
          <p className="text-muted-foreground">
            Review your approved quotes and proceed to checkout
          </p>
        </div>

        {/* Progress Indicator */}
        <div className="hidden md:block">
          <CartProgress currentStep={3} />
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column - Cart Items */}
          <div className="lg:col-span-2">
            <div className="space-y-4">
              {cartItems.map((item) => (
                <MobileCartItem
                  key={item.id}
                  item={item}
                  onUpdateQuantity={handleUpdateQuantity}
                  onRemove={handleRemoveItem}
                  formatDisplayCurrency={formatDisplayCurrency}
                  displayCurrency={displayCurrency}
                />
              ))}
            </div>
          </div>

          {/* Right Column - Cart Summary */}
          <div className="lg:col-span-1">
            <CartSummary
              items={cartItems}
              formatDisplayCurrency={formatDisplayCurrency}
              displayCurrency={displayCurrency}
              onCheckout={handleCheckout}
            />
          </div>
        </div>
      </div>
    </div>
  );
};