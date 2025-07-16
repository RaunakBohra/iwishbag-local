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
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
  
  // **NEW: Business-Critical Monitoring Errors**
  // Performance Monitoring
  CALCULATION_TIMEOUT = 'CALCULATION_TIMEOUT',
  SLOW_CALCULATION = 'SLOW_CALCULATION',
  HIGH_ERROR_RATE = 'HIGH_ERROR_RATE',
  
  // Business Logic Errors
  PRICE_DEVIATION_EXTREME = 'PRICE_DEVIATION_EXTREME',
  CURRENCY_CONVERSION_FAILED = 'CURRENCY_CONVERSION_FAILED',
  SHIPPING_CALCULATION_ANOMALY = 'SHIPPING_CALCULATION_ANOMALY',
  
  // Service Degradation
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  FALLBACK_USED = 'FALLBACK_USED',
  CIRCUIT_BREAKER_OPEN = 'CIRCUIT_BREAKER_OPEN',
  
  // Business Metrics
  CONVERSION_RATE_DROP = 'CONVERSION_RATE_DROP',
  ABANDONMENT_RATE_HIGH = 'ABANDONMENT_RATE_HIGH',
  AVERAGE_QUOTE_TIME_HIGH = 'AVERAGE_QUOTE_TIME_HIGH'
}

export interface QuoteCalculationError {
  code: QuoteCalculationErrorCode;
  message: string;
  details?: Record<string, unknown>;
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
  // **NEW: Monitoring Configuration**
  enableMetrics: boolean;
  performanceThresholds: {
    slowCalculationMs: number;
    timeoutMs: number;
    errorRatePercent: number;
  };
  alerting: {
    enableAlerts: boolean;
    criticalThreshold: number;
    warningThreshold: number;
  };
}

// **NEW: Performance Metrics Interface**
export interface QuoteCalculationMetrics {
  calculationId: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  success: boolean;
  errorCode?: QuoteCalculationErrorCode;
  context: {
    originCountry: string;
    destinationCountry: string;
    currency: string;
    itemCount: number;
    totalValue: number;
    userId?: string;
    sessionId?: string;
  };
  performance: {
    calculationTime: number;
    apiCalls: number;
    cacheHits: number;
    cacheMisses: number;
  };
  businessMetrics: {
    quoteValue: number;
    conversionProbability?: number;
    priceDeviation?: number;
    isAnomalous?: boolean;
  };
}

// **NEW: Alert Configuration Interface**
export interface AlertConfig {
  type: 'critical' | 'warning' | 'info';
  threshold: number;
  timeWindow: number; // minutes
  description: string;
  action: 'email' | 'sms' | 'webhook' | 'log';
}

// **NEW: Business Metrics Interface**
export interface BusinessMetrics {
  quotesGenerated: number;
  quotesApproved: number;
  averageQuoteTime: number;
  errorRate: number;
  conversionRate: number;
  abandonmentRate: number;
  timeWindow: {
    start: Date;
    end: Date;
  };
}

/**
 * Comprehensive error handling service for quote calculations
 */
export class ErrorHandlingService {
  private static instance: ErrorHandlingService;
  private errorLog: QuoteCalculationError[] = [];
  private config: ErrorHandlingConfig;
  private retryCounters = new Map<string, number>();
  
  // **NEW: Monitoring Properties**
  private metricsLog: QuoteCalculationMetrics[] = [];
  private activeCalculations = new Map<string, QuoteCalculationMetrics>();
  private alertConfigs: Map<QuoteCalculationErrorCode, AlertConfig> = new Map();
  private businessMetricsCache: BusinessMetrics | null = null;
  private lastBusinessMetricsUpdate: number = 0;

  private constructor() {
    this.config = {
      maxRetries: 3,
      retryDelay: 1000,
      enableFallbacks: true,
      logErrors: true,
      showUserMessages: true,
      autoRecovery: true,
      // **NEW: Default Monitoring Configuration**
      enableMetrics: true,
      performanceThresholds: {
        slowCalculationMs: 5000, // 5 seconds
        timeoutMs: 30000, // 30 seconds
        errorRatePercent: 5 // 5% error rate threshold
      },
      alerting: {
        enableAlerts: true,
        criticalThreshold: 10, // 10% critical error rate
        warningThreshold: 5 // 5% warning error rate
      }
    };
    
    // **NEW: Initialize Alert Configurations**
    this.initializeAlertConfigs();
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
    details?: Record<string, unknown>,
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
    recovery?: Record<string, unknown>;
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
      // Critical - System down, immediate action required
      case QuoteCalculationErrorCode.SYSTEM_ERROR:
      case QuoteCalculationErrorCode.MEMORY_ERROR:
      case QuoteCalculationErrorCode.DATABASE_ERROR:
      case QuoteCalculationErrorCode.CALCULATION_TIMEOUT:
      case QuoteCalculationErrorCode.SERVICE_UNAVAILABLE:
      case QuoteCalculationErrorCode.HIGH_ERROR_RATE:
      case QuoteCalculationErrorCode.CIRCUIT_BREAKER_OPEN:
        return 'critical';
      
      // High - Business impact, needs attention
      case QuoteCalculationErrorCode.CALCULATION_FAILED:
      case QuoteCalculationErrorCode.INVALID_EXCHANGE_RATE:
      case QuoteCalculationErrorCode.MISSING_COUNTRY_SETTINGS:
      case QuoteCalculationErrorCode.PRICE_DEVIATION_EXTREME:
      case QuoteCalculationErrorCode.CURRENCY_CONVERSION_FAILED:
      case QuoteCalculationErrorCode.CONVERSION_RATE_DROP:
        return 'high';
      
      // Medium - Performance/reliability impact
      case QuoteCalculationErrorCode.SHIPPING_COST_API_ERROR:
      case QuoteCalculationErrorCode.EXCHANGE_RATE_API_ERROR:
      case QuoteCalculationErrorCode.NETWORK_ERROR:
      case QuoteCalculationErrorCode.TIMEOUT_ERROR:
      case QuoteCalculationErrorCode.SLOW_CALCULATION:
      case QuoteCalculationErrorCode.SHIPPING_CALCULATION_ANOMALY:
      case QuoteCalculationErrorCode.ABANDONMENT_RATE_HIGH:
      case QuoteCalculationErrorCode.AVERAGE_QUOTE_TIME_HIGH:
        return 'medium';
      
      // Low - Minor issues, informational
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
      [QuoteCalculationErrorCode.UNKNOWN_ERROR]: 'An unexpected error occurred. Please try again.',
      
      // **NEW: Monitoring-specific error messages**
      [QuoteCalculationErrorCode.CALCULATION_TIMEOUT]: 'Quote calculation is taking longer than expected. Please try again.',
      [QuoteCalculationErrorCode.SLOW_CALCULATION]: 'Quote calculation is processing slower than usual. Please wait.',
      [QuoteCalculationErrorCode.HIGH_ERROR_RATE]: 'System experiencing high error rates. Please contact support.',
      [QuoteCalculationErrorCode.PRICE_DEVIATION_EXTREME]: 'Calculated price seems unusual. Please verify your inputs.',
      [QuoteCalculationErrorCode.CURRENCY_CONVERSION_FAILED]: 'Currency conversion failed. Using fallback rates.',
      [QuoteCalculationErrorCode.SHIPPING_CALCULATION_ANOMALY]: 'Shipping calculation shows unusual values. Please review.',
      [QuoteCalculationErrorCode.SERVICE_UNAVAILABLE]: 'Quote calculation service is temporarily unavailable. Please try again later.',
      [QuoteCalculationErrorCode.FALLBACK_USED]: 'Using backup calculation method. Results may vary slightly.',
      [QuoteCalculationErrorCode.CIRCUIT_BREAKER_OPEN]: 'Service temporarily disabled for maintenance. Please try again later.',
      [QuoteCalculationErrorCode.CONVERSION_RATE_DROP]: 'System notice: Conversion rates are being monitored.',
      [QuoteCalculationErrorCode.ABANDONMENT_RATE_HIGH]: 'System notice: Processing optimization in progress.',
      [QuoteCalculationErrorCode.AVERAGE_QUOTE_TIME_HIGH]: 'System notice: Quote processing time is being optimized.'
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
    let lastError: Error | unknown;

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

  // **NEW: Monitoring Methods**

  /**
   * Initialize alert configurations for different error types
   */
  private initializeAlertConfigs(): void {
    // Critical alerts - immediate action required
    this.alertConfigs.set(QuoteCalculationErrorCode.CALCULATION_TIMEOUT, {
      type: 'critical',
      threshold: 1, // Alert on first occurrence
      timeWindow: 5,
      description: 'Quote calculation timeout detected',
      action: 'email'
    });

    this.alertConfigs.set(QuoteCalculationErrorCode.SERVICE_UNAVAILABLE, {
      type: 'critical',
      threshold: 1,
      timeWindow: 5,
      description: 'Quote calculation service unavailable',
      action: 'email'
    });

    this.alertConfigs.set(QuoteCalculationErrorCode.HIGH_ERROR_RATE, {
      type: 'critical',
      threshold: 1,
      timeWindow: 10,
      description: 'High error rate in quote calculations',
      action: 'email'
    });

    this.alertConfigs.set(QuoteCalculationErrorCode.CALCULATION_FAILED, {
      type: 'critical',
      threshold: 3, // Alert after 3 failures
      timeWindow: 10,
      description: 'Multiple quote calculation failures detected',
      action: 'webhook'
    });

    this.alertConfigs.set(QuoteCalculationErrorCode.CIRCUIT_BREAKER_OPEN, {
      type: 'critical',
      threshold: 1,
      timeWindow: 5,
      description: 'Circuit breaker activated - service protection engaged',
      action: 'email'
    });

    this.alertConfigs.set(QuoteCalculationErrorCode.DATABASE_ERROR, {
      type: 'critical',
      threshold: 2,
      timeWindow: 5,
      description: 'Database connectivity issues affecting quote calculations',
      action: 'webhook'
    });

    this.alertConfigs.set(QuoteCalculationErrorCode.SHIPPING_COST_API_ERROR, {
      type: 'critical',
      threshold: 3,
      timeWindow: 10,
      description: 'Shipping cost API failures impacting calculations',
      action: 'webhook'
    });

    // Warning alerts - monitor closely
    this.alertConfigs.set(QuoteCalculationErrorCode.SLOW_CALCULATION, {
      type: 'warning',
      threshold: 5, // Alert after 5 occurrences
      timeWindow: 15,
      description: 'Slow quote calculations detected',
      action: 'log'
    });

    this.alertConfigs.set(QuoteCalculationErrorCode.FALLBACK_USED, {
      type: 'warning',
      threshold: 10,
      timeWindow: 30,
      description: 'Frequent fallback usage in calculations',
      action: 'log'
    });

    this.alertConfigs.set(QuoteCalculationErrorCode.PRICE_DEVIATION_EXTREME, {
      type: 'warning',
      threshold: 3,
      timeWindow: 60,
      description: 'Extreme price deviations detected in calculations',
      action: 'email'
    });

    this.alertConfigs.set(QuoteCalculationErrorCode.CONVERSION_RATE_DROP, {
      type: 'warning',
      threshold: 1,
      timeWindow: 30,
      description: 'Significant drop in quote-to-order conversion rate',
      action: 'webhook'
    });

    this.alertConfigs.set(QuoteCalculationErrorCode.ABANDONMENT_RATE_HIGH, {
      type: 'warning',
      threshold: 1,
      timeWindow: 30,
      description: 'High quote abandonment rate detected',
      action: 'webhook'
    });
  }

  /**
   * Start tracking a new quote calculation
   */
  startCalculationTracking(
    calculationId: string,
    context: QuoteCalculationMetrics['context']
  ): void {
    if (!this.config.enableMetrics) return;

    const metrics: QuoteCalculationMetrics = {
      calculationId,
      startTime: performance.now(),
      success: false,
      context,
      performance: {
        calculationTime: 0,
        apiCalls: 0,
        cacheHits: 0,
        cacheMisses: 0
      },
      businessMetrics: {
        quoteValue: context.totalValue,
        isAnomalous: false
      }
    };

    this.activeCalculations.set(calculationId, metrics);
  }

  /**
   * Complete calculation tracking
   */
  completeCalculationTracking(
    calculationId: string,
    success: boolean,
    result?: {
      finalTotal?: number;
      errorCode?: QuoteCalculationErrorCode;
      apiCalls?: number;
      cacheHits?: number;
      cacheMisses?: number;
    }
  ): void {
    if (!this.config.enableMetrics) return;

    const metrics = this.activeCalculations.get(calculationId);
    if (!metrics) return;

    const endTime = performance.now();
    const duration = endTime - metrics.startTime;

    // Complete the metrics
    metrics.endTime = endTime;
    metrics.duration = duration;
    metrics.success = success;
    metrics.performance.calculationTime = duration;
    
    if (result) {
      metrics.errorCode = result.errorCode;
      metrics.performance.apiCalls = result.apiCalls || 0;
      metrics.performance.cacheHits = result.cacheHits || 0;
      metrics.performance.cacheMisses = result.cacheMisses || 0;
      
      if (result.finalTotal) {
        metrics.businessMetrics.quoteValue = result.finalTotal;
        metrics.businessMetrics.priceDeviation = this.calculatePriceDeviation(
          result.finalTotal,
          metrics.context.totalValue
        );
        metrics.businessMetrics.isAnomalous = this.isCalculationAnomalous(metrics);
      }
    }

    // Check for performance issues
    this.checkPerformanceThresholds(metrics);

    // Store completed metrics
    this.metricsLog.push(metrics);
    this.activeCalculations.delete(calculationId);

    // Keep only last 1000 metrics in memory
    if (this.metricsLog.length > 1000) {
      this.metricsLog.shift();
    }

    // Check alert conditions
    this.checkAlertConditions();
  }

  /**
   * Record API call for active calculation
   */
  recordApiCall(calculationId: string, cacheHit: boolean = false): void {
    const metrics = this.activeCalculations.get(calculationId);
    if (!metrics) return;

    metrics.performance.apiCalls++;
    if (cacheHit) {
      metrics.performance.cacheHits++;
    } else {
      metrics.performance.cacheMisses++;
    }
  }

  /**
   * Check performance thresholds and create alerts
   */
  private checkPerformanceThresholds(metrics: QuoteCalculationMetrics): void {
    const { duration } = metrics;
    if (!duration) return;

    // Check for slow calculations
    if (duration > this.config.performanceThresholds.slowCalculationMs) {
      const slowCalcError = this.createError(
        QuoteCalculationErrorCode.SLOW_CALCULATION,
        `Quote calculation took ${Math.round(duration)}ms (threshold: ${this.config.performanceThresholds.slowCalculationMs}ms)`,
        { duration, threshold: this.config.performanceThresholds.slowCalculationMs },
        metrics.context
      );
      this.handleError(slowCalcError);
    }

    // Check for timeout
    if (duration > this.config.performanceThresholds.timeoutMs) {
      const timeoutError = this.createError(
        QuoteCalculationErrorCode.CALCULATION_TIMEOUT,
        `Quote calculation timed out after ${Math.round(duration)}ms`,
        { duration, threshold: this.config.performanceThresholds.timeoutMs },
        metrics.context
      );
      this.handleError(timeoutError);
    }
  }

  /**
   * Calculate price deviation percentage
   */
  private calculatePriceDeviation(finalTotal: number, originalTotal: number): number {
    if (originalTotal === 0) return 0;
    return Math.abs((finalTotal - originalTotal) / originalTotal) * 100;
  }

  /**
   * Determine if calculation result is anomalous
   */
  private isCalculationAnomalous(metrics: QuoteCalculationMetrics): boolean {
    const { priceDeviation } = metrics.businessMetrics;
    
    // Consider anomalous if:
    // - Price deviation > 100% (doubled)
    // - Calculation time > 10 seconds
    // - High number of API calls (> 20)
    return (
      (priceDeviation && priceDeviation > 100) ||
      (metrics.duration && metrics.duration > 10000) ||
      metrics.performance.apiCalls > 20
    );
  }

  /**
   * Check alert conditions and trigger alerts
   */
  private checkAlertConditions(): void {
    if (!this.config.alerting.enableAlerts) return;

    const now = Date.now();
    
    // Check error rate in last hour
    const oneHourAgo = now - 60 * 60 * 1000;
    const recentCalculations = this.metricsLog.filter(m => 
      m.startTime > oneHourAgo && m.endTime
    );
    
    if (recentCalculations.length === 0) return;

    const failedCalculations = recentCalculations.filter(m => !m.success);
    const errorRate = (failedCalculations.length / recentCalculations.length) * 100;

    // Check critical error rate threshold
    if (errorRate >= this.config.alerting.criticalThreshold) {
      const highErrorRateError = this.createError(
        QuoteCalculationErrorCode.HIGH_ERROR_RATE,
        `Critical error rate detected: ${errorRate.toFixed(2)}% (threshold: ${this.config.alerting.criticalThreshold}%)`,
        { 
          errorRate, 
          threshold: this.config.alerting.criticalThreshold,
          totalCalculations: recentCalculations.length,
          failedCalculations: failedCalculations.length
        }
      );
      this.handleError(highErrorRateError);
    }

    // Check for specific error codes that need alerting
    this.checkErrorCodeAlerts();
  }

  /**
   * Check for specific error codes that need alerting based on configured thresholds
   */
  private checkErrorCodeAlerts(): void {
    const now = Date.now();
    
    // Group errors by code and time window
    this.alertConfigs.forEach((config, errorCode) => {
      const timeWindowStart = now - (config.timeWindow * 60 * 1000);
      const recentErrors = this.errorLog.filter(
        error => error.code === errorCode && error.timestamp.getTime() > timeWindowStart
      );

      if (recentErrors.length >= config.threshold) {
        this.dispatchAlert({
          errorCode,
          config,
          errorCount: recentErrors.length,
          timeWindow: config.timeWindow,
          recentErrors
        });
      }
    });
  }

  /**
   * Dispatch alert through configured channels
   */
  private dispatchAlert(alertData: {
    errorCode: QuoteCalculationErrorCode;
    config: AlertConfig;
    errorCount: number;
    timeWindow: number;
    recentErrors: QuoteCalculationError[];
  }): void {
    const { errorCode, config, errorCount, timeWindow, recentErrors } = alertData;
    const timestamp = new Date().toISOString();

    const alertMessage = {
      timestamp,
      severity: config.type,
      errorCode,
      description: config.description,
      errorCount,
      timeWindow: `${timeWindow} minutes`,
      threshold: config.threshold,
      details: {
        firstOccurrence: recentErrors[0]?.timestamp,
        lastOccurrence: recentErrors[recentErrors.length - 1]?.timestamp,
        affectedContexts: this.extractUniqueContexts(recentErrors)
      }
    };

    // Dispatch based on configured action
    switch (config.action) {
      case 'log':
        this.logAlert(alertMessage);
        break;
      
      case 'email':
        this.sendEmailAlert(alertMessage);
        break;
      
      case 'webhook':
        this.sendWebhookAlert(alertMessage);
        break;
      
      case 'sms':
        this.sendSmsAlert(alertMessage);
        break;
      
      default:
        this.logAlert(alertMessage);
    }
  }

  /**
   * Log alert to console and potentially to a dedicated alert log
   */
  private logAlert(alertMessage: any): void {
    const logPrefix = alertMessage.severity === 'critical' ? '🚨 CRITICAL ALERT' : '⚠️ WARNING ALERT';
    
    console.error(`${logPrefix}: ${alertMessage.description}`);
    console.error('Alert Details:', {
      code: alertMessage.errorCode,
      count: alertMessage.errorCount,
      timeWindow: alertMessage.timeWindow,
      timestamp: alertMessage.timestamp
    });

    // In production, this would write to a dedicated alert log file or service
    if (this.config.alerting.enableAlerts) {
      // Store alerts in memory for dashboard/monitoring
      this.storeAlertHistory(alertMessage);
    }
  }

  /**
   * Send email alert (simulated - in production would use email service)
   */
  private sendEmailAlert(alertMessage: any): void {
    // Log the alert first
    this.logAlert(alertMessage);

    // In production, this would integrate with an email service like SendGrid
    console.error('📧 EMAIL ALERT would be sent to:', {
      to: 'alerts@iwishbag.com',
      subject: `[${alertMessage.severity.toUpperCase()}] ${alertMessage.description}`,
      body: JSON.stringify(alertMessage, null, 2)
    });
  }

  /**
   * Send webhook alert (simulated - in production would make HTTP request)
   */
  private sendWebhookAlert(alertMessage: any): void {
    // Log the alert first
    this.logAlert(alertMessage);

    // In production, this would make an actual HTTP POST request
    console.error('🔔 WEBHOOK ALERT would be sent to monitoring service:', {
      url: 'https://monitoring.iwishbag.com/alerts',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: alertMessage
    });

    // Simulate webhook call for local development
    if (import.meta.env.DEV) {
      this.simulateWebhookCall(alertMessage);
    }
  }

  /**
   * Send SMS alert (simulated - in production would use SMS service)
   */
  private sendSmsAlert(alertMessage: any): void {
    // Log the alert first
    this.logAlert(alertMessage);

    // In production, this would integrate with an SMS service like Twilio
    console.error('📱 SMS ALERT would be sent:', {
      to: '+1234567890',
      message: `${alertMessage.severity.toUpperCase()}: ${alertMessage.description} - ${alertMessage.errorCount} errors in ${alertMessage.timeWindow}`
    });
  }

  /**
   * Simulate webhook call for development
   */
  private async simulateWebhookCall(alertMessage: any): Promise<void> {
    // In development, log to a local file or development monitoring service
    try {
      // Could integrate with local monitoring tools or development services
      console.log('🔧 Development webhook simulation:', alertMessage);
    } catch (error) {
      console.error('Failed to simulate webhook:', error);
    }
  }

  /**
   * Extract unique contexts from errors for alert details
   */
  private extractUniqueContexts(errors: QuoteCalculationError[]): any[] {
    const uniqueContexts = new Map<string, any>();
    
    errors.forEach(error => {
      if (error.context) {
        const key = `${error.context.originCountry}-${error.context.destinationCountry}-${error.context.currency}`;
        uniqueContexts.set(key, {
          originCountry: error.context.originCountry,
          destinationCountry: error.context.destinationCountry,
          currency: error.context.currency,
          userCount: new Set(errors.map(e => e.context?.userId).filter(Boolean)).size
        });
      }
    });

    return Array.from(uniqueContexts.values());
  }

  // Alert history storage
  private alertHistory: any[] = [];
  private readonly MAX_ALERT_HISTORY = 1000;

  /**
   * Store alert in history for monitoring dashboard
   */
  private storeAlertHistory(alertMessage: any): void {
    this.alertHistory.push({
      ...alertMessage,
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    });

    // Keep only recent alerts
    if (this.alertHistory.length > this.MAX_ALERT_HISTORY) {
      this.alertHistory = this.alertHistory.slice(-this.MAX_ALERT_HISTORY);
    }
  }

  /**
   * Get alert history for monitoring dashboard
   */
  getAlertHistory(severity?: 'critical' | 'warning' | 'info'): any[] {
    if (severity) {
      return this.alertHistory.filter(alert => alert.severity === severity);
    }
    return [...this.alertHistory];
  }

  /**
   * Get recent alerts (last 24 hours)
   */
  getRecentAlerts(hoursBack: number = 24): any[] {
    const cutoffTime = Date.now() - (hoursBack * 60 * 60 * 1000);
    return this.alertHistory.filter(alert => 
      new Date(alert.timestamp).getTime() > cutoffTime
    );
  }

  /**
   * Get performance metrics summary
   */
  getPerformanceMetrics(timeWindowMinutes: number = 60): {
    totalCalculations: number;
    successRate: number;
    averageCalculationTime: number;
    errorRate: number;
    slowCalculations: number;
    anomalousCalculations: number;
    topErrors: Array<{ code: string; count: number }>;
  } {
    const now = Date.now();
    const windowStart = now - (timeWindowMinutes * 60 * 1000);
    
    const recentMetrics = this.metricsLog.filter(m => 
      m.startTime > windowStart && m.endTime
    );

    if (recentMetrics.length === 0) {
      return {
        totalCalculations: 0,
        successRate: 0,
        averageCalculationTime: 0,
        errorRate: 0,
        slowCalculations: 0,
        anomalousCalculations: 0,
        topErrors: []
      };
    }

    const successfulCalculations = recentMetrics.filter(m => m.success);
    const failedCalculations = recentMetrics.filter(m => !m.success);
    const slowCalculations = recentMetrics.filter(m => 
      m.duration && m.duration > this.config.performanceThresholds.slowCalculationMs
    );
    const anomalousCalculations = recentMetrics.filter(m => 
      m.businessMetrics.isAnomalous
    );

    // Calculate average calculation time
    const totalTime = recentMetrics.reduce((sum, m) => sum + (m.duration || 0), 0);
    const averageCalculationTime = totalTime / recentMetrics.length;

    // Get top error codes
    const errorCounts = failedCalculations.reduce((acc, m) => {
      if (m.errorCode) {
        acc[m.errorCode] = (acc[m.errorCode] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    const topErrors = Object.entries(errorCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([code, count]) => ({ code, count }));

    return {
      totalCalculations: recentMetrics.length,
      successRate: (successfulCalculations.length / recentMetrics.length) * 100,
      averageCalculationTime,
      errorRate: (failedCalculations.length / recentMetrics.length) * 100,
      slowCalculations: slowCalculations.length,
      anomalousCalculations: anomalousCalculations.length,
      topErrors
    };
  }

  /**
   * Get business metrics
   */
  getBusinessMetrics(forceRefresh: boolean = false): BusinessMetrics {
    const now = Date.now();
    const cacheValidityMs = 5 * 60 * 1000; // 5 minutes

    if (!forceRefresh && 
        this.businessMetricsCache && 
        (now - this.lastBusinessMetricsUpdate) < cacheValidityMs) {
      return this.businessMetricsCache;
    }

    // Calculate business metrics from recent data
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    const recentMetrics = this.metricsLog.filter(m => 
      m.startTime > oneDayAgo && m.endTime
    );

    const quotesGenerated = recentMetrics.length;
    const quotesApproved = recentMetrics.filter(m => m.success).length;
    const totalTime = recentMetrics.reduce((sum, m) => sum + (m.duration || 0), 0);
    const averageQuoteTime = quotesGenerated > 0 ? totalTime / quotesGenerated : 0;
    const errorRate = quotesGenerated > 0 ? 
      ((quotesGenerated - quotesApproved) / quotesGenerated) * 100 : 0;
    
    // For conversion and abandonment rates, we'd need additional data
    // For now, we'll use placeholder calculations
    const conversionRate = quotesGenerated > 0 ? (quotesApproved / quotesGenerated) * 100 : 0;
    const abandonmentRate = 100 - conversionRate;

    this.businessMetricsCache = {
      quotesGenerated,
      quotesApproved,
      averageQuoteTime,
      errorRate,
      conversionRate,
      abandonmentRate,
      timeWindow: {
        start: new Date(oneDayAgo),
        end: new Date(now)
      }
    };

    this.lastBusinessMetricsUpdate = now;
    return this.businessMetricsCache;
  }

  /**
   * Clear metrics log
   */
  clearMetricsLog(): void {
    this.metricsLog = [];
    this.activeCalculations.clear();
    this.businessMetricsCache = null;
    this.lastBusinessMetricsUpdate = 0;
  }

  /**
   * Test alert system with a specific error code
   */
  testAlert(errorCode: QuoteCalculationErrorCode, context?: QuoteCalculationError['context']): void {
    const testError = this.createError(
      errorCode,
      `Test alert for ${errorCode}`,
      { test: true, timestamp: new Date().toISOString() },
      context || {
        originCountry: 'US',
        destinationCountry: 'IN',
        currency: 'USD',
        itemCount: 1,
        userId: 'test-user',
        sessionId: 'test-session'
      }
    );

    this.handleError(testError);
    console.log(`✅ Test alert dispatched for ${errorCode}`);
  }

  /**
   * Update alert configuration for a specific error code
   */
  updateAlertConfig(errorCode: QuoteCalculationErrorCode, config: Partial<AlertConfig>): void {
    const existingConfig = this.alertConfigs.get(errorCode);
    if (existingConfig) {
      this.alertConfigs.set(errorCode, { ...existingConfig, ...config });
      console.log(`✅ Alert configuration updated for ${errorCode}`);
    } else {
      console.warn(`⚠️ No alert configuration found for ${errorCode}`);
    }
  }

  /**
   * Get current alert configuration
   */
  getAlertConfig(errorCode?: QuoteCalculationErrorCode): Map<QuoteCalculationErrorCode, AlertConfig> | AlertConfig | undefined {
    if (errorCode) {
      return this.alertConfigs.get(errorCode);
    }
    return new Map(this.alertConfigs);
  }

  /**
   * Enable/disable alerting
   */
  setAlertingEnabled(enabled: boolean): void {
    this.config.alerting.enableAlerts = enabled;
    console.log(`📢 Alerting ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Get alert summary for monitoring dashboard
   */
  getAlertSummary(): {
    totalAlerts: number;
    criticalAlerts: number;
    warningAlerts: number;
    recentAlerts: any[];
    topAlertCodes: Array<{ code: string; count: number }>;
  } {
    const recentAlerts = this.getRecentAlerts(24);
    const criticalAlerts = recentAlerts.filter(a => a.severity === 'critical');
    const warningAlerts = recentAlerts.filter(a => a.severity === 'warning');

    // Count alerts by error code
    const alertCounts = recentAlerts.reduce((acc, alert) => {
      acc[alert.errorCode] = (acc[alert.errorCode] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topAlertCodes = Object.entries(alertCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([code, count]) => ({ code, count }));

    return {
      totalAlerts: this.alertHistory.length,
      criticalAlerts: criticalAlerts.length,
      warningAlerts: warningAlerts.length,
      recentAlerts: recentAlerts.slice(0, 10), // Last 10 alerts
      topAlertCodes
    };
  }
}

// Export singleton instance
export const errorHandlingService = ErrorHandlingService.getInstance();

// Helper functions for common error scenarios
export const createValidationError = (
  field: string,
  message: string,
  value?: unknown
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
  details?: Record<string, unknown>,
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
  details?: Record<string, unknown>
): QuoteCalculationError => {
  return errorHandlingService.createError(
    QuoteCalculationErrorCode.NETWORK_ERROR,
    message,
    details
  );
};

// **NEW: Monitoring Helper Functions**

/**
 * Start monitoring a quote calculation
 */
export const startQuoteCalculationMonitoring = (
  calculationId: string,
  originCountry: string,
  destinationCountry: string,
  currency: string,
  itemCount: number,
  totalValue: number,
  userId?: string,
  sessionId?: string
): void => {
  errorHandlingService.startCalculationTracking(calculationId, {
    originCountry,
    destinationCountry,
    currency,
    itemCount,
    totalValue,
    userId,
    sessionId
  });
};

/**
 * Complete monitoring of a quote calculation
 */
export const completeQuoteCalculationMonitoring = (
  calculationId: string,
  success: boolean,
  finalTotal?: number,
  errorCode?: QuoteCalculationErrorCode,
  apiCalls?: number,
  cacheHits?: number,
  cacheMisses?: number
): void => {
  errorHandlingService.completeCalculationTracking(calculationId, success, {
    finalTotal,
    errorCode,
    apiCalls,
    cacheHits,
    cacheMisses
  });
};

/**
 * Record an API call during calculation
 */
export const recordQuoteCalculationApiCall = (
  calculationId: string,
  cacheHit: boolean = false
): void => {
  errorHandlingService.recordApiCall(calculationId, cacheHit);
};

/**
 * Create a performance monitoring error
 */
export const createPerformanceError = (
  code: QuoteCalculationErrorCode,
  message: string,
  performanceData: Record<string, unknown>,
  context?: QuoteCalculationError['context']
): QuoteCalculationError => {
  return errorHandlingService.createError(code, message, performanceData, context);
};

/**
 * Create a business metric alert
 */
export const createBusinessMetricAlert = (
  code: QuoteCalculationErrorCode,
  message: string,
  metricData: Record<string, unknown>
): QuoteCalculationError => {
  return errorHandlingService.createError(code, message, metricData);
};

/**
 * Get current quote calculation performance metrics
 */
export const getQuoteCalculationMetrics = (timeWindowMinutes?: number) => {
  return errorHandlingService.getPerformanceMetrics(timeWindowMinutes);
};

/**
 * Get current business metrics
 */
export const getQuoteBusinessMetrics = (forceRefresh?: boolean) => {
  return errorHandlingService.getBusinessMetrics(forceRefresh);
};

// Alert Helper Functions
export const testQuoteAlert = (errorCode: QuoteCalculationErrorCode): void => {
  errorHandlingService.testAlert(errorCode);
};

export const getAlertSummary = () => {
  return errorHandlingService.getAlertSummary();
};

export const updateAlertConfiguration = (
  errorCode: QuoteCalculationErrorCode, 
  config: Partial<AlertConfig>
): void => {
  errorHandlingService.updateAlertConfig(errorCode, config);
};

export const setAlertingEnabled = (enabled: boolean): void => {
  errorHandlingService.setAlertingEnabled(enabled);
};