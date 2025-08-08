/**
 * Cart Domain Types - Shopping cart and checkout types
 * Consolidates cart, checkout, and order-related interfaces
 */

import { BaseEntity, EntityWithUser, Money, Status } from './common';
import { Quote } from './quote';
import { Address } from './common';
import { PaymentGateway } from './payment';

// Core Cart Types
export interface CartItem {
  id: string;
  quote: Quote;
  addedAt: Date;
  lastUpdated: Date;
  quantity?: number; // For future multi-quantity support
  metadata?: CartItemMetadata;
}

export interface CartItemMetadata {
  addedFrom?: 'dashboard' | 'quote-details' | 'bulk-action' | 'quote-list';
  userAgent?: string;
  priceAtAdd?: number; // Track price changes
  currencyAtAdd?: string;
  notes?: string;
  tags?: string[];
}

// Cart State Management
export interface CartState {
  items: CartItem[];
  metadata: CartMetadata;
  syncStatus: CartSyncStatus;
  isLoading: boolean;
  error?: string;
}

export interface CartMetadata {
  lastSync: Date | null;
  totalItems: number;
  totalValueUSD: number;
  totalValueDisplay: number;
  displayCurrency: string;
  estimatedShipping?: number;
  estimatedTax?: number;
  estimatedTotal?: number;
  lastUpdated: Date;
  version: number; // For conflict resolution
}

export type CartSyncStatus = 
  | 'idle' 
  | 'syncing' 
  | 'success' 
  | 'error' 
  | 'conflict';

// Cart Operations
export interface CartOperation {
  type: 'add' | 'remove' | 'update' | 'clear';
  itemId?: string;
  quote?: Quote;
  metadata?: any;
  timestamp: Date;
}

export interface CartEvent {
  type: string;
  payload: any;
  metadata: {
    timestamp: Date;
    source: string;
    userId?: string;
  };
}

// Checkout Types
export interface CheckoutData {
  items: CartItem[];
  contactInfo: ContactInfo;
  shippingAddress: Address;
  billingAddress?: Address;
  paymentMethod: PaymentGateway;
  orderNotes?: string;
  totalSummary: OrderSummary;
}

export interface ContactInfo {
  email: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  subscribe?: boolean;
}

export interface OrderSummary {
  itemsTotal: number;
  shippingTotal: number;
  taxesTotal: number;
  serviceFeesTotal: number;
  discountTotal?: number;
  finalTotal: number;
  currency: string;
  savings?: number;
}

// Order Types
export interface Order extends EntityWithUser {
  order_number: string;
  quote_ids: string[];
  
  // Status and Lifecycle
  status: OrderStatus;
  order_date: string;
  estimated_delivery?: string;
  actual_delivery?: string;
  
  // Financial Information
  total_amount: number;
  currency: string;
  payment_status: PaymentStatus;
  payment_method: string;
  
  // Customer Information
  customer_email: string;
  customer_name?: string;
  contact_phone?: string;
  
  // Addresses
  shipping_address: Address;
  billing_address?: Address;
  
  // Order Details
  items: OrderItem[];
  order_notes?: string;
  special_instructions?: string;
  
  // Tracking and Fulfillment
  tracking_id?: string;
  tracking_url?: string;
  carrier?: string;
  
  // Administrative
  processed_by?: string;
  admin_notes?: string;
  tags?: string[];
  
  // Integration
  external_order_id?: string;
  source: OrderSource;
}

export type OrderStatus = 
  | 'pending_payment'
  | 'paid'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'refunded';

export type PaymentStatus = 
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'refunded'
  | 'partially_refunded';

export type OrderSource = 
  | 'web'
  | 'mobile'
  | 'api'
  | 'admin'
  | 'bulk_import';

export interface OrderItem extends BaseEntity {
  order_id: string;
  quote_id: string;
  
  // Product Details
  product_name: string;
  product_url?: string;
  product_image?: string;
  
  // Quantity and Pricing
  quantity: number;
  unit_price: number;
  total_price: number;
  currency: string;
  
  // Physical Properties
  weight: number;
  dimensions?: string;
  
  // Status
  status: OrderItemStatus;
  fulfillment_status?: FulfillmentStatus;
  
  // Additional Data
  custom_notes?: string;
  metadata?: Record<string, any>;
}

export type OrderItemStatus = 
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'returned';

export type FulfillmentStatus = 
  | 'pending'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'exception';

// Cart Analytics
export interface CartAnalytics {
  abandonment_rate: number;
  average_items: number;
  average_value: Money;
  conversion_rate: number;
  most_added_quotes: QuoteStats[];
  popular_routes: RouteStats[];
  time_to_checkout: number; // average minutes
  seasonal_trends: SeasonalTrend[];
}

export interface QuoteStats {
  quote_id: string;
  quote_display_id: string;
  times_added: number;
  conversion_rate: number;
  average_time_in_cart: number; // minutes
}

export interface RouteStats {
  origin: string;
  destination: string;
  frequency: number;
  average_value: Money;
  conversion_rate: number;
}

export interface SeasonalTrend {
  period: string; // 'Q1 2024', 'Dec 2023', etc.
  total_carts: number;
  abandoned_carts: number;
  completed_orders: number;
  average_value: Money;
}

// Cart Persistence
export interface CartPersistenceState {
  version: string;
  timestamp: Date;
  items: CartItem[];
  metadata: CartMetadata;
  checksum: string; // For integrity verification
}

// Cart Sync and Conflict Resolution
export interface CartSyncResult {
  success: boolean;
  conflicts?: CartConflict[];
  resolved_items: string[];
  error?: string;
  server_state?: CartItem[];
}

export interface CartConflict {
  item_id: string;
  conflict_type: 'price_changed' | 'status_changed' | 'removed' | 'version_mismatch';
  local_item: CartItem;
  server_item?: CartItem;
  resolution?: 'keep_local' | 'use_server' | 'merge' | 'manual';
  resolved?: boolean;
}

// Bulk Cart Operations
export interface BulkCartOperation {
  operation: 'add' | 'remove' | 'update';
  quote_ids: string[];
  options?: {
    skipValidation?: boolean;
    allowDuplicates?: boolean;
    preserveMetadata?: boolean;
  };
}

export interface BulkCartResult {
  success: boolean;
  processed_count: number;
  failed_items: BulkCartFailure[];
  new_items?: CartItem[];
  errors?: string[];
}

export interface BulkCartFailure {
  quote_id: string;
  reason: string;
  error_code: string;
  recoverable: boolean;
}

// Cart Optimization and Recommendations
export interface CartOptimization {
  recommended_additions: RecommendedItem[];
  cost_savings: CostSaving[];
  shipping_optimization: ShippingOptimization;
  consolidation_opportunities: ConsolidationOpportunity[];
}

export interface RecommendedItem {
  quote: Quote;
  reason: string;
  confidence_score: number;
  potential_savings: number;
  category: 'frequently_bought_together' | 'similar_route' | 'bulk_discount' | 'complementary';
}

export interface CostSaving {
  type: 'bulk_discount' | 'shipping_consolidation' | 'payment_method' | 'timing';
  description: string;
  potential_savings: Money;
  action_required: string;
  deadline?: Date;
}

export interface ShippingOptimization {
  current_cost: Money;
  optimized_cost: Money;
  savings: Money;
  recommendations: string[];
  consolidation_possible: boolean;
}

export interface ConsolidationOpportunity {
  items: string[]; // Cart item IDs
  savings: Money;
  description: string;
  action: 'combine_shipment' | 'bulk_order' | 'timing_optimization';
}

// Export utility functions type
export type CartUtilityFunctions = {
  calculateTotal: (items: CartItem[], currency: string) => Promise<OrderSummary>;
  validateItems: (items: CartItem[]) => CartValidationResult;
  optimizeShipping: (items: CartItem[]) => ShippingOptimization;
  detectConflicts: (local: CartItem[], server: CartItem[]) => CartConflict[];
  generateChecksum: (items: CartItem[]) => string;
};

export interface CartValidationResult {
  valid: boolean;
  invalid_items: string[];
  warnings: string[];
  errors: string[];
  total_valid_items: number;
  total_valid_value: Money;
}