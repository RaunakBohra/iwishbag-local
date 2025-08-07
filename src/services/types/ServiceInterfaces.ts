/**
 * Standardized Service Interfaces
 * Common interfaces and error handling patterns for all services
 */

import { logger } from '@/utils/logger';

// ============================================================================
// STANDARD SERVICE RESULT TYPES
// ============================================================================

export interface ServiceResult<T> {
  success: boolean;
  data?: T;
  error?: ServiceError;
  warnings?: ServiceWarning[];
  metadata?: Record<string, any>;
}

export interface ServiceError {
  code: string;
  message: string;
  details?: string;
  context?: Record<string, any>;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: string;
  retryable: boolean;
}

export interface ServiceWarning {
  code: string;
  message: string;
  context?: Record<string, any>;
  impact: 'low' | 'medium' | 'high';
}

export interface ServiceValidationResult {
  isValid: boolean;
  errors: ServiceError[];
  warnings: ServiceWarning[];
  metadata?: Record<string, any>;
}

// ============================================================================
// STANDARD SERVICE CONFIGURATION
// ============================================================================

export interface ServiceConfig {
  name: string;
  version: string;
  environment: 'development' | 'staging' | 'production';
  cacheEnabled: boolean;
  cacheTTL: number;
  retryAttempts: number;
  timeout: number;
  rateLimitEnabled: boolean;
}

export interface CacheConfig {
  enabled: boolean;
  ttl: number; // Time to live in milliseconds
  maxSize?: number;
  strategy: 'memory' | 'redis' | 'hybrid';
}

// ============================================================================
// BASE SERVICE INTERFACE
// ============================================================================

export interface BaseService {
  readonly config: ServiceConfig;
  readonly isInitialized: boolean;
  
  initialize(): Promise<ServiceResult<void>>;
  dispose(): Promise<ServiceResult<void>>;
  healthCheck(): Promise<ServiceResult<HealthStatus>>;
  clearCache?(): Promise<ServiceResult<void>>;
  getMetrics?(): Promise<ServiceResult<ServiceMetrics>>;
}

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  checks: HealthCheck[];
  uptime: number;
  version: string;
  timestamp: string;
}

export interface HealthCheck {
  name: string;
  status: 'pass' | 'warn' | 'fail';
  message?: string;
  duration?: number;
}

export interface ServiceMetrics {
  requestCount: number;
  errorCount: number;
  averageResponseTime: number;
  cacheHitRate?: number;
  memoryUsage?: number;
  lastActivity: string;
}

// ============================================================================
// STANDARD ERROR CODES
// ============================================================================

export enum StandardErrorCodes {
  // Validation errors
  VALIDATION_FAILED = 'VALIDATION_FAILED',
  INVALID_INPUT = 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',
  
  // Authentication/Authorization
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  
  // Resource errors
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  RESOURCE_ALREADY_EXISTS = 'RESOURCE_ALREADY_EXISTS',
  RESOURCE_LOCKED = 'RESOURCE_LOCKED',
  
  // System errors
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  TIMEOUT = 'TIMEOUT',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  CONFIGURATION_ERROR = 'CONFIGURATION_ERROR',
  
  // Data errors
  DATA_CORRUPTION = 'DATA_CORRUPTION',
  SERIALIZATION_ERROR = 'SERIALIZATION_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  
  // External service errors
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  API_LIMIT_EXCEEDED = 'API_LIMIT_EXCEEDED',
  
  // Business logic errors
  BUSINESS_RULE_VIOLATION = 'BUSINESS_RULE_VIOLATION',
  INSUFFICIENT_BALANCE = 'INSUFFICIENT_BALANCE',
  OPERATION_NOT_ALLOWED = 'OPERATION_NOT_ALLOWED'
}

// ============================================================================
// UTILITY FUNCTIONS FOR STANDARD SERVICE PATTERNS
// ============================================================================

export class ServiceErrorHandler {
  static createError(
    code: string | StandardErrorCodes,
    message: string,
    details?: string,
    context?: Record<string, any>,
    severity: ServiceError['severity'] = 'medium',
    retryable: boolean = false
  ): ServiceError {
    return {
      code: typeof code === 'string' ? code : code.toString(),
      message,
      details,
      context,
      severity,
      timestamp: new Date().toISOString(),
      retryable
    };
  }

  static createWarning(
    code: string,
    message: string,
    context?: Record<string, any>,
    impact: ServiceWarning['impact'] = 'medium'
  ): ServiceWarning {
    return {
      code,
      message,
      context,
      impact
    };
  }

  static createSuccessResult<T>(
    data: T,
    warnings?: ServiceWarning[],
    metadata?: Record<string, any>
  ): ServiceResult<T> {
    return {
      success: true,
      data,
      warnings,
      metadata
    };
  }

  static createErrorResult<T>(
    error: ServiceError,
    warnings?: ServiceWarning[]
  ): ServiceResult<T> {
    return {
      success: false,
      error,
      warnings
    };
  }

  static logError(serviceName: string, error: ServiceError): void {
    logger.error(`[${serviceName}] ${error.message}`, {
      code: error.code,
      details: error.details,
      context: error.context,
      severity: error.severity,
      retryable: error.retryable
    });
  }

  static logWarning(serviceName: string, warning: ServiceWarning): void {
    logger.warn(`[${serviceName}] ${warning.message}`, {
      code: warning.code,
      context: warning.context,
      impact: warning.impact
    });
  }
}

// ============================================================================
// RETRY AND CIRCUIT BREAKER UTILITIES
// ============================================================================

export interface RetryConfig {
  maxAttempts: number;
  delayMs: number;
  exponentialBackoff: boolean;
  maxDelayMs?: number;
  jitterMs?: number;
}

export interface CircuitBreakerConfig {
  failureThreshold: number;
  resetTimeoutMs: number;
  monitoringPeriodMs: number;
}

export class ServiceUtils {
  static async withRetry<T>(
    operation: () => Promise<T>,
    config: RetryConfig,
    serviceName: string
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt === config.maxAttempts) {
          logger.error(`[${serviceName}] Final retry attempt failed`, {
            attempt,
            maxAttempts: config.maxAttempts,
            error: lastError.message
          });
          throw lastError;
        }

        const delay = config.exponentialBackoff
          ? Math.min(config.delayMs * Math.pow(2, attempt - 1), config.maxDelayMs || 30000)
          : config.delayMs;

        const jitter = config.jitterMs ? Math.random() * config.jitterMs : 0;
        const totalDelay = delay + jitter;

        logger.warn(`[${serviceName}] Retrying operation after error`, {
          attempt,
          maxAttempts: config.maxAttempts,
          delay: totalDelay,
          error: lastError.message
        });

        await new Promise(resolve => setTimeout(resolve, totalDelay));
      }
    }
    
    throw lastError!;
  }

  static createDefaultConfig(serviceName: string): ServiceConfig {
    return {
      name: serviceName,
      version: '1.0.0',
      environment: (process.env.NODE_ENV as any) || 'development',
      cacheEnabled: true,
      cacheTTL: 10 * 60 * 1000, // 10 minutes
      retryAttempts: 3,
      timeout: 30000, // 30 seconds
      rateLimitEnabled: true
    };
  }

  static createDefaultCacheConfig(): CacheConfig {
    return {
      enabled: true,
      ttl: 10 * 60 * 1000, // 10 minutes
      maxSize: 1000,
      strategy: 'memory'
    };
  }

  static validateRequired<T>(
    data: T,
    requiredFields: (keyof T)[],
    serviceName: string
  ): ServiceValidationResult {
    const errors: ServiceError[] = [];
    const warnings: ServiceWarning[] = [];

    for (const field of requiredFields) {
      if (!data[field]) {
        errors.push(
          ServiceErrorHandler.createError(
            StandardErrorCodes.MISSING_REQUIRED_FIELD,
            `Required field '${String(field)}' is missing`,
            `Field ${String(field)} is required but was not provided`,
            { field: String(field), service: serviceName },
            'high',
            false
          )
        );
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  static async timeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
    serviceName: string
  ): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(
          ServiceErrorHandler.createError(
            StandardErrorCodes.TIMEOUT,
            `Operation timed out after ${timeoutMs}ms`,
            `Service ${serviceName} operation exceeded timeout`,
            { timeout: timeoutMs, service: serviceName },
            'high',
            true
          )
        );
      }, timeoutMs);
    });

    return Promise.race([promise, timeoutPromise]);
  }
}

// ============================================================================
// PERFORMANCE MONITORING
// ============================================================================

export class ServiceMonitor {
  private static metrics = new Map<string, ServiceMetrics>();

  static startTimer(serviceName: string, operation: string): () => number {
    const startTime = Date.now();
    
    return () => {
      const duration = Date.now() - startTime;
      this.recordMetric(serviceName, operation, duration);
      return duration;
    };
  }

  static recordMetric(
    serviceName: string,
    operation: string,
    duration: number,
    success: boolean = true
  ): void {
    const key = `${serviceName}.${operation}`;
    const existing = this.metrics.get(key) || {
      requestCount: 0,
      errorCount: 0,
      averageResponseTime: 0,
      lastActivity: new Date().toISOString()
    };

    existing.requestCount++;
    if (!success) existing.errorCount++;
    
    // Update rolling average
    existing.averageResponseTime = 
      (existing.averageResponseTime * (existing.requestCount - 1) + duration) / existing.requestCount;
    
    existing.lastActivity = new Date().toISOString();
    
    this.metrics.set(key, existing);
  }

  static getMetrics(serviceName: string): ServiceMetrics | undefined {
    return this.metrics.get(serviceName);
  }

  static getAllMetrics(): Map<string, ServiceMetrics> {
    return new Map(this.metrics);
  }

  static clearMetrics(serviceName?: string): void {
    if (serviceName) {
      this.metrics.delete(serviceName);
    } else {
      this.metrics.clear();
    }
  }
}

export default {
  ServiceErrorHandler,
  ServiceUtils,
  ServiceMonitor,
  StandardErrorCodes
};