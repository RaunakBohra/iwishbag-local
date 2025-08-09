/**
 * Optimized Pagination System
 * 
 * Provides cursor-based and offset-based pagination with intelligent prefetching
 * and caching for better performance on large datasets.
 */

interface PaginationConfig {
  pageSize: number;
  prefetchPages: number; // Number of pages to prefetch ahead
  cachePages: number;    // Number of pages to keep in cache
  cursorColumn?: string; // Column to use for cursor-based pagination
  sortOrder: 'asc' | 'desc';
}

interface PaginationState<T = any> {
  currentPage: number;
  totalPages?: number;
  totalItems?: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  items: T[];
  cursor?: string;
  loading: boolean;
  error?: string;
}

interface PaginationResult<T = any> {
  data: T[];
  pagination: {
    currentPage: number;
    totalItems?: number;
    totalPages?: number;
    hasNext: boolean;
    hasPrev: boolean;
    nextCursor?: string;
    prevCursor?: string;
  };
}

interface QueryBuilder {
  from: (table: string) => any;
  select: (columns: string) => any;
  order: (column: string, options?: any) => any;
  limit: (count: number) => any;
  range: (from: number, to: number) => any;
  gt?: (column: string, value: any) => any;
  lt?: (column: string, value: any) => any;
}

class OptimizedPagination<T = any> {
  private cache = new Map<string, { data: T[]; timestamp: number; totalCount?: number }>();
  private prefetchQueue: Array<{ page: number; promise: Promise<any> }> = [];
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor(
    private config: PaginationConfig,
    private queryBuilder: QueryBuilder,
    private tableName: string
  ) {}

  /**
   * Get paginated data with intelligent caching and prefetching
   */
  async getPaginatedData(
    page: number = 1,
    additionalFilters?: Record<string, any>
  ): Promise<PaginationResult<T>> {
    const cacheKey = this.generateCacheKey(page, additionalFilters);
    
    // Check cache first
    const cached = this.getCachedData(cacheKey);
    if (cached) {
      // Trigger prefetch for next pages in background
      this.triggerPrefetch(page, additionalFilters);
      
      return {
        data: cached.data,
        pagination: this.calculatePagination(page, cached.data.length, cached.totalCount),
      };
    }

    // Execute query
    const result = await this.executeQuery(page, additionalFilters);
    
    // Cache the result
    this.setCacheData(cacheKey, result.data, result.totalCount);
    
    // Trigger prefetch for next pages
    this.triggerPrefetch(page, additionalFilters);
    
    return {
      data: result.data,
      pagination: this.calculatePagination(page, result.data.length, result.totalCount),
    };
  }

  /**
   * Get paginated data using cursor-based pagination (more efficient for large datasets)
   */
  async getCursorPaginatedData(
    cursor?: string,
    direction: 'next' | 'prev' = 'next',
    additionalFilters?: Record<string, any>
  ): Promise<PaginationResult<T>> {
    if (!this.config.cursorColumn) {
      throw new Error('Cursor column not configured for cursor-based pagination');
    }

    const cacheKey = this.generateCursorCacheKey(cursor, direction, additionalFilters);
    
    // Check cache first
    const cached = this.getCachedData(cacheKey);
    if (cached) {
      return {
        data: cached.data,
        pagination: this.calculateCursorPagination(cached.data, direction),
      };
    }

    // Build query with cursor
    let query = this.queryBuilder
      .from(this.tableName)
      .select('*')
      .order(this.config.cursorColumn, { ascending: this.config.sortOrder === 'asc' })
      .limit(this.config.pageSize + 1); // +1 to detect if there are more records

    // Apply cursor filter
    if (cursor) {
      if (direction === 'next') {
        query = this.config.sortOrder === 'asc' 
          ? query.gt(this.config.cursorColumn, cursor)
          : query.lt(this.config.cursorColumn, cursor);
      } else {
        query = this.config.sortOrder === 'asc'
          ? query.lt(this.config.cursorColumn, cursor)
          : query.gt(this.config.cursorColumn, cursor);
      }
    }

    // Apply additional filters
    if (additionalFilters) {
      query = this.applyFilters(query, additionalFilters);
    }

    const { data, error } = await query;
    if (error) throw error;

    // Determine if there are more pages
    const hasMore = data.length > this.config.pageSize;
    const items = hasMore ? data.slice(0, this.config.pageSize) : data;

    // Cache the result
    this.setCacheData(cacheKey, items);

    return {
      data: items,
      pagination: this.calculateCursorPagination(items, direction, hasMore),
    };
  }

  /**
   * Prefetch specific page
   */
  async prefetchPage(page: number, additionalFilters?: Record<string, any>): Promise<void> {
    const cacheKey = this.generateCacheKey(page, additionalFilters);
    
    // Skip if already cached or being prefetched
    if (this.getCachedData(cacheKey) || this.isPrefetching(page)) {
      return;
    }

    const prefetchPromise = this.executeQuery(page, additionalFilters)
      .then(result => {
        this.setCacheData(cacheKey, result.data, result.totalCount);
        this.removePrefetchEntry(page);
      })
      .catch(error => {
        console.warn(`Prefetch failed for page ${page}:`, error);
        this.removePrefetchEntry(page);
      });

    this.prefetchQueue.push({ page, promise: prefetchPromise });
  }

  /**
   * Clear cache for specific filters or all cache
   */
  clearCache(filterPattern?: string): void {
    if (filterPattern) {
      const keysToDelete: string[] = [];
      for (const key of this.cache.keys()) {
        if (key.includes(filterPattern)) {
          keysToDelete.push(key);
        }
      }
      keysToDelete.forEach(key => this.cache.delete(key));
    } else {
      this.cache.clear();
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    const now = Date.now();
    let validEntries = 0;
    let expiredEntries = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.CACHE_TTL) {
        expiredEntries++;
      } else {
        validEntries++;
      }
    }

    return {
      totalEntries: this.cache.size,
      validEntries,
      expiredEntries,
      prefetchQueueSize: this.prefetchQueue.length,
    };
  }

  private async executeQuery(
    page: number, 
    additionalFilters?: Record<string, any>
  ): Promise<{ data: T[]; totalCount?: number }> {
    const offset = (page - 1) * this.config.pageSize;
    
    // Build the main query
    let query = this.queryBuilder
      .from(this.tableName)
      .select('*')
      .order('created_at', { ascending: this.config.sortOrder === 'asc' })
      .range(offset, offset + this.config.pageSize - 1);

    // Apply additional filters
    if (additionalFilters) {
      query = this.applyFilters(query, additionalFilters);
    }

    // Execute main query
    const { data, error } = await query;
    if (error) throw error;

    // Get total count for first page (expensive operation, so we cache it)
    let totalCount: number | undefined;
    if (page === 1) {
      const countCacheKey = `count:${this.generateFilterKey(additionalFilters)}`;
      const cachedCount = this.getCachedData(countCacheKey);
      
      if (cachedCount && cachedCount.totalCount !== undefined) {
        totalCount = cachedCount.totalCount;
      } else {
        // Execute count query
        let countQuery = this.queryBuilder
          .from(this.tableName)
          .select('*', { count: 'exact', head: true });
        
        if (additionalFilters) {
          countQuery = this.applyFilters(countQuery, additionalFilters);
        }

        const { count, error: countError } = await countQuery;
        if (!countError && count !== null) {
          totalCount = count;
          // Cache the count for 10 minutes
          this.setCacheData(countCacheKey, [], totalCount, 10 * 60 * 1000);
        }
      }
    }

    return { data, totalCount };
  }

  private applyFilters(query: any, filters: Record<string, any>): any {
    for (const [column, value] of Object.entries(filters)) {
      if (value === null || value === undefined) continue;
      
      if (Array.isArray(value)) {
        query = query.in(column, value);
      } else if (typeof value === 'object' && value.operator) {
        // Support for complex filters like { operator: 'gte', value: '2023-01-01' }
        switch (value.operator) {
          case 'eq':
            query = query.eq(column, value.value);
            break;
          case 'neq':
            query = query.neq(column, value.value);
            break;
          case 'gt':
            query = query.gt(column, value.value);
            break;
          case 'gte':
            query = query.gte(column, value.value);
            break;
          case 'lt':
            query = query.lt(column, value.value);
            break;
          case 'lte':
            query = query.lte(column, value.value);
            break;
          case 'like':
            query = query.like(column, value.value);
            break;
          case 'ilike':
            query = query.ilike(column, value.value);
            break;
        }
      } else {
        query = query.eq(column, value);
      }
    }
    return query;
  }

  private calculatePagination(
    currentPage: number, 
    currentPageSize: number, 
    totalCount?: number
  ) {
    const totalPages = totalCount ? Math.ceil(totalCount / this.config.pageSize) : undefined;
    
    return {
      currentPage,
      totalItems: totalCount,
      totalPages,
      hasNext: totalPages ? currentPage < totalPages : currentPageSize === this.config.pageSize,
      hasPrev: currentPage > 1,
    };
  }

  private calculateCursorPagination(
    items: T[], 
    direction: 'next' | 'prev',
    hasMore?: boolean
  ) {
    const nextCursor = items.length > 0 && this.config.cursorColumn ? 
      (items[items.length - 1] as any)[this.config.cursorColumn] : undefined;
    const prevCursor = items.length > 0 && this.config.cursorColumn ?
      (items[0] as any)[this.config.cursorColumn] : undefined;

    return {
      currentPage: 1, // Not applicable for cursor pagination
      hasNext: hasMore !== undefined ? hasMore : items.length === this.config.pageSize,
      hasPrev: direction === 'next', // Simplified assumption
      nextCursor,
      prevCursor,
    };
  }

  private triggerPrefetch(currentPage: number, additionalFilters?: Record<string, any>): void {
    // Prefetch next pages in background
    for (let i = 1; i <= this.config.prefetchPages; i++) {
      const nextPage = currentPage + i;
      this.prefetchPage(nextPage, additionalFilters).catch(() => {
        // Ignore prefetch errors
      });
    }
  }

  private generateCacheKey(page: number, additionalFilters?: Record<string, any>): string {
    const filterKey = this.generateFilterKey(additionalFilters);
    return `${this.tableName}:page:${page}:${filterKey}`;
  }

  private generateCursorCacheKey(
    cursor?: string, 
    direction: 'next' | 'prev' = 'next',
    additionalFilters?: Record<string, any>
  ): string {
    const filterKey = this.generateFilterKey(additionalFilters);
    return `${this.tableName}:cursor:${cursor || 'start'}:${direction}:${filterKey}`;
  }

  private generateFilterKey(additionalFilters?: Record<string, any>): string {
    if (!additionalFilters || Object.keys(additionalFilters).length === 0) {
      return 'no-filters';
    }
    
    // Create a consistent key from filters
    const sortedFilters = Object.entries(additionalFilters)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}:${JSON.stringify(value)}`)
      .join('|');
    
    // Hash the key to keep it manageable
    let hash = 0;
    for (let i = 0; i < sortedFilters.length; i++) {
      const char = sortedFilters.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return Math.abs(hash).toString(36);
  }

  private getCachedData(key: string) {
    const cached = this.cache.get(key);
    if (!cached) return null;
    
    if (Date.now() - cached.timestamp > this.CACHE_TTL) {
      this.cache.delete(key);
      return null;
    }
    
    return cached;
  }

  private setCacheData(
    key: string, 
    data: T[], 
    totalCount?: number,
    customTtl?: number
  ): void {
    // Prevent cache from growing too large
    if (this.cache.size >= this.config.cachePages * 2) {
      // Remove oldest entries
      const sortedEntries = Array.from(this.cache.entries())
        .sort(([, a], [, b]) => a.timestamp - b.timestamp);
      
      const toRemove = sortedEntries.slice(0, Math.floor(this.cache.size * 0.2));
      toRemove.forEach(([key]) => this.cache.delete(key));
    }

    this.cache.set(key, {
      data,
      totalCount,
      timestamp: Date.now(),
    });
  }

  private isPrefetching(page: number): boolean {
    return this.prefetchQueue.some(entry => entry.page === page);
  }

  private removePrefetchEntry(page: number): void {
    const index = this.prefetchQueue.findIndex(entry => entry.page === page);
    if (index > -1) {
      this.prefetchQueue.splice(index, 1);
    }
  }
}

/**
 * Factory function to create optimized pagination instances
 */
export function createOptimizedPagination<T = any>(
  config: Partial<PaginationConfig>,
  queryBuilder: QueryBuilder,
  tableName: string
): OptimizedPagination<T> {
  const defaultConfig: PaginationConfig = {
    pageSize: 20,
    prefetchPages: 2,
    cachePages: 10,
    sortOrder: 'desc',
  };

  return new OptimizedPagination<T>(
    { ...defaultConfig, ...config },
    queryBuilder,
    tableName
  );
}

/**
 * Hook for optimized pagination in React components
 */
export function useOptimizedPagination<T = any>(
  config: Partial<PaginationConfig>,
  queryBuilder: QueryBuilder,
  tableName: string,
  initialFilters?: Record<string, any>
) {
  const [state, setState] = React.useState<PaginationState<T>>({
    currentPage: 1,
    hasNextPage: false,
    hasPrevPage: false,
    items: [],
    loading: false,
  });

  const paginationInstance = React.useMemo(
    () => createOptimizedPagination<T>(config, queryBuilder, tableName),
    [config, queryBuilder, tableName]
  );

  const loadPage = React.useCallback(async (
    page: number,
    filters?: Record<string, any>
  ) => {
    setState(prev => ({ ...prev, loading: true, error: undefined }));
    
    try {
      const result = await paginationInstance.getPaginatedData(page, filters);
      setState(prev => ({
        ...prev,
        currentPage: page,
        items: result.data,
        hasNextPage: result.pagination.hasNext,
        hasPrevPage: result.pagination.hasPrev,
        totalPages: result.pagination.totalPages,
        totalItems: result.pagination.totalItems,
        loading: false,
      }));
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error.message || 'Failed to load data',
      }));
    }
  }, [paginationInstance]);

  // Load initial data
  React.useEffect(() => {
    loadPage(1, initialFilters);
  }, [loadPage, initialFilters]);

  return {
    ...state,
    loadPage,
    nextPage: () => state.hasNextPage && loadPage(state.currentPage + 1, initialFilters),
    prevPage: () => state.hasPrevPage && loadPage(state.currentPage - 1, initialFilters),
    clearCache: paginationInstance.clearCache.bind(paginationInstance),
    getCacheStats: paginationInstance.getCacheStats.bind(paginationInstance),
  };
}

// React import for the hook (conditional to avoid errors in non-React environments)
let React: any;
try {
  React = require('react');
} catch {
  // React not available, hook won't work but other functions will
}

export { OptimizedPagination, type PaginationConfig, type PaginationResult, type PaginationState };
export default OptimizedPagination;