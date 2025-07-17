import { supabase } from '../integrations/supabase/client';
import { getExchangeRate, convertCurrency, getCountryCurrency } from './currencyUtils';
import type {
  ShippingCost,
  ShippingRoute,
  ShippingRouteDB,
  UnifiedQuoteInput,
  UnifiedQuoteResult,
  QuoteCalculationConfig,
  WeightTier,
  Carrier,
} from '../types/shipping';
import type { Tables } from '../integrations/supabase/types';

type CountrySettings = Tables<'country_settings'>;

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
  price: number = 0,
): Promise<ShippingCost> {
  console.log(
    '[getShippingCost] originCountry:',
    originCountry,
    'destinationCountry:',
    destinationCountry,
  );
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
      cost: 25.0, // Default fallback
      carrier: 'Standard',
      deliveryDays: '7-14',
      method: 'default',
    };
  }
}

/**
 * Calculate shipping cost using route-specific settings
 */
function calculateRouteSpecificShipping(
  route: ShippingRouteDB,
  weight: number,
  price: number,
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
    const weightTiers = route.weight_tiers as WeightTier[];
    for (const tier of weightTiers) {
      if (convertedWeight >= tier.min && (tier.max === null || convertedWeight <= tier.max)) {
        baseCost = Math.max(baseCost, tier.cost);
        break;
      }
    }
  }

  const finalCost = baseCost + percentageCost;

  // Get carrier info
  const carriers = route.carriers as Carrier[];
  const defaultCarrier = carriers?.[0] || { name: 'DHL', days: '5-10' };

  return {
    cost: Math.round(finalCost * 100) / 100,
    carrier: defaultCarrier.name,
    deliveryDays: defaultCarrier.days,
    method: 'route-specific',
    route: route,
  };
}

/**
 * Calculate shipping cost using existing country settings (fallback)
 */
async function calculateFallbackShipping(
  destinationCountry: string,
  weight: number,
  price: number,
): Promise<ShippingCost> {
  try {
    const { data: countrySettings, error } = await supabase
      .from('country_settings')
      .select('*')
      .eq('code', destinationCountry)
      .single();

    if (countrySettings && !error) {
      // Use the same logic as your current manual calculator
      const shippingCost = calculateStandardInternationalShipping(weight, price, countrySettings);

      return {
        cost: shippingCost,
        carrier: 'Standard',
        deliveryDays: '7-14',
        method: 'default',
      };
    }
  } catch (error) {
    console.error('Error getting country settings:', error);
  }

  // Ultimate fallback
  return {
    cost: 25.0,
    carrier: 'Standard',
    deliveryDays: '7-14',
    method: 'default',
  };
}

/**
 * Calculate standard international shipping (same as your current manual calculator)
 */
function calculateStandardInternationalShipping(
  itemWeight: number,
  itemPrice: number,
  settings: CountrySettings,
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
 * Enhanced unified quote calculator with proper currency conversion
 * All calculations done in origin currency, with exchange rate for display
 */
export async function calculateUnifiedQuote(
  input: UnifiedQuoteInput,
  supabaseClient = supabase,
): Promise<
  UnifiedQuoteResult & {
    exchangeRate: number;
    exchangeRateSource: string;
    warning?: string;
  }
> {
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
    config,
  } = input;

  console.log(
    `[calculateUnifiedQuote] ${originCountry} → ${destinationCountry}, Item: ${itemPrice}, Weight: ${itemWeight}`,
  );

  // Get exchange rate for currency conversion
  const exchangeRateResult = await getExchangeRate(originCountry, destinationCountry);
  console.log(
    `[calculateUnifiedQuote] Exchange rate: ${exchangeRateResult.rate} (${exchangeRateResult.source})`,
  );

  // Get shipping cost (returns cost in origin currency)
  const shippingCost = await getShippingCost(
    originCountry,
    destinationCountry,
    itemWeight,
    itemPrice,
  );

  // Get country settings for customs and VAT calculations
  const { data: countrySettings } = await supabaseClient
    .from('country_settings')
    .select('*')
    .eq('code', destinationCountry)
    .single();

  // All calculations in origin currency
  const originCurrency = getCountryCurrency(originCountry);
  const destinationCurrency = getCountryCurrency(destinationCountry);

  // Calculate customs duty (applied to converted amount if different currency)
  let customsDuty = 0;
  if (countrySettings?.customs_percent) {
    if (originCurrency === destinationCurrency) {
      customsDuty = (itemPrice * countrySettings.customs_percent) / 100;
    } else {
      // Convert item price to destination currency for customs calculation
      const convertedItemPrice = convertCurrency(
        itemPrice,
        exchangeRateResult.rate,
        destinationCurrency,
      );
      customsDuty = (convertedItemPrice * countrySettings.customs_percent) / 100;
      // Convert customs duty back to origin currency for total calculation
      customsDuty = convertCurrency(customsDuty, 1 / exchangeRateResult.rate, originCurrency);
    }
  }

  // Calculate VAT (applied to converted amounts if different currency)
  let vat = 0;
  if (countrySettings?.vat_percent) {
    if (originCurrency === destinationCurrency) {
      vat = ((itemPrice + shippingCost.cost + customsDuty) * countrySettings.vat_percent) / 100;
    } else {
      // Convert all amounts to destination currency for VAT calculation
      const convertedItemPrice = convertCurrency(
        itemPrice,
        exchangeRateResult.rate,
        destinationCurrency,
      );
      const convertedShipping = convertCurrency(
        shippingCost.cost,
        exchangeRateResult.rate,
        destinationCurrency,
      );
      const convertedCustoms = convertCurrency(
        customsDuty,
        exchangeRateResult.rate,
        destinationCurrency,
      );

      vat =
        ((convertedItemPrice + convertedShipping + convertedCustoms) *
          countrySettings.vat_percent) /
        100;
      // Convert VAT back to origin currency for total calculation
      vat = convertCurrency(vat, 1 / exchangeRateResult.rate, originCurrency);
    }
  }

  // Calculate total in origin currency
  const subtotal = itemPrice + salesTax + merchantShipping + domesticShipping + shippingCost.cost;
  const totalWithCharges = subtotal + handlingCharge + insuranceAmount + customsDuty + vat;
  const finalTotal = totalWithCharges - discount;

  console.log(`[calculateUnifiedQuote] Final total: ${finalTotal} ${originCurrency}`);

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
    },
    shippingCost,
    settings: {
      usedRoute: shippingCost.route,
      usedSettings: shippingCost.method === 'route-specific' ? 'route-specific' : 'default',
      originCountry,
      destinationCountry,
    },
    exchangeRate: exchangeRateResult.rate,
    exchangeRateSource: exchangeRateResult.source,
    warning: exchangeRateResult.warning,
  };
}

/**
 * Get all shipping routes for admin management
 */
export async function getShippingRoutes(): Promise<ShippingRouteDB[]> {
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

    return (data as ShippingRouteDB[]) || [];
  } catch (error) {
    console.error('Error getting shipping routes:', error);
    return [];
  }
}

/**
 * Create or update a shipping route
 */
export async function upsertShippingRoute(
  routeData: Partial<ShippingRouteDB>,
): Promise<{ success: boolean; error?: string }> {
  try {
    // Map camelCase form fields to snake_case database fields
    const dbData = {
      id: routeData.id,
      origin_country: routeData.originCountry,
      destination_country: routeData.destinationCountry,
      exchange_rate: routeData.exchangeRate,
      base_shipping_cost: routeData.baseShippingCost,
      cost_per_kg: routeData.costPerKg,
      shipping_per_kg: routeData.shippingPerKg,
      cost_percentage: routeData.costPercentage,
      processing_days: routeData.processingDays,
      customs_clearance_days: routeData.customsClearanceDays,
      weight_unit: routeData.weightUnit,
      delivery_options: routeData.deliveryOptions,
      weight_tiers: routeData.weightTiers,
      carriers: routeData.carriers,
      max_weight: routeData.maxWeight,
      restricted_items: routeData.restrictedItems,
      requires_documentation: routeData.requiresDocumentation,
      is_active: routeData.isActive,
    };

    const onConflict: string = routeData.id ? 'id' : 'origin_country,destination_country';
    const { error } = await supabase.from('shipping_routes').upsert(dbData, { onConflict });

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
export async function deleteShippingRoute(
  id: number,
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.from('shipping_routes').delete().eq('id', id);

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
