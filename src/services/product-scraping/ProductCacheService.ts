/**
 * Product Cache Service
 * Handles caching of scraped product data for performance optimization
 * Extracted from BrightDataProductService for better maintainability
 */

import { FetchResult } from '../ProductDataFetchService';

export interface CacheEntry {
  data: FetchResult;
  timestamp: number;
  expiresAt: number;
  url: string;
  platform: string;
}

export interface CacheConfig {
  defaultTimeout?: number; // Default cache timeout in milliseconds
  maxEntries?: number; // Maximum number of entries to keep in cache
  platformSpecificTimeouts?: Record<string, number>; // Platform-specific timeouts
}

export interface CacheStats {
  totalEntries: number;
  hitCount: number;
  missCount: number;
  hitRatio: number;
  oldestEntry?: Date;
  newestEntry?: Date;
  cacheSize: number; // Approximate size in bytes
}

export class ProductCacheService {
  private static instance: ProductCacheService;
  private cache: Map<string, CacheEntry> = new Map();
  private config: Required<CacheConfig>;
  private stats: { hits: number; misses: number } = { hits: 0, misses: 0 };

  private constructor(config: CacheConfig = {}) {
    this.config = {
      defaultTimeout: config.defaultTimeout || 30 * 60 * 1000, // 30 minutes default
      maxEntries: config.maxEntries || 1000, // Max 1000 entries
      platformSpecificTimeouts: config.platformSpecificTimeouts || {
        // Fashion platforms cache longer due to less frequent price changes
        'zara': 60 * 60 * 1000, // 1 hour
        'hm': 60 * 60 * 1000, // 1 hour
        'asos': 60 * 60 * 1000, // 1 hour
        'ae': 2 * 60 * 60 * 1000, // 2 hours (longer scraping time)
        // E-commerce platforms with frequent price changes
        'amazon': 15 * 60 * 1000, // 15 minutes
        'ebay': 10 * 60 * 1000, // 10 minutes
        'walmart': 20 * 60 * 1000, // 20 minutes
        'bestbuy': 20 * 60 * 1000, // 20 minutes
        'target': 20 * 60 * 1000, // 20 minutes
        'flipkart': 15 * 60 * 1000, // 15 minutes
        // Luxury platforms cache longer (price stability)
        'hermes': 4 * 60 * 60 * 1000, // 4 hours
        'prada': 4 * 60 * 60 * 1000, // 4 hours
        'dior': 4 * 60 * 60 * 1000, // 4 hours
        'chanel': 4 * 60 * 60 * 1000, // 4 hours
        'balenciaga': 4 * 60 * 60 * 1000, // 4 hours
        'ysl': 4 * 60 * 60 * 1000, // 4 hours
        // Specialty platforms
        'etsy': 2 * 60 * 60 * 1000, // 2 hours (handmade items change less frequently)
        'lego': 6 * 60 * 60 * 1000, // 6 hours (product catalog stable)
        'toysrus': 60 * 60 * 1000, // 1 hour
        'carters': 2 * 60 * 60 * 1000, // 2 hours
        'myntra': 30 * 60 * 1000 // 30 minutes
      }
    };
  }

  static getInstance(config?: CacheConfig): ProductCacheService {
    if (!ProductCacheService.instance) {
      ProductCacheService.instance = new ProductCacheService(config);
    }
    return ProductCacheService.instance;
  }

  /**
   * Generate cache key from URL
   */
  private generateCacheKey(url: string): string {
    try {
      // Normalize URL to avoid duplicate caches for same product
      const urlObj = new URL(url);
      
      // Remove tracking parameters and sort query parameters
      const ignoredParams = [
        'ref', 'tag', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
        '_ga', '_gid', 'fbclid', 'gclid', 'mc_eid', 'mc_cid', 'ssaid', 'source'
      ];
      
      const searchParams = new URLSearchParams(urlObj.search);
      ignoredParams.forEach(param => searchParams.delete(param));
      
      // Sort parameters for consistent key generation
      const sortedParams = new URLSearchParams([...searchParams.entries()].sort());
      
      // Create normalized URL
      const normalizedUrl = `${urlObj.protocol}//${urlObj.hostname}${urlObj.pathname}${sortedParams.toString() ? '?' + sortedParams.toString() : ''}`;
      
      return this.hashString(normalizedUrl);
    } catch (error) {
      // Fallback to simple hash if URL parsing fails
      return this.hashString(url);
    }
  }

  /**
   * Simple hash function for generating cache keys
   */
  private hashString(str: string): string {
    let hash = 0;
    if (str.length === 0) return hash.toString();
    
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return Math.abs(hash).toString(36);
  }

  /**
   * Get cache timeout for a specific platform
   */
  private getCacheTimeout(platform: string): number {
    return this.config.platformSpecificTimeouts[platform] || this.config.defaultTimeout;
  }

  /**
   * Store data in cache
   */
  set(url: string, data: FetchResult, platform: string): void {
    // Clean up expired entries if cache is getting full
    if (this.cache.size >= this.config.maxEntries * 0.9) {
      this.cleanupExpiredEntries();
    }

    // If still at max capacity, remove oldest entries
    if (this.cache.size >= this.config.maxEntries) {
      this.removeOldestEntries(Math.floor(this.config.maxEntries * 0.1));
    }

    const cacheKey = this.generateCacheKey(url);
    const timeout = this.getCacheTimeout(platform);
    const now = Date.now();
    
    const entry: CacheEntry = {
      data,
      timestamp: now,
      expiresAt: now + timeout,
      url,
      platform
    };
    
    this.cache.set(cacheKey, entry);
  }

  /**
   * Get data from cache
   */
  get(url: string): FetchResult | null {
    const cacheKey = this.generateCacheKey(url);
    const entry = this.cache.get(cacheKey);
    
    if (!entry) {
      this.stats.misses++;
      return null;
    }
    
    // Check if entry has expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(cacheKey);
      this.stats.misses++;
      return null;
    }
    
    this.stats.hits++;
    return entry.data;
  }

  /**
   * Check if URL is cached and valid
   */
  has(url: string): boolean {
    const cacheKey = this.generateCacheKey(url);
    const entry = this.cache.get(cacheKey);
    
    if (!entry) return false;
    
    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(cacheKey);
      return false;
    }
    
    return true;
  }

  /**
   * Remove entry from cache
   */
  delete(url: string): boolean {
    const cacheKey = this.generateCacheKey(url);
    return this.cache.delete(cacheKey);
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
    this.stats = { hits: 0, misses: 0 };
  }

  /**
   * Remove expired entries from cache
   */
  cleanupExpiredEntries(): number {
    const now = Date.now();
    let removedCount = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        removedCount++;
      }
    }
    
    return removedCount;
  }

  /**
   * Remove oldest entries to free up space
   */
  removeOldestEntries(count: number): number {
    // Convert to array and sort by timestamp
    const entries = Array.from(this.cache.entries()).sort(
      ([, a], [, b]) => a.timestamp - b.timestamp
    );
    
    let removedCount = 0;
    for (let i = 0; i < Math.min(count, entries.length); i++) {
      const [key] = entries[i];
      this.cache.delete(key);
      removedCount++;
    }
    
    return removedCount;
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const totalRequests = this.stats.hits + this.stats.misses;
    const hitRatio = totalRequests > 0 ? this.stats.hits / totalRequests : 0;
    
    let oldestEntry: Date | undefined;
    let newestEntry: Date | undefined;
    let cacheSize = 0;
    
    if (this.cache.size > 0) {
      const timestamps = Array.from(this.cache.values()).map(entry => entry.timestamp);
      oldestEntry = new Date(Math.min(...timestamps));
      newestEntry = new Date(Math.max(...timestamps));
      
      // Rough estimation of cache size
      cacheSize = Array.from(this.cache.values()).reduce((size, entry) => {
        return size + JSON.stringify(entry).length * 2; // Rough byte estimation
      }, 0);
    }
    
    return {
      totalEntries: this.cache.size,
      hitCount: this.stats.hits,
      missCount: this.stats.misses,
      hitRatio,
      oldestEntry,
      newestEntry,
      cacheSize
    };
  }

  /**
   * Get all cache entries for a specific platform
   */
  getEntriesByPlatform(platform: string): CacheEntry[] {
    return Array.from(this.cache.values()).filter(entry => entry.platform === platform);
  }

  /**
   * Invalidate cache entries for a specific platform
   */
  invalidatePlatform(platform: string): number {
    let removedCount = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.platform === platform) {
        this.cache.delete(key);
        removedCount++;
      }
    }
    
    return removedCount;
  }

  /**
   * Set cache timeout for a specific platform
   */
  setPlatformTimeout(platform: string, timeoutMs: number): void {
    this.config.platformSpecificTimeouts[platform] = timeoutMs;
  }

  /**
   * Get cache configuration
   */
  getConfig(): Required<CacheConfig> {
    return { ...this.config };
  }

  /**
   * Update cache configuration
   */
  updateConfig(newConfig: Partial<CacheConfig>): void {
    this.config = {
      ...this.config,
      ...newConfig,
      platformSpecificTimeouts: {
        ...this.config.platformSpecificTimeouts,
        ...newConfig.platformSpecificTimeouts
      }
    };
  }

  /**
   * Preload cache with data (useful for warming up cache)
   */
  preload(entries: Array<{ url: string; data: FetchResult; platform: string }>): void {
    entries.forEach(({ url, data, platform }) => {
      this.set(url, data, platform);
    });
  }

  /**
   * Export cache data for persistence
   */
  export(): Array<CacheEntry> {
    return Array.from(this.cache.values());
  }

  /**
   * Import cache data from persistence
   */
  import(entries: Array<CacheEntry>): void {
    const now = Date.now();
    
    entries.forEach(entry => {
      // Only import non-expired entries
      if (entry.expiresAt > now) {
        const cacheKey = this.generateCacheKey(entry.url);
        this.cache.set(cacheKey, entry);
      }
    });
  }
}