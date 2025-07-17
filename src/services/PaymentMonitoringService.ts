/**
 * Payment Monitoring Service
 * Extends the logging and error handling services for payment-specific monitoring
 */

import {
  logger,
  LogCategory,
  LogContext,
  logInfo,
  logError,
  logWarn,
  logCritical,
} from '@/services/LoggingService';
import { errorHandlingService, QuoteCalculationErrorCode } from '@/services/ErrorHandlingService';

// Payment-specific error codes
export enum PaymentErrorCode {
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
}

// Payment monitoring metrics
export interface PaymentMetrics {
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
  errorCode?: PaymentErrorCode;
  errorMessage?: string;
  retryCount?: number;
  webhookEvents?: string[];
  metadata?: Record<string, unknown>;
}

// Payment monitoring configuration
export interface PaymentMonitoringConfig {
  enableDetailedLogging: boolean;
  enablePerformanceTracking: boolean;
  alertThresholds: {
    failureRatePercent: number;
    slowPaymentMs: number;
    webhookDelayMs: number;
  };
  gatewayTimeouts: {
    stripe: number;
    paypal: number;
    payu: number;
    airwallex: number;
  };
}

export class PaymentMonitoringService {
  private static instance: PaymentMonitoringService;
  private activePayments = new Map<string, PaymentMetrics>();
  private paymentMetricsLog: PaymentMetrics[] = [];
  private config: PaymentMonitoringConfig;

  private constructor() {
    this.config = {
      enableDetailedLogging: true,
      enablePerformanceTracking: true,
      alertThresholds: {
        failureRatePercent: 5,
        slowPaymentMs: 10000, // 10 seconds
        webhookDelayMs: 30000, // 30 seconds
      },
      gatewayTimeouts: {
        stripe: 30000,
        paypal: 45000,
        payu: 30000,
        airwallex: 30000,
      },
    };

    // Initialize payment-specific alerts
    this.initializePaymentAlerts();
  }

  static getInstance(): PaymentMonitoringService {
    if (!PaymentMonitoringService.instance) {
      PaymentMonitoringService.instance = new PaymentMonitoringService();
    }
    return PaymentMonitoringService.instance;
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
    const metrics: PaymentMetrics = {
      ...params,
      startTime: performance.now(),
      success: false,
      webhookEvents: [],
    };

    this.activePayments.set(params.paymentId, metrics);

    // Log payment initiation
    logInfo(LogCategory.PAYMENT_PROCESSING, `Payment initiated: ${params.gateway}`, {
      paymentId: params.paymentId,
      userId: params.userId,
      quoteId: params.quoteId,
      metadata: {
        gateway: params.gateway,
        amount: params.amount,
        currency: params.currency,
        ...params.metadata,
      },
    });

    // Start performance tracking
    logger.startPerformance(`payment.${params.paymentId}`);
  }

  /**
   * Complete payment monitoring
   */
  completePaymentMonitoring(
    paymentId: string,
    success: boolean,
    errorCode?: PaymentErrorCode,
    errorMessage?: string,
    metadata?: Record<string, unknown>,
  ): void {
    const metrics = this.activePayments.get(paymentId);
    if (!metrics) {
      logWarn(LogCategory.PAYMENT_PROCESSING, `Payment monitoring not found for: ${paymentId}`);
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
    logger.endPerformance(`payment.${paymentId}`, LogCategory.PAYMENT_PROCESSING, {
      paymentId,
      userId: metrics.userId,
      metadata: {
        duration,
        success,
        gateway: metrics.gateway,
      },
    });

    // Log completion
    if (success) {
      logInfo(LogCategory.PAYMENT_PROCESSING, 'Payment completed successfully', {
        paymentId,
        userId: metrics.userId,
        metadata: {
          gateway: metrics.gateway,
          duration,
          amount: metrics.amount,
          currency: metrics.currency,
        },
      });
    } else {
      logError(
        LogCategory.PAYMENT_PROCESSING,
        `Payment failed: ${errorMessage || 'Unknown error'}`,
        errorMessage ? new Error(errorMessage) : undefined,
        {
          paymentId,
          userId: metrics.userId,
          errorCode,
          metadata: {
            gateway: metrics.gateway,
            duration,
            amount: metrics.amount,
            currency: metrics.currency,
            ...metadata,
          },
        },
      );
    }

    // Check for alerts
    this.checkPaymentAlerts(metrics);

    // Store metrics
    this.paymentMetricsLog.push(metrics);
    this.activePayments.delete(paymentId);

    // Cleanup old metrics
    if (this.paymentMetricsLog.length > 1000) {
      this.paymentMetricsLog = this.paymentMetricsLog.slice(-1000);
    }
  }

  /**
   * Log webhook event
   */
  logWebhookEvent(params: {
    gateway: string;
    eventType: string;
    paymentId?: string;
    orderId?: string;
    success: boolean;
    errorMessage?: string;
    metadata?: Record<string, unknown>;
  }): void {
    const context: LogContext = {
      paymentId: params.paymentId,
      orderId: params.orderId,
      metadata: {
        gateway: params.gateway,
        eventType: params.eventType,
        ...params.metadata,
      },
    };

    if (params.success) {
      logInfo(
        LogCategory.PAYMENT_PROCESSING,
        `Webhook processed: ${params.gateway} - ${params.eventType}`,
        context,
      );
    } else {
      logError(
        LogCategory.PAYMENT_PROCESSING,
        `Webhook processing failed: ${params.gateway} - ${params.eventType}`,
        params.errorMessage ? new Error(params.errorMessage) : undefined,
        context,
      );
    }

    // Update active payment if exists
    if (params.paymentId) {
      const metrics = this.activePayments.get(params.paymentId);
      if (metrics) {
        metrics.webhookEvents?.push(params.eventType);
      }
    }
  }

  /**
   * Log gateway API call
   */
  logGatewayApiCall(params: {
    gateway: string;
    operation: string;
    paymentId?: string;
    request?: unknown;
    response?: unknown;
    duration: number;
    success: boolean;
    errorMessage?: string;
  }): void {
    const requestId = logger.logApiRequest(
      'POST',
      `${params.gateway}/${params.operation}`,
      {
        paymentId: params.paymentId,
        metadata: { gateway: params.gateway, operation: params.operation },
      },
      params.request,
    );

    logger.logApiResponse(
      requestId,
      params.success ? 200 : 500,
      params.duration,
      { paymentId: params.paymentId },
      params.response,
    );

    // Check for slow API calls
    if (
      params.duration >
      this.config.gatewayTimeouts[params.gateway as keyof typeof this.config.gatewayTimeouts] * 0.8
    ) {
      logWarn(
        LogCategory.PAYMENT_PROCESSING,
        `Slow gateway API call: ${params.gateway}/${params.operation}`,
        {
          paymentId: params.paymentId,
          metadata: {
            duration: params.duration,
            threshold:
              this.config.gatewayTimeouts[
                params.gateway as keyof typeof this.config.gatewayTimeouts
              ],
          },
        },
      );
    }
  }

  /**
   * Check for payment alerts
   */
  private checkPaymentAlerts(metrics: PaymentMetrics): void {
    const duration = (metrics.endTime || performance.now()) - metrics.startTime;

    // Check for slow payments
    if (duration > this.config.alertThresholds.slowPaymentMs) {
      errorHandlingService.createError(
        QuoteCalculationErrorCode.SLOW_CALCULATION,
        `Slow payment processing: ${Math.round(duration)}ms`,
        {
          paymentId: metrics.paymentId,
          gateway: metrics.gateway,
          duration,
          threshold: this.config.alertThresholds.slowPaymentMs,
        },
      );
    }

    // Check failure rate
    this.checkFailureRate();
  }

  /**
   * Check overall payment failure rate
   */
  private checkFailureRate(): void {
    const recentPayments = this.paymentMetricsLog.filter(
      (m) => m.endTime && performance.now() - m.startTime < 3600000, // Last hour
    );

    if (recentPayments.length >= 20) {
      // Minimum sample size
      const failedPayments = recentPayments.filter((m) => !m.success);
      const failureRate = (failedPayments.length / recentPayments.length) * 100;

      if (failureRate > this.config.alertThresholds.failureRatePercent) {
        logCritical(
          LogCategory.PAYMENT_PROCESSING,
          `High payment failure rate detected: ${failureRate.toFixed(2)}%`,
          new Error('High payment failure rate'),
          {
            metadata: {
              failureRate,
              threshold: this.config.alertThresholds.failureRatePercent,
              totalPayments: recentPayments.length,
              failedPayments: failedPayments.length,
              topErrors: this.getTopErrors(failedPayments),
            },
          },
        );
      }
    }
  }

  /**
   * Get top error codes from failed payments
   */
  private getTopErrors(failedPayments: PaymentMetrics[]): Array<{ code: string; count: number }> {
    const errorCounts = failedPayments.reduce(
      (acc, payment) => {
        if (payment.errorCode) {
          acc[payment.errorCode] = (acc[payment.errorCode] || 0) + 1;
        }
        return acc;
      },
      {} as Record<string, number>,
    );

    return Object.entries(errorCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([code, count]) => ({ code, count }));
  }

  /**
   * Initialize payment-specific alerts
   */
  private initializePaymentAlerts(): void {
    // Add payment-specific error codes to ErrorHandlingService
    // This would integrate with the existing alert system
  }

  /**
   * Get payment metrics summary
   */
  getPaymentMetrics(timeWindowMinutes: number = 60): {
    totalPayments: number;
    successfulPayments: number;
    failedPayments: number;
    successRate: number;
    averageProcessingTime: number;
    gatewayBreakdown: Record<string, { total: number; successful: number; failed: number }>;
    topErrors: Array<{ code: string; count: number }>;
  } {
    const cutoffTime = performance.now() - timeWindowMinutes * 60 * 1000;
    const recentPayments = this.paymentMetricsLog.filter((m) => m.startTime > cutoffTime);

    const successfulPayments = recentPayments.filter((m) => m.success);
    const failedPayments = recentPayments.filter((m) => !m.success);

    // Gateway breakdown
    const gatewayBreakdown = recentPayments.reduce(
      (acc, payment) => {
        if (!acc[payment.gateway]) {
          acc[payment.gateway] = { total: 0, successful: 0, failed: 0 };
        }
        acc[payment.gateway].total++;
        if (payment.success) {
          acc[payment.gateway].successful++;
        } else {
          acc[payment.gateway].failed++;
        }
        return acc;
      },
      {} as Record<string, { total: number; successful: number; failed: number }>,
    );

    // Average processing time
    const totalProcessingTime = recentPayments
      .filter((m) => m.endTime)
      .reduce((sum, m) => sum + (m.endTime! - m.startTime), 0);
    const averageProcessingTime =
      recentPayments.length > 0 ? totalProcessingTime / recentPayments.length : 0;

    return {
      totalPayments: recentPayments.length,
      successfulPayments: successfulPayments.length,
      failedPayments: failedPayments.length,
      successRate:
        recentPayments.length > 0 ? (successfulPayments.length / recentPayments.length) * 100 : 0,
      averageProcessingTime,
      gatewayBreakdown,
      topErrors: this.getTopErrors(failedPayments),
    };
  }

  /**
   * Clear payment metrics
   */
  clearMetrics(): void {
    this.paymentMetricsLog = [];
    this.activePayments.clear();
  }
}

// Export singleton instance
export const paymentMonitoringService = PaymentMonitoringService.getInstance();

// Helper functions for easy integration
export const startPaymentMonitoring = (
  params: Parameters<PaymentMonitoringService['startPaymentMonitoring']>[0],
) => paymentMonitoringService.startPaymentMonitoring(params);

export const completePaymentMonitoring = (
  paymentId: string,
  success: boolean,
  errorCode?: PaymentErrorCode,
  errorMessage?: string,
  metadata?: Record<string, unknown>,
) =>
  paymentMonitoringService.completePaymentMonitoring(
    paymentId,
    success,
    errorCode,
    errorMessage,
    metadata,
  );

export const logWebhookEvent = (
  params: Parameters<PaymentMonitoringService['logWebhookEvent']>[0],
) => paymentMonitoringService.logWebhookEvent(params);

export const logGatewayApiCall = (
  params: Parameters<PaymentMonitoringService['logGatewayApiCall']>[0],
) => paymentMonitoringService.logGatewayApiCall(params);

export const getPaymentMetrics = (timeWindowMinutes?: number) =>
  paymentMonitoringService.getPaymentMetrics(timeWindowMinutes);
