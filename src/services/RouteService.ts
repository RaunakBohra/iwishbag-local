import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';

type Quote = Tables<'quotes'>;
type ShippingRoute = Tables<'shipping_routes'>;

export interface RouteInfo {
  origin: string;
  destination: string;
  route?: ShippingRoute;
}

/**
 * Centralized service for managing shipping routes
 * This is the single source of truth for route determination
 */
export class RouteService {
  private static routeCache = new Map<string, ShippingRoute>();

  /**
   * Get route information for a quote
   * @param quote - The quote object
   * @returns Promise<RouteInfo> - The origin and destination countries
   */
  static async getQuoteRoute(quote: Quote): Promise<RouteInfo> {
    // 1. If shipping_route_id exists, fetch the full route
    if (quote.shipping_route_id) {
      const route = await this.getRouteById(quote.shipping_route_id);
      if (route) {
        return {
          origin: route.origin_country,
          destination: route.destination_country,
          route
        };
      }
    }

    // 2. Use quote fields directly
    // Note: destination_country is the new field, country_code is deprecated
    return {
      origin: quote.origin_country || 'US',
      destination: quote.destination_country || ''
    };
  }

  /**
   * Get a shipping route by ID with caching
   */
  static async getRouteById(routeId: number): Promise<ShippingRoute | null> {
    const cacheKey = `route_${routeId}`;
    
    // Check cache first
    if (this.routeCache.has(cacheKey)) {
      return this.routeCache.get(cacheKey)!;
    }

    // Fetch from database
    const { data, error } = await supabase
      .from('shipping_routes')
      .select('*')
      .eq('id', routeId)
      .single();

    if (error || !data) {
      console.error('Error fetching shipping route:', error);
      return null;
    }

    // Cache the result
    this.routeCache.set(cacheKey, data);
    return data;
  }

  /**
   * Find or create a shipping route
   * This ensures every quote has a proper shipping_route_id
   */
  static async findOrCreateRoute(origin: string, destination: string): Promise<number | null> {
    // First, try to find an existing route
    const { data: existingRoute, error: findError } = await supabase
      .from('shipping_routes')
      .select('id')
      .eq('origin_country', origin)
      .eq('destination_country', destination)
      .eq('is_active', true)
      .single();

    if (existingRoute) {
      return existingRoute.id;
    }

    // If no route exists, check if we should create one
    // For now, return null and let the system use quote fields
    // In the future, we might auto-create routes here
    return null;
  }

  /**
   * Update a quote to use proper route fields
   */
  static async updateQuoteRoute(quoteId: string, origin: string, destination: string): Promise<void> {
    // Find or create the route
    const routeId = await this.findOrCreateRoute(origin, destination);

    // Update the quote with proper fields
    const updateData: any = {
      origin_country: origin,
      destination_country: destination,
    };

    if (routeId) {
      updateData.shipping_route_id = routeId;
    }

    const { error } = await supabase
      .from('quotes')
      .update(updateData)
      .eq('id', quoteId);

    if (error) {
      console.error('Error updating quote route:', error);
      throw error;
    }
  }

  /**
   * Clear the route cache
   */
  static clearCache(): void {
    this.routeCache.clear();
  }
}