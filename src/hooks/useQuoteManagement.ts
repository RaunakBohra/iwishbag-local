import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';
import { useToast } from '@/hooks/use-toast';
import { useDebounce } from '@/hooks/useDebounce';
import { useNavigate } from 'react-router-dom';
import { useStatusManagement } from '@/hooks/useStatusManagement';
import { COMMON_QUERIES } from '@/lib/queryColumns';
import { trackAdminQuery } from '@/lib/performanceTracker';
import type { SearchFilters } from '@/components/admin/SearchAndFilterPanel';
import * as Sentry from '@sentry/react';

type QuoteWithItems = Tables<'quotes'> & {
  profiles?: {
    full_name?: string;
    email?: string;
    phone?: string;
    preferred_display_currency?: string;
  } | null;
};

interface UseQuoteManagementProps {
  filters: SearchFilters;
  page?: number;
  pageSize?: number;
}

export const useQuoteManagement = ({ 
  filters,
  page = 0,
  pageSize = 25
}: UseQuoteManagementProps) => {

  // Internal state management
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [selectedQuoteIds, setSelectedQuoteIds] = useState<string[]>([]);
  const [activeStatusUpdate, setActiveStatusUpdate] = useState<string | null>(null);

  const searchTerm = useDebounce(filters.searchText, 500);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { getStatusesForQuotesList, getStatusConfig, quoteStatuses } = useStatusManagement();

  const { data: quotes, isLoading: quotesLoading } = useQuery<QuoteWithItems[]>({
    queryKey: [
      'admin-quotes',
      searchTerm,
      filters.statuses,
      filters.countries,
      page,
      pageSize,
    ],
    queryFn: async () => {
      // Enhanced Sentry monitoring for search query operations
      const searchTransaction = Sentry.startTransaction({
        name: 'Advanced Search Query Execution',
        op: 'db.query.search',
      });

      return Sentry.withScope(async (scope) => {
        scope.setTag('component', 'useQuoteManagement');
        scope.setTag('operation', 'search_quotes');
        scope.setContext('search_parameters', {
          searchTerm: searchTerm,
          statusFilters: filters.statuses,
          countryFilters: filters.countries,
          page,
          pageSize,
          hasSearchTerm: !!searchTerm?.trim(),
          hasStatusFilters: filters.statuses.length > 0,
          hasCountryFilters: filters.countries.length > 0,
        });
        scope.setLevel('info');

        try {
          const queryStartTime = Date.now();
          
          const result = await trackAdminQuery('quotes_list', async () => {
            // PERFORMANCE FIX: Use standardized column selection with pagination
            let query = supabase
              .from('quotes')
              .select(COMMON_QUERIES.adminQuotesWithProfiles)
              .order('created_at', { ascending: false })
              .range(page * pageSize, (page + 1) * pageSize - 1);

            // Apply status filters
            if (filters.statuses && filters.statuses.length > 0) {
              query = query.in('status', filters.statuses);
              console.log(`DEBUG: Filtering by statuses: ${filters.statuses.join(', ')}`);
            } else {
              // If no specific statuses selected, show all quotes
              const quoteStatusNames = getStatusesForQuotesList();
              console.log('DEBUG: No specific status filter, showing all manageable quotes');
            }

            // Apply country filters (destination country)
            if (filters.countries && filters.countries.length > 0) {
              query = query.in('destination_country', filters.countries);
              console.log(`DEBUG: Filtering by countries: ${filters.countries.join(', ')}`);
            }

            // Apply full-text search with proper parameterization to prevent SQL injection
            if (searchTerm && searchTerm.trim()) {
              const sanitizedSearchTerm = searchTerm.trim();
              
              // SECURITY FIX: Use Supabase's parameterized query methods instead of string interpolation
              // This prevents SQL injection attacks by properly escaping user input
              query = query.or([
                `display_id.ilike.%${sanitizedSearchTerm}%`,
                `customer_data->>info->>email.ilike.%${sanitizedSearchTerm}%`,
                `items::text.ilike.%${sanitizedSearchTerm}%`,
                `destination_country.ilike.%${sanitizedSearchTerm}%`
              ].join(','));
              
              console.log(`DEBUG: Applying search filter: "${searchTerm}"`);
            }

            // Debug: print the query object
            console.log('DEBUG: Final Supabase query for quotes:', query);
            // Log the final query string (for REST API)
            console.log('DEBUG: Query URL:', query.url.toString());
            const { data, error } = await query;
            if (error) throw new Error(error.message);
            return data || [];
          }, {
            page,
            pageSize,
            filters: {
              search: searchTerm,
              statuses: filters.statuses,
              countries: filters.countries,
            }
          });

          // Log performance metrics
          const queryDuration = Date.now() - queryStartTime;
          scope.setContext('performance_metrics', {
            queryDurationMs: queryDuration,
            resultCount: result.length,
            isSlowQuery: queryDuration > 2000,
          });

          // Monitor performance and alert on slow queries
          if (queryDuration > 2000) {
            scope.setLevel('warning');
            Sentry.addBreadcrumb({
              message: 'Slow search query detected',
              level: 'warning',
              data: {
                duration: queryDuration,
                filters: filters,
                searchTerm: searchTerm,
              }
            });
          }

          searchTransaction.setStatus('ok');
          return result;
        } catch (error) {
          scope.setLevel('error');
          scope.setContext('error_details', {
            errorMessage: error instanceof Error ? error.message : 'Unknown error',
            searchTerm: searchTerm,
            filters: filters,
          });
          
          Sentry.captureException(error, {
            tags: {
              component: 'useQuoteManagement',
              operation: 'search_query_failed',
            },
            extra: {
              searchParams: { searchTerm, filters, page, pageSize },
            }
          });
          
          searchTransaction.setStatus('internal_error');
          throw error;
        } finally {
          searchTransaction.finish();
        }
      });
    },
    enabled: true, // Always run query - filtering is handled by getStatusesForQuotesList
  });

  const updateMultipleQuotesStatusMutation = useMutation({
    mutationFn: async ({ ids, status }: { ids: string[]; status: string }) => {
      // Sentry monitoring for status update operations
      const updateTransaction = Sentry.startTransaction({
        name: 'Bulk Quote Status Update',
        op: 'db.mutation.status_update',
      });

      return Sentry.withScope(async (scope) => {
        scope.setTag('component', 'useQuoteManagement');
        scope.setTag('operation', 'bulk_status_update');
        scope.setContext('update_parameters', {
          quoteIds: ids,
          newStatus: status,
          quoteCount: ids.length,
        });

        try {
          const updateObject: Partial<Tables<'quotes'>> = { status };

          // DYNAMIC: Check if this status represents a paid state
          const statusConfig = getStatusConfig(status, 'order');
          if (statusConfig?.isSuccessful && statusConfig?.countsAsOrder) {
            updateObject.paid_at = new Date().toISOString();

            scope.setContext('status_config', {
              isSuccessful: statusConfig.isSuccessful,
              countsAsOrder: statusConfig.countsAsOrder,
              requiresPaymentProcessing: true,
            });

            for (const quoteId of ids) {
              const { data: currentQuote, error: fetchError } = await supabase
                .from('quotes')
                .select('order_display_id, status')
                .eq('id', quoteId)
                .single();

              if (fetchError) {
                scope.setLevel('warning');
                Sentry.addBreadcrumb({
                  message: 'Failed to fetch quote for update',
                  level: 'warning',
                  data: { quoteId, error: fetchError.message }
                });
                console.error(`Failed to fetch quote ${quoteId}: ${fetchError.message}`);
                continue;
              }

              const singleUpdate: Partial<Tables<'quotes'>> = { ...updateObject };
              if (currentQuote) {
                if (!currentQuote.order_display_id) {
                  singleUpdate.order_display_id = `ORD-${quoteId.substring(0, 6).toUpperCase()}`;
                }
                // DYNAMIC: Check for payment pending statuses
                if (
                  currentQuote.status.includes('cod_pending') ||
                  currentQuote.status.includes('cod')
                ) {
                  singleUpdate.payment_method = 'cod';
                } else if (
                  currentQuote.status.includes('bank_transfer') ||
                  currentQuote.status.includes('transfer')
                ) {
                  singleUpdate.payment_method = 'bank_transfer';
                }
              }

              const { error } = await supabase.from('quotes').update(singleUpdate).eq('id', quoteId);

              if (error) {
                const updateError = new Error(`Failed to update quote ${quoteId}: ${error.message}`);
                scope.setLevel('error');
                Sentry.captureException(updateError, {
                  tags: { quoteId, operation: 'individual_quote_update' }
                });
                throw updateError;
              }
            }
            
            updateTransaction.setStatus('ok');
            return;
          }

          // Bulk update for non-payment statuses
          const { error } = await supabase.from('quotes').update(updateObject).in('id', ids);
          if (error) {
            const bulkError = new Error(error.message);
            scope.setLevel('error');
            Sentry.captureException(bulkError, {
              tags: { operation: 'bulk_quote_update' }
            });
            throw bulkError;
          }

          updateTransaction.setStatus('ok');
        } catch (error) {
          scope.setLevel('error');
          scope.setContext('error_details', {
            errorMessage: error instanceof Error ? error.message : 'Unknown error',
            quoteIds: ids,
            targetStatus: status,
          });
          
          updateTransaction.setStatus('internal_error');
          throw error;
        } finally {
          updateTransaction.finish();
        }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-quotes'] });
      setSelectedQuoteIds([]);
      toast({ title: 'Quotes updated successfully' });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error updating quotes',
        description: error.message,
        variant: 'destructive',
      });
    },
    onSettled: () => {
      setActiveStatusUpdate(null);
    },
  });

  const updateMultipleQuotesRejectionMutation = useMutation({
    mutationFn: async ({
      ids,
      reasonId,
      details,
    }: {
      ids: string[];
      reasonId: string;
      details: string;
    }) => {
      // DYNAMIC: Use rejected status from configuration or fallback
      const rejectedStatusConfig = quoteStatuses.find(
        (s) => s.name === 'rejected' || s.id === 'rejected',
      );
      const rejectedStatus = rejectedStatusConfig?.name || 'rejected';

      const { error } = await supabase
        .from('quotes')
        .update({
          status: rejectedStatus,
          rejection_reason_id: reasonId,
          rejection_details: details,
          rejected_at: new Date().toISOString(),
        })
        .in('id', ids);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-quotes'] });
      setSelectedQuoteIds([]);
      setIsRejectDialogOpen(false);
      toast({ title: 'Quotes rejected successfully' });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error rejecting quotes',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const deleteQuotesMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase.from('quotes').delete().in('id', ids);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-quotes'] });
      setSelectedQuoteIds([]);
      toast({ title: 'Quotes deleted successfully' });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error deleting quotes',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleToggleSelectQuote = (id: string, selected?: boolean) => {
    setSelectedQuoteIds((prev) => {
      if (selected !== undefined) {
        // If selected is explicitly provided, use it
        return selected ? [...prev, id] : prev.filter((quoteId) => quoteId !== id);
      } else {
        // Toggle behavior for backward compatibility
        return prev.includes(id) ? prev.filter((quoteId) => quoteId !== id) : [...prev, id];
      }
    });
  };

  const handleToggleSelectAll = (checked: boolean | 'indeterminate') => {
    if (checked) {
      setSelectedQuoteIds(quotes?.map((q) => q.id) || []);
    } else {
      setSelectedQuoteIds([]);
    }
  };

  // Placeholder bulk action functions - TODO: Implement these
  const handleBulkReject = () => {
    console.log('Bulk reject action - not implemented');
  };

  const handleBulkApprove = () => {
    console.log('Bulk approve action - not implemented');
  };

  const handleBulkExport = () => {
    console.log('Bulk export action - not implemented');
  };

  const handleBulkEmail = () => {
    console.log('Bulk email action - not implemented');
  };

  const handleBulkDuplicate = () => {
    console.log('Bulk duplicate action - not implemented');
  };

  const handleBulkPriority = () => {
    console.log('Bulk priority action - not implemented');
  };

  const handleBulkAction = (
    action:
      | 'approved'
      | 'cancelled'
      | 'confirm_payment'
      | 'email'
      | 'export'
      | 'duplicate'
      | 'priority',
  ) => {
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
    updateMultipleQuotesRejectionMutation.mutate({
      ids: selectedQuoteIds,
      reasonId,
      details,
    });
  };

  const downloadCSV = () => {
    if (!quotes) return;

    const csvContent = [
      ['Quote ID', 'Product', 'Email', 'Status', 'Price', 'Total', 'Created', 'Internal ID'].join(
        ',',
      ),
      ...quotes.map((quote) =>
        [
          quote.display_id || '',
          quote.product_name,
          quote.email,
          quote.status,
          quote.item_price || '',
          quote.final_total_usd || '',
          new Date(quote.created_at).toLocaleDateString(),
          quote.id,
        ].join(','),
      ),
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
