/**
 * Unified Shipping Calculator for Edge Functions
 * Supports shipping routes and weight units like the main application
 */ /**
 * Convert weight between different units
 */ function _convertWeight(weight, fromUnit, toUnit) {
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
 */ export async function getShippingCost(
  originCountry,
  destinationCountry,
  weight,
  price = 0,
  supabase,
) {
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
      .single();
    if (route && !routeError) {
      return calculateRouteSpecificShipping(route, weight, price);
    }
    // Fallback to country settings
    return calculateFallbackShipping(destinationCountry, weight, price, supabase);
  } catch (error) {
    console.error('Error getting shipping cost:', error);
    return {
      cost: 25.0,
      carrier: 'Standard',
      deliveryDays: '7-14',
      method: 'default',
    };
  }
}
/**
 * Calculate shipping cost using route-specific settings
 */ function calculateRouteSpecificShipping(route, weight, price) {
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
    const weightTiers = route.weight_tiers;
    for (const tier of weightTiers) {
      if (convertedWeight >= tier.min && (tier.max === null || convertedWeight <= tier.max)) {
        baseCost = Math.max(baseCost, tier.cost);
        break;
      }
    }
  }
  const finalCost = baseCost + percentageCost;
  // Get carrier info
  const carriers = route.carriers;
  const defaultCarrier = carriers?.[0] || {
    name: 'DHL',
    days: '5-10',
  };
  return {
    cost: Math.round(finalCost * 100) / 100,
    carrier: defaultCarrier.name,
    deliveryDays: defaultCarrier.days,
    method: 'route-specific',
    route: route,
  };
}
/**
 * Calculate fallback shipping using country settings
 */ async function calculateFallbackShipping(destinationCountry, weight, price, supabase) {
  try {
    const { data: countrySettings, error } = await supabase
      .from('country_settings')
      .select('*')
      .eq('code', destinationCountry)
      .single();
    if (error || !countrySettings) {
      return {
        cost: 25.0,
        carrier: 'Standard',
        deliveryDays: '7-14',
        method: 'country_settings',
      };
    }
    let shippingWeight = weight;
    if (countrySettings.weight_unit === 'kg') {
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
      method: 'country_settings',
    };
  } catch (error) {
    console.error('Error calculating fallback shipping:', error);
    return {
      cost: 25.0,
      carrier: 'Standard',
      deliveryDays: '7-14',
      method: 'country_settings',
    };
  }
}
/**
 * Unified quote calculator that works for both manual and auto quotes
 */ export async function calculateUnifiedQuote(input, supabase) {
  const {
    itemPrice,
    itemWeight,
    destinationCountry,
    originCountry = 'US',
    salesTax = 0,
    merchantShipping = 0,
    domesticShipping = 0,
    handlingCharge = 0,
    insuranceAmount = 0,
    discount = 0,
    _customsCategory = 'general',
  } = input;
  // Get shipping cost
  const shippingCost = await getShippingCost(
    originCountry,
    destinationCountry,
    itemWeight,
    itemPrice,
    supabase,
  );
  // Get country settings for customs and VAT calculations
  const { data: countrySettings } = await supabase
    .from('country_settings')
    .select('*')
    .eq('code', destinationCountry)
    .single();
  // Calculate customs duty
  const customsDuty = countrySettings
    ? (itemPrice * (countrySettings.customs_percent || 0)) / 100
    : 0;
  // Calculate VAT
  const vat = countrySettings
    ? ((itemPrice + shippingCost.cost + customsDuty) * (countrySettings.vat_percent || 0)) / 100
    : 0;
  // Calculate total
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
      discount,
    },
    shippingCost,
    settings: {
      usedRoute: shippingCost.route,
      usedSettings:
        shippingCost.method === 'route-specific' ? 'route-specific' : 'country_settings',
      originCountry,
      destinationCountry,
    },
  };
}
