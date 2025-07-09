import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { Tables } from "@/integrations/supabase/types";

export type ShippingData = {
    shipping_carrier: string;
    tracking_number: string;
};

export const useOrderMutations = (id: string | undefined) => {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    const updateShippingInfoMutation = useMutation<void, Error, ShippingData>({
        mutationFn: async (shippingData) => {
            if (!id) throw new Error("Order ID is required.");
            const { error } = await supabase
                .from('quotes')
                .update({
                    ...shippingData,
                    status: 'shipped',
                    shipped_at: new Date().toISOString(),
                })
                .eq('id', id);
            if (error) throw new Error(error.message);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-quote', id] });
            queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
            toast({ title: "Order shipped!", description: "Shipping information has been updated." });
        },
        onError: (error: Error) => {
            toast({ title: "Error updating shipping info", description: error.message, variant: "destructive" });
        }
    });

    const updateOrderStatusMutation = useMutation<void, Error, string>({
        mutationFn: async (status) => {
            if (!id) throw new Error("Order ID is required.");

            const updateData: Partial<Tables<'quotes'>> = { status };

            if (status === 'paid') {
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
                    if (currentQuote.status === 'cod_pending') {
                        updateData.payment_method = 'cod';
                    } else if (currentQuote.status === 'bank_transfer_pending') {
                        updateData.payment_method = 'bank_transfer';
                    }
                }
            }

            const { error } = await supabase
                .from('quotes')
                .update(updateData)
                .eq('id', id);
            if (error) throw new Error(error.message);
        },
        onSuccess: (_, status) => {
            queryClient.invalidateQueries({ queryKey: ['admin-quote', id] });
            queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
            toast({ title: "Order status updated", description: `Order status changed to ${status}.` });
        },
        onError: (error: Error) => {
            toast({ title: "Error updating status", description: error.message, variant: "destructive" });
        }
    });

    const confirmPaymentMutation = useMutation<void, Error, { amount: number; notes?: string }>({
        mutationFn: async ({ amount, notes } = { amount: 0 }) => {
            if (!id) throw new Error("Quote ID is required.");

            const { data: existingQuote, error: fetchError } = await supabase
                .from('quotes')
                .select('status, order_display_id, payment_method, final_total, amount_paid')
                .eq('id', id)
                .single();

            if (fetchError) throw new Error(fetchError.message);
            if (existingQuote && existingQuote.status === 'paid' && existingQuote.amount_paid >= existingQuote.final_total) {
                return;
            }
            
            // Create payment record
            const { error: paymentError } = await supabase
                .from('payment_records')
                .insert({
                    quote_id: id,
                    amount: amount,
                    payment_method: existingQuote?.payment_method || 'bank_transfer',
                    notes: notes,
                    recorded_by: (await supabase.auth.getUser()).data.user?.id
                });

            if (paymentError) throw new Error(`Failed to create payment record: ${paymentError.message}`);

            // Calculate new total paid
            const currentPaid = existingQuote?.amount_paid || 0;
            const newTotalPaid = currentPaid + amount;
            const expectedAmount = existingQuote?.final_total || 0;
            
            // Determine payment status
            let paymentStatus: string;
            let status: string = existingQuote?.status || 'payment_pending';
            
            if (newTotalPaid === 0) {
                paymentStatus = 'unpaid';
            } else if (newTotalPaid < expectedAmount) {
                paymentStatus = 'partial';
                status = 'partial_payment';
            } else if (newTotalPaid === expectedAmount) {
                paymentStatus = 'paid';
                status = 'paid';
            } else {
                paymentStatus = 'overpaid';
                status = 'paid'; // Still mark as paid for overpayments
            }
            
            const updateData: Partial<Tables<'quotes'>> = { 
                amount_paid: newTotalPaid,
                payment_status: paymentStatus,
                status: status,
                in_cart: false,
            };

            // Add overpayment amount if applicable
            if (paymentStatus === 'overpaid') {
                updateData.overpayment_amount = newTotalPaid - expectedAmount;
            }

            // Set paid_at only when fully paid
            if (paymentStatus === 'paid' || paymentStatus === 'overpaid') {
                updateData.paid_at = new Date().toISOString();
            }
            
            // Keep the existing payment method (don't override with 'cod')
            if (!existingQuote?.payment_method) {
                updateData.payment_method = 'bank_transfer'; // Default to bank_transfer for payment_pending orders
            }
            
            if (existingQuote && !existingQuote.order_display_id && (paymentStatus === 'paid' || paymentStatus === 'overpaid')) {
                updateData.order_display_id = `ORD-${id.substring(0, 6).toUpperCase()}`;
            }

            // Add notes if provided
            if (notes) {
                const paymentInfo = `Payment Record: ${amount} received - ${paymentStatus}`;
                updateData.internal_notes = existingQuote?.internal_notes 
                    ? `${existingQuote.internal_notes}\n\n${paymentInfo}\n${notes}`
                    : `${paymentInfo}\n${notes}`;
            }

            const { error } = await supabase
                .from('quotes')
                .update(updateData)
                .eq('id', id);

            if (error) throw new Error(error.message);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['quote', id] });
            queryClient.invalidateQueries({ queryKey: ['admin-quote', id] });
            queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
            queryClient.invalidateQueries({ queryKey: ['admin-quotes'] });
            queryClient.invalidateQueries({ queryKey: ['quotes'] });
            toast({ title: "Payment confirmed!", description: "Your order has been placed." });
        },
        onError: (error: Error) => {
            toast({ title: "Error confirming payment", description: error.message, variant: "destructive" });
        }
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
