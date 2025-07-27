/**
 * Production-safe logging utility
 * 
 * Automatically filters logs based on environment:
 * - Development: All logs shown
 * - Production: Only errors and critical info
 * 
 * Usage:
 * import { logger } from '@/utils/logger';
 * logger.debug('Debug info');
 * logger.info('General info');
 * logger.warn('Warning message');
 * logger.error('Error message');
 */

const isDevelopment = import.meta.env.DEV || 
                     import.meta.env.MODE === 'development' || 
                     process.env.NODE_ENV === 'development';

const isProduction = import.meta.env.PROD || 
                    import.meta.env.MODE === 'production' || 
                    process.env.NODE_ENV === 'production';

// Color codes for better development experience
const colors = {
  debug: '\x1b[36m', // Cyan
  info: '\x1b[34m',  // Blue
  warn: '\x1b[33m',  // Yellow
  error: '\x1b[31m', // Red
  reset: '\x1b[0m'   // Reset
};

export const logger = {
  /**
   * Debug logs - only in development
   * Use for detailed debugging information
   */
  debug: (...args: any[]) => {
    if (isDevelopment) {
      console.log(`${colors.debug}[DEBUG]${colors.reset}`, ...args);
    }
  },

  /**
   * Info logs - development + important production info
   * Use for general application flow information
   */
  info: (...args: any[]) => {
    if (isDevelopment) {
      console.info(`${colors.info}[INFO]${colors.reset}`, ...args);
    } else if (isProduction) {
      // In production, only log critical info without colors
      console.info('[INFO]', ...args);
    }
  },

  /**
   * Warning logs - always shown
   * Use for non-critical issues that should be investigated
   */
  warn: (...args: any[]) => {
    if (isDevelopment) {
      console.warn(`${colors.warn}[WARN]${colors.reset}`, ...args);
    } else {
      console.warn('[WARN]', ...args);
    }
  },

  /**
   * Error logs - always shown
   * Use for errors that need immediate attention
   */
  error: (...args: any[]) => {
    if (isDevelopment) {
      console.error(`${colors.error}[ERROR]${colors.reset}`, ...args);
    } else {
      console.error('[ERROR]', ...args);
      // TODO: In production, also send to error tracking service (Sentry)
    }
  },

  /**
   * Performance logs - only in development
   * Use for timing and performance debugging
   */
  perf: (label: string, ...args: any[]) => {
    if (isDevelopment) {
      console.log(`${colors.debug}[PERF] ${label}${colors.reset}`, ...args);
    }
  },

  /**
   * API logs - only in development
   * Use for API request/response debugging
   */
  api: (method: string, url: string, ...args: any[]) => {
    if (isDevelopment) {
      console.log(`${colors.info}[API] ${method} ${url}${colors.reset}`, ...args);
    }
  },

  /**
   * Database logs - only in development
   * Use for database query debugging
   */
  db: (...args: any[]) => {
    if (isDevelopment) {
      console.log(`${colors.debug}[DB]${colors.reset}`, ...args);
    }
  },

  /**
   * Security logs - always shown in production
   * Use for security-related events
   */
  security: (...args: any[]) => {
    if (isDevelopment) {
      console.warn(`${colors.warn}[SECURITY]${colors.reset}`, ...args);
    } else {
      console.warn('[SECURITY]', ...args);
      // TODO: Send to security monitoring service
    }
  },

  /**
   * Business logic logs - only in development
   * Use for business flow debugging
   */
  business: (...args: any[]) => {
    if (isDevelopment) {
      console.log(`${colors.info}[BUSINESS]${colors.reset}`, ...args);
    }
  }
};

// Export individual functions for convenience
export const { debug, info, warn, error, perf, api, db, security, business } = logger;

// Environment info for debugging
if (isDevelopment) {
  logger.info('Logger initialized', {
    mode: import.meta.env.MODE,
    dev: import.meta.env.DEV,
    prod: import.meta.env.PROD,
    nodeEnv: process.env.NODE_ENV
  });
}