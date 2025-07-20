// Simple shipping routes management service
import { supabase } from '../integrations/supabase/client';
import type {
  ShippingRoute,
  ShippingRouteDB,
  ShippingRouteFormData,
} from '../types/shipping';

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
export async function upsertShippingRoute(routeData: ShippingRouteFormData): Promise<ShippingRouteDB> {
  const { data, error } = await supabase
    .from('shipping_routes')
    .upsert(routeData)
    .select()
    .single();

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
  const { error } = await supabase
    .from('shipping_routes')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting shipping route:', error);
    throw new Error(`Failed to delete shipping route: ${error.message}`);
  }
}

/**
 * Get shipping route by ID
 */
export async function getShippingRouteById(id: string): Promise<ShippingRouteDB | null> {
  const { data, error } = await supabase
    .from('shipping_routes')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null; // Route not found
    }
    console.error('Error fetching shipping route:', error);
    throw new Error(`Failed to fetch shipping route: ${error.message}`);
  }

  return data;
}