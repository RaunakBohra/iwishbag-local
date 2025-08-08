// ============================================================================
// ROUTE TIER TAX SERVICE - Get Tax Rates from Route Customs Tiers
// Provides tax rates based on route-specific price/weight tiers
// ============================================================================

import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';
import * as Sentry from '@sentry/react';
import { countryStandardizationService } from './CountryStandardizationService';

export interface RouteTierTaxRates {
  customs: number;         // Customs percentage
  vat: number;            // VAT percentage
  sales_tax: number;      // Sales tax percentage
  source: 'route_tier';
  tier_name: string;      // Name of the matched tier
  tier_id: string;        // ID of the matched tier
  priority: number;       // Priority order of the tier
}

type RouteTier = Tables<'route_customs_tiers'>;

/**
 * ROUTE TIER TAX SERVICE - Retrieves tax rates from route customs tiers
 * 
 * Matches tiers based on:
 * - Origin and destination countries
 * - Item price range
 * - Weight range
 * - Logic type (AND/OR)
 * 
 * Returns the highest priority matching tier
 */
class RouteTierTaxService {
  private static instance: RouteTierTaxService;
  private cache = new Map<string, { data: RouteTierTaxRates | null; timestamp: number }>();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  private constructor() {
    console.log('🛤️ RouteTierTaxService initialized');
  }

  static getInstance(): RouteTierTaxService {
    if (!RouteTierTaxService.instance) {
      RouteTierTaxService.instance = new RouteTierTaxService();
    }
    return RouteTierTaxService.instance;
  }

  /**
   * Get tax rates from route customs tiers
   * @param origin - Origin country code
   * @param destination - Destination country code
   * @param itemsTotal - Total value of items in USD
   * @param totalWeight - Total weight in kg
   * @returns Matching tier tax rates or null if no match
   */
  async getRouteTierTaxes(
    origin: string,
    destination: string,
    itemsTotal: number,
    totalWeight: number
  ): Promise<RouteTierTaxRates | null> {
    // Temporarily disable Sentry transaction
    // const transaction = Sentry.startTransaction({
    //   name: 'RouteTierTaxService.getRouteTierTaxes',
    //   op: 'route_tier_lookup',
    // });

    try {
      // Standardize countries to country codes
      await countryStandardizationService.initialize();
      const standardizedOrigin = countryStandardizationService.standardizeCountry(origin);
      const standardizedDestination = countryStandardizationService.standardizeCountry(destination);

      // Generate cache key with standardized countries
      const cacheKey = `${standardizedOrigin}:${standardizedDestination}:${Math.floor(itemsTotal)}:${Math.floor(totalWeight)}`;
      
      // Check cache
      const cached = this.getFromCache(cacheKey);
      if (cached !== undefined) {
        console.log('💾 [ROUTE TIER] Using cached result for:', cacheKey);
        // transaction.setStatus('ok');
        return cached;
      }

      console.log('🔍 [ROUTE TIER] Searching for matching tier:', {
        origin: standardizedOrigin,
        destination: standardizedDestination,
        itemsTotal,
        totalWeight,
      });

      // Query route customs tiers (using standardized country codes)
      const { data: tiers, error } = await supabase
        .from('route_customs_tiers')
        .select('*')
        .eq('origin_country', standardizedOrigin)
        .eq('destination_country', standardizedDestination)
        .eq('is_active', true)
        .order('priority_order', { ascending: true });

      if (error) {
        console.error('❌ [ROUTE TIER] Query error:', error);
        Sentry.captureException(error);
        // transaction.setStatus('internal_error');
        this.setCache(cacheKey, null);
        return null;
      }

      if (!tiers || tiers.length === 0) {
        console.log('⚠️ [ROUTE TIER] No tiers found for route:', `${origin}→${destination}`);
        // transaction.setStatus('not_found');
        this.setCache(cacheKey, null);
        return null;
      }

      // Find matching tier
      const matchingTier = this.findMatchingTier(tiers, itemsTotal, totalWeight);

      if (!matchingTier) {
        console.log('⚠️ [ROUTE TIER] No matching tier for criteria:', {
          route: `${origin}→${destination}`,
          itemsTotal,
          totalWeight,
          tiersChecked: tiers.length,
        });
        // transaction.setStatus('no_match');
        this.setCache(cacheKey, null);
        return null;
      }

      // Convert to tax rates
      const rates: RouteTierTaxRates = {
        customs: matchingTier.customs_percentage,
        vat: matchingTier.vat_percentage,
        sales_tax: matchingTier.sales_tax_percentage || 0,
        source: 'route_tier',
        tier_name: matchingTier.rule_name,
        tier_id: matchingTier.id,
        priority: matchingTier.priority_order,
      };

      console.log('✅ [ROUTE TIER] Found matching tier:', {
        tierName: matchingTier.rule_name,
        priority: matchingTier.priority_order,
        rates,
      });

      // Cache the result
      this.setCache(cacheKey, rates);
      // transaction.setStatus('ok');
      return rates;

    } catch (error) {
      console.error('❌ [ROUTE TIER] Unexpected error:', error);
      Sentry.captureException(error);
      // transaction.setStatus('internal_error');
      return null;
    } finally {
      // transaction.finish();
    }
  }

  /**
   * Find the matching tier based on price/weight criteria
   */
  private findMatchingTier(
    tiers: RouteTier[],
    itemsTotal: number,
    totalWeight: number
  ): RouteTier | null {
    for (const tier of tiers) {
      const priceMatch = this.checkPriceMatch(tier, itemsTotal);
      const weightMatch = this.checkWeightMatch(tier, totalWeight);

      console.log('🔄 [ROUTE TIER] Checking tier:', {
        tierName: tier.rule_name,
        priceRange: `${tier.price_min || 0}-${tier.price_max || '∞'}`,
        weightRange: `${tier.weight_min || 0}-${tier.weight_max || '∞'}`,
        logicType: tier.logic_type,
        priceMatch,
        weightMatch,
      });

      // Apply logic type
      let isMatch = false;
      if (tier.logic_type === 'AND') {
        isMatch = priceMatch && weightMatch;
      } else if (tier.logic_type === 'OR') {
        isMatch = priceMatch || weightMatch;
      }

      if (isMatch) {
        return tier;
      }
    }

    return null;
  }

  /**
   * Check if price falls within tier range
   */
  private checkPriceMatch(tier: RouteTier, itemsTotal: number): boolean {
    // If no price criteria specified, it matches
    if (tier.price_min === null && tier.price_max === null) {
      return true;
    }

    const meetsMin = tier.price_min === null || itemsTotal >= tier.price_min;
    const meetsMax = tier.price_max === null || itemsTotal <= tier.price_max;

    return meetsMin && meetsMax;
  }

  /**
   * Check if weight falls within tier range
   */
  private checkWeightMatch(tier: RouteTier, totalWeight: number): boolean {
    // If no weight criteria specified, it matches
    if (tier.weight_min === null && tier.weight_max === null) {
      return true;
    }

    const meetsMin = tier.weight_min === null || totalWeight >= tier.weight_min;
    const meetsMax = tier.weight_max === null || totalWeight <= tier.weight_max;

    return meetsMin && meetsMax;
  }

  /**
   * Get all tiers for a specific route (for debugging/admin)
   */
  async getAllTiersForRoute(
    origin: string,
    destination: string
  ): Promise<RouteTier[]> {
    try {
      // Standardize countries to country codes
      await countryStandardizationService.initialize();
      const standardizedOrigin = countryStandardizationService.standardizeCountry(origin);
      const standardizedDestination = countryStandardizationService.standardizeCountry(destination);

      const { data: tiers, error } = await supabase
        .from('route_customs_tiers')
        .select('*')
        .eq('origin_country', standardizedOrigin)
        .eq('destination_country', standardizedDestination)
        .order('priority_order', { ascending: true });

      if (error) {
        console.error('❌ [ROUTE TIER] Error fetching all tiers:', error);
        return [];
      }

      return tiers || [];
    } catch (error) {
      console.error('❌ [ROUTE TIER] Unexpected error:', error);
      return [];
    }
  }

  /**
   * Validate if a tier would match given criteria (utility method)
   */
  validateTierMatch(
    tier: RouteTier,
    itemsTotal: number,
    totalWeight: number
  ): {
    matches: boolean;
    priceMatch: boolean;
    weightMatch: boolean;
    reason?: string;
  } {
    const priceMatch = this.checkPriceMatch(tier, itemsTotal);
    const weightMatch = this.checkWeightMatch(tier, totalWeight);

    let matches = false;
    let reason = '';

    if (tier.logic_type === 'AND') {
      matches = priceMatch && weightMatch;
      if (!matches) {
        reason = !priceMatch && !weightMatch ? 'Both price and weight out of range' :
                 !priceMatch ? 'Price out of range' : 'Weight out of range';
      }
    } else if (tier.logic_type === 'OR') {
      matches = priceMatch || weightMatch;
      if (!matches) {
        reason = 'Neither price nor weight in range';
      }
    }

    return { matches, priceMatch, weightMatch, reason };
  }

  // Cache management
  private getFromCache(key: string): RouteTierTaxRates | null | undefined {
    const cached = this.cache.get(key);
    if (!cached) return undefined;

    const isExpired = Date.now() - cached.timestamp > this.CACHE_DURATION;
    if (isExpired) {
      this.cache.delete(key);
      return undefined;
    }

    return cached.data;
  }

  private setCache(key: string, data: RouteTierTaxRates | null): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  // Clear cache (useful for testing or updates)
  clearCache(): void {
    this.cache.clear();
    console.log('🧹 [ROUTE TIER] Cache cleared');
  }
}

// Export singleton instance
export const routeTierTaxService = RouteTierTaxService.getInstance();