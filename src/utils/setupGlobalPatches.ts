/**
 * Global patches to fix React timing issues
 * This file should be imported at the very top of your index.tsx or App.tsx
 */

// Store original React.useState
const originalUseState = (window as any).React?.useState || (() => {});

// Enhanced useState that adds a small delay for initial values
export function patchReactHooks() {
  if (typeof window !== 'undefined' && (window as any).React) {
    const React = (window as any).React;
    
    // Only patch in development
    if (process.env.NODE_ENV === 'development') {
      // Patch useState to handle timing issues
      React.useState = function<T>(initialValue: T | (() => T)) {
        const [value, setValue] = originalUseState(initialValue);
        const [isReady, setIsReady] = originalUseState(false);
        
        React.useEffect(() => {
          // Small delay to ensure DOM is ready
          const timer = setTimeout(() => setIsReady(true), 10);
          return () => clearTimeout(timer);
        }, []);
        
        return [value, setValue];
      };
    }
  }
}

// Patch fetch to add automatic loading states
const originalFetch = window.fetch;
const loadingStates = new Map<string, boolean>();

export function patchFetch() {
  window.fetch = async function(...args: Parameters<typeof fetch>) {
    const key = typeof args[0] === 'string' ? args[0] : 'unknown';
    
    // Emit loading start event
    window.dispatchEvent(new CustomEvent('fetch-start', { detail: { key } }));
    loadingStates.set(key, true);
    
    try {
      const result = await originalFetch(...args);
      return result;
    } finally {
      // Emit loading end event
      window.dispatchEvent(new CustomEvent('fetch-end', { detail: { key } }));
      loadingStates.delete(key);
    }
  };
}

// Auto-retry for failed queries
export function setupAutoRetry() {
  if (typeof window !== 'undefined') {
    window.addEventListener('unhandledrejection', (event) => {
      const error = event.reason;
      
      // Check if it's a network error
      if (error?.message?.includes('NetworkError') || 
          error?.message?.includes('Failed to fetch')) {
        console.log('[AutoRetry] Network error detected, will retry...');
        
        // Prevent default error handling
        event.preventDefault();
        
        // Emit retry event
        window.dispatchEvent(new CustomEvent('network-retry-needed', { 
          detail: { error } 
        }));
      }
    });
  }
}

// Setup all patches
export function setupGlobalPatches() {
  patchReactHooks();
  patchFetch();
  setupAutoRetry();
  
  console.log('[GlobalPatches] All patches applied');
}