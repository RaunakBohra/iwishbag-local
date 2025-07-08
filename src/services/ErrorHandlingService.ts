export enum QuoteCalculationErrorCode {
  // Validation Errors
  MISSING_ITEMS = 'MISSING_ITEMS',
  MISSING_ORIGIN_COUNTRY = 'MISSING_ORIGIN_COUNTRY',
  MISSING_DESTINATION_COUNTRY = 'MISSING_DESTINATION_COUNTRY',
  MISSING_COUNTRY_SETTINGS = 'MISSING_COUNTRY_SETTINGS',
  INVALID_ITEM_PRICE = 'INVALID_ITEM_PRICE',
  INVALID_ITEM_WEIGHT = 'INVALID_ITEM_WEIGHT',
  INVALID_ITEM_QUANTITY = 'INVALID_ITEM_QUANTITY',
  INVALID_NUMERIC_VALUE = 'INVALID_NUMERIC_VALUE',
  NEGATIVE_VALUE = 'NEGATIVE_VALUE',
  INVALID_EXCHANGE_RATE = 'INVALID_EXCHANGE_RATE',
  
  // Calculation Errors
  CALCULATION_FAILED = 'CALCULATION_FAILED',
  TOTAL_TOO_HIGH = 'TOTAL_TOO_HIGH',
  NEGATIVE_TOTAL = 'NEGATIVE_TOTAL',
  INVALID_CALCULATION_RESULT = 'INVALID_CALCULATION_RESULT',
  
  // API/Network Errors
  SHIPPING_COST_API_ERROR = 'SHIPPING_COST_API_ERROR',
  EXCHANGE_RATE_API_ERROR = 'EXCHANGE_RATE_API_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  
  // Cache Errors
  CACHE_ERROR = 'CACHE_ERROR',
  CACHE_CORRUPTION = 'CACHE_CORRUPTION',
  
  // System Errors
  MEMORY_ERROR = 'MEMORY_ERROR',
  SYSTEM_ERROR = 'SYSTEM_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

export interface QuoteCalculationError {
  code: QuoteCalculationErrorCode;
  message: string;
  details?: any;
  field?: string;
  timestamp: Date;
  context?: {
    originCountry?: string;
    destinationCountry?: string;
    currency?: string;
    itemCount?: number;
    userId?: string;
    sessionId?: string;
  };
  recoveryActions?: RecoveryAction[];
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface RecoveryAction {
  type: 'retry' | 'fallback' | 'manual' | 'contact_admin';
  description: string;
  action?: () => Promise<void>;
  automatic?: boolean;
}

export interface ErrorHandlingConfig {
  maxRetries: number;
  retryDelay: number;
  enableFallbacks: boolean;
  logErrors: boolean;
  showUserMessages: boolean;
  autoRecovery: boolean;
}

/**
 * Comprehensive error handling service for quote calculations
 */
export class ErrorHandlingService {
  private static instance: ErrorHandlingService;
  private errorLog: QuoteCalculationError[] = [];
  private config: ErrorHandlingConfig;
  private retryCounters = new Map<string, number>();

  private constructor() {
    this.config = {
      maxRetries: 3,
      retryDelay: 1000,
      enableFallbacks: true,
      logErrors: true,
      showUserMessages: true,
      autoRecovery: true
    };
  }

  static getInstance(): ErrorHandlingService {
    if (!ErrorHandlingService.instance) {
      ErrorHandlingService.instance = new ErrorHandlingService();
    }
    return ErrorHandlingService.instance;
  }

  /**
   * Create a standardized error object
   */
  createError(
    code: QuoteCalculationErrorCode,
    message: string,
    details?: any,
    context?: QuoteCalculationError['context'],
    field?: string
  ): QuoteCalculationError {
    const error: QuoteCalculationError = {
      code,
      message,
      details,
      field,
      timestamp: new Date(),
      context,
      severity: this.determineSeverity(code),
      recoveryActions: this.generateRecoveryActions(code, context)
    };

    if (this.config.logErrors) {
      this.logError(error);
    }

    return error;
  }

  /**
   * Handle errors with automatic recovery if possible
   */
  async handleError(error: QuoteCalculationError): Promise<{
    handled: boolean;
    recovery?: any;
    userMessage?: string;
  }> {
    console.error('[ErrorHandlingService] Handling error:', error);

    // Log the error
    this.logError(error);

    // Try automatic recovery
    if (this.config.autoRecovery && error.recoveryActions) {
      for (const action of error.recoveryActions) {
        if (action.automatic && action.action) {
          try {
            await action.action();
            console.log(`[ErrorHandlingService] Auto-recovery successful: ${action.description}`);
            return {
              handled: true,
              recovery: 'automatic',
              userMessage: `Recovered from error: ${action.description}`
            };
          } catch (recoveryError) {
            console.warn(`[ErrorHandlingService] Auto-recovery failed:`, recoveryError);
          }
        }
      }
    }

    // Generate user-friendly message
    const userMessage = this.generateUserMessage(error);

    return {
      handled: false,
      userMessage
    };
  }

  /**
   * Determine error severity
   */
  private determineSeverity(code: QuoteCalculationErrorCode): QuoteCalculationError['severity'] {
    switch (code) {
      case QuoteCalculationErrorCode.SYSTEM_ERROR:
      case QuoteCalculationErrorCode.MEMORY_ERROR:
      case QuoteCalculationErrorCode.DATABASE_ERROR:
        return 'critical';
      
      case QuoteCalculationErrorCode.CALCULATION_FAILED:
      case QuoteCalculationErrorCode.INVALID_EXCHANGE_RATE:
      case QuoteCalculationErrorCode.MISSING_COUNTRY_SETTINGS:
        return 'high';
      
      case QuoteCalculationErrorCode.SHIPPING_COST_API_ERROR:
      case QuoteCalculationErrorCode.EXCHANGE_RATE_API_ERROR:
      case QuoteCalculationErrorCode.NETWORK_ERROR:
      case QuoteCalculationErrorCode.TIMEOUT_ERROR:
        return 'medium';
      
      default:
        return 'low';
    }
  }

  /**
   * Generate recovery actions based on error code
   */
  private generateRecoveryActions(
    code: QuoteCalculationErrorCode,
    context?: QuoteCalculationError['context']
  ): RecoveryAction[] {
    const actions: RecoveryAction[] = [];

    switch (code) {
      case QuoteCalculationErrorCode.NETWORK_ERROR:
      case QuoteCalculationErrorCode.TIMEOUT_ERROR:
        actions.push({
          type: 'retry',
          description: 'Retry the calculation',
          automatic: true,
          action: async () => {
            await new Promise(resolve => setTimeout(resolve, this.config.retryDelay));
          }
        });
        break;

      case QuoteCalculationErrorCode.SHIPPING_COST_API_ERROR:
        actions.push({
          type: 'fallback',
          description: 'Use fallback shipping calculation',
          automatic: true
        });
        break;

      case QuoteCalculationErrorCode.EXCHANGE_RATE_API_ERROR:
        actions.push({
          type: 'fallback',
          description: 'Use cached exchange rate',
          automatic: true
        });
        break;

      case QuoteCalculationErrorCode.INVALID_EXCHANGE_RATE:
        actions.push({
          type: 'contact_admin',
          description: 'Contact administrator to update exchange rates'
        });
        break;

      case QuoteCalculationErrorCode.MISSING_COUNTRY_SETTINGS:
        actions.push({
          type: 'contact_admin',
          description: 'Contact administrator to configure country settings'
        });
        break;

      case QuoteCalculationErrorCode.CALCULATION_FAILED:
        actions.push({
          type: 'retry',
          description: 'Retry with validated inputs',
          automatic: false
        });
        break;

      default:
        actions.push({
          type: 'manual',
          description: 'Please check your input values and try again'
        });
    }

    return actions;
  }

  /**
   * Generate user-friendly error messages
   */
  private generateUserMessage(error: QuoteCalculationError): string {
    const baseMessages: Record<QuoteCalculationErrorCode, string> = {
      [QuoteCalculationErrorCode.MISSING_ITEMS]: 'Please add at least one item to calculate the quote.',
      [QuoteCalculationErrorCode.MISSING_ORIGIN_COUNTRY]: 'Please select an origin country.',
      [QuoteCalculationErrorCode.MISSING_DESTINATION_COUNTRY]: 'Please select a destination country.',
      [QuoteCalculationErrorCode.MISSING_COUNTRY_SETTINGS]: 'Country settings are not configured. Please contact support.',
      [QuoteCalculationErrorCode.INVALID_ITEM_PRICE]: 'Please enter a valid price for all items.',
      [QuoteCalculationErrorCode.INVALID_ITEM_WEIGHT]: 'Please enter a valid weight for all items.',
      [QuoteCalculationErrorCode.INVALID_ITEM_QUANTITY]: 'Please enter a valid quantity for all items.',
      [QuoteCalculationErrorCode.INVALID_NUMERIC_VALUE]: 'Please enter valid numeric values.',
      [QuoteCalculationErrorCode.NEGATIVE_VALUE]: 'Values cannot be negative (except discount).',
      [QuoteCalculationErrorCode.INVALID_EXCHANGE_RATE]: 'Exchange rate configuration issue. Please contact support.',
      [QuoteCalculationErrorCode.CALCULATION_FAILED]: 'Quote calculation failed. Please check your inputs and try again.',
      [QuoteCalculationErrorCode.TOTAL_TOO_HIGH]: 'Calculated total seems unreasonably high. Please verify your inputs.',
      [QuoteCalculationErrorCode.NEGATIVE_TOTAL]: 'Calculated total is negative. Please check your discount amount.',
      [QuoteCalculationErrorCode.INVALID_CALCULATION_RESULT]: 'Invalid calculation result. Please try again.',
      [QuoteCalculationErrorCode.SHIPPING_COST_API_ERROR]: 'Unable to fetch shipping costs. Using estimated rates.',
      [QuoteCalculationErrorCode.EXCHANGE_RATE_API_ERROR]: 'Unable to fetch current exchange rates. Using cached rates.',
      [QuoteCalculationErrorCode.DATABASE_ERROR]: 'Database connection issue. Please try again in a moment.',
      [QuoteCalculationErrorCode.NETWORK_ERROR]: 'Network connection issue. Please check your internet connection.',
      [QuoteCalculationErrorCode.TIMEOUT_ERROR]: 'Request timed out. Please try again.',
      [QuoteCalculationErrorCode.CACHE_ERROR]: 'Cache error occurred. Data has been refreshed.',
      [QuoteCalculationErrorCode.CACHE_CORRUPTION]: 'Cache corruption detected. Cache has been cleared.',
      [QuoteCalculationErrorCode.MEMORY_ERROR]: 'System memory issue. Please refresh the page.',
      [QuoteCalculationErrorCode.SYSTEM_ERROR]: 'System error occurred. Please contact support.',
      [QuoteCalculationErrorCode.UNKNOWN_ERROR]: 'An unexpected error occurred. Please try again.'
    };

    let message = baseMessages[error.code] || baseMessages[QuoteCalculationErrorCode.UNKNOWN_ERROR];

    // Add context-specific information
    if (error.field) {
      message += ` (Field: ${error.field})`;
    }

    if (error.context?.originCountry || error.context?.destinationCountry) {
      const route = `${error.context.originCountry || '?'} → ${error.context.destinationCountry || '?'}`;
      message += ` (Route: ${route})`;
    }

    return message;
  }

  /**
   * Log error for analytics and debugging
   */
  private logError(error: QuoteCalculationError): void {
    this.errorLog.push(error);

    // Keep only last 100 errors in memory
    if (this.errorLog.length > 100) {
      this.errorLog.shift();
    }

    // Log to console with proper formatting
    const logLevel = error.severity === 'critical' ? 'error' : 
                    error.severity === 'high' ? 'error' :
                    error.severity === 'medium' ? 'warn' : 'info';

    console[logLevel](`[QuoteCalculation${error.severity.toUpperCase()}]`, {
      code: error.code,
      message: error.message,
      field: error.field,
      context: error.context,
      details: error.details,
      timestamp: error.timestamp
    });

    // In production, you would send this to your monitoring service
    // this.sendToMonitoring(error);
  }

  /**
   * Retry mechanism with exponential backoff
   */
  async withRetry<T>(
    operation: () => Promise<T>,
    operationId: string,
    context?: QuoteCalculationError['context']
  ): Promise<T> {
    const maxRetries = this.config.maxRetries;
    let lastError: any;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await operation();
        
        // Reset retry counter on success
        this.retryCounters.delete(operationId);
        
        return result;
      } catch (error) {
        lastError = error;
        
        if (attempt === maxRetries) {
          // Max retries reached
          const calculationError = this.createError(
            QuoteCalculationErrorCode.CALCULATION_FAILED,
            `Operation failed after ${maxRetries} attempts: ${error.message}`,
            { originalError: error, attempts: maxRetries },
            context
          );
          
          throw calculationError;
        }

        // Wait before retrying (exponential backoff)
        const delay = this.config.retryDelay * Math.pow(2, attempt - 1);
        console.warn(`[ErrorHandlingService] Attempt ${attempt} failed, retrying in ${delay}ms:`, error.message);
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError;
  }

  /**
   * Get error statistics
   */
  getErrorStats() {
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;
    const oneDayAgo = now - 24 * 60 * 60 * 1000;

    const recentErrors = this.errorLog.filter(e => e.timestamp.getTime() > oneHourAgo);
    const dailyErrors = this.errorLog.filter(e => e.timestamp.getTime() > oneDayAgo);

    const errorsByCode = this.errorLog.reduce((acc, error) => {
      acc[error.code] = (acc[error.code] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const errorsBySeverity = this.errorLog.reduce((acc, error) => {
      acc[error.severity] = (acc[error.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalErrors: this.errorLog.length,
      recentErrors: recentErrors.length,
      dailyErrors: dailyErrors.length,
      errorsByCode,
      errorsBySeverity,
      lastError: this.errorLog[this.errorLog.length - 1]
    };
  }

  /**
   * Clear error log
   */
  clearErrorLog(): void {
    this.errorLog = [];
    this.retryCounters.clear();
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<ErrorHandlingConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get current configuration
   */
  getConfig(): ErrorHandlingConfig {
    return { ...this.config };
  }
}

// Export singleton instance
export const errorHandlingService = ErrorHandlingService.getInstance();

// Helper functions for common error scenarios
export const createValidationError = (
  field: string,
  message: string,
  value?: any
): QuoteCalculationError => {
  return errorHandlingService.createError(
    QuoteCalculationErrorCode.INVALID_NUMERIC_VALUE,
    message,
    { field, value },
    undefined,
    field
  );
};

export const createCalculationError = (
  message: string,
  details?: any,
  context?: QuoteCalculationError['context']
): QuoteCalculationError => {
  return errorHandlingService.createError(
    QuoteCalculationErrorCode.CALCULATION_FAILED,
    message,
    details,
    context
  );
};

export const createNetworkError = (
  message: string,
  details?: any
): QuoteCalculationError => {
  return errorHandlingService.createError(
    QuoteCalculationErrorCode.NETWORK_ERROR,
    message,
    details
  );
};