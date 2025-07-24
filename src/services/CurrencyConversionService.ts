/**
 * Currency Conversion Service for HSN System
 *
 * CRITICAL FEATURE: Converts minimum valuations from USD to origin country currency
 * This addresses the key requirement where minimum valuations are stored in USD
 * but quotes are calculated in origin country currency.
 *
 * Example: Nepal kurta with $10 USD minimum → ~1330 NPR → apply 12% customs
 */

interface MinimumValuationConversion {
  usdAmount: number;
  originCurrency: string;
  convertedAmount: number;
  exchangeRate: number;
  conversionTimestamp: Date;
  roundingMethod: 'up' | 'down' | 'nearest';
  cacheSource: 'real_time' | 'cached' | 'fallback';
}

interface CurrencyConversionConfig {
  cacheEnabled: boolean;
  cacheDurationMinutes: number;
  fallbackRates: Record<string, number>;
  roundingMethod: 'up' | 'down' | 'nearest';
  enableRealTimeAPI: boolean;
}

interface CurrencyRate {
  fromCurrency: string;
  toCurrency: string;
  rate: number;
  timestamp: Date;
  source: 'api' | 'database' | 'fallback';
}

class CurrencyConversionService {
  private static instance: CurrencyConversionService;

  private config: CurrencyConversionConfig = {
    cacheEnabled: true,
    cacheDurationMinutes: 60, // 1 hour cache for currency rates
    fallbackRates: {
      NPR: 133.0, // Fallback USD to NPR rate
      INR: 83.0, // Fallback USD to INR rate
      CNY: 7.2, // Fallback USD to CNY rate
      GBP: 0.78, // Fallback USD to GBP rate
      EUR: 0.85, // Fallback USD to EUR rate
    },
    roundingMethod: 'up', // Always round up for customs calculations
    enableRealTimeAPI: true,
  };

  private rateCache = new Map<string, CurrencyRate>();

  private constructor() {}

  static getInstance(): CurrencyConversionService {
    if (!CurrencyConversionService.instance) {
      CurrencyConversionService.instance = new CurrencyConversionService();
    }
    return CurrencyConversionService.instance;
  }

  /**
   * CRITICAL METHOD: Convert minimum valuation from USD to origin country currency
   * This is the core method that addresses the main requirement
   */
  async convertMinimumValuation(
    usdAmount: number,
    originCountry: string,
    options?: {
      roundingMethod?: 'up' | 'down' | 'nearest';
      forceRefresh?: boolean;
    },
  ): Promise<MinimumValuationConversion> {
    try {
      // Get origin country currency
      const originCurrency = await this.getCurrencyByCountry(originCountry);

      // If already in USD, no conversion needed
      if (originCurrency === 'USD') {
        return {
          usdAmount,
          originCurrency: 'USD',
          convertedAmount: usdAmount,
          exchangeRate: 1.0,
          conversionTimestamp: new Date(),
          roundingMethod: options?.roundingMethod || this.config.roundingMethod,
          cacheSource: 'real_time',
        };
      }

      // Get exchange rate
      const rateData = await this.getExchangeRate('USD', originCurrency, options?.forceRefresh);

      // Calculate converted amount
      const rawAmount = usdAmount * rateData.rate;
      const convertedAmount = this.applyRounding(
        rawAmount,
        options?.roundingMethod || this.config.roundingMethod,
      );

      return {
        usdAmount,
        originCurrency,
        convertedAmount,
        exchangeRate: rateData.rate,
        conversionTimestamp: new Date(),
        roundingMethod: options?.roundingMethod || this.config.roundingMethod,
        cacheSource: rateData.source === 'database' ? 'cached' : (rateData.source as any),
      };
    } catch (error) {
      console.error('Currency conversion error:', error);

      // Fallback to default rates
      const fallbackRate = this.getFallbackRate(originCountry);
      const rawAmount = usdAmount * fallbackRate;
      const convertedAmount = this.applyRounding(rawAmount, 'up'); // Always round up on fallback

      return {
        usdAmount,
        originCurrency: this.getCurrencyCodeFallback(originCountry),
        convertedAmount,
        exchangeRate: fallbackRate,
        conversionTimestamp: new Date(),
        roundingMethod: 'up',
        cacheSource: 'fallback',
      };
    }
  }

  /**
   * Batch convert multiple minimum valuations (for performance)
   */
  async convertMultipleMinimumValuations(
    conversions: Array<{
      usdAmount: number;
      originCountry: string;
      itemId?: string;
    }>,
  ): Promise<Array<MinimumValuationConversion & { itemId?: string }>> {
    const promises = conversions.map(async ({ usdAmount, originCountry, itemId }) => {
      const conversion = await this.convertMinimumValuation(usdAmount, originCountry);
      return { ...conversion, itemId };
    });

    return Promise.all(promises);
  }

  /**
   * Get exchange rate between two currencies with caching
   */
  private async getExchangeRate(
    fromCurrency: string,
    toCurrency: string,
    forceRefresh = false,
  ): Promise<CurrencyRate> {
    const cacheKey = `${fromCurrency}-${toCurrency}`;

    // Check cache first
    if (!forceRefresh && this.config.cacheEnabled) {
      const cachedRate = this.rateCache.get(cacheKey);
      if (cachedRate && this.isCacheValid(cachedRate.timestamp)) {
        return cachedRate;
      }
    }

    try {
      // Try to get rate from database (country_settings)
      const dbRate = await this.getRateFromDatabase(fromCurrency, toCurrency);
      if (dbRate) {
        this.cacheRate(cacheKey, dbRate);
        return dbRate;
      }

      // If real-time API is enabled, try external API
      if (this.config.enableRealTimeAPI) {
        const apiRate = await this.getRateFromAPI(fromCurrency, toCurrency);
        if (apiRate) {
          this.cacheRate(cacheKey, apiRate);
          return apiRate;
        }
      }

      // Fallback to hardcoded rates
      return this.getFallbackRateData(fromCurrency, toCurrency);
    } catch (error) {
      console.error('Exchange rate fetch error:', error);
      return this.getFallbackRateData(fromCurrency, toCurrency);
    }
  }

  /**
   * Get currency rate from database (country_settings table)
   */
  private async getRateFromDatabase(
    fromCurrency: string,
    toCurrency: string,
  ): Promise<CurrencyRate | null> {
    try {
      // Import supabase client dynamically to avoid circular dependencies
      const { supabase } = await import('@/integrations/supabase/client');

      if (fromCurrency === 'USD') {
        // Get USD to target currency rate
        const { data, error } = await supabase
          .from('country_settings')
          .select('currency, rate_from_usd')
          .eq('currency', toCurrency)
          .single();

        if (error || !data) {
          return null;
        }

        return {
          fromCurrency,
          toCurrency,
          rate: data.rate_from_usd,
          timestamp: new Date(),
          source: 'database',
        };
      }

      return null; // Only support USD base conversions for now
    } catch (error) {
      console.error('Database rate fetch error:', error);
      return null;
    }
  }

  /**
   * Get currency rate from external API (placeholder for future implementation)
   */
  private async getRateFromAPI(
    fromCurrency: string,
    toCurrency: string,
  ): Promise<CurrencyRate | null> {
    // TODO: Implement external API integration
    // This could integrate with services like:
    // - exchangerate-api.com
    // - fixer.io
    // - currencylayer.com

    console.log('Real-time API rates not implemented yet, using database/fallback');
    return null;
  }

  /**
   * Get currency code by country
   */
  private async getCurrencyByCountry(countryCode: string): Promise<string> {
    try {
      const { supabase } = await import('@/integrations/supabase/client');

      const { data, error } = await supabase
        .from('country_settings')
        .select('currency')
        .eq('code', countryCode)
        .single();

      if (error || !data) {
        return this.getCurrencyCodeFallback(countryCode);
      }

      return data.currency;
    } catch (error) {
      console.error('Currency lookup error:', error);
      return this.getCurrencyCodeFallback(countryCode);
    }
  }

  /**
   * Apply rounding method to converted amount
   */
  private applyRounding(amount: number, method: 'up' | 'down' | 'nearest'): number {
    switch (method) {
      case 'up':
        return Math.ceil(amount);
      case 'down':
        return Math.floor(amount);
      case 'nearest':
        return Math.round(amount);
      default:
        return Math.ceil(amount); // Default to ceiling for customs
    }
  }

  /**
   * Get fallback exchange rate for country
   */
  private getFallbackRate(countryCode: string): number {
    const currencyCode = this.getCurrencyCodeFallback(countryCode);
    return this.config.fallbackRates[currencyCode] || 1.0;
  }

  /**
   * Get fallback currency code for country
   */
  private getCurrencyCodeFallback(countryCode: string): string {
    const currencyMap: Record<string, string> = {
      US: 'USD',
      IN: 'INR',
      NP: 'NPR',
      CN: 'CNY',
      GB: 'GBP',
      EU: 'EUR',
      CA: 'CAD',
      AU: 'AUD',
      JP: 'JPY',
    };

    return currencyMap[countryCode] || 'USD';
  }

  /**
   * Create fallback rate data
   */
  private getFallbackRateData(fromCurrency: string, toCurrency: string): CurrencyRate {
    const rate = fromCurrency === 'USD' ? this.config.fallbackRates[toCurrency] || 1.0 : 1.0;

    return {
      fromCurrency,
      toCurrency,
      rate,
      timestamp: new Date(),
      source: 'fallback',
    };
  }

  /**
   * Cache exchange rate
   */
  private cacheRate(cacheKey: string, rateData: CurrencyRate): void {
    if (this.config.cacheEnabled) {
      this.rateCache.set(cacheKey, rateData);
    }
  }

  /**
   * Check if cached rate is still valid
   */
  private isCacheValid(timestamp: Date): boolean {
    const now = new Date();
    const diffMinutes = (now.getTime() - timestamp.getTime()) / (1000 * 60);
    return diffMinutes < this.config.cacheDurationMinutes;
  }

  /**
   * Clear rate cache (useful for testing or force refresh)
   */
  clearCache(): void {
    this.rateCache.clear();
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<CurrencyConversionConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get current configuration
   */
  getConfig(): CurrencyConversionConfig {
    return { ...this.config };
  }

  /**
   * Validate minimum valuation conversion for testing
   */
  async validateConversion(expectedConversion: {
    usdAmount: number;
    originCountry: string;
    expectedAmount: number;
    tolerance?: number;
  }): Promise<{
    isValid: boolean;
    actualConversion: MinimumValuationConversion;
    difference: number;
    percentageError: number;
  }> {
    const actualConversion = await this.convertMinimumValuation(
      expectedConversion.usdAmount,
      expectedConversion.originCountry,
    );

    const difference = Math.abs(
      actualConversion.convertedAmount - expectedConversion.expectedAmount,
    );
    const percentageError = (difference / expectedConversion.expectedAmount) * 100;
    const tolerance = expectedConversion.tolerance || 1.0; // 1% default tolerance

    return {
      isValid: percentageError <= tolerance,
      actualConversion,
      difference,
      percentageError,
    };
  }
}

export default CurrencyConversionService;
export type { MinimumValuationConversion, CurrencyConversionConfig };
