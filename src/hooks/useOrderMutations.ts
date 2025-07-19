import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { Tables } from '@/integrations/supabase/types';
import { useStatusManagement } from '@/hooks/useStatusManagement';
import { usePaymentStatusManagement } from '@/hooks/usePaymentStatusManagement';

export type ShippingData = {
  shipping_carrier: string;
  tracking_number: string;
};

export const useOrderMutations = (id: string | undefined) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { getStatusConfig, orderStatuses } = useStatusManagement();
  const { getPaymentStatusConfig } = usePaymentStatusManagement();

  const updateShippingInfoMutation = useMutation<void, Error, ShippingData>({
    mutationFn: async (shippingData) => {
      if (!id) throw new Error('Order ID is required.');

      // DYNAMIC: Find the shipped status from configuration
      const shippedStatusConfig = orderStatuses.find(
        (s) => s.name === 'shipped' || s.allowShipping,
      );
      const shippedStatus = shippedStatusConfig?.name || 'shipped';

      const { error } = await supabase
        .from('quotes')
        .update({
          ...shippingData,
          status: shippedStatus,
          shipped_at: new Date().toISOString(),
        })
        .eq('id', id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-quote', id] });
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      toast({
        title: 'Order shipped!',
        description: 'Shipping information has been updated.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error updating shipping info',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const updateOrderStatusMutation = useMutation<void, Error, string>({
    mutationFn: async (status) => {
      if (!id) throw new Error('Order ID is required.');

      const updateData: Partial<Tables<'quotes'>> = { status };

      // DYNAMIC: Check if this status represents payment received
      const statusConfig = getStatusConfig(status, 'order');
      if (statusConfig?.isSuccessful && statusConfig?.countsAsOrder) {
        updateData.paid_at = new Date().toISOString();
        const { data: currentQuote, error: fetchError } = await supabase
          .from('quotes')
          .select('order_display_id, status')
          .eq('id', id)
          .single();

        if (fetchError) {
          throw new Error(`Failed to fetch quote details: ${fetchError.message}`);
        }

        if (currentQuote) {
          if (!currentQuote.order_display_id) {
            updateData.order_display_id = `ORD-${id.substring(0, 6).toUpperCase()}`;
          }
          // DYNAMIC: Check for payment method based on status name patterns
          if (currentQuote.status.includes('cod')) {
            updateData.payment_method = 'cod';
          } else if (
            currentQuote.status.includes('bank_transfer') ||
            currentQuote.status.includes('transfer')
          ) {
            updateData.payment_method = 'bank_transfer';
          }
        }
      }

      const { error } = await supabase.from('quotes').update(updateData).eq('id', id);
      if (error) throw new Error(error.message);
    },
    onSuccess: (_, status) => {
      queryClient.invalidateQueries({ queryKey: ['admin-quote', id] });
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      toast({
        title: 'Order status updated',
        description: `Order status changed to ${status}.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error updating status',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const confirmPaymentMutation = useMutation<void, Error, { amount: number; notes?: string }>({
    mutationFn: async ({ amount, notes } = { amount: 0 }) => {
      if (!id) throw new Error('Quote ID is required.');

      const { data: existingQuote, error: fetchError } = await supabase
        .from('quotes')
        .select('status, order_display_id, payment_method, final_total_usd, amount_paid')
        .eq('id', id)
        .single();

      if (fetchError) throw new Error(fetchError.message);
      if (
        existingQuote &&
        existingQuote.status === 'paid' &&
        existingQuote.amount_paid >= existingQuote.final_total
      ) {
        return;
      }

      // Create payment record
      const { error: paymentError } = await supabase.from('payment_records').insert({
        quote_id: id,
        amount: amount,
        payment_method: existingQuote?.payment_method || 'bank_transfer',
        notes: notes,
        recorded_by: (await supabase.auth.getUser()).data.user?.id,
      });

      if (paymentError) throw new Error(`Failed to create payment record: ${paymentError.message}`);

      // Calculate new total paid
      const currentPaid = existingQuote?.amount_paid || 0;
      const newTotalPaid = currentPaid + amount;
      const expectedAmount = existingQuote?.final_total_usd || 0;

      // DYNAMIC: Determine payment status using configuration
      let paymentStatus: string;
      let status: string = existingQuote?.status || 'payment_pending';

      if (newTotalPaid === 0) {
        const unpaidConfig = getPaymentStatusConfig('unpaid');
        paymentStatus = unpaidConfig?.name || 'unpaid';
      } else if (newTotalPaid < expectedAmount) {
        const partialConfig = getPaymentStatusConfig('partial');
        paymentStatus = partialConfig?.name || 'partial';
        // DYNAMIC: Find partial payment status from order configuration
        const partialStatusConfig = orderStatuses.find(
          (s) => s.name.includes('partial') || s.name.includes('partial_payment'),
        );
        status = partialStatusConfig?.name || 'partial_payment';
      } else if (newTotalPaid === expectedAmount) {
        const paidConfig = getPaymentStatusConfig('paid');
        paymentStatus = paidConfig?.name || 'paid';
        // DYNAMIC: Find paid status from order configuration
        const paidStatusConfig = orderStatuses.find(
          (s) => s.name === 'paid' || (s.isSuccessful && s.countsAsOrder),
        );
        status = paidStatusConfig?.name || 'paid';
      } else {
        const overpaidConfig = getPaymentStatusConfig('overpaid');
        paymentStatus = overpaidConfig?.name || 'overpaid';
        // Still mark as paid for overpayments
        const paidStatusConfig = orderStatuses.find(
          (s) => s.name === 'paid' || (s.isSuccessful && s.countsAsOrder),
        );
        status = paidStatusConfig?.name || 'paid';
      }

      const updateData: Partial<Tables<'quotes'>> = {
        // Remove amount_paid and payment_status - let the trigger calculate these
        // amount_paid: newTotalPaid,  // Trigger will calculate this from payment_records
        // payment_status: paymentStatus,  // Trigger will calculate this based on amount_paid
        status: status,
        in_cart: false,
      };

      // Add overpayment amount if applicable - but let trigger calculate exact amount
      // if (paymentStatus === 'overpaid') {
      //     updateData.overpayment_amount = newTotalPaid - expectedAmount;
      // }

      // DYNAMIC: Set paid_at when payment status is considered successful
      const currentPaymentConfig = getPaymentStatusConfig(paymentStatus);
      if (currentPaymentConfig?.isComplete || paymentStatus.includes('paid')) {
        updateData.paid_at = new Date().toISOString();
      }

      // Keep the existing payment method (don't override with 'cod')
      if (!existingQuote?.payment_method) {
        updateData.payment_method = 'bank_transfer'; // Default to bank_transfer for payment_pending orders
      }

      // DYNAMIC: Generate order ID when payment is considered complete
      const shouldGenerateOrderId =
        currentPaymentConfig?.isComplete || paymentStatus.includes('paid');
      if (existingQuote && !existingQuote.order_display_id && shouldGenerateOrderId) {
        updateData.order_display_id = `ORD-${id.substring(0, 6).toUpperCase()}`;
      }

      // Add notes if provided
      if (notes) {
        const paymentInfo = `Payment Record: ${amount} received - ${paymentStatus}`;
        updateData.internal_notes = existingQuote?.internal_notes
          ? `${existingQuote.internal_notes}\n\n${paymentInfo}\n${notes}`
          : `${paymentInfo}\n${notes}`;
      }

      const { error } = await supabase.from('quotes').update(updateData).eq('id', id);

      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quote', id] });
      queryClient.invalidateQueries({ queryKey: ['admin-quote', id] });
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      queryClient.invalidateQueries({ queryKey: ['admin-quotes'] });
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      toast({
        title: 'Payment confirmed!',
        description: 'Your order has been placed.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error confirming payment',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    updateShippingInfo: updateShippingInfoMutation.mutate,
    isUpdatingShipping: updateShippingInfoMutation.isPending,
    updateOrderStatus: updateOrderStatusMutation.mutate,
    isUpdatingStatus: updateOrderStatusMutation.isPending,
    confirmPayment: confirmPaymentMutation.mutate,
    isConfirmingPayment: confirmPaymentMutation.isPending,
    isSuccess: confirmPaymentMutation.isSuccess,
    isError: confirmPaymentMutation.isError,
  };
};
