/**
 * React Query hooks for HSN-based quote calculations
 * Provides real-time updates without page refresh
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  hsnQuoteIntegrationService,
  HSNCalculationResult,
  HSNRealTimeOptions,
} from '@/services/HSNQuoteIntegrationService';
import type { UnifiedQuote } from '@/types/unified-quote';
import { useCallback, useRef, useEffect } from 'react';

// Query keys for React Query
export const HSN_QUERY_KEYS = {
  quoteCalculation: (quoteId: string) => ['hsn-quote-calculation', quoteId],
  performanceStats: () => ['hsn-performance-stats'],
  systemStatus: () => ['hsn-system-status'],
} as const;

/**
 * Main hook for HSN-based quote calculations with real-time updates
 */
export function useHSNQuoteCalculation(
  quote: UnifiedQuote | undefined,
  options: HSNRealTimeOptions = {
    enableGovernmentAPIs: true,
    enableAutoClassification: true,
    enableWeightDetection: true,
    enableMinimumValuation: true,
    updateFrequency: 'immediate',
    cacheDuration: 15 * 60 * 1000,
  },
) {
  const queryClient = useQueryClient();

  // Main calculation query with automatic refetch
  const calculationQuery = useQuery({
    queryKey: HSN_QUERY_KEYS.quoteCalculation(quote?.id || ''),
    queryFn: async (): Promise<HSNCalculationResult> => {
      if (!quote) {
        throw new Error('Quote is required for HSN calculation');
      }

      console.log(`🔄 [HSN-HOOK] Starting calculation for quote ${quote.id}`);
      const result = await hsnQuoteIntegrationService.calculateQuoteWithHSN(quote, options);

      console.log(`✅ [HSN-HOOK] Calculation completed for quote ${quote.id}:`, {
        success: result.success,
        apiCalls: result.realTimeUpdates.apiCallsMade,
        cacheHits: result.realTimeUpdates.cacheHits,
        errors: result.errors?.length || 0,
      });

      return result;
    },
    enabled: !!quote?.id,
    staleTime: options.cacheDuration,
    refetchInterval: options.updateFrequency === 'immediate' ? false : 30000, // 30s for batch mode
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    retry: (failureCount, error) => {
      console.warn(`⚠️ [HSN-HOOK] Calculation failed (attempt ${failureCount}):`, error);
      return failureCount < 2; // Retry twice then give up
    },
  });

  // Real-time sync calculation for live editing
  const liveSyncCalculation = useCallback(
    (updatedQuote: UnifiedQuote) => {
      console.log(`⚡ [HSN-HOOK] Live sync for quote ${updatedQuote.id}`);

      const result = hsnQuoteIntegrationService.calculateQuoteLiveSync(updatedQuote, options);

      // Update the query cache immediately for instant UI updates
      queryClient.setQueryData(HSN_QUERY_KEYS.quoteCalculation(updatedQuote.id), result);

      return result;
    },
    [queryClient, options],
  );

  // Mutation for manual recalculation
  const recalculateMutation = useMutation({
    mutationFn: async (updatedOptions?: Partial<HSNRealTimeOptions>) => {
      if (!quote) throw new Error('Quote is required');

      const finalOptions = { ...options, ...updatedOptions };
      return await hsnQuoteIntegrationService.calculateQuoteWithHSN(quote, finalOptions);
    },
    onSuccess: (result) => {
      queryClient.setQueryData(HSN_QUERY_KEYS.quoteCalculation(quote?.id || ''), result);
    },
    onError: (error) => {
      console.error('Manual recalculation failed:', error);
    },
  });

  return {
    // Data
    calculation: calculationQuery.data,
    quote: calculationQuery.data?.quote,
    itemBreakdowns: calculationQuery.data?.itemBreakdowns || [],
    realTimeUpdates: calculationQuery.data?.realTimeUpdates,

    // Status
    isLoading: calculationQuery.isLoading,
    isError: calculationQuery.isError,
    error: calculationQuery.error,
    isFetching: calculationQuery.isFetching,

    // Actions
    liveSyncCalculation,
    recalculate: recalculateMutation.mutate,
    isRecalculating: recalculateMutation.isPending,

    // Utilities
    refetch: calculationQuery.refetch,
    invalidate: () =>
      queryClient.invalidateQueries({
        queryKey: HSN_QUERY_KEYS.quoteCalculation(quote?.id || ''),
      }),
  };
}

/**
 * Hook for real-time live editing with debounced updates
 */
export function useHSNLiveCalculation(
  quote: UnifiedQuote | undefined,
  options?: HSNRealTimeOptions,
) {
  const debounceRef = useRef<NodeJS.Timeout>();
  const queryClient = useQueryClient();

  const updateCalculation = useCallback(
    (updatedQuote: UnifiedQuote) => {
      // Clear previous debounce
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      // Debounce the calculation to avoid excessive updates
      debounceRef.current = setTimeout(() => {
        console.log(`⚡ [HSN-LIVE] Debounced update for quote ${updatedQuote.id}`);

        const result = hsnQuoteIntegrationService.calculateQuoteLiveSync(
          updatedQuote,
          options || {
            enableGovernmentAPIs: false, // Use cached data for live updates
            enableAutoClassification: false,
            enableWeightDetection: false,
            enableMinimumValuation: true,
            updateFrequency: 'immediate',
            cacheDuration: 5 * 60 * 1000, // 5 minute cache for live updates
          },
        );

        // Update cache immediately
        queryClient.setQueryData(HSN_QUERY_KEYS.quoteCalculation(updatedQuote.id), result);
      }, 300); // 300ms debounce
    },
    [queryClient, options],
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  return { updateCalculation };
}

/**
 * Hook for HSN system performance monitoring
 */
export function useHSNPerformanceStats() {
  return useQuery({
    queryKey: HSN_QUERY_KEYS.performanceStats(),
    queryFn: async () => {
      return hsnQuoteIntegrationService.getPerformanceStats();
    },
    refetchInterval: 10000, // Update every 10 seconds
    staleTime: 5000, // 5 second stale time
  });
}

/**
 * Hook for government API system status
 */
export function useHSNSystemStatus() {
  return useQuery({
    queryKey: HSN_QUERY_KEYS.systemStatus(),
    queryFn: async () => {
      const { governmentAPIOrchestrator } = await import(
        '@/services/api/GovernmentAPIOrchestrator'
      );
      return await governmentAPIOrchestrator.getSystemStatus();
    },
    refetchInterval: 30000, // Check every 30 seconds
    staleTime: 15000, // 15 second stale time
  });
}

/**
 * Hook for batch operations
 */
export function useHSNBatchOperations() {
  const queryClient = useQueryClient();

  const clearAllCaches = useCallback(() => {
    hsnQuoteIntegrationService.clearCaches();
    queryClient.invalidateQueries({
      predicate: (query) => query.queryKey[0] === 'hsn-quote-calculation',
    });
  }, [queryClient]);

  const refreshAllCalculations = useCallback(() => {
    queryClient.invalidateQueries({
      predicate: (query) => query.queryKey[0] === 'hsn-quote-calculation',
    });
  }, [queryClient]);

  return {
    clearAllCaches,
    refreshAllCalculations,
  };
}

/**
 * Hook for optimistic updates during quote editing
 */
export function useHSNOptimisticUpdates(quoteId: string) {
  const queryClient = useQueryClient();

  const updateQuoteOptimistically = useCallback(
    (updates: Partial<UnifiedQuote>, rollback?: () => void) => {
      const queryKey = HSN_QUERY_KEYS.quoteCalculation(quoteId);

      // Get current data
      const currentData = queryClient.getQueryData<HSNCalculationResult>(queryKey);
      if (!currentData) return;

      // Apply optimistic update
      const optimisticQuote = { ...currentData.quote, ...updates };
      const optimisticResult = hsnQuoteIntegrationService.calculateQuoteLiveSync(optimisticQuote, {
        enableGovernmentAPIs: false,
        enableAutoClassification: false,
        enableWeightDetection: false,
        enableMinimumValuation: true,
        updateFrequency: 'immediate',
        cacheDuration: 1000, // Very short cache for optimistic updates
      });

      // Update cache with optimistic result
      queryClient.setQueryData(queryKey, optimisticResult);

      // Return rollback function
      return () => {
        queryClient.setQueryData(queryKey, currentData);
        rollback?.();
      };
    },
    [queryClient, quoteId],
  );

  return { updateQuoteOptimistically };
}

/**
 * Custom hook for error handling and retry logic
 */
export function useHSNErrorHandling() {
  const queryClient = useQueryClient();

  const retryFailedCalculation = useCallback(
    async (quoteId: string) => {
      const queryKey = HSN_QUERY_KEYS.quoteCalculation(quoteId);

      try {
        await queryClient.refetchQueries({ queryKey });
        return true;
      } catch (error) {
        console.error('Failed to retry HSN calculation:', error);
        return false;
      }
    },
    [queryClient],
  );

  const handleCalculationError = useCallback((error: Error, quoteId: string) => {
    console.error(`HSN calculation error for quote ${quoteId}:`, error);

    // Could integrate with error reporting service here
    // reportError(error, { context: 'hsn-calculation', quoteId });

    // Show user-friendly error message
    return {
      message: 'Tax calculation temporarily unavailable. Using cached rates.',
      canRetry: true,
      fallbackAvailable: true,
    };
  }, []);

  return {
    retryFailedCalculation,
    handleCalculationError,
  };
}
