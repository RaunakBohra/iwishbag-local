import { useQuery } from '@tanstack/react-query';
import { QuoteV2Service } from '@/services/QuoteV2Service';

// Query keys for caching
export const quoteKeys = {
  all: ['quotes'] as const,
  lists: () => [...quoteKeys.all, 'list'] as const,
  list: (filters: any) => [...quoteKeys.lists(), { filters }] as const,
  details: () => [...quoteKeys.all, 'detail'] as const,
  detail: (id: string) => [...quoteKeys.details(), id] as const,
};

// Quote filters interface
export interface QuoteFilters {
  search?: string;
  status?: string | string[];
  origin_country?: string;
  destination_country?: string;
  date_range?: { start: string; end: string };
}

/**
 * Hook to fetch paginated quotes with filtering and sorting (admin)
 */
export const useQuotesPaginated = (
  filters?: QuoteFilters,
  page: number = 1,
  pageSize: number = 25,
) => {
  const quoteService = QuoteV2Service.getInstance();
  
  console.log('🔍 useQuotesPaginated called with:', { filters, page, pageSize });
  
  return useQuery({
    queryKey: [...quoteKeys.list(filters || {}), 'paginated', { page, pageSize }],
    queryFn: async () => {
      console.log('🚀 React Query executing queryFn for quotes...');
      try {
        const result = await quoteService.getQuotesPaginated(filters, page, pageSize);
        console.log('✅ React Query received result:', { 
          totalQuotes: result.pagination?.total || 0,
          currentPageQuotes: result.data?.length || 0
        });
        return result;
      } catch (error) {
        console.error('❌ React Query error in quotes fetch:', error);
        throw error;
      }
    },
    enabled: true, // Always enabled for now
    staleTime: 30 * 1000, // 30 seconds for admin view - faster updates
    refetchInterval: 60 * 1000, // Auto-refetch every minute
    refetchOnWindowFocus: true, // Refresh when window regains focus
    keepPreviousData: true, // Keep previous page data while loading new page
    onError: (error) => {
      console.error('🚨 React Query onError callback:', error);
    },
    onSuccess: (data) => {
      console.log('🎉 React Query onSuccess callback:', data?.pagination);
    }
  });
};

/**
 * Hook to fetch paginated customer quotes (user-facing)
 */
export const useCustomerQuotesPaginated = (
  filters?: { search?: string; status?: string | string[] },
  page: number = 1,
  pageSize: number = 20,
) => {
  const quoteService = QuoteV2Service.getInstance();
  
  return useQuery({
    queryKey: [...quoteKeys.list(filters || {}), 'customer-paginated', { page, pageSize }],
    queryFn: () => quoteService.getCustomerQuotesPaginated(filters, page, pageSize),
    staleTime: 60 * 1000, // 1 minute for customer view
    refetchInterval: 2 * 60 * 1000, // Auto-refetch every 2 minutes
    refetchOnWindowFocus: true, // Refresh when window regains focus
    keepPreviousData: true, // Keep previous page data while loading new page
  });
};

/**
 * Hook to fetch a specific quote by ID
 */
export const useQuoteDetail = (quoteId: string) => {
  const quoteService = QuoteV2Service.getInstance();
  
  return useQuery({
    queryKey: quoteKeys.detail(quoteId),
    queryFn: () => quoteService.getQuoteById(quoteId),
    enabled: !!quoteId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

/**
 * Hook to fetch quote statistics for dashboard
 */
export const useQuoteStats = () => {
  return useQuery({
    queryKey: [...quoteKeys.all, 'stats'],
    queryFn: async () => {
      // This would be implemented in QuoteV2Service
      // For now, return empty stats
      return {
        total: 0,
        under_review: 0,
        pending: 0,
        sent: 0,
        approved: 0,
        paid: 0,
        completed: 0,
        totalValue: 0,
      };
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};