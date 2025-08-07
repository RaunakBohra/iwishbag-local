import { useState, useCallback, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import {
  Trash2,
  ShoppingCart,
  Package,
  ShieldCheck,
  Truck,
  Heart,
  Star,
  Plus,
  Minus,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useCart } from '@/hooks/useCart';
import { useDisplayCurrency } from '@/hooks/useDisplayCurrency';
import { CartItem } from '@/stores/cartStore';
import { Tables } from '@/integrations/supabase/types';
import { getBreakdownSourceCurrency } from '@/utils/currencyMigration';

// Component to display cart item price with same currency logic as quote page
const CartItemPrice = ({ item, quantity }: { item: CartItem; quantity: number }) => {
  const { formatAmountWithConversion, formatAmountSync, displayCurrency, getSourceCurrency } = useDisplayCurrency(item.quote);
  const [convertedAmount, setConvertedAmount] = useState<string | null>(null);
  
  useEffect(() => {
    const convertPrice = async () => {
      try {
        // Get the total amount to display from quote data
        const baseAmount = item.quote?.total_origin_currency || item.quote?.origin_total_amount || item.quote?.total_usd || 0;
        const totalWithQuantity = baseAmount * quantity;
        
        // Get source currency (origin country currency)
        const sourceCurrency = item.quote ? getSourceCurrency(item.quote) : 'USD';
        
        console.log(`💰 [CART ITEM] Converting: ${totalWithQuantity} ${sourceCurrency} → ${displayCurrency}`, {
          itemId: item.id,
          baseAmount,
          quantity,
          sourceCurrency,
          displayCurrency,
          quote: item.quote ? { id: item.quote.id, origin_country: item.quote.origin_country } : null
        });
        
        // Convert and format using the same logic as quote page
        const formatted = await formatAmountWithConversion(totalWithQuantity, sourceCurrency);
        setConvertedAmount(formatted);
        console.log(`✅ [CART ITEM] Converted result: ${formatted}`);
      } catch (error) {
        console.warn('❌ [CART ITEM] Cart item price conversion failed:', error);
        // Fallback to sync formatting - THIS IS THE PROBLEM!
        const baseAmount = item.quote?.total_origin_currency || item.quote?.total_usd || 0;
        const fallbackAmount = formatAmountSync(baseAmount * quantity);
        console.warn(`⚠️ [CART ITEM] Using fallback (no conversion): ${fallbackAmount}`);
        setConvertedAmount(fallbackAmount);
      }
    };
    
    convertPrice();
  }, [item, quantity, formatAmountWithConversion, formatAmountSync, getSourceCurrency]);
  
  return <>{convertedAmount || formatAmountSync(0)}</>;
};

// Component to display cart total with same currency logic as quote page
const CartTotal = ({ items }: { items: CartItem[] }) => {
  const firstItemQuote = items.find(item => item.quote)?.quote;
  const [convertedTotal, setConvertedTotal] = useState<string>('$0.00');
  
  // CRITICAL FIX: Only call useDisplayCurrency if we have quote data
  const { formatAmountWithConversion, formatAmountSync, getSourceCurrency } = useDisplayCurrency(
    firstItemQuote || undefined // Ensure we pass undefined instead of null
  );
  
  useEffect(() => {
    const convertTotal = async () => {
      if (items.length === 0) {
        setConvertedTotal(formatAmountSync(0));
        return;
      }
      
      // CRITICAL FIX: Don't try currency conversion if no quotes available
      if (!firstItemQuote) {
        console.warn('💰 [CART DEBUG] No quote data available for cart total - cannot calculate');
        setConvertedTotal(formatAmountSync(0));
        return;
      }
      
      try {
        console.log('💰 [CART DEBUG] Converting cart total with quote data:', {
          itemCount: items.length,
          firstQuoteId: firstItemQuote.id,
          originCountry: firstItemQuote.origin_country
        });
        
        // Calculate total using same logic as quote page
        const totalAmount = items.reduce((sum, item) => {
          const baseAmount = item.quote?.total_origin_currency || item.quote?.origin_total_amount || item.quote?.total_usd || item.finalTotal || 0;
          return sum + (baseAmount * item.quantity);
        }, 0);
        
        // Use source currency from first quote
        const sourceCurrency = getSourceCurrency(firstItemQuote);
        
        // Convert and format using the same logic as quote page
        const formatted = await formatAmountWithConversion(totalAmount, sourceCurrency);
        setConvertedTotal(formatted);
      } catch (error) {
        console.warn('Cart total conversion failed:', error);
        // Fallback to sync formatting with quote data only
        const totalAmount = items.reduce((sum, item) => {
          const baseAmount = item.quote?.total_origin_currency || item.quote?.total_usd || 0;
          return sum + (baseAmount * item.quantity);
        }, 0);
        setConvertedTotal(formatAmountSync(totalAmount));
      }
    };
    
    convertTotal();
  }, [items, formatAmountWithConversion, formatAmountSync, getSourceCurrency, firstItemQuote]);
  
  return <>{convertedTotal}</>;
};

export const Cart = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const {
    items: cartItems,
    selectedItems,
    isLoading: cartLoading,
    hasLoadedFromServer,
    selectedItemsTotal,
    selectedItemsWeight,
    itemCount,
    selectedItemCount,
    hasSelectedItems,
    hasCartItems,
    isAllSelected,
    removeItem,
    updateQuantity,
    toggleSelection,
    handleSelectAll,
    handleBulkDelete,
    loadFromServer,
    getSelectedItems,
  } = useCart();

  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);

  // Load cart when component mounts
  if (user && !cartLoading && !hasLoadedFromServer) {
    loadFromServer(user.id);
  }

  const handleQuantityChange = useCallback(
    (id: string, newQuantity: number) => {
      if (newQuantity < 1) return;
      updateQuantity(id, newQuantity);
    },
    [updateQuantity],
  );

  const handleRemoveFromCart = useCallback(
    async (id: string) => {
      try {
        await removeItem(id);
        toast({
          title: 'Item removed',
          description: 'Item has been removed from your cart.',
        });
      } catch (_error) {
        toast({
          title: 'Error',
          description: 'Failed to remove item. Please try again.',
          variant: 'destructive',
        });
      }
    },
    [removeItem, toast],
  );

  const confirmBulkDelete = async () => {
    try {
      await handleBulkDelete();
      setShowBulkDeleteConfirm(false);
      toast({
        title: 'Items removed',
        description: 'Selected items have been removed from your cart.',
      });
    } catch (_error) {
      toast({
        title: 'Error',
        description: 'Failed to remove items. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const renderCartContent = () => {
    if (!cartItems || cartItems.length === 0) {
      return (
        <Card className="p-12 text-center border-0 shadow-sm">
          <h3 className="text-xl font-semibold mb-2">Your cart is empty</h3>
          <p className="text-gray-600 mb-6">
            Looks like you haven't added anything to your cart yet.
          </p>
          <Button className="bg-black hover:bg-gray-800 text-white" onClick={() => navigate('/')}>
            Continue shopping
          </Button>
        </Card>
      );
    }

    return (
      <div className="space-y-6">
        {cartItems.map((item) => (
          <Card key={item.id} className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex gap-6">
                {/* Product Image */}
                <div className="flex-shrink-0">
                  {item.imageUrl && (
                    <img
                      src={item.imageUrl}
                      alt={item.productName}
                      className="w-24 h-24 object-cover rounded-lg border"
                    />
                  )}
                </div>

                {/* Product Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-semibold text-gray-900 text-lg">{item.productName}</h3>
                      <p className="text-sm text-gray-600 mt-1">
                        Shipping: {item.purchaseCountryCode} → {item.destinationCountryCode}
                      </p>
                      <p className="text-sm text-green-600 font-medium mt-1">FREE shipping</p>
                    </div>
                    <button
                      onClick={() => handleRemoveFromCart(item.id)}
                      className="text-gray-400 hover:text-gray-600 p-1"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Price and Quantity */}
                  <div className="flex items-center justify-between mt-4">
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-gray-600">Quantity</span>
                      <div className="flex items-center border border-gray-300 rounded-lg">
                        <button
                          onClick={() =>
                            handleQuantityChange(item.id, Math.max(1, item.quantity - 1))
                          }
                          className="p-2 hover:bg-gray-50 rounded-l-lg"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="px-4 py-2 text-sm font-medium border-x">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                          className="p-2 hover:bg-gray-50 rounded-r-lg"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-lg font-semibold text-gray-900">
                        <CartItemPrice item={item} quantity={item.quantity} />
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  if (cartLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Shopify-style header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">Shopping cart</h1>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <ShieldCheck className="h-4 w-4" />
              Secure checkout
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart Items - Shopify Style */}
          <div className="lg:col-span-2">{renderCartContent()}</div>

          {/* Order Summary - Shopify Style */}
          <div className="lg:col-span-1">
            <Card className="sticky top-4 border-0 shadow-sm">
              <CardContent className="p-6">
                <h2 className="text-xl font-semibold mb-4">Order summary</h2>

                <div className="space-y-3 mb-4">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Subtotal</span>
                    <span className="font-medium">
                      <CartTotal items={cartItems} />
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Shipping</span>
                    <span className="text-green-600 font-medium">FREE</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Tax</span>
                    <span className="text-gray-600">Calculated at checkout</span>
                  </div>
                </div>

                <Separator className="my-4" />

                <div className="flex justify-between items-center mb-6">
                  <span className="text-lg font-semibold">Total</span>
                  <span className="text-2xl font-bold">
                    <CartTotal items={cartItems} />
                  </span>
                </div>

                {/* Trust Badges */}
                <div className="flex items-center justify-center gap-4 mb-6 text-sm text-gray-600">
                  <div className="flex items-center gap-1">
                    <ShieldCheck className="h-4 w-4 text-green-600" />
                    <span>Secure</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Truck className="h-4 w-4 text-blue-600" />
                    <span>Fast delivery</span>
                  </div>
                </div>

                <Button
                  className="w-full h-12 bg-black hover:bg-gray-800 text-white font-semibold text-base"
                  disabled={!hasCartItems}
                  onClick={() => {
                    try {
                      // Navigate to checkout with selected items or all items
                      const itemsToCheckout = hasSelectedItems ? getSelectedItems() : cartItems;
                      const quoteIds = itemsToCheckout.map((item) => item.quoteId).join(',');

                      // Use React Router navigation instead of window.location
                      navigate(`/checkout?quotes=${quoteIds}`);

                      toast({
                        title: 'Proceeding to checkout',
                        description: `Processing ${itemsToCheckout.length} item(s) for checkout.`,
                      });
                    } catch (error) {
                      console.error('Failed to proceed to checkout:', error);
                      toast({
                        title: 'Error',
                        description: 'Failed to proceed to checkout. Please try again.',
                        variant: 'destructive',
                      });
                    }
                  }}
                >
                  Checkout
                </Button>

                <div className="text-center mt-4">
                  <p className="text-xs text-gray-500">Secure checkout powered by iwishBag</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showBulkDeleteConfirm}
        onClose={() => setShowBulkDeleteConfirm(false)}
        onConfirm={confirmBulkDelete}
        title="Remove Items"
        description={`Are you sure you want to remove ${selectedItemCount} item(s) from your cart?`}
        confirmText="Remove"
        cancelText="Keep in Cart"
      />
    </div>
  );
};
