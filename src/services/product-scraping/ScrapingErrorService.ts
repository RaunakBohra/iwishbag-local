/**
 * Scraping Error Service
 * Handles error classification, recovery strategies, and monitoring
 * Decomposed from BrightDataProductService for focused error management
 * 
 * RESPONSIBILITIES:
 * - Error classification and categorization
 * - Recovery strategy determination
 * - Retry logic with exponential backoff
 * - Error monitoring and alerting
 * - Fallback mechanism management
 * - Error rate tracking and analysis
 */

import { logger } from '@/utils/logger';

export interface ScrapingError {
  id: string;
  timestamp: number;
  url: string;
  platform: string;
  errorType: ErrorType;
  errorCode?: string;
  message: string;
  stack?: string;
  context?: any;
  retryCount: number;
  isRetryable: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
  recoveryStrategy?: RecoveryStrategy;
}

export enum ErrorType {
  NETWORK_ERROR = 'network_error',
  TIMEOUT_ERROR = 'timeout_error',
  PARSING_ERROR = 'parsing_error',
  CAPTCHA_ERROR = 'captcha_error',
  RATE_LIMIT_ERROR = 'rate_limit_error',
  BOT_DETECTION_ERROR = 'bot_detection_error',
  AUTHENTICATION_ERROR = 'authentication_error',
  NOT_FOUND_ERROR = 'not_found_error',
  BLOCKED_ERROR = 'blocked_error',
  SERVER_ERROR = 'server_error',
  UNKNOWN_ERROR = 'unknown_error'
}

export enum RecoveryStrategy {
  IMMEDIATE_RETRY = 'immediate_retry',
  EXPONENTIAL_BACKOFF = 'exponential_backoff',
  DELAY_RETRY = 'delay_retry',
  PROXY_ROTATION = 'proxy_rotation',
  USER_AGENT_ROTATION = 'user_agent_rotation',
  SESSION_RESET = 'session_reset',
  FALLBACK_SCRAPER = 'fallback_scraper',
  MANUAL_INTERVENTION = 'manual_intervention',
  NO_RETRY = 'no_retry'
}

export interface ErrorStats {
  totalErrors: number;
  errorsByType: Record<ErrorType, number>;
  errorsByPlatform: Record<string, number>;
  errorRate: number;
  retrySuccessRate: number;
  averageRetryCount: number;
  criticalErrorCount: number;
  lastErrorTime?: number;
}

export interface RecoveryResult {
  success: boolean;
  strategy: RecoveryStrategy;
  nextRetryDelay?: number;
  shouldRetry: boolean;
  fallbackOptions?: string[];
  additionalContext?: any;
}

export class ScrapingErrorService {
  private static instance: ScrapingErrorService;
  private errorHistory: ScrapingError[] = [];
  private errorStats: ErrorStats = {
    totalErrors: 0,
    errorsByType: {} as Record<ErrorType, number>,
    errorsByPlatform: {},
    errorRate: 0,
    retrySuccessRate: 0,
    averageRetryCount: 0,
    criticalErrorCount: 0
  };
  
  private readonly maxHistorySize = 1000;
  private readonly criticalErrorThreshold = 10; // per hour
  private alertCallbacks: Array<(error: ScrapingError) => void> = [];

  constructor() {
    this.initializeErrorStats();
    logger.info('ScrapingErrorService initialized');
  }

  static getInstance(): ScrapingErrorService {
    if (!ScrapingErrorService.instance) {
      ScrapingErrorService.instance = new ScrapingErrorService();
    }
    return ScrapingErrorService.instance;
  }

  /**
   * Process and classify error
   */
  processError(error: Error | any, url: string, platform: string, retryCount: number = 0): ScrapingError {
    const scrapingError: ScrapingError = {
      id: this.generateErrorId(),
      timestamp: Date.now(),
      url,
      platform,
      errorType: this.classifyError(error),
      errorCode: this.extractErrorCode(error),
      message: error.message || 'Unknown error',
      stack: error.stack,
      context: this.extractContext(error),
      retryCount,
      isRetryable: this.isRetryable(error),
      severity: this.determineSeverity(error, platform),
      recoveryStrategy: this.determineRecoveryStrategy(error, retryCount)
    };

    this.recordError(scrapingError);
    
    // Trigger alerts for critical errors
    if (scrapingError.severity === 'critical') {
      this.triggerAlert(scrapingError);
    }

    logger.warn(`Scraping error processed: ${scrapingError.errorType} for ${platform}`, {
      errorId: scrapingError.id,
      url,
      retryCount,
      recoveryStrategy: scrapingError.recoveryStrategy
    });

    return scrapingError;
  }

  /**
   * Determine recovery action for error
   */
  async determineRecovery(scrapingError: ScrapingError): Promise<RecoveryResult> {
    const strategy = scrapingError.recoveryStrategy || RecoveryStrategy.NO_RETRY;
    
    try {
      switch (strategy) {
        case RecoveryStrategy.IMMEDIATE_RETRY:
          return this.handleImmediateRetry(scrapingError);
          
        case RecoveryStrategy.EXPONENTIAL_BACKOFF:
          return this.handleExponentialBackoff(scrapingError);
          
        case RecoveryStrategy.DELAY_RETRY:
          return this.handleDelayRetry(scrapingError);
          
        case RecoveryStrategy.PROXY_ROTATION:
          return this.handleProxyRotation(scrapingError);
          
        case RecoveryStrategy.USER_AGENT_ROTATION:
          return this.handleUserAgentRotation(scrapingError);
          
        case RecoveryStrategy.SESSION_RESET:
          return this.handleSessionReset(scrapingError);
          
        case RecoveryStrategy.FALLBACK_SCRAPER:
          return this.handleFallbackScraper(scrapingError);
          
        case RecoveryStrategy.MANUAL_INTERVENTION:
          return this.handleManualIntervention(scrapingError);
          
        case RecoveryStrategy.NO_RETRY:
        default:
          return {
            success: false,
            strategy,
            shouldRetry: false
          };
      }
      
    } catch (recoveryError) {
      logger.error('Error during recovery strategy execution:', recoveryError);
      return {
        success: false,
        strategy,
        shouldRetry: false,
        additionalContext: { recoveryError: recoveryError.message }
      };
    }
  }

  /**
   * Error classification logic
   */
  private classifyError(error: any): ErrorType {
    const errorMessage = (error.message || '').toLowerCase();
    const errorCode = this.extractErrorCode(error);
    
    // Network-related errors
    if (errorMessage.includes('timeout') || errorCode === 'ETIMEDOUT') {
      return ErrorType.TIMEOUT_ERROR;
    }
    
    if (errorMessage.includes('network') || 
        errorMessage.includes('connection') || 
        errorCode === 'ECONNREFUSED' || 
        errorCode === 'ECONNRESET') {
      return ErrorType.NETWORK_ERROR;
    }
    
    // Rate limiting and blocking
    if (errorMessage.includes('rate limit') || 
        errorMessage.includes('too many requests') || 
        errorCode === '429') {
      return ErrorType.RATE_LIMIT_ERROR;
    }
    
    if (errorMessage.includes('captcha') || 
        errorMessage.includes('challenge') ||
        errorMessage.includes('verification required')) {
      return ErrorType.CAPTCHA_ERROR;
    }
    
    if (errorMessage.includes('bot detected') || 
        errorMessage.includes('suspicious activity') ||
        errorMessage.includes('access denied')) {
      return ErrorType.BOT_DETECTION_ERROR;
    }
    
    if (errorMessage.includes('blocked') || 
        errorMessage.includes('forbidden') || 
        errorCode === '403') {
      return ErrorType.BLOCKED_ERROR;
    }
    
    // Content-related errors
    if (errorMessage.includes('not found') || errorCode === '404') {
      return ErrorType.NOT_FOUND_ERROR;
    }
    
    if (errorMessage.includes('parse') || 
        errorMessage.includes('invalid html') ||
        errorMessage.includes('malformed')) {
      return ErrorType.PARSING_ERROR;
    }
    
    // Server errors
    if (errorCode && (errorCode.startsWith('5') || errorCode === '500' || errorCode === '502' || errorCode === '503')) {
      return ErrorType.SERVER_ERROR;
    }
    
    // Authentication errors
    if (errorMessage.includes('unauthorized') || 
        errorMessage.includes('authentication') || 
        errorCode === '401') {
      return ErrorType.AUTHENTICATION_ERROR;
    }
    
    return ErrorType.UNKNOWN_ERROR;
  }

  private extractErrorCode(error: any): string | undefined {
    return error.code || error.status || error.statusCode || error.response?.status;
  }

  private extractContext(error: any): any {
    return {
      url: error.config?.url,
      method: error.config?.method,
      headers: error.config?.headers,
      response: error.response ? {
        status: error.response.status,
        headers: error.response.headers,
        data: typeof error.response.data === 'string' ? error.response.data.substring(0, 500) : error.response.data
      } : undefined
    };
  }

  private isRetryable(error: any): boolean {
    const errorType = this.classifyError(error);
    
    const nonRetryableErrors = [
      ErrorType.NOT_FOUND_ERROR,
      ErrorType.AUTHENTICATION_ERROR,
      ErrorType.PARSING_ERROR
    ];
    
    return !nonRetryableErrors.includes(errorType);
  }

  private determineSeverity(error: any, platform: string): 'low' | 'medium' | 'high' | 'critical' {
    const errorType = this.classifyError(error);
    
    // Critical errors that need immediate attention
    if (errorType === ErrorType.BLOCKED_ERROR || 
        errorType === ErrorType.BOT_DETECTION_ERROR) {
      return 'critical';
    }
    
    // High severity errors
    if (errorType === ErrorType.CAPTCHA_ERROR || 
        errorType === ErrorType.AUTHENTICATION_ERROR) {
      return 'high';
    }
    
    // Medium severity errors
    if (errorType === ErrorType.RATE_LIMIT_ERROR || 
        errorType === ErrorType.SERVER_ERROR) {
      return 'medium';
    }
    
    // Low severity errors
    return 'low';
  }

  private determineRecoveryStrategy(error: any, retryCount: number): RecoveryStrategy {
    const errorType = this.classifyError(error);
    
    // No retry for non-retryable errors
    if (!this.isRetryable(error)) {
      return RecoveryStrategy.NO_RETRY;
    }
    
    // Strategy based on error type and retry count
    switch (errorType) {
      case ErrorType.TIMEOUT_ERROR:
      case ErrorType.NETWORK_ERROR:
        return retryCount < 2 ? RecoveryStrategy.IMMEDIATE_RETRY : RecoveryStrategy.EXPONENTIAL_BACKOFF;
        
      case ErrorType.RATE_LIMIT_ERROR:
        return RecoveryStrategy.EXPONENTIAL_BACKOFF;
        
      case ErrorType.CAPTCHA_ERROR:
      case ErrorType.BOT_DETECTION_ERROR:
        return retryCount < 1 ? RecoveryStrategy.PROXY_ROTATION : RecoveryStrategy.MANUAL_INTERVENTION;
        
      case ErrorType.BLOCKED_ERROR:
        return RecoveryStrategy.SESSION_RESET;
        
      case ErrorType.SERVER_ERROR:
        return retryCount < 3 ? RecoveryStrategy.DELAY_RETRY : RecoveryStrategy.NO_RETRY;
        
      default:
        return retryCount < 2 ? RecoveryStrategy.EXPONENTIAL_BACKOFF : RecoveryStrategy.NO_RETRY;
    }
  }

  /**
   * Recovery strategy implementations
   */
  private async handleImmediateRetry(error: ScrapingError): Promise<RecoveryResult> {
    return {
      success: true,
      strategy: RecoveryStrategy.IMMEDIATE_RETRY,
      nextRetryDelay: 0,
      shouldRetry: error.retryCount < 3
    };
  }

  private async handleExponentialBackoff(error: ScrapingError): Promise<RecoveryResult> {
    const baseDelay = 1000; // 1 second
    const maxDelay = 60000; // 1 minute
    const backoffMultiplier = 2;
    
    const delay = Math.min(
      baseDelay * Math.pow(backoffMultiplier, error.retryCount),
      maxDelay
    );
    
    // Add jitter to prevent thundering herd
    const jitter = Math.random() * 0.1 * delay;
    const finalDelay = Math.floor(delay + jitter);
    
    return {
      success: true,
      strategy: RecoveryStrategy.EXPONENTIAL_BACKOFF,
      nextRetryDelay: finalDelay,
      shouldRetry: error.retryCount < 5
    };
  }

  private async handleDelayRetry(error: ScrapingError): Promise<RecoveryResult> {
    const delays = [5000, 15000, 30000, 60000]; // 5s, 15s, 30s, 1m
    const delay = delays[Math.min(error.retryCount, delays.length - 1)];
    
    return {
      success: true,
      strategy: RecoveryStrategy.DELAY_RETRY,
      nextRetryDelay: delay,
      shouldRetry: error.retryCount < 4
    };
  }

  private async handleProxyRotation(error: ScrapingError): Promise<RecoveryResult> {
    return {
      success: true,
      strategy: RecoveryStrategy.PROXY_ROTATION,
      nextRetryDelay: 2000,
      shouldRetry: error.retryCount < 3,
      additionalContext: {
        action: 'rotate_proxy',
        recommendation: 'Use different proxy server for next request'
      }
    };
  }

  private async handleUserAgentRotation(error: ScrapingError): Promise<RecoveryResult> {
    return {
      success: true,
      strategy: RecoveryStrategy.USER_AGENT_ROTATION,
      nextRetryDelay: 1000,
      shouldRetry: error.retryCount < 2,
      additionalContext: {
        action: 'rotate_user_agent',
        recommendation: 'Use different user agent for next request'
      }
    };
  }

  private async handleSessionReset(error: ScrapingError): Promise<RecoveryResult> {
    return {
      success: true,
      strategy: RecoveryStrategy.SESSION_RESET,
      nextRetryDelay: 5000,
      shouldRetry: error.retryCount < 2,
      additionalContext: {
        action: 'reset_session',
        recommendation: 'Clear cookies and session data'
      }
    };
  }

  private async handleFallbackScraper(error: ScrapingError): Promise<RecoveryResult> {
    const fallbackOptions = this.getFallbackOptions(error.platform);
    
    return {
      success: fallbackOptions.length > 0,
      strategy: RecoveryStrategy.FALLBACK_SCRAPER,
      nextRetryDelay: 0,
      shouldRetry: fallbackOptions.length > 0,
      fallbackOptions,
      additionalContext: {
        action: 'use_fallback_scraper',
        availableFallbacks: fallbackOptions
      }
    };
  }

  private async handleManualIntervention(error: ScrapingError): Promise<RecoveryResult> {
    return {
      success: false,
      strategy: RecoveryStrategy.MANUAL_INTERVENTION,
      shouldRetry: false,
      additionalContext: {
        action: 'manual_intervention_required',
        recommendation: 'This error requires manual investigation and resolution',
        errorDetails: {
          type: error.errorType,
          message: error.message,
          platform: error.platform,
          url: error.url
        }
      }
    };
  }

  /**
   * Helper methods
   */
  private getFallbackOptions(platform: string): string[] {
    const fallbackMap: Record<string, string[]> = {
      'amazon': ['markdown_scraper', 'api_fallback'],
      'ebay': ['markdown_scraper'],
      'walmart': ['markdown_scraper'],
      'bestbuy': ['markdown_scraper'],
      'default': ['markdown_scraper']
    };
    
    return fallbackMap[platform] || fallbackMap['default'];
  }

  private recordError(error: ScrapingError): void {
    // Add to history
    this.errorHistory.push(error);
    
    // Maintain history size limit
    if (this.errorHistory.length > this.maxHistorySize) {
      this.errorHistory.shift();
    }
    
    // Update statistics
    this.updateErrorStats(error);
  }

  private updateErrorStats(error: ScrapingError): void {
    this.errorStats.totalErrors++;
    this.errorStats.lastErrorTime = error.timestamp;
    
    // Update error counts by type
    this.errorStats.errorsByType[error.errorType] = 
      (this.errorStats.errorsByType[error.errorType] || 0) + 1;
    
    // Update error counts by platform
    this.errorStats.errorsByPlatform[error.platform] = 
      (this.errorStats.errorsByPlatform[error.platform] || 0) + 1;
    
    // Update critical error count
    if (error.severity === 'critical') {
      this.errorStats.criticalErrorCount++;
    }
    
    // Calculate error rate (errors per hour in last 24 hours)
    const last24Hours = Date.now() - (24 * 60 * 60 * 1000);
    const recentErrors = this.errorHistory.filter(e => e.timestamp > last24Hours);
    this.errorStats.errorRate = recentErrors.length / 24;
    
    // Calculate retry success rate
    const retriedErrors = this.errorHistory.filter(e => e.retryCount > 0);
    if (retriedErrors.length > 0) {
      this.errorStats.retrySuccessRate = 
        retriedErrors.filter(e => e.retryCount <= 3).length / retriedErrors.length;
    }
    
    // Calculate average retry count
    if (this.errorStats.totalErrors > 0) {
      this.errorStats.averageRetryCount = 
        this.errorHistory.reduce((sum, e) => sum + e.retryCount, 0) / this.errorStats.totalErrors;
    }
  }

  private initializeErrorStats(): void {
    // Initialize error type counts
    Object.values(ErrorType).forEach(type => {
      this.errorStats.errorsByType[type] = 0;
    });
  }

  private generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private triggerAlert(error: ScrapingError): void {
    this.alertCallbacks.forEach(callback => {
      try {
        callback(error);
      } catch (callbackError) {
        logger.error('Error in alert callback:', callbackError);
      }
    });
  }

  /**
   * Public API methods
   */
  getErrorStats(): ErrorStats {
    return { ...this.errorStats };
  }

  getErrorHistory(limit?: number): ScrapingError[] {
    if (limit) {
      return this.errorHistory.slice(-limit);
    }
    return [...this.errorHistory];
  }

  getErrorsByPlatform(platform: string): ScrapingError[] {
    return this.errorHistory.filter(error => error.platform === platform);
  }

  getErrorsByType(errorType: ErrorType): ScrapingError[] {
    return this.errorHistory.filter(error => error.errorType === errorType);
  }

  getCriticalErrors(hoursBack: number = 1): ScrapingError[] {
    const cutoffTime = Date.now() - (hoursBack * 60 * 60 * 1000);
    return this.errorHistory.filter(error => 
      error.severity === 'critical' && error.timestamp > cutoffTime
    );
  }

  addAlertCallback(callback: (error: ScrapingError) => void): void {
    this.alertCallbacks.push(callback);
  }

  removeAlertCallback(callback: (error: ScrapingError) => void): void {
    const index = this.alertCallbacks.indexOf(callback);
    if (index > -1) {
      this.alertCallbacks.splice(index, 1);
    }
  }

  clearErrorHistory(): void {
    this.errorHistory = [];
    this.initializeErrorStats();
    logger.info('Error history cleared');
  }

  /**
   * Health check and monitoring
   */
  getHealthStatus(): { status: 'healthy' | 'degraded' | 'critical'; details: any } {
    const recentCriticalErrors = this.getCriticalErrors(1);
    const errorRate = this.errorStats.errorRate;
    
    let status: 'healthy' | 'degraded' | 'critical' = 'healthy';
    
    if (recentCriticalErrors.length >= this.criticalErrorThreshold) {
      status = 'critical';
    } else if (errorRate > 10 || recentCriticalErrors.length > 5) {
      status = 'degraded';
    }
    
    return {
      status,
      details: {
        errorRate,
        criticalErrorsLastHour: recentCriticalErrors.length,
        totalErrors: this.errorStats.totalErrors,
        retrySuccessRate: this.errorStats.retrySuccessRate,
        mostCommonErrors: this.getMostCommonErrors(),
        problemPlatforms: this.getProblemPlatforms()
      }
    };
  }

  private getMostCommonErrors(): Array<{ type: ErrorType; count: number }> {
    return Object.entries(this.errorStats.errorsByType)
      .map(([type, count]) => ({ type: type as ErrorType, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }

  private getProblemPlatforms(): Array<{ platform: string; count: number }> {
    return Object.entries(this.errorStats.errorsByPlatform)
      .map(([platform, count]) => ({ platform, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }

  /**
   * Cleanup and disposal
   */
  dispose(): void {
    this.errorHistory = [];
    this.alertCallbacks = [];
    this.initializeErrorStats();
    logger.info('ScrapingErrorService disposed');
  }
}

export default ScrapingErrorService;