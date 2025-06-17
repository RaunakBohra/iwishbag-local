
import React from "react";
import { Button } from "@/components/ui/button";
import { ShoppingCart, X, Package } from "lucide-react";
import { Tables } from "@/integrations/supabase/types";
import { useDashboardBulkActions } from "@/hooks/useDashboardBulkActions";

type Quote = Tables<'quotes'>;
type CountrySetting = Tables<'country_settings'>;
type Profile = Tables<'profiles'>;

interface DashboardBulkActionsProps {
  selectedQuoteIds: string[];
  onBulkAction: (action: string) => void;
  userProfile?: Profile | null;
  allCountries?: CountrySetting[] | null;
}

export const DashboardBulkActions = ({
  selectedQuoteIds,
  onBulkAction,
  userProfile,
  allCountries
}: DashboardBulkActionsProps) => {
  const {
    handleBulkAddToCart,
    handleBulkRemoveFromCart,
    isAddingBulk,
    isRemovingBulk,
  } = useDashboardBulkActions({
    quotes: [],
    selectedQuoteIds,
    setSelectedQuoteIds: () => {},
  });

  if (selectedQuoteIds.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-4 p-4 bg-muted rounded-lg flex-wrap">
      <div className="flex items-center gap-2">
        <Package className="h-4 w-4" />
        <span className="text-sm font-medium">
          {selectedQuoteIds.length} item{selectedQuoteIds.length > 1 ? 's' : ''} selected
        </span>
      </div>
      
      <div className="flex gap-2">
        <Button
          size="sm"
          onClick={handleBulkAddToCart}
          disabled={isAddingBulk}
          className="flex items-center gap-2"
        >
          <ShoppingCart className="h-4 w-4" />
          {isAddingBulk ? "Adding..." : "Add to Cart"}
        </Button>
        
        <Button
          size="sm"
          variant="outline"
          onClick={handleBulkRemoveFromCart}
          disabled={isRemovingBulk}
          className="flex items-center gap-2"
        >
          <X className="h-4 w-4" />
          {isRemovingBulk ? "Removing..." : "Remove from Cart"}
        </Button>
      </div>
    </div>
  );
};
