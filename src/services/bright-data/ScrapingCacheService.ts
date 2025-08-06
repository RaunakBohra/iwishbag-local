/**
 * Scraping Cache Service
 * Intelligent caching system for scraped product data with TTL and invalidation
 * Decomposed from BrightDataProductService for better separation of concerns
 */

import { logger } from '@/utils/logger';
import { FetchResult } from '../ProductDataFetchService';
import { SupportedPlatform } from './PlatformDetectionService';

export interface CacheEntry {
  data: FetchResult;
  timestamp: number;
  url: string;
  platform: SupportedPlatform;
  accessCount: number;
  lastAccessed: number;
  ttl: number;
  tags: string[];
}

export interface CacheOptions {
  ttl?: number;
  tags?: string[];
  priority?: 'low' | 'normal' | 'high';
}

export interface CacheStats {
  totalEntries: number;
  hitRate: number;
  missRate: number;
  totalHits: number;
  totalMisses: number;
  memoryUsage: number;
  averageAccessTime: number;
}

export interface CacheMetrics {
  platform: SupportedPlatform;
  entries: number;
  hits: number;
  misses: number;
  hitRate: number;
  averageTTL: number;
  oldestEntry: number;
  newestEntry: number;
}

export class ScrapingCacheService {
  private cache = new Map<string, CacheEntry>();
  private stats = {
    hits: 0,
    misses: 0,
    totalAccessTime: 0,
    accessCount: 0,
  };

  // Default TTLs by platform (in milliseconds)
  private readonly DEFAULT_TTLS: Record<SupportedPlatform, number> = {
    amazon: 30 * 60 * 1000,      // 30 minutes - products change frequently
    ebay: 20 * 60 * 1000,       // 20 minutes - auction items change quickly
    walmart: 45 * 60 * 1000,    // 45 minutes - stable inventory
    bestbuy: 30 * 60 * 1000,    // 30 minutes - electronics pricing changes
    target: 45 * 60 * 1000,     // 45 minutes - stable inventory
    etsy: 2 * 60 * 60 * 1000,   // 2 hours - handmade items are more stable
    ae: 4 * 60 * 60 * 1000,     // 4 hours - fashion items stable during season
    myntra: 2 * 60 * 60 * 1000, // 2 hours - fashion items
    hm: 4 * 60 * 60 * 1000,     // 4 hours - fast fashion stable
    asos: 2 * 60 * 60 * 1000,   // 2 hours - fashion items
    zara: 4 * 60 * 60 * 1000,   // 4 hours - seasonal collections
    lego: 24 * 60 * 60 * 1000,  // 24 hours - LEGO sets rarely change
    hermes: 24 * 60 * 60 * 1000,// 24 hours - luxury items stable
    flipkart: 30 * 60 * 1000,   // 30 minutes - competitive pricing
    toysrus: 2 * 60 * 60 * 1000,// 2 hours - toy inventory stable
    carters: 4 * 60 * 60 * 1000,// 4 hours - baby clothes seasonal
    prada: 24 * 60 * 60 * 1000, // 24 hours - luxury stable
    ysl: 24 * 60 * 60 * 1000,   // 24 hours - luxury stable
    balenciaga: 24 * 60 * 60 * 1000, // 24 hours - luxury stable
    dior: 24 * 60 * 60 * 1000,  // 24 hours - luxury stable
    chanel: 24 * 60 * 60 * 1000,// 24 hours - luxury stable
    aliexpress: 15 * 60 * 1000, // 15 minutes - highly competitive
    alibaba: 30 * 60 * 1000,    // 30 minutes - B2B prices change
    dhgate: 30 * 60 * 1000,     // 30 minutes - wholesale pricing
    wish: 15 * 60 * 1000,       // 15 minutes - flash sales common
    shein: 30 * 60 * 1000,      // 30 minutes - fast fashion
    romwe: 30 * 60 * 1000,      // 30 minutes - fast fashion
    nordstrom: 2 * 60 * 60 * 1000, // 2 hours - department store
    macys: 2 * 60 * 60 * 1000,     // 2 hours - department store
    bloomingdales: 2 * 60 * 60 * 1000, // 2 hours - department store
    saks: 4 * 60 * 60 * 1000,      // 4 hours - luxury department
    neimanmarcus: 4 * 60 * 60 * 1000, // 4 hours - luxury department
  };

  private readonly MAX_CACHE_SIZE = 10000; // Maximum number of entries
  private readonly CLEANUP_INTERVAL = 15 * 60 * 1000; // 15 minutes
  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.startPeriodicCleanup();
    logger.info('ScrapingCacheService initialized');
  }

  /**
   * Get cached data if available and not expired
   */
  get(url: string, platform: SupportedPlatform): FetchResult | null {
    const startTime = Date.now();
    const key = this.generateKey(url, platform);
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      this.updateAccessStats(Date.now() - startTime);
      return null;
    }

    // Check if expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      this.stats.misses++;
      this.updateAccessStats(Date.now() - startTime);
      logger.debug(`Cache expired for ${platform}: ${url}`);
      return null;
    }

    // Update access statistics
    entry.accessCount++;
    entry.lastAccessed = Date.now();
    
    this.stats.hits++;
    this.updateAccessStats(Date.now() - startTime);
    
    logger.debug(`Cache hit for ${platform}: ${url} (accessed ${entry.accessCount} times)`);
    return { ...entry.data }; // Return a copy to prevent mutations
  }

  /**
   * Store data in cache
   */
  set(url: string, platform: SupportedPlatform, data: FetchResult, options: CacheOptions = {}): void {
    try {
      // Don't cache failed results unless explicitly requested
      if (!data.success && !options.tags?.includes('cache-failures')) {
        return;
      }

      const key = this.generateKey(url, platform);
      const ttl = options.ttl || this.DEFAULT_TTLS[platform] || 30 * 60 * 1000;
      
      const entry: CacheEntry = {
        data: { ...data }, // Store a copy to prevent mutations
        timestamp: Date.now(),
        url,
        platform,
        accessCount: 0,
        lastAccessed: Date.now(),
        ttl,
        tags: options.tags || [],
      };

      // Check cache size and evict if necessary
      if (this.cache.size >= this.MAX_CACHE_SIZE) {
        this.evictLeastRecentlyUsed();
      }

      this.cache.set(key, entry);
      logger.debug(`Cached ${platform} data for ${url} (TTL: ${this.formatDuration(ttl)})`);

    } catch (error) {
      logger.error('Failed to cache data:', error);
    }
  }

  /**
   * Check if data exists in cache and is not expired
   */
  has(url: string, platform: SupportedPlatform): boolean {
    const key = this.generateKey(url, platform);
    const entry = this.cache.get(key);
    
    if (!entry) return false;
    
    // Check if expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }

  /**
   * Remove specific entry from cache
   */
  delete(url: string, platform: SupportedPlatform): boolean {
    const key = this.generateKey(url, platform);
    const deleted = this.cache.delete(key);
    
    if (deleted) {
      logger.debug(`Removed ${platform} cache entry for ${url}`);
    }
    
    return deleted;
  }

  /**
   * Clear cache entries by tags
   */
  invalidateByTags(tags: string[]): number {
    let invalidated = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.tags.some(tag => tags.includes(tag))) {
        this.cache.delete(key);
        invalidated++;
      }
    }
    
    if (invalidated > 0) {
      logger.info(`Invalidated ${invalidated} cache entries by tags: ${tags.join(', ')}`);
    }
    
    return invalidated;
  }

  /**
   * Clear cache entries for a specific platform
   */
  invalidatePlatform(platform: SupportedPlatform): number {
    let invalidated = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.platform === platform) {
        this.cache.delete(key);
        invalidated++;
      }
    }
    
    if (invalidated > 0) {
      logger.info(`Invalidated ${invalidated} cache entries for platform: ${platform}`);
    }
    
    return invalidated;
  }

  /**
   * Clear all expired entries
   */
  clearExpired(): number {
    let cleared = 0;
    const now = Date.now();
    
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
        cleared++;
      }
    }
    
    if (cleared > 0) {
      logger.info(`Cleared ${cleared} expired cache entries`);
    }
    
    return cleared;
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    const count = this.cache.size;
    this.cache.clear();
    this.resetStats();
    logger.info(`Cleared all ${count} cache entries`);
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const totalRequests = this.stats.hits + this.stats.misses;
    const memoryUsage = this.estimateMemoryUsage();
    
    return {
      totalEntries: this.cache.size,
      hitRate: totalRequests > 0 ? (this.stats.hits / totalRequests) * 100 : 0,
      missRate: totalRequests > 0 ? (this.stats.misses / totalRequests) * 100 : 0,
      totalHits: this.stats.hits,
      totalMisses: this.stats.misses,
      memoryUsage,
      averageAccessTime: this.stats.accessCount > 0 
        ? this.stats.totalAccessTime / this.stats.accessCount 
        : 0,
    };
  }

  /**
   * Get metrics per platform
   */
  getPlatformMetrics(): CacheMetrics[] {
    const platformData = new Map<SupportedPlatform, {
      entries: CacheEntry[];
      hits: number;
      misses: number;
    }>();

    // Group entries by platform
    for (const entry of this.cache.values()) {
      if (!platformData.has(entry.platform)) {
        platformData.set(entry.platform, { entries: [], hits: 0, misses: 0 });
      }
      
      const data = platformData.get(entry.platform)!;
      data.entries.push(entry);
      data.hits += entry.accessCount;
    }

    // Calculate metrics for each platform
    const metrics: CacheMetrics[] = [];
    
    for (const [platform, data] of platformData.entries()) {
      const entries = data.entries;
      const totalRequests = data.hits + data.misses;
      const timestamps = entries.map(e => e.timestamp);
      
      metrics.push({
        platform,
        entries: entries.length,
        hits: data.hits,
        misses: data.misses,
        hitRate: totalRequests > 0 ? (data.hits / totalRequests) * 100 : 0,
        averageTTL: entries.length > 0 
          ? entries.reduce((sum, e) => sum + e.ttl, 0) / entries.length 
          : 0,
        oldestEntry: timestamps.length > 0 ? Math.min(...timestamps) : 0,
        newestEntry: timestamps.length > 0 ? Math.max(...timestamps) : 0,
      });
    }

    return metrics.sort((a, b) => b.entries - a.entries);
  }

  /**
   * Get cache entries for debugging
   */
  getEntries(limit: number = 100): Array<{
    key: string;
    url: string;
    platform: SupportedPlatform;
    age: number;
    ttl: number;
    accessCount: number;
    success: boolean;
  }> {
    const entries = Array.from(this.cache.entries())
      .slice(0, limit)
      .map(([key, entry]) => ({
        key,
        url: entry.url,
        platform: entry.platform,
        age: Date.now() - entry.timestamp,
        ttl: entry.ttl,
        accessCount: entry.accessCount,
        success: entry.data.success,
      }));

    return entries.sort((a, b) => b.accessCount - a.accessCount);
  }

  /**
   * Update TTL for existing entry
   */
  updateTTL(url: string, platform: SupportedPlatform, newTTL: number): boolean {
    const key = this.generateKey(url, platform);
    const entry = this.cache.get(key);
    
    if (entry) {
      entry.ttl = newTTL;
      logger.debug(`Updated TTL for ${platform}:${url} to ${this.formatDuration(newTTL)}`);
      return true;
    }
    
    return false;
  }

  /**
   * Private helper methods
   */
  private generateKey(url: string, platform: SupportedPlatform): string {
    // Normalize URL by removing query parameters that don't affect product data
    const cleanUrl = this.normalizeUrl(url);
    return `${platform}:${cleanUrl}`;
  }

  private normalizeUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      
      // Remove tracking parameters that don't affect product data
      const trackingParams = [
        'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
        'ref', 'refid', 'tag', 'linkCode', 'camp', 'creative',
        'fbclid', 'gclid', 'msclkid', '_branch_match_id'
      ];
      
      trackingParams.forEach(param => {
        urlObj.searchParams.delete(param);
      });
      
      return urlObj.toString();
    } catch {
      return url; // Return original if URL parsing fails
    }
  }

  private evictLeastRecentlyUsed(): void {
    let oldestKey = '';
    let oldestTime = Date.now();
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
    }
    
    if (oldestKey) {
      this.cache.delete(oldestKey);
      logger.debug(`Evicted LRU cache entry: ${oldestKey}`);
    }
  }

  private startPeriodicCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      this.clearExpired();
      
      // Also perform LRU eviction if cache is still too large
      while (this.cache.size > this.MAX_CACHE_SIZE * 0.9) {
        this.evictLeastRecentlyUsed();
      }
    }, this.CLEANUP_INTERVAL);
  }

  private updateAccessStats(accessTime: number): void {
    this.stats.totalAccessTime += accessTime;
    this.stats.accessCount++;
  }

  private resetStats(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      totalAccessTime: 0,
      accessCount: 0,
    };
  }

  private estimateMemoryUsage(): number {
    let totalBytes = 0;
    
    for (const entry of this.cache.values()) {
      // Rough estimate of memory usage per entry
      const dataStr = JSON.stringify(entry.data);
      totalBytes += dataStr.length * 2; // 2 bytes per character (UTF-16)
      totalBytes += entry.url.length * 2;
      totalBytes += 200; // Overhead for object structure
    }
    
    return totalBytes;
  }

  private formatDuration(ms: number): string {
    if (ms < 60000) return `${Math.round(ms / 1000)}s`;
    if (ms < 3600000) return `${Math.round(ms / 60000)}m`;
    return `${Math.round(ms / 3600000)}h`;
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    
    this.clear();
    logger.info('ScrapingCacheService disposed');
  }
}

export default ScrapingCacheService;