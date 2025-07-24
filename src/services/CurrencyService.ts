import { supabase } from '@/integrations/supabase/client';
import { unifiedConfigService } from './UnifiedConfigurationService';

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
  private currencyCache: Map<string, Currency> = new Map();
  private allCurrenciesCache: Currency[] | null = null;
  private countryCurrencyMapCache: Map<string, string> = new Map();
  private cacheTimestamp: number = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  private constructor() {}

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
    this.cacheTimestamp = 0;
  }

  /**
   * Get all unique currencies from unified configuration system
   */
  async getAllCurrencies(): Promise<Currency[]> {
    if (this.allCurrenciesCache && this.isCacheValid()) {
      return this.allCurrenciesCache;
    }

    try {
      // Get all countries from unified configuration
      const allCountries = await unifiedConfigService.getAllCountries();

      if (!allCountries || Object.keys(allCountries).length === 0) {
        console.warn('No countries found in unified config, using fallback currencies');
        return this.getFallbackCurrencies();
      }

      // Group by currency and get the most complete data for each
      const currencyMap = new Map<string, Currency>();

      Object.values(allCountries).forEach((countryConfig) => {
        if (!countryConfig.currency) return;

        const existing = currencyMap.get(countryConfig.currency);
        const currency: Currency = {
          code: countryConfig.currency,
          name: countryConfig.name || this.getCurrencyNameSync(countryConfig.currency),
          symbol: countryConfig.symbol || this.getCurrencySymbolSync(countryConfig.currency),
          decimal_places: this.getCurrencyDecimalPlacesSync(countryConfig.currency),
          min_payment_amount: countryConfig.minimum_payment_amount ?? undefined,
          thousand_separator: ',',
          decimal_separator: '.',
          is_active: true,
        };

        // Keep the one with more complete data (prefer non-null values)
        if (!existing || (countryConfig.minimum_payment_amount && !existing.min_payment_amount)) {
          currencyMap.set(countryConfig.currency, currency);
        }
      });

      const currencies = Array.from(currencyMap.values());

      // Cache the results
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
   * Get currency for a specific country
   */
  async getCurrencyForCountry(countryCode: string): Promise<string> {
    const map = await this.getCountryCurrencyMap();
    return map.get(countryCode) || 'USD';
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
   * Get exchange rate using 2-tier system: Shipping Routes → Country Settings → Error
   * This replaces the old complex fallback system with a simple, business-focused approach
   *
   * @param originCountry - Origin country code (e.g. 'US', 'IN')
   * @param destinationCountry - Destination country code (e.g. 'IN', 'NP')
   * @returns Promise<number> - Exchange rate or throws error
   */
  async getExchangeRate(originCountry: string, destinationCountry: string): Promise<number> {
    // Same currency = 1.0
    if (originCountry === destinationCountry) {
      return 1.0;
    }

    try {
      // Tier 1: Check shipping routes for direct exchange rates (highest priority)
      const { data: shippingRoute, error: routeError } = await supabase
        .from('shipping_routes')
        .select('exchange_rate')
        .eq('origin_country', originCountry)
        .eq('destination_country', destinationCountry)
        .not('exchange_rate', 'is', null)
        .single();

      if (!routeError && shippingRoute?.exchange_rate) {
        console.log(
          `[CurrencyService] Using shipping route rate: ${originCountry}→${destinationCountry} = ${shippingRoute.exchange_rate}`,
        );
        return shippingRoute.exchange_rate;
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
  }

  /**
   * Get exchange rate for currency conversion (simplified interface)
   * @param fromCurrency - Source currency code (e.g. 'USD', 'INR')
   * @param toCurrency - Target currency code (e.g. 'INR', 'NPR')
   * @returns Promise<number> - Exchange rate or throws error
   */
  async getExchangeRateByCurrency(fromCurrency: string, toCurrency: string): Promise<number> {
    if (fromCurrency === toCurrency) {
      return 1.0;
    }

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
export const getAvailableCurrenciesForCountry = (countryCode: string) =>
  currencyService.getAvailableCurrenciesForCountry(countryCode);
export const isValidCurrency = (currencyCode: string) =>
  currencyService.isValidCurrency(currencyCode);
export const getCurrencyDisplayInfo = (currencyCode: string) =>
  currencyService.getCurrencyDisplayInfo(currencyCode);
