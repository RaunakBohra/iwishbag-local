/**
 * Central QuoteItem Interface - Single Source of Truth
 * 
 * This interface defines the standard structure for quote items across
 * the entire application. All components should import this interface
 * instead of defining their own local interfaces.
 * 
 * FIELD NAMING CONVENTION:
 * - unit_price_origin: Price in origin country currency (forms, UI)
 * - costprice_origin: Price in origin country currency (database storage)
 * - Both fields represent the same concept but may coexist during migration
 */

export interface QuoteItem {
  // Core identification
  id: string;
  name: string;
  url?: string;
  product_url?: string; // Alternative field name used in some components
  
  // Quantity and pricing
  quantity: number;
  unit_price_origin: number; // Primary field for forms and UI
  /** @deprecated Use 'unit_price_origin' field instead */
  costprice_origin?: number;
  
  // Physical properties
  weight?: number; // Alternative field name
  weight_kg?: number; // Specific unit field
  
  // Product categorization
  category?: string;
  hsn_code?: string;
  hsn_display_name?: string;
  hsn_category?: string;
  
  // Additional information
  notes?: string;
  customer_notes?: string;
  description?: string;
  images?: string[];
  main_image?: string;
  
  // Discounts and offers
  discount_percentage?: number;
  discount_amount?: number;
  discount_type?: 'percentage' | 'amount';
  
  // Customs and tax information
  valuation_preference?: 'actual' | 'minimum' | 'declared' | 'auto' | 'product_price' | 'minimum_valuation';
  declared_value?: number;
  use_hsn_rates?: boolean;
  
  // AI and smart features
  ai_weight_suggestion?: {
    weight: number;
    confidence: number;
  };
  
  // Physical dimensions
  dimensions?: {
    length: number;
    width: number;
    height: number;
    unit?: 'cm' | 'in';
  };
  volumetric_weight_kg?: number;
  volumetric_divisor?: number;
  
  // Tax calculations (computed fields)
  customs_amount?: number;
  sales_tax_amount?: number;
  destination_tax_amount?: number;
  
  // Legacy compatibility fields - DEPRECATED (use standard fields instead)
  /** @deprecated Use 'name' field instead */
  product_name?: string;
  /** @deprecated Use 'unit_price_origin' field instead */
  item_price?: number;
  /** @deprecated Use 'unit_price_origin' field instead */
  price?: number;
}

/**
 * Enhanced QuoteItem with additional smart suggestions
 * Used by services that provide AI-powered enhancements
 */
export interface EnhancedQuoteItem extends QuoteItem {
  smart_suggestions?: {
    suggested_hsn_code?: string;
    suggested_weight_kg?: number;
    suggested_category?: string;
    suggested_customs_rate?: number;
    weight_confidence?: number;
    hsn_confidence?: number;
    reasoning?: string;
    alternatives?: Array<{
      hsn_code: string;
      product_name: string;
      confidence: number;
    }>;
  };
}

/**
 * Type guard to check if an item has the unit_price_origin field
 */
export function hasUnitPriceOrigin(item: any): item is QuoteItem & { unit_price_origin: number } {
  return typeof item?.unit_price_origin === 'number';
}

// Type guards for backward compatibility - REMOVE after migration complete

/**
 * @deprecated Legacy type guard - will be removed
 */
export function hasCostpriceOrigin(item: any): item is QuoteItem & { costprice_origin: number } {
  return typeof item?.costprice_origin === 'number';
}

/**
 * Utility function to get the item price (simplified)
 * Uses the standard unit_price_origin field only
 */
export function getItemPrice(item: QuoteItem): number {
  return item.unit_price_origin || 0;
}

/**
 * Utility function to get the item name from various field names
 */
export function getItemName(item: QuoteItem): string {
  return item.name || item.product_name || 'Unnamed Item';
}

/**
 * Utility function to get the item weight from various field names
 */
export function getItemWeight(item: QuoteItem): number {
  return item.weight_kg || item.weight || 0;
}