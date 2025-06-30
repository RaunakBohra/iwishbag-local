import { supabase } from '../integrations/supabase/client';
import type { 
  ShippingCost, 
  ShippingRoute, 
  AutoQuoteSettings,
  UnifiedQuoteInput,
  UnifiedQuoteResult,
  QuoteCalculationConfig
} from '../types/shipping';
import type { CountrySettings } from '../lib/database.types';

/**
 * Unified Shipping Calculator
 * Uses the same logic as manual quotes but supports route-specific shipping costs
 */

/**
 * Get shipping cost for origin-destination combination
 */
export async function getShippingCost(
  originCountry: string,
  destinationCountry: string,
  weight: number,
  price: number = 0
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
      .maybeSingle();

    if (route && !routeError) {
      return calculateRouteSpecificShipping(route, weight, price);
    }

    // Fallback to country settings (existing logic)
    return calculateFallbackShipping(destinationCountry, weight, price);
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
    convertedWeight = weight * 2.20462; // Convert kg to lb
  }
  // If the route uses kg but weight is in lb, convert lb to kg
  else if (routeWeightUnit === 'kg') {
    // Weight is already in kg (assuming input is always in kg)
    convertedWeight = weight;
  }
  
  let baseCost = route.base_shipping_cost;
  
  // Add weight-based cost using converted weight
  baseCost += convertedWeight * route.cost_per_kg;
  
  // Add percentage-based cost
  const percentageCost = (price * route.cost_percentage) / 100;
  
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
 * Calculate shipping cost using existing country settings (fallback)
 */
async function calculateFallbackShipping(
  destinationCountry: string,
  weight: number,
  price: number
): Promise<ShippingCost> {
  try {
    const { data: countrySettings, error } = await supabase
      .from('country_settings')
      .select('*')
      .eq('code', destinationCountry)
      .single();

    if (countrySettings && !error) {
      // Use the same logic as your current manual calculator
      const shippingCost = calculateStandardInternationalShipping(
        weight,
        price,
        countrySettings
      );

      return {
        cost: shippingCost,
        carrier: 'Standard',
        deliveryDays: '7-14',
        method: 'default'
      };
    }
  } catch (error) {
    console.error('Error getting country settings:', error);
  }

  // Ultimate fallback
  return {
    cost: 25.00,
    carrier: 'Standard',
    deliveryDays: '7-14',
    method: 'default'
  };
}

/**
 * Calculate standard international shipping (same as your current manual calculator)
 */
function calculateStandardInternationalShipping(
  itemWeight: number,
  itemPrice: number,
  settings: CountrySettings
): number {
  let shippingCost = settings.min_shipping;
  
  // Add percentage of item price
  shippingCost += (itemPrice * settings.additional_shipping) / 100;
  
  // Add weight-based cost
  if (itemWeight > 1) {
    const additionalWeight = itemWeight - 1;
    shippingCost += additionalWeight * settings.additional_weight;
  }
  
  return Math.round(shippingCost * 100) / 100;
}

/**
 * Unified quote calculator that works for both manual and auto quotes
 * Uses the same logic as your current manual calculator
 */
export async function calculateUnifiedQuote(
  input: UnifiedQuoteInput,
  supabaseClient: any = supabase
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
    config
  } = input;

  // Get shipping cost
  const shippingCost = await getShippingCost(originCountry, destinationCountry, itemWeight, itemPrice);

  // Get country settings for customs and VAT calculations
  const { data: countrySettings } = await supabaseClient
    .from('country_settings')
    .select('*')
    .eq('code', destinationCountry)
    .single();

  // Calculate customs duty (same as manual calculator)
  const customsDuty = countrySettings 
    ? (itemPrice * countrySettings.customs_percent) / 100
    : 0;

  // Calculate VAT (same as manual calculator)
  const vat = countrySettings 
    ? ((itemPrice + shippingCost.cost + customsDuty) * countrySettings.vat_percent) / 100
    : 0;

  // Calculate total (same as manual calculator logic)
  const subtotal = itemPrice + salesTax + merchantShipping + domesticShipping + shippingCost.cost;
  const totalWithCharges = subtotal + handlingCharge + insuranceAmount + customsDuty + vat;
  const finalTotal = totalWithCharges - discount;

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
      discount
    },
    shippingCost,
    settings: {
      usedRoute: shippingCost.route,
      usedSettings: shippingCost.method === 'route-specific' ? 'route-specific' : 'default',
      originCountry,
      destinationCountry
    }
  };
}

/**
 * Get all shipping routes for admin management
 */
export async function getShippingRoutes(): Promise<ShippingRoute[]> {
  try {
    const { data, error } = await supabase
      .from('shipping_routes')
      .select('*')
      .order('origin_country', { ascending: true })
      .order('destination_country', { ascending: true });

    if (error) {
      console.error('Error getting shipping routes:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error getting shipping routes:', error);
    return [];
  }
}

/**
 * Create or update a shipping route
 */
export async function upsertShippingRoute(routeData: any): Promise<{ success: boolean; error?: string }> {
  try {
    let onConflict;
    if (routeData.id) {
      onConflict = 'id';
    } else {
      onConflict = 'origin_country,destination_country';
    }
    const { error } = await supabase
      .from('shipping_routes')
      .upsert(routeData, { onConflict });

    if (error) {
      console.error('Error upserting shipping route:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Error upserting shipping route:', error);
    return { success: false, error: 'Unknown error occurred' };
  }
}

/**
 * Delete a shipping route
 */
export async function deleteShippingRoute(id: number): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('shipping_routes')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting shipping route:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Error deleting shipping route:', error);
    return { success: false, error: 'Unknown error occurred' };
  }
} 