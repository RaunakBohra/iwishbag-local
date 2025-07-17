import { useState, useCallback, useMemo, useEffect } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { useQuery } from '@tanstack/react-query';
import {
  quoteCalculatorService,
  QuoteCalculationParams,
  QuoteCalculationResult,
} from '@/services/QuoteCalculatorService';
import { Tables } from '@/integrations/supabase/types';

export interface UseOptimizedQuoteCalculationOptions {
  enabled?: boolean;
  onCalculationComplete?: (result: QuoteCalculationResult) => void;
  onCalculationError?: (error: Error) => void;
  realTimeUpdates?: boolean;
  debounceMs?: number;
}

export interface UseOptimizedQuoteCalculationResult {
  // Calculation methods
  calculateQuote: (params: QuoteCalculationParams) => Promise<QuoteCalculationResult>;
  calculateQuoteSync: (params: QuoteCalculationParams) => void;

  // State
  result: QuoteCalculationResult | null;
  isCalculating: boolean;
  error: string | null;

  // Performance data
  performanceMetrics: Record<string, unknown>;
  cacheStats: Record<string, unknown>;

  // Utilities
  clearCache: () => void;
  validateParams: (params: QuoteCalculationParams) => {
    isValid: boolean;
    errors: string[];
  };
}

export function useOptimizedQuoteCalculation(
  options: UseOptimizedQuoteCalculationOptions = {},
): UseOptimizedQuoteCalculationResult {
  const { toast } = useToast();
  const [result, setResult] = useState<QuoteCalculationResult | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get performance metrics
  const { data: performanceMetrics } = useQuery({
    queryKey: ['quoteCalculatorPerformance'],
    queryFn: () => quoteCalculatorService.getPerformanceMetrics(),
    refetchInterval: 30000, // Update every 30 seconds
    enabled: options.enabled !== false,
  });

  // Get cache statistics
  const { data: cacheStats } = useQuery({
    queryKey: ['quoteCalculatorCache'],
    queryFn: () => quoteCalculatorService.getCacheStats(),
    refetchInterval: 10000, // Update every 10 seconds
    enabled: options.enabled !== false,
  });

  // Main calculation function
  const calculateQuote = useCallback(
    async (params: QuoteCalculationParams): Promise<QuoteCalculationResult> => {
      setIsCalculating(true);
      setError(null);

      try {
        console.log('[OptimizedQuoteCalculation] Starting calculation with params:', {
          itemCount: params.items.length,
          origin: params.originCountry,
          destination: params.destinationCountry,
          currency: params.currency,
        });

        const calculationResult = await quoteCalculatorService.calculateQuote(params);

        console.log('[OptimizedQuoteCalculation] Calculation result:', {
          success: calculationResult.success,
          finalTotal: calculationResult.breakdown?.final_total,
          cacheHit: calculationResult.performance?.cache_hits || 0,
          calculationTime: calculationResult.performance?.calculation_time_ms,
        });

        setResult(calculationResult);

        if (calculationResult.success) {
          // Show warnings if any
          if (calculationResult.warnings && calculationResult.warnings.length > 0) {
            toast({
              title: 'Calculation Warnings',
              description: calculationResult.warnings.join(', '),
              variant: 'default',
            });
          }

          options.onCalculationComplete?.(calculationResult);
        } else {
          const errorMessage = calculationResult.error?.message || 'Unknown calculation error';
          setError(errorMessage);

          toast({
            title: 'Calculation Error',
            description: errorMessage,
            variant: 'destructive',
          });

          options.onCalculationError?.(calculationResult.error);
        }

        return calculationResult;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to calculate quote';
        setError(errorMessage);

        console.error('[OptimizedQuoteCalculation] Calculation failed:', err);

        toast({
          title: 'Calculation Failed',
          description: errorMessage,
          variant: 'destructive',
        });

        const failureResult: QuoteCalculationResult = {
          success: false,
          breakdown: null,
          error: {
            code: 'CALCULATION_FAILED',
            message: errorMessage,
            details: err,
          },
        };

        setResult(failureResult);
        options.onCalculationError?.(err);

        return failureResult;
      } finally {
        setIsCalculating(false);
      }
    },
    [toast, options.onCalculationComplete, options.onCalculationError],
  );

  // Synchronous calculation that doesn't block UI
  const calculateQuoteSync = useCallback(
    (params: QuoteCalculationParams) => {
      // Use setTimeout to avoid blocking the UI
      setTimeout(() => {
        calculateQuote(params);
      }, 0);
    },
    [calculateQuote],
  );

  // Validation function
  const validateParams = useCallback((params: QuoteCalculationParams) => {
    // Create a minimal service instance for validation
    return quoteCalculatorService['validateCalculationParams'](params);
  }, []);

  // Clear cache function
  const clearCache = useCallback(() => {
    quoteCalculatorService.clearCache();
    toast({
      title: 'Cache Cleared',
      description: 'Quote calculation cache has been cleared.',
      variant: 'default',
    });
  }, [toast]);

  return {
    calculateQuote,
    calculateQuoteSync,
    result,
    isCalculating,
    error,
    performanceMetrics: performanceMetrics || {
      totalCalculations: 0,
      totalCacheHits: 0,
      cacheHitRate: 0,
      averageCalculationTime: 0,
    },
    cacheStats: cacheStats || {
      calculationCache: { size: 0 },
      exchangeRateCache: { size: 0 },
    },
    clearCache,
    validateParams,
  };
}

// Specialized hook for real-time calculations with debouncing
export function useRealTimeQuoteCalculation(
  params: QuoteCalculationParams | null,
  options: {
    debounceMs?: number;
    enabled?: boolean;
    onCalculationComplete?: (result: QuoteCalculationResult) => void;
  } = {},
) {
  const { debounceMs = 500, enabled = true } = options;

  // Create a debounced query key
  const [debouncedParams, setDebouncedParams] = useState<QuoteCalculationParams | null>(null);

  useEffect(() => {
    if (!params || !enabled) {
      setDebouncedParams(null);
      return;
    }

    const timeoutId = setTimeout(() => {
      setDebouncedParams(params);
    }, debounceMs);

    return () => clearTimeout(timeoutId);
  }, [params, debounceMs, enabled]);

  // Use React Query for the actual calculation
  const {
    data: result,
    isLoading: isCalculating,
    error,
    refetch,
  } = useQuery({
    queryKey: ['realTimeQuoteCalculation', debouncedParams],
    queryFn: async () => {
      if (!debouncedParams) return null;
      return quoteCalculatorService.calculateQuote(debouncedParams);
    },
    enabled: !!debouncedParams && enabled,
    staleTime: 30000, // 30 seconds
    gcTime: 300000, // 5 minutes
    retry: 1,
    refetchOnWindowFocus: false,
  });

  // Call completion callback when calculation finishes
  useEffect(() => {
    if (result && options.onCalculationComplete) {
      options.onCalculationComplete(result);
    }
  }, [result, options.onCalculationComplete]);

  return {
    result,
    isCalculating,
    error: error?.message || null,
    refetch: () => refetch(),
  };
}

// Hook for batch calculations
export function useBatchQuoteCalculation() {
  const [results, setResults] = useState<Map<string, QuoteCalculationResult>>(new Map());
  const [isCalculating, setIsCalculating] = useState(false);
  const [progress, setProgress] = useState({ completed: 0, total: 0 });

  const calculateBatch = useCallback(
    async (
      calculations: Array<{ id: string; params: QuoteCalculationParams }>,
    ): Promise<Map<string, QuoteCalculationResult>> => {
      setIsCalculating(true);
      setProgress({ completed: 0, total: calculations.length });

      const batchResults = new Map<string, QuoteCalculationResult>();

      try {
        // Process calculations in parallel with a concurrency limit
        const BATCH_SIZE = 3; // Process 3 at a time to avoid overwhelming the system

        for (let i = 0; i < calculations.length; i += BATCH_SIZE) {
          const batch = calculations.slice(i, i + BATCH_SIZE);

          const batchPromises = batch.map(async ({ id, params }) => {
            const result = await quoteCalculatorService.calculateQuote(params);
            return { id, result };
          });

          const batchCompletions = await Promise.allSettled(batchPromises);

          batchCompletions.forEach((completion, index) => {
            const { id } = batch[index];

            if (completion.status === 'fulfilled') {
              batchResults.set(id, completion.value.result);
            } else {
              batchResults.set(id, {
                success: false,
                breakdown: null,
                error: {
                  code: 'BATCH_CALCULATION_FAILED',
                  message: completion.reason?.message || 'Batch calculation failed',
                  details: completion.reason,
                },
              });
            }
          });

          setProgress({
            completed: i + batch.length,
            total: calculations.length,
          });
        }

        setResults(batchResults);
        return batchResults;
      } finally {
        setIsCalculating(false);
        setProgress({ completed: 0, total: 0 });
      }
    },
    [],
  );

  return {
    calculateBatch,
    results,
    isCalculating,
    progress,
  };
}
