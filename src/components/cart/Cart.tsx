import { useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Trash2, ShoppingCart, Package } from 'lucide-react';
import { useQuoteCurrency } from '@/hooks/useCurrency';
import { useToast } from '@/hooks/use-toast';
import { useCart } from '@/hooks/useCart';
import { CartItem } from '@/stores/cartStore';
import { Tables } from '@/integrations/supabase/types';

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

// Component to display cart total with proper currency conversion
const CartTotal = ({ items }: { items: CartItem[] }) => {
  if (items.length === 0) return <>$0.00</>;

  // Use the first item's currency context for the total - all items should have same destination
  const firstItem = items[0];
  const { formatAmount } = useQuoteCurrency({
    origin_country: firstItem.purchaseCountryCode,
    destination_country: firstItem.destinationCountryCode,
    destination_currency: firstItem.finalCurrency || 'USD',
  });

  const totalAmount = items.reduce((sum, item) => sum + item.finalTotal * item.quantity, 0);

  return <>{formatAmount(totalAmount)}</>;
};

export const Cart = () => {
  const { user } = useAuth();
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
        <div className="flex flex-col items-center justify-center h-64 space-y-4">
          <ShoppingCart className="h-16 w-16 text-muted-foreground" />
          <div className="text-center">
            <h3 className="text-lg font-medium">Your cart is empty</h3>
            <p className="text-sm text-muted-foreground">
              Add some quotes to your cart to get started
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
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
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowBulkDeleteConfirm(true)}>
                <Trash2 className="h-4 w-4 mr-1" />
                Delete ({selectedItemCount})
              </Button>
            </div>
          )}
        </div>

        {/* Items List */}
        <div className="space-y-4">
          {cartItems.map((item) => (
            <Card key={item.id}>
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <Checkbox
                    checked={selectedItems.includes(item.id)}
                    onCheckedChange={() => toggleSelection(item.id)}
                  />
                  {item.imageUrl && (
                    <img
                      src={item.imageUrl}
                      alt={item.productName}
                      className="h-20 w-20 object-cover rounded-md"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium text-gray-900 truncate">{item.productName}</h4>
                        <p className="text-sm text-gray-500">
                          From {item.purchaseCountryCode} to {item.destinationCountryCode}
                        </p>
                        <p className="text-sm text-gray-500">Weight: {item.itemWeight}kg</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">
                          <CartItemPrice item={item} quantity={item.quantity} />
                        </p>
                        <p className="text-sm text-gray-500">Qty: {item.quantity}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-4">
                      <div className="flex items-center gap-2">
                        <label className="text-sm text-gray-600">Qty:</label>
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => handleQuantityChange(item.id, parseInt(e.target.value))}
                          className="w-16 p-1 border border-gray-300 rounded text-center"
                        />
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveFromCart(item.id)}
                          className="h-8 w-8"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
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
    <div className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold">Shopping Cart</h1>
              <span className="text-sm text-gray-500">{itemCount} items</span>
            </div>
            {renderCartContent()}
          </div>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1">
          <Card className="sticky top-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Order Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Items ({itemCount})</span>
                  <span>
                    <CartTotal items={cartItems} />
                  </span>
                </div>
                {selectedItemCount > 0 && (
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Selected ({selectedItemCount})</span>
                    <span>
                      <CartTotal items={getSelectedItems()} />
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Total Weight</span>
                  <span>{selectedItemsWeight.toFixed(2)} kg</span>
                </div>
              </div>
              <Separator />
              <div className="flex justify-between font-medium">
                <span>Total</span>
                <span>
                  <CartTotal items={hasSelectedItems ? getSelectedItems() : cartItems} />
                </span>
              </div>
              <Button
                className="w-full"
                disabled={!hasCartItems}
                onClick={() => {
                  // Navigate to checkout with selected items or all items
                  const itemsToCheckout = hasSelectedItems ? getSelectedItems() : cartItems;
                  const quoteIds = itemsToCheckout.map((item) => item.quoteId).join(',');
                  window.location.href = `/checkout?quotes=${quoteIds}`;
                }}
              >
                <ShoppingCart className="h-4 w-4 mr-2" />
                Proceed to Checkout
              </Button>
            </CardContent>
          </Card>
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
