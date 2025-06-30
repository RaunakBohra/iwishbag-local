import { useCartMutations } from "./useCartMutations";
import { useToast } from "./use-toast";
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
  } = useCartMutations();
  
  const { toast } = useToast();

  const handleBulkAddToCart = async () => {
    const idsToAdd = selectedQuoteIds.filter(id => {
      const quote = quotes.find(q => q.id === id);
      return quote && quote.approval_status === 'approved' && !quote.in_cart;
    });

    if (idsToAdd.length > 0) {
      try {
        bulkAddToCart(idsToAdd);
        setSelectedQuoteIds([]);
        toast({
          title: "Items added to cart",
          description: `${idsToAdd.length} item(s) successfully added to your cart.`,
          action: {
            label: "View Cart",
            onClick: () => window.location.href = "/cart"
          }
        });
      } catch (error) {
        toast({
          title: "Failed to add items",
          description: "Please try again or contact support if the problem persists.",
          variant: "destructive"
        });
      }
    } else {
      toast({
        title: "No items to add",
        description: "Select approved quotes that are not already in your cart.",
        variant: "destructive"
      });
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
        toast({
          title: "Items removed from cart",
          description: `${idsToRemove.length} item(s) removed from your cart.`,
          action: {
            label: "Undo",
            onClick: () => {
              // Undo action - add items back to cart
              bulkAddToCart(idsToRemove);
            }
          }
        });
      } catch (error) {
        toast({
          title: "Failed to remove items",
          description: "Please try again or contact support if the problem persists.",
          variant: "destructive"
        });
      }
    } else {
      toast({
        title: "No items to remove",
        description: "Select quotes that are already in your cart.",
        variant: "destructive"
      });
    }
  };

  return {
    handleBulkAddToCart,
    handleBulkRemoveFromCart,
    isAddingBulk,
    isRemovingBulk,
  };
};
