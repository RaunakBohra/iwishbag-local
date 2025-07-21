// ============================================================================
// GLOBAL CALCULATION DEFAULTS - Type Definitions
// Configurable system defaults for handling charges, insurance, and shipping
// ============================================================================

export interface HandlingChargeDefaults {
  // Base handling charge configuration
  minimum_fee_usd: number; // Minimum handling charge (e.g., $5)
  percentage_of_value: number; // Percentage of item value (e.g., 2.0 for 2%)
  calculation_method: 'max' | 'sum' | 'percentage_only' | 'fixed_only'; // How to combine minimum and percentage

  // Advanced configuration
  max_fee_usd?: number; // Optional maximum cap
  apply_per_item?: boolean; // Apply per item vs per quote
  currency_specific?: Record<string, { minimum_fee: number; percentage: number }>; // Currency-specific overrides
}

export interface InsuranceDefaults {
  // Base insurance configuration
  default_coverage_percentage: number; // Default coverage % (e.g., 1.5 for 1.5%)
  minimum_fee_usd: number; // Minimum insurance fee
  maximum_coverage_usd?: number; // Optional maximum coverage amount

  // Customer options
  customer_optional: boolean; // Whether customers can opt out
  default_opted_in: boolean; // Default customer selection

  // Advanced configuration
  coverage_tiers?: Array<{
    min_value_usd: number;
    max_value_usd: number;
    coverage_percentage: number;
  }>; // Value-based coverage tiers
  currency_specific?: Record<string, { coverage_percentage: number; minimum_fee: number }>;
}

export interface ShippingDefaults {
  // Base shipping configuration
  base_cost_usd: number; // Base shipping cost (e.g., $25)
  cost_per_kg_usd: number; // Cost per kilogram (e.g., $5/kg)

  // Weight handling
  default_weight_kg: number; // Default weight for items without weight data (e.g., 0.5kg)
  weight_confidence_default: number; // Default confidence score for estimated weights (0-1)

  // Delivery estimates
  default_delivery_days: string; // Default delivery time range (e.g., "7-14")
  default_carrier_name: string; // Default carrier name for fallbacks

  // Advanced configuration
  country_specific?: Record<
    string,
    {
      base_cost_usd: number;
      cost_per_kg_usd: number;
      delivery_days: string;
    }
  >; // Country-specific shipping defaults
}

export interface PaymentGatewayDefaults {
  // Standard payment gateway fees
  percentage_fee: number; // Percentage fee (e.g., 2.9 for 2.9%)
  fixed_fee_usd: number; // Fixed fee per transaction (e.g., $0.30)

  // Currency-specific overrides
  currency_specific?: Record<
    string,
    {
      percentage_fee: number;
      fixed_fee: number; // In local currency
    }
  >;
}

export interface TaxDefaults {
  // Default tax rates when country settings are unavailable
  default_sales_tax_percentage: number; // Default sales tax (e.g., 10%)
  default_vat_percentage: number; // Default VAT (e.g., 0%)
  default_customs_percentage: number; // Default customs duty (e.g., 15%)
}

export interface GlobalCalculationDefaults {
  // Core configuration
  id?: string;
  name: string; // Configuration name (e.g., "Production Defaults")
  description?: string;
  is_active: boolean;

  // Calculation defaults
  handling_charge: HandlingChargeDefaults;
  insurance: InsuranceDefaults;
  shipping: ShippingDefaults;
  payment_gateway: PaymentGatewayDefaults;
  taxes: TaxDefaults;

  // Behavior configuration
  fallback_behavior: {
    use_fallbacks_when_route_missing: boolean; // Whether to use defaults when route config is missing
    show_fallback_warnings: boolean; // Whether to log when fallbacks are used
    require_admin_approval_for_fallbacks: boolean; // Whether fallback usage needs approval
  };

  // Audit fields
  created_at?: string;
  updated_at?: string;
  created_by?: string;
  updated_by?: string;
}

// Database representation
export interface GlobalCalculationDefaultsDB {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  configuration: GlobalCalculationDefaults; // JSONB field containing the full config
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}

// Form data for admin interface
export interface GlobalCalculationDefaultsFormData {
  name: string;
  description?: string;
  is_active: boolean;

  // Handling charge settings
  handling_minimum_fee: number;
  handling_percentage: number;
  handling_calculation_method: HandlingChargeDefaults['calculation_method'];
  handling_max_fee?: number;

  // Insurance settings
  insurance_coverage_percentage: number;
  insurance_minimum_fee: number;
  insurance_customer_optional: boolean;
  insurance_default_opted_in: boolean;
  insurance_max_coverage?: number;

  // Shipping settings
  shipping_base_cost: number;
  shipping_cost_per_kg: number;
  shipping_default_weight: number;
  shipping_default_delivery_days: string;
  shipping_default_carrier: string;

  // Payment gateway settings
  payment_percentage_fee: number;
  payment_fixed_fee: number;

  // Tax settings
  default_sales_tax: number;
  default_vat: number;
  default_customs: number;

  // Behavior settings
  use_fallbacks_when_route_missing: boolean;
  show_fallback_warnings: boolean;
  require_admin_approval_for_fallbacks: boolean;
}

// API response types
export interface CalculationDefaultsResponse {
  success: boolean;
  data?: GlobalCalculationDefaults;
  error?: string;
}

export interface CalculationDefaultsListResponse {
  success: boolean;
  data?: GlobalCalculationDefaults[];
  error?: string;
}

// Usage tracking for analytics
export interface FallbackUsageLog {
  id?: string;
  quote_id: string;
  calculation_type: 'handling_charge' | 'insurance' | 'shipping' | 'payment_gateway' | 'taxes';
  fallback_value_used: number;
  route_id?: string; // If calculation was for a specific route
  route_origin?: string;
  route_destination?: string;
  reason: string; // Why fallback was used
  timestamp: string;
  user_id?: string;
}
