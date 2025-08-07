/**
 * Currency Migration Utilities
 * 
 * Provides utilities for migrating from the old dual-currency system
 * (total_usd, total_customer_currency, customer_currency) to the new
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
  total_usd?: number;
  total_customer_currency?: number;
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
  
  // If we have both total_usd and total_customer_currency, compare ratios
  if (quote.total_usd && quote.total_customer_currency) {
    const breakdown = quote.calculation_data?.breakdown;
    
    if (breakdown) {
      const breakdownTotal = Object.values(breakdown).reduce((sum, val) => 
        typeof val === 'number' ? sum + val : sum, 0
      );
      
      // Check which total the breakdown is closer to
      const usdRatio = Math.abs(breakdownTotal - quote.total_usd) / quote.total_usd;
      const customerRatio = Math.abs(breakdownTotal - quote.total_customer_currency) / quote.total_customer_currency;
      
      if (usdRatio < 0.05) { // Within 5% of USD total
        return {
          currency: 'USD',
          confidence: 'high',
          reasoning: `Breakdown total (${breakdownTotal}) matches USD total (${quote.total_usd}) within 5%`
        };
      }
      
      if (customerRatio < 0.05) { // Within 5% of customer total
        return {
          currency: quote.customer_currency || destinationCurrency,
          confidence: 'high',
          reasoning: `Breakdown total (${breakdownTotal}) matches customer currency total (${quote.total_customer_currency}) within 5%`
        };
      }
    }
  }
  
  // Fallback: assume USD for legacy data (medium confidence)
  if (quote.total_usd) {
    return {
      currency: 'USD',
      confidence: 'medium',
      reasoning: 'Legacy quote with total_usd present, assuming USD breakdown'
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
    if (originCurrency === 'USD' && legacyQuote.total_usd) {
      totalOriginCurrency = legacyQuote.total_usd;
    } else if (legacyQuote.total_customer_currency && legacyQuote.customer_currency === originCurrency) {
      totalOriginCurrency = legacyQuote.total_customer_currency;
    } else {
      // Calculate from breakdown if available
      const breakdown = legacyQuote.calculation_data?.breakdown;
      if (breakdown) {
        totalOriginCurrency = Object.values(breakdown).reduce((sum, val) => 
          typeof val === 'number' ? sum + val : sum, 0
        );
        conversionNotes.push('Used breakdown sum as total_origin_currency');
      } else {
        totalOriginCurrency = legacyQuote.total_usd || legacyQuote.total_customer_currency || 0;
        conversionNotes.push('Used fallback total for total_origin_currency');
      }
    }
  } else {
    // Will need conversion - use detected currency amount as-is for now
    if (detectedCurrency.currency === 'USD' && legacyQuote.total_usd) {
      totalOriginCurrency = legacyQuote.total_usd;
      conversionNotes.push('Using USD total as basis for conversion');
    } else {
      totalOriginCurrency = legacyQuote.total_customer_currency || legacyQuote.total_usd || 0;
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
  const hasLegacyFields = quote.total_customer_currency !== undefined || 
                         quote.customer_currency !== undefined ||
                         quote.total_usd !== undefined;
  
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
  
  // Log the detection for debugging
  logger.info(`[CurrencyMigration] Breakdown currency detection for quote ${quote.id}:`, {
    detected: detection.currency,
    confidence: detection.confidence,
    reasoning: detection.reasoning
  });
  
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
  const hasLegacyFields = !!(quote.total_customer_currency || quote.customer_currency || quote.total_usd);
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