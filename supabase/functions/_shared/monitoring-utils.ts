/**
 * Shared monitoring utilities for Edge Functions
 */

import { EdgeLogger, EdgeLogCategory } from './edge-logging.ts';
import { EdgePaymentMonitoring, EdgePaymentErrorCode } from './edge-payment-monitoring.ts';

/**
 * Creates a logger and payment monitoring instance for an Edge Function
 */
export function createEdgeMonitoring(
  functionName: string,
  requestId?: string,
): {
  logger: EdgeLogger;
  paymentMonitoring: EdgePaymentMonitoring;
} {
  const logger = new EdgeLogger(functionName, requestId);
  const paymentMonitoring = new EdgePaymentMonitoring(logger);

  return { logger, paymentMonitoring };
}

/**
 * Wrapper for Edge Function execution with monitoring
 */
export async function withEdgeMonitoring<T>(
  functionName: string,
  handler: (logger: EdgeLogger, paymentMonitoring: EdgePaymentMonitoring) => Promise<T>,
  request?: Request,
): Promise<T> {
  const requestId = generateRequestId(request);
  const { logger, paymentMonitoring } = createEdgeMonitoring(functionName, requestId);

  try {
    // Log function start
    logger.logFunctionStart({
      metadata: {
        userAgent: request?.headers.get('user-agent'),
        origin: request?.headers.get('origin'),
        method: request?.method,
        url: request?.url,
      },
    });

    // Execute the handler
    const result = await handler(logger, paymentMonitoring);

    // Log function success
    logger.logFunctionEnd(true, {
      metadata: {
        resultType: typeof result,
      },
    });

    return result;
  } catch (error) {
    // Log function failure
    logger.error(
      EdgeLogCategory.EDGE_FUNCTION,
      `Function failed: ${functionName}`,
      error instanceof Error ? error : new Error('Unknown function error'),
      {
        metadata: {
          errorType: error instanceof Error ? error.name : 'Unknown',
        },
      },
    );

    logger.logFunctionEnd(false, {
      metadata: {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    });

    // Cleanup any active monitoring
    paymentMonitoring.cleanup();

    throw error;
  }
}

/**
 * Generate a request ID from headers or create a new one
 */
export function generateRequestId(request?: Request): string {
  if (request) {
    // Try to get request ID from headers
    const headerRequestId =
      request.headers.get('x-request-id') ||
      request.headers.get('request-id') ||
      request.headers.get('x-trace-id');

    if (headerRequestId) {
      return headerRequestId;
    }
  }

  return `edge_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Safely extract payment ID from request
 */
export function extractPaymentId(body: any): string | undefined {
  if (!body) return undefined;

  // Try common payment ID fields
  return (
    body.paymentId ||
    body.payment_id ||
    body.id ||
    body.transactionId ||
    body.transaction_id ||
    body.intent_id ||
    body.payment_intent_id
  );
}

/**
 * Safely extract user ID from request
 */
export function extractUserId(body: any, authUser: any): string | undefined {
  if (authUser?.id) return authUser.id;
  if (!body) return undefined;

  return body.userId || body.user_id || body.customerId || body.customer_id;
}

/**
 * Map gateway-specific errors to our error codes
 */
export function mapGatewayError(gateway: string, error: Error): EdgePaymentErrorCode {
  const errorMessage = error.message.toLowerCase();

  // Gateway-specific error mapping
  if (gateway === 'stripe') {
    if (errorMessage.includes('card_declined')) return EdgePaymentErrorCode.PAYMENT_DECLINED;
    if (errorMessage.includes('insufficient_funds')) return EdgePaymentErrorCode.INSUFFICIENT_FUNDS;
    if (errorMessage.includes('expired_card')) return EdgePaymentErrorCode.CARD_EXPIRED;
    if (errorMessage.includes('invalid_card')) return EdgePaymentErrorCode.INVALID_CARD;
    if (errorMessage.includes('fraudulent')) return EdgePaymentErrorCode.FRAUD_DETECTED;
    return EdgePaymentErrorCode.STRIPE_API_ERROR;
  }

  if (gateway === 'paypal') {
    if (errorMessage.includes('declined')) return EdgePaymentErrorCode.PAYMENT_DECLINED;
    if (errorMessage.includes('insufficient')) return EdgePaymentErrorCode.INSUFFICIENT_FUNDS;
    return EdgePaymentErrorCode.PAYPAL_API_ERROR;
  }

  if (gateway === 'payu') {
    if (errorMessage.includes('declined')) return EdgePaymentErrorCode.PAYMENT_DECLINED;
    if (errorMessage.includes('insufficient')) return EdgePaymentErrorCode.INSUFFICIENT_FUNDS;
    return EdgePaymentErrorCode.PAYU_API_ERROR;
  }

  if (gateway === 'airwallex') {
    if (errorMessage.includes('declined')) return EdgePaymentErrorCode.PAYMENT_DECLINED;
    if (errorMessage.includes('insufficient')) return EdgePaymentErrorCode.INSUFFICIENT_FUNDS;
    return EdgePaymentErrorCode.AIRWALLEX_API_ERROR;
  }

  // Generic error mapping
  if (errorMessage.includes('timeout')) return EdgePaymentErrorCode.GATEWAY_TIMEOUT;
  if (errorMessage.includes('unavailable')) return EdgePaymentErrorCode.GATEWAY_UNAVAILABLE;
  if (errorMessage.includes('configuration') || errorMessage.includes('config')) {
    return EdgePaymentErrorCode.GATEWAY_CONFIGURATION_ERROR;
  }
  if (errorMessage.includes('unauthorized') || errorMessage.includes('forbidden')) {
    return EdgePaymentErrorCode.UNAUTHORIZED_PAYMENT_ACCESS;
  }
  if (errorMessage.includes('duplicate')) return EdgePaymentErrorCode.DUPLICATE_PAYMENT;

  return EdgePaymentErrorCode.PAYMENT_PROCESSING_FAILED;
}

/**
 * Create standardized error response with monitoring
 */
export function createErrorResponse(
  error: Error,
  status: number = 500,
  logger?: EdgeLogger,
  context?: Record<string, unknown>,
): Response {
  const errorResponse = {
    error: error.message,
    timestamp: new Date().toISOString(),
    requestId: logger?.id,
  };

  if (logger) {
    logger.error(EdgeLogCategory.EDGE_FUNCTION, 'Function error response', error, {
      metadata: {
        status,
        ...context,
      },
    });
  }

  return new Response(JSON.stringify(errorResponse), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'X-Request-ID': logger?.id || 'unknown',
    },
  });
}

/**
 * Create standardized success response with monitoring
 */
export function createSuccessResponse(
  data: any,
  status: number = 200,
  logger?: EdgeLogger,
  context?: Record<string, unknown>,
): Response {
  const response = {
    ...data,
    timestamp: new Date().toISOString(),
    requestId: logger?.id,
  };

  if (logger) {
    logger.info(EdgeLogCategory.EDGE_FUNCTION, 'Function success response', {
      metadata: {
        status,
        hasData: !!data,
        ...context,
      },
    });
  }

  return new Response(JSON.stringify(response), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'X-Request-ID': logger?.id || 'unknown',
    },
  });
}

/**
 * Validate webhook signature with monitoring
 */
export function validateWebhookSignature(
  payload: string,
  signature: string,
  secret: string,
  gateway: string,
  logger: EdgeLogger,
): boolean {
  try {
    logger.debug(EdgeLogCategory.WEBHOOK_PROCESSING, `Validating ${gateway} webhook signature`, {
      metadata: {
        gateway,
        hasPayload: !!payload,
        hasSignature: !!signature,
        hasSecret: !!secret,
      },
    });

    // Gateway-specific signature validation logic would go here
    // This is a placeholder - actual implementation depends on gateway
    if (!payload || !signature || !secret) {
      throw new Error('Missing required signature validation data');
    }

    // Add actual signature validation logic for each gateway
    logger.info(EdgeLogCategory.WEBHOOK_PROCESSING, `${gateway} webhook signature validated`, {
      metadata: { gateway },
    });

    return true;
  } catch (error) {
    logger.error(
      EdgeLogCategory.WEBHOOK_PROCESSING,
      `${gateway} webhook signature validation failed`,
      error instanceof Error ? error : new Error('Signature validation failed'),
      {
        metadata: {
          gateway,
          errorType: error instanceof Error ? error.name : 'Unknown',
        },
      },
    );
    return false;
  }
}

/**
 * Sanitize sensitive data for logging
 */
export function sanitizeForLogging(data: any): any {
  if (!data || typeof data !== 'object') return data;

  const sensitiveFields = [
    'password',
    'token',
    'secret',
    'key',
    'api_key',
    'client_secret',
    'card_number',
    'cvv',
    'ssn',
    'social_security',
    'credit_card',
    'bank_account',
    'routing_number',
    'account_number',
  ];

  const sanitized = { ...data };

  for (const field of sensitiveFields) {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  }

  // Recursively sanitize nested objects
  for (const key in sanitized) {
    if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
      sanitized[key] = sanitizeForLogging(sanitized[key]);
    }
  }

  return sanitized;
}
