

import { supabase } from '@/integrations/supabase/client';

interface RouteData {
  id: string;
  origin_country: string;
  destination_country: string;
  customs_percent?: number;
  vat_percent?: number;
  exchange_rate?: number;
  base_shipping_cost?: number;
  cost_per_kg?: number;
  cost_percentage?: number;
  is_active: boolean;
  updated_at: string;
}

interface CountrySettings {
  code: string;
  country_name: string;
  currency: string;
  rate_from_usd: number;
  customs_percent?: number;
  vat_percent?: number;
  minimum_payment_amount?: number;
  payment_gateway_fixed_fee?: number;
  payment_gateway_percent_fee?: number;
  is_supported: boolean;
  updated_at: string;
}

interface UnifiedTaxData {
  // Tax rates
  customs_percent: number;
  vat_percent: number;

  // Currency and exchange
  currency: string;
  exchange_rate: number;

  // Payment processing
  minimum_payment_amount: number;
  payment_gateway_fixed_fee: number;
  payment_gateway_percent_fee: number;

  // Shipping costs
  base_shipping_cost: number;
  cost_per_kg: number;
  cost_percentage: number;

  // Metadata
  data_source: 'route_specific' | 'country_fallback' | 'system_default';
  confidence_score: number; // 0.0 to 1.0
  last_updated: string;
  route_id?: string;
  fallback_reason?: string;
}

interface CacheEntry {
  data: UnifiedTaxData;
  timestamp: number;
  expires_at: number;
}

class UnifiedTaxFallbackService {
  private cache: Map<string, CacheEntry> = new Map();
  private readonly CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

  // System defaults for ultimate fallback
  private readonly SYSTEM_DEFAULTS = {
    customs_percent: 10.0,
    vat_percent: 13.0,
    exchange_rate: 1.0,
    base_shipping_cost: 25.0,
    cost_per_kg: 8.0,
    cost_percentage: 0.05,
    minimum_payment_amount: 10.0,
    payment_gateway_fixed_fee: 2.0,
    payment_gateway_percent_fee: 3.5,
  };

  /**
   * Get unified tax data for a specific route
   * Prioritizes route-specific data, falls back to country settings, ultimate fallback to system defaults
   */
  async getUnifiedTaxData(
    originCountry: string,
    destinationCountry: string,
  ): Promise<UnifiedTaxData> {
    const cacheKey = `${originCountry}-${destinationCountry}`;

    // Check cache first
    const cached = this.getCachedData(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      // Step 1: Try to get route-specific data
      const routeData = await this.getRouteSpecificData(originCountry, destinationCountry);
      if (routeData) {
        const unifiedData = await this.buildUnifiedDataFromRoute(routeData, destinationCountry);
        this.setCachedData(cacheKey, unifiedData);
        return unifiedData;
      }

      // Step 2: Fall back to country-level settings
      const countryData = await this.getCountryFallbackData(destinationCountry);
      if (countryData) {
        const unifiedData = this.buildUnifiedDataFromCountry(countryData, originCountry);
        this.setCachedData(cacheKey, unifiedData);
        return unifiedData;
      }

      // Step 3: Ultimate fallback to system defaults
      const systemData = this.buildSystemDefaultData(originCountry, destinationCountry);
      this.setCachedData(cacheKey, systemData);
      return systemData;
    } catch (error) {
      console.error('UnifiedTaxFallbackService: Error fetching tax data:', error);

      // Return system defaults on error
      const systemData = this.buildSystemDefaultData(
        originCountry,
        destinationCountry,
        `Error fetching data: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      return systemData;
    }
  }

  /**
   * Get route-specific tax and shipping data
   */
  private async getRouteSpecificData(
    originCountry: string,
    destinationCountry: string,
  ): Promise<RouteData | null> {
    const { data, error } = await supabase
      .from('shipping_routes')
      .select('*')
      .eq('origin_country', originCountry)
      .eq('destination_country', destinationCountry)
      .eq('is_active', true)
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = no rows found
      console.warn('UnifiedTaxFallbackService: Route query error:', error);
      return null;
    }

    return data;
  }

  /**
   * Get country-level fallback settings
   */
  private async getCountryFallbackData(
    destinationCountry: string,
  ): Promise<CountrySettings | null> {
    const { data, error } = await supabase
      .from('country_settings')
      .select('*')
      .eq('code', destinationCountry)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.warn('UnifiedTaxFallbackService: Country query error:', error);
      return null;
    }

    return data;
  }

  /**
   * Build unified data structure from route-specific data
   */
  private async buildUnifiedDataFromRoute(
    routeData: RouteData,
    destinationCountry: string,
  ): Promise<UnifiedTaxData> {
    // Get country data for currency and payment info
    const countryData = await this.getCountryFallbackData(destinationCountry);

    return {
      // Tax rates - prioritize route data
      customs_percent:
        routeData.customs_percent ??
        countryData?.customs_percent ??
        this.SYSTEM_DEFAULTS.customs_percent,
      vat_percent:
        routeData.vat_percent ?? countryData?.vat_percent ?? this.SYSTEM_DEFAULTS.vat_percent,

      // Currency and exchange - from country or route
      currency: countryData?.currency ?? 'USD',
      exchange_rate:
        routeData.exchange_rate ?? countryData?.rate_from_usd ?? this.SYSTEM_DEFAULTS.exchange_rate,

      // Payment processing - from country settings
      minimum_payment_amount:
        countryData?.minimum_payment_amount ?? this.SYSTEM_DEFAULTS.minimum_payment_amount,
      payment_gateway_fixed_fee:
        countryData?.payment_gateway_fixed_fee ?? this.SYSTEM_DEFAULTS.payment_gateway_fixed_fee,
      payment_gateway_percent_fee:
        countryData?.payment_gateway_percent_fee ??
        this.SYSTEM_DEFAULTS.payment_gateway_percent_fee,

      // Shipping costs - from route data
      base_shipping_cost: routeData.base_shipping_cost ?? this.SYSTEM_DEFAULTS.base_shipping_cost,
      cost_per_kg: routeData.cost_per_kg ?? this.SYSTEM_DEFAULTS.cost_per_kg,
      cost_percentage: routeData.cost_percentage ?? this.SYSTEM_DEFAULTS.cost_percentage,

      // Metadata
      data_source: 'route_specific',
      confidence_score: 1.0,
      last_updated: routeData.updated_at,
      route_id: routeData.id,
    };
  }

  /**
   * Build unified data structure from country-level fallback
   */
  private buildUnifiedDataFromCountry(
    countryData: CountrySettings,
    originCountry: string,
  ): UnifiedTaxData {
    return {
      // Tax rates from country settings
      customs_percent: countryData.customs_percent ?? this.SYSTEM_DEFAULTS.customs_percent,
      vat_percent: countryData.vat_percent ?? this.SYSTEM_DEFAULTS.vat_percent,

      // Currency and exchange
      currency: countryData.currency,
      exchange_rate: countryData.rate_from_usd,

      // Payment processing
      minimum_payment_amount:
        countryData.minimum_payment_amount ?? this.SYSTEM_DEFAULTS.minimum_payment_amount,
      payment_gateway_fixed_fee:
        countryData.payment_gateway_fixed_fee ?? this.SYSTEM_DEFAULTS.payment_gateway_fixed_fee,
      payment_gateway_percent_fee:
        countryData.payment_gateway_percent_fee ?? this.SYSTEM_DEFAULTS.payment_gateway_percent_fee,

      // Shipping costs - use system defaults
      base_shipping_cost: this.SYSTEM_DEFAULTS.base_shipping_cost,
      cost_per_kg: this.SYSTEM_DEFAULTS.cost_per_kg,
      cost_percentage: this.SYSTEM_DEFAULTS.cost_percentage,

      // Metadata
      data_source: 'country_fallback',
      confidence_score: 0.8,
      last_updated: countryData.updated_at,
      fallback_reason: `No route found for ${originCountry} → ${countryData.code}`,
    };
  }

  /**
   * Build system default data structure (ultimate fallback)
   */
  private buildSystemDefaultData(
    originCountry: string,
    destinationCountry: string,
    fallbackReason?: string,
  ): UnifiedTaxData {
    return {
      // All system defaults
      customs_percent: this.SYSTEM_DEFAULTS.customs_percent,
      vat_percent: this.SYSTEM_DEFAULTS.vat_percent,
      currency: 'USD',
      exchange_rate: this.SYSTEM_DEFAULTS.exchange_rate,
      minimum_payment_amount: this.SYSTEM_DEFAULTS.minimum_payment_amount,
      payment_gateway_fixed_fee: this.SYSTEM_DEFAULTS.payment_gateway_fixed_fee,
      payment_gateway_percent_fee: this.SYSTEM_DEFAULTS.payment_gateway_percent_fee,
      base_shipping_cost: this.SYSTEM_DEFAULTS.base_shipping_cost,
      cost_per_kg: this.SYSTEM_DEFAULTS.cost_per_kg,
      cost_percentage: this.SYSTEM_DEFAULTS.cost_percentage,

      // Metadata
      data_source: 'system_default',
      confidence_score: 0.4,
      last_updated: new Date().toISOString(),
      fallback_reason:
        fallbackReason ??
        `No route or country data found for ${originCountry} → ${destinationCountry}`,
    };
  }

  /**
   * Get multiple routes for comparison (useful for admin interfaces)
   */
  async getMultipleRoutesData(
    routes: Array<{ origin: string; destination: string }>,
  ): Promise<UnifiedTaxData[]> {
    const promises = routes.map((route) => this.getUnifiedTaxData(route.origin, route.destination));

    return Promise.all(promises);
  }

  /**
   * Compare destinationCountry: string,
  ): Promise<{
    unified_data: UnifiedTaxData;
    hsn_available: boolean;
    legacy_available: boolean;
    recommended_method: 'hsn_only' | 'legacy_fallback' | 'auto';
  }> {
    const unifiedData = await this.getUnifiedTaxData(originCountry, destinationCountry);

    
    const { data: hsnData } = await supabase.from('hsn_master').select('hsn_code').limit(1);

    const hsnAvailable = Boolean(hsnData && hsnData.length > 0);
    const legacyAvailable = unifiedData.data_source !== 'system_default';

    // Determine recommended method
    let recommendedMethod: 'hsn_only' | 'legacy_fallback' | 'auto' = 'auto';
    if (hsnAvailable && unifiedData.confidence_score > 0.8) {
      recommendedMethod = 'hsn_only';
    } else if (legacyAvailable) {
      recommendedMethod = 'legacy_fallback';
    }

    return {
      unified_data: unifiedData,
      hsn_available: hsnAvailable,
      legacy_available: legacyAvailable,
      recommended_method: recommendedMethod,
    };
  }

  /**
   * Cache management
   */
  private getCachedData(key: string): UnifiedTaxData | null {
    const entry = this.cache.get(key);
    if (entry && Date.now() < entry.expires_at) {
      return entry.data;
    }

    // Clean up expired entry
    if (entry) {
      this.cache.delete(key);
    }

    return null;
  }

  private setCachedData(key: string, data: UnifiedTaxData): void {
    const now = Date.now();
    this.cache.set(key, {
      data,
      timestamp: now,
      expires_at: now + this.CACHE_DURATION,
    });
  }

  /**
   * Clear cache (useful for testing or after data updates)
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    total_entries: number;
    active_entries: number;
    expired_entries: number;
  } {
    const now = Date.now();
    let active = 0;
    let expired = 0;

    for (const entry of this.cache.values()) {
      if (now < entry.expires_at) {
        active++;
      } else {
        expired++;
      }
    }

    return {
      total_entries: this.cache.size,
      active_entries: active,
      expired_entries: expired,
    };
  }
}

// Export singleton instance
export const unifiedTaxFallbackService = new UnifiedTaxFallbackService();
export type { UnifiedTaxData };
