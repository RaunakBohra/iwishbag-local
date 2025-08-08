/**
 * useBulkOperations - Custom hook for bulk pricing operations
 * 
 * Features:
 * - Bulk pricing updates
 * - Revenue impact calculations
 * - Hierarchical rate updates (country/regional/continental)
 * - Error handling and progress tracking
 * - Cache invalidation
 */

import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { regionalPricingService } from '@/services/RegionalPricingService';

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

interface Service {
  id: string;
  service_key: string;
  service_name: string;
  pricing_type: 'percentage' | 'fixed';
}

interface Country {
  code: string;
  name: string;
  continent?: string;
}

interface PricingMatrix {
  countries: Record<string, {
    rate: number;
    tier: string;
    source: string;
    min_amount: number;
    max_amount?: number;
  }>;
  pricing_type: 'percentage' | 'fixed';
}

interface BulkOperation {
  type: 'set_rate' | 'increase_percent' | 'decrease_percent' | 'increase_amount' | 'decrease_amount';
  value: number;
  selectedCountries: string[];
  reason?: string;
}

interface RevenueImpactResult {
  estimated_revenue_change: number;
  impact_percentage: number;
  affected_countries: string[];
  confidence_score: number;
}

// ============================================================================
// CUSTOM HOOK
// ============================================================================

export const useBulkOperations = (
  selectedService: string,
  services: Service[],
  countries: Country[],
  pricingMatrix?: PricingMatrix | null
) => {
  const queryClient = useQueryClient();

  // ============================================================================
  // BULK UPDATE HANDLER
  // ============================================================================

  const handleBulkUpdate = useCallback(async (operation: BulkOperation) => {
    const service = services.find(s => s.service_key === selectedService);
    if (!service) {
      throw new Error('Service not found');
    }

    try {
      // Process bulk update for selected countries
      const updatePromises = operation.selectedCountries.map(async (countryCode: string) => {
        let newRate: number;
        
        // Calculate new rate based on operation type
        const currentCountry = countries.find(c => c.code === countryCode);
        if (!currentCountry || !pricingMatrix?.countries[countryCode]) {
          return Promise.resolve();
        }
        
        const currentRate = pricingMatrix.countries[countryCode].rate;
        
        switch (operation.type) {
          case 'set_rate':
            newRate = operation.value;
            break;
          case 'increase_percent':
            newRate = currentRate * (1 + operation.value / 100);
            break;
          case 'decrease_percent':
            newRate = currentRate * (1 - operation.value / 100);
            break;
          case 'increase_amount':
            newRate = currentRate + operation.value;
            break;
          case 'decrease_amount':
            newRate = Math.max(0, currentRate - operation.value);
            break;
          default:
            newRate = currentRate;
        }

        // Update in database (audit logging will be handled by triggers)
        const { error } = await supabase
          .from('country_pricing_overrides')
          .upsert({
            service_id: service.id,
            country_code: countryCode,
            rate: newRate,
            reason: operation.reason || `Bulk ${operation.type} operation`,
            is_active: true,
            effective_from: new Date().toISOString()
          }, {
            onConflict: 'service_id,country_code'
          });

        if (error) throw error;
      });

      await Promise.all(updatePromises);

      // Clear service cache for immediate updates
      regionalPricingService.clearCache();
      
      // Clear database cache for all affected countries
      try {
        const cacheDeletePromises = operation.selectedCountries.map(countryCode =>
          supabase
            .from('pricing_calculation_cache')
            .delete()
            .eq('service_id', service.id)
            .eq('country_code', countryCode)
        );
        await Promise.all(cacheDeletePromises);
      } catch (cacheError) {
        console.warn('Failed to clear database cache:', cacheError);
      }

      // Refresh React Query data
      queryClient.invalidateQueries({ queryKey: ['pricing-matrix', selectedService] });
      
      toast({ 
        title: 'Bulk update completed successfully', 
        description: `Updated pricing for ${operation.selectedCountries.length} countries`
      });

    } catch (error) {
      console.error('Bulk update failed:', error);
      throw error;
    }
  }, [selectedService, services, countries, pricingMatrix, queryClient]);

  // ============================================================================
  // HIERARCHICAL RATE UPDATE
  // ============================================================================

  const handleHierarchicalRateUpdate = useCallback(async (nodeId: string, newRate: number) => {
    const service = services.find(s => s.service_key === selectedService);
    if (!service) {
      throw new Error('Service not found');
    }

    try {
      // Determine update type based on nodeId
      if (nodeId === 'global') {
        // Update global default rate in system_settings
        const { error } = await supabase
          .from('system_settings')
          .upsert({
            setting_key: 'global_default_pricing_rate',
            setting_value: newRate.toString()
          });
        if (error) throw error;
      } else if (nodeId.length === 2) {
        // Country code - update country override
        const { error } = await supabase
          .from('country_pricing_overrides')
          .upsert({
            service_id: service.id,
            country_code: nodeId,
            rate: newRate,
            reason: `Hierarchical update for ${nodeId}`,
            is_active: true,
            effective_from: new Date().toISOString()
          }, {
            onConflict: 'service_id,country_code'
          });
        if (error) throw error;
      } else {
        // Regional or continental update
        const isContinent = ['asia', 'europe', 'africa', 'north_america', 'south_america', 'oceania']
          .includes(nodeId.toLowerCase().replace(' ', '_'));

        if (isContinent) {
          // Continental update
          const { error } = await supabase
            .from('continental_pricing')
            .upsert({
              service_id: service.id,
              continent: nodeId.replace('_', ' '),
              rate: newRate,
              notes: `Hierarchical continental update`,
              is_active: true
            });
          if (error) throw error;
        } else {
          // Regional update
          const { error } = await supabase
            .from('regional_pricing')
            .upsert({
              service_id: service.id,
              region_key: nodeId,
              rate: newRate,
              notes: `Hierarchical regional update`,
              is_active: true
            });
          if (error) throw error;
        }
      }

      // Clear service cache for immediate updates
      regionalPricingService.clearCache();
      
      // Refresh React Query data
      queryClient.invalidateQueries({ queryKey: ['pricing-matrix', selectedService] });
      
      toast({ 
        title: 'Rate updated successfully', 
        description: `${nodeId} rate updated to ${newRate}${pricingMatrix?.pricing_type === 'percentage' ? '%' : ' USD'}`
      });

    } catch (error) {
      console.error('Hierarchical update failed:', error);
      throw error;
    }
  }, [selectedService, services, queryClient, pricingMatrix?.pricing_type]);

  // ============================================================================
  // REVENUE IMPACT CALCULATOR
  // ============================================================================

  const calculateRevenueImpact = useCallback(async (
    currentRate: number, 
    newRate: number, 
    affectedCountries: string[]
  ): Promise<RevenueImpactResult> => {
    try {
      // This would typically call an analytics service
      // For now, we'll provide a simplified calculation
      
      const rateChange = (newRate - currentRate) / currentRate;
      const estimatedOrdersPerMonth = 1000; // This would come from analytics
      const avgOrderValue = 150; // This would come from analytics
      
      const estimatedRevenueChange = 
        estimatedOrdersPerMonth * 
        avgOrderValue * 
        rateChange * 
        (affectedCountries.length / countries.length);

      return {
        estimated_revenue_change: estimatedRevenueChange,
        impact_percentage: rateChange * 100,
        affected_countries: affectedCountries,
        confidence_score: Math.min(95, 60 + (affectedCountries.length * 5)) // Higher confidence with more data
      };
      
    } catch (error) {
      console.error('Revenue impact calculation failed:', error);
      return {
        estimated_revenue_change: 0,
        impact_percentage: 0,
        affected_countries: affectedCountries,
        confidence_score: 0
      };
    }
  }, [countries.length]);

  // ============================================================================
  // SINGLE COUNTRY UPDATE
  // ============================================================================

  const handleCountryRateUpdate = useCallback(async (countryCode: string, newRate: number) => {
    const service = services.find(s => s.service_key === selectedService);
    if (!service) {
      toast({ title: 'Service not found', variant: 'destructive' });
      return;
    }

    try {
      const { error } = await supabase
        .from('country_pricing_overrides')
        .upsert({
          service_id: service.id,
          country_code: countryCode,
          rate: newRate,
          reason: `Manual rate update for ${countryCode}`,
          is_active: true,
          effective_from: new Date().toISOString()
        }, {
          onConflict: 'service_id,country_code'
        });

      if (error) throw error;

      // Clear service cache for immediate updates
      regionalPricingService.clearCache();
      
      // Clear database cache for the specific country
      try {
        await supabase
          .from('pricing_calculation_cache')
          .delete()
          .eq('service_id', service.id)
          .eq('country_code', countryCode);
      } catch (cacheError) {
        console.warn('Failed to clear database cache:', cacheError);
      }
      
      // Refresh React Query data
      queryClient.invalidateQueries({ queryKey: ['pricing-matrix', selectedService] });
      
      toast({ 
        title: 'Rate updated successfully', 
        description: `${countryCode} rate set to ${newRate}${pricingMatrix?.pricing_type === 'percentage' ? '%' : ' USD'}`
      });

    } catch (error) {
      console.error('Update failed:', error);
      toast({ title: 'Update failed', variant: 'destructive' });
    }
  }, [selectedService, services, queryClient, pricingMatrix?.pricing_type]);

  return {
    handleBulkUpdate,
    handleHierarchicalRateUpdate,
    handleCountryRateUpdate,
    calculateRevenueImpact,
  };
};