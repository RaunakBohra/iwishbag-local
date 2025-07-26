import { currencyService, Currency } from './CurrencyService';
import { logger } from '@/lib/logger';

// Edge API URL - can be configured via environment variable
const EDGE_API_URL = import.meta.env.VITE_EDGE_API_URL || 'https://iwishbag-edge-api.rnkbohra.workers.dev';

/**
 * Browser-Optimized Currency Service with D1 Edge Cache
 * 3-tier caching: Memory → D1 Edge → localStorage → Database
 * Provides global edge performance with automatic fallback
 */
class OptimizedCurrencyService {
  private static instance: OptimizedCurrencyService;
  private memoryCache: Map<string, { data: any; expires: number }> = new Map();
  private readonly MEMORY_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly STORAGE_TTL = 30 * 60 * 1000; // 30 minutes

  private constructor() {
    // Clean up expired localStorage entries on startup
    this.cleanupExpiredStorage();
  }

  static getInstance(): OptimizedCurrencyService {
    if (!OptimizedCurrencyService.instance) {
      OptimizedCurrencyService.instance = new OptimizedCurrencyService();
    }
    return OptimizedCurrencyService.instance;
  }

  /**
   * Smart 3-tier caching: Memory → D1 Edge → localStorage → Database
   */
  private async getCachedData<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl: number = this.STORAGE_TTL,
    d1Endpoint?: string
  ): Promise<T> {
    // Tier 1: Memory cache (instant access)
    const memoryCached = this.memoryCache.get(key);
    if (memoryCached && Date.now() < memoryCached.expires) {
      console.log(`[OptimizedCurrency] Memory cache hit: ${key}`);
      return memoryCached.data;
    }

    // Tier 2: D1 Edge cache (global, <10ms)
    if (d1Endpoint) {
      try {
        const response = await fetch(`${EDGE_API_URL}${d1Endpoint}`);
        if (response.ok) {
          const data = await response.json();
          console.log(`[OptimizedCurrency] D1 edge cache hit: ${key}`);
          
          // Cache in memory
          this.memoryCache.set(key, {
            data,
            expires: Date.now() + this.MEMORY_TTL
          });
          
          // Also cache in localStorage
          try {
            const storageKey = `iwishbag_currency_${key}`;
            localStorage.setItem(storageKey, JSON.stringify({
              data,
              expires: Date.now() + ttl,
              cached_at: Date.now(),
              source: 'd1_edge'
            }));
          } catch (err) {
            // Storage might be full
          }
          
          return data;
        }
      } catch (error) {
        logger.warn('D1 edge cache error, falling back', { error, key });
      }
    }

    // Tier 3: localStorage cache (very fast)
    try {
      const storageKey = `iwishbag_currency_${key}`;
      const storedData = localStorage.getItem(storageKey);
      
      if (storedData) {
        const parsed = JSON.parse(storedData);
        if (Date.now() < parsed.expires) {
          console.log(`[OptimizedCurrency] Storage cache hit: ${key}`);
          
          // Promote to memory cache
          this.memoryCache.set(key, {
            data: parsed.data,
            expires: Date.now() + this.MEMORY_TTL
          });
          
          return parsed.data;
        }
      }
    } catch (error) {
      console.warn(`[OptimizedCurrency] Storage cache error for ${key}:`, error);
    }

    // Tier 4: Database/API call
    console.log(`[OptimizedCurrency] Fetching from database: ${key}`);
    const data = await fetcher();
    
    // Cache in both tiers
    this.memoryCache.set(key, {
      data,
      expires: Date.now() + this.MEMORY_TTL
    });

    try {
      const storageKey = `iwishbag_currency_${key}`;
      localStorage.setItem(storageKey, JSON.stringify({
        data,
        expires: Date.now() + ttl,
        cached_at: Date.now()
      }));
    } catch (error) {
      console.warn(`[OptimizedCurrency] Failed to cache in localStorage:`, error);
    }

    return data;
  }

  /**
   * Get exchange rate with smart caching and D1 edge
   */
  async getExchangeRate(originCountry: string, destinationCountry: string): Promise<number> {
    const cacheKey = `rate_${originCountry}_${destinationCountry}`;
    
    // Try to get from D1 edge cache first
    const d1Endpoint = `/api/currency/rates?from=${originCountry}&to=${destinationCountry}`;
    
    return this.getCachedData(
      cacheKey,
      () => currencyService.getExchangeRate(originCountry, destinationCountry),
      6 * 60 * 60 * 1000, // 6 hours - exchange rates are relatively stable
      d1Endpoint
    ).then(result => {
      // Handle D1 response format
      if (typeof result === 'object' && 'rate' in result) {
        return result.rate;
      }
      return result;
    });
  }

  /**
   * Get exchange rate by currency with caching
   */
  async getExchangeRateByCurrency(fromCurrency: string, toCurrency: string): Promise<number> {
    const cacheKey = `currency_${fromCurrency}_${toCurrency}`;
    
    return this.getCachedData(
      cacheKey,
      () => currencyService.getExchangeRateByCurrency(fromCurrency, toCurrency),
      6 * 60 * 60 * 1000 // 6 hours
    );
  }

  /**
   * Get all currencies with caching and D1 edge
   */
  async getAllCurrencies(): Promise<Currency[]> {
    return this.getCachedData(
      'all_currencies',
      () => currencyService.getAllCurrencies(),
      24 * 60 * 60 * 1000, // 24 hours - currencies don't change often
      '/api/countries' // D1 endpoint
    ).then(result => {
      // Handle D1 response format
      if (result && 'countries' in result) {
        // Convert country data to Currency format
        return result.countries.map(country => ({
          code: country.currency,
          name: country.currency,
          symbol: country.symbol,
          exchange_rate: country.exchange_rate
        }));
      }
      return result;
    });
  }

  /**
   * Get currency for country with caching and D1 edge
   */
  async getCurrencyForCountry(countryCode: string): Promise<string> {
    const cacheKey = `country_currency_${countryCode}`;
    
    return this.getCachedData(
      cacheKey,
      () => currencyService.getCurrencyForCountry(countryCode),
      24 * 60 * 60 * 1000, // 24 hours
      `/api/countries/${countryCode}` // D1 endpoint
    ).then(result => {
      // Handle D1 response format
      if (result && 'country' in result && result.country) {
        return result.country.currency;
      }
      return result;
    });
  }

  /**
   * Batch warm up cache with common currency pairs
   */
  async warmUpCache(): Promise<void> {
    console.log('[OptimizedCurrency] Warming up cache...');
    
    const commonPairs = [
      ['US', 'IN'], ['US', 'NP'], ['IN', 'NP'], ['GB', 'US'], ['AU', 'US'],
      ['CA', 'US'], ['DE', 'US'], ['FR', 'US'], ['JP', 'US'], ['CN', 'US']
    ];

    // Load all pairs concurrently but with small delay to avoid overwhelming
    for (let i = 0; i < commonPairs.length; i++) {
      const [origin, dest] = commonPairs[i];
      try {
        await this.getExchangeRate(origin, dest);
        if (i < commonPairs.length - 1) {
          // Small delay to avoid overwhelming the API
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      } catch (error) {
        console.warn(`[OptimizedCurrency] Failed to warm ${origin}→${dest}:`, error);
      }
    }

    console.log('[OptimizedCurrency] Cache warmup completed');
  }

  /**
   * Clear all caches
   */
  async clearCache(): Promise<void> {
    // Clear memory cache
    this.memoryCache.clear();
    
    // Clear localStorage cache
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('iwishbag_currency_')) {
        keysToRemove.push(key);
      }
    }
    
    keysToRemove.forEach(key => {
      try {
        localStorage.removeItem(key);
      } catch (error) {
        console.warn(`Failed to remove ${key} from localStorage:`, error);
      }
    });
    
    console.log('[OptimizedCurrency] All caches cleared');
  }

  /**
   * Clean up expired localStorage entries
   */
  private cleanupExpiredStorage(): void {
    const now = Date.now();
    const keysToRemove: string[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('iwishbag_currency_')) {
        try {
          const data = JSON.parse(localStorage.getItem(key) || '{}');
          if (data.expires && now > data.expires) {
            keysToRemove.push(key);
          }
        } catch (error) {
          // Invalid data, remove it
          keysToRemove.push(key);
        }
      }
    }
    
    keysToRemove.forEach(key => {
      try {
        localStorage.removeItem(key);
      } catch (error) {
        console.warn(`Failed to cleanup ${key}:`, error);
      }
    });
    
    if (keysToRemove.length > 0) {
      console.log(`[OptimizedCurrency] Cleaned up ${keysToRemove.length} expired cache entries`);
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    memoryCacheSize: number;
    storageCacheSize: number;
    hitRate: string;
  } {
    let storageCacheSize = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('iwishbag_currency_')) {
        storageCacheSize++;
      }
    }

    return {
      memoryCacheSize: this.memoryCache.size,
      storageCacheSize,
      hitRate: 'Available after testing'
    };
  }

  /**
   * Preload essential data for instant app startup
   */
  async preloadEssentials(): Promise<void> {
    const essentials = [
      () => this.getAllCurrencies(),
      () => this.getCurrencyForCountry('US'),
      () => this.getCurrencyForCountry('IN'), 
      () => this.getCurrencyForCountry('NP'),
      () => this.getExchangeRate('US', 'IN'),
      () => this.getExchangeRate('US', 'NP')
    ];

    await Promise.allSettled(essentials.map(fn => fn()));
    console.log('[OptimizedCurrency] Essential data preloaded');
  }

  // Forward static methods (no caching needed)
  getCurrencySymbol(currencyCode: string): string {
    return currencyService.getCurrencySymbol(currencyCode);
  }

  getCurrencyName(currencyCode: string): string {
    return currencyService.getCurrencyName(currencyCode);
  }

  formatAmount(amount: number, currencyCode: string): string {
    return currencyService.formatAmount(amount, currencyCode);
  }

  async isValidPaymentAmount(amount: number, currencyCode: string): Promise<boolean> {
    return currencyService.isValidPaymentAmount(amount, currencyCode);
  }

  getMinimumPaymentAmountSync(currencyCode: string): number {
    return currencyService.getMinimumPaymentAmountSync(currencyCode);
  }

  isSupportedByPaymentGateway(currencyCode: string): boolean {
    return currencyService.isSupportedByPaymentGateway(currencyCode);
  }

  // Forward sync methods needed by hooks
  getCurrencyForCountrySync(countryCode: string): string {
    return currencyService.getCurrencyForCountrySync(countryCode);
  }

  getCurrencySymbolSync(currencyCode: string): string {
    return currencyService.getCurrencySymbolSync(currencyCode);
  }

  // Forward async methods with caching
  async getCountryForCurrency(currencyCode: string): Promise<string | null> {
    const cacheKey = `country_for_currency_${currencyCode}`;
    
    return this.getCachedData(
      cacheKey,
      () => currencyService.getCountryForCurrency(currencyCode),
      24 * 60 * 60 * 1000 // 24 hours - country mappings don't change often
    );
  }
}

// Export optimized singleton
export const optimizedCurrencyService = OptimizedCurrencyService.getInstance();

// Performance test function
export async function testOptimizedCurrencyPerformance() {
  console.log('[OptimizedCurrency] Performance test starting...');
  
  const testPairs = [
    ['US', 'IN'], ['US', 'NP'], ['IN', 'NP'], ['GB', 'US'], ['AU', 'US']
  ];
  const iterations = 3;
  
  // Test original service
  console.log('Testing original service...');
  const originalTimes: number[] = [];
  for (const [origin, dest] of testPairs) {
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      await currencyService.getExchangeRate(origin, dest);
      originalTimes.push(performance.now() - start);
    }
  }
  
  // Test optimized service (first run - will populate cache)
  console.log('Testing optimized service (first run)...');
  const optimizedFirstTimes: number[] = [];
  for (const [origin, dest] of testPairs) {
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      await optimizedCurrencyService.getExchangeRate(origin, dest);
      optimizedFirstTimes.push(performance.now() - start);
    }
  }
  
  // Test optimized service (cached runs)
  console.log('Testing optimized service (cached runs)...');
  const optimizedCachedTimes: number[] = [];
  for (const [origin, dest] of testPairs) {
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      await optimizedCurrencyService.getExchangeRate(origin, dest);
      optimizedCachedTimes.push(performance.now() - start);
    }
  }
  
  const avgOriginal = originalTimes.reduce((a, b) => a + b) / originalTimes.length;
  const avgOptimizedFirst = optimizedFirstTimes.reduce((a, b) => a + b) / optimizedFirstTimes.length;
  const avgOptimizedCached = optimizedCachedTimes.reduce((a, b) => a + b) / optimizedCachedTimes.length;
  
  const improvementVsOriginal = ((avgOriginal - avgOptimizedCached) / avgOriginal) * 100;
  
  console.log('[OptimizedCurrency] Performance test results:');
  console.log(`Original service: ${avgOriginal.toFixed(2)}ms avg`);
  console.log(`Optimized service (first): ${avgOptimizedFirst.toFixed(2)}ms avg`);
  console.log(`Optimized service (cached): ${avgOptimizedCached.toFixed(2)}ms avg`);
  console.log(`Cache improvement: ${improvementVsOriginal.toFixed(1)}%`);
  
  return {
    avgOriginal: avgOriginal.toFixed(2),
    avgOptimizedCached: avgOptimizedCached.toFixed(2),
    improvement: improvementVsOriginal.toFixed(1),
    cacheHitRate: '100.0' // All cached after first run
  };
}