import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface CurrencyStats {
  currency: string;
  total_payments: number;
  total_refunds: number;
  net_amount: number;
  payment_count: number;
  refund_count: number;
  average_payment: number;
  last_payment_date?: string;
  unique_customers: number;
}

interface CurrencyMismatch {
  quote_id: string;
  order_display_id?: string;
  quote_currency: string;
  payment_currency: string;
  quote_amount: number;
  payment_amount: number;
  created_at: string;
  payment_method: string;
  gateway_transaction_id?: string;
}

interface SuspiciousPayment {
  quote_id: string;
  order_display_id?: string;
  quote_amount: number;
  quote_currency: string;
  payment_amount: number;
  payment_currency: string;
  amount_difference: number;
  created_at: string;
  suspicion_level: 'HIGH' | 'MEDIUM' | 'LOW';
}

interface ExchangeRateHealth {
  currency: string;
  current_rate: number;
  last_updated: string;
  is_stale: boolean;
  is_fallback: boolean;
  age_minutes: number;
}

interface ConversionMetrics {
  currency_pair: string;
  conversion_count: number;
  average_variance: number;
  max_variance: number;
  accuracy_score: number;
}

export function useCurrencyStatistics(timeRange: '7d' | '30d' | '90d' = '30d') {
  const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  return useQuery({
    queryKey: ['currency-statistics', timeRange],
    queryFn: async (): Promise<CurrencyStats[]> => {
      const { data, error } = await supabase.rpc('get_currency_statistics', {
        start_date: startDate.toISOString(),
        end_date: new Date().toISOString()
      });

      if (error) {
        console.error('Error fetching currency statistics:', error);
        throw error;
      }

      return data || [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 10 * 60 * 1000 // 10 minutes
  });
}

export function useCurrencyMismatches(timeRange: '7d' | '30d' | '90d' = '30d') {
  const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  return useQuery({
    queryKey: ['currency-mismatches', timeRange],
    queryFn: async (): Promise<CurrencyMismatch[]> => {
      const { data, error } = await supabase.rpc('get_currency_mismatches', {
        start_date: startDate.toISOString(),
        end_date: new Date().toISOString()
      });

      if (error) {
        console.error('Error fetching currency mismatches:', error);
        throw error;
      }

      return data || [];
    },
    staleTime: 5 * 60 * 1000,
    refetchInterval: 10 * 60 * 1000
  });
}

export function useSuspiciousPayments(timeRange: '7d' | '30d' | '90d' = '30d') {
  const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  return useQuery({
    queryKey: ['suspicious-payments', timeRange],
    queryFn: async (): Promise<SuspiciousPayment[]> => {
      const { data, error } = await supabase.rpc('get_suspicious_payment_amounts', {
        start_date: startDate.toISOString(),
        end_date: new Date().toISOString()
      });

      if (error) {
        console.error('Error fetching suspicious payments:', error);
        throw error;
      }

      return data || [];
    },
    staleTime: 5 * 60 * 1000,
    refetchInterval: 15 * 60 * 1000
  });
}

export function useExchangeRateHealth() {
  return useQuery({
    queryKey: ['exchange-rate-health'],
    queryFn: async (): Promise<ExchangeRateHealth[]> => {
      const { data, error } = await supabase.rpc('get_exchange_rate_health');

      if (error) {
        console.error('Error fetching exchange rate health:', error);
        throw error;
      }

      return data || [];
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchInterval: 5 * 60 * 1000 // 5 minutes
  });
}

export function useConversionMetrics(timeRange: '7d' | '30d' | '90d' = '30d') {
  const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  return useQuery({
    queryKey: ['conversion-metrics', timeRange],
    queryFn: async (): Promise<ConversionMetrics[]> => {
      const { data, error } = await supabase.rpc('get_currency_conversion_metrics', {
        start_date: startDate.toISOString(),
        end_date: new Date().toISOString()
      });

      if (error) {
        console.error('Error fetching conversion metrics:', error);
        throw error;
      }

      return data || [];
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
    refetchInterval: 30 * 60 * 1000 // 30 minutes
  });
}

// Composite hook for currency analytics overview
export function useCurrencyAnalytics(timeRange: '7d' | '30d' | '90d' = '30d') {
  const statistics = useCurrencyStatistics(timeRange);
  const mismatches = useCurrencyMismatches(timeRange);
  const suspicious = useSuspiciousPayments(timeRange);
  const rateHealth = useExchangeRateHealth();
  const metrics = useConversionMetrics(timeRange);

  // Calculate derived analytics
  const analytics = {
    // Alert counts
    totalAlerts: (mismatches.data?.length || 0) + 
                (suspicious.data?.filter(s => s.suspicion_level === 'HIGH').length || 0) +
                (rateHealth.data?.filter(r => r.is_stale || r.is_fallback).length || 0),
    
    highPriorityAlerts: (suspicious.data?.filter(s => s.suspicion_level === 'HIGH').length || 0) +
                       (rateHealth.data?.filter(r => r.is_fallback).length || 0),
    
    // Currency diversity
    activeCurrencies: statistics.data?.length || 0,
    currenciesWithIssues: new Set([
      ...(mismatches.data?.map(m => m.payment_currency) || []),
      ...(suspicious.data?.map(s => s.payment_currency) || [])
    ]).size,
    
    // Volume metrics
    totalNetVolume: statistics.data?.reduce((sum, stat) => sum + stat.net_amount, 0) || 0,
    totalPaymentCount: statistics.data?.reduce((sum, stat) => sum + stat.payment_count, 0) || 0,
    totalRefundCount: statistics.data?.reduce((sum, stat) => sum + stat.refund_count, 0) || 0,
    
    // Health scores
    exchangeRateHealthScore: rateHealth.data ? 
      Math.round((rateHealth.data.filter(r => !r.is_stale && !r.is_fallback).length / rateHealth.data.length) * 100) : 100,
    
    currencyAccuracyScore: metrics.data?.length ? 
      Math.round(metrics.data.reduce((sum, m) => sum + m.accuracy_score, 0) / metrics.data.length) : 100,
    
    // Trend indicators
    mismatchRate: statistics.data && mismatches.data ? 
      ((mismatches.data.length / Math.max(statistics.data.reduce((sum, s) => sum + s.payment_count, 0), 1)) * 100) : 0,
    
    suspiciousRate: statistics.data && suspicious.data ? 
      ((suspicious.data.length / Math.max(statistics.data.reduce((sum, s) => sum + s.payment_count, 0), 1)) * 100) : 0
  };

  return {
    statistics,
    mismatches,
    suspicious,
    rateHealth,
    metrics,
    analytics,
    isLoading: statistics.isLoading || mismatches.isLoading || suspicious.isLoading || 
               rateHealth.isLoading || metrics.isLoading,
    error: statistics.error || mismatches.error || suspicious.error || 
           rateHealth.error || metrics.error
  };
}

// Hook for real-time currency monitoring alerts
export function useCurrencyAlerts() {
  const { analytics, suspicious, rateHealth, mismatches } = useCurrencyAnalytics();

  const alerts = [
    // High priority suspicious payments
    ...(suspicious.data?.filter(s => s.suspicion_level === 'HIGH').map(s => ({
      id: `suspicious-${s.quote_id}`,
      type: 'suspicious_payment' as const,
      severity: 'high' as const,
      title: 'Suspicious Payment Amount',
      message: `Order ${s.order_display_id}: ${s.payment_currency} ${s.payment_amount} vs quote ${s.quote_currency} ${s.quote_amount}`,
      timestamp: s.created_at,
      data: s
    })) || []),

    // Exchange rate issues
    ...(rateHealth.data?.filter(r => r.is_fallback).map(r => ({
      id: `fallback-${r.currency}`,
      type: 'exchange_rate' as const,
      severity: 'high' as const,
      title: 'Fallback Exchange Rate',
      message: `${r.currency} using fallback rate (${r.current_rate})`,
      timestamp: r.last_updated,
      data: r
    })) || []),

    // Stale exchange rates
    ...(rateHealth.data?.filter(r => r.is_stale && !r.is_fallback).map(r => ({
      id: `stale-${r.currency}`,
      type: 'exchange_rate' as const,
      severity: 'medium' as const,
      title: 'Stale Exchange Rate',
      message: `${r.currency} rate not updated for ${Math.round(r.age_minutes / 60)} hours`,
      timestamp: r.last_updated,
      data: r
    })) || []),

    // Currency mismatches (lower priority)
    ...(mismatches.data?.slice(0, 5).map(m => ({
      id: `mismatch-${m.quote_id}`,
      type: 'currency_mismatch' as const,
      severity: 'low' as const,
      title: 'Currency Mismatch',
      message: `Order ${m.order_display_id}: Quote in ${m.quote_currency}, paid in ${m.payment_currency}`,
      timestamp: m.created_at,
      data: m
    })) || [])
  ].sort((a, b) => {
    // Sort by severity, then timestamp
    const severityOrder = { high: 3, medium: 2, low: 1 };
    if (severityOrder[a.severity] !== severityOrder[b.severity]) {
      return severityOrder[b.severity] - severityOrder[a.severity];
    }
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
  });

  return {
    alerts,
    alertCounts: {
      high: alerts.filter(a => a.severity === 'high').length,
      medium: alerts.filter(a => a.severity === 'medium').length,
      low: alerts.filter(a => a.severity === 'low').length,
      total: alerts.length
    }
  };
}