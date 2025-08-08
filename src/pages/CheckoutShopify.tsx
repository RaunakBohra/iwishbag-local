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
  CreditCard,
  Lock,
  ShoppingBag,
  MapPin,
  User,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';

// Import new unified patterns
import { StandardLoading } from '@/components/patterns';

import { useCart, useCartCurrency } from '@/hooks/useCart';
import { useAuth } from '@/contexts/AuthContext';
import { logger } from '@/utils/logger';
import { CheckoutService, AddonServiceSelection } from '@/services/CheckoutService';
import { supabase } from '@/integrations/supabase/client';

// Import existing payment components
import { PaymentMethodSelector } from '@/components/payment/PaymentMethodSelector';
import { CompactAddressDisplay } from '@/components/checkout/CompactAddressDisplay';
import { UnifiedOrderSummary } from '@/components/checkout/UnifiedOrderSummary';
import { Tables } from '@/integrations/supabase/types';
import { PaymentGateway } from '@/types/payment';

// Order summary interface for checkout
interface OrderSummary {
  subtotal: number;
  total: number;
  currency: string;
  items: any[];
}


const CheckoutShopify: React.FC = React.memo(() => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { items, clearCart } = useCart();
  const { displayCurrency } = useCartCurrency();
  
  // State management
  const [error, setError] = useState<string | null>(null);
  const [processingOrder, setProcessingOrder] = useState(false);
  const [orderSummary, setOrderSummary] = useState<OrderSummary | null>(null);
  
  // Form data
  const [selectedAddress, setSelectedAddress] = useState<Tables<'delivery_addresses'> | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentGateway | null>(null);
  const [orderNotes, setOrderNotes] = useState('');
  const [selectedAddonServices, setSelectedAddonServices] = useState<AddonServiceSelection[]>([]);
  
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

  // Redirect if cart is empty
  useEffect(() => {
    if (items.length === 0) {
      navigate('/cart', { replace: true });
    }
  }, [items.length, navigate]);

  // Form validation
  const isAddressValid = selectedAddress !== null;
  const isPaymentValid = selectedPaymentMethod !== null;
  const canPlaceOrder = isAddressValid && isPaymentValid && items.length > 0 && !processingOrder;

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
      
      // Calculate order summary on demand for order creation
      const destinationCountry = selectedAddress?.destination_country || user?.profile?.country || 'US';
      const orderSummary = await checkoutService.calculateOrderSummary(items, destinationCountry, selectedAddonServices);
      
      // Create order
      const order = await checkoutService.createOrder({
        items,
        address: selectedAddress!,
        paymentMethod: selectedPaymentMethod!,
        orderSummary,
        userId: user!.id,
        addonServices: selectedAddonServices
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
  }, [canPlaceOrder, checkoutService, items, selectedAddress, selectedPaymentMethod, user, clearCart, navigate]);


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
                <CompactAddressDisplay
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
                  amount={0} // Will be calculated at payment time
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


            {/* Mobile Order Summary */}
            <div className="lg:hidden space-y-4">
              <UnifiedOrderSummary
                onPlaceOrder={handlePlaceOrder}
                isProcessingOrder={processingOrder}
                showPlaceOrderButton={true}
                canPlaceOrder={canPlaceOrder}
              />
              
              {/* Validation Messages - Mobile */}
              {(!isAddressValid || !isPaymentValid) && (
                <div className="mt-4 space-y-2">
                  {!isAddressValid && (
                    <p className="text-sm text-red-600">Please select a delivery address</p>
                  )}
                  {!isPaymentValid && (
                    <p className="text-sm text-red-600">Please select a payment method</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right Side: Unified Order Summary */}
          <div className="space-y-6">
            <UnifiedOrderSummary
              onPlaceOrder={handlePlaceOrder}
              isProcessingOrder={processingOrder}
              showPlaceOrderButton={true}
              canPlaceOrder={canPlaceOrder}
              className="hidden lg:block"
            />
            
            {/* Validation Messages - Desktop */}
            <div className="hidden lg:block">
              {!isAddressValid && (
                <p className="text-sm text-red-600">Please select a delivery address</p>
              )}
              {!isPaymentValid && (
                <p className="text-sm text-red-600">Please select a payment method</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

CheckoutShopify.displayName = 'CheckoutShopify';

export default CheckoutShopify;