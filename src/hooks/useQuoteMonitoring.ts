import { useQuery } from '@tanstack/react-query';
import {
  getQuoteCalculationMetrics,
  getQuoteBusinessMetrics,
  getAlertSummary
} from '@/services/ErrorHandlingService';

interface UseQuoteMonitoringOptions {
  refetchInterval?: number;
  enabled?: boolean;
}

/**
 * Hook to fetch and manage quote monitoring data
 */
export function useQuoteMonitoring(options: UseQuoteMonitoringOptions = {}) {
  const { refetchInterval = 30000, enabled = true } = options; // Default 30 seconds

  // Performance metrics query
  const performanceQuery = useQuery({
    queryKey: ['quote-monitoring', 'performance'],
    queryFn: () => getQuoteCalculationMetrics(60), // Last hour
    refetchInterval,
    enabled,
    staleTime: 10000, // Consider data stale after 10 seconds
  });

  // Business metrics query
  const businessQuery = useQuery({
    queryKey: ['quote-monitoring', 'business'],
    queryFn: () => getQuoteBusinessMetrics(false),
    refetchInterval,
    enabled,
    staleTime: 10000,
  });

  // Alert summary query
  const alertsQuery = useQuery({
    queryKey: ['quote-monitoring', 'alerts'],
    queryFn: () => getAlertSummary(),
    refetchInterval,
    enabled,
    staleTime: 10000,
  });

  // Combined loading state
  const isLoading = performanceQuery.isLoading || businessQuery.isLoading || alertsQuery.isLoading;
  const isError = performanceQuery.isError || businessQuery.isError || alertsQuery.isError;

  // Refetch all data
  const refetchAll = async () => {
    await Promise.all([
      performanceQuery.refetch(),
      businessQuery.refetch(),
      alertsQuery.refetch()
    ]);
  };

  return {
    performanceMetrics: performanceQuery.data,
    businessMetrics: businessQuery.data,
    alertSummary: alertsQuery.data,
    isLoading,
    isError,
    refetchAll,
    queries: {
      performance: performanceQuery,
      business: businessQuery,
      alerts: alertsQuery
    }
  };
}