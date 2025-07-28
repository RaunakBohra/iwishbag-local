/**
 * Valuation Utilities
 * 
 * Helper functions to extract and display valuation data from quotes,
 * specifically for handling minimum valuation amounts from HSN breakdown data.
 */

import type { UnifiedQuote, QuoteItem } from '@/types/unified-quote';

/**
 * Extract minimum valuation amount for an item from quote calculation data
 * 
 * The minimum valuation is stored in the quote's calculation_data.item_breakdowns
 * under minimum_valuation_conversion.convertedAmount, not in the item's fields.
 */
export function getItemMinimumValuation(quote: UnifiedQuote | null, itemId: string): number {
  if (!quote?.calculation_data?.item_breakdowns) {
    return 0;
  }

  const itemBreakdown = quote.calculation_data.item_breakdowns.find(
    (breakdown: any) => breakdown.item_id === itemId
  );

  if (!itemBreakdown?.minimum_valuation_conversion) {
    return 0;
  }

  return itemBreakdown.minimum_valuation_conversion.convertedAmount || 0;
}

/**
 * Get the origin currency for minimum valuation conversion
 */
export function getItemMinimumValuationCurrency(quote: UnifiedQuote | null, itemId: string): string {
  if (!quote?.calculation_data?.item_breakdowns) {
    return 'USD';
  }

  const itemBreakdown = quote.calculation_data.item_breakdowns.find(
    (breakdown: any) => breakdown.item_id === itemId
  );

  if (!itemBreakdown?.minimum_valuation_conversion) {
    return 'USD';
  }

  return itemBreakdown.minimum_valuation_conversion.originCurrency || 'USD';
}

/**
 * Check if an item has minimum valuation data available
 */
export function hasMinimumValuation(quote: UnifiedQuote | null, itemId: string): boolean {
  if (!quote?.calculation_data?.item_breakdowns) {
    return false;
  }

  const itemBreakdown = quote.calculation_data.item_breakdowns.find(
    (breakdown: any) => breakdown.item_id === itemId
  );

  return !!(itemBreakdown?.minimum_valuation_conversion?.convertedAmount);
}

/**
 * Get valuation comparison data for display
 */
export function getValuationComparison(quote: UnifiedQuote | null, item: QuoteItem) {
  const minimumValuation = getItemMinimumValuation(quote, item.id);
  const actualPrice = item.price || item.price_origin_currency || 0;
  
  return {
    actualPrice,
    minimumValuation,
    higherAmount: Math.max(actualPrice, minimumValuation),
    isActualHigher: actualPrice >= minimumValuation,
    hasMinimumData: hasMinimumValuation(quote, item.id),
    currency: getItemMinimumValuationCurrency(quote, item.id)
  };
}

/**
 * Format currency amount for display
 */
export function formatValuationAmount(amount: number, currency: string = 'USD'): string {
  if (amount === 0) return '$0';
  
  // For now, always show as $ since we're displaying converted amounts
  return `$${amount.toFixed(0)}`;
}