import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

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
            toast({
                title: "Success",
                description: "Removed from cart",
            });
        },
        onError: (error: Error) => {
            toast({
                title: "Error",
                description: "Failed to remove from cart",
                variant: "destructive",
            });
            console.error('Remove from cart error:', error);
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
            toast({
                title: "Success",
                description: "Added to cart",
            });
        },
        onError: (error: Error) => {
            toast({
                title: "Error",
                description: "Failed to add to cart",
                variant: "destructive",
            });
            console.error('Add to cart error:', error);
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
                title: "Error",
                description: "Failed to add items to cart",
                variant: "destructive",
            });
            console.error('Add to cart error:', error);
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
                title: "Error",
                description: "Failed to remove items from cart",
                variant: "destructive",
            });
            console.error('Remove from cart error:', error);
        },
    });

    const moveToCartMutation = useMutation({
        mutationFn: async (quoteId: string) => {
            const { error } = await supabase
                .from('quotes')
                .update({ in_cart: true })
                .eq('id', quoteId);
            
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['approved-quotes'] });
            queryClient.invalidateQueries({ queryKey: ['saved-quotes'] });
            toast({
                title: "Success",
                description: "Moved to cart",
            });
        },
        onError: (error) => {
            toast({
                title: "Error",
                description: "Failed to move to cart",
                variant: "destructive",
            });
            console.error('Move to cart error:', error);
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
        moveToCart: moveToCartMutation.mutate,
    };
};
