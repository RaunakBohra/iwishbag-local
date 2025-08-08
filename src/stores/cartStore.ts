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

// Enhanced store state
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

        console.log('[CART STORE] Cart saved to localStorage');
      } catch (error) {
        console.error('[CART STORE] Failed to save to localStorage:', error);
        logger.error('Failed to save cart to localStorage', error);
      }
    },

    // Restore from localStorage
    restoreFromLocalStorage: async () => {
      try {
        const storedItems = localStorage.getItem(CART_STORAGE_KEYS.CART_ITEMS);
        const storedSession = localStorage.getItem(CART_STORAGE_KEYS.CART_SESSION);
        
        if (!storedItems) {
          console.log('[CART STORE] No stored cart items found');
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
            console.warn('[CART STORE] Failed to parse session, creating new one');
            session = get().createSession();
          }
        } else {
          session = get().createSession();
        }

        // Validate and restore items with currency fixes
        const validatedItems = await Promise.all(items.map(async (item) => {
          const { detectQuoteCurrency } = await import('@/utils/quoteCurrency');
          const currencyValidation = detectQuoteCurrency(item.quote);
          
          return {
            ...item,
            quote: {
              ...item.quote,
              customer_currency: currencyValidation.detectedCurrency
            },
            addedAt: new Date(item.addedAt),
            lastUpdated: new Date(item.lastUpdated)
          };
        }));

        set(prev => ({ 
          ...prev, 
          items: validatedItems, 
          session,
          recoveredFromSession: true
        }));

        console.log('[CART STORE] Successfully restored cart from localStorage:', {
          itemCount: validatedItems.length,
          sessionId: session.id
        });

        return true;
      } catch (error) {
        console.error('[CART STORE] Failed to restore from localStorage:', error);
        logger.error('Failed to restore cart from localStorage', error);
        return false;
      }
    },

    // Initialize
    initialize: async () => {
      const state = get();
      console.log('[CART STORE] Initialize called', { 
        isInitialized: state.isInitialized,
        isOnline: navigator.onLine 
      });
      
      if (state.isInitialized) {
        console.log('[CART STORE] Already initialized, skipping');
        return;
      }

      try {
        console.log('[CART STORE] Starting enhanced initialization...');
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
            console.log('[CART STORE] Restored existing session:', session.id);
          } catch (error) {
            console.warn('[CART STORE] Failed to restore session, creating new one');
            session = get().createSession();
          }
        } else {
          session = get().createSession();
          console.log('[CART STORE] Created new session:', session.id);
        }

        // 2. Get current user and update session
        console.log('[CART STORE] Getting current user...');
        const { data: { user } } = await supabase.auth.getUser();
        console.log('[CART STORE] User result:', { userId: user?.id, email: user?.email });
        
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

        // 3. Try to restore from localStorage first
        const restored = await get().restoreFromLocalStorage();
        
        if (restored) {
          console.log('[CART STORE] Successfully recovered cart from localStorage');
          set(prev => ({ 
            ...prev, 
            syncStatus: navigator.onLine ? (user ? 'synced' : 'guest') : 'offline'
          }));
        } else if (user && navigator.onLine) {
          // 4. Load from database if online and authenticated
          console.log('[CART STORE] Loading cart from database...');
          await get().syncWithServer();
        } else {
          console.log('[CART STORE] Starting with empty cart');
          set(prev => ({ 
            ...prev, 
            syncStatus: user ? (navigator.onLine ? 'synced' : 'offline') : 'guest' 
          }));
        }

        set(prev => ({ 
          ...prev, 
          isInitialized: true, 
          isLoading: false 
        }));

        console.log('[CART STORE] Enhanced initialization completed successfully');
        logger.info('Enhanced cart store initialized', { 
          userId: user?.id, 
          sessionId: session.id,
          itemCount: get().items.length,
          recoveredFromSession: get().recoveredFromSession
        });

        // 5. Setup online/offline listeners
        const handleOnline = () => {
          console.log('[CART STORE] Network online - updating sync status');
          set(prev => ({ ...prev, isOnline: true, syncStatus: prev.currentUserId ? 'synced' : 'guest' }));
        };

        const handleOffline = () => {
          console.log('[CART STORE] Network offline - switching to offline mode');
          set(prev => ({ ...prev, isOnline: false, syncStatus: 'offline' }));
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

      } catch (error) {
        console.error('[CART STORE] Enhanced initialization failed:', error);
        logger.error('Failed to initialize enhanced cart store', error);
        set(prev => ({ 
          ...prev, 
          isLoading: false, 
          syncStatus: 'error'
        }));
      }
    },

    // Add item with localStorage auto-save
    addItem: async (quote: Quote) => {
      const state = get();
      console.log('[CART STORE] addItem called:', { 
        quoteId: quote.id, 
        displayId: quote.display_id,
        currentUserId: state.currentUserId,
        isAuthenticated: !!state.currentUserId
      });

      // Allow guest cart functionality
      // if (!state.currentUserId) {
      //   console.error('[CART STORE] User not authenticated');
      //   throw new Error('User not authenticated');
      // }

      // Check if already in cart
      if (state.items.some(item => item.id === quote.id)) {
        console.log('[CART STORE] Item already in cart, skipping');
        logger.warn('Item already in cart', { quoteId: quote.id });
        return;
      }

      try {
        // PHASE 3 FIX: Comprehensive pre-operation validation
        console.log('[CART STORE] Running pre-operation validation...');
        const { validateBeforeCartOperation, validateQuoteForCart, getCurrencyErrorMessage } = 
          await import('@/utils/cartCurrencyValidation');

        // Pre-operation validation
        const preValidation = await validateBeforeCartOperation('add', state.items, quote);
        
        if (!preValidation.canProceed) {
          console.error('[CART STORE] Pre-operation validation failed:', preValidation.issues);
          
          // Get user-friendly error message
          const quoteValidation = await validateQuoteForCart(quote);
          const userMessage = getCurrencyErrorMessage(quoteValidation);
          
          throw new Error(userMessage || preValidation.issues[0]);
        }

        if (preValidation.issues.length > 0) {
          console.warn('[CART STORE] Pre-operation validation warnings:', preValidation.issues);
          logger.warn('Cart add operation has warnings', {
            quoteId: quote.id,
            issues: preValidation.issues,
            recommendations: preValidation.recommendations
          });
        }

        // PHASE 2 FIX: Smart currency detection and validation (enhanced)
        console.log('[CART STORE] Validating quote currency...');
        const { detectQuoteCurrency, shouldBlockQuoteFromCart, logCurrencyDetection } = 
          await import('@/utils/quoteCurrency');
        
        // Log currency detection for debugging
        logCurrencyDetection(quote, 'ADD_TO_CART');
        
        // Double-check blocking conditions (redundant but ensures safety)
        const blockCheck = shouldBlockQuoteFromCart(quote);
        if (blockCheck.blocked) {
          console.error('[CART STORE] Quote blocked from cart:', blockCheck.reason);
          throw new Error(`Cannot add to cart: ${blockCheck.reason}`);
        }

        // Get the correct currency for this quote
        const currencyValidation = detectQuoteCurrency(quote);
        const safeCurrency = currencyValidation.detectedCurrency;
        
        console.log('[CART STORE] Currency validation result:', {
          originalCurrency: quote.customer_currency,
          detectedCurrency: safeCurrency,
          isValid: currencyValidation.isValid,
          confidence: currencyValidation.confidence,
          issues: currencyValidation.issues
        });

        // Enhanced currency validation logging
        if (!currencyValidation.isValid) {
          logger.warn('Adding quote with currency issues to cart', {
            quoteId: quote.id,
            issues: currencyValidation.issues,
            originalCurrency: quote.customer_currency,
            correctedCurrency: safeCurrency,
            preValidationWarnings: preValidation.issues
          });
        }

        console.log('[CART STORE] Adding item to cart with validated currency...', {
          total_quote_origincurrency: quote.total_quote_origincurrency,
          final_total_origin: quote.final_total_origin,
          originalCurrency: quote.customer_currency,
          validatedCurrency: safeCurrency
        });

        // Create cart item with corrected currency information
        const newItem: CartItem = {
          id: quote.id,
          quote: {
            ...quote,
            // Use the validated/corrected currency
            customer_currency: safeCurrency
          },
          addedAt: new Date(),
          lastUpdated: new Date(),
          metadata: {
            addedFrom: 'user',
            priceAtAdd: quote.total_quote_origincurrency || quote.final_total_origin,
            currencyAtAdd: safeCurrency,
            originalCurrencyFromDB: quote.customer_currency, // Track original for debugging
            currencyValidation: {
              isValid: currencyValidation.isValid,
              confidence: currencyValidation.confidence,
              issues: currencyValidation.issues
            }
          }
        };

        console.log('[CART STORE] Created new item with corrected currency:', {
          metadata: newItem.metadata,
          quoteCurrency: newItem.quote.customer_currency
        });

        set(prev => ({
          ...prev,
          items: [...prev.items, newItem]
        }));

        console.log(`[CART STORE] Optimistic update completed, cart now has ${get().items.length} items`);
        
        // Auto-save to localStorage
        get().saveToLocalStorage();

        // Update database
        console.log('[CART STORE] Updating database...');
        const { error } = await supabase
          .from('quotes_v2')
          .update({ in_cart: true })
          .eq('id', quote.id);

        if (error) {
          console.error('[CART STORE] Database update failed, reverting optimistic update:', error);
          // Revert optimistic update
          set(prev => ({
            ...prev,
            items: prev.items.filter(item => item.id !== quote.id)
          }));
          throw error;
        }

        console.log('[CART STORE] Item added successfully to database');
        logger.info('Item added to cart with currency validation', { 
          quoteId: quote.id,
          originalCurrency: quote.customer_currency,
          validatedCurrency: safeCurrency,
          currencyIssues: currencyValidation.issues
        });

      } catch (error) {
        console.error('[CART STORE] Failed to add item to cart:', error);
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

        // Auto-save to localStorage
        get().saveToLocalStorage();

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

        // Auto-save to localStorage
        get().saveToLocalStorage();

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
      console.log('[CART STORE] syncWithServer called:', {
        currentUserId: state.currentUserId,
        syncStatus: state.syncStatus,
        currentItemCount: state.items.length
      });

      if (!state.currentUserId || state.syncStatus === 'syncing') {
        console.log('[CART STORE] Sync skipped - no user or already syncing');
        return;
      }

      try {
        // PHASE 3 FIX: Pre-operation validation for sync
        console.log('[CART STORE] Running pre-sync validation...');
        const { validateBeforeCartOperation } = await import('@/utils/cartCurrencyValidation');

        const preValidation = await validateBeforeCartOperation('sync', state.items);
        
        if (preValidation.issues.length > 0) {
          console.warn('[CART STORE] Pre-sync validation warnings:', preValidation.issues);
          logger.warn('Cart sync operation has warnings', {
            issues: preValidation.issues,
            recommendations: preValidation.recommendations
          });
        }

        console.log('[CART STORE] Starting server sync...');
        set(prev => ({ ...prev, syncStatus: 'syncing' }));

        const { data: quotes, error } = await supabase
          .from('quotes_v2')
          .select('*')
          .eq('in_cart', true)
          .eq('customer_id', state.currentUserId);

        console.log('[CART STORE] Sync query result:', {
          success: !error,
          error: error?.message,
          quotesFound: quotes?.length || 0
        });

        if (error) throw error;

        const cartItems: CartItem[] = await Promise.all((quotes || []).map(async (quote, index) => {
          console.log(`[CART STORE] Sync processing quote ${index + 1}:`, {
            id: quote.id,
            display_id: quote.display_id,
            total_quote_origincurrency: quote.total_quote_origincurrency,
            final_total_origin: quote.final_total_origin,
            customer_currency: quote.customer_currency
          });

          // PHASE 2 FIX: Apply smart currency detection during sync
          const { detectQuoteCurrency, logCurrencyDetection } = 
            await import('@/utils/quoteCurrency');
          
          // Log currency detection for debugging
          logCurrencyDetection(quote, 'CART_SYNC');
          
          // Get the correct currency for this quote
          const currencyValidation = detectQuoteCurrency(quote);
          const safeCurrency = currencyValidation.detectedCurrency;
          
          console.log(`[CART STORE] Sync quote ${index + 1} currency validation:`, {
            originalCurrency: quote.customer_currency,
            detectedCurrency: safeCurrency,
            isValid: currencyValidation.isValid,
            issues: currencyValidation.issues
          });

          // Warn if currency issues detected during sync
          if (!currencyValidation.isValid) {
            logger.warn('Cart sync found item with currency issues', {
              quoteId: quote.id,
              issues: currencyValidation.issues,
              originalCurrency: quote.customer_currency,
              correctedCurrency: safeCurrency
            });
          }

          return {
            id: quote.id,
            quote: {
              ...quote,
              // Use the validated/corrected currency
              customer_currency: safeCurrency
            },
            addedAt: new Date(quote.created_at),
            lastUpdated: new Date(quote.updated_at),
            metadata: {
              addedFrom: 'sync',
              priceAtAdd: quote.total_quote_origincurrency || quote.final_total_origin,
              currencyAtAdd: safeCurrency,
              originalCurrencyFromDB: quote.customer_currency, // Track original for debugging
              currencyValidation: {
                isValid: currencyValidation.isValid,
                confidence: currencyValidation.confidence,
                issues: currencyValidation.issues
              }
            }
          };
        }));

        console.log(`[CART STORE] Sync created ${cartItems.length} cart items`);

        set(prev => ({
          ...prev,
          items: cartItems,
          syncStatus: 'synced'
        }));

        console.log('[CART STORE] Sync completed successfully');
        logger.info('Cart synced with server', { itemCount: cartItems.length });

        // PHASE 3 FIX: Post-sync integrity check
        try {
          console.log('[CART STORE] Running post-sync integrity check...');
          await get().runIntegrityCheck();
        } catch (integrityError) {
          // Don't fail the sync operation if integrity check fails
          console.warn('[CART STORE] Post-sync integrity check failed (non-critical):', integrityError);
          logger.warn('Post-sync integrity check failed', { error: integrityError });
        }

      } catch (error) {
        console.error('[CART STORE] Sync failed:', error);
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
      const items = get().items;
      
      console.log(`[CART STORE] getTotalValue called with ${items.length} items:`);
      
      if (items.length === 0) {
        console.log(`[CART STORE] Empty cart, returning 0`);
        return 0;
      }

      // PHASE 2 FIX: Handle multi-currency cart properly
      const currencySummary: Record<string, number> = {};
      
      items.forEach((item, index) => {
        const priceOrigin = item.quote.total_quote_origincurrency;
        const priceFinal = item.quote.final_total_origin;
        const priceUsed = priceOrigin || priceFinal || 0;
        const currency = item.quote.customer_currency || 'USD';
        
        console.log(`[CART STORE] Item ${index + 1}:`, {
          quoteId: item.quote.id,
          displayId: item.quote.display_id,
          currency: currency,
          total_quote_origincurrency: priceOrigin,
          final_total_origin: priceFinal,
          priceUsed: priceUsed,
          correctedFromOriginal: item.metadata?.originalCurrencyFromDB,
          metadata: item.metadata
        });
        
        // Group by currency
        if (!currencySummary[currency]) {
          currencySummary[currency] = 0;
        }
        currencySummary[currency] += priceUsed;
      });

      console.log(`[CART STORE] Currency breakdown:`, currencySummary);

      // For backward compatibility, if all items are in USD, return the USD total
      const currencies = Object.keys(currencySummary);
      if (currencies.length === 1 && currencies[0] === 'USD') {
        const total = currencySummary['USD'];
        console.log(`[CART STORE] All items in USD, returning total: ${total}`);
        return total;
      }

      // For mixed currencies, we need to convert to a common base currency
      // This is a temporary solution - the useCart hook will handle proper conversion
      if (currencies.length === 1) {
        // Single currency cart (non-USD)
        const currency = currencies[0];
        const total = currencySummary[currency];
        console.log(`[CART STORE] Single currency (${currency}) cart, total: ${total}`);
        return total;
      }

      // Mixed currency cart - this should be handled by the useCart hook
      console.warn(`[CART STORE] Mixed currency cart detected:`, currencySummary);
      console.log(`[CART STORE] Returning sum of all amounts (will need conversion): ${Object.values(currencySummary).reduce((a, b) => a + b, 0)}`);
      return Object.values(currencySummary).reduce((a, b) => a + b, 0);
    },

    // PHASE 2 FIX: New method to get currency-aware totals
    getTotalValueWithCurrency: () => {
      const items = get().items;
      
      console.log(`[CART STORE] getTotalValueWithCurrency called with ${items.length} items:`);
      
      if (items.length === 0) {
        return { totalsByCurrency: {}, isEmpty: true };
      }

      const totalsByCurrency: Record<string, number> = {};
      
      items.forEach((item, index) => {
        const priceOrigin = item.quote.total_quote_origincurrency;
        const priceFinal = item.quote.final_total_origin;
        const priceUsed = priceOrigin || priceFinal || 0;
        const currency = item.quote.customer_currency || 'USD';
        
        console.log(`[CART STORE] Item ${index + 1} for currency breakdown:`, {
          quoteId: item.quote.id,
          currency: currency,
          priceUsed: priceUsed
        });
        
        if (!totalsByCurrency[currency]) {
          totalsByCurrency[currency] = 0;
        }
        totalsByCurrency[currency] += priceUsed;
      });

      console.log(`[CART STORE] Currency-aware totals:`, totalsByCurrency);
      
      return { 
        totalsByCurrency, 
        isEmpty: false,
        currencies: Object.keys(totalsByCurrency),
        isSingleCurrency: Object.keys(totalsByCurrency).length === 1
      };
    },

    // PHASE 3: Cart validation utilities
    validateCartIntegrity: async () => {
      console.log('[CART STORE] Running cart integrity validation...');
      
      try {
        const { validateCartIntegrity } = await import('@/utils/cartCurrencyValidation');
        const items = get().items;
        
        const result = validateCartIntegrity(items);
        
        console.log('[CART STORE] Cart integrity result:', {
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
        console.error('[CART STORE] Cart integrity validation failed:', error);
        logger.error('Failed to validate cart integrity', error);
        throw error;
      }
    },

    runIntegrityCheck: async () => {
      console.log('[CART STORE] Running comprehensive integrity check...');
      
      try {
        const integrity = await get().validateCartIntegrity();
        const { suggestCartFixes } = await import('@/utils/cartCurrencyValidation');
        
        // Get suggested fixes
        const fixes = await suggestCartFixes(get().items);
        
        console.log('[CART STORE] Integrity check complete:', {
          hasInconsistencies: integrity.hasInconsistencies,
          canAutoFix: fixes.canAutoFix,
          suggestedActions: fixes.suggestedActions.length
        });

        // Log recommendations
        if (integrity.hasInconsistencies || !fixes.canAutoFix) {
          console.warn('[CART STORE] Cart needs attention:', {
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
          console.log('[CART STORE] ✅ Cart integrity check passed');
          logger.info('Cart integrity check passed - no issues found');
        }

      } catch (error) {
        console.error('[CART STORE] Integrity check failed:', error);
        logger.error('Failed to run cart integrity check', error);
        throw error;
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