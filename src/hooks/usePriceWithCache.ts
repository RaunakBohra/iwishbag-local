import { useState, useEffect, useCallback } from 'react';
import {
  priceFormatter,
  PriceOptions,
  DualPriceOptions,
  PriceResult,
  DualPriceResult,
} from '@/lib/PriceFormatter';
import { useUserProfile } from './useUserProfile';
import { useExchangeRateWithCache } from './useExchangeRates';

export interface UsePriceWithCacheOptions {
  originCountry: string;
  destinationCountry?: string;
  userPreferredCurrency?: string;
  exchangeRate?: number;
  showWarnings?: boolean;
}

export interface UsePriceWithCacheResult {
  formatPrice: (amount: number | null | undefined) => PriceResult;
  formatDualPrice: (amount: number | null | undefined) => DualPriceResult | null;
  isLoading: boolean;
  error: string | null;
  exchangeRateInfo?: {
    rate: number;
    source: string;
    confidence: string;
    warning?: string;
  };
}

export function usePriceWithCache(options: UsePriceWithCacheOptions): UsePriceWithCacheResult {
  const { data: userProfile } = useUserProfile();
  const [error, setError] = useState<string | null>(null);

  // Determine the target country for exchange rate lookup
  const targetCountry = options.destinationCountry || options.originCountry;

  // Get exchange rate with caching
  const {
    exchangeRate: cachedExchangeRate,
    exchangeRateSource,
    exchangeRateConfidence,
    exchangeRateWarning,
    isLoading: exchangeRateLoading,
    error: exchangeRateError,
  } = useExchangeRateWithCache(options.originCountry, targetCountry);

  // Use provided exchange rate or cached one
  const effectiveExchangeRate = options.exchangeRate || cachedExchangeRate;

  // Use user's preferred currency if not explicitly provided
  const userPreferredCurrency =
    options.userPreferredCurrency || userProfile?.preferred_display_currency;

  const formatPrice = useCallback(
    (amount: number | null | undefined): PriceResult => {
      if (amount === null || amount === undefined) {
        return {
          formatted: 'N/A',
          currency: 'USD',
          amount: 0,
        };
      }

      try {
        // Determine display currency using the same priority chain
        let displayCurrency = userPreferredCurrency;
        if (!displayCurrency && options.destinationCountry) {
          displayCurrency = getCountryCurrency(options.destinationCountry);
        }
        if (!displayCurrency) {
          displayCurrency = getCountryCurrency(options.originCountry);
        }

        const originCurrency = getCountryCurrency(options.originCountry);

        // No conversion needed
        if (originCurrency === displayCurrency) {
          return {
            formatted: formatCurrencyAmount(amount, originCurrency),
            currency: originCurrency,
            amount,
            exchangeRate: 1,
          };
        }

        // Convert using cached exchange rate
        const convertedAmount = convertCurrency(amount, effectiveExchangeRate, displayCurrency);

        return {
          formatted: formatCurrencyAmount(convertedAmount, displayCurrency),
          currency: displayCurrency,
          amount: convertedAmount,
          exchangeRate: effectiveExchangeRate,
          warning: options.showWarnings ? exchangeRateWarning : undefined,
        };
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to format price';
        setError(errorMessage);

        return {
          formatted: `$${amount.toLocaleString()}`,
          currency: 'USD',
          amount,
          warning: errorMessage,
        };
      }
    },
    [
      options.originCountry,
      options.destinationCountry,
      userPreferredCurrency,
      effectiveExchangeRate,
      options.showWarnings,
      exchangeRateWarning,
    ],
  );

  const formatDualPrice = useCallback(
    (amount: number | null | undefined): DualPriceResult | null => {
      if (!options.destinationCountry) {
        return null;
      }

      if (amount === null || amount === undefined) {
        return {
          origin: { formatted: 'N/A', currency: 'USD', amount: 0 },
          destination: { formatted: 'N/A', currency: 'USD', amount: 0 },
          display: 'N/A',
        };
      }

      try {
        const originCurrency = getCountryCurrency(options.originCountry);
        const destinationCurrency = getCountryCurrency(options.destinationCountry);

        // Origin price (no conversion needed)
        const originResult: PriceResult = {
          formatted: formatCurrencyAmount(amount, originCurrency),
          currency: originCurrency,
          amount,
          exchangeRate: 1,
        };

        // Same currency
        if (originCurrency === destinationCurrency) {
          return {
            origin: originResult,
            destination: originResult,
            display: originResult.formatted,
            exchangeRate: 1,
          };
        }

        // Destination price (with conversion)
        const convertedAmount = convertCurrency(amount, effectiveExchangeRate, destinationCurrency);
        const destinationResult: PriceResult = {
          formatted: formatCurrencyAmount(convertedAmount, destinationCurrency),
          currency: destinationCurrency,
          amount: convertedAmount,
          exchangeRate: effectiveExchangeRate,
        };

        // Combined display: "$100 (₹8,300)"
        const display = `${originResult.formatted} (${destinationResult.formatted})`;

        return {
          origin: originResult,
          destination: destinationResult,
          display,
          exchangeRate: effectiveExchangeRate,
          warning: options.showWarnings ? exchangeRateWarning : undefined,
        };
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to format dual price';
        setError(errorMessage);

        return {
          origin: {
            formatted: `$${amount.toLocaleString()}`,
            currency: 'USD',
            amount,
          },
          destination: {
            formatted: `$${amount.toLocaleString()}`,
            currency: 'USD',
            amount,
          },
          display: `$${amount.toLocaleString()}`,
          warning: errorMessage,
        };
      }
    },
    [
      options.originCountry,
      options.destinationCountry,
      effectiveExchangeRate,
      options.showWarnings,
      exchangeRateWarning,
    ],
  );

  return {
    formatPrice,
    formatDualPrice,
    isLoading: exchangeRateLoading,
    error: error || exchangeRateError?.message || null,
    exchangeRateInfo: {
      rate: effectiveExchangeRate,
      source: exchangeRateSource,
      confidence: exchangeRateConfidence,
      warning: exchangeRateWarning,
    },
  };
}

// Helper functions (moved from PriceFormatter for direct use)
function getCountryCurrency(countryCode: string): string {
  const currencyMap: { [key: string]: string } = {
    US: 'USD',
    IN: 'INR',
    NP: 'NPR',
    CA: 'CAD',
    AU: 'AUD',
    GB: 'GBP',
    JP: 'JPY',
    CN: 'CNY',
    SG: 'SGD',
    AE: 'AED',
    SA: 'SAR',
  };
  return currencyMap[countryCode] || 'USD';
}

function getCurrencySymbol(currency: string): string {
  const symbols: { [key: string]: string } = {
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
  };
  return symbols[currency] || currency;
}

function formatCurrencyAmount(amount: number, currency: string): string {
  const symbol = getCurrencySymbol(currency);
  const convertedAmount = convertCurrency(amount, 1, currency);
  return `${symbol}${convertedAmount.toLocaleString()}`;
}

function convertCurrency(amount: number, exchangeRate: number, targetCurrency: string): number {
  const converted = amount * exchangeRate;

  // Round to whole numbers for most Asian currencies
  const noDecimalCurrencies = ['NPR', 'INR', 'JPY', 'KRW', 'VND', 'IDR'];
  if (noDecimalCurrencies.includes(targetCurrency)) {
    return Math.round(converted);
  }

  // Round to 2 decimal places for others
  return Math.round(converted * 100) / 100;
}
