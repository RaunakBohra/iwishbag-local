import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/contexts/AuthContext";

export const useCartMutations = () => {
    const queryClient = useQueryClient();
    const { toast } = useToast();
    const { user } = useAuth();

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
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['approved-quotes', user?.id] });
            queryClient.invalidateQueries({ queryKey: ['user-quotes-and-orders', user?.id] });
            toast({ title: "Item removed from cart." });
        },
        onError: (error: Error) => {
            toast({
                title: "Error removing item",
                description: error.message,
                variant: "destructive",
            });
        },
    });

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
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['approved-quotes', user?.id] });
            queryClient.invalidateQueries({ queryKey: ['user-quotes-and-orders', user?.id] });
            toast({ title: "Item added to cart." });
        },
        onError: (error: Error) => {
            toast({
                title: "Error adding item to cart",
                description: error.message,
                variant: "destructive",
            });
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
        onSuccess: (count) => {
            queryClient.invalidateQueries({ queryKey: ['approved-quotes', user?.id] });
            queryClient.invalidateQueries({ queryKey: ['user-quotes-and-orders', user?.id] });
            toast({ title: `${count} item(s) added to cart.` });
        },
        onError: (error: Error) => {
            toast({
                title: "Error adding items to cart",
                description: error.message,
                variant: "destructive",
            });
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
        onSuccess: (count) => {
            queryClient.invalidateQueries({ queryKey: ['approved-quotes', user?.id] });
            queryClient.invalidateQueries({ queryKey: ['user-quotes-and-orders', user?.id] });
            toast({ title: `${count} item(s) removed from cart.` });
        },
        onError: (error: Error) => {
            toast({
                title: "Error removing items from cart",
                description: error.message,
                variant: "destructive",
            });
        },
    });

    return {
        removeFromCart: removeFromCartMutation.mutate,
        isRemovingFromCart: removeFromCartMutation.isPending,
        addToCart: addToCartMutation.mutate,
        isAddingToCart: addToCartMutation.isPending,
        bulkAddToCart: bulkAddToCartMutation.mutate,
        isAddingBulk: bulkAddToCartMutation.isPending,
        bulkRemoveFromCart: bulkRemoveFromCartMutation.mutate,
        isRemovingBulk: bulkRemoveFromCartMutation.isPending,
    };
};
