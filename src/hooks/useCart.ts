/**
 * Simplified Cart Hooks - Basic functionality without complex features
 */

import { useCallback, useEffect } from 'react';
import { useCartStore, useCartActions, useCartItems, useCartSyncStatus, useCartHistory, ensureInitialized } from '@/stores/cartStore';
import { currencyService } from '@/services/CurrencyService';
import { useCurrency } from '@/hooks/unified';
import { logger } from '@/utils/logger';
import { analytics } from '@/utils/analytics';
import type { Quote } from '@/types/cart';

/**
 * Main cart hook - simplified version
 */
export function useCart() {
  const store = useCartStore();
  const actions = useCartActions();
  const items = useCartItems();
  const syncStatus = useCartSyncStatus();
  const history = useCartHistory();

  // Ensure cart is initialized when hook is first used
  useEffect(() => {
    ensureInitialized().catch(error => {
      logger.error('Failed to initialize cart in useCart hook', error);
    });
  }, []);

  // Enhanced actions with error handling
  const addItem = useCallback(async (quote: Quote) => {
    try {
      await actions.addItem(quote);
      
      // Track add to cart event
      analytics.trackEcommerce({
        event_name: 'add_to_cart',
        currency: quote.destination_country === 'NP' ? 'NPR' : 'INR',
        value: quote.total_quote_origincurrency || 0,
        items: [{
          item_id: quote.id,
          item_name: quote.customer_data?.description || `Quote ${quote.id}`,
          category: 'quote',
          quantity: 1,
          price: quote.total_quote_origincurrency || 0,
        }]
      });
      
    } catch (error) {
      logger.error('Failed to add item to cart', { quoteId: quote.id, error });
      throw error;
    }
  }, [actions]);

  const removeItem = useCallback(async (quoteId: string) => {
    try {
      const item = store.getItem(quoteId);
      await actions.removeItem(quoteId);
      
      // Track remove from cart event
      if (item) {
        analytics.trackEcommerce({
          event_name: 'remove_from_cart',
          currency: item.quote.destination_country === 'NP' ? 'NPR' : 'INR',
          value: item.quote.total_quote_origincurrency || 0,
          items: [{
            item_id: item.quote.id,
            item_name: item.quote.customer_data?.description || `Quote ${item.quote.id}`,
            category: 'quote',
            quantity: 1,
            price: item.quote.total_quote_origincurrency || 0,
          }]
        });
      }
      
    } catch (error) {
      logger.error('Failed to remove item from cart', { quoteId, error });
      throw error;
    }
  }, [actions, store]);

  const clearCart = useCallback(async () => {
    try {
      await actions.clearCart();
    } catch (error) {
      logger.error('Failed to clear cart', error);
      throw error;
    }
  }, [actions]);

  const syncWithServer = useCallback(async () => {
    try {
      await actions.syncWithServer();
    } catch (error) {
      logger.error('Failed to sync cart', error);
      throw error;
    }
  }, [actions]);

  const undo = useCallback(async () => {
    try {
      await actions.undo();
    } catch (error) {
      logger.error('Failed to undo cart operation', error);
      throw error;
    }
  }, [actions]);

  const redo = useCallback(async () => {
    try {
      await actions.redo();
    } catch (error) {
      logger.error('Failed to redo cart operation', error);
      throw error;
    }
  }, [actions]);

  const hasItem = useCallback((quoteId: string) => {
    return store.hasItem(quoteId);
  }, [store]);

  const getItem = useCallback((quoteId: string) => {
    return store.getItem(quoteId);
  }, [store]);

  const { displayCurrency } = useCurrency();

  const getTotalValue = useCallback(async (currency?: string) => {
    const targetCurrency = currency || displayCurrency;
    
    // PHASE 2 FIX: Use currency-aware cart totals to prevent double-conversion
    const currencyBreakdown = store.getTotalValueWithCurrency();
    
    // Debug logging removed to prevent infinite loops
    
    if (currencyBreakdown.isEmpty) {
      return 0;
    }

    // If cart has items in the target currency, no conversion needed
    if (currencyBreakdown.totalsByCurrency[targetCurrency]) {
      const directTotal = currencyBreakdown.totalsByCurrency[targetCurrency];
      
      // Check if this is the only currency in cart
      if (currencyBreakdown.isSingleCurrency && currencyBreakdown.currencies[0] === targetCurrency) {
        // Cart is entirely in target currency
        return directTotal;
      }
    }

    // Handle single currency cart that needs conversion
    if (currencyBreakdown.isSingleCurrency) {
      const cartCurrency = currencyBreakdown.currencies[0];
      const cartTotal = currencyBreakdown.totalsByCurrency[cartCurrency];
      
      // Single currency cart conversion
      
      if (cartCurrency === targetCurrency) {
        // No conversion needed, same currency
        return cartTotal;
      }

      try {
        const converted = await currencyService.convertAmount(cartTotal, cartCurrency, targetCurrency);
        return converted;
      } catch (error) {
        console.error(`[USE CART] Currency conversion failed:`, { cartTotal, cartCurrency, targetCurrency, error });
        logger.error('Currency conversion failed', { cartTotal, fromCurrency: cartCurrency, targetCurrency, error });
        return cartTotal; // Fallback to original amount
      }
    }

    // Handle multi-currency cart (convert each currency and sum)
    // Multi-currency cart conversion
    let convertedTotal = 0;

    for (const [cartCurrency, amount] of Object.entries(currencyBreakdown.totalsByCurrency)) {
      if (cartCurrency === targetCurrency) {
        convertedTotal += amount;
      } else {
        try {
          const converted = await currencyService.convertAmount(amount, cartCurrency, targetCurrency);
          convertedTotal += converted;
        } catch (error) {
          logger.error('Multi-currency conversion failed', { amount, fromCurrency: cartCurrency, targetCurrency, error });
          // Add original amount as fallback (not ideal but prevents total loss)
          convertedTotal += amount;
        }
      }
    }
    return convertedTotal;

  }, [store, displayCurrency]);

  return {
    // State
    items,
    metadata: {
      totalItems: items.length,
      totalValueUSD: store.getTotalValue(),
      displayCurrency
    },
    syncStatus,
    isLoading: store.isLoading,

    // Actions
    addItem,
    removeItem,
    clearCart,
    syncWithServer,

    // Undo/Redo
    undo,
    redo,
    canUndo: history.canUndo,
    canRedo: history.canRedo,
    lastOperation: history.lastOperation,
    historyCount: history.historyCount,

    // Utilities
    hasItem,
    getItem,
    getTotalValue
  };
}

/**
 * Individual cart item hook
 */
export function useCartItem(quoteOrId: Quote | string) {
  const quote = typeof quoteOrId === 'string' ? null : quoteOrId;
  const quoteId = typeof quoteOrId === 'string' ? quoteOrId : quoteOrId.id;
  
  const store = useCartStore();
  const actions = useCartActions();

  const item = store.getItem(quoteId);
  const isInCart = Boolean(item);
  const isLoading = store.isLoading;

  const add = useCallback(async () => {
    if (!quote) {
      throw new Error('Quote object required for adding item');
    }
    await actions.addItem(quote);
  }, [quote, actions]);

  const remove = useCallback(async () => {
    await actions.removeItem(quoteId);
  }, [quoteId, actions]);

  const toggle = useCallback(async () => {
    if (isInCart) {
      await remove();
    } else {
      await add();
    }
  }, [isInCart, add, remove]);

  return {
    item,
    isInCart,
    isLoading,
    add,
    remove,
    toggle
  };
}

/**
 * Cart sync hook
 */
export function useCartSync() {
  const store = useCartStore();
  const actions = useCartActions();

  const sync = useCallback(async () => {
    await actions.syncWithServer();
  }, [actions]);

  return {
    syncStatus: store.syncStatus,
    lastSync: null, // Simplified
    conflictCount: 0, // Simplified
    sync,
    resolveConflicts: async () => {}, // Placeholder
    canUndo: false, // Simplified
    canRedo: false, // Simplified
    undo: () => {}, // Placeholder
    redo: () => {}, // Placeholder
    history: [] // Simplified
  };
}

/**
 * Cart currency hook - uses customer's preferred display currency
 */
export function useCartCurrency() {
  // Get the first item's quote to provide context for currency detection
  const items = useCartItems();
  const firstQuote = items.length > 0 ? items[0].quote : undefined;
  
  const { 
    displayCurrency, 
    formatAmountWithConversion, 
    formatAmountSync 
  } = useCurrency({ quote: firstQuote });

  const formatAmount = useCallback(async (amount: number, fromCurrency = 'USD') => {
    try {
      if (fromCurrency === displayCurrency) {
        return currencyService.formatAmount(amount, fromCurrency);
      }
      // Use the same conversion logic as quote pages
      return await formatAmountWithConversion(amount, fromCurrency);
    } catch (error) {
      logger.error('Failed to format amount', { amount, fromCurrency, error });
      return formatAmountSync(amount, fromCurrency); // Better fallback
    }
  }, [displayCurrency, formatAmountWithConversion, formatAmountSync]);

  const convertAmount = useCallback(async (amount: number, fromCurrency = 'USD') => {
    if (fromCurrency === displayCurrency) {
      return amount;
    }
    
    try {
      return await currencyService.convertAmount(amount, fromCurrency, displayCurrency);
    } catch (error) {
      logger.error('Currency conversion failed', { amount, fromCurrency, displayCurrency, error });
      return amount; // Fallback to original amount
    }
  }, [displayCurrency]);

  return {
    displayCurrency,
    formatAmount,
    convertAmount
  };
}

/**
 * Cart analytics hook - simplified
 */
export function useCartAnalytics() {
  const items = useCartItems();
  const totalValue = useCartStore(state => state.getTotalValue());

  return {
    totalItems: items.length,
    totalValue,
    averageItemValue: items.length > 0 ? totalValue / items.length : 0,
    addedToday: 0, // Simplified
    conversionPotential: Math.min(100, items.length * 10 + 50),
    recommendedActions: items.length === 0 ? ['Add items to get started'] : [],
    performanceMetrics: {
      avgSyncTime: 0,
      successRate: 100,
      errorRate: 0
    }
  };
}