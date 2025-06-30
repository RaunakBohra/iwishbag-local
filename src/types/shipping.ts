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

export interface ShippingRoute {
  id: number;
  originCountry: string;
  destinationCountry: string;
  baseShippingCost: number;
  costPerKg: number;
  shippingPerKg: number;
  costPercentage: number;
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
  originCountry: string;
  destinationCountry: string;
  baseShippingCost: number;
  costPerKg: number;
  shippingPerKg: number;
  costPercentage: number;
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