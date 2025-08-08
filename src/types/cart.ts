/**
 * Cart System Types - Ultimate Cart Implementation
 * Simple yet advanced, easy to use and maintain, built for growth
 */

import type { Database } from '@/integrations/supabase/types';

export type Quote = Database['public']['Tables']['quotes']['Row'];

export interface CartItem {
  id: string;
  quote: Quote;
  addedAt: Date;
  lastUpdated: Date;
  metadata?: {
    addedFrom?: 'dashboard' | 'quote-details' | 'bulk-action';
    userAgent?: string;
    priceAtAdd?: number; // Track price changes
    currencyAtAdd?: string;
  };
}

export interface CartMetadata {
  lastSync: Date | null;
  totalItems: number;
  totalValueUSD: number;
  totalValueDisplay: number;
  displayCurrency: string;
  estimatedShipping?: number;
  estimatedTax?: number;
  conflictResolution?: {
    strategy: 'server-wins' | 'client-wins' | 'merge' | 'prompt-user';
    lastConflict?: Date;
  };
}

export interface CartSnapshot {
  id: string;
  timestamp: Date;
  items: CartItem[];
  metadata: CartMetadata;
  action: string; // 'add', 'remove', 'clear', 'sync'
  description?: string;
}

export type CartSyncStatus = 'synced' | 'syncing' | 'conflict' | 'offline' | 'error';

export interface CartState {
  items: CartItem[];
  metadata: CartMetadata;
  syncStatus: CartSyncStatus;
  history: CartSnapshot[];
  maxHistorySize: number;
  
  // Performance tracking
  analytics?: {
    addCount: number;
    removeCount: number;
    syncCount: number;
    averageResponseTime: number;
    lastOptimization?: Date;
  };
}

export interface CartRule {
  id: string;
  name: string;
  priority: number; // Higher number = higher priority
  condition: (cart: CartState) => boolean;
  action: (cart: CartState) => Promise<Partial<CartState>> | Partial<CartState>;
  enabled: boolean;
}

export interface CartEvent {
  type: 'item_added' | 'item_removed' | 'cart_cleared' | 'sync_started' | 'sync_completed' | 'conflict_detected' | 'rule_applied';
  payload: any;
  timestamp: Date;
  source: 'user' | 'system' | 'sync' | 'rule';
}

export interface CartMiddleware {
  name: string;
  before?: (event: CartEvent, state: CartState) => Promise<void> | void;
  after?: (event: CartEvent, state: CartState, result: any) => Promise<void> | void;
}

export interface CartAnalytics {
  totalItems: number;
  totalValue: number;
  averageItemValue: number;
  addedToday: number;
  conversionPotential: number; // 0-100 score
  recommendedActions: string[];
  performanceMetrics: {
    avgSyncTime: number;
    successRate: number;
    errorRate: number;
  };
}

export interface CartConfiguration {
  maxItems?: number;
  autoSync?: boolean;
  syncInterval?: number; // milliseconds
  enableAnalytics?: boolean;
  enableHistory?: boolean;
  maxHistorySize?: number;
  rules?: CartRule[];
  middleware?: CartMiddleware[];
  persistenceLayer?: 'memory' | 'localStorage' | 'database' | 'all';
}

// Hook return types
export interface UseCartReturn {
  // State
  cart: CartState;
  items: CartItem[];
  metadata: CartMetadata;
  syncStatus: CartSyncStatus;
  isLoading: boolean;
  
  // Actions
  addItem: (quote: Quote, metadata?: Partial<CartItem['metadata']>) => Promise<void>;
  removeItem: (quoteId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  
  // Sync
  syncWithServer: () => Promise<void>;
  forceSyncToServer: () => Promise<void>;
  
  // Utilities
  hasItem: (quoteId: string) => boolean;
  getItem: (quoteId: string) => CartItem | undefined;
  getTotalValue: (currency?: string) => number;
  
  // Analytics
  getAnalytics: () => CartAnalytics;
}

export interface UseCartItemReturn {
  item: CartItem | undefined;
  isInCart: boolean;
  isLoading: boolean;
  
  // Actions
  add: (metadata?: Partial<CartItem['metadata']>) => Promise<void>;
  remove: () => Promise<void>;
  toggle: () => Promise<void>;
}

export interface UseCartSyncReturn {
  syncStatus: CartSyncStatus;
  lastSync: Date | null;
  conflictCount: number;
  
  // Actions
  sync: () => Promise<void>;
  resolveConflicts: (strategy: CartMetadata['conflictResolution']['strategy']) => Promise<void>;
  
  // History
  canUndo: boolean;
  canRedo: boolean;
  undo: () => void;
  redo: () => void;
  history: CartSnapshot[];
}