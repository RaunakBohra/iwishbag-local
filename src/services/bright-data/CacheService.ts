/**
 * Cache Service
 * Handles caching and storage management for Bright Data product scraping
 */

import { logger } from '@/utils/logger';
import { ProductData, FetchResult } from './ProductScrapingEngine';

export interface CacheEntry<T = any> {
  data: T;
  timestamp: Date;
  expiresAt: Date;
  hits: number;
  size: number; // Size in bytes
  url?: string;
  platform?: string;
  version: string;
}

export interface CacheStats {
  totalEntries: number;
  totalSize: number; // Size in bytes
  hitRate: number; // Percentage
  memoryUsage: number; // Percentage of max memory
  oldestEntry: Date | null;
  newestEntry: Date | null;
  platformDistribution: Record<string, number>;
  sizeDistribution: {
    small: number; // < 10KB
    medium: number; // 10KB - 100KB  
    large: number; // > 100KB
  };
}

export interface CacheOptions {
  maxEntries?: number;
  maxMemoryMB?: number;
  defaultTTL?: number; // Time to live in milliseconds
  enablePersistence?: boolean;
  compressionEnabled?: boolean;
  cleanupInterval?: number; // Cleanup interval in milliseconds
}

export class CacheService {
  private cache = new Map<string, CacheEntry>();
  private hits = 0;
  private misses = 0;
  private readonly version = '1.0.0';
  
  private readonly options: Required<CacheOptions>;
  private cleanupTimer?: NodeJS.Timeout;
  private lastCleanup = Date.now();

  constructor(options: CacheOptions = {}) {
    this.options = {
      maxEntries: options.maxEntries || 10000,
      maxMemoryMB: options.maxMemoryMB || 500,
      defaultTTL: options.defaultTTL || 24 * 60 * 60 * 1000, // 24 hours
      enablePersistence: options.enablePersistence || false,
      compressionEnabled: options.compressionEnabled || true,
      cleanupInterval: options.cleanupInterval || 5 * 60 * 1000 // 5 minutes
    };

    this.startCleanupTimer();
    this.loadPersistedCache();
  }

  /**
   * Get cached data by key
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.misses++;
      return null;
    }

    // Check if entry has expired
    if (entry.expiresAt < new Date()) {
      this.cache.delete(key);
      this.misses++;
      logger.debug('Cache entry expired', { key });
      return null;
    }

    // Update hit count and return data
    entry.hits++;
    this.hits++;
    
    logger.debug('Cache hit', { 
      key, 
      hits: entry.hits,
      age: Date.now() - entry.timestamp.getTime()
    });

    return entry.data as T;
  }

  /**
   * Set cached data with optional TTL
   */
  set<T>(key: string, data: T, ttl?: number, metadata?: { url?: string; platform?: string }): void {
    try {
      const now = new Date();
      const expiresAt = new Date(now.getTime() + (ttl || this.options.defaultTTL));
      const serializedData = this.serializeData(data);
      const size = this.calculateSize(serializedData);

      // Check memory limits before adding
      if (this.shouldRejectEntry(size)) {
        logger.warn('Cache entry rejected due to memory limits', { key, size });
        return;
      }

      const entry: CacheEntry<T> = {
        data: this.options.compressionEnabled ? this.compressData(data) : data,
        timestamp: now,
        expiresAt,
        hits: 0,
        size,
        url: metadata?.url,
        platform: metadata?.platform,
        version: this.version
      };

      // Remove existing entry if it exists
      if (this.cache.has(key)) {
        this.cache.delete(key);
      }

      // Enforce max entries limit
      if (this.cache.size >= this.options.maxEntries) {
        this.evictLeastUsed();
      }

      this.cache.set(key, entry);

      logger.debug('Cache entry set', {
        key,
        size,
        ttl: ttl || this.options.defaultTTL,
        platform: metadata?.platform
      });

      // Persist if enabled
      if (this.options.enablePersistence) {
        this.persistEntry(key, entry);
      }

    } catch (error) {
      logger.error('Cache set error:', error);
    }
  }

  /**
   * Delete cached entry
   */
  delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    
    if (deleted) {
      logger.debug('Cache entry deleted', { key });
      
      if (this.options.enablePersistence) {
        this.deletePersistedEntry(key);
      }
    }
    
    return deleted;
  }

  /**
   * Check if key exists in cache (without affecting hit count)
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    
    // Check if expired
    if (entry.expiresAt < new Date()) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    const entriesCleared = this.cache.size;
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
    
    logger.info('Cache cleared', { entriesCleared });
    
    if (this.options.enablePersistence) {
      this.clearPersistedCache();
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const entries = Array.from(this.cache.entries());
    const totalEntries = entries.length;
    
    if (totalEntries === 0) {
      return {
        totalEntries: 0,
        totalSize: 0,
        hitRate: 0,
        memoryUsage: 0,
        oldestEntry: null,
        newestEntry: null,
        platformDistribution: {},
        sizeDistribution: { small: 0, medium: 0, large: 0 }
      };
    }

    const totalSize = entries.reduce((sum, [_, entry]) => sum + entry.size, 0);
    const hitRate = this.hits + this.misses > 0 ? (this.hits / (this.hits + this.misses)) * 100 : 0;
    const memoryUsage = (totalSize / (this.options.maxMemoryMB * 1024 * 1024)) * 100;

    const timestamps = entries.map(([_, entry]) => entry.timestamp);
    const oldestEntry = new Date(Math.min(...timestamps.map(t => t.getTime())));
    const newestEntry = new Date(Math.max(...timestamps.map(t => t.getTime())));

    // Platform distribution
    const platformDistribution: Record<string, number> = {};
    entries.forEach(([_, entry]) => {
      const platform = entry.platform || 'unknown';
      platformDistribution[platform] = (platformDistribution[platform] || 0) + 1;
    });

    // Size distribution
    const sizeDistribution = { small: 0, medium: 0, large: 0 };
    entries.forEach(([_, entry]) => {
      if (entry.size < 10240) { // < 10KB
        sizeDistribution.small++;
      } else if (entry.size < 102400) { // < 100KB
        sizeDistribution.medium++;
      } else {
        sizeDistribution.large++;
      }
    });

    return {
      totalEntries,
      totalSize,
      hitRate,
      memoryUsage,
      oldestEntry,
      newestEntry,
      platformDistribution,
      sizeDistribution
    };
  }

  /**
   * Cache methods specifically for product data
   */
  cacheProductData(url: string, result: FetchResult, ttl?: number): void {
    const key = this.generateProductKey(url);
    const platform = this.extractPlatformFromUrl(url);
    
    this.set(key, result, ttl, { url, platform });
  }

  getCachedProductData(url: string): FetchResult | null {
    const key = this.generateProductKey(url);
    return this.get<FetchResult>(key);
  }

  /**
   * Cache methods for weight estimation data
   */
  cacheWeightEstimation(productSignature: string, weight: number, ttl?: number): void {
    const key = `weight:${productSignature}`;
    this.set(key, { weight, confidence: 0.8 }, ttl);
  }

  getCachedWeightEstimation(productSignature: string): { weight: number; confidence: number } | null {
    const key = `weight:${productSignature}`;
    return this.get<{ weight: number; confidence: number }>(key);
  }

  /**
   * Cache methods for platform configurations
   */
  cachePlatformConfig(platform: string, config: any, ttl?: number): void {
    const key = `config:${platform}`;
    this.set(key, config, ttl || 7 * 24 * 60 * 60 * 1000); // 7 days for configs
  }

  getCachedPlatformConfig(platform: string): any | null {
    const key = `config:${platform}`;
    return this.get(key);
  }

  /**
   * Cleanup expired entries
   */
  private cleanup(): void {
    const now = new Date();
    let expiredCount = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiresAt < now) {
        this.cache.delete(key);
        expiredCount++;
      }
    }

    this.lastCleanup = now.getTime();
    
    if (expiredCount > 0) {
      logger.info('Cache cleanup completed', { 
        expiredCount, 
        remainingEntries: this.cache.size 
      });
    }
  }

  /**
   * Start automatic cleanup timer
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.options.cleanupInterval);
  }

  /**
   * Stop cleanup timer
   */
  stopCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
  }

  /**
   * Evict least recently used entries when cache is full
   */
  private evictLeastUsed(): void {
    const entries = Array.from(this.cache.entries());
    
    // Sort by hits (ascending) then by timestamp (ascending) 
    entries.sort((a, b) => {
      const hitDiff = a[1].hits - b[1].hits;
      if (hitDiff !== 0) return hitDiff;
      return a[1].timestamp.getTime() - b[1].timestamp.getTime();
    });

    // Remove the least used 10% of entries
    const toRemove = Math.max(1, Math.floor(entries.length * 0.1));
    
    for (let i = 0; i < toRemove; i++) {
      const [key] = entries[i];
      this.cache.delete(key);
    }

    logger.info('Cache eviction completed', { 
      entriesRemoved: toRemove,
      remainingEntries: this.cache.size 
    });
  }

  /**
   * Check if entry should be rejected due to size/memory limits
   */
  private shouldRejectEntry(size: number): boolean {
    const stats = this.getStats();
    const newTotalSize = stats.totalSize + size;
    const maxSizeBytes = this.options.maxMemoryMB * 1024 * 1024;
    
    // Reject if single entry is too large (> 10MB)
    if (size > 10 * 1024 * 1024) {
      return true;
    }
    
    // Reject if would exceed memory limit
    if (newTotalSize > maxSizeBytes) {
      return true;
    }
    
    return false;
  }

  /**
   * Generate cache key for product URL
   */
  private generateProductKey(url: string): string {
    try {
      const urlObj = new URL(url);
      // Remove tracking parameters and normalize
      const cleanUrl = `${urlObj.hostname}${urlObj.pathname}`;
      return `product:${Buffer.from(cleanUrl).toString('base64').slice(0, 32)}`;
    } catch {
      return `product:${Buffer.from(url).toString('base64').slice(0, 32)}`;
    }
  }

  /**
   * Extract platform from URL for statistics
   */
  private extractPlatformFromUrl(url: string): string {
    try {
      const hostname = new URL(url).hostname.toLowerCase();
      
      if (hostname.includes('amazon')) return 'amazon';
      if (hostname.includes('ebay')) return 'ebay';
      if (hostname.includes('walmart')) return 'walmart';
      if (hostname.includes('bestbuy')) return 'bestbuy';
      if (hostname.includes('target')) return 'target';
      if (hostname.includes('hm.com')) return 'hm';
      if (hostname.includes('asos')) return 'asos';
      if (hostname.includes('etsy')) return 'etsy';
      if (hostname.includes('zara')) return 'zara';
      if (hostname.includes('myntra')) return 'myntra';
      if (hostname.includes('ae.com')) return 'ae';
      
      return 'other';
    } catch {
      return 'unknown';
    }
  }

  /**
   * Serialize data for size calculation
   */
  private serializeData<T>(data: T): string {
    try {
      return JSON.stringify(data);
    } catch {
      return String(data);
    }
  }

  /**
   * Calculate size of serialized data in bytes
   */
  private calculateSize(serializedData: string): number {
    return new Blob([serializedData]).size;
  }

  /**
   * Compress data if compression is enabled
   */
  private compressData<T>(data: T): T {
    // In a real implementation, this could use compression libraries
    // For now, just return the data as-is
    return data;
  }

  /**
   * Persistence methods (simplified implementation)
   */
  private async persistEntry(key: string, entry: CacheEntry): Promise<void> {
    if (!this.options.enablePersistence) return;

    try {
      // In a real implementation, this would persist to localStorage, IndexedDB, or a database
      const persistKey = `cache:${key}`;
      const serialized = JSON.stringify({
        ...entry,
        timestamp: entry.timestamp.toISOString(),
        expiresAt: entry.expiresAt.toISOString()
      });
      
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(persistKey, serialized);
      }
    } catch (error) {
      logger.warn('Failed to persist cache entry:', error);
    }
  }

  private async deletePersistedEntry(key: string): Promise<void> {
    if (!this.options.enablePersistence) return;

    try {
      const persistKey = `cache:${key}`;
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(persistKey);
      }
    } catch (error) {
      logger.warn('Failed to delete persisted cache entry:', error);
    }
  }

  private async loadPersistedCache(): Promise<void> {
    if (!this.options.enablePersistence) return;

    try {
      if (typeof localStorage === 'undefined') return;

      let loadedCount = 0;
      const now = new Date();

      // Load all cache entries from localStorage
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key?.startsWith('cache:')) continue;

        try {
          const serialized = localStorage.getItem(key);
          if (!serialized) continue;

          const entry = JSON.parse(serialized);
          entry.timestamp = new Date(entry.timestamp);
          entry.expiresAt = new Date(entry.expiresAt);

          // Skip expired entries
          if (entry.expiresAt < now) {
            localStorage.removeItem(key);
            continue;
          }

          // Skip entries from different versions
          if (entry.version !== this.version) {
            localStorage.removeItem(key);
            continue;
          }

          const cacheKey = key.replace('cache:', '');
          this.cache.set(cacheKey, entry);
          loadedCount++;

        } catch (error) {
          logger.warn('Failed to load persisted cache entry:', error);
          if (key) localStorage.removeItem(key);
        }
      }

      if (loadedCount > 0) {
        logger.info('Loaded persisted cache entries', { count: loadedCount });
      }

    } catch (error) {
      logger.error('Failed to load persisted cache:', error);
    }
  }

  private async clearPersistedCache(): Promise<void> {
    if (!this.options.enablePersistence) return;

    try {
      if (typeof localStorage === 'undefined') return;

      // Remove all cache entries from localStorage
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith('cache:')) {
          keysToRemove.push(key);
        }
      }

      keysToRemove.forEach(key => localStorage.removeItem(key));
      
      logger.info('Cleared persisted cache', { entriesRemoved: keysToRemove.length });

    } catch (error) {
      logger.error('Failed to clear persisted cache:', error);
    }
  }

  /**
   * Advanced cache operations
   */
  
  /**
   * Get entries by platform
   */
  getEntriesByPlatform(platform: string): Array<{ key: string; entry: CacheEntry }> {
    const entries: Array<{ key: string; entry: CacheEntry }> = [];
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.platform === platform && entry.expiresAt > new Date()) {
        entries.push({ key, entry });
      }
    }
    
    return entries.sort((a, b) => b.entry.timestamp.getTime() - a.entry.timestamp.getTime());
  }

  /**
   * Get recently accessed entries
   */
  getRecentEntries(limit = 100): Array<{ key: string; entry: CacheEntry }> {
    const entries = Array.from(this.cache.entries())
      .filter(([_, entry]) => entry.expiresAt > new Date())
      .map(([key, entry]) => ({ key, entry }))
      .sort((a, b) => b.entry.timestamp.getTime() - a.entry.timestamp.getTime());
    
    return entries.slice(0, limit);
  }

  /**
   * Preload cache with common URLs
   */
  async preloadUrls(urls: string[], fetchFunction: (url: string) => Promise<FetchResult>): Promise<void> {
    const promises = urls.map(async url => {
      try {
        if (!this.getCachedProductData(url)) {
          const result = await fetchFunction(url);
          this.cacheProductData(url, result);
          
          // Add small delay to prevent overwhelming the system
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      } catch (error) {
        logger.warn('Failed to preload URL:', { url, error });
      }
    });

    await Promise.all(promises);
    logger.info('Cache preload completed', { urlCount: urls.length });
  }

  /**
   * Export cache data for backup
   */
  exportCache(): any {
    const entries: Record<string, any> = {};
    
    for (const [key, entry] of this.cache.entries()) {
      entries[key] = {
        ...entry,
        timestamp: entry.timestamp.toISOString(),
        expiresAt: entry.expiresAt.toISOString()
      };
    }

    return {
      version: this.version,
      exportTime: new Date().toISOString(),
      stats: this.getStats(),
      entries
    };
  }

  /**
   * Import cache data from backup
   */
  importCache(backupData: any): number {
    if (!backupData?.entries) {
      throw new Error('Invalid backup data format');
    }

    let importedCount = 0;
    const now = new Date();

    for (const [key, entry] of Object.entries(backupData.entries)) {
      try {
        const cacheEntry = entry as any;
        cacheEntry.timestamp = new Date(cacheEntry.timestamp);
        cacheEntry.expiresAt = new Date(cacheEntry.expiresAt);

        // Skip expired entries
        if (cacheEntry.expiresAt <= now) continue;

        this.cache.set(key, cacheEntry);
        importedCount++;

      } catch (error) {
        logger.warn('Failed to import cache entry:', { key, error });
      }
    }

    logger.info('Cache import completed', { importedCount });
    return importedCount;
  }

  /**
   * Cleanup on service destruction
   */
  destroy(): void {
    this.stopCleanupTimer();
    this.cache.clear();
    logger.info('Cache service destroyed');
  }
}

// Export singleton instance
export const cacheService = new CacheService();