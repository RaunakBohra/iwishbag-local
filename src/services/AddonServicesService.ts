/**
 * AddonServicesService - Complete Add-on Services Management
 * 
 * Handles all operations related to add-on services:
 * - Service discovery and configuration
 * - Customer eligibility and recommendations
 * - Dynamic pricing with regional support  
 * - Integration with quote and order systems
 * - Analytics and performance tracking
 */

import { supabase } from '@/integrations/supabase/client';
import { regionalPricingService, type AddonService, type PricingCalculation } from '@/services/RegionalPricingService';
import { currencyService } from '@/services/CurrencyService';
import { logger } from '@/utils/logger';

export interface AddonServiceRecommendation {
  service_key: string;
  service_name: string;
  recommendation_score: number; // 0-1, higher = more recommended
  recommendation_reason: string;
  pricing: PricingCalculation;
  estimated_value_add: number; // In USD
  customer_acceptance_rate: number; // Historical data
  seasonal_modifier?: number;
}

export interface CustomerEligibility {
  customer_id?: string;
  country_code: string;
  order_value: number;
  order_type: 'quote' | 'order';
  customer_tier?: 'new' | 'regular' | 'vip';
  historical_addon_usage?: Record<string, number>;
}

export interface AddonServiceSelection {
  service_key: string;
  is_selected: boolean;
  calculated_amount: number;
  custom_parameters?: Record<string, any>;
}

export interface AddonServicesBundle {
  bundle_id: string;
  bundle_name: string;
  included_services: string[];
  bundle_discount_percentage: number;
  total_individual_cost: number;
  bundle_cost: number;
  savings_amount: number;
  is_recommended: boolean;
}

export interface AddonServicesResult {
  success: boolean;
  available_services: AddonService[];
  recommendations: AddonServiceRecommendation[];
  pricing_calculations: PricingCalculation[];
  suggested_bundles: AddonServicesBundle[];
  total_addon_cost: number;
  currency_code: string;
  error?: string;
}

class AddonServicesServiceClass {
  private static instance: AddonServicesServiceClass;
  
  private constructor() {}
  
  public static getInstance(): AddonServicesServiceClass {
    if (!AddonServicesServiceClass.instance) {
      AddonServicesServiceClass.instance = new AddonServicesServiceClass();
    }
    return AddonServicesServiceClass.instance;
  }

  /**
   * Get personalized addon service recommendations for a customer/order
   */
  async getRecommendedServices(
    eligibility: CustomerEligibility,
    currency_code: string = 'USD'
  ): Promise<AddonServicesResult> {
    try {
      logger.debug(`[AddonServices] Getting recommendations for ${eligibility.country_code}, order value: ${eligibility.order_value}`);

      // 1. Get all available services with timeout
      const availableServicesPromise = regionalPricingService.getAvailableServices();
      const availableServices = await Promise.race([
        availableServicesPromise,
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Timeout getting available services')), 3000)
        )
      ]);
      
      // 2. Filter services applicable to this order type
      const applicableServices = availableServices.filter(service => 
        service.supported_order_types.includes(eligibility.order_type) &&
        service.is_active
      );

      // 3. Get pricing for all applicable services with timeout
      const pricingPromise = regionalPricingService.calculatePricing({
        service_keys: applicableServices.map(s => s.service_key),
        country_code: eligibility.country_code,
        order_value: eligibility.order_value,
        currency_code,
        use_cache: true
      });
      
      const pricingResult = await Promise.race([
        pricingPromise,
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Timeout calculating pricing')), 5000)
        )
      ]);

      if (!pricingResult.success) {
        throw new Error(pricingResult.error || 'Pricing calculation failed');
      }

      // 4. Generate intelligent recommendations
      const recommendations = await this.generateRecommendations(
        applicableServices,
        pricingResult.calculations,
        eligibility
      );

      // 5. Create suggested service bundles with error handling
      let suggestedBundles: AddonServicesBundle[] = [];
      try {
        suggestedBundles = await this.createServiceBundles(
          recommendations,
          eligibility.order_value,
          currency_code
        );
      } catch (bundleError) {
        logger.debug('Bundle creation failed, continuing without bundles:', bundleError);
        suggestedBundles = [];
      }

      // 6. Calculate total cost if all recommended services are selected
      const recommendedServices = recommendations.filter(r => r.recommendation_score >= 0.6);
      const total_addon_cost = recommendedServices.reduce((sum, rec) => sum + rec.pricing.calculated_amount, 0);

      const result: AddonServicesResult = {
        success: true,
        available_services: applicableServices,
        recommendations: recommendations.sort((a, b) => b.recommendation_score - a.recommendation_score),
        pricing_calculations: pricingResult.calculations,
        suggested_bundles: suggestedBundles,
        total_addon_cost,
        currency_code,
      };

      logger.debug(`[AddonServices] Generated ${recommendations.length} recommendations, ${suggestedBundles.length} bundles`);
      return result;

    } catch (error) {
      logger.error('Error getting addon service recommendations:', error);
      return {
        success: false,
        available_services: [],
        recommendations: [],
        pricing_calculations: [],
        suggested_bundles: [],
        total_addon_cost: 0,
        currency_code,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Generate intelligent service recommendations based on various factors
   */
  private async generateRecommendations(
    services: AddonService[],
    pricingCalculations: PricingCalculation[],
    eligibility: CustomerEligibility
  ): Promise<AddonServiceRecommendation[]> {
    
    const recommendations: AddonServiceRecommendation[] = [];

    for (const service of services) {
      const pricing = pricingCalculations.find(p => p.service_key === service.service_key);
      if (!pricing) continue;

      // Base recommendation score
      let score = 0.3; // Base score for all services
      let reason = 'Available service';

      // Factor 1: Service category relevance
      if (service.service_category === 'protection') {
        if (eligibility.order_value > 100) {
          score += 0.3;
          reason = 'High-value order protection recommended';
        } else if (eligibility.order_value > 50) {
          score += 0.2;
          reason = 'Package protection recommended';
        }
      }

      // Factor 2: Country risk profile
      if (service.service_key === 'package_protection') {
        const riskCountries = ['IN', 'PK', 'BD', 'NG', 'BR', 'MX', 'ZA'];
        if (riskCountries.includes(eligibility.country_code)) {
          score += 0.25;
          reason = 'Higher protection recommended for this region';
        }
      }

      // Factor 3: Express processing for premium markets
      if (service.service_key === 'express_processing') {
        const premiumMarkets = ['US', 'CA', 'GB', 'DE', 'FR', 'JP', 'AU'];
        if (premiumMarkets.includes(eligibility.country_code)) {
          score += 0.2;
          reason = 'Express processing popular in premium markets';
        }
      }

      // Factor 4: Service defaults and business rules
      if (service.is_default_enabled) {
        score += 0.15;
        reason = service.badge_text ? `${service.badge_text} service` : 'Recommended service';
      }

      // Factor 5: Order value thresholds from business rules
      if (service.business_rules?.auto_enable_threshold) {
        const threshold = service.business_rules.auto_enable_threshold;
        if (eligibility.order_value >= threshold) {
          score += 0.2;
          reason = `Auto-recommended for orders over $${threshold}`;
        }
      }

      // Factor 6: Customer tier adjustments
      if (eligibility.customer_tier) {
        switch (eligibility.customer_tier) {
          case 'vip':
            if (service.service_category === 'support') {
              score += 0.3;
              reason = 'VIP priority support';
            }
            break;
          case 'new':
            if (service.service_key === 'package_protection') {
              score += 0.15;
              reason = 'Protection recommended for first-time customers';
            }
            break;
        }
      }

      // Factor 7: Historical usage patterns (if available)
      if (eligibility.historical_addon_usage) {
        const usage = eligibility.historical_addon_usage[service.service_key] || 0;
        if (usage > 0.7) {
          score += 0.25;
          reason = 'Based on your previous preferences';
        }
      }

      // Factor 8: Seasonal and contextual modifiers
      const seasonalModifier = this.getSeasonalModifier(service.service_key);
      score += seasonalModifier;

      // Cap score at 1.0
      score = Math.min(score, 1.0);

      // Estimate value add (revenue impact for business)
      const estimatedValueAdd = this.estimateServiceValueAdd(service, eligibility.order_value);
      
      // Get historical acceptance rate (mock data for now)
      const customerAcceptanceRate = this.getHistoricalAcceptanceRate(
        service.service_key, 
        eligibility.country_code
      );

      recommendations.push({
        service_key: service.service_key,
        service_name: service.service_name,
        recommendation_score: score,
        recommendation_reason: reason,
        pricing,
        estimated_value_add: estimatedValueAdd,
        customer_acceptance_rate: customerAcceptanceRate,
        seasonal_modifier: seasonalModifier > 0 ? seasonalModifier : undefined,
      });
    }

    return recommendations;
  }

  /**
   * Create smart service bundles with discounts
   */
  private async createServiceBundles(
    recommendations: AddonServiceRecommendation[],
    orderValue: number,
    currencyCode: string
  ): Promise<AddonServicesBundle[]> {
    
    
    const bundles: AddonServicesBundle[] = [];
    
    try {
    
    // Bundle 1: Complete Protection Bundle
    const protectionServices = recommendations.filter(r => 
      ['package_protection', 'photo_documentation', 'priority_support'].includes(r.service_key) &&
      r.recommendation_score >= 0.4
    );

    if (protectionServices.length >= 2) {
      const individualCost = protectionServices.reduce((sum, s) => sum + s.pricing.calculated_amount, 0);
      const bundleDiscount = 0.15; // 15% discount
      const bundleCost = individualCost * (1 - bundleDiscount);

      bundles.push({
        bundle_id: 'complete_protection',
        bundle_name: 'Complete Protection Bundle',
        included_services: protectionServices.map(s => s.service_key),
        bundle_discount_percentage: bundleDiscount * 100,
        total_individual_cost: individualCost,
        bundle_cost: bundleCost,
        savings_amount: individualCost - bundleCost,
        is_recommended: orderValue > 150 && protectionServices.length >= 3,
      });
    }

    // Bundle 2: Premium Experience Bundle
    const premiumServices = recommendations.filter(r => 
      ['express_processing', 'priority_support', 'gift_wrapping'].includes(r.service_key) &&
      r.recommendation_score >= 0.5
    );

    if (premiumServices.length >= 2) {
      const individualCost = premiumServices.reduce((sum, s) => sum + s.pricing.calculated_amount, 0);
      const bundleDiscount = 0.12; // 12% discount
      const bundleCost = individualCost * (1 - bundleDiscount);

      bundles.push({
        bundle_id: 'premium_experience',
        bundle_name: 'Premium Experience Bundle',
        included_services: premiumServices.map(s => s.service_key),
        bundle_discount_percentage: bundleDiscount * 100,
        total_individual_cost: individualCost,
        bundle_cost: bundleCost,
        savings_amount: individualCost - bundleCost,
        is_recommended: orderValue > 100,
      });
    }

    return bundles;
    
    } catch (error) {
      logger.error('Error in createServiceBundles:', error);
      throw new Error(`Bundle creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Apply selected addon services to a quote or order
   */
  async applyAddonServices(
    target_id: string,
    target_type: 'quote' | 'order',
    selections: AddonServiceSelection[],
    customer_id?: string
  ): Promise<{ success: boolean; total_addon_cost: number; error?: string }> {
    
    try {
      logger.debug(`[AddonServices] Applying ${selections.length} services to ${target_type} ${target_id}`);

      let total_addon_cost = 0;

      // Process each selected service
      for (const selection of selections) {
        if (!selection.is_selected) continue;

        // Apply the service based on target type
        if (target_type === 'quote') {
          await this.applyToQuote(target_id, selection, customer_id);
        } else {
          await this.applyToOrder(target_id, selection, customer_id);
        }

        total_addon_cost += selection.calculated_amount;
      }

      // Update the total cost on the target record
      await this.updateTargetTotalCost(target_id, target_type, total_addon_cost);

      logger.debug(`[AddonServices] Successfully applied services, total cost: ${total_addon_cost}`);
      
      return {
        success: true,
        total_addon_cost
      };

    } catch (error) {
      logger.error('Error applying addon services:', error);
      return {
        success: false,
        total_addon_cost: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get seasonal modifier for service recommendations
   */
  private getSeasonalModifier(serviceKey: string): number {
    const currentMonth = new Date().getMonth() + 1; // 1-12
    
    switch (serviceKey) {
      case 'gift_wrapping':
        // Higher recommendation during holiday seasons
        if ([11, 12, 1, 2].includes(currentMonth)) return 0.15; // Nov-Feb
        if ([5, 6].includes(currentMonth)) return 0.1; // May-June (Mother's/Father's Day)
        return 0;
        
      case 'express_processing':
        // Higher during holiday rush
        if ([11, 12].includes(currentMonth)) return 0.1;
        return 0;
        
      default:
        return 0;
    }
  }

  /**
   * Estimate business value add from service adoption
   */
  private estimateServiceValueAdd(service: AddonService, orderValue: number): number {
    // This would be based on historical data and business intelligence
    const baseValueMultiplier = {
      'package_protection': 0.8,  // High value - prevents losses
      'express_processing': 0.6,  // Medium value - customer satisfaction
      'priority_support': 0.4,    // Lower direct value but important for retention
      'gift_wrapping': 0.3,       // Seasonal value
      'photo_documentation': 0.2, // Lower value but useful for disputes
    };

    const multiplier = baseValueMultiplier[service.service_key as keyof typeof baseValueMultiplier] || 0.1;
    return orderValue * multiplier;
  }

  /**
   * Get historical acceptance rate for service in specific country
   */
  private getHistoricalAcceptanceRate(serviceKey: string, countryCode: string): number {
    // This would query your analytics database
    // For now, return mock data based on service type and region
    
    const baseRates = {
      'package_protection': 0.65,
      'express_processing': 0.35,
      'priority_support': 0.25,
      'gift_wrapping': 0.15,
      'photo_documentation': 0.20,
    };

    const baseRate = baseRates[serviceKey as keyof typeof baseRates] || 0.1;
    
    // Adjust based on country characteristics
    const premiumMarkets = ['US', 'CA', 'GB', 'DE', 'FR', 'JP', 'AU'];
    const priceConsciousMarkets = ['IN', 'PK', 'BD', 'NP', 'LK'];
    
    if (premiumMarkets.includes(countryCode)) {
      return Math.min(baseRate * 1.3, 0.9); // Higher acceptance in premium markets
    } else if (priceConsciousMarkets.includes(countryCode)) {
      return baseRate * 0.7; // Lower acceptance in price-conscious markets
    }
    
    return baseRate;
  }

  /**
   * Apply addon service to a quote
   */
  private async applyToQuote(quoteId: string, selection: AddonServiceSelection, customerId?: string): Promise<void> {
    // Update quote with addon service
    const { error } = await supabase
      .from('quotes_v2')
      .update({
        addon_services: supabase.raw(`
          COALESCE(addon_services, '{}'::jsonb) || 
          '{"${selection.service_key}": {"selected": ${selection.is_selected}, "amount": ${selection.calculated_amount}}}'::jsonb
        `)
      })
      .eq('id', quoteId);

    if (error) {
      throw new Error(`Failed to apply service to quote: ${error.message}`);
    }
  }

  /**
   * Apply addon service to an order
   */
  private async applyToOrder(orderId: string, selection: AddonServiceSelection, customerId?: string): Promise<void> {
    // Implementation would depend on your orders table structure
    // For now, this is a placeholder
    logger.debug(`Applying ${selection.service_key} to order ${orderId}`);
  }

  /**
   * Update total cost on target record
   */
  private async updateTargetTotalCost(targetId: string, targetType: 'quote' | 'order', addonCost: number): Promise<void> {
    if (targetType === 'quote') {
      const { error } = await supabase
        .from('quotes_v2')
        .update({
          addon_services_total: addonCost,
          // Also update final total if needed
          final_total_origin: supabase.raw('total_quote_origincurrency + ' + addonCost)
        })
        .eq('id', targetId);

      if (error) {
        throw new Error(`Failed to update quote total: ${error.message}`);
      }
    }
    // Handle orders when needed
  }

  /**
   * Get addon services analytics and performance metrics
   */
  async getAnalytics(timeRange: '7d' | '30d' | '90d' = '30d'): Promise<any> {
    try {
      // This would integrate with your analytics service
      // Return mock data for now
      return {
        total_revenue: 25000,
        adoption_rates: {
          package_protection: 0.65,
          express_processing: 0.35,
          priority_support: 0.25,
          gift_wrapping: 0.15,
          photo_documentation: 0.20,
        },
        top_performing_regions: ['US', 'GB', 'DE', 'CA', 'AU'],
        bundle_performance: {
          complete_protection: { adoption: 0.15, avg_savings: 12.50 },
          premium_experience: { adoption: 0.08, avg_savings: 8.75 },
        }
      };
    } catch (error) {
      logger.error('Error getting addon services analytics:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const addonServicesService = AddonServicesServiceClass.getInstance();