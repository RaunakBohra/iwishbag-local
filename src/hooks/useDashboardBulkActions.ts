import { useCartStore } from "@/stores/cartStore";
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
    bulkDelete,
    bulkMove
  } = useCartStore();
  
  const { toast } = useToast();

  const canAddToCart = (quote: Quote) => {
    return quote && quote.status === 'approved' && !quote.in_cart;
  };

  const handleBulkAddToCart = async () => {
    const idsToAdd = selectedQuoteIds.filter(id => {
      const quote = quotes.find(q => q.id === id);
      return quote && quote.status === 'approved' && !quote.in_cart;
    });

    if (idsToAdd.length > 0) {
      try {
        // Convert quotes to cart items and add them
        const cartItems = idsToAdd.map(id => {
          const quote = quotes.find(q => q.id === id);
          
          // Determine purchase country from the product URL or default to US
          let purchaseCountry = 'US'; // Default
          const productUrl = quote!.product_url || '';
          if (productUrl.includes('amazon.in') || productUrl.includes('flipkart.com')) {
            purchaseCountry = 'IN';
          } else if (productUrl.includes('amazon.jp')) {
            purchaseCountry = 'JP';
          } else if (productUrl.includes('amazon.co.uk')) {
            purchaseCountry = 'GB';
          }
          
          return {
            id: quote!.id,
            quoteId: quote!.id,
            productName: quote!.product_name || 'Unknown Product',
            finalTotal: quote!.final_total || 0,
            quantity: 1,
            itemWeight: quote!.item_weight || 0,
            countryCode: quote!.destination_country || 'US', // For backward compatibility
            purchaseCountryCode: purchaseCountry, // Where we buy from
            destinationCountryCode: quote!.destination_country || 'US', // Where we deliver to
            inCart: true,
            isSelected: false,
            createdAt: new Date(quote!.created_at),
            updatedAt: new Date(quote!.updated_at)
          };
        });

        // Add items to cart store
        cartItems.forEach(item => {
          useCartStore.getState().addItem(item);
        });

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
        // Remove items from cart store
        await bulkDelete(idsToRemove);
        setSelectedQuoteIds([]);
        toast({
          title: "Items removed from cart",
          description: `${idsToRemove.length} item(s) removed from your cart.`,
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
    isAddingBulk: false, // Cart store handles this internally
    isRemovingBulk: false, // Cart store handles this internally
  };
};
