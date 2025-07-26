import { toast } from 'sonner';
import * as Sentry from '@sentry/react';

// Error types for categorization
export enum ErrorType {
  VALIDATION = 'VALIDATION',
  NETWORK = 'NETWORK',
  DATABASE = 'DATABASE',
  AUTHENTICATION = 'AUTHENTICATION',
  PERMISSION = 'PERMISSION',
  CALCULATION = 'CALCULATION',
  DATA_INTEGRITY = 'DATA_INTEGRITY',
  UNKNOWN = 'UNKNOWN',
}

// Error severity levels
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

// Custom error class with additional metadata
export class AppError extends Error {
  public readonly type: ErrorType;
  public readonly severity: ErrorSeverity;
  public readonly context?: Record<string, any>;
  public readonly userMessage?: string;
  public readonly recoverable: boolean;
  public readonly timestamp: Date;

  constructor(
    message: string,
    options: {
      type?: ErrorType;
      severity?: ErrorSeverity;
      context?: Record<string, any>;
      userMessage?: string;
      recoverable?: boolean;
      cause?: Error;
    } = {},
  ) {
    super(message);
    this.name = 'AppError';
    this.type = options.type || ErrorType.UNKNOWN;
    this.severity = options.severity || ErrorSeverity.MEDIUM;
    this.context = options.context;
    this.userMessage = options.userMessage;
    this.recoverable = options.recoverable ?? true;
    this.timestamp = new Date();
    this.cause = options.cause;

    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }
  }
}

// Error detection utilities
export function detectErrorType(error: unknown): ErrorType {
  if (!error) return ErrorType.UNKNOWN;

  const errorMessage = error instanceof Error ? error.message : String(error);
  const lowerMessage = errorMessage.toLowerCase();

  // Network errors
  if (
    lowerMessage.includes('network') ||
    lowerMessage.includes('fetch') ||
    lowerMessage.includes('xhr') ||
    lowerMessage.includes('cors') ||
    lowerMessage.includes('timeout')
  ) {
    return ErrorType.NETWORK;
  }

  // Database errors
  if (
    lowerMessage.includes('database') ||
    lowerMessage.includes('supabase') ||
    lowerMessage.includes('postgresql') ||
    lowerMessage.includes('sql') ||
    lowerMessage.includes('constraint')
  ) {
    return ErrorType.DATABASE;
  }

  // Authentication errors
  if (
    lowerMessage.includes('auth') ||
    lowerMessage.includes('token') ||
    lowerMessage.includes('unauthorized') ||
    lowerMessage.includes('login') ||
    lowerMessage.includes('session')
  ) {
    return ErrorType.AUTHENTICATION;
  }

  // Permission errors
  if (
    lowerMessage.includes('permission') ||
    lowerMessage.includes('forbidden') ||
    lowerMessage.includes('access denied') ||
    lowerMessage.includes('not allowed')
  ) {
    return ErrorType.PERMISSION;
  }

  // Validation errors
  if (
    lowerMessage.includes('validation') ||
    lowerMessage.includes('invalid') ||
    lowerMessage.includes('required') ||
    lowerMessage.includes('format')
  ) {
    return ErrorType.VALIDATION;
  }

  // Calculation errors
  if (
    lowerMessage.includes('calculation') ||
    lowerMessage.includes('compute') ||
    lowerMessage.includes('nan') ||
    lowerMessage.includes('infinity')
  ) {
    return ErrorType.CALCULATION;
  }

  return ErrorType.UNKNOWN;
}

// User-friendly error messages
const ERROR_MESSAGES: Record<ErrorType, string> = {
  [ErrorType.VALIDATION]: 'Please check your input and try again.',
  [ErrorType.NETWORK]: 'Network connection issue. Please check your internet connection.',
  [ErrorType.DATABASE]: 'Unable to process your request. Please try again later.',
  [ErrorType.AUTHENTICATION]: 'Authentication required. Please log in again.',
  [ErrorType.PERMISSION]: 'You do not have permission to perform this action.',
  [ErrorType.CALCULATION]: 'Error in calculation. Please verify your data.',
  [ErrorType.DATA_INTEGRITY]: 'Data consistency issue detected. Please refresh and try again.',
  [ErrorType.UNKNOWN]: 'An unexpected error occurred. Please try again.',
};

// Get user-friendly error message
export function getUserMessage(error: unknown): string {
  if (error instanceof AppError && error.userMessage) {
    return error.userMessage;
  }

  const errorType = error instanceof AppError ? error.type : detectErrorType(error);
  return ERROR_MESSAGES[errorType];
}

// Comprehensive error handler
export function handleError(
  error: unknown,
  context?: {
    component?: string;
    action?: string;
    userId?: string;
    quoteId?: string;
    additionalData?: Record<string, any>;
    showToast?: boolean;
    toastDuration?: number;
  },
): void {
  const {
    component = 'Unknown',
    action = 'Unknown',
    showToast = true,
    toastDuration = 5000,
    ...contextData
  } = context || {};

  // Convert to AppError if needed
  const appError =
    error instanceof AppError
      ? error
      : new AppError(error instanceof Error ? error.message : String(error), {
          type: detectErrorType(error),
          context: contextData,
        });

  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.error(`[${component}] ${action} Error:`, {
      error: appError,
      stack: appError.stack,
      context: appError.context,
    });
  }

  // Send to Sentry
  Sentry.captureException(appError, {
    tags: {
      component,
      action,
      errorType: appError.type,
      severity: appError.severity,
    },
    contexts: {
      app: {
        component,
        action,
        ...contextData,
      },
    },
    level: mapSeverityToSentryLevel(appError.severity),
  });

  // Show user notification
  if (showToast) {
    const userMessage = getUserMessage(appError);

    switch (appError.severity) {
      case ErrorSeverity.CRITICAL:
        toast.error(userMessage, {
          duration: toastDuration,
          important: true,
        });
        break;
      case ErrorSeverity.HIGH:
        toast.error(userMessage, { duration: toastDuration });
        break;
      case ErrorSeverity.MEDIUM:
        toast.warning(userMessage, { duration: toastDuration });
        break;
      case ErrorSeverity.LOW:
        toast.info(userMessage, { duration: toastDuration });
        break;
    }
  }
}

// Map severity to Sentry level
function mapSeverityToSentryLevel(severity: ErrorSeverity): Sentry.SeverityLevel {
  switch (severity) {
    case ErrorSeverity.CRITICAL:
      return 'fatal';
    case ErrorSeverity.HIGH:
      return 'error';
    case ErrorSeverity.MEDIUM:
      return 'warning';
    case ErrorSeverity.LOW:
      return 'info';
    default:
      return 'error';
  }
}

// Async error wrapper
export async function withErrorHandling<T>(
  fn: () => Promise<T>,
  context?: Parameters<typeof handleError>[1],
): Promise<T | null> {
  try {
    return await fn();
  } catch (error) {
    handleError(error, context);
    return null;
  }
}

// React hook for error handling
export function useErrorHandler(context?: Omit<Parameters<typeof handleError>[1], 'showToast'>) {
  return {
    handleError: (error: unknown, showToast = true) =>
      handleError(error, { ...context, showToast }),
    withErrorHandling: <T>(fn: () => Promise<T>) => withErrorHandling(fn, context),
  };
}

// Validation error builder
export function createValidationError(field: string, message: string, value?: any): AppError {
  return new AppError(`Validation failed for ${field}: ${message}`, {
    type: ErrorType.VALIDATION,
    severity: ErrorSeverity.LOW,
    userMessage: message,
    context: { field, value },
  });
}

// Network error builder
export function createNetworkError(action: string, statusCode?: number, response?: any): AppError {
  return new AppError(`Network error during ${action}`, {
    type: ErrorType.NETWORK,
    severity: ErrorSeverity.HIGH,
    userMessage: 'Connection error. Please check your internet and try again.',
    context: { action, statusCode, response },
  });
}

// Database error builder
export function createDatabaseError(operation: string, table?: string, details?: any): AppError {
  return new AppError(`Database error during ${operation}`, {
    type: ErrorType.DATABASE,
    severity: ErrorSeverity.HIGH,
    userMessage: 'Unable to save changes. Please try again.',
    context: { operation, table, details },
  });
}

// Permission error builder
export function createPermissionError(action: string, resource?: string): AppError {
  return new AppError(`Permission denied for ${action}`, {
    type: ErrorType.PERMISSION,
    severity: ErrorSeverity.MEDIUM,
    userMessage: `You don't have permission to ${action}`,
    context: { action, resource },
    recoverable: false,
  });
}

// Calculation error builder
export function createCalculationError(
  calculation: string,
  input?: any,
  details?: string,
): AppError {
  return new AppError(`Calculation error in ${calculation}: ${details}`, {
    type: ErrorType.CALCULATION,
    severity: ErrorSeverity.MEDIUM,
    userMessage: 'Error calculating values. Please check your input.',
    context: { calculation, input },
  });
}
