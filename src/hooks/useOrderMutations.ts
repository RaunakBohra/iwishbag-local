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

    const confirmPaymentMutation = useMutation<void, Error, void>({
        mutationFn: async () => {
            if (!id) throw new Error("Quote ID is required.");

            const { data: existingQuote, error: fetchError } = await supabase
                .from('quotes')
                .select('status, order_display_id')
                .eq('id', id)
                .single();

            if (fetchError) throw new Error(fetchError.message);
            if (existingQuote && existingQuote.status === 'paid') {
                return;
            }
            
            const updateData: Partial<Tables<'quotes'>> = { 
                status: 'paid',
                paid_at: new Date().toISOString(),
                payment_method: 'stripe',
                in_cart: false, // <<< ADD in_cart: false here
            };
            
            if (existingQuote && !existingQuote.order_display_id) {
                updateData.order_display_id = `ORD-${id.substring(0, 6).toUpperCase()}`;
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
