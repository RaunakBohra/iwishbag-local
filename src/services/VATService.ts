// ============================================================================
// VAT SERVICE - Hierarchical VAT Lookup System
// Implements VAT hierarchy: shipping_routes → country_settings → fallback
// Follows same pattern as CurrencyService for consistency
//
// IMPORTANT: Returns raw percentage values (13 = 13%, not 0.13)
// Database migration 20250128000014 standardized all values to percentage format
// ============================================================================

import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

interface VATResult {
  percentage: number;
  source: 'shipping_route' | 'shipping_route_calculated' | 'country_settings' | 'fallback';
  confidence: number;
  route?: string;
}

interface CustomsResult {
  percentage: number;
  source: 'shipping_route' | 'country_settings' | 'fallback';
  confidence: number;
  route?: string;
}

interface TaxLookupResult {
  vat: VATResult;
  customs: CustomsResult;
  route: string;
}

class VATService {
  private static instance: VATService;
  private cache = new Map<string, TaxLookupResult>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes (same as CurrencyService)

  private constructor() {}

  static getInstance(): VATService {
    if (!VATService.instance) {
      VATService.instance = new VATService();
    }
    return VATService.instance;
  }

  /**
   * Get VAT percentage with hierarchical lookup
   *
   * Priority hierarchy (similar to exchange rates):
   * 1. shipping_routes.vat_percentage (highest priority - route-specific)
   * 2. country_settings.vat (medium priority - country default)
   * 3. 0% (lowest priority - fallback)
   */
  async getVATPercentage(originCountry: string, destinationCountry: string): Promise<VATResult> {
    try {
      // Same country = no VAT for international trade
      if (originCountry === destinationCountry) {
        return {
          percentage: 0,
          source: 'fallback',
          confidence: 1.0,
          route: `${originCountry}→${destinationCountry}`,
        };
      }

      // Priority 1: Check shipping routes for route-specific VAT
      // FEATURE REQUEST: Add vat_percentage column to shipping_routes table for route-specific VAT rates
      // For now, we'll check if the route exists and use a calculated VAT based on route characteristics
      const { data: shippingRoute } = await supabase
        .from('shipping_routes')
        .select('*')
        .eq('origin_country', originCountry)
        .eq('destination_country', destinationCountry)
        .eq('is_active', true)
        .single();

      if (shippingRoute) {
        // For now, apply standard international trade VAT logic based on route
        // This can be enhanced when vat_percentage column is added
        const routeBasedVAT = this.calculateRouteBasedVAT(originCountry, destinationCountry, shippingRoute);
        
        logger.info(`VAT calculated from shipping route data`, {
          route: `${originCountry}→${destinationCountry}`,
          vatPercentage: routeBasedVAT
        });

        return {
          percentage: routeBasedVAT,
          source: 'shipping_route_calculated',
          confidence: 0.85,
          route: `${originCountry}→${destinationCountry}`,
        };
      }

      // Priority 2: Fallback to destination country's default VAT rate
      const { data: countrySettings, error: countryError } = await supabase
        .from('country_settings')
        .select('vat')
        .eq('code', destinationCountry)
        .single();

      if (!countryError && countrySettings?.vat !== null) {
        console.log(
          `[VATService] Using country settings VAT: ${destinationCountry} = ${countrySettings.vat}%`,
        );
        return {
          percentage: Number(countrySettings.vat),
          source: 'country_settings',
          confidence: 0.85,
          route: `${originCountry}→${destinationCountry}`,
        };
      }

      // Priority 3: Final fallback (0%)
      logger.warn('No VAT data found, using fallback', {
        route: `${originCountry}→${destinationCountry}`,
        fallbackVAT: 0
      });
      return {
        percentage: 0,
        source: 'fallback',
        confidence: 0.5,
        route: `${originCountry}→${destinationCountry}`,
      };
    } catch (error) {
      console.error(
        `[VATService] Error getting VAT for ${originCountry}→${destinationCountry}:`,
        error,
      );
      return {
        percentage: 0,
        source: 'fallback',
        confidence: 0.1,
        route: `${originCountry}→${destinationCountry}`,
      };
    }
  }

  /**
   * ⚠️ DEPRECATED: Use SmartCalculationEngine.getCustomsPercentageFromRoute() instead
   * This method is kept for backward compatibility only
   */
  async getCustomsPercentage(
    originCountry: string,
    destinationCountry: string,
  ): Promise<CustomsResult> {
    console.warn(
      '⚠️ VATService.getCustomsPercentage is deprecated - use SmartCalculationEngine.getCustomsPercentageFromRoute instead',
    );
    return {
      percentage: 0, // No defaults - must be configured
      source: 'deprecated_fallback',
      confidence: 0.1,
      route: `${originCountry}→${destinationCountry}`,
    };
  }

  /**
   * Get both VAT and customs data in one call (optimized)
   * Uses caching to improve performance
   */
  async getTaxData(originCountry: string, destinationCountry: string): Promise<TaxLookupResult> {
    const cacheKey = `${originCountry}-${destinationCountry}`;

    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached) {
      // Check if cache is still valid (5 minutes TTL)
      const cacheAge = Date.now() - (cached as any).cachedAt;
      if (cacheAge < this.CACHE_TTL) {
        console.log(`[VATService] Using cached tax data for ${cacheKey}`);
        return cached;
      }
      // Remove expired cache entry
      this.cache.delete(cacheKey);
    }

    try {
      // Get both VAT and customs data in parallel for efficiency
      const [vatResult, customsResult] = await Promise.all([
        this.getVATPercentage(originCountry, destinationCountry),
        this.getCustomsPercentage(originCountry, destinationCountry),
      ]);

      const result: TaxLookupResult = {
        vat: vatResult,
        customs: customsResult,
        route: `${originCountry}→${destinationCountry}`,
      };

      // Cache the result
      (result as any).cachedAt = Date.now();
      this.cache.set(cacheKey, result);

      console.log(`[VATService] Tax data for ${cacheKey}:`, {
        vat: `${vatResult.percentage}% (${vatResult.source})`,
        customs: `${customsResult.percentage}% (${customsResult.source})`,
      });

      return result;
    } catch (error) {
      console.error(`[VATService] Error getting tax data for ${cacheKey}:`, error);

      // Return fallback data in case of error
      return {
        vat: {
          percentage: 0,
          source: 'fallback',
          confidence: 0.1,
          route: `${originCountry}→${destinationCountry}`,
        },
        customs: {
          percentage: 0,
          source: 'fallback',
          confidence: 0.1,
          route: `${originCountry}→${destinationCountry}`,
        },
        route: `${originCountry}→${destinationCountry}`,
      };
    }
  }

  /**
   * Get cached VAT data for synchronous lookups (used by sync calculation method)
   * Returns null if data is not cached or expired
   */
  getCachedVATData(originCountry: string, destinationCountry: string): VATResult | null {
    const cacheKey = `${originCountry}-${destinationCountry}`; // ✅ FIX: Use consistent dash format
    const cached = this.cache.get(cacheKey);

    if (cached && this.isCacheValid(cached)) {
      console.log(
        `[VATService] Using cached VAT data (sync): ${cacheKey} = ${cached.vat.percentage}% (${cached.vat.source})`,
      );
      return cached.vat;
    }

    return null;
  }

  /**
   * Check if cached data is still valid (within TTL)
   */
  private isCacheValid(cached: TaxLookupResult): boolean {
    const cacheAge = Date.now() - ((cached as any).cachedAt || 0);
    return cacheAge < this.CACHE_TTL;
  }

  /**
   * Clear cache (useful for testing or when tax rates are updated)
   */
  clearCache(): void {
    this.cache.clear();
    console.log('[VATService] Cache cleared');
  }

  /**
   * Get cache statistics (for debugging)
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }

  /**
   * Calculate VAT based on shipping route characteristics
   * This is a temporary implementation until vat_percentage column is added
   */
  private calculateRouteBasedVAT(originCountry: string, destinationCountry: string, shippingRoute: any): number {
    // Define VAT rates for common international trade scenarios
    const vatRates = {
      // EU to EU - standard VAT applies
      'EU_TO_EU': 20,
      // US to anywhere - no federal VAT, but destination may have sales tax
      'US_OUTBOUND': 0,
      // China outbound - export VAT rebate typically applies
      'CN_OUTBOUND': 0,
      // India outbound - IGST applies for exports
      'IN_OUTBOUND': 0,
      // Into EU - VAT based on destination
      'INTO_EU': 20,
      // Standard international trade
      'INTERNATIONAL': 0,
    };

    // EU countries for reference
    const euCountries = ['DE', 'FR', 'IT', 'ES', 'NL', 'BE', 'AT', 'IE', 'FI', 'PT', 'GR', 'LU', 'SI', 'SK', 'EE', 'LV', 'LT', 'CY', 'MT', 'CZ', 'HU', 'PL', 'BG', 'RO', 'HR', 'SE', 'DK'];
    
    const isOriginEU = euCountries.includes(originCountry);
    const isDestinationEU = euCountries.includes(destinationCountry);

    // Apply VAT logic based on route characteristics
    if (isOriginEU && isDestinationEU) {
      return vatRates.EU_TO_EU;
    }
    
    if (originCountry === 'US') {
      return vatRates.US_OUTBOUND;
    }
    
    if (originCountry === 'CN') {
      return vatRates.CN_OUTBOUND;
    }
    
    if (originCountry === 'IN') {
      return vatRates.IN_OUTBOUND;
    }
    
    if (isDestinationEU) {
      return vatRates.INTO_EU;
    }

    // Default for international trade
    return vatRates.INTERNATIONAL;
  }
}

// Export singleton instance
export const vatService = VATService.getInstance();
export default vatService;
