import { getCountryCurrency, getCurrencySymbol, convertCurrency, getExchangeRate, ExchangeRateResult } from './currencyUtils';

export interface PriceOptions {
  originCountry: string;
  destinationCountry?: string;
  userPreferredCurrency?: string;
  exchangeRate?: number;
  showWarnings?: boolean;
}

export interface DualPriceOptions {
  originCountry: string;
  destinationCountry: string;
  exchangeRate?: number;
  showWarnings?: boolean;
}

export interface PriceResult {
  formatted: string;
  currency: string;
  amount: number;
  exchangeRate?: number;
  warning?: string;
}

export interface DualPriceResult {
  origin: PriceResult;
  destination: PriceResult;
  display: string; // Combined display like "$100 (₹8,300)"
  exchangeRate?: number;
  warning?: string;
}

export class PriceFormatter {
  private static instance: PriceFormatter;
  private exchangeRateCache: Map<string, { rate: ExchangeRateResult; timestamp: number }> = new Map();
  private readonly CACHE_DURATION = 15 * 60 * 1000; // 15 minutes

  private constructor() {}

  static getInstance(): PriceFormatter {
    if (!PriceFormatter.instance) {
      PriceFormatter.instance = new PriceFormatter();
    }
    return PriceFormatter.instance;
  }

  private getCacheKey(fromCountry: string, toCountry: string): string {
    return `${fromCountry}-${toCountry}`;
  }

  private async getCachedExchangeRate(fromCountry: string, toCountry: string): Promise<ExchangeRateResult> {
    const cacheKey = this.getCacheKey(fromCountry, toCountry);
    const cached = this.exchangeRateCache.get(cacheKey);
    
    if (cached && (Date.now() - cached.timestamp) < this.CACHE_DURATION) {
      return cached.rate;
    }

    const rate = await getExchangeRate(fromCountry, toCountry);
    this.exchangeRateCache.set(cacheKey, { rate, timestamp: Date.now() });
    return rate;
  }

  private formatCurrencyAmount(amount: number, currency: string): string {
    const symbol = getCurrencySymbol(currency);
    const convertedAmount = convertCurrency(amount, 1, currency);
    return `${symbol}${convertedAmount.toLocaleString()}`;
  }

  private determineDisplayCurrency(options: PriceOptions): string {
    // Priority: User Preferred → Destination Country → Origin Country
    if (options.userPreferredCurrency) {
      return options.userPreferredCurrency;
    }
    
    if (options.destinationCountry) {
      return getCountryCurrency(options.destinationCountry);
    }
    
    return getCountryCurrency(options.originCountry);
  }

  async formatPrice(amount: number | null | undefined, options: PriceOptions): Promise<PriceResult> {
    if (amount === null || amount === undefined) {
      return {
        formatted: 'N/A',
        currency: 'USD',
        amount: 0
      };
    }

    const originCurrency = getCountryCurrency(options.originCountry);
    const displayCurrency = this.determineDisplayCurrency(options);

    // No conversion needed
    if (originCurrency === displayCurrency) {
      return {
        formatted: this.formatCurrencyAmount(amount, originCurrency),
        currency: originCurrency,
        amount,
        exchangeRate: 1
      };
    }

    // Use provided exchange rate or fetch it
    let exchangeRate = options.exchangeRate;
    let warning: string | undefined;

    if (!exchangeRate) {
      // Determine destination country for exchange rate lookup
      const destinationCountry = options.destinationCountry || options.originCountry;
      
      // Find the country code for the display currency
      const currencyToCountryMap = {
        'USD': 'US', 'INR': 'IN', 'NPR': 'NP', 'CAD': 'CA',
        'AUD': 'AU', 'GBP': 'GB', 'JPY': 'JP', 'CNY': 'CN'
      };
      
      const displayCountry = Object.entries(currencyToCountryMap)
        .find(([currency]) => currency === displayCurrency)?.[1] || destinationCountry;

      const rateResult = await this.getCachedExchangeRate(options.originCountry, displayCountry);
      exchangeRate = rateResult.rate;
      
      if (options.showWarnings && rateResult.warning) {
        warning = rateResult.warning;
      }
    }

    const convertedAmount = convertCurrency(amount, exchangeRate, displayCurrency);

    return {
      formatted: this.formatCurrencyAmount(convertedAmount, displayCurrency),
      currency: displayCurrency,
      amount: convertedAmount,
      exchangeRate,
      warning
    };
  }

  async formatDualPrice(amount: number | null | undefined, options: DualPriceOptions): Promise<DualPriceResult> {
    if (amount === null || amount === undefined) {
      return {
        origin: { formatted: 'N/A', currency: 'USD', amount: 0 },
        destination: { formatted: 'N/A', currency: 'USD', amount: 0 },
        display: 'N/A'
      };
    }

    const originCurrency = getCountryCurrency(options.originCountry);
    const destinationCurrency = getCountryCurrency(options.destinationCountry);

    // Origin price (no conversion needed)
    const originResult: PriceResult = {
      formatted: this.formatCurrencyAmount(amount, originCurrency),
      currency: originCurrency,
      amount,
      exchangeRate: 1
    };

    // Same currency
    if (originCurrency === destinationCurrency) {
      return {
        origin: originResult,
        destination: originResult,
        display: originResult.formatted,
        exchangeRate: 1
      };
    }

    // Destination price (with conversion)
    let exchangeRate = options.exchangeRate;
    let warning: string | undefined;

    if (!exchangeRate) {
      const rateResult = await this.getCachedExchangeRate(options.originCountry, options.destinationCountry);
      exchangeRate = rateResult.rate;
      
      if (options.showWarnings && rateResult.warning) {
        warning = rateResult.warning;
      }
    }

    const convertedAmount = convertCurrency(amount, exchangeRate, destinationCurrency);
    const destinationResult: PriceResult = {
      formatted: this.formatCurrencyAmount(convertedAmount, destinationCurrency),
      currency: destinationCurrency,
      amount: convertedAmount,
      exchangeRate
    };

    // Combined display: "$100 (₹8,300)"
    const display = `${originResult.formatted} (${destinationResult.formatted})`;

    return {
      origin: originResult,
      destination: destinationResult,
      display,
      exchangeRate,
      warning
    };
  }

  clearCache(): void {
    this.exchangeRateCache.clear();
  }
}

// Export singleton instance
export const priceFormatter = PriceFormatter.getInstance();