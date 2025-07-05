import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Quote, QuoteStatus, isValidStatusTransition } from "@/types/quote";
import { useEmailNotifications } from "./useEmailNotifications";
import { useCartStore, CartItem } from "@/stores/cartStore";
import { useAuth } from "@/contexts/AuthContext";
import { Tables } from "@/integrations/supabase/types";
import { useStatusManagement } from "./useStatusManagement";

type QuoteWithItems = Tables<'quotes'> & {
  quote_items: Tables<'quote_items'>[];
};

export const useQuoteState = (quoteId: string) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { sendQuoteApprovedEmail, sendQuoteRejectedEmail } = useEmailNotifications();
  const { loadFromServer, addItem } = useCartStore();
  const { user } = useAuth();
  const { isValidTransition } = useStatusManagement();

  // Helper function to convert quote to cart item
  const convertQuoteToCartItem = (quote: QuoteWithItems): CartItem => {
    const firstItem = quote.quote_items?.[0];
    const quoteItems = quote.quote_items || [];
    
    // Calculate total from quote items with proper null checks
    const totalFromItems = quoteItems.reduce((sum, item) => {
      const itemPrice = item.item_price || 0;
      const itemQuantity = item.quantity || 1;
      return sum + (itemPrice * itemQuantity);
    }, 0);
    
    // FIXED: Use proper fallback chain for total price
    let totalPrice = 0;
    if (quote.final_total && quote.final_total > 0) {
      totalPrice = quote.final_total;
    } else if (quote.final_total_local && quote.final_total_local > 0) {
      totalPrice = quote.final_total_local;
    } else if (totalFromItems > 0) {
      totalPrice = totalFromItems;
    } else {
      // If no price found, use the first item's price
      totalPrice = firstItem?.item_price || 0;
    }
    
    const quantity = quote.quantity || firstItem?.quantity || 1;
    const itemWeight = firstItem?.item_weight || quote.item_weight || 0;
    
    const cartItem = {
      id: quote.id,
      quoteId: quote.id,
      productName: firstItem?.product_name || quote.product_name || 'Unknown Product',
      finalTotal: totalPrice,
      quantity: quantity,
      itemWeight: itemWeight,
      imageUrl: firstItem?.image_url || quote.image_url,
      deliveryDate: quote.delivery_date,
      countryCode: quote.country_code || 'US',
      inCart: true,
      isSelected: false,
      createdAt: new Date(quote.created_at),
      updatedAt: new Date(quote.updated_at)
    };
    
    // FIXED: Final safety check to ensure all numeric values are valid
    return {
      ...cartItem,
      finalTotal: isNaN(cartItem.finalTotal) ? 0 : cartItem.finalTotal,
      quantity: isNaN(cartItem.quantity) ? 1 : cartItem.quantity,
      itemWeight: isNaN(cartItem.itemWeight) ? 0 : cartItem.itemWeight
    };
  };

  const updateQuoteStatus = async (quoteId: string, status: string) => {
    // Get current quote to validate transition
    const { data: currentQuote, error: fetchError } = await supabase
      .from('quotes')
      .select('status')
      .eq('id', quoteId)
      .single();

    if (fetchError) {
      console.error('Error fetching current quote status:', fetchError);
      toast({
        title: "Error",
        description: "Failed to fetch quote status",
        variant: "destructive",
      });
      return null;
    }

    // Validate status transition
    if (!isValidTransition(currentQuote.status, status, 'quote')) {
      toast({
        title: "Invalid Status Transition",
        description: `Cannot change status from "${currentQuote.status}" to "${status}"`,
        variant: "destructive",
      });
      return null;
    }

    const { data, error } = await supabase
      .from('quotes')
      .update({ status })
      .eq('id', quoteId)
      .select()
      .single();

    if (error) {
      console.error('Error updating quote status:', error);
      toast({
        title: "Error",
        description: "Failed to update quote status",
        variant: "destructive",
      });
      return null;
    }

    // Invalidate relevant queries
    queryClient.invalidateQueries({ queryKey: ['quote-detail', quoteId] });
    queryClient.invalidateQueries({ queryKey: ['user-quotes-and-orders'] });

    toast({
      title: "Status Updated",
      description: `Quote status changed to "${status}"`,
    });

    return data;
  };

  const approveQuote = async () => {
    return updateQuoteStatus(quoteId, 'approved');
  };

  const rejectQuote = async (reason: string = '') => {
    // Remove from cart if in cart
    const { data: quote, error: fetchError } = await supabase
      .from('quotes')
      .select('in_cart')
      .eq('id', quoteId)
      .single();
    if (!fetchError && quote && quote.in_cart) {
      // Remove from cart store
      const { removeItem } = useCartStore.getState();
      removeItem(quoteId);
      // Update in_cart flag in DB
      await supabase
        .from('quotes')
        .update({ in_cart: false })
        .eq('id', quoteId);
    }
    // Now update status to rejected
    return updateQuoteStatus(quoteId, 'rejected');
  };

  const addToCart = async () => {
    try {
      // Get quote with items
      const { data: quote, error: fetchError } = await supabase
        .from('quotes')
        .select(`
          *,
          quote_items (*)
        `)
        .eq('id', quoteId)
        .single();

      if (fetchError) {
        throw fetchError;
      }

      if (!quote) {
        throw new Error('Quote not found');
      }

      // Convert quote to cart item
      const cartItem = convertQuoteToCartItem(quote);

      // Set userId in cart store first
      useCartStore.getState().setUserId(user?.id || '');

      // Add item to cart store
      addItem(cartItem);

      // Update quote to mark as in cart (don't change status, just add in_cart flag)
      await supabase
        .from('quotes')
        .update({ in_cart: true })
        .eq('id', quoteId);

      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['quote-detail', quoteId] });
      queryClient.invalidateQueries({ queryKey: ['user-quotes-and-orders'] });

      toast({
        title: "Added to Cart",
        description: "Quote has been added to your cart",
      });

    } catch (error) {
      console.error('Error adding to cart:', error);
      toast({
        title: "Error",
        description: "Failed to add item to cart. Please try again.",
        variant: "destructive",
      });
    }
  };

  const removeFromCart = async () => {
    try {
      // Remove from cart store first
      const { removeItem } = useCartStore.getState();
      removeItem(quoteId);

      // Update quote to remove in_cart flag
      await supabase
        .from('quotes')
        .update({ in_cart: false })
        .eq('id', quoteId);
      
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['quote-detail', quoteId] });
      queryClient.invalidateQueries({ queryKey: ['user-quotes-and-orders'] });

      toast({
        title: "Removed from Cart",
        description: "Quote has been removed from your cart",
      });
      
      return true;
    } catch (error) {
      console.error('Error removing from cart:', error);
      toast({
        title: "Error",
        description: "Failed to remove item from cart",
        variant: "destructive",
      });
      return false;
    }
  };

  const setPaymentMethod = (method: string) => {
    return updateQuoteStatus(quoteId, method);
  };

  return {
    updateQuoteStatus,
    approveQuote,
    rejectQuote,
    addToCart,
    removeFromCart,
    setPaymentMethod
  };
}; 