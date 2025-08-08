/**
 * Quote Domain Types - Consolidated quote, calculation, and item types
 * Combines all quote-related interfaces from quotes-v2.ts, quote-item.ts, and calculation-defaults.ts
 */

import { BaseEntity, EntityWithUser, Money, Status, Address } from './common';

// Quote Status Types
export type QuoteStatus = 
  | 'draft' 
  | 'pending' 
  | 'sent' 
  | 'viewed' 
  | 'approved' 
  | 'rejected' 
  | 'expired' 
  | 'ordered' 
  | 'cancelled';

// Core Quote Interface (V2 Enhanced)
export interface Quote extends EntityWithUser {
  // Basic Information
  display_id: string;
  quote_number?: string;
  title?: string;
  status: QuoteStatus;
  version: number;
  
  // Customer Information
  customer_email?: string;
  customer_phone?: string;
  customer_name?: string;
  customer_data?: CustomerData;
  
  // Location & Shipping
  origin_country: string;
  destination_country: string;
  delivery_address?: Address;
  
  // Financial Information
  final_total_origincurrency: number;
  customer_currency: string;
  total_weight_kg?: number;
  
  // Business Logic
  validity_days: number;
  expires_at?: string;
  sent_at?: string;
  viewed_at?: string;
  share_token: string;
  
  // Communication
  email_sent: boolean;
  customer_message?: string;
  reminder_count: number;
  last_reminder_at?: string;
  
  // Version Control
  parent_quote_id?: string;
  revision_reason?: string;
  is_latest_version: boolean;
  
  // Business Rules
  payment_terms?: string;
  approval_required_above?: number;
  max_discount_allowed?: number;
  minimum_order_value?: number;
  
  // Integration
  converted_to_order_id?: string;
  original_quote_id?: string;
  external_reference?: string;
  api_version?: string;
  
  // Data Relations
  items: QuoteItem[];
  calculation_data?: CalculationData;
  
  // Cart Integration
  in_cart: boolean;
  cart_added_at?: string;
}

// Quote Items
export interface QuoteItem extends BaseEntity {
  quote_id: string;
  
  // Product Information
  product_name: string;
  product_url?: string;
  product_image?: string;
  product_description?: string;
  
  // Quantity & Pricing
  quantity: number;
  costprice_origin: number; // Renamed from price_usd for clarity
  currency_origin?: string;
  
  // Physical Properties
  weight: number; // Renamed from weight_kg for simplicity
  dimensions?: ProductDimensions;
  
  // Classification
  category?: string;
  subcategory?: string;
  hsn_code?: string;
  
  // Additional Data
  custom_notes?: string;
  tags?: string[];
  metadata?: Record<string, any>;
  
  // Calculated Fields
  total_price?: number;
  total_weight?: number;
}

export interface ProductDimensions {
  length: number;
  width: number;
  height: number;
  unit: 'cm' | 'in';
}

// Customer Data Interface
export interface CustomerData {
  name?: string;
  email?: string;
  phone?: string;
  company?: string;
  preferences?: CustomerPreferences;
  communication_history?: CommunicationRecord[];
}

export interface CustomerPreferences {
  preferred_currency?: string;
  preferred_language?: string;
  notification_settings?: {
    email: boolean;
    sms: boolean;
    push: boolean;
  };
  shipping_preferences?: {
    speed: 'standard' | 'express' | 'priority';
    insurance: boolean;
    signature_required: boolean;
  };
}

export interface CommunicationRecord {
  type: 'email' | 'phone' | 'chat' | 'note';
  timestamp: string;
  content: string;
  direction: 'inbound' | 'outbound';
  status?: 'sent' | 'delivered' | 'read' | 'failed';
}

// Calculation Data Interface
export interface CalculationData {
  calculation_steps: CalculationSteps;
  breakdown: CalculationBreakdown;
  discounts?: DiscountApplication[];
  fees?: FeeApplication[];
  metadata?: Record<string, any>;
  calculated_at: string;
  calculator_version: string;
}

export interface CalculationSteps {
  // Item Costs
  items_subtotal: number;
  discounted_items_subtotal?: number;
  
  // Shipping Costs
  shipping_cost: number;
  discounted_shipping_cost?: number;
  insurance_amount?: number;
  
  // Delivery Costs
  domestic_delivery: number;
  discounted_delivery?: number;
  
  // Taxes and Duties
  customs_duty: number;
  discounted_customs_duty?: number;
  local_tax_amount: number;
  discounted_tax_amount?: number;
  
  // Service Fees
  handling_fee: number;
  discounted_handling_fee?: number;
  payment_gateway_fee?: number;
  
  // Totals
  subtotal: number;
  total_discounts?: number;
  total_savings?: number;
  final_total: number;
}

export interface CalculationBreakdown {
  items: ItemBreakdown[];
  shipping: ShippingBreakdown;
  taxes: TaxBreakdown;
  fees: FeeBreakdown;
  discounts: DiscountBreakdown[];
}

export interface ItemBreakdown {
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  weight: number;
  category?: string;
}

export interface ShippingBreakdown {
  method: string;
  base_cost: number;
  weight_cost: number;
  distance_cost?: number;
  insurance_cost?: number;
  total_cost: number;
}

export interface TaxBreakdown {
  customs_duty: {
    rate: number;
    amount: number;
    basis: string;
  };
  local_tax: {
    rate: number;
    amount: number;
    type: string;
  };
  total_tax: number;
}

export interface FeeBreakdown {
  handling_fee: number;
  payment_fee: number;
  service_fee: number;
  total_fees: number;
}

// Discount and Fee Applications
export interface DiscountApplication {
  id: string;
  type: 'percentage' | 'fixed' | 'tiered' | 'bulk';
  code?: string;
  description: string;
  amount: number;
  applies_to: 'items' | 'shipping' | 'total' | 'specific_item';
  target_item_id?: string;
  conditions?: DiscountConditions;
}

export interface DiscountConditions {
  min_amount?: number;
  max_amount?: number;
  min_quantity?: number;
  valid_countries?: string[];
  customer_types?: string[];
  expires_at?: string;
}

export interface FeeApplication {
  id: string;
  type: 'handling' | 'payment' | 'service' | 'insurance';
  description: string;
  amount: number;
  calculation_method: 'fixed' | 'percentage' | 'tiered';
  applied_to: number; // Amount the fee was calculated on
}

// Quote Operations
export interface QuoteRequest {
  items: QuoteItemRequest[];
  origin_country: string;
  destination_country: string;
  customer_email?: string;
  customer_phone?: string;
  customer_name?: string;
  delivery_address?: Address;
  special_instructions?: string;
  urgency?: 'standard' | 'urgent' | 'express';
  preferred_currency?: string;
}

export interface QuoteItemRequest {
  product_name: string;
  product_url?: string;
  quantity: number;
  costprice_origin: number;
  currency_origin?: string;
  weight?: number;
  category?: string;
  custom_notes?: string;
}

export interface QuoteResponse {
  quote: Quote;
  public_url?: string;
  expires_at: string;
  estimated_delivery?: string;
  tracking_available: boolean;
}

// Quote Analytics
export interface QuoteMetrics {
  total_quotes: number;
  conversion_rate: number;
  average_value: Money;
  average_response_time: number; // hours
  status_breakdown: Record<QuoteStatus, number>;
  popular_routes: RouteStats[];
  trend_data: QuoteTrendData[];
}

export interface RouteStats {
  origin: string;
  destination: string;
  count: number;
  average_value: Money;
  conversion_rate: number;
}

export interface QuoteTrendData {
  date: string;
  quotes_created: number;
  quotes_sent: number;
  quotes_approved: number;
  total_value: number;
  average_value: number;
}

// Quote Validation
export interface QuoteValidation {
  is_valid: boolean;
  errors: QuoteValidationError[];
  warnings: QuoteValidationWarning[];
  estimated_processing_time?: number; // minutes
}

export interface QuoteValidationError {
  field: string;
  code: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface QuoteValidationWarning {
  field: string;
  code: string;
  message: string;
  recommendation?: string;
}

// Quote Templates and Presets
export interface QuoteTemplate extends BaseEntity {
  name: string;
  description?: string;
  is_active: boolean;
  template_data: QuoteTemplateData;
  usage_count: number;
  created_by: string;
}

export interface QuoteTemplateData {
  default_items?: QuoteItemRequest[];
  default_settings?: {
    validity_days?: number;
    payment_terms?: string;
    customer_message?: string;
  };
  calculation_preferences?: {
    preferred_shipping_method?: string;
    apply_discounts?: string[];
    fee_overrides?: Record<string, number>;
  };
}

// Export utility types for quote operations
export type QuoteUtilityFunctions = {
  calculateExpiry: (quote: Quote) => Date;
  generateShareToken: () => string;
  validateQuoteItems: (items: QuoteItem[]) => QuoteValidation;
  convertCurrency: (amount: number, from: string, to: string) => Promise<number>;
  estimateDelivery: (origin: string, destination: string) => Promise<string>;
};