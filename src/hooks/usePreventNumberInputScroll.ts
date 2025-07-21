import { useEffect } from 'react';

/**
 * Hook to prevent scroll wheel from changing number input values globally
 * This fixes the annoying behavior where scrolling over number inputs changes their values
 */
export const usePreventNumberInputScroll = () => {
  useEffect(() => {
    // Prevent wheel events on number inputs
    const preventNumberInputScroll = (e: WheelEvent) => {
      const target = e.target as HTMLInputElement;

      // Only prevent if:
      // 1. Target is specifically a number input
      // 2. The number input is currently focused (has user's attention)
      // 3. NOT inside any dropdown/modal/overlay content
      if (
        target &&
        target.type === 'number' &&
        document.activeElement === target &&
        !target.closest(
          '[data-radix-select-content], [data-radix-popper-content-wrapper], [role="dialog"], .select-content, [data-state="open"]',
        )
      ) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    // Add event listener to document with passive: false so we can preventDefault
    document.addEventListener('wheel', preventNumberInputScroll, { passive: false });

    // Cleanup function to remove event listener
    return () => {
      document.removeEventListener('wheel', preventNumberInputScroll);
    };
  }, []);
};
