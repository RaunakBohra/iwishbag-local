/**
 * Query Performance Monitor
 * 
 * Monitors and tracks database query performance to identify bottlenecks
 * and optimization opportunities in the Supabase database layer.
 */

interface QueryMetrics {
  queryKey: string;
  queryType: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'RPC';
  tableName: string;
  executionTime: number;
  recordsAffected?: number;
  cacheHit?: boolean;
  timestamp: Date;
  route?: string;
  userId?: string;
}

interface QueryAnalysis {
  avgExecutionTime: number;
  maxExecutionTime: number;
  minExecutionTime: number;
  totalQueries: number;
  cacheHitRate: number;
  slowestQueries: QueryMetrics[];
  frequentQueries: Array<{ queryKey: string; count: number; avgTime: number }>;
}

interface PerformanceThresholds {
  warningTime: number;    // 500ms
  criticalTime: number;   // 1000ms
  slowQueryLimit: number; // 2000ms
}

class QueryPerformanceMonitor {
  private metrics: Map<string, QueryMetrics[]> = new Map();
  private queryStartTimes: Map<string, number> = new Map();
  private isEnabled = import.meta.env.VITE_ENABLE_QUERY_MONITORING === 'true' || import.meta.env.DEV;
  
  private readonly thresholds: PerformanceThresholds = {
    warningTime: 500,
    criticalTime: 1000,
    slowQueryLimit: 2000,
  };

  constructor() {
    if (this.isEnabled) {
      this.setupPerformanceObserver();
      console.log('🔍 Query Performance Monitor initialized');
    }
  }

  /**
   * Start tracking a query
   */
  startQuery(queryKey: string, queryType: QueryMetrics['queryType'], tableName: string): string {
    if (!this.isEnabled) return '';
    
    const trackingId = `${queryKey}-${Date.now()}`;
    this.queryStartTimes.set(trackingId, performance.now());
    
    return trackingId;
  }

  /**
   * End tracking a query and record metrics
   */
  endQuery(trackingId: string, options: {
    queryKey: string;
    queryType: QueryMetrics['queryType'];
    tableName: string;
    recordsAffected?: number;
    cacheHit?: boolean;
    error?: any;
  }): void {
    if (!this.isEnabled || !trackingId) return;

    const startTime = this.queryStartTimes.get(trackingId);
    if (!startTime) return;

    const executionTime = performance.now() - startTime;
    this.queryStartTimes.delete(trackingId);

    const metric: QueryMetrics = {
      queryKey: options.queryKey,
      queryType: options.queryType,
      tableName: options.tableName,
      executionTime,
      recordsAffected: options.recordsAffected,
      cacheHit: options.cacheHit,
      timestamp: new Date(),
      route: this.getCurrentRoute(),
      userId: this.getCurrentUserId(),
    };

    // Store metric
    const existing = this.metrics.get(options.queryKey) || [];
    existing.push(metric);
    this.metrics.set(options.queryKey, existing);

    // Log slow queries immediately
    if (executionTime > this.thresholds.warningTime) {
      this.logSlowQuery(metric, options.error);
    }

    // Cleanup old metrics (keep last 1000 per query)
    if (existing.length > 1000) {
      existing.splice(0, existing.length - 1000);
    }
  }

  /**
   * Get performance analysis for all queries
   */
  getPerformanceAnalysis(): QueryAnalysis {
    if (!this.isEnabled) {
      return this.getEmptyAnalysis();
    }

    const allMetrics: QueryMetrics[] = [];
    const queryFrequency = new Map<string, { count: number; totalTime: number }>();

    for (const [queryKey, metrics] of this.metrics.entries()) {
      allMetrics.push(...metrics);
      
      const totalTime = metrics.reduce((sum, m) => sum + m.executionTime, 0);
      queryFrequency.set(queryKey, {
        count: metrics.length,
        totalTime,
      });
    }

    if (allMetrics.length === 0) {
      return this.getEmptyAnalysis();
    }

    // Calculate statistics
    const executionTimes = allMetrics.map(m => m.executionTime);
    const avgExecutionTime = executionTimes.reduce((sum, time) => sum + time, 0) / executionTimes.length;
    const maxExecutionTime = Math.max(...executionTimes);
    const minExecutionTime = Math.min(...executionTimes);

    // Cache hit rate
    const cacheableMetrics = allMetrics.filter(m => m.cacheHit !== undefined);
    const cacheHitRate = cacheableMetrics.length > 0 
      ? (cacheableMetrics.filter(m => m.cacheHit).length / cacheableMetrics.length) * 100
      : 0;

    // Slowest queries (top 10)
    const slowestQueries = allMetrics
      .sort((a, b) => b.executionTime - a.executionTime)
      .slice(0, 10);

    // Most frequent queries with their average time
    const frequentQueries = Array.from(queryFrequency.entries())
      .map(([queryKey, data]) => ({
        queryKey,
        count: data.count,
        avgTime: data.totalTime / data.count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);

    return {
      avgExecutionTime,
      maxExecutionTime,
      minExecutionTime,
      totalQueries: allMetrics.length,
      cacheHitRate,
      slowestQueries,
      frequentQueries,
    };
  }

  /**
   * Get performance summary by table
   */
  getTablePerformance(): Record<string, {
    queryCount: number;
    avgTime: number;
    slowestQuery: number;
    types: Record<string, number>;
  }> {
    const tableStats: Record<string, {
      queries: QueryMetrics[];
      types: Record<string, number>;
    }> = {};

    // Group by table
    for (const metrics of this.metrics.values()) {
      for (const metric of metrics) {
        if (!tableStats[metric.tableName]) {
          tableStats[metric.tableName] = { queries: [], types: {} };
        }
        tableStats[metric.tableName].queries.push(metric);
        tableStats[metric.tableName].types[metric.queryType] = 
          (tableStats[metric.tableName].types[metric.queryType] || 0) + 1;
      }
    }

    // Calculate statistics
    const result: Record<string, any> = {};
    for (const [tableName, data] of Object.entries(tableStats)) {
      const times = data.queries.map(q => q.executionTime);
      result[tableName] = {
        queryCount: data.queries.length,
        avgTime: times.reduce((sum, time) => sum + time, 0) / times.length,
        slowestQuery: Math.max(...times),
        types: data.types,
      };
    }

    return result;
  }

  /**
   * Get queries that exceed performance thresholds
   */
  getSlowQueries(threshold = this.thresholds.criticalTime): QueryMetrics[] {
    const slowQueries: QueryMetrics[] = [];
    
    for (const metrics of this.metrics.values()) {
      slowQueries.push(...metrics.filter(m => m.executionTime > threshold));
    }

    return slowQueries
      .sort((a, b) => b.executionTime - a.executionTime)
      .slice(0, 50);
  }

  /**
   * Generate optimization recommendations
   */
  getOptimizationRecommendations(): Array<{
    type: 'index' | 'query' | 'cache' | 'pagination';
    priority: 'high' | 'medium' | 'low';
    description: string;
    queryKey: string;
    tableName: string;
    metrics: {
      avgTime: number;
      frequency: number;
    };
  }> {
    const recommendations: Array<any> = [];
    const analysis = this.getPerformanceAnalysis();
    const tablePerf = this.getTablePerformance();

    // High-frequency slow queries need indexing
    analysis.frequentQueries
      .filter(fq => fq.avgTime > this.thresholds.warningTime && fq.count > 10)
      .forEach(fq => {
        const tableName = this.extractTableFromQuery(fq.queryKey);
        recommendations.push({
          type: 'index',
          priority: 'high',
          description: `Add database index for frequently executed slow query on table ${tableName}`,
          queryKey: fq.queryKey,
          tableName,
          metrics: {
            avgTime: fq.avgTime,
            frequency: fq.count,
          },
        });
      });

    // Tables with many queries but poor performance
    Object.entries(tablePerf)
      .filter(([, stats]) => stats.queryCount > 50 && stats.avgTime > this.thresholds.warningTime)
      .forEach(([tableName, stats]) => {
        recommendations.push({
          type: 'query',
          priority: 'medium',
          description: `Optimize queries for table ${tableName} - high volume with poor performance`,
          queryKey: '',
          tableName,
          metrics: {
            avgTime: stats.avgTime,
            frequency: stats.queryCount,
          },
        });
      });

    // Low cache hit rates suggest caching opportunities
    if (analysis.cacheHitRate < 60 && analysis.totalQueries > 100) {
      recommendations.push({
        type: 'cache',
        priority: 'medium',
        description: `Improve query caching - current hit rate is ${analysis.cacheHitRate.toFixed(1)}%`,
        queryKey: '',
        tableName: 'global',
        metrics: {
          avgTime: analysis.avgExecutionTime,
          frequency: analysis.totalQueries,
        },
      });
    }

    return recommendations.sort((a, b) => {
      const priorityWeight = { high: 3, medium: 2, low: 1 };
      return priorityWeight[b.priority] - priorityWeight[a.priority];
    });
  }

  /**
   * Export performance data for analysis
   */
  exportMetrics(): {
    timestamp: string;
    totalQueries: number;
    analysis: QueryAnalysis;
    tablePerformance: Record<string, any>;
    slowQueries: QueryMetrics[];
    recommendations: Array<any>;
  } {
    return {
      timestamp: new Date().toISOString(),
      totalQueries: Array.from(this.metrics.values()).reduce((sum, arr) => sum + arr.length, 0),
      analysis: this.getPerformanceAnalysis(),
      tablePerformance: this.getTablePerformance(),
      slowQueries: this.getSlowQueries(),
      recommendations: this.getOptimizationRecommendations(),
    };
  }

  /**
   * Clear all metrics (useful for testing)
   */
  clearMetrics(): void {
    this.metrics.clear();
    this.queryStartTimes.clear();
    console.log('🧹 Query metrics cleared');
  }

  private setupPerformanceObserver(): void {
    // Monitor overall page performance that might be affected by queries
    if (typeof PerformanceObserver !== 'undefined') {
      try {
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.entryType === 'navigation' && entry.duration > 3000) {
              console.warn('⚠️ Slow page load detected - check database queries:', entry.duration);
            }
          }
        });
        observer.observe({ entryTypes: ['navigation'] });
      } catch (e) {
        console.warn('Performance Observer not fully supported');
      }
    }
  }

  private logSlowQuery(metric: QueryMetrics, error?: any): void {
    const level = metric.executionTime > this.thresholds.criticalTime ? 'error' : 'warn';
    const icon = metric.executionTime > this.thresholds.criticalTime ? '🚨' : '⚠️';
    
    console[level](`${icon} Slow query detected:`, {
      queryKey: metric.queryKey,
      table: metric.tableName,
      time: `${metric.executionTime.toFixed(2)}ms`,
      type: metric.queryType,
      route: metric.route,
      error: error?.message,
    });
  }

  private getCurrentRoute(): string {
    return typeof window !== 'undefined' ? window.location.pathname : '';
  }

  private getCurrentUserId(): string | undefined {
    // In a real app, you'd get this from your auth context
    return typeof window !== 'undefined' ? 
      localStorage.getItem('userId') || undefined : undefined;
  }

  private extractTableFromQuery(queryKey: string): string {
    // Simple extraction - you might want to make this more sophisticated
    const match = queryKey.match(/(?:from|table|entity)[_-]?([a-z_]+)/i);
    return match?.[1] || 'unknown';
  }

  private getEmptyAnalysis(): QueryAnalysis {
    return {
      avgExecutionTime: 0,
      maxExecutionTime: 0,
      minExecutionTime: 0,
      totalQueries: 0,
      cacheHitRate: 0,
      slowestQueries: [],
      frequentQueries: [],
    };
  }
}

// Create singleton instance
export const queryPerformanceMonitor = new QueryPerformanceMonitor();

/**
 * Decorator function to monitor query performance automatically
 */
export function monitorQuery<T extends (...args: any[]) => Promise<any>>(
  queryKey: string,
  tableName: string,
  queryType: QueryMetrics['queryType'] = 'SELECT'
) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const trackingId = queryPerformanceMonitor.startQuery(queryKey, queryType, tableName);
      
      try {
        const result = await originalMethod.apply(this, args);
        
        queryPerformanceMonitor.endQuery(trackingId, {
          queryKey,
          queryType,
          tableName,
          recordsAffected: Array.isArray(result) ? result.length : 1,
          cacheHit: false, // Set based on your caching logic
        });
        
        return result;
      } catch (error) {
        queryPerformanceMonitor.endQuery(trackingId, {
          queryKey,
          queryType,
          tableName,
          error,
        });
        throw error;
      }
    };

    return descriptor;
  };
}

export default queryPerformanceMonitor;