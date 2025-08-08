/**
 * Currency Migration Utilities
 * 
 * Provides utilities for migrating from the old dual-currency system
 * (total_quote_origincurrency, total_customer_display_currency, customer_currency) to the new
 * simplified origin-currency system.
 * 
 * Handles backward compatibility and data conversion logic.
 */

import { getOriginCurrency, getDestinationCurrency } from './originCurrency';
import { logger } from '@/utils/logger';

/**
 * Quote data structure (for migration purposes)
 */
export interface LegacyQuoteData {
  id: string;
  origin_country: string;
  destination_country: string;
  total_quote_origincurrency?: number;
  total_customer_display_currency?: number;
  customer_currency?: string;
  calculation_data?: any;
}

/**
 * New quote structure after migration
 */
export interface ModernQuoteData {
  id: string;
  origin_country: string;
  destination_country: string;
  total_origin_currency: number;
  calculation_data: {
    origin_currency: string;
    breakdown: Record<string, number>;
    [key: string]: any;
  };
}

/**
 * Detect the source currency of breakdown amounts in legacy data
 * 
 * Legacy breakdown amounts could be in:
 * 1. USD (most likely for older quotes)
 * 2. Customer currency (destination currency)  
 * 3. Origin currency (newer quotes)
 * 
 * This function tries to intelligently detect which currency is being used.
 */
export function detectBreakdownCurrency(quote: LegacyQuoteData): {
  currency: string;
  confidence: 'high' | 'medium' | 'low';
  reasoning: string;
} {
  const originCurrency = getOriginCurrency(quote.origin_country);
  const destinationCurrency = getDestinationCurrency(quote.destination_country);
  
  // If calculation_data has explicit origin_currency, use that (high confidence)
  if (quote.calculation_data?.origin_currency) {
    return {
      currency: quote.calculation_data.origin_currency,
      confidence: 'high',
      reasoning: 'Explicit origin_currency found in calculation_data'
    };
  }
  
  // If we have both total_quote_origincurrency and total_customer_display_currency, compare ratios
  if (quote.total_quote_origincurrency && quote.total_customer_display_currency) {
    const breakdown = quote.calculation_data?.breakdown;
    
    if (breakdown) {
      const breakdownTotal = Object.values(breakdown).reduce((sum, val) => 
        typeof val === 'number' ? sum + val : sum, 0
      );
      
      // Check which total the breakdown is closer to
      const usdRatio = Math.abs(breakdownTotal - quote.total_quote_origincurrency) / quote.total_quote_origincurrency;
      const customerRatio = Math.abs(breakdownTotal - quote.total_customer_display_currency) / quote.total_customer_display_currency;
      
      if (usdRatio < 0.05) { // Within 5% of USD total
        return {
          currency: 'USD',
          confidence: 'high',
          reasoning: `Breakdown total (${breakdownTotal}) matches USD total (${quote.total_quote_origincurrency}) within 5%`
        };
      }
      
      if (customerRatio < 0.05) { // Within 5% of customer total
        return {
          currency: quote.customer_currency || destinationCurrency,
          confidence: 'high',
          reasoning: `Breakdown total (${breakdownTotal}) matches customer currency total (${quote.total_customer_display_currency}) within 5%`
        };
      }
    }
  }
  
  // Check if we have origin currency calculation indicators
  const hasOriginCurrencyCalculation = quote.calculation_data?.inputs?.origin_currency === originCurrency ||
                                       quote.calculation_data?.applied_rates?.origin_currency === originCurrency;
  
  if (hasOriginCurrencyCalculation) {
    return {
      currency: originCurrency,
      confidence: 'high',
      reasoning: 'Origin currency found in calculation inputs/rates'
    };
  }
  
  // For non-USD origin countries, prefer origin currency over USD (medium confidence)
  if (originCurrency !== 'USD') {
    return {
      currency: originCurrency,
      confidence: 'medium',
      reasoning: `Non-USD origin country (${quote.origin_country}), using origin currency ${originCurrency}`
    };
  }
  
  // Fallback: assume USD for USD origin countries (medium confidence)
  if (quote.total_quote_origincurrency) {
    return {
      currency: 'USD',
      confidence: 'medium',
      reasoning: 'USD origin country with total_quote_origincurrency present, assuming USD breakdown'
    };
  }
  
  // Last resort: use origin currency (low confidence)
  return {
    currency: originCurrency,
    confidence: 'low',
    reasoning: 'No clear indicators, defaulting to origin currency'
  };
}

/**
 * Convert legacy quote data to modern structure
 */
export function migrateLegacyQuoteData(legacyQuote: LegacyQuoteData): {
  modernQuote: Partial<ModernQuoteData>;
  conversionNotes: string[];
  requiresCurrencyConversion: boolean;
} {
  const originCurrency = getOriginCurrency(legacyQuote.origin_country);
  const conversionNotes: string[] = [];
  
  // Detect what currency the breakdown is currently in
  const detectedCurrency = detectBreakdownCurrency(legacyQuote);
  conversionNotes.push(`Detected breakdown currency: ${detectedCurrency.currency} (${detectedCurrency.confidence} confidence - ${detectedCurrency.reasoning})`);
  
  // Determine if we need currency conversion
  const requiresCurrencyConversion = detectedCurrency.currency !== originCurrency;
  
  if (requiresCurrencyConversion) {
    conversionNotes.push(`Conversion needed: ${detectedCurrency.currency} → ${originCurrency}`);
  }
  
  // Determine the origin total
  let totalOriginCurrency: number;
  
  if (detectedCurrency.currency === originCurrency) {
    // Breakdown is already in origin currency
    if (originCurrency === 'USD' && legacyQuote.total_quote_origincurrency) {
      totalOriginCurrency = legacyQuote.total_quote_origincurrency;
    } else if (legacyQuote.total_customer_display_currency && legacyQuote.customer_currency === originCurrency) {
      totalOriginCurrency = legacyQuote.total_customer_display_currency;
    } else {
      // Calculate from breakdown if available
      const breakdown = legacyQuote.calculation_data?.breakdown;
      if (breakdown) {
        totalOriginCurrency = Object.values(breakdown).reduce((sum, val) => 
          typeof val === 'number' ? sum + val : sum, 0
        );
        conversionNotes.push('Used breakdown sum as total_origin_currency');
      } else {
        totalOriginCurrency = legacyQuote.total_quote_origincurrency || legacyQuote.total_customer_display_currency || 0;
        conversionNotes.push('Used fallback total for total_origin_currency');
      }
    }
  } else {
    // Will need conversion - use detected currency amount as-is for now
    if (detectedCurrency.currency === 'USD' && legacyQuote.total_quote_origincurrency) {
      totalOriginCurrency = legacyQuote.total_quote_origincurrency;
      conversionNotes.push('Using USD total as basis for conversion');
    } else {
      totalOriginCurrency = legacyQuote.total_customer_display_currency || legacyQuote.total_quote_origincurrency || 0;
      conversionNotes.push('Using customer currency total as basis for conversion');
    }
  }
  
  // Build modern quote structure
  const modernQuote: Partial<ModernQuoteData> = {
    id: legacyQuote.id,
    origin_country: legacyQuote.origin_country,
    destination_country: legacyQuote.destination_country,
    total_origin_currency: totalOriginCurrency,
    calculation_data: {
      ...legacyQuote.calculation_data,
      origin_currency: originCurrency,
      // Breakdown will need conversion if currencies don't match
      breakdown: legacyQuote.calculation_data?.breakdown || {}
    }
  };
  
  logger.info(`[CurrencyMigration] Migrated quote ${legacyQuote.id}:`, {
    from: detectedCurrency.currency,
    to: originCurrency,
    requiresConversion: requiresCurrencyConversion,
    total: totalOriginCurrency
  });
  
  return {
    modernQuote,
    conversionNotes,
    requiresCurrencyConversion
  };
}

/**
 * Helper to check if a quote needs migration
 */
export function needsMigration(quote: any): boolean {
  // If it already has origin_currency in calculation_data and no legacy fields, it's modern
  const hasOriginCurrency = quote.calculation_data?.origin_currency;
  const hasLegacyFields = quote.total_customer_display_currency !== undefined || 
                         quote.customer_currency !== undefined ||
                         quote.total_quote_origincurrency !== undefined;
  
  return !hasOriginCurrency || hasLegacyFields;
}

/**
 * Get the correct breakdown currency for display conversion
 * This is the key function that fixes the CustomerBreakdown bug
 */
export function getBreakdownSourceCurrency(quote: any): string {
  // New quotes: use explicit origin currency
  if (quote.calculation_data?.origin_currency) {
    return quote.calculation_data.origin_currency;
  }
  
  // Legacy quotes: detect currency
  const detection = detectBreakdownCurrency(quote);
  
  // Log the detection for debugging (reduced frequency to prevent spam)
  if (Math.random() < 0.1) { // Only log 10% of calls to reduce spam
    logger.info(`[CurrencyMigration] Breakdown currency detection for quote ${quote.id}:`, {
      detected: detection.currency,
      confidence: detection.confidence,
      reasoning: detection.reasoning
    });
  }
  
  return detection.currency;
}

/**
 * Migration status check for debugging
 */
export function getMigrationStatus(quote: any): {
  isMigrated: boolean;
  hasLegacyData: boolean;
  breakdownCurrency: string;
  needsAttention: boolean;
  issues: string[];
} {
  const hasOriginCurrency = !!quote.calculation_data?.origin_currency;
  const hasLegacyFields = !!(quote.total_customer_display_currency || quote.customer_currency || quote.total_quote_origincurrency);
  const breakdownCurrency = getBreakdownSourceCurrency(quote);
  const expectedOriginCurrency = getOriginCurrency(quote.origin_country);
  
  const issues: string[] = [];
  
  if (!hasOriginCurrency) {
    issues.push('Missing origin_currency in calculation_data');
  }
  
  if (hasLegacyFields) {
    issues.push('Legacy currency fields still present');
  }
  
  if (breakdownCurrency !== expectedOriginCurrency) {
    issues.push(`Breakdown currency (${breakdownCurrency}) doesn't match expected origin currency (${expectedOriginCurrency})`);
  }
  
  return {
    isMigrated: hasOriginCurrency && !hasLegacyFields,
    hasLegacyData: hasLegacyFields,
    breakdownCurrency,
    needsAttention: issues.length > 0,
    issues
  };
}