/**
 * Currency Calculation Service
 * Handles exchange rates, multi-currency conversions, and currency utilities
 * Decomposed from SimplifiedQuoteCalculator for better separation of concerns
 */

import { logger } from '@/utils/logger';
import { currencyService } from '@/services/CurrencyService';

export interface CurrencyConversionRequest {
  amount: number;
  fromCurrency: string;
  toCurrency: string;
  useCache?: boolean;
}

export interface CurrencyConversionResult {
  originalAmount: number;
  convertedAmount: number;
  fromCurrency: string;
  toCurrency: string;
  exchangeRate: number;
  timestamp: Date;
}

export interface MultiCurrencyAmounts {
  usd: number;
  originCurrency: number;
  customerCurrency: number;
  exchangeRates: {
    originToUsd: number;
    usdToCustomer: number;
    originToCustomer: number;
  };
}

export interface CurrencyConfig {
  originCountry: string;
  originCurrency: string;
  destinationCountry: string;
  customerCurrency: string;
  exchangeRates: {
    [fromTo: string]: number;
  };
}

// Country to currency mapping
const COUNTRY_CURRENCY_MAP: { [country: string]: string } = {
  'US': 'USD',
  'IN': 'INR',
  'NP': 'NPR',
  'GB': 'GBP',
  'EU': 'EUR',
  'CA': 'CAD',
  'AU': 'AUD',
  'JP': 'JPY',
  'KR': 'KRW',
  'CN': 'CNY',
  'SG': 'SGD',
  'MY': 'MYR',
  'TH': 'THB',
  'BD': 'BDT',
  'PK': 'PKR',
  'LK': 'LKR'
};

export class CurrencyCalculationService {
  private exchangeRateCache = new Map<string, { rate: number; timestamp: Date; ttl: number }>();
  private readonly cacheTTL = 5 * 60 * 1000; // 5 minutes
  
  constructor() {
    logger.info('CurrencyCalculationService initialized');
  }

  /**
   * Setup currency configuration for a quote calculation
   */
  async setupCurrencyConfig(
    originCountry: string, 
    destinationCountry: string,
    forcedOriginCurrency?: string,
    forcedCustomerCurrency?: string
  ): Promise<CurrencyConfig> {
    try {
      // Determine currencies
      const originCurrency = forcedOriginCurrency || this.getCountryCurrency(originCountry);
      const customerCurrency = forcedCustomerCurrency || await this.getCustomerCurrency(destinationCountry);

      // Pre-fetch all required exchange rates
      const exchangeRates: { [fromTo: string]: number } = {};

      // Origin to USD (for internal calculations)
      if (originCurrency !== 'USD') {
        exchangeRates[`${originCurrency}_USD`] = await this.getExchangeRate(originCurrency, 'USD');
      } else {
        exchangeRates[`${originCurrency}_USD`] = 1;
      }

      // USD to Customer Currency (for display)
      if (customerCurrency !== 'USD') {
        exchangeRates[`USD_${customerCurrency}`] = await this.getExchangeRate('USD', customerCurrency);
      } else {
        exchangeRates[`USD_${customerCurrency}`] = 1;
      }

      // Direct Origin to Customer (for optimization)
      if (originCurrency !== customerCurrency) {
        exchangeRates[`${originCurrency}_${customerCurrency}`] = await this.getExchangeRate(originCurrency, customerCurrency);
      } else {
        exchangeRates[`${originCurrency}_${customerCurrency}`] = 1;
      }

      const config: CurrencyConfig = {
        originCountry,
        originCurrency,
        destinationCountry,
        customerCurrency,
        exchangeRates
      };

      logger.info(`Currency config setup: ${originCurrency} → ${customerCurrency}`, config.exchangeRates);
      return config;

    } catch (error) {
      logger.error('Currency config setup failed:', error);
      
      // Safe fallback
      return {
        originCountry,
        originCurrency: 'USD',
        destinationCountry,
        customerCurrency: 'USD',
        exchangeRates: {
          'USD_USD': 1
        }
      };
    }
  }

  /**
   * Convert amount between currencies with caching
   */
  async convertCurrency(request: CurrencyConversionRequest): Promise<CurrencyConversionResult> {
    try {
      const { amount, fromCurrency, toCurrency, useCache = true } = request;

      // No conversion needed
      if (fromCurrency === toCurrency) {
        return {
          originalAmount: amount,
          convertedAmount: amount,
          fromCurrency,
          toCurrency,
          exchangeRate: 1,
          timestamp: new Date()
        };
      }

      // Get exchange rate
      const exchangeRate = await this.getExchangeRate(fromCurrency, toCurrency, useCache);
      const convertedAmount = amount * exchangeRate;

      return {
        originalAmount: amount,
        convertedAmount: convertedAmount,
        fromCurrency,
        toCurrency,
        exchangeRate,
        timestamp: new Date()
      };

    } catch (error) {
      logger.error('Currency conversion failed:', error);
      throw new Error(`Failed to convert ${fromCurrency} to ${toCurrency}`);
    }
  }

  /**
   * Convert amount to multiple currencies simultaneously
   */
  async convertToMultipleCurrencies(
    amount: number,
    baseCurrency: string,
    targetCurrencies: string[]
  ): Promise<{ [currency: string]: CurrencyConversionResult }> {
    try {
      const results: { [currency: string]: CurrencyConversionResult } = {};

      // Convert to each target currency
      for (const targetCurrency of targetCurrencies) {
        results[targetCurrency] = await this.convertCurrency({
          amount,
          fromCurrency: baseCurrency,
          toCurrency: targetCurrency
        });
      }

      logger.debug(`Multi-currency conversion completed: ${baseCurrency} → [${targetCurrencies.join(', ')}]`);
      return results;

    } catch (error) {
      logger.error('Multi-currency conversion failed:', error);
      throw new Error('Failed to convert to multiple currencies');
    }
  }

  /**
   * Create multi-currency amounts for a quote
   */
  async createMultiCurrencyAmounts(
    amountInOriginCurrency: number,
    config: CurrencyConfig
  ): Promise<MultiCurrencyAmounts> {
    try {
      const { originCurrency, customerCurrency, exchangeRates } = config;

      // Convert to USD (internal standard)
      const usdAmount = originCurrency === 'USD' 
        ? amountInOriginCurrency 
        : amountInOriginCurrency * exchangeRates[`${originCurrency}_USD`];

      // Convert to customer currency
      const customerAmount = customerCurrency === 'USD'
        ? usdAmount
        : usdAmount * exchangeRates[`USD_${customerCurrency}`];

      return {
        usd: usdAmount,
        originCurrency: amountInOriginCurrency,
        customerCurrency: customerAmount,
        exchangeRates: {
          originToUsd: exchangeRates[`${originCurrency}_USD`],
          usdToCustomer: exchangeRates[`USD_${customerCurrency}`],
          originToCustomer: exchangeRates[`${originCurrency}_${customerCurrency}`]
        }
      };

    } catch (error) {
      logger.error('Multi-currency amounts creation failed:', error);
      throw new Error('Failed to create multi-currency amounts');
    }
  }

  /**
   * Get exchange rate with caching
   */
  async getExchangeRate(fromCurrency: string, toCurrency: string, useCache = true): Promise<number> {
    try {
      // Same currency
      if (fromCurrency === toCurrency) {
        return 1;
      }

      const cacheKey = `${fromCurrency}_${toCurrency}`;
      
      // Check cache if enabled
      if (useCache && this.exchangeRateCache.has(cacheKey)) {
        const cached = this.exchangeRateCache.get(cacheKey)!;
        const now = new Date().getTime();
        
        if (now - cached.timestamp.getTime() < cached.ttl) {
          logger.debug(`Exchange rate from cache: ${fromCurrency}/${toCurrency} = ${cached.rate}`);
          return cached.rate;
        } else {
          // Remove expired entry
          this.exchangeRateCache.delete(cacheKey);
        }
      }

      // Fetch fresh rate
      const rate = await currencyService.getExchangeRate(fromCurrency, toCurrency);
      
      // Cache the result
      if (useCache) {
        this.exchangeRateCache.set(cacheKey, {
          rate,
          timestamp: new Date(),
          ttl: this.cacheTTL
        });
      }

      logger.debug(`Fresh exchange rate: ${fromCurrency}/${toCurrency} = ${rate}`);
      return rate;

    } catch (error) {
      logger.error(`Exchange rate lookup failed for ${fromCurrency}/${toCurrency}:`, error);
      
      // Fallback to 1 for safety (will cause issues, but prevents crashes)
      logger.warn(`Using fallback rate of 1 for ${fromCurrency}/${toCurrency}`);
      return 1;
    }
  }

  /**
   * Convert amount from origin currency to USD
   */
  async convertToUSD(amount: number, originCurrency: string): Promise<number> {
    const result = await this.convertCurrency({
      amount,
      fromCurrency: originCurrency,
      toCurrency: 'USD'
    });
    return result.convertedAmount;
  }

  /**
   * Convert amount from USD to target currency
   */
  async convertFromUSD(amountUSD: number, targetCurrency: string): Promise<number> {
    const result = await this.convertCurrency({
      amount: amountUSD,
      fromCurrency: 'USD',
      toCurrency: targetCurrency
    });
    return result.convertedAmount;
  }

  /**
   * Get customer currency for a country
   */
  async getCustomerCurrency(countryCode: string): Promise<string> {
    try {
      // Try to get from CurrencyService first
      const currency = await currencyService.getCurrency(countryCode);
      if (currency && currency !== 'USD') {
        return currency;
      }

      // Fallback to hardcoded mapping
      return this.getCountryCurrency(countryCode);

    } catch (error) {
      logger.warn(`Failed to get customer currency for ${countryCode}:`, error);
      return this.getCountryCurrency(countryCode);
    }
  }

  /**
   * Get currency code for a country (hardcoded mapping)
   */
  getCountryCurrency(countryCode: string): string {
    return COUNTRY_CURRENCY_MAP[countryCode] || 'USD';
  }

  /**
   * Validate currency codes
   */
  validateCurrencyCode(currency: string): boolean {
    const validCurrencies = [
      'USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY', 'KRW',
      'INR', 'NPR', 'SGD', 'MYR', 'THB', 'BDT', 'PKR', 'LKR', 'SEK',
      'NOK', 'DKK', 'NZD', 'ZAR', 'BRL', 'MXN', 'RUB', 'TRY', 'IDR',
      'PHP', 'VND', 'PLN', 'CZK', 'HUF', 'RON', 'BGN', 'HRK', 'ILS',
      'EGP', 'AED', 'SAR', 'QAR', 'KWD', 'OMR', 'BHD', 'JOD', 'LBP'
    ];

    return validCurrencies.includes(currency.toUpperCase());
  }

  /**
   * Format currency amount for display
   */
  formatCurrencyAmount(
    amount: number, 
    currency: string, 
    locale: string = 'en-US',
    options: Intl.NumberFormatOptions = {}
  ): string {
    try {
      const formatter = new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: currency.toUpperCase(),
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
        ...options
      });

      return formatter.format(amount);

    } catch (error) {
      logger.warn(`Currency formatting failed for ${amount} ${currency}:`, error);
      return `${currency} ${amount.toFixed(2)}`;
    }
  }

  /**
   * Get currency symbol
   */
  getCurrencySymbol(currency: string): string {
    const symbols: { [currency: string]: string } = {
      'USD': '$',
      'EUR': '€',
      'GBP': '£',
      'JPY': '¥',
      'INR': '₹',
      'NPR': 'Rs.',
      'CAD': 'C$',
      'AUD': 'A$',
      'SGD': 'S$',
      'MYR': 'RM',
      'THB': '฿',
      'KRW': '₩',
      'CNY': '¥'
    };

    return symbols[currency.toUpperCase()] || currency.toUpperCase();
  }

  /**
   * Clear exchange rate cache
   */
  clearCache(): void {
    this.exchangeRateCache.clear();
    logger.info('Currency exchange rate cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; entries: Array<{ pair: string; rate: number; age: number }> } {
    const entries = Array.from(this.exchangeRateCache.entries()).map(([pair, data]) => ({
      pair,
      rate: data.rate,
      age: new Date().getTime() - data.timestamp.getTime()
    }));

    return {
      size: this.exchangeRateCache.size,
      entries
    };
  }

  /**
   * Clean expired cache entries
   */
  cleanExpiredCache(): number {
    const now = new Date().getTime();
    let cleaned = 0;

    for (const [key, data] of this.exchangeRateCache.entries()) {
      if (now - data.timestamp.getTime() > data.ttl) {
        this.exchangeRateCache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logger.info(`Cleaned ${cleaned} expired exchange rate cache entries`);
    }

    return cleaned;
  }

  /**
   * Get all supported currencies
   */
  getSupportedCurrencies(): string[] {
    return Object.values(COUNTRY_CURRENCY_MAP).concat(['USD', 'EUR', 'GBP', 'JPY']);
  }

  /**
   * Check if currency conversion is needed
   */
  needsConversion(fromCurrency: string, toCurrency: string): boolean {
    return fromCurrency !== toCurrency;
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    this.clearCache();
    logger.info('CurrencyCalculationService disposed');
  }
}

export default CurrencyCalculationService;