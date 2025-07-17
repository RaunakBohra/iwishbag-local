/**
 * Production-safe logging utility
 * Conditionally logs based on environment
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  data?: Record<string, unknown>;
  timestamp: string;
  context?: string;
}

class Logger {
  private isDevelopment = import.meta.env.DEV;
  private isProduction = import.meta.env.PROD;

  private formatMessage(level: LogLevel, message: string, context?: string): string {
    const timestamp = new Date().toISOString();
    const contextStr = context ? `[${context}]` : '';
    return `${timestamp} ${level.toUpperCase()}${contextStr}: ${message}`;
  }

  private shouldLog(level: LogLevel): boolean {
    if (this.isDevelopment) {
      return true; // Log everything in development
    }

    if (this.isProduction) {
      // Only log warnings and errors in production
      return level === 'warn' || level === 'error';
    }

    return true; // Default to logging
  }

  debug(message: string, data?: Record<string, unknown>, context?: string): void {
    if (this.shouldLog('debug')) {
      console.log(this.formatMessage('debug', message, context), data ? data : '');
    }
  }

  info(message: string, data?: Record<string, unknown>, context?: string): void {
    if (this.shouldLog('info')) {
      console.info(this.formatMessage('info', message, context), data ? data : '');
    }
  }

  warn(message: string, data?: Record<string, unknown>, context?: string): void {
    if (this.shouldLog('warn')) {
      console.warn(this.formatMessage('warn', message, context), data ? data : '');
    }
  }

  error(message: string, error?: unknown, context?: string): void {
    if (this.shouldLog('error')) {
      console.error(this.formatMessage('error', message, context), error ? error : '');
    }
  }

  // Specialized logging methods
  currency(message: string, data?: Record<string, unknown>): void {
    this.debug(message, data, 'Currency');
  }

  cart(message: string, data?: Record<string, unknown>): void {
    this.debug(message, data, 'Cart');
  }

  auth(message: string, data?: Record<string, unknown>): void {
    this.debug(message, data, 'Auth');
  }

  payment(message: string, data?: Record<string, unknown>): void {
    this.debug(message, data, 'Payment');
  }
}

// Export singleton instance
export const logger = new Logger();

// Export for backwards compatibility
export default logger;
