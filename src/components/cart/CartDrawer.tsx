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
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Info } from "lucide-react";
import { Database } from "@/lib/database.types";
import { Tables } from '@/integrations/supabase/types';
import { useCart } from '@/hooks/useCart';

type SortOption = "date-desc" | "date-asc" | "price-desc" | "price-asc" | "name-asc" | "name-desc";
type ViewMode = "list";

type SavingsBreakdown = {
  bulkDiscount: number;
  memberDiscount: number;
  seasonalDiscount: number;
};

type CartSettings = Tables<'cart_settings'>;
type CartQuoteItem = Tables<'quote_items'>;

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

export const CartDrawer = () => {
  const { user } = useAuth();
  const { formatAmount } = useUserCurrency();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Use the new cart store
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
    isAllSelected,
    removeItem,
    updateQuantity,
    moveToSaved,
    moveToCart,
    toggleSelection,
    handleSelectAll,
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
  const [savingsBreakdown, setSavingsBreakdown] = useState<SavingsBreakdown>({
    bulkDiscount: 0,
    memberDiscount: 0,
    seasonalDiscount: 0,
  });

  // Load cart data from server when drawer opens
  useEffect(() => {
    if (isOpen && user) {
      loadFromServer(user.id);
    }
  }, [isOpen, user, loadFromServer]);

  const { data: cartSettings } = useQuery({
    queryKey: ['cart-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cart_settings')
        .select('*')
        .single();

      if (error) throw error;
      return data as CartSettings;
    },
  });

  // Calculate savings breakdown
  useEffect(() => {
    if (cartItems && cartSettings) {
      const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);
      
      // Calculate bulk discount
      const bulkDiscount = totalItems >= cartSettings.bulk_discount_threshold 
        ? cartTotal * (cartSettings.bulk_discount_percentage / 100) 
        : 0;
      
      // Calculate member discount
      const memberDiscount = cartTotal * (cartSettings.member_discount_percentage / 100);
      
      // Calculate seasonal discount
      const currentMonth = new Date().getMonth() + 1;
      const isSeasonalPeriod = currentMonth >= cartSettings.seasonal_discount_start_month && 
                              currentMonth <= cartSettings.seasonal_discount_end_month;
      const seasonalDiscount = (isSeasonalPeriod && cartSettings.is_seasonal_discount_active)
        ? cartTotal * (cartSettings.seasonal_discount_percentage / 100)
        : 0;

      setSavingsBreakdown({
        bulkDiscount,
        memberDiscount,
        seasonalDiscount,
      });
    }
  }, [cartItems, cartTotal, cartSettings]);

  const totalSavings = savingsBreakdown.bulkDiscount + savingsBreakdown.memberDiscount + savingsBreakdown.seasonalDiscount;
  const estimatedShipping = cartSettings ? cartTotal * (cartSettings.shipping_rate_percentage / 100) : cartTotal * 0.1;
  const estimatedTaxes = cartSettings ? cartTotal * (cartSettings.tax_rate_percentage / 100) : cartTotal * 0.08;
  const finalTotal = cartTotal + estimatedShipping + estimatedTaxes - totalSavings;

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
        return b.itemPrice - a.itemPrice;
      case "price-asc":
        return a.itemPrice - b.itemPrice;
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
        return b.itemPrice - a.itemPrice;
      case "price-asc":
        return a.itemPrice - b.itemPrice;
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

  const handleCheckout = async () => {
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
      // Navigate to checkout page
      window.location.href = '/checkout';
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
          <Package className="h-12 w-12 text-muted-foreground" />
          <div className="text-center">
            <h3 className="font-medium">Your cart is empty</h3>
            <p className="text-sm text-muted-foreground">
              Add some items to get started
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Checkbox
              id="select-all"
              checked={selectedItems.length === cartItems.length}
              onCheckedChange={handleSelectAll}
            />
            <label htmlFor="select-all" className="text-sm font-medium">
              Select All ({selectedItems.length})
            </label>
          </div>
          {selectedItems.length > 0 && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowBulkSaveConfirm(true)}
              >
                <Save className="h-4 w-4 mr-1" />
                Save ({selectedItems.length})
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowBulkDeleteConfirm(true)}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Delete ({selectedItems.length})
              </Button>
            </div>
          )}
        </div>

        <ScrollArea className="flex-1 py-4">
          {sortedCartItems.map((item) => (
            <div key={item.id} className="flex items-start gap-2 p-2">
              <Checkbox
                id={`select-${item.id}`}
                checked={selectedItems.includes(item.id)}
                onCheckedChange={() => handleSelectItem(item.id)}
                className="mt-4"
              />
              <div className="flex-1">
                <a 
                  href={item.imageUrl || '#'} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="font-medium hover:underline"
                >
                  {item.productName}
                </a>
                <div className="flex items-center gap-4 mt-2">
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
                <div className="text-right">
                  <div className="font-bold">
                    {formatAmount(item.itemPrice * item.quantity)}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {(item.itemWeight * item.quantity).toFixed(2)}kg • {item.countryCode}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </ScrollArea>
      </div>
    );
  };

  const renderSavedContent = () => {
    if (!savedItems || savedItems.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-32 space-y-4">
          <Save className="h-12 w-12 text-muted-foreground" />
          <div className="text-center">
            <h3 className="font-medium">No saved items</h3>
            <p className="text-sm text-muted-foreground">
              Items you save will appear here
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Checkbox
              id="select-all-saved"
              checked={selectedItems.length === savedItems.length}
              onCheckedChange={handleSelectAll}
            />
            <label htmlFor="select-all-saved" className="text-sm font-medium">
              Select All ({selectedItems.length})
            </label>
          </div>
          {selectedItems.length > 0 && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowBulkMoveConfirm(true)}
              >
                <ShoppingCart className="h-4 w-4 mr-1" />
                Move to Cart ({selectedItems.length})
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowBulkDeleteConfirm(true)}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Delete ({selectedItems.length})
              </Button>
            </div>
          )}
        </div>

        <ScrollArea className="h-[calc(100vh-16rem)]">
          {sortedSavedItems.map((item) => (
            <div key={item.id} className="flex items-start gap-2 p-2">
              <Checkbox
                id={`select-saved-${item.id}`}
                checked={selectedItems.includes(item.id)}
                onCheckedChange={() => handleSelectItem(item.id)}
                className="mt-4"
              />
              <div className="flex-1">
                <a 
                  href={item.imageUrl || '#'} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="font-medium hover:underline"
                >
                  {item.productName}
                </a>
                <div className="flex items-center gap-4 mt-2">
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
                <div className="text-right">
                  <div className="font-bold">
                    {formatAmount(item.itemPrice * item.quantity)}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {(item.itemWeight * item.quantity).toFixed(2)}kg • {item.countryCode}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </ScrollArea>
      </div>
    );
  };

  const renderAnalytics = () => (
    <div className="border-t pt-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">Cart Analytics</h3>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="h-4 w-4 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent>
              <p>Detailed breakdown of your cart costs and savings</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Cost Breakdown */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>Subtotal:</span>
          <span>{formatAmount(cartTotal)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span>Total Weight:</span>
          <span>{cartWeight.toFixed(2)}kg</span>
        </div>
        <div className="flex justify-between text-sm">
          <span>Estimated Shipping:</span>
          <span>{formatAmount(estimatedShipping)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span>Estimated Taxes:</span>
          <span>{formatAmount(estimatedTaxes)}</span>
        </div>
      </div>

      {/* Savings Breakdown */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-green-600">Total Savings:</span>
          <span className="text-green-600">{formatAmount(totalSavings)}</span>
        </div>
        {savingsBreakdown.bulkDiscount > 0 && cartSettings && (
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Bulk Discount ({cartSettings.bulk_discount_percentage}%):</span>
            <span>{formatAmount(savingsBreakdown.bulkDiscount)}</span>
          </div>
        )}
        {savingsBreakdown.memberDiscount > 0 && cartSettings && (
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Member Discount ({cartSettings.member_discount_percentage}%):</span>
            <span>{formatAmount(savingsBreakdown.memberDiscount)}</span>
          </div>
        )}
        {savingsBreakdown.seasonalDiscount > 0 && cartSettings && (
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Seasonal Discount ({cartSettings.seasonal_discount_percentage}%):</span>
            <span>{formatAmount(savingsBreakdown.seasonalDiscount)}</span>
          </div>
        )}
      </div>

      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Free Shipping Progress</span>
          <span>{formatAmount(cartTotal)} / {formatAmount(cartSettings?.free_shipping_threshold || 1000)}</span>
        </div>
        <Progress 
          value={(cartTotal / (cartSettings?.free_shipping_threshold || 1000)) * 100} 
          className="h-2" 
        />
        {cartTotal < (cartSettings?.free_shipping_threshold || 1000) && (
          <p className="text-xs text-muted-foreground">
            Add {formatAmount((cartSettings?.free_shipping_threshold || 1000) - cartTotal)} more for free shipping
          </p>
        )}
      </div>

      {/* Final Total */}
      <div className="border-t pt-4">
        <div className="flex justify-between text-lg font-semibold">
          <span>Final Total:</span>
          <span>{formatAmount(finalTotal)}</span>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="relative">
            <ShoppingCart className="h-5 w-5" />
            {cartItems && cartItems.length > 0 && (
              <div
                className="absolute -top-1 -right-1"
              >
                <Badge variant="destructive" className="h-5 w-5 justify-center p-0 rounded-full text-xs">
                  {cartItems.length}
                </Badge>
              </div>
            )}
            <span className="sr-only">Cart</span>
          </Button>
        </SheetTrigger>
        <SheetContent className="w-full sm:max-w-lg">
          <SheetHeader className="space-y-2.5">
            <SheetTitle>Shopping Cart</SheetTitle>
          </SheetHeader>
          
          <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="cart">
                Cart ({cartItems?.length || 0})
              </TabsTrigger>
              <TabsTrigger value="saved">
                Saved ({savedItems?.length || 0})
              </TabsTrigger>
            </TabsList>
            <TabsContent value="cart" className="mt-4">
              {renderCartContent()}
            </TabsContent>
            <TabsContent value="saved" className="mt-4">
              {renderSavedContent()}
            </TabsContent>
          </Tabs>
        </SheetContent>
      </Sheet>

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
        title="Delete Saved Items"
        description={`Are you sure you want to delete ${selectedItems.length} item(s)? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
      />
    </>
  );
}; 