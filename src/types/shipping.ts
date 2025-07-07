// Shipping system types for hybrid origin-destination shipping costs

export interface DeliveryOption {
  id: string;
  name: string;
  carrier: string;
  min_days: number;
  max_days: number;
  price: number;
  active: boolean;
}

// Database interface (matches actual database structure)
export interface ShippingRouteDB {
  id: number;
  origin_country: string;
  destination_country: string;
  exchange_rate?: number;
  base_shipping_cost: number;
  cost_per_kg: number;
  shipping_per_kg?: number;
  cost_percentage: number;
  processing_days: number;
  customs_clearance_days: number;
  weight_unit: 'kg' | 'lb';
  delivery_options: DeliveryOption[];
  weight_tiers: WeightTier[];
  carriers: Carrier[];
  max_weight?: number;
  restricted_items?: string[];
  requires_documentation: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ShippingRoute {
  id: number;
  originCountry: string; // Purchase country (all costs below are in this currency)
  destinationCountry: string;
  exchangeRate: number;
  baseShippingCost: number; // In origin country currency
  costPerKg: number; // In origin country currency
  shippingPerKg: number; // In origin country currency
  costPercentage: number; // In origin country currency
  processingDays: number;
  customsClearanceDays: number;
  weightUnit: 'kg' | 'lb';
  deliveryOptions: DeliveryOption[];
  weightTiers: WeightTier[];
  carriers: Carrier[];
  maxWeight?: number;
  restrictedItems?: string[];
  requiresDocumentation: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WeightTier {
  min: number;
  max: number | null;
  cost: number;
}

export interface Carrier {
  name: string;
  costMultiplier: number;
  days: string;
}

export interface ShippingCost {
  cost: number;
  carrier: string;
  deliveryDays: string;
  method: 'route-specific' | 'default' | 'real-time';
  route?: ShippingRoute;
}

export interface QuoteCalculationConfig {
  type: 'manual' | 'auto';
  useDefaults: boolean;
  weightRounding: boolean;
  currencyConversion: 'strict' | 'flexible' | 'none';
  countrySettings: 'single' | 'dual';
  originCountry?: string;
  destinationCountry?: string;
}

export interface UnifiedQuoteInput {
  itemPrice: number;
  itemWeight: number;
  destinationCountry: string;
  originCountry?: string;
  salesTax?: number;
  merchantShipping?: number;
  domesticShipping?: number;
  handlingCharge?: number;
  insuranceAmount?: number;
  discount?: number;
  customsCategory?: string;
  config: QuoteCalculationConfig;
}

export interface UnifiedQuoteResult {
  totalCost: number;
  breakdown: {
    itemPrice: number;
    salesTax: number;
    merchantShipping: number;
    domesticShipping: number;
    internationalShipping: number;
    handlingCharge: number;
    insuranceAmount: number;
    customsDuty: number;
    vat: number;
    discount: number;
  };
  shippingCost: ShippingCost;
  settings: {
    usedRoute?: ShippingRoute;
    usedSettings: 'route-specific' | 'default';
    originCountry: string;
    destinationCountry: string;
  };
}

export interface ShippingRouteFormData {
  originCountry: string; // Purchase country (all costs below are in this currency)
  destinationCountry: string;
  exchangeRate: number; // Exchange rate from origin to destination currency
  baseShippingCost: number; // In origin country currency
  costPerKg: number; // In origin country currency
  shippingPerKg: number; // In origin country currency
  costPercentage: number; // In origin country currency
  processingDays: number;
  customsClearanceDays: number;
  weightUnit: 'kg' | 'lb';
  deliveryOptions: DeliveryOption[];
  weightTiers: WeightTier[];
  carriers: Carrier[];
  maxWeight?: number;
  restrictedItems?: string[];
  requiresDocumentation: boolean;
  isActive: boolean;
} 