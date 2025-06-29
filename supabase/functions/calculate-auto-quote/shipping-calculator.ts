/**
 * Unified Shipping Calculator for Edge Functions
 * Supports shipping routes and weight units like the main application
 */

export interface ShippingCost {
  cost: number;
  carrier: string;
  deliveryDays: string;
  method: 'route-specific' | 'country_settings' | 'default';
  route?: any;
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
  customsPercent?: number;
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
    paymentGatewayFee: number;
  };
  shippingCost: ShippingCost;
  settings: {
    usedRoute?: any;
    usedSettings: 'route-specific' | 'country_settings';
    originCountry: string;
    destinationCountry: string;
  };
}

/**
 * Convert weight between different units
 */
function convertWeight(weight: number, fromUnit: string, toUnit: string): number {
  if (fromUnit === toUnit) return weight;
  
  // Use precise conversion factors
  const KG_TO_LB = 2.20462262185;
  const LB_TO_KG = 0.45359237;
  
  if (fromUnit === 'kg' && toUnit === 'lb') {
    return weight * KG_TO_LB;
  } else if (fromUnit === 'lb' && toUnit === 'kg') {
    return weight * LB_TO_KG;
  }
  
  return weight;
}

/**
 * Get shipping cost for origin-destination combination
 */
export async function getShippingCost(
  originCountry: string,
  destinationCountry: string,
  weight: number,
  price: number = 0,
  supabase: any
): Promise<ShippingCost> {
  console.log('[getShippingCost] originCountry:', originCountry, 'destinationCountry:', destinationCountry);
  
  try {
    // First, try to get route-specific shipping cost
    const { data: route, error: routeError } = await supabase
      .from('shipping_routes')
      .select('*')
      .eq('origin_country', originCountry)
      .eq('destination_country', destinationCountry)
      .eq('is_active', true)
      .single();

    if (route && !routeError) {
      return calculateRouteSpecificShipping(route, weight, price);
    }

    // Fallback to country settings
    return calculateFallbackShipping(destinationCountry, weight, price, supabase);
  } catch (error) {
    console.error('Error getting shipping cost:', error);
    return {
      cost: 25.00, // Default fallback
      carrier: 'Standard',
      deliveryDays: '7-14',
      method: 'default'
    };
  }
}

/**
 * Calculate shipping cost using route-specific settings
 */
function calculateRouteSpecificShipping(
  route: any,
  weight: number,
  price: number
): ShippingCost {
  // Convert weight to route's weight unit if needed
  let convertedWeight = weight;
  const routeWeightUnit = route.weight_unit || 'kg';
  
  // If the route uses pounds but weight is in kg, convert kg to lb
  if (routeWeightUnit === 'lb') {
    convertedWeight = weight * 2.20462262185; // Convert kg to lb
  }
  
  let baseCost = route.base_shipping_cost || 0;
  
  // Add weight-based cost using converted weight
  baseCost += convertedWeight * (route.cost_per_kg || 0);
  
  // Add percentage-based cost
  const percentageCost = (price * (route.cost_percentage || 0)) / 100;
  
  // Check weight tiers for minimum cost (using converted weight)
  if (route.weight_tiers) {
    const weightTiers = route.weight_tiers as any[];
    for (const tier of weightTiers) {
      if (convertedWeight >= tier.min && (tier.max === null || convertedWeight <= tier.max)) {
        baseCost = Math.max(baseCost, tier.cost);
        break;
      }
    }
  }
  
  const finalCost = baseCost + percentageCost;
  
  // Get carrier info
  const carriers = route.carriers as any[];
  const defaultCarrier = carriers?.[0] || { name: 'DHL', days: '5-10' };
  
  return {
    cost: Math.round(finalCost * 100) / 100,
    carrier: defaultCarrier.name,
    deliveryDays: defaultCarrier.days,
    method: 'route-specific',
    route: route
  };
}

/**
 * Calculate fallback shipping using country settings
 */
async function calculateFallbackShipping(
  destinationCountry: string,
  weight: number,
  price: number,
  supabase: any
): Promise<ShippingCost> {
  try {
    const { data: countrySettings, error } = await supabase
      .from('country_settings')
      .select('*')
      .eq('code', destinationCountry)
      .single();

    if (error || !countrySettings) {
      return {
        cost: 25.00,
        carrier: 'Standard',
        deliveryDays: '7-14',
        method: 'country_settings'
      };
    }

    let shippingWeight = weight;
    if (countrySettings.weight_unit === "kg") {
      shippingWeight *= 2.20462262185; // Standardize to lbs for internal calculation
    }

    // Apply rounding logic
    if (shippingWeight > 0 && shippingWeight <= 1) {
      shippingWeight = 1;
    } else if (shippingWeight > 1) {
      shippingWeight = Math.ceil(shippingWeight);
    }

    const { min_shipping, additional_shipping, additional_weight } = countrySettings;
    let shippingCost = min_shipping || 0;
    
    if (shippingWeight > 1) {
      shippingCost += (shippingWeight - 1) * (additional_weight || 0);
    }
    shippingCost += (price * (additional_shipping || 0)) / 100;

    return {
      cost: Math.round(shippingCost * 100) / 100,
      carrier: 'Standard',
      deliveryDays: '7-14',
      method: 'country_settings'
    };
  } catch (error) {
    console.error('Error calculating fallback shipping:', error);
    return {
      cost: 25.00,
      carrier: 'Standard',
      deliveryDays: '7-14',
      method: 'country_settings'
    };
  }
}

/**
 * Unified quote calculator that works for both manual and auto quotes
 */
export async function calculateUnifiedQuote(
  input: UnifiedQuoteInput,
  supabase: any
): Promise<UnifiedQuoteResult> {
  const {
    itemPrice,
    itemWeight,
    destinationCountry,
    originCountry = 'US', // Default origin
    salesTax = 0,
    merchantShipping = 0,
    domesticShipping = 0,
    handlingCharge = 0,
    insuranceAmount = 0,
    discount = 0,
    customsCategory = 'general',
    customsPercent
  } = input;

  // Get shipping cost
  const shippingCost = await getShippingCost(originCountry, destinationCountry, itemWeight, itemPrice, supabase);

  // Get country settings for customs and VAT calculations
  const { data: countrySettings } = await supabase
    .from('country_settings')
    .select('*')
    .eq('code', destinationCountry)
    .single();

  // Calculate customs duty
  const customsDutyPercent = customsPercent !== undefined
    ? customsPercent
    : (countrySettings?.customs_percent || 0);
  const customsDuty = (itemPrice * customsDutyPercent) / 100;

  // Calculate VAT
  const vatPercent = countrySettings?.vat_percent || 0;
  const vat = countrySettings 
    ? ((itemPrice + shippingCost.cost + customsDuty) * vatPercent) / 100
    : 0;

  // Payment gateway fee (example: 2.5% of subtotal, can be customized)
  const paymentGatewayFeePercent = countrySettings?.payment_gateway_fee_percent || 0;
  const paymentGatewayFee = ((itemPrice + shippingCost.cost + customsDuty + vat) * paymentGatewayFeePercent) / 100;

  // Calculate total
  const subtotal = itemPrice + salesTax + merchantShipping + domesticShipping + shippingCost.cost;
  const totalWithCharges = subtotal + handlingCharge + insuranceAmount + customsDuty + vat + paymentGatewayFee;
  const finalTotal = totalWithCharges - discount;

  // Detailed logging for debugging
  console.log('--- Quote Calculation Breakdown ---');
  console.log('Item Price:', itemPrice);
  console.log('Sales Tax:', salesTax);
  console.log('Merchant Shipping:', merchantShipping);
  console.log('Domestic Shipping:', domesticShipping);
  console.log('International Shipping:', shippingCost.cost);
  console.log('Handling Charge:', handlingCharge);
  console.log('Insurance Amount:', insuranceAmount);
  console.log('Customs Duty:', customsDuty, `(${customsDutyPercent}%)`);
  console.log('VAT:', vat, `(${vatPercent}%)`);
  console.log('Payment Gateway Fee:', paymentGatewayFee, `(${paymentGatewayFeePercent}%)`);
  console.log('Discount:', discount);
  console.log('Subtotal:', subtotal);
  console.log('Total with Charges:', totalWithCharges);
  console.log('Final Total:', finalTotal);
  console.log('-----------------------------------');

  return {
    totalCost: Math.round(finalTotal * 100) / 100,
    breakdown: {
      itemPrice,
      salesTax,
      merchantShipping,
      domesticShipping,
      internationalShipping: shippingCost.cost,
      handlingCharge,
      insuranceAmount,
      customsDuty: Math.round(customsDuty * 100) / 100,
      vat: Math.round(vat * 100) / 100,
      discount,
      paymentGatewayFee: Math.round(paymentGatewayFee * 100) / 100
    },
    shippingCost,
    settings: {
      usedRoute: shippingCost.route,
      usedSettings: shippingCost.method === 'route-specific' ? 'route-specific' : 'country_settings',
      originCountry,
      destinationCountry
    }
  };
} 