/**
 * Universal Currency Conversion Utility
 * 
 * Provides consistent currency conversion logic across the entire application.
 * Extracted from the quote page's sophisticated conversion patterns to ensure
 * financial precision and universal currency pair support.
 * 
 * Features:
 * - Universal currency pair support (USD→NPR, INR→NPR, USD→INR, etc.)
 * - Financial precision with proper rounding
 * - Consistent conversion logic across all components
 * - Smart fallbacks and error handling
 */

import type { QuoteItem, UnifiedQuote } from '../types/unified-quote';
import { currencyService } from '@/services/CurrencyService';
import { logger } from '@/utils/logger';

// =============================================================================
// UNIVERSAL CURRENCY CONVERSION FUNCTIONS (Enhanced from Quote Page Logic)
// =============================================================================

/**
 * Convert currency amount with financial precision
 * 
 * This uses the same sophisticated conversion logic as the quote page,
 * ensuring consistency across the entire application.
 * 
 * @param amount - Amount to convert
 * @param fromCurrency - Source currency code (e.g., 'USD', 'INR')
 * @param toCurrency - Target currency code (e.g., 'NPR', 'INR')
 * @returns Promise<number> - Converted amount with financial precision
 */
export const convertCurrencyWithPrecision = async (
  amount: number, 
  fromCurrency: string, 
  toCurrency: string
): Promise<number> => {
  // No conversion needed if currencies are the same
  if (fromCurrency === toCurrency) {
    return amount;
  }
  
  try {
    // Use the same conversion service as the quote page
    const rawConverted = await currencyService.convertAmount(amount, fromCurrency, toCurrency);
    
    // FINANCIAL PRECISION: Round after currency conversion to avoid floating point issues
    // This matches the quote page's sophisticated precision handling: Math.round(rawConverted * 100) / 100
    const precisionConverted = Math.round(rawConverted * 100) / 100;
    
    logger.debug('Currency conversion completed', {
      amount,
      fromCurrency,
      toCurrency,
      rawConverted,
      precisionConverted
    });
    
    return precisionConverted;
  } catch (error) {
    logger.error(`Currency conversion failed ${fromCurrency} → ${toCurrency}`, {
      amount,
      fromCurrency,
      toCurrency,
      error
    });
    
    // Throw error to allow components to handle fallback
    throw error;
  }
};

/**
 * Convert and format currency amount
 * 
 * @param amount - Amount to convert and format
 * @param fromCurrency - Source currency code
 * @param toCurrency - Target currency code
 * @returns Promise<string> - Formatted converted amount
 */
export const convertAndFormatCurrency = async (
  amount: number,
  fromCurrency: string,
  toCurrency: string
): Promise<string> => {
  try {
    const convertedAmount = await convertCurrencyWithPrecision(amount, fromCurrency, toCurrency);
    return currencyService.formatAmount(convertedAmount, toCurrency);
  } catch (error) {
    logger.error('Convert and format currency failed', {
      amount,
      fromCurrency,
      toCurrency,
      error
    });
    
    // Fallback: format in original currency
    return currencyService.formatAmount(amount, fromCurrency);
  }
};

/**
 * Convert multiple amounts with the same currency pair
 * Optimized for bulk conversions (e.g., cart items)
 * 
 * @param amounts - Array of amounts to convert
 * @param fromCurrency - Source currency code
 * @param toCurrency - Target currency code
 * @returns Promise<number[]> - Array of converted amounts with financial precision
 */
export const convertMultipleAmounts = async (
  amounts: number[],
  fromCurrency: string,
  toCurrency: string
): Promise<number[]> => {
  if (fromCurrency === toCurrency) {
    return amounts;
  }

  try {
    // Get exchange rate once for efficiency
    const exchangeRate = await currencyService.getExchangeRateByCurrency(fromCurrency, toCurrency);
    
    // Apply rate with financial precision to all amounts
    const convertedAmounts = amounts.map(amount => {
      const rawConverted = amount * exchangeRate;
      return Math.round(rawConverted * 100) / 100;
    });

    logger.debug('Bulk currency conversion completed', {
      count: amounts.length,
      fromCurrency,
      toCurrency,
      exchangeRate
    });

    return convertedAmounts;
  } catch (error) {
    logger.error(`Bulk currency conversion failed ${fromCurrency} → ${toCurrency}`, {
      amounts: amounts.length,
      error
    });
    
    throw error;
  }
};

// =============================================================================
// LEGACY CURRENCY FUNCTIONS (Maintained for Backward Compatibility)
// =============================================================================

/**
 * Calculate the USD equivalent of origin currency cost prices
 * @param items - Array of quote items with costprice_origin in origin currency
 * @param exchangeRate - Exchange rate from origin currency to USD
 * @returns Total value in USD
 */
export function calculateItemsTotalUSD(items: QuoteItem[], exchangeRate: number): number {
  if (!items || items.length === 0) return 0;
  if (!exchangeRate || exchangeRate <= 0) return 0;

  const localTotal = items.reduce(
    (sum, item) => sum + (item.costprice_origin || 0) * (item.quantity || 1),
    0,
  );

  return localTotal / exchangeRate;
}

/**
 * Get exchange rate from quote calculation data
 * @param quote - Quote with calculation data
 * @returns Exchange rate from origin currency to USD
 */
export function getExchangeRateFromQuote(quote: UnifiedQuote): number {
  // Try to get exchange rate from calculation data
  const exchangeRate = quote.calculation_data?.exchange_rate?.rate || 1;

  console.log('🔄 [CURRENCY] Exchange rate extracted:', {
    quoteId: quote.id,
    route: `${quote.origin_country}→${quote.destination_country}`,
    exchangeRate,
    source: quote.calculation_data?.exchange_rate?.source || 'default',
  });

  return exchangeRate;
}

/**
 * Calculate correct costprice_total_quote_origincurrency from items and exchange rate
 * @param quote - Quote with items and exchange rate data
 * @returns Correct cost price total in USD
 */
export function calculateCorrectBaseTotalUSD(quote: UnifiedQuote): number {
  const exchangeRate = getExchangeRateFromQuote(quote);
  const baseTotalUSD = calculateItemsTotalUSD(quote.items, exchangeRate);

  console.log('💰 [CURRENCY] Base total USD calculation:', {
    quoteId: quote.id,
    itemsCount: quote.items?.length || 0,
    localTotal:
      quote.items?.reduce((sum, item) => sum + (item.price_local || 0) * (item.quantity || 1), 0) ||
      0,
    exchangeRate,
    baseTotalUSD,
    currency: quote.currency,
  });

  return Math.round(baseTotalUSD * 100) / 100; // Round to 2 decimal places
}

/**
 * Get currency symbol for display
 * @param countryCode - Country code (IN, NP, US, etc.)
 * @returns Currency symbol
 */
export function getCurrencySymbol(countryCode: string): string {
  const symbols: Record<string, string> = {
    IN: '₹',
    NP: '₨',
    US: '$',
    UK: '£',
    EU: '€',
    CN: '¥',
    JP: '¥',
  };

  return symbols[countryCode] || '¤'; // Generic currency symbol instead of hardcoded $
}

/**
 * Get currency code for country
 * @param countryCode - Country code (IN, NP, US, etc.)
 * @returns Currency code (INR, NPR, USD, etc.)
 */
export function getCurrencyCode(countryCode: string): string {
  const codes: Record<string, string> = {
    IN: 'INR',
    NP: 'NPR',
    US: 'USD',
    UK: 'GBP',
    EU: 'EUR',
    CN: 'CNY',
    JP: 'JPY',
  };

  return codes[countryCode] || 'XXX'; // ISO 4217 unknown currency code instead of hardcoded USD
}

/**
 * Format currency amount with proper symbol and formatting
 * @param amount - Amount to format
 * @param currencyCode - Currency code (USD, INR, NPR, etc.)
 * @returns Formatted currency string
 */
export function formatCurrency(amount: number, currencyCode?: string): string {
  // Don't default to USD - show generic currency if none provided
  const currency = currencyCode || 'XXX';
  const symbolMap: Record<string, string> = {
    USD: '$',
    INR: '₹',
    NPR: '₨',
    EUR: '€',
    GBP: '£',
    CNY: '¥',
    JPY: '¥',
    CAD: 'C$',
    AUD: 'A$',
    SGD: 'S$',
  };

  const symbol = symbolMap[currency] || currency + ' ';

  // Format with proper decimal places
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);

  // Place symbol before amount
  return `${symbol}${formatted}`;
}
