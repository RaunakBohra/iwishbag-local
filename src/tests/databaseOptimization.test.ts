/**
 * Database Optimization Test Suite
 * 
 * Comprehensive tests for all database optimization features including:
 * - Query performance monitoring
 * - Smart caching and invalidation
 * - Optimized pagination
 * - Advanced query optimization
 * - Integration functionality
 */

import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest';
import { queryPerformanceMonitor } from '@/utils/queryPerformanceMonitor';
import { optimizedSupabase } from '@/services/OptimizedSupabaseService';
import { advancedQueryOptimizer } from '@/utils/advancedQueryOptimizer';
import { createOptimizedPagination } from '@/utils/optimizedPagination';
import { databaseOptimization } from '@/utils/databaseOptimizationIntegration';

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      range: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: 1 }, error: null }),
      then: vi.fn().mockResolvedValue({ data: [{ id: 1 }], error: null }),
    })),
    rpc: vi.fn().mockResolvedValue({ data: 'test', error: null }),
  },
}));

// Mock logger
vi.mock('@/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('Query Performance Monitor', () => {
  beforeEach(() => {
    queryPerformanceMonitor.clearMetrics();
  });

  it('should start and end query tracking correctly', () => {
    const trackingId = queryPerformanceMonitor.startQuery('test-query', 'SELECT', 'test_table');
    expect(trackingId).toBeTruthy();

    queryPerformanceMonitor.endQuery(trackingId, {
      queryKey: 'test-query',
      queryType: 'SELECT',
      tableName: 'test_table',
      recordsAffected: 5,
      cacheHit: false,
    });

    const analysis = queryPerformanceMonitor.getPerformanceAnalysis();
    expect(analysis.totalQueries).toBe(1);
    expect(analysis.frequentQueries).toHaveLength(1);
    expect(analysis.frequentQueries[0].queryKey).toBe('test-query');
  });

  it('should track slow queries and generate warnings', () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    
    const trackingId = queryPerformanceMonitor.startQuery('slow-query', 'SELECT', 'test_table');
    
    // Simulate slow query by manually setting performance.now
    const originalNow = performance.now;
    let callCount = 0;
    performance.now = vi.fn(() => {
      callCount++;
      return callCount === 1 ? 0 : 1500; // 1500ms execution time
    });

    queryPerformanceMonitor.endQuery(trackingId, {
      queryKey: 'slow-query',
      queryType: 'SELECT',
      tableName: 'test_table',
      recordsAffected: 1,
    });

    expect(consoleSpy).toHaveBeenCalled();
    performance.now = originalNow;
  });

  it('should provide optimization recommendations', () => {
    // Add multiple slow queries
    for (let i = 0; i < 5; i++) {
      const trackingId = queryPerformanceMonitor.startQuery(`slow-query-${i}`, 'SELECT', 'test_table');
      queryPerformanceMonitor.endQuery(trackingId, {
        queryKey: `slow-query-${i}`,
        queryType: 'SELECT',
        tableName: 'test_table',
        recordsAffected: 1,
      });
    }

    const recommendations = queryPerformanceMonitor.getOptimizationRecommendations();
    expect(recommendations).toBeInstanceOf(Array);
  });

  it('should export metrics correctly', () => {
    const trackingId = queryPerformanceMonitor.startQuery('export-test', 'SELECT', 'test_table');
    queryPerformanceMonitor.endQuery(trackingId, {
      queryKey: 'export-test',
      queryType: 'SELECT',
      tableName: 'test_table',
    });

    const exported = queryPerformanceMonitor.exportMetrics();
    expect(exported).toHaveProperty('timestamp');
    expect(exported).toHaveProperty('totalQueries');
    expect(exported).toHaveProperty('analysis');
    expect(exported.totalQueries).toBeGreaterThan(0);
  });
});

describe('Optimized Supabase Service', () => {
  beforeEach(() => {
    optimizedSupabase.clearCache();
  });

  it('should cache query results', async () => {
    const mockData = [{ id: 1, name: 'test' }];
    
    // Mock the internal query execution
    const executeSpy = vi.spyOn(optimizedSupabase as any, 'executeWithRetry')
      .mockResolvedValue(mockData);

    // First call - should execute query
    const result1 = await optimizedSupabase
      .from('test_table')
      .select('*', { enableCache: true, cacheTtl: 5000 })
      .execute();

    // Second call - should use cache
    const result2 = await optimizedSupabase
      .from('test_table')
      .select('*', { enableCache: true, cacheTtl: 5000 })
      .execute();

    expect(result1).toEqual(mockData);
    expect(result2).toEqual(mockData);
    
    const cacheStats = optimizedSupabase.getCacheStats();
    expect(cacheStats.hitRate).toBeGreaterThan(0);
  });

  it('should invalidate cache on mutations', async () => {
    const insertData = { name: 'new item' };
    
    // Mock successful insert
    vi.spyOn(optimizedSupabase as any, 'executeWithRetry')
      .mockResolvedValue([insertData]);

    await optimizedSupabase
      .from('test_table')
      .insert(insertData);

    const cacheStats = optimizedSupabase.getCacheStats();
    // Cache should be cleared for the table
    expect(cacheStats.entries.filter(key => key.includes('test_table'))).toHaveLength(0);
  });

  it('should handle RPC calls with caching', async () => {
    const mockResult = { success: true, data: 'test' };
    
    // Mock RPC execution
    vi.spyOn(optimizedSupabase as any, 'executeWithRetry')
      .mockResolvedValue(mockResult);

    const result = await optimizedSupabase.rpc('test_function', { param: 'value' }, {
      enableCache: true,
      cacheTtl: 3000,
    });

    expect(result).toEqual(mockResult);
  });

  it('should provide cache statistics', () => {
    const stats = optimizedSupabase.getCacheStats();
    expect(stats).toHaveProperty('size');
    expect(stats).toHaveProperty('hitRate');
    expect(stats).toHaveProperty('entries');
    expect(typeof stats.size).toBe('number');
    expect(typeof stats.hitRate).toBe('number');
    expect(Array.isArray(stats.entries)).toBe(true);
  });
});

describe('Advanced Query Optimizer', () => {
  it('should execute parallel queries', async () => {
    const queries = [
      {
        key: 'query1',
        queryFn: vi.fn().mockResolvedValue({ id: 1 }),
        priority: 'high' as const,
      },
      {
        key: 'query2',
        queryFn: vi.fn().mockResolvedValue({ id: 2 }),
        priority: 'medium' as const,
      },
      {
        key: 'query3',
        queryFn: vi.fn().mockResolvedValue({ id: 3 }),
        priority: 'low' as const,
      },
    ];

    const results = await advancedQueryOptimizer.parallelQuery(queries);

    expect(results).toHaveProperty('query1');
    expect(results).toHaveProperty('query2');
    expect(results).toHaveProperty('query3');
    expect(results.query1).toEqual({ id: 1 });
    expect(results.query2).toEqual({ id: 2 });
    expect(results.query3).toEqual({ id: 3 });

    // All query functions should have been called
    queries.forEach(query => {
      expect(query.queryFn).toHaveBeenCalled();
    });
  });

  it('should handle batch operations', async () => {
    const operations = [
      { type: 'select' as const, table: 'table1', filters: { id: 1 } },
      { type: 'insert' as const, table: 'table2', data: { name: 'test' } },
      { type: 'update' as const, table: 'table1', data: { status: 'active' }, filters: { id: 1 } },
    ];

    // Mock the executeWithRetry method
    vi.spyOn(advancedQueryOptimizer as any, 'executeWithRetry')
      .mockResolvedValue([{ success: true }]);

    const results = await advancedQueryOptimizer.batchExecute(operations, {
      parallel: true,
      continueOnError: true,
    });

    expect(results).toHaveLength(3);
    results.forEach(result => {
      expect(result).toHaveProperty('success');
    });
  });

  it('should provide optimization statistics', () => {
    const stats = advancedQueryOptimizer.getOptimizationStats();
    
    expect(stats).toHaveProperty('connections');
    expect(stats).toHaveProperty('queries');
    expect(stats).toHaveProperty('cache');
    expect(stats).toHaveProperty('prefetch');
    expect(stats).toHaveProperty('recommendations');
    
    expect(Array.isArray(stats.recommendations)).toBe(true);
  });

  it('should generate query plans', async () => {
    const query = 'SELECT * FROM users WHERE created_at > $1 ORDER BY name';
    const parameters = { created_at: '2024-01-01' };

    const plan = await advancedQueryOptimizer.analyzeQueryPlan(query, parameters);

    expect(plan).toHaveProperty('estimatedCost');
    expect(plan).toHaveProperty('suggestedIndexes');
    expect(plan).toHaveProperty('optimizedQuery');
    expect(plan).toHaveProperty('alternatives');
    
    expect(typeof plan.estimatedCost).toBe('number');
    expect(Array.isArray(plan.suggestedIndexes)).toBe(true);
    expect(Array.isArray(plan.alternatives)).toBe(true);
  });
});

describe('Optimized Pagination', () => {
  it('should create pagination instance with correct configuration', () => {
    const mockQueryBuilder = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      range: vi.fn().mockReturnThis(),
    };

    const pagination = createOptimizedPagination(
      {
        pageSize: 20,
        prefetchPages: 2,
        cachePages: 10,
        sortOrder: 'desc',
      },
      mockQueryBuilder,
      'test_table'
    );

    expect(pagination).toBeDefined();
    expect(typeof pagination.getPaginatedData).toBe('function');
    expect(typeof pagination.clearCache).toBe('function');
    expect(typeof pagination.getCacheStats).toBe('function');
  });

  it('should provide cache statistics', () => {
    const mockQueryBuilder = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      range: vi.fn().mockReturnThis(),
    };

    const pagination = createOptimizedPagination(
      { pageSize: 10 },
      mockQueryBuilder,
      'test_table'
    );

    const stats = pagination.getCacheStats();
    expect(stats).toHaveProperty('totalEntries');
    expect(stats).toHaveProperty('validEntries');
    expect(stats).toHaveProperty('expiredEntries');
    expect(stats).toHaveProperty('prefetchQueueSize');
  });
});

describe('Database Optimization Integration', () => {
  beforeEach(async () => {
    databaseOptimization.resetOptimizations();
    await databaseOptimization.initialize({
      enablePerformanceMonitoring: true,
      enableQueryCaching: true,
      enableAdvancedOptimizations: true,
      enablePredictivePrefetch: false, // Disable for testing
    });
  });

  it('should initialize successfully', async () => {
    // Already initialized in beforeEach
    const stats = databaseOptimization.getDatabaseStats();
    expect(stats).toHaveProperty('queries');
    expect(stats).toHaveProperty('cache');
    expect(stats).toHaveProperty('optimization');
    expect(stats).toHaveProperty('recommendations');
  });

  it('should execute optimized select queries', async () => {
    const mockResult = [{ id: 1, name: 'test' }];
    
    // Mock the internal execution
    vi.spyOn(optimizedSupabase, 'from').mockReturnValue({
      select: vi.fn().mockReturnValue({
        execute: vi.fn().mockResolvedValue(mockResult),
        eq: vi.fn().mockReturnThis(),
        paginate: vi.fn().mockReturnThis(),
      }),
    } as any);

    const result = await databaseOptimization.optimizedQuery({
      type: 'select',
      table: 'test_table',
      filters: { status: 'active' },
      options: {
        cache: true,
        cacheTtl: 5000,
      },
    });

    expect(result).toEqual(mockResult);
  });

  it('should execute batch operations', async () => {
    const operations = [
      { type: 'select' as const, table: 'table1' },
      { type: 'insert' as const, table: 'table2', data: { name: 'test' } },
    ];

    const results = await databaseOptimization.batchOptimizedQueries(operations, {
      parallel: true,
      continueOnError: true,
    });

    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBe(operations.length);
  });

  it('should create optimized pagination', () => {
    const pagination = databaseOptimization.createPagination('test_table', {
      pageSize: 25,
      prefetchPages: 3,
    });

    expect(pagination).toBeDefined();
  });

  it('should provide comprehensive database statistics', () => {
    const stats = databaseOptimization.getDatabaseStats();

    expect(stats.queries).toHaveProperty('total');
    expect(stats.queries).toHaveProperty('avgExecutionTime');
    expect(stats.queries).toHaveProperty('cacheHitRate');
    expect(stats.queries).toHaveProperty('slowQueries');

    expect(stats.cache).toHaveProperty('size');
    expect(stats.cache).toHaveProperty('hitRate');
    expect(stats.cache).toHaveProperty('entries');

    expect(stats.optimization).toHaveProperty('parallelQueries');
    expect(stats.optimization).toHaveProperty('prefetchedQueries');
    expect(stats.optimization).toHaveProperty('batchedOperations');

    expect(Array.isArray(stats.recommendations)).toBe(true);
  });

  it('should export performance report', () => {
    const report = databaseOptimization.exportPerformanceReport();

    expect(report).toHaveProperty('timestamp');
    expect(report).toHaveProperty('config');
    expect(report).toHaveProperty('stats');
    expect(report).toHaveProperty('queryMetrics');
    expect(report).toHaveProperty('optimizationMetrics');

    expect(typeof report.timestamp).toBe('string');
    expect(new Date(report.timestamp)).toBeInstanceOf(Date);
  });

  it('should reset optimizations correctly', () => {
    // Generate some activity first
    queryPerformanceMonitor.startQuery('test', 'SELECT', 'test_table');
    
    // Reset
    databaseOptimization.resetOptimizations();
    
    const stats = databaseOptimization.getDatabaseStats();
    expect(stats.queries.total).toBe(0);
    expect(stats.cache.size).toBe(0);
    expect(stats.optimization.parallelQueries).toBe(0);
    expect(stats.optimization.batchedOperations).toBe(0);
  });
});

describe('Performance Integration Tests', () => {
  it('should handle high-volume query scenarios', async () => {
    const startTime = performance.now();
    
    // Simulate 100 parallel queries
    const queries = Array.from({ length: 100 }, (_, i) => ({
      key: `bulk-query-${i}`,
      queryFn: vi.fn().mockResolvedValue({ id: i }),
      priority: (i % 3 === 0 ? 'high' : i % 2 === 0 ? 'medium' : 'low') as const,
    }));

    const results = await advancedQueryOptimizer.parallelQuery(queries);
    
    const executionTime = performance.now() - startTime;
    
    expect(Object.keys(results)).toHaveLength(100);
    expect(executionTime).toBeLessThan(5000); // Should complete within 5 seconds
    
    // All queries should have been executed
    queries.forEach(query => {
      expect(query.queryFn).toHaveBeenCalled();
    });
  });

  it('should maintain performance with cache warming', async () => {
    const mockData = Array.from({ length: 50 }, (_, i) => ({ id: i, name: `item-${i}` }));
    
    // Mock query execution
    vi.spyOn(optimizedSupabase as any, 'executeWithRetry')
      .mockResolvedValue(mockData);

    const queries = Array.from({ length: 10 }, (_, i) => 
      databaseOptimization.optimizedQuery({
        type: 'select',
        table: 'cache_test_table',
        filters: { category: `category-${i % 3}` }, // Only 3 unique filters
        options: { cache: true, cacheTtl: 10000 },
      })
    );

    const startTime = performance.now();
    const results = await Promise.all(queries);
    const executionTime = performance.now() - startTime;

    expect(results).toHaveLength(10);
    expect(executionTime).toBeLessThan(1000); // Should be fast due to caching
    
    const cacheStats = optimizedSupabase.getCacheStats();
    expect(cacheStats.hitRate).toBeGreaterThan(0); // Should have cache hits
  });

  it('should handle error scenarios gracefully', async () => {
    const mixedOperations = [
      {
        type: 'select' as const,
        table: 'good_table',
      },
      {
        type: 'select' as const,
        table: 'bad_table', // This will fail
      },
      {
        type: 'insert' as const,
        table: 'good_table',
        data: { name: 'test' },
      },
    ];

    // Mock mixed success/failure
    let callCount = 0;
    vi.spyOn(optimizedSupabase as any, 'executeWithRetry')
      .mockImplementation(() => {
        callCount++;
        if (callCount === 2) {
          throw new Error('Simulated database error');
        }
        return Promise.resolve([{ success: true }]);
      });

    const results = await databaseOptimization.batchOptimizedQueries(mixedOperations, {
      continueOnError: true,
    });

    expect(results).toHaveLength(3);
    
    // Should have both successes and failures
    const successes = results.filter(r => r.success);
    const failures = results.filter(r => !r.success);
    
    expect(successes.length).toBeGreaterThan(0);
    expect(failures.length).toBeGreaterThan(0);
  });
});