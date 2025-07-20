// ============================================================================
// UNIFIED QUOTE SYSTEM - TypeScript Interfaces
// Smart JSONB structures for the nuclear-simplified quotes table
// ============================================================================

// Core Quote Item with Smart Metadata
export interface QuoteItem {
  id: string;
  name: string;
  url?: string;
  image?: string;
  options?: string;
  quantity: number;
  price_usd: number;
  weight_kg: number;
  smart_data: {
    weight_confidence: number; // 0-1 scale
    price_confidence: number; // 0-1 scale
    category_detected?: string;
    customs_suggestions: string[];
    optimization_hints: string[];
  };
}

// Financial Calculation Breakdown
export interface CalculationBreakdown {
  items_total: number;
  shipping: number;
  customs: number;
  taxes: number;
  fees: number;
  discount: number;
}

// Exchange Rate Information
export interface ExchangeRateInfo {
  rate: number;
  source: 'shipping_route' | 'country_settings';
  route_id?: number;
  confidence: number;
}

// Smart Optimization Suggestions
export interface SmartOptimization {
  type: 'shipping' | 'customs' | 'currency' | 'weight';
  suggestion: string;
  potential_savings: number;
  confidence: number;
}

// Complete Calculation Data JSONB
export interface CalculationData {
  breakdown: CalculationBreakdown;
  exchange_rate: ExchangeRateInfo;
  smart_optimizations: SmartOptimization[];
  legacy_breakdown?: Record<string, any>; // For migration compatibility
}

// Customer Information
export interface CustomerInfo {
  name?: string;
  email?: string;
  phone?: string;
  social_handle?: string;
}

// Shipping Address
export interface ShippingAddress {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postal: string;
  country: string;
  locked: boolean;
}

// Customer Data JSONB
export interface CustomerData {
  info: CustomerInfo;
  shipping_address: ShippingAddress;
}

// Customs Information
export interface CustomsInfo {
  category?: string;
  percentage: number;
  tier_suggestions: string[];
}

// Shipping Option (Enhanced with Smart Features)
export interface ShippingOption {
  id: string;
  carrier: string;
  name: string;
  cost_usd: number;
  days: string;
  confidence: number;
  restrictions: string[];
  tracking: boolean;
}

// Shipping Tracking Information
export interface ShippingTracking {
  carrier?: string;
  number?: string;
  location?: string;
  delivery_estimate?: string;
  updates: Array<{
    timestamp: string;
    status: string;
    location: string;
  }>;
}

// Smart Shipping Recommendations
export interface ShippingRecommendation {
  option_id: string;
  reason: string;
  savings_usd: number;
  trade_off: string;
}

// Shipping Information with Smart Options
export interface ShippingInfo {
  method: string;
  route_id?: number;
  delivery_days?: string;
  available_options: ShippingOption[];
  selected_option?: string;
  tracking?: ShippingTracking;
  smart_recommendations: ShippingRecommendation[];
}

// Payment Information
export interface PaymentInfo {
  method?: string;
  amount_paid: number;
  gateway_data?: Record<string, any>;
  reminders_sent: number;
  status: string;
  overpayment_amount?: number;
  reminder_sent_at?: string;
}

// Timeline Entry
export interface TimelineEntry {
  status: string;
  timestamp: string;
  user_id?: string;
  auto: boolean;
  notes?: string;
}

// Admin Information
export interface AdminInfo {
  notes?: string;
  priority: 'low' | 'normal' | 'high';
  flags: string[];
  rejection_reason?: string;
  rejection_details?: string;
  priority_auto?: boolean;
  order_display_id?: string;
}

// Complete Operational Data JSONB
export interface OperationalData {
  customs: CustomsInfo;
  shipping: ShippingInfo;
  payment: PaymentInfo;
  timeline: TimelineEntry[];
  admin: AdminInfo;
}

// Smart Suggestion
export interface SmartSuggestion {
  id: string;
  type: 'weight' | 'customs' | 'shipping' | 'price';
  message: string;
  action?: string;
  confidence: number;
  potential_impact: {
    cost_change?: number;
    time_change?: string;
    accuracy_improvement?: number;
  };
}

// Complete Unified Quote Interface
export interface UnifiedQuote {
  // Core Identity
  id: string;
  display_id: string;
  user_id?: string;
  
  // Business State
  status: string;
  origin_country: string;
  destination_country: string;
  
  // Smart Product System
  items: QuoteItem[];
  
  // Smart Financial System
  base_total_usd: number;
  final_total_usd: number;
  
  // Smart Metadata
  calculation_data: CalculationData;
  customer_data: CustomerData;
  operational_data: OperationalData;
  
  // System Core
  currency: string;
  in_cart: boolean;
  created_at: string;
  updated_at: string;
  
  // Smart Extensions
  smart_suggestions: SmartSuggestion[];
  weight_confidence: number;
  optimization_score: number;
  expires_at?: string;
  
  // Legacy Support (will be removed)
  share_token?: string;
  is_anonymous: boolean;
  internal_notes?: string;
  admin_notes?: string;
  quote_source: string;
}

// Helper Types for API Operations
export interface QuoteItemInput {
  name: string;
  url?: string;
  image?: string;
  options?: string;
  quantity: number;
  price_usd: number;
  weight_kg: number;
}

export interface QuoteCalculationInput {
  items: QuoteItemInput[];
  origin_country: string;
  destination_country: string;
  customer_data?: Partial<CustomerData>;
  customs_percentage?: number;
  shipping_preferences?: {
    speed_priority: 'low' | 'medium' | 'high';
    cost_priority: 'low' | 'medium' | 'high';
  };
}

export interface QuoteCalculationResult {
  success: boolean;
  quote: UnifiedQuote;
  smart_suggestions: SmartSuggestion[];
  shipping_options: ShippingOption[];
  error?: string;
}

// Database row type (matches actual PostgreSQL structure)
export interface UnifiedQuoteRow {
  id: string;
  display_id: string;
  user_id: string | null;
  status: string;
  origin_country: string;
  destination_country: string;
  items: any; // JSONB from database
  base_total_usd: number;
  final_total_usd: number;
  calculation_data: any; // JSONB from database
  customer_data: any; // JSONB from database
  operational_data: any; // JSONB from database
  currency: string;
  in_cart: boolean;
  created_at: string;
  updated_at: string;
  smart_suggestions: any; // JSONB from database
  weight_confidence: number;
  optimization_score: number;
  expires_at: string | null;
  share_token: string | null;
  is_anonymous: boolean;
  internal_notes: string | null;
  admin_notes: string | null;
  quote_source: string;
}

// Utility type for transforming database row to typed interface
export type UnifiedQuoteFromDB = {
  [K in keyof UnifiedQuoteRow]: K extends 'items' 
    ? QuoteItem[]
    : K extends 'calculation_data'
    ? CalculationData
    : K extends 'customer_data'
    ? CustomerData
    : K extends 'operational_data'
    ? OperationalData
    : K extends 'smart_suggestions'
    ? SmartSuggestion[]
    : UnifiedQuoteRow[K];
};

// Status type definitions
export type QuoteStatus = 
  | 'pending'
  | 'sent'
  | 'approved'
  | 'rejected'
  | 'expired'
  | 'calculated'
  | 'payment_pending'
  | 'processing'
  | 'paid'
  | 'ordered'
  | 'shipped'
  | 'completed'
  | 'cancelled';

// Priority levels
export type Priority = 'low' | 'normal' | 'high';

// Shipping method types
export type ShippingMethod = 'route-specific' | 'country_settings' | 'real-time';

// Currency codes (expandable)
export type CurrencyCode = 'USD' | 'INR' | 'NPR' | 'EUR' | 'GBP' | 'CAD' | 'AUD';

// Export all types for use throughout the application
export * from './shipping'; // Re-export existing shipping types for compatibility