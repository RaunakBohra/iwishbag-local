/**
 * Cart Utilities - Helper functions for cart operations
 */

import { currencyService } from '@/services/CurrencyService';
import { logger } from '@/utils/logger';
import type { CartItem, Quote } from '@/types/cart';
import type { OrderSummary } from '@/hooks/useCheckout';

/**
 * Cart item validation utilities
 */
export const cartValidation = {
  /**
   * Validate if a quote can be added to cart
   */
  isValidForCart: (quote: Quote): boolean => {
    if (!quote) return false;
    
    // Check required fields
    if (!quote.id || !quote.status) return false;
    
    // Check if quote is approved
    if (quote.status !== 'approved') return false;
    
    // Check if quote has valid pricing
    if (typeof quote.final_total_origincurrency !== 'number' || 
        isNaN(quote.final_total_origincurrency) || 
        quote.final_total_origincurrency <= 0) {
      return false;
    }
    
    return true;
  },

  /**
   * Validate cart item
   */
  isValidCartItem: (item: CartItem): boolean => {
    if (!item || !item.id || !item.quote) return false;
    return cartValidation.isValidForCart(item.quote);
  },

  /**
   * Get validation error message for quote
   */
  getValidationError: (quote: Quote): string | null => {
    if (!quote) return 'Quote is required';
    if (!quote.id) return 'Quote ID is missing';
    if (!quote.status) return 'Quote status is missing';
    if (quote.status !== 'approved') return 'Only approved quotes can be added to cart';
    
    if (typeof quote.final_total_origincurrency !== 'number' || 
        isNaN(quote.final_total_origincurrency) || 
        quote.final_total_origincurrency <= 0) {
      return 'Quote has invalid pricing data';
    }
    
    return null;
  }
};

/**
 * Cart calculation utilities
 */
export const cartCalculations = {
  /**
   * Calculate total cart value in USD
   */
  getTotalValueUSD: (items: CartItem[]): number => {
    return items.reduce((total, item) => {
      const value = item.quote?.final_total_origincurrency || 0;
      return total + value;
    }, 0);
  },

  /**
   * Calculate total cart value in target currency
   */
  getTotalValue: async (items: CartItem[], targetCurrency: string): Promise<number> => {
    const totalUSD = cartCalculations.getTotalValueUSD(items);
    
    if (targetCurrency === 'USD') {
      return totalUSD;
    }

    try {
      return await currencyService.convertAmount(totalUSD, 'USD', targetCurrency);
    } catch (error) {
      logger.error('Currency conversion failed in cart calculations', { 
        totalUSD, 
        targetCurrency, 
        error 
      });
      return totalUSD; // Fallback to USD
    }
  },

  /**
   * Get cart statistics
   */
  getStatistics: (items: CartItem[]) => {
    const totalItems = items.length;
    const totalValueUSD = cartCalculations.getTotalValueUSD(items);
    const averageValueUSD = totalItems > 0 ? totalValueUSD / totalItems : 0;
    
    // Count by status
    const statusCounts = items.reduce((counts, item) => {
      const status = item.quote?.status || 'unknown';
      counts[status] = (counts[status] || 0) + 1;
      return counts;
    }, {} as Record<string, number>);

    // Count by origin country
    const originCounts = items.reduce((counts, item) => {
      const origin = item.quote?.origin_country || 'unknown';
      counts[origin] = (counts[origin] || 0) + 1;
      return counts;
    }, {} as Record<string, number>);

    return {
      totalItems,
      totalValueUSD,
      averageValueUSD,
      statusCounts,
      originCounts,
      isEmpty: totalItems === 0,
      hasApprovedItems: statusCounts.approved > 0
    };
  }
};

/**
 * Cart sorting and filtering utilities
 */
export const cartSorting = {
  /**
   * Sort cart items by various criteria
   */
  sortItems: (items: CartItem[], sortBy: string): CartItem[] => {
    const sorted = [...items];
    
    switch (sortBy) {
      case 'newest':
        return sorted.sort((a, b) => 
          new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime()
        );
      
      case 'oldest':
        return sorted.sort((a, b) => 
          new Date(a.addedAt).getTime() - new Date(b.addedAt).getTime()
        );
      
      case 'price_high':
        return sorted.sort((a, b) => 
          (b.quote?.final_total_origincurrency || 0) - (a.quote?.final_total_origincurrency || 0)
        );
      
      case 'price_low':
        return sorted.sort((a, b) => 
          (a.quote?.final_total_origincurrency || 0) - (b.quote?.final_total_origincurrency || 0)
        );
      
      case 'status':
        return sorted.sort((a, b) => 
          (a.quote?.status || '').localeCompare(b.quote?.status || '')
        );
      
      case 'country':
        return sorted.sort((a, b) => 
          (a.quote?.origin_country || '').localeCompare(b.quote?.origin_country || '')
        );
      
      default:
        return sorted;
    }
  },

  /**
   * Filter cart items by various criteria
   */
  filterItems: (items: CartItem[], filterBy: string, filterValue?: string): CartItem[] => {
    switch (filterBy) {
      case 'all':
        return items;
      
      case 'approved':
        return items.filter(item => item.quote?.status === 'approved');
      
      case 'pending':
        return items.filter(item => item.quote?.status === 'pending');
      
      case 'paid':
        return items.filter(item => item.quote?.status === 'paid');
      
      case 'country':
        return filterValue 
          ? items.filter(item => item.quote?.origin_country === filterValue)
          : items;
      
      default:
        return items;
    }
  }
};

/**
 * Cart persistence utilities
 */
export const cartPersistence = {
  /**
   * Local storage key for cart data
   */
  STORAGE_KEY: 'iwishbag_cart_v2',

  /**
   * Save cart to local storage
   */
  saveToLocal: (items: CartItem[]): void => {
    try {
      const cartData = {
        items,
        timestamp: Date.now(),
        version: '2.0'
      };
      localStorage.setItem(cartPersistence.STORAGE_KEY, JSON.stringify(cartData));
    } catch (error) {
      logger.error('Failed to save cart to localStorage', error);
    }
  },

  /**
   * Load cart from local storage
   */
  loadFromLocal: (): CartItem[] => {
    try {
      const stored = localStorage.getItem(cartPersistence.STORAGE_KEY);
      if (!stored) return [];
      
      const cartData = JSON.parse(stored);
      
      // Validate data structure
      if (!cartData.items || !Array.isArray(cartData.items)) {
        return [];
      }
      
      // Filter out invalid items
      return cartData.items.filter(cartValidation.isValidCartItem);
      
    } catch (error) {
      logger.error('Failed to load cart from localStorage', error);
      return [];
    }
  },

  /**
   * Clear cart from local storage
   */
  clearLocal: (): void => {
    try {
      localStorage.removeItem(cartPersistence.STORAGE_KEY);
    } catch (error) {
      logger.error('Failed to clear cart from localStorage', error);
    }
  }
};

/**
 * Cart display utilities
 */
export const cartDisplay = {
  /**
   * Get display name for cart item
   */
  getItemDisplayName: (item: CartItem): string => {
    const quote = item.quote;
    if (!quote) return 'Unknown Item';
    
    // Use quote display ID or fallback to quote ID
    return quote.display_id || `Quote #${quote.id.slice(0, 8)}`;
  },

  /**
   * Get display description for cart item
   */
  getItemDisplayDescription: (item: CartItem): string => {
    const quote = item.quote;
    if (!quote) return '';
    
    const itemCount = quote.items?.length || 0;
    const route = `${quote.origin_country} → ${quote.destination_country}`;
    
    return `${itemCount} ${itemCount === 1 ? 'item' : 'items'} • ${route}`;
  },

  /**
   * Get status badge variant for quote status
   */
  getStatusBadgeVariant: (status: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
    switch (status) {
      case 'approved':
        return 'default';
      case 'pending':
        return 'secondary';
      case 'rejected':
        return 'destructive';
      default:
        return 'outline';
    }
  },

  /**
   * Format cart summary text
   */
  getCartSummaryText: (items: CartItem[]): string => {
    const count = items.length;
    if (count === 0) return 'Your cart is empty';
    return `${count} ${count === 1 ? 'item' : 'items'} in cart`;
  }
};

/**
 * Order summary utilities
 */
export const orderSummaryUtils = {
  /**
   * Create empty order summary
   */
  createEmpty: (currency: string): OrderSummary => ({
    itemsTotal: 0,
    shippingTotal: 0,
    taxesTotal: 0,
    serviceFeesTotal: 0,
    finalTotal: 0,
    currency,
    savings: 0
  }),

  /**
   * Validate order summary
   */
  isValid: (summary: OrderSummary | null): boolean => {
    if (!summary) return false;
    
    const { itemsTotal, finalTotal, currency } = summary;
    
    return (
      typeof itemsTotal === 'number' &&
      typeof finalTotal === 'number' &&
      typeof currency === 'string' &&
      itemsTotal >= 0 &&
      finalTotal >= 0 &&
      currency.length > 0
    );
  },

  /**
   * Get summary breakdown text
   */
  getBreakdownText: (summary: OrderSummary): string[] => {
    const lines: string[] = [];
    
    if (summary.itemsTotal > 0) {
      lines.push(`Items: ${currencyService.formatAmount(summary.itemsTotal, summary.currency)}`);
    }
    
    if (summary.shippingTotal > 0) {
      lines.push(`Shipping: ${currencyService.formatAmount(summary.shippingTotal, summary.currency)}`);
    }
    
    if (summary.taxesTotal > 0) {
      lines.push(`Taxes & Duties: ${currencyService.formatAmount(summary.taxesTotal, summary.currency)}`);
    }
    
    if (summary.serviceFeesTotal > 0) {
      lines.push(`Service Fees: ${currencyService.formatAmount(summary.serviceFeesTotal, summary.currency)}`);
    }
    
    if (summary.savings && summary.savings > 0) {
      lines.push(`Savings: -${currencyService.formatAmount(summary.savings, summary.currency)}`);
    }
    
    lines.push(`Total: ${currencyService.formatAmount(summary.finalTotal, summary.currency)}`);
    
    return lines;
  }
};

/**
 * Export all utilities as a single object for convenience
 */
export const cartUtils = {
  validation: cartValidation,
  calculations: cartCalculations,
  sorting: cartSorting,
  persistence: cartPersistence,
  display: cartDisplay,
  orderSummary: orderSummaryUtils
};