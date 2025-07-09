import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { useToast } from "@/hooks/use-toast";
import { useDebounce } from "@/hooks/useDebounce";
import { useNavigate } from "react-router-dom";
import { useStatusManagement } from "@/hooks/useStatusManagement";
import { usePagination } from "@/hooks/usePagination";

type QuoteWithItems = Tables<'quotes'> & {
  quote_items: Tables<'quote_items'>[];
  profiles?: { preferred_display_currency?: string } | null;
};

export const usePaginatedQuoteManagement = (filters = {}) => {
    const {
        purchaseCountryFilter = 'all',
        shippingCountryFilter = 'all',
        statusFilter = "all",
        searchInput = "",
        dateRange = "all",
        amountRange = "all",
        priorityFilter = "all",
    } = filters;
    
    // Pagination state
    const pagination = usePagination({
        initialPageSize: 25,
        pageSizeOptions: [10, 25, 50, 100],
        useUrlState: true
    });
    
    // Internal state management
    const [isRejectDialogOpen, setRejectDialogOpen] = useState(false);
    const [selectedQuoteIds, setSelectedQuoteIds] = useState<string[]>([]);
    const [activeStatusUpdate, setActiveStatusUpdate] = useState<string | null>(null);
    
    const searchTerm = useDebounce(searchInput, 500);
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { toast } = useToast();
    const { getStatusesForQuotesList } = useStatusManagement();

    // Fetch total count
    const { data: countData } = useQuery({
        queryKey: ['admin-quotes-count', statusFilter, searchTerm, purchaseCountryFilter, shippingCountryFilter, dateRange, amountRange, priorityFilter],
        queryFn: async () => {
            let query = supabase
                .from('quotes')
                .select('id', { count: 'exact', head: true });
            
            // Apply all the same filters as the main query
            // Temporarily disable status filtering to see all quotes
            // const quoteStatusNames = getStatusesForQuotesList() || [];
            // if (quoteStatusNames.length > 0) {
            //     query = query.in('status', quoteStatusNames);
            // }
        
            if (statusFilter !== 'all') {
                query = query.eq('status', statusFilter);
            }

            if (purchaseCountryFilter && purchaseCountryFilter !== 'all') {
                query = query.eq('origin_country', purchaseCountryFilter);
            }

            if (shippingCountryFilter && shippingCountryFilter !== 'all') {
                query = query.eq('country_code', shippingCountryFilter);
            }

            if (priorityFilter && priorityFilter !== 'all') {
                query = query.eq('priority', priorityFilter);
            }

            // Apply date filter
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
                }
                if (startDate) {
                    query = query.gte('created_at', startDate.toISOString());
                }
            }

            // Apply amount filter
            if (amountRange && amountRange !== 'all') {
                switch (amountRange) {
                    case 'under50':
                        query = query.lt('final_total', 50);
                        break;
                    case '50to100':
                        query = query.gte('final_total', 50).lt('final_total', 100);
                        break;
                    case '100to500':
                        query = query.gte('final_total', 100).lt('final_total', 500);
                        break;
                    case '500to1000':
                        query = query.gte('final_total', 500).lt('final_total', 1000);
                        break;
                    case 'over1000':
                        query = query.gte('final_total', 1000);
                        break;
                }
            }
            
            if (searchTerm) {
                query = query.or(`product_name.ilike.%${searchTerm}%,id.ilike.%${searchTerm}%`);
            }

            const { count, error } = await query;
            if (error) throw error;
            return count || 0;
        },
        enabled: true
    });

    // Update total count when it changes
    if (countData !== undefined && countData !== pagination.totalCount) {
        pagination.setTotalCount(countData);
    }

    // Fetch paginated quotes
    const { data: quotes, isLoading: quotesLoading } = useQuery<QuoteWithItems[]>({
        queryKey: ['admin-quotes', statusFilter, searchTerm, purchaseCountryFilter, shippingCountryFilter, dateRange, amountRange, priorityFilter, pagination.currentPage, pagination.pageSize],
        queryFn: async () => {
            let query = supabase
                .from('quotes')
                .select('*, quote_items(*), profiles!quotes_user_id_fkey(preferred_display_currency)')
                .order('created_at', { ascending: false })
                .range(pagination.pageRange.from, pagination.pageRange.to);
            
            // Apply all filters (same as count query)
            // Temporarily disable status filtering to see all quotes
            // const quoteStatusNames = getStatusesForQuotesList() || [];
            // if (quoteStatusNames.length > 0) {
            //     query = query.in('status', quoteStatusNames);
            // }
        
            if (statusFilter !== 'all') {
                query = query.eq('status', statusFilter);
            }

            if (purchaseCountryFilter && purchaseCountryFilter !== 'all') {
                query = query.eq('origin_country', purchaseCountryFilter);
            }

            if (shippingCountryFilter && shippingCountryFilter !== 'all') {
                query = query.eq('country_code', shippingCountryFilter);
            }

            if (priorityFilter && priorityFilter !== 'all') {
                query = query.eq('priority', priorityFilter);
            }

            // Apply date filter
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
                }
                if (startDate) {
                    query = query.gte('created_at', startDate.toISOString());
                }
            }

            // Apply amount filter
            if (amountRange && amountRange !== 'all') {
                switch (amountRange) {
                    case 'under50':
                        query = query.lt('final_total', 50);
                        break;
                    case '50to100':
                        query = query.gte('final_total', 50).lt('final_total', 100);
                        break;
                    case '100to500':
                        query = query.gte('final_total', 100).lt('final_total', 500);
                        break;
                    case '500to1000':
                        query = query.gte('final_total', 500).lt('final_total', 1000);
                        break;
                    case 'over1000':
                        query = query.gte('final_total', 1000);
                        break;
                }
            }
            
            if (searchTerm) {
                query = query.or(`product_name.ilike.%${searchTerm}%,id.ilike.%${searchTerm}%`);
            }

            const { data, error } = await query;
            if (error) throw error;
            return data || [];
        }
    });

    // Update status mutation
    const updateStatusMutation = useMutation({
        mutationFn: async ({ quoteIds, newStatus }: { quoteIds: string[], newStatus: string }) => {
            const { error } = await supabase
                .from('quotes')
                .update({ status: newStatus })
                .in('id', quoteIds);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-quotes'] });
            queryClient.invalidateQueries({ queryKey: ['admin-quotes-count'] });
            toast({
                title: "Success",
                description: "Quote status updated successfully",
            });
            setSelectedQuoteIds([]);
        },
        onError: (error) => {
            toast({
                title: "Error",
                description: error.message,
                variant: "destructive",
            });
        },
    });

    const handleStatusUpdate = async (quoteIds: string[], newStatus: string) => {
        setActiveStatusUpdate(newStatus);
        try {
            await updateStatusMutation.mutateAsync({ quoteIds, newStatus });
        } finally {
            setActiveStatusUpdate(null);
        }
    };

    const handleViewQuote = (quoteId: string) => {
        navigate(`/admin/quotes/${quoteId}`);
    };

    const handleRejectQuote = (quoteIds: string[]) => {
        setSelectedQuoteIds(quoteIds);
        setRejectDialogOpen(true);
    };

    const handleBulkStatusUpdate = async (newStatus: string) => {
        if (selectedQuoteIds.length === 0) {
            toast({
                title: "No quotes selected",
                description: "Please select at least one quote to update",
                variant: "destructive",
            });
            return;
        }
        await handleStatusUpdate(selectedQuoteIds, newStatus);
    };

    const toggleQuoteSelection = (quoteId: string) => {
        setSelectedQuoteIds(prev => 
            prev.includes(quoteId) 
                ? prev.filter(id => id !== quoteId)
                : [...prev, quoteId]
        );
    };

    const selectAllQuotes = () => {
        if (quotes) {
            setSelectedQuoteIds(quotes.map(q => q.id));
        }
    };

    const clearSelection = () => {
        setSelectedQuoteIds([]);
    };

    return {
        quotes,
        quotesLoading,
        isRejectDialogOpen,
        setRejectDialogOpen,
        selectedQuoteIds,
        setSelectedQuoteIds,
        handleStatusUpdate,
        handleViewQuote,
        handleRejectQuote,
        handleBulkStatusUpdate,
        toggleQuoteSelection,
        selectAllQuotes,
        clearSelection,
        isQuoteSelected: (quoteId: string) => selectedQuoteIds.includes(quoteId),
        updateStatusMutation,
        activeStatusUpdate,
        pagination
    };
};