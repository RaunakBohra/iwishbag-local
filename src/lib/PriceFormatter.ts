/**
 * PriceFormatter Service - Compatibility layer for Price.tsx component
 * Uses existing CurrencyService and currencyUtils for formatting
 */

import { currencyService } from '@/services/CurrencyService';
import { formatDualCurrencyNew, getCurrencySymbol, getCountryCurrency, convertCurrency } from './currencyUtils';

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
    const {
      destinationCountry,
      userPreferredCurrency,
      exchangeRate
    } = options;

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
        convertedAmount = convertCurrency(amount, exchangeRate, targetCurrency);
      }

      // Format using CurrencyService
      const formatted = currencyService.formatAmount(convertedAmount, targetCurrency);

      return {
        formatted,
        currency: targetCurrency,
        amount: convertedAmount
      };
    } catch (error) {
      console.error('[PriceFormatter] formatPrice error:', error);
      // Fallback formatting
      const symbol = getCurrencySymbol('USD');
      return {
        formatted: `${symbol}${amount.toFixed(2)}`,
        currency: 'USD',
        amount
      };
    }
  }

  /**
   * Format price for dual currency display (admin view)
   */
  async formatDualPrice(amount: number, options: PriceFormatOptions): Promise<DualPriceResult> {
    const {
      originCountry,
      destinationCountry,
      exchangeRate
    } = options;

    if (!destinationCountry) {
      throw new Error('Destination country required for dual price formatting');
    }

    try {
      // Get exchange rate if not provided
      let rate = exchangeRate;
      if (!rate) {
        rate = await currencyService.getExchangeRate(originCountry, destinationCountry);
      }

      // Use existing dual currency formatting
      const dualResult = formatDualCurrencyNew(amount, originCountry, destinationCountry, rate);

      const originCurrency = await currencyService.getCurrencyForCountry(originCountry);
      const destinationCurrency = await currencyService.getCurrencyForCountry(destinationCountry);

      const destinationAmount = rate && rate !== 1 ? convertCurrency(amount, rate, destinationCurrency) : amount;

      return {
        origin: {
          formatted: dualResult.origin,
          currency: originCurrency,
          amount
        },
        destination: {
          formatted: dualResult.destination,
          currency: destinationCurrency,
          amount: destinationAmount
        },
        display: dualResult.short
      };
    } catch (error) {
      console.error('[PriceFormatter] formatDualPrice error:', error);
      // Fallback to single currency
      const singleResult = await this.formatPrice(amount, options);
      return {
        origin: singleResult,
        destination: singleResult,
        display: singleResult.formatted
      };
    }
  }
}

// Export singleton instance
export const priceFormatter = new PriceFormatter();

// Export types for components
export type { PriceResult, DualPriceResult, PriceFormatOptions };