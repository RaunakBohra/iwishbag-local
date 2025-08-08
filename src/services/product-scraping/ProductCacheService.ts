/**
 * Product Cache Service
 * Manages multi-layer caching strategy with TTL, LRU eviction, and performance optimization
 * Decomposed from BrightDataProductService for focused cache management
 * 
 * RESPONSIBILITIES:
 * - Multi-layer caching (in-memory, localStorage, IndexedDB)
 * - Cache invalidation and updates
 * - Performance optimization and hit rate tracking
 * - Storage management and cleanup
 * - TTL-based expiration handling
 * - Cache warming and preloading strategies
 */

import { logger } from '@/utils/logger';
import { FetchResult } from '../ProductDataFetchService';

export interface CacheEntry {
  data: any;
  timestamp: number;
  expiresAt: number;
  hits: number;
  lastAccessed: number;
  source: 'memory' | 'localStorage' | 'indexedDB';
  priority: 'low' | 'normal' | 'high';
  url: string;
  platform: string;
}

export interface CacheConfig {
  memoryTTL: number;
  localStorageTTL: number;
  indexedDBTTL: number;
  maxMemoryEntries: number;
  maxLocalStorageEntries: number;
  maxIndexedDBEntries: number;
  compressionEnabled: boolean;
  warmupEnabled: boolean;
  platformSpecificTimeouts?: Record<string, number>;
}

export interface CacheStats {
  totalEntries: number;
  memoryEntries: number;
  localStorageEntries: number;
  indexedDBEntries: number;
  hitRate: number;
  totalHits: number;
  totalMisses: number;
  totalSize: number;
  evictions: number;
  hitCount: number;
  missCount: number;
  hitRatio: number;
  oldestEntry?: Date;
  newestEntry?: Date;
  cacheSize: number;
}

export class ProductCacheService {
  private static instance: ProductCacheService;
  private memoryCache = new Map<string, CacheEntry>();
  private dbCache?: IDBDatabase;
  private isInitialized = false;
  
  private config: CacheConfig = {
    memoryTTL: 10 * 60 * 1000, // 10 minutes
    localStorageTTL: 60 * 60 * 1000, // 1 hour
    indexedDBTTL: 24 * 60 * 60 * 1000, // 24 hours
    maxMemoryEntries: 100,
    maxLocalStorageEntries: 500,
    maxIndexedDBEntries: 2000,
    compressionEnabled: true,
    warmupEnabled: true,
    platformSpecificTimeouts: {
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
  
  private stats: CacheStats = {
    totalEntries: 0,
    memoryEntries: 0,
    localStorageEntries: 0,
    indexedDBEntries: 0,
    hitRate: 0,
    totalHits: 0,
    totalMisses: 0,
    totalSize: 0,
    evictions: 0,
    hitCount: 0,
    missCount: 0,
    hitRatio: 0,
    cacheSize: 0
  };

  constructor() {
    this.initialize();
    logger.info('ProductCacheService initialized');
  }

  static getInstance(): ProductCacheService {
    if (!ProductCacheService.instance) {
      ProductCacheService.instance = new ProductCacheService();
    }
    return ProductCacheService.instance;
  }

  /**
   * Initialize cache system
   */
  private async initialize(): Promise<void> {
    try {
      await this.initIndexedDB();
      await this.loadCacheStats();
      
      if (this.config.warmupEnabled) {
        this.warmupCache();
      }
      
      // Start cleanup scheduler
      this.scheduleCleanup();
      
      this.isInitialized = true;
      logger.info('Cache system initialized successfully');
      
    } catch (error) {
      logger.error('Failed to initialize cache system:', error);
    }
  }

  /**
   * Get cached product data with fallback strategy
   */
  async getCachedData(url: string, platform?: string): Promise<any | null> {
    const key = this.createCacheKey(url, platform);
    
    try {
      // 1. Try memory cache first (fastest)
      const memoryResult = this.getFromMemory(key);
      if (memoryResult) {
        this.recordHit('memory');
        return memoryResult;
      }

      // 2. Try localStorage (fast)
      const localStorageResult = this.getFromLocalStorage(key);
      if (localStorageResult) {
        // Promote to memory cache
        this.setMemoryCache(key, localStorageResult, 'normal');
        this.recordHit('localStorage');
        return localStorageResult;
      }

      // 3. Try IndexedDB (slower but larger capacity)
      const indexedDBResult = await this.getFromIndexedDB(key);
      if (indexedDBResult) {
        // Promote to higher-level caches
        this.setMemoryCache(key, indexedDBResult, 'normal');
        this.setLocalStorage(key, indexedDBResult);
        this.recordHit('indexedDB');
        return indexedDBResult;
      }

      // Cache miss
      this.recordMiss();
      return null;

    } catch (error) {
      logger.error('Error retrieving cached data:', error);
      this.recordMiss();
      return null;
    }
  }

  /**
   * Store product data in cache with appropriate strategy
   */
  async setCachedData(url: string, data: any, platform?: string, priority: 'low' | 'normal' | 'high' = 'normal'): Promise<void> {
    const key = this.createCacheKey(url, platform);
    
    try {
      // Compress data if enabled and data is large
      const processedData = this.config.compressionEnabled && this.getDataSize(data) > 10240 
        ? await this.compressData(data) 
        : data;

      // Store in all cache layers based on priority
      if (priority === 'high' || priority === 'normal') {
        this.setMemoryCache(key, processedData, priority);
      }
      
      if (priority === 'high' || priority === 'normal') {
        this.setLocalStorage(key, processedData);
      }
      
      // Always store in IndexedDB for long-term caching
      await this.setIndexedDB(key, processedData, priority);
      
      this.updateStats();
      logger.debug(`Cached product data for key: ${key}`);
      
    } catch (error) {
      logger.error('Error storing cached data:', error);
    }
  }

  /**
   * Memory cache operations
   */
  private getFromMemory(key: string): any | null {
    const entry = this.memoryCache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.memoryCache.delete(key);
      return null;
    }

    // Update access stats
    entry.hits++;
    entry.lastAccessed = Date.now();
    
    return this.decompressData(entry.data);
  }

  private setMemoryCache(key: string, data: any, priority: 'low' | 'normal' | 'high'): void {
    // Check if cache is full and evict LRU entries
    if (this.memoryCache.size >= this.config.maxMemoryEntries) {
      this.evictLRUMemoryEntries();
    }

    const ttl = this.config.memoryTTL;
    const entry: CacheEntry = {
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + ttl,
      hits: 0,
      lastAccessed: Date.now(),
      source: 'memory',
      priority,
      url: key,
      platform: ''
    };

    this.memoryCache.set(key, entry);
  }

  /**
   * localStorage operations
   */
  private getFromLocalStorage(key: string): any | null {
    try {
      const stored = localStorage.getItem(`cache_${key}`);
      if (!stored) return null;

      const entry: CacheEntry = JSON.parse(stored);
      
      if (Date.now() > entry.expiresAt) {
        localStorage.removeItem(`cache_${key}`);
        return null;
      }

      return this.decompressData(entry.data);
      
    } catch (error) {
      logger.error('Error reading from localStorage:', error);
      return null;
    }
  }

  private setLocalStorage(key: string, data: any): void {
    try {
      // Check storage quota and clean if necessary
      if (this.getLocalStorageSize() > 4 * 1024 * 1024) { // 4MB threshold
        this.cleanLocalStorage();
      }

      const entry: CacheEntry = {
        data,
        timestamp: Date.now(),
        expiresAt: Date.now() + this.config.localStorageTTL,
        hits: 0,
        lastAccessed: Date.now(),
        source: 'localStorage',
        priority: 'normal',
        url: key,
        platform: ''
      };

      localStorage.setItem(`cache_${key}`, JSON.stringify(entry));
      
    } catch (error) {
      if (error.name === 'QuotaExceededError') {
        logger.warn('localStorage quota exceeded, cleaning cache');
        this.cleanLocalStorage();
      } else {
        logger.error('Error storing in localStorage:', error);
      }
    }
  }

  /**
   * IndexedDB operations
   */
  private async initIndexedDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('ProductCache', 1);
      
      request.onerror = () => {
        logger.error('Failed to open IndexedDB');
        reject(request.error);
      };
      
      request.onsuccess = () => {
        this.dbCache = request.result;
        resolve();
      };
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        if (!db.objectStoreNames.contains('cache')) {
          const store = db.createObjectStore('cache', { keyPath: 'key' });
          store.createIndex('timestamp', 'timestamp');
          store.createIndex('expiresAt', 'expiresAt');
          store.createIndex('priority', 'priority');
        }
      };
    });
  }

  private async getFromIndexedDB(key: string): Promise<any | null> {
    if (!this.dbCache) return null;

    return new Promise((resolve) => {
      const transaction = this.dbCache!.transaction(['cache'], 'readonly');
      const store = transaction.objectStore('cache');
      const request = store.get(key);
      
      request.onsuccess = () => {
        const result = request.result;
        if (!result || Date.now() > result.expiresAt) {
          if (result) {
            this.deleteFromIndexedDB(key);
          }
          resolve(null);
          return;
        }
        
        resolve(this.decompressData(result.data));
      };
      
      request.onerror = () => {
        logger.error('Error reading from IndexedDB:', request.error);
        resolve(null);
      };
    });
  }

  private async setIndexedDB(key: string, data: any, priority: 'low' | 'normal' | 'high'): Promise<void> {
    if (!this.dbCache) return;

    return new Promise((resolve, reject) => {
      const transaction = this.dbCache!.transaction(['cache'], 'readwrite');
      const store = transaction.objectStore('cache');
      
      const entry = {
        key,
        data,
        timestamp: Date.now(),
        expiresAt: Date.now() + this.config.indexedDBTTL,
        hits: 0,
        lastAccessed: Date.now(),
        source: 'indexedDB',
        priority
      };
      
      const request = store.put(entry);
      
      request.onsuccess = () => resolve();
      request.onerror = () => {
        logger.error('Error storing in IndexedDB:', request.error);
        reject(request.error);
      };
    });
  }

  private async deleteFromIndexedDB(key: string): Promise<void> {
    if (!this.dbCache) return;

    return new Promise((resolve) => {
      const transaction = this.dbCache!.transaction(['cache'], 'readwrite');
      const store = transaction.objectStore('cache');
      const request = store.delete(key);
      
      request.onsuccess = () => resolve();
      request.onerror = () => resolve(); // Don't throw on delete errors
    });
  }

  /**
   * Cache management and cleanup
   */
  private evictLRUMemoryEntries(): void {
    const entries = Array.from(this.memoryCache.entries());
    
    // Sort by last accessed time (oldest first)
    entries.sort((a, b) => a[1].lastAccessed - b[1].lastAccessed);
    
    // Remove oldest 20% of entries
    const toRemove = Math.ceil(entries.length * 0.2);
    
    for (let i = 0; i < toRemove; i++) {
      this.memoryCache.delete(entries[i][0]);
      this.stats.evictions++;
    }
    
    logger.debug(`Evicted ${toRemove} LRU entries from memory cache`);
  }

  private cleanLocalStorage(): void {
    try {
      const keys = Object.keys(localStorage);
      const cacheKeys = keys.filter(key => key.startsWith('cache_'));
      
      // Parse and sort by timestamp
      const entries = cacheKeys
        .map(key => {
          try {
            const data = JSON.parse(localStorage.getItem(key) || '{}');
            return { key, ...data };
          } catch {
            return null;
          }
        })
        .filter(entry => entry !== null)
        .sort((a, b) => a.timestamp - b.timestamp);
      
      // Remove oldest 30% of entries
      const toRemove = Math.ceil(entries.length * 0.3);
      
      for (let i = 0; i < toRemove; i++) {
        localStorage.removeItem(entries[i].key);
        this.stats.evictions++;
      }
      
      logger.debug(`Cleaned ${toRemove} old entries from localStorage`);
      
    } catch (error) {
      logger.error('Error cleaning localStorage:', error);
    }
  }

  /**
   * Utility functions
   */
  private createCacheKey(url: string, platform?: string): string {
    const normalizedUrl = this.normalizeUrl(url);
    const platformPrefix = platform ? `${platform}:` : '';
    return `${platformPrefix}${normalizedUrl}`;
  }

  private normalizeUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      
      // Remove tracking parameters
      const trackingParams = ['utm_source', 'utm_medium', 'utm_campaign', 'ref', 'tag'];
      trackingParams.forEach(param => urlObj.searchParams.delete(param));
      
      // Sort search parameters for consistent keys
      urlObj.searchParams.sort();
      
      return urlObj.toString();
    } catch {
      return url;
    }
  }

  private async compressData(data: any): Promise<string> {
    if (typeof data === 'string') return data;
    
    try {
      const jsonString = JSON.stringify(data);
      // Simple compression would go here if available
      return jsonString;
    } catch (error) {
      logger.warn('Compression failed, storing uncompressed:', error);
      return JSON.stringify(data);
    }
  }

  private decompressData(data: any): any {
    if (typeof data !== 'string') return data;
    
    try {
      return JSON.parse(data);
    } catch {
      return data;
    }
  }

  private getDataSize(data: any): number {
    return new Blob([JSON.stringify(data)]).size;
  }

  private getLocalStorageSize(): number {
    let total = 0;
    for (const key in localStorage) {
      if (localStorage.hasOwnProperty(key) && key.startsWith('cache_')) {
        total += localStorage[key].length + key.length;
      }
    }
    return total;
  }

  private recordHit(source: 'memory' | 'localStorage' | 'indexedDB'): void {
    this.stats.totalHits++;
    this.stats.hitCount++;
    this.updateHitRate();
    logger.debug(`Cache hit from ${source}`);
  }

  private recordMiss(): void {
    this.stats.totalMisses++;
    this.stats.missCount++;
    this.updateHitRate();
  }

  private updateHitRate(): void {
    const total = this.stats.totalHits + this.stats.totalMisses;
    this.stats.hitRate = total > 0 ? this.stats.totalHits / total : 0;
    this.stats.hitRatio = this.stats.hitRate;
  }

  private updateStats(): void {
    this.stats.memoryEntries = this.memoryCache.size;
    this.stats.totalEntries = this.stats.memoryEntries + this.stats.localStorageEntries + this.stats.indexedDBEntries;
  }

  private async loadCacheStats(): Promise<void> {
    try {
      const savedStats = localStorage.getItem('cache_stats');
      if (savedStats) {
        const parsed = JSON.parse(savedStats);
        this.stats = { ...this.stats, ...parsed };
      }
    } catch (error) {
      logger.warn('Could not load cache stats:', error);
    }
  }

  private saveCacheStats(): void {
    try {
      localStorage.setItem('cache_stats', JSON.stringify(this.stats));
    } catch (error) {
      logger.warn('Could not save cache stats:', error);
    }
  }

  private warmupCache(): void {
    logger.info('Starting cache warmup');
    // Warmup would be implemented here
  }

  private scheduleCleanup(): void {
    setInterval(async () => {
      logger.debug('Running scheduled cache cleanup');
      
      // Clean memory cache
      const memoryKeys = Array.from(this.memoryCache.keys());
      memoryKeys.forEach(key => {
        const entry = this.memoryCache.get(key);
        if (entry && Date.now() > entry.expiresAt) {
          this.memoryCache.delete(key);
        }
      });
      
      this.saveCacheStats();
      
    }, 30 * 60 * 1000); // 30 minutes
  }

  /**
   * Legacy interface methods (backward compatibility)
   */
  async get(url: string): Promise<FetchResult | null> {
    const result = await this.getCachedData(url);
    if (!result) {
      this.recordMiss();
      return null;
    }
    return result;
  }

  set(url: string, data: FetchResult, platform: string): void {
    this.setCachedData(url, data, platform, 'normal');
  }

  async has(url: string): Promise<boolean> {
    const result = await this.getCachedData(url);
    return result !== null;
  }

  async delete(url: string): Promise<boolean> {
    const key = this.createCacheKey(url);
    
    // Remove from all cache layers
    const memoryDeleted = this.memoryCache.delete(key);
    
    try {
      localStorage.removeItem(`cache_${key}`);
    } catch (error) {
      logger.warn('Error removing from localStorage:', error);
    }
    
    try {
      await this.deleteFromIndexedDB(key);
    } catch (error) {
      logger.warn('Error removing from IndexedDB:', error);
    }
    
    return memoryDeleted;
  }

  async clearCache(type?: 'memory' | 'localStorage' | 'indexedDB'): Promise<void> {
    try {
      if (!type || type === 'memory') {
        this.memoryCache.clear();
        logger.info('Memory cache cleared');
      }
      
      if (!type || type === 'localStorage') {
        const keys = Object.keys(localStorage);
        keys.filter(key => key.startsWith('cache_')).forEach(key => {
          localStorage.removeItem(key);
        });
        logger.info('localStorage cache cleared');
      }
      
      if (!type || type === 'indexedDB') {
        if (this.dbCache) {
          const transaction = this.dbCache.transaction(['cache'], 'readwrite');
          const store = transaction.objectStore('cache');
          await new Promise<void>((resolve, reject) => {
            const request = store.clear();
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
          });
        }
        logger.info('IndexedDB cache cleared');
      }
      
      // Reset stats
      this.stats = {
        totalEntries: 0,
        memoryEntries: 0,
        localStorageEntries: 0,
        indexedDBEntries: 0,
        hitRate: 0,
        totalHits: 0,
        totalMisses: 0,
        totalSize: 0,
        evictions: 0,
        hitCount: 0,
        missCount: 0,
        hitRatio: 0,
        cacheSize: 0
      };
      
    } catch (error) {
      logger.error('Error clearing cache:', error);
    }
  }

  // Legacy methods for backward compatibility
  clear(): void {
    this.clearCache();
  }

  cleanupExpiredEntries(): number {
    const memoryKeys = Array.from(this.memoryCache.keys());
    let removedCount = 0;
    
    memoryKeys.forEach(key => {
      const entry = this.memoryCache.get(key);
      if (entry && Date.now() > entry.expiresAt) {
        this.memoryCache.delete(key);
        removedCount++;
      }
    });
    
    return removedCount;
  }

  removeOldestEntries(count: number): number {
    const entries = Array.from(this.memoryCache.entries());
    entries.sort(([, a], [, b]) => a.timestamp - b.timestamp);
    
    let removedCount = 0;
    for (let i = 0; i < Math.min(count, entries.length); i++) {
      this.memoryCache.delete(entries[i][0]);
      removedCount++;
    }
    
    return removedCount;
  }

  getStats(): CacheStats {
    this.updateStats();
    
    let oldestEntry: Date | undefined;
    let newestEntry: Date | undefined;
    let cacheSize = 0;
    
    if (this.memoryCache.size > 0) {
      const timestamps = Array.from(this.memoryCache.values()).map(entry => entry.timestamp);
      oldestEntry = new Date(Math.min(...timestamps));
      newestEntry = new Date(Math.max(...timestamps));
      
      cacheSize = Array.from(this.memoryCache.values()).reduce((size, entry) => {
        return size + JSON.stringify(entry).length * 2;
      }, 0);
    }
    
    return {
      ...this.stats,
      oldestEntry,
      newestEntry,
      cacheSize
    };
  }

  getEntriesByPlatform(platform: string): CacheEntry[] {
    return Array.from(this.memoryCache.values()).filter(entry => entry.platform === platform);
  }

  invalidatePlatform(platform: string): number {
    let removedCount = 0;
    
    for (const [key, entry] of this.memoryCache.entries()) {
      if (entry.platform === platform) {
        this.memoryCache.delete(key);
        removedCount++;
      }
    }
    
    return removedCount;
  }

  setPlatformTimeout(platform: string, timeoutMs: number): void {
    if (!this.config.platformSpecificTimeouts) {
      this.config.platformSpecificTimeouts = {};
    }
    this.config.platformSpecificTimeouts[platform] = timeoutMs;
  }

  getConfig(): CacheConfig {
    return { ...this.config };
  }

  updateConfig(newConfig: Partial<CacheConfig>): void {
    this.config = { ...this.config, ...newConfig };
    logger.info('Cache configuration updated');
  }

  preload(entries: Array<{ url: string; data: FetchResult; platform: string }>): void {
    entries.forEach(({ url, data, platform }) => {
      this.setCachedData(url, data, platform, 'normal');
    });
  }

  export(): Array<CacheEntry> {
    return Array.from(this.memoryCache.values());
  }

  import(entries: Array<CacheEntry>): void {
    const now = Date.now();
    
    entries.forEach(entry => {
      if (entry.expiresAt > now) {
        const key = this.createCacheKey(entry.url, entry.platform);
        this.memoryCache.set(key, entry);
      }
    });
  }

  /**
   * Health check and diagnostics
   */
  async healthCheck(): Promise<{ status: string; details: any }> {
    try {
      const stats = this.getStats();
      const memoryUsage = typeof process !== 'undefined' ? process.memoryUsage?.() || { heapUsed: 0, heapTotal: 0 } : { heapUsed: 0, heapTotal: 0 };
      
      const healthScore = this.calculateHealthScore(stats);
      
      return {
        status: healthScore > 0.8 ? 'healthy' : healthScore > 0.5 ? 'degraded' : 'unhealthy',
        details: {
          initialized: this.isInitialized,
          stats,
          config: this.config,
          memoryUsage: {
            heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
            heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024)
          },
          healthScore
        }
      };
      
    } catch (error) {
      return {
        status: 'error',
        details: { error: error instanceof Error ? error.message : 'Unknown error' }
      };
    }
  }

  private calculateHealthScore(stats: CacheStats): number {
    const hitRateScore = stats.hitRate;
    const sizeScore = stats.totalSize < 50 * 1024 * 1024 ? 1 : 0.5; // 50MB threshold
    const evictionScore = stats.evictions < 100 ? 1 : 0.7;
    
    return (hitRateScore * 0.5) + (sizeScore * 0.3) + (evictionScore * 0.2);
  }

  /**
   * Cleanup and disposal
   */
  dispose(): void {
    this.memoryCache.clear();
    this.saveCacheStats();
    
    if (this.dbCache) {
      this.dbCache.close();
    }
    
    logger.info('ProductCacheService disposed');
  }
}

export default ProductCacheService;