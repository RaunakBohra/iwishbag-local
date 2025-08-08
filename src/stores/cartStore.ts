/**
 * Simple Cart Store - Zustand-based Reactive Cart State (Simplified)
 * 
 * A simplified version without immer dependency for immediate functionality
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';
import type {
  CartItem,
  CartSyncStatus,
  Quote
} from '@/types/cart';

// Simplified store state
interface SimpleCartStore {
  // State
  items: CartItem[];
  isLoading: boolean;
  isInitialized: boolean;
  currentUserId: string | null;
  syncStatus: CartSyncStatus;
  
  // Actions
  initialize: () => Promise<void>;
  addItem: (quote: Quote) => Promise<void>;
  removeItem: (quoteId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  syncWithServer: () => Promise<void>;
  
  // Utilities
  hasItem: (quoteId: string) => boolean;
  getItem: (quoteId: string) => CartItem | undefined;
  getTotalCount: () => number;
  getTotalValue: () => number;
}

export const useCartStore = create<SimpleCartStore>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    items: [],
    isLoading: false,
    isInitialized: false,
    currentUserId: null,
    syncStatus: 'offline',

    // Initialize
    initialize: async () => {
      const state = get();
      if (state.isInitialized) return;

      try {
        set(prev => ({ ...prev, isLoading: true }));

        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          set(prev => ({ 
            ...prev, 
            isInitialized: true, 
            isLoading: false 
          }));
          return;
        }

        // Load cart items from database
        const { data: quotes, error } = await supabase
          .from('quotes_v2')
          .select('*')
          .eq('in_cart', true)
          .eq('customer_id', user.id);

        if (error) {
          logger.error('Cart store: Database error loading cart items', error);
          throw error;
        }

        logger.info('Cart store: Database query result', { 
          userId: user.id, 
          quotesFound: quotes?.length || 0,
          quotes: quotes?.map(q => ({ id: q.id, in_cart: q.in_cart, customer_id: q.customer_id })) || []
        });

        const cartItems: CartItem[] = (quotes || []).map(quote => ({
          id: quote.id,
          quote,
          addedAt: new Date(quote.created_at),
          lastUpdated: new Date(quote.updated_at),
          metadata: {
            addedFrom: 'database',
            priceAtAdd: quote.total_quote_origincurrency || quote.final_total_origin,
            currencyAtAdd: quote.customer_currency || 'USD'
          }
        }));

        set(prev => ({
          ...prev,
          currentUserId: user.id,
          items: cartItems,
          isInitialized: true,
          isLoading: false,
          syncStatus: 'synced'
        }));

        logger.info('Simple cart store initialized', { 
          userId: user.id, 
          itemCount: cartItems.length 
        });

      } catch (error) {
        logger.error('Failed to initialize cart store', error);
        set(prev => ({ 
          ...prev, 
          isLoading: false, 
          syncStatus: 'error' 
        }));
      }
    },

    // Add item
    addItem: async (quote: Quote) => {
      const state = get();
      if (!state.currentUserId) {
        throw new Error('User not authenticated');
      }

      // Check if already in cart
      if (state.items.some(item => item.id === quote.id)) {
        logger.warn('Item already in cart', { quoteId: quote.id });
        return;
      }

      try {
        // Optimistic update
        const newItem: CartItem = {
          id: quote.id,
          quote,
          addedAt: new Date(),
          lastUpdated: new Date(),
          metadata: {
            addedFrom: 'user',
            priceAtAdd: quote.total_quote_origincurrency || quote.final_total_origin,
            currencyAtAdd: quote.customer_currency || 'USD'
          }
        };

        set(prev => ({
          ...prev,
          items: [...prev.items, newItem]
        }));

        // Update database
        const { error } = await supabase
          .from('quotes_v2')
          .update({ in_cart: true })
          .eq('id', quote.id);

        if (error) {
          // Revert optimistic update
          set(prev => ({
            ...prev,
            items: prev.items.filter(item => item.id !== quote.id)
          }));
          throw error;
        }

        logger.info('Item added to cart', { quoteId: quote.id });

      } catch (error) {
        logger.error('Failed to add item to cart', { quoteId: quote.id, error });
        throw error;
      }
    },

    // Remove item
    removeItem: async (quoteId: string) => {
      const state = get();
      if (!state.currentUserId) return;

      const originalItems = state.items;
      const item = originalItems.find(item => item.id === quoteId);
      if (!item) return;

      try {
        // Optimistic update
        set(prev => ({
          ...prev,
          items: prev.items.filter(item => item.id !== quoteId)
        }));

        // Update database
        const { error } = await supabase
          .from('quotes_v2')
          .update({ in_cart: false })
          .eq('id', quoteId);

        if (error) {
          // Revert optimistic update
          set(prev => ({ ...prev, items: originalItems }));
          throw error;
        }

        logger.info('Item removed from cart', { quoteId });

      } catch (error) {
        logger.error('Failed to remove item from cart', { quoteId, error });
        throw error;
      }
    },

    // Clear cart
    clearCart: async () => {
      const state = get();
      if (!state.currentUserId || state.items.length === 0) return;

      const originalItems = state.items;
      const itemIds = originalItems.map(item => item.id);

      try {
        // Optimistic update
        set(prev => ({ ...prev, items: [] }));

        // Update database
        const { error } = await supabase
          .from('quotes_v2')
          .update({ in_cart: false })
          .in('id', itemIds);

        if (error) {
          // Revert optimistic update
          set(prev => ({ ...prev, items: originalItems }));
          throw error;
        }

        logger.info('Cart cleared', { itemCount: originalItems.length });

      } catch (error) {
        logger.error('Failed to clear cart', error);
        throw error;
      }
    },

    // Sync with server
    syncWithServer: async () => {
      const state = get();
      if (!state.currentUserId || state.syncStatus === 'syncing') return;

      try {
        set(prev => ({ ...prev, syncStatus: 'syncing' }));

        const { data: quotes, error } = await supabase
          .from('quotes_v2')
          .select('*')
          .eq('in_cart', true)
          .eq('customer_id', state.currentUserId);

        if (error) throw error;

        const cartItems: CartItem[] = (quotes || []).map(quote => ({
          id: quote.id,
          quote,
          addedAt: new Date(quote.created_at),
          lastUpdated: new Date(quote.updated_at),
          metadata: {
            addedFrom: 'sync',
            priceAtAdd: quote.total_quote_origincurrency || quote.final_total_origin,
            currencyAtAdd: quote.customer_currency || 'USD'
          }
        }));

        set(prev => ({
          ...prev,
          items: cartItems,
          syncStatus: 'synced'
        }));

        logger.info('Cart synced with server', { itemCount: cartItems.length });

      } catch (error) {
        logger.error('Failed to sync cart', error);
        set(prev => ({ ...prev, syncStatus: 'error' }));
        throw error;
      }
    },

    // Utilities
    hasItem: (quoteId: string) => {
      return get().items.some(item => item.id === quoteId);
    },

    getItem: (quoteId: string) => {
      return get().items.find(item => item.id === quoteId);
    },

    getTotalCount: () => {
      return get().items.length;
    },

    getTotalValue: () => {
      return get().items.reduce((total, item) => {
        const price = item.quote.total_quote_origincurrency || item.quote.final_total_origin || 0;
        return total + price;
      }, 0);
    }
  }))
);

// Simplified selectors
export const useCartItems = () => useCartStore(state => state.items);
export const useCartCount = () => useCartStore(state => state.items.length);
export const useCartSyncStatus = () => useCartStore(state => state.syncStatus);
export const useCartLoading = () => useCartStore(state => state.isLoading);

// Simple item selector - stable reference to prevent infinite loops
export const useCartItem = (quoteId: string) => {
  return useCartStore(state => state.items.find(item => item.id === quoteId));
};

// Actions selector - stable reference to prevent infinite loops
export const useCartActions = () => {
  const addItem = useCartStore(state => state.addItem);
  const removeItem = useCartStore(state => state.removeItem);
  const clearCart = useCartStore(state => state.clearCart);
  const syncWithServer = useCartStore(state => state.syncWithServer);
  
  return { addItem, removeItem, clearCart, syncWithServer };
};

// Initialize lazily when needed
let initializationPromise: Promise<void> | null = null;

const ensureInitialized = () => {
  if (!initializationPromise) {
    initializationPromise = useCartStore.getState().initialize().catch(error => {
      logger.error('Failed to initialize simple cart store', error);
      initializationPromise = null; // Allow retry
    });
  }
  return initializationPromise;
};

// Export for manual initialization if needed
export { ensureInitialized };