import { supabase } from '../integrations/supabase/client';
import type { ShippingRouteDB } from '../types/shipping';

export interface RouteCalculations {
  // For Step 5: International Shipping
  shipping: {
    base_cost: number;
    per_kg_cost: number;
    cost_percentage: number;
    total: number;
  };
  
  // For Step 6: Insurance  
  insurance: {
    percentage: number;
    min_fee: number;
    amount: number;
    available: boolean;
  };
  
  // For Step 10: Handling
  handling: {
    base_fee: number;
    percentage_fee: number;
    total_before_caps: number;
    min_fee: number;
    max_fee: number;
    total: number;
  };
  
  // Debug info
  route_info: {
    origin: string;
    destination: string;
    exchange_rate: number;
  };
  delivery_option_used: {
    id: string;
    name: string;
    carrier: string;
    price_per_kg: number;
    delivery_days: string;
  };
}

export class DynamicShippingService {
  /**
   * Get route calculations for shipping, insurance, and handling
   */
  async getRouteCalculations(
    originCountry: string,
    destinationCountry: string,
    weight: number,
    itemValueOriginCurrency: number,
    selectedDeliveryOptionId?: string
  ): Promise<RouteCalculations> {
    // Get route data
    const route = await this.getShippingRoute(originCountry, destinationCountry);
    
    if (!route) {
      console.error(`❌ [DynamicShipping] No route found for ${originCountry} → ${destinationCountry}`);
      throw new Error(`No shipping route configured for ${originCountry} → ${destinationCountry}`);
    }

    console.log(`✅ [DynamicShipping] Found route ${originCountry} → ${destinationCountry}:`, {
      base_cost: route.base_shipping_cost,
      cost_percentage: route.cost_percentage,
      delivery_options_count: route.delivery_options?.length || 0
    });

    // Find delivery option to use
    const activeOptions = route.delivery_options?.filter((opt: any) => opt.active) || [];
    if (activeOptions.length === 0) {
      console.error(`❌ [DynamicShipping] No active delivery options for ${originCountry} → ${destinationCountry}`);
      throw new Error(`No active delivery options for ${originCountry} → ${destinationCountry}`);
    }

    let selectedOption;
    if (selectedDeliveryOptionId) {
      // Use specific selected option
      selectedOption = activeOptions.find((opt: any) => opt.id === selectedDeliveryOptionId);
      if (!selectedOption) {
        console.warn(`⚠️ [DynamicShipping] Selected delivery option ${selectedDeliveryOptionId} not found, falling back to cheapest`);
        selectedOption = activeOptions.sort((a: any, b: any) => a.price - b.price)[0];
      }
    } else {
      // Default to cheapest option
      selectedOption = activeOptions.sort((a: any, b: any) => a.price - b.price)[0];
    }
    
    console.log(`💰 [DynamicShipping] Using delivery option:`, {
      id: selectedOption.id,
      name: selectedOption.name,
      price: selectedOption.price,
      has_handling: !!selectedOption.handling_charge,
      has_insurance: !!selectedOption.insurance_options,
      was_selected: !!selectedDeliveryOptionId
    });

    // Calculate shipping components (all in origin currency)
    const calculations: RouteCalculations = {
      shipping: {
        base_cost: route.base_shipping_cost,
        per_kg_cost: selectedOption.price * weight,
        cost_percentage: itemValueOriginCurrency * (route.cost_percentage / 100),
        total: 0 // Will be calculated below
      },
      
      insurance: {
        percentage: selectedOption.insurance_options?.coverage_percentage || 0,
        min_fee: selectedOption.insurance_options?.min_fee || 0,
        amount: 0, // Will be calculated below
        available: selectedOption.insurance_options?.available || false
      },
      
      handling: {
        base_fee: selectedOption.handling_charge?.base_fee || 0,
        percentage_fee: 0, // Will be calculated below
        total_before_caps: 0,
        min_fee: selectedOption.handling_charge?.min_fee || 0,
        max_fee: selectedOption.handling_charge?.max_fee || 1000000, // Use large number instead of Number.MAX_VALUE
        total: 0 // Will be calculated below
      },
      
      route_info: {
        origin: originCountry,
        destination: destinationCountry,
        exchange_rate: route.exchange_rate || 1.0
      },
      
      delivery_option_used: {
        id: selectedOption.id,
        name: selectedOption.name,
        carrier: selectedOption.carrier,
        price_per_kg: selectedOption.price,
        delivery_days: `${selectedOption.min_days}-${selectedOption.max_days}`
      }
    };

    // Calculate totals
    calculations.shipping.total = 
      calculations.shipping.base_cost + 
      calculations.shipping.per_kg_cost + 
      calculations.shipping.cost_percentage;

    calculations.insurance.amount = this.calculateInsurance(
      itemValueOriginCurrency, 
      selectedOption.insurance_options
    );

    calculations.handling.percentage_fee = itemValueOriginCurrency * 
      ((selectedOption.handling_charge?.percentage_of_value || 0) / 100);
    
    calculations.handling.total_before_caps = 
      calculations.handling.base_fee + calculations.handling.percentage_fee;
    
    calculations.handling.total = Math.max(
      calculations.handling.min_fee,
      Math.min(calculations.handling.total_before_caps, calculations.handling.max_fee)
    );

    return calculations;
  }

  /**
   * Get shipping route from database
   */
  private async getShippingRoute(
    originCountry: string, 
    destinationCountry: string
  ): Promise<ShippingRouteDB | null> {
    const { data, error } = await supabase
      .from('shipping_routes')
      .select('*')
      .eq('origin_country', originCountry)
      .eq('destination_country', destinationCountry)
      .eq('is_active', true)
      .single();

    if (error) {
      console.error('Error fetching shipping route:', error);
      return null;
    }

    return data;
  }

  /**
   * Calculate insurance amount
   */
  private calculateInsurance(itemValue: number, insuranceConfig: any): number {
    if (!insuranceConfig?.available) {
      return 0;
    }
    
    const percentageFee = itemValue * ((insuranceConfig.coverage_percentage || 0) / 100);
    return Math.max(percentageFee, insuranceConfig.min_fee || 0);
  }

  /**
   * Check if route exists
   */
  async routeExists(originCountry: string, destinationCountry: string): Promise<boolean> {
    const route = await this.getShippingRoute(originCountry, destinationCountry);
    return route !== null;
  }

  /**
   * Get delivery options for dropdown (formatted for UI)
   */
  async getDeliveryOptionsForDropdown(originCountry: string, destinationCountry: string): Promise<Array<{
    value: string;
    label: string;
    rate: number;
    carrier: string;
    delivery_days: string;
  }>> {
    try {
      const route = await this.getShippingRoute(originCountry, destinationCountry);
      
      if (!route || !route.delivery_options) {
        console.warn(`No delivery options found for ${originCountry} → ${destinationCountry}`);
        return [];
      }

      const activeOptions = route.delivery_options.filter((opt: any) => opt.active);
      
      return activeOptions.map((option: any) => ({
        value: option.id,
        label: `${option.name} (${option.carrier})`,
        rate: option.price,
        carrier: option.carrier,
        delivery_days: `${option.min_days}-${option.max_days} days`
      })).sort((a, b) => a.rate - b.rate); // Sort by price, cheapest first
      
    } catch (error) {
      console.error('Error fetching delivery options:', error);
      return [];
    }
  }
}

export const dynamicShippingService = new DynamicShippingService();