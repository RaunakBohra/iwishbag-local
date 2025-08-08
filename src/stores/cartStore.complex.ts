/**
 * Cart Store - Zustand-based Reactive Cart State
 * 
 * Features:
 * - Reactive state management with Zustand
 * - Integration with CartEngine for business logic
 * - Optimistic updates for instant UI feedback
 * - Automatic persistence and synchronization
 * - Performance-optimized selectors
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { cartEngine } from '@/services/CartEngine';
import { cartPersistenceService } from '@/services/CartPersistenceService';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';
import type {
  CartState,
  CartItem,
  CartSyncStatus,
  CartAnalytics,
  Quote
} from '@/types/cart';

// Extended store state
interface CartStore extends CartState {
  // Loading states
  isLoading: boolean;
  isInitialized: boolean;
  
  // Current user info
  currentUserId: string | null;
  
  // UI state
  sidebarOpen: boolean;
  checkoutModalOpen: boolean;
  
  // Actions
  initialize: () => Promise<void>;
  
  // Item management
  addItem: (quote: Quote, metadata?: Partial<CartItem['metadata']>) => Promise<void>;
  removeItem: (quoteId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  toggleItem: (quote: Quote) => Promise<void>;
  
  // Sync operations
  syncWithServer: () => Promise<void>;
  forceSyncToServer: () => Promise<void>;
  
  // UI actions
  setSidebarOpen: (open: boolean) => void;
  setCheckoutModalOpen: (open: boolean) => void;
  
  // Utilities
  hasItem: (quoteId: string) => boolean;
  getItem: (quoteId: string) => CartItem | undefined;
  getTotalValue: (currency?: string) => Promise<number>;
  getAnalytics: () => CartAnalytics;
  
  // History operations
  canUndo: () => boolean;
  canRedo: () => boolean;
  undo: () => void;
  redo: () => void;
  
  // Reset
  reset: () => void;
}

export const useCartStore = create<CartStore>()(
  subscribeWithSelector((set, get) => ({
      // Initial state
      items: [],
      metadata: {
        lastSync: null,
        totalItems: 0,
        totalValueUSD: 0,
        totalValueDisplay: 0,
        displayCurrency: 'USD',
        conflictResolution: {
          strategy: 'server-wins'
        }
      },
      syncStatus: 'offline' as CartSyncStatus,
      history: [],
      maxHistorySize: 20,
      analytics: {
        addCount: 0,
        removeCount: 0,
        syncCount: 0,
        averageResponseTime: 0
      },
      
      // Extended state
      isLoading: false,
      isInitialized: false,
      currentUserId: null,
      sidebarOpen: false,
      checkoutModalOpen: false,

      // Initialize the store
      initialize: async () => {
        const state = get();
        if (state.isInitialized) return;

        try {
          set(state => ({
            ...state,
            isLoading: true
          }));

          // Get current user
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) {
            logger.warn('No user found, cart will work in guest mode');
            set(draft => {
              draft.isInitialized = true;
              draft.isLoading = false;
            });
            return;
          }

          set(draft => {
            draft.currentUserId = user.id;
          });

          // Initialize cart engine
          await cartEngine.initialize();

          // Load persisted state
          const persistedState = await cartPersistenceService.loadCartState(user.id);
          if (persistedState) {
            set(draft => {
              Object.assign(draft, persistedState);
            });
          }

          // Setup event listeners
          cartEngine.on('item_added', (event) => {
            set(draft => {
              const existing = draft.items.find(item => item.id === event.payload.item.id);
              if (!existing) {
                draft.items.push(event.payload.item);
                draft.metadata.totalItems = draft.items.length;
              }
            });
          });

          cartEngine.on('item_removed', (event) => {
            set(draft => {
              const index = draft.items.findIndex(item => item.id === event.payload.item.id);
              if (index > -1) {
                draft.items.splice(index, 1);
                draft.metadata.totalItems = draft.items.length;
              }
            });
          });

          cartEngine.on('cart_cleared', () => {
            set(draft => {
              draft.items = [];
              draft.metadata.totalItems = 0;
              draft.metadata.totalValueUSD = 0;
              draft.metadata.totalValueDisplay = 0;
            });
          });

          cartEngine.on('sync_started', () => {
            set(draft => {
              draft.syncStatus = 'syncing';
            });
          });

          cartEngine.on('sync_completed', () => {
            set(draft => {
              draft.syncStatus = 'synced';
              draft.metadata.lastSync = new Date();
            });
          });

          cartEngine.on('conflict_detected', () => {
            set(draft => {
              draft.syncStatus = 'conflict';
            });
          });

          set(draft => {
            draft.isInitialized = true;
            draft.isLoading = false;
            draft.syncStatus = 'synced';
          });

          logger.info('Cart store initialized successfully', { userId: user.id });

        } catch (error) {
          logger.error('Failed to initialize cart store', error);
          set(draft => {
            draft.isLoading = false;
            draft.syncStatus = 'error';
          });
          throw error;
        }
      },

      // Item management
      addItem: async (quote: Quote, metadata?: Partial<CartItem['metadata']>) => {
        const startTime = Date.now();
        
        try {
          // Optimistic update
          set(draft => {
            const existing = draft.items.find(item => item.id === quote.id);
            if (!existing) {
              const cartItem: CartItem = {
                id: quote.id,
                quote,
                addedAt: new Date(),
                lastUpdated: new Date(),
                metadata: {
                  addedFrom: 'dashboard',
                  priceAtAdd: quote.final_total_origincurrency,
                  currencyAtAdd: quote.currency,
                  ...metadata
                }
              };
              
              draft.items.push(cartItem);
              draft.metadata.totalItems = draft.items.length;
              draft.metadata.totalValueUSD += quote.final_total_origincurrency;
            }
          });

          // Call engine for business logic and persistence
          await cartEngine.addItem(quote, metadata);

          // Update analytics
          set(draft => {
            if (draft.analytics) {
              draft.analytics.addCount++;
              const responseTime = Date.now() - startTime;
              const currentAvg = draft.analytics.averageResponseTime;
              const count = draft.analytics.addCount + draft.analytics.removeCount;
              draft.analytics.averageResponseTime = (currentAvg * (count - 1) + responseTime) / count;
            }
          });

          // Persist state
          const state = get();
          if (state.currentUserId) {
            await cartPersistenceService.saveCartState(state.currentUserId, {
              items: state.items,
              metadata: state.metadata,
              syncStatus: state.syncStatus,
              history: state.history,
              maxHistorySize: state.maxHistorySize,
              analytics: state.analytics
            });
          }

        } catch (error) {
          // Revert optimistic update on error
          set(draft => {
            const index = draft.items.findIndex(item => item.id === quote.id);
            if (index > -1) {
              draft.items.splice(index, 1);
              draft.metadata.totalItems = draft.items.length;
              draft.metadata.totalValueUSD -= quote.final_total_origincurrency;
            }
          });
          throw error;
        }
      },

      removeItem: async (quoteId: string) => {
        const state = get();
        const item = state.items.find(item => item.id === quoteId);
        if (!item) return;

        const originalItem = { ...item };

        try {
          // Optimistic update
          set(draft => {
            const index = draft.items.findIndex(item => item.id === quoteId);
            if (index > -1) {
              draft.items.splice(index, 1);
              draft.metadata.totalItems = draft.items.length;
              draft.metadata.totalValueUSD -= originalItem.quote.final_total_origincurrency;
            }
          });

          // Call engine
          await cartEngine.removeItem(quoteId);

          // Update analytics
          set(draft => {
            if (draft.analytics) {
              draft.analytics.removeCount++;
            }
          });

          // Persist state
          const newState = get();
          if (newState.currentUserId) {
            await cartPersistenceService.saveCartState(newState.currentUserId, {
              items: newState.items,
              metadata: newState.metadata,
              syncStatus: newState.syncStatus,
              history: newState.history,
              maxHistorySize: newState.maxHistorySize,
              analytics: newState.analytics
            });
          }

        } catch (error) {
          // Revert optimistic update on error
          set(draft => {
            draft.items.push(originalItem);
            draft.metadata.totalItems = draft.items.length;
            draft.metadata.totalValueUSD += originalItem.quote.final_total_origincurrency;
          });
          throw error;
        }
      },

      clearCart: async () => {
        const state = get();
        const originalItems = [...state.items];
        const originalValueUSD = state.metadata.totalValueUSD;

        try {
          // Optimistic update
          set(draft => {
            draft.items = [];
            draft.metadata.totalItems = 0;
            draft.metadata.totalValueUSD = 0;
            draft.metadata.totalValueDisplay = 0;
          });

          // Call engine
          await cartEngine.clearCart();

          // Persist state
          const newState = get();
          if (newState.currentUserId) {
            await cartPersistenceService.saveCartState(newState.currentUserId, {
              items: newState.items,
              metadata: newState.metadata,
              syncStatus: newState.syncStatus,
              history: newState.history,
              maxHistorySize: newState.maxHistorySize,
              analytics: newState.analytics
            });
          }

        } catch (error) {
          // Revert optimistic update on error
          set(draft => {
            draft.items = originalItems;
            draft.metadata.totalItems = originalItems.length;
            draft.metadata.totalValueUSD = originalValueUSD;
          });
          throw error;
        }
      },

      toggleItem: async (quote: Quote) => {
        const state = get();
        const hasItem = state.items.some(item => item.id === quote.id);
        
        if (hasItem) {
          await state.removeItem(quote.id);
        } else {
          await state.addItem(quote);
        }
      },

      // Sync operations
      syncWithServer: async () => {
        try {
          await cartEngine.syncWithServer();
          
          // Update store with engine state
          const engineState = cartEngine.getState();
          set(draft => {
            draft.items = engineState.items;
            draft.metadata = engineState.metadata;
            draft.syncStatus = engineState.syncStatus;
            draft.history = engineState.history;
            draft.analytics = engineState.analytics;
          });

        } catch (error) {
          set(draft => {
            draft.syncStatus = 'error';
          });
          throw error;
        }
      },

      forceSyncToServer: async () => {
        const state = get();
        if (!state.currentUserId) return;

        try {
          set(draft => {
            draft.syncStatus = 'syncing';
          });

          await cartPersistenceService.saveCartState(state.currentUserId, {
            items: state.items,
            metadata: state.metadata,
            syncStatus: 'synced',
            history: state.history,
            maxHistorySize: state.maxHistorySize,
            analytics: state.analytics
          });

          set(draft => {
            draft.syncStatus = 'synced';
            draft.metadata.lastSync = new Date();
          });

        } catch (error) {
          set(draft => {
            draft.syncStatus = 'error';
          });
          throw error;
        }
      },

      // UI actions
      setSidebarOpen: (open: boolean) => {
        set(draft => {
          draft.sidebarOpen = open;
        });
      },

      setCheckoutModalOpen: (open: boolean) => {
        set(draft => {
          draft.checkoutModalOpen = open;
        });
      },

      // Utilities
      hasItem: (quoteId: string) => {
        return get().items.some(item => item.id === quoteId);
      },

      getItem: (quoteId: string) => {
        return get().items.find(item => item.id === quoteId);
      },

      getTotalValue: async (currency?: string) => {
        return await cartEngine.getTotalValue(currency);
      },

      getAnalytics: () => {
        return cartEngine.getAnalytics();
      },

      // History operations
      canUndo: () => {
        return get().history.length > 1;
      },

      canRedo: () => {
        // Implementation would require a redo stack
        return false;
      },

      undo: () => {
        const state = get();
        if (state.history.length <= 1) return;

        const previousSnapshot = state.history[1];
        set(draft => {
          draft.items = previousSnapshot.items;
          draft.metadata = previousSnapshot.metadata;
          draft.history = draft.history.slice(1);
        });
      },

      redo: () => {
        // Implementation would require a redo stack
        logger.warn('Redo functionality not implemented yet');
      },

      // Reset
      reset: () => {
        set(() => ({
          items: [],
          metadata: {
            lastSync: null,
            totalItems: 0,
            totalValueUSD: 0,
            totalValueDisplay: 0,
            displayCurrency: 'USD',
            conflictResolution: {
              strategy: 'server-wins' as const
            }
          },
          syncStatus: 'offline' as CartSyncStatus,
          history: [],
          maxHistorySize: 20,
          analytics: {
            addCount: 0,
            removeCount: 0,
            syncCount: 0,
            averageResponseTime: 0
          },
          isLoading: false,
          isInitialized: false,
          currentUserId: null,
          sidebarOpen: false,
          checkoutModalOpen: false
        }));
      }
    }))
  )
);

// Performance-optimized selectors
export const useCartItems = () => useCartStore(state => state.items);
export const useCartCount = () => useCartStore(state => state.metadata.totalItems);
export const useCartTotal = () => useCartStore(state => state.metadata.totalValueDisplay);
export const useCartSyncStatus = () => useCartStore(state => state.syncStatus);
export const useCartLoading = () => useCartStore(state => state.isLoading);
export const useCartSidebar = () => useCartStore(state => state.sidebarOpen);

// Optimized item selector
export const useCartItem = (quoteId: string) => 
  useCartStore(state => state.items.find(item => item.id === quoteId));

// Actions selector
export const useCartActions = () => useCartStore(state => ({
  addItem: state.addItem,
  removeItem: state.removeItem,
  clearCart: state.clearCart,
  toggleItem: state.toggleItem,
  syncWithServer: state.syncWithServer,
  setSidebarOpen: state.setSidebarOpen,
  setCheckoutModalOpen: state.setCheckoutModalOpen
}));

// Initialize on import
useCartStore.getState().initialize().catch(error => {
  logger.error('Failed to initialize cart store on import', error);
});