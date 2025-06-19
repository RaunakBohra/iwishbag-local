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
      <div className="space-y-4">
        {/* Search and Sort Controls */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={sortBy} onValueChange={(value: SortOption) => setSortBy(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date-desc">Newest</SelectItem>
              <SelectItem value="date-asc">Oldest</SelectItem>
              <SelectItem value="price-desc">Price High</SelectItem>
              <SelectItem value="price-asc">Price Low</SelectItem>
              <SelectItem value="name-asc">Name A-Z</SelectItem>
              <SelectItem value="name-desc">Name Z-A</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Cart Items */}
        <div className="space-y-3">
          {sortedCartItems.map((item) => (
            <div key={item.id} className="flex items-start gap-3 p-3 border rounded-lg">
              <Checkbox
                checked={selectedItems.includes(item.id)}
                onCheckedChange={() => handleSelectItem(item.id)}
                className="mt-1"
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
                      >
                        -
                      </Button>
                      <span className="w-8 text-center text-sm">{item.quantity}</span>
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
      <div className="space-y-4">
        {/* Search and Sort Controls */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search saved items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={sortBy} onValueChange={(value: SortOption) => setSortBy(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date-desc">Newest</SelectItem>
              <SelectItem value="date-asc">Oldest</SelectItem>
              <SelectItem value="price-desc">Price High</SelectItem>
              <SelectItem value="price-asc">Price Low</SelectItem>
              <SelectItem value="name-asc">Name A-Z</SelectItem>
              <SelectItem value="name-desc">Name Z-A</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Saved Items */}
        <div className="space-y-3">
          {sortedSavedItems.map((item) => (
            <div key={item.id} className="flex items-start gap-3 p-3 border rounded-lg">
              <Checkbox
                checked={selectedItems.includes(item.id)}
                onCheckedChange={() => handleSelectItem(item.id)}
                className="mt-1"
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
                      >
                        -
                      </Button>
                      <span className="w-8 text-center text-sm">{item.quantity}</span>
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
                <Badge variant="destructive" className="h-5 w-5 justify-center p-0 rounded-full text-xs">
                  {cartItems.length}
                </Badge>
              </div>
            )}
            <span className="sr-only">Cart</span>
          </Button>
        </SheetTrigger>
        <SheetContent className="w-full sm:max-w-lg flex flex-col h-full">
          <SheetHeader className="space-y-2.5 flex-shrink-0">
            <SheetTitle>Shopping Cart</SheetTitle>
          </SheetHeader>
          <div className="flex-1 flex flex-col min-h-0">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-shrink-0">
              <TabsList className="grid w-full grid-cols-2 flex-shrink-0">
                <TabsTrigger value="cart">
                  Cart ({cartItems?.length || 0})
                </TabsTrigger>
                <TabsTrigger value="saved">
                  Saved ({savedItems?.length || 0})
                </TabsTrigger>
              </TabsList>
            </Tabs>
            {activeTab === 'cart' && (
              <div className="flex-1 flex flex-col min-h-0 mt-4">
                <div className="flex-1 min-h-0 overflow-y-auto">
                  {renderCartContent()}
                </div>
              </div>
            )}
            {activeTab === 'saved' && (
              <div className="flex-1 flex flex-col min-h-0 mt-4">
                <div className="flex-1 min-h-0 overflow-y-auto">
                  {renderSavedContent()}
                </div>
              </div>
            )}
            {/* Sticky Action Buttons */}
            <div className="flex-shrink-0 border-t pt-4 space-y-3 mt-4">
              {hasCartItems && (
                <>
                  {/* Total Display */}
                  <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                    <span className="font-medium">Total ({selectedItems.length} items):</span>
                    <span className="font-bold text-lg">{formattedSelectedTotal}</span>
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