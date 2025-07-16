/**
 * Edge Function compatible payment monitoring service
 * Adapted from PaymentMonitoringService.ts for Deno environment
 */

import { EdgeLogger, EdgeLogCategory, logEdgeInfo, logEdgeError, logEdgeWarn } from './edge-logging.ts';

// Payment-specific error codes for Edge Functions
export enum EdgePaymentErrorCode {
  // Gateway Errors
  GATEWAY_UNAVAILABLE = 'GATEWAY_UNAVAILABLE',
  GATEWAY_TIMEOUT = 'GATEWAY_TIMEOUT',
  GATEWAY_CONFIGURATION_ERROR = 'GATEWAY_CONFIGURATION_ERROR',
  
  // Transaction Errors
  PAYMENT_DECLINED = 'PAYMENT_DECLINED',
  INSUFFICIENT_FUNDS = 'INSUFFICIENT_FUNDS',
  CARD_EXPIRED = 'CARD_EXPIRED',
  INVALID_CARD = 'INVALID_CARD',
  FRAUD_DETECTED = 'FRAUD_DETECTED',
  
  // Processing Errors
  PAYMENT_PROCESSING_FAILED = 'PAYMENT_PROCESSING_FAILED',
  WEBHOOK_PROCESSING_FAILED = 'WEBHOOK_PROCESSING_FAILED',
  DUPLICATE_PAYMENT = 'DUPLICATE_PAYMENT',
  
  // Integration Errors
  STRIPE_API_ERROR = 'STRIPE_API_ERROR',
  PAYPAL_API_ERROR = 'PAYPAL_API_ERROR',
  PAYU_API_ERROR = 'PAYU_API_ERROR',
  AIRWALLEX_API_ERROR = 'AIRWALLEX_API_ERROR',
  
  // Status Errors
  PAYMENT_STATUS_MISMATCH = 'PAYMENT_STATUS_MISMATCH',
  PAYMENT_NOT_FOUND = 'PAYMENT_NOT_FOUND',
  INVALID_PAYMENT_STATE = 'INVALID_PAYMENT_STATE',
  
  // Security Errors
  WEBHOOK_SIGNATURE_INVALID = 'WEBHOOK_SIGNATURE_INVALID',
  PAYMENT_TOKEN_EXPIRED = 'PAYMENT_TOKEN_EXPIRED',
  UNAUTHORIZED_PAYMENT_ACCESS = 'UNAUTHORIZED_PAYMENT_ACCESS',
  
  // Edge Function Specific
  FUNCTION_TIMEOUT = 'FUNCTION_TIMEOUT',
  ENVIRONMENT_ERROR = 'ENVIRONMENT_ERROR',
  DATABASE_CONNECTION_ERROR = 'DATABASE_CONNECTION_ERROR'
}

// Payment monitoring metrics for Edge Functions
export interface EdgePaymentMetrics {
  paymentId: string;
  gateway: string;
  amount: number;
  currency: string;
  userId?: string;
  quoteId?: string;
  orderId?: string;
  startTime: number;
  endTime?: number;
  success: boolean;
  errorCode?: EdgePaymentErrorCode;
  errorMessage?: string;
  functionName: string;
  requestId: string;
  webhookEvents?: string[];
  metadata?: Record<string, unknown>;
}

// Webhook monitoring metrics
export interface EdgeWebhookMetrics {
  webhookId: string;
  eventType: string;
  gateway: string;
  paymentId?: string;
  orderId?: string;
  startTime: number;
  endTime?: number;
  success: boolean;
  errorCode?: EdgePaymentErrorCode;
  errorMessage?: string;
  functionName: string;
  requestId: string;
  metadata?: Record<string, unknown>;
}

/**
 * Edge Function Payment Monitoring Service
 */
export class EdgePaymentMonitoring {
  private logger: EdgeLogger;
  private activePayments = new Map<string, EdgePaymentMetrics>();
  private activeWebhooks = new Map<string, EdgeWebhookMetrics>();

  constructor(logger: EdgeLogger) {
    this.logger = logger;
  }

  /**
   * Start monitoring a payment transaction
   */
  startPaymentMonitoring(params: {
    paymentId: string;
    gateway: string;
    amount: number;
    currency: string;
    userId?: string;
    quoteId?: string;
    orderId?: string;
    metadata?: Record<string, unknown>;
  }): void {
    const metrics: EdgePaymentMetrics = {
      ...params,
      startTime: performance.now(),
      success: false,
      functionName: this.logger.function,
      requestId: this.logger.id,
      webhookEvents: []
    };

    this.activePayments.set(params.paymentId, metrics);

    // Log payment initiation
    logEdgeInfo(EdgeLogCategory.PAYMENT_PROCESSING, `Payment initiated: ${params.gateway}`, {
      paymentId: params.paymentId,
      userId: params.userId,
      quoteId: params.quoteId,
      requestId: this.logger.id,
      metadata: {
        gateway: params.gateway,
        amount: params.amount,
        currency: params.currency,
        ...params.metadata
      }
    });

    // Start performance tracking
    this.logger.startPerformance(`payment.${params.paymentId}`);
  }

  /**
   * Complete payment monitoring
   */
  completePaymentMonitoring(
    paymentId: string,
    success: boolean,
    errorCode?: EdgePaymentErrorCode,
    errorMessage?: string,
    metadata?: Record<string, unknown>
  ): void {
    const metrics = this.activePayments.get(paymentId);
    if (!metrics) {
      logEdgeWarn(EdgeLogCategory.PAYMENT_PROCESSING, `Payment monitoring not found for: ${paymentId}`, {
        requestId: this.logger.id
      });
      return;
    }

    // Update metrics
    metrics.endTime = performance.now();
    metrics.success = success;
    metrics.errorCode = errorCode;
    metrics.errorMessage = errorMessage;
    if (metadata) {
      metrics.metadata = { ...metrics.metadata, ...metadata };
    }

    const duration = metrics.endTime - metrics.startTime;

    // End performance tracking
    this.logger.endPerformance(`payment.${paymentId}`, EdgeLogCategory.PAYMENT_PROCESSING, {
      paymentId,
      userId: metrics.userId,
      metadata: {
        duration,
        success,
        gateway: metrics.gateway
      }
    });

    // Log completion
    if (success) {
      logEdgeInfo(EdgeLogCategory.PAYMENT_PROCESSING, 'Payment completed successfully', {
        paymentId,
        userId: metrics.userId,
        requestId: this.logger.id,
        metadata: {
          gateway: metrics.gateway,
          duration,
          amount: metrics.amount,
          currency: metrics.currency
        }
      });
    } else {
      logEdgeError(
        EdgeLogCategory.PAYMENT_PROCESSING, 
        `Payment failed: ${errorMessage || 'Unknown error'}`,
        errorMessage ? new Error(errorMessage) : undefined,
        {
          paymentId,
          userId: metrics.userId,
          requestId: this.logger.id,
          metadata: {
            errorCode,
            gateway: metrics.gateway,
            duration,
            amount: metrics.amount,
            currency: metrics.currency,
            ...metadata
          }
        }
      );
    }

    // Cleanup
    this.activePayments.delete(paymentId);
  }

  /**
   * Start monitoring a webhook
   */
  startWebhookMonitoring(params: {
    webhookId: string;
    eventType: string;
    gateway: string;
    paymentId?: string;
    orderId?: string;
    metadata?: Record<string, unknown>;
  }): void {
    const metrics: EdgeWebhookMetrics = {
      ...params,
      startTime: performance.now(),
      success: false,
      functionName: this.logger.function,
      requestId: this.logger.id
    };

    this.activeWebhooks.set(params.webhookId, metrics);

    // Log webhook start
    logEdgeInfo(EdgeLogCategory.WEBHOOK_PROCESSING, `Webhook received: ${params.gateway} - ${params.eventType}`, {
      paymentId: params.paymentId,
      orderId: params.orderId,
      requestId: this.logger.id,
      metadata: {
        webhookId: params.webhookId,
        eventType: params.eventType,
        gateway: params.gateway,
        ...params.metadata
      }
    });

    // Start performance tracking
    this.logger.startPerformance(`webhook.${params.webhookId}`);
  }

  /**
   * Complete webhook monitoring
   */
  completeWebhookMonitoring(
    webhookId: string,
    success: boolean,
    errorCode?: EdgePaymentErrorCode,
    errorMessage?: string,
    metadata?: Record<string, unknown>
  ): void {
    const metrics = this.activeWebhooks.get(webhookId);
    if (!metrics) {
      logEdgeWarn(EdgeLogCategory.WEBHOOK_PROCESSING, `Webhook monitoring not found for: ${webhookId}`, {
        requestId: this.logger.id
      });
      return;
    }

    // Update metrics
    metrics.endTime = performance.now();
    metrics.success = success;
    metrics.errorCode = errorCode;
    metrics.errorMessage = errorMessage;
    if (metadata) {
      metrics.metadata = { ...metrics.metadata, ...metadata };
    }

    const duration = metrics.endTime - metrics.startTime;

    // End performance tracking
    this.logger.endPerformance(`webhook.${webhookId}`, EdgeLogCategory.WEBHOOK_PROCESSING, {
      paymentId: metrics.paymentId,
      orderId: metrics.orderId,
      metadata: {
        duration,
        success,
        gateway: metrics.gateway,
        eventType: metrics.eventType
      }
    });

    // Log completion
    if (success) {
      logEdgeInfo(EdgeLogCategory.WEBHOOK_PROCESSING, 'Webhook processed successfully', {
        paymentId: metrics.paymentId,
        orderId: metrics.orderId,
        requestId: this.logger.id,
        metadata: {
          webhookId,
          eventType: metrics.eventType,
          gateway: metrics.gateway,
          duration
        }
      });
    } else {
      logEdgeError(
        EdgeLogCategory.WEBHOOK_PROCESSING, 
        `Webhook processing failed: ${errorMessage || 'Unknown error'}`,
        errorMessage ? new Error(errorMessage) : undefined,
        {
          paymentId: metrics.paymentId,
          orderId: metrics.orderId,
          requestId: this.logger.id,
          metadata: {
            errorCode,
            webhookId,
            eventType: metrics.eventType,
            gateway: metrics.gateway,
            duration,
            ...metadata
          }
        }
      );
    }

    // Cleanup
    this.activeWebhooks.delete(webhookId);
  }

  /**
   * Monitor gateway API call
   */
  async monitorGatewayCall<T>(
    operation: string,
    gateway: string,
    apiCall: () => Promise<T>,
    paymentId?: string
  ): Promise<T> {
    const startTime = performance.now();
    
    this.logger.debug(EdgeLogCategory.PAYMENT_PROCESSING, `Gateway API call: ${operation}`, {
      paymentId,
      metadata: { gateway, operation }
    });

    try {
      const result = await apiCall();
      const duration = performance.now() - startTime;

      logEdgeInfo(EdgeLogCategory.PAYMENT_PROCESSING, `Gateway API call successful: ${gateway}/${operation}`, {
        paymentId,
        requestId: this.logger.id,
        metadata: {
          gateway,
          operation,
          duration,
          success: true
        }
      });

      return result;
    } catch (error) {
      const duration = performance.now() - startTime;

      logEdgeError(
        EdgeLogCategory.PAYMENT_PROCESSING,
        `Gateway API call failed: ${gateway}/${operation}`,
        error instanceof Error ? error : new Error('Gateway API call failed'),
        {
          paymentId,
          requestId: this.logger.id,
          metadata: {
            gateway,
            operation,
            duration,
            success: false
          }
        }
      );

      throw error;
    }
  }

  /**
   * Log a payment event
   */
  logPaymentEvent(
    event: string,
    details: Record<string, unknown>,
    paymentId?: string
  ): void {
    logEdgeInfo(EdgeLogCategory.PAYMENT_PROCESSING, `Payment event: ${event}`, {
      paymentId,
      requestId: this.logger.id,
      metadata: {
        event,
        ...details
      }
    });
  }

  /**
   * Log a payment error
   */
  logPaymentError(
    event: string,
    error: Error,
    details?: Record<string, unknown>,
    paymentId?: string
  ): void {
    logEdgeError(
      EdgeLogCategory.PAYMENT_PROCESSING,
      `Payment error: ${event}`,
      error,
      {
        paymentId,
        requestId: this.logger.id,
        metadata: {
          event,
          ...details
        }
      }
    );
  }

  /**
   * Log a webhook event
   */
  logWebhookEvent(params: {
    eventType: string;
    gateway: string;
    paymentId?: string;
    orderId?: string;
    success: boolean;
    errorMessage?: string;
    metadata?: Record<string, unknown>;
  }): void {
    if (params.success) {
      logEdgeInfo(
        EdgeLogCategory.WEBHOOK_PROCESSING,
        `Webhook event: ${params.gateway} - ${params.eventType}`,
        {
          paymentId: params.paymentId,
          orderId: params.orderId,
          requestId: this.logger.id,
          metadata: {
            eventType: params.eventType,
            gateway: params.gateway,
            ...params.metadata
          }
        }
      );
    } else {
      logEdgeError(
        EdgeLogCategory.WEBHOOK_PROCESSING,
        `Webhook event failed: ${params.gateway} - ${params.eventType}`,
        params.errorMessage ? new Error(params.errorMessage) : undefined,
        {
          paymentId: params.paymentId,
          orderId: params.orderId,
          requestId: this.logger.id,
          metadata: {
            eventType: params.eventType,
            gateway: params.gateway,
            ...params.metadata
          }
        }
      );
    }
  }

  /**
   * Cleanup all active monitoring
   */
  cleanup(): void {
    // Complete any active payments as failed
    this.activePayments.forEach((metrics, paymentId) => {
      this.completePaymentMonitoring(
        paymentId,
        false,
        EdgePaymentErrorCode.FUNCTION_TIMEOUT,
        'Function terminated during payment processing'
      );
    });

    // Complete any active webhooks as failed
    this.activeWebhooks.forEach((metrics, webhookId) => {
      this.completeWebhookMonitoring(
        webhookId,
        false,
        EdgePaymentErrorCode.FUNCTION_TIMEOUT,
        'Function terminated during webhook processing'
      );
    });

    this.activePayments.clear();
    this.activeWebhooks.clear();
  }

  // Getters
  get activePaymentCount(): number {
    return this.activePayments.size;
  }

  get activeWebhookCount(): number {
    return this.activeWebhooks.size;
  }
}