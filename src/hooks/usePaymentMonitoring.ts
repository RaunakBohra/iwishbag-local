import { useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLogger } from '@/hooks/useLogger';
import { LogCategory } from '@/services/LoggingService';
import {
  startPaymentMonitoring,
  completePaymentMonitoring,
  logWebhookEvent,
  logGatewayApiCall,
  PaymentErrorCode,
  getPaymentMetrics
} from '@/services/PaymentMonitoringService';

interface UsePaymentMonitoringOptions {
  gateway?: string;
  componentName?: string;
}

/**
 * Hook for payment monitoring in React components
 */
export function usePaymentMonitoring(options: UsePaymentMonitoringOptions = {}) {
  const { user } = useAuth();
  const activePayments = useRef<Set<string>>(new Set());
  
  const logger = useLogger({
    category: LogCategory.PAYMENT_PROCESSING,
    componentName: options.componentName
  });

  /**
   * Start monitoring a payment
   */
  const monitorPaymentStart = useCallback((params: {
    paymentId: string;
    gateway: string;
    amount: number;
    currency: string;
    quoteId?: string;
    orderId?: string;
    metadata?: Record<string, unknown>;
  }) => {
    const paymentParams = {
      ...params,
      userId: user?.id,
      metadata: {
        ...params.metadata,
        sessionId: logger.sessionId,
        componentName: options.componentName
      }
    };

    activePayments.current.add(params.paymentId);
    startPaymentMonitoring(paymentParams);
    
    logger.info(LogCategory.PAYMENT_PROCESSING, 'Payment monitoring started', {
      paymentId: params.paymentId,
      metadata: paymentParams
    });
  }, [user?.id, logger, options.componentName]);

  /**
   * Complete payment monitoring
   */
  const monitorPaymentComplete = useCallback((
    paymentId: string,
    success: boolean,
    errorCode?: PaymentErrorCode,
    errorMessage?: string,
    metadata?: Record<string, unknown>
  ) => {
    if (!activePayments.current.has(paymentId)) {
      logger.warn(LogCategory.PAYMENT_PROCESSING, 'Completing untracked payment', {
        paymentId
      });
    }

    activePayments.current.delete(paymentId);
    completePaymentMonitoring(paymentId, success, errorCode, errorMessage, metadata);

    if (success) {
      logger.info(LogCategory.PAYMENT_PROCESSING, 'Payment completed', {
        paymentId,
        metadata
      });
    } else {
      logger.error(
        LogCategory.PAYMENT_PROCESSING,
        'Payment failed',
        errorMessage ? new Error(errorMessage) : undefined,
        {
          paymentId,
          errorCode,
          metadata
        }
      );
    }
  }, [logger]);

  /**
   * Log a payment event
   */
  const logPaymentEvent = useCallback((
    event: string,
    details: Record<string, unknown>,
    paymentId?: string
  ) => {
    logger.info(LogCategory.PAYMENT_PROCESSING, `Payment event: ${event}`, {
      paymentId,
      metadata: {
        event,
        ...details,
        gateway: options.gateway
      }
    });
  }, [logger, options.gateway]);

  /**
   * Log a payment error
   */
  const logPaymentError = useCallback((
    event: string,
    error: Error,
    details?: Record<string, unknown>,
    paymentId?: string
  ) => {
    logger.error(
      LogCategory.PAYMENT_PROCESSING,
      `Payment error: ${event}`,
      error,
      {
        paymentId,
        metadata: {
          event,
          ...details,
          gateway: options.gateway
        }
      }
    );
  }, [logger, options.gateway]);

  /**
   * Monitor gateway API call
   */
  const monitorGatewayCall = useCallback(async <T>(
    operation: string,
    apiCall: () => Promise<T>,
    paymentId?: string
  ): Promise<T> => {
    const startTime = performance.now();
    const gateway = options.gateway || 'unknown';

    logger.debug(LogCategory.PAYMENT_PROCESSING, `Gateway API call: ${operation}`, {
      paymentId,
      metadata: { gateway, operation }
    });

    try {
      const result = await apiCall();
      const duration = performance.now() - startTime;

      logGatewayApiCall({
        gateway,
        operation,
        paymentId,
        duration,
        success: true,
        response: result
      });

      return result;
    } catch (error) {
      const duration = performance.now() - startTime;

      logGatewayApiCall({
        gateway,
        operation,
        paymentId,
        duration,
        success: false,
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      });

      throw error;
    }
  }, [logger, options.gateway]);

  /**
   * Get current payment metrics
   */
  const fetchPaymentMetrics = useCallback((timeWindowMinutes?: number) => {
    return getPaymentMetrics(timeWindowMinutes);
  }, []);

  /**
   * Clean up on unmount
   */
  const cleanup = useCallback(() => {
    // Clear active payments without marking them as failed
    // This prevents false errors when the component unmounts naturally
    activePayments.current.clear();
  }, []);

  return {
    // Core monitoring functions
    monitorPaymentStart,
    monitorPaymentComplete,
    
    // Event logging
    logPaymentEvent,
    logPaymentError,
    
    // API monitoring
    monitorGatewayCall,
    
    // Metrics
    fetchPaymentMetrics,
    
    // Utilities
    cleanup,
    logger,
    
    // Context
    userId: user?.id,
    sessionId: logger.sessionId
  };
}

/**
 * Hook for monitoring payment webhooks
 */
export function useWebhookMonitoring(gateway: string) {
  const logger = useLogger({
    category: LogCategory.PAYMENT_PROCESSING,
    componentName: `${gateway}WebhookHandler`
  });

  const logWebhook = useCallback((params: {
    eventType: string;
    paymentId?: string;
    orderId?: string;
    success: boolean;
    errorMessage?: string;
    metadata?: Record<string, unknown>;
  }) => {
    logWebhookEvent({
      gateway,
      ...params,
      metadata: {
        ...params.metadata,
        timestamp: new Date().toISOString()
      }
    });
  }, [gateway]);

  const trackWebhookProcessing = useCallback(async <T>(
    eventType: string,
    processor: () => Promise<T>,
    paymentId?: string
  ): Promise<T> => {
    logger.trackPerformance.start(`webhook.${eventType}`);

    try {
      const result = await processor();
      
      logger.trackPerformance.end(`webhook.${eventType}`, {
        paymentId,
        metadata: { eventType, gateway }
      });
      
      logWebhook({
        eventType,
        paymentId,
        success: true
      });

      return result;
    } catch (error) {
      logger.trackPerformance.end(`webhook.${eventType}`, {
        paymentId,
        metadata: { eventType, gateway, error: true }
      });

      logWebhook({
        eventType,
        paymentId,
        success: false,
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      });

      throw error;
    }
  }, [gateway, logger, logWebhook]);

  return {
    logWebhook,
    trackWebhookProcessing,
    logger
  };
}