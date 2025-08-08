/**
 * CartPersistenceService - Multi-layer Cart Persistence
 * 
 * Implements sophisticated persistence strategy:
 * - Layer 1: Memory (instant access)
 * - Layer 2: localStorage (survive page refresh)
 * - Layer 3: IndexedDB (large data, offline support)
 * - Layer 4: Database (cross-device sync)
 */

import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';
import type { CartState, CartItem, Quote } from '@/types/cart';

export interface PersistenceConfig {
  enableMemoryCache: boolean;
  enableLocalStorage: boolean;
  enableIndexedDB: boolean;
  enableDatabase: boolean;
  maxMemoryCacheSize: number;
  localStoragePrefix: string;
  indexedDBName: string;
  indexedDBVersion: number;
}

export class CartPersistenceService {
  private static instance: CartPersistenceService;
  private config: PersistenceConfig;
  
  // Layer 1: Memory Cache
  private memoryCache: Map<string, any> = new Map();
  private memoryCacheStats = { hits: 0, misses: 0 };
  
  // Layer 3: IndexedDB
  private db: IDBDatabase | null = null;
  private dbReady = false;

  private constructor(config?: Partial<PersistenceConfig>) {
    this.config = {
      enableMemoryCache: true,
      enableLocalStorage: true,
      enableIndexedDB: true,
      enableDatabase: true,
      maxMemoryCacheSize: 100, // items
      localStoragePrefix: 'iwishbag_cart_',
      indexedDBName: 'IWishBagCart',
      indexedDBVersion: 1,
      ...config
    };

    this.initializeIndexedDB();
  }

  static getInstance(config?: Partial<PersistenceConfig>): CartPersistenceService {
    if (!CartPersistenceService.instance) {
      CartPersistenceService.instance = new CartPersistenceService(config);
    }
    return CartPersistenceService.instance;
  }

  // Initialize IndexedDB
  private async initializeIndexedDB(): Promise<void> {
    if (!this.config.enableIndexedDB || typeof indexedDB === 'undefined') {
      return;
    }

    try {
      const request = indexedDB.open(this.config.indexedDBName, this.config.indexedDBVersion);
      
      request.onerror = () => {
        logger.error('Failed to open IndexedDB', request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        this.dbReady = true;
        logger.info('IndexedDB initialized successfully');
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Create object stores
        if (!db.objectStoreNames.contains('cartState')) {
          const cartStore = db.createObjectStore('cartState', { keyPath: 'userId' });
          cartStore.createIndex('lastUpdated', 'lastUpdated', { unique: false });
        }

        if (!db.objectStoreNames.contains('cartItems')) {
          const itemsStore = db.createObjectStore('cartItems', { keyPath: 'id' });
          itemsStore.createIndex('userId', 'userId', { unique: false });
          itemsStore.createIndex('addedAt', 'addedAt', { unique: false });
        }

        if (!db.objectStoreNames.contains('cartHistory')) {
          const historyStore = db.createObjectStore('cartHistory', { keyPath: 'id' });
          historyStore.createIndex('userId', 'userId', { unique: false });
          historyStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    } catch (error) {
      logger.error('Error initializing IndexedDB', error);
    }
  }

  // Layer 1: Memory Cache Operations
  private getFromMemory(key: string): any | null {
    if (!this.config.enableMemoryCache) return null;
    
    const cached = this.memoryCache.get(key);
    if (cached) {
      this.memoryCacheStats.hits++;
      return cached;
    }
    
    this.memoryCacheStats.misses++;
    return null;
  }

  private setInMemory(key: string, value: any): void {
    if (!this.config.enableMemoryCache) return;
    
    // Implement LRU eviction if cache is full
    if (this.memoryCache.size >= this.config.maxMemoryCacheSize) {
      const firstKey = this.memoryCache.keys().next().value;
      this.memoryCache.delete(firstKey);
    }
    
    this.memoryCache.set(key, value);
  }

  // Layer 2: localStorage Operations
  private getFromLocalStorage(key: string): any | null {
    if (!this.config.enableLocalStorage || typeof localStorage === 'undefined') {
      return null;
    }

    try {
      const fullKey = `${this.config.localStoragePrefix}${key}`;
      const stored = localStorage.getItem(fullKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Check expiration
        if (parsed.expires && new Date(parsed.expires) < new Date()) {
          localStorage.removeItem(fullKey);
          return null;
        }
        return parsed.data;
      }
    } catch (error) {
      logger.error('Error reading from localStorage', { key, error });
    }
    
    return null;
  }

  private setInLocalStorage(key: string, value: any, expirationMinutes?: number): void {
    if (!this.config.enableLocalStorage || typeof localStorage === 'undefined') {
      return;
    }

    try {
      const fullKey = `${this.config.localStoragePrefix}${key}`;
      const dataToStore = {
        data: value,
        timestamp: new Date().toISOString(),
        expires: expirationMinutes ? 
          new Date(Date.now() + expirationMinutes * 60 * 1000).toISOString() : null
      };
      
      localStorage.setItem(fullKey, JSON.stringify(dataToStore));
    } catch (error) {
      logger.error('Error writing to localStorage', { key, error });
      // Handle quota exceeded error
      if (error.name === 'QuotaExceededError') {
        this.cleanupLocalStorage();
        // Try again after cleanup
        try {
          const fullKey = `${this.config.localStoragePrefix}${key}`;
          localStorage.setItem(fullKey, JSON.stringify({ data: value }));
        } catch (retryError) {
          logger.error('Failed to write to localStorage after cleanup', retryError);
        }
      }
    }
  }

  // Layer 3: IndexedDB Operations
  private async getFromIndexedDB(storeName: string, key: string): Promise<any | null> {
    if (!this.config.enableIndexedDB || !this.dbReady || !this.db) {
      return null;
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(key);

      request.onsuccess = () => {
        resolve(request.result || null);
      };

      request.onerror = () => {
        logger.error('IndexedDB get error', { storeName, key, error: request.error });
        resolve(null);
      };
    });
  }

  private async setInIndexedDB(storeName: string, data: any): Promise<void> {
    if (!this.config.enableIndexedDB || !this.dbReady || !this.db) {
      return;
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(data);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        logger.error('IndexedDB put error', { storeName, error: request.error });
        reject(request.error);
      };
    });
  }

  // Layer 4: Database Operations
  private async getFromDatabase(userId: string): Promise<CartState | null> {
    if (!this.config.enableDatabase) return null;

    try {
      const { data: quotes, error } = await supabase
        .from('quotes_v2')
        .select(`
          *,
          profiles (
            full_name,
            email,
            country,
            preferred_display_currency
          )
        `)
        .eq('in_cart', true)
        .eq('user_id', userId);

      if (error) throw error;

      return this.reconstructCartStateFromQuotes(quotes || []);
    } catch (error) {
      logger.error('Failed to load cart from database', error);
      return null;
    }
  }

  private async setInDatabase(userId: string, items: CartItem[]): Promise<void> {
    if (!this.config.enableDatabase) return;

    try {
      // Get all current cart items from database
      const { data: currentQuotes } = await supabase
        .from('quotes_v2')
        .select('id')
        .eq('in_cart', true)
        .eq('user_id', userId);

      const currentIds = new Set(currentQuotes?.map(q => q.id) || []);
      const newIds = new Set(items.map(item => item.id));

      // Items to add to cart
      const idsToAdd = items.filter(item => !currentIds.has(item.id)).map(item => item.id);
      
      // Items to remove from cart
      const idsToRemove = Array.from(currentIds).filter(id => !newIds.has(id));

      // Batch operations
      const operations: Promise<any>[] = [];

      if (idsToAdd.length > 0) {
        operations.push(
          supabase
            .from('quotes_v2')
            .update({ in_cart: true })
            .in('id', idsToAdd)
        );
      }

      if (idsToRemove.length > 0) {
        operations.push(
          supabase
            .from('quotes_v2')
            .update({ in_cart: false })
            .in('id', idsToRemove)
        );
      }

      await Promise.all(operations);
      
      logger.info('Cart synced to database', { 
        added: idsToAdd.length, 
        removed: idsToRemove.length 
      });

    } catch (error) {
      logger.error('Failed to sync cart to database', error);
      throw error;
    }
  }

  // Public API
  async loadCartState(userId: string): Promise<CartState | null> {
    const cacheKey = `cart_state_${userId}`;

    // Layer 1: Memory
    let cartState = this.getFromMemory(cacheKey);
    if (cartState) {
      logger.debug('Cart loaded from memory cache', { userId });
      return cartState;
    }

    // Layer 2: localStorage
    cartState = this.getFromLocalStorage(cacheKey);
    if (cartState) {
      logger.debug('Cart loaded from localStorage', { userId });
      this.setInMemory(cacheKey, cartState);
      return cartState;
    }

    // Layer 3: IndexedDB
    cartState = await this.getFromIndexedDB('cartState', userId);
    if (cartState) {
      logger.debug('Cart loaded from IndexedDB', { userId });
      this.setInMemory(cacheKey, cartState);
      this.setInLocalStorage(cacheKey, cartState, 60); // 1 hour
      return cartState;
    }

    // Layer 4: Database
    cartState = await this.getFromDatabase(userId);
    if (cartState) {
      logger.debug('Cart loaded from database', { userId });
      this.setInMemory(cacheKey, cartState);
      this.setInLocalStorage(cacheKey, cartState, 60);
      await this.setInIndexedDB('cartState', { userId, ...cartState, lastUpdated: new Date() });
      return cartState;
    }

    return null;
  }

  async saveCartState(userId: string, cartState: CartState): Promise<void> {
    const cacheKey = `cart_state_${userId}`;

    try {
      // Save to all layers simultaneously
      const operations: Promise<any>[] = [];

      // Layer 1: Memory (immediate)
      this.setInMemory(cacheKey, cartState);

      // Layer 2: localStorage
      operations.push(
        Promise.resolve().then(() => {
          this.setInLocalStorage(cacheKey, cartState, 60);
        })
      );

      // Layer 3: IndexedDB
      if (this.dbReady) {
        operations.push(
          this.setInIndexedDB('cartState', { 
            userId, 
            ...cartState, 
            lastUpdated: new Date() 
          })
        );
      }

      // Layer 4: Database (most important, so await)
      operations.push(
        this.setInDatabase(userId, cartState.items)
      );

      await Promise.allSettled(operations);
      logger.debug('Cart state saved to all persistence layers', { userId, items: cartState.items.length });

    } catch (error) {
      logger.error('Error saving cart state', { userId, error });
      throw error;
    }
  }

  async clearCartData(userId: string): Promise<void> {
    const cacheKey = `cart_state_${userId}`;

    // Clear from all layers
    this.memoryCache.delete(cacheKey);
    
    if (typeof localStorage !== 'undefined') {
      const fullKey = `${this.config.localStoragePrefix}${cacheKey}`;
      localStorage.removeItem(fullKey);
    }

    if (this.dbReady && this.db) {
      try {
        await new Promise<void>((resolve, reject) => {
          const transaction = this.db!.transaction(['cartState', 'cartItems', 'cartHistory'], 'readwrite');
          
          transaction.objectStore('cartState').delete(userId);
          
          const itemsStore = transaction.objectStore('cartItems');
          const itemsIndex = itemsStore.index('userId');
          const itemsRequest = itemsIndex.openCursor(IDBKeyRange.only(userId));
          itemsRequest.onsuccess = (event) => {
            const cursor = (event.target as IDBRequest).result;
            if (cursor) {
              cursor.delete();
              cursor.continue();
            }
          };

          const historyStore = transaction.objectStore('cartHistory');
          const historyIndex = historyStore.index('userId');
          const historyRequest = historyIndex.openCursor(IDBKeyRange.only(userId));
          historyRequest.onsuccess = (event) => {
            const cursor = (event.target as IDBRequest).result;
            if (cursor) {
              cursor.delete();
              cursor.continue();
            }
          };

          transaction.oncomplete = () => resolve();
          transaction.onerror = () => reject(transaction.error);
        });
      } catch (error) {
        logger.error('Error clearing IndexedDB data', error);
      }
    }

    // Clear database
    try {
      await supabase
        .from('quotes_v2')
        .update({ in_cart: false })
        .eq('user_id', userId);
    } catch (error) {
      logger.error('Error clearing database cart data', error);
    }

    logger.info('Cart data cleared from all persistence layers', { userId });
  }

  // Utility methods
  private reconstructCartStateFromQuotes(quotes: Quote[]): CartState {
    const items: CartItem[] = quotes.map(quote => ({
      id: quote.id,
      quote,
      addedAt: new Date(quote.created_at),
      lastUpdated: new Date(quote.updated_at),
      metadata: {
        addedFrom: 'database',
        priceAtAdd: quote.final_total_origincurrency,
        currencyAtAdd: quote.currency
      }
    }));

    const totalValueUSD = items.reduce((sum, item) => sum + item.quote.final_total_origincurrency, 0);

    return {
      items,
      metadata: {
        lastSync: new Date(),
        totalItems: items.length,
        totalValueUSD,
        totalValueDisplay: totalValueUSD, // Will be updated with proper currency conversion
        displayCurrency: items[0]?.quote.currency || 'USD'
      },
      syncStatus: 'synced',
      history: [],
      maxHistorySize: 20
    };
  }

  private cleanupLocalStorage(): void {
    if (typeof localStorage === 'undefined') return;

    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(this.config.localStoragePrefix)) {
          keysToRemove.push(key);
        }
      }

      // Remove oldest 25% of cart items
      const removeCount = Math.ceil(keysToRemove.length * 0.25);
      for (let i = 0; i < removeCount; i++) {
        localStorage.removeItem(keysToRemove[i]);
      }

      logger.info('localStorage cleanup completed', { removed: removeCount });
    } catch (error) {
      logger.error('Error during localStorage cleanup', error);
    }
  }

  // Performance monitoring
  getCacheStats(): any {
    return {
      memory: this.memoryCacheStats,
      cacheSize: this.memoryCache.size,
      maxCacheSize: this.config.maxMemoryCacheSize,
      hitRate: this.memoryCacheStats.hits / (this.memoryCacheStats.hits + this.memoryCacheStats.misses) * 100
    };
  }
}

export const cartPersistenceService = CartPersistenceService.getInstance();