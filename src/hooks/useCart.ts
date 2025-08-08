/**
 * Simplified Cart Hooks - Basic functionality without complex features
 */

import { useCallback, useEffect } from 'react';
import { useCartStore, useCartActions, useCartItems, useCartSyncStatus, ensureInitialized } from '@/stores/cartStore';
import { currencyService } from '@/services/CurrencyService';
import { useDisplayCurrency } from '@/hooks/useDisplayCurrency';
import { logger } from '@/utils/logger';
import type { Quote } from '@/types/cart';

/**
 * Main cart hook - simplified version
 */
export function useCart() {
  const store = useCartStore();
  const actions = useCartActions();
  const items = useCartItems();
  const syncStatus = useCartSyncStatus();

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
    } catch (error) {
      logger.error('Failed to add item to cart', { quoteId: quote.id, error });
      throw error;
    }
  }, [actions]);

  const removeItem = useCallback(async (quoteId: string) => {
    try {
      await actions.removeItem(quoteId);
    } catch (error) {
      logger.error('Failed to remove item from cart', { quoteId, error });
      throw error;
    }
  }, [actions]);

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

  const hasItem = useCallback((quoteId: string) => {
    return store.hasItem(quoteId);
  }, [store]);

  const getItem = useCallback((quoteId: string) => {
    return store.getItem(quoteId);
  }, [store]);

  const { displayCurrency } = useDisplayCurrency();

  const getTotalValue = useCallback(async (currency?: string) => {
    const totalUSD = store.getTotalValue();
    const targetCurrency = currency || displayCurrency;
    
    if (targetCurrency === 'USD') {
      return totalUSD;
    }

    try {
      return await currencyService.convertAmount(totalUSD, 'USD', targetCurrency);
    } catch (error) {
      logger.error('Currency conversion failed', { totalUSD, currency: targetCurrency, error });
      return totalUSD; // Fallback to USD
    }
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
  } = useDisplayCurrency(firstQuote);

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