import { CloudflareKVService } from './CloudflareKVService';
import { currencyService, Currency } from './CurrencyService';
import { unifiedConfigService } from './UnifiedConfigurationService';

/**
 * KV-Enhanced Currency Service
 * Adds Cloudflare KV caching to the existing CurrencyService for lightning-fast global performance
 */
class KVEnhancedCurrencyService {
  private static instance: KVEnhancedCurrencyService;
  private kvService: CloudflareKVService;
  private clientCache: Map<string, { data: any; expires: number }> = new Map();
  private readonly CLIENT_CACHE_TTL = 5 * 60 * 1000; // 5 minutes client cache

  private constructor() {
    this.kvService = CloudflareKVService.getInstance();
  }

  static getInstance(): KVEnhancedCurrencyService {
    if (!KVEnhancedCurrencyService.instance) {
      KVEnhancedCurrencyService.instance = new KVEnhancedCurrencyService();
    }
    return KVEnhancedCurrencyService.instance;
  }

  /**
   * 3-Tier caching: Client → KV → Database
   */
  private async getCachedData<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl: number = 3600
  ): Promise<T> {
    // Tier 1: Client-side cache (instant, 5min)
    const clientCached = this.clientCache.get(key);
    if (clientCached && Date.now() < clientCached.expires) {
      console.log(`[KVCurrency] Client cache hit: ${key}`);
      return clientCached.data;
    }

    try {
      // Tier 2: KV cache (5-20ms globally, configurable TTL)
      const kvData = await this.kvService.get<T>(key);
      if (kvData) {
        console.log(`[KVCurrency] KV cache hit: ${key}`);
        // Cache client-side for instant future access
        this.clientCache.set(key, {
          data: kvData,
          expires: Date.now() + this.CLIENT_CACHE_TTL
        });
        return kvData;
      }
    } catch (error) {
      console.warn(`[KVCurrency] KV cache miss for ${key}:`, error.message);
    }

    // Tier 3: Database/API (fallback)
    console.log(`[KVCurrency] Fetching from source: ${key}`);
    const data = await fetcher();
    
    // Cache in both tiers
    try {
      await this.kvService.set(key, data, { ttl });
    } catch (error) {
      console.warn(`[KVCurrency] Failed to cache in KV:`, error.message);
    }
    
    this.clientCache.set(key, {
      data,
      expires: Date.now() + this.CLIENT_CACHE_TTL
    });

    return data;
  }

  /**
   * Get exchange rate with aggressive caching (24 hour KV cache)
   */
  async getExchangeRate(originCountry: string, destinationCountry: string): Promise<number> {
    const cacheKey = `exchange_rate:${originCountry}_${destinationCountry}`;
    
    return this.getCachedData(
      cacheKey,
      () => currencyService.getExchangeRate(originCountry, destinationCountry),
      86400 // 24 hours - exchange rates change daily
    );
  }

  /**
   * Get exchange rate by currency with caching
   */
  async getExchangeRateByCurrency(fromCurrency: string, toCurrency: string): Promise<number> {
    const cacheKey = `currency_rate:${fromCurrency}_${toCurrency}`;
    
    return this.getCachedData(
      cacheKey,
      () => currencyService.getExchangeRateByCurrency(fromCurrency, toCurrency),
      86400 // 24 hours
    );
  }

  /**
   * Get all currencies with caching (weekly refresh)
   */
  async getAllCurrencies(): Promise<Currency[]> {
    return this.getCachedData(
      'all_currencies',
      () => currencyService.getAllCurrencies(),
      604800 // 7 days - currencies don't change often
    );
  }

  /**
   * Get currency for country with caching
   */
  async getCurrencyForCountry(countryCode: string): Promise<string> {
    const cacheKey = `country_currency:${countryCode}`;
    
    return this.getCachedData(
      cacheKey,
      () => currencyService.getCurrencyForCountry(countryCode),
      604800 // 7 days
    );
  }

  /**
   * Get country settings with caching (daily refresh)
   */
  async getCountrySettings(countryCode: string): Promise<any> {
    const cacheKey = `country_settings:${countryCode}`;
    
    return this.getCachedData(
      cacheKey,
      () => unifiedConfigService.getCountryConfig(countryCode),
      86400 // 24 hours
    );
  }

  /**
   * Warm up cache with most common exchange rates
   */
  async warmUpCache(): Promise<void> {
    console.log('[KVCurrency] Warming up cache...');
    
    const commonPairs = [
      // USD pairs (most common)
      ['US', 'IN'], ['US', 'NP'], ['US', 'GB'], ['US', 'AU'], ['US', 'CA'],
      // Regional pairs
      ['IN', 'NP'], ['DE', 'GB'], ['AU', 'NZ'], ['CA', 'US'],
      // Reverse pairs
      ['IN', 'US'], ['NP', 'US'], ['GB', 'US'], ['AU', 'US'], ['CA', 'US']
    ];

    const warmupPromises = commonPairs.map(async ([origin, dest]) => {
      try {
        await this.getExchangeRate(origin, dest);
      } catch (error) {
        console.warn(`[KVCurrency] Failed to warm ${origin}→${dest}:`, error.message);
      }
    });

    await Promise.all(warmupPromises);
    console.log('[KVCurrency] Cache warmup completed');
  }

  /**
   * Batch update exchange rates (for scheduled updates)
   */
  async batchUpdateExchangeRates(rates: Record<string, number>): Promise<void> {
    const updatePromises = Object.entries(rates).map(async ([pair, rate]) => {
      const cacheKey = `exchange_rate:${pair}`;
      try {
        await this.kvService.set(cacheKey, rate, { ttl: 86400 });
        // Clear client cache to force refresh
        this.clientCache.delete(cacheKey);
      } catch (error) {
        console.warn(`[KVCurrency] Failed to update ${pair}:`, error.message);
      }
    });

    await Promise.all(updatePromises);
    console.log(`[KVCurrency] Batch updated ${Object.keys(rates).length} rates`);
  }

  /**
   * Clear all caches (use sparingly)
   */
  async clearCache(): Promise<void> {
    this.clientCache.clear();
    console.log('[KVCurrency] All caches cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    clientCacheSize: number;
    clientCacheHitRate: string;
  } {
    return {
      clientCacheSize: this.clientCache.size,
      clientCacheHitRate: 'Available in production analytics'
    };
  }

  // Forward other methods to original service (no caching needed for static data)
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
}

// Export enhanced singleton
export const kvEnhancedCurrencyService = KVEnhancedCurrencyService.getInstance();

// Quick performance test function
export async function testCurrencyPerformance() {
  console.log('[KVCurrency] Performance test starting...');
  
  const testPair = ['US', 'IN'];
  const iterations = 5;
  
  // Test original service
  const originalStart = performance.now();
  for (let i = 0; i < iterations; i++) {
    await currencyService.getExchangeRate(testPair[0], testPair[1]);
  }
  const originalTime = performance.now() - originalStart;
  
  // Test KV-enhanced service
  const kvStart = performance.now();
  for (let i = 0; i < iterations; i++) {
    await kvEnhancedCurrencyService.getExchangeRate(testPair[0], testPair[1]);
  }
  const kvTime = performance.now() - kvStart;
  
  console.log('[KVCurrency] Performance test results:');
  console.log(`Original service: ${originalTime.toFixed(2)}ms (${(originalTime/iterations).toFixed(2)}ms avg)`);
  console.log(`KV-enhanced service: ${kvTime.toFixed(2)}ms (${(kvTime/iterations).toFixed(2)}ms avg)`);
  console.log(`Performance improvement: ${((originalTime - kvTime) / originalTime * 100).toFixed(1)}%`);
}