import { useState, useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ShoppingCart, Package, ArrowRight, Trash2 } from 'lucide-react';
import { useQuoteCurrency } from '@/hooks/useCurrency';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useToast } from '@/hooks/use-toast';
import { Tables } from '@/integrations/supabase/types';
import { useCart } from '@/hooks/useCart';
import { CartItem } from '@/stores/cartStore';

// Mock quote type for cart display
interface MockQuote {
  id: string;
  origin_country: string;
  destination_country: string;
  shipping_address?: {
    destination_country: string;
  };
}

// Component to display cart item price with proper currency conversion
const CartItemPrice = ({ item, quantity }: { item: CartItem; quantity: number }) => {
  // Create a mock quote object for the cart item
  const mockQuote: MockQuote = {
    id: item.quoteId,
    origin_country: item.purchaseCountryCode || item.countryCode,
    destination_country: item.destinationCountryCode || item.countryCode,
    shipping_address: {
      destination_country: item.destinationCountryCode || item.countryCode,
    },
  };

  // Use the quote currency hook
  const { formatAmount } = useQuoteCurrency({
    origin_country: mockQuote.origin_country,
    destination_country: mockQuote.destination_country,
    destination_currency: item.currency || 'USD',
  });

  return <>{formatAmount(item.finalTotal * quantity)}</>;
};

interface CartDrawerProps {
  children: React.ReactNode;
}

export const CartDrawer = ({ children }: CartDrawerProps) => {
  const { user } = useAuth();
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

      // Navigate to checkout
      window.location.href = `/checkout?quotes=${quoteIds}`;
    } catch (error) {
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
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {/* Bulk Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Checkbox
              id="select-all-cart"
              checked={isAllSelected}
              onCheckedChange={handleSelectAll}
            />
            <label htmlFor="select-all-cart" className="text-sm font-medium">
              Select All ({itemCount})
            </label>
          </div>
          {selectedItemCount > 0 && (
            <Button variant="outline" size="sm" onClick={() => setShowBulkDeleteConfirm(true)}>
              <Trash2 className="h-4 w-4 mr-1" />
              Delete ({selectedItemCount})
            </Button>
          )}
        </div>

        {/* Cart Items */}
        <div className="space-y-3">
          {cartItems.map((item) => (
            <div
              key={item.id}
              className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg hover:shadow-sm transition-shadow"
            >
              <Checkbox
                checked={selectedItems.includes(item.id)}
                onCheckedChange={() => toggleSelection(item.id)}
              />
              {item.imageUrl && (
                <img
                  src={item.imageUrl}
                  alt={item.productName}
                  className="h-16 w-16 object-cover rounded-md flex-shrink-0"
                />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-gray-900 truncate text-sm">
                      {item.productName}
                    </h4>
                    <p className="text-xs text-gray-500">
                      From {item.purchaseCountryCode} to {item.destinationCountryCode}
                    </p>
                    <p className="text-xs text-gray-500">Weight: {item.itemWeight}kg</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-medium text-sm">
                      <CartItemPrice item={item} quantity={item.quantity} />
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-gray-600">Qty:</label>
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => handleQuantityChange(item.id, parseInt(e.target.value))}
                      className="w-12 p-1 border border-gray-300 rounded text-center text-xs"
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveFromCart(item.id)}
                    className="h-6 w-6 p-0"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
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
        <SheetContent className="w-[400px] sm:w-[540px] flex flex-col">
          <SheetHeader className="flex-shrink-0">
            <SheetTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Shopping Cart
              {cartItems?.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {cartItems.length}
                </Badge>
              )}
            </SheetTitle>
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
              <div className="flex-shrink-0 border-t pt-4 mt-4 space-y-4">
                {/* Summary */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Items ({hasSelectedItems ? selectedItemCount : itemCount})</span>
                    <span className="font-medium">
                      {itemsToDisplay.length > 0 && (
                        <CartItemPrice
                          item={{ ...itemsToDisplay[0], finalTotal: totalAmount }}
                          quantity={1}
                        />
                      )}
                    </span>
                  </div>
                  {hasSelectedItems && (
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>Total Weight</span>
                      <span>{selectedItemsWeight.toFixed(2)} kg</span>
                    </div>
                  )}
                </div>

                {/* Checkout Button */}
                <Button onClick={handleCheckout} className="w-full" disabled={!hasCartItems}>
                  <ArrowRight className="h-4 w-4 mr-2" />
                  Proceed to Checkout
                </Button>
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
