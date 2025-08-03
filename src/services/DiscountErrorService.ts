/**
 * Enhanced Discount Error Service
 * Provides user-friendly error messages and suggestions for discount code issues
 */

export interface DiscountError {
  type: string;
  title: string;
  message: string;
  suggestion?: string;
  helpText?: string;
  severity: 'error' | 'warning' | 'info';
  actionable?: boolean;
  retryable?: boolean;
}

export class DiscountErrorService {
  /**
   * Get enhanced error details for discount validation failures
   */
  static getEnhancedError(
    errorType: string, 
    code?: string, 
    context?: {
      orderTotal?: number;
      country?: string;
      minOrder?: number;
      maxDiscount?: number;
      validFrom?: string;
      validUntil?: string;
      usageCount?: number;
      usageLimit?: number;
      customerUsage?: number;
      customerLimit?: number;
      reason?: string;
      action?: string;
    }
  ): DiscountError {
    
    switch (errorType) {
      case 'INVALID_CODE':
        return {
          type: 'INVALID_CODE',
          title: 'Discount Code Not Found',
          message: `The code "${code}" is not recognized in our system.`,
          suggestion: 'Please check the spelling and try again. Codes are case-sensitive.',
          helpText: 'Make sure you\'ve copied the code exactly as it appears in your email or promotion.',
          severity: 'error',
          actionable: true,
          retryable: true
        };

      case 'CODE_INACTIVE':
        return {
          type: 'CODE_INACTIVE',
          title: 'Discount Code Disabled',
          message: `The code "${code}" has been temporarily disabled.`,
          suggestion: 'This code may be part of a paused campaign. Try checking for other available offers.',
          helpText: 'Contact support if you believe this code should be active.',
          severity: 'error',
          actionable: false,
          retryable: false
        };

      case 'CODE_NOT_YET_VALID':
        return {
          type: 'CODE_NOT_YET_VALID',
          title: 'Discount Code Not Yet Active',
          message: `The code "${code}" is scheduled to become active ${this.formatDate(context?.validFrom)}.`,
          suggestion: 'Please try applying this code after the activation date.',
          helpText: 'You can save this code and apply it once it becomes active.',
          severity: 'warning',
          actionable: true,
          retryable: true
        };

      case 'CODE_EXPIRED':
        const expiredDate = context?.validUntil ? this.formatDate(context.validUntil) : 'recently';
        return {
          type: 'CODE_EXPIRED',
          title: 'Discount Code Expired',
          message: `The code "${code}" expired ${expiredDate}.`,
          suggestion: 'Check your email for newer discount codes or browse our current offers.',
          helpText: 'Sign up for our newsletter to get notified about new discount codes.',
          severity: 'error',
          actionable: false,
          retryable: false
        };

      case 'USAGE_LIMIT_REACHED':
        return {
          type: 'USAGE_LIMIT_REACHED',
          title: 'Discount Code Fully Used',
          message: `The code "${code}" has reached its maximum usage limit (${context?.usageLimit} uses).`,
          suggestion: 'This was a limited-time offer that has been fully claimed.',
          helpText: 'Follow us on social media to be first to know about new discount codes.',
          severity: 'error',
          actionable: false,
          retryable: false
        };

      case 'CUSTOMER_LIMIT_REACHED':
        return {
          type: 'CUSTOMER_LIMIT_REACHED',
          title: 'You\'ve Already Used This Code',
          message: `You've already used the code "${code}" the maximum number of times (${context?.customerLimit}).`,
          suggestion: 'Each customer can only use this code once. Look for other available discounts.',
          helpText: 'Create an account to track your discount usage and get personalized offers.',
          severity: 'warning',
          actionable: false,
          retryable: false
        };

      case 'MINIMUM_ORDER_NOT_MET':
        const minOrder = context?.minOrder || 0;
        const currentOrder = context?.orderTotal || 0;
        const needed = minOrder - currentOrder;
        return {
          type: 'MINIMUM_ORDER_NOT_MET',
          title: 'Minimum Order Amount Required',
          message: `This code requires a minimum order of $${minOrder.toFixed(2)}. Your current order is $${currentOrder.toFixed(2)}.`,
          suggestion: `Add $${needed.toFixed(2)} more to your order to use this discount.`,
          helpText: 'The discount will be automatically applied once you reach the minimum amount.',
          severity: 'info',
          actionable: true,
          retryable: true
        };

      case 'COUNTRY_NOT_ELIGIBLE':
        return {
          type: 'COUNTRY_NOT_ELIGIBLE',
          title: 'Not Available in Your Region',
          message: `The code "${code}" is not available for orders to ${context?.country || 'your location'}.`,
          suggestion: 'This discount is restricted to specific regions. Check for location-specific offers.',
          helpText: 'Different regions may have different promotional codes available.',
          severity: 'warning',
          actionable: false,
          retryable: false
        };

      case 'MAX_DISCOUNT_EXCEEDED':
        return {
          type: 'MAX_DISCOUNT_EXCEEDED',
          title: 'Maximum Discount Applied',
          message: `This code provides the maximum discount of $${context?.maxDiscount?.toFixed(2)}.`,
          suggestion: 'The discount has been capped at the maximum allowed amount.',
          helpText: 'This prevents excessive discounts while still providing great savings.',
          severity: 'info',
          actionable: false,
          retryable: false
        };

      case 'NETWORK_ERROR':
        return {
          type: 'NETWORK_ERROR',
          title: 'Connection Issue',
          message: 'Unable to validate the discount code due to a connection problem.',
          suggestion: 'Please check your internet connection and try again.',
          helpText: 'If the problem persists, try refreshing the page.',
          severity: 'error',
          actionable: true,
          retryable: true
        };

      case 'BLOCKED_SUSPICIOUS_ACTIVITY':
        return {
          type: 'BLOCKED_SUSPICIOUS_ACTIVITY',
          title: 'Request Temporarily Blocked',
          message: context?.reason || 'Your request has been temporarily blocked due to suspicious activity.',
          suggestion: context?.action === 'captcha' 
            ? 'Please complete the security verification to continue.'
            : context?.action === 'rate_limit'
            ? 'Please wait a few minutes before trying again.'
            : 'Please try again later or contact support if you believe this is an error.',
          helpText: 'This security measure helps protect against fraudulent discount code usage.',
          severity: 'warning',
          actionable: context?.action === 'captcha',
          retryable: context?.action === 'rate_limit'
        };

      case 'SERVER_ERROR':
        return {
          type: 'SERVER_ERROR',
          title: 'Temporary Service Issue',
          message: 'Our discount validation service is temporarily unavailable.',
          suggestion: 'Please try again in a few moments.',
          helpText: 'If this continues, contact support with the code you\'re trying to use.',
          severity: 'error',
          actionable: true,
          retryable: true
        };

      case 'CAMPAIGN_ENDED':
        return {
          type: 'CAMPAIGN_ENDED',
          title: 'Promotion Has Ended',
          message: `The promotional campaign for "${code}" has concluded.`,
          suggestion: 'Check our current promotions page for active offers.',
          helpText: 'Subscribe to our newsletter to get notified about future campaigns.',
          severity: 'warning',
          actionable: false,
          retryable: false
        };

      default:
        return {
          type: 'UNKNOWN_ERROR',
          title: 'Discount Validation Error',
          message: 'An unexpected error occurred while validating your discount code.',
          suggestion: 'Please try again or contact support if the problem persists.',
          helpText: 'Include the discount code you\'re trying to use when contacting support.',
          severity: 'error',
          actionable: true,
          retryable: true
        };
    }
  }

  /**
   * Get contextual suggestions based on order details
   */
  static getContextualSuggestions(context: {
    orderTotal: number;
    country: string;
    hasAccount: boolean;
    isFirstOrder: boolean;
  }): string[] {
    const suggestions: string[] = [];

    // Volume-based suggestions
    if (context.orderTotal < 100) {
      suggestions.push(`Add $${(100 - context.orderTotal).toFixed(2)} more to unlock volume discounts`);
    }

    // Account-based suggestions
    if (!context.hasAccount) {
      suggestions.push('Create an account to access exclusive member discounts');
    }

    // First-order suggestions
    if (context.isFirstOrder) {
      suggestions.push('First-time customers often have special welcome offers available');
    }

    // Country-specific suggestions
    const countrySpecific = this.getCountrySpecificSuggestions(context.country);
    suggestions.push(...countrySpecific);

    return suggestions;
  }

  /**
   * Get country-specific discount suggestions
   */
  private static getCountrySpecificSuggestions(country: string): string[] {
    const suggestions: { [key: string]: string[] } = {
      'IN': [
        'Try "INDIASHIP10" for 10% off shipping',
        'Festival season often brings special India discounts'
      ],
      'NP': [
        'Nepal customers may have automatic shipping discounts',
        'Check for Dashain/Tihar seasonal offers'
      ],
      'US': [
        'US customers often get free handling on larger orders',
        'Memorial Day and Black Friday typically have the best US deals'
      ],
      'CA': [
        'Canadian customers may qualify for reduced shipping rates',
        'Canada Day promotions are typically available in July'
      ]
    };

    return suggestions[country] || ['Check our promotions page for region-specific offers'];
  }

  /**
   * Format date for user-friendly display
   */
  private static formatDate(dateString?: string): string {
    if (!dateString) return 'soon';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'today';
    if (diffDays === 1) return 'tomorrow';
    if (diffDays === -1) return 'yesterday';
    if (diffDays > 0 && diffDays <= 7) return `in ${diffDays} days`;
    if (diffDays < 0 && diffDays >= -7) return `${Math.abs(diffDays)} days ago`;
    
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  }

  /**
   * Get error icon based on severity
   */
  static getErrorIcon(severity: 'error' | 'warning' | 'info'): string {
    switch (severity) {
      case 'error': return '❌';
      case 'warning': return '⚠️';
      case 'info': return 'ℹ️';
      default: return '❓';
    }
  }

  /**
   * Get suggested actions for common error types
   */
  static getSuggestedActions(errorType: string): Array<{
    label: string;
    action: string;
    primary?: boolean;
  }> {
    switch (errorType) {
      case 'INVALID_CODE':
        return [
          { label: 'Try Again', action: 'retry', primary: true },
          { label: 'Browse Offers', action: 'browse_offers' },
          { label: 'Contact Support', action: 'contact_support' }
        ];

      case 'MINIMUM_ORDER_NOT_MET':
        return [
          { label: 'Continue Shopping', action: 'continue_shopping', primary: true },
          { label: 'View Recommendations', action: 'view_recommendations' }
        ];

      case 'CODE_EXPIRED':
        return [
          { label: 'View Current Offers', action: 'browse_offers', primary: true },
          { label: 'Subscribe for Updates', action: 'subscribe' }
        ];

      case 'CUSTOMER_LIMIT_REACHED':
        return [
          { label: 'Browse Other Offers', action: 'browse_offers', primary: true },
          { label: 'View Account History', action: 'view_history' }
        ];

      default:
        return [
          { label: 'Try Again', action: 'retry', primary: true },
          { label: 'Get Help', action: 'contact_support' }
        ];
    }
  }
}