import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ShoppingCart, Package, ArrowRight, Save, Search, SortAsc, SortDesc, Trash2 } from "lucide-react";
import { useCartMutations } from "@/hooks/useCartMutations";
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
  const { removeFromCart, moveToCart } = useCartMutations();
  const { formatAmount } = useUserCurrency();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("cart");
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [selectedSavedItems, setSelectedSavedItems] = useState<Set<string>>(new Set());
  const [showBulkSaveConfirm, setShowBulkSaveConfirm] = useState(false);
  const [showBulkMoveConfirm, setShowBulkMoveConfirm] = useState(false);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("date-desc");
  const [viewMode] = useState<ViewMode>("list");
  const { toast } = useToast();
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [savingsBreakdown, setSavingsBreakdown] = useState<SavingsBreakdown>({
    bulkDiscount: 0,
    memberDiscount: 0,
    seasonalDiscount: 0,
  });

  const { data: approvedQuotes, isLoading } = useQuery({
    queryKey: ['approved-quotes', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('quotes')
        .select(`
          *,
          quote_items (*)
        `)
        .eq('user_id', user.id)
        .eq('approval_status', 'approved')
        .eq('in_cart', true)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

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

  // Calculate total in USD
  const totalAmount = approvedQuotes?.reduce((sum, quote) => {
    const quoteTotal = quote.quote_items?.reduce((itemSum, item) => 
      itemSum + (item.item_price || 0) * item.quantity, 0) || 0;
    return sum + quoteTotal;
  }, 0) || 0;

  // Calculate savings breakdown
  useEffect(() => {
    if (approvedQuotes && cartSettings) {
      const totalItems = approvedQuotes.reduce((sum, quote) => 
        sum + (quote.quote_items?.reduce((itemSum, item) => itemSum + item.quantity, 0) || 0), 0);
      
      // Calculate bulk discount
      const bulkDiscount = totalItems >= cartSettings.bulk_discount_threshold 
        ? totalAmount * (cartSettings.bulk_discount_percentage / 100) 
        : 0;
      
      // Calculate member discount
      const memberDiscount = totalAmount * (cartSettings.member_discount_percentage / 100);
      
      // Calculate seasonal discount
      const currentMonth = new Date().getMonth() + 1; // JavaScript months are 0-based
      const isSeasonalPeriod = currentMonth >= cartSettings.seasonal_discount_start_month && 
                              currentMonth <= cartSettings.seasonal_discount_end_month;
      const seasonalDiscount = (isSeasonalPeriod && cartSettings.is_seasonal_discount_active)
        ? totalAmount * (cartSettings.seasonal_discount_percentage / 100)
        : 0;

      setSavingsBreakdown({
        bulkDiscount,
        memberDiscount,
        seasonalDiscount,
      });
    }
  }, [approvedQuotes, totalAmount, cartSettings]);

  const totalSavings = savingsBreakdown.bulkDiscount + savingsBreakdown.memberDiscount + savingsBreakdown.seasonalDiscount;
  const estimatedShipping = cartSettings ? totalAmount * (cartSettings.shipping_rate_percentage / 100) : totalAmount * 0.1;
  const estimatedTaxes = cartSettings ? totalAmount * (cartSettings.tax_rate_percentage / 100) : totalAmount * 0.08;
  const finalTotal = totalAmount + estimatedShipping + estimatedTaxes - totalSavings;

  const { data: savedQuotes } = useQuery({
    queryKey: ['saved-quotes', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('quotes')
        .select(`
          *,
          quote_items (*)
        `)
        .eq('user_id', user.id)
        .eq('approval_status', 'approved')
        .eq('in_cart', false)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const handleRemoveFromCart = (quoteId: string) => {
    removeFromCart(quoteId);
    setSelectedItems(prev => {
      const next = new Set(prev);
      next.delete(quoteId);
      return next;
    });
    toast({
      title: "Item removed",
      description: "The item has been removed from your cart.",
    });
    // Switch to saved tab if cart is empty
    if (approvedQuotes && approvedQuotes.length <= 1) {
      setActiveTab("saved");
    }
  };

  const handleSelectItem = (quoteId: string) => {
    setSelectedItems(prev => {
      const next = new Set(prev);
      if (next.has(quoteId)) {
        next.delete(quoteId);
      } else {
        next.add(quoteId);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedItems.size === approvedQuotes?.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(approvedQuotes?.map(quote => quote.id) || []));
    }
  };

  const handleBulkSaveForLater = () => {
    setShowBulkSaveConfirm(true);
  };

  const confirmBulkSaveForLater = () => {
    selectedItems.forEach(quoteId => {
      removeFromCart(quoteId);
    });
    setSelectedItems(new Set());
    setShowBulkSaveConfirm(false);
    toast({
      title: "Items saved",
      description: `${selectedItems.size} items have been saved for later.`,
    });
  };

  const handleSelectSavedItem = (quoteId: string) => {
    setSelectedSavedItems(prev => {
      const next = new Set(prev);
      if (next.has(quoteId)) {
        next.delete(quoteId);
      } else {
        next.add(quoteId);
      }
      return next;
    });
  };

  const handleSelectAllSaved = () => {
    if (selectedSavedItems.size === savedQuotes?.length) {
      setSelectedSavedItems(new Set());
    } else {
      setSelectedSavedItems(new Set(savedQuotes?.map(quote => quote.id) || []));
    }
  };

  const handleBulkMoveToCart = () => {
    setShowBulkMoveConfirm(true);
  };

  const confirmBulkMoveToCart = () => {
    selectedSavedItems.forEach(quoteId => {
      moveToCart(quoteId);
    });
    setSelectedSavedItems(new Set());
    setShowBulkMoveConfirm(false);
    toast({
      title: "Items moved",
      description: `${selectedSavedItems.size} items have been moved to your cart.`,
    });
  };

  const handleBulkDelete = () => {
    setShowBulkDeleteConfirm(true);
  };

  const confirmBulkDelete = () => {
    selectedSavedItems.forEach(quoteId => {
      // Add your delete mutation here
      // For now, we'll just remove from saved items
      removeFromCart(quoteId);
    });
    setSelectedSavedItems(new Set());
    setShowBulkDeleteConfirm(false);
    toast({
      title: "Items deleted",
      description: `${selectedSavedItems.size} items have been deleted.`,
    });
  };

  const handleMoveToCart = (quoteId: string) => {
    moveToCart(quoteId);
    setSelectedSavedItems(prev => {
      const next = new Set(prev);
      next.delete(quoteId);
      return next;
    });
    toast({
      title: "Item moved",
      description: "The item has been moved to your cart.",
    });
  };

  const renderCartContent = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-32">
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <p>Loading cart...</p>
          </div>
        </div>
      );
    }

    if (!approvedQuotes || approvedQuotes.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-32 space-y-4">
          <Package className="h-8 w-8 text-muted-foreground" />
          <p className="text-muted-foreground">Your cart is empty</p>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Continue Shopping
          </Button>
        </div>
      );
    }

    return (
      <div className="flex flex-col h-[calc(100vh-8rem)]">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="select-all"
                checked={selectedItems.size === approvedQuotes.length}
                onCheckedChange={handleSelectAll}
              />
              <label htmlFor="select-all" className="text-sm font-medium">
                Select All
              </label>
            </div>
            <div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleBulkSaveForLater}
                className="flex items-center gap-2"
              >
                <Save className="h-4 w-4" />
                Save {selectedItems.size} for Later
              </Button>
            </div>
          </div>
        </div>

        <ScrollArea className="flex-1 py-4">
          {approvedQuotes.map((quote) => (
            <div key={quote.id} className="flex items-start gap-2">
              <Checkbox
                id={`select-${quote.id}`}
                checked={selectedItems.has(quote.id)}
                onCheckedChange={() => handleSelectItem(quote.id)}
                className="mt-4"
              />
              <div className="flex-1">
                {quote.quote_items?.map((item) => (
                  <CartItem
                    key={item.id}
                    item={item}
                    quoteId={quote.id}
                    onRemove={handleRemoveFromCart}
                  />
                ))}
              </div>
            </div>
          ))}
        </ScrollArea>
        
        <div className="border-t p-4 space-y-4">
          {renderAnalytics()}
          
          <div className="flex flex-col gap-2">
            <Button asChild className="w-full">
              <Link to="/cart" onClick={() => setIsOpen(false)}>
                View Cart
              </Link>
            </Button>
            <Button
              className="w-full"
              onClick={handleCheckout}
              disabled={isCheckingOut}
            >
              {isCheckingOut ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent mr-2" />
                  Processing...
                </>
              ) : (
                'Proceed to Checkout'
              )}
            </Button>
          </div>
        </div>
      </div>
    );
  };

  const renderSavedContent = () => {
    if (!savedQuotes?.length) {
      return (
        <div className="flex flex-col items-center justify-center p-8 text-center">
          <Package className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No saved items</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Items you save for later will appear here
          </p>
        </div>
      );
    }

    const filteredQuotes = savedQuotes.filter(quote => {
      const searchLower = searchQuery.toLowerCase();
      return (
        quote.product_name?.toLowerCase().includes(searchLower) ||
        quote.quote_items?.some(item => 
          item.product_name?.toLowerCase().includes(searchLower)
        )
      );
    });

    const sortedQuotes = [...filteredQuotes].sort((a, b) => {
      switch (sortBy) {
        case "date-desc":
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case "date-asc":
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case "price-desc":
          return (b.item_price || 0) - (a.item_price || 0);
        case "price-asc":
          return (a.item_price || 0) - (b.item_price || 0);
        case "name-asc":
          return (a.product_name || "").localeCompare(b.product_name || "");
        case "name-desc":
          return (b.product_name || "").localeCompare(a.product_name || "");
        default:
          return 0;
      }
    });

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Checkbox
              id="select-all-saved"
              checked={selectedSavedItems.size === savedQuotes.length}
              onCheckedChange={handleSelectAllSaved}
            />
            <label htmlFor="select-all-saved" className="text-sm font-medium">
              Select All
            </label>
          </div>
          <div className="flex items-center gap-2">
            <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortOption)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Sort by" />
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

        <div className="space-y-4">
          {sortedQuotes.map((quote) => {
            const firstItem = quote.quote_items?.[0];
            if (!firstItem) return null;

            return (
              <CartItem
                key={quote.id}
                item={firstItem}
                quoteId={quote.id}
                selected={selectedSavedItems.has(quote.id)}
                onSelect={() => handleSelectSavedItem(quote.id)}
                onRemove={handleRemoveFromCart}
                onMoveToCart={() => handleMoveToCart(quote.id)}
                onSaveForLater={() => {}}
                viewMode={viewMode}
              />
            );
          })}
        </div>

        {selectedSavedItems.size > 0 && (
          <div className="sticky bottom-0 bg-background border-t p-4">
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm text-muted-foreground">
                {selectedSavedItems.size} items selected
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowBulkMoveConfirm(true)}
                >
                  Move to Cart
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setShowBulkDeleteConfirm(true)}
                >
                  Delete
                </Button>
              </div>
            </div>
          </div>
        )}
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
          <span>{formatAmount(totalAmount)}</span>
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
          <span>{formatAmount(totalAmount)} / {formatAmount(cartSettings?.free_shipping_threshold || 1000)}</span>
        </div>
        <Progress 
          value={(totalAmount / (cartSettings?.free_shipping_threshold || 1000)) * 100} 
          className="h-2" 
        />
        {totalAmount < (cartSettings?.free_shipping_threshold || 1000) && (
          <p className="text-xs text-muted-foreground">
            Add {formatAmount((cartSettings?.free_shipping_threshold || 1000) - totalAmount)} more for free shipping
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

  const handleCheckout = async () => {
    try {
      setIsCheckingOut(true);
      // Here you would typically:
      // 1. Validate cart items
      // 2. Check inventory
      // 3. Calculate final prices
      // 4. Create order
      // 5. Redirect to checkout
      
      // For now, we'll just simulate a delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Redirect to checkout page
      window.location.href = '/checkout';
    } catch (error) {
      toast({
        title: "Checkout Error",
        description: "There was an error processing your checkout. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCheckingOut(false);
    }
  };

  return (
    <>
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="relative">
            <ShoppingCart className="h-5 w-5" />
            {approvedQuotes && approvedQuotes.length > 0 && (
              <div
                className="absolute -top-1 -right-1"
              >
                <Badge variant="destructive" className="h-5 w-5 justify-center p-0 rounded-full text-xs">
                  {approvedQuotes.length}
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
                Cart ({approvedQuotes?.length || 0})
              </TabsTrigger>
              <TabsTrigger value="saved">
                Saved ({savedQuotes?.length || 0})
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
        description={`Are you sure you want to save ${selectedItems.size} item(s) for later? You can find them in the "Saved" tab.`}
        confirmText="Save for Later"
        cancelText="Keep in Cart"
      />

      <ConfirmDialog
        isOpen={showBulkMoveConfirm}
        onClose={() => setShowBulkMoveConfirm(false)}
        onConfirm={confirmBulkMoveToCart}
        title="Move Items to Cart"
        description={`Are you sure you want to move ${selectedSavedItems.size} item(s) to your cart?`}
        confirmText="Move to Cart"
        cancelText="Keep Saved"
      />

      <ConfirmDialog
        isOpen={showBulkDeleteConfirm}
        onClose={() => setShowBulkDeleteConfirm(false)}
        onConfirm={confirmBulkDelete}
        title="Delete Saved Items"
        description={`Are you sure you want to delete ${selectedSavedItems.size} item(s)? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
      />
    </>
  );
}; 