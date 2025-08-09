/**
 * Optimized Supabase Service
 * 
 * Enhanced wrapper around Supabase client with:
 * - Intelligent query result caching
 * - Performance monitoring integration
 * - Smart pagination with cursor-based loading
 * - Query optimization utilities
 * - Automatic retry logic with exponential backoff
 */

import { supabase } from '@/integrations/supabase/client';
import { queryPerformanceMonitor } from '@/utils/queryPerformanceMonitor';
import { logger } from '@/utils/logger';

interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  queryKey: string;
  ttl: number; // Time to live in milliseconds
}

interface QueryOptions {
  cacheKey?: string;
  cacheTtl?: number; // Default 5 minutes
  enableCache?: boolean;
  enableMonitoring?: boolean;
  retryCount?: number;
  tableName?: string;
  queryType?: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'RPC';
}

interface PaginationOptions {
  page?: number;
  pageSize?: number;
  cursor?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

interface OptimizedQueryBuilder {
  from: (table: string) => OptimizedTableBuilder;
  rpc: (functionName: string, params?: any, options?: QueryOptions) => Promise<any>;
  clearCache: (pattern?: string) => void;
  getCacheStats: () => { size: number; hitRate: number; entries: string[] };
}

interface OptimizedTableBuilder {
  select: (columns?: string, options?: QueryOptions) => OptimizedSelectBuilder;
  insert: (data: any, options?: QueryOptions) => Promise<any>;
  update: (data: any, options?: QueryOptions) => OptimizedUpdateBuilder;
  delete: (options?: QueryOptions) => OptimizedDeleteBuilder;
}

interface OptimizedSelectBuilder {
  eq: (column: string, value: any) => OptimizedSelectBuilder;
  neq: (column: string, value: any) => OptimizedSelectBuilder;
  gt: (column: string, value: any) => OptimizedSelectBuilder;
  gte: (column: string, value: any) => OptimizedSelectBuilder;
  lt: (column: string, value: any) => OptimizedSelectBuilder;
  lte: (column: string, value: any) => OptimizedSelectBuilder;
  in: (column: string, values: any[]) => OptimizedSelectBuilder;
  like: (column: string, pattern: string) => OptimizedSelectBuilder;
  ilike: (column: string, pattern: string) => OptimizedSelectBuilder;
  order: (column: string, options?: { ascending?: boolean }) => OptimizedSelectBuilder;
  limit: (count: number) => OptimizedSelectBuilder;
  range: (from: number, to: number) => OptimizedSelectBuilder;
  single: () => OptimizedSelectBuilder;
  maybeSingle: () => OptimizedSelectBuilder;
  textSearch: (column: string, query: string) => OptimizedSelectBuilder;
  paginate: (options: PaginationOptions) => OptimizedSelectBuilder;
  execute: () => Promise<any>;
}

interface OptimizedUpdateBuilder {
  eq: (column: string, value: any) => OptimizedUpdateBuilder;
  execute: () => Promise<any>;
}

interface OptimizedDeleteBuilder {
  eq: (column: string, value: any) => OptimizedDeleteBuilder;
  execute: () => Promise<any>;
}

class OptimizedSupabaseService implements OptimizedQueryBuilder {
  private cache = new Map<string, CacheEntry>();
  private cacheStats = {
    hits: 0,
    misses: 0,
  };
  
  private readonly DEFAULT_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly MAX_CACHE_SIZE = 1000;
  private readonly MAX_RETRIES = 3;

  constructor() {
    // Cleanup expired cache entries every 10 minutes
    setInterval(() => this.cleanupExpiredCache(), 10 * 60 * 1000);
    logger.info('🚀 Optimized Supabase Service initialized');
  }

  from(table: string): OptimizedTableBuilder {
    return new OptimizedTableBuilderImpl(table, this);
  }

  async rpc(functionName: string, params: any = {}, options: QueryOptions = {}): Promise<any> {
    const cacheKey = this.generateCacheKey('rpc', functionName, params);
    const trackingId = this.startMonitoring(cacheKey, 'RPC', functionName, options);

    try {
      // Check cache first
      if (options.enableCache !== false) {
        const cached = this.getFromCache(cacheKey);
        if (cached) {
          this.endMonitoring(trackingId, cacheKey, 'RPC', functionName, options, true);
          return cached;
        }
      }

      // Execute with retry logic
      const result = await this.executeWithRetry(async () => {
        const { data, error } = await supabase.rpc(functionName, params);
        if (error) throw error;
        return data;
      }, options.retryCount || this.MAX_RETRIES);

      // Cache successful results
      if (options.enableCache !== false) {
        this.setCache(cacheKey, result, options.cacheTtl || this.DEFAULT_CACHE_TTL);
      }

      this.endMonitoring(trackingId, cacheKey, 'RPC', functionName, options, false, result);
      return result;
    } catch (error) {
      this.endMonitoring(trackingId, cacheKey, 'RPC', functionName, options, false, null, error);
      throw error;
    }
  }

  clearCache(pattern?: string): void {
    if (pattern) {
      // Clear cache entries matching pattern
      const keysToDelete: string[] = [];
      for (const key of this.cache.keys()) {
        if (key.includes(pattern)) {
          keysToDelete.push(key);
        }
      }
      keysToDelete.forEach(key => this.cache.delete(key));
      logger.info(`🧹 Cleared ${keysToDelete.length} cache entries matching pattern: ${pattern}`);
    } else {
      // Clear all cache
      this.cache.clear();
      logger.info('🧹 Cleared all cache entries');
    }
  }

  getCacheStats() {
    const totalRequests = this.cacheStats.hits + this.cacheStats.misses;
    return {
      size: this.cache.size,
      hitRate: totalRequests > 0 ? (this.cacheStats.hits / totalRequests) * 100 : 0,
      entries: Array.from(this.cache.keys()),
    };
  }

  // Internal methods
  private generateCacheKey(operation: string, table: string, params: any): string {
    const paramsKey = typeof params === 'object' ? JSON.stringify(params) : String(params);
    return `${operation}:${table}:${this.hashString(paramsKey)}`;
  }

  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  private getFromCache(key: string): any | null {
    const entry = this.cache.get(key);
    if (!entry) {
      this.cacheStats.misses++;
      return null;
    }

    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      this.cacheStats.misses++;
      return null;
    }

    this.cacheStats.hits++;
    return entry.data;
  }

  private setCache(key: string, data: any, ttl: number): void {
    // Prevent cache from growing too large
    if (this.cache.size >= this.MAX_CACHE_SIZE) {
      // Remove oldest entries (simple LRU)
      const oldestKeys = Array.from(this.cache.entries())
        .sort(([, a], [, b]) => a.timestamp - b.timestamp)
        .slice(0, Math.floor(this.MAX_CACHE_SIZE * 0.1)) // Remove 10% of cache
        .map(([key]) => key);
      
      oldestKeys.forEach(key => this.cache.delete(key));
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      queryKey: key,
      ttl,
    });
  }

  private cleanupExpiredCache(): void {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      logger.info(`🧹 Cleaned ${cleaned} expired cache entries`);
    }
  }

  private startMonitoring(queryKey: string, queryType: any, tableName: string, options: QueryOptions): string {
    return options.enableMonitoring !== false ? 
      queryPerformanceMonitor.startQuery(queryKey, queryType, tableName) : '';
  }

  private endMonitoring(
    trackingId: string, 
    queryKey: string, 
    queryType: any, 
    tableName: string, 
    options: QueryOptions,
    cacheHit: boolean,
    result?: any,
    error?: any
  ): void {
    if (options.enableMonitoring !== false && trackingId) {
      queryPerformanceMonitor.endQuery(trackingId, {
        queryKey,
        queryType,
        tableName,
        recordsAffected: Array.isArray(result) ? result.length : (result ? 1 : 0),
        cacheHit,
        error,
      });
    }
  }

  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = this.MAX_RETRIES
  ): Promise<T> {
    let lastError: any;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error: any) {
        lastError = error;
        
        // Don't retry on certain error types
        if (error?.status >= 400 && error?.status < 500) {
          throw error; // Client errors shouldn't be retried
        }
        
        if (attempt === maxRetries) {
          break; // Max retries reached
        }
        
        // Exponential backoff with jitter
        const delay = Math.min(1000 * Math.pow(2, attempt), 10000) + Math.random() * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
        
        logger.warn(`🔄 Retrying operation, attempt ${attempt + 2}/${maxRetries + 1}`);
      }
    }
    
    throw lastError;
  }
}

class OptimizedTableBuilderImpl implements OptimizedTableBuilder {
  constructor(
    private tableName: string,
    private service: OptimizedSupabaseService
  ) {}

  select(columns: string = '*', options: QueryOptions = {}): OptimizedSelectBuilder {
    return new OptimizedSelectBuilderImpl(
      this.tableName, 
      columns, 
      this.service, 
      { ...options, queryType: 'SELECT' }
    );
  }

  async insert(data: any, options: QueryOptions = {}): Promise<any> {
    const cacheKey = this.service['generateCacheKey']('insert', this.tableName, data);
    const trackingId = this.service['startMonitoring'](cacheKey, 'INSERT', this.tableName, options);

    try {
      const result = await this.service['executeWithRetry'](async () => {
        const { data: result, error } = await supabase.from(this.tableName).insert(data).select();
        if (error) throw error;
        return result;
      });

      // Invalidate related cache entries
      this.service.clearCache(this.tableName);

      this.service['endMonitoring'](trackingId, cacheKey, 'INSERT', this.tableName, options, false, result);
      return result;
    } catch (error) {
      this.service['endMonitoring'](trackingId, cacheKey, 'INSERT', this.tableName, options, false, null, error);
      throw error;
    }
  }

  update(data: any, options: QueryOptions = {}): OptimizedUpdateBuilder {
    return new OptimizedUpdateBuilderImpl(this.tableName, data, this.service, options);
  }

  delete(options: QueryOptions = {}): OptimizedDeleteBuilder {
    return new OptimizedDeleteBuilderImpl(this.tableName, this.service, options);
  }
}

class OptimizedSelectBuilderImpl implements OptimizedSelectBuilder {
  private query: any;
  private queryParams: Record<string, any> = {};

  constructor(
    private tableName: string,
    private columns: string,
    private service: OptimizedSupabaseService,
    private options: QueryOptions
  ) {
    this.query = supabase.from(tableName).select(columns);
  }

  eq(column: string, value: any): OptimizedSelectBuilder {
    this.query = this.query.eq(column, value);
    this.queryParams[`eq_${column}`] = value;
    return this;
  }

  neq(column: string, value: any): OptimizedSelectBuilder {
    this.query = this.query.neq(column, value);
    this.queryParams[`neq_${column}`] = value;
    return this;
  }

  gt(column: string, value: any): OptimizedSelectBuilder {
    this.query = this.query.gt(column, value);
    this.queryParams[`gt_${column}`] = value;
    return this;
  }

  gte(column: string, value: any): OptimizedSelectBuilder {
    this.query = this.query.gte(column, value);
    this.queryParams[`gte_${column}`] = value;
    return this;
  }

  lt(column: string, value: any): OptimizedSelectBuilder {
    this.query = this.query.lt(column, value);
    this.queryParams[`lt_${column}`] = value;
    return this;
  }

  lte(column: string, value: any): OptimizedSelectBuilder {
    this.query = this.query.lte(column, value);
    this.queryParams[`lte_${column}`] = value;
    return this;
  }

  in(column: string, values: any[]): OptimizedSelectBuilder {
    this.query = this.query.in(column, values);
    this.queryParams[`in_${column}`] = values;
    return this;
  }

  like(column: string, pattern: string): OptimizedSelectBuilder {
    this.query = this.query.like(column, pattern);
    this.queryParams[`like_${column}`] = pattern;
    return this;
  }

  ilike(column: string, pattern: string): OptimizedSelectBuilder {
    this.query = this.query.ilike(column, pattern);
    this.queryParams[`ilike_${column}`] = pattern;
    return this;
  }

  order(column: string, options?: { ascending?: boolean }): OptimizedSelectBuilder {
    this.query = this.query.order(column, options);
    this.queryParams[`order_${column}`] = options?.ascending !== false ? 'asc' : 'desc';
    return this;
  }

  limit(count: number): OptimizedSelectBuilder {
    this.query = this.query.limit(count);
    this.queryParams.limit = count;
    return this;
  }

  range(from: number, to: number): OptimizedSelectBuilder {
    this.query = this.query.range(from, to);
    this.queryParams.range = { from, to };
    return this;
  }

  single(): OptimizedSelectBuilder {
    this.query = this.query.single();
    this.queryParams.single = true;
    return this;
  }

  maybeSingle(): OptimizedSelectBuilder {
    this.query = this.query.maybeSingle();
    this.queryParams.maybeSingle = true;
    return this;
  }

  textSearch(column: string, query: string): OptimizedSelectBuilder {
    this.query = this.query.textSearch(column, query);
    this.queryParams[`textSearch_${column}`] = query;
    return this;
  }

  paginate(options: PaginationOptions): OptimizedSelectBuilder {
    const { page = 1, pageSize = 20, sortBy = 'created_at', sortOrder = 'desc' } = options;
    
    this.query = this.query
      .order(sortBy, { ascending: sortOrder === 'asc' })
      .range((page - 1) * pageSize, page * pageSize - 1);
    
    this.queryParams.pagination = options;
    return this;
  }

  async execute(): Promise<any> {
    const cacheKey = this.service['generateCacheKey']('select', this.tableName, {
      columns: this.columns,
      params: this.queryParams,
    });
    
    const trackingId = this.service['startMonitoring'](
      cacheKey, 
      'SELECT', 
      this.tableName, 
      this.options
    );

    try {
      // Check cache first
      if (this.options.enableCache !== false) {
        const cached = this.service['getFromCache'](cacheKey);
        if (cached) {
          this.service['endMonitoring'](
            trackingId, 
            cacheKey, 
            'SELECT', 
            this.tableName, 
            this.options, 
            true
          );
          return cached;
        }
      }

      // Execute query with retry logic
      const result = await this.service['executeWithRetry'](async () => {
        const { data, error } = await this.query;
        if (error) throw error;
        return data;
      });

      // Cache successful results
      if (this.options.enableCache !== false) {
        this.service['setCache'](
          cacheKey, 
          result, 
          this.options.cacheTtl || this.service['DEFAULT_CACHE_TTL']
        );
      }

      this.service['endMonitoring'](
        trackingId, 
        cacheKey, 
        'SELECT', 
        this.tableName, 
        this.options, 
        false, 
        result
      );
      return result;
    } catch (error) {
      this.service['endMonitoring'](
        trackingId, 
        cacheKey, 
        'SELECT', 
        this.tableName, 
        this.options, 
        false, 
        null, 
        error
      );
      throw error;
    }
  }
}

class OptimizedUpdateBuilderImpl implements OptimizedUpdateBuilder {
  private query: any;

  constructor(
    private tableName: string,
    private data: any,
    private service: OptimizedSupabaseService,
    private options: QueryOptions
  ) {
    this.query = supabase.from(tableName).update(data);
  }

  eq(column: string, value: any): OptimizedUpdateBuilder {
    this.query = this.query.eq(column, value);
    return this;
  }

  async execute(): Promise<any> {
    const cacheKey = this.service['generateCacheKey']('update', this.tableName, this.data);
    const trackingId = this.service['startMonitoring'](cacheKey, 'UPDATE', this.tableName, this.options);

    try {
      const result = await this.service['executeWithRetry'](async () => {
        const { data: result, error } = await this.query.select();
        if (error) throw error;
        return result;
      });

      // Invalidate related cache entries
      this.service.clearCache(this.tableName);

      this.service['endMonitoring'](trackingId, cacheKey, 'UPDATE', this.tableName, this.options, false, result);
      return result;
    } catch (error) {
      this.service['endMonitoring'](trackingId, cacheKey, 'UPDATE', this.tableName, this.options, false, null, error);
      throw error;
    }
  }
}

class OptimizedDeleteBuilderImpl implements OptimizedDeleteBuilder {
  private query: any;

  constructor(
    private tableName: string,
    private service: OptimizedSupabaseService,
    private options: QueryOptions
  ) {
    this.query = supabase.from(tableName).delete();
  }

  eq(column: string, value: any): OptimizedDeleteBuilder {
    this.query = this.query.eq(column, value);
    return this;
  }

  async execute(): Promise<any> {
    const cacheKey = this.service['generateCacheKey']('delete', this.tableName, {});
    const trackingId = this.service['startMonitoring'](cacheKey, 'DELETE', this.tableName, this.options);

    try {
      const result = await this.service['executeWithRetry'](async () => {
        const { data: result, error } = await this.query.select();
        if (error) throw error;
        return result;
      });

      // Invalidate related cache entries
      this.service.clearCache(this.tableName);

      this.service['endMonitoring'](trackingId, cacheKey, 'DELETE', this.tableName, this.options, false, result);
      return result;
    } catch (error) {
      this.service['endMonitoring'](trackingId, cacheKey, 'DELETE', this.tableName, this.options, false, null, error);
      throw error;
    }
  }
}

// Create and export singleton instance
export const optimizedSupabase = new OptimizedSupabaseService();

// Export for migration purposes - allows gradual adoption
export { OptimizedSupabaseService };

export default optimizedSupabase;