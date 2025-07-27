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
  customer_notes?: string;
  quantity: number;
  costprice_origin: number; // Cost price in origin country currency (INR, NPR, etc.)
  weight: number; // Weight in kg

  // HSN Classification Fields
  hsn_code?: string;
  category?: string;

  smart_data: {
    weight_confidence: number; // 0-1 scale
    price_confidence: number; // 0-1 scale
    category_detected?: string;
    customs_suggestions: string[];
    optimization_hints: string[];
    // Enhanced weight tracking
    weight_source?: 'hsn' | 'ml' | 'manual';
    weight_suggestions?: {
      hsn_weight?: number;
      hsn_min?: number;
      hsn_max?: number;
      hsn_packaging?: number;
      ml_weight?: number;
      hsn_confidence?: number;
      ml_confidence?: number;
    };
  };
}

// Financial Calculation Breakdown (Transparent Tax Model)
export interface CalculationBreakdown {
  items_total: number; // Base product price (before purchase tax)
  merchant_shipping?: number; // Merchant to hub shipping cost
  purchase_tax?: number; // ✅ NEW: Origin country purchase tax (transparent)
  shipping: number; // International shipping cost
  customs: number; // Customs duty (calculated on actualItemCost base)
  destination_tax?: number; // ✅ NEW: Destination country VAT/GST only
  fees: number; // Payment gateway fees
  handling?: number; // Handling charges (separate from fees)
  insurance?: number; // Insurance amount (separate from fees)
  discount: number; // Applied discounts

  // Legacy field for backward compatibility (deprecated)
  taxes?: number; // @deprecated Use destination_tax instead
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
  // Tax calculation details
  tax_calculation?: {
    customs_percentage: number;
    customs_rate: number; // For compatibility
    sales_tax_rate: number;
    destination_tax_rate: number;
    method: string;
    valuation_method: string;
  };
  // HSN calculation metadata
  hsn_calculation?: any; // For HSN tax calculations
  // Valuation tracking
  valuation_applied?: any; // For valuation method tracking
  // Additional fields from SmartCalculationEngine
  sales_tax_price?: number; // Manual sales tax input
  discount?: number; // Discount amount
  [key: string]: any; // For other calculation data
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

// Customer Preferences for Route-Based Options
export interface CustomerPreferences {
  insurance_opted_in?: boolean;
  selected_insurance_coverage?: 'basic' | 'premium';
  handling_service_level?: 'standard' | 'premium';
  delivery_priority?: 'cost' | 'speed' | 'balance';
}

// Customer Profile Data from Auth
export interface CustomerProfile {
  avatar_url?: string;
  [key: string]: any; // For additional profile data
}

// Customer Data JSONB
export interface CustomerData {
  info: CustomerInfo;
  shipping_address: ShippingAddress;
  preferences?: CustomerPreferences;
  profile?: CustomerProfile;
}

// Customs Information
export interface CustomsInfo {
  category?: string;
  percentage: number;
  tier_suggestions: string[];
}

// Shipping Option (Enhanced with Smart Features)
// Route-based handling charge configuration
export interface RouteHandlingCharge {
  base_fee: number;
  percentage_of_value: number;
  min_fee: number;
  max_fee: number;
}

// Route-based insurance options
export interface RouteInsuranceOptions {
  available: boolean;
  default_enabled: boolean;
  coverage_percentage: number;
  min_fee: number;
  max_coverage: number;
  customer_description: string;
}

export interface ShippingOption {
  id: string;
  carrier: string;
  name: string;
  cost_usd: number;
  days: string;
  confidence: number;
  restrictions: string[];
  tracking: boolean;
  // Route-based configuration (optional)
  handling_charge?: RouteHandlingCharge;
  insurance_options?: RouteInsuranceOptions;
  // Route calculation data for breakdown display
  route_data?: {
    base_shipping_cost: number;
    weight_tier_used: string;
    weight_rate_per_kg: number;
    weight_cost: number;
    delivery_premium: number;
  };
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
  // Route-based calculation tracking
  calculated_handling?: number;
  calculated_insurance?: number;
  route_based_calculation?: boolean;
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

  // Additional calculated fields (added dynamically by SmartCalculationEngine)
  handling_charge?: number;
  insurance_amount?: number;
  payment_gateway_fee?: number;
  domestic_shipping?: number;
  vat_amount?: number;

  // ✅ NEW: Purchase tax tracking (Transparent Tax Model)
  purchase_tax_amount?: number; // Amount of purchase tax applied
  purchase_tax_rate?: number; // Rate used for purchase tax calculation (e.g., 8.88 for NY)
  actual_item_cost?: number; // items_total + purchase_tax (for debugging)
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

  // Tax Calculation Preferences
  calculation_method_preference?: 'manual' | 'hsn_only' | 'country_based';
  valuation_method_preference?:
    | 'auto'
    | 'product_value'
    | 'minimum_valuation'
    | 'higher_of_both'
    | 'per_item_choice';

  // iwishBag Tracking System (Phase 1)
  iwish_tracking_id?: string | null;
  tracking_status?: string | null;
  estimated_delivery_date?: string | null;
  shipping_carrier?: string | null;
  tracking_number?: string | null;

  // Smart Product System
  items: QuoteItem[];

  // Smart Financial System
  costprice_total_usd: number;
  final_total_usd: number;
  merchant_shipping_price?: number;

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
  customer_notes?: string;
  quantity: number;
  costprice_origin: number; // Cost price in origin country currency
  weight_kg: number;

  // HSN Classification Fields (optional for input)
  hsn_code?: string;
  category?: string;
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
  costprice_total_usd: number;
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
