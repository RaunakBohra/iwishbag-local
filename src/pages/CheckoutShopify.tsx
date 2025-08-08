/**
 * Checkout Page - Shopify-style single page checkout
 * 
 * Features:
 * - Single page layout with left/right split
 * - Left: Address, Payment sections
 * - Right: Order summary with cart items
 * - Real-time validation and totals
 * - Mobile responsive design
 * - Integration with existing payment system
 * - Uses our new standardized patterns
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft,
  AlertCircle,
  Loader2,
  Package,
  Truck,
  CreditCard,
  Lock,
  ShoppingBag,
  MapPin,
  User,
  Shield,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';

// Import new unified patterns
import { StandardLoading } from '@/components/patterns';

import { useCart, useCartCurrency } from '@/hooks/useCart';
import { useAuth } from '@/contexts/AuthContext';
import { logger } from '@/utils/logger';
import { CheckoutService } from '@/services/CheckoutService';
import { currencyService } from '@/services/CurrencyService';
import { supabase } from '@/integrations/supabase/client';

// Import existing payment components
import { PaymentMethodSelector } from '@/components/payment/PaymentMethodSelector';
import { CheckoutAddressDisplay } from '@/components/checkout/CheckoutAddressDisplay';
import { Tables } from '@/integrations/supabase/types';
import { PaymentGateway } from '@/types/payment';

interface OrderSummary {
  itemsTotal: number;
  shippingTotal: number;
  taxesTotal: number;
  serviceFeesTotal: number;
  finalTotal: number;
  currency: string;
  savings?: number;
}


// Helper function for simple currency formatting - matches CartSummary approach
const formatCheckoutAmount = (amount: number, currency: string): string => {
  return currencyService.formatAmount(amount || 0, currency);
};

const CheckoutShopify: React.FC = React.memo(() => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { items, clearCart } = useCart();
  const { displayCurrency } = useCartCurrency();
  
  // State management
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orderSummary, setOrderSummary] = useState<OrderSummary | null>(null);
  const [processingOrder, setProcessingOrder] = useState(false);
  
  // Form data
  const [selectedAddress, setSelectedAddress] = useState<Tables<'delivery_addresses'> | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentGateway | null>(null);
  const [orderNotes, setOrderNotes] = useState('');
  
  // Services
  const checkoutService = useMemo(() => CheckoutService.getInstance(), []);

  // Fetch user addresses
  const [addresses, setAddresses] = useState<Tables<'delivery_addresses'>[]>([]);
  const [addressesLoading, setAddressesLoading] = useState(false);

  useEffect(() => {
    const fetchAddresses = async () => {
      if (!user) return;
      
      setAddressesLoading(true);
      try {
        const { data, error } = await supabase
          .from('delivery_addresses')
          .select('*')
          .eq('user_id', user.id)
          .order('is_default', { ascending: false })
          .order('created_at', { ascending: false });

        if (error) throw new Error(error.message);
        setAddresses(data || []);
      } catch (error) {
        logger.error('Failed to fetch addresses:', error);
      } finally {
        setAddressesLoading(false);
      }
    };

    fetchAddresses();
  }, [user]);

  // Calculate order summary
  useEffect(() => {
    const calculateOrderSummary = async () => {
      if (items.length === 0) return;
      
      try {
        setLoading(true);
        setError(null); // Clear previous errors
        
        // Validate items before calculation
        const hasValidItems = items.every(item => 
          item.quote && 
          typeof item.quote.final_total_origincurrency === 'number' &&
          !isNaN(item.quote.final_total_origincurrency)
        );
        
        if (!hasValidItems) {
          throw new Error('Some items in your cart have invalid pricing data. Please refresh and try again.');
        }

        // Ensure we have a valid destination country
        const destinationCountry = selectedAddress?.destination_country || user?.profile?.country || 'US';
        const summary = await checkoutService.calculateOrderSummary(items, destinationCountry);
        setOrderSummary(summary);
      } catch (error) {
        logger.error('Failed to calculate order summary:', error);
        const message = error instanceof Error ? error.message : 'Failed to calculate order total. Please try again.';
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    calculateOrderSummary();
  }, [items, selectedAddress?.destination_country, user?.profile?.country, checkoutService]);

  // Redirect if cart is empty
  useEffect(() => {
    if (!loading && items.length === 0) {
      navigate('/cart', { replace: true });
    }
  }, [items.length, loading, navigate]);

  // Form validation
  const isAddressValid = selectedAddress !== null;
  const isPaymentValid = selectedPaymentMethod !== null;
  const canPlaceOrder = isAddressValid && isPaymentValid && orderSummary && !processingOrder;

  const handleAddressSelect = useCallback((address: Tables<'delivery_addresses'>) => {
    setSelectedAddress(address);
  }, []);

  // Auto-select default address
  useEffect(() => {
    if (!selectedAddress && addresses && addresses.length > 0) {
      const defaultAddress = addresses.find(addr => addr.is_default) || addresses[0];
      setSelectedAddress(defaultAddress);
    }
  }, [addresses, selectedAddress]);

  // Handle order placement
  const handlePlaceOrder = useCallback(async () => {
    if (!canPlaceOrder) return;
    
    try {
      setProcessingOrder(true);
      setError(null);
      
      // Create order
      const order = await checkoutService.createOrder({
        items,
        address: selectedAddress!,
        paymentMethod: selectedPaymentMethod!,
        orderSummary: orderSummary!,
        userId: user!.id
      });
      
      // Clear cart after successful order
      await clearCart();
      
      // Navigate to order confirmation
      navigate(`/order-confirmation/${order.id}`, { replace: true });
      
    } catch (error) {
      logger.error('Failed to place order:', error);
      setError(error instanceof Error ? error.message : 'Failed to place order. Please try again.');
    } finally {
      setProcessingOrder(false);
    }
  }, [canPlaceOrder, checkoutService, items, selectedAddress, selectedPaymentMethod, orderSummary, user, clearCart, navigate]);

  // Show loading state while initializing
  if (loading && items.length === 0) {
    return (
      <StandardLoading
        isLoading={true}
        config={{ fullScreen: true, variant: 'spinner', size: 'lg' }}
        loadingText="Loading checkout..."
      >
        <div />
      </StandardLoading>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                onClick={() => navigate('/cart')}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Cart
              </Button>
              
              <div className="flex items-center gap-3">
                <ShoppingBag className="w-6 h-6 text-teal-600" />
                <div>
                  <h1 className="text-2xl font-bold">Checkout</h1>
                  <p className="text-sm text-gray-500">
                    {items.length} {items.length === 1 ? 'item' : 'items'}
                  </p>
                </div>
              </div>
            </div>

            {/* Security Badge */}
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Lock className="w-4 h-4" />
              <span>Secure Checkout</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Shopify-style Layout: Left form, Right summary */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Side: Checkout Form */}
          <div className="space-y-6">
            {/* Delivery Address */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  Delivery Address
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CheckoutAddressDisplay
                  selectedAddress={selectedAddress}
                  onAddressChange={handleAddressSelect}
                  isLoading={addressesLoading}
                />
              </CardContent>
            </Card>

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
                  selectedMethod={selectedPaymentMethod}
                  onMethodChange={setSelectedPaymentMethod}
                  amount={orderSummary?.finalTotal || 0}
                  currency={displayCurrency}
                  country={selectedAddress?.destination_country || user?.profile?.country || 'US'}
                />
              </CardContent>
            </Card>

            {/* Order Notes */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Order Notes (Optional)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={orderNotes}
                  onChange={(e) => setOrderNotes(e.target.value)}
                  placeholder="Add any special instructions for your order..."
                  rows={3}
                />
              </CardContent>
            </Card>

            {/* Place Order Button - Mobile */}
            <div className="sticky bottom-4 bg-white p-4 border rounded-lg shadow-lg lg:hidden">
              <Button
                onClick={handlePlaceOrder}
                disabled={!canPlaceOrder}
                className="w-full h-12 text-lg font-medium"
              >
                {processingOrder ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Processing Order...
                  </>
                ) : (
                  <>Place Order</>
                )}
              </Button>
            </div>
          </div>

          {/* Right Side: Order Summary */}
          <div className="space-y-6">
            <div className="lg:sticky lg:top-4">
              {/* Cart Items Preview */}
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="w-5 h-5" />
                    Order Items ({items.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 max-h-60 overflow-y-auto">
                  {items.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center border">
                          <Package className="w-6 h-6 text-gray-400" />
                        </div>
                        <div>
                          <h4 className="font-medium text-sm">Quote #{item.quote.display_id || item.quote.id.slice(0, 8)}</h4>
                          <p className="text-xs text-gray-600">
                            {item.quote.items?.length || 0} items • {item.quote.origin_country} → {item.quote.destination_country}
                          </p>
                          <Badge size="sm" variant={item.quote.status === 'approved' ? 'default' : 'secondary'}>
                            {item.quote.status}
                          </Badge>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-sm">
                          {formatCheckoutAmount(item.quote.final_total_origincurrency || 0, displayCurrency)}
                        </p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Order Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Order Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <StandardLoading
                    isLoading={loading}
                    config={{ variant: 'skeleton' }}
                  >
                    {orderSummary ? (
                      <div className="space-y-3">
                        <div className="flex justify-between text-sm">
                          <span>Items ({items.length})</span>
                          <span>
                            {formatCheckoutAmount(orderSummary.itemsTotal, displayCurrency)}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="flex items-center gap-1">
                            <Truck className="w-3 h-3" />
                            Shipping
                          </span>
                          <span>
                            {formatCheckoutAmount(orderSummary.shippingTotal, displayCurrency)}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Taxes & Duties</span>
                          <span>
                            {formatCheckoutAmount(orderSummary.taxesTotal, displayCurrency)}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="flex items-center gap-1">
                            <Shield className="w-3 h-3" />
                            Service Fees
                          </span>
                          <span>
                            {formatCheckoutAmount(orderSummary.serviceFeesTotal, displayCurrency)}
                          </span>
                        </div>
                        
                        {orderSummary.savings && orderSummary.savings > 0 && (
                          <div className="flex justify-between text-sm text-green-600">
                            <span>Savings</span>
                            <span>
                              -{formatCheckoutAmount(orderSummary.savings, displayCurrency)}
                            </span>
                          </div>
                        )}
                        
                        <Separator />
                        <div className="flex justify-between font-semibold text-lg">
                          <span>Total</span>
                          <span>
                            {formatCheckoutAmount(orderSummary.finalTotal, displayCurrency)}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">Calculating totals...</p>
                    )}
                  </StandardLoading>
                </CardContent>
              </Card>

              {/* Place Order Button - Desktop */}
              <div className="hidden lg:block mt-6">
                <Button
                  onClick={handlePlaceOrder}
                  disabled={!canPlaceOrder}
                  className="w-full h-12 text-lg font-medium"
                >
                  {processingOrder ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Processing Order...
                    </>
                  ) : (
                    <>Place Order</>
                  )}
                </Button>
                
                {!isAddressValid && (
                  <p className="text-sm text-red-600 mt-2">Please select a delivery address</p>
                )}
                {!isPaymentValid && (
                  <p className="text-sm text-red-600 mt-2">Please select a payment method</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

CheckoutShopify.displayName = 'CheckoutShopify';

export default CheckoutShopify;