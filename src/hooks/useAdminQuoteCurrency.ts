/**
 * Centralized currency display logic for admin quote interfaces
 * Ensures consistent dual currency display across all admin components
 */

import { useMemo } from 'react';
import { currencyService } from '@/services/CurrencyService';
// SIMPLIFIED: Use CurrencyService directly instead of utility functions
import type { UnifiedQuote } from '@/types/unified-quote';

export interface AdminCurrencyDisplay {
  originCurrency: string;
  destinationCurrency: string;
  originCountry: string;
  destinationCountry: string;
  exchangeRate: number;
  formatDualAmount: (amount: number) => { origin: string; destination: string; short: string };
  formatSingleAmount: (amount: number, currency?: 'origin' | 'destination') => string;
  currencySymbols: {
    origin: string;
    destination: string;
  };
}

/**
 * Hook for consistent admin quote currency display
 * Follows CLAUDE.md dual currency standard: "USD / Customer Currency"
 */
export const useAdminQuoteCurrency = (
  quote: UnifiedQuote | null | undefined,
): AdminCurrencyDisplay => {
  return useMemo(() => {
    // Default fallback values
    if (!quote) {
      return {
        originCurrency: 'USD',
        destinationCurrency: 'USD',
        originCountry: 'US',
        destinationCountry: 'US',
        exchangeRate: 1,
        formatDualAmount: (amount: number) => ({
          origin: `$${amount.toFixed(2)}`,
          destination: `$${amount.toFixed(2)}`,
          short: `$${amount.toFixed(2)}`,
        }),
        formatSingleAmount: (amount: number) => `$${amount.toFixed(2)}`,
        currencySymbols: { origin: '$', destination: '$' },
      };
    }

    // Extract countries from quote
    const originCountry = quote.origin_country || 'US';
    const destinationCountry = quote.destination_country || 'US';

    // Get currencies for countries (sync versions for consistency)
    const originCurrency = currencyService.getCurrencyForCountrySync(originCountry);
    const destinationCurrency = currencyService.getCurrencyForCountrySync(destinationCountry);

    // Get exchange rate from quote data
    const exchangeRate = quote.calculation_data?.exchange_rate?.rate || quote.exchange_rate || 1;

    // Get currency symbols
    const originSymbol = currencyService.getCurrencySymbolSync(originCurrency);
    const destinationSymbol = currencyService.getCurrencySymbolSync(destinationCurrency);

    // Format dual amount function with inline implementation
    const formatDualAmount = (amount: number) => {
      // Format in origin currency
      const originFormatted = `${originSymbol}${amount.toLocaleString()}`;

      // Convert and format in destination currency if different
      if (exchangeRate && exchangeRate !== 1) {
        let convertedAmount = amount * exchangeRate;
        // Round to whole numbers for most Asian currencies
        const noDecimalCurrencies = ['NPR', 'INR', 'JPY', 'KRW', 'VND', 'IDR'];
        if (noDecimalCurrencies.includes(destinationCurrency)) {
          convertedAmount = Math.round(convertedAmount);
        } else {
          convertedAmount = Math.round(convertedAmount * 100) / 100;
        }
        const destinationFormatted = `${destinationSymbol}${convertedAmount.toLocaleString()}`;

        return {
          origin: originFormatted,
          destination: destinationFormatted,
          short: `${originFormatted}/${destinationFormatted}`,
        };
      }

      // Same currency or no exchange rate
      return {
        origin: originFormatted,
        destination: originFormatted,
        short: originFormatted,
      };
    };

    // Format single amount in specified currency
    const formatSingleAmount = (
      amount: number,
      currency: 'origin' | 'destination' = 'destination',
    ) => {
      if (currency === 'origin') {
        return currencyService.formatAmount(amount, originCurrency);
      } else {
        const convertedAmount = exchangeRate !== 1 ? amount * exchangeRate : amount;
        return currencyService.formatAmount(convertedAmount, destinationCurrency);
      }
    };

    return {
      originCurrency,
      destinationCurrency,
      originCountry,
      destinationCountry,
      exchangeRate,
      formatDualAmount,
      formatSingleAmount,
      currencySymbols: {
        origin: originSymbol,
        destination: destinationSymbol,
      },
    };
  }, [
    quote?.origin_country,
    quote?.destination_country,
    quote?.calculation_data?.exchange_rate?.rate,
    quote?.exchange_rate,
  ]);
};

/**
 * Legacy compatibility - simplified version
 * @deprecated Use useAdminQuoteCurrency instead
 */
export const useAdminCurrencyDisplay = (quote: UnifiedQuote | null | undefined) => {
  console.warn('useAdminCurrencyDisplay is deprecated, use useAdminQuoteCurrency instead');
  return useAdminQuoteCurrency(quote);
};
