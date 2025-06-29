
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Tables } from "@/integrations/supabase/types";

type Quote = Tables<'quotes'>;

export const useOptimisticCartMutations = () => {
    const queryClient = useQueryClient();
    const { user } = useAuth();

    const optimisticUpdate = (quoteId: string, inCart: boolean) => {
        const queryKey = ['user-quotes-and-orders', user?.id];
        
        queryClient.setQueryData(queryKey, (oldData: Quote[] | undefined) => {
            if (!oldData) return oldData;
            
            return oldData.map(quote => 
                quote.id === quoteId 
                    ? { ...quote, in_cart: inCart }
                    : quote
            );
        });
    };

    const optimisticBulkUpdate = (quoteIds: string[], inCart: boolean) => {
        const queryKey = ['user-quotes-and-orders', user?.id];
        
        queryClient.setQueryData(queryKey, (oldData: Quote[] | undefined) => {
            if (!oldData) return oldData;
            
            return oldData.map(quote => 
                quoteIds.includes(quote.id)
                    ? { ...quote, in_cart: inCart }
                    : quote
            );
        });
    };

    const rollbackUpdate = () => {
        queryClient.invalidateQueries({ queryKey: ['user-quotes-and-orders', user?.id] });
        queryClient.invalidateQueries({ queryKey: ['approved-quotes', user?.id] });
    };

    const addToCartMutation = useMutation({
        mutationFn: async (quoteId: string) => {
            const { error } = await supabase
                .from('quotes')
                .update({ in_cart: true })
                .eq('id', quoteId);

            if (error) {
                throw new Error(error.message);
            }
        },
        onMutate: (quoteId: string) => {
            optimisticUpdate(quoteId, true);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['approved-quotes', user?.id] });
            queryClient.invalidateQueries({ queryKey: ['user-quotes-and-orders', user?.id] });
        },
        onError: (error: Error, quoteId: string) => {
            rollbackUpdate();
            throw error; // Re-throw for caller to handle
        },
    });

    const removeFromCartMutation = useMutation({
        mutationFn: async (quoteId: string) => {
            const { error } = await supabase
                .from('quotes')
                .update({ in_cart: false })
                .eq('id', quoteId);

            if (error) {
                throw new Error(error.message);
            }
        },
        onMutate: (quoteId: string) => {
            optimisticUpdate(quoteId, false);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['approved-quotes', user?.id] });
            queryClient.invalidateQueries({ queryKey: ['user-quotes-and-orders', user?.id] });
        },
        onError: (error: Error, quoteId: string) => {
            rollbackUpdate();
            throw error; // Re-throw for caller to handle
        },
    });

    const bulkAddToCartMutation = useMutation({
        mutationFn: async (quoteIds: string[]) => {
            const { error } = await supabase
                .from('quotes')
                .update({ in_cart: true })
                .in('id', quoteIds);
            if (error) throw new Error(error.message);
            return quoteIds.length;
        },
        onMutate: (quoteIds: string[]) => {
            optimisticBulkUpdate(quoteIds, true);
        },
        onSuccess: (count) => {
            queryClient.invalidateQueries({ queryKey: ['approved-quotes', user?.id] });
            queryClient.invalidateQueries({ queryKey: ['user-quotes-and-orders', user?.id] });
        },
        onError: (error: Error, quoteIds: string[]) => {
            rollbackUpdate();
            throw error; // Re-throw for caller to handle
        },
    });

    const bulkRemoveFromCartMutation = useMutation({
        mutationFn: async (quoteIds: string[]) => {
            const { error } = await supabase
                .from('quotes')
                .update({ in_cart: false })
                .in('id', quoteIds);
            if (error) throw new Error(error.message);
            return quoteIds.length;
        },
        onMutate: (quoteIds: string[]) => {
            optimisticBulkUpdate(quoteIds, false);
        },
        onSuccess: (count) => {
            queryClient.invalidateQueries({ queryKey: ['approved-quotes', user?.id] });
            queryClient.invalidateQueries({ queryKey: ['user-quotes-and-orders', user?.id] });
        },
        onError: (error: Error, quoteIds: string[]) => {
            rollbackUpdate();
            throw error; // Re-throw for caller to handle
        },
    });

    return {
        addToCart: addToCartMutation.mutate,
        isAddingToCart: addToCartMutation.isPending,
        removeFromCart: removeFromCartMutation.mutate,
        isRemovingFromCart: removeFromCartMutation.isPending,
        bulkAddToCart: bulkAddToCartMutation.mutate,
        isAddingBulk: bulkAddToCartMutation.isPending,
        bulkRemoveFromCart: bulkRemoveFromCartMutation.mutate,
        isRemovingBulk: bulkRemoveFromCartMutation.isPending,
    };
};
