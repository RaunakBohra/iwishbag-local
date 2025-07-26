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
const activeWidgets = new Set<string>();

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
        },
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
    console.log('🔧 [Turnstile] Initializing widget component...', {
      siteKey: siteKey?.substring(0, 10) + '...',
      theme,
      size,
      disabled,
      componentId: componentId.current
    });

    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
    script.async = true;
    script.defer = true;

    script.onload = () => {
      console.log('✅ [Turnstile] Script loaded successfully');
      setIsLoading(false);
    };

    script.onerror = () => {
      console.error('❌ [Turnstile] Failed to load script from Cloudflare');
      setError('Failed to load Turnstile script');
      setIsLoading(false);
    };

    // Check if script is already loaded
    if (window.turnstile) {
      console.log('✅ [Turnstile] Script already available');
      setIsLoading(false);
    } else if (!document.querySelector('script[src*="turnstile"]')) {
      console.log('📥 [Turnstile] Loading script from CDN...');
      document.head.appendChild(script);
    } else {
      console.log('⏳ [Turnstile] Script loading in progress...');
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
    if (
      isLoading ||
      !window.turnstile ||
      !containerRef.current ||
      disabled ||
      isRendering.current
    ) {
      console.log('⏭️ [Turnstile] Skipping render:', {
        isLoading,
        turnstileAvailable: !!window.turnstile,
        containerReady: !!containerRef.current,
        disabled,
        isRendering: isRendering.current
      });
      return;
    }

    // Check if this widget is already being rendered
    const currentId = componentId.current;
    if (activeWidgets.has(currentId)) {
      console.warn('⚠️ [Turnstile] Widget already rendered for this component:', currentId);
      return;
    }

    console.log('🎯 [Turnstile] Starting widget render...', {
      siteKey: siteKey?.substring(0, 10) + '...',
      theme,
      size,
      action: actionRef.current,
      componentId: currentId
    });

    isRendering.current = true;
    activeWidgets.add(currentId);

    // Clear any existing widget in the container first
    if (containerRef.current) {
      containerRef.current.innerHTML = '';
    }

    // Cleanup any existing widget before creating a new one
    if (widgetId && window.turnstile) {
      try {
        console.log('🧹 [Turnstile] Cleaning up previous widget:', widgetId);
        window.turnstile.remove(widgetId);
        setWidgetId(null);
      } catch (err) {
        console.warn('⚠️ [Turnstile] Failed to cleanup previous widget:', err);
      }
    }

    try {
      console.log('🔨 [Turnstile] Rendering widget...');
      const id = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        callback: (token: string) => {
          console.log('✅ [Turnstile] Challenge completed successfully!', {
            tokenLength: token.length,
            tokenPrefix: token.substring(0, 20) + '...',
            timestamp: new Date().toISOString()
          });
          onSuccessRef.current(token);
        },
        'error-callback': (error: string) => {
          console.error('❌ [Turnstile] Challenge failed:', error);
          setError(`Turnstile error: ${error}`);
          onErrorRef.current?.(error);
        },
        'expired-callback': () => {
          console.warn('⏰ [Turnstile] Challenge expired, resetting...');
          onExpiredRef.current?.();
        },
        theme,
        size,
        action: actionRef.current,
        cData: cDataRef.current,
      });

      console.log('🎉 [Turnstile] Widget rendered successfully!', {
        widgetId: id,
        componentId: currentId
      });
      setWidgetId(id);
      isRendering.current = false;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error('💥 [Turnstile] Failed to render widget:', errorMessage, err);
      setError(`Failed to render Turnstile: ${errorMessage}`);
      onError?.(errorMessage);
      isRendering.current = false;
      activeWidgets.delete(currentId);
    }

    // Cleanup function
    return () => {
      console.log('🧹 [Turnstile] Cleaning up widget component:', currentId);
      isRendering.current = false;
      activeWidgets.delete(currentId);
      if (widgetId && window.turnstile) {
        try {
          window.turnstile.remove(widgetId);
          console.log('✅ [Turnstile] Widget cleanup successful');
        } catch (err) {
          console.warn('⚠️ [Turnstile] Failed to cleanup widget:', err);
        }
      }
    };
  }, [isLoading, siteKey, theme, size, disabled]);

  // Reset widget method
  const reset = () => {
    console.log('🔄 [Turnstile] Resetting widget...', { widgetId });
    if (widgetId && window.turnstile) {
      window.turnstile.reset(widgetId);
      console.log('✅ [Turnstile] Widget reset completed');
    } else {
      console.warn('⚠️ [Turnstile] Cannot reset: widget not available');
    }
  };

  // Get current response
  const getResponse = (): string | undefined => {
    if (widgetId && window.turnstile) {
      const response = window.turnstile.getResponse(widgetId);
      console.log('📋 [Turnstile] Getting current response:', {
        hasResponse: !!response,
        responseLength: response?.length || 0
      });
      return response;
    }
    console.warn('⚠️ [Turnstile] Cannot get response: widget not available');
    return undefined;
  };

  // Note: No useImperativeHandle needed since this component doesn't use forwardRef
  // Methods can be accessed through component state if needed in the future

  if (error) {
    return (
      <div
        className={`turnstile-error p-3 border border-red-300 rounded bg-red-50 text-red-700 text-sm ${className}`}
      >
        <strong>Security verification failed:</strong> {error}
      </div>
    );
  }

  if (isLoading) {
    return (
      <div
        className={`turnstile-loading p-4 border border-gray-200 rounded-lg bg-gray-50 text-gray-600 text-sm ${className}`}
      >
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
