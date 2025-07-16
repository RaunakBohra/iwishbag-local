import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface SimpleOrderStats {
  totalOrders: number;
  unpaidOrders: number;
  pendingProofs: number;
  totalOutstanding: number;
  recentPayments: number;
}

export const useSimpleOrderAnalytics = () => {
  return useQuery({
    queryKey: ['simple-order-analytics'],
    queryFn: async (): Promise<SimpleOrderStats> => {
      // Get basic order counts
      const { data: orders, error: ordersError } = await supabase
        .from('quotes')
        .select('id, payment_status, final_total, amount_paid')
        .not('status', 'in', '("draft","pending","rejected")'); // Only count real orders
      
      if (ordersError) {
        console.error('Error fetching orders:', ordersError);
        throw ordersError;
      }

      // Get pending payment proofs count
      // Note: payment_documents table may not exist in local development
      let proofs = null;
      try {
        const { data, error } = await supabase
          .from('payment_documents')
          .select('id')
          .eq('verified', false);
        
        if (error && error.code !== 'PGRST116') { // PGRST116 is "relation does not exist"
          console.error('Error fetching payment proofs:', error);
        } else {
          proofs = data;
        }
      } catch (err) {
        console.log('payment_documents table not available in local development');
      }

      // Get recent payments (last 7 days) from payment_ledger
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const { data: recentPaymentData, error: recentError } = await supabase
        .from('payment_ledger')
        .select('id')
        .eq('payment_type', 'customer_payment')
        .gte('created_at', sevenDaysAgo.toISOString());
      
      if (recentError) {
        console.error('Error fetching recent payments:', recentError);
      }

      // Calculate stats
      const totalOrders = orders?.length || 0;
      const unpaidOrders = orders?.filter(o => 
        !o.payment_status || o.payment_status === 'unpaid'
      ).length || 0;
      
      const totalOutstanding = orders?.reduce((sum, order) => {
        const total = order.final_total || 0;
        const paid = order.amount_paid || 0;
        const outstanding = total - paid;
        return sum + (outstanding > 0 ? outstanding : 0);
      }, 0) || 0;

      return {
        totalOrders,
        unpaidOrders,
        pendingProofs: proofs?.length || 0,
        totalOutstanding: Math.round(totalOutstanding * 100) / 100, // Round to 2 decimals
        recentPayments: recentPaymentData?.length || 0
      };
    },
    refetchInterval: 60000, // Refresh every minute
    staleTime: 45000 // Cache for 45 seconds
  });
};