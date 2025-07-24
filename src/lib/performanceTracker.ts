/**
 * Performance Tracking Utilities
 *
 * Integration with Sentry to monitor database query performance
 * and identify slow operations in real-time.
 */

import * as Sentry from '@sentry/react';

/**
 * Performance thresholds for different operation types
 */
const PERFORMANCE_THRESHOLDS = {
  CART_OPERATIONS: 1000, // 1 second
  ADMIN_QUERIES: 2000, // 2 seconds
  USER_QUERIES: 1500, // 1.5 seconds
  SEARCH_QUERIES: 3000, // 3 seconds
  MUTATIONS: 2000, // 2 seconds
} as const;

/**
 * Query performance categories for better monitoring
 */
export type QueryCategory = keyof typeof PERFORMANCE_THRESHOLDS;

/**
 * Track database query performance with Sentry integration
 *
 * @param queryName - Descriptive name for the query
 * @param queryFn - Async function to execute
 * @param category - Performance category for appropriate thresholds
 * @param metadata - Additional context for debugging
 * @returns Promise with query result
 */
export const trackQueryPerformance = async <T>(
  queryName: string,
  queryFn: () => Promise<T>,
  category: QueryCategory = 'USER_QUERIES',
  metadata?: Record<string, any>,
): Promise<T> => {
  const startTime = performance.now();
  const transaction = Sentry.startTransaction({
    name: `db.${queryName}`,
    data: metadata,
  });

  try {
    const result = await queryFn();
    const duration = performance.now() - startTime;
    const threshold = PERFORMANCE_THRESHOLDS[category];

    // Add performance data to transaction
    transaction.setData('duration', duration);
    transaction.setData('category', category);
    transaction.setData('threshold', threshold);

    if (metadata) {
      Object.entries(metadata).forEach(([key, value]) => {
        transaction.setData(key, value);
      });
    }

    // Alert on slow queries
    if (duration > threshold) {
      Sentry.addBreadcrumb({
        message: `Slow query detected: ${queryName}`,
        category: 'performance',
        data: {
          duration: `${duration.toFixed(2)}ms`,
          threshold: `${threshold}ms`,
          category,
          ...metadata,
        },
        level: 'warning',
      });

      // Capture slow query as performance issue
      Sentry.captureMessage(
        `Slow database query: ${queryName} took ${duration.toFixed(2)}ms (threshold: ${threshold}ms)`,
        'warning',
      );
    }

    // Log successful queries for debugging
    console.log(`[Performance] ${queryName}: ${duration.toFixed(2)}ms`, {
      category,
      threshold: `${threshold}ms`,
      status: duration > threshold ? '🐌 SLOW' : '⚡ FAST',
      ...metadata,
    });

    return result;
  } catch (error) {
    // Capture query errors with performance context
    const duration = performance.now() - startTime;

    Sentry.withScope((scope) => {
      scope.setTag('query_name', queryName);
      scope.setTag('query_category', category);
      scope.setContext('performance', {
        duration: `${duration.toFixed(2)}ms`,
        threshold: `${PERFORMANCE_THRESHOLDS[category]}ms`,
        ...metadata,
      });
      Sentry.captureException(error);
    });

    throw error;
  } finally {
    transaction.finish();
  }
};

/**
 * Specialized tracking functions for common operations
 */
export const trackCartOperation = <T>(
  operationName: string,
  queryFn: () => Promise<T>,
  metadata?: Record<string, any>,
) => trackQueryPerformance(`cart.${operationName}`, queryFn, 'CART_OPERATIONS', metadata);

export const trackAdminQuery = <T>(
  queryName: string,
  queryFn: () => Promise<T>,
  metadata?: Record<string, any>,
) => trackQueryPerformance(`admin.${queryName}`, queryFn, 'ADMIN_QUERIES', metadata);

export const trackUserQuery = <T>(
  queryName: string,
  queryFn: () => Promise<T>,
  metadata?: Record<string, any>,
) => trackQueryPerformance(`user.${queryName}`, queryFn, 'USER_QUERIES', metadata);

export const trackSearchQuery = <T>(
  searchTerm: string,
  queryFn: () => Promise<T>,
  metadata?: Record<string, any>,
) => trackQueryPerformance('search', queryFn, 'SEARCH_QUERIES', { searchTerm, ...metadata });

export const trackMutation = <T>(
  mutationName: string,
  mutationFn: () => Promise<T>,
  metadata?: Record<string, any>,
) => trackQueryPerformance(`mutation.${mutationName}`, mutationFn, 'MUTATIONS', metadata);

/**
 * Higher-order component to wrap React Query hooks with performance tracking
 */
export const withPerformanceTracking = <TData = unknown, TError = unknown>(
  queryFn: () => Promise<TData>,
  queryName: string,
  category: QueryCategory = 'USER_QUERIES',
  metadata?: Record<string, any>,
) => {
  return () => trackQueryPerformance(queryName, queryFn, category, metadata);
};

/**
 * Performance monitoring utilities
 */
export const performanceUtils = {
  /**
   * Set up performance monitoring for the current page
   */
  setupPageMonitoring: (pageName: string) => {
    Sentry.configureScope((scope) => {
      scope.setTag('page', pageName);
    });

    // Track page load time
    if (typeof window !== 'undefined' && window.performance) {
      const loadTime =
        window.performance.timing.loadEventEnd - window.performance.timing.navigationStart;
      if (loadTime > 0) {
        Sentry.addBreadcrumb({
          message: `Page loaded: ${pageName}`,
          category: 'navigation',
          data: { loadTime: `${loadTime}ms` },
          level: 'info',
        });
      }
    }
  },

  /**
   * Track user interactions that trigger database queries
   */
  trackUserInteraction: (action: string, metadata?: Record<string, any>) => {
    Sentry.addBreadcrumb({
      message: `User interaction: ${action}`,
      category: 'ui',
      data: metadata,
      level: 'info',
    });
  },

  /**
   * Log performance metrics for analysis
   */
  logPerformanceMetrics: (metrics: {
    operation: string;
    duration: number;
    category: QueryCategory;
    success: boolean;
    metadata?: Record<string, any>;
  }) => {
    const { operation, duration, category, success, metadata } = metrics;
    const threshold = PERFORMANCE_THRESHOLDS[category];

    console.log(`[Performance Metrics] ${operation}`, {
      duration: `${duration.toFixed(2)}ms`,
      threshold: `${threshold}ms`,
      performance: duration > threshold ? 'SLOW' : 'FAST',
      success,
      category,
      ...metadata,
    });

    // Track performance in Sentry for aggregation
    Sentry.addBreadcrumb({
      message: `Performance: ${operation}`,
      category: 'performance',
      data: {
        duration,
        threshold,
        success,
        category,
        ...metadata,
      },
      level: duration > threshold ? 'warning' : 'info',
    });
  },
};

/**
 * Usage Examples:
 *
 * // Basic query tracking
 * const quotes = await trackUserQuery('dashboard_quotes', async () => {
 *   return supabase.from('quotes').select('*').eq('user_id', userId);
 * });
 *
 * // Cart operation tracking
 * const syncResult = await trackCartOperation('sync', async () => {
 *   return supabase.from('quotes').update({ in_cart: true }).in('id', itemIds);
 * }, { itemCount: itemIds.length });
 *
 * // Admin query tracking with metadata
 * const adminQuotes = await trackAdminQuery('all_quotes', async () => {
 *   return supabase.from('quotes').select(ADMIN_COLUMNS).range(0, 24);
 * }, { page: 0, filters: 'status=pending' });
 */
