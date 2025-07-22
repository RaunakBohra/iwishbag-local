// ============================================================================
// GLOBAL SCROLL LOCK HOOK - Prevents unwanted scrolling during admin operations
// Addresses scroll interference when performing critical admin tasks
// ============================================================================

import { useEffect, useCallback, useRef } from 'react';

interface ScrollLockOptions {
  lockOnMount?: boolean;
  preserveScrollbarGutter?: boolean;
  allowedScrollContainers?: string[]; // CSS selectors for containers that can still scroll
}

interface UseGlobalScrollLockReturn {
  lockScroll: () => void;
  unlockScroll: () => void;
  isLocked: boolean;
  forceUnlock: () => void;
}

// Emergency global unlock function for debugging
const emergencyGlobalUnlock = () => {
  if (typeof window !== 'undefined') {
    document.body.style.overflow = '';
    document.documentElement.style.overflow = '';
    document.body.classList.remove('scroll-locked');
    console.log('[GlobalScrollLock] Emergency unlock executed');
  }
};

// Make it available globally for debugging
if (typeof window !== 'undefined') {
  (window as any).emergencyUnlockScroll = emergencyGlobalUnlock;
}

export const useGlobalScrollLock = (options: ScrollLockOptions = {}): UseGlobalScrollLockReturn => {
  const {
    lockOnMount = false,
    preserveScrollbarGutter = true,
    allowedScrollContainers = [],
  } = options;

  const isLockedRef = useRef(false);
  const originalStylesRef = useRef<{
    overflow: string;
    paddingRight: string;
    position: string;
  } | null>(null);
  const lockCountRef = useRef(0);

  // Get scrollbar width to prevent layout shift
  const getScrollbarWidth = useCallback((): number => {
    if (!preserveScrollbarGutter) return 0;

    const outer = document.createElement('div');
    outer.style.visibility = 'hidden';
    outer.style.overflow = 'scroll';
    document.body.appendChild(outer);

    const inner = document.createElement('div');
    outer.appendChild(inner);

    const scrollbarWidth = outer.offsetWidth - inner.offsetWidth;
    outer.parentNode?.removeChild(outer);

    return scrollbarWidth;
  }, [preserveScrollbarGutter]);

  // Prevent scroll on specific elements
  const preventScroll = useCallback(
    (e: Event) => {
      const target = e.target as Element;

      // Allow scroll in specifically allowed containers
      for (const selector of allowedScrollContainers) {
        if (target.closest(selector)) {
          return;
        }
      }

      // Prevent wheel and touch events that cause scrolling
      if (e.type === 'wheel' || e.type === 'touchmove') {
        e.preventDefault();
      }
    },
    [allowedScrollContainers],
  );

  // Lock scroll
  const lockScroll = useCallback(() => {
    if (typeof window === 'undefined') return;

    lockCountRef.current += 1;

    // Only apply lock styles on first lock
    if (lockCountRef.current === 1 && !isLockedRef.current) {
      const body = document.body;
      const scrollbarWidth = getScrollbarWidth();

      // Store original styles
      originalStylesRef.current = {
        overflow: body.style.overflow || '',
        paddingRight: body.style.paddingRight || '',
        position: body.style.position || '',
      };

      // Apply lock styles
      body.style.overflow = 'hidden';

      // Prevent layout shift by adding padding for scrollbar
      if (preserveScrollbarGutter && scrollbarWidth > 0) {
        body.style.paddingRight = `${scrollbarWidth}px`;
      }

      // Add event listeners to prevent scroll
      document.addEventListener('wheel', preventScroll, { passive: false });
      document.addEventListener('touchmove', preventScroll, { passive: false });
      document.addEventListener('keydown', handleKeyDown, { passive: false });

      isLockedRef.current = true;

      console.log('[ScrollLock] Global scroll locked');
    }
  }, [getScrollbarWidth, preserveScrollbarGutter, preventScroll]);

  // Handle keyboard navigation prevention
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Prevent scrolling keys: arrow keys, page up/down, home, end, space
      const scrollKeys = [
        'ArrowUp',
        'ArrowDown',
        'ArrowLeft',
        'ArrowRight',
        'PageUp',
        'PageDown',
        'Home',
        'End',
        'Space',
      ];

      if (scrollKeys.includes(e.code)) {
        // Allow if target is an input or in allowed containers
        const target = e.target as Element;
        const isInput = target.matches('input, textarea, select, [contenteditable]');

        if (!isInput) {
          // Check if in allowed scroll container
          let inAllowedContainer = false;
          for (const selector of allowedScrollContainers) {
            if (target.closest(selector)) {
              inAllowedContainer = true;
              break;
            }
          }

          if (!inAllowedContainer) {
            e.preventDefault();
          }
        }
      }
    },
    [allowedScrollContainers],
  );

  // Unlock scroll
  const unlockScroll = useCallback(() => {
    if (typeof window === 'undefined') return;

    lockCountRef.current = Math.max(0, lockCountRef.current - 1);

    // Only remove lock styles when all locks are released
    if (lockCountRef.current === 0 && isLockedRef.current) {
      const body = document.body;

      // Restore original styles
      if (originalStylesRef.current) {
        body.style.overflow = originalStylesRef.current.overflow;
        body.style.paddingRight = originalStylesRef.current.paddingRight;
        body.style.position = originalStylesRef.current.position;
      }

      // Remove event listeners
      document.removeEventListener('wheel', preventScroll);
      document.removeEventListener('touchmove', preventScroll);
      document.removeEventListener('keydown', handleKeyDown);

      isLockedRef.current = false;
      originalStylesRef.current = null;

      console.log('[ScrollLock] Global scroll unlocked');
    }
  }, [preventScroll, handleKeyDown]);

  // Force unlock (emergency release)
  const forceUnlock = useCallback(() => {
    lockCountRef.current = 0;
    unlockScroll();
  }, [unlockScroll]);

  // Lock on mount if requested
  useEffect(() => {
    if (lockOnMount) {
      lockScroll();
    }

    // Cleanup on unmount
    return () => {
      if (isLockedRef.current) {
        forceUnlock();
      }
    };
  }, [lockOnMount, lockScroll, forceUnlock]);

  return {
    lockScroll,
    unlockScroll,
    isLocked: isLockedRef.current,
    forceUnlock,
  };
};
