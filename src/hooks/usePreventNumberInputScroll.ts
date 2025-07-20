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
      if (target && target.type === 'number') {
        // Only prevent if the input is focused or if user is scrolling over it
        if (document.activeElement === target || target.matches(':hover')) {
          e.preventDefault();
          e.stopPropagation();
        }
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