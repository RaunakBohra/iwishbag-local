import { supabase } from '@/integrations/supabase/client';
import type { ShippingOption } from '@/types/unified-quote';

interface ShippingOptionsRequest {
  origin_country: string;
  destination_country: string;
  total_weight: number;
  items_value: number;
  is_express?: boolean;
}

/**
 * Shipping service that provides shipping options based on routes and calculations
 */
class ShippingService {
  private static instance: ShippingService;
  private routeCache = new Map<string, any>();

  static getInstance(): ShippingService {
    if (!ShippingService.instance) {
      ShippingService.instance = new ShippingService();
    }
    return ShippingService.instance;
  }

  /**
   * Get available shipping options for a route
   */
  async getShippingOptions(request: ShippingOptionsRequest): Promise<ShippingOption[]> {
    try {
      const { origin_country, destination_country, total_weight, items_value, is_express = false } = request;

      // Try to find a specific shipping route
      const { data: routes, error } = await supabase
        .from('shipping_routes')
        .select('*')
        .eq('origin_country', origin_country)
        .eq('destination_country', destination_country)
        .eq('is_active', true)
        .limit(1);

      if (error) {
        console.warn('Error fetching shipping routes:', error);
      }

      const shippingOptions: ShippingOption[] = [];

      if (routes && routes.length > 0) {
        const route = routes[0];
        
        // Generate options from route delivery options
        if (route.delivery_options && Array.isArray(route.delivery_options)) {
          for (const deliveryOption of route.delivery_options) {
            if (!deliveryOption.active) continue;

            // Calculate cost based on route configuration
            let shippingCost = route.base_shipping_cost || 0;
            
            // Add weight-based cost
            if (total_weight > 0 && route.shipping_per_kg) {
              shippingCost += total_weight * route.shipping_per_kg;
            }

            // Add percentage-based cost
            if (items_value > 0 && route.cost_percentage) {
              shippingCost += items_value * (route.cost_percentage / 100);
            }

            // Add delivery option premium
            if (deliveryOption.price) {
              shippingCost += deliveryOption.price;
            }

            const option: ShippingOption = {
              id: `${route.id}_${deliveryOption.id}`,
              carrier: deliveryOption.carrier || 'Standard',
              name: deliveryOption.name || 'Standard Shipping',
              cost_usd: shippingCost,
              days: `${deliveryOption.min_days}-${deliveryOption.max_days}`,
              confidence: 0.9,
              restrictions: [],
              tracking: true,
              route_data: {
                base_shipping_cost: route.base_shipping_cost || 0,
                weight_tier_used: `${total_weight}kg`,
                weight_rate_per_kg: route.shipping_per_kg || 0,
                weight_cost: total_weight * (route.shipping_per_kg || 0),
                delivery_premium: deliveryOption.price || 0,
              }
            };

            shippingOptions.push(option);
          }
        }
      }

      // If no route-specific options, provide default options
      if (shippingOptions.length === 0) {
        shippingOptions.push(...this.getDefaultShippingOptions(total_weight, items_value, is_express));
      }

      // Mark the first option as recommended if none specified
      if (shippingOptions.length > 0 && !shippingOptions.some(o => (o as any).recommended)) {
        (shippingOptions[0] as any).recommended = true;
      }

      return shippingOptions;

    } catch (error) {
      console.error('Error getting shipping options:', error);
      // Return default options on error
      return this.getDefaultShippingOptions(request.total_weight, request.items_value, request.is_express);
    }
  }

  /**
   * Generate default shipping options when no specific routes are available
   */
  private getDefaultShippingOptions(weight: number, value: number, isExpress: boolean): ShippingOption[] {
    const baseShipping = Math.max(10, weight * 5); // $5 per kg minimum $10
    const expressMultiplier = isExpress ? 2 : 1;

    const options: ShippingOption[] = [
      {
        id: 'standard',
        carrier: 'Standard Post',
        name: 'Standard International',
        cost_usd: baseShipping * expressMultiplier,
        days: '7-14',
        confidence: 0.8,
        restrictions: [],
        tracking: true,
        route_data: {
          base_shipping_cost: 10,
          weight_tier_used: `${weight}kg`,
          weight_rate_per_kg: 5,
          weight_cost: weight * 5,
          delivery_premium: 0,
        }
      }
    ];

    if (!isExpress) {
      options.push({
        id: 'express',
        carrier: 'Express Courier',
        name: 'Express International',
        cost_usd: baseShipping * 2,
        days: '3-7',
        confidence: 0.9,
        restrictions: [],
        tracking: true,
        route_data: {
          base_shipping_cost: 15,
          weight_tier_used: `${weight}kg`,
          weight_rate_per_kg: 8,
          weight_cost: weight * 8,
          delivery_premium: 5,
        }
      });
    }

    // Mark first option as recommended
    (options[0] as any).recommended = true;

    return options;
  }
}

// Export singleton instance
export const shippingService = ShippingService.getInstance();