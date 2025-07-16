/**
 * Examples of how to use the enhanced logging system
 * These patterns can be used throughout the application
 */

import { 
  logger, 
  LogCategory, 
  logInfo, 
  logError, 
  logWarn,
  logPerformanceStart,
  logPerformanceEnd
} from '@/services/LoggingService';

/**
 * Example: Logging a user authentication flow
 */
export const logAuthExample = async (email: string, userId?: string) => {
  // Start performance tracking
  logPerformanceStart('auth.login');
  
  // Log the start of authentication
  logInfo(LogCategory.USER_AUTHENTICATION, 'User login attempt', {
    userId: userId || 'anonymous',
    metadata: {
      email: email.substring(0, 3) + '***@***', // Partially masked
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent
    }
  });

  try {
    // Simulate auth process
    const result = await performAuth(email);
    
    // Log successful authentication
    logInfo(LogCategory.USER_AUTHENTICATION, 'User login successful', {
      userId: result.userId,
      sessionId: result.sessionId,
      metadata: {
        authMethod: 'email',
        firstLogin: result.firstLogin
      }
    });
    
    // End performance tracking
    logPerformanceEnd('auth.login', LogCategory.USER_AUTHENTICATION, {
      userId: result.userId
    });
    
    return result;
  } catch (error) {
    // Log authentication failure
    logError(
      LogCategory.USER_AUTHENTICATION, 
      'User login failed',
      error instanceof Error ? error : new Error('Unknown auth error'),
      {
        metadata: {
          email: email.substring(0, 3) + '***@***',
          errorType: error instanceof Error ? error.name : 'Unknown'
        }
      }
    );
    
    // Still end performance tracking
    logPerformanceEnd('auth.login', LogCategory.USER_AUTHENTICATION);
    
    throw error;
  }
};

/**
 * Example: Logging a payment transaction
 */
export const logPaymentExample = async (
  paymentId: string,
  amount: number,
  currency: string,
  gateway: string,
  userId: string
) => {
  const paymentLogger = logger.createChildLogger({
    paymentId,
    userId
  });

  // Log payment initiation
  paymentLogger.info(LogCategory.PAYMENT_PROCESSING, 'Payment initiated', {
    metadata: {
      amount,
      currency,
      gateway,
      timestamp: new Date().toISOString()
    }
  });

  // Log API request
  const requestId = logger.logApiRequest(
    'POST',
    `/api/payments/${gateway}/charge`,
    { paymentId, userId },
    { amount, currency } // Will be sanitized
  );

  try {
    // Simulate payment processing
    const startTime = performance.now();
    const result = await processPayment(paymentId, amount, currency, gateway);
    
    // Log API response
    logger.logApiResponse(
      requestId,
      result.status,
      performance.now() - startTime,
      { paymentId, userId },
      result
    );

    if (result.success) {
      paymentLogger.info(LogCategory.PAYMENT_PROCESSING, 'Payment successful', {
        metadata: {
          transactionId: result.transactionId,
          processingTime: result.processingTime
        }
      });
    } else {
      paymentLogger.warn(LogCategory.PAYMENT_PROCESSING, 'Payment declined', {
        metadata: {
          reason: result.declineReason,
          code: result.declineCode
        }
      });
    }

    return result;
  } catch (error) {
    // Log payment error
    paymentLogger.error(
      LogCategory.PAYMENT_PROCESSING,
      'Payment processing failed',
      error instanceof Error ? error : new Error('Payment error'),
      {
        metadata: {
          gateway,
          amount,
          currency
        }
      }
    );
    
    throw error;
  }
};

/**
 * Example: Logging database operations
 */
export const logDatabaseExample = async (
  operation: string,
  table: string,
  userId?: string
) => {
  const context = {
    userId,
    metadata: {
      operation,
      table,
      timestamp: new Date().toISOString()
    }
  };

  // Log query start
  logInfo(LogCategory.DATABASE_OPERATION, `Database ${operation} started`, context);
  logPerformanceStart(`db.${operation}.${table}`);

  try {
    // Simulate database operation
    const result = await performDatabaseOperation(operation, table);
    
    // Log query success
    logInfo(LogCategory.DATABASE_OPERATION, `Database ${operation} completed`, {
      ...context,
      metadata: {
        ...context.metadata,
        rowsAffected: result.rowsAffected,
        duration: result.duration
      }
    });
    
    logPerformanceEnd(`db.${operation}.${table}`, LogCategory.DATABASE_OPERATION, context);
    
    return result;
  } catch (error) {
    // Log database error
    logError(
      LogCategory.DATABASE_OPERATION,
      `Database ${operation} failed`,
      error instanceof Error ? error : new Error('Database error'),
      context
    );
    
    logPerformanceEnd(`db.${operation}.${table}`, LogCategory.DATABASE_OPERATION, context);
    
    throw error;
  }
};

/**
 * Example: Logging security events
 */
export const logSecurityExample = (
  eventType: string,
  severity: 'low' | 'medium' | 'high' | 'critical',
  details: Record<string, unknown>,
  userId?: string
) => {
  const logMethod = severity === 'critical' ? logger.critical :
                   severity === 'high' ? logger.error :
                   severity === 'medium' ? logger.warn :
                   logger.info;

  logMethod.call(
    logger,
    LogCategory.SECURITY_EVENT,
    `Security event: ${eventType}`,
    severity === 'critical' || severity === 'high' ? new Error(eventType) : undefined,
    {
      userId,
      metadata: {
        eventType,
        severity,
        ...details,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        ip: 'client-ip-placeholder' // Would be set by server
      }
    }
  );
};

/**
 * Example: Logging performance metrics
 */
export const logPerformanceExample = (
  metricName: string,
  value: number,
  unit: string,
  metadata?: Record<string, unknown>
) => {
  logInfo(LogCategory.PERFORMANCE, `Performance metric: ${metricName}`, {
    metadata: {
      metric: metricName,
      value,
      unit,
      ...metadata,
      timestamp: new Date().toISOString()
    }
  });

  // Check for performance anomalies
  if (metricName === 'page_load_time' && value > 3000) {
    logWarn(LogCategory.PERFORMANCE, 'Slow page load detected', {
      metadata: {
        metric: metricName,
        value,
        threshold: 3000,
        exceeded: value - 3000
      }
    });
  }
};

/**
 * Example: Using logger in React components
 */
export const ReactComponentLoggingExample = `
import { useLogger } from '@/hooks/useLogger';
import { LogCategory } from '@/services/LoggingService';

function MyComponent() {
  const logger = useLogger({
    category: LogCategory.QUOTE_CALCULATION,
    componentName: 'QuoteCalculator'
  });

  const handleCalculate = async () => {
    logger.logUserAction('calculate_quote_clicked');
    logger.trackPerformance.start('quoteCalculation');

    try {
      const result = await calculateQuote();
      
      logger.info(
        LogCategory.QUOTE_CALCULATION,
        'Quote calculated successfully',
        { metadata: { quoteId: result.id, total: result.total } }
      );
      
      logger.trackPerformance.end('quoteCalculation');
    } catch (error) {
      logger.error(
        LogCategory.QUOTE_CALCULATION,
        'Quote calculation failed',
        error,
        { metadata: { reason: error.message } }
      );
      
      logger.trackPerformance.end('quoteCalculation');
    }
  };

  return <button onClick={handleCalculate}>Calculate</button>;
}
`;

// Mock functions for examples
async function performAuth(email: string) {
  return {
    userId: 'user123',
    sessionId: 'session123',
    firstLogin: false
  };
}

async function processPayment(paymentId: string, amount: number, currency: string, gateway: string) {
  return {
    success: true,
    status: 200,
    transactionId: 'txn123',
    processingTime: 1234
  };
}

async function performDatabaseOperation(operation: string, table: string) {
  return {
    rowsAffected: 1,
    duration: 45
  };
}