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
  
  // Use the cart store and hook
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
    formattedCartTotal,
    formattedSelectedTotal,
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

  // Auto-select all cart items only once when cart data is first loaded
  useEffect(() => {
    if (cartItems && cartItems.length > 0 && selectedItemCount === 0 && !cartLoading) {
      console.log('Cart component: Auto-selecting all cart items');
      // Use handleSelectAllCart instead of individual toggleSelection calls
      handleSelectAllCart();
    }
  }, [cartItems, selectedItemCount, cartLoading, handleSelectAllCart]);

  // Debug effect to log cart state changes
  useEffect(() => {
    console.log('Cart state updated:', {
      cartItems: cartItems?.length || 0,
      savedItems: savedItems?.length || 0,
      selectedItems: selectedItems?.length || 0,
      isLoading: cartLoading,
      error: cartError
    });
  }, [cartItems, savedItems, selectedItems, cartLoading, cartError]);

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
        return (b.itemPrice * b.quantity) - (a.itemPrice * a.quantity);
      case "price-asc":
        return (a.itemPrice * a.quantity) - (b.itemPrice * b.quantity);
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
        return (b.itemPrice * b.quantity) - (a.itemPrice * a.quantity);
      case "price-asc":
        return (a.itemPrice * a.quantity) - (b.itemPrice * b.quantity);
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
    // If no items are selected, auto-select all cart items
    if (!hasSelectedItems && hasCartItems) {
      console.log('Cart: Auto-selecting all cart items for checkout');
      cartItems.forEach(item => {
        if (!selectedItems.includes(item.id)) {
          toggleSelection(item.id);
        }
      });
      // Wait a moment for state to update, then proceed
      setTimeout(() => {
        handleCheckout();
      }, 100);
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
      // Get selected cart items (not saved items)
      const selectedCartItems = getSelectedCartItems();
      if (selectedCartItems.length === 0) {
        toast({
          title: "No cart items selected",
          description: "Please select items from your cart to checkout.",
          variant: "destructive",
        });
        return;
      }

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

    // Filter and sort items
    const filteredCartItems = cartItems?.filter(item =>
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
          return (b.itemPrice * b.quantity) - (a.itemPrice * a.quantity);
        case "price-asc":
          return (a.itemPrice * a.quantity) - (b.itemPrice * b.quantity);
        case "name-asc":
          return a.productName.localeCompare(b.productName);
        case "name-desc":
          return b.productName.localeCompare(a.productName);
        default:
          return 0;
      }
    });

    return (
      <div className="space-y-6">
        {/* Search and Sort Controls */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Select value={sortBy} onValueChange={(value: SortOption) => setSortBy(value)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date-desc">Newest First</SelectItem>
                <SelectItem value="date-asc">Oldest First</SelectItem>
                <SelectItem value="price-desc">Price High-Low</SelectItem>
                <SelectItem value="price-asc">Price Low-High</SelectItem>
                <SelectItem value="name-asc">Name A-Z</SelectItem>
                <SelectItem value="name-desc">Name Z-A</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex border rounded-md">
              <Button
                variant={viewMode === "list" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("list")}
                className="rounded-r-none"
              >
                <List className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "grid" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("grid")}
                className="rounded-l-none"
              >
                <Grid3X3 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Bulk Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Checkbox
              id="select-all"
              checked={isAllCartSelected}
              onCheckedChange={handleSelectAllCart}
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
              >
                <Save className="h-4 w-4 mr-1" />
                Save ({getSelectedCartItems().length})
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowBulkDeleteConfirm(true)}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Delete ({getSelectedCartItems().length})
              </Button>
            </div>
          )}
        </div>

        {/* Items Grid/List */}
        {viewMode === "grid" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sortedCartItems.map((item) => (
              <Card key={item.id} className="relative">
                <CardContent className="p-4">
                  <div className="absolute top-2 right-2">
                    <Checkbox
                      checked={selectedItems.includes(item.id)}
                      onCheckedChange={() => handleSelectItem(item.id)}
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
                      >
                        -
                      </Button>
                      <span className="w-8 text-center">{item.quantity}</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
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
                    <div className="text-right">
                      <div className="font-bold">
                        {formatAmount(item.itemPrice * item.quantity)}
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
            {sortedCartItems.map((item) => (
              <Card key={item.id}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <Checkbox
                      checked={selectedItems.includes(item.id)}
                      onCheckedChange={() => handleSelectItem(item.id)}
                      className="mt-4"
                    />
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-medium">{item.productName}</h3>
                          <p className="text-sm text-muted-foreground">
                            {item.countryCode} • {(item.itemWeight * item.quantity).toFixed(2)}kg
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="font-bold">
                            {formatAmount(item.itemPrice * item.quantity)}
                          </div>
                          <p className="text-sm text-muted-foreground">Total</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 mt-4">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleQuantityChange(item.id, Math.max(1, item.quantity - 1))}
                          >
                            -
                          </Button>
                          <span className="w-8 text-center">{item.quantity}</span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
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
              Items you save will appear here
            </p>
          </div>
        </div>
      );
    }

    // Filter and sort saved items
    const filteredSavedItems = savedItems?.filter(item =>
      item.productName.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
      item.countryCode.toLowerCase().includes(debouncedSearchQuery.toLowerCase())
    ) || [];

    const sortedSavedItems = [...filteredSavedItems].sort((a, b) => {
      switch (sortBy) {
        case "date-desc":
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case "date-asc":
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case "price-desc":
          return (b.itemPrice * b.quantity) - (a.itemPrice * a.quantity);
        case "price-asc":
          return (a.itemPrice * a.quantity) - (b.itemPrice * b.quantity);
        case "name-asc":
          return a.productName.localeCompare(b.productName);
        case "name-desc":
          return b.productName.localeCompare(a.productName);
        default:
          return 0;
      }
    });

    return (
      <div className="space-y-6">
        {/* Search and Sort Controls */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search saved items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Select value={sortBy} onValueChange={(value: SortOption) => setSortBy(value)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date-desc">Newest First</SelectItem>
                <SelectItem value="date-asc">Oldest First</SelectItem>
                <SelectItem value="price-desc">Price High-Low</SelectItem>
                <SelectItem value="price-asc">Price Low-High</SelectItem>
                <SelectItem value="name-asc">Name A-Z</SelectItem>
                <SelectItem value="name-desc">Name Z-A</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex border rounded-md">
              <Button
                variant={viewMode === "list" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("list")}
                className="rounded-r-none"
              >
                <List className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "grid" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("grid")}
                className="rounded-l-none"
              >
                <Grid3X3 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Bulk Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Checkbox
              id="select-all-saved"
              checked={isAllSavedSelected}
              onCheckedChange={handleSelectAllSaved}
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
              >
                <ShoppingCart className="h-4 w-4 mr-1" />
                Move to Cart ({getSelectedSavedItems().length})
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowBulkDeleteConfirm(true)}
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
            {sortedSavedItems.map((item) => (
              <Card key={item.id} className="relative">
                <CardContent className="p-4">
                  <div className="absolute top-2 right-2">
                    <Checkbox
                      checked={selectedItems.includes(item.id)}
                      onCheckedChange={() => handleSelectItem(item.id)}
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
                      >
                        -
                      </Button>
                      <span className="w-8 text-center">{item.quantity}</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
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
                    <div className="text-right">
                      <div className="font-bold">
                        {formatAmount(item.itemPrice * item.quantity)}
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
            {sortedSavedItems.map((item) => (
              <Card key={item.id}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <Checkbox
                      checked={selectedItems.includes(item.id)}
                      onCheckedChange={() => handleSelectItem(item.id)}
                      className="mt-4"
                    />
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-medium">{item.productName}</h3>
                          <p className="text-sm text-muted-foreground">
                            {item.countryCode} • {(item.itemWeight * item.quantity).toFixed(2)}kg
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="font-bold">
                            {formatAmount(item.itemPrice * item.quantity)}
                          </div>
                          <p className="text-sm text-muted-foreground">Total</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 mt-4">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleQuantityChange(item.id, Math.max(1, item.quantity - 1))}
                          >
                            -
                          </Button>
                          <span className="w-8 text-center">{item.quantity}</span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
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
    <div className="container py-12 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <ShoppingCart className="h-8 w-8" />
          Shopping Cart
        </h1>
        <p className="text-muted-foreground mt-2">
          Manage your cart items and saved items
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="cart">
                Cart ({itemCount})
              </TabsTrigger>
              <TabsTrigger value="saved">
                Saved ({savedItemCount})
              </TabsTrigger>
            </TabsList>
            <TabsContent value="cart" className="space-y-6">
              {renderCartContent()}
            </TabsContent>
            <TabsContent value="saved" className="space-y-6">
              {renderSavedContent()}
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Checkout Card - Always Show */}
          <Card>
            <CardHeader>
              <CardTitle>Checkout Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {getSelectedCartItems().length > 0 ? (
                <>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Selected Items:</span>
                      <span>{getSelectedCartItems().length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Subtotal:</span>
                      <span>{formattedSelectedTotal}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Weight:</span>
                      <span>{selectedItemsWeight.toFixed(2)}kg</span>
                    </div>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-bold text-lg">
                    <span>Total:</span>
                    <span>{formattedSelectedTotal}</span>
                  </div>
                  <Button 
                    onClick={handleCheckout} 
                    disabled={isCheckingOut}
                    className="w-full"
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
                </>
              ) : (
                <>
                  <div className="text-center py-6">
                    <ShoppingCart className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                    <h3 className="font-medium mb-2">No items selected</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Select items from your cart to see the checkout summary
                    </p>
                    {hasCartItems && (
                      <Button 
                        variant="outline" 
                        onClick={() => handleSelectAllCart()}
                        className="w-full"
                      >
                        Select All Items
                      </Button>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Confirmation Dialogs */}
      <ConfirmDialog
        isOpen={showBulkSaveConfirm}
        onClose={() => setShowBulkSaveConfirm(false)}
        onConfirm={confirmBulkSaveForLater}
        title="Save Items for Later"
        description={`Are you sure you want to save ${selectedItems.length} item(s) for later? You can find them in the "Saved" tab.`}
        confirmText="Save for Later"
        cancelText="Keep in Cart"
      />

      <ConfirmDialog
        isOpen={showBulkMoveConfirm}
        onClose={() => setShowBulkMoveConfirm(false)}
        onConfirm={confirmBulkMoveToCart}
        title="Move Items to Cart"
        description={`Are you sure you want to move ${selectedItems.length} item(s) to your cart?`}
        confirmText="Move to Cart"
        cancelText="Keep Saved"
      />

      <ConfirmDialog
        isOpen={showBulkDeleteConfirm}
        onClose={() => setShowBulkDeleteConfirm(false)}
        onConfirm={confirmBulkDelete}
        title="Delete Items"
        description={`Are you sure you want to delete ${selectedItems.length} item(s)? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
      />
    </div>
  );
};
