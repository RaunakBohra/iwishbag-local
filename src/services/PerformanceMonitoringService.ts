/**
 * Performance Monitoring Service for Regional Pricing
 * 
 * Monitors and tracks performance metrics for regional pricing operations:
 * - Response times
 * - Cache hit rates
 * - Error rates
 * - Database query performance
 * - Country-specific performance patterns
 * - Service load balancing metrics
 */

import { logger } from '@/utils/logger';

export interface PerformanceMetric {
  timestamp: number;
  operation: string;
  duration: number;
  success: boolean;
  cacheHit: boolean;
  countryCode?: string;
  serviceKey?: string;
  orderValue?: number;
  errorMessage?: string;
  metadata?: Record<string, any>;
}

export interface PerformanceStats {
  totalRequests: number;
  successfulRequests: number;
  errorRate: number;
  averageResponseTime: number;
  p50ResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  cacheHitRate: number;
  topCountries: Array<{ country: string; requests: number; avgResponseTime: number }>;
  topServices: Array<{ service: string; requests: number; avgResponseTime: number }>;
  errorBreakdown: Array<{ error: string; count: number; percentage: number }>;
  timeRange: { start: number; end: number };
}

export interface AlertThresholds {
  maxResponseTimeP95: number;
  maxErrorRate: number;
  minCacheHitRate: number;
  maxConcurrentRequests: number;
}

export interface PerformanceAlert {
  type: 'response_time' | 'error_rate' | 'cache_performance' | 'concurrent_load';
  severity: 'warning' | 'critical';
  message: string;
  timestamp: number;
  value: number;
  threshold: number;
  metadata?: Record<string, any>;
}

class PerformanceMonitoringServiceClass {
  private static instance: PerformanceMonitoringServiceClass;
  private metrics: PerformanceMetric[] = [];
  private alerts: PerformanceAlert[] = [];
  private activeRequests = new Set<string>();
  private logThrottle = new Map<string, number>();
  
  private readonly MAX_METRICS_STORED = 10000; // Keep last 10k metrics
  private readonly CLEANUP_INTERVAL = 60000; // Clean up every minute
  private readonly ALERT_COOLDOWN = 300000; // 5 minutes cooldown between same alerts
  private alertCooldowns = new Map<string, number>();

  private readonly DEFAULT_THRESHOLDS: AlertThresholds = {
    maxResponseTimeP95: 500, // 500ms
    maxErrorRate: 5, // 5%
    minCacheHitRate: 70, // 70%
    maxConcurrentRequests: 100
  };

  private thresholds: AlertThresholds = { ...this.DEFAULT_THRESHOLDS };
  private cleanupTimer?: NodeJS.Timeout;

  private constructor() {
    this.startCleanupTimer();
  }

  public static getInstance(): PerformanceMonitoringServiceClass {
    if (!PerformanceMonitoringServiceClass.instance) {
      PerformanceMonitoringServiceClass.instance = new PerformanceMonitoringServiceClass();
    }
    return PerformanceMonitoringServiceClass.instance;
  }

  /**
   * Start performance monitoring for an operation
   */
  startOperation(operationId: string, operation: string, metadata?: Record<string, any>): string {
    this.activeRequests.add(operationId);
    
    // Check concurrent request threshold
    if (this.activeRequests.size > this.thresholds.maxConcurrentRequests) {
      this.triggerAlert({
        type: 'concurrent_load',
        severity: 'warning',
        message: `High concurrent load: ${this.activeRequests.size} active requests`,
        timestamp: Date.now(),
        value: this.activeRequests.size,
        threshold: this.thresholds.maxConcurrentRequests,
        metadata
      });
    }

    return operationId;
  }

  /**
   * End performance monitoring and record metrics
   */
  endOperation(
    operationId: string,
    operation: string,
    startTime: number,
    success: boolean,
    cacheHit: boolean = false,
    countryCode?: string,
    serviceKey?: string,
    orderValue?: number,
    errorMessage?: string,
    metadata?: Record<string, any>
  ): void {
    this.activeRequests.delete(operationId);
    
    const endTime = Date.now();
    const duration = endTime - startTime;

    const metric: PerformanceMetric = {
      timestamp: endTime,
      operation,
      duration,
      success,
      cacheHit,
      countryCode,
      serviceKey,
      orderValue,
      errorMessage,
      metadata
    };

    this.metrics.push(metric);
    this.checkAlertConditions(metric);
    
    // Log performance data (throttled to avoid spam)
    const logKey = `${operation}_${countryCode || 'unknown'}`;
    const now = Date.now();
    const lastLog = this.logThrottle.get(logKey) || 0;
    const throttleMs = 30000; // Only log same operation+country combo every 30 seconds
    
    if (now - lastLog > throttleMs) {
      logger.info(`[PerformanceMonitor] ${operation}`, {
        duration: `${duration}ms`,
        success,
        cacheHit,
        countryCode,
        serviceKey
      });
      this.logThrottle.set(logKey, now);
    }
  }

  /**
   * Record a metric directly (for simple operations)
   */
  recordMetric(
    operation: string,
    duration: number,
    success: boolean,
    cacheHit: boolean = false,
    countryCode?: string,
    serviceKey?: string,
    orderValue?: number,
    errorMessage?: string,
    metadata?: Record<string, any>
  ): void {
    const metric: PerformanceMetric = {
      timestamp: Date.now(),
      operation,
      duration,
      success,
      cacheHit,
      countryCode,
      serviceKey,
      orderValue,
      errorMessage,
      metadata
    };

    this.metrics.push(metric);
    this.checkAlertConditions(metric);
  }

  /**
   * Get performance statistics for a time range
   */
  getPerformanceStats(
    startTime?: number,
    endTime?: number,
    operation?: string,
    countryCode?: string,
    serviceKey?: string
  ): PerformanceStats {
    const now = Date.now();
    const start = startTime || (now - 3600000); // Default to last hour
    const end = endTime || now;

    // Filter metrics
    let filteredMetrics = this.metrics.filter(m => 
      m.timestamp >= start && 
      m.timestamp <= end &&
      (!operation || m.operation === operation) &&
      (!countryCode || m.countryCode === countryCode) &&
      (!serviceKey || m.serviceKey === serviceKey)
    );

    if (filteredMetrics.length === 0) {
      return {
        totalRequests: 0,
        successfulRequests: 0,
        errorRate: 0,
        averageResponseTime: 0,
        p50ResponseTime: 0,
        p95ResponseTime: 0,
        p99ResponseTime: 0,
        cacheHitRate: 0,
        topCountries: [],
        topServices: [],
        errorBreakdown: [],
        timeRange: { start, end }
      };
    }

    // Calculate basic stats
    const totalRequests = filteredMetrics.length;
    const successfulRequests = filteredMetrics.filter(m => m.success).length;
    const errorRate = ((totalRequests - successfulRequests) / totalRequests) * 100;
    const cacheHits = filteredMetrics.filter(m => m.cacheHit).length;
    const cacheHitRate = (cacheHits / totalRequests) * 100;

    // Calculate response time percentiles
    const responseTimes = filteredMetrics.map(m => m.duration).sort((a, b) => a - b);
    const averageResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
    const p50ResponseTime = responseTimes[Math.floor(responseTimes.length * 0.5)];
    const p95ResponseTime = responseTimes[Math.floor(responseTimes.length * 0.95)];
    const p99ResponseTime = responseTimes[Math.floor(responseTimes.length * 0.99)];

    // Aggregate by country
    const countryStats = new Map<string, { count: number; totalTime: number }>();
    filteredMetrics.forEach(m => {
      if (m.countryCode) {
        const existing = countryStats.get(m.countryCode) || { count: 0, totalTime: 0 };
        existing.count++;
        existing.totalTime += m.duration;
        countryStats.set(m.countryCode, existing);
      }
    });

    const topCountries = Array.from(countryStats.entries())
      .map(([country, stats]) => ({
        country,
        requests: stats.count,
        avgResponseTime: stats.totalTime / stats.count
      }))
      .sort((a, b) => b.requests - a.requests)
      .slice(0, 10);

    // Aggregate by service
    const serviceStats = new Map<string, { count: number; totalTime: number }>();
    filteredMetrics.forEach(m => {
      if (m.serviceKey) {
        const existing = serviceStats.get(m.serviceKey) || { count: 0, totalTime: 0 };
        existing.count++;
        existing.totalTime += m.duration;
        serviceStats.set(m.serviceKey, existing);
      }
    });

    const topServices = Array.from(serviceStats.entries())
      .map(([service, stats]) => ({
        service,
        requests: stats.count,
        avgResponseTime: stats.totalTime / stats.count
      }))
      .sort((a, b) => b.requests - a.requests)
      .slice(0, 10);

    // Error breakdown
    const errorCounts = new Map<string, number>();
    filteredMetrics.filter(m => !m.success && m.errorMessage).forEach(m => {
      const error = m.errorMessage!;
      errorCounts.set(error, (errorCounts.get(error) || 0) + 1);
    });

    const errorBreakdown = Array.from(errorCounts.entries())
      .map(([error, count]) => ({
        error,
        count,
        percentage: (count / totalRequests) * 100
      }))
      .sort((a, b) => b.count - a.count);

    return {
      totalRequests,
      successfulRequests,
      errorRate,
      averageResponseTime,
      p50ResponseTime,
      p95ResponseTime,
      p99ResponseTime,
      cacheHitRate,
      topCountries,
      topServices,
      errorBreakdown,
      timeRange: { start, end }
    };
  }

  /**
   * Get recent alerts
   */
  getRecentAlerts(limit: number = 50): PerformanceAlert[] {
    return this.alerts
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  /**
   * Get real-time performance dashboard data
   */
  getDashboardData(): {
    currentLoad: number;
    recentStats: PerformanceStats;
    recentAlerts: PerformanceAlert[];
    healthStatus: 'healthy' | 'warning' | 'critical';
  } {
    const now = Date.now();
    const recentStats = this.getPerformanceStats(now - 300000, now); // Last 5 minutes
    const recentAlerts = this.getRecentAlerts(10);
    
    // Determine health status
    let healthStatus: 'healthy' | 'warning' | 'critical' = 'healthy';
    
    if (recentStats.errorRate > this.thresholds.maxErrorRate) {
      healthStatus = 'critical';
    } else if (
      recentStats.p95ResponseTime > this.thresholds.maxResponseTimeP95 ||
      recentStats.cacheHitRate < this.thresholds.minCacheHitRate ||
      recentAlerts.filter(a => a.severity === 'critical').length > 0
    ) {
      healthStatus = 'warning';
    }

    return {
      currentLoad: this.activeRequests.size,
      recentStats,
      recentAlerts,
      healthStatus
    };
  }

  /**
   * Update alert thresholds
   */
  updateThresholds(newThresholds: Partial<AlertThresholds>): void {
    this.thresholds = { ...this.thresholds, ...newThresholds };
    logger.info('[PerformanceMonitor] Alert thresholds updated', newThresholds);
  }

  /**
   * Clear old metrics and alerts
   */
  clearOldData(): void {
    const cutoffTime = Date.now() - 86400000; // 24 hours ago
    
    // Keep only recent metrics
    this.metrics = this.metrics
      .filter(m => m.timestamp > cutoffTime)
      .slice(-this.MAX_METRICS_STORED);
    
    // Keep only recent alerts
    this.alerts = this.alerts.filter(a => a.timestamp > cutoffTime);
    
    logger.info('[PerformanceMonitor] Cleaned up old performance data');
  }

  /**
   * Check if metric triggers any alerts
   */
  private checkAlertConditions(metric: PerformanceMetric): void {
    // Check response time (only check on recent metrics to avoid false positives)
    const recentMetrics = this.metrics.slice(-100); // Last 100 requests
    if (recentMetrics.length >= 10) {
      const recentResponseTimes = recentMetrics.map(m => m.duration).sort((a, b) => a - b);
      const p95 = recentResponseTimes[Math.floor(recentResponseTimes.length * 0.95)];
      
      if (p95 > this.thresholds.maxResponseTimeP95) {
        this.triggerAlert({
          type: 'response_time',
          severity: p95 > this.thresholds.maxResponseTimeP95 * 1.5 ? 'critical' : 'warning',
          message: `High response time: P95 is ${p95.toFixed(2)}ms`,
          timestamp: Date.now(),
          value: p95,
          threshold: this.thresholds.maxResponseTimeP95,
          metadata: { countryCode: metric.countryCode, serviceKey: metric.serviceKey }
        });
      }
    }

    // Check error rate
    const recentErrors = recentMetrics.filter(m => !m.success).length;
    const errorRate = (recentErrors / recentMetrics.length) * 100;
    
    if (errorRate > this.thresholds.maxErrorRate) {
      this.triggerAlert({
        type: 'error_rate',
        severity: errorRate > this.thresholds.maxErrorRate * 2 ? 'critical' : 'warning',
        message: `High error rate: ${errorRate.toFixed(1)}%`,
        timestamp: Date.now(),
        value: errorRate,
        threshold: this.thresholds.maxErrorRate
      });
    }

    // Check cache hit rate
    const recentCacheHits = recentMetrics.filter(m => m.cacheHit).length;
    const cacheHitRate = (recentCacheHits / recentMetrics.length) * 100;
    
    if (cacheHitRate < this.thresholds.minCacheHitRate) {
      this.triggerAlert({
        type: 'cache_performance',
        severity: 'warning',
        message: `Low cache hit rate: ${cacheHitRate.toFixed(1)}%`,
        timestamp: Date.now(),
        value: cacheHitRate,
        threshold: this.thresholds.minCacheHitRate
      });
    }
  }

  /**
   * Trigger an alert with cooldown logic
   */
  private triggerAlert(alert: PerformanceAlert): void {
    const alertKey = `${alert.type}_${alert.severity}`;
    const now = Date.now();
    const lastAlert = this.alertCooldowns.get(alertKey);
    
    // Check cooldown
    if (lastAlert && (now - lastAlert) < this.ALERT_COOLDOWN) {
      return;
    }

    this.alerts.push(alert);
    this.alertCooldowns.set(alertKey, now);
    
    // Log alert
    logger.warn('[PerformanceMonitor] Alert triggered', alert);
    
    // In production, you would send this to monitoring systems (Datadog, New Relic, etc.)
    // this.sendToMonitoringSystem(alert);
  }

  /**
   * Start cleanup timer
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.clearOldData();
    }, this.CLEANUP_INTERVAL);
  }

  /**
   * Stop monitoring and cleanup
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    this.metrics = [];
    this.alerts = [];
    this.activeRequests.clear();
    this.alertCooldowns.clear();
  }
}

// Export singleton instance
export const performanceMonitoringService = PerformanceMonitoringServiceClass.getInstance();

// Utility function to wrap async operations with performance monitoring
export function monitorPerformance<T>(
  operation: string,
  fn: () => Promise<T>,
  metadata?: Record<string, any>
): Promise<T> {
  return new Promise(async (resolve, reject) => {
    const operationId = `${operation}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();
    
    performanceMonitoringService.startOperation(operationId, operation, metadata);
    
    try {
      const result = await fn();
      performanceMonitoringService.endOperation(
        operationId,
        operation,
        startTime,
        true,
        false, // cacheHit would need to be determined by the function
        metadata?.countryCode,
        metadata?.serviceKey,
        metadata?.orderValue,
        undefined,
        metadata
      );
      resolve(result);
    } catch (error) {
      performanceMonitoringService.endOperation(
        operationId,
        operation,
        startTime,
        false,
        false,
        metadata?.countryCode,
        metadata?.serviceKey,
        metadata?.orderValue,
        error instanceof Error ? error.message : 'Unknown error',
        metadata
      );
      reject(error);
    }
  });
}