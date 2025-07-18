import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';

export interface CustomsTierResult {
  customs_percentage: number;
  vat_percentage: number;
  applied_tier: Tables<'route_customs_tiers'> | null;
  fallback_used: boolean;
  route: string;
}

/**
 * Calculate customs percentage using route-specific customs tiers
 * @param originCountry - Origin country code (e.g., 'JP')
 * @param destinationCountry - Destination country code (e.g., 'IN')
 * @param itemPrice - Total item price in USD
 * @param itemWeight - Total item weight in kg
 * @returns CustomsTierResult with customs percentage and applied tier info
 */
export async function calculateCustomsTier(
  originCountry: string,
  destinationCountry: string,
  itemPrice: number,
  itemWeight: number,
): Promise<CustomsTierResult> {
  console.log(`🔍 Calculating customs tier for route: ${originCountry} → ${destinationCountry}`);
  console.log(`📦 Item details: $${itemPrice}, ${itemWeight}kg`);

  try {
    // Get route-specific customs tiers
    const { data: tiers, error } = await supabase
      .from('route_customs_tiers')
      .select('*')
      .eq('origin_country', originCountry)
      .eq('destination_country', destinationCountry)
      .eq('is_active', true)
      .order('priority_order', { ascending: true });

    if (error) {
      console.error('❌ Error fetching customs tiers:', error);
      throw error;
    }

    console.log(`📋 Found ${tiers?.length || 0} customs tiers for ${originCountry} → ${destinationCountry}`);

    // Apply tier matching logic
    const appliedTier = determineAppliedTier(tiers || [], itemPrice, itemWeight);

    if (appliedTier) {
      console.log(`✅ Applied tier: ${appliedTier.rule_name} (${appliedTier.customs_percentage}% customs, ${appliedTier.vat_percentage}% VAT)`);
      return {
        customs_percentage: appliedTier.customs_percentage,
        vat_percentage: appliedTier.vat_percentage,
        applied_tier: appliedTier,
        fallback_used: false,
        route: `${originCountry}→${destinationCountry}`,
      };
    }

    // No specific tier found, return default
    console.log(`⚠️ No matching customs tier found for ${originCountry} → ${destinationCountry}, using fallback`);
    return {
      customs_percentage: 0,
      vat_percentage: 0,
      applied_tier: null,
      fallback_used: true,
      route: `${originCountry}→${destinationCountry}`,
    };
  } catch (error) {
    console.error('❌ Error in customs tier calculation:', error);
    
    // Return safe fallback
    return {
      customs_percentage: 0,
      vat_percentage: 0,
      applied_tier: null,
      fallback_used: true,
      route: `${originCountry}→${destinationCountry}`,
    };
  }
}

/**
 * Determine which customs tier should be applied based on price/weight/logic
 * This is the same logic used in AdminQuoteDetailPage.tsx
 */
function determineAppliedTier(
  tiers: Array<Tables<'route_customs_tiers'>>,
  price: number,
  weight: number,
): Tables<'route_customs_tiers'> | null {
  for (const tier of tiers) {
    const priceMatch =
      (!tier.price_min || price >= tier.price_min) &&
      (!tier.price_max || price <= tier.price_max);
    
    const weightMatch =
      (!tier.weight_min || weight >= tier.weight_min) &&
      (!tier.weight_max || weight <= tier.weight_max);
    
    let shouldApply = false;
    
    if (tier.logic_type === 'AND') {
      // Both conditions must be true
      shouldApply = priceMatch && weightMatch;
    } else if (tier.logic_type === 'OR') {
      // Either condition can be true
      shouldApply = priceMatch || weightMatch;
    }
    
    if (shouldApply) {
      return tier;
    }
  }
  
  return null;
}

/**
 * Get all available customs tiers for a specific route
 */
export async function getCustomsTiersForRoute(
  originCountry: string,
  destinationCountry: string,
): Promise<Array<Tables<'route_customs_tiers'>>> {
  const { data, error } = await supabase
    .from('route_customs_tiers')
    .select('*')
    .eq('origin_country', originCountry)
    .eq('destination_country', destinationCountry)
    .eq('is_active', true)
    .order('priority_order', { ascending: true });

  if (error) {
    console.error('❌ Error fetching customs tiers for route:', error);
    return [];
  }

  return data || [];
}

/**
 * Get all available routes that have customs tiers configured
 */
export async function getAvailableCustomsTierRoutes(): Promise<
  Array<{ origin: string; destination: string; tier_count: number }>
> {
  const { data, error } = await supabase
    .from('route_customs_tiers')
    .select('origin_country, destination_country')
    .eq('is_active', true);

  if (error) {
    console.error('❌ Error fetching available customs tier routes:', error);
    return [];
  }

  // Group by route and count tiers
  const routeMap = new Map<string, number>();
  
  data?.forEach((row) => {
    const routeKey = `${row.origin_country}→${row.destination_country}`;
    routeMap.set(routeKey, (routeMap.get(routeKey) || 0) + 1);
  });

  const routes: Array<{ origin: string; destination: string; tier_count: number }> = [];
  
  routeMap.forEach((count, routeKey) => {
    const [origin, destination] = routeKey.split('→');
    routes.push({
      origin,
      destination,
      tier_count: count,
    });
  });

  return routes.sort((a, b) => `${a.origin}→${a.destination}`.localeCompare(`${b.origin}→${b.destination}`));
}