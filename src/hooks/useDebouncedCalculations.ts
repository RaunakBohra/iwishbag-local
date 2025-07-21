// ============================================================================
// DEBOUNCED CALCULATIONS HOOK - Prevents excessive calculations causing layout shifts
// Optimizes performance by batching calculation requests and avoiding unnecessary API calls
// ============================================================================

import { useCallback, useRef, useEffect, useState } from 'react';
import { startTransition } from 'react';

interface DebouncedCalculationOptions {
  debounceMs?: number;
  maxPendingCalculations?: number;
  enableLogging?: boolean;
}

interface CalculationRequest {
  id: string;
  calculationFn: () => Promise<any> | any;
  dependencies: any[];
  timestamp: number;
}

interface UseDebouncedCalculationsReturn {
  scheduleCalculation: (
    id: string,
    calculationFn: () => Promise<any> | any,
    dependencies: any[],
  ) => void;
  cancelCalculation: (id: string) => void;
  isCalculating: boolean;
  pendingCalculations: number;
  flushCalculations: () => Promise<void>;
}

export const useDebouncedCalculations = (
  options: DebouncedCalculationOptions = {},
): UseDebouncedCalculationsReturn => {
  const { debounceMs = 800, maxPendingCalculations = 5, enableLogging = false } = options;

  const [isCalculating, setIsCalculating] = useState(false);
  const [pendingCalculations, setPendingCalculations] = useState(0);

  const calculationQueueRef = useRef<Map<string, CalculationRequest>>(new Map());
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastDependenciesRef = useRef<Map<string, any[]>>(new Map());

  // Log function for debugging
  const log = useCallback(
    (message: string, ...args: any[]) => {
      if (enableLogging) {
        console.log(`[DebouncedCalculations] ${message}`, ...args);
      }
    },
    [enableLogging],
  );

  // Check if dependencies have changed
  const dependenciesChanged = useCallback((id: string, newDependencies: any[]): boolean => {
    const oldDependencies = lastDependenciesRef.current.get(id);
    if (!oldDependencies) return true;

    if (oldDependencies.length !== newDependencies.length) return true;

    return oldDependencies.some((dep, index) => {
      const newDep = newDependencies[index];

      // Deep comparison for objects and arrays
      if (typeof dep === 'object' && typeof newDep === 'object') {
        return JSON.stringify(dep) !== JSON.stringify(newDep);
      }

      return dep !== newDep;
    });
  }, []);

  // Process queued calculations
  const processCalculations = useCallback(async () => {
    if (calculationQueueRef.current.size === 0) {
      return;
    }

    setIsCalculating(true);
    setPendingCalculations(calculationQueueRef.current.size);

    log('Processing calculations', {
      count: calculationQueueRef.current.size,
      calculations: Array.from(calculationQueueRef.current.keys()),
    });

    const calculations = Array.from(calculationQueueRef.current.values());
    calculationQueueRef.current.clear();

    // Sort by timestamp to maintain order
    calculations.sort((a, b) => a.timestamp - b.timestamp);

    try {
      // Process calculations in batches to avoid overwhelming the system
      const results = await Promise.allSettled(
        calculations.map(async ({ id, calculationFn, dependencies }) => {
          try {
            log(`Executing calculation: ${id}`);
            const result = await calculationFn();

            // Update dependencies cache
            lastDependenciesRef.current.set(id, dependencies);

            return { id, result, success: true };
          } catch (error) {
            log(`Calculation error for ${id}:`, error);
            return { id, error, success: false };
          }
        }),
      );

      log('Calculations completed', {
        successful: results.filter((r) => r.status === 'fulfilled').length,
        failed: results.filter((r) => r.status === 'rejected').length,
      });
    } catch (error) {
      log('Batch calculation error:', error);
    } finally {
      startTransition(() => {
        setIsCalculating(false);
        setPendingCalculations(0);
      });
    }
  }, [log]);

  // Schedule a calculation
  const scheduleCalculation = useCallback(
    (id: string, calculationFn: () => Promise<any> | any, dependencies: any[]) => {
      // Skip if dependencies haven't changed
      if (!dependenciesChanged(id, dependencies)) {
        log(`Skipping calculation ${id} - dependencies unchanged`);
        return;
      }

      // Remove existing calculation with same ID
      if (calculationQueueRef.current.has(id)) {
        log(`Replacing existing calculation: ${id}`);
      }

      // Add to queue
      calculationQueueRef.current.set(id, {
        id,
        calculationFn,
        dependencies,
        timestamp: Date.now(),
      });

      log(`Scheduled calculation: ${id}`, { dependencies });

      // Remove oldest calculations if queue is too large
      if (calculationQueueRef.current.size > maxPendingCalculations) {
        const oldestId = Array.from(calculationQueueRef.current.entries()).sort(
          ([, a], [, b]) => a.timestamp - b.timestamp,
        )[0][0];

        calculationQueueRef.current.delete(oldestId);
        log(`Removed oldest calculation: ${oldestId}`);
      }

      // Clear existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Set new timeout
      timeoutRef.current = setTimeout(processCalculations, debounceMs);

      setPendingCalculations(calculationQueueRef.current.size);
    },
    [dependenciesChanged, processCalculations, debounceMs, maxPendingCalculations, log],
  );

  // Cancel a specific calculation
  const cancelCalculation = useCallback(
    (id: string) => {
      if (calculationQueueRef.current.has(id)) {
        calculationQueueRef.current.delete(id);
        setPendingCalculations(calculationQueueRef.current.size);
        log(`Cancelled calculation: ${id}`);

        // Clear timeout if queue is empty
        if (calculationQueueRef.current.size === 0 && timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
      }
    },
    [log],
  );

  // Flush all pending calculations immediately
  const flushCalculations = useCallback(async () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    await processCalculations();
  }, [processCalculations]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      calculationQueueRef.current.clear();
      lastDependenciesRef.current.clear();
    };
  }, []);

  return {
    scheduleCalculation,
    cancelCalculation,
    isCalculating,
    pendingCalculations,
    flushCalculations,
  };
};
