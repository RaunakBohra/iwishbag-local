
import { useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useAdvancedToast } from './useAdvancedToast';
import { Tables } from '@/integrations/supabase/types';

type Quote = Tables<'quotes'>;

export const useRealTimeQuotes = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { showSuccessToast, showErrorToast } = useAdvancedToast();

  const handleQuoteUpdate = useCallback((payload: any) => {
    const newQuote = payload.new as Quote;
    const oldQuote = payload.old as Quote;
    
    // Update the cache
    queryClient.setQueryData(['user-quotes-and-orders', user?.id], (oldData: Quote[] | undefined) => {
      if (!oldData) return oldData;
      
      return oldData.map(quote => 
        quote.id === newQuote.id ? newQuote : quote
      );
    });

    // Show notifications for important status changes
    if (oldQuote && newQuote.status !== oldQuote.status) {
      const statusMessages: Record<string, { title: string; description: string; type: 'success' | 'error' }> = {
        'sent': {
          title: 'Quote Updated',
          description: `Quote ${newQuote.display_id || newQuote.id.substring(0, 6)} has been sent for review.`,
          type: 'success'
        },
        'accepted': {
          title: 'Quote Approved! 🎉',
          description: `Quote ${newQuote.display_id || newQuote.id.substring(0, 6)} has been approved and added to your cart.`,
          type: 'success'
        },
        'cancelled': {
          title: 'Quote Cancelled',
          description: `Quote ${newQuote.display_id || newQuote.id.substring(0, 6)} has been cancelled.`,
          type: 'error'
        },
        'paid': {
          title: 'Payment Confirmed! 🎉',
          description: `Payment for order ${newQuote.order_display_id || newQuote.display_id} has been confirmed.`,
          type: 'success'
        },
        'shipped': {
          title: 'Order Shipped! 📦',
          description: `Your order ${newQuote.order_display_id} has been shipped${newQuote.tracking_number ? ` (Tracking: ${newQuote.tracking_number})` : ''}.`,
          type: 'success'
        },
        'completed': {
          title: 'Order Completed! ✅',
          description: `Your order ${newQuote.order_display_id} has been completed.`,
          type: 'success'
        }
      };

      const statusInfo = statusMessages[newQuote.status];
      if (statusInfo) {
        if (statusInfo.type === 'success') {
          showSuccessToast(statusInfo.title, statusInfo.description, {
            duration: 8000,
            actionLabel: newQuote.status === 'accepted' ? 'View Cart' : undefined,
            onAction: newQuote.status === 'accepted' ? () => window.location.href = '/cart' : undefined
          });
        } else {
          showErrorToast(statusInfo.title, statusInfo.description);
        }
      }
    }
  }, [user?.id, queryClient, showSuccessToast, showErrorToast]);

  const handleQuoteInsert = useCallback((payload: any) => {
    const newQuote = payload.new as Quote;
    
    // Add new quote to cache
    queryClient.setQueryData(['user-quotes-and-orders', user?.id], (oldData: Quote[] | undefined) => {
      if (!oldData) return [newQuote];
      return [newQuote, ...oldData];
    });

    showSuccessToast(
      'New Quote Created',
      `Quote ${newQuote.display_id || newQuote.id.substring(0, 6)} has been created.`
    );
  }, [user?.id, queryClient, showSuccessToast]);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('user-quotes-realtime')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'quotes',
          filter: `user_id=eq.${user.id}`
        },
        handleQuoteUpdate
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'quotes',
          filter: `user_id=eq.${user.id}`
        },
        handleQuoteInsert
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, handleQuoteUpdate, handleQuoteInsert]);

  return {
    // Return any status or connection info if needed
    isConnected: true
  };
};
