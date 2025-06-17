
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { useToast } from "@/hooks/use-toast";
import { useDebounce } from "@/hooks/useDebounce";
import { useNavigate } from "react-router-dom";

type QuoteWithItems = Tables<'quotes'> & {
  quote_items: Tables<'quote_items'>[];
  rejection_reasons: { reason: string } | null;
};

export const useQuoteManagement = () => {
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [searchInput, setSearchInput] = useState("");
    const searchTerm = useDebounce(searchInput, 500);
    const [isCreateDialogOpen, setCreateDialogOpen] = useState(false);
    const [isRejectDialogOpen, setRejectDialogOpen] = useState(false);
    const [selectedQuoteIds, setSelectedQuoteIds] = useState<string[]>([]);
    const [activeStatusUpdate, setActiveStatusUpdate] = useState<string | null>(null);
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { toast } = useToast();

    const { data: quotes, isLoading: quotesLoading } = useQuery<QuoteWithItems[]>({
        queryKey: ['admin-quotes', statusFilter, searchTerm],
        queryFn: async () => {
            let query = supabase
                .from('quotes')
                .select('*, quote_items(*), rejection_reasons(reason)')
                .order('created_at', { ascending: false });
        
            if (statusFilter !== 'all') {
                query = query.eq('status', statusFilter);
            }

            if (searchTerm) {
                const searchString = `%${searchTerm}%`;
                query = query.or(`product_name.ilike.${searchString},email.ilike.${searchString},display_id.ilike.${searchString},country_code.ilike.${searchString}`);
            }
        
            const { data, error } = await query;
            if (error) throw new Error(error.message);
            return data || [];
        }
    });

    const updateMultipleQuotesStatusMutation = useMutation({
        mutationFn: async ({ ids, status }: { ids: string[], status: string }) => {
            const updateObject: Partial<Tables<'quotes'>> = { status };

            if (status === 'paid') {
                updateObject.paid_at = new Date().toISOString();

                for (const quoteId of ids) {
                    const { data: currentQuote, error: fetchError } = await supabase
                        .from('quotes')
                        .select('order_display_id, status')
                        .eq('id', quoteId)
                        .single();

                    if (fetchError) {
                        console.error(`Failed to fetch quote ${quoteId}: ${fetchError.message}`);
                        continue;
                    }
                    
                    const singleUpdate: Partial<Tables<'quotes'>> = { ...updateObject };
                    if (currentQuote) {
                        if (!currentQuote.order_display_id) {
                            singleUpdate.order_display_id = `ORD-${quoteId.substring(0, 6).toUpperCase()}`;
                        }
                        if (currentQuote.status === 'cod_pending') {
                            singleUpdate.payment_method = 'cod';
                        } else if (currentQuote.status === 'bank_transfer_pending') {
                            singleUpdate.payment_method = 'bank_transfer';
                        }
                    }

                    const { error } = await supabase
                        .from('quotes')
                        .update(singleUpdate)
                        .eq('id', quoteId);

                    if (error) throw new Error(`Failed to update quote ${quoteId}: ${error.message}`);
                }
                return;
            }

            const { error } = await supabase
                .from('quotes')
                .update(updateObject)
                .in('id', ids);
            if (error) throw new Error(error.message);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-quotes'] });
            setSelectedQuoteIds([]);
            toast({ title: "Quotes updated successfully" });
        },
        onError: (error: Error) => {
            toast({ title: "Error updating quotes", description: error.message, variant: "destructive" });
        },
        onSettled: () => {
            setActiveStatusUpdate(null);
        },
    });

    const updateMultipleQuotesRejectionMutation = useMutation({
        mutationFn: async ({ ids, reasonId, details }: { ids: string[], reasonId: string, details: string }) => {
            const { error } = await supabase
                .from('quotes')
                .update({ 
                    status: 'cancelled',
                    rejection_reason_id: reasonId,
                    rejection_details: details,
                    rejected_at: new Date().toISOString()
                 })
                .in('id', ids);
            if (error) throw new Error(error.message);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-quotes'] });
            setSelectedQuoteIds([]);
            setRejectDialogOpen(false);
            toast({ title: "Quotes rejected successfully" });
        },
        onError: (error: Error) => {
            toast({ title: "Error rejecting quotes", description: error.message, variant: "destructive" });
        }
    });

    const handleToggleSelectQuote = (id: string) => {
        setSelectedQuoteIds(prev =>
            prev.includes(id) ? prev.filter(quoteId => quoteId !== id) : [...prev, id]
        );
    };

    const handleToggleSelectAll = () => {
        if (selectedQuoteIds.length === quotes?.length) {
            setSelectedQuoteIds([]);
        } else {
            setSelectedQuoteIds(quotes?.map(q => q.id) || []);
        }
    };

    const handleBulkAction = (action: 'accepted' | 'cancelled' | 'confirm_payment') => {
        if (selectedQuoteIds.length === 0) return;

        if (action === 'cancelled') {
            setRejectDialogOpen(true);
        } else if (action === 'accepted' || action === 'confirm_payment') {
            const status = action === 'confirm_payment' ? 'paid' : action;
            setActiveStatusUpdate(action);
            updateMultipleQuotesStatusMutation.mutate({ ids: selectedQuoteIds, status });
        }
    };

    const handleConfirmRejection = (reasonId: string, details: string) => {
        if (selectedQuoteIds.length === 0) return;
        updateMultipleQuotesRejectionMutation.mutate({ ids: selectedQuoteIds, reasonId, details });
    };

    const downloadCSV = () => {
        if (!quotes) return;
    
        const csvContent = [
            ['Quote ID', 'Product', 'Email', 'Status', 'Price', 'Total', 'Created', 'Internal ID'].join(','),
            ...quotes.map(quote => [
                quote.display_id || '',
                quote.product_name,
                quote.email,
                quote.status,
                quote.item_price || '',
                quote.final_total || '',
                new Date(quote.created_at).toLocaleDateString(),
                quote.id
            ].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'quotes.csv';
        a.click();
        window.URL.revokeObjectURL(url);
    };

    const handleQuoteCreated = (quoteId: string) => {
        setCreateDialogOpen(false);
        navigate(`/admin/quotes/${quoteId}`);
    };

    const isUpdatingStatus = updateMultipleQuotesStatusMutation.isPending;
    const isRejecting = updateMultipleQuotesRejectionMutation.isPending;
    const isProcessing = isUpdatingStatus || isRejecting;

    return {
        statusFilter,
        setStatusFilter,
        searchInput,
        setSearchInput,
        quotes,
        quotesLoading,
        isCreateDialogOpen,
        setCreateDialogOpen,
        isRejectDialogOpen,
        setRejectDialogOpen,
        selectedQuoteIds,
        handleToggleSelectQuote,
        handleToggleSelectAll,
        handleBulkAction,
        handleConfirmRejection,
        downloadCSV,
        handleQuoteCreated,
        isProcessing,
        isUpdatingStatus,
        updateMultipleQuotesRejectionIsPending: isRejecting,
        activeStatusUpdate,
    };
};
