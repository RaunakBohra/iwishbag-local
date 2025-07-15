import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { useToast } from "@/hooks/use-toast";
import { useDebounce } from "@/hooks/useDebounce";
import { useNavigate } from "react-router-dom";
import { useStatusManagement } from "@/hooks/useStatusManagement";

type QuoteWithItems = Tables<'quotes'> & {
  quote_items: Tables<'quote_items'>[];
  profiles?: { 
    full_name?: string;
    email?: string;
    phone?: string;
    preferred_display_currency?: string;
  } | null;
};

export const useQuoteManagement = (filters = {}) => {
    const {
        purchaseCountryFilter = 'all',
        shippingCountryFilter = 'all',
        statusFilter = "all",
        searchInput = "",
        dateRange = "all",
        amountRange = "all",
        priorityFilter = "all",
    } = filters;
    
    // Internal state management
    const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
    const [selectedQuoteIds, setSelectedQuoteIds] = useState<string[]>([]);
    const [activeStatusUpdate, setActiveStatusUpdate] = useState<string | null>(null);
    
    const searchTerm = useDebounce(searchInput, 500);
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { toast } = useToast();
    const { getStatusesForQuotesList, getStatusConfig, quoteStatuses } = useStatusManagement();

    const { data: quotes, isLoading: quotesLoading } = useQuery<QuoteWithItems[]>({
        queryKey: ['admin-quotes', statusFilter, searchTerm, purchaseCountryFilter, shippingCountryFilter, dateRange, amountRange, priorityFilter],
        queryFn: async () => {
            let query = supabase
                .from('quotes')
                .select('*, quote_items(*), profiles!quotes_user_id_fkey(full_name, email, phone, preferred_display_currency)')
                .order('created_at', { ascending: false });
            
            // Filter based on status management configuration
            // Only show quotes with statuses that are configured to show in quotes list
            const quoteStatusNames = getStatusesForQuotesList();
            console.log('DEBUG: Quote statuses allowed in quotes list:', quoteStatusNames);
            
            if (statusFilter !== 'all') {
                // Check if the selected status is allowed in quotes list
                if (quoteStatusNames.includes(statusFilter)) {
                    query = query.eq('status', statusFilter);
                } else {
                    // If selected status is not allowed, show all allowed statuses
                    console.log(`DEBUG: Status '${statusFilter}' is not allowed in quotes list, showing all allowed statuses`);
                    if (quoteStatusNames.length > 0) {
                        query = query.in('status', quoteStatusNames);
                    }
                }
            } else {
                // No specific status selected, show all allowed statuses
                if (quoteStatusNames.length > 0) {
                    query = query.in('status', quoteStatusNames);
                }
            }

            if (purchaseCountryFilter && purchaseCountryFilter !== 'all') {
                query = query.eq('origin_country', purchaseCountryFilter);
            }

            if (shippingCountryFilter && shippingCountryFilter !== 'all') {
                query = query.eq('destination_country', shippingCountryFilter);
            }

            if (priorityFilter && priorityFilter !== 'all') {
                query = query.eq('priority', priorityFilter);
            }

            // Date filter
            if (dateRange && dateRange !== 'all') {
                const now = new Date();
                let startDate: Date | null = null;
                switch (dateRange) {
                    case 'today':
                        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                        break;
                    case 'yesterday':
                        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
                        break;
                    case '7days':
                        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                        break;
                    case '30days':
                        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                        break;
                    case '90days':
                        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
                        break;
                    case 'thisMonth':
                        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                        break;
                    case 'lastMonth':
                        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                        break;
                    default:
                        startDate = null;
                }
                if (startDate) {
                    query = query.gte('created_at', startDate.toISOString());
                }
            }

            // Amount filter
            if (amountRange && amountRange !== 'all') {
                switch (amountRange) {
                    case '0-100':
                        query = query.gte('final_total', 0).lte('final_total', 100);
                        break;
                    case '100-500':
                        query = query.gte('final_total', 100).lte('final_total', 500);
                        break;
                    case '500-1000':
                        query = query.gte('final_total', 500).lte('final_total', 1000);
                        break;
                    case '1000-5000':
                        query = query.gte('final_total', 1000).lte('final_total', 5000);
                        break;
                    case '5000+':
                        query = query.gte('final_total', 5000);
                        break;
                }
            }

            if (searchTerm) {
                const searchString = `%${searchTerm}%`;
                query = query.or(`product_name.ilike.${searchString},email.ilike.${searchString},display_id.ilike.${searchString},destination_country.ilike.${searchString}`);
            }
        
            // Debug: print the query object
            console.log('DEBUG: Final Supabase query for quotes:', query);
            // Log the final query string (for REST API)
            console.log('DEBUG: Query URL:', query.url.toString());
            const { data, error } = await query;
            if (error) throw new Error(error.message);
            return data || [];
        },
        enabled: true, // Always run query - filtering is handled by getStatusesForQuotesList
    });

    const updateMultipleQuotesStatusMutation = useMutation({
        mutationFn: async ({ ids, status }: { ids: string[], status: string }) => {
            const updateObject: Partial<Tables<'quotes'>> = { status };

            // DYNAMIC: Check if this status represents a paid state
            const statusConfig = getStatusConfig(status, 'order');
            if (statusConfig?.isSuccessful && statusConfig?.countsAsOrder) {
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
                        // DYNAMIC: Check for payment pending statuses
                        if (currentQuote.status.includes('cod_pending') || currentQuote.status.includes('cod')) {
                            singleUpdate.payment_method = 'cod';
                        } else if (currentQuote.status.includes('bank_transfer') || currentQuote.status.includes('transfer')) {
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
            // DYNAMIC: Use rejected status from configuration or fallback
            const rejectedStatusConfig = quoteStatuses.find(s => s.name === 'rejected' || s.id === 'rejected');
            const rejectedStatus = rejectedStatusConfig?.name || 'rejected';
            
            const { error } = await supabase
                .from('quotes')
                .update({ 
                    status: rejectedStatus,
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
            setIsRejectDialogOpen(false);
            toast({ title: "Quotes rejected successfully" });
        },
        onError: (error: Error) => {
            toast({ title: "Error rejecting quotes", description: error.message, variant: "destructive" });
        }
    });

    const deleteQuotesMutation = useMutation({
        mutationFn: async (ids: string[]) => {
            const { error } = await supabase
                .from('quotes')
                .delete()
                .in('id', ids);
            if (error) throw new Error(error.message);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-quotes'] });
            setSelectedQuoteIds([]);
            toast({ title: "Quotes deleted successfully" });
        },
        onError: (error: Error) => {
            toast({ title: "Error deleting quotes", description: error.message, variant: "destructive" });
        }
    });

    const handleToggleSelectQuote = (id: string, selected?: boolean) => {
        setSelectedQuoteIds(prev => {
            if (selected !== undefined) {
                // If selected is explicitly provided, use it
                return selected 
                    ? [...prev, id]
                    : prev.filter(quoteId => quoteId !== id);
            } else {
                // Toggle behavior for backward compatibility
                return prev.includes(id) 
                    ? prev.filter(quoteId => quoteId !== id) 
                    : [...prev, id];
            }
        });
    };

    const handleToggleSelectAll = (checked: boolean | "indeterminate") => {
        if (checked) {
            setSelectedQuoteIds(quotes?.map(q => q.id) || []);
        } else {
            setSelectedQuoteIds([]);
        }
    };

    const handleBulkAction = (action: 'approved' | 'cancelled' | 'confirm_payment' | 'email' | 'export' | 'duplicate' | 'priority') => {
        if (!selectedQuoteIds.length) return;

        if (action === 'cancelled') {
            handleBulkReject();
        } else if (action === 'approved' || action === 'confirm_payment') {
            handleBulkApprove();
        } else if (action === 'export') {
            handleBulkExport();
        } else if (action === 'email') {
            handleBulkEmail();
        } else if (action === 'duplicate') {
            handleBulkDuplicate();
        } else if (action === 'priority') {
            handleBulkPriority();
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
        navigate(`/admin/quotes/${quoteId}`);
    };

    const handleDeleteQuotes = () => {
        if (selectedQuoteIds.length === 0) return;
        deleteQuotesMutation.mutate(selectedQuoteIds);
    };

    const isUpdatingStatus = updateMultipleQuotesStatusMutation.isPending;
    const isRejecting = updateMultipleQuotesRejectionMutation.isPending;
    const isProcessing = isUpdatingStatus || isRejecting;
    const isDeletingQuotes = deleteQuotesMutation.isPending;

    return {
        quotes,
        quotesLoading,
        isRejectDialogOpen,
        setRejectDialogOpen: setIsRejectDialogOpen,
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
        handleDeleteQuotes,
        isDeletingQuotes,
    };
};
