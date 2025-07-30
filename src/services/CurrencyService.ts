import { supabase } from '@/integrations/supabase/client';
import { unifiedConfigService } from './UnifiedConfigurationService';
import { logger } from '@/lib/logger';

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
        console.warn(`Failed to remove ${key} from localStorage:`, error);
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
    // Tier 1: Memory cache (instant access)
    const memoryCached = this.memoryCache.get(key);
    if (memoryCached && Date.now() < memoryCached.expires) {
      console.log(`[CurrencyService] Memory cache hit: ${key}`);
      return memoryCached.data;
    }

    // Tier 2: D1 Edge cache (global, <10ms)
    if (d1Endpoint) {
      try {
        const response = await fetch(`${EDGE_API_URL}${d1Endpoint}`);
        if (response.ok) {
          const data = await response.json();
          console.log(`[CurrencyService] D1 edge cache hit: ${key}`);
          
          // Cache in memory
          this.memoryCache.set(key, {
            data,
            expires: Date.now() + this.MEMORY_TTL
          });
          
          // Also cache in localStorage
          this.cacheToLocalStorage(key, data, ttl);
          
          return data;
        }
      } catch (error) {
        logger?.warn('D1 edge cache error, falling back', { error, key });
      }
    }

    // Tier 3: localStorage cache (very fast)
    try {
      const storageKey = `iwishbag_currency_${key}`;
      const storedData = localStorage.getItem(storageKey);
      
      if (storedData) {
        const parsed = JSON.parse(storedData);
        if (Date.now() < parsed.expires) {
          console.log(`[CurrencyService] Storage cache hit: ${key}`);
          
          // Promote to memory cache
          this.memoryCache.set(key, {
            data: parsed.data,
            expires: Date.now() + this.MEMORY_TTL
          });
          
          return parsed.data;
        }
      }
    } catch (error) {
      console.warn(`[CurrencyService] Storage cache error for ${key}:`, error);
    }

    // Tier 4: Database/API call
    console.log(`[CurrencyService] Fetching from database: ${key}`);
    const data = await fetcher();
    
    // Cache in both tiers
    this.memoryCache.set(key, {
      data,
      expires: Date.now() + this.MEMORY_TTL
    });

    this.cacheToLocalStorage(key, data, ttl);

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
      console.warn(`[CurrencyService] Failed to cache in localStorage:`, error);
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
        console.warn(`Failed to cleanup ${key}:`, error);
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
            console.error('[CurrencyService] Database error:', error);
            throw new Error(error.message);
          }

          if (!countries || countries.length === 0) {
            console.warn('No countries found in country_settings, using fallback currencies');
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
          console.error('Error in getAllCurrencies:', error);
          return this.getFallbackCurrencies();
        }
      },
      24 * 60 * 60 * 1000 // 24 hours - currencies don't change often
      // '/api/countries' // D1 endpoint - temporarily disabled to force database query
    ).then(result => {
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
        console.warn('No countries found in unified config, using fallback mapping');
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
      console.error('Error in getCountryCurrencyMap:', error);
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
        console.error(`[CURRENCY SERVICE] Error fetching country settings for ${countryCode}:`, error);
        return null;
      }

      if (!data) {
        console.warn(`[CURRENCY SERVICE] No country settings found for ${countryCode}`);
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
      console.error(`[CURRENCY SERVICE] Exception getting country settings for ${countryCode}:`, error);
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
      console.error('Error fetching decimal places from unified config:', error);
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
      console.error('Error fetching country for currency from unified config:', error);
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
      console.error('Error fetching minimum payment amount from unified config:', error);
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
   * Get currency formatting options
   */
  getCurrencyFormatOptions(currencyCode: string): {
    decimalPlaces: number;
    thousandSeparator: string;
    decimalSeparator: string;
  } {
    // Default formatting
    const options = {
      decimalPlaces: 2,
      thousandSeparator: ',',
      decimalSeparator: '.',
    };

    // Currency-specific overrides
    if (['JPY', 'KRW', 'VND', 'IDR'].includes(currencyCode)) {
      options.decimalPlaces = 0;
    }

    // Some currencies use different separators
    if (['EUR'].includes(currencyCode)) {
      options.thousandSeparator = '.';
      options.decimalSeparator = ',';
    }

    return options;
  }

  /**
   * Format amount according to currency rules
   */
  formatAmount(amount: number, currencyCode: string): string {
    const currency = this.getCurrencySymbolSync(currencyCode);
    const options = this.getCurrencyFormatOptions(currencyCode);

    // Handle null, undefined, or NaN values
    const safeAmount = amount == null || isNaN(amount) ? 0 : amount;

    // Round to appropriate decimal places
    const rounded =
      Math.round(safeAmount * Math.pow(10, options.decimalPlaces)) /
      Math.pow(10, options.decimalPlaces);

    // Format with separators
    const parts = rounded.toFixed(options.decimalPlaces).split('.');
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
    console.log(`[CurrencyService] getExchangeRate called: ${originCountry}→${destinationCountry}, cacheKey: ${cacheKey}`);
    
    // Same currency = 1.0 (no caching needed)
    if (originCountry === destinationCountry) {
      console.log(`[CurrencyService] Same country, returning 1.0`);
      return 1.0;
    }

    // Try to get from D1 edge cache first
    const d1Endpoint = `/api/currency/rates?from=${originCountry}&to=${destinationCountry}`;
    
    // Use enhanced caching for exchange rates
    return this.getCachedData(
      cacheKey,
      async () => {
        console.log(`[CurrencyService] Cache miss, fetching exchange rate from database`);
        
        try {
          // Tier 1: Check shipping routes for direct exchange rates (highest priority)
          console.log(`[CurrencyService] Checking shipping routes for ${originCountry}→${destinationCountry}`);
          const { data: shippingRoute, error: routeError } = await supabase
            .from('shipping_routes')
            .select('exchange_rate')
            .eq('origin_country', originCountry)
            .eq('destination_country', destinationCountry)
            .not('exchange_rate', 'is', null)
            .single();

          console.log(`[CurrencyService] Shipping route query result:`, { data: shippingRoute, error: routeError });

          if (!routeError && shippingRoute?.exchange_rate) {
            console.log(
              `[CurrencyService] ✅ Using shipping route rate: ${originCountry}→${destinationCountry} = ${shippingRoute.exchange_rate}`,
            );
            return shippingRoute.exchange_rate;
          } else {
            console.log(`[CurrencyService] ❌ No shipping route found, falling back to country settings`);
          }

          // Tier 2: Fallback to unified configuration USD-based conversion
          const [originConfig, destConfig] = await Promise.all([
            unifiedConfigService.getCountryConfig(originCountry),
            unifiedConfigService.getCountryConfig(destinationCountry),
          ]);

          if (!originConfig || !destConfig) {
            console.warn(
              `[CurrencyService] Missing country config for ${originCountry} or ${destinationCountry}, using fallback rate`,
            );
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
            };
            const fallbackKey = `${originCountry}_${destinationCountry}`;
            const fallbackRate = fallbackRates[fallbackKey] || 1.0;
            console.warn(
              `[CurrencyService] Using fallback rate ${originCountry}→${destinationCountry}: ${fallbackRate}`,
            );
            return fallbackRate;
          }

          const originRate = originConfig.rate_from_usd;
          const destRate = destConfig.rate_from_usd;

          if (!originRate || !destRate || originRate <= 0 || destRate <= 0) {
            throw new Error(
              `Invalid exchange rates: ${originCountry}=${originRate}, ${destinationCountry}=${destRate}`,
            );
          }

          // Calculate cross rate via USD: destination_rate / origin_rate
          const crossRate = destRate / originRate;
          console.log(
            `[CurrencyService] Using USD cross-rate: ${originCountry}→${destinationCountry} = ${crossRate} (${destRate}/${originRate})`,
          );

          return crossRate;
        } catch (error) {
          console.error(
            `[CurrencyService] Failed to get exchange rate ${originCountry}→${destinationCountry}:`,
            error,
          );
          throw new Error(`Exchange rate unavailable for ${originCountry} to ${destinationCountry}`);
        }
      },
      6 * 60 * 60 * 1000, // 6 hours - exchange rates are relatively stable
      d1Endpoint
    ).then(result => {
      console.log(`[CurrencyService] Final result for ${originCountry}→${destinationCountry}:`, result);
      // Handle D1 response format
      if (typeof result === 'object' && result && 'rate' in result) {
        return result.rate;
      }
      return result;
    });
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
          console.error(
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
        console.warn('[CurrencyService] Essential data preload failed:', error);
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
        console.warn(`[CurrencyService] Failed to warm ${origin}→${dest}:`, error);
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
