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
 * SIMPLIFIED: Get customs percentage directly from shipping route
 * This replaces the complex tier calculation system
 */
export async function calculateCustomsTier(
  originCountry: string,
  destinationCountry: string,
  itemPrice: number,
  itemWeight: number,
): Promise<CustomsTierResult> {
  console.log(
    `🔄 [SIMPLIFIED] Getting customs from shipping route: ${originCountry} → ${destinationCountry}`,
  );

  try {
    // ✅ SIMPLE: Get customs directly from shipping route
    const { data: route, error } = await supabase
      .from('shipping_routes')
      .select('customs_percentage, vat_percentage')
      .eq('origin_country', originCountry)
      .eq('destination_country', destinationCountry)
      .eq('is_active', true)
      .single();

    if (!error && route?.customs_percentage != null) {
      console.log(
        `✅ [SIMPLIFIED] Found customs: ${route.customs_percentage}%, VAT: ${route.vat_percentage || 0}%`,
      );
      return {
        customs_percentage: Number(route.customs_percentage),
        vat_percentage: Number(route.vat_percentage || 0),
        applied_tier: null, // No more complex tiers
        fallback_used: false,
        route: `${originCountry}→${destinationCountry}`,
      };
    }
  } catch (error) {
    console.warn(`⚠️ [SIMPLIFIED] Failed to get customs from shipping route:`, error);
  }

  // No default values - must be configured
  console.warn(`⚠️ [SIMPLIFIED] No customs data found for ${originCountry}→${destinationCountry}`);
  return {
    customs_percentage: 0,
    vat_percentage: 0,
    applied_tier: null,
    fallback_used: true,
    route: `${originCountry}→${destinationCountry}`,
  };
}

/**
 * Get all available customs tiers for a specific route
 * ⚠️ DEPRECATED: This function is kept for backward compatibility only
 */
export async function getCustomsTiersForRoute(
  originCountry: string,
  destinationCountry: string,
): Promise<Array<Tables<'route_customs_tiers'>>> {
  console.warn(
    '⚠️ getCustomsTiersForRoute is deprecated - use shipping route customs_percentage instead',
  );
  return [];
}

/**
 * Get all available routes that have customs tiers configured
 * ⚠️ DEPRECATED: This function is kept for backward compatibility only
 */
export async function getAvailableCustomsTierRoutes(): Promise<
  Array<{ origin: string; destination: string; tier_count: number }>
> {
  console.warn('⚠️ getAvailableCustomsTierRoutes is deprecated - use shipping routes instead');
  return [];
}
