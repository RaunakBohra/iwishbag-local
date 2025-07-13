import { useEffect, useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface PaymentStatusSyncOptions {
  quoteId: string;
  enabled?: boolean;
  onPaymentStatusChange?: (status: string, transaction?: any) => void;
  onPaymentConfirmed?: (transaction: any) => void;
  onPaymentFailed?: (transaction: any) => void;
}

export function usePaymentStatusSync({
  quoteId,
  enabled = true,
  onPaymentStatusChange,
  onPaymentConfirmed,
  onPaymentFailed
}: PaymentStatusSyncOptions) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isMonitoring, setIsMonitoring] = useState(false);

  /**
   * Invalidate relevant queries when payment status changes
   */
  const invalidatePaymentQueries = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['payment-ledger', quoteId] });
    queryClient.invalidateQueries({ queryKey: ['payment-transactions', quoteId] });
    queryClient.invalidateQueries({ queryKey: ['payment-links', quoteId] });
    queryClient.invalidateQueries({ queryKey: ['quotes'] });
    queryClient.invalidateQueries({ queryKey: ['quote', quoteId] });
  }, [queryClient, quoteId]);

  /**
   * Handle payment status updates
   */
  const handlePaymentStatusUpdate = useCallback((payload: any) => {
    const { new: newRecord, old: oldRecord, eventType } = payload;
    
    console.log('Payment status update received:', {
      eventType,
      quoteId: newRecord?.quote_id,
      oldStatus: oldRecord?.status,
      newStatus: newRecord?.status
    });

    // Only process updates for the current quote
    if (newRecord?.quote_id !== quoteId) {
      return;
    }

    // Invalidate queries to refresh data
    invalidatePaymentQueries();

    // Call status change callback
    onPaymentStatusChange?.(newRecord?.status, newRecord);

    // Handle specific status changes
    if (newRecord?.status === 'completed' && oldRecord?.status !== 'completed') {
      onPaymentConfirmed?.(newRecord);
      
      toast({
        title: "Payment Confirmed",
        description: `Payment of ${newRecord.currency} ${newRecord.amount} has been confirmed.`,
      });
    } else if (newRecord?.status === 'failed' && oldRecord?.status !== 'failed') {
      onPaymentFailed?.(newRecord);
      
      toast({
        title: "Payment Failed",
        description: "Payment attempt was unsuccessful. Please try again.",
        variant: "destructive",
      });
    } else if (newRecord?.status === 'refunded') {
      toast({
        title: "Payment Refunded",
        description: `Refund of ${newRecord.currency} ${newRecord.amount} has been processed.`,
      });
    }
  }, [quoteId, onPaymentStatusChange, onPaymentConfirmed, onPaymentFailed, invalidatePaymentQueries, toast]);

  /**
   * Handle payment ledger updates
   */
  const handlePaymentLedgerUpdate = useCallback((payload: any) => {
    const { new: newRecord, eventType } = payload;
    
    console.log('Payment ledger update received:', {
      eventType,
      quoteId: newRecord?.quote_id,
      transactionType: newRecord?.transaction_type,
      amount: newRecord?.amount
    });

    // Only process updates for the current quote
    if (newRecord?.quote_id !== quoteId) {
      return;
    }

    // Invalidate queries to refresh data
    invalidatePaymentQueries();

    // Show notification for new payment ledger entries
    if (eventType === 'INSERT') {
      const transactionType = newRecord?.transaction_type || newRecord?.payment_type;
      const amount = newRecord?.amount;
      const currency = newRecord?.currency || 'USD';

      if (transactionType === 'payment' || transactionType === 'customer_payment') {
        toast({
          title: "Payment Recorded",
          description: `New payment of ${currency} ${amount} has been recorded.`,
        });
      } else if (transactionType === 'refund' || transactionType === 'partial_refund') {
        toast({
          title: "Refund Processed",
          description: `Refund of ${currency} ${amount} has been processed.`,
        });
      }
    }
  }, [quoteId, invalidatePaymentQueries, toast]);

  /**
   * Handle payment link status updates
   */
  const handlePaymentLinkUpdate = useCallback((payload: any) => {
    const { new: newRecord, old: oldRecord, eventType } = payload;
    
    console.log('Payment link update received:', {
      eventType,
      quoteId: newRecord?.quote_id,
      status: newRecord?.status,
      linkId: newRecord?.id
    });

    // Only process updates for the current quote
    if (newRecord?.quote_id !== quoteId) {
      return;
    }

    // Invalidate payment link queries
    queryClient.invalidateQueries({ queryKey: ['payment-links', quoteId] });

    // Show notification for payment link status changes
    if (newRecord?.status === 'completed' && oldRecord?.status !== 'completed') {
      toast({
        title: "Payment Link Used",
        description: "Customer has successfully completed payment using the payment link.",
      });
      
      // Also invalidate other payment queries since payment was completed
      invalidatePaymentQueries();
    } else if (newRecord?.status === 'expired' && oldRecord?.status !== 'expired') {
      toast({
        title: "Payment Link Expired",
        description: "A payment link has expired. Consider generating a new one if payment is still needed.",
        variant: "destructive",
      });
    }
  }, [quoteId, queryClient, invalidatePaymentQueries, toast]);

  /**
   * Setup real-time subscriptions
   */
  useEffect(() => {
    if (!enabled || !quoteId) {
      setIsMonitoring(false);
      return;
    }

    setIsMonitoring(true);
    console.log('Setting up payment status subscriptions for quote:', quoteId);

    // Subscribe to payment_transactions changes
    const transactionsSubscription = supabase
      .channel(`payment_transactions_${quoteId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'payment_transactions',
          filter: `quote_id=eq.${quoteId}`
        },
        handlePaymentStatusUpdate
      )
      .subscribe();

    // Subscribe to payment_ledger changes
    const ledgerSubscription = supabase
      .channel(`payment_ledger_${quoteId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'payment_ledger',
          filter: `quote_id=eq.${quoteId}`
        },
        handlePaymentLedgerUpdate
      )
      .subscribe();

    // Subscribe to payment_links changes
    const linksSubscription = supabase
      .channel(`payment_links_${quoteId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'payment_links',
          filter: `quote_id=eq.${quoteId}`
        },
        handlePaymentLinkUpdate
      )
      .subscribe();

    // Subscribe to quote status changes (for payment-related status updates)
    const quoteSubscription = supabase
      .channel(`quote_payment_status_${quoteId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'quotes',
          filter: `id=eq.${quoteId}`
        },
        (payload) => {
          const { new: newRecord, old: oldRecord } = payload;
          
          // Check if payment-related fields changed
          if (newRecord?.status !== oldRecord?.status && 
              ['paid', 'partially_paid'].includes(newRecord?.status)) {
            console.log('Quote payment status changed:', {
              oldStatus: oldRecord?.status,
              newStatus: newRecord?.status
            });
            
            invalidatePaymentQueries();
            
            if (newRecord?.status === 'paid') {
              toast({
                title: "Order Fully Paid",
                description: "All payments for this order have been completed.",
              });
            }
          }
        }
      )
      .subscribe();

    // Cleanup function
    return () => {
      console.log('Cleaning up payment status subscriptions for quote:', quoteId);
      setIsMonitoring(false);
      
      transactionsSubscription.unsubscribe();
      ledgerSubscription.unsubscribe();
      linksSubscription.unsubscribe();
      quoteSubscription.unsubscribe();
    };
  }, [
    enabled, 
    quoteId, 
    handlePaymentStatusUpdate, 
    handlePaymentLedgerUpdate, 
    handlePaymentLinkUpdate,
    invalidatePaymentQueries,
    toast
  ]);

  /**
   * Manually trigger status check
   */
  const checkPaymentStatus = useCallback(async () => {
    try {
      console.log('Manually checking payment status for quote:', quoteId);
      
      // Call the payment verification function
      const { data, error } = await supabase.functions.invoke('verify-payment-status', {
        body: { quoteId }
      });

      if (error) {
        console.error('Error checking payment status:', error);
        return { success: false, error };
      }

      // Invalidate queries to refresh with latest data
      invalidatePaymentQueries();

      return { success: true, data };
    } catch (error) {
      console.error('Error in manual payment status check:', error);
      return { success: false, error };
    }
  }, [quoteId, invalidatePaymentQueries]);

  return {
    isMonitoring,
    checkPaymentStatus,
    invalidatePaymentQueries
  };
}