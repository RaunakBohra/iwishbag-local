
import { useToast } from './use-toast';
import { Tables } from '@/integrations/supabase/types';

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


  const { toast } = useToast();

  const canAddToCart = (quote: Quote) => {
    return quote && quote.status === 'approved' && !quote.in_cart;
  };

  const handleBulkAddToCart = async () => {
    const idsToAdd = selectedQuoteIds.filter((id) => {
      const quote = quotes.find((q) => q.id === id);
      return quote && quote.status === 'approved' && !quote.in_cart;
    });

    if (idsToAdd.length > 0) {
      try {
        // Cart functionality has been removed - this would add quotes to a cart system
        // For now, we'll just mark the quotes as in_cart in the database
        // TODO: Implement new cart system when ready

        setSelectedQuoteIds([]);
        toast({
          title: 'Cart Functionality Disabled',
          description: 'Cart system is being rebuilt. Please check back soon.',
          variant: 'destructive',
        });
      } catch (error) {
        toast({
          title: 'Failed to add items',
          description: 'Please try again or contact support if the problem persists.',
          variant: 'destructive',
        });
      }
    } else {
      toast({
        title: 'No items to add',
        description: 'Select approved quotes that are not already in your cart.',
        variant: 'destructive',
      });
    }
  };

  const handleBulkRemoveFromCart = async () => {
    const idsToRemove = selectedQuoteIds.filter((id) => {
      const quote = quotes.find((q) => q.id === id);
      return quote && quote.in_cart;
    });

    if (idsToRemove.length > 0) {
      try {
        // Cart functionality has been removed - this would remove quotes from cart
        // For now, we'll just mark the quotes as not in_cart in the database
        // TODO: Implement new cart removal when ready
        setSelectedQuoteIds([]);
        toast({
          title: 'Cart Functionality Disabled',
          description: 'Cart system is being rebuilt. Please check back soon.',
          variant: 'destructive',
        });
      } catch (error) {
        toast({
          title: 'Failed to remove items',
          description: 'Please try again or contact support if the problem persists.',
          variant: 'destructive',
        });
      }
    } else {
      toast({
        title: 'No items to remove',
        description: 'Select quotes that are already in your cart.',
        variant: 'destructive',
      });
    }
  };

  return {
    handleBulkAddToCart,
    handleBulkRemoveFromCart,
    isAddingBulk: false, // Cart store handles this internally
    isRemovingBulk: false, // Cart store handles this internally
  };
};
