/**
 * PriceFormatter Service - Compatibility layer for Price.tsx component
 * Uses existing CurrencyService and currencyUtils for formatting
 */

import { currencyService } from '@/services/CurrencyService';
// SIMPLIFIED: Use CurrencyService directly instead of wrapper functions

export interface PriceResult {
  formatted: string;
  currency: string;
  amount: number;
  warning?: string; // Optional warning message
}

export interface DualPriceResult {
  origin: PriceResult;
  destination: PriceResult;
  display: string; // Combined display format
}

export interface PriceFormatOptions {
  originCountry: string;
  destinationCountry?: string;
  userPreferredCurrency?: string;
  exchangeRate?: number;
  showWarnings?: boolean;
}

class PriceFormatter {
  /**
   * Format price for single currency display
   */
  async formatPrice(amount: number, options: PriceFormatOptions): Promise<PriceResult> {
    const { destinationCountry, userPreferredCurrency, exchangeRate } = options;

    try {
      // Determine target currency
      let targetCurrency = userPreferredCurrency;
      if (!targetCurrency && destinationCountry) {
        targetCurrency = await currencyService.getCurrencyForCountry(destinationCountry);
      }
      if (!targetCurrency) {
        targetCurrency = 'USD'; // Fallback
      }

      // Convert amount if needed
      let convertedAmount = amount;
      if (exchangeRate && exchangeRate !== 1) {
        // Simple conversion: amount * rate
        convertedAmount = amount * exchangeRate;
        // Round to whole numbers for most Asian currencies
        const noDecimalCurrencies = ['NPR', 'INR', 'JPY', 'KRW', 'VND', 'IDR'];
        if (noDecimalCurrencies.includes(targetCurrency)) {
          convertedAmount = Math.round(convertedAmount);
        } else {
          convertedAmount = Math.round(convertedAmount * 100) / 100;
        }
      }

      // Format using CurrencyService
      const formatted = currencyService.formatAmount(convertedAmount, targetCurrency);

      return {
        formatted,
        currency: targetCurrency,
        amount: convertedAmount,
      };
    } catch (error) {
      console.error('[PriceFormatter] formatPrice error:', error);
      // Fallback formatting using CurrencyService
      const symbol = currencyService.getCurrencySymbol('USD');
      return {
        formatted: `${symbol}${amount.toFixed(2)}`,
        currency: 'USD',
        amount,
      };
    }
  }

  /**
   * Format price for dual currency display (admin view)
   */
  async formatDualPrice(amount: number, options: PriceFormatOptions): Promise<DualPriceResult> {
    const { originCountry, destinationCountry, exchangeRate } = options;

    if (!destinationCountry) {
      throw new Error('Destination country required for dual price formatting');
    }

    try {
      // Get exchange rate if not provided
      let rate = exchangeRate;
      if (!rate) {
        rate = await currencyService.getExchangeRate(originCountry, destinationCountry);
      }

      // Get currencies for both countries
      const originCurrency = await currencyService.getCurrencyForCountry(originCountry);
      const destinationCurrency = await currencyService.getCurrencyForCountry(destinationCountry);

      // Format in origin currency (amount is already in origin currency)
      const originSymbol = currencyService.getCurrencySymbol(originCurrency);
      const originFormatted = `${originSymbol}${amount.toLocaleString()}`;

      // Convert and format in destination currency
      let destinationAmount = amount;
      let destinationFormatted = originFormatted;

      if (rate && rate !== 1) {
        destinationAmount = amount * rate;
        // Round to whole numbers for most Asian currencies
        const noDecimalCurrencies = ['NPR', 'INR', 'JPY', 'KRW', 'VND', 'IDR'];
        if (noDecimalCurrencies.includes(destinationCurrency)) {
          destinationAmount = Math.round(destinationAmount);
        } else {
          destinationAmount = Math.round(destinationAmount * 100) / 100;
        }
        const destinationSymbol = currencyService.getCurrencySymbol(destinationCurrency);
        destinationFormatted = `${destinationSymbol}${destinationAmount.toLocaleString()}`;
      }

      return {
        origin: {
          formatted: originFormatted,
          currency: originCurrency,
          amount,
        },
        destination: {
          formatted: destinationFormatted,
          currency: destinationCurrency,
          amount: destinationAmount,
        },
        display:
          originCurrency === destinationCurrency
            ? originFormatted
            : `${originFormatted}/${destinationFormatted}`,
      };
    } catch (error) {
      console.error('[PriceFormatter] formatDualPrice error:', error);
      // Fallback to single currency
      const singleResult = await this.formatPrice(amount, options);
      return {
        origin: singleResult,
        destination: singleResult,
        display: singleResult.formatted,
      };
    }
  }
}

// Export singleton instance
export const priceFormatter = new PriceFormatter();

// Export types for components
export type { PriceResult, DualPriceResult, PriceFormatOptions };
