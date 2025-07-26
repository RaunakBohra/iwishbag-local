import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import {
  ShoppingCart,
  Package,
  ArrowRight,
  Trash2,
  ShieldCheck,
  Heart,
  Star,
  Truck,
  Plus,
  Minus,
} from 'lucide-react';
import { useQuoteCurrency } from '@/hooks/useCurrency';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useToast } from '@/hooks/use-toast';
import { Tables } from '@/integrations/supabase/types';
import { useCart } from '@/hooks/useCart';
import { CartItem } from '@/stores/cartStore';

// Component to display cart item price with proper currency conversion
const CartItemPrice = ({ item, quantity }: { item: CartItem; quantity: number }) => {
  // Use cart item's currency data directly - no mock quotes needed
  const { formatAmount } = useQuoteCurrency({
    origin_country: item.purchaseCountryCode,
    destination_country: item.destinationCountryCode,
    destination_currency: item.finalCurrency || 'USD',
  });

  return <>{formatAmount(item.finalTotal * quantity)}</>;
};

interface CartDrawerProps {
  children: React.ReactNode;
}

export const CartDrawer = ({ children }: CartDrawerProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);

  // Use the cart store
  const {
    items: cartItems,
    selectedItems,
    isLoading: cartLoading,
    error: cartError,
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
    handleBulkDelete,
    handleSelectAll,
    clearSelection,
    loadFromServer,
    getSelectedItems,
  } = useCart();

  // Load cart data when component mounts or user changes
  useEffect(() => {
    if (user && !cartLoading && !hasLoadedFromServer) {
      loadFromServer(user.id);
    }
  }, [user, loadFromServer, cartLoading, hasLoadedFromServer]);

  const handleQuantityChange = useCallback(
    (id: string, newQuantity: number) => {
      if (newQuantity < 1) return;
      updateQuantity(id, newQuantity);
    },
    [updateQuantity],
  );

  const handleRemoveFromCart = async (itemId: string) => {
    try {
      removeItem(itemId);
      toast({
        title: 'Item removed',
        description: 'Item has been removed from your cart.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to remove item. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleCheckout = async () => {
    try {
      // Navigate to checkout with selected items or all items
      const itemsToCheckout = hasSelectedItems ? getSelectedItems() : cartItems;
      const quoteIds = itemsToCheckout.map((item) => item.quoteId).join(',');

      // Clear selection after checkout
      clearSelection();

      // Close drawer
      setIsOpen(false);

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
  };

  const confirmBulkDelete = async () => {
    try {
      await handleBulkDelete();
      setShowBulkDeleteConfirm(false);
      toast({
        title: 'Items removed',
        description: 'Selected items have been removed from your cart.',
      });
    } catch (error) {
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
        <div className="flex flex-col items-center justify-center h-32 space-y-4">
          <ShoppingCart className="h-16 w-16 text-gray-400" />
          <div className="text-center">
            <h3 className="text-lg font-medium">Your cart is empty</h3>
            <p className="text-sm text-gray-500">Add some quotes to get started</p>
          </div>
          <Button
            className="bg-black hover:bg-gray-800 text-white"
            onClick={() => {
              setIsOpen(false);
              navigate('/');
            }}
          >
            Continue shopping
          </Button>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {cartItems.map((item) => (
          <div key={item.id} className="flex gap-4 p-4 border-b border-gray-100">
            {/* Product Image */}
            <div className="flex-shrink-0">
              {item.imageUrl && (
                <img
                  src={item.imageUrl}
                  alt={item.productName}
                  className="w-16 h-16 object-cover rounded border"
                />
              )}
            </div>

            {/* Product Details */}
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h4 className="font-medium text-gray-900 text-sm leading-tight">
                    {item.productName}
                  </h4>
                  <p className="text-xs text-gray-500 mt-1">
                    {item.purchaseCountryCode} → {item.destinationCountryCode}
                  </p>
                  <p className="text-xs text-green-600 font-medium mt-1">FREE shipping</p>
                </div>
                <button
                  onClick={() => handleRemoveFromCart(item.id)}
                  className="text-gray-400 hover:text-gray-600 ml-2"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              {/* Price and Quantity */}
              <div className="flex items-center justify-between mt-3">
                <div className="flex items-center gap-2">
                  <div className="flex items-center border border-gray-300 rounded">
                    <button
                      onClick={() => handleQuantityChange(item.id, Math.max(1, item.quantity - 1))}
                      className="p-1 hover:bg-gray-50"
                      disabled={item.quantity <= 1}
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="px-3 py-1 text-sm font-medium border-x">{item.quantity}</span>
                    <button
                      onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                      className="p-1 hover:bg-gray-50"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                </div>

                <div className="text-right">
                  <div className="font-medium text-gray-900">
                    <CartItemPrice item={item} quantity={item.quantity} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Calculate totals for display
  const itemsToDisplay = hasSelectedItems ? getSelectedItems() : cartItems;
  const totalAmount = itemsToDisplay.reduce(
    (sum, item) => sum + item.finalTotal * item.quantity,
    0,
  );

  return (
    <>
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>{children}</SheetTrigger>
        <SheetContent className="w-[400px] sm:w-[500px] flex flex-col">
          <SheetHeader className="pb-4">
            <SheetTitle className="text-xl font-semibold">Cart</SheetTitle>
          </SheetHeader>

          <div className="flex-1 flex flex-col min-h-0">
            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              {cartLoading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : (
                renderCartContent()
              )}
            </div>

            {/* Footer - only show if cart has items */}
            {hasCartItems && (
              <div className="border-t pt-4 mt-4 space-y-4">
                {/* Subtotal */}
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Subtotal</span>
                    <span className="font-medium">
                      {itemsToDisplay.length > 0 && (
                        <CartItemPrice
                          item={{ ...itemsToDisplay[0], finalTotal: totalAmount }}
                          quantity={1}
                        />
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Shipping</span>
                    <span className="text-green-600">FREE</span>
                  </div>
                </div>

                <div className="border-t pt-2">
                  <div className="flex justify-between items-center mb-4">
                    <span className="font-semibold">Total</span>
                    <span className="text-lg font-bold">
                      {itemsToDisplay.length > 0 && (
                        <CartItemPrice
                          item={{ ...itemsToDisplay[0], finalTotal: totalAmount }}
                          quantity={1}
                        />
                      )}
                    </span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                  {/* Go to Cart Button */}
                  <Button
                    onClick={() => {
                      setIsOpen(false);
                      navigate('/cart');
                    }}
                    variant="outline"
                    className="flex-1 h-12 font-medium"
                    disabled={!hasCartItems}
                  >
                    <ShoppingCart className="mr-2 h-4 w-4" />
                    View Cart
                  </Button>

                  {/* Checkout Button */}
                  <Button
                    onClick={handleCheckout}
                    className="flex-1 h-12 bg-black hover:bg-gray-800 text-white font-medium"
                    disabled={!hasCartItems}
                  >
                    Checkout
                  </Button>
                </div>

                <div className="text-center">
                  <p className="text-xs text-gray-500">Secure checkout powered by iwishBag</p>
                </div>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

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
    </>
  );
};
