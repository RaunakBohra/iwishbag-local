/**
 * Scraping Error Service
 * Comprehensive error handling, recovery, and monitoring for scraping operations
 * Decomposed from BrightDataProductService for better separation of concerns
 */

import { logger } from '@/utils/logger';
import * as Sentry from '@sentry/react';
import { SupportedPlatform } from './PlatformDetectionService';

export interface ScrapingError {
  id: string;
  timestamp: number;
  platform: SupportedPlatform;
  url: string;
  errorType: ErrorType;
  errorCode: string;
  message: string;
  stack?: string;
  context: ErrorContext;
  retryCount: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  resolved: boolean;
  recoveryStrategy?: RecoveryStrategy;
}

export interface ErrorContext {
  userAgent?: string;
  requestId?: string;
  sessionId?: string;
  attempt: number;
  duration: number;
  httpStatus?: number;
  responseSize?: number;
  memoryUsage?: number;
}

export interface RecoveryStrategy {
  type: 'retry' | 'fallback' | 'skip' | 'manual';
  attempts: number;
  delay: number;
  maxDelay: number;
  backoffMultiplier: number;
  alternativeUrls?: string[];
  fallbackPlatform?: SupportedPlatform;
}

export interface ErrorStats {
  totalErrors: number;
  errorsByPlatform: Record<SupportedPlatform, number>;
  errorsByType: Record<ErrorType, number>;
  errorRate: number;
  averageResolutionTime: number;
  criticalErrors: number;
  unresolvedErrors: number;
}

export interface ErrorPattern {
  pattern: RegExp;
  errorType: ErrorType;
  severity: ScrapingError['severity'];
  recoveryStrategy: RecoveryStrategy;
}

export enum ErrorType {
  NETWORK_ERROR = 'network_error',
  TIMEOUT = 'timeout',
  RATE_LIMIT = 'rate_limit',
  AUTHENTICATION = 'authentication',
  FORBIDDEN = 'forbidden',
  NOT_FOUND = 'not_found',
  INVALID_RESPONSE = 'invalid_response',
  PARSING_ERROR = 'parsing_error',
  VALIDATION_ERROR = 'validation_error',
  PLATFORM_CHANGE = 'platform_change',
  REGION_BLOCK = 'region_block',
  CAPTCHA = 'captcha',
  TEMPORARY_BLOCK = 'temporary_block',
  SERVER_ERROR = 'server_error',
  UNKNOWN = 'unknown',
}

export class ScrapingErrorService {
  private errors = new Map<string, ScrapingError>();
  private errorPatterns: ErrorPattern[] = [];
  private stats: ErrorStats;
  private maxErrorHistory = 10000;
  private cleanupInterval: NodeJS.Timeout | null = null;

  // Platform-specific error handling configurations
  private readonly PLATFORM_CONFIGS: Record<SupportedPlatform, {
    maxRetries: number;
    baseDelay: number;
    maxDelay: number;
    backoffMultiplier: number;
    criticalErrorThreshold: number;
  }> = {
    amazon: { maxRetries: 5, baseDelay: 2000, maxDelay: 30000, backoffMultiplier: 2, criticalErrorThreshold: 10 },
    ebay: { maxRetries: 4, baseDelay: 1500, maxDelay: 25000, backoffMultiplier: 2, criticalErrorThreshold: 8 },
    walmart: { maxRetries: 4, baseDelay: 1500, maxDelay: 20000, backoffMultiplier: 1.8, criticalErrorThreshold: 8 },
    bestbuy: { maxRetries: 3, baseDelay: 2000, maxDelay: 15000, backoffMultiplier: 2, criticalErrorThreshold: 6 },
    target: { maxRetries: 3, baseDelay: 2000, maxDelay: 15000, backoffMultiplier: 2, criticalErrorThreshold: 6 },
    etsy: { maxRetries: 3, baseDelay: 3000, maxDelay: 20000, backoffMultiplier: 2, criticalErrorThreshold: 5 },
    ae: { maxRetries: 2, baseDelay: 5000, maxDelay: 30000, backoffMultiplier: 2.5, criticalErrorThreshold: 4 },
    myntra: { maxRetries: 3, baseDelay: 2000, maxDelay: 15000, backoffMultiplier: 2, criticalErrorThreshold: 5 },
    hm: { maxRetries: 3, baseDelay: 3000, maxDelay: 20000, backoffMultiplier: 2, criticalErrorThreshold: 5 },
    asos: { maxRetries: 3, baseDelay: 2500, maxDelay: 18000, backoffMultiplier: 2, criticalErrorThreshold: 5 },
    zara: { maxRetries: 2, baseDelay: 4000, maxDelay: 25000, backoffMultiplier: 2.2, criticalErrorThreshold: 4 },
    lego: { maxRetries: 4, baseDelay: 2000, maxDelay: 20000, backoffMultiplier: 1.8, criticalErrorThreshold: 6 },
    hermes: { maxRetries: 2, baseDelay: 8000, maxDelay: 60000, backoffMultiplier: 3, criticalErrorThreshold: 2 },
    flipkart: { maxRetries: 4, baseDelay: 2000, maxDelay: 20000, backoffMultiplier: 2, criticalErrorThreshold: 7 },
    toysrus: { maxRetries: 3, baseDelay: 3000, maxDelay: 18000, backoffMultiplier: 2, criticalErrorThreshold: 5 },
    carters: { maxRetries: 3, baseDelay: 3000, maxDelay: 18000, backoffMultiplier: 2, criticalErrorThreshold: 5 },
    prada: { maxRetries: 2, baseDelay: 6000, maxDelay: 45000, backoffMultiplier: 2.8, criticalErrorThreshold: 3 },
    ysl: { maxRetries: 2, baseDelay: 6000, maxDelay: 45000, backoffMultiplier: 2.8, criticalErrorThreshold: 3 },
    balenciaga: { maxRetries: 2, baseDelay: 6000, maxDelay: 45000, backoffMultiplier: 2.8, criticalErrorThreshold: 3 },
    dior: { maxRetries: 2, baseDelay: 6000, maxDelay: 45000, backoffMultiplier: 2.8, criticalErrorThreshold: 3 },
    chanel: { maxRetries: 2, baseDelay: 8000, maxDelay: 60000, backoffMultiplier: 3, criticalErrorThreshold: 2 },
    aliexpress: { maxRetries: 6, baseDelay: 1000, maxDelay: 15000, backoffMultiplier: 1.5, criticalErrorThreshold: 12 },
    alibaba: { maxRetries: 5, baseDelay: 1500, maxDelay: 20000, backoffMultiplier: 1.8, criticalErrorThreshold: 10 },
    dhgate: { maxRetries: 5, baseDelay: 1500, maxDelay: 18000, backoffMultiplier: 1.8, criticalErrorThreshold: 10 },
    wish: { maxRetries: 6, baseDelay: 1000, maxDelay: 12000, backoffMultiplier: 1.5, criticalErrorThreshold: 15 },
    shein: { maxRetries: 4, baseDelay: 2000, maxDelay: 15000, backoffMultiplier: 2, criticalErrorThreshold: 8 },
    romwe: { maxRetries: 4, baseDelay: 2000, maxDelay: 15000, backoffMultiplier: 2, criticalErrorThreshold: 8 },
    nordstrom: { maxRetries: 3, baseDelay: 3000, maxDelay: 20000, backoffMultiplier: 2, criticalErrorThreshold: 5 },
    macys: { maxRetries: 3, baseDelay: 3000, maxDelay: 20000, backoffMultiplier: 2, criticalErrorThreshold: 5 },
    bloomingdales: { maxRetries: 3, baseDelay: 3000, maxDelay: 20000, backoffMultiplier: 2, criticalErrorThreshold: 5 },
    saks: { maxRetries: 2, baseDelay: 5000, maxDelay: 35000, backoffMultiplier: 2.5, criticalErrorThreshold: 3 },
    neimanmarcus: { maxRetries: 2, baseDelay: 5000, maxDelay: 35000, backoffMultiplier: 2.5, criticalErrorThreshold: 3 },
  };

  constructor() {
    this.initializeErrorPatterns();
    this.initializeStats();
    this.startCleanupTimer();
    logger.info('ScrapingErrorService initialized');
  }

  /**
   * Handle a scraping error
   */
  handleError(
    error: Error,
    platform: SupportedPlatform,
    url: string,
    context: Partial<ErrorContext> = {}
  ): ScrapingError {
    const errorId = this.generateErrorId();
    const errorType = this.classifyError(error);
    const severity = this.determineSeverity(errorType, platform);
    
    const scrapingError: ScrapingError = {
      id: errorId,
      timestamp: Date.now(),
      platform,
      url,
      errorType,
      errorCode: this.generateErrorCode(errorType, platform),
      message: error.message,
      stack: error.stack,
      context: {
        attempt: 1,
        duration: 0,
        ...context,
      },
      retryCount: 0,
      severity,
      resolved: false,
      recoveryStrategy: this.getRecoveryStrategy(errorType, platform),
    };

    // Store error
    this.errors.set(errorId, scrapingError);
    this.updateStats(scrapingError);

    // Log error based on severity
    this.logError(scrapingError);

    // Report to Sentry for critical errors
    if (severity === 'critical' || severity === 'high') {
      this.reportToSentry(scrapingError);
    }

    return scrapingError;
  }

  /**
   * Determine if error should be retried
   */
  shouldRetry(errorId: string): boolean {
    const error = this.errors.get(errorId);
    if (!error) return false;

    const config = this.PLATFORM_CONFIGS[error.platform];
    const strategy = error.recoveryStrategy;

    if (!strategy || strategy.type !== 'retry') return false;
    if (error.retryCount >= config.maxRetries) return false;
    if (error.severity === 'critical') return false;

    // Check for non-retryable error types
    const nonRetryableErrors = [
      ErrorType.NOT_FOUND,
      ErrorType.FORBIDDEN,
      ErrorType.AUTHENTICATION,
      ErrorType.VALIDATION_ERROR,
    ];

    return !nonRetryableErrors.includes(error.errorType);
  }

  /**
   * Get retry delay for an error
   */
  getRetryDelay(errorId: string): number {
    const error = this.errors.get(errorId);
    if (!error || !error.recoveryStrategy) return 0;

    const config = this.PLATFORM_CONFIGS[error.platform];
    const strategy = error.recoveryStrategy;
    
    let delay = config.baseDelay * Math.pow(strategy.backoffMultiplier, error.retryCount);
    delay = Math.min(delay, config.maxDelay);
    
    // Add jitter to prevent thundering herd
    delay += Math.random() * 1000;
    
    return Math.floor(delay);
  }

  /**
   * Mark error as retried
   */
  markRetried(errorId: string): void {
    const error = this.errors.get(errorId);
    if (error) {
      error.retryCount++;
      logger.debug(`Error ${errorId} retry count: ${error.retryCount}`);
    }
  }

  /**
   * Mark error as resolved
   */
  markResolved(errorId: string): void {
    const error = this.errors.get(errorId);
    if (error) {
      error.resolved = true;
      this.updateStats(error);
      logger.info(`Error ${errorId} marked as resolved`);
    }
  }

  /**
   * Get error by ID
   */
  getError(errorId: string): ScrapingError | undefined {
    return this.errors.get(errorId);
  }

  /**
   * Get errors by criteria
   */
  getErrors(filters: {
    platform?: SupportedPlatform;
    errorType?: ErrorType;
    severity?: ScrapingError['severity'];
    resolved?: boolean;
    limit?: number;
    since?: number;
  } = {}): ScrapingError[] {
    let filteredErrors = Array.from(this.errors.values());

    if (filters.platform) {
      filteredErrors = filteredErrors.filter(e => e.platform === filters.platform);
    }

    if (filters.errorType) {
      filteredErrors = filteredErrors.filter(e => e.errorType === filters.errorType);
    }

    if (filters.severity) {
      filteredErrors = filteredErrors.filter(e => e.severity === filters.severity);
    }

    if (filters.resolved !== undefined) {
      filteredErrors = filteredErrors.filter(e => e.resolved === filters.resolved);
    }

    if (filters.since) {
      filteredErrors = filteredErrors.filter(e => e.timestamp >= filters.since);
    }

    // Sort by timestamp (newest first)
    filteredErrors.sort((a, b) => b.timestamp - a.timestamp);

    if (filters.limit) {
      filteredErrors = filteredErrors.slice(0, filters.limit);
    }

    return filteredErrors;
  }

  /**
   * Get error statistics
   */
  getStats(): ErrorStats {
    return { ...this.stats };
  }

  /**
   * Get platform-specific error rates
   */
  getPlatformErrorRates(): Record<SupportedPlatform, number> {
    const rates: Partial<Record<SupportedPlatform, number>> = {};
    
    for (const [platform, errorCount] of Object.entries(this.stats.errorsByPlatform)) {
      // Calculate error rate as errors per hour (rough estimate)
      const hoursOfData = Math.max(1, (Date.now() - this.getOldestErrorTime()) / (60 * 60 * 1000));
      rates[platform as SupportedPlatform] = errorCount / hoursOfData;
    }
    
    return rates as Record<SupportedPlatform, number>;
  }

  /**
   * Check if platform has critical error rate
   */
  hasCriticalErrorRate(platform: SupportedPlatform): boolean {
    const config = this.PLATFORM_CONFIGS[platform];
    const recentErrors = this.getErrors({
      platform,
      since: Date.now() - 60 * 60 * 1000, // Last hour
    });
    
    return recentErrors.length >= config.criticalErrorThreshold;
  }

  /**
   * Get recovery suggestions for unresolved errors
   */
  getRecoverySuggestions(): Array<{
    errorId: string;
    platform: SupportedPlatform;
    suggestion: string;
    priority: number;
  }> {
    const suggestions: Array<{
      errorId: string;
      platform: SupportedPlatform;
      suggestion: string;
      priority: number;
    }> = [];

    const unresolvedErrors = this.getErrors({ resolved: false, limit: 100 });
    
    for (const error of unresolvedErrors) {
      let suggestion = '';
      let priority = 1;

      switch (error.errorType) {
        case ErrorType.RATE_LIMIT:
          suggestion = 'Implement longer delays between requests';
          priority = 2;
          break;
        case ErrorType.CAPTCHA:
          suggestion = 'Consider rotating user agents and IP addresses';
          priority = 3;
          break;
        case ErrorType.REGION_BLOCK:
          suggestion = 'Use proxy servers or VPN from allowed regions';
          priority = 3;
          break;
        case ErrorType.PLATFORM_CHANGE:
          suggestion = 'Update scraping selectors and patterns';
          priority = 4;
          break;
        case ErrorType.AUTHENTICATION:
          suggestion = 'Check API keys and authentication credentials';
          priority = 4;
          break;
        case ErrorType.SERVER_ERROR:
          suggestion = 'Monitor platform status and retry later';
          priority = 1;
          break;
      }

      if (suggestion) {
        suggestions.push({
          errorId: error.id,
          platform: error.platform,
          suggestion,
          priority,
        });
      }
    }

    return suggestions.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Private helper methods
   */
  private initializeErrorPatterns(): void {
    this.errorPatterns = [
      {
        pattern: /timeout|timed out/i,
        errorType: ErrorType.TIMEOUT,
        severity: 'medium',
        recoveryStrategy: {
          type: 'retry',
          attempts: 3,
          delay: 5000,
          maxDelay: 30000,
          backoffMultiplier: 2,
        },
      },
      {
        pattern: /rate.?limit|too many requests/i,
        errorType: ErrorType.RATE_LIMIT,
        severity: 'high',
        recoveryStrategy: {
          type: 'retry',
          attempts: 2,
          delay: 10000,
          maxDelay: 60000,
          backoffMultiplier: 3,
        },
      },
      {
        pattern: /captcha|challenge/i,
        errorType: ErrorType.CAPTCHA,
        severity: 'critical',
        recoveryStrategy: {
          type: 'manual',
          attempts: 0,
          delay: 0,
          maxDelay: 0,
          backoffMultiplier: 1,
        },
      },
      {
        pattern: /403|forbidden|access denied/i,
        errorType: ErrorType.FORBIDDEN,
        severity: 'high',
        recoveryStrategy: {
          type: 'skip',
          attempts: 0,
          delay: 0,
          maxDelay: 0,
          backoffMultiplier: 1,
        },
      },
      {
        pattern: /404|not found/i,
        errorType: ErrorType.NOT_FOUND,
        severity: 'low',
        recoveryStrategy: {
          type: 'skip',
          attempts: 0,
          delay: 0,
          maxDelay: 0,
          backoffMultiplier: 1,
        },
      },
      {
        pattern: /network|connection|dns/i,
        errorType: ErrorType.NETWORK_ERROR,
        severity: 'medium',
        recoveryStrategy: {
          type: 'retry',
          attempts: 4,
          delay: 2000,
          maxDelay: 20000,
          backoffMultiplier: 2,
        },
      },
    ];
  }

  private initializeStats(): void {
    this.stats = {
      totalErrors: 0,
      errorsByPlatform: {} as Record<SupportedPlatform, number>,
      errorsByType: {} as Record<ErrorType, number>,
      errorRate: 0,
      averageResolutionTime: 0,
      criticalErrors: 0,
      unresolvedErrors: 0,
    };
  }

  private classifyError(error: Error): ErrorType {
    const message = error.message.toLowerCase();
    
    for (const pattern of this.errorPatterns) {
      if (pattern.pattern.test(message)) {
        return pattern.errorType;
      }
    }

    // Check for HTTP status codes if available
    if (message.includes('500') || message.includes('502') || message.includes('503')) {
      return ErrorType.SERVER_ERROR;
    }

    if (message.includes('401')) {
      return ErrorType.AUTHENTICATION;
    }

    if (message.includes('429')) {
      return ErrorType.RATE_LIMIT;
    }

    return ErrorType.UNKNOWN;
  }

  private determineSeverity(errorType: ErrorType, platform: SupportedPlatform): ScrapingError['severity'] {
    const severityMap: Record<ErrorType, ScrapingError['severity']> = {
      [ErrorType.NETWORK_ERROR]: 'medium',
      [ErrorType.TIMEOUT]: 'medium',
      [ErrorType.RATE_LIMIT]: 'high',
      [ErrorType.AUTHENTICATION]: 'high',
      [ErrorType.FORBIDDEN]: 'high',
      [ErrorType.NOT_FOUND]: 'low',
      [ErrorType.INVALID_RESPONSE]: 'medium',
      [ErrorType.PARSING_ERROR]: 'medium',
      [ErrorType.VALIDATION_ERROR]: 'low',
      [ErrorType.PLATFORM_CHANGE]: 'critical',
      [ErrorType.REGION_BLOCK]: 'high',
      [ErrorType.CAPTCHA]: 'critical',
      [ErrorType.TEMPORARY_BLOCK]: 'high',
      [ErrorType.SERVER_ERROR]: 'medium',
      [ErrorType.UNKNOWN]: 'medium',
    };

    let severity = severityMap[errorType] || 'medium';
    
    // Upgrade severity for luxury platforms
    const luxuryPlatforms: SupportedPlatform[] = ['hermes', 'chanel', 'prada', 'dior', 'ysl', 'balenciaga'];
    if (luxuryPlatforms.includes(platform) && severity === 'medium') {
      severity = 'high';
    }

    return severity;
  }

  private getRecoveryStrategy(errorType: ErrorType, platform: SupportedPlatform): RecoveryStrategy {
    const config = this.PLATFORM_CONFIGS[platform];
    const pattern = this.errorPatterns.find(p => p.errorType === errorType);
    
    if (pattern) {
      return {
        ...pattern.recoveryStrategy,
        delay: config.baseDelay,
        maxDelay: config.maxDelay,
        backoffMultiplier: config.backoffMultiplier,
      };
    }

    // Default strategy
    return {
      type: 'retry',
      attempts: config.maxRetries,
      delay: config.baseDelay,
      maxDelay: config.maxDelay,
      backoffMultiplier: config.backoffMultiplier,
    };
  }

  private generateErrorId(): string {
    return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateErrorCode(errorType: ErrorType, platform: SupportedPlatform): string {
    const platformCode = platform.toUpperCase().slice(0, 3);
    const typeCode = errorType.toUpperCase().replace('_', '').slice(0, 4);
    return `${platformCode}_${typeCode}_${Date.now().toString().slice(-6)}`;
  }

  private updateStats(error: ScrapingError): void {
    this.stats.totalErrors++;
    
    // Update platform stats
    this.stats.errorsByPlatform[error.platform] = 
      (this.stats.errorsByPlatform[error.platform] || 0) + 1;
    
    // Update error type stats
    this.stats.errorsByType[error.errorType] = 
      (this.stats.errorsByType[error.errorType] || 0) + 1;
    
    // Update severity stats
    if (error.severity === 'critical') {
      this.stats.criticalErrors++;
    }
    
    if (!error.resolved) {
      this.stats.unresolvedErrors++;
    } else {
      this.stats.unresolvedErrors = Math.max(0, this.stats.unresolvedErrors - 1);
    }
    
    // Update error rate (errors per hour)
    const hoursOfData = Math.max(1, (Date.now() - this.getOldestErrorTime()) / (60 * 60 * 1000));
    this.stats.errorRate = this.stats.totalErrors / hoursOfData;
  }

  private getOldestErrorTime(): number {
    if (this.errors.size === 0) return Date.now();
    
    let oldest = Date.now();
    for (const error of this.errors.values()) {
      if (error.timestamp < oldest) {
        oldest = error.timestamp;
      }
    }
    return oldest;
  }

  private logError(error: ScrapingError): void {
    const context = {
      errorId: error.id,
      platform: error.platform,
      errorType: error.errorType,
      severity: error.severity,
      url: error.url.slice(0, 100), // Truncate long URLs
    };

    switch (error.severity) {
      case 'critical':
        logger.error(`Critical scraping error: ${error.message}`, context);
        break;
      case 'high':
        logger.error(`High severity scraping error: ${error.message}`, context);
        break;
      case 'medium':
        logger.warn(`Medium severity scraping error: ${error.message}`, context);
        break;
      case 'low':
        logger.info(`Low severity scraping error: ${error.message}`, context);
        break;
    }
  }

  private reportToSentry(error: ScrapingError): void {
    Sentry.captureException(new Error(error.message), {
      tags: {
        platform: error.platform,
        errorType: error.errorType,
        severity: error.severity,
      },
      extra: {
        errorId: error.id,
        url: error.url,
        context: error.context,
        recoveryStrategy: error.recoveryStrategy,
      },
      level: error.severity === 'critical' ? 'fatal' : 'error',
    });
  }

  private startCleanupTimer(): void {
    // Clean up old errors every hour
    this.cleanupInterval = setInterval(() => {
      this.cleanupOldErrors();
    }, 60 * 60 * 1000);
  }

  private cleanupOldErrors(): void {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000; // 24 hours
    let cleaned = 0;

    for (const [id, error] of this.errors.entries()) {
      if (error.timestamp < cutoff && (error.resolved || error.severity === 'low')) {
        this.errors.delete(id);
        cleaned++;
      }
    }

    // If we still have too many errors, remove oldest resolved ones
    if (this.errors.size > this.maxErrorHistory) {
      const sortedErrors = Array.from(this.errors.entries())
        .filter(([, error]) => error.resolved)
        .sort(([, a], [, b]) => a.timestamp - b.timestamp);
      
      const toRemove = this.errors.size - this.maxErrorHistory;
      for (let i = 0; i < toRemove && i < sortedErrors.length; i++) {
        this.errors.delete(sortedErrors[i][0]);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logger.info(`Cleaned up ${cleaned} old error records`);
    }
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    
    this.errors.clear();
    this.initializeStats();
    
    logger.info('ScrapingErrorService disposed');
  }
}

export default ScrapingErrorService;