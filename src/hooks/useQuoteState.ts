import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Quote, QuoteStatus, isValidStatusTransition } from "@/types/quote";
import { useEmailNotifications } from "./useEmailNotifications";
import { useCartStore } from "@/stores/cartStore";
import { useAuth } from "@/contexts/AuthContext";

export const useQuoteState = (quoteId: string) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { sendQuoteApprovedEmail, sendQuoteRejectedEmail } = useEmailNotifications();
  const { loadFromServer } = useCartStore();
  const { user } = useAuth();

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
        .select('*')
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

  const addToCart = () => {
    return updateQuoteStateMutation.mutate({
      in_cart: true
    });
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