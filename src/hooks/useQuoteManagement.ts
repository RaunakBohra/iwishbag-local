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
import { useAuth } from '@/contexts/AuthContext';
import { useAdminRole } from '@/hooks/useAdminRole';

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
  const { user, session } = useAuth();
  const { data: isAdmin, isLoading: isAdminLoading } = useAdminRole();
  
  const isAuthenticated = !!user && !!session && !user.is_anonymous;

  // Enhanced debug logging for query enablement
  console.log('🔍 [useQuoteManagement] Query Enablement Debug:', {
    isAuthenticated,
    isAdmin,
    isAdminLoading,
    user: user ? { id: user.id, email: user.email, isAnonymous: user.is_anonymous } : null,
    session: session ? { userId: session.user?.id, hasAccessToken: !!session.access_token } : null,
    filters: {
      searchText: filters.searchText,
      statuses: filters.statuses,
      countries: filters.countries,
      statusesLength: filters.statuses?.length || 0,
      countriesLength: filters.countries?.length || 0
    },
    queryWillRun: isAuthenticated && !!isAdmin && !isAdminLoading,
    searchTerm,
    page,
    pageSize
  });

  // INVESTIGATION: Test if query key arrays are causing the issue
  const { data: quotes, isLoading: quotesLoading } = useQuery<QuoteWithItems[]>({
    queryKey: [
      'admin-quotes',
      {
        search: searchTerm || '',
        statuses: filters.statuses || [],
        countries: filters.countries || [],
        page,
        pageSize
      }
    ],
    queryFn: async () => {
      console.log('🚀 [useQuoteManagement] Main query function STARTED - NO SENTRY');
      
      try {
        console.log('🚀 [useQuoteManagement] Main query function - inside try block');
        const queryStartTime = Date.now();
          
          // Debug authentication context
          console.log('🔍 useQuoteManagement Authentication Debug:', {
            userId: user?.id,
            userEmail: user?.email,
            isAnonymous: user?.is_anonymous,
            hasSession: !!session,
            sessionUserId: session?.user?.id,
            accessToken: session?.access_token ? 'present' : 'missing',
            isAuthenticated,
            isAdmin
          });
          
          // Validate authentication for admin operations
          if (!isAuthenticated) {
            console.warn('⚠️ No authenticated user for admin quote management');
            throw new Error('Authentication required for admin operations');
          }
          
          if (!isAdmin) {
            console.warn('⚠️ Non-admin user attempting admin operations');
            throw new Error('Admin role required for quote management');
          }
          
          // INVESTIGATION: Test exact same query as working test query
          console.log('🔍 [useQuoteManagement] Testing exact same structure as working test query...');
          
          // Use proper admin query with all necessary fields
          let query = supabase
            .from('quotes')
            .select(COMMON_QUERIES.adminQuotesWithProfiles)
            .order('created_at', { ascending: false });

          // Apply filters
          if (searchTerm && searchTerm.trim()) {
            query = query.or(`display_id.ilike.%${searchTerm}%,customer_data->info->>email.ilike.%${searchTerm}%`);
          }

          if (filters.statuses && filters.statuses.length > 0) {
            query = query.in('status', filters.statuses);
          }

          if (filters.countries && filters.countries.length > 0) {
            query = query.in('destination_country', filters.countries);
          }

          // Apply pagination
          const start = page * pageSize;
          const end = start + pageSize - 1;
          query = query.range(start, end);

          const { data, error } = await query;
            
          console.log('🔍 [useQuoteManagement] Main Query Results (same as test):', {
            hasError: !!error,
            errorMessage: error?.message,
            dataCount: data?.length || 0,
            data: data || []
          });
          
          if (error) {
            console.error('🚨 Main Query Error:', error);
            throw error;
          }
          
          // Transform data to extract JSONB fields for easier component access
          const transformedData = (data || []).map(quote => ({
            ...quote,
            email: quote.customer_data?.info?.email || null,
            customer_name: quote.customer_data?.info?.name || null,
            product_name: quote.items?.[0]?.name || null,
          }));
          
          console.log('🔍 [useQuoteManagement] Transformation Debug:', {
            originalCount: data?.length || 0,
            transformedCount: transformedData.length
          });
          
          const result = transformedData;

          // Log performance metrics  
          const queryDuration = Date.now() - queryStartTime;
          console.log('🚀 [useQuoteManagement] Query completed in:', queryDuration, 'ms');

          return result;
        } catch (error) {
          console.error('🚨 [useQuoteManagement] Query error:', error);
          throw error;
        }
    },
    enabled: isAuthenticated && !!isAdmin && !isAdminLoading,
    staleTime: 5 * 60 * 1000, // 5 minutes cache for performance
    gcTime: 10 * 60 * 1000 // 10 minutes garbage collection
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
    quotes: quotes || [],
    quotesLoading: quotesLoading || isAdminLoading,
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
