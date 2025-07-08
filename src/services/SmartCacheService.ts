import { getExchangeRate, ExchangeRateResult } from '@/lib/currencyUtils';

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  accessCount: number;
  lastAccessed: number;
  ttl: number; // Time to live in milliseconds
}

export interface CacheStats {
  totalEntries: number;
  totalHits: number;
  totalMisses: number;
  hitRate: number;
  averageAccessTime: number;
  cacheSize: number;
  oldestEntry: number;
  newestEntry: number;
}

export interface CacheConfig {
  defaultTTL: number;
  maxSize: number;
  cleanupInterval: number;
  prefetchThreshold: number; // Prefetch when entry is this close to expiry (0-1)
}

/**
 * Smart caching service with LRU eviction, automatic cleanup, and prefetching
 */
export class SmartCacheService<T> {
  private cache = new Map<string, CacheEntry<T>>();
  private accessTimes: number[] = [];
  private stats = {
    totalHits: 0,
    totalMisses: 0,
    totalAccessTime: 0
  };
  private cleanupTimer?: NodeJS.Timeout;
  private prefetchCallbacks = new Map<string, () => Promise<T>>();

  constructor(private config: CacheConfig) {
    this.startCleanupTimer();
  }

  /**
   * Get value from cache or execute provider function
   */
  async get<K extends T>(
    key: string, 
    provider: () => Promise<K>, 
    customTTL?: number
  ): Promise<K> {
    const startTime = Date.now();
    
    try {
      // Check cache first
      const cached = this.cache.get(key);
      
      if (cached && this.isValid(cached)) {
        // Update access statistics
        cached.accessCount++;
        cached.lastAccessed = Date.now();
        this.stats.totalHits++;
        
        // Check if we should prefetch (refresh before expiry)
        this.schedulePrefetchIfNeeded(key, provider, customTTL);
        
        console.log(`[SmartCache] Cache HIT for key: ${key}`);
        return cached.data as K;
      }

      // Cache miss - fetch new data
      this.stats.totalMisses++;
      console.log(`[SmartCache] Cache MISS for key: ${key}`);
      
      const data = await provider();
      
      // Store in cache
      this.set(key, data, customTTL);
      
      return data;

    } finally {
      const accessTime = Date.now() - startTime;
      this.updateAccessTimeStats(accessTime);
    }
  }

  /**
   * Set value in cache
   */
  set(key: string, data: T, customTTL?: number): void {
    const ttl = customTTL || this.config.defaultTTL;
    
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      accessCount: 1,
      lastAccessed: Date.now(),
      ttl
    };

    // Check if we need to make room
    if (this.cache.size >= this.config.maxSize) {
      this.evictLRU();
    }

    this.cache.set(key, entry);
    console.log(`[SmartCache] Cached data for key: ${key}, TTL: ${ttl}ms`);
  }

  /**
   * Check if cache entry is still valid
   */
  private isValid(entry: CacheEntry<T>): boolean {
    return (Date.now() - entry.timestamp) < entry.ttl;
  }

  /**
   * Schedule prefetch if entry is close to expiry
   */
  private schedulePrefetchIfNeeded<K extends T>(
    key: string, 
    provider: () => Promise<K>, 
    customTTL?: number
  ): void {
    const entry = this.cache.get(key);
    if (!entry) return;

    const age = Date.now() - entry.timestamp;
    const ageRatio = age / entry.ttl;

    if (ageRatio >= this.config.prefetchThreshold) {
      // Schedule prefetch
      setTimeout(async () => {
        try {
          console.log(`[SmartCache] Prefetching data for key: ${key}`);
          const freshData = await provider();
          this.set(key, freshData, customTTL);
        } catch (error) {
          console.warn(`[SmartCache] Prefetch failed for key: ${key}`, error);
        }
      }, 0);
    }
  }

  /**
   * Evict least recently used entry
   */
  private evictLRU(): void {
    let lruKey: string | null = null;
    let lruTime = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessed < lruTime) {
        lruTime = entry.lastAccessed;
        lruKey = key;
      }
    }

    if (lruKey) {
      console.log(`[SmartCache] Evicting LRU entry: ${lruKey}`);
      this.cache.delete(lruKey);
      this.prefetchCallbacks.delete(lruKey);
    }
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (!this.isValid(entry)) {
        expiredKeys.push(key);
      }
    }

    expiredKeys.forEach(key => {
      console.log(`[SmartCache] Cleaning up expired entry: ${key}`);
      this.cache.delete(key);
      this.prefetchCallbacks.delete(key);
    });

    if (expiredKeys.length > 0) {
      console.log(`[SmartCache] Cleaned up ${expiredKeys.length} expired entries`);
    }
  }

  /**
   * Start automatic cleanup timer
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.config.cleanupInterval);
  }

  /**
   * Update access time statistics
   */
  private updateAccessTimeStats(accessTime: number): void {
    this.accessTimes.push(accessTime);
    
    // Keep only last 100 access times for moving average
    if (this.accessTimes.length > 100) {
      this.accessTimes.shift();
    }

    this.stats.totalAccessTime += accessTime;
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const totalRequests = this.stats.totalHits + this.stats.totalMisses;
    const hitRate = totalRequests > 0 ? (this.stats.totalHits / totalRequests) * 100 : 0;
    
    const averageAccessTime = this.accessTimes.length > 0 
      ? this.accessTimes.reduce((sum, time) => sum + time, 0) / this.accessTimes.length 
      : 0;

    let oldestEntry = Date.now();
    let newestEntry = 0;

    for (const entry of this.cache.values()) {
      oldestEntry = Math.min(oldestEntry, entry.timestamp);
      newestEntry = Math.max(newestEntry, entry.timestamp);
    }

    return {
      totalEntries: this.cache.size,
      totalHits: this.stats.totalHits,
      totalMisses: this.stats.totalMisses,
      hitRate,
      averageAccessTime,
      cacheSize: this.cache.size,
      oldestEntry: this.cache.size > 0 ? oldestEntry : 0,
      newestEntry: this.cache.size > 0 ? newestEntry : 0
    };
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
    this.prefetchCallbacks.clear();
    this.accessTimes = [];
    this.stats = {
      totalHits: 0,
      totalMisses: 0,
      totalAccessTime: 0
    };
    console.log('[SmartCache] Cache cleared');
  }

  /**
   * Get cache size
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Check if key exists in cache
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    return entry ? this.isValid(entry) : false;
  }

  /**
   * Delete specific cache entry
   */
  delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    this.prefetchCallbacks.delete(key);
    return deleted;
  }

  /**
   * Get all cache keys
   */
  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * Destroy cache and cleanup timers
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    this.clear();
  }
}

/**
 * Specialized cache for exchange rates
 */
export class ExchangeRateCache {
  private smartCache: SmartCacheService<ExchangeRateResult>;
  private prefetchQueue = new Set<string>();

  constructor() {
    this.smartCache = new SmartCacheService<ExchangeRateResult>({
      defaultTTL: 15 * 60 * 1000, // 15 minutes
      maxSize: 100, // Store up to 100 exchange rate pairs
      cleanupInterval: 5 * 60 * 1000, // Cleanup every 5 minutes
      prefetchThreshold: 0.8 // Prefetch when 80% of TTL has passed
    });

    // Prefetch common exchange rates on initialization
    this.prefetchCommonRates();
  }

  /**
   * Get exchange rate with caching
   */
  async getExchangeRate(fromCountry: string, toCountry: string): Promise<ExchangeRateResult> {
    const cacheKey = `${fromCountry}-${toCountry}`;
    
    return this.smartCache.get(cacheKey, async () => {
      console.log(`[ExchangeRateCache] Fetching fresh rate: ${fromCountry} → ${toCountry}`);
      return await getExchangeRate(fromCountry, toCountry);
    });
  }

  /**
   * Prefetch common exchange rate pairs
   */
  private async prefetchCommonRates(): void {
    const commonPairs = [
      ['US', 'IN'], ['US', 'NP'], ['US', 'CA'], ['US', 'AU'], ['US', 'GB'], ['US', 'JP'],
      ['IN', 'US'], ['IN', 'NP'], ['IN', 'CA'], ['IN', 'AU'],
      ['CN', 'US'], ['CN', 'IN'], ['CN', 'NP'],
      ['GB', 'US'], ['GB', 'IN'], ['GB', 'EU']
    ];

    console.log('[ExchangeRateCache] Prefetching common exchange rates...');

    // Prefetch with delay to avoid overwhelming the API
    for (const [from, to] of commonPairs) {
      if (!this.prefetchQueue.has(`${from}-${to}`)) {
        this.prefetchQueue.add(`${from}-${to}`);
        
        setTimeout(async () => {
          try {
            await this.getExchangeRate(from, to);
            this.prefetchQueue.delete(`${from}-${to}`);
          } catch (error) {
            console.warn(`[ExchangeRateCache] Failed to prefetch ${from}-${to}:`, error);
            this.prefetchQueue.delete(`${from}-${to}`);
          }
        }, Math.random() * 5000); // Random delay 0-5 seconds
      }
    }
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return this.smartCache.getStats();
  }

  /**
   * Clear cache
   */
  clear(): void {
    this.smartCache.clear();
    this.prefetchQueue.clear();
  }

  /**
   * Warm up cache with specific rates
   */
  async warmUp(ratePairs: Array<[string, string]>): Promise<void> {
    console.log(`[ExchangeRateCache] Warming up cache with ${ratePairs.length} rate pairs...`);
    
    const promises = ratePairs.map(async ([from, to]) => {
      try {
        await this.getExchangeRate(from, to);
      } catch (error) {
        console.warn(`[ExchangeRateCache] Failed to warm up ${from}-${to}:`, error);
      }
    });

    await Promise.allSettled(promises);
    console.log('[ExchangeRateCache] Cache warm-up completed');
  }
}

// Create singleton instances
export const exchangeRateCache = new ExchangeRateCache();

// General purpose cache for calculations and other data
export const generalCache = new SmartCacheService<any>({
  defaultTTL: 10 * 60 * 1000, // 10 minutes default
  maxSize: 200,
  cleanupInterval: 3 * 60 * 1000, // Cleanup every 3 minutes
  prefetchThreshold: 0.75
});