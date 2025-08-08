/**
 * Cart Hooks - Intuitive Hook-based API
 * 
 * Provides clean, intuitive hooks for cart operations:
 * - useCart() - Main cart operations
 * - useCartItem() - Single item management  
 * - useCartSync() - Sync status and controls
 * - useCartAnalytics() - Performance insights
 */

import { useCallback, useMemo } from 'react';
import { useCartStore, useCartActions, useCartItems, useCartCount, useCartTotal, useCartSyncStatus } from '@/stores/cartStore';
import { CurrencyService } from '@/services/CurrencyService';
import { logger } from '@/utils/logger';
import type { 
  UseCartReturn, 
  UseCartItemReturn, 
  UseCartSyncReturn,
  CartAnalytics,
  Quote 
} from '@/types/cart';

/**
 * Main cart hook - provides all cart functionality
 * 
 * @example
 * ```typescript
 * const { addItem, removeItem, cart, totalValue } = useCart();
 * await addItem(quote);
 * ```
 */
export function useCart(): UseCartReturn {
  const store = useCartStore();
  const actions = useCartActions();
  const items = useCartItems();
  const syncStatus = useCartSyncStatus();

  // Memoized calculations
  const metadata = useMemo(() => store.metadata, [store.metadata]);
  
  const isLoading = useMemo(() => store.isLoading || syncStatus === 'syncing', [store.isLoading, syncStatus]);

  // Utility functions
  const hasItem = useCallback((quoteId: string) => {
    return items.some(item => item.id === quoteId);
  }, [items]);

  const getItem = useCallback((quoteId: string) => {
    return items.find(item => item.id === quoteId);
  }, [items]);

  const getTotalValue = useCallback(async (currency?: string): Promise<number> => {
    if (!currency) currency = metadata.displayCurrency;
    
    if (currency === 'USD') {
      return metadata.totalValueUSD;
    }

    // Convert from USD to target currency
    let total = 0;
    const currencyService = CurrencyService.getInstance();
    
    for (const item of items) {
      try {
        const convertedAmount = await currencyService.convertFromUSD(
          item.quote.final_total_origincurrency, 
          currency
        );
        total += convertedAmount;
      } catch (error) {
        logger.error('Currency conversion failed', { 
          quoteId: item.id, 
          amount: item.quote.final_total_origincurrency,
          currency,
          error 
        });
        // Fallback to USD value
        total += item.quote.final_total_origincurrency;
      }
    }

    return total;
  }, [items, metadata]);

  const getAnalytics = useCallback((): CartAnalytics => {
    return store.getAnalytics();
  }, [store]);

  // Enhanced actions with error handling and logging
  const addItem = useCallback(async (quote: Quote, metadata?: any) => {
    try {
      logger.info('Adding item to cart', { quoteId: quote.id, displayId: quote.display_id });
      await actions.addItem(quote, metadata);
      logger.info('Item added to cart successfully', { quoteId: quote.id });
    } catch (error) {
      logger.error('Failed to add item to cart', { quoteId: quote.id, error });
      throw error;
    }
  }, [actions]);

  const removeItem = useCallback(async (quoteId: string) => {
    try {
      logger.info('Removing item from cart', { quoteId });
      await actions.removeItem(quoteId);
      logger.info('Item removed from cart successfully', { quoteId });
    } catch (error) {
      logger.error('Failed to remove item from cart', { quoteId, error });
      throw error;
    }
  }, [actions]);

  const clearCart = useCallback(async () => {
    try {
      logger.info('Clearing cart', { itemCount: items.length });
      await actions.clearCart();
      logger.info('Cart cleared successfully');
    } catch (error) {
      logger.error('Failed to clear cart', error);
      throw error;
    }
  }, [actions, items.length]);

  const syncWithServer = useCallback(async () => {
    try {
      logger.info('Syncing cart with server');
      await actions.syncWithServer();
      logger.info('Cart synced successfully');
    } catch (error) {
      logger.error('Failed to sync cart', error);
      throw error;
    }
  }, [actions]);

  const forceSyncToServer = useCallback(async () => {
    try {
      logger.info('Force syncing cart to server');
      await store.forceSyncToServer();
      logger.info('Cart force synced successfully');
    } catch (error) {
      logger.error('Failed to force sync cart', error);
      throw error;
    }
  }, [store]);

  return {
    // State
    cart: {
      items,
      metadata,
      syncStatus,
      history: store.history,
      maxHistorySize: store.maxHistorySize,
      analytics: store.analytics
    },
    items,
    metadata,
    syncStatus,
    isLoading,

    // Actions
    addItem,
    removeItem,
    clearCart,

    // Sync
    syncWithServer,
    forceSyncToServer,

    // Utilities
    hasItem,
    getItem,
    getTotalValue,

    // Analytics
    getAnalytics
  };
}

/**
 * Individual cart item hook - manages single item state
 * 
 * @example
 * ```typescript
 * const { isInCart, add, remove, toggle } = useCartItem(quote.id);
 * await toggle(); // Add if not in cart, remove if in cart
 * ```
 */
export function useCartItem(quoteOrId: Quote | string): UseCartItemReturn {
  const quote = typeof quoteOrId === 'string' ? null : quoteOrId;
  const quoteId = typeof quoteOrId === 'string' ? quoteOrId : quoteOrId.id;
  
  const items = useCartItems();
  const actions = useCartActions();
  const syncStatus = useCartSyncStatus();

  const item = useMemo(() => {
    return items.find(item => item.id === quoteId);
  }, [items, quoteId]);

  const isInCart = useMemo(() => Boolean(item), [item]);
  const isLoading = useMemo(() => syncStatus === 'syncing', [syncStatus]);

  const add = useCallback(async (metadata?: any) => {
    if (!quote) {
      throw new Error('Quote object required for adding item');
    }
    try {
      await actions.addItem(quote, metadata);
    } catch (error) {
      logger.error('Failed to add cart item', { quoteId, error });
      throw error;
    }
  }, [quote, quoteId, actions]);

  const remove = useCallback(async () => {
    try {
      await actions.removeItem(quoteId);
    } catch (error) {
      logger.error('Failed to remove cart item', { quoteId, error });
      throw error;
    }
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
 * Cart sync hook - manages sync status and history
 * 
 * @example
 * ```typescript
 * const { syncStatus, sync, canUndo, undo } = useCartSync();
 * if (canUndo) await undo();
 * ```
 */
export function useCartSync(): UseCartSyncReturn {
  const store = useCartStore();
  const actions = useCartActions();

  const syncStatus = useCartSyncStatus();
  const lastSync = useMemo(() => store.metadata.lastSync, [store.metadata.lastSync]);
  
  const conflictCount = useMemo(() => {
    return store.history.filter(snapshot => 
      snapshot.action === 'conflict'
    ).length;
  }, [store.history]);

  const canUndo = useMemo(() => store.canUndo(), [store]);
  const canRedo = useMemo(() => store.canRedo(), [store]);

  const sync = useCallback(async () => {
    await actions.syncWithServer();
  }, [actions]);

  const resolveConflicts = useCallback(async (strategy: any) => {
    // Implementation would depend on CartEngine's conflict resolution
    logger.warn('Conflict resolution not fully implemented', { strategy });
  }, []);

  const undo = useCallback(() => {
    store.undo();
  }, [store]);

  const redo = useCallback(() => {
    store.redo();
  }, [store]);

  return {
    syncStatus,
    lastSync,
    conflictCount,
    sync,
    resolveConflicts,
    canUndo,
    canRedo,
    undo,
    redo,
    history: store.history
  };
}

/**
 * Cart analytics hook - provides performance insights
 * 
 * @example
 * ```typescript
 * const analytics = useCartAnalytics();
 * console.log(`Conversion potential: ${analytics.conversionPotential}%`);
 * ```
 */
export function useCartAnalytics(): CartAnalytics {
  const store = useCartStore();
  
  return useMemo(() => {
    return store.getAnalytics();
  }, [store]);
}

/**
 * Cart UI state hook - manages UI-specific state
 * 
 * @example
 * ```typescript
 * const { sidebarOpen, setSidebarOpen, checkoutModalOpen } = useCartUI();
 * setSidebarOpen(true);
 * ```
 */
export function useCartUI() {
  const store = useCartStore();

  return {
    sidebarOpen: store.sidebarOpen,
    setSidebarOpen: store.setSidebarOpen,
    checkoutModalOpen: store.checkoutModalOpen,
    setCheckoutModalOpen: store.setCheckoutModalOpen
  };
}

/**
 * Cart currency hook - handles multi-currency display
 * 
 * @example
 * ```typescript
 * const { displayCurrency, formatAmount, convertAmount } = useCartCurrency();
 * const formatted = await formatAmount(100, 'USD');
 * ```
 */
export function useCartCurrency() {
  const store = useCartStore();
  const currencyService = CurrencyService.getInstance();

  const displayCurrency = useMemo(() => store.metadata.displayCurrency, [store.metadata.displayCurrency]);

  const formatAmount = useCallback(async (amount: number, fromCurrency: string = 'USD') => {
    try {
      if (fromCurrency === displayCurrency) {
        return currencyService.formatAmount(amount, displayCurrency);
      }

      const convertedAmount = fromCurrency === 'USD' 
        ? await currencyService.convertFromUSD(amount, displayCurrency)
        : await currencyService.convertToUSD(amount, fromCurrency);
        
      return currencyService.formatAmount(convertedAmount, displayCurrency);
    } catch (error) {
      logger.error('Failed to format amount', { amount, fromCurrency, displayCurrency, error });
      return currencyService.formatAmount(amount, fromCurrency);
    }
  }, [displayCurrency, currencyService]);

  const convertAmount = useCallback(async (amount: number, fromCurrency: string, toCurrency: string) => {
    try {
      if (fromCurrency === toCurrency) return amount;
      
      if (fromCurrency === 'USD') {
        return await currencyService.convertFromUSD(amount, toCurrency);
      } else if (toCurrency === 'USD') {
        return await currencyService.convertToUSD(amount, fromCurrency);
      } else {
        // Convert through USD
        const usdAmount = await currencyService.convertToUSD(amount, fromCurrency);
        return await currencyService.convertFromUSD(usdAmount, toCurrency);
      }
    } catch (error) {
      logger.error('Failed to convert amount', { amount, fromCurrency, toCurrency, error });
      return amount;
    }
  }, [currencyService]);

  return {
    displayCurrency,
    formatAmount,
    convertAmount
  };
}

/**
 * Cart performance hook - monitors cart performance
 * 
 * @example
 * ```typescript
 * const { averageResponseTime, successRate, cacheHitRate } = useCartPerformance();
 * ```
 */
export function useCartPerformance() {
  const store = useCartStore();

  return useMemo(() => {
    const analytics = store.analytics;
    if (!analytics) return null;

    return {
      averageResponseTime: analytics.averageResponseTime,
      addCount: analytics.addCount,
      removeCount: analytics.removeCount,
      syncCount: analytics.syncCount,
      // Additional performance metrics could be added here
    };
  }, [store.analytics]);
}