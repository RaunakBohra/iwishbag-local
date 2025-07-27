import { logger } from '@/utils/logger';
import { toast } from '@/hooks/use-toast';

interface RateLimitError {
  code: string;
  message: string;
  details?: string;
  hint?: string;
}

interface RetryOptions {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffFactor?: number;
}

/**
 * Rate Limit Handler
 * 
 * Handles rate limiting errors from the server with intelligent retry logic
 * and user-friendly notifications
 */
export class RateLimitHandler {
  private static retryQueues = new Map<string, Promise<any>>();
  
  /**
   * Check if an error is a rate limit error
   */
  static isRateLimitError(error: any): boolean {
    return (
      error?.code === 'too_many_requests' ||
      error?.code === '42901' || // PostgreSQL permission denied
      error?.message?.toLowerCase().includes('rate limit') ||
      error?.status === 429
    );
  }

  /**
   * Extract retry after time from error
   */
  static getRetryAfter(error: any): number {
    // Try to parse from error details
    if (error?.details) {
      const match = error.details.match(/Reset at: (.*)/);
      if (match) {
        const resetTime = new Date(match[1]).getTime();
        const now = Date.now();
        return Math.max(0, resetTime - now);
      }
    }

    // Default retry times based on limit type
    if (error?.message?.includes('minute')) {
      return 60 * 1000; // 1 minute
    } else if (error?.message?.includes('hour')) {
      return 60 * 60 * 1000; // 1 hour
    } else if (error?.message?.includes('day')) {
      return 24 * 60 * 60 * 1000; // 1 day
    }

    // Default to 1 minute
    return 60 * 1000;
  }

  /**
   * Handle rate limit error with user notification
   */
  static handleError(error: any, context?: string): void {
    if (!this.isRateLimitError(error)) {
      return;
    }

    logger.warn('Rate limit exceeded', { error, context });

    const retryAfter = this.getRetryAfter(error);
    const retryInMinutes = Math.ceil(retryAfter / 60000);

    toast({
      title: 'Too Many Requests',
      description: `Please wait ${retryInMinutes} minute${retryInMinutes > 1 ? 's' : ''} before trying again.`,
      variant: 'destructive',
      duration: 5000,
    });
  }

  /**
   * Execute function with rate limit retry logic
   */
  static async withRetry<T>(
    fn: () => Promise<T>,
    options: RetryOptions = {},
    context?: string
  ): Promise<T> {
    const {
      maxRetries = 3,
      initialDelay = 1000,
      maxDelay = 60000,
      backoffFactor = 2,
    } = options;

    let lastError: any;
    let delay = initialDelay;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;

        if (!this.isRateLimitError(error)) {
          throw error;
        }

        if (attempt === maxRetries) {
          this.handleError(error, context);
          throw error;
        }

        // Calculate delay
        const retryAfter = this.getRetryAfter(error);
        delay = Math.min(Math.max(retryAfter, delay * backoffFactor), maxDelay);

        logger.debug(`Rate limited, retrying in ${delay}ms`, { attempt, context });

        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError;
  }

  /**
   * Queue requests to prevent rate limit violations
   */
  static async queue<T>(
    key: string,
    fn: () => Promise<T>,
    delayMs: number = 100
  ): Promise<T> {
    // Wait for previous request to complete
    const previousRequest = this.retryQueues.get(key);
    if (previousRequest) {
      await previousRequest.catch(() => {}); // Ignore errors from previous requests
    }

    // Add delay to prevent burst
    await new Promise(resolve => setTimeout(resolve, delayMs));

    // Execute and track request
    const promise = fn();
    this.retryQueues.set(key, promise);

    try {
      const result = await promise;
      return result;
    } finally {
      // Clean up after completion
      if (this.retryQueues.get(key) === promise) {
        this.retryQueues.delete(key);
      }
    }
  }

  /**
   * Create a rate-limited version of a function
   */
  static throttle<T extends (...args: any[]) => Promise<any>>(
    fn: T,
    key: string,
    delayMs: number = 100
  ): T {
    return (async (...args: Parameters<T>) => {
      return this.queue(key, () => fn(...args), delayMs);
    }) as T;
  }
}

// Export convenience functions
export const isRateLimitError = RateLimitHandler.isRateLimitError.bind(RateLimitHandler);
export const handleRateLimitError = RateLimitHandler.handleError.bind(RateLimitHandler);
export const withRateLimitRetry = RateLimitHandler.withRetry.bind(RateLimitHandler);
export const rateLimitQueue = RateLimitHandler.queue.bind(RateLimitHandler);
export const createRateLimitedFunction = RateLimitHandler.throttle.bind(RateLimitHandler);