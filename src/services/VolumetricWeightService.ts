// ============================================================================
// VOLUMETRIC WEIGHT SERVICE
// Calculates volumetric weight for shipping based on dimensions and divisors
// ============================================================================

import { supabase } from '@/integrations/supabase/client';

interface Dimensions {
  length: number;
  width: number;
  height: number;
  unit?: 'cm' | 'in';
}

interface VolumetricConfig {
  divisor_air: number;
  divisor_sea: number;
  divisor_road: number;
  divisor_express: number;
  divisor_economy: number;
}

interface ShippingRoute {
  id: string;
  name: string;
  transport_mode: 'air' | 'sea' | 'road' | 'multimodal';
  volumetric_config?: VolumetricConfig;
}

interface CountryVolumetricSettings {
  country_code: string;
  default_divisor_air: number;
  default_divisor_sea: number;
  default_divisor_road: number;
  volumetric_enabled: boolean;
}

// Simple in-memory cache implementation
class SimpleCache<T> {
  private cache: Map<string, { data: T; timestamp: number }> = new Map();
  private ttl: number;

  constructor(ttl: number) {
    this.ttl = ttl;
  }

  get(key: string): T | null {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (Date.now() - item.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return item.data;
  }

  set(key: string, data: T): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  clear(): void {
    this.cache.clear();
  }
}

class VolumetricWeightService {
  private static instance: VolumetricWeightService;
  private cache: SimpleCache<any>;
  
  // Default divisors if not configured
  private static readonly DEFAULT_DIVISORS = {
    air: 5000,      // Standard air freight divisor (cm³/kg)
    sea: 6000,      // Standard sea freight divisor
    road: 4000,     // Standard road freight divisor
    express: 4500,  // Express shipping divisor
    economy: 6500   // Economy shipping divisor
  };

  private constructor() {
    this.cache = new SimpleCache(10 * 60 * 1000); // 10 minute cache
  }

  static getInstance(): VolumetricWeightService {
    if (!VolumetricWeightService.instance) {
      VolumetricWeightService.instance = new VolumetricWeightService();
    }
    return VolumetricWeightService.instance;
  }

  /**
   * Calculate volumetric weight from dimensions
   */
  calculateVolumetricWeight(
    dimensions: Dimensions,
    divisor: number = VolumetricWeightService.DEFAULT_DIVISORS.air
  ): number {
    if (!dimensions || !dimensions.length || !dimensions.width || !dimensions.height) {
      return 0;
    }

    let { length, width, height, unit = 'cm' } = dimensions;

    // Convert inches to cm if needed
    if (unit === 'in') {
      length *= 2.54;
      width *= 2.54;
      height *= 2.54;
    }

    // Calculate volume in cm³
    const volumeCm3 = length * width * height;

    // Calculate volumetric weight
    const volumetricWeight = volumeCm3 / divisor;

    // Round to 3 decimal places
    return Math.round(volumetricWeight * 1000) / 1000;
  }

  /**
   * Get chargeable weight (higher of actual or volumetric)
   */
  getChargeableWeight(actualWeight: number, dimensions: Dimensions, divisor: number): number {
    const volumetricWeight = this.calculateVolumetricWeight(dimensions, divisor);
    return Math.max(actualWeight, volumetricWeight);
  }

  /**
   * Get volumetric config for a country
   */
  async getCountryVolumetricSettings(countryCode: string): Promise<CountryVolumetricSettings | null> {
    const cacheKey = `country_volumetric_${countryCode}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    try {
      const { data, error } = await supabase
        .from('country_settings')
        .select('country_code, volumetric_config')
        .eq('country_code', countryCode)
        .single();

      if (error || !data) {
        console.warn(`No volumetric settings found for country: ${countryCode}`);
        return null;
      }

      const settings: CountryVolumetricSettings = {
        country_code: data.country_code,
        default_divisor_air: data.volumetric_config?.default_divisor_air || VolumetricWeightService.DEFAULT_DIVISORS.air,
        default_divisor_sea: data.volumetric_config?.default_divisor_sea || VolumetricWeightService.DEFAULT_DIVISORS.sea,
        default_divisor_road: data.volumetric_config?.default_divisor_road || VolumetricWeightService.DEFAULT_DIVISORS.road,
        volumetric_enabled: data.volumetric_config?.enabled !== false
      };

      this.cache.set(cacheKey, settings);
      return settings;
    } catch (error) {
      console.error('Error fetching country volumetric settings:', error);
      return null;
    }
  }

  /**
   * Get volumetric config for a shipping route
   */
  async getShippingRouteVolumetricConfig(routeId: string): Promise<VolumetricConfig | null> {
    const cacheKey = `route_volumetric_${routeId}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    try {
      const { data, error } = await supabase
        .from('shipping_routes')
        .select('id, name, transport_mode, delivery_options')
        .eq('id', routeId)
        .single();

      if (error || !data) {
        console.warn(`No shipping route found: ${routeId}`);
        return null;
      }

      // Extract volumetric config from delivery_options
      const volumetricConfig: VolumetricConfig = {
        divisor_air: data.delivery_options?.volumetric_divisors?.air || VolumetricWeightService.DEFAULT_DIVISORS.air,
        divisor_sea: data.delivery_options?.volumetric_divisors?.sea || VolumetricWeightService.DEFAULT_DIVISORS.sea,
        divisor_road: data.delivery_options?.volumetric_divisors?.road || VolumetricWeightService.DEFAULT_DIVISORS.road,
        divisor_express: data.delivery_options?.volumetric_divisors?.express || VolumetricWeightService.DEFAULT_DIVISORS.express,
        divisor_economy: data.delivery_options?.volumetric_divisors?.economy || VolumetricWeightService.DEFAULT_DIVISORS.economy
      };

      this.cache.set(cacheKey, volumetricConfig);
      return volumetricConfig;
    } catch (error) {
      console.error('Error fetching shipping route volumetric config:', error);
      return null;
    }
  }

  /**
   * Get appropriate divisor based on shipping method and route
   */
  async getDivisorForShipping(
    shippingMethod: 'air' | 'sea' | 'road' | 'express' | 'economy',
    routeId?: string,
    countryCode?: string
  ): Promise<number> {
    // Priority 1: Route-specific divisor
    if (routeId) {
      const routeConfig = await this.getShippingRouteVolumetricConfig(routeId);
      if (routeConfig) {
        const divisorMap = {
          air: routeConfig.divisor_air,
          sea: routeConfig.divisor_sea,
          road: routeConfig.divisor_road,
          express: routeConfig.divisor_express,
          economy: routeConfig.divisor_economy
        };
        return divisorMap[shippingMethod] || VolumetricWeightService.DEFAULT_DIVISORS[shippingMethod];
      }
    }

    // Priority 2: Country-specific divisor
    if (countryCode) {
      const countrySettings = await this.getCountryVolumetricSettings(countryCode);
      if (countrySettings && countrySettings.volumetric_enabled) {
        const divisorMap = {
          air: countrySettings.default_divisor_air,
          sea: countrySettings.default_divisor_sea,
          road: countrySettings.default_divisor_road,
          express: VolumetricWeightService.DEFAULT_DIVISORS.express,
          economy: VolumetricWeightService.DEFAULT_DIVISORS.economy
        };
        return divisorMap[shippingMethod] || VolumetricWeightService.DEFAULT_DIVISORS[shippingMethod];
      }
    }

    // Priority 3: Default divisor
    return VolumetricWeightService.DEFAULT_DIVISORS[shippingMethod] || VolumetricWeightService.DEFAULT_DIVISORS.air;
  }

  /**
   * Calculate volumetric weight for multiple items
   */
  calculateTotalVolumetricWeight(
    items: Array<{ dimensions?: Dimensions; quantity: number }>,
    divisor: number
  ): number {
    return items.reduce((total, item) => {
      if (!item.dimensions) return total;
      const volumetricWeight = this.calculateVolumetricWeight(item.dimensions, divisor);
      return total + (volumetricWeight * item.quantity);
    }, 0);
  }

  /**
   * Get weight analysis for an item
   */
  getWeightAnalysis(
    actualWeight: number,
    dimensions: Dimensions,
    divisor: number
  ): {
    actualWeight: number;
    volumetricWeight: number;
    chargeableWeight: number;
    isVolumetric: boolean;
    percentageDifference: number;
  } {
    const volumetricWeight = this.calculateVolumetricWeight(dimensions, divisor);
    const chargeableWeight = Math.max(actualWeight, volumetricWeight);
    const isVolumetric = volumetricWeight > actualWeight;
    const percentageDifference = actualWeight > 0 
      ? Math.abs(((volumetricWeight - actualWeight) / actualWeight) * 100)
      : 0;

    return {
      actualWeight,
      volumetricWeight,
      chargeableWeight,
      isVolumetric,
      percentageDifference: Math.round(percentageDifference * 10) / 10
    };
  }

  /**
   * Clear all caches
   */
  clearCache(): void {
    this.cache.clear();
  }
}

// Export singleton instance
export const volumetricWeightService = VolumetricWeightService.getInstance();

// Export types
export type { Dimensions, VolumetricConfig, ShippingRoute, CountryVolumetricSettings };