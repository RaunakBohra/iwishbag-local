import React, { useEffect, useRef, useState, useCallback } from 'react';

/**
 * TurnstileWidget - Cloudflare Turnstile CAPTCHA Integration
 * 
 * IMPORTANT: This component is optimized for stable rendering to prevent
 * unnecessary re-renders when form inputs change. Key features:
 * 
 * 1. STABLE RENDERING: Widget renders once and stays stable during form interactions
 * 2. CALLBACK REFS: Uses refs to store latest callbacks, preventing re-renders
 * 3. MINIMAL DEPENDENCIES: Only re-renders when essential props change (siteKey, theme, size, disabled)
 * 4. PROPER CLEANUP: Automatically cleans up widgets on unmount
 * 5. DUPLICATE PREVENTION: Global registry prevents multiple widgets
 * 
 * Industry Best Practices Implemented:
 * - Widget stays stable during form typing
 * - Only resets on explicit actions (errors, expiration)
 * - Hidden when disabled (not showing "disabled" message)
 * - Graceful loading and error states
 */

interface TurnstileWidgetProps {
  siteKey: string;
  onSuccess: (token: string) => void;
  onError?: (error: string) => void;
  onExpired?: () => void;
  theme?: 'light' | 'dark' | 'auto';
  size?: 'normal' | 'compact';
  action?: string;
  cData?: string;
  className?: string;
  disabled?: boolean;
}

// Global registry to track active widgets
let activeWidgets = new Set<string>();

declare global {
  interface Window {
    turnstile?: {
      render: (
        element: HTMLElement | string,
        options: {
          sitekey: string;
          callback: (token: string) => void;
          'error-callback'?: (error: string) => void;
          'expired-callback'?: () => void;
          theme?: 'light' | 'dark' | 'auto';
          size?: 'normal' | 'compact';
          action?: string;
          cData?: string;
        }
      ) => string;
      reset: (widgetId?: string) => void;
      remove: (widgetId?: string) => void;
      getResponse: (widgetId?: string) => string | undefined;
    };
  }
}

export const TurnstileWidget: React.FC<TurnstileWidgetProps> = ({
  siteKey,
  onSuccess,
  onError,
  onExpired,
  theme = 'auto',
  size = 'normal',
  action,
  cData,
  className = '',
  disabled = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [widgetId, setWidgetId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isRendering = useRef(false);
  const componentId = useRef(`turnstile-${Date.now()}-${Math.random()}`);

  // Store latest callbacks and config in refs to avoid re-renders when they change
  const onSuccessRef = useRef(onSuccess);
  const onErrorRef = useRef(onError);
  const onExpiredRef = useRef(onExpired);
  const actionRef = useRef(action);
  const cDataRef = useRef(cData);

  // Update refs when callbacks change
  useEffect(() => {
    onSuccessRef.current = onSuccess;
  }, [onSuccess]);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  useEffect(() => {
    onExpiredRef.current = onExpired;
  }, [onExpired]);

  useEffect(() => {
    actionRef.current = action;
  }, [action]);

  useEffect(() => {
    cDataRef.current = cData;
  }, [cData]);

  // Load Turnstile script
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
    script.async = true;
    script.defer = true;
    
    script.onload = () => {
      setIsLoading(false);
    };
    
    script.onerror = () => {
      setError('Failed to load Turnstile script');
      setIsLoading(false);
    };

    // Check if script is already loaded
    if (window.turnstile) {
      setIsLoading(false);
    } else if (!document.querySelector('script[src*="turnstile"]')) {
      document.head.appendChild(script);
    }

    return () => {
      // Cleanup script if component unmounts during loading
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, []);

  // Render widget when script is loaded
  useEffect(() => {
    if (isLoading || !window.turnstile || !containerRef.current || disabled || isRendering.current) {
      return;
    }

    // Check if this widget is already being rendered
    const currentId = componentId.current;
    if (activeWidgets.has(currentId)) {
      console.warn('Turnstile widget already rendered for this component');
      return;
    }

    isRendering.current = true;
    activeWidgets.add(currentId);

    // Clear any existing widget in the container first
    if (containerRef.current) {
      containerRef.current.innerHTML = '';
    }

    // Cleanup any existing widget before creating a new one
    if (widgetId && window.turnstile) {
      try {
        window.turnstile.remove(widgetId);
        setWidgetId(null);
      } catch (err) {
        console.warn('Failed to cleanup previous Turnstile widget:', err);
      }
    }

    try {
      const id = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        callback: (token: string) => {
          onSuccessRef.current(token);
        },
        'error-callback': (error: string) => {
          setError(`Turnstile error: ${error}`);
          onErrorRef.current?.(error);
        },
        'expired-callback': () => {
          onExpiredRef.current?.();
        },
        theme,
        size,
        action: actionRef.current,
        cData: cDataRef.current,
      });

      setWidgetId(id);
      isRendering.current = false;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(`Failed to render Turnstile: ${errorMessage}`);
      onError?.(errorMessage);
      isRendering.current = false;
      activeWidgets.delete(currentId);
    }

    // Cleanup function
    return () => {
      isRendering.current = false;
      activeWidgets.delete(currentId);
      if (widgetId && window.turnstile) {
        try {
          window.turnstile.remove(widgetId);
        } catch (err) {
          console.warn('Failed to cleanup Turnstile widget:', err);
        }
      }
    };
  }, [isLoading, siteKey, theme, size, disabled]);

  // Reset widget method
  const reset = () => {
    if (widgetId && window.turnstile) {
      window.turnstile.reset(widgetId);
    }
  };

  // Get current response
  const getResponse = (): string | undefined => {
    if (widgetId && window.turnstile) {
      return window.turnstile.getResponse(widgetId);
    }
    return undefined;
  };

  // Note: No useImperativeHandle needed since this component doesn't use forwardRef
  // Methods can be accessed through component state if needed in the future

  if (error) {
    return (
      <div className={`turnstile-error p-3 border border-red-300 rounded bg-red-50 text-red-700 text-sm ${className}`}>
        <strong>Security verification failed:</strong> {error}
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={`turnstile-loading p-4 border border-gray-200 rounded-lg bg-gray-50 text-gray-600 text-sm ${className}`}>
        <div className="flex items-center gap-2">
          <div className="animate-spin h-4 w-4 border-2 border-gray-300 border-t-teal-600 rounded-full"></div>
          <span>Loading security verification...</span>
        </div>
      </div>
    );
  }

  if (disabled) {
    // Return null to hide the widget entirely when disabled (better UX)
    return null;
  }

  return (
    <div className={`turnstile-container ${className}`}>
      <div ref={containerRef} />
    </div>
  );
};

export default TurnstileWidget;