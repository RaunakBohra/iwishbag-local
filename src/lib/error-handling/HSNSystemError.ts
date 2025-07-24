/**
 * HSN System Error Handling Framework
 * Comprehensive error handling for HSN-based tax calculation system
 */

export enum HSNErrorType {
  // Classification Errors
  CLASSIFICATION_FAILED = 'CLASSIFICATION_FAILED',
  HSN_CODE_INVALID = 'HSN_CODE_INVALID',
  LOW_CONFIDENCE_CLASSIFICATION = 'LOW_CONFIDENCE_CLASSIFICATION',

  // Weight Detection Errors
  WEIGHT_DETECTION_FAILED = 'WEIGHT_DETECTION_FAILED',
  WEIGHT_VALIDATION_FAILED = 'WEIGHT_VALIDATION_FAILED',
  UNREASONABLE_WEIGHT = 'UNREASONABLE_WEIGHT',

  // Tax Calculation Errors
  TAX_CALCULATION_FAILED = 'TAX_CALCULATION_FAILED',
  MINIMUM_VALUATION_ERROR = 'MINIMUM_VALUATION_ERROR',
  INVALID_TAX_RATE = 'INVALID_TAX_RATE',

  // API Integration Errors
  GOVERNMENT_API_ERROR = 'GOVERNMENT_API_ERROR',
  API_RATE_LIMIT_EXCEEDED = 'API_RATE_LIMIT_EXCEEDED',
  API_AUTHENTICATION_FAILED = 'API_AUTHENTICATION_FAILED',

  // Data Integrity Errors
  MISSING_ROUTE_CONFIG = 'MISSING_ROUTE_CONFIG',
  INVALID_CONFIGURATION = 'INVALID_CONFIGURATION',
  DATABASE_ERROR = 'DATABASE_ERROR',

  // Security Errors
  UNAUTHORIZED_ACCESS = 'UNAUTHORIZED_ACCESS',
  INVALID_PERMISSIONS = 'INVALID_PERMISSIONS',
  API_KEY_INVALID = 'API_KEY_INVALID',
}

export enum HSNErrorSeverity {
  LOW = 'LOW', // System can continue with fallback
  MEDIUM = 'MEDIUM', // Manual review required
  HIGH = 'HIGH', // System functionality impaired
  CRITICAL = 'CRITICAL', // System failure, immediate attention required
}

export interface HSNErrorContext {
  productName?: string;
  productUrl?: string;
  hsnCode?: string;
  category?: string;
  weight?: number;
  route?: string;
  userId?: string;
  quoteId?: string;
  timestamp: Date;
  sessionId?: string;
  userAgent?: string;
}

export interface HSNErrorRecovery {
  canRecover: boolean;
  fallbackValue?: any;
  fallbackSource?: string;
  requiresManualReview: boolean;
  suggestedActions: string[];
}

export class HSNSystemError extends Error {
  public readonly type: HSNErrorType;
  public readonly severity: HSNErrorSeverity;
  public readonly context: HSNErrorContext;
  public readonly recovery: HSNErrorRecovery;
  public readonly originalError?: Error;
  public readonly errorId: string;

  constructor(
    type: HSNErrorType,
    message: string,
    severity: HSNErrorSeverity,
    context: Partial<HSNErrorContext>,
    recovery: Partial<HSNErrorRecovery> = {},
    originalError?: Error,
  ) {
    super(message);
    this.name = 'HSNSystemError';
    this.type = type;
    this.severity = severity;
    this.context = {
      timestamp: new Date(),
      ...context,
    };
    this.recovery = {
      canRecover: false,
      requiresManualReview: false,
      suggestedActions: [],
      ...recovery,
    };
    this.originalError = originalError;
    this.errorId = this.generateErrorId();

    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, HSNSystemError);
    }
  }

  private generateErrorId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `HSN_${timestamp}_${random}`.toUpperCase();
  }

  public toJSON() {
    return {
      errorId: this.errorId,
      type: this.type,
      message: this.message,
      severity: this.severity,
      context: this.context,
      recovery: this.recovery,
      stack: this.stack,
      originalError: this.originalError
        ? {
            name: this.originalError.name,
            message: this.originalError.message,
            stack: this.originalError.stack,
          }
        : undefined,
    };
  }

  public shouldNotifyAdmin(): boolean {
    return this.severity === HSNErrorSeverity.HIGH || this.severity === HSNErrorSeverity.CRITICAL;
  }

  public shouldBlockOperation(): boolean {
    return this.severity === HSNErrorSeverity.CRITICAL && !this.recovery.canRecover;
  }
}

// Error Factory Functions for common scenarios
export const HSNErrors = {
  classificationFailed: (context: Partial<HSNErrorContext>, originalError?: Error) =>
    new HSNSystemError(
      HSNErrorType.CLASSIFICATION_FAILED,
      'Failed to classify product automatically',
      HSNErrorSeverity.MEDIUM,
      context,
      {
        canRecover: true,
        requiresManualReview: true,
        suggestedActions: [
          'Review product details manually',
          'Assign HSN code manually',
          'Check if product URL is accessible',
        ],
      },
      originalError,
    ),

  lowConfidenceClassification: (confidence: number, context: Partial<HSNErrorContext>) =>
    new HSNSystemError(
      HSNErrorType.LOW_CONFIDENCE_CLASSIFICATION,
      `Classification confidence too low: ${(confidence * 100).toFixed(1)}%`,
      HSNErrorSeverity.LOW,
      context,
      {
        canRecover: true,
        requiresManualReview: true,
        fallbackSource: 'manual_review',
        suggestedActions: [
          'Review auto-detected HSN code',
          'Verify product category',
          'Consider improving classification rules',
        ],
      },
    ),

  weightDetectionFailed: (context: Partial<HSNErrorContext>, originalError?: Error) =>
    new HSNSystemError(
      HSNErrorType.WEIGHT_DETECTION_FAILED,
      'Failed to detect product weight automatically',
      HSNErrorSeverity.MEDIUM,
      context,
      {
        canRecover: true,
        fallbackValue: 0.5, // Default 500g
        fallbackSource: 'category_average',
        requiresManualReview: true,
        suggestedActions: [
          'Enter weight manually',
          'Check product specifications',
          'Use category average weight',
        ],
      },
      originalError,
    ),

  governmentAPIError: (apiName: string, context: Partial<HSNErrorContext>, originalError?: Error) =>
    new HSNSystemError(
      HSNErrorType.GOVERNMENT_API_ERROR,
      `${apiName} API request failed`,
      HSNErrorSeverity.HIGH,
      context,
      {
        canRecover: true,
        fallbackSource: 'local_database',
        requiresManualReview: false,
        suggestedActions: [
          'Check API status',
          'Verify API credentials',
          'Use cached data if available',
          'Contact API provider if persistent',
        ],
      },
      originalError,
    ),

  unauthorizedAccess: (operation: string, context: Partial<HSNErrorContext>) =>
    new HSNSystemError(
      HSNErrorType.UNAUTHORIZED_ACCESS,
      `Unauthorized access to ${operation}`,
      HSNErrorSeverity.HIGH,
      context,
      {
        canRecover: false,
        requiresManualReview: true,
        suggestedActions: [
          'Check user permissions',
          'Verify authentication status',
          'Contact administrator',
        ],
      },
    ),

  invalidConfiguration: (configType: string, context: Partial<HSNErrorContext>) =>
    new HSNSystemError(
      HSNErrorType.INVALID_CONFIGURATION,
      `Invalid ${configType} configuration`,
      HSNErrorSeverity.HIGH,
      context,
      {
        canRecover: false,
        requiresManualReview: true,
        suggestedActions: [
          'Check configuration format',
          'Verify required fields',
          'Restore from backup if needed',
        ],
      },
    ),
};

// Error Handler Interface
export interface HSNErrorHandler {
  handleError(error: HSNSystemError): Promise<void>;
  logError(error: HSNSystemError): Promise<void>;
  notifyAdmin(error: HSNSystemError): Promise<void>;
  recoverFromError(error: HSNSystemError): Promise<any>;
}

// Default Error Handler Implementation
export class DefaultHSNErrorHandler implements HSNErrorHandler {
  async handleError(error: HSNSystemError): Promise<void> {
    // Log the error
    await this.logError(error);

    // Notify admin for high severity errors
    if (error.shouldNotifyAdmin()) {
      await this.notifyAdmin(error);
    }

    // Attempt recovery if possible
    if (error.recovery.canRecover) {
      await this.recoverFromError(error);
    }
  }

  async logError(error: HSNSystemError): Promise<void> {
    console.error(`[HSN System Error] ${error.errorId}:`, error.toJSON());

    // In production, send to monitoring service
    if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
      // Send to monitoring service (e.g., Sentry, LogRocket)
      // await sendToMonitoringService(error);
    }
  }

  async notifyAdmin(error: HSNSystemError): Promise<void> {
    console.warn(`[HSN Admin Alert] ${error.errorId}: ${error.message}`);

    // In production, send admin notification
    // await sendAdminNotification(error);
  }

  async recoverFromError(error: HSNSystemError): Promise<any> {
    if (error.recovery.fallbackValue !== undefined) {
      console.info(`[HSN Recovery] Using fallback value: ${error.recovery.fallbackValue}`);
      return error.recovery.fallbackValue;
    }

    console.info(`[HSN Recovery] Error marked as recoverable but no fallback value provided`);
    return null;
  }
}

// Global error handler instance
export const hsnErrorHandler = new DefaultHSNErrorHandler();
