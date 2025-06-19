import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { 
  Trash2, 
  ShoppingCart, 
  Save, 
  Search, 
  SortAsc, 
  SortDesc, 
  Package, 
  ArrowRight, 
  X,
  Grid3X3,
  List
} from "lucide-react";
import { useUserCurrency } from "@/hooks/useUserCurrency";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useCart } from '@/hooks/useCart';
import { useDebounce } from '@/hooks/useDebounce';

type SortOption = "date-desc" | "date-asc" | "price-desc" | "price-asc" | "name-asc" | "name-desc";
type ViewMode = "list" | "grid";

export const Cart = () => {
  const { user } = useAuth();
  const { formatAmount } = useUserCurrency();
  const { toast } = useToast();
  
  // Use the cart store and hook with FIXED calculations
  const {
    items: cartItems,
    savedItems,
    selectedItems,
    isLoading: cartLoading,
    error: cartError,
    cartTotal,
    cartWeight,
    selectedItemsTotal,
    selectedItemsWeight,
    itemCount,
    savedItemCount,
    selectedItemCount,
    selectedCartItemCount, // NEW: Selected cart items count
    formattedCartTotal,
    formattedSelectedTotal,
    formattedSelectedCartTotal, // NEW: Formatted selected cart total
    hasSelectedItems,
    hasCartItems,
    hasSavedItems,
    isAllCartSelected,
    isAllSavedSelected,
    removeItem,
    updateQuantity,
    moveToSaved,
    moveToCart,
    toggleSelection,
    handleSelectAllCart,
    handleBulkDelete,
    handleBulkMoveToSaved,
    handleBulkMoveToCart,
    clearSelection,
    loadFromServer,
    handleSelectAllSaved,
    getSelectedCartItems,
    getSelectedSavedItems
  } = useCart();

  const [activeTab, setActiveTab] = useState("cart");
  const [showBulkSaveConfirm, setShowBulkSaveConfirm] = useState(false);
  const [showBulkMoveConfirm, setShowBulkMoveConfirm] = useState(false);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("date-desc");
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  // Debounced search
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  // Load cart data from server when component mounts
  useEffect(() => {
    if (user) {
      console.log('Cart component: Loading cart for user:', user.id);
      // Always load from server first, this will override localStorage
      loadFromServer(user.id);
    } else {
      console.log('Cart component: No user found, skipping cart load');
    }
  }, [user, loadFromServer]);

  // FIXED: Improved auto-selection logic
  useEffect(() => {
    if (cartItems && cartItems.length > 0 && selectedCartItemCount === 0 && !cartLoading) {
      console.log('Cart component: Auto-selecting all cart items');
      // Use handleSelectAllCart instead of individual toggleSelection calls
      handleSelectAllCart();
    }
  }, [cartItems, selectedCartItemCount, cartLoading, handleSelectAllCart]);

  // Debug effect to log cart state changes
  useEffect(() => {
    console.log('Cart state updated:', {
      cartItems: cartItems?.length || 0,
      savedItems: savedItems?.length || 0,
      selectedItems: selectedItems?.length || 0,
      selectedCartItems: selectedCartItemCount,
      isLoading: cartLoading,
      error: cartError,
      cartTotal,
      selectedItemsTotal
    });
  }, [cartItems, savedItems, selectedItems, selectedCartItemCount, cartLoading, cartError, cartTotal, selectedItemsTotal]);

  // Filter and sort items
  const filteredCartItems = cartItems?.filter(item =>
    item.productName.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
    item.countryCode.toLowerCase().includes(debouncedSearchQuery.toLowerCase())
  ) || [];

  const filteredSavedItems = savedItems?.filter(item =>
    item.productName.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
    item.countryCode.toLowerCase().includes(debouncedSearchQuery.toLowerCase())
  ) || [];

  const sortedCartItems = [...filteredCartItems].sort((a, b) => {
    switch (sortBy) {
      case "date-desc":
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      case "date-asc":
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      case "price-desc":
        return (b.finalTotal * b.quantity) - (a.finalTotal * a.quantity);
      case "price-asc":
        return (a.finalTotal * a.quantity) - (b.finalTotal * b.quantity);
      case "name-asc":
        return a.productName.localeCompare(b.productName);
      case "name-desc":
        return b.productName.localeCompare(a.productName);
      default:
        return 0;
    }
  });

  const sortedSavedItems = [...filteredSavedItems].sort((a, b) => {
    switch (sortBy) {
      case "date-desc":
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      case "date-asc":
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      case "price-desc":
        return (b.finalTotal * b.quantity) - (a.finalTotal * a.quantity);
      case "price-asc":
        return (a.finalTotal * a.quantity) - (b.finalTotal * b.quantity);
      case "name-asc":
        return a.productName.localeCompare(b.productName);
      case "name-desc":
        return b.productName.localeCompare(a.productName);
      default:
        return 0;
    }
  });

  // Handlers
  const handleSelectItem = useCallback((id: string) => {
    toggleSelection(id);
  }, [toggleSelection]);

  const handleQuantityChange = useCallback((id: string, newQuantity: number) => {
    if (newQuantity < 1) return;
    updateQuantity(id, newQuantity);
  }, [updateQuantity]);

  const handleSaveForLater = useCallback((id: string) => {
    moveToSaved(id);
    toast({
      title: "Item saved",
      description: "Item has been moved to saved items.",
    });
  }, [moveToSaved, toast]);

  const handleMoveToCart = useCallback((id: string) => {
    moveToCart(id);
    toast({
      title: "Item moved",
      description: "Item has been moved to your cart.",
    });
  }, [moveToCart, toast]);

  const handleRemoveFromCart = useCallback((id: string) => {
    removeItem(id);
    toast({
      title: "Item removed",
      description: "Item has been removed from your cart.",
    });
  }, [removeItem, toast]);

  const confirmBulkSaveForLater = () => {
    handleBulkMoveToSaved();
    setShowBulkSaveConfirm(false);
    toast({
      title: "Items saved",
      description: "Selected items have been saved for later.",
    });
  };

  const confirmBulkMoveToCart = () => {
    handleBulkMoveToCart();
    setShowBulkMoveConfirm(false);
    toast({
      title: "Items moved",
      description: "Selected items have been moved to your cart.",
    });
  };

  const confirmBulkDelete = () => {
    handleBulkDelete();
    setShowBulkDeleteConfirm(false);
    toast({
      title: "Items deleted",
      description: "Selected items have been deleted.",
    });
  };

  const handleCheckout = async () => {
    // FIXED: Check for selected cart items specifically
    const selectedCartItems = getSelectedCartItems();
    if (selectedCartItems.length === 0) {
      toast({
        title: "No cart items selected",
        description: "Please select items from your cart to checkout.",
        variant: "destructive",
      });
      return;
    }

    setIsCheckingOut(true);
    try {
      // Create URL with selected quote IDs
      const quoteIds = selectedCartItems.map(item => item.quoteId);
      const params = new URLSearchParams();
      params.set('quotes', quoteIds.join(','));
      
      // Navigate to checkout page with quote IDs
      window.location.href = `/checkout?${params.toString()}`;
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to proceed to checkout.",
        variant: "destructive",
      });
    } finally {
      setIsCheckingOut(false);
    }
  };

  const renderCartContent = () => {
    if (cartLoading) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      );
    }

    if (!cartItems || cartItems.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-64 space-y-4">
          <Package className="h-16 w-16 text-muted-foreground" />
          <div className="text-center">
            <h3 className="text-lg font-medium">Your cart is empty</h3>
            <p className="text-sm text-muted-foreground">
              Add some items to get started
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
              id="select-all"
              checked={isAllCartSelected}
              onCheckedChange={handleSelectAllCart}
              data-testid="select-all-cart-page"
            />
            <label htmlFor="select-all" className="text-sm font-medium">
              Select All ({itemCount})
            </label>
          </div>
          {getSelectedCartItems().length > 0 && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowBulkSaveConfirm(true)}
                data-testid="bulk-save-button"
              >
                <Save className="h-4 w-4 mr-1" />
                Save ({getSelectedCartItems().length})
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowBulkDeleteConfirm(true)}
                data-testid="bulk-delete-button"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Delete ({getSelectedCartItems().length})
              </Button>
            </div>
          )}
        </div>

        {/* Checkout Summary */}
        {selectedCartItemCount > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Checkout Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Selected Items:</span>
                  <span>{selectedCartItemCount}</span>
                </div>
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span data-testid="cart-page-total">{formattedSelectedCartTotal}</span>
                </div>
                <div className="flex justify-between">
                  <span>Weight:</span>
                  <span>{selectedItemsWeight.toFixed(2)}kg</span>
                </div>
              </div>
              <Separator />
              <div className="flex justify-between font-bold text-lg">
                <span>Total:</span>
                <span>{formattedSelectedCartTotal}</span>
              </div>
              <Button 
                onClick={handleCheckout} 
                disabled={isCheckingOut}
                className="w-full"
                data-testid="cart-page-checkout-button"
              >
                {isCheckingOut ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Processing...
                  </>
                ) : (
                  <>
                    Proceed to Checkout
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Items Grid/List */}
        {viewMode === "grid" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {cartItems.map((item, index) => (
              <Card key={item.id} className="relative" data-testid="cart-page-item">
                <CardContent className="p-4">
                  <div className="absolute top-2 right-2">
                    <Checkbox
                      checked={selectedItems.includes(item.id)}
                      onCheckedChange={() => handleSelectItem(item.id)}
                      data-testid={`cart-page-item-checkbox-${index}`}
                    />
                  </div>
                  <div className="aspect-square mb-3">
                    <img
                      src={item.imageUrl || '/placeholder.svg'}
                      alt={item.productName}
                      className="w-full h-full object-cover rounded-md"
                    />
                  </div>
                  <h3 className="font-medium truncate mb-2">{item.productName}</h3>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleQuantityChange(item.id, Math.max(1, item.quantity - 1))}
                        data-testid={`cart-page-quantity-decrease-${index}`}
                      >
                        -
                      </Button>
                      <span className="w-8 text-center" data-testid={`cart-page-quantity-input-${index}`}>
                        {item.quantity}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                        data-testid={`cart-page-quantity-increase-${index}`}
                      >
                        +
                      </Button>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleSaveForLater(item.id)}
                        className="h-8 w-8"
                        data-testid={`cart-page-move-to-saved-${index}`}
                      >
                        <Save className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveFromCart(item.id)}
                        className="h-8 w-8"
                        data-testid={`cart-page-remove-item-${index}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="text-right">
                      <div className="font-bold" data-testid={`cart-page-item-total-${index}`}>
                        {formatAmount(item.finalTotal * item.quantity)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {(item.itemWeight * item.quantity).toFixed(2)}kg • {item.countryCode}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {cartItems.map((item, index) => (
              <Card key={item.id} data-testid="cart-page-item">
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <Checkbox
                      checked={selectedItems.includes(item.id)}
                      onCheckedChange={() => handleSelectItem(item.id)}
                      className="mt-1"
                      data-testid={`cart-page-item-checkbox-${index}`}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium truncate">{item.productName}</h3>
                          <p className="text-sm text-muted-foreground">
                            {item.countryCode} • {(item.itemWeight * item.quantity).toFixed(2)}kg
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleQuantityChange(item.id, Math.max(1, item.quantity - 1))}
                              data-testid={`cart-page-quantity-decrease-${index}`}
                            >
                              -
                            </Button>
                            <span className="w-8 text-center" data-testid={`cart-page-quantity-input-${index}`}>
                              {item.quantity}
                            </span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                              data-testid={`cart-page-quantity-increase-${index}`}
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
                            data-testid={`cart-page-move-to-saved-${index}`}
                          >
                            <Save className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveFromCart(item.id)}
                            className="h-8 w-8"
                            data-testid={`cart-page-remove-item-${index}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="text-right mt-2">
                        <div className="font-bold" data-testid={`cart-page-item-total-${index}`}>
                          {formatAmount(item.finalTotal * item.quantity)}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {(item.itemWeight * item.quantity).toFixed(2)}kg • {item.countryCode}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderSavedContent = () => {
    if (!savedItems || savedItems.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-64 space-y-4">
          <Save className="h-16 w-16 text-muted-foreground" />
          <div className="text-center">
            <h3 className="text-lg font-medium">No saved items</h3>
            <p className="text-sm text-muted-foreground">
              Items you save for later will appear here
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
              id="select-all-saved"
              checked={isAllSavedSelected}
              onCheckedChange={handleSelectAllSaved}
              data-testid="select-all-saved-page"
            />
            <label htmlFor="select-all-saved" className="text-sm font-medium">
              Select All ({savedItemCount})
            </label>
          </div>
          {getSelectedSavedItems().length > 0 && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowBulkMoveConfirm(true)}
                data-testid="bulk-move-to-cart-button"
              >
                <ShoppingCart className="h-4 w-4 mr-1" />
                Move to Cart ({getSelectedSavedItems().length})
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowBulkDeleteConfirm(true)}
                data-testid="bulk-delete-saved-button"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Delete ({getSelectedSavedItems().length})
              </Button>
            </div>
          )}
        </div>

        {/* Items Grid/List */}
        {viewMode === "grid" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {savedItems.map((item, index) => (
              <Card key={item.id} className="relative" data-testid="saved-page-item">
                <CardContent className="p-4">
                  <div className="absolute top-2 right-2">
                    <Checkbox
                      checked={selectedItems.includes(item.id)}
                      onCheckedChange={() => handleSelectItem(item.id)}
                      data-testid={`saved-page-item-checkbox-${index}`}
                    />
                  </div>
                  <div className="aspect-square mb-3">
                    <img
                      src={item.imageUrl || '/placeholder.svg'}
                      alt={item.productName}
                      className="w-full h-full object-cover rounded-md"
                    />
                  </div>
                  <h3 className="font-medium truncate mb-2">{item.productName}</h3>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleQuantityChange(item.id, Math.max(1, item.quantity - 1))}
                        data-testid={`saved-page-quantity-decrease-${index}`}
                      >
                        -
                      </Button>
                      <span className="w-8 text-center" data-testid={`saved-page-quantity-input-${index}`}>
                        {item.quantity}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                        data-testid={`saved-page-quantity-increase-${index}`}
                      >
                        +
                      </Button>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleMoveToCart(item.id)}
                        className="h-8 w-8"
                        data-testid={`saved-page-move-to-cart-${index}`}
                      >
                        <ShoppingCart className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveFromCart(item.id)}
                        className="h-8 w-8"
                        data-testid={`saved-page-remove-item-${index}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="text-right">
                      <div className="font-bold" data-testid={`saved-page-item-total-${index}`}>
                        {formatAmount(item.finalTotal * item.quantity)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {(item.itemWeight * item.quantity).toFixed(2)}kg • {item.countryCode}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {savedItems.map((item, index) => (
              <Card key={item.id} data-testid="saved-page-item">
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <Checkbox
                      checked={selectedItems.includes(item.id)}
                      onCheckedChange={() => handleSelectItem(item.id)}
                      className="mt-1"
                      data-testid={`saved-page-item-checkbox-${index}`}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium truncate">{item.productName}</h3>
                          <p className="text-sm text-muted-foreground">
                            {item.countryCode} • {(item.itemWeight * item.quantity).toFixed(2)}kg
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleQuantityChange(item.id, Math.max(1, item.quantity - 1))}
                              data-testid={`saved-page-quantity-decrease-${index}`}
                            >
                              -
                            </Button>
                            <span className="w-8 text-center" data-testid={`saved-page-quantity-input-${index}`}>
                              {item.quantity}
                            </span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                              data-testid={`saved-page-quantity-increase-${index}`}
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
                            data-testid={`saved-page-move-to-cart-${index}`}
                          >
                            <ShoppingCart className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveFromCart(item.id)}
                            className="h-8 w-8"
                            data-testid={`saved-page-remove-item-${index}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="text-right mt-2">
                        <div className="font-bold" data-testid={`saved-page-item-total-${index}`}>
                          {formatAmount(item.finalTotal * item.quantity)}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {(item.itemWeight * item.quantity).toFixed(2)}kg • {item.countryCode}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="container mx-auto py-8 px-4 space-y-6" data-testid="cart-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Shopping Cart</h1>
          <p className="text-muted-foreground">
            {itemCount} items in cart • {savedItemCount} saved items
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setViewMode(viewMode === "list" ? "grid" : "list")}
            data-testid="view-mode-toggle"
          >
            {viewMode === "list" ? <Grid3X3 className="h-4 w-4" /> : <List className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Search and Sort Controls */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                data-testid="cart-page-search"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6"
                  onClick={() => setSearchQuery("")}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
            <Select value={sortBy} onValueChange={(value: SortOption) => setSortBy(value)}>
              <SelectTrigger className="w-full sm:w-48" data-testid="cart-page-sort">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date-desc">Newest First</SelectItem>
                <SelectItem value="date-asc">Oldest First</SelectItem>
                <SelectItem value="price-desc">Price: High to Low</SelectItem>
                <SelectItem value="price-asc">Price: Low to High</SelectItem>
                <SelectItem value="name-asc">Name: A to Z</SelectItem>
                <SelectItem value="name-desc">Name: Z to A</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="cart" data-testid="cart-page-tab">
            Cart ({cartItems?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="saved" data-testid="saved-page-tab">
            Saved ({savedItems?.length || 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="cart" className="space-y-6">
          {renderCartContent()}
        </TabsContent>

        <TabsContent value="saved" className="space-y-6">
          {renderSavedContent()}
        </TabsContent>
      </Tabs>

      {/* Confirmation Dialogs */}
      <ConfirmDialog
        open={showBulkSaveConfirm}
        onOpenChange={setShowBulkSaveConfirm}
        title="Save Selected Items"
        description={`Are you sure you want to save ${getSelectedCartItems().length} items for later?`}
        onConfirm={confirmBulkSaveForLater}
      />

      <ConfirmDialog
        open={showBulkMoveConfirm}
        onOpenChange={setShowBulkMoveConfirm}
        title="Move Selected Items"
        description={`Are you sure you want to move ${getSelectedSavedItems().length} items to cart?`}
        onConfirm={confirmBulkMoveToCart}
      />

      <ConfirmDialog
        open={showBulkDeleteConfirm}
        onOpenChange={setShowBulkDeleteConfirm}
        title="Delete Selected Items"
        description={`Are you sure you want to permanently delete ${selectedItemCount} items? This action cannot be undone.`}
        onConfirm={confirmBulkDelete}
        variant="destructive"
      />
    </div>
  );
};
