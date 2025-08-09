import { useQuery } from '@tanstack/react-query';
import { OrderService } from '@/services/OrderService';

// Query keys for caching
export const orderKeys = {
  all: ['orders'] as const,
  lists: () => [...orderKeys.all, 'list'] as const,
  list: (filters: any) => [...orderKeys.lists(), { filters }] as const,
  details: () => [...orderKeys.all, 'detail'] as const,
  detail: (id: string) => [...orderKeys.details(), id] as const,
};

// Order filters interface
export interface OrderFilters {
  search?: string;
  status?: string | string[];
  date_range?: { start: string; end: string };
}

/**
 * Hook to fetch paginated customer orders (user-facing)
 */
export const useCustomerOrdersPaginated = (
  filters?: { search?: string; status?: string | string[] },
  page: number = 1,
  pageSize: number = 20,
) => {
  const orderService = OrderService.getInstance();
  
  return useQuery({
    queryKey: [...orderKeys.list(filters || {}), 'customer-paginated', { page, pageSize }],
    queryFn: () => orderService.getCustomerOrdersPaginated(filters, page, pageSize),
    staleTime: 60 * 1000, // 1 minute for customer view
    refetchInterval: 2 * 60 * 1000, // Auto-refetch every 2 minutes
    refetchOnWindowFocus: true, // Refresh when window regains focus
    keepPreviousData: true, // Keep previous page data while loading new page
  });
};

/**
 * Hook to fetch a specific order by ID
 */
export const useOrderDetail = (orderId: string) => {
  const orderService = OrderService.getInstance();
  
  return useQuery({
    queryKey: orderKeys.detail(orderId),
    queryFn: () => orderService.getOrderById(orderId),
    enabled: !!orderId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

/**
 * Hook to fetch order statistics for dashboard
 */
export const useOrderStats = () => {
  return useQuery({
    queryKey: [...orderKeys.all, 'stats'],
    queryFn: async () => {
      // This would be implemented in OrderService
      // For now, return empty stats
      return {
        total: 0,
        pending: 0,
        processing: 0,
        shipped: 0,
        delivered: 0,
        cancelled: 0,
        totalValue: 0,
      };
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};