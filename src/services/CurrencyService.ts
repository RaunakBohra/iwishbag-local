import { supabase } from '@/integrations/supabase/client';

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
    return (Date.now() - this.cacheTimestamp) < this.CACHE_DURATION;
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
   * Get all unique currencies from country_settings table
   */
  async getAllCurrencies(): Promise<Currency[]> {
    if (this.allCurrenciesCache && this.isCacheValid()) {
      return this.allCurrenciesCache;
    }

    try {
      const { data: countrySettings, error } = await supabase
        .from('country_settings')
        .select('currency')
        .not('currency', 'is', null)
        .order('currency');

      if (error) {
        console.error('Error fetching currencies from country_settings:', error);
        return this.getFallbackCurrencies();
      }

      // Get unique currencies
      const uniqueCurrencies = [...new Set(countrySettings.map(cs => cs.currency))];
      
      // Convert to Currency objects with metadata
      const currencies: Currency[] = uniqueCurrencies.map(code => ({
        code,
        name: this.getCurrencyNameSync(code),
        symbol: this.getCurrencySymbolSync(code),
        decimal_places: this.getCurrencyDecimalPlaces(code),
        is_active: true
      }));

      // Cache the results
      this.allCurrenciesCache = currencies;
      this.cacheTimestamp = Date.now();

      // Update individual currency cache
      currencies.forEach(currency => {
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
    return allCurrencies.find(c => c.code === code) || null;
  }

  /**
   * Get country-to-currency mapping from database
   */
  async getCountryCurrencyMap(): Promise<Map<string, string>> {
    if (this.countryCurrencyMapCache.size > 0 && this.isCacheValid()) {
      return this.countryCurrencyMapCache;
    }

    try {
      const { data: countrySettings, error } = await supabase
        .from('country_settings')
        .select('code, currency')
        .not('currency', 'is', null);

      if (error) {
        console.error('Error fetching country-currency mapping:', error);
        return this.getFallbackCountryCurrencyMap();
      }

      const map = new Map<string, string>();
      countrySettings.forEach(cs => {
        if (cs.code && cs.currency) {
          map.set(cs.code, cs.currency);
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
      all: allCurrencies
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
      'USD': '$',
      'EUR': '€',
      'GBP': '£',
      'INR': '₹',
      'NPR': '₨',
      'CAD': 'C$',
      'AUD': 'A$',
      'JPY': '¥',
      'CNY': '¥',
      'SGD': 'S$',
      'AED': 'د.إ',
      'SAR': 'ر.س',
      'EGP': 'ج.م',
      'TRY': '₺',
      'IDR': 'Rp',
      'MYR': 'RM',
      'PHP': '₱',
      'THB': '฿',
      'VND': '₫',
      'KRW': '₩',
    };
    return symbols[currencyCode] || currencyCode;
  }

  /**
   * Get currency name - with hardcoded fallback
   */
  private getCurrencyNameSync(currencyCode: string): string {
    const names: Record<string, string> = {
      'USD': 'US Dollar',
      'EUR': 'Euro',
      'GBP': 'British Pound',
      'INR': 'Indian Rupee',
      'NPR': 'Nepalese Rupee',
      'CAD': 'Canadian Dollar',
      'AUD': 'Australian Dollar',
      'JPY': 'Japanese Yen',
      'CNY': 'Chinese Yuan',
      'SGD': 'Singapore Dollar',
      'AED': 'UAE Dirham',
      'SAR': 'Saudi Riyal',
      'EGP': 'Egyptian Pound',
      'TRY': 'Turkish Lira',
      'IDR': 'Indonesian Rupiah',
      'MYR': 'Malaysian Ringgit',
      'PHP': 'Philippine Peso',
      'THB': 'Thai Baht',
      'VND': 'Vietnamese Dong',
      'KRW': 'South Korean Won',
    };
    return names[currencyCode] || currencyCode;
  }

  /**
   * Get currency decimal places
   */
  private getCurrencyDecimalPlaces(currencyCode: string): number {
    // Some currencies don't use decimal places
    const noDecimalCurrencies = ['JPY', 'KRW', 'VND', 'IDR'];
    return noDecimalCurrencies.includes(currencyCode) ? 0 : 2;
  }

  /**
   * Fallback currencies when database is unavailable
   */
  private getFallbackCurrencies(): Currency[] {
    const fallbackCurrencyCodes = ['USD', 'EUR', 'GBP', 'INR', 'NPR', 'CAD', 'AUD', 'JPY', 'CNY', 'SGD', 'AED', 'SAR', 'IDR', 'MYR', 'PHP', 'THB', 'VND'];
    
    return fallbackCurrencyCodes.map(code => ({
      code,
      name: this.getCurrencyNameSync(code),
      symbol: this.getCurrencySymbolSync(code),
      decimal_places: this.getCurrencyDecimalPlaces(code),
      is_active: true
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
   * Check if a currency code is valid
   */
  async isValidCurrency(currencyCode: string): Promise<boolean> {
    const allCurrencies = await this.getAllCurrencies();
    return allCurrencies.some(c => c.code === currencyCode);
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
      formatted: `${currency?.name || this.getCurrencyNameSync(currencyCode)} (${currencyCode})`
    };
  }

  /**
   * Get minimum payment amount for a currency
   */
  getMinimumPaymentAmount(currencyCode: string): number {
    const minimumAmounts: Record<string, number> = {
      'USD': 50,
      'EUR': 50,
      'GBP': 50,
      'INR': 4000,
      'NPR': 5000,
      'CAD': 50,
      'AUD': 50,
      'JPY': 5000,
      'CNY': 300,
      'SGD': 50,
      'AED': 200,
      'SAR': 200,
      'EGP': 1000,
      'TRY': 500,
      'IDR': 500000,
      'MYR': 200,
      'PHP': 2500,
      'THB': 1500,
      'VND': 1000000,
    };
    return minimumAmounts[currencyCode] || 50;
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
    let options = {
      decimalPlaces: 2,
      thousandSeparator: ',',
      decimalSeparator: '.'
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
    
    // Round to appropriate decimal places
    const rounded = Math.round(amount * Math.pow(10, options.decimalPlaces)) / Math.pow(10, options.decimalPlaces);
    
    // Format with separators
    const parts = rounded.toFixed(options.decimalPlaces).split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, options.thousandSeparator);
    
    const formatted = parts.join(options.decimalSeparator);
    return `${currency}${formatted}`;
  }

  /**
   * Check if amount meets minimum payment requirement
   */
  isValidPaymentAmount(amount: number, currencyCode: string): boolean {
    const minimum = this.getMinimumPaymentAmount(currencyCode);
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
}

// Export singleton instance
export const currencyService = CurrencyService.getInstance();

// Export convenience functions for backward compatibility
export const getAllCurrencies = () => currencyService.getAllCurrencies();
export const getCurrencyForCountry = (countryCode: string) => currencyService.getCurrencyForCountry(countryCode);
export const getAvailableCurrenciesForCountry = (countryCode: string) => currencyService.getAvailableCurrenciesForCountry(countryCode);
export const isValidCurrency = (currencyCode: string) => currencyService.isValidCurrency(currencyCode);
export const getCurrencyDisplayInfo = (currencyCode: string) => currencyService.getCurrencyDisplayInfo(currencyCode);