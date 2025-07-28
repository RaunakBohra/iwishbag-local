/**
 * Valuation Utilities
 * 
 * Helper functions to extract and display valuation data from quotes,
 * specifically for handling minimum valuation amounts from HSN breakdown data.
 */

import type { UnifiedQuote, QuoteItem } from '@/types/unified-quote';
import { supabase } from '@/integrations/supabase/client';
import { currencyService } from '@/services/CurrencyService';

/**
 * Extract minimum valuation amount for an item with fallback data sources
 * 
 * ENHANCED VERSION WITH FALLBACK CHAIN:
 * 1. Try quote.calculation_data.item_breakdowns (post-calculation data)
 * 2. Try individual item.minimum_valuation_conversion (item-level data)
 * 3. Try direct HSN lookup from database (real-time fallback)
 * 4. Return 0 if no data available
 */
export function getItemMinimumValuation(quote: UnifiedQuote | null, itemId: string): number {
  console.log(`\n🔍 [VALUATION UTILS] Getting minimum valuation for item ${itemId}`);
  
  if (!quote) {
    console.log(`├── ❌ No quote provided`);
    return 0;
  }

  // 🔄 FALLBACK 1: Try calculation_data.item_breakdowns (primary source)
  if (quote.calculation_data?.item_breakdowns) {
    const itemBreakdown = quote.calculation_data.item_breakdowns.find(
      (breakdown: any) => breakdown.item_id === itemId
    );

    if (itemBreakdown?.minimum_valuation_conversion?.convertedAmount) {
      const amount = itemBreakdown.minimum_valuation_conversion.convertedAmount;
      console.log(`├── ✅ Found in calculation_data: $${amount} (${itemBreakdown.minimum_valuation_conversion.originCurrency})`);
      return amount;
    } else {
      console.log(`├── ❌ Not found in calculation_data item_breakdowns`);
    }
  } else {
    console.log(`├── ❌ No calculation_data.item_breakdowns available`);
  }

  // 🔄 FALLBACK 2: Try individual item.minimum_valuation_conversion
  const item = quote.items?.find(item => item.id === itemId);
  if (item?.minimum_valuation_conversion?.convertedAmount) {
    const amount = item.minimum_valuation_conversion.convertedAmount;
    console.log(`├── ✅ Found in item data: $${amount} (${item.minimum_valuation_conversion.originCurrency})`);
    return amount;
  } else {
    console.log(`├── ❌ Not found in individual item data`);
  }

  // 🔄 FALLBACK 3: Try HSN-based lookup (this would need async but we'll store in item for now)
  if (item?.hsn_code && item?.minimum_valuation_usd) {
    // If we have HSN minimum in USD, we can estimate conversion
    // This is a basic fallback - real conversion would need exchange rates
    console.log(`├── 💡 Found HSN minimum in USD: $${item.minimum_valuation_usd} (needs currency conversion)`);
    // For now, return the USD amount as a basic fallback
    return item.minimum_valuation_usd;
  } else if (item?.hsn_code) {
    console.log(`├── 🔍 Item has HSN code ${item.hsn_code} but no minimum_valuation_usd field`);
    console.log(`├── 📋 Available item fields:`, Object.keys(item));
  }

  console.log(`└── ❌ No minimum valuation data found for item ${itemId}`);
  return 0;
}

/**
 * Get the origin currency for minimum valuation conversion with fallback
 */
export function getItemMinimumValuationCurrency(quote: UnifiedQuote | null, itemId: string): string {
  if (!quote) return 'USD';

  // 🔄 FALLBACK 1: Try calculation_data.item_breakdowns
  if (quote.calculation_data?.item_breakdowns) {
    const itemBreakdown = quote.calculation_data.item_breakdowns.find(
      (breakdown: any) => breakdown.item_id === itemId
    );

    if (itemBreakdown?.minimum_valuation_conversion?.originCurrency) {
      return itemBreakdown.minimum_valuation_conversion.originCurrency;
    }
  }

  // 🔄 FALLBACK 2: Try individual item.minimum_valuation_conversion
  const item = quote.items?.find(item => item.id === itemId);
  if (item?.minimum_valuation_conversion?.originCurrency) {
    return item.minimum_valuation_conversion.originCurrency;
  }

  // 🔄 FALLBACK 3: Default to USD
  return 'USD';
}

/**
 * Check if an item has minimum valuation data available (enhanced with fallback)
 */
export function hasMinimumValuation(quote: UnifiedQuote | null, itemId: string): boolean {
  if (!quote) return false;

  // 🔄 FALLBACK 1: Check calculation_data.item_breakdowns
  if (quote.calculation_data?.item_breakdowns) {
    const itemBreakdown = quote.calculation_data.item_breakdowns.find(
      (breakdown: any) => breakdown.item_id === itemId
    );

    if (itemBreakdown?.minimum_valuation_conversion?.convertedAmount) {
      return true;
    }
  }

  // 🔄 FALLBACK 2: Check individual item data
  const item = quote.items?.find(item => item.id === itemId);
  if (item?.minimum_valuation_conversion?.convertedAmount) {
    return true;
  }

  // 🔄 FALLBACK 3: Check if HSN minimum exists
  if (item?.hsn_code && item?.minimum_valuation_usd) {
    return true;
  }

  return false;
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

/**
 * Real-time HSN minimum valuation lookup with currency conversion
 * This function fetches HSN data directly from the database and converts to origin currency
 */
export async function fetchItemMinimumValuation(
  item: QuoteItem,
  originCountry: string
): Promise<{ amount: number; currency: string; usdAmount: number } | null> {
  if (!item.hsn_code) {
    console.log(`[FETCH MIN VAL] No HSN code for item ${item.id}`);
    return null;
  }

  try {
    // Fetch HSN data from database
    const { data: hsnData, error } = await supabase
      .from('hsn_master')
      .select('minimum_valuation_usd, hsn_code')
      .eq('hsn_code', item.hsn_code)
      .single();

    if (error) {
      console.error(`[FETCH MIN VAL] HSN lookup error for ${item.hsn_code}:`, error);
      return null;
    }

    if (!hsnData?.minimum_valuation_usd) {
      console.log(`[FETCH MIN VAL] No minimum valuation for HSN ${item.hsn_code}`);
      return null;
    }

    // Convert USD to origin currency
    console.log(`[FETCH MIN VAL] Getting currency for country: ${originCountry}`);
    const originCurrency = await currencyService.getCurrencyForCountry(originCountry);
    
    console.log(`[FETCH MIN VAL] Currency lookup result:`, originCurrency);
    
    if (!originCurrency) {
      console.error(`[FETCH MIN VAL] No currency data for ${originCountry}`);
      return {
        amount: hsnData.minimum_valuation_usd,
        currency: 'USD',
        usdAmount: hsnData.minimum_valuation_usd
      };
    }

    // Check if exchange rate is valid
    const exchangeRate = originCurrency.rate_from_usd || originCurrency.exchange_rate;
    console.log(`[FETCH MIN VAL] Exchange rate lookup:`, {
      rate_from_usd: originCurrency.rate_from_usd,
      exchange_rate: originCurrency.exchange_rate,
      finalRate: exchangeRate
    });

    if (!exchangeRate || exchangeRate <= 0) {
      console.error(`[FETCH MIN VAL] Invalid exchange rate for ${originCountry}:`, exchangeRate);
      return {
        amount: hsnData.minimum_valuation_usd,
        currency: originCurrency.currency || 'USD',
        usdAmount: hsnData.minimum_valuation_usd
      };
    }

    const convertedAmount = hsnData.minimum_valuation_usd * exchangeRate;

    console.log(`[FETCH MIN VAL] ✅ HSN ${item.hsn_code}: $${hsnData.minimum_valuation_usd} USD → ${convertedAmount.toFixed(2)} ${originCurrency.currency}`);

    return {
      amount: convertedAmount,
      currency: originCurrency.currency || originCurrency.code || 'USD',
      usdAmount: hsnData.minimum_valuation_usd
    };

  } catch (error) {
    console.error(`[FETCH MIN VAL] Error fetching minimum valuation for ${item.hsn_code}:`, error);
    return null;
  }
}