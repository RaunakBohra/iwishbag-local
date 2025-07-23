// Simple shipping routes management service
import { supabase } from '../integrations/supabase/client';
import type { ShippingRoute, ShippingRouteDB, ShippingRouteFormData } from '../types/shipping';

/**
 * Get all shipping routes from database
 */
export async function getShippingRoutes(): Promise<ShippingRouteDB[]> {
  const { data, error } = await supabase
    .from('shipping_routes')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching shipping routes:', error);
    throw new Error(`Failed to fetch shipping routes: ${error.message}`);
  }

  return data || [];
}

/**
 * Create or update shipping route
 */
export async function upsertShippingRoute(
  routeData: ShippingRouteFormData,
): Promise<ShippingRouteDB> {
  // Transform camelCase form data to snake_case database format
  const dbData = {
    origin_country: routeData.originCountry,
    destination_country: routeData.destinationCountry,
    base_shipping_cost: routeData.baseShippingCost,
    shipping_per_kg: routeData.shippingPerKg,
    cost_percentage: routeData.costPercentage,
    processing_days: routeData.processingDays,
    customs_clearance_days: routeData.customsClearanceDays,
    weight_unit: routeData.weightUnit,
    delivery_options: routeData.deliveryOptions,
    weight_tiers: routeData.weightTiers,
    max_weight: routeData.maxWeight,
    restricted_items: routeData.restrictedItems,
    requires_documentation: routeData.requiresDocumentation,
    is_active: routeData.isActive,
    exchange_rate: routeData.exchangeRate,
    vat_percentage: routeData.vatPercentage,
    customs_percentage: routeData.customsPercentage,
  };

  let result;

  if (routeData.id) {
    // Update existing route using provided ID
    result = await supabase
      .from('shipping_routes')
      .update(dbData)
      .eq('id', routeData.id)
      .select()
      .single();
  } else {
    // Use PostgreSQL's ON CONFLICT to handle duplicates properly
    result = await supabase
      .from('shipping_routes')
      .upsert(dbData, {
        onConflict: 'origin_country,destination_country',
        ignoreDuplicates: false,
      })
      .select()
      .single();
  }

  const { data, error } = result;

  if (error) {
    console.error('Error upserting shipping route:', error);
    throw new Error(`Failed to save shipping route: ${error.message}`);
  }

  return data;
}

/**
 * Delete shipping route
 */
export async function deleteShippingRoute(id: string): Promise<void> {
  const { error } = await supabase.from('shipping_routes').delete().eq('id', id);

  if (error) {
    console.error('Error deleting shipping route:', error);
    throw new Error(`Failed to delete shipping route: ${error.message}`);
  }
}

/**
 * Get shipping route by ID
 */
export async function getShippingRouteById(id: string): Promise<ShippingRouteDB | null> {
  const { data, error } = await supabase.from('shipping_routes').select('*').eq('id', id).single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null; // Route not found
    }
    console.error('Error fetching shipping route:', error);
    throw new Error(`Failed to fetch shipping route: ${error.message}`);
  }

  return data;
}
