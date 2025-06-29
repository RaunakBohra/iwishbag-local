import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Quote, QuoteStatus, isValidStatusTransition } from "@/types/quote";
import { useEmailNotifications } from "./useEmailNotifications";
import { useCartStore, CartItem } from "@/stores/cartStore";
import { useAuth } from "@/contexts/AuthContext";
import { Tables } from "@/integrations/supabase/types";

type QuoteWithItems = Tables<'quotes'> & {
  quote_items: Tables<'quote_items'>[];
};

export const useQuoteState = (quoteId: string) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { sendQuoteApprovedEmail, sendQuoteRejectedEmail } = useEmailNotifications();
  const { loadFromServer, addItem } = useCartStore();
  const { user } = useAuth();

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

  const updateQuoteStateMutation = useMutation({
    mutationFn: async ({ 
      status, 
      approval_status, 
      rejection_reason_id, 
      rejection_details,
      in_cart,
      payment_method
    }: Partial<Quote>) => {
      // Get current quote state
      const { data: currentQuote, error: fetchError } = await supabase
        .from('quotes')
        .select(`
          *,
          quote_items (*)
        `)
        .eq('id', quoteId)
        .single();

      if (fetchError) throw fetchError;
      if (!currentQuote) throw new Error('Quote not found');

      // Validate state transition
      if (status && !isValidStatusTransition(currentQuote.status as QuoteStatus, status as QuoteStatus)) {
        throw new Error(`Invalid status transition from ${currentQuote.status} to ${status}`);
      }

      // Prepare update data
      const updateData: Partial<Quote> = {};
      
      if (status) {
        updateData.status = status;
        // Set timestamps based on status
        if (status === 'accepted') {
          updateData.approved_at = new Date().toISOString();
        } else if (status === 'cancelled') {
          updateData.rejected_at = new Date().toISOString();
        }
      }

      if (approval_status) updateData.approval_status = approval_status;
      if (rejection_reason_id) updateData.rejection_reason_id = rejection_reason_id;
      if (rejection_details) updateData.rejection_details = rejection_details;
      if (in_cart !== undefined) updateData.in_cart = in_cart;
      if (payment_method) updateData.payment_method = payment_method;

      // Update quote
      const { error: updateError } = await supabase
        .from('quotes')
        .update(updateData)
        .eq('id', quoteId);

      if (updateError) throw updateError;

      // Send email notifications based on status changes
      if (status === 'accepted') {
        await sendQuoteApprovedEmail(currentQuote);
      } else if (status === 'cancelled') {
        await sendQuoteRejectedEmail(currentQuote, rejection_details || 'No reason provided');
      }

      return { ...currentQuote, ...updateData };
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['quote', quoteId] });
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      
      // If in_cart was updated, sync with Zustand store
      if (variables.in_cart !== undefined && user?.id) {
        loadFromServer(user.id);
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const approveQuote = () => {
    return updateQuoteStateMutation.mutate({
      status: 'accepted',
      approval_status: 'approved',
      in_cart: true
    });
  };

  const rejectQuote = async (reasonId: string, details: string) => {
    try {
      await updateQuoteStateMutation.mutateAsync({
      status: 'cancelled',
      approval_status: 'rejected',
      rejection_reason_id: reasonId,
      rejection_details: details
    });
      return true;
    } catch (error) {
      console.error('Error rejecting quote:', error);
      return false;
    }
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

      // Update quote status in database
      await updateQuoteStateMutation.mutateAsync({ in_cart: true });

      toast({
        title: "Added to Cart",
        description: "Item has been added to your cart successfully.",
      });

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      queryClient.invalidateQueries({ queryKey: ['user-quotes-and-orders'] });

    } catch (error) {
      console.error('Error adding to cart:', error);
      toast({
        title: "Error",
        description: "Failed to add item to cart. Please try again.",
        variant: "destructive",
      });
    }
  };

  const removeFromCart = () => {
    return updateQuoteStateMutation.mutate({
      in_cart: false
    });
  };

  const setPaymentMethod = (method: string) => {
    return updateQuoteStateMutation.mutate({
      payment_method: method
    });
  };

  return {
    updateQuoteState: updateQuoteStateMutation.mutate,
    isUpdating: updateQuoteStateMutation.isPending,
    approveQuote,
    rejectQuote,
    addToCart,
    removeFromCart,
    setPaymentMethod
  };
}; 