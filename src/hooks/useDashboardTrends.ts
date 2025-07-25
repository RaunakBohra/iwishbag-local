import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface TrendData {
  value: number;
  direction: 'up' | 'down' | 'neutral';
  percentage: number;
  period: string;
}

interface DashboardTrends {
  activeQuotes: TrendData;
  approvedQuotes: TrendData;
  ordersInProgress: TrendData;
  deliveredOrders: TrendData;
  openTickets: TrendData;
}

export const useDashboardTrends = () => {
  const { user } = useAuth();

  // Get current period data (already available from useDashboardState)
  const { data: currentData } = useQuery({
    queryKey: ['user-quotes-and-orders', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('quotes')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Get historical data for comparison (30 days ago)
  const { data: historicalData } = useQuery({
    queryKey: ['dashboard-trends', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data, error } = await supabase
        .from('quotes')
        .select('*')
        .eq('user_id', user.id)
        .lt('created_at', thirtyDaysAgo.toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 15, // Cache for 15 minutes
  });

  // Get user tickets for trends
  const { data: currentTickets } = useQuery({
    queryKey: ['user-tickets', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('tickets')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: historicalTickets } = useQuery({
    queryKey: ['user-tickets-historical', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data, error } = await supabase
        .from('tickets')
        .select('*')
        .eq('user_id', user.id)
        .lt('created_at', thirtyDaysAgo.toISOString());

      if (error) throw error;
      return data;
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 15,
  });

  const trends: DashboardTrends = useMemo(() => {
    if (!currentData || !historicalData) {
      // Return default trends if no historical data
      return {
        activeQuotes: { value: 0, direction: 'neutral', percentage: 0, period: 'last month' },
        approvedQuotes: { value: 0, direction: 'neutral', percentage: 0, period: 'last month' },
        ordersInProgress: { value: 0, direction: 'neutral', percentage: 0, period: 'last month' },
        deliveredOrders: { value: 0, direction: 'neutral', percentage: 0, period: 'last month' },
        openTickets: { value: 0, direction: 'neutral', percentage: 0, period: 'last month' },
      };
    }

    // Calculate current metrics
    const currentActiveQuotes = currentData.filter(
      (q) => q.status === 'pending' || q.status === 'sent' || q.status === 'calculated'
    ).length;
    
    const currentApprovedQuotes = currentData.filter(
      (q) => q.status === 'approved'
    ).length;
    
    const currentOrdersInProgress = currentData.filter(
      (o) => o.status !== 'completed' && o.status !== 'cancelled' && 
      ['paid', 'ordered', 'shipped', 'processing'].includes(o.status)
    ).length;
    
    const currentDeliveredOrders = currentData.filter(
      (o) => o.status === 'completed'
    ).length;
    
    const currentOpenTickets = (currentTickets || []).filter(
      (t) => t.status === 'open' || t.status === 'in_progress'
    ).length;

    // Calculate historical metrics
    const historicalActiveQuotes = historicalData.filter(
      (q) => q.status === 'pending' || q.status === 'sent' || q.status === 'calculated'
    ).length;
    
    const historicalApprovedQuotes = historicalData.filter(
      (q) => q.status === 'approved'
    ).length;
    
    const historicalOrdersInProgress = historicalData.filter(
      (o) => o.status !== 'completed' && o.status !== 'cancelled' &&
      ['paid', 'ordered', 'shipped', 'processing'].includes(o.status)
    ).length;
    
    const historicalDeliveredOrders = historicalData.filter(
      (o) => o.status === 'completed'
    ).length;
    
    const historicalOpenTickets = (historicalTickets || []).filter(
      (t) => t.status === 'open' || t.status === 'in_progress'
    ).length;

    // Helper function to calculate trend
    const calculateTrend = (current: number, historical: number): Omit<TrendData, 'value'> => {
      if (historical === 0) {
        return {
          direction: current > 0 ? 'up' : 'neutral',
          percentage: current > 0 ? 100 : 0,
          period: 'last month'
        };
      }

      const percentageChange = ((current - historical) / historical) * 100;
      const roundedPercentage = Math.round(Math.abs(percentageChange));

      return {
        direction: percentageChange > 5 ? 'up' : percentageChange < -5 ? 'down' : 'neutral',
        percentage: roundedPercentage,
        period: 'last month'
      };
    };

    return {
      activeQuotes: {
        value: currentActiveQuotes,
        ...calculateTrend(currentActiveQuotes, historicalActiveQuotes)
      },
      approvedQuotes: {
        value: currentApprovedQuotes,
        ...calculateTrend(currentApprovedQuotes, historicalApprovedQuotes)
      },
      ordersInProgress: {
        value: currentOrdersInProgress,
        ...calculateTrend(currentOrdersInProgress, historicalOrdersInProgress)
      },
      deliveredOrders: {
        value: currentDeliveredOrders,
        ...calculateTrend(currentDeliveredOrders, historicalDeliveredOrders)
      },
      openTickets: {
        value: currentOpenTickets,
        ...calculateTrend(currentOpenTickets, historicalOpenTickets)
      }
    };
  }, [currentData, historicalData, currentTickets, historicalTickets]);

  return {
    trends,
    isLoading: !currentData || !historicalData,
  };
};