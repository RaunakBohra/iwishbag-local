/**
 * Currency conversion utilities for proper USD calculations
 */

import type { QuoteItem, UnifiedQuote } from '../types/unified-quote';

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
    0
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
    source: quote.calculation_data?.exchange_rate?.source || 'default'
  });

  return exchangeRate;
}

/**
 * Calculate correct costprice_total_usd from items and exchange rate
 * @param quote - Quote with items and exchange rate data
 * @returns Correct cost price total in USD
 */
export function calculateCorrectBaseTotalUSD(quote: UnifiedQuote): number {
  const exchangeRate = getExchangeRateFromQuote(quote);
  const baseTotalUSD = calculateItemsTotalUSD(quote.items, exchangeRate);
  
  console.log('💰 [CURRENCY] Base total USD calculation:', {
    quoteId: quote.id,
    itemsCount: quote.items?.length || 0,
    localTotal: quote.items?.reduce((sum, item) => sum + (item.price_local || 0) * (item.quantity || 1), 0) || 0,
    exchangeRate,
    baseTotalUSD,
    currency: quote.currency
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
    'IN': '₹',
    'NP': '₨',
    'US': '$',
    'UK': '£',
    'EU': '€',
    'CN': '¥',
    'JP': '¥'
  };
  
  return symbols[countryCode] || '$';
}

/**
 * Get currency code for country
 * @param countryCode - Country code (IN, NP, US, etc.)
 * @returns Currency code (INR, NPR, USD, etc.)
 */
export function getCurrencyCode(countryCode: string): string {
  const codes: Record<string, string> = {
    'IN': 'INR',
    'NP': 'NPR', 
    'US': 'USD',
    'UK': 'GBP',
    'EU': 'EUR',
    'CN': 'CNY',
    'JP': 'JPY'
  };
  
  return codes[countryCode] || 'USD';
}