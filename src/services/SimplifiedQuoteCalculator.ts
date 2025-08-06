import { currencyService } from './CurrencyService';
import { DiscountService } from './DiscountService';
import { DiscountLoggingService } from './DiscountLoggingService';
import { volumetricWeightService } from './VolumetricWeightService';
import { delhiveryService, DelhiveryService } from './DelhiveryService';
import type { DelhiveryRateRequest, DelhiveryMultiRateResponse } from './DelhiveryService';
import NCMService from './NCMService';
import type { NCMRateRequest, NCMMultiRateResponse } from './NCMService';
import { ncmBranchMappingService } from './NCMBranchMappingService';
import { DynamicShippingService, type RouteCalculations } from './DynamicShippingService';

interface CalculationInput {
  items: Array<{
    name?: string; // Item name for logging
    quantity: number;
    costprice_origin: number; // Price in origin country currency
    weight_kg?: number;
    discount_percentage?: number; // Item-level discount percentage
    discount_amount?: number; // Item-level discount fixed amount
    discount_type?: 'percentage' | 'amount'; // Type of discount being used
    // Optional HSN fields - safe additions
    hsn_code?: string;
    use_hsn_rates?: boolean; // Feature flag per item
    // Valuation method preference
    valuation_preference?: 'auto' | 'product_price' | 'minimum_valuation';
    // Optional volumetric weight fields
    dimensions?: {
      length: number;
      width: number;
      height: number;
      unit?: 'cm' | 'in';
    };
    volumetric_divisor?: number; // Default 5000, admin can override
  }>;
  origin_currency: string; // Origin country currency code (INR, USD, NPR, etc.)
  origin_country: string;
  origin_state?: string; // For US sales tax
  destination_country: string;
  destination_state?: string; // For domestic delivery rates
  destination_pincode?: string; // For Indian Delhivery delivery rates
  destination_address?: {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    pincode?: string;
    district?: string; // For Nepal NCM branch mapping
  };
  delhivery_service_type?: 'standard' | 'express' | 'same_day'; // For Indian deliveries
  ncm_service_type?: 'pickup' | 'collect'; // For Nepal NCM deliveries
  shipping_method?: 'standard' | 'express' | 'economy';
  payment_gateway?: 'stripe' | 'paypal' | 'esewa' | 'khalti' | 'payu';
  
  // Discount fields
  order_discount?: {
    type: 'percentage' | 'fixed';
    value: number;
    code?: string; // Promo code used
  };
  shipping_discount?: {
    type: 'percentage' | 'fixed' | 'free';
    value?: number; // Not needed if type is 'free'
  };
  
  // Enhanced discount inputs
  discount_codes?: string[];
  customer_id?: string;
  quote_id?: string; // For logging purposes
  is_first_order?: boolean;
  apply_component_discounts?: boolean; // Enable component-based discounts
  insurance_enabled?: boolean; // Toggle insurance on/off
}

interface CalculationResult {
  inputs: {
    items_cost: number;
    total_weight_kg: number;
    total_volumetric_weight_kg?: number; // NEW: Total volumetric weight
    total_chargeable_weight_kg: number; // NEW: Chargeable weight (max of actual vs volumetric)
    origin_country: string;
    origin_currency: string; // NEW: Origin country currency (INR, USD, NPR, etc.)
    origin_state?: string;
    destination_country: string;
    destination_state?: string;
    shipping_method: string;
    payment_gateway: string;
  };
  applied_rates: {
    exchange_rate: number;
    origin_sales_tax_percentage: number;
    customs_percentage: number;
    local_tax_percentage: number; // GST/VAT/Sales Tax
    insurance_percentage: number;
    shipping_rate_per_kg: number;
    handling_fee_fixed: number;
    handling_fee_percentage: number;
    payment_gateway_fee_percentage: number;
    payment_gateway_fee_fixed: number;
  };
  calculation_steps: {
    items_subtotal: number;
    item_discounts: number; // Total item-level discounts
    discounted_items_subtotal: number;
    order_discount_amount: number;
    origin_sales_tax: number;
    shipping_cost: number;
    shipping_discount_amount: number;
    discounted_shipping_cost: number;
    insurance_amount: number;
    cif_value: number;
    customs_duty: number;
    customs_discount_amount?: number; // NEW: Customs discount
    discounted_customs_duty?: number; // NEW: Final customs after discount
    handling_fee: number;
    handling_discount_amount?: number; // NEW: Handling fee discount
    discounted_handling_fee?: number; // NEW: Final handling fee after discount
    domestic_delivery: number;
    delivery_discount_amount?: number; // NEW: Delivery discount
    discounted_delivery?: number; // NEW: Final delivery after discount
    delhivery_rates?: DelhiveryMultiRateResponse; // NEW: Delhivery API response for Indian deliveries
    ncm_rates?: NCMMultiRateResponse; // NEW: NCM API response for Nepal deliveries
    taxable_value: number; // All costs before local tax
    local_tax_amount: number; // GST/VAT on taxable value
    tax_discount_amount?: number; // NEW: Tax discount (rare)
    discounted_tax_amount?: number; // NEW: Final tax after discount
    subtotal_before_gateway: number;
    payment_gateway_fee: number;
    total_usd: number; // DEPRECATED: Actually in origin currency now - use total_origin_currency
    total_origin_currency: number; // NEW: Total amount in origin currency
    total_customer_currency: number;
    total_savings: number; // Total discount amount
    component_discounts?: { // NEW: Breakdown by component
      [component: string]: {
        original: number;
        discount: number;
        final: number;
        applied_discounts: Array<{
          source: string;
          description: string;
          amount: number;
        }>;
      };
    };
    // NEW: Weight analysis breakdown
    weight_analysis?: {
      items: Array<{
        item_index: number;
        actual_weight: number;
        volumetric_weight?: number;
        chargeable_weight: number;
        is_volumetric: boolean;
        divisor_used?: number;
        dimensions?: {
          length: number;
          width: number;
          height: number;
          unit: string;
          volume_cm3: number;
        };
      }>;
      totals: {
        total_actual_weight: number;
        total_volumetric_weight: number;
        total_chargeable_weight: number;
        volumetric_items_count: number;
      };
    };
  };
  calculation_timestamp: string;
  calculation_version: 'v2';
}

// Country-specific tax configurations
const COUNTRY_TAX_CONFIG = {
  IN: {
    customs: 20,
    local_tax: 18, // GST
    local_tax_name: 'GST',
    name: 'India'
  },
  NP: {
    customs: 15,
    local_tax: 13, // VAT
    local_tax_name: 'VAT',
    name: 'Nepal'
  },
  US: {
    customs: 0,
    local_tax: 0, // State-specific, will be calculated separately
    local_tax_name: 'Sales Tax',
    name: 'United States'
  },
  CA: {
    customs: 5,
    local_tax: 13, // GST + PST average
    local_tax_name: 'GST/PST',
    name: 'Canada'
  },
  GB: {
    customs: 10,
    local_tax: 20, // VAT
    local_tax_name: 'VAT',
    name: 'United Kingdom'
  },
  AU: {
    customs: 5,
    local_tax: 10, // GST
    local_tax_name: 'GST',
    name: 'Australia'
  },
  // Default for other countries
  DEFAULT: {
    customs: 10,
    local_tax: 15, // VAT
    local_tax_name: 'VAT',
    name: 'Other'
  }
};

// Shipping rates per kg (USD)
const SHIPPING_RATES = {
  standard: 25,
  express: 40,
  economy: 15
};

// US State sales tax rates (simplified - major states)
const US_STATE_TAX_RATES: Record<string, number> = {
  'CA': 7.25, // California
  'TX': 6.25, // Texas
  'NY': 8.0,  // New York
  'FL': 6.0,  // Florida
  'WA': 6.5,  // Washington
  'OR': 0,    // Oregon (no sales tax)
  'MT': 0,    // Montana (no sales tax)
  'NH': 0,    // New Hampshire (no sales tax)
  'DE': 0,    // Delaware (no sales tax)
  'DEFAULT': 5.0 // Average for other states
};

// Payment gateway fees
const PAYMENT_GATEWAY_FEES = {
  stripe: { percentage: 2.9, fixed: 0.30 },
  paypal: { percentage: 2.9, fixed: 0.30 },
  esewa: { percentage: 2.0, fixed: 0 },
  khalti: { percentage: 2.5, fixed: 0 },
  payu: { percentage: 2.0, fixed: 0 }
};

// Handling fees configuration
const HANDLING_FEES = {
  fixed: 10,      // $10 fixed
  percentage: 2   // 2% of order value
};

// Domestic delivery rates (USD)
const DOMESTIC_DELIVERY_RATES: Record<string, { urban: number; rural: number }> = {
  'IN': { urban: 5, rural: 10 },     // India
  'NP': { urban: 3, rural: 7 },      // Nepal  
  'US': { urban: 15, rural: 25 },    // United States
  'DEFAULT': { urban: 10, rural: 20 }
};

// Simple HSN rates lookup (can be moved to database later)
// Only activated when use_hsn_rates is true
const HSN_CUSTOMS_RATES: Record<string, Record<string, number>> = {
  // India specific HSN rates
  'IN': {
    '6109': 12,    // T-shirts (lower than default 20%)
    '8517': 18,    // Mobile phones
    '8471': 0,     // Laptops (exempted)
    '6204': 12,    // Women's dresses
    'DEFAULT': 20  // Fallback to country default
  },
  // Nepal specific HSN rates  
  'NP': {
    '6109': 10,    // T-shirts
    '8517': 15,    // Mobile phones
    '8471': 5,     // Laptops (lower rate)
    '6204': 10,    // Women's dresses
    'DEFAULT': 15  // Fallback to country default
  }
};

class SimplifiedQuoteCalculator {
  // Safe method to get customs rate - HSN only if explicitly enabled
  private async getCustomsRateForItem(item: any, destinationCountry: string, defaultRate: number): Promise<number> {
    // Only use HSN if explicitly enabled for this item
    if (item.use_hsn_rates && item.hsn_code) {
      // First check database for HSN rates
      try {
        const { supabase } = await import('@/integrations/supabase/client');
        const { data: hsnData, error } = await supabase
          .from('product_classifications')
          .select('customs_rate')
          .eq('classification_code', item.hsn_code)
          .eq('country_code', destinationCountry)
          .eq('is_active', true)
          .limit(1)
          .single();

        if (!error && hsnData && hsnData.customs_rate !== null) {
          console.log(`🎯 [HSN] Using database rate for ${item.hsn_code}: ${hsnData.customs_rate}%`);
          return hsnData.customs_rate;
        }
      } catch (dbError) {
        console.warn('Failed to fetch HSN rate from database:', dbError);
      }

      // Fallback to hardcoded HSN rates
      const countryHsnRates = HSN_CUSTOMS_RATES[destinationCountry];
      if (countryHsnRates) {
        const hsnRate = countryHsnRates[item.hsn_code];
        if (hsnRate !== undefined) {
          console.log(`🎯 [HSN] Using hardcoded rate for ${item.hsn_code}: ${hsnRate}%`);
          return hsnRate;
        }
      }
    }
    // Fallback to default country rate
    console.log(`🎯 [HSN] Using default rate for ${destinationCountry}: ${defaultRate}%`);
    return defaultRate;
  }

  private async getItemValuationData(item: any, destinationCountry: string, input: CalculationInput): Promise<{
    product_price: number;
    minimum_valuation: number | null;
    effective_value: number;
    valuation_method_used: string;
  }> {
    const productPriceOrigin = item.quantity * item.costprice_origin;
    let minimumValuation: number | null = null;
    let effectiveValue = productPriceOrigin; // Fixed: use the correct variable
    let valuationMethodUsed = 'product_price';

    // Get minimum valuation from database if HSN code exists
    if (item.hsn_code) {
      try {
        const { supabase } = await import('@/integrations/supabase/client');
        // Use direct SQL query to avoid TypeScript RPC issues
        const { data: hsnData, error } = await supabase
          .from('product_classifications')
          .select('minimum_valuation_usd, valuation_method')
          .eq('classification_code', item.hsn_code)
          .eq('country_code', destinationCountry)
          .eq('is_active', true)
          .limit(1)
          .maybeSingle(); // Use maybeSingle instead of single to avoid errors when no match

        if (!error && hsnData && hsnData.minimum_valuation_usd) {
          // CRITICAL FIX: Convert minimum valuation from USD to origin currency for proper comparison
          const minimumValuationUSD = hsnData.minimum_valuation_usd * item.quantity;
          const exchangeRate = await currencyService.getExchangeRate('USD', input.origin_currency);
          minimumValuation = minimumValuationUSD * exchangeRate; // Now in origin currency
          
          // Apply valuation method logic based on admin choice
          if (item.valuation_preference === 'minimum_valuation') {
            // Force minimum valuation
            effectiveValue = minimumValuation;
            valuationMethodUsed = 'minimum_valuation (forced)';
          } else if (item.valuation_preference === 'product_price') {
            // Force product price
            effectiveValue = productPriceOrigin;
            valuationMethodUsed = 'product_price (forced)';
          } else {
            // Auto mode - use higher value (default) - now both values are in origin currency
            effectiveValue = Math.max(productPriceOrigin, minimumValuation);
            valuationMethodUsed = effectiveValue === minimumValuation ? 'minimum_valuation (auto)' : 'product_price (auto)';
          }

          console.log(`💰 [Valuation] ${item.hsn_code}: product=${productPriceOrigin.toFixed(2)} ${input.origin_currency}, min=${minimumValuation.toFixed(2)} ${input.origin_currency} (from $${minimumValuationUSD.toFixed(2)} USD), using=${effectiveValue.toFixed(2)} ${input.origin_currency} (${valuationMethodUsed})`);
        }
      } catch (error) {
        console.warn('Failed to fetch minimum valuation:', error);
      }
    }

    return {
      product_price: productPriceOrigin,
      minimum_valuation: minimumValuation,
      effective_value: effectiveValue,
      valuation_method_used: valuationMethodUsed
    };
  }

  async calculate(input: CalculationInput): Promise<CalculationResult> {
    
    // Debug: Log items with valuation preferences
    console.log('🔍 [Calculator] Starting calculation with items:', input.items.map(item => ({
      name: item.name,
      hsn_code: item.hsn_code,
      valuation_preference: item.valuation_preference || 'auto',
      costprice_origin: item.costprice_origin
    })));

    // Step 1: Calculate items total with minimum valuation consideration and item-level discounts
    let itemsTotal = 0;
    let totalItemDiscounts = 0;
    let customsValuationTotal = 0; // For customs calculation (may use minimum valuation)
    let valuationAnalysis: any[] = [];
    
    // Process each item for both pricing and valuation
    for (const item of input.items) {
      console.log(`🔍 [Calculator] Processing item: ${item.name}, HSN: ${item.hsn_code}, valuation_preference: ${item.valuation_preference}`);
      
      // Get valuation data (product price vs minimum valuation)
      const valuationData = await this.getItemValuationData(item, input.destination_country, input);
      
      console.log(`📊 [Calculator] Valuation result for ${item.name}:`, valuationData);
      
      const itemSubtotal = item.quantity * item.costprice_origin;
      let itemDiscount = 0;
      
      // Calculate discount based on type (always applied to product price, not minimum valuation)
      if (item.discount_type === 'amount' && item.discount_amount) {
        itemDiscount = Math.min(item.discount_amount, itemSubtotal); // Can't discount more than item value
      } else if (item.discount_percentage) {
        itemDiscount = itemSubtotal * (item.discount_percentage / 100);
      }
      
      itemsTotal += itemSubtotal;
      totalItemDiscounts += itemDiscount;
      customsValuationTotal += valuationData.effective_value;
      
      valuationAnalysis.push({
        item_name: item.name || 'Unnamed item',
        hsn_code: item.hsn_code,
        product_price: valuationData.product_price,
        minimum_valuation: valuationData.minimum_valuation,
        effective_value: valuationData.effective_value,
        method_used: valuationData.valuation_method_used,
        preference: item.valuation_preference || 'auto'
      });
    }
    
    // For regular pricing: use discounted product prices
    const discountedItemsSubtotal = itemsTotal - totalItemDiscounts;
    
    // For customs calculation: use minimum valuation total (discounts still apply but to base calculation)
    const customsDiscountedTotal = customsValuationTotal - totalItemDiscounts;
    
    // Step 1.5: Calculate total weight with volumetric consideration
    let totalActualWeight = 0;
    let totalVolumetricWeight = 0;
    let totalChargeableWeight = 0;
    const weightAnalysisItems: any[] = [];
    let volumetricItemsCount = 0;

    for (let itemIndex = 0; itemIndex < input.items.length; itemIndex++) {
      const item = input.items[itemIndex];
      const actualWeight = (item.weight_kg || 0.5) * item.quantity;
      let volumetricWeight = 0;
      let chargeableWeight = actualWeight;
      let isVolumetric = false;
      let divisorUsed: number | undefined;
      let dimensionsData: any;

      totalActualWeight += actualWeight;

      if (item.dimensions) {
        // Calculate volumetric weight for this item
        divisorUsed = item.volumetric_divisor || 5000; // Default 5000
        volumetricWeight = volumetricWeightService.calculateVolumetricWeight(
          item.dimensions,
          divisorUsed
        ) * item.quantity;
        
        totalVolumetricWeight += volumetricWeight;
        chargeableWeight = Math.max(actualWeight, volumetricWeight);
        isVolumetric = volumetricWeight > actualWeight;
        
        if (isVolumetric) {
          volumetricItemsCount++;
        }

        // Calculate volume for analysis
        let { length, width, height, unit = 'cm' } = item.dimensions;
        if (unit === 'in') {
          length *= 2.54;
          width *= 2.54;
          height *= 2.54;
        }
        const volumeCm3 = length * width * height;

        dimensionsData = {
          length: item.dimensions.length,
          width: item.dimensions.width,
          height: item.dimensions.height,
          unit: item.dimensions.unit || 'cm',
          volume_cm3: Math.round(volumeCm3 * 100) / 100
        };
      }

      totalChargeableWeight += chargeableWeight;

      // Store weight analysis for this item
      weightAnalysisItems.push({
        item_index: itemIndex,
        actual_weight: this.round(actualWeight),
        volumetric_weight: volumetricWeight > 0 ? this.round(volumetricWeight) : undefined,
        chargeable_weight: this.round(chargeableWeight),
        is_volumetric: isVolumetric,
        divisor_used: divisorUsed,
        dimensions: dimensionsData
      });
    }


    // Step 2: Get configurations
    const countryConfig = COUNTRY_TAX_CONFIG[input.destination_country as keyof typeof COUNTRY_TAX_CONFIG] 
      || COUNTRY_TAX_CONFIG.DEFAULT;
    
    const customerCurrency = await this.getCustomerCurrency(input.destination_country);
    // CRITICAL FIX: Exchange rate should be from origin currency to customer currency, not USD to customer
    const exchangeRate = await currencyService.getExchangeRate(input.origin_currency, customerCurrency);

    // Step 3: Apply order-level discount
    let orderDiscountAmount = 0;
    if (input.order_discount) {
      if (input.order_discount.type === 'percentage') {
        orderDiscountAmount = discountedItemsSubtotal * (input.order_discount.value / 100);
      } else {
        orderDiscountAmount = Math.min(input.order_discount.value, discountedItemsSubtotal);
      }
    }
    
    const finalItemsSubtotal = discountedItemsSubtotal - orderDiscountAmount;

    // Step 4: Calculate origin sales tax (on discounted amount)
    let originSalesTax = 0;
    let originSalesTaxRate = 0;
    if (input.origin_country === 'US' && input.origin_state) {
      originSalesTaxRate = US_STATE_TAX_RATES[input.origin_state] || US_STATE_TAX_RATES.DEFAULT;
      originSalesTax = finalItemsSubtotal * (originSalesTaxRate / 100);
    }

    // Step 5: Calculate shipping dynamically
    let baseShippingCost;
    let finalShippingCost;
    let routeCalculations: RouteCalculations | null = null;
    let shippingRatePerKg = 0; // Initialize for applied_rates
    const shippingMethod = input.shipping_method || 'standard'; // Define at function scope

    try {
      // Convert items to origin currency first
      // finalItemsSubtotal is already in origin currency from user input, no conversion needed
      const itemsOriginCurrency = finalItemsSubtotal;
      
      // Get dynamic calculations from shipping routes
      const dynamicShipping = new DynamicShippingService();
      routeCalculations = await dynamicShipping.getRouteCalculations(
        input.origin_country,
        input.destination_country,
        totalChargeableWeight,
        itemsOriginCurrency,
        input.shipping_method // Pass selected delivery option ID
      );
      
      baseShippingCost = routeCalculations.shipping.total;
      finalShippingCost = baseShippingCost;
      shippingRatePerKg = routeCalculations.delivery_option_used.price_per_kg;
      
      console.log(`🚢 [Dynamic Shipping] Route: ${input.origin_country}→${input.destination_country}`);
      console.log(`🚢 [Dynamic Shipping] Base: ${routeCalculations.shipping.base_cost}, Per-kg: ${routeCalculations.shipping.per_kg_cost}, Cost%: ${routeCalculations.shipping.cost_percentage}, Total: ${baseShippingCost}`);
      
    } catch (error) {
      console.warn('🚨 [Dynamic Shipping] Failed, using fallback:', error);
      
      // Fallback to hardcoded rates
      shippingRatePerKg = SHIPPING_RATES[shippingMethod];
      baseShippingCost = Math.max(totalChargeableWeight * shippingRatePerKg, 25); // Minimum $25
      finalShippingCost = baseShippingCost;
    }
    
    let shippingDiscountAmount = 0;
    
    if (input.shipping_discount) {
      if (input.shipping_discount.type === 'free') {
        shippingDiscountAmount = baseShippingCost;
        finalShippingCost = 0;
      } else if (input.shipping_discount.type === 'percentage') {
        shippingDiscountAmount = baseShippingCost * ((input.shipping_discount.value || 0) / 100);
        finalShippingCost = baseShippingCost - shippingDiscountAmount;
      } else {
        shippingDiscountAmount = Math.min(input.shipping_discount.value || 0, baseShippingCost);
        finalShippingCost = baseShippingCost - shippingDiscountAmount;
      }
    }

    // Step 6: Calculate insurance dynamically
    let insuranceAmount = 0;
    let insurancePercentage = 0;
    
    if (input.insurance_enabled !== false && routeCalculations && routeCalculations.insurance.available) {
      // Use dynamic insurance from shipping route (only if enabled)
      insuranceAmount = routeCalculations.insurance.amount;
      insurancePercentage = routeCalculations.insurance.percentage;
      
      console.log(`🛡️ [Dynamic Insurance] Enabled - Percentage: ${insurancePercentage}%, Amount: ${insuranceAmount}`);
    } else if (input.insurance_enabled === false) {
      // Insurance explicitly disabled by user
      insuranceAmount = 0;
      insurancePercentage = 0;
        
      console.log(`🛡️ [Insurance Disabled] User disabled insurance, Amount: $0`);
    } else {
      // No insurance available - set to 0
      insuranceAmount = 0;
      insurancePercentage = 0;
        
      console.log(`🛡️ [No Insurance] Route has no insurance configuration, Amount: $0`);
    }

    // Step 7: Calculate CIF (Cost + Insurance + Freight) 
    // CRITICAL FIX: Separate customer billing base from customs calculation base
    
    // For customer billing: always use actual product prices
    const customerBillingBase = finalItemsSubtotal + originSalesTax + insuranceAmount + finalShippingCost;
    
    // For customs calculation only: use customs valuation (which may include minimum valuations)
    const finalCustomsValuation = customsValuationTotal - totalItemDiscounts - orderDiscountAmount;
    const cifValueForCustoms = finalCustomsValuation + originSalesTax + insuranceAmount + finalShippingCost;
    
    console.log(`🚨 [FIXED] Customer Billing Base: $${customerBillingBase.toFixed(2)} (using actual product prices: $${finalItemsSubtotal.toFixed(2)})`);
    console.log(`📦 [CIF for Customs] Customs Valuation: $${finalCustomsValuation.toFixed(2)} (may use minimum valuations)`);
    console.log(`📦 [CIF Components] Customs Items: $${finalCustomsValuation.toFixed(2)} + Tax: $${originSalesTax.toFixed(2)} + Insurance: $${insuranceAmount.toFixed(2)} + Shipping: $${finalShippingCost.toFixed(2)} = CIF: $${cifValueForCustoms.toFixed(2)}`);

    // Debug: Log detailed valuation analysis for minimum valuation items
    const minimumValuationItems = valuationAnalysis.filter(item => item.minimum_valuation !== null);
    if (minimumValuationItems.length > 0) {
      console.log(`🔍 [VALUATION DEBUG] Found ${minimumValuationItems.length} items with minimum valuations:`);
      minimumValuationItems.forEach(item => {
        console.log(`  - ${item.item_name}: Product $${item.product_price.toFixed(2)} vs Min $${(item.minimum_valuation || 0).toFixed(2)} → Using $${item.effective_value.toFixed(2)} (${item.method_used})`);
      });
      console.log(`💰 [BILLING IMPACT] Customer pays based on product prices ($${finalItemsSubtotal.toFixed(2)}), customs calculated on valuation ($${finalCustomsValuation.toFixed(2)})`);
    }

    // Step 8: Calculate customs duty on CIF (use customs-specific CIF)
    // Check if any items use HSN rates
    const itemsWithHSN = input.items.filter(item => item.use_hsn_rates && item.hsn_code);
    let effectiveCustomsRate = countryConfig.customs;
    
    // If HSN is used, calculate weighted average customs rate (safe approach)
    if (itemsWithHSN.length > 0) {
      let totalValue = 0;
      let weightedRateSum = 0;
      
      // Process items sequentially to handle async calls
      for (const item of input.items) {
        const itemValue = item.quantity * item.costprice_origin;
        const itemRate = await this.getCustomsRateForItem(item, input.destination_country, countryConfig.customs);
        totalValue += itemValue;
        weightedRateSum += itemValue * itemRate;
      }
      
      effectiveCustomsRate = totalValue > 0 ? weightedRateSum / totalValue : countryConfig.customs;
    }
    
    const customsDuty = cifValueForCustoms * (effectiveCustomsRate / 100);

    // Step 9: Apply component-based discounts if enabled
    let componentDiscounts: { [key: string]: any } = {};
    let discountedCustomsDuty = customsDuty;
    let customsDiscountAmount = 0;
    let discountedHandlingFee = 0;
    let handlingDiscountAmount = 0;
    let discountedDelivery = 0;
    let deliveryDiscountAmount = 0;
    let discountedTaxAmount = 0;
    let taxDiscountAmount = 0;
    
    // Fetch all component discounts once
    let discountsByComponent = new Map<string, any[]>();
    if (input.apply_component_discounts && input.customer_id) {
      try {
        discountsByComponent = await DiscountService.getInstance().getComponentDiscounts(
          input.customer_id,
          finalItemsSubtotal,
          input.destination_country,
          input.is_first_order || false,
          input.items.length,
          input.discount_codes || []
        );
        
        // Apply customs discounts
        if (discountsByComponent.has('customs')) {
          const customsDiscountResult = DiscountService.getInstance().calculateComponentDiscount(
            customsDuty,
            discountsByComponent.get('customs')!,
            'customs'
          );
          discountedCustomsDuty = customsDiscountResult.finalValue;
          customsDiscountAmount = customsDiscountResult.totalDiscount;
          
          // Log automatic customs discount application
          if (customsDiscountAmount > 0) {
            customsDiscountResult.appliedDiscounts.forEach(async (discount) => {
              await DiscountLoggingService.getInstance().logAutomaticDiscount(
                discount.discount_source === 'volume' ? 'volume' : 'country',
                {
                  customer_id: input.customerId,
                  quote_id: input.quoteId,
                  country: input.destination_country,
                  order_total: finalItemsSubtotal,
                  discount_amount: discount.discount_amount,
                  discount_details: {
                    rule_id: discount.discount_id,
                    tier_name: discount.description,
                    percentage: discount.discount_percentage,
                    components_affected: ['customs']
                  },
                  component_breakdown: {
                    customs: {
                      original: customsDuty,
                      discount: discount.discount_amount,
                      final: customsDuty - discount.discount_amount
                    }
                  }
                }
              );
            });
          }

          componentDiscounts.customs = {
            original: customsDuty,
            discount: customsDiscountAmount,
            final: discountedCustomsDuty,
            applied_discounts: customsDiscountResult.appliedDiscounts.map(d => ({
              source: d.discount_source,
              description: d.description || '',
              amount: d.discount_amount
            }))
          };
        }
        
        // Apply shipping discounts if available
        if (discountsByComponent.has('shipping')) {
          const shippingDiscountResult = DiscountService.getInstance().calculateComponentDiscount(
            baseShippingCost,
            discountsByComponent.get('shipping')!,
            'shipping'
          );
          const componentShippingDiscount = shippingDiscountResult.totalDiscount;
          
          // Check if any of the applied discounts are from user-applied codes
          const hasUserAppliedCode = shippingDiscountResult.appliedDiscounts.some(d => d.discount_source === 'code');
          
          if (hasUserAppliedCode) {
            // User applied a coupon code - use ONLY the code discount, ignore automatic discounts
            shippingDiscountAmount = componentShippingDiscount;
          } else {
            // No user codes - combine with any existing shipping discount (legacy behavior)
            shippingDiscountAmount = Math.min(shippingDiscountAmount + componentShippingDiscount, baseShippingCost);
          }
          
          finalShippingCost = baseShippingCost - shippingDiscountAmount;
          
          // Log automatic shipping discount application
          if (componentShippingDiscount > 0) {
            shippingDiscountResult.appliedDiscounts.forEach(async (discount) => {
              await DiscountLoggingService.getInstance().logAutomaticDiscount(
                discount.discount_source === 'volume' ? 'volume' : 'country',
                {
                  customer_id: input.customer_id,
                  quote_id: input.quote_id,
                  country: input.destination_country,
                  order_total: finalItemsSubtotal,
                  discount_amount: discount.discount_amount,
                  discount_details: {
                    rule_id: discount.discount_id,
                    tier_name: discount.description,
                    percentage: discount.discount_percentage,
                    components_affected: ['shipping']
                  },
                  component_breakdown: {
                    shipping: {
                      original: baseShippingCost,
                      discount: discount.discount_amount,
                      final: baseShippingCost - discount.discount_amount
                    }
                  }
                }
              );
            });
          }
          
          componentDiscounts.shipping = {
            original: baseShippingCost,
            discount: componentShippingDiscount,
            final: finalShippingCost,
            applied_discounts: shippingDiscountResult.appliedDiscounts.map(d => ({
              source: d.discount_source,
              description: d.description || '',
              amount: d.discount_amount
            }))
          };
        }
      } catch (error) {
        console.error('Error fetching component discounts:', error);
      }
    }

    // Step 10: Calculate handling fee dynamically
    let handlingFee = 0;
    let handlingFeeFixed = 0;
    let handlingFeePercentage = 0;
    
    if (routeCalculations) {
      // Use dynamic handling fee from shipping route
      handlingFee = routeCalculations.handling.total;
      handlingFeeFixed = routeCalculations.handling.base_fee;
      handlingFeePercentage = routeCalculations.handling.percentage_fee;
      
      console.log(`🤝 [Dynamic Handling] Base: ${handlingFeeFixed}, Percentage: ${handlingFeePercentage}, Total: ${handlingFee} (capped between ${routeCalculations.handling.min_fee}-${routeCalculations.handling.max_fee})`);
    } else {
      // No handling available - set to 0
      handlingFee = 0;
      handlingFeeFixed = 0;
      handlingFeePercentage = 0;
      
      console.log(`🤝 [No Handling] Route has no handling configuration, Amount: $0`);
    }

    // Apply handling fee discounts if available
    discountedHandlingFee = handlingFee;
    if (discountsByComponent.has('handling')) {
      const handlingDiscountResult = DiscountService.getInstance().calculateComponentDiscount(
        handlingFee,
        discountsByComponent.get('handling')!,
        'handling'
      );
      discountedHandlingFee = handlingDiscountResult.finalValue;
      handlingDiscountAmount = handlingDiscountResult.totalDiscount;
      componentDiscounts.handling = {
        original: handlingFee,
        discount: handlingDiscountAmount,
        final: discountedHandlingFee,
        applied_discounts: handlingDiscountResult.appliedDiscounts.map(d => ({
          source: d.discount_source,
          description: d.description || '',
          amount: d.discount_amount
        }))
      };
    }

    // Step 11: Calculate domestic delivery (with Delhivery for India, NCM for Nepal)
    let domesticDelivery = 0;
    let delhiveryRates: DelhiveryMultiRateResponse | undefined;
    let ncmRates: NCMMultiRateResponse | undefined;
    
    if (input.destination_country === 'IN') {
      // Use Delhivery for Indian deliveries
      try {
        const pincode = input.destination_pincode || input.destination_address?.pincode;
        
        if (pincode && DelhiveryService.isValidPincode(pincode)) {
          console.log('🚚 [Calculator] Using Delhivery for Indian delivery calculation');
          
          const delhiveryRequest: DelhiveryRateRequest = {
            destination_pincode: pincode,
            weight: totalChargeableWeight,
            cod: false, // Assuming prepaid by default
            service_type: input.delhivery_service_type || 'standard'
          };
          
          delhiveryRates = await delhiveryService.getDeliveryRates(delhiveryRequest);
          
          // Use the specific service type selected by the user
          const selectedService = delhiveryRates.rates.find(r => r.service_type === (input.delhivery_service_type || 'standard'));
          const deliveryRateINR = selectedService ? selectedService.rate : delhiveryRates.rates[0]?.rate || 0;
          
          // Convert INR to USD for calculation consistency
          domesticDelivery = await delhiveryService.convertToUSD(deliveryRateINR);
          
          console.log(`🚚 [Delhivery] Rate: ₹${deliveryRateINR} → $${domesticDelivery.toFixed(2)} USD`);
          
        } else {
          console.log('⚠️ [Calculator] Invalid/missing pincode for Delhivery, using fallback rates');
          // Fallback to fixed rates if no valid pincode
          const deliveryRates = DOMESTIC_DELIVERY_RATES[input.destination_country] || DOMESTIC_DELIVERY_RATES.DEFAULT;
          domesticDelivery = input.destination_state === 'rural' ? deliveryRates.rural : deliveryRates.urban;
        }
      } catch (error) {
        console.error('❌ [Delhivery] API error, using fallback rates:', error);
        // Fallback to fixed rates on API failure
        const deliveryRates = DOMESTIC_DELIVERY_RATES[input.destination_country] || DOMESTIC_DELIVERY_RATES.DEFAULT;
        domesticDelivery = input.destination_state === 'rural' ? deliveryRates.rural : deliveryRates.urban;
      }
    } else if (input.destination_country === 'NP') {
      // Use NCM for Nepal deliveries
      try {
        console.log('🏔️ [Calculator] Using NCM for Nepal delivery calculation');
        
        const ncmService = NCMService.getInstance();
        
        // Get branch mapping for the destination address
        const branchPair = await ncmBranchMappingService.getBranchPair({
          city: input.destination_address?.city,
          district: input.destination_address?.district,
          addressLine1: input.destination_address?.line1,
          addressLine2: input.destination_address?.line2
        });
        
        if (branchPair.pickup && branchPair.destination) {
          console.log(`🏔️ [NCM] Branch mapping: ${branchPair.pickup.district} → ${branchPair.destination.district}`);
          
          const ncmRequest: NCMRateRequest = {
            creation: branchPair.pickup.district,
            destination: branchPair.destination.district,
            type: input.ncm_service_type || 'pickup', // Default to pickup
            weight: totalChargeableWeight
          };
          
          ncmRates = await ncmService.getDeliveryRates(ncmRequest);
          
          // Use the specific service type selected by the user
          const selectedService = ncmRates.rates.find(r => r.service_type === (input.ncm_service_type || 'pickup'));
          const deliveryRateNPR = selectedService ? selectedService.rate : ncmRates.rates[0]?.rate || 0;
          
          // Convert NPR to USD for calculation consistency
          domesticDelivery = await ncmService.convertToUSD(deliveryRateNPR);
          
          console.log(`🏔️ [NCM] Rate: ₨${deliveryRateNPR} → $${domesticDelivery.toFixed(2)} USD`);
          
        } else {
          console.log('⚠️ [NCM] No suitable branches found, using fallback rates');
          // Fallback to fixed rates if no branches found
          const deliveryRates = DOMESTIC_DELIVERY_RATES[input.destination_country] || DOMESTIC_DELIVERY_RATES.DEFAULT;
          domesticDelivery = input.destination_state === 'rural' ? deliveryRates.rural : deliveryRates.urban;
        }
      } catch (error) {
        console.error('❌ [NCM] API error, using fallback rates:', error);
        // Fallback to fixed rates on API failure
        const deliveryRates = DOMESTIC_DELIVERY_RATES[input.destination_country] || DOMESTIC_DELIVERY_RATES.DEFAULT;
        domesticDelivery = input.destination_state === 'rural' ? deliveryRates.rural : deliveryRates.urban;
      }
    } else {
      // Use existing logic for other destinations
      const deliveryRates = DOMESTIC_DELIVERY_RATES[input.destination_country] || DOMESTIC_DELIVERY_RATES.DEFAULT;
      domesticDelivery = input.destination_state === 'rural' ? deliveryRates.rural : deliveryRates.urban;
    }

    // Apply delivery discounts if available
    discountedDelivery = domesticDelivery;
    if (discountsByComponent.has('delivery')) {
      const deliveryDiscountResult = DiscountService.getInstance().calculateComponentDiscount(
        domesticDelivery,
        discountsByComponent.get('delivery')!,
        'delivery'
      );
      discountedDelivery = deliveryDiscountResult.finalValue;
      deliveryDiscountAmount = deliveryDiscountResult.totalDiscount;
      componentDiscounts.delivery = {
        original: domesticDelivery,
        discount: deliveryDiscountAmount,
        final: discountedDelivery,
        applied_discounts: deliveryDiscountResult.appliedDiscounts.map(d => ({
          source: d.discount_source,
          description: d.description || '',
          amount: d.discount_amount
        }))
      };
    }

    // Step 12: Calculate taxable value (all costs before local tax)
    // CRITICAL FIX: Use customer billing base, not customs CIF value
    const taxableValue = customerBillingBase + discountedCustomsDuty + discountedHandlingFee + discountedDelivery;

    // Step 11: Calculate local tax (GST/VAT) on taxable value
    let localTaxRate = countryConfig.local_tax;
    
    // For US, use state-specific rate if destination state provided
    if (input.destination_country === 'US' && input.destination_state) {
      localTaxRate = US_STATE_TAX_RATES[input.destination_state] || US_STATE_TAX_RATES.DEFAULT;
    }
    
    const localTaxAmount = taxableValue * (localTaxRate / 100);
    
    // Apply tax discounts if available (rare but possible for "we pay the VAT" campaigns)
    discountedTaxAmount = localTaxAmount;
    if (discountsByComponent.has('taxes')) {
      const taxDiscountResult = DiscountService.getInstance().calculateComponentDiscount(
        localTaxAmount,
        discountsByComponent.get('taxes')!,
        'taxes'
      );
      discountedTaxAmount = taxDiscountResult.finalValue;
      taxDiscountAmount = taxDiscountResult.totalDiscount;
      componentDiscounts.taxes = {
        original: localTaxAmount,
        discount: taxDiscountAmount,
        final: discountedTaxAmount,
        applied_discounts: taxDiscountResult.appliedDiscounts.map(d => ({
          source: d.discount_source,
          description: d.description || '',
          amount: d.discount_amount
        }))
      };
    }

    // Step 12: Calculate subtotal before payment gateway fee
    const subtotalBeforeGateway = taxableValue + discountedTaxAmount;

    // Step 13: Calculate payment gateway fee
    const gateway = input.payment_gateway || 'stripe';
    const gatewayFees = PAYMENT_GATEWAY_FEES[gateway as keyof typeof PAYMENT_GATEWAY_FEES] || PAYMENT_GATEWAY_FEES.stripe;
    const paymentGatewayFee = (subtotalBeforeGateway * (gatewayFees.percentage / 100)) + gatewayFees.fixed;

    // Step 14: Calculate final totals
    // Note: totalUSD is now actually totalOriginCurrency after our origin currency integration
    const totalOriginCurrency = subtotalBeforeGateway + paymentGatewayFee;
    const totalCustomerCurrency = totalOriginCurrency * exchangeRate;
    
    // Calculate total savings (including all component discounts)
    const totalSavings = totalItemDiscounts + orderDiscountAmount + shippingDiscountAmount + 
                        customsDiscountAmount + handlingDiscountAmount + deliveryDiscountAmount + taxDiscountAmount;

    // Return structured result
    return {
      inputs: {
        items_cost: itemsTotal,
        total_weight_kg: this.round(totalActualWeight),
        total_volumetric_weight_kg: totalVolumetricWeight > 0 ? this.round(totalVolumetricWeight) : undefined,
        total_chargeable_weight_kg: this.round(totalChargeableWeight),
        origin_country: input.origin_country,
        origin_currency: input.origin_currency, // NEW: Origin currency
        origin_state: input.origin_state,
        destination_country: input.destination_country,
        destination_state: input.destination_state,
        shipping_method: shippingMethod,
        payment_gateway: gateway
      },
      applied_rates: {
        exchange_rate: exchangeRate,
        origin_sales_tax_percentage: originSalesTaxRate,
        customs_percentage: effectiveCustomsRate, // Now shows HSN-adjusted rate if used
        local_tax_percentage: localTaxRate,
        insurance_percentage: insurancePercentage,
        shipping_rate_per_kg: shippingRatePerKg,
        handling_fee_fixed: handlingFeeFixed,
        handling_fee_percentage: handlingFeePercentage,
        payment_gateway_fee_percentage: gatewayFees.percentage,
        payment_gateway_fee_fixed: gatewayFees.fixed,
        // Additional HSN info
        hsn_applied: itemsWithHSN.length > 0,
        hsn_items_count: itemsWithHSN.length
      },
      calculation_steps: {
        items_subtotal: this.round(itemsTotal),
        item_discounts: this.round(totalItemDiscounts),
        discounted_items_subtotal: this.round(discountedItemsSubtotal),
        order_discount_amount: this.round(orderDiscountAmount),
        origin_sales_tax: this.round(originSalesTax),
        shipping_cost: this.round(baseShippingCost),
        shipping_discount_amount: this.round(shippingDiscountAmount),
        discounted_shipping_cost: this.round(finalShippingCost),
        insurance_amount: this.round(insuranceAmount),
        cif_value: this.round(cifValueForCustoms),
        customs_duty: this.round(customsDuty),
        customs_discount_amount: this.round(customsDiscountAmount),
        discounted_customs_duty: this.round(discountedCustomsDuty),
        handling_fee: this.round(handlingFee),
        handling_discount_amount: this.round(handlingDiscountAmount),
        discounted_handling_fee: this.round(discountedHandlingFee),
        domestic_delivery: this.round(domesticDelivery),
        delivery_discount_amount: this.round(deliveryDiscountAmount),
        discounted_delivery: this.round(discountedDelivery),
        delhivery_rates: delhiveryRates,
        ncm_rates: ncmRates,
        taxable_value: this.round(taxableValue),
        local_tax_amount: this.round(localTaxAmount),
        tax_discount_amount: this.round(taxDiscountAmount),
        discounted_tax_amount: this.round(discountedTaxAmount),
        subtotal_before_gateway: this.round(subtotalBeforeGateway),
        payment_gateway_fee: this.round(paymentGatewayFee),
        total_usd: this.round(totalOriginCurrency), // Note: renamed from totalUSD, now in origin currency
        total_origin_currency: this.round(totalOriginCurrency), // NEW: Explicit origin currency total
        total_customer_currency: this.round(totalCustomerCurrency),
        total_savings: this.round(totalSavings),
        component_discounts: Object.keys(componentDiscounts).length > 0 ? componentDiscounts : undefined,
        weight_analysis: {
          items: weightAnalysisItems,
          totals: {
            total_actual_weight: this.round(totalActualWeight),
            total_volumetric_weight: this.round(totalVolumetricWeight),
            total_chargeable_weight: this.round(totalChargeableWeight),
            volumetric_items_count: volumetricItemsCount
          }
        }
      },
      calculation_timestamp: new Date().toISOString(),
      calculation_version: 'v2',
      // Add route calculations for debug component
      route_calculations: routeCalculations
    };
  }

  private async getCustomerCurrency(countryCode: string): Promise<string> {
    // Map country to currency
    const countryCurrencyMap: Record<string, string> = {
      IN: 'INR',
      NP: 'NPR',
      US: 'USD',
      CA: 'CAD',
      GB: 'GBP',
      AU: 'AUD',
      // Add more as needed
    };

    return countryCurrencyMap[countryCode] || 'USD';
  }

  private async convertToOriginCurrency(amountUSD: number, originCountry: string): Promise<number> {
    const originCurrency = await this.getCustomerCurrency(originCountry);
    
    // If origin is USD, no conversion needed
    if (originCurrency === 'USD') {
      return amountUSD;
    }
    
    // Convert USD to origin currency
    const exchangeRate = await currencyService.getExchangeRate('USD', originCurrency);
    return amountUSD * exchangeRate;
  }

  private round(value: number): number {
    return Math.round(value * 100) / 100;
  }

  // Get tax info for display
  getTaxInfo(countryCode: string) {
    const config = COUNTRY_TAX_CONFIG[countryCode as keyof typeof COUNTRY_TAX_CONFIG] 
      || COUNTRY_TAX_CONFIG.DEFAULT;
    
    return {
      country: config.name,
      customs: config.customs,
      local_tax: config.local_tax,
      local_tax_name: config.local_tax_name
    };
  }

  // Get available shipping methods
  getShippingMethods() {
    return [
      { value: 'economy', label: 'Economy (15-20 days)', rate: SHIPPING_RATES.economy },
      { value: 'standard', label: 'Standard (7-10 days)', rate: SHIPPING_RATES.standard },
      { value: 'express', label: 'Express (3-5 days)', rate: SHIPPING_RATES.express }
    ];
  }

  // Get US states for sales tax
  getUSStates() {
    return Object.entries(US_STATE_TAX_RATES)
      .filter(([code]) => code !== 'DEFAULT')
      .map(([code, rate]) => ({ code, rate }))
      .sort((a, b) => a.code.localeCompare(b.code));
  }

  // Get payment gateways
  getPaymentGateways() {
    return Object.entries(PAYMENT_GATEWAY_FEES).map(([gateway, fees]) => ({
      value: gateway,
      label: gateway.charAt(0).toUpperCase() + gateway.slice(1),
      fees
    }));
  }


  // Get delivery location types
  getDeliveryTypes() {
    return [
      { value: 'urban', label: 'Urban/City' },
      { value: 'rural', label: 'Rural/Remote' }
    ];
  }

  // Get HSN information (safe lookup - display only)
  getHSNInfo(hsnCode: string, country: string) {
    const countryRates = HSN_CUSTOMS_RATES[country];
    if (!countryRates) return null;
    
    const rate = countryRates[hsnCode];
    if (rate === undefined) return null;
    
    // Simple HSN descriptions (can be expanded)
    const hsnDescriptions: Record<string, string> = {
      '6109': 'T-shirts, singlets and other vests',
      '8517': 'Mobile phones and communication devices',
      '8471': 'Laptops and computing devices',
      '6204': 'Women\'s dresses and clothing'
    };
    
    return {
      code: hsnCode,
      description: hsnDescriptions[hsnCode] || 'Product',
      customsRate: rate,
      countryRate: COUNTRY_TAX_CONFIG[country as keyof typeof COUNTRY_TAX_CONFIG]?.customs || 10
    };
  }
}

export const simplifiedQuoteCalculator = new SimplifiedQuoteCalculator();