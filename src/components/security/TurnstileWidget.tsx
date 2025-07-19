import React, { useEffect, useRef, useState } from 'react';

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
    if (isLoading || !window.turnstile || !containerRef.current || disabled) {
      return;
    }

    try {
      const id = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        callback: (token: string) => {
          onSuccess(token);
        },
        'error-callback': (error: string) => {
          setError(`Turnstile error: ${error}`);
          onError?.(error);
        },
        'expired-callback': () => {
          onExpired?.();
        },
        theme,
        size,
        action,
        cData,
      });

      setWidgetId(id);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(`Failed to render Turnstile: ${errorMessage}`);
      onError?.(errorMessage);
    }

    // Cleanup function
    return () => {
      if (widgetId && window.turnstile) {
        try {
          window.turnstile.remove(widgetId);
        } catch (err) {
          console.warn('Failed to cleanup Turnstile widget:', err);
        }
      }
    };
  }, [isLoading, siteKey, theme, size, action, cData, disabled, onSuccess, onError, onExpired]);

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

  // Expose methods via ref (if needed)
  React.useImperativeHandle(
    React.forwardRef(() => null),
    () => ({
      reset,
      getResponse,
    })
  );

  if (error) {
    return (
      <div className={`turnstile-error p-3 border border-red-300 rounded bg-red-50 text-red-700 text-sm ${className}`}>
        <strong>Security verification failed:</strong> {error}
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={`turnstile-loading p-3 border border-gray-300 rounded bg-gray-50 text-gray-600 text-sm ${className}`}>
        Loading security verification...
      </div>
    );
  }

  if (disabled) {
    return (
      <div className={`turnstile-disabled p-3 border border-gray-300 rounded bg-gray-100 text-gray-500 text-sm ${className}`}>
        Security verification disabled
      </div>
    );
  }

  return (
    <div className={`turnstile-container ${className}`}>
      <div ref={containerRef} />
    </div>
  );
};

export default TurnstileWidget;