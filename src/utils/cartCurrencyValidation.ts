/**
 * Cart Currency Validation Utilities
 * 
 * Enhanced validation specifically for cart operations
 * to ensure currency consistency and prevent data corruption issues
 */

import { detectQuoteCurrency, shouldBlockQuoteFromCart, logCurrencyDetection } from './quoteCurrency';
import { logger } from './logger';
import type { CartItem, Quote } from '@/types/cart';

export interface CartCurrencyValidation {
  isValid: boolean;
  issues: string[];
  recommendations: string[];
  criticalIssues: string[];
  canProceed: boolean;
}

export interface CartIntegrityCheck {
  hasInconsistencies: boolean;
  currencySummary: Record<string, number>;
  problematicItems: {
    itemId: string;
    quoteId: string;
    issues: string[];
  }[];
  recommendedActions: string[];
}

/**
 * Validate a quote before adding to cart
 */
export async function validateQuoteForCart(quote: Quote): Promise<CartCurrencyValidation> {
  console.log(`[CART VALIDATION] Validating quote ${quote.display_id || quote.id} for cart operations...`);

  const issues: string[] = [];
  const recommendations: string[] = [];
  const criticalIssues: string[] = [];

  try {
    // Log currency detection for debugging
    logCurrencyDetection(quote, 'PRE_CART_VALIDATION');

    // 1. Basic currency validation
    const currencyValidation = detectQuoteCurrency(quote);
    
    if (!currencyValidation.isValid) {
      issues.push(...currencyValidation.issues);
      
      // Categorize critical vs non-critical issues
      currencyValidation.issues.forEach(issue => {
        if (issue.includes('Critical:') || issue.includes('data corruption')) {
          criticalIssues.push(issue);
        }
      });
    }

    // 2. Check for blocking conditions
    const blockCheck = shouldBlockQuoteFromCart(quote);
    if (blockCheck.blocked) {
      criticalIssues.push(`Quote blocked from cart: ${blockCheck.reason}`);
    }

    // 3. Price validation - check multiple sources for pricing data
    const priceFromQuote = quote.total_quote_origincurrency || quote.final_total_origin || quote.total_origin_currency;
    const priceFromCalculation = quote.calculation_data?.calculation_steps?.total_origin_currency || 
                                quote.calculation_data?.calculation_steps?.total_quote_origincurrency;
    const totalPrice = priceFromQuote || priceFromCalculation;

    if (!totalPrice) {
      criticalIssues.push('Quote has no price information');
    } else if (totalPrice <= 0) {
      criticalIssues.push('Quote has invalid price (zero or negative)');
    }

    // 4. Status validation
    if (quote.status !== 'approved') {
      criticalIssues.push(`Quote status is '${quote.status}', only approved quotes can be added to cart`);
    }

    // 5. Country validation
    if (!quote.origin_country) {
      issues.push('Quote missing origin country - currency detection may be unreliable');
      recommendations.push('Verify quote origin country before proceeding');
    }

    if (!quote.destination_country) {
      issues.push('Quote missing destination country - shipping calculations may be affected');
      recommendations.push('Ensure destination country is set for accurate shipping quotes');
    }

    // 6. Currency confidence check
    if (currencyValidation.confidence === 'low') {
      issues.push('Low confidence in currency detection - may cause calculation errors');
      recommendations.push('Review quote currency information before adding to cart');
    }

    const canProceed = criticalIssues.length === 0;
    const isValid = issues.length === 0 && criticalIssues.length === 0;

    const result: CartCurrencyValidation = {
      isValid,
      issues,
      recommendations,
      criticalIssues,
      canProceed
    };

    console.log(`[CART VALIDATION] Validation complete:`, {
      isValid,
      canProceed,
      issueCount: issues.length,
      criticalCount: criticalIssues.length,
      recommendationCount: recommendations.length
    });

    if (!canProceed) {
      logger.warn('Quote failed cart validation', {
        quoteId: quote.id,
        criticalIssues,
        issues
      });
    }

    return result;

  } catch (error) {
    console.error(`[CART VALIDATION] Validation failed for quote ${quote.id}:`, error);
    
    return {
      isValid: false,
      issues: ['Validation process failed'],
      recommendations: ['Contact support if this error persists'],
      criticalIssues: [`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`],
      canProceed: false
    };
  }
}

/**
 * Validate the entire cart's currency integrity
 */
export function validateCartIntegrity(cartItems: CartItem[]): CartIntegrityCheck {
  console.log(`[CART INTEGRITY] Checking integrity of ${cartItems.length} cart items...`);

  const currencySummary: Record<string, number> = {};
  const problematicItems: CartIntegrityCheck['problematicItems'] = [];
  const recommendedActions: string[] = [];

  cartItems.forEach((item, index) => {
    const quote = item.quote;
    const itemIssues: string[] = [];

    // Check currency consistency
    const currencyValidation = detectQuoteCurrency(quote);
    const currency = currencyValidation.detectedCurrency;

    // Track currency distribution
    if (!currencySummary[currency]) {
      currencySummary[currency] = 0;
    }
    currencySummary[currency] += 1;

    // Check for currency issues
    if (!currencyValidation.isValid) {
      itemIssues.push(...currencyValidation.issues);
    }

    // Check metadata consistency (if available)
    if (item.metadata?.currencyValidation && !item.metadata.currencyValidation.isValid) {
      itemIssues.push('Item has recorded currency validation issues');
    }

    // Check for currency mismatch with stored metadata
    if (item.metadata?.currencyAtAdd && item.metadata.currencyAtAdd !== currency) {
      itemIssues.push(`Currency changed since adding to cart: ${item.metadata.currencyAtAdd} → ${currency}`);
    }

    // Check price consistency
    const priceOrigin = quote.total_quote_origincurrency;
    const priceFinal = quote.final_total_origin;
    const metadataPrice = item.metadata?.priceAtAdd;

    if (metadataPrice && priceOrigin && Math.abs(priceOrigin - metadataPrice) > 0.01) {
      itemIssues.push(`Price may have changed since adding to cart: ${metadataPrice} → ${priceOrigin}`);
    }

    if (itemIssues.length > 0) {
      problematicItems.push({
        itemId: item.id,
        quoteId: quote.id,
        issues: itemIssues
      });
    }
  });

  // Analyze currency distribution
  const currencyCount = Object.keys(currencySummary).length;
  const hasInconsistencies = problematicItems.length > 0;

  // Generate recommendations
  if (currencyCount > 1) {
    recommendedActions.push(`Cart has items in ${currencyCount} different currencies - currency conversion will be applied`);
  }

  if (hasInconsistencies) {
    recommendedActions.push('Some items have currency validation issues - consider refreshing cart');
  }

  if (problematicItems.length > 0) {
    recommendedActions.push('Remove and re-add problematic items to resolve currency issues');
  }

  const result: CartIntegrityCheck = {
    hasInconsistencies,
    currencySummary,
    problematicItems,
    recommendedActions
  };

  console.log(`[CART INTEGRITY] Integrity check complete:`, {
    hasInconsistencies,
    currencyCount,
    problematicItemCount: problematicItems.length,
    currencySummary
  });

  if (hasInconsistencies) {
    logger.warn('Cart integrity issues detected', {
      problematicItems: problematicItems.map(item => ({
        itemId: item.itemId,
        issueCount: item.issues.length
      })),
      currencySummary
    });
  }

  return result;
}

/**
 * Pre-operation validation hook
 */
export async function validateBeforeCartOperation(
  operation: 'add' | 'remove' | 'clear' | 'sync',
  currentItems: CartItem[],
  targetQuote?: Quote
): Promise<{ canProceed: boolean; issues: string[]; recommendations: string[] }> {
  
  console.log(`[CART PRE-VALIDATION] Validating before ${operation} operation...`);

  const allIssues: string[] = [];
  const allRecommendations: string[] = [];

  try {
    // 1. Validate current cart integrity
    const cartIntegrity = validateCartIntegrity(currentItems);
    
    if (cartIntegrity.hasInconsistencies) {
      allIssues.push('Current cart has currency inconsistencies');
      allRecommendations.push(...cartIntegrity.recommendedActions);
    }

    // 2. Operation-specific validation
    switch (operation) {
      case 'add':
        if (targetQuote) {
          const quoteValidation = await validateQuoteForCart(targetQuote);
          
          if (!quoteValidation.canProceed) {
            allIssues.push(...quoteValidation.criticalIssues);
            return {
              canProceed: false,
              issues: allIssues,
              recommendations: [...allRecommendations, ...quoteValidation.recommendations]
            };
          }

          if (!quoteValidation.isValid) {
            allIssues.push(...quoteValidation.issues);
            allRecommendations.push(...quoteValidation.recommendations);
          }

          // Check currency compatibility with existing items
          if (currentItems.length > 0) {
            const existingCurrencies = new Set(currentItems.map(item => 
              detectQuoteCurrency(item.quote).detectedCurrency
            ));
            
            const newCurrency = detectQuoteCurrency(targetQuote).detectedCurrency;
            
            if (!existingCurrencies.has(newCurrency)) {
              allRecommendations.push(`Adding item will introduce new currency (${newCurrency}) to cart - conversion will be applied at checkout`);
            }
          }
        }
        break;

      case 'sync':
        // For sync operations, warn if there might be server-side currency inconsistencies
        if (currentItems.some(item => item.metadata?.currencyValidation && !item.metadata.currencyValidation.isValid)) {
          allRecommendations.push('Some items have recorded currency issues - sync may help resolve them');
        }
        break;

      case 'clear':
      case 'remove':
        // These operations are generally safe from currency perspective
        break;
    }

    const canProceed = allIssues.length === 0 || !allIssues.some(issue => issue.includes('Critical:'));

    console.log(`[CART PRE-VALIDATION] ${operation} operation validation:`, {
      canProceed,
      issueCount: allIssues.length,
      recommendationCount: allRecommendations.length
    });

    return {
      canProceed,
      issues: allIssues,
      recommendations: allRecommendations
    };

  } catch (error) {
    console.error(`[CART PRE-VALIDATION] Validation failed for ${operation}:`, error);
    
    return {
      canProceed: false,
      issues: [`Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
      recommendations: ['Contact support if this error persists']
    };
  }
}

/**
 * Get user-friendly error message for currency validation issues
 */
export function getCurrencyErrorMessage(validation: CartCurrencyValidation): string {
  if (validation.isValid) {
    return '';
  }

  if (validation.criticalIssues.length > 0) {
    // Focus on the most critical issue
    const criticalIssue = validation.criticalIssues[0];
    
    if (criticalIssue.includes('data corruption')) {
      return 'This item has currency data issues and cannot be added to cart. Please contact support.';
    }
    
    if (criticalIssue.includes('status')) {
      return 'Only approved quotes can be added to cart. Please wait for approval or request a new quote.';
    }
    
    if (criticalIssue.includes('price')) {
      return 'This item has pricing issues and cannot be added to cart. Please request a new quote.';
    }
    
    return 'This item cannot be added to cart due to validation issues. Please contact support.';
  }

  if (validation.issues.length > 0) {
    return 'This item may have currency inconsistencies. Proceed with caution or contact support for assistance.';
  }

  return 'Unknown validation issue occurred. Please try again or contact support.';
}

/**
 * Auto-fix cart currency issues (where possible)
 */
export async function suggestCartFixes(cartItems: CartItem[]): Promise<{
  canAutoFix: boolean;
  suggestedActions: string[];
  fixableItems: string[];
  requiresManualIntervention: string[];
}> {
  const integrity = validateCartIntegrity(cartItems);
  
  const suggestedActions: string[] = [];
  const fixableItems: string[] = [];
  const requiresManualIntervention: string[] = [];

  if (!integrity.hasInconsistencies) {
    return {
      canAutoFix: true,
      suggestedActions: ['Cart is healthy - no fixes needed'],
      fixableItems: [],
      requiresManualIntervention: []
    };
  }

  for (const problematicItem of integrity.problematicItems) {
    const hasDataCorruption = problematicItem.issues.some(issue => 
      issue.includes('Critical:') || issue.includes('data corruption')
    );

    if (hasDataCorruption) {
      requiresManualIntervention.push(problematicItem.itemId);
      suggestedActions.push(`Remove and re-request quote for item ${problematicItem.itemId}`);
    } else {
      fixableItems.push(problematicItem.itemId);
      suggestedActions.push(`Refresh item ${problematicItem.itemId} to resolve currency issues`);
    }
  }

  if (Object.keys(integrity.currencySummary).length > 1) {
    suggestedActions.push('Cart has multiple currencies - totals will be converted at checkout');
  }

  return {
    canAutoFix: requiresManualIntervention.length === 0,
    suggestedActions,
    fixableItems,
    requiresManualIntervention
  };
}

// Make available globally for debugging
if (typeof window !== 'undefined') {
  (window as any).cartCurrencyValidation = {
    validateQuoteForCart,
    validateCartIntegrity,
    validateBeforeCartOperation,
    getCurrencyErrorMessage,
    suggestCartFixes
  };
  console.log('Cart currency validation utilities available at window.cartCurrencyValidation');
}