import { useState, useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ShoppingCart, Package, ArrowRight, Save, Trash2 } from 'lucide-react';
import { useUserCurrency } from '@/hooks/useUserCurrency';
import { useQuoteDisplayCurrency } from '@/hooks/useQuoteDisplayCurrency';
import { Badge } from '@/components/ui/badge';

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useToast } from '@/hooks/use-toast';
import { Tables } from '@/integrations/supabase/types';
import { useCart } from '@/hooks/useCart';
import { CartItem } from '@/stores/cartStore';

type SortOption = 'date-desc' | 'date-asc' | 'price-desc' | 'price-asc' | 'name-asc' | 'name-desc';

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

  // Use the quote display currency hook
  const { formatAmount } = useQuoteDisplayCurrency({
    quote: mockQuote as Tables<'quotes'>,
  });

  return <>{formatAmount(item.finalTotal * quantity)}</>;
};

// Component to display cart total with proper currency conversion
const CartTotal = ({ items }: { items: CartItem[] }) => {
  // Use the first item to determine the quote format (all items should have same destination)
  const firstItem = items[0];

  // Create mock quote with default values to ensure hook is always called consistently
  const mockQuote: MockQuote = {
    id: firstItem?.quoteId || 'default',
    origin_country: firstItem?.purchaseCountryCode || firstItem?.countryCode || 'US',
    destination_country: firstItem?.destinationCountryCode || firstItem?.countryCode || 'US',
    shipping_address: {
      destination_country: firstItem?.destinationCountryCode || firstItem?.countryCode || 'US',
    },
  };

  // Use the quote display currency hook
  const { formatAmount } = useQuoteDisplayCurrency({
    quote: mockQuote as Tables<'quotes'>,
  });

  if (!firstItem) return <>$0.00</>;

  // Calculate total from all items
  const totalAmount = items.reduce((sum, item) => sum + item.finalTotal * item.quantity, 0);

  return <>{formatAmount(totalAmount)}</>;
};

// Remove unused interface and type as they are not used in the component

export const CartDrawer = () => {
  const { user } = useAuth();
  const { formatAmount: _formatUserAmount } = useUserCurrency();
  const { toast } = useToast();
  const _queryClient = useQueryClient();

  // Use the new cart store with FIXED calculations
  const {
    items: cartItems,
    savedItems,
    selectedItems,
    isLoading: cartLoading,
    error: cartError,
    hasLoadedFromServer,
    cartTotal: _cartTotal,
    cartWeight: _cartWeight,
    selectedItemsTotal: _selectedItemsTotal,
    selectedItemsWeight: _selectedItemsWeight,
    itemCount: _itemCount,
    savedItemCount: _savedItemCount,
    selectedItemCount: _selectedItemCount,
    selectedCartItemCount, // NEW: Selected cart items count
    formattedCartTotal: _formattedCartTotal,
    formattedSelectedTotal: _formattedSelectedTotal,
    formattedSelectedCartTotal: _formattedSelectedCartTotal, // NEW: Formatted selected cart total
    hasSelectedItems,
    hasCartItems,
    hasSavedItems,
    isAllSelected: _isAllSelected,
    isAllCartSelected: _isAllCartSelected,
    handleSelectAllCart,
    isAllSavedSelected: _isAllSavedSelected,
    handleSelectAllSaved: _handleSelectAllSaved,
    removeItem,
    updateQuantity,
    moveToSaved,
    moveToCart,
    toggleSelection,
    handleBulkDelete,
    handleBulkMoveToSaved,
    handleBulkMoveToCart,
    clearSelection: _clearSelection,
    loadFromServer,
  } = useCart();

  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('cart');
  const [showBulkSaveConfirm, setShowBulkSaveConfirm] = useState(false);
  const [showBulkMoveConfirm, setShowBulkMoveConfirm] = useState(false);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [sortBy, _setSortBy] = useState<SortOption>('date-desc');

  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [hasAutoSelected, setHasAutoSelected] = useState(false);

  // Reset auto-select state when drawer opens
  useEffect(() => {
    if (isOpen) setHasAutoSelected(false);
  }, [isOpen]);

  // FIXED: Improved auto-selection logic
  useEffect(() => {
    if (
      isOpen &&
      cartItems &&
      cartItems.length > 0 &&
      selectedCartItemCount === 0 && // Use selectedCartItemCount instead of selectedItemCount
      !hasAutoSelected
    ) {
      setHasAutoSelected(true);
      handleSelectAllCart();
    }
  }, [isOpen, cartItems, selectedCartItemCount, hasAutoSelected, handleSelectAllCart]);

  // Load cart data from server when drawer opens
  useEffect(() => {
    if (isOpen && user && !cartLoading && !hasLoadedFromServer) {
      loadFromServer(user.id);
    }
  }, [isOpen, user, loadFromServer, cartLoading, hasLoadedFromServer]);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const _clearSearch = useCallback(() => {
    setSearchQuery('');
    setDebouncedSearchQuery('');
  }, []);

  // Filter and sort items
  const filteredCartItems = cartItems.filter((item) =>
    item.productName.toLowerCase().includes(debouncedSearchQuery.toLowerCase()),
  );

  const filteredSavedItems = savedItems.filter((item) =>
    item.productName.toLowerCase().includes(debouncedSearchQuery.toLowerCase()),
  );

  const _sortedCartItems = [...filteredCartItems].sort((a, b) => {
    switch (sortBy) {
      case 'date-desc':
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      case 'date-asc':
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      case 'price-desc':
        return b.finalTotal - a.finalTotal;
      case 'price-asc':
        return a.finalTotal - b.finalTotal;
      case 'name-asc':
        return a.productName.localeCompare(b.productName);
      case 'name-desc':
        return b.productName.localeCompare(a.productName);
      default:
        return 0;
    }
  });

  const _sortedSavedItems = [...filteredSavedItems].sort((a, b) => {
    switch (sortBy) {
      case 'date-desc':
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      case 'date-asc':
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      case 'price-desc':
        return b.finalTotal - a.finalTotal;
      case 'price-asc':
        return a.finalTotal - b.finalTotal;
      case 'name-asc':
        return a.productName.localeCompare(b.productName);
      case 'name-desc':
        return b.productName.localeCompare(a.productName);
      default:
        return 0;
    }
  });

  // Handlers
  const handleRemoveFromCart = async (itemId: string) => {
    try {
      await removeItem(itemId);
      toast({
        title: 'Item removed',
        description: 'Item has been removed from your cart.',
      });
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to remove item from cart.',
        variant: 'destructive',
      });
    }
  };

  const handleSaveForLater = async (itemId: string) => {
    try {
      moveToSaved(itemId);
      toast({
        title: 'Item saved',
        description: 'Item has been saved for later.',
      });
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to save item for later.',
        variant: 'destructive',
      });
    }
  };

  const handleMoveToCart = async (itemId: string) => {
    try {
      moveToCart(itemId);
      toast({
        title: 'Item moved',
        description: 'Item has been moved to your cart.',
      });
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to move item to cart.',
        variant: 'destructive',
      });
    }
  };

  const handleQuantityChange = async (itemId: string, newQuantity: number) => {
    try {
      updateQuantity(itemId, newQuantity);
      toast({
        title: 'Quantity updated',
        description: 'Item quantity has been updated.',
      });
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to update quantity.',
        variant: 'destructive',
      });
    }
  };

  const handleSelectItem = (itemId: string) => {
    toggleSelection(itemId);
  };

  const confirmBulkSaveForLater = () => {
    handleBulkMoveToSaved();
    setShowBulkSaveConfirm(false);
    toast({
      title: 'Items saved',
      description: 'Selected items have been saved for later.',
    });
  };

  const confirmBulkMoveToCart = () => {
    handleBulkMoveToCart();
    setShowBulkMoveConfirm(false);
    toast({
      title: 'Items moved',
      description: 'Selected items have been moved to your cart.',
    });
  };

  const confirmBulkDelete = async () => {
    try {
      await handleBulkDelete();
      setShowBulkDeleteConfirm(false);
      toast({
        title: 'Items deleted',
        description: 'Selected items have been deleted.',
      });
    } catch (_error) {
      console.error('Error bulk deleting items:', _error);
      toast({
        title: 'Error',
        description: 'Failed to delete items. Please try again.',
        variant: 'destructive',
      });
    }
  };

  // Helper functions to get selected items
  const getSelectedCartItems = () => {
    return cartItems.filter((item) => selectedItems.includes(item.id));
  };

  const getSelectedSavedItems = () => {
    return savedItems.filter((item) => selectedItems.includes(item.id));
  };

  // Helper to get all selected items (both cart and saved)
  const getAllSelectedItems = () => {
    return [...cartItems, ...savedItems].filter((item) => selectedItems.includes(item.id));
  };

  const handleCheckout = async () => {
    if (!hasSelectedItems && hasCartItems) {
      // Auto-select all cart items if none are selected
      cartItems.forEach((item) => {
        if (!selectedItems.includes(item.id)) {
          toggleSelection(item.id);
        }
      });
      return;
    }

    if (!hasSelectedItems) {
      toast({
        title: 'No items selected',
        description: 'Please select items to checkout.',
        variant: 'destructive',
      });
      return;
    }

    setIsCheckingOut(true);
    try {
      const selectedCartItems = cartItems.filter((item) => selectedItems.includes(item.id));
      if (selectedCartItems.length === 0) {
        toast({
          title: 'No cart items selected',
          description: 'Please select items from your cart to checkout.',
          variant: 'destructive',
        });
        return;
      }

      const quoteIds = selectedCartItems.map((item) => item.quoteId);
      const params = new URLSearchParams();
      params.set('quotes', quoteIds.join(','));

      window.location.href = `/checkout?${params.toString()}`;
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to proceed to checkout.',
        variant: 'destructive',
      });
    } finally {
      setIsCheckingOut(false);
    }
  };

  const renderCartContent = () => {
    if (cartError) {
      return (
        <div className="flex flex-col items-center justify-center h-32 space-y-4">
          <div className="text-center">
            <h3 className="text-lg font-medium text-red-600">Error loading cart</h3>
            <p className="text-sm text-gray-500">{cartError}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => user && loadFromServer(user.id)}
              className="mt-2"
            >
              Retry
            </Button>
          </div>
        </div>
      );
    }

    if (cartLoading) {
      return (
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
        </div>
      );
    }

    if (!cartItems || cartItems.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-32 space-y-4">
          <Package className="h-16 w-16 text-gray-400" />
          <div className="text-center">
            <h3 className="text-lg font-medium text-gray-900">Your cart is empty</h3>
            <p className="text-sm text-gray-500">
              {hasLoadedFromServer ? 'Add some items to get started' : 'Loading cart...'}
            </p>
            {!hasLoadedFromServer && (
              <div className="mt-2 text-xs text-gray-500">
                Debug: hasLoadedFromServer = {hasLoadedFromServer.toString()}
              </div>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {/* Cart Items */}
        <div className="space-y-3">
          {cartItems.map((item) => (
            <div key={item.id} className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg hover:shadow-sm transition-shadow">
              <Checkbox
                checked={selectedItems.includes(item.id)}
                onCheckedChange={() => handleSelectItem(item.id)}
                className="mt-1"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium truncate text-gray-900">{item.productName}</h4>
                    <p className="text-sm text-gray-500">
                      {item.countryCode} • {(item.itemWeight * item.quantity).toFixed(2)}kg
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          handleQuantityChange(item.id, Math.max(1, item.quantity - 1))
                        }
                      >
                        -
                      </Button>
                      <span className="w-8 text-center text-sm text-gray-900">{item.quantity}</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                      >
                        +
                      </Button>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleSaveForLater(item.id)}
                      className="h-8 w-8"
                    >
                      <Save className="h-4 w-4" />
                    </Button>
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
                <div className="text-right">
                  <div className="font-bold">
                    <CartItemPrice item={item} quantity={item.quantity} />
                  </div>
                  <div className="text-sm text-gray-500">
                    {(item.itemWeight * item.quantity).toFixed(2)}kg •{' '}
                    {item.destinationCountryCode || item.countryCode}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderSavedContent = () => {
    if (!savedItems || savedItems.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-32 space-y-4">
          <Save className="h-16 w-16 text-gray-400" />
          <div className="text-center">
            <h3 className="text-lg font-medium text-gray-900">No saved items</h3>
            <p className="text-sm text-gray-500">
              Items you save for later will appear here
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {/* Saved Items */}
        <div className="space-y-3">
          {savedItems.map((item) => (
            <div key={item.id} className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg hover:shadow-sm transition-shadow">
              <Checkbox
                checked={selectedItems.includes(item.id)}
                onCheckedChange={() => handleSelectItem(item.id)}
                className="mt-1"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium truncate text-gray-900">{item.productName}</h4>
                    <p className="text-sm text-gray-500">
                      {item.countryCode} • {(item.itemWeight * item.quantity).toFixed(2)}kg
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          handleQuantityChange(item.id, Math.max(1, item.quantity - 1))
                        }
                      >
                        -
                      </Button>
                      <span className="w-8 text-center text-sm text-gray-900">{item.quantity}</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                      >
                        +
                      </Button>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleMoveToCart(item.id)}
                      className="h-8 w-8"
                    >
                      <ShoppingCart className="h-4 w-4" />
                    </Button>
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
                <div className="text-right">
                  <div className="font-bold">
                    <CartItemPrice item={item} quantity={item.quantity} />
                  </div>
                  <div className="text-sm text-gray-500">
                    {(item.itemWeight * item.quantity).toFixed(2)}kg •{' '}
                    {item.destinationCountryCode || item.countryCode}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <>
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="relative">
            <ShoppingCart className="h-5 w-5" />
            {cartItems && cartItems.length > 0 && (
              <div className="absolute -top-1 -right-1">
                <Badge
                  variant="destructive"
                  className="h-5 w-5 justify-center p-0 rounded-full text-xs"
                >
                  {cartItems.length}
                </Badge>
              </div>
            )}
            <span className="sr-only">Cart</span>
          </Button>
        </SheetTrigger>
        <SheetContent className="w-full sm:max-w-lg flex flex-col h-full bg-white">
          <SheetHeader className="space-y-2.5 flex-shrink-0">
            <SheetTitle className="text-gray-900">Shopping Cart</SheetTitle>
          </SheetHeader>
          <div className="flex-1 flex flex-col min-h-0">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-shrink-0">
              <TabsList className="grid w-full grid-cols-2 flex-shrink-0">
                <TabsTrigger value="cart" className="text-gray-600 data-[state=active]:text-gray-900">Cart ({cartItems?.length || 0})</TabsTrigger>
                <TabsTrigger value="saved" className="text-gray-600 data-[state=active]:text-gray-900">Saved ({savedItems?.length || 0})</TabsTrigger>
              </TabsList>
            </Tabs>
            {activeTab === 'cart' && (
              <div className="flex-1 flex flex-col min-h-0 mt-4">
                <div className="flex-1 min-h-0 overflow-y-auto">{renderCartContent()}</div>
              </div>
            )}
            {activeTab === 'saved' && (
              <div className="flex-1 flex flex-col min-h-0 mt-4">
                <div className="flex-1 min-h-0 overflow-y-auto">{renderSavedContent()}</div>
              </div>
            )}
            {/* Sticky Action Buttons */}
            <div className="flex-shrink-0 border-t border-gray-200 pt-4 space-y-3 mt-4">
              {hasCartItems && (
                <>
                  {/* Total Display */}
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <span className="font-medium text-gray-900">
                      Total ({getAllSelectedItems().length} items):
                    </span>
                    <span className="font-bold text-lg text-gray-900">
                      <CartTotal items={getAllSelectedItems()} />
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={handleCheckout}
                      disabled={isCheckingOut || !hasSelectedItems}
                      className="flex-1"
                    >
                      {isCheckingOut ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Processing...
                        </>
                      ) : (
                        <>
                          Checkout
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsOpen(false);
                        window.location.href = '/cart';
                      }}
                      className="flex-1"
                    >
                      View Cart
                    </Button>
                  </div>
                </>
              )}
              {!hasCartItems && hasSavedItems && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsOpen(false);
                    window.location.href = '/cart';
                  }}
                  className="w-full"
                >
                  View Cart
                </Button>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Confirmation Dialogs */}
      <ConfirmDialog
        isOpen={showBulkSaveConfirm}
        onClose={() => setShowBulkSaveConfirm(false)}
        onConfirm={confirmBulkSaveForLater}
        title="Save Items for Later"
        description={`Are you sure you want to save ${getSelectedCartItems().length} item(s) for later?`}
        confirmText="Save for Later"
        cancelText="Keep in Cart"
      />

      <ConfirmDialog
        isOpen={showBulkMoveConfirm}
        onClose={() => setShowBulkMoveConfirm(false)}
        onConfirm={confirmBulkMoveToCart}
        title="Move Items to Cart"
        description={`Are you sure you want to move ${getSelectedSavedItems().length} item(s) to your cart?`}
        confirmText="Move to Cart"
        cancelText="Keep Saved"
      />

      <ConfirmDialog
        isOpen={showBulkDeleteConfirm}
        onClose={() => setShowBulkDeleteConfirm(false)}
        onConfirm={confirmBulkDelete}
        title="Delete Items"
        description={`Are you sure you want to delete ${selectedItems.length} selected item(s)? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
      />
    </>
  );
};
