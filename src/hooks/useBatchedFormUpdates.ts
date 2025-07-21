// ============================================================================
// BATCHED FORM UPDATES HOOK - Prevents layout shifts by batching form operations
// Addresses performance issues in admin forms with multiple real-time updates
// ============================================================================

import { useCallback, useRef, useEffect } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { startTransition } from 'react';

interface BatchedUpdate<T = any> {
  field: string;
  value: T;
  options?: {
    shouldValidate?: boolean;
    shouldDirty?: boolean;
  };
}

interface UseBatchedFormUpdatesOptions {
  debounceMs?: number;
  maxBatchSize?: number;
  onBatchComplete?: () => void;
}

export const useBatchedFormUpdates = <T extends Record<string, any>>(
  form: UseFormReturn<T>,
  options: UseBatchedFormUpdatesOptions = {},
) => {
  const { debounceMs = 300, maxBatchSize = 10, onBatchComplete } = options;

  const batchQueue = useRef<BatchedUpdate[]>([]);
  const batchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isProcessingBatch = useRef(false);

  // Process batched updates
  const processBatch = useCallback(() => {
    if (isProcessingBatch.current || batchQueue.current.length === 0) {
      return;
    }

    isProcessingBatch.current = true;
    const updates = [...batchQueue.current];
    batchQueue.current = [];

    // Use React 18's startTransition for non-urgent updates
    startTransition(() => {
      // Group updates by type to minimize re-renders
      const fieldGroups: Record<string, BatchedUpdate> = {};

      // Keep only the latest update per field (reduces unnecessary updates)
      updates.forEach((update) => {
        fieldGroups[update.field] = update;
      });

      // Apply all updates in a single batch
      Object.values(fieldGroups).forEach(({ field, value, options = {} }) => {
        form.setValue(field as any, value, {
          shouldValidate: options.shouldValidate ?? false, // Delay validation
          shouldDirty: options.shouldDirty ?? true,
        });
      });

      // Trigger validation once at the end if needed
      const hasValidationUpdates = Object.values(fieldGroups).some(
        (update) => update.options?.shouldValidate,
      );

      if (hasValidationUpdates) {
        // Validate only changed fields
        const changedFields = Object.keys(fieldGroups);
        changedFields.forEach((field) => {
          form.trigger(field as any);
        });
      }

      isProcessingBatch.current = false;
      onBatchComplete?.();
    });
  }, [form, onBatchComplete]);

  // Clear timeout on unmount
  useEffect(() => {
    return () => {
      if (batchTimeoutRef.current) {
        clearTimeout(batchTimeoutRef.current);
      }
    };
  }, []);

  // Batch a single form update
  const batchUpdate = useCallback(
    <K extends keyof T>(field: K, value: T[K], options?: BatchedUpdate['options']) => {
      // Add to batch queue
      batchQueue.current.push({
        field: field as string,
        value,
        options,
      });

      // Clear existing timeout
      if (batchTimeoutRef.current) {
        clearTimeout(batchTimeoutRef.current);
      }

      // Process immediately if batch is full
      if (batchQueue.current.length >= maxBatchSize) {
        processBatch();
        return;
      }

      // Otherwise, debounce the batch processing
      batchTimeoutRef.current = setTimeout(() => {
        processBatch();
      }, debounceMs);
    },
    [processBatch, debounceMs, maxBatchSize],
  );

  // Batch multiple form updates
  const batchMultipleUpdates = useCallback(
    (
      updates: Array<{
        field: keyof T;
        value: any;
        options?: BatchedUpdate['options'];
      }>,
    ) => {
      // Add all updates to batch queue
      updates.forEach(({ field, value, options }) => {
        batchQueue.current.push({
          field: field as string,
          value,
          options,
        });
      });

      // Process immediately for multiple updates
      processBatch();
    },
    [processBatch],
  );

  // Force immediate processing of pending updates
  const flushUpdates = useCallback(() => {
    if (batchTimeoutRef.current) {
      clearTimeout(batchTimeoutRef.current);
      batchTimeoutRef.current = null;
    }
    processBatch();
  }, [processBatch]);

  // Get pending update count
  const getPendingUpdatesCount = useCallback(() => {
    return batchQueue.current.length;
  }, []);

  return {
    batchUpdate,
    batchMultipleUpdates,
    flushUpdates,
    getPendingUpdatesCount,
    isProcessingBatch: isProcessingBatch.current,
  };
};
