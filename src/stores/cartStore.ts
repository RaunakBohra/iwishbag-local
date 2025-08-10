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
import { getOriginCurrency } from '@/utils/originCurrency';
import type {
  CartItem,
  CartSyncStatus,
  Quote
} from '@/types/cart';

/**
 * Helper function to get the quote total with fallback to calculation data
 * Fixes issue where quote fields are zero but calculation data has correct amount
 */
const getQuoteTotal = (quote: any): number => {
  // First, try quote fields
  let total = quote.total_quote_origincurrency || quote.total_origin_currency || quote.origin_total_amount;
  
  // If quote fields are zero/null, fallback to calculation data
  if (!total || total <= 0) {
    total = quote.calculation_data?.calculation_steps?.total_origin_currency || 
           quote.calculation_data?.calculation_steps?.total_quote_origincurrency;
  }
  
  return total || 0;
};

// Enhanced sync status types
export type EnhancedSyncStatus = 
  | 'offline'           // No network, using localStorage only
  | 'syncing'          // Currently syncing with server
  | 'synced'           // Successfully synced with server
  | 'error'            // Sync failed, will retry
  | 'guest'            // Guest cart, not synced to server
  | 'recovery';        // Recovering cart from previous session

// Cart session management
interface CartSession {
  id: string;
  createdAt: Date;
  lastActivityAt: Date;
  userId?: string;
  isGuest: boolean;
}

// Storage keys for localStorage
const CART_STORAGE_KEYS = {
  CART_ITEMS: 'iwishbag_cart_items',
  CART_SESSION: 'iwishbag_cart_session',
  CART_METADATA: 'iwishbag_cart_metadata'
} as const;

// Utility functions
const generateSessionId = (): string => {
  return `cart_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

const isOnline = (): boolean => {
  return navigator.onLine;
};

// Cart history snapshot for undo/redo
interface CartSnapshot {
  items: CartItem[];
  timestamp: Date;
  operation: string;
  operationData?: any;
}

// Recently deleted item for contextual undo
interface RecentlyDeletedItem {
  item: CartItem;
  deletedAt: Date;
  position: number; // Original position in the cart
}

// Enhanced store state with undo/redo
interface SimpleCartStore {
  // State
  items: CartItem[];
  isLoading: boolean;
  isInitialized: boolean;
  currentUserId: string | null;
  syncStatus: EnhancedSyncStatus;
  session: CartSession | null;
  isOnline: boolean;
  recoveredFromSession: boolean;
  
  // Undo/Redo state
  history: CartSnapshot[];
  historyIndex: number;
  maxHistorySize: number;
  lastOperation: string | null;
  
  // Recently deleted items (for contextual undo)
  recentlyDeleted: RecentlyDeletedItem[];
  deletedItemTimeout: number; // milliseconds to show undo option
  
  // Actions
  initialize: () => Promise<void>;
  addItem: (quote: Quote) => Promise<void>;
  removeItem: (quoteId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  syncWithServer: () => Promise<void>;
  
  // Session and persistence
  saveToLocalStorage: () => void;
  restoreFromLocalStorage: () => Promise<boolean>;
  createSession: () => CartSession;
  
  // Utilities
  hasItem: (quoteId: string) => boolean;
  getItem: (quoteId: string) => CartItem | undefined;
  getTotalCount: () => number;
  getTotalValue: () => number;
  
  // Undo/Redo actions
  canUndo: () => boolean;
  canRedo: () => boolean;
  undo: () => Promise<void>;
  redo: () => Promise<void>;
  
  // History management
  saveSnapshot: (operation: string, operationData?: any) => void;
  clearHistory: () => void;
  getHistoryInfo: () => { canUndo: boolean; canRedo: boolean; lastOperation: string | null };
  
  // Recently deleted item management
  isRecentlyDeleted: (quoteId: string) => boolean;
  getRecentlyDeletedItem: (quoteId: string) => RecentlyDeletedItem | undefined;
  undoDeleteItem: (quoteId: string) => Promise<void>;
  clearRecentlyDeleted: (quoteId?: string) => void;
  
  // Debug utilities
  debugCartState: () => void;
  forceSync: () => Promise<void>;
  // PHASE 2: New currency-aware method
  getTotalValueWithCurrency: () => {
    totalsByCurrency: Record<string, number>;
    isEmpty: boolean;
    currencies?: string[];
    isSingleCurrency?: boolean;
  };
  // PHASE 3: Cart validation utilities
  validateCartIntegrity: () => Promise<any>;
  runIntegrityCheck: () => Promise<void>;
}

export const useCartStore = create<SimpleCartStore>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    items: [],
    isLoading: false,
    isInitialized: false,
    currentUserId: null,
    syncStatus: 'offline',
    session: null,
    isOnline: isOnline(),
    recoveredFromSession: false,
    
    // Undo/Redo initial state
    history: [],
    historyIndex: -1,
    maxHistorySize: 20,
    lastOperation: null,
    
    // Recently deleted items state
    recentlyDeleted: [],
    deletedItemTimeout: 10000, // 10 seconds to undo

    // Create cart session
    createSession: () => {
      const session: CartSession = {
        id: generateSessionId(),
        createdAt: new Date(),
        lastActivityAt: new Date(),
        isGuest: true
      };
      
      localStorage.setItem(CART_STORAGE_KEYS.CART_SESSION, JSON.stringify(session));
      return session;
    },

    // Save to localStorage
    saveToLocalStorage: () => {
      try {
        const state = get();
        
        // Save items
        localStorage.setItem(CART_STORAGE_KEYS.CART_ITEMS, JSON.stringify(state.items));
        
        // Save metadata
        const metadata = {
          lastSaved: new Date().toISOString(),
          userId: state.currentUserId,
          itemCount: state.items.length
        };
        localStorage.setItem(CART_STORAGE_KEYS.CART_METADATA, JSON.stringify(metadata));
        
        // Update session activity
        if (state.session) {
          const updatedSession = {
            ...state.session,
            lastActivityAt: new Date()
          };
          localStorage.setItem(CART_STORAGE_KEYS.CART_SESSION, JSON.stringify(updatedSession));
          set(prev => ({ ...prev, session: updatedSession }));
        }

        logger.debug('Cart saved to localStorage');
      } catch (error) {
        logger.error('Failed to save cart to localStorage', error);
      }
    },

    // Restore from localStorage
    restoreFromLocalStorage: async () => {
      try {
        const storedItems = localStorage.getItem(CART_STORAGE_KEYS.CART_ITEMS);
        const storedSession = localStorage.getItem(CART_STORAGE_KEYS.CART_SESSION);
        
        if (!storedItems) {
          logger.debug('No stored cart items found');
          return false;
        }

        const items: CartItem[] = JSON.parse(storedItems);
        let session = null;
        
        if (storedSession) {
          try {
            const parsedSession = JSON.parse(storedSession);
            session = {
              ...parsedSession,
              createdAt: new Date(parsedSession.createdAt),
              lastActivityAt: new Date(parsedSession.lastActivityAt)
            };
          } catch (error) {
            logger.warn('Failed to parse session, creating new one');
            session = get().createSession();
          }
        } else {
          session = get().createSession();
        }

        // Restore items with origin currency (simplified)
        const validatedItems = items.map((item) => {
          return {
            ...item,
            quote: {
              ...item.quote
              // No currency modification needed - use origin currency from DB
            },
            addedAt: new Date(item.addedAt),
            lastUpdated: new Date(item.lastUpdated)
          };
        });

        set(prev => ({ 
          ...prev, 
          items: validatedItems, 
          session,
          recoveredFromSession: true
        }));

        logger.debug('Successfully restored cart from localStorage:', {
          itemCount: validatedItems.length,
          sessionId: session.id
        });

        return true;
      } catch (error) {
        logger.error('Failed to restore from localStorage:', error);
        logger.error('Failed to restore cart from localStorage', error);
        return false;
      }
    },

    // Initialize
    initialize: async () => {
      const state = get();
      logger.debug('Initialize called', { 
        isInitialized: state.isInitialized,
        isOnline: navigator.onLine 
      });
      
      if (state.isInitialized) {
        logger.debug('Already initialized, skipping');
        return;
      }

      try {
        logger.debug('Starting enhanced initialization...');
        set(prev => ({ ...prev, isLoading: true, isOnline: navigator.onLine }));

        // 1. Restore or create session
        let session = state.session;
        const storedSession = localStorage.getItem(CART_STORAGE_KEYS.CART_SESSION);
        
        if (storedSession) {
          try {
            const parsedSession = JSON.parse(storedSession);
            session = {
              ...parsedSession,
              createdAt: new Date(parsedSession.createdAt),
              lastActivityAt: new Date(parsedSession.lastActivityAt)
            };
            logger.debug('Restored existing session:', session.id);
          } catch (error) {
            logger.warn('Failed to restore session, creating new one');
            session = get().createSession();
          }
        } else {
          session = get().createSession();
          logger.debug('Created new session:', session.id);
        }

        // 2. Get current user and update session
        logger.debug('Getting current user...');
        const { data: { user } } = await supabase.auth.getUser();
        logger.debug('User result:', { userId: user?.id, email: user?.email });
        
        if (user) {
          session = {
            ...session,
            userId: user.id,
            isGuest: false,
            lastActivityAt: new Date()
          };
          localStorage.setItem(CART_STORAGE_KEYS.CART_SESSION, JSON.stringify(session));
        }

        set(prev => ({ 
          ...prev, 
          session, 
          currentUserId: user?.id || null 
        }));

        // 3. Always sync with server if user is authenticated and online
        if (user && navigator.onLine) {
          logger.debug('Loading cart from database (ignoring localStorage to ensure fresh state)...');
          await get().syncWithServer();
        } else {
          // 4. Try to restore from localStorage only if user is offline/guest
          const restored = await get().restoreFromLocalStorage();
          
          if (restored) {
            logger.debug('Successfully recovered cart from localStorage (offline mode)');
          } else {
            logger.debug('Starting with empty cart');
          }
          
          set(prev => ({ 
            ...prev, 
            syncStatus: user ? 'offline' : 'guest'
          }));
        }

        set(prev => ({ 
          ...prev, 
          isInitialized: true, 
          isLoading: false 
        }));

        logger.debug('Enhanced initialization completed successfully');
        logger.info('Enhanced cart store initialized', { 
          userId: user?.id, 
          sessionId: session.id,
          itemCount: get().items.length,
          recoveredFromSession: get().recoveredFromSession
        });

        // 5. Setup online/offline listeners
        const handleOnline = () => {
          logger.debug('Network online - updating sync status');
          set(prev => ({ ...prev, isOnline: true, syncStatus: prev.currentUserId ? 'synced' : 'guest' }));
        };

        const handleOffline = () => {
          logger.debug('Network offline - switching to offline mode');
          set(prev => ({ ...prev, isOnline: false, syncStatus: 'offline' }));
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

      } catch (error) {
        logger.error('Enhanced initialization failed:', error);
        logger.error('Failed to initialize enhanced cart store', error);
        set(prev => ({ 
          ...prev, 
          isLoading: false, 
          syncStatus: 'error'
        }));
      }
    },

    // Recently deleted item management
    isRecentlyDeleted: (quoteId: string) => {
      const state = get();
      return state.recentlyDeleted.some(deleted => deleted.item.id === quoteId);
    },

    getRecentlyDeletedItem: (quoteId: string) => {
      const state = get();
      return state.recentlyDeleted.find(deleted => deleted.item.id === quoteId);
    },

    undoDeleteItem: async (quoteId: string) => {
      const state = get();
      logger.debug(`undoDeleteItem called for: ${quoteId}`);
      
      const recentlyDeletedItem = state.recentlyDeleted.find(deleted => deleted.item.id === quoteId);
      if (!recentlyDeletedItem) {
        logger.debug('Item not found in recently deleted');
        return;
      }

      try {
        // Remove from recently deleted list
        set(prev => ({
          ...prev,
          recentlyDeleted: prev.recentlyDeleted.filter(deleted => deleted.item.id !== quoteId)
        }));

        // Add back to cart at original position
        const restoredItem = {
          ...recentlyDeletedItem.item,
          lastUpdated: new Date()
        };
        
        set(prev => {
          const newItems = [...prev.items];
          // Insert at original position, or at end if position is invalid
          const insertPosition = Math.min(recentlyDeletedItem.position, newItems.length);
          newItems.splice(insertPosition, 0, restoredItem);
          
          return {
            ...prev,
            items: newItems
          };
        });

        console.log(`[CART STORE] Item restored to position ${recentlyDeletedItem.position}`);

        // Update database
        const { error } = await supabase
          .from('quotes_v2')
          .update({ in_cart: true })
          .eq('id', quoteId);

        if (error) {
          logger.error('Database restore failed, reverting:', error);
          // Revert the restore
          set(prev => ({
            ...prev,
            items: prev.items.filter(item => item.id !== quoteId),
            recentlyDeleted: [...prev.recentlyDeleted, recentlyDeletedItem]
          }));
          throw new Error(`Failed to restore item: ${error.message}`);
        }

        logger.debug('Item successfully restored to cart');
        logger.info('Item restored from recently deleted', { 
          quoteId, 
          position: recentlyDeletedItem.position 
        });

        // Save to localStorage
        get().saveToLocalStorage();

      } catch (error) {
        logger.error('Undo delete item failed:', error);
        logger.error('Failed to undo delete item', { quoteId, error });
        throw error;
      }
    },

    clearRecentlyDeleted: (quoteId?: string) => {
      if (quoteId) {
        // Clear specific item
        set(prev => ({
          ...prev,
          recentlyDeleted: prev.recentlyDeleted.filter(deleted => deleted.item.id !== quoteId)
        }));
      } else {
        // Clear all
        set(prev => ({ ...prev, recentlyDeleted: [] }));
      }
    },

    // Save snapshot for undo/redo
    saveSnapshot: (operation: string, operationData?: any) => {
      const state = get();
      console.log(`[CART STORE] Saving snapshot for operation: ${operation}`);
      
      const snapshot: CartSnapshot = {
        items: JSON.parse(JSON.stringify(state.items)), // Deep copy
        timestamp: new Date(),
        operation,
        operationData
      };
      
      set(prev => {
        // Remove any redo history if we're not at the end
        const newHistory = prev.historyIndex === prev.history.length - 1 
          ? [...prev.history]
          : prev.history.slice(0, prev.historyIndex + 1);
        
        // Add new snapshot
        newHistory.push(snapshot);
        
        // Limit history size
        if (newHistory.length > prev.maxHistorySize) {
          newHistory.shift();
        }
        
        return {
          ...prev,
          history: newHistory,
          historyIndex: newHistory.length - 1,
          lastOperation: operation
        };
      });
    },

    // Undo/Redo utilities
    canUndo: () => {
      const state = get();
      return state.historyIndex > 0;
    },

    canRedo: () => {
      const state = get();
      return state.historyIndex < state.history.length - 1;
    },

    // Undo operation
    undo: async () => {
      const state = get();
      logger.debug('Undo operation triggered');
      
      if (!state.canUndo()) {
        logger.debug('Cannot undo - no history available');
        return;
      }

      try {
        const previousSnapshot = state.history[state.historyIndex - 1];
        logger.debug(`Undoing to snapshot: ${previousSnapshot.operation}`);
        
        // Update state to previous snapshot
        set(prev => ({
          ...prev,
          items: JSON.parse(JSON.stringify(previousSnapshot.items)), // Deep copy
          historyIndex: prev.historyIndex - 1,
          lastOperation: `undo_${previousSnapshot.operation}`
        }));

        // Sync database state to match the undo
        const itemIds = previousSnapshot.items.map(item => item.id);
        const currentItemIds = state.items.map(item => item.id);
        
        // Items that were removed by undo (need to set in_cart = false)
        const removedItems = currentItemIds.filter(id => !itemIds.includes(id));
        
        // Items that were added by undo (need to set in_cart = true)
        const addedItems = itemIds.filter(id => !currentItemIds.includes(id));

        if (removedItems.length > 0) {
          const { error: removeError } = await supabase
            .from('quotes_v2')
            .update({ in_cart: false })
            .in('id', removedItems);
            
          if (removeError) {
            logger.error('Failed to sync removed items during undo:', removeError);
          }
        }

        if (addedItems.length > 0) {
          const { error: addError } = await supabase
            .from('quotes_v2')
            .update({ in_cart: true })
            .in('id', addedItems);
            
          if (addError) {
            logger.error('Failed to sync added items during undo:', addError);
          }
        }

        logger.debug('Undo completed successfully');
        logger.info('Cart undo operation completed', {
          previousOperation: previousSnapshot.operation,
          itemsRemoved: removedItems.length,
          itemsAdded: addedItems.length
        });
        
        // Auto-save to localStorage
        get().saveToLocalStorage();
        
      } catch (error) {
        logger.error('Undo operation failed:', error);
        logger.error('Cart undo operation failed', error);
        throw error;
      }
    },

    // Redo operation
    redo: async () => {
      const state = get();
      logger.debug('Redo operation triggered');
      
      if (!state.canRedo()) {
        logger.debug('Cannot redo - no future history available');
        return;
      }

      try {
        const nextSnapshot = state.history[state.historyIndex + 1];
        logger.debug(`Redoing to snapshot: ${nextSnapshot.operation}`);
        
        // Update state to next snapshot
        set(prev => ({
          ...prev,
          items: JSON.parse(JSON.stringify(nextSnapshot.items)), // Deep copy
          historyIndex: prev.historyIndex + 1,
          lastOperation: `redo_${nextSnapshot.operation}`
        }));

        // Sync database state to match the redo
        const itemIds = nextSnapshot.items.map(item => item.id);
        const currentItemIds = state.items.map(item => item.id);
        
        // Items that were removed by redo (need to set in_cart = false)
        const removedItems = currentItemIds.filter(id => !itemIds.includes(id));
        
        // Items that were added by redo (need to set in_cart = true)
        const addedItems = itemIds.filter(id => !currentItemIds.includes(id));

        if (removedItems.length > 0) {
          const { error: removeError } = await supabase
            .from('quotes_v2')
            .update({ in_cart: false })
            .in('id', removedItems);
            
          if (removeError) {
            logger.error('Failed to sync removed items during redo:', removeError);
          }
        }

        if (addedItems.length > 0) {
          const { error: addError } = await supabase
            .from('quotes_v2')
            .update({ in_cart: true })
            .in('id', addedItems);
            
          if (addError) {
            logger.error('Failed to sync added items during redo:', addError);
          }
        }

        logger.debug('Redo completed successfully');
        logger.info('Cart redo operation completed', {
          nextOperation: nextSnapshot.operation,
          itemsRemoved: removedItems.length,
          itemsAdded: addedItems.length
        });
        
        // Auto-save to localStorage
        get().saveToLocalStorage();
        
      } catch (error) {
        logger.error('Redo operation failed:', error);
        logger.error('Cart redo operation failed', error);
        throw error;
      }
    },

    // Clear history
    clearHistory: () => {
      logger.debug('Clearing undo/redo history');
      set(prev => ({
        ...prev,
        history: [],
        historyIndex: -1,
        lastOperation: null
      }));
    },

    // Get history info
    getHistoryInfo: () => {
      const state = get();
      return {
        canUndo: state.canUndo(),
        canRedo: state.canRedo(),
        lastOperation: state.lastOperation
      };
    },

    // Add item with localStorage auto-save
    addItem: async (quote: Quote) => {
      const state = get();
      logger.debug('addItem called:', { 
        quoteId: quote.id, 
        displayId: quote.display_id,
        currentUserId: state.currentUserId,
        isAuthenticated: !!state.currentUserId
      });

      // Allow guest cart functionality
      // if (!state.currentUserId) {
      //   logger.error('User not authenticated');
      //   throw new Error('User not authenticated');
      // }

      // Check if already in cart
      if (state.items.some(item => item.id === quote.id)) {
        logger.debug('Item already in cart, skipping');
        logger.warn('Item already in cart', { quoteId: quote.id });
        return;
      }

      try {
        // PHASE 3 FIX: Comprehensive pre-operation validation
        logger.debug('Running pre-operation validation...');
        const { validateBeforeCartOperation, validateQuoteForCart, getCurrencyErrorMessage } = 
          await import('@/utils/cartCurrencyValidation');

        // Pre-operation validation
        const preValidation = await validateBeforeCartOperation('add', state.items, quote);
        
        if (!preValidation.canProceed) {
          logger.error('Pre-operation validation failed:', preValidation.issues);
          
          // Get user-friendly error message
          const quoteValidation = await validateQuoteForCart(quote);
          const userMessage = getCurrencyErrorMessage(quoteValidation);
          
          throw new Error(userMessage || preValidation.issues[0]);
        }

        if (preValidation.issues.length > 0) {
          logger.warn('Pre-operation validation warnings:', preValidation.issues);
          logger.warn('Cart add operation has warnings', {
            quoteId: quote.id,
            issues: preValidation.issues,
            recommendations: preValidation.recommendations
          });
        }

        // SIMPLIFIED: Basic validation only  
        logger.debug('Adding item to cart with origin currency...', {
          total_quote_origincurrency: quote.total_quote_origincurrency,
          final_total_origincurrency: quote.final_total_origincurrency,
          origin_country: quote.origin_country
        });

        // Create cart item with origin currency only (simplified)
        const originCurrency = getOriginCurrency(quote.origin_country);
        const newItem: CartItem = {
          id: quote.id,
          quote: {
            ...quote
            // No currency modification needed - use origin currency
          },
          addedAt: new Date(),
          lastUpdated: new Date(),
          metadata: {
            addedFrom: 'user',
            priceAtAdd: quote.total_quote_origincurrency || quote.final_total_origincurrency,
            currencyAtAdd: originCurrency, // Store origin currency
            originCountry: quote.origin_country
          }
        };

        logger.debug('Created new item with origin currency:', {
          metadata: newItem.metadata,
          originCurrency
        });

        set(prev => ({
          ...prev,
          items: [...prev.items, newItem]
        }));

        console.log(`[CART STORE] Optimistic update completed, cart now has ${get().items.length} items`);
        
        // Save snapshot for undo/redo BEFORE database operation
        get().saveSnapshot('add_item', { quote: { id: quote.id, display_id: quote.display_id || 'N/A' } });
        
        // Auto-save to localStorage
        get().saveToLocalStorage();

        // Update database
        logger.debug('Updating database...');
        const { error } = await supabase
          .from('quotes_v2')
          .update({ in_cart: true })
          .eq('id', quote.id);

        if (error) {
          logger.error('Database update failed, reverting optimistic update:', error);
          // Revert optimistic update AND remove from history
          set(prev => {
            const revertedItems = prev.items.filter(item => item.id !== quote.id);
            // Remove the snapshot we just added since operation failed
            const revertedHistory = prev.history.slice(0, -1);
            return {
              ...prev,
              items: revertedItems,
              history: revertedHistory,
              historyIndex: revertedHistory.length - 1
            };
          });
          
          logger.error('Failed to add item to cart - database error', { quoteId: quote.id, error });
          throw new Error(`Failed to add item to cart: ${error.message}`);
        }

        logger.debug('Item added successfully to database');
        logger.info('Item added to cart with origin currency', { 
          quoteId: quote.id,
          originCurrency,
          priceAtAdd: newItem.metadata.priceAtAdd
        });

      } catch (error) {
        logger.error('Failed to add item to cart:', error);
        logger.error('Failed to add item to cart', { quoteId: quote.id, error });
        throw error;
      }
    },

    // Remove item with enhanced error handling
    removeItem: async (quoteId: string) => {
      const state = get();
      logger.debug('removeItem called:', { quoteId, hasUser: !!state.currentUserId });
      
      if (!state.currentUserId) {
        logger.warn('Cannot remove item - user not authenticated', { quoteId });
        throw new Error('User not authenticated');
      }

      const originalItems = state.items;
      const itemIndex = originalItems.findIndex(item => item.id === quoteId);
      const item = originalItems[itemIndex];
      
      if (!item || itemIndex === -1) {
        logger.debug('Item not found in cart, skipping removal');
        return;
      }

      try {
        // Save snapshot BEFORE making changes
        get().saveSnapshot('remove_item', { 
          quote: { 
            id: item.quote.id, 
            display_id: item.quote.display_id || 'N/A',
            total: item.quote.total_quote_origincurrency
          } 
        });
        
        // Add to recently deleted with position info
        const recentlyDeletedItem: RecentlyDeletedItem = {
          item: { ...item },
          deletedAt: new Date(),
          position: itemIndex
        };
        
        // Clear any existing timeout for this item
        const existingIndex = state.recentlyDeleted.findIndex(deleted => deleted.item.id === quoteId);
        
        // Optimistic update - remove from cart and add to recently deleted
        set(prev => ({
          ...prev,
          items: prev.items.filter(item => item.id !== quoteId),
          recentlyDeleted: existingIndex !== -1 
            ? prev.recentlyDeleted.map((deleted, i) => i === existingIndex ? recentlyDeletedItem : deleted)
            : [...prev.recentlyDeleted, recentlyDeletedItem]
        }));

        console.log(`[CART STORE] Item moved to recently deleted at position ${itemIndex}`);
        
        // Set timeout to automatically clear recently deleted item
        setTimeout(() => {
          console.log(`[CART STORE] Auto-clearing recently deleted item: ${quoteId}`);
          get().clearRecentlyDeleted(quoteId);
        }, state.deletedItemTimeout);
        
        // Auto-save to localStorage
        get().saveToLocalStorage();

        // Update database
        logger.debug('Updating database to remove item...');
        const { error } = await supabase
          .from('quotes_v2')
          .update({ in_cart: false })
          .eq('id', quoteId);

        if (error) {
          logger.error('Database update failed, reverting removal:', error);
          // Revert optimistic update AND remove from history
          set(prev => {
            // Remove the snapshot we just added since operation failed
            const revertedHistory = prev.history.slice(0, -1);
            return {
              ...prev,
              items: originalItems,
              recentlyDeleted: prev.recentlyDeleted.filter(deleted => deleted.item.id !== quoteId),
              history: revertedHistory,
              historyIndex: revertedHistory.length - 1
            };
          });
          
          logger.error('Failed to remove item from cart - database error', { quoteId, error });
          throw new Error(`Failed to remove item from cart: ${error.message}`);
        }

        logger.debug('Item removed successfully from database');
        logger.info('Item removed from cart successfully', { quoteId, position: itemIndex });

      } catch (error) {
        logger.error('Remove item operation failed:', error);
        logger.error('Failed to remove item from cart', { quoteId, error });
        throw error;
      }
    },

    // Clear cart with enhanced error handling
    clearCart: async () => {
      const state = get();
      logger.debug('clearCart called:', { hasUser: !!state.currentUserId, itemCount: state.items.length });
      
      if (!state.currentUserId) {
        logger.warn('Cannot clear cart - user not authenticated');
        throw new Error('User not authenticated');
      }
      
      if (state.items.length === 0) {
        logger.debug('Cart already empty, skipping clear operation');
        return;
      }

      const originalItems = state.items;
      const itemIds = originalItems.map(item => item.id);

      try {
        // Save snapshot BEFORE making changes
        get().saveSnapshot('clear_cart', { 
          clearedItems: originalItems.map(item => ({
            id: item.quote.id,
            display_id: item.quote.display_id || 'N/A',
            total: item.quote.total_quote_origincurrency
          }))
        });
        
        // Optimistic update
        set(prev => ({ ...prev, items: [] }));

        logger.debug('Optimistic clear completed, cart now empty');
        
        // Auto-save to localStorage
        get().saveToLocalStorage();

        // Update database
        logger.debug('Updating database to clear all items...');
        const { error } = await supabase
          .from('quotes_v2')
          .update({ in_cart: false })
          .in('id', itemIds);

        if (error) {
          logger.error('Database update failed, reverting clear operation:', error);
          // Revert optimistic update AND remove from history
          set(prev => {
            // Remove the snapshot we just added since operation failed
            const revertedHistory = prev.history.slice(0, -1);
            return {
              ...prev,
              items: originalItems,
              history: revertedHistory,
              historyIndex: revertedHistory.length - 1
            };
          });
          
          logger.error('Failed to clear cart - database error', { itemCount: originalItems.length, error });
          throw new Error(`Failed to clear cart: ${error.message}`);
        }

        logger.debug('Cart cleared successfully from database');
        logger.info('Cart cleared successfully', { itemCount: originalItems.length });

      } catch (error) {
        logger.error('Clear cart operation failed:', error);
        logger.error('Failed to clear cart', error);
        throw error;
      }
    },

    // Sync with server
    syncWithServer: async () => {
      const state = get();
      logger.debug('syncWithServer called:', {
        currentUserId: state.currentUserId,
        syncStatus: state.syncStatus,
        currentItemCount: state.items.length
      });

      if (!state.currentUserId || state.syncStatus === 'syncing') {
        logger.debug('Sync skipped - no user or already syncing');
        return;
      }

      try {
        // PHASE 3 FIX: Pre-operation validation for sync
        logger.debug('Running pre-sync validation...');
        const { validateBeforeCartOperation } = await import('@/utils/cartCurrencyValidation');

        const preValidation = await validateBeforeCartOperation('sync', state.items);
        
        if (preValidation.issues.length > 0) {
          logger.warn('Pre-sync validation warnings:', preValidation.issues);
          logger.warn('Cart sync operation has warnings', {
            issues: preValidation.issues,
            recommendations: preValidation.recommendations
          });
        }

        logger.debug('Starting server sync...');
        set(prev => ({ ...prev, syncStatus: 'syncing' }));

        // Get current user to check both customer_id and customer_email (like RLS policies)
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          logger.debug('No authenticated user found for sync');
          set(prev => ({ ...prev, items: [], syncStatus: 'guest' }));
          return;
        }

        logger.debug('Syncing cart for user:', { 
          userId: user.id, 
          email: user.email,
          storedUserId: state.currentUserId 
        });

        // Query matches RLS policy logic: check both customer_id and customer_email
        const { data: quotes, error } = await supabase
          .from('quotes_v2')
          .select('*')
          .eq('in_cart', true)
          .or(`customer_id.eq.${user.id},customer_email.eq.${user.email}`);

        logger.debug('Sync query result:', {
          success: !error,
          error: error?.message,
          quotesFound: quotes?.length || 0
        });

        if (error) throw error;

        const cartItems: CartItem[] = (quotes || []).map((quote, index) => {
          console.log(`[CART STORE] Sync processing quote ${index + 1}:`, {
            id: quote.id,
            display_id: quote.display_id,
            total_quote_origincurrency: quote.total_quote_origincurrency,
            final_total_origincurrency: quote.final_total_origincurrency,
            origin_country: quote.origin_country
          });

          const originCurrency = getOriginCurrency(quote.origin_country);
          return {
            id: quote.id,
            quote: {
              ...quote
              // No currency modification needed - use origin currency
            },
            addedAt: new Date(quote.created_at),
            lastUpdated: new Date(quote.updated_at),
            metadata: {
              addedFrom: 'sync',
              priceAtAdd: quote.total_quote_origincurrency || quote.final_total_origincurrency,
              currencyAtAdd: originCurrency, // Store origin currency
              originCountry: quote.origin_country
            }
          };
        });

        console.log(`[CART STORE] Sync created ${cartItems.length} cart items`);

        set(prev => ({
          ...prev,
          items: cartItems,
          syncStatus: 'synced'
        }));

        // Save snapshot for sync operation (only if items changed)
        const itemsChanged = JSON.stringify(state.items.map(i => i.id).sort()) !== JSON.stringify(cartItems.map(i => i.id).sort());
        if (itemsChanged) {
          get().saveSnapshot('sync_with_server', { 
            syncedItems: cartItems.map(item => ({
              id: item.quote.id,
              display_id: item.quote.display_id || 'N/A'
            }))
          });
        }
        
        logger.debug('Sync completed successfully');
        logger.debug('Final cart state:', {
          itemCount: cartItems.length,
          items: cartItems.map(item => ({
            id: item.id,
            quoteId: item.quote.id,
            displayId: item.quote.display_id,
            total: item.quote.total_quote_origincurrency
          }))
        });
        logger.info('Cart synced with server', { itemCount: cartItems.length });

        // PHASE 3 FIX: Post-sync integrity check
        try {
          logger.debug('Running post-sync integrity check...');
          await get().runIntegrityCheck();
        } catch (integrityError) {
          // Don't fail the sync operation if integrity check fails
          logger.warn('Post-sync integrity check failed (non-critical):', integrityError);
          logger.warn('Post-sync integrity check failed', { error: integrityError });
        }

      } catch (error) {
        logger.error('Sync failed:', error);
        logger.error('Failed to sync cart', error);
        set(prev => ({ ...prev, syncStatus: 'error' }));
        throw error;
      }
    },

    // Utilities
    hasItem: (quoteId: string) => {
      const hasItem = get().items.some(item => item.id === quoteId);
      // Removed excessive logging to prevent console spam
      return hasItem;
    },

    getItem: (quoteId: string) => {
      return get().items.find(item => item.id === quoteId);
    },

    getTotalCount: () => {
      return get().items.length;
    },

    getTotalValue: () => {
      const items = get().items;
      
      if (items.length === 0) {
        return 0;
      }

      // SIMPLIFIED: Return total in origin currencies (no conversion here)
      // UI components will handle conversion using CurrencyService + user preferences
      const currencySummary: Record<string, number> = {};
      
      items.forEach((item) => {
        // Use helper function to get correct total with calculation data fallback
        const priceUsed = getQuoteTotal(item.quote);
        
        // Use origin country to determine currency
        const originCurrency = getOriginCurrency(item.quote.origin_country);
        
        if (!currencySummary[originCurrency]) {
          currencySummary[originCurrency] = 0;
        }
        currencySummary[originCurrency] += priceUsed;
      });

      // For backward compatibility, return first currency total
      // UI components should use getTotalValueWithCurrency() for proper handling
      const currencies = Object.keys(currencySummary);
      if (currencies.length === 1) {
        return currencySummary[currencies[0]];
      }

      // Mixed currency cart - return sum (not ideal, but for backward compatibility)
      return Object.values(currencySummary).reduce((a, b) => a + b, 0);
    },

    // SIMPLIFIED: Get totals grouped by origin currency (no conversion in cart store)
    getTotalValueWithCurrency: () => {
      const items = get().items;
      
      if (items.length === 0) {
        return { totalsByCurrency: {}, isEmpty: true };
      }

      const totalsByCurrency: Record<string, number> = {};
      
      items.forEach((item) => {
        // Use helper function to get correct total with calculation data fallback
        const priceUsed = getQuoteTotal(item.quote);
        
        // Use origin country to determine currency (simplified approach)
        const originCurrency = getOriginCurrency(item.quote.origin_country);
        
        if (!totalsByCurrency[originCurrency]) {
          totalsByCurrency[originCurrency] = 0;
        }
        totalsByCurrency[originCurrency] += priceUsed;
      });
      
      return { 
        totalsByCurrency, 
        isEmpty: false,
        currencies: Object.keys(totalsByCurrency),
        isSingleCurrency: Object.keys(totalsByCurrency).length === 1
      };
    },

    // PHASE 3: Cart validation utilities
    validateCartIntegrity: async () => {
      logger.debug('Running cart integrity validation...');
      
      try {
        const { validateCartIntegrity } = await import('@/utils/cartCurrencyValidation');
        const items = get().items;
        
        const result = validateCartIntegrity(items);
        
        logger.debug('Cart integrity result:', {
          hasInconsistencies: result.hasInconsistencies,
          problematicItemCount: result.problematicItems.length,
          currencyCount: Object.keys(result.currencySummary).length
        });

        if (result.hasInconsistencies) {
          logger.warn('Cart integrity issues detected', {
            problematicItems: result.problematicItems.length,
            currencySummary: result.currencySummary,
            recommendations: result.recommendedActions
          });
        }

        return result;
      } catch (error) {
        logger.error('Cart integrity validation failed:', error);
        logger.error('Failed to validate cart integrity', error);
        throw error;
      }
    },

    runIntegrityCheck: async () => {
      logger.debug('Running comprehensive integrity check...');
      
      try {
        const integrity = await get().validateCartIntegrity();
        const { suggestCartFixes } = await import('@/utils/cartCurrencyValidation');
        
        // Get suggested fixes
        const fixes = await suggestCartFixes(get().items);
        
        logger.debug('Integrity check complete:', {
          hasInconsistencies: integrity.hasInconsistencies,
          canAutoFix: fixes.canAutoFix,
          suggestedActions: fixes.suggestedActions.length
        });

        // Log recommendations
        if (integrity.hasInconsistencies || !fixes.canAutoFix) {
          logger.warn('Cart needs attention:', {
            integrity: integrity.recommendedActions,
            fixes: fixes.suggestedActions
          });

          logger.info('Cart integrity check found issues', {
            hasInconsistencies: integrity.hasInconsistencies,
            canAutoFix: fixes.canAutoFix,
            problematicItems: fixes.requiresManualIntervention.length,
            recommendations: [...integrity.recommendedActions, ...fixes.suggestedActions]
          });
        } else {
          logger.debug('✅ Cart integrity check passed');
          logger.info('Cart integrity check passed - no issues found');
        }

      } catch (error) {
        logger.error('Integrity check failed:', error);
        logger.error('Failed to run cart integrity check', error);
        throw error;
      }
    },

    // Debug utilities
    debugCartState: () => {
      const state = get();
      console.log('🛒 CART DEBUG STATE:', {
        isInitialized: state.isInitialized,
        isLoading: state.isLoading,
        syncStatus: state.syncStatus,
        itemCount: state.items.length,
        currentUserId: state.currentUserId,
        session: state.session,
        // Undo/Redo info
        historyCount: state.history.length,
        historyIndex: state.historyIndex,
        canUndo: state.canUndo(),
        canRedo: state.canRedo(),
        lastOperation: state.lastOperation,
        items: state.items.map(item => ({
          id: item.id,
          quoteId: item.quote.id,
          displayId: item.quote.display_id,
          addedAt: item.addedAt,
          total: item.quote.total_quote_origincurrency
        }))
      });
    },

    forceSync: async () => {
      logger.debug('Forcing cart sync...');
      try {
        await get().syncWithServer();
        logger.debug('Forced sync completed');
      } catch (error) {
        logger.error('Forced sync failed', error);
      }
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
  const undo = useCartStore(state => state.undo);
  const redo = useCartStore(state => state.redo);
  
  return { addItem, removeItem, clearCart, syncWithServer, undo, redo };
};

// Undo/Redo hooks
export const useCartHistory = () => {
  const canUndo = useCartStore(state => state.canUndo());
  const canRedo = useCartStore(state => state.canRedo());
  const lastOperation = useCartStore(state => state.lastOperation);
  const historyCount = useCartStore(state => state.history.length);
  const undo = useCartStore(state => state.undo);
  const redo = useCartStore(state => state.redo);
  const clearHistory = useCartStore(state => state.clearHistory);
  
  return { 
    canUndo, 
    canRedo, 
    lastOperation, 
    historyCount, 
    undo, 
    redo, 
    clearHistory 
  };
};

// Recently deleted items hooks
export const useRecentlyDeleted = () => {
  const recentlyDeleted = useCartStore(state => state.recentlyDeleted);
  const isRecentlyDeleted = useCartStore(state => state.isRecentlyDeleted);
  const getRecentlyDeletedItem = useCartStore(state => state.getRecentlyDeletedItem);
  const undoDeleteItem = useCartStore(state => state.undoDeleteItem);
  const clearRecentlyDeleted = useCartStore(state => state.clearRecentlyDeleted);
  
  return { 
    recentlyDeleted,
    isRecentlyDeleted, 
    getRecentlyDeletedItem, 
    undoDeleteItem, 
    clearRecentlyDeleted 
  };
};

// Debug utilities
export const useCartDebug = () => {
  const debugCartState = useCartStore(state => state.debugCartState);
  const forceSync = useCartStore(state => state.forceSync);
  const getHistoryInfo = useCartStore(state => state.getHistoryInfo);
  
  return { debugCartState, forceSync, getHistoryInfo };
};

// Global debug utilities (for browser console)
if (typeof window !== 'undefined') {
  (window as any).debugCart = {
    getState: () => useCartStore.getState().debugCartState(),
    forceSync: () => useCartStore.getState().forceSync(),
    hasItem: (id: string) => useCartStore.getState().hasItem(id),
    // Undo/Redo utilities
    undo: () => useCartStore.getState().undo(),
    redo: () => useCartStore.getState().redo(),
    canUndo: () => useCartStore.getState().canUndo(),
    canRedo: () => useCartStore.getState().canRedo(),
    getHistory: () => useCartStore.getState().getHistoryInfo(),
    clearHistory: () => useCartStore.getState().clearHistory()
  };
}

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