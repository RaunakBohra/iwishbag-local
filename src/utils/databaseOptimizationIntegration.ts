/**
 * Database Optimization Integration
 * 
 * Central integration point for all database optimization features.
 * Coordinates between different optimization systems and provides
 * a unified interface for the application.
 */

import { optimizedSupabase } from '@/services/OptimizedSupabaseService';
import { queryPerformanceMonitor } from '@/utils/queryPerformanceMonitor';
import { advancedQueryOptimizer } from '@/utils/advancedQueryOptimizer';
import { createOptimizedPagination } from '@/utils/optimizedPagination';
import { logger } from '@/utils/logger';

interface OptimizationConfig {
  enablePerformanceMonitoring: boolean;
  enableQueryCaching: boolean;
  enableAdvancedOptimizations: boolean;
  enablePredictivePrefetch: boolean;
  cacheDefaultTtl: number;
  queryBatchSize: number;
  prefetchEnabled: boolean;
}

interface DatabaseStats {
  queries: {
    total: number;
    avgExecutionTime: number;
    cacheHitRate: number;
    slowQueries: number;
  };
  cache: {
    size: number;
    hitRate: number;
    entries: number;
  };
  optimization: {
    parallelQueries: number;
    prefetchedQueries: number;
    batchedOperations: number;
  };
  recommendations: string[];
}

class DatabaseOptimizationIntegration {
  private config: OptimizationConfig = {
    enablePerformanceMonitoring: true,
    enableQueryCaching: true,
    enableAdvancedOptimizations: true,
    enablePredictivePrefetch: true,
    cacheDefaultTtl: 5 * 60 * 1000, // 5 minutes
    queryBatchSize: 10,
    prefetchEnabled: true,
  };

  private isInitialized = false;
  private stats = {
    parallelQueries: 0,
    prefetchedQueries: 0,
    batchedOperations: 0,
  };

  constructor() {
    this.initialize();
  }

  /**
   * Initialize all optimization systems
   */
  async initialize(customConfig?: Partial<OptimizationConfig>): Promise<void> {
    if (this.isInitialized) return;

    // Merge custom configuration
    this.config = { ...this.config, ...customConfig };

    try {
      // Initialize performance monitoring
      if (this.config.enablePerformanceMonitoring) {
        logger.info('🔍 Database performance monitoring enabled');
      }

      // Test database connectivity and optimization features
      await this.runInitializationTests();

      this.isInitialized = true;
      logger.info('✅ Database optimization integration initialized successfully');
    } catch (error) {
      logger.error('❌ Failed to initialize database optimization:', error);
      throw error;
    }
  }

  /**
   * Enhanced query execution with all optimizations
   */
  async optimizedQuery<T = any>(
    operation: {
      type: 'select' | 'insert' | 'update' | 'delete' | 'rpc';
      table: string;
      data?: any;
      filters?: Record<string, any>;
      options?: {
        cache?: boolean;
        cacheTtl?: number;
        parallel?: boolean;
        prefetch?: boolean;
        pagination?: {
          page: number;
          pageSize: number;
        };
      };
    }
  ): Promise<T> {
    const startTime = performance.now();
    const queryKey = this.generateQueryKey(operation);

    try {
      let result: T;

      switch (operation.type) {
        case 'select':
          result = await this.executeSelectQuery(operation);
          break;
        
        case 'insert':
          result = await this.executeInsertQuery(operation);
          break;
        
        case 'update':
          result = await this.executeUpdateQuery(operation);
          break;
        
        case 'delete':
          result = await this.executeDeleteQuery(operation);
          break;
        
        case 'rpc':
          result = await this.executeRpcQuery(operation);
          break;
        
        default:
          throw new Error(`Unsupported query type: ${operation.type}`);
      }

      // Trigger predictive prefetch if enabled
      if (this.config.enablePredictivePrefetch && operation.options?.prefetch !== false) {
        this.triggerPredictivePrefetch(queryKey);
      }

      const executionTime = performance.now() - startTime;
      logger.debug(`Query executed in ${executionTime.toFixed(2)}ms: ${queryKey}`);

      return result;
    } catch (error) {
      const executionTime = performance.now() - startTime;
      logger.error(`Query failed after ${executionTime.toFixed(2)}ms: ${queryKey}`, error);
      throw error;
    }
  }

  /**
   * Batch execute multiple operations with optimization
   */
  async batchOptimizedQueries<T = any>(
    operations: Array<Parameters<typeof this.optimizedQuery>[0]>,
    options: {
      parallel?: boolean;
      continueOnError?: boolean;
      batchSize?: number;
    } = {}
  ): Promise<Array<{ success: boolean; result?: T; error?: any }>> {
    const {
      parallel = true,
      continueOnError = true,
      batchSize = this.config.queryBatchSize,
    } = options;

    this.stats.batchedOperations++;

    if (this.config.enableAdvancedOptimizations && parallel) {
      // Use advanced query optimizer for parallel execution
      const parallelQueries = operations.map((op, index) => ({
        key: `batch-${index}`,
        queryFn: () => this.optimizedQuery(op),
        priority: op.options?.parallel ? 'high' : 'medium',
      }));

      this.stats.parallelQueries++;
      const results = await advancedQueryOptimizer.parallelQuery(parallelQueries);
      
      return Object.entries(results).map(([key, result]) => ({
        success: true,
        result: result as T,
      }));
    } else {
      // Use advanced query optimizer's batch execute
      const batchOperations = operations.map(op => ({
        type: op.type as 'select' | 'insert' | 'update' | 'delete',
        table: op.table,
        data: op.data,
        filters: op.filters,
      }));

      return advancedQueryOptimizer.batchExecute(batchOperations, {
        batchSize,
        parallel,
        continueOnError,
      });
    }
  }

  /**
   * Create optimized pagination instance
   */
  createPagination<T = any>(
    tableName: string,
    config: {
      pageSize?: number;
      prefetchPages?: number;
      cachePages?: number;
      cursorColumn?: string;
      sortOrder?: 'asc' | 'desc';
    } = {}
  ) {
    return createOptimizedPagination<T>(config, optimizedSupabase, tableName);
  }

  /**
   * Get comprehensive database performance statistics
   */
  getDatabaseStats(): DatabaseStats {
    const queryStats = queryPerformanceMonitor.getPerformanceAnalysis();
    const cacheStats = optimizedSupabase.getCacheStats();
    const optimizationStats = advancedQueryOptimizer.getOptimizationStats();

    return {
      queries: {
        total: queryStats.totalQueries,
        avgExecutionTime: queryStats.avgExecutionTime,
        cacheHitRate: queryStats.cacheHitRate,
        slowQueries: queryStats.slowestQueries.length,
      },
      cache: {
        size: cacheStats.size,
        hitRate: cacheStats.hitRate,
        entries: cacheStats.entries.length,
      },
      optimization: {
        parallelQueries: this.stats.parallelQueries,
        prefetchedQueries: this.stats.prefetchedQueries,
        batchedOperations: this.stats.batchedOperations,
      },
      recommendations: [
        ...optimizationStats.recommendations,
        ...this.generateIntegrationRecommendations(queryStats, cacheStats),
      ],
    };
  }

  /**
   * Export performance report for analysis
   */
  exportPerformanceReport(): {
    timestamp: string;
    config: OptimizationConfig;
    stats: DatabaseStats;
    queryMetrics: any;
    optimizationMetrics: any;
  } {
    return {
      timestamp: new Date().toISOString(),
      config: this.config,
      stats: this.getDatabaseStats(),
      queryMetrics: queryPerformanceMonitor.exportMetrics(),
      optimizationMetrics: advancedQueryOptimizer.getOptimizationStats(),
    };
  }

  /**
   * Clear all caches and reset metrics
   */
  resetOptimizations(): void {
    optimizedSupabase.clearCache();
    queryPerformanceMonitor.clearMetrics();
    this.stats = {
      parallelQueries: 0,
      prefetchedQueries: 0,
      batchedOperations: 0,
    };
    logger.info('🔄 Database optimizations reset');
  }

  // Private methods
  private async executeSelectQuery<T>(operation: any): Promise<T> {
    let query = optimizedSupabase
      .from(operation.table)
      .select('*', {
        enableCache: operation.options?.cache !== false,
        cacheTtl: operation.options?.cacheTtl || this.config.cacheDefaultTtl,
      });

    // Apply filters
    if (operation.filters) {
      for (const [key, value] of Object.entries(operation.filters)) {
        query = query.eq(key, value);
      }
    }

    // Apply pagination if specified
    if (operation.options?.pagination) {
      const { page, pageSize } = operation.options.pagination;
      query = query.paginate({ page, pageSize });
    }

    return query.execute();
  }

  private async executeInsertQuery<T>(operation: any): Promise<T> {
    return optimizedSupabase
      .from(operation.table)
      .insert(operation.data, {
        enableCache: false, // Don't cache insert operations
      });
  }

  private async executeUpdateQuery<T>(operation: any): Promise<T> {
    let query = optimizedSupabase
      .from(operation.table)
      .update(operation.data, {
        enableCache: false, // Don't cache update operations
      });

    // Apply filters
    if (operation.filters) {
      for (const [key, value] of Object.entries(operation.filters)) {
        query = query.eq(key, value);
      }
    }

    return query.execute();
  }

  private async executeDeleteQuery<T>(operation: any): Promise<T> {
    let query = optimizedSupabase
      .from(operation.table)
      .delete({
        enableCache: false, // Don't cache delete operations
      });

    // Apply filters
    if (operation.filters) {
      for (const [key, value] of Object.entries(operation.filters)) {
        query = query.eq(key, value);
      }
    }

    return query.execute();
  }

  private async executeRpcQuery<T>(operation: any): Promise<T> {
    return optimizedSupabase.rpc(
      operation.table, // function name
      operation.data || {}, // parameters
      {
        enableCache: operation.options?.cache !== false,
        cacheTtl: operation.options?.cacheTtl || this.config.cacheDefaultTtl,
      }
    );
  }

  private generateQueryKey(operation: any): string {
    return `${operation.type}:${operation.table}:${JSON.stringify(operation.filters || {})}`;
  }

  private async triggerPredictivePrefetch(currentQuery: string): Promise<void> {
    if (!this.config.enablePredictivePrefetch) return;

    try {
      await advancedQueryOptimizer.predictivePrefetch(currentQuery);
      this.stats.prefetchedQueries++;
    } catch (error) {
      logger.debug('Predictive prefetch failed:', error);
    }
  }

  private async runInitializationTests(): Promise<void> {
    try {
      // Test basic query functionality
      await optimizedSupabase
        .from('system_settings')
        .select('setting_key', { enableCache: true, cacheTtl: 1000 })
        .limit(1)
        .execute();

      // Test performance monitoring
      const testQuery = 'test-initialization-query';
      const trackingId = queryPerformanceMonitor.startQuery(testQuery, 'SELECT', 'system_settings');
      queryPerformanceMonitor.endQuery(trackingId, {
        queryKey: testQuery,
        queryType: 'SELECT',
        tableName: 'system_settings',
        recordsAffected: 1,
        cacheHit: false,
      });

      logger.info('✅ Database optimization tests passed');
    } catch (error) {
      logger.warn('⚠️ Some optimization features may not work properly:', error);
    }
  }

  private generateIntegrationRecommendations(queryStats: any, cacheStats: any): string[] {
    const recommendations: string[] = [];

    if (queryStats.totalQueries > 1000 && queryStats.avgExecutionTime > 300) {
      recommendations.push('High query volume with slow average time - consider implementing query batching');
    }

    if (cacheStats.hitRate < 40) {
      recommendations.push('Very low cache hit rate - review caching strategy and TTL settings');
    }

    if (this.stats.parallelQueries < this.stats.batchedOperations * 0.1) {
      recommendations.push('Low parallel query usage - consider using parallel execution for independent queries');
    }

    return recommendations;
  }
}

// Create and export singleton instance
export const databaseOptimization = new DatabaseOptimizationIntegration();

// Export for testing and advanced usage
export { DatabaseOptimizationIntegration };

export default databaseOptimization;