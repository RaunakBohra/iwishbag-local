/**
 * Quote Currency Detection Utilities
 * 
 * Smart currency detection for quotes to handle database inconsistencies
 * and ensure accurate currency handling throughout the application
 */

import { getOriginCurrency, getDestinationCurrency } from './originCurrency';
import { logger } from './logger';

export interface CurrencyValidationResult {
  isValid: boolean;
  detectedCurrency: string;
  issues: string[];
  confidence: 'high' | 'medium' | 'low';
}

/**
 * Detect the correct currency for a quote using multiple data sources
 * This is more reliable than using quote.customer_currency alone
 */
export function detectQuoteCurrency(quote: any): CurrencyValidationResult {
  const issues: string[] = [];
  let detectedCurrency = 'USD'; // Default fallback
  let confidence: 'high' | 'medium' | 'low' = 'low';

  console.log(`[QUOTE CURRENCY] Detecting currency for quote ${quote.display_id || quote.id}:`, {
    customer_currency: quote.customer_currency,
    origin_country: quote.origin_country,
    destination_country: quote.destination_country
  });

  // Method 1: Use origin country (most reliable)
  if (quote.origin_country) {
    const expectedOriginCurrency = getOriginCurrency(quote.origin_country);
    if (expectedOriginCurrency) {
      detectedCurrency = expectedOriginCurrency;
      confidence = 'high';
      
      console.log(`[QUOTE CURRENCY] Origin country ${quote.origin_country} → ${expectedOriginCurrency}`);

      // Validate against customer_currency if present
      if (quote.customer_currency) {
        if (quote.customer_currency === expectedOriginCurrency) {
          console.log(`[QUOTE CURRENCY] ✅ customer_currency matches origin currency`);
        } else {
          issues.push(`customer_currency (${quote.customer_currency}) doesn't match origin country ${quote.origin_country} (expected: ${expectedOriginCurrency})`);
          console.log(`[QUOTE CURRENCY] ⚠️ Currency mismatch detected`);
          
          // Critical issue: USD with non-US origin
          if (quote.customer_currency === 'USD' && quote.origin_country !== 'US') {
            issues.push('Critical: USD currency with non-US origin country - likely data corruption');
            console.log(`[QUOTE CURRENCY] 🚨 Critical currency corruption detected`);
          }
        }
      }
    }
  }

  // Method 2: Fallback to customer_currency if origin country method fails
  if (confidence === 'low' && quote.customer_currency) {
    detectedCurrency = quote.customer_currency;
    confidence = 'medium';
    issues.push('Using customer_currency as fallback (origin country not available)');
    
    console.log(`[QUOTE CURRENCY] Fallback to customer_currency: ${detectedCurrency}`);
  }

  // Method 3: Last resort - try to infer from destination country
  if (confidence === 'low' && quote.destination_country) {
    const destinationCurrency = getDestinationCurrency(quote.destination_country);
    if (destinationCurrency) {
      detectedCurrency = destinationCurrency;
      confidence = 'low';
      issues.push('Using destination country currency as last resort');
      
      console.log(`[QUOTE CURRENCY] Last resort - destination country: ${destinationCurrency}`);
    }
  }

  const result: CurrencyValidationResult = {
    isValid: issues.length === 0,
    detectedCurrency,
    issues,
    confidence
  };

  console.log(`[QUOTE CURRENCY] Detection result:`, result);
  return result;
}

/**
 * Validate if a quote has consistent currency data
 */
export function validateQuoteCurrency(quote: any): CurrencyValidationResult {
  return detectQuoteCurrency(quote);
}

/**
 * Get the safest currency to use for a quote (prioritizes accuracy over database values)
 */
export function getSafeQuoteCurrency(quote: any): string {
  const validation = detectQuoteCurrency(quote);
  
  if (!validation.isValid) {
    logger.warn('Quote has currency validation issues', {
      quoteId: quote.id,
      issues: validation.issues,
      detectedCurrency: validation.detectedCurrency
    });
  }

  return validation.detectedCurrency;
}

/**
 * Check if a quote should be blocked from cart operations due to currency issues
 */
export function shouldBlockQuoteFromCart(quote: any): { blocked: boolean; reason?: string } {
  const validation = detectQuoteCurrency(quote);
  
  // Block quotes with critical currency issues
  const hasCriticalIssue = validation.issues.some(issue => 
    issue.includes('Critical:') || 
    issue.includes('data corruption')
  );

  if (hasCriticalIssue) {
    return {
      blocked: true,
      reason: 'Quote has critical currency data corruption and needs to be repaired before adding to cart'
    };
  }

  // Block if confidence is too low and there are multiple issues
  if (validation.confidence === 'low' && validation.issues.length > 2) {
    return {
      blocked: true,
      reason: 'Quote has too many currency validation issues'
    };
  }

  return { blocked: false };
}

/**
 * Log currency detection results for debugging
 */
export function logCurrencyDetection(quote: any, operation: string): void {
  const validation = detectQuoteCurrency(quote);
  
  console.group(`[QUOTE CURRENCY] ${operation} - Quote ${quote.display_id || quote.id}`);
  console.log('Currency Detection Result:', validation);
  console.log('Quote Data:', {
    customer_currency: quote.customer_currency,
    origin_country: quote.origin_country,
    destination_country: quote.destination_country,
    total_quote_origincurrency: quote.total_quote_origincurrency,
    final_total_origin: quote.final_total_origin
  });
  
  if (!validation.isValid) {
    console.warn('⚠️ Currency Issues Found:', validation.issues);
  }
  
  console.groupEnd();
}