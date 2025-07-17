import { useEffect, useMemo, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  logger,
  LogCategory,
  LogContext,
  ChildLogger,
  logPerformanceStart,
  logPerformanceEnd,
} from '@/services/LoggingService';

interface UseLoggerOptions {
  category?: LogCategory;
  componentName?: string;
  additionalContext?: LogContext;
}

/**
 * React hook for component-level logging with automatic context
 */
export function useLogger(options: UseLoggerOptions = {}) {
  const { user } = useAuth();
  const sessionIdRef = useRef<string>();
  const componentLogger = useRef<ChildLogger>();

  // Generate session ID on mount
  useEffect(() => {
    if (!sessionIdRef.current) {
      sessionIdRef.current = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
  }, []);

  // Create child logger with component context
  const childLogger = useMemo(() => {
    const baseContext: LogContext = {
      userId: user?.id,
      sessionId: sessionIdRef.current,
      ...options.additionalContext,
      metadata: {
        componentName: options.componentName,
        ...options.additionalContext?.metadata,
      },
    };

    if (!componentLogger.current) {
      componentLogger.current = logger.createChildLogger(baseContext);
    }

    return componentLogger.current;
  }, [user?.id, options.componentName, options.additionalContext]);

  // Log component lifecycle in development
  useEffect(() => {
    if (import.meta.env.DEV && options.componentName) {
      childLogger.debug(
        options.category || LogCategory.SYSTEM_HEALTH,
        `Component mounted: ${options.componentName}`,
      );

      return () => {
        childLogger.debug(
          options.category || LogCategory.SYSTEM_HEALTH,
          `Component unmounted: ${options.componentName}`,
        );
      };
    }
  }, []);

  // Performance tracking helpers
  const trackPerformance = useMemo(
    () => ({
      start: (markName: string) => {
        const fullMarkName = options.componentName
          ? `${options.componentName}.${markName}`
          : markName;
        logPerformanceStart(fullMarkName);
      },

      end: (markName: string, additionalContext?: LogContext) => {
        const fullMarkName = options.componentName
          ? `${options.componentName}.${markName}`
          : markName;

        logPerformanceEnd(fullMarkName, options.category || LogCategory.PERFORMANCE, {
          userId: user?.id,
          sessionId: sessionIdRef.current,
          ...additionalContext,
        });
      },
    }),
    [options.componentName, options.category, user?.id],
  );

  // API logging helpers
  const logApi = useMemo(
    () => ({
      request: (method: string, url: string, data?: unknown) => {
        return logger.logApiRequest(
          method,
          url,
          {
            userId: user?.id,
            sessionId: sessionIdRef.current,
            ...options.additionalContext,
          },
          data,
        );
      },

      response: (requestId: string, status: number, duration: number, data?: unknown) => {
        logger.logApiResponse(
          requestId,
          status,
          duration,
          {
            userId: user?.id,
            sessionId: sessionIdRef.current,
            ...options.additionalContext,
          },
          data,
        );
      },
    }),
    [user?.id, options.additionalContext],
  );

  // User action logging
  const logUserAction = (action: string, details?: Record<string, unknown>) => {
    childLogger.info(options.category || LogCategory.SYSTEM_HEALTH, `User action: ${action}`, {
      metadata: {
        action,
        ...details,
      },
    });
  };

  // Error boundary logging
  const logErrorBoundary = (error: Error, errorInfo: React.ErrorInfo) => {
    childLogger.critical(
      options.category || LogCategory.SYSTEM_HEALTH,
      `React Error Boundary: ${error.message}`,
      error,
      {
        metadata: {
          componentStack: errorInfo.componentStack,
          errorBoundary: true,
        },
      },
    );
  };

  return {
    // Direct logging methods
    debug: childLogger.debug.bind(childLogger),
    info: childLogger.info.bind(childLogger),
    warn: childLogger.warn.bind(childLogger),
    error: childLogger.error.bind(childLogger),
    critical: childLogger.critical.bind(childLogger),

    // Specialized helpers
    trackPerformance,
    logApi,
    logUserAction,
    logErrorBoundary,

    // Context
    sessionId: sessionIdRef.current,
    userId: user?.id,

    // Direct access to child logger
    logger: childLogger,
  };
}

/**
 * Hook for logging form submissions
 */
export function useFormLogger(formName: string) {
  const { logUserAction, error, trackPerformance } = useLogger({
    category: LogCategory.USER_AUTHENTICATION,
    componentName: formName,
  });

  const logFormSubmit = (data: Record<string, unknown>) => {
    trackPerformance.start('formSubmit');
    logUserAction('form_submit', {
      formName,
      fields: Object.keys(data),
    });
  };

  const logFormSuccess = (result?: unknown) => {
    trackPerformance.end('formSubmit');
    logUserAction('form_success', {
      formName,
      hasResult: !!result,
    });
  };

  const logFormError = (err: Error, data?: Record<string, unknown>) => {
    trackPerformance.end('formSubmit');
    error(LogCategory.USER_AUTHENTICATION, `Form submission failed: ${formName}`, err, {
      metadata: {
        formName,
        fields: data ? Object.keys(data) : undefined,
      },
    });
  };

  return {
    logFormSubmit,
    logFormSuccess,
    logFormError,
  };
}

/**
 * Hook for logging payment operations
 */
export function usePaymentLogger(paymentId?: string) {
  const baseLogger = useLogger({
    category: LogCategory.PAYMENT_PROCESSING,
    additionalContext: { paymentId },
  });

  const logPaymentEvent = (event: string, details: Record<string, unknown>) => {
    baseLogger.info(LogCategory.PAYMENT_PROCESSING, `Payment event: ${event}`, {
      paymentId,
      metadata: {
        event,
        ...details,
      },
    });
  };

  const logPaymentError = (event: string, err: Error, details?: Record<string, unknown>) => {
    baseLogger.error(LogCategory.PAYMENT_PROCESSING, `Payment error: ${event}`, err, {
      paymentId,
      metadata: {
        event,
        ...details,
      },
    });
  };

  return {
    ...baseLogger,
    logPaymentEvent,
    logPaymentError,
  };
}

/**
 * Hook for logging quote calculations
 */
export function useQuoteLogger(quoteId?: string) {
  const baseLogger = useLogger({
    category: LogCategory.QUOTE_CALCULATION,
    additionalContext: { quoteId },
  });

  const logCalculationStart = (params: Record<string, unknown>) => {
    baseLogger.trackPerformance.start('quoteCalculation');
    baseLogger.info(LogCategory.QUOTE_CALCULATION, 'Quote calculation started', {
      quoteId,
      metadata: {
        originCountry: params.originCountry,
        destinationCountry: params.destinationCountry,
        itemCount: params.itemCount,
        currency: params.currency,
      },
    });
  };

  const logCalculationComplete = (result: Record<string, unknown>) => {
    baseLogger.trackPerformance.end('quoteCalculation');
    baseLogger.info(LogCategory.QUOTE_CALCULATION, 'Quote calculation completed', {
      quoteId,
      metadata: {
        finalTotal: result.finalTotal,
        success: result.success,
        duration: result.duration,
      },
    });
  };

  const logCalculationError = (err: Error, params?: Record<string, unknown>) => {
    baseLogger.trackPerformance.end('quoteCalculation');
    baseLogger.error(LogCategory.QUOTE_CALCULATION, 'Quote calculation failed', err, {
      quoteId,
      metadata: params,
    });
  };

  return {
    ...baseLogger,
    logCalculationStart,
    logCalculationComplete,
    logCalculationError,
  };
}
