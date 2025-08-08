/**
 * usePricingMatrix - Custom hook for managing regional pricing data
 * 
 * Features:
 * - Pricing matrix data fetching
 * - Global configuration loading
 * - Caching and performance optimization
 * - Error handling and loading states
 * - Type-safe return values
 */

import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { regionalPricingService } from '@/services/RegionalPricingService';
import { supabase } from '@/integrations/supabase/client';

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

interface Service {
  id: string;
  service_key: string;
  service_name: string;
  pricing_type: 'percentage' | 'fixed';
  default_rate: number;
  min_amount?: number;
  max_amount?: number;
  icon_name?: string;
}

interface Country {
  code: string;
  name: string;
  continent?: string;
}

interface PricingMatrix {
  service_key: string;
  service_name: string;
  pricing_type: 'percentage' | 'fixed';
  icon_name?: string;
  globalConfig?: {
    default_rate: number;
    min_amount: number;
    max_amount: number;
  } | null;
  countries: Record<string, {
    rate: number;
    tier: 'global' | 'continental' | 'regional' | 'country';
    source: string;
    min_amount: number;
    max_amount?: number;
  }>;
}

interface PricingStats {
  min_rate: number;
  max_rate: number;
  avg_rate: number;
  tier_distribution: Record<string, number>;
  total_countries: number;
  coverage_percentage: number;
}

// ============================================================================
// CUSTOM HOOK
// ============================================================================

export const usePricingMatrix = (
  selectedService: string,
  services: Service[],
  countries: Country[],
  options?: {
    adminMode?: boolean; // For admin interfaces with shorter cache times
    refetchInterval?: number; // For real-time polling
  }
) => {
  const { adminMode = false, refetchInterval } = options || {};
  
  // Load pricing matrix for selected service
  const { 
    data: pricingMatrix, 
    isLoading: pricingLoading,
    error: pricingError,
    refetch: refetchPricing
  } = useQuery({
    queryKey: ['pricing-matrix', selectedService],
    queryFn: async (): Promise<PricingMatrix | null> => {
      if (!selectedService || countries.length === 0) return null;
      
      const service = services.find(s => s.service_key === selectedService);
      if (!service) return null;

      // Get pricing for all countries
      const pricingPromises = countries.map(async (country) => {
        try {
          const result = await regionalPricingService.calculatePricing({
            service_keys: [selectedService],
            country_code: country.code,
            order_value: 100, // Sample order value for calculation
            use_cache: true
          });

          const calculation = result.calculations[0];
          return {
            country_code: country.code,
            country_name: country.name,
            continent: country.continent,
            rate: calculation.applicable_rate,
            tier: calculation.pricing_tier,
            source: calculation.source_description,
            min_amount: calculation.min_amount,
            max_amount: calculation.max_amount,
          };
        } catch (error) {
          console.warn(`Failed to get pricing for ${country.code}:`, error);
          return {
            country_code: country.code,
            country_name: country.name,
            continent: country.continent,
            rate: service.default_rate,
            tier: 'global' as const,
            source: 'Default rate (error fallback)',
            min_amount: service.min_amount || 0,
            max_amount: service.max_amount,
          };
        }
      });

      const countryPricing = await Promise.all(pricingPromises);
      
      // Load global pricing configuration
      let globalConfig = null;
      try {
        const { data: globalSettings } = await supabase
          .from('system_settings')
          .select('setting_key, setting_value')
          .in('setting_key', [
            'global_default_pricing_rate',
            'global_pricing_min_amount', 
            'global_pricing_max_amount'
          ]);

        if (globalSettings && globalSettings.length > 0) {
          const configMap = globalSettings.reduce((acc, setting) => {
            acc[setting.setting_key] = setting.setting_value;
            return acc;
          }, {} as Record<string, string>);

          globalConfig = {
            default_rate: parseFloat(configMap.global_default_pricing_rate || '0.025'),
            min_amount: parseFloat(configMap.global_pricing_min_amount || '2.00'),
            max_amount: parseFloat(configMap.global_pricing_max_amount || '250.00')
          };
        }
      } catch (error) {
        console.warn('Failed to load global pricing configuration:', error);
      }
      
      return {
        service_key: selectedService,
        service_name: service.service_name,
        pricing_type: service.pricing_type,
        icon_name: service.icon_name,
        globalConfig: globalConfig,
        countries: countryPricing.reduce((acc, cp) => {
          acc[cp.country_code] = {
            rate: cp.rate,
            tier: cp.tier,
            source: cp.source,
            min_amount: cp.min_amount,
            max_amount: cp.max_amount,
          };
          return acc;
        }, {} as Record<string, any>)
      };
    },
    enabled: !!selectedService && countries.length > 0 && services.length > 0,
    staleTime: adminMode ? 10 * 1000 : 5 * 60 * 1000, // 10 seconds for admin, 5 minutes for customers
    gcTime: adminMode ? 2 * 60 * 1000 : 10 * 60 * 1000, // 2 minutes for admin, 10 minutes for customers
    refetchOnWindowFocus: adminMode, // Enable refetch on focus for admin
    refetchOnMount: 'always', // Control mount behavior more precisely
    refetchOnReconnect: false, // Don't refetch on reconnect
    refetchInterval: adminMode ? refetchInterval : false, // Enable polling for admin if specified
    retry: 1, // Only retry once on failure
    structuralSharing: true, // Prevent unnecessary re-renders
    keepPreviousData: true, // Keep previous data while fetching new
  });

  // Calculate pricing statistics
  const pricingStats = useMemo((): PricingStats | null => {
    if (!pricingMatrix || !pricingMatrix.countries) return null;

    const countryEntries = Object.values(pricingMatrix.countries);
    if (countryEntries.length === 0) return null;

    const rates = countryEntries.map(c => c.rate);
    const tiers = countryEntries.map(c => c.tier);
    
    return {
      min_rate: Math.min(...rates),
      max_rate: Math.max(...rates),
      avg_rate: rates.reduce((sum, rate) => sum + rate, 0) / rates.length,
      tier_distribution: tiers.reduce((acc, tier) => {
        acc[tier] = (acc[tier] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      total_countries: countries.length,
      coverage_percentage: countries.length > 0 ? (Object.keys(pricingMatrix.countries).length / countries.length) * 100 : 0,
    };
  }, [pricingMatrix?.service_key, pricingMatrix?.countries, countries.length]);

  // Group countries by continent for easier management
  const countriesByContinent = useMemo(() => {
    if (countries.length === 0) return {};
    
    return countries.reduce((acc, country) => {
      const continent = country.continent || 'Other';
      if (!acc[continent]) acc[continent] = [];
      acc[continent].push(country);
      return acc;
    }, {} as Record<string, Country[]>);
  }, [countries.length, countries.map(c => c.code).join(',')]);

  return {
    pricingMatrix,
    pricingStats,
    countriesByContinent,
    isLoading: pricingLoading,
    error: pricingError,
    refetch: refetchPricing,
  };
};