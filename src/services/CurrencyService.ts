import { supabase } from '@/integrations/supabase/client';
import { unifiedConfigService } from './UnifiedConfigurationService';
import { logger } from '@/utils/logger';

// Edge API URL - can be configured via environment variable
const EDGE_API_URL = import.meta.env.VITE_EDGE_API_URL || 'https://iwishbag-edge-api.rnkbohra.workers.dev';

export interface Currency {
  code: string;
  name: string;
  symbol: string;
  decimal_places?: number;
  is_active?: boolean;
  min_payment_amount?: number;
  thousand_separator?: string;
  decimal_separator?: string;
}

export interface CountrySettings {
  code: string;
  name: string;
  currency: string;
  rate_from_usd?: number;
  minimum_payment_amount?: number;
  decimal_places?: number;
  thousand_separator?: string;
  decimal_separator?: string;
  symbol_position?: string;
  symbol_space?: boolean;
}

class CurrencyService {
  private static instance: CurrencyService;
  private logThrottle = new Map<string, number>();
  
  // Multi-tier caching system
  private memoryCache: Map<string, { data: any; expires: number }> = new Map();
  private currencyCache: Map<string, Currency> = new Map();
  private allCurrenciesCache: Currency[] | null = null;
  private countryCurrencyMapCache: Map<string, string> = new Map();
  private cacheTimestamp: number = 0;
  
  // Cache durations
  private readonly MEMORY_TTL = 5 * 60 * 1000; // 5 minutes (fastest access)
  private readonly STORAGE_TTL = 30 * 60 * 1000; // 30 minutes (localStorage)
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes (legacy compatibility)

  private constructor() {
    // Clean up expired localStorage entries on startup
    this.cleanupExpiredStorage();
    // Initialize cache warmup
    this.scheduleEssentialDataPreload();
  }

  static getInstance(): CurrencyService {
    if (!CurrencyService.instance) {
      CurrencyService.instance = new CurrencyService();
    }
    return CurrencyService.instance;
  }

  /**
   * Check if cache is still valid
   */
  private isCacheValid(): boolean {
    return Date.now() - this.cacheTimestamp < this.CACHE_DURATION;
  }

  /**
   * Clear all caches
   */
  clearCache(): void {
    this.currencyCache.clear();
    this.allCurrenciesCache = null;
    this.countryCurrencyMapCache.clear();
    this.memoryCache.clear();
    this.cacheTimestamp = 0;
    
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
        logger.warn(`Failed to remove ${key} from localStorage:`, error);
      }
    });
    
    console.log('[CurrencyService] All caches cleared');
  }

  /**
   * Unified 3-tier caching system: Memory → D1 Edge → localStorage → Database
   */
  private async getCachedData<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl: number = this.STORAGE_TTL,
    d1Endpoint?: string
  ): Promise<T> {
    console.log(`🔍 [Cache] getCachedData called for key: ${key}`);
    console.log(`🔍 [Cache] TTL: ${ttl}ms, D1 endpoint: ${d1Endpoint || 'none'}`);
    
    // Tier 1: Memory cache (instant access)
    const memoryCached = this.memoryCache.get(key);
    if (memoryCached && Date.now() < memoryCached.expires) {
      const timeLeft = memoryCached.expires - Date.now();
      console.log(`✅ [Cache] TIER 1 HIT: Memory cache for ${key} (${Math.round(timeLeft/1000)}s remaining)`);
      // Throttle cache hit logs to prevent spam
      const now = Date.now();
      const lastLog = this.logThrottle.get(key) || 0;
      if (now - lastLog > 60000) { // Log at most every 60 seconds
        console.log(`[CurrencyService] Memory cache hit: ${key}`);
        this.logThrottle.set(key, now);
      }
      return memoryCached.data;
    } else if (memoryCached) {
      console.log(`⏰ [Cache] TIER 1 EXPIRED: Memory cache expired for ${key}`);
    } else {
      console.log(`❌ [Cache] TIER 1 MISS: No memory cache for ${key}`);
    }

    // Tier 2: D1 Edge cache (global, <10ms)
    if (d1Endpoint) {
      console.log(`🌐 [Cache] TIER 2: Trying D1 edge cache...`);
      console.log(`🌐 [Cache] Fetching: ${EDGE_API_URL}${d1Endpoint}`);
      
      try {
        const fetchStart = performance.now();
        const response = await fetch(`${EDGE_API_URL}${d1Endpoint}`, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'iwishbag-frontend/1.0'
          }
        });
        const fetchTime = performance.now() - fetchStart;
        
        console.log(`🌐 [Cache] D1 fetch completed in ${Math.round(fetchTime)}ms, status: ${response.status}`);
        
        if (response.ok) {
          const data = await response.json();
          console.log(`🌐 [Cache] D1 response data:`, data);
          
          // Check if D1 cache returned null/invalid data for exchange rates
          if (key.startsWith('rate_') && data && typeof data === 'object' && 'rate' in data && data.rate === null) {
            console.log(`⚠️ [Cache] D1 returned null rate, skipping to database: ${key}`);
            // Don't return null data, fall through to database fetch
          } else {
            console.log(`✅ [Cache] TIER 2 HIT: D1 edge cache for ${key}`);
            
            // Cache in memory
            this.memoryCache.set(key, {
              data,
              expires: Date.now() + this.MEMORY_TTL
            });
            
            // Also cache in localStorage
            this.cacheToLocalStorage(key, data, ttl);
            
            return data;
          }
        } else {
          console.log(`❌ [Cache] D1 request failed: ${response.status} ${response.statusText}`);
          const errorText = await response.text().catch(() => 'Could not read error');
          console.log(`❌ [Cache] D1 error details:`, errorText);
        }
      } catch (error) {
        console.error(`💥 [Cache] D1 edge cache error:`, {
          url: `${EDGE_API_URL}${d1Endpoint}`,
          error: error.message,
          type: error.name
        });
        logger?.warn('D1 edge cache error, falling back', { error, key });
      }
    }

    // Tier 3: localStorage cache (very fast)
    console.log(`💾 [Cache] TIER 3: Trying localStorage cache...`);
    try {
      const storageKey = `iwishbag_currency_${key}`;
      const storedData = localStorage.getItem(storageKey);
      
      if (storedData) {
        const parsed = JSON.parse(storedData);
        const timeLeft = parsed.expires - Date.now();
        console.log(`💾 [Cache] Found localStorage entry, expires in: ${Math.round(timeLeft/1000)}s`);
        
        if (Date.now() < parsed.expires) {
          console.log(`✅ [Cache] TIER 3 HIT: localStorage cache for ${key}`);
          console.log(`✅ [Cache] Cached data:`, parsed.data);
          
          // Promote to memory cache
          this.memoryCache.set(key, {
            data: parsed.data,
            expires: Date.now() + this.MEMORY_TTL
          });
          
          return parsed.data;
        } else {
          console.log(`⏰ [Cache] TIER 3 EXPIRED: localStorage cache expired for ${key}`);
        }
      } else {
        console.log(`❌ [Cache] TIER 3 MISS: No localStorage entry for ${key}`);
      }
    } catch (error) {
      console.error(`💥 [Cache] localStorage error:`, error);
      logger.warn(`[CurrencyService] Storage cache error for ${key}:`, error);
    }

    // Tier 4: Database/API call
    console.log(`🔄 [Cache] TIER 4: Cache miss - fetching fresh data from database/API for ${key}`);
    const fetchStart = performance.now();
    const data = await fetcher();
    const fetchTime = performance.now() - fetchStart;
    
    console.log(`✅ [Cache] TIER 4 SUCCESS: Fresh data fetched in ${Math.round(fetchTime)}ms`);
    console.log(`✅ [Cache] Fresh data:`, data);
    
    // Cache in both tiers
    this.memoryCache.set(key, {
      data,
      expires: Date.now() + this.MEMORY_TTL
    });

    this.cacheToLocalStorage(key, data, ttl);
    console.log(`💾 [Cache] Data cached in memory (${this.MEMORY_TTL}ms) and localStorage (${ttl}ms)`);

    return data;
  }

  /**
   * Cache data to localStorage with error handling
   */
  private cacheToLocalStorage(key: string, data: any, ttl: number): void {
    try {
      const storageKey = `iwishbag_currency_${key}`;
      localStorage.setItem(storageKey, JSON.stringify({
        data,
        expires: Date.now() + ttl,
        cached_at: Date.now(),
        source: 'database'
      }));
    } catch (error) {
      logger.warn(`[CurrencyService] Failed to cache in localStorage:`, error);
    }
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
        logger.warn(`Failed to cleanup ${key}:`, error);
      }
    });
    
    if (keysToRemove.length > 0) {
      console.log(`[CurrencyService] Cleaned up ${keysToRemove.length} expired cache entries`);
    }
  }

  /**
   * Get all unique currencies from country_settings table with enhanced caching
   */
  async getAllCurrencies(): Promise<Currency[]> {
    // Temporarily clear cache in development to ensure fresh data
    if (import.meta.env.DEV) {
      console.log('[CurrencyService] Development mode: clearing cache for fresh data');
      this.clearCache();
    }
    
    return this.getCachedData(
      'all_currencies',
      async () => {
        try {
          console.log('[CurrencyService] Fetching currencies from country_settings table...');
          
          // Query country_settings table directly (same as useAllCountries)
          const { data: countries, error } = await supabase
            .from('country_settings')
            .select('*')
            .order('name');

          if (error) {
            logger.error('[CurrencyService] Database error:', error);
            throw new Error(error.message);
          }

          if (!countries || countries.length === 0) {
            logger.warn('No countries found in country_settings, using fallback currencies');
            return this.getFallbackCurrencies();
          }

          console.log(`[CurrencyService] Found ${countries.length} countries`);

          // Group by currency and get the most complete data for each
          const currencyMap = new Map<string, Currency>();

          countries.forEach((country) => {
            if (!country.currency) return;

            const existing = currencyMap.get(country.currency);
            const currency: Currency = {
              code: country.currency,
              name: this.getCurrencyNameSync(country.currency),
              symbol: this.getCurrencySymbolSync(country.currency),
              decimal_places: this.getCurrencyDecimalPlacesSync(country.currency),
              min_payment_amount: country.minimum_payment_amount ?? undefined,
              thousand_separator: ',',
              decimal_separator: '.',
              is_active: true,
            };

            // Keep the one with more complete data (prefer non-null values)
            if (!existing || (country.minimum_payment_amount && !existing.min_payment_amount)) {
              currencyMap.set(country.currency, currency);
            }
          });

          const currencies = Array.from(currencyMap.values());
          console.log(`[CurrencyService] Processed ${currencies.length} unique currencies`);

          // Update legacy caches for backward compatibility
          this.allCurrenciesCache = currencies;
          this.cacheTimestamp = Date.now();

          // Update individual currency cache
          currencies.forEach((currency) => {
            this.currencyCache.set(currency.code, currency);
          });

          return currencies;
        } catch (error) {
          logger.error('Error in getAllCurrencies:', error);
          return this.getFallbackCurrencies();
        }
      },
      24 * 60 * 60 * 1000 // 24 hours - currencies don't change often
      // '/api/countries' // D1 endpoint - temporarily disabled to force database query
    ).then(async result => {
      // Handle D1 response format
      if (result && 'countries' in result) {
        // Convert country data to Currency format
        return result.countries.map(country => ({
          code: country.currency,
          name: country.currency,
          symbol: country.symbol,
          decimal_places: this.getCurrencyDecimalPlacesSync(country.currency),
          is_active: true,
        }));
      }
      return result;
    });
  }

  /**
   * Get currency by code
   */
  async getCurrency(code: string): Promise<Currency | null> {
    if (this.currencyCache.has(code) && this.isCacheValid()) {
      return this.currencyCache.get(code) || null;
    }

    // If not in cache, fetch all currencies (which will populate cache)
    const allCurrencies = await this.getAllCurrencies();
    return allCurrencies.find((c) => c.code === code) || null;
  }

  /**
   * Get country-to-currency mapping from unified configuration system
   */
  async getCountryCurrencyMap(): Promise<Map<string, string>> {
    if (this.countryCurrencyMapCache.size > 0 && this.isCacheValid()) {
      return this.countryCurrencyMapCache;
    }

    try {
      // Get all countries from unified configuration
      const allCountries = await unifiedConfigService.getAllCountries();

      if (!allCountries || Object.keys(allCountries).length === 0) {
        logger.warn('No countries found in unified config, using fallback mapping');
        return this.getFallbackCountryCurrencyMap();
      }

      const map = new Map<string, string>();
      Object.entries(allCountries).forEach(([countryCode, countryConfig]) => {
        if (countryCode && countryConfig.currency) {
          map.set(countryCode, countryConfig.currency);
        }
      });

      this.countryCurrencyMapCache = map;
      this.cacheTimestamp = Date.now();

      return map;
    } catch (error) {
      logger.error('Error in getCountryCurrencyMap:', error);
      return this.getFallbackCountryCurrencyMap();
    }
  }

  /**
   * Get currency for a specific country with enhanced caching
   */
  async getCurrencyForCountry(countryCode: string): Promise<string> {
    const cacheKey = `country_currency_${countryCode}`;
    
    return this.getCachedData(
      cacheKey,
      async () => {
        const map = await this.getCountryCurrencyMap();
        return map.get(countryCode) || 'USD';
      },
      24 * 60 * 60 * 1000, // 24 hours
      `/api/countries/${countryCode}` // D1 endpoint
    ).then(result => {
      // Handle D1 response format
      if (result && typeof result === 'object' && 'country' in result && result.country) {
        return result.country.currency || 'USD';
      }
      return result;
    });
  }

  /**
   * Get currency for a specific country (synchronous version using cached data)
   */
  getCurrencyForCountrySync(countryCode: string): string {
    // Use cached data if available
    if (this.countryCurrencyMapCache.has(countryCode) && this.isCacheValid()) {
      return this.countryCurrencyMapCache.get(countryCode) || 'USD';
    }

    // Fall back to hardcoded mapping
    const fallbackMap = this.getFallbackCountryCurrencyMap();
    return fallbackMap.get(countryCode) || 'USD';
  }

  /**
   * Get full country settings including currency and exchange rate data
   * This is the function needed for proper currency conversion
   */
  async getCountrySettings(countryCode: string): Promise<CountrySettings | null> {
    console.log(`[CURRENCY SERVICE] Getting country settings for: ${countryCode}`);
    
    try {
      const { data, error } = await supabase
        .from('country_settings')
        .select('code, name, currency, rate_from_usd, minimum_payment_amount, decimal_places, thousand_separator, decimal_separator, symbol_position, symbol_space')
        .eq('code', countryCode)
        .single();

      if (error) {
        logger.error(`[CURRENCY SERVICE] Error fetching country settings for ${countryCode}:`, error);
        return null;
      }

      if (!data) {
        logger.warn(`[CURRENCY SERVICE] No country settings found for ${countryCode}`);
        return null;
      }

      console.log(`[CURRENCY SERVICE] ✅ Found settings for ${countryCode}:`, {
        currency: data.currency,
        rate_from_usd: data.rate_from_usd,
        name: data.name
      });

      return {
        code: data.code,
        name: data.name,
        currency: data.currency,
        rate_from_usd: data.rate_from_usd,
        minimum_payment_amount: data.minimum_payment_amount,
        decimal_places: data.decimal_places,
        thousand_separator: data.thousand_separator,
        decimal_separator: data.decimal_separator,
        symbol_position: data.symbol_position,
        symbol_space: data.symbol_space,
      };
    } catch (error) {
      logger.error(`[CURRENCY SERVICE] Exception getting country settings for ${countryCode}:`, error);
      return null;
    }
  }

  /**
   * Get all currencies available for a specific country
   * (For now, returns all currencies but highlights the country's default)
   */
  async getAvailableCurrenciesForCountry(countryCode: string): Promise<{
    default: string;
    all: Currency[];
  }> {
    const allCurrencies = await this.getAllCurrencies();
    const defaultCurrency = await this.getCurrencyForCountry(countryCode);

    return {
      default: defaultCurrency,
      all: allCurrencies,
    };
  }

  /**
   * Get currency symbol (synchronous) - public for backward compatibility
   */
  getCurrencySymbol(currencyCode: string): string {
    return this.getCurrencySymbolSync(currencyCode);
  }

  /**
   * Get currency name (synchronous) - public for backward compatibility
   */
  getCurrencyName(currencyCode: string): string {
    return this.getCurrencyNameSync(currencyCode);
  }

  /**
   * Get currency symbol - with database fallback to hardcoded
   */
  private getCurrencySymbolSync(currencyCode: string): string {
    // Hardcoded symbols as fallback
    const symbols: Record<string, string> = {
      USD: '$',
      EUR: '€',
      GBP: '£',
      INR: '₹',
      NPR: '₨',
      CAD: 'C$',
      AUD: 'A$',
      JPY: '¥',
      CNY: '¥',
      SGD: 'S$',
      AED: 'د.إ',
      SAR: 'ر.س',
      EGP: 'ج.م',
      TRY: '₺',
      IDR: 'Rp',
      MYR: 'RM',
      PHP: '₱',
      THB: '฿',
      VND: '₫',
      KRW: '₩',
    };
    return symbols[currencyCode] || currencyCode;
  }

  /**
   * Get currency name - with hardcoded fallback
   */
  private getCurrencyNameSync(currencyCode: string): string {
    const names: Record<string, string> = {
      USD: 'US Dollar',
      EUR: 'Euro',
      GBP: 'British Pound',
      INR: 'Indian Rupee',
      NPR: 'Nepalese Rupee',
      CAD: 'Canadian Dollar',
      AUD: 'Australian Dollar',
      JPY: 'Japanese Yen',
      CNY: 'Chinese Yuan',
      SGD: 'Singapore Dollar',
      AED: 'UAE Dirham',
      SAR: 'Saudi Riyal',
      EGP: 'Egyptian Pound',
      TRY: 'Turkish Lira',
      IDR: 'Indonesian Rupiah',
      MYR: 'Malaysian Ringgit',
      PHP: 'Philippine Peso',
      THB: 'Thai Baht',
      VND: 'Vietnamese Dong',
      KRW: 'South Korean Won',
    };
    return names[currencyCode] || currencyCode;
  }

  /**
   * Get currency decimal places
   */
  /**
   * Get decimal places for currency from unified configuration or fallback
   */
  async getCurrencyDecimalPlaces(currencyCode: string): Promise<number> {
    try {
      // Try to find a country that uses this currency
      const allCountries = await unifiedConfigService.getAllCountries();

      for (const [countryCode, countryConfig] of Object.entries(allCountries)) {
        if (countryConfig.currency === currencyCode) {
          // Use the same fallback logic for consistency
          return this.getCurrencyDecimalPlacesSync(currencyCode);
        }
      }
    } catch (error) {
      logger.error('Error fetching decimal places from unified config:', error);
    }

    return this.getCurrencyDecimalPlacesSync(currencyCode);
  }

  /**
   * Synchronous fallback for decimal places
   */
  private getCurrencyDecimalPlacesSync(currencyCode: string): number {
    // Some currencies don't use decimal places
    const noDecimalCurrencies = ['JPY', 'KRW', 'VND', 'IDR'];
    return noDecimalCurrencies.includes(currencyCode) ? 0 : 2;
  }

  /**
   * Fallback currencies when database is unavailable
   */
  private getFallbackCurrencies(): Currency[] {
    const fallbackCurrencyCodes = [
      'USD',
      'EUR',
      'GBP',
      'INR',
      'NPR',
      'CAD',
      'AUD',
      'JPY',
      'CNY',
      'SGD',
      'AED',
      'SAR',
      'IDR',
      'MYR',
      'PHP',
      'THB',
      'VND',
    ];

    return fallbackCurrencyCodes.map((code) => ({
      code,
      name: this.getCurrencyNameSync(code),
      symbol: this.getCurrencySymbolSync(code),
      decimal_places: this.getCurrencyDecimalPlacesSync(code),
      is_active: true,
    }));
  }

  /**
   * Fallback country-currency mapping when database is unavailable
   */
  private getFallbackCountryCurrencyMap(): Map<string, string> {
    const fallbackMap = new Map([
      ['US', 'USD'],
      ['IN', 'INR'],
      ['NP', 'NPR'],
      ['CA', 'CAD'],
      ['AU', 'AUD'],
      ['GB', 'GBP'],
      ['JP', 'JPY'],
      ['CN', 'CNY'],
      ['SG', 'SGD'],
      ['AE', 'AED'],
      ['SA', 'SAR'],
      ['ID', 'IDR'],
      ['MY', 'MYR'],
      ['PH', 'PHP'],
      ['TH', 'THB'],
      ['VN', 'VND'],
      ['KR', 'KRW'],
    ]);
    return fallbackMap;
  }

  /**
   * Get fallback country-currency mapping (public access)
   */
  getFallbackCountryCurrencyMapSync(): Map<string, string> {
    return this.getFallbackCountryCurrencyMap();
  }

  /**
   * Get country code for a given currency (reverse lookup)
   */
  async getCountryForCurrency(currencyCode: string): Promise<string | null> {
    try {
      // Get all countries from unified configuration
      const allCountries = await unifiedConfigService.getAllCountries();

      // Find the first country that uses this currency
      for (const [countryCode, countryConfig] of Object.entries(allCountries)) {
        if (countryConfig.currency === currencyCode) {
          return countryCode;
        }
      }
    } catch (error) {
      logger.error('Error fetching country for currency from unified config:', error);
    }

    // Fallback to hardcoded mapping
    return this.getCountryForCurrencySync(currencyCode);
  }

  /**
   * Get country code for a given currency (sync fallback)
   */
  getCountryForCurrencySync(currencyCode: string): string | null {
    const fallbackMap = this.getFallbackCountryCurrencyMap();
    for (const [country, currency] of fallbackMap.entries()) {
      if (currency === currencyCode) {
        return country;
      }
    }
    return null;
  }

  /**
   * Check if a currency code is valid
   */
  async isValidCurrency(currencyCode: string): Promise<boolean> {
    const allCurrencies = await this.getAllCurrencies();
    return allCurrencies.some((c) => c.code === currencyCode);
  }

  /**
   * Get currency information for display purposes
   */
  async getCurrencyDisplayInfo(currencyCode: string): Promise<{
    code: string;
    name: string;
    symbol: string;
    formatted: string;
  }> {
    const currency = await this.getCurrency(currencyCode);

    return {
      code: currencyCode,
      name: currency?.name || this.getCurrencyNameSync(currencyCode),
      symbol: currency?.symbol || this.getCurrencySymbolSync(currencyCode),
      formatted: `${currency?.name || this.getCurrencyNameSync(currencyCode)} (${currencyCode})`,
    };
  }

  /**
   * Get minimum payment amount for a currency
   */
  async getMinimumPaymentAmount(currencyCode: string): Promise<number> {
    try {
      // Get all countries from unified configuration
      const allCountries = await unifiedConfigService.getAllCountries();

      // Find a country that uses this currency and has minimum payment amount
      for (const [countryCode, countryConfig] of Object.entries(allCountries)) {
        if (countryConfig.currency === currencyCode && countryConfig.minimum_payment_amount) {
          return countryConfig.minimum_payment_amount;
        }
      }
    } catch (error) {
      logger.error('Error fetching minimum payment amount from unified config:', error);
    }

    // Fallback to hardcoded values
    return this.getMinimumPaymentAmountSync(currencyCode);
  }

  /**
   * Synchronous fallback for minimum payment amount
   */
  getMinimumPaymentAmountSync(currencyCode: string): number {
    const minimumAmounts: Record<string, number> = {
      USD: 10,
      EUR: 10,
      GBP: 8,
      INR: 750,
      NPR: 1200,
      CAD: 15,
      AUD: 15,
      JPY: 1100,
      CNY: 70,
      SGD: 15,
      AED: 40,
      SAR: 40,
      EGP: 200,
      TRY: 100,
      IDR: 150000,
      MYR: 45,
      PHP: 550,
      THB: 350,
      VND: 240000,
      KRW: 12000,
    };
    return minimumAmounts[currencyCode] || 10;
  }

  /**
   * Get currency value category based on minimum payment amount (purchasing power indicator)
   */
  private getCurrencyValueCategory(currencyCode: string): 'ultra_low' | 'low' | 'medium' | 'high' {
    const minPayment = this.getMinimumPaymentAmountSync(currencyCode);
    
    // Ultra-low value currencies (high minimum payments indicate low value per unit)
    if (minPayment >= 1000) return 'ultra_low';  // KRW ₩6000, NPR ₨665, INR ₹415, etc.
    
    // Low value currencies  
    if (minPayment >= 100) return 'low';         // RUB ₽450, THB ฿150, etc.
    
    // Medium value currencies
    if (minPayment >= 20) return 'medium';       // Many standard currencies
    
    // High value currencies (low minimum payments indicate high value per unit)
    return 'high';                               // USD $5-10, EUR €5-10, GBP £5-8
  }

  /**
   * Get smart rounding rules based on currency value category and amount size
   */
  private getSmartRoundingRules(currencyCode: string, amount: number): {
    decimalPlaces: number;
    roundToNearest: number;
  } {
    const category = this.getCurrencyValueCategory(currencyCode);
    const dbDecimalPlaces = this.getCurrencyDecimalPlacesSync(currencyCode);
    
    // For zero-decimal currencies, keep database configuration
    if (dbDecimalPlaces === 0) {
      return {
        decimalPlaces: 0,
        roundToNearest: amount >= 10000 ? 100 : (amount >= 1000 ? 10 : 1)
      };
    }

    switch (category) {
      case 'ultra_low': // KRW, NPR, INR - need aggressive rounding for readability
        if (amount >= 10000) return { decimalPlaces: 0, roundToNearest: 100 };
        if (amount >= 1000) return { decimalPlaces: 0, roundToNearest: 10 };
        return { decimalPlaces: dbDecimalPlaces, roundToNearest: 1 };
        
      case 'low': // RUB, THB - moderate rounding
        if (amount >= 1000) return { decimalPlaces: 0, roundToNearest: 10 };
        if (amount >= 100) return { decimalPlaces: 0, roundToNearest: 1 };
        return { decimalPlaces: dbDecimalPlaces, roundToNearest: 1 };
        
      case 'medium': // Standard currencies - balanced approach
        if (amount >= 1000) return { decimalPlaces: 0, roundToNearest: 10 };
        if (amount >= 100) return { decimalPlaces: 0, roundToNearest: 1 };
        return { decimalPlaces: dbDecimalPlaces, roundToNearest: 1 };
        
      case 'high': // USD, EUR, GBP - preserve precision for smaller amounts
        if (amount >= 1000) return { decimalPlaces: 0, roundToNearest: 10 };
        if (amount >= 100) return { decimalPlaces: 0, roundToNearest: 1 };
        return { decimalPlaces: dbDecimalPlaces, roundToNearest: 1 };
        
      default:
        return { decimalPlaces: dbDecimalPlaces, roundToNearest: 1 };
    }
  }

  /**
   * Get currency formatting options with database integration and smart rounding
   */
  getCurrencyFormatOptions(currencyCode: string, amount?: number): {
    decimalPlaces: number;
    thousandSeparator: string;
    decimalSeparator: string;
    roundToNearest?: number;
  } {
    // Get smart rounding rules if amount is provided
    const smartRules = amount !== undefined 
      ? this.getSmartRoundingRules(currencyCode, amount)
      : { decimalPlaces: this.getCurrencyDecimalPlacesSync(currencyCode), roundToNearest: 1 };

    // Default formatting with smart decimal places
    const options = {
      decimalPlaces: smartRules.decimalPlaces,
      thousandSeparator: ',',
      decimalSeparator: '.',
      roundToNearest: smartRules.roundToNearest,
    };

    // Currency-specific separator overrides
    if (['EUR'].includes(currencyCode)) {
      options.thousandSeparator = '.';
      options.decimalSeparator = ',';
    }

    return options;
  }

  /**
   * Format amount according to currency rules with smart rounding
   */
  formatAmount(amount: number, currencyCode: string): string {
    const currency = this.getCurrencySymbolSync(currencyCode);
    
    // Handle null, undefined, or NaN values
    const safeAmount = amount == null || isNaN(amount) ? 0 : amount;
    
    // Get smart formatting options based on amount
    const options = this.getCurrencyFormatOptions(currencyCode, safeAmount);

    // Apply smart rounding first (round to nearest specified value)
    const smartRounded = Math.round(safeAmount / (options.roundToNearest || 1)) * (options.roundToNearest || 1);

    // Then apply decimal place rounding
    const finalRounded =
      Math.round(smartRounded * Math.pow(10, options.decimalPlaces)) /
      Math.pow(10, options.decimalPlaces);

    // Format with separators
    const parts = finalRounded.toFixed(options.decimalPlaces).split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, options.thousandSeparator);

    const formatted = parts.join(options.decimalSeparator);
    return `${currency}${formatted}`;
  }

  /**
   * Check if amount meets minimum payment requirement
   */
  async isValidPaymentAmount(amount: number, currencyCode: string): Promise<boolean> {
    const minimum = await this.getMinimumPaymentAmount(currencyCode);
    return amount >= minimum;
  }

  /**
   * Check if amount meets minimum payment requirement (sync fallback)
   */
  isValidPaymentAmountSync(amount: number, currencyCode: string): boolean {
    const minimum = this.getMinimumPaymentAmountSync(currencyCode);
    return amount >= minimum;
  }

  /**
   * Get all supported payment gateway currencies
   */
  getPaymentGatewayCurrencies(): string[] {
    // These are currencies typically supported by payment gateways
    return ['USD', 'EUR', 'GBP', 'INR', 'CAD', 'AUD', 'SGD', 'AED', 'SAR'];
  }

  /**
   * Check if currency is supported by payment gateways
   */
  isSupportedByPaymentGateway(currencyCode: string): boolean {
    return this.getPaymentGatewayCurrencies().includes(currencyCode);
  }

  /**
   * Get exchange rate with enhanced 3-tier caching: Memory → D1 Edge → localStorage → Database
   * Uses 2-tier system: Shipping Routes → Country Settings → Error
   *
   * @param originCountry - Origin country code (e.g. 'US', 'IN')
   * @param destinationCountry - Destination country code (e.g. 'IN', 'NP')
   * @returns Promise<number> - Exchange rate or throws error
   */
  async getExchangeRate(originCountry: string, destinationCountry: string): Promise<number> {
    const cacheKey = `rate_${originCountry}_${destinationCountry}`;
    console.log(`🔍 [ExchangeRate] Starting exchange rate lookup: ${originCountry}→${destinationCountry}`);
    console.log(`🔍 [ExchangeRate] Cache key: ${cacheKey}`);
    console.log(`🔍 [ExchangeRate] EDGE_API_URL: ${EDGE_API_URL}`);
    
    // Same currency = 1.0 (no caching needed)
    if (originCountry === destinationCountry) {
      console.log(`✅ [ExchangeRate] Same country, returning 1.0`);
      return 1.0;
    }

    // Use D1 countries endpoint (which has live rates) instead of the broken rates endpoint
    const d1Endpoint = `/api/countries`;
    console.log(`🌐 [ExchangeRate] D1 endpoint: ${EDGE_API_URL}${d1Endpoint}`);
    
    // Use enhanced caching for exchange rates with proper error handling for stale data
    try {
      return await this.getCachedData(
        cacheKey,
        async () => {
        console.log(`💾 [ExchangeRate] Cache miss, fetching exchange rate from database sources`);
        console.log(`💾 [ExchangeRate] Available data sources: 1) Shipping Routes 2) Country Settings 3) Fallback Rates`);
        
        try {
          // Tier 1: Check shipping routes for direct exchange rates (highest priority)
          console.log(`📋 [ExchangeRate] TIER 1: Checking shipping routes table...`);
          console.log(`📋 [ExchangeRate] Query: shipping_routes WHERE origin_country='${originCountry}' AND destination_country='${destinationCountry}' AND exchange_rate IS NOT NULL`);
          
          const { data: shippingRoute, error: routeError } = await supabase
            .from('shipping_routes')
            .select('exchange_rate, updated_at, id')
            .eq('origin_country', originCountry)
            .eq('destination_country', destinationCountry)
            .not('exchange_rate', 'is', null)
            .single();

          console.log(`📋 [ExchangeRate] Shipping route query result:`, { 
            data: shippingRoute, 
            error: routeError?.message || 'none',
            errorCode: routeError?.code || 'none'
          });

          // Skip shipping_routes query if it's causing 406 errors
          if (routeError?.code === '406' || routeError?.message?.includes('Not Acceptable')) {
            console.log(`⚠️ [ExchangeRate] Shipping routes table not accessible (406), skipping to country settings`);
          } else if (!routeError && shippingRoute?.exchange_rate) {
            console.log(`✅ [ExchangeRate] TIER 1 SUCCESS: Using shipping route rate`);
            console.log(`✅ [ExchangeRate] Route ID: ${shippingRoute.id}, Rate: ${shippingRoute.exchange_rate}, Updated: ${shippingRoute.updated_at}`);
            return shippingRoute.exchange_rate;
          } else {
            console.log(`❌ [ExchangeRate] TIER 1 FAILED: No shipping route found or rate is null`);
            console.log(`❌ [ExchangeRate] Moving to TIER 2: Country Settings...`);
          }

          // Tier 2: Fallback to unified configuration USD-based conversion
          console.log(`🌍 [ExchangeRate] TIER 2: Checking country settings via unified config...`);
          console.log(`🌍 [ExchangeRate] Fetching configs for: ${originCountry} and ${destinationCountry}`);
          
          const [originConfig, destConfig] = await Promise.all([
            unifiedConfigService.getCountryConfig(originCountry),
            unifiedConfigService.getCountryConfig(destinationCountry),
          ]);

          console.log(`🌍 [ExchangeRate] Origin config (${originCountry}):`, {
            found: !!originConfig,
            rate_from_usd: originConfig?.rate_from_usd || 'missing',
            currency: originConfig?.currency || 'missing',
            name: originConfig?.name || 'missing'
          });

          console.log(`🌍 [ExchangeRate] Destination config (${destinationCountry}):`, {
            found: !!destConfig,
            rate_from_usd: destConfig?.rate_from_usd || 'missing',
            currency: destConfig?.currency || 'missing',
            name: destConfig?.name || 'missing'
          });

          if (!originConfig || !destConfig) {
            console.log(`❌ [ExchangeRate] TIER 2 FAILED: Missing country config`);
            console.log(`❌ [ExchangeRate] originConfig exists: ${!!originConfig}, destConfig exists: ${!!destConfig}`);
            console.log(`❌ [ExchangeRate] Moving to TIER 3: Fallback rates...`);
            
            // Fallback to default exchange rate (1.0 for same currency, or common rates)
            if (originCountry === destinationCountry) {
              return 1.0;
            }
            // Common fallback rates for missing configurations
            const fallbackRates: Record<string, number> = {
              DE_NP: 134.5, // EUR to NPR approximate
              NP_DE: 0.0074, // NPR to EUR approximate
              IN_NP: 1.6, // INR to NPR approximate
              NP_IN: 0.625, // NPR to INR approximate
              US_NP: 134.5, // USD to NPR approximate
              NP_US: 0.0074, // NPR to USD approximate
              IN_US: 0.012, // INR to USD (83.33 INR per USD)
              US_IN: 83.33, // USD to INR
            };
            const fallbackKey = `${originCountry}_${destinationCountry}`;
            const fallbackRate = fallbackRates[fallbackKey] || 1.0;
            console.log(`⚠️ [ExchangeRate] TIER 3: Using hardcoded fallback rate: ${fallbackKey} = ${fallbackRate}`);
            return fallbackRate;
          }

          const originRate = originConfig.rate_from_usd;
          const destRate = destConfig.rate_from_usd;

          console.log(`🧮 [ExchangeRate] Raw USD rates from country_settings table:`);
          console.log(`🧮 [ExchangeRate] - Origin (${originCountry}): ${originRate} ${originConfig.currency}/USD`);
          console.log(`🧮 [ExchangeRate] - Destination (${destinationCountry}): ${destRate} ${destConfig.currency}/USD`);

          if (!originRate || !destRate || originRate <= 0 || destRate <= 0) {
            console.log(`❌ [ExchangeRate] TIER 2 FAILED: Invalid exchange rates`);
            console.log(`❌ [ExchangeRate] originRate: ${originRate} (valid: ${!!(originRate && originRate > 0)})`);
            console.log(`❌ [ExchangeRate] destRate: ${destRate} (valid: ${!!(destRate && destRate > 0)})`);
            throw new Error(
              `Invalid exchange rates: ${originCountry}=${originRate}, ${destinationCountry}=${destRate}`,
            );
          }

          // Calculate cross rate via USD: destination_rate / origin_rate
          const crossRate = destRate / originRate;
          console.log(`✅ [ExchangeRate] TIER 2 SUCCESS: Calculated cross-rate via USD from local database`);
          console.log(`✅ [ExchangeRate] Formula: ${destRate} (${destinationCountry} per USD) ÷ ${originRate} (${originCountry} per USD) = ${crossRate}`);
          console.log(`✅ [ExchangeRate] Final rate: 1 ${originConfig.currency} = ${crossRate} ${destConfig.currency}`);
          
          // 🚨 CHECK DATABASE DATA FRESHNESS AND ENHANCE WITH LIVE RATES IF NEEDED
          const dbOriginUpdated = originConfig.updated_at ? new Date(originConfig.updated_at).getTime() : 0;
          const dbDestUpdated = destConfig.updated_at ? new Date(destConfig.updated_at).getTime() : 0;
          const dbOriginAge = Date.now() - dbOriginUpdated;
          const dbDestAge = Date.now() - dbDestUpdated;
          const dbMaxStaleAge = 24 * 60 * 60 * 1000; // 24 hours for database tolerance
          const dbIsStale = Math.max(dbOriginAge, dbDestAge) > dbMaxStaleAge;
          
          const dbOriginAgeHours = Math.round(dbOriginAge / (1000 * 60 * 60));
          const dbDestAgeHours = Math.round(dbDestAge / (1000 * 60 * 60));
          
          if (dbIsStale) {
            console.log(`🚨 [ExchangeRate] DATABASE DATA ALSO STALE - ATTEMPTING EXTERNAL API FALLBACK`);
            console.log(`🚨 [ExchangeRate] DB Origin: ${dbOriginAgeHours}h, DB Dest: ${dbDestAgeHours}h (threshold: 24h)`);
            
            // Try to get live rate from external API as final fallback
            try {
              const liveRate = await this.getLiveExchangeRate(originCountry, destinationCountry);
              if (liveRate !== null) {
                console.log(`✅ [ExchangeRate] SUCCESS: Using LIVE external API rate: ${liveRate}`);
                console.log(`📊 [ExchangeRate] Live rate comparison: DB=${crossRate.toFixed(4)}, Live=${liveRate.toFixed(4)}`);
                return liveRate;
              }
            } catch (externalError) {
              console.log(`❌ [ExchangeRate] External API fallback failed:`, externalError.message);
            }
          }
          
          console.log(`⚠️ [ExchangeRate] Using database rates - Origin: ${dbOriginAgeHours}h, Dest: ${dbDestAgeHours}h old`);
          console.log(`⚠️ [ExchangeRate] Consider running exchange rate update service for fresh data`);
          
          // Compare with live rates for transparency (async)
          this.logExternalRateComparison(originCountry, destinationCountry, crossRate).catch(console.error);

          return crossRate;
        } catch (error) {
          console.error(`💥 [ExchangeRate] CRITICAL ERROR in exchange rate lookup:`, {
            originCountry,
            destinationCountry,
            error: error.message,
            stack: error.stack?.split('\n').slice(0, 3).join('\n')
          });
          throw new Error(`Exchange rate unavailable for ${originCountry} to ${destinationCountry}: ${error.message}`);
        }
      },
      6 * 60 * 60 * 1000, // 6 hours - exchange rates are relatively stable
      d1Endpoint
    ).then(async result => {
      console.log(`🎯 [ExchangeRate] FINAL RESULT for ${originCountry}→${destinationCountry}:`, {
        rate: result,
        type: typeof result,
        source: 'cached_or_fresh'
      });
      
      // Handle D1 countries response format
      if (typeof result === 'object' && result && 'countries' in result && Array.isArray(result.countries)) {
        console.log(`🔄 [ExchangeRate] D1 countries format detected, calculating cross-rate...`);
        
        // Find origin and destination countries in the D1 response
        const originCountryData = result.countries.find(c => c.code === originCountry);
        const destCountryData = result.countries.find(c => c.code === destinationCountry);
        
        console.log(`🔄 [ExchangeRate] D1 origin country (${originCountry}):`, originCountryData);
        console.log(`🔄 [ExchangeRate] D1 dest country (${destinationCountry}):`, destCountryData);
        
        // Add detailed freshness analysis
        if (originCountryData?.updated_at) {
          const originTimestamp = new Date(originCountryData.updated_at * 1000);
          const originAge = Date.now() - originTimestamp.getTime();
          const originAgeHours = Math.round(originAge / (1000 * 60 * 60));
          console.log(`📅 [ExchangeRate] D1 origin data age: ${originAgeHours}h old (updated: ${originTimestamp.toISOString()})`);
        }
        
        if (destCountryData?.updated_at) {
          const destTimestamp = new Date(destCountryData.updated_at * 1000);
          const destAge = Date.now() - destTimestamp.getTime();
          const destAgeHours = Math.round(destAge / (1000 * 60 * 60));
          console.log(`📅 [ExchangeRate] D1 dest data age: ${destAgeHours}h old (updated: ${destTimestamp.toISOString()})`);
        }
        
        if (originCountryData?.exchange_rate && destCountryData?.exchange_rate) {
          // Calculate cross-rate: dest_rate / origin_rate
          const crossRate = destCountryData.exchange_rate / originCountryData.exchange_rate;
          
          // 🚨 ENHANCED DATA FRESHNESS VALIDATION - Check if data is stale (older than 48 hours)
          const currentTime = Date.now();
          const originTimestamp = originCountryData.updated_at ? (originCountryData.updated_at * 1000) : 0;
          const destTimestamp = destCountryData.updated_at ? (destCountryData.updated_at * 1000) : 0;
          const originAge = currentTime - originTimestamp;
          const destAge = currentTime - destTimestamp;
          const maxAcceptableAge = 48 * 60 * 60 * 1000; // 48 hours (more lenient for production)
          const isStale = Math.max(originAge, destAge) > maxAcceptableAge;
          
          const originAgeHours = Math.round(originAge / (1000 * 60 * 60));
          const destAgeHours = Math.round(destAge / (1000 * 60 * 60));
          
          if (isStale) {
            console.log(`🚨 [ExchangeRate] D1 DATA STALE - FORCING DATABASE FALLBACK`);
            console.log(`🚨 [ExchangeRate] Origin data: ${originAgeHours}h old, Dest data: ${destAgeHours}h old (threshold: 48h)`);
            console.log(`🔄 [ExchangeRate] Throwing error to trigger fresh database lookup...`);
            
            // Log comparison with external API for transparency
            this.logExternalRateComparison(originCountry, destinationCountry, crossRate).catch(console.error);
            
            // D1 data is stale, so we'll return null to trigger the database fallback in the catch block
            console.log(`🔄 [ExchangeRate] D1 data is stale, returning null to trigger database fallback...`);
            return null;
          } else {
            console.log(`✅ [ExchangeRate] D1 rates are fresh - Origin: ${originAgeHours}h, Dest: ${destAgeHours}h`);
            
            // Still compare with external API for quality monitoring
            if (originAgeHours > 6 || destAgeHours > 6) {
              console.log(`⚠️ [ExchangeRate] D1 data is getting old (>6h), running quality check...`);
              this.logExternalRateComparison(originCountry, destinationCountry, crossRate).catch(console.error);
            }
          }
          
          console.log(`🧮 [ExchangeRate] D1 cross-rate calculated: ${crossRate} (${destCountryData.exchange_rate} / ${originCountryData.exchange_rate})`);
          console.log(`📊 [ExchangeRate] Rate breakdown: 1 ${originCountryData.currency} = ${crossRate.toFixed(4)} ${destCountryData.currency}`);
          return crossRate;
        } else {
          console.log(`❌ [ExchangeRate] D1 missing exchange rate data, falling through to database`);
        }
      }
      
      // Handle legacy D1 rate response format  
      if (typeof result === 'object' && result && 'rate' in result && result.rate !== null) {
        console.log(`🔄 [ExchangeRate] D1 legacy rate format detected, extracting rate:`, result.rate);
        return result.rate;
      }
      
      return result;
        },
        6 * 60 * 60 * 1000, // 6 hours - exchange rates are relatively stable
        d1Endpoint
      );
    } catch (error) {
      console.error(`💥 [ExchangeRate] Critical error in exchange rate lookup:`, error);
      throw error;
    }
  }

  /**
   * Get live exchange rate from external APIs as final fallback
   * @private
   */
  private async getLiveExchangeRate(originCountry: string, destinationCountry: string): Promise<number | null> {
    try {
      console.log(`🌐 [LiveRate] Fetching live exchange rate: ${originCountry} → ${destinationCountry}`);
      
      // Get currency codes
      const originCurrency = this.getCurrencyForCountrySync(originCountry);
      const destCurrency = this.getCurrencyForCountrySync(destinationCountry);
      
      console.log(`🌐 [LiveRate] Currency mapping: ${originCountry}(${originCurrency}) → ${destinationCountry}(${destCurrency})`);
      
      // Try multiple external APIs in order of preference
      const externalSources = [
        {
          name: 'ExchangeRate-API',
          url: `https://api.exchangerate-api.com/v4/latest/${originCurrency}`,
          parseResponse: (data: any) => data.rates?.[destCurrency]
        },
        {
          name: 'Fixer.io (Free)',
          url: `https://api.fixer.io/latest?base=${originCurrency}&symbols=${destCurrency}`,
          parseResponse: (data: any) => data.rates?.[destCurrency]
        }
      ];
      
      for (const source of externalSources) {
        try {
          console.log(`🌐 [LiveRate] Trying ${source.name}...`);
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
          
          const response = await fetch(source.url, { 
            signal: controller.signal,
            headers: { 
              'User-Agent': 'iwishbag-exchange-service/1.0',
              'Accept': 'application/json'
            }
          });
          
          clearTimeout(timeoutId);
          
          if (!response.ok) {
            console.log(`❌ [LiveRate] ${source.name} HTTP error: ${response.status}`);
            continue;
          }
          
          const data = await response.json();
          const rate = source.parseResponse(data);
          
          if (rate && typeof rate === 'number' && rate > 0) {
            console.log(`✅ [LiveRate] ${source.name} SUCCESS: ${originCurrency} → ${destCurrency} = ${rate}`);
            
            // Apply country-specific adjustments if this is India or Nepal
            let adjustedRate = rate;
            if (destinationCountry === 'IN') {
              adjustedRate = rate + 3; // Add 3 for India (same as server function)
              console.log(`🔧 [LiveRate] Applied India adjustment: ${rate} + 3 = ${adjustedRate}`);
            } else if (destinationCountry === 'NP') {
              adjustedRate = rate + 2; // Add 2 for Nepal (same as server function)
              console.log(`🔧 [LiveRate] Applied Nepal adjustment: ${rate} + 2 = ${adjustedRate}`);
            }
            
            return adjustedRate;
          } else {
            console.log(`❌ [LiveRate] ${source.name} invalid rate:`, rate);
          }
        } catch (error) {
          console.log(`❌ [LiveRate] ${source.name} error:`, error.message);
        }
      }
      
      console.log(`❌ [LiveRate] All external APIs failed for ${originCountry} → ${destinationCountry}`);
      return null;
      
    } catch (error) {
      console.log(`💥 [LiveRate] Critical error in live rate fetch:`, error.message);
      return null;
    }
  }

  /**
   * Compare D1 rate with external API to verify freshness
   * @private
   */
  private async logExternalRateComparison(originCountry: string, destinationCountry: string, d1Rate: number): Promise<void> {
    try {
      console.log(`🔍 [RateValidation] Comparing D1 rate with live external APIs...`);
      
      // Get currency codes
      const originCurrency = this.getCurrencyForCountrySync(originCountry);
      const destCurrency = this.getCurrencyForCountrySync(destinationCountry);
      
      console.log(`🔍 [RateValidation] Checking ${originCurrency} → ${destCurrency}`);
      
      // Try multiple external APIs for comparison
      const externalSources = [
        {
          name: 'ExchangeRate-API',
          url: `https://api.exchangerate-api.com/v4/latest/${originCurrency}`
        },
        {
          name: 'Fixer.io',
          url: `https://api.fixer.io/latest?base=${originCurrency}&symbols=${destCurrency}`
        }
      ];
      
      let liveRate: number | null = null;
      let usedSource = '';
      
      for (const source of externalSources) {
        try {
          console.log(`🌐 [RateValidation] Trying ${source.name}...`);
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 3000);
          
          const response = await fetch(source.url, { 
            signal: controller.signal,
            headers: { 'User-Agent': 'iwishbag-rate-validator/1.0' }
          });
          
          clearTimeout(timeoutId);
          
          if (!response.ok) {
            console.log(`❌ [RateValidation] ${source.name} failed: ${response.status}`);
            continue;
          }
          
          const data = await response.json();
          
          if (source.name === 'ExchangeRate-API' && data.rates?.[destCurrency]) {
            liveRate = data.rates[destCurrency];
            usedSource = source.name;
            console.log(`✅ [RateValidation] ${source.name} live rate: ${liveRate}`);
            break;
          } else if (source.name === 'Fixer.io' && data.rates?.[destCurrency]) {
            liveRate = data.rates[destCurrency];
            usedSource = source.name;
            console.log(`✅ [RateValidation] ${source.name} live rate: ${liveRate}`);
            break;
          }
        } catch (error) {
          console.log(`❌ [RateValidation] ${source.name} error:`, error.message);
        }
      }
      
      if (liveRate !== null) {
        const difference = Math.abs(d1Rate - liveRate);
        const percentageDiff = ((difference / liveRate) * 100);
        
        console.log(`📊 [RateValidation] RATE COMPARISON:`);
        console.log(`📊 [RateValidation] D1 Edge API:    ${d1Rate.toFixed(4)}`);
        console.log(`📊 [RateValidation] Live ${usedSource}: ${liveRate.toFixed(4)}`);
        console.log(`📊 [RateValidation] Difference:      ${difference.toFixed(4)} (${percentageDiff.toFixed(2)}%)`);
        
        if (percentageDiff > 2) {
          console.log(`🚨 [RateValidation] SIGNIFICANT DISCREPANCY: D1 rate is ${percentageDiff.toFixed(2)}% off from live rate!`);
          console.log(`🚨 [RateValidation] D1 Edge API needs rate update from external sources`);
        } else if (percentageDiff > 0.5) {
          console.log(`⚠️ [RateValidation] MINOR DISCREPANCY: D1 rate is ${percentageDiff.toFixed(2)}% off from live rate`);
        } else {
          console.log(`✅ [RateValidation] RATES MATCH: D1 and live rates are very close (${percentageDiff.toFixed(2)}% diff)`);
        }
      } else {
        console.log(`❌ [RateValidation] Could not fetch live rate for comparison from external APIs`);
      }
      
    } catch (error) {
      console.log(`💥 [RateValidation] External rate comparison failed:`, error.message);
    }
  }

  /**
   * Get exchange rate for currency conversion (simplified interface) with enhanced caching
   * @param fromCurrency - Source currency code (e.g. 'USD', 'INR')
   * @param toCurrency - Target currency code (e.g. 'INR', 'NPR')
   * @returns Promise<number> - Exchange rate or throws error
   */
  async getExchangeRateByCurrency(fromCurrency: string, toCurrency: string): Promise<number> {
    if (fromCurrency === toCurrency) {
      return 1.0;
    }

    const cacheKey = `currency_${fromCurrency}_${toCurrency}`;
    
    return this.getCachedData(
      cacheKey,
      async () => {
        try {
          // Get countries for these currencies
          const fromCountry = await this.getCountryForCurrency(fromCurrency);
          const toCountry = await this.getCountryForCurrency(toCurrency);

          if (!fromCountry || !toCountry) {
            throw new Error(`Cannot find countries for currencies: ${fromCurrency}, ${toCurrency}`);
          }

          return await this.getExchangeRate(fromCountry, toCountry);
        } catch (error) {
          logger.error(
            `[CurrencyService] Currency exchange rate failed ${fromCurrency}→${toCurrency}:`,
            error,
          );
          throw new Error(`Exchange rate unavailable for ${fromCurrency} to ${toCurrency}`);
        }
      },
      6 * 60 * 60 * 1000 // 6 hours
    );
  }

  /**
   * Convert amount between currencies
   * @param amount - Amount to convert
   * @param fromCurrency - Source currency code
   * @param toCurrency - Target currency code
   * @returns Promise<number> - Converted amount
   */
  async convertAmount(amount: number, fromCurrency: string, toCurrency: string): Promise<number> {
    if (fromCurrency === toCurrency) {
      return amount;
    }

    const rate = await this.getExchangeRateByCurrency(fromCurrency, toCurrency);
    return amount * rate;
  }

  /**
   * Get currency by country code
   * @param countryCode - Country code (e.g. 'US', 'IN')
   * @returns Currency code (e.g. 'USD', 'INR')
   */
  getCurrencyByCountry(countryCode: string): string {
    return this.getCurrencyForCountrySync(countryCode);
  }

  // ============================================================================
  // PERFORMANCE ENHANCEMENT METHODS
  // ============================================================================

  /**
   * Schedule essential data preload for faster app startup
   */
  private scheduleEssentialDataPreload(): void {
    // Preload after a short delay to not block initial app rendering
    setTimeout(() => {
      this.preloadEssentials().catch(error => {
        logger.warn('[CurrencyService] Essential data preload failed:', error);
      });
    }, 2000);
  }

  /**
   * Preload essential currency data for instant app startup
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
    console.log('[CurrencyService] Essential data preloaded');
  }

  /**
   * Warm up cache with common currency pairs
   */
  async warmUpCache(): Promise<void> {
    console.log('[CurrencyService] Warming up cache...');
    
    const commonPairs = [
      // USD pairs (most common)
      ['US', 'IN'], ['US', 'NP'], ['US', 'GB'], ['US', 'AU'], ['US', 'CA'],
      // Regional pairs
      ['IN', 'NP'], ['DE', 'GB'], ['AU', 'NZ'], ['CA', 'US'],
      // Reverse pairs
      ['IN', 'US'], ['NP', 'US'], ['GB', 'US'], ['AU', 'US'], ['CA', 'US']
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
        logger.warn(`[CurrencyService] Failed to warm ${origin}→${dest}:`, error);
      }
    }

    console.log('[CurrencyService] Cache warmup completed');
  }

  /**
   * Get cache statistics for monitoring
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
   * Batch update exchange rates (for scheduled updates)
   */
  async batchUpdateExchangeRates(rates: Record<string, number>): Promise<void> {
    console.log(`[CurrencyService] Batch updating ${Object.keys(rates).length} rates`);
    
    Object.entries(rates).forEach(([pair, rate]) => {
      const cacheKey = `rate_${pair}`;
      
      // Update memory cache
      this.memoryCache.set(cacheKey, {
        data: rate,
        expires: Date.now() + this.MEMORY_TTL
      });
      
      // Update localStorage cache
      this.cacheToLocalStorage(cacheKey, rate, 6 * 60 * 60 * 1000);
    });

    console.log(`[CurrencyService] Batch updated ${Object.keys(rates).length} rates`);
  }

  /**
   * Format a group of amounts with proportional rounding to ensure they sum to the target total
   * This solves the cumulative rounding error problem where individual rounded components
   * don't sum to the rounded total.
   * 
   * @param components - Array of {label, amount} objects to format
   * @param targetTotal - The precise total that components should sum to
   * @param currencyCode - Currency for formatting
   * @returns Object with formatted components and total
   */
  formatAmountGroup(
    components: Array<{ label: string; amount: number }>,
    targetTotal: number,
    currencyCode: string
  ): {
    components: Array<{ label: string; amount: number; formatted: string }>;
    total: { amount: number; formatted: string };
    adjustments: Array<{ label: string; adjustment: number }>;
  } {
    console.log(`[CurrencyService] Proportional rounding for ${currencyCode}:`, {
      targetTotal,
      componentsCount: components.length,
      componentsSum: components.reduce((sum, c) => sum + c.amount, 0)
    });

    // Step 1: Get the desired display total (rounded)
    const roundedTotal = this.getRoundedAmount(targetTotal, currencyCode);
    console.log(`[CurrencyService] Target total: ${targetTotal} → Rounded: ${roundedTotal}`);

    // Step 2: Calculate each component's share of the total
    const totalPrecise = components.reduce((sum, component) => sum + component.amount, 0);
    const componentShares = components.map(component => ({
      ...component,
      share: totalPrecise > 0 ? component.amount / totalPrecise : 0
    }));

    // Step 3: Allocate the rounded total proportionally
    const allocatedComponents = componentShares.map(component => ({
      ...component,
      allocatedAmount: roundedTotal * component.share
    }));

    // Step 4: Round individual components using standard rounding
    const roundedComponents = allocatedComponents.map(component => ({
      ...component,
      roundedAmount: this.getRoundedAmount(component.allocatedAmount, currencyCode)
    }));

    // Step 5: Calculate rounding error and distribute it
    const sumOfRounded = roundedComponents.reduce((sum, c) => sum + c.roundedAmount, 0);
    const roundingError = roundedTotal - sumOfRounded;
    console.log(`[CurrencyService] Rounding error: ${roundingError}`);

    // Step 6: Distribute the error proportionally to largest components
    const finalComponents = [...roundedComponents];
    if (Math.abs(roundingError) > 0.001) {
      // Sort by allocated amount (largest first) to distribute error fairly
      const sortedIndices = finalComponents
        .map((c, index) => ({ index, allocatedAmount: c.allocatedAmount }))
        .sort((a, b) => b.allocatedAmount - a.allocatedAmount)
        .map(item => item.index);

      // Get the smallest currency unit for this currency
      const minUnit = this.getMinimumCurrencyUnit(currencyCode);
      let remainingError = roundingError;

      // Distribute the error across components, starting with the largest ones
      let componentIndex = 0;
      while (Math.abs(remainingError) >= minUnit / 2 && componentIndex < sortedIndices.length) {
        const index = sortedIndices[componentIndex];
        
        // Calculate how much error this component should absorb
        // For large errors, distribute more to larger components
        let adjustmentSteps = Math.floor(Math.abs(remainingError) / minUnit);
        
        // Don't adjust more than reasonable for any single component
        const maxStepsForComponent = Math.max(1, Math.floor(adjustmentSteps / (sortedIndices.length - componentIndex)));
        adjustmentSteps = Math.min(adjustmentSteps, maxStepsForComponent);
        
        const adjustment = (remainingError > 0 ? minUnit : -minUnit) * adjustmentSteps;
        finalComponents[index].roundedAmount += adjustment;
        remainingError -= adjustment;

        console.log(`[CurrencyService] Adjusted ${finalComponents[index].label} by ${adjustment} (${adjustmentSteps} steps)`);
        
        componentIndex++;
      }
    }

    // Step 7: Format all amounts and track adjustments
    const result = {
      components: finalComponents.map((component, index) => ({
        label: component.label,
        amount: component.roundedAmount,
        formatted: this.formatExactAmount(component.roundedAmount, currencyCode)
      })),
      total: {
        amount: roundedTotal,
        formatted: this.formatExactAmount(roundedTotal, currencyCode)
      },
      adjustments: finalComponents.map((component, index) => ({
        label: component.label,
        adjustment: component.roundedAmount - components[index].amount
      })).filter(adj => Math.abs(adj.adjustment) > 0.001)
    };

    // Verification: Ensure components sum to total
    const verificationSum = result.components.reduce((sum, c) => sum + c.amount, 0);
    if (Math.abs(verificationSum - roundedTotal) > 0.001) {
      console.error(`[CurrencyService] Proportional rounding failed verification:`, {
        expectedTotal: roundedTotal,
        actualSum: verificationSum,
        difference: verificationSum - roundedTotal
      });
    } else {
      console.log(`[CurrencyService] ✅ Proportional rounding successful - components sum exactly to total`);
    }

    return result;
  }

  /**
   * Get the rounded amount using the currency's smart rounding rules
   * @private
   */
  private getRoundedAmount(amount: number, currencyCode: string): number {
    const options = this.getCurrencyFormatOptions(currencyCode, amount);
    
    // Apply smart rounding first (round to nearest specified value)
    const smartRounded = Math.round(amount / (options.roundToNearest || 1)) * (options.roundToNearest || 1);
    
    // Then apply decimal place rounding
    const finalRounded = Math.round(smartRounded * Math.pow(10, options.decimalPlaces)) / Math.pow(10, options.decimalPlaces);
    
    return finalRounded;
  }

  /**
   * Get the minimum currency unit (smallest denomination)
   * @private
   */
  private getMinimumCurrencyUnit(currencyCode: string): number {
    const decimalPlaces = this.getCurrencyDecimalPlacesSync(currencyCode);
    return Math.pow(10, -decimalPlaces);
  }

  /**
   * Format an exact amount without additional rounding
   * @private
   */
  private formatExactAmount(amount: number, currencyCode: string): string {
    const currency = this.getCurrencySymbolSync(currencyCode);
    const options = this.getCurrencyFormatOptions(currencyCode);
    
    // Use the amount as-is, just format with separators
    const parts = amount.toFixed(options.decimalPlaces).split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, options.thousandSeparator);
    
    const formatted = parts.join(options.decimalSeparator);
    return `${currency}${formatted}`;
  }
}

// Export singleton instance
export const currencyService = CurrencyService.getInstance();

// Export convenience functions for backward compatibility
export const getAllCurrencies = () => currencyService.getAllCurrencies();
export const getCurrencyForCountry = (countryCode: string) =>
  currencyService.getCurrencyForCountry(countryCode);
export const getCurrencyForCountrySync = (countryCode: string) =>
  currencyService.getCurrencyForCountrySync(countryCode);
export const getCountrySettings = (countryCode: string) =>
  currencyService.getCountrySettings(countryCode);
export const getAvailableCurrenciesForCountry = (countryCode: string) =>
  currencyService.getAvailableCurrenciesForCountry(countryCode);
export const isValidCurrency = (currencyCode: string) =>
  currencyService.isValidCurrency(currencyCode);
export const getCurrencyDisplayInfo = (currencyCode: string) =>
  currencyService.getCurrencyDisplayInfo(currencyCode);
export const formatAmount = (amount: number, currencyCode: string) =>
  currencyService.formatAmount(amount, currencyCode);
export const formatAmountGroup = (
  components: Array<{ label: string; amount: number }>,
  targetTotal: number,
  currencyCode: string
) => currencyService.formatAmountGroup(components, targetTotal, currencyCode);
export const convertAmount = (amount: number, fromCurrency: string, toCurrency: string) =>
  currencyService.convertAmount(amount, fromCurrency, toCurrency);
export const getCurrencyByCountry = (countryCode: string) =>
  currencyService.getCurrencyByCountry(countryCode);

// Export performance enhancement functions
export const warmUpCurrencyCache = () => currencyService.warmUpCache();
export const getCurrencyCacheStats = () => currencyService.getCacheStats();
export const clearCurrencyCache = () => currencyService.clearCache();
export const preloadEssentialCurrencyData = () => currencyService.preloadEssentials();
export const batchUpdateExchangeRates = (rates: Record<string, number>) => 
  currencyService.batchUpdateExchangeRates(rates);

// Performance test function (migrated from OptimizedCurrencyService)
export async function testCurrencyPerformance() {
  console.log('[CurrencyService] Performance test starting...');
  
  const testPairs = [
    ['US', 'IN'], ['US', 'NP'], ['IN', 'NP'], ['GB', 'US'], ['AU', 'US']
  ];
  const iterations = 3;
  
  // Test performance with caching
  console.log('Testing enhanced CurrencyService...');
  const times: number[] = [];
  
  for (const [origin, dest] of testPairs) {
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      await currencyService.getExchangeRate(origin, dest);
      times.push(performance.now() - start);
    }
  }
  
  const avgTime = times.reduce((a, b) => a + b) / times.length;
  
  console.log('[CurrencyService] Performance test results:');
  console.log(`Enhanced service: ${avgTime.toFixed(2)}ms avg`);
  console.log(`Cache stats:`, currencyService.getCacheStats());
  
  return {
    avgTime: avgTime.toFixed(2),
    cacheStats: currencyService.getCacheStats()
  };
}
