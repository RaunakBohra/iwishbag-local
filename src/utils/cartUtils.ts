/**
 * Cart Utilities - Helper functions for cart operations
 */

import { currencyService } from '@/services/CurrencyService';
import { logger } from '@/utils/logger';
import type { CartItem, Quote } from '@/types/cart';
import type { OrderSummary } from '@/hooks/useCheckout';

/**
 * Calculate cart total in a specific currency
 */
export const calculateCartTotal = async (items: CartItem[], targetCurrency: string = 'USD'): Promise<number> => {
  if (items.length === 0) return 0;

  let total = 0;
  
  for (const item of items) {
    const itemTotal = item.quote.final_total_origincurrency || 0;
    const itemCurrency = item.quote.origin_currency || 'USD';
    
    if (itemCurrency === targetCurrency) {
      total += itemTotal;
    } else {
      try {
        const convertedAmount = await currencyService.convertAmount(itemTotal, itemCurrency, targetCurrency);
        total += convertedAmount;
      } catch (error) {
        logger.error('Failed to convert cart item currency', { 
          itemId: item.id, 
          amount: itemTotal, 
          from: itemCurrency, 
          to: targetCurrency,
          error 
        });
        // Fallback: use original amount (not ideal but prevents total failure)
        total += itemTotal;
      }
    }
  }

  return total;
};

/**
 * Group cart items by currency
 */
export const groupItemsByCurrency = (items: CartItem[]): Record<string, CartItem[]> => {
  return items.reduce((groups, item) => {
    const currency = item.quote.origin_currency || 'USD';
    if (!groups[currency]) {
      groups[currency] = [];
    }
    groups[currency].push(item);
    return groups;
  }, {} as Record<string, CartItem[]>);
};

/**
 * Validate cart item for checkout
 */
export const validateCartItem = (item: CartItem): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (!item.quote) {
    errors.push('Missing quote data');
  } else {
    if (!item.quote.id) errors.push('Missing quote ID');
    if (!item.quote.status || item.quote.status !== 'approved') {
      errors.push('Quote must be approved before checkout');
    }
    if (!item.quote.final_total_origincurrency || item.quote.final_total_origincurrency <= 0) {
      errors.push('Invalid quote total');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Convert cart items to order summary format
 */
export const cartToOrderSummary = async (items: CartItem[], currency: string = 'USD'): Promise<OrderSummary> => {
  const validItems = items.filter(item => validateCartItem(item).isValid);
  
  if (validItems.length === 0) {
    return {
      items: [],
      subtotal: 0,
      shipping: 0,
      tax: 0,
      total: 0,
      currency
    };
  }

  const subtotal = await calculateCartTotal(validItems, currency);
  
  // Basic shipping and tax estimation (can be enhanced later)
  const shipping = subtotal > 100 ? 0 : 15; // Free shipping over $100
  const tax = subtotal * 0.08; // 8% tax estimate
  const total = subtotal + shipping + tax;

  return {
    items: validItems.map(item => ({
      id: item.id,
      name: item.quote.display_id || `Quote ${item.id.slice(0, 8)}`,
      price: item.quote.final_total_origincurrency || 0,
      currency: item.quote.origin_currency || 'USD',
      quantity: 1
    })),
    subtotal,
    shipping,
    tax,
    total,
    currency
  };
};

/**
 * Get cart statistics
 */
export const getCartStatistics = (items: CartItem[]) => {
  const currencyGroups = groupItemsByCurrency(items);
  const currencies = Object.keys(currencyGroups);
  const totalItems = items.length;
  
  const itemsByStatus = items.reduce((acc, item) => {
    const status = item.quote.status || 'unknown';
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const oldestItem = items.reduce((oldest, item) => {
    const itemDate = new Date(item.addedAt);
    const oldestDate = new Date(oldest.addedAt);
    return itemDate < oldestDate ? item : oldest;
  }, items[0]);

  const newestItem = items.reduce((newest, item) => {
    const itemDate = new Date(item.addedAt);
    const newestDate = new Date(newest.addedAt);
    return itemDate > newestDate ? item : newest;
  }, items[0]);

  return {
    totalItems,
    currencies,
    currencyGroups,
    itemsByStatus,
    oldestItem,
    newestItem,
    isMultiCurrency: currencies.length > 1,
    approvedItems: itemsByStatus.approved || 0,
    pendingItems: itemsByStatus.pending || 0
  };
};

export default {
  calculateCartTotal,
  groupItemsByCurrency,
  validateCartItem,
  cartToOrderSummary,
  getCartStatistics
};