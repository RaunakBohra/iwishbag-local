import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface CustomerStats {
  totalOrders: number;
  totalSpent: number;
  lastOrderDate: string | null;
  averageOrderValue: number;
  tags: string[];
}

interface CustomerStatsResponse {
  [customerId: string]: CustomerStats;
}

export const useCustomerStats = (customerIds: string[]) => {
  return useQuery({
    queryKey: ['customer-stats', customerIds],
    queryFn: async () => {
      const { data: orders, error } = await supabase
        .from('quotes_v2')
        .select(
          `
          id,
          user_id,
          total_amount,
          created_at,
          status
        `,
        )
        .in('user_id', customerIds)
        .eq('status', 'completed');

      if (error) throw error;

      const stats: CustomerStatsResponse = {};

      // Initialize stats for each customer
      customerIds.forEach((id) => {
        stats[id] = {
          totalOrders: 0,
          totalSpent: 0,
          lastOrderDate: null,
          averageOrderValue: 0,
          tags: [],
        };
      });

      // Calculate stats
      orders.forEach((order) => {
        const customerStats = stats[order.user_id];
        customerStats.totalOrders++;
        customerStats.totalSpent += order.total_amount || 0;

        const orderDate = new Date(order.created_at);
        if (!customerStats.lastOrderDate || orderDate > new Date(customerStats.lastOrderDate)) {
          customerStats.lastOrderDate = order.created_at;
        }
      });

      // Calculate averages and add tags
      Object.values(stats).forEach((stat) => {
        stat.averageOrderValue = stat.totalOrders > 0 ? stat.totalSpent / stat.totalOrders : 0;

        // Add tags based on customer behavior
        if (stat.totalSpent > 1000) stat.tags.push('VIP');
        if (stat.totalOrders > 5) stat.tags.push('Regular');
        if (stat.averageOrderValue > 200) stat.tags.push('High Value');
        if (
          !stat.lastOrderDate ||
          new Date().getTime() - new Date(stat.lastOrderDate).getTime() > 30 * 24 * 60 * 60 * 1000
        ) {
          stat.tags.push('Inactive');
        }
      });

      return stats;
    },
    enabled: customerIds.length > 0,
  });
};
