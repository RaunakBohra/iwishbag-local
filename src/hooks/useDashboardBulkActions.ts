
import { useOptimisticCartMutations } from "./useOptimisticCartMutations";
import { useAdvancedToast } from "./useAdvancedToast";
import { Tables } from "@/integrations/supabase/types";

type Quote = Tables<'quotes'>;

interface UseDashboardBulkActionsProps {
  quotes: Quote[];
  selectedQuoteIds: string[];
  setSelectedQuoteIds: (ids: string[]) => void;
}

export const useDashboardBulkActions = ({
  quotes,
  selectedQuoteIds,
  setSelectedQuoteIds,
}: UseDashboardBulkActionsProps) => {
  const { 
    bulkAddToCart, 
    isAddingBulk, 
    bulkRemoveFromCart, 
    isRemovingBulk 
  } = useOptimisticCartMutations();
  
  const { showSuccessToast, showErrorToast, showUndoableToast } = useAdvancedToast();

  const handleBulkAddToCart = async () => {
    const idsToAdd = selectedQuoteIds.filter(id => {
      const quote = quotes.find(q => q.id === id);
      return quote && quote.approval_status === 'approved' && !quote.in_cart;
    });

    if (idsToAdd.length > 0) {
      try {
        bulkAddToCart(idsToAdd);
        setSelectedQuoteIds([]);
        showSuccessToast(
          "Items added to cart",
          `${idsToAdd.length} item(s) successfully added to your cart.`,
          {
            actionLabel: "View Cart",
            onAction: () => window.location.href = "/cart"
          }
        );
      } catch (error) {
        showErrorToast(
          "Failed to add items",
          "Please try again or contact support if the problem persists."
        );
      }
    } else {
      showErrorToast(
        "No items to add",
        "Select approved quotes that are not already in your cart."
      );
    }
  };

  const handleBulkRemoveFromCart = async () => {
    const idsToRemove = selectedQuoteIds.filter(id => {
      const quote = quotes.find(q => q.id === id);
      return quote && quote.in_cart;
    });

    if (idsToRemove.length > 0) {
      try {
        bulkRemoveFromCart(idsToRemove);
        setSelectedQuoteIds([]);
        showUndoableToast(
          "Items removed from cart",
          () => {
            // Undo action - add items back to cart
            bulkAddToCart(idsToRemove);
          },
          `${idsToRemove.length} item(s) removed from your cart.`
        );
      } catch (error) {
        showErrorToast(
          "Failed to remove items",
          "Please try again or contact support if the problem persists."
        );
      }
    } else {
      showErrorToast(
        "No items to remove",
        "Select quotes that are already in your cart."
      );
    }
  };

  return {
    handleBulkAddToCart,
    handleBulkRemoveFromCart,
    isAddingBulk,
    isRemovingBulk,
  };
};
