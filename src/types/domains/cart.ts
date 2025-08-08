/**
 * Cart Domain Types - Domain-specific cart interfaces
 */

import type { CartItem, Quote } from '@/types/cart';

/**
 * Cart persistence layer interface
 */
export interface CartPersistence {
  save: (items: CartItem[]) => Promise<void>;
  load: () => Promise<CartItem[]>;
  clear: () => Promise<void>;
  sync: () => Promise<boolean>;
}

/**
 * Cart validation result
 */
export interface CartValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
}

/**
 * Cart operation result
 */
export interface CartOperationResult {
  success: boolean;
  message: string;
  data?: any;
  error?: Error;
}

/**
 * Cart analytics data
 */
export interface CartAnalytics {
  totalItems: number;
  totalValue: number;
  averageItemValue: number;
  addedToday: number;
  conversionPotential: number;
  recommendedActions: string[];
  performanceMetrics: {
    avgSyncTime: number;
    successRate: number;
    errorRate: number;
  };
}

/**
 * Cart middleware function
 */
export type CartMiddleware = (
  operation: string,
  payload: any,
  next: () => Promise<any>
) => Promise<any>;

/**
 * Cart event
 */
export interface CartEvent {
  type: string;
  payload: any;
  timestamp: Date;
  userId?: string;
}

/**
 * Cart configuration
 */
export interface CartConfiguration {
  maxItems: number;
  syncInterval: number;
  enableAnalytics: boolean;
  enableOfflineMode: boolean;
  persistenceStrategy: 'memory' | 'localStorage' | 'indexedDB' | 'server';
}

export default {
  CartPersistence,
  CartValidationResult,
  CartOperationResult,
  CartAnalytics,
  CartMiddleware,
  CartEvent,
  CartConfiguration
};