// ============================================================================
// CUSTOMER-FRIENDLY ROUNDING SYSTEM
// Applies smart rounding to final totals only (not individual components)
// Follows user-friendly rounding patterns for better customer experience
// ============================================================================

import { currencyService } from '@/services/CurrencyService';

/**
 * Customer-friendly rounding rules by currency
 * Applied ONLY to final totals, not individual line items
 */
const CUSTOMER_ROUNDING_RULES: Record<
  string,
  {
    roundTo: number; // Round to nearest X units
    description: string;
  }
> = {
  // US Dollar: Round to nearest dollar
  USD: { roundTo: 1, description: 'Rounded to nearest dollar' },

  // Indian Rupee: Round to nearest ₹10
  INR: { roundTo: 10, description: 'Rounded to nearest ₹10' },

  // Nepalese Rupee: Round to nearest ₹10
  NPR: { roundTo: 10, description: 'Rounded to nearest ₹10' },

  // European currencies: Round to nearest 0.50
  EUR: { roundTo: 0.5, description: 'Rounded to nearest €0.50' },
  GBP: { roundTo: 0.5, description: 'Rounded to nearest £0.50' },

  // Asian currencies: Round to nearest 5 or 10 units
  JPY: { roundTo: 10, description: 'Rounded to nearest ¥10' },
  KRW: { roundTo: 100, description: 'Rounded to nearest ₩100' },
  CNY: { roundTo: 1, description: 'Rounded to nearest ¥1' },
  SGD: { roundTo: 0.5, description: 'Rounded to nearest S$0.50' },

  // Middle Eastern currencies
  AED: { roundTo: 1, description: 'Rounded to nearest د.إ1' },
  SAR: { roundTo: 1, description: 'Rounded to nearest ر.س1' },

  // Other major currencies
  CAD: { roundTo: 0.5, description: 'Rounded to nearest C$0.50' },
  AUD: { roundTo: 0.5, description: 'Rounded to nearest A$0.50' },
};

/**
 * Apply customer-friendly rounding to final total
 * @param amount - The exact calculated amount
 * @param currencyCode - Currency code (e.g., 'USD', 'INR', 'NPR')
 * @returns Object with rounded amount, original amount, and rounding info
 */
export function applyCustomerFriendlyRounding(
  amount: number,
  currencyCode: string,
): {
  roundedAmount: number;
  originalAmount: number;
  roundingApplied: boolean;
  roundingDescription: string;
  savingsAmount: number; // Positive if customer saves, negative if they pay more
} {
  // Handle invalid inputs
  if (!amount || isNaN(amount) || amount <= 0) {
    return {
      roundedAmount: 0,
      originalAmount: amount,
      roundingApplied: false,
      roundingDescription: '',
      savingsAmount: 0,
    };
  }

  // Get rounding rule for currency (default to nearest 0.01 if not specified)
  const rule = CUSTOMER_ROUNDING_RULES[currencyCode] || {
    roundTo: 0.01,
    description: 'Standard rounding',
  };

  // Apply rounding
  const roundedAmount = Math.round(amount / rule.roundTo) * rule.roundTo;

  // Calculate savings (positive = customer saves money)
  const savingsAmount = amount - roundedAmount;

  // Check if rounding was actually applied (difference > 0.001 to handle floating point precision)
  const roundingApplied = Math.abs(savingsAmount) > 0.001;

  return {
    roundedAmount,
    originalAmount: amount,
    roundingApplied,
    roundingDescription: rule.description,
    savingsAmount,
  };
}

/**
 * Format amount with customer-friendly rounding applied
 * @param amount - The exact calculated amount
 * @param currencyCode - Currency code
 * @returns Formatted string with rounding applied
 */
export function formatAmountWithCustomerRounding(amount: number, currencyCode: string): string {
  const rounded = applyCustomerFriendlyRounding(amount, currencyCode);
  return currencyService.formatAmount(rounded.roundedAmount, currencyCode);
}

/**
 * Get rounding explanation for display to customers
 * @param amount - The exact calculated amount
 * @param currencyCode - Currency code
 * @returns Human-readable explanation or null if no rounding applied
 */
export function getRoundingExplanation(amount: number, currencyCode: string): string | null {
  const rounded = applyCustomerFriendlyRounding(amount, currencyCode);

  if (!rounded.roundingApplied) {
    return null;
  }

  const symbol = currencyService.getCurrencySymbol(currencyCode);
  const savings = Math.abs(rounded.savingsAmount);
  const formattedSavings = currencyService.formatAmount(savings, currencyCode);

  if (rounded.savingsAmount > 0) {
    return `${rounded.roundingDescription} - You save ${formattedSavings}`;
  } else {
    return `${rounded.roundingDescription} - Additional ${formattedSavings} for convenience`;
  }
}

/**
 * Check if currency has customer-friendly rounding enabled
 * @param currencyCode - Currency code to check
 * @returns True if currency has special rounding rules
 */
export function hasCustomerRounding(currencyCode: string): boolean {
  return currencyCode in CUSTOMER_ROUNDING_RULES;
}

/**
 * Get all currencies with customer-friendly rounding
 * @returns Array of currency codes that have special rounding rules
 */
export function getCurrenciesWithCustomerRounding(): string[] {
  return Object.keys(CUSTOMER_ROUNDING_RULES);
}
