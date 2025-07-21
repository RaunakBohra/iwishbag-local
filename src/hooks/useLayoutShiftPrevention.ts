// ============================================================================
// LAYOUT SHIFT PREVENTION HOOK - Prevents CLS by reserving space and batching DOM updates
// Addresses visual jumping issues in dynamic admin interface components
// ============================================================================

import { useCallback, useEffect, useRef, useState } from 'react';
import { startTransition } from 'react';

interface LayoutShiftPreventionOptions {
  reserveSpace?: boolean;
  minHeight?: string | number;
  transitionDuration?: number;
  debounceMs?: number;
}

interface UseLayoutShiftPreventionReturn {
  containerRef: React.RefObject<HTMLElement>;
  reserveHeight: (height: number) => void;
  batchDOMUpdate: (updateFn: () => void) => void;
  isStabilizing: boolean;
  setStableMinHeight: (height: string | number) => void;
}

export const useLayoutShiftPrevention = (
  options: LayoutShiftPreventionOptions = {},
): UseLayoutShiftPreventionReturn => {
  const {
    reserveSpace = true,
    minHeight = 'auto',
    transitionDuration = 200,
    debounceMs = 100,
  } = options;

  const containerRef = useRef<HTMLElement>(null);
  const [reservedHeight, setReservedHeight] = useState<number | null>(null);
  const [isStabilizing, setIsStabilizing] = useState(false);
  const [stableMinHeight, setStableMinHeightState] = useState<string | number>(minHeight);
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const updateQueueRef = useRef<(() => void)[]>([]);

  // Set stable minimum height for containers with dynamic content
  const setStableMinHeight = useCallback((height: string | number) => {
    setStableMinHeightState(height);
  }, []);

  // Reserve specific height to prevent layout shifts
  const reserveHeight = useCallback(
    (height: number) => {
      if (!reserveSpace) return;

      setReservedHeight(height);

      // Apply reserved height to container
      if (containerRef.current) {
        containerRef.current.style.minHeight = `${height}px`;
      }
    },
    [reserveSpace],
  );

  // Batch DOM updates to prevent multiple reflows
  const batchDOMUpdate = useCallback(
    (updateFn: () => void) => {
      updateQueueRef.current.push(updateFn);

      // Clear existing timeout
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }

      // Debounce the batch processing
      updateTimeoutRef.current = setTimeout(() => {
        if (updateQueueRef.current.length === 0) return;

        setIsStabilizing(true);

        // Measure current height before updates
        let previousHeight = 0;
        if (containerRef.current && reserveSpace) {
          previousHeight = containerRef.current.offsetHeight;
        }

        // Process all queued updates in a single frame
        startTransition(() => {
          const updates = [...updateQueueRef.current];
          updateQueueRef.current = [];

          // Apply all updates
          updates.forEach((updateFn) => updateFn());

          // After updates, ensure height stability
          if (containerRef.current && reserveSpace && previousHeight > 0) {
            requestAnimationFrame(() => {
              const newHeight = containerRef.current?.offsetHeight || 0;

              // If height changed significantly, apply smooth transition
              if (Math.abs(newHeight - previousHeight) > 10) {
                if (containerRef.current) {
                  containerRef.current.style.transition = `min-height ${transitionDuration}ms ease-out`;
                  containerRef.current.style.minHeight = `${Math.max(newHeight, previousHeight)}px`;

                  // Reset transition after completion
                  setTimeout(() => {
                    if (containerRef.current) {
                      containerRef.current.style.transition = '';
                    }
                    setIsStabilizing(false);
                  }, transitionDuration);
                }
              } else {
                setIsStabilizing(false);
              }
            });
          } else {
            setIsStabilizing(false);
          }
        });
      }, debounceMs);
    },
    [reserveSpace, transitionDuration, debounceMs],
  );

  // Apply stable min-height on mount and when it changes
  useEffect(() => {
    if (containerRef.current && stableMinHeight !== 'auto') {
      const heightValue =
        typeof stableMinHeight === 'number' ? `${stableMinHeight}px` : stableMinHeight;
      containerRef.current.style.minHeight = heightValue;
    }
  }, [stableMinHeight]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, []);

  // Observer to detect and prevent unexpected layout shifts
  useEffect(() => {
    if (!containerRef.current || !reserveSpace) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const newHeight = entry.contentRect.height;

        // Only reserve height for significant increases
        if (newHeight > (reservedHeight || 0) + 20) {
          reserveHeight(newHeight);
        }
      }
    });

    observer.observe(containerRef.current);

    return () => observer.disconnect();
  }, [reserveHeight, reservedHeight, reserveSpace]);

  return {
    containerRef,
    reserveHeight,
    batchDOMUpdate,
    isStabilizing,
    setStableMinHeight,
  };
};
