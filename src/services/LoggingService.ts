/**
 * Enhanced Logging Service for iwishBag
 * Provides structured, contextual logging with proper levels and formatting
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  CRITICAL = 4
}

export enum LogCategory {
  QUOTE_CALCULATION = 'quote.calculation',
  PAYMENT_PROCESSING = 'payment.processing',
  USER_AUTHENTICATION = 'user.auth',
  DATABASE_OPERATION = 'database.operation',
  API_REQUEST = 'api.request',
  SYSTEM_HEALTH = 'system.health',
  BUSINESS_METRICS = 'business.metrics',
  SECURITY_EVENT = 'security.event',
  PERFORMANCE = 'performance',
  CACHE_OPERATION = 'cache.operation'
}

interface LogContext {
  userId?: string;
  sessionId?: string;
  quoteId?: string;
  paymentId?: string;
  orderId?: string;
  requestId?: string;
  correlationId?: string;
  originCountry?: string;
  destinationCountry?: string;
  currency?: string;
  errorCode?: string;
  duration?: number;
  metadata?: Record<string, unknown>;
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  category: LogCategory;
  message: string;
  context: LogContext;
  error?: Error;
  stackTrace?: string;
  environment: string;
  version: string;
  service: string;
  functionName?: string;
  fileName?: string;
  lineNumber?: number;
}

interface LoggingConfig {
  minLevel: LogLevel;
  enableConsole: boolean;
  enableRemote: boolean;
  enableLocalStorage: boolean;
  maxLocalStorageLogs: number;
  remoteEndpoint?: string;
  batchSize: number;
  flushInterval: number;
  enableStackTrace: boolean;
  enablePerformanceMetrics: boolean;
  sensitiveFields: string[];
}

export class LoggingService {
  private static instance: LoggingService;
  private config: LoggingConfig;
  private logBuffer: LogEntry[] = [];
  private flushTimer?: NodeJS.Timeout;
  private requestIdMap = new Map<string, string>();
  private performanceMarks = new Map<string, number>();

  private constructor() {
    this.config = {
      minLevel: import.meta.env.DEV ? LogLevel.DEBUG : LogLevel.INFO,
      enableConsole: true,
      enableRemote: !import.meta.env.DEV,
      enableLocalStorage: true,
      maxLocalStorageLogs: 1000,
      batchSize: 50,
      flushInterval: 5000, // 5 seconds
      enableStackTrace: import.meta.env.DEV,
      enablePerformanceMetrics: true,
      sensitiveFields: ['password', 'token', 'secret', 'apiKey', 'creditCard', 'cvv', 'ssn']
    };

    // Start flush timer
    this.startFlushTimer();

    // Handle page unload
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => this.flush());
    }
  }

  static getInstance(): LoggingService {
    if (!LoggingService.instance) {
      LoggingService.instance = new LoggingService();
    }
    return LoggingService.instance;
  }

  /**
   * Update logging configuration
   */
  updateConfig(config: Partial<LoggingConfig>): void {
    this.config = { ...this.config, ...config };
    
    // Restart flush timer if interval changed
    if (config.flushInterval) {
      this.stopFlushTimer();
      this.startFlushTimer();
    }
  }

  /**
   * Core logging method
   */
  private log(
    level: LogLevel,
    category: LogCategory,
    message: string,
    context: LogContext = {},
    error?: Error
  ): void {
    // Check if we should log based on level
    if (level < this.config.minLevel) return;

    // Create log entry
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      category,
      message,
      context: this.sanitizeContext(context),
      environment: import.meta.env.MODE || 'production',
      version: import.meta.env.VITE_APP_VERSION || '1.0.0',
      service: 'iwishbag-frontend',
      error: error ? this.sanitizeError(error) : undefined,
      stackTrace: error && this.config.enableStackTrace ? error.stack : undefined
    };

    // Add caller information in development
    if (import.meta.env.DEV) {
      const callerInfo = this.getCallerInfo();
      entry.functionName = callerInfo.functionName;
      entry.fileName = callerInfo.fileName;
      entry.lineNumber = callerInfo.lineNumber;
    }

    // Process the log entry
    this.processLogEntry(entry);
  }

  /**
   * Debug level logging
   */
  debug(category: LogCategory, message: string, context?: LogContext): void {
    this.log(LogLevel.DEBUG, category, message, context);
  }

  /**
   * Info level logging
   */
  info(category: LogCategory, message: string, context?: LogContext): void {
    this.log(LogLevel.INFO, category, message, context);
  }

  /**
   * Warning level logging
   */
  warn(category: LogCategory, message: string, context?: LogContext): void {
    this.log(LogLevel.WARN, category, message, context);
  }

  /**
   * Error level logging
   */
  error(category: LogCategory, message: string, error?: Error, context?: LogContext): void {
    this.log(LogLevel.ERROR, category, message, context, error);
  }

  /**
   * Critical level logging
   */
  critical(category: LogCategory, message: string, error?: Error, context?: LogContext): void {
    this.log(LogLevel.CRITICAL, category, message, context, error);
  }

  /**
   * Log API request
   */
  logApiRequest(
    method: string,
    url: string,
    context: LogContext,
    requestData?: unknown
  ): string {
    const requestId = this.generateRequestId();
    const sanitizedData = this.sanitizeData(requestData);
    
    this.info(LogCategory.API_REQUEST, `${method} ${url}`, {
      ...context,
      requestId,
      metadata: {
        method,
        url,
        requestData: sanitizedData
      }
    });

    return requestId;
  }

  /**
   * Log API response
   */
  logApiResponse(
    requestId: string,
    status: number,
    duration: number,
    context: LogContext,
    responseData?: unknown
  ): void {
    const sanitizedData = this.sanitizeData(responseData);
    const level = status >= 400 ? LogLevel.ERROR : LogLevel.INFO;
    
    this.log(level, LogCategory.API_REQUEST, `Response ${status}`, {
      ...context,
      requestId,
      duration,
      metadata: {
        status,
        responseData: sanitizedData
      }
    });
  }

  /**
   * Start performance measurement
   */
  startPerformance(markName: string): void {
    if (this.config.enablePerformanceMetrics) {
      this.performanceMarks.set(markName, performance.now());
    }
  }

  /**
   * End performance measurement and log
   */
  endPerformance(markName: string, category: LogCategory, context?: LogContext): void {
    if (!this.config.enablePerformanceMetrics) return;

    const startTime = this.performanceMarks.get(markName);
    if (startTime) {
      const duration = performance.now() - startTime;
      this.performanceMarks.delete(markName);

      this.info(category, `Performance: ${markName}`, {
        ...context,
        duration,
        metadata: {
          performanceMark: markName
        }
      });
    }
  }

  /**
   * Create a child logger with preset context
   */
  createChildLogger(defaultContext: LogContext): ChildLogger {
    return new ChildLogger(this, defaultContext);
  }

  /**
   * Process and route log entry
   */
  private processLogEntry(entry: LogEntry): void {
    // Console logging
    if (this.config.enableConsole) {
      this.logToConsole(entry);
    }

    // Local storage logging
    if (this.config.enableLocalStorage) {
      this.logToLocalStorage(entry);
    }

    // Remote logging (buffered)
    if (this.config.enableRemote) {
      this.logBuffer.push(entry);
      
      // Flush if buffer is full
      if (this.logBuffer.length >= this.config.batchSize) {
        this.flush();
      }
    }
  }

  /**
   * Log to console with formatting
   */
  private logToConsole(entry: LogEntry): void {
    const levelColors = {
      [LogLevel.DEBUG]: 'color: gray',
      [LogLevel.INFO]: 'color: blue',
      [LogLevel.WARN]: 'color: orange',
      [LogLevel.ERROR]: 'color: red',
      [LogLevel.CRITICAL]: 'color: red; font-weight: bold'
    };

    const levelNames = {
      [LogLevel.DEBUG]: 'DEBUG',
      [LogLevel.INFO]: 'INFO',
      [LogLevel.WARN]: 'WARN',
      [LogLevel.ERROR]: 'ERROR',
      [LogLevel.CRITICAL]: 'CRITICAL'
    };

    const prefix = `[${entry.timestamp}] [${levelNames[entry.level]}] [${entry.category}]`;
    const style = levelColors[entry.level];

    // Use appropriate console method
    const consoleMethod = entry.level >= LogLevel.ERROR ? console.error :
                         entry.level >= LogLevel.WARN ? console.warn :
                         entry.level === LogLevel.DEBUG ? console.debug :
                         console.log;

    // Log with style
    consoleMethod(
      `%c${prefix}%c ${entry.message}`,
      style,
      'color: inherit',
      entry.context,
      entry.error
    );

    // Log stack trace if available
    if (entry.stackTrace && this.config.enableStackTrace) {
      console.error(entry.stackTrace);
    }
  }

  /**
   * Log to local storage
   */
  private logToLocalStorage(entry: LogEntry): void {
    try {
      const storageKey = 'iwishbag_logs';
      const existingLogs = JSON.parse(localStorage.getItem(storageKey) || '[]');
      
      // Add new entry
      existingLogs.push(entry);
      
      // Trim to max size
      if (existingLogs.length > this.config.maxLocalStorageLogs) {
        existingLogs.splice(0, existingLogs.length - this.config.maxLocalStorageLogs);
      }
      
      localStorage.setItem(storageKey, JSON.stringify(existingLogs));
    } catch (error) {
      // Silently fail - don't want logging to break the app
      console.error('Failed to write to localStorage:', error);
    }
  }

  /**
   * Flush logs to remote endpoint
   */
  private async flush(): Promise<void> {
    if (this.logBuffer.length === 0 || !this.config.remoteEndpoint) return;

    const logsToSend = [...this.logBuffer];
    this.logBuffer = [];

    try {
      await fetch(this.config.remoteEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          logs: logsToSend,
          timestamp: new Date().toISOString()
        })
      });
    } catch (error) {
      // Re-add logs to buffer on failure
      this.logBuffer = [...logsToSend, ...this.logBuffer];
      console.error('Failed to send logs to remote:', error);
    }
  }

  /**
   * Start flush timer
   */
  private startFlushTimer(): void {
    this.flushTimer = setInterval(() => this.flush(), this.config.flushInterval);
  }

  /**
   * Stop flush timer
   */
  private stopFlushTimer(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = undefined;
    }
  }

  /**
   * Sanitize context to remove sensitive data
   */
  private sanitizeContext(context: LogContext): LogContext {
    const sanitized = { ...context };
    
    if (sanitized.metadata) {
      sanitized.metadata = this.sanitizeData(sanitized.metadata) as Record<string, unknown>;
    }
    
    return sanitized;
  }

  /**
   * Sanitize any data object
   */
  private sanitizeData(data: unknown): unknown {
    if (!data) return data;
    
    if (typeof data === 'string') {
      // Mask potential sensitive strings
      return this.maskSensitiveString(data);
    }
    
    if (Array.isArray(data)) {
      return data.map(item => this.sanitizeData(item));
    }
    
    if (typeof data === 'object') {
      const sanitized: Record<string, unknown> = {};
      
      for (const [key, value] of Object.entries(data)) {
        // Check if key is sensitive
        if (this.isSensitiveField(key)) {
          sanitized[key] = '[REDACTED]';
        } else {
          sanitized[key] = this.sanitizeData(value);
        }
      }
      
      return sanitized;
    }
    
    return data;
  }

  /**
   * Check if field name is sensitive
   */
  private isSensitiveField(fieldName: string): boolean {
    const lowerField = fieldName.toLowerCase();
    return this.config.sensitiveFields.some(sensitive => 
      lowerField.includes(sensitive.toLowerCase())
    );
  }

  /**
   * Mask sensitive strings
   */
  private maskSensitiveString(str: string): string {
    // Mask credit card numbers
    str = str.replace(/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, '[CARD]');
    
    // Mask email addresses (partial)
    str = str.replace(/([a-zA-Z0-9._%+-]+)@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g, 
      (match, user, domain) => `${user.substring(0, 3)}...@${domain}`);
    
    return str;
  }

  /**
   * Sanitize error objects
   */
  private sanitizeError(error: Error): Error {
    return {
      name: error.name,
      message: this.maskSensitiveString(error.message),
      stack: error.stack
    } as Error;
  }

  /**
   * Get caller information
   */
  private getCallerInfo(): { functionName?: string; fileName?: string; lineNumber?: number } {
    try {
      const stack = new Error().stack;
      if (!stack) return {};
      
      const lines = stack.split('\n');
      // Skip first 3 lines (Error, getCallerInfo, log method)
      const callerLine = lines[4];
      
      if (!callerLine) return {};
      
      // Parse the caller line
      const match = callerLine.match(/at\s+(\S+)\s+\((.+):(\d+):\d+\)/);
      if (match) {
        return {
          functionName: match[1],
          fileName: match[2].split('/').pop(),
          lineNumber: parseInt(match[3])
        };
      }
    } catch {
      // Ignore errors in getting caller info
    }
    
    return {};
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get logs from local storage
   */
  getStoredLogs(filter?: {
    level?: LogLevel;
    category?: LogCategory;
    startTime?: Date;
    endTime?: Date;
    limit?: number;
  }): LogEntry[] {
    try {
      const storageKey = 'iwishbag_logs';
      const logs: LogEntry[] = JSON.parse(localStorage.getItem(storageKey) || '[]');
      
      let filtered = logs;
      
      if (filter) {
        filtered = logs.filter(log => {
          if (filter.level !== undefined && log.level < filter.level) return false;
          if (filter.category && log.category !== filter.category) return false;
          if (filter.startTime && new Date(log.timestamp) < filter.startTime) return false;
          if (filter.endTime && new Date(log.timestamp) > filter.endTime) return false;
          return true;
        });
        
        if (filter.limit) {
          filtered = filtered.slice(-filter.limit);
        }
      }
      
      return filtered;
    } catch (error) {
      console.error('Failed to read logs from localStorage:', error);
      return [];
    }
  }

  /**
   * Clear stored logs
   */
  clearStoredLogs(): void {
    try {
      localStorage.removeItem('iwishbag_logs');
    } catch (error) {
      console.error('Failed to clear logs from localStorage:', error);
    }
  }

  /**
   * Export logs as JSON
   */
  exportLogs(filter?: Parameters<typeof this.getStoredLogs>[0]): string {
    const logs = this.getStoredLogs(filter);
    return JSON.stringify(logs, null, 2);
  }

  /**
   * Download logs as file
   */
  downloadLogs(filename: string = 'iwishbag-logs.json', filter?: Parameters<typeof this.getStoredLogs>[0]): void {
    const data = this.exportLogs(filter);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

/**
 * Child logger with preset context
 */
export class ChildLogger {
  constructor(
    private parent: LoggingService,
    private defaultContext: LogContext
  ) {}

  private mergeContext(context?: LogContext): LogContext {
    return { ...this.defaultContext, ...context };
  }

  debug(category: LogCategory, message: string, context?: LogContext): void {
    this.parent.debug(category, message, this.mergeContext(context));
  }

  info(category: LogCategory, message: string, context?: LogContext): void {
    this.parent.info(category, message, this.mergeContext(context));
  }

  warn(category: LogCategory, message: string, context?: LogContext): void {
    this.parent.warn(category, message, this.mergeContext(context));
  }

  error(category: LogCategory, message: string, error?: Error, context?: LogContext): void {
    this.parent.error(category, message, error, this.mergeContext(context));
  }

  critical(category: LogCategory, message: string, error?: Error, context?: LogContext): void {
    this.parent.critical(category, message, error, this.mergeContext(context));
  }
}

// Export singleton instance
export const logger = LoggingService.getInstance();

// Export convenience functions
export const logDebug = (category: LogCategory, message: string, context?: LogContext) => 
  logger.debug(category, message, context);

export const logInfo = (category: LogCategory, message: string, context?: LogContext) => 
  logger.info(category, message, context);

export const logWarn = (category: LogCategory, message: string, context?: LogContext) => 
  logger.warn(category, message, context);

export const logError = (category: LogCategory, message: string, error?: Error, context?: LogContext) => 
  logger.error(category, message, error, context);

export const logCritical = (category: LogCategory, message: string, error?: Error, context?: LogContext) => 
  logger.critical(category, message, error, context);

// Export performance logging helpers
export const logPerformanceStart = (markName: string) => 
  logger.startPerformance(markName);

export const logPerformanceEnd = (markName: string, category: LogCategory, context?: LogContext) => 
  logger.endPerformance(markName, category, context);