import { useState, useEffect, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ShoppingCart, Package, ArrowRight, Save, Search, SortAsc, SortDesc, Trash2, X } from "lucide-react";
import { useUserCurrency } from "@/hooks/useUserCurrency";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { CartItem } from "./CartItem";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { QuoteItem } from "@/types/quote";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Database } from "@/lib/database.types";
import { Tables } from '@/integrations/supabase/types';
import { useCart } from '@/hooks/useCart';

type SortOption = "date-desc" | "date-asc" | "price-desc" | "price-asc" | "name-asc" | "name-desc";
type ViewMode = "list";

interface CartItemProps {
  item: CartQuoteItem;
  quoteId: string;
  onRemove: (quoteId: string) => void;
  onSaveForLater?: () => void;
  onMoveToCart?: () => void;
  onQuantityChange?: (quantity: number) => void;
  onSaveNotes?: (notes: string) => void;
  selected?: boolean;
  onSelect?: () => void;
  viewMode?: 'list' | 'grid';
}

type CartQuoteItem = Tables<'quote_items'>;

export const CartDrawer = () => {
  const { user } = useAuth();
  const { formatAmount } = useUserCurrency();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Use the new cart store with FIXED calculations
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
    isAllSelected,
    isAllCartSelected,
    handleSelectAllCart,
    isAllSavedSelected,
    handleSelectAllSaved,
    removeItem,
    updateQuantity,
    moveToSaved,
    moveToCart,
    toggleSelection,
    handleBulkDelete,
    handleBulkMoveToSaved,
    handleBulkMoveToCart,
    clearSelection,
    loadFromServer
  } = useCart();

  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("cart");
  const [showBulkSaveConfirm, setShowBulkSaveConfirm] = useState(false);
  const [showBulkMoveConfirm, setShowBulkMoveConfirm] = useState(false);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("date-desc");
  const [viewMode] = useState<ViewMode>("list");
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
    if (isOpen && user) {
      loadFromServer(user.id);
    }
  }, [isOpen, user, loadFromServer]);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const clearSearch = useCallback(() => {
    setSearchQuery("");
    setDebouncedSearchQuery("");
  }, []);

  // Filter and sort items
  const filteredCartItems = cartItems.filter(item =>
    item.productName.toLowerCase().includes(debouncedSearchQuery.toLowerCase())
  );

  const filteredSavedItems = savedItems.filter(item =>
    item.productName.toLowerCase().includes(debouncedSearchQuery.toLowerCase())
  );

  const sortedCartItems = [...filteredCartItems].sort((a, b) => {
    switch (sortBy) {
      case "date-desc":
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      case "date-asc":
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      case "price-desc":
        return b.finalTotal - a.finalTotal;
      case "price-asc":
        return a.finalTotal - b.finalTotal;
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
        return b.finalTotal - a.finalTotal;
      case "price-asc":
        return a.finalTotal - b.finalTotal;
      case "name-asc":
        return a.productName.localeCompare(b.productName);
      case "name-desc":
        return b.productName.localeCompare(a.productName);
      default:
        return 0;
    }
  });

  // Handlers
  const handleRemoveFromCart = async (itemId: string) => {
    try {
      removeItem(itemId);
      toast({
        title: "Item removed",
        description: "Item has been removed from your cart.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to remove item from cart.",
        variant: "destructive",
      });
    }
  };

  const handleSaveForLater = async (itemId: string) => {
    try {
      moveToSaved(itemId);
      toast({
        title: "Item saved",
        description: "Item has been saved for later.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save item for later.",
        variant: "destructive",
      });
    }
  };

  const handleMoveToCart = async (itemId: string) => {
    try {
      moveToCart(itemId);
      toast({
        title: "Item moved",
        description: "Item has been moved to your cart.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to move item to cart.",
        variant: "destructive",
      });
    }
  };

  const handleQuantityChange = async (itemId: string, newQuantity: number) => {
    try {
      updateQuantity(itemId, newQuantity);
      toast({
        title: "Quantity updated",
        description: "Item quantity has been updated.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update quantity.",
        variant: "destructive",
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

  // Helper functions to get selected items
  const getSelectedCartItems = () => {
    return cartItems.filter(item => selectedItems.includes(item.id));
  };

  const getSelectedSavedItems = () => {
    return savedItems.filter(item => selectedItems.includes(item.id));
  };

  const handleCheckout = async () => {
    if (!hasSelectedItems && hasCartItems) {
      // Auto-select all cart items if none are selected
      cartItems.forEach(item => {
        if (!selectedItems.includes(item.id)) {
          toggleSelection(item.id);
        }
      });
      return;
    }

    if (!hasSelectedItems) {
      toast({
        title: "No items selected",
        description: "Please select items to checkout.",
        variant: "destructive",
      });
      return;
    }

    setIsCheckingOut(true);
    try {
      const selectedCartItems = cartItems.filter(item => selectedItems.includes(item.id));
      if (selectedCartItems.length === 0) {
        toast({
          title: "No cart items selected",
          description: "Please select items from your cart to checkout.",
          variant: "destructive",
        });
        return;
      }

      const quoteIds = selectedCartItems.map(item => item.quoteId);
      const params = new URLSearchParams();
      params.set('quotes', quoteIds.join(','));
      
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
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      );
    }

    if (!cartItems || cartItems.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-32 space-y-4">
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
      <div className="space-y-4 p-4">
        {/* Select All Checkbox */}
        {cartItems.length > 0 && (
          <div className="flex items-center space-x-2 p-2 border rounded-lg">
            <Checkbox
              checked={isAllCartSelected}
              onCheckedChange={handleSelectAllCart}
              data-testid="select-all-cart"
            />
            <label className="text-sm font-medium">Select All Cart Items</label>
          </div>
        )}

        {/* Cart Items */}
        <ScrollArea className="flex-1">
          <div className="space-y-3">
            {cartItems.map((item, index) => (
              <div key={item.id} className="flex items-start gap-3 p-3 border rounded-lg" data-testid="cart-item">
                <Checkbox
                  checked={selectedItems.includes(item.id)}
                  onCheckedChange={() => handleSelectItem(item.id)}
                  className="mt-1"
                  data-testid={`cart-item-checkbox-${index}`}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium truncate">{item.productName}</h4>
                      <p className="text-sm text-muted-foreground">
                        {item.countryCode} • {(item.itemWeight * item.quantity).toFixed(2)}kg
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleQuantityChange(item.id, Math.max(1, item.quantity - 1))}
                          data-testid={`quantity-decrease-${index}`}
                        >
                          -
                        </Button>
                        <span className="w-8 text-center text-sm" data-testid={`quantity-input-${index}`}>
                          {item.quantity}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                          data-testid={`quantity-increase-${index}`}
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
                        data-testid={`move-to-saved-${index}`}
                      >
                        <Save className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveFromCart(item.id)}
                        className="h-8 w-8"
                        data-testid={`remove-item-${index}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold" data-testid={`item-total-${index}`}>
                      {formatAmount(item.finalTotal * item.quantity)}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {(item.itemWeight * item.quantity).toFixed(2)}kg • {item.countryCode}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>
    );
  };

  const renderSavedContent = () => {
    if (!savedItems || savedItems.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-32 space-y-4">
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
      <div className="space-y-4 p-4">
        {/* Select All Checkbox */}
        {savedItems.length > 0 && (
          <div className="flex items-center space-x-2 p-2 border rounded-lg">
            <Checkbox
              checked={isAllSavedSelected}
              onCheckedChange={handleSelectAllSaved}
              data-testid="select-all-saved"
            />
            <label className="text-sm font-medium">Select All Saved Items</label>
          </div>
        )}

        {/* Saved Items */}
        <ScrollArea className="flex-1">
          <div className="space-y-3">
            {savedItems.map((item, index) => (
              <div key={item.id} className="flex items-start gap-3 p-3 border rounded-lg" data-testid="saved-item">
                <Checkbox
                  checked={selectedItems.includes(item.id)}
                  onCheckedChange={() => handleSelectItem(item.id)}
                  className="mt-1"
                  data-testid={`saved-item-checkbox-${index}`}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium truncate">{item.productName}</h4>
                      <p className="text-sm text-muted-foreground">
                        {item.countryCode} • {(item.itemWeight * item.quantity).toFixed(2)}kg
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleQuantityChange(item.id, Math.max(1, item.quantity - 1))}
                          data-testid={`saved-quantity-decrease-${index}`}
                        >
                          -
                        </Button>
                        <span className="w-8 text-center text-sm" data-testid={`saved-quantity-input-${index}`}>
                          {item.quantity}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                          data-testid={`saved-quantity-increase-${index}`}
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
                        data-testid={`move-to-cart-${index}`}
                      >
                        <ShoppingCart className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveFromCart(item.id)}
                        className="h-8 w-8"
                        data-testid={`remove-saved-item-${index}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold" data-testid={`saved-item-total-${index}`}>
                      {formatAmount(item.finalTotal * item.quantity)}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {(item.itemWeight * item.quantity).toFixed(2)}kg • {item.countryCode}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>
    );
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          data-testid="cart-button"
        >
          <ShoppingCart className="h-5 w-5" />
          {itemCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 text-xs"
              data-testid="cart-badge"
            >
              {itemCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent
        side="right"
        className="w-full sm:w-96 p-0"
        data-testid="cart-drawer"
      >
        <SheetHeader className="p-4 border-b">
          <SheetTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Cart ({itemCount})
          </SheetTitle>
        </SheetHeader>

        <div className="flex flex-col h-full">
          {/* Search and Sort Controls */}
          <div className="p-4 border-b space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                data-testid="cart-search"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6"
                  onClick={clearSearch}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Select value={sortBy} onValueChange={(value: SortOption) => setSortBy(value)}>
                <SelectTrigger className="flex-1" data-testid="cart-sort">
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
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
            <TabsList className="grid w-full grid-cols-2 mx-4 mt-4">
              <TabsTrigger value="cart" data-testid="cart-tab">
                Cart ({cartItems.length})
              </TabsTrigger>
              <TabsTrigger value="saved" data-testid="saved-tab">
                Saved ({savedItems.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="cart" className="flex-1 flex flex-col mt-0">
              {renderCartContent()}
            </TabsContent>

            <TabsContent value="saved" className="flex-1 flex flex-col mt-0">
              {renderSavedContent()}
            </TabsContent>
          </Tabs>

          {/* Summary and Actions */}
          {activeTab === "cart" && hasCartItems && (
            <div className="border-t p-4 space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span>Selected ({selectedCartItemCount}):</span>
                <span className="font-medium" data-testid="cart-total">
                  {formattedSelectedCartTotal}
                </span>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleCheckout}
                  disabled={!hasSelectedItems || isCheckingOut}
                  className="flex-1"
                  data-testid="checkout-button"
                >
                  {isCheckingOut ? (
                    "Processing..."
                  ) : (
                    <>
                      Checkout
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>

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
      </SheetContent>
    </Sheet>
  );
}; 