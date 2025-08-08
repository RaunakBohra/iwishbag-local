/**
 * RegionalPricingService - Hierarchical Regional Pricing Engine
 * 
 * Implements hierarchical pricing system with intelligent fallback:
 * Country Override → Regional → Continental → Global Default
 * 
 * Features:
 * - Smart caching with 1-hour TTL
 * - Country detection integration
 * - Currency conversion support
 * - Performance optimized queries
 * - Comprehensive error handling
 */

import { supabase } from '@/integrations/supabase/client';
import { currencyService } from '@/services/CurrencyService';
import { logger } from '@/utils/logger';
import { performanceMonitoringService } from '@/services/PerformanceMonitoringService';

export interface AddonService {
  id: string;
  service_key: string;
  service_name: string;
  service_description?: string;
  service_category: 'protection' | 'processing' | 'support' | 'extras';
  pricing_type: 'percentage' | 'fixed' | 'tiered';
  default_rate: number;
  min_amount?: number;
  max_amount?: number;
  is_active: boolean;
  is_default_enabled: boolean;
  requires_order_value: boolean;
  supported_order_types: string[];
  display_order: number;
  icon_name?: string;
  badge_text?: string;
  business_rules?: Record<string, any>;
}

export interface PricingCalculation {
  service_key: string;
  service_name: string;
  pricing_type: 'percentage' | 'fixed' | 'tiered';
  
  // Rate information
  applicable_rate: number;
  calculated_amount: number;
  min_amount: number;
  max_amount?: number;
  
  // Source tracking
  pricing_tier: 'global' | 'continental' | 'regional' | 'country';
  source_description: string;
  
  // Metadata
  currency_code: string;
  order_value?: number;
  is_cached: boolean;
  calculation_timestamp: string;
}

export interface PricingRequest {
  service_keys: string[];
  country_code: string;
  order_value?: number;
  currency_code?: string;
  use_cache?: boolean;
}

export interface PricingResponse {
  success: boolean;
  calculations: PricingCalculation[];
  total_addon_cost: number;
  currency_code: string;
  country_code: string;
  error?: string;
  cache_hit_rate?: number;
}

export interface CountryPricingInfo {
  country_code: string;
  continent?: string;
  supported_services: string[];
  regional_groups: string[];
  has_country_overrides: boolean;
}

class RegionalPricingServiceClass {
  private static instance: RegionalPricingServiceClass;
  private cache = new Map<string, { data: any; expires: number }>();
  private readonly CACHE_DURATION = 60 * 60 * 1000; // 1 hour
  
  private constructor() {}
  
  public static getInstance(): RegionalPricingServiceClass {
    if (!RegionalPricingServiceClass.instance) {
      RegionalPricingServiceClass.instance = new RegionalPricingServiceClass();
    }
    return RegionalPricingServiceClass.instance;
  }

  /**
   * Get available addon services with their base configurations
   */
  async getAvailableServices(category?: string): Promise<AddonService[]> {
    const startTime = Date.now();
    const operationId = `get_services_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const cacheKey = `services_${category || 'all'}`;
    
    // Start performance monitoring
    performanceMonitoringService.startOperation(operationId, 'get_available_services', {
      category: category || 'all'
    });

    try {
      // Check cache first
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        // End performance monitoring - cache hit
        performanceMonitoringService.endOperation(
          operationId,
          'get_available_services',
          startTime,
          true,
          true,
          undefined,
          category,
          undefined,
          undefined,
          { serviceCount: cached.length }
        );
        return cached;
      }

      let query = supabase
        .from('addon_services')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (category) {
        query = query.eq('service_category', category);
      }

      const { data, error } = await query;
      
      if (error) {
        logger.error('Failed to fetch addon services:', error);
        
        // End performance monitoring - error
        performanceMonitoringService.endOperation(
          operationId,
          'get_available_services',
          startTime,
          false,
          false,
          undefined,
          category,
          undefined,
          `Database error: ${error.message}`,
          { category }
        );
        
        throw new Error(`Database error: ${error.message}`);
      }

      const services = data || [];
      this.setCache(cacheKey, services);
      
      // End performance monitoring - success
      performanceMonitoringService.endOperation(
        operationId,
        'get_available_services',
        startTime,
        true,
        false,
        undefined,
        category,
        undefined,
        undefined,
        { serviceCount: services.length }
      );
      
      logger.info(`[RegionalPricing] Loaded ${services.length} addon services`);
      return services;
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // End performance monitoring - error
      performanceMonitoringService.endOperation(
        operationId,
        'get_available_services',
        startTime,
        false,
        false,
        undefined,
        category,
        undefined,
        errorMessage,
        { category }
      );
      
      logger.error('Error fetching addon services:', error);
      throw error;
    }
  }

  /**
   * Calculate pricing for multiple services and a specific country
   */
  async calculatePricing(request: PricingRequest): Promise<PricingResponse> {
    const startTime = Date.now();
    const operationId = `pricing_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    let cacheHits = 0;
    let totalQueries = 0;

    // Start performance monitoring
    performanceMonitoringService.startOperation(operationId, 'calculate_pricing', {
      countryCode: request.country_code,
      serviceKeys: request.service_keys,
      orderValue: request.order_value
    });

    try {
      // Validate and normalize country code
      let normalizedCountry = request.country_code?.toUpperCase();
      if (!this.isValidCountryCode(normalizedCountry)) {
        logger.warn(`Invalid country code received: ${request.country_code}, falling back to US`);
        normalizedCountry = 'US';
      }

      logger.info(`[RegionalPricing] Calculating pricing for ${request.service_keys?.length || 0} services, country: ${normalizedCountry}`);

      const calculations: PricingCalculation[] = [];
      const currency = request.currency_code || 'USD';
      const serviceKeys = request.service_keys || [];

      // Process each service
      for (const service_key of request.service_keys) {
        totalQueries++;
        const calculation = await this.calculateServicePricing(
          service_key,
          normalizedCountry,
          request.order_value,
          currency,
          request.use_cache !== false
        );
        
        if (calculation.is_cached) {
          cacheHits++;
        }
        
        calculations.push(calculation);
      }

      // Calculate total addon cost
      const total_addon_cost = calculations.reduce((sum, calc) => sum + calc.calculated_amount, 0);

      const response: PricingResponse = {
        success: true,
        calculations,
        total_addon_cost,
        currency_code: currency,
        country_code: normalizedCountry,
        cache_hit_rate: totalQueries > 0 ? (cacheHits / totalQueries) * 100 : 0
      };

      const duration = Date.now() - startTime;
      const overallCacheHit = cacheHits > 0;

      // End performance monitoring - success
      performanceMonitoringService.endOperation(
        operationId,
        'calculate_pricing',
        startTime,
        true,
        overallCacheHit,
        normalizedCountry,
        request.service_keys?.join(','),
        request.order_value,
        undefined,
        {
          totalServices: request.service_keys?.length || 0,
          cacheHitRate: response.cache_hit_rate,
          totalCost: total_addon_cost
        }
      );

      logger.info(`[RegionalPricing] Pricing calculated in ${duration}ms, cache hit rate: ${response.cache_hit_rate?.toFixed(1)}%`);
      return response;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown pricing error';
      
      // End performance monitoring - error
      performanceMonitoringService.endOperation(
        operationId,
        'calculate_pricing',
        startTime,
        false,
        false,
        request.country_code,
        request.service_keys?.join(','),
        request.order_value,
        errorMessage,
        {
          totalServices: request.service_keys?.length || 0
        }
      );

      logger.error('Error calculating pricing:', error);
      return {
        success: false,
        calculations: [],
        total_addon_cost: 0,
        currency_code: request.currency_code || 'USD',
        country_code: request.country_code,
        error: errorMessage
      };
    }
  }

  /**
   * Calculate pricing for a single service using hierarchical fallback
   */
  private async calculateServicePricing(
    service_key: string,
    country_code: string,
    order_value?: number,
    currency_code: string = 'USD',
    use_cache: boolean = true
  ): Promise<PricingCalculation> {
    
    const cacheKey = `pricing_${service_key}_${country_code}_${order_value || 0}_${currency_code}`;
    
    try {
      // Check cache first
      if (use_cache) {
        const cached = this.getFromCache(cacheKey);
        if (cached) {
          return { ...cached, is_cached: true };
        }
      }

      // Get service configuration
      const service = await this.getServiceConfig(service_key);
      if (!service) {
        throw new Error(`Service not found: ${service_key}`);
      }

      // Try hierarchical pricing lookup: Country → Regional → Continental → Global
      const pricingRule = await this.findApplicablePricingRule(service.id, country_code);
      
      // Calculate the final amount
      const calculatedAmount = this.calculateFinalAmount(
        service,
        pricingRule,
        order_value,
        currency_code
      );

      const calculation: PricingCalculation = {
        service_key,
        service_name: service.service_name,
        pricing_type: service.pricing_type,
        applicable_rate: pricingRule.rate,
        calculated_amount: calculatedAmount.amount,
        min_amount: calculatedAmount.min_amount,
        max_amount: calculatedAmount.max_amount,
        pricing_tier: pricingRule.tier,
        source_description: pricingRule.description,
        currency_code,
        order_value,
        is_cached: false,
        calculation_timestamp: new Date().toISOString()
      };

      // Cache the result
      if (use_cache) {
        this.setCache(cacheKey, calculation);
      }

      // Also cache in database for longer-term storage
      if (order_value) {
        this.cacheInDatabase(service.id, country_code, order_value, pricingRule, calculatedAmount.amount).catch(err => {
          logger.warn('Failed to cache pricing in database:', err);
        });
      }

      return calculation;

    } catch (error) {
      logger.error(`Error calculating pricing for ${service_key}:`, error);
      throw error;
    }
  }

  /**
   * Find the most specific applicable pricing rule using hierarchical fallback
   */
  private async findApplicablePricingRule(service_id: string, country_code: string) {
    try {
      // 1. Try country-specific override first (highest priority)
      const countryRule = await this.getCountryOverride(service_id, country_code);
      if (countryRule) {
        return {
          rate: countryRule.rate,
          min_amount: countryRule.min_amount || 0,
          max_amount: countryRule.max_amount,
          tier: 'country' as const,
          description: `Country-specific rate for ${country_code}: ${countryRule.reason || 'Special pricing'}`
        };
      }

      // 2. Try regional pricing (second priority)
      const regionalRule = await this.getRegionalPricing(service_id, country_code);
      if (regionalRule) {
        return {
          rate: regionalRule.rate,
          min_amount: regionalRule.min_amount || 0,
          max_amount: regionalRule.max_amount,
          tier: 'regional' as const,
          description: `Regional rate (${regionalRule.region_name}): ${regionalRule.notes || 'Regional pricing'}`
        };
      }

      // 3. Try continental pricing (third priority)
      const continentalRule = await this.getContinentalPricing(service_id, country_code);
      if (continentalRule) {
        return {
          rate: continentalRule.rate,
          min_amount: continentalRule.min_amount || 0,
          max_amount: continentalRule.max_amount,
          tier: 'continental' as const,
          description: `Continental rate (${continentalRule.continent}): ${continentalRule.notes || 'Continental pricing'}`
        };
      }

      // 4. Fall back to global default (lowest priority)
      const service = await this.getServiceConfig(null, service_id);
      if (!service) {
        throw new Error('Service configuration not found for fallback');
      }

      return {
        rate: service.default_rate,
        min_amount: service.min_amount || 0,
        max_amount: service.max_amount,
        tier: 'global' as const,
        description: 'Global default rate - no specific regional pricing available'
      };

    } catch (error) {
      logger.error('Error finding pricing rule:', error);
      throw error;
    }
  }

  /**
   * Get country-specific pricing override
   */
  private async getCountryOverride(service_id: string, country_code: string) {
    // Skip if country_code is invalid
    if (!this.isValidCountryCode(country_code)) {
      return null;
    }

    const { data, error } = await supabase
      .from('country_pricing_overrides')
      .select('*')
      .eq('service_id', service_id)
      .eq('country_code', country_code)
      .eq('is_active', true)
      .lte('effective_from', new Date().toISOString())
      .or('effective_until.is.null,effective_until.gt.' + new Date().toISOString())
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
      logger.error('Error fetching country override:', error);
    }

    return data;
  }

  /**
   * Get regional pricing (countries grouped in custom regions)
   */
  private async getRegionalPricing(service_id: string, country_code: string) {
    // Skip if country_code is invalid
    if (!this.isValidCountryCode(country_code)) {
      return null;
    }

    const { data, error } = await supabase
      .from('regional_pricing')
      .select('*')
      .eq('service_id', service_id)
      .contains('country_codes', [country_code])
      .eq('is_active', true)
      .order('priority', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      logger.error('Error fetching regional pricing:', error);
    }

    return data;
  }

  /**
   * Get continental pricing using country_settings table
   */
  /**
   * Validate country code format
   */
  private isValidCountryCode(country_code: string): boolean {
    return !!(country_code && 
              country_code.length === 2 && 
              country_code !== 'GLOBAL' &&
              /^[A-Z]{2}$/.test(country_code));
  }

  private async getContinentalPricing(service_id: string, country_code: string) {
    // Skip if country_code is invalid
    if (!this.isValidCountryCode(country_code)) {
      return null;
    }

    // First get the continent for this country
    const { data: countryInfo, error: countryError } = await supabase
      .from('country_settings')
      .select('continent')
      .eq('code', country_code)
      .single();

    if (countryError) {
      logger.warn(`Country ${country_code} not found in country_settings`);
      return null;
    }

    if (!countryInfo?.continent) {
      return null;
    }

    // Then get continental pricing for this continent
    const { data, error } = await supabase
      .from('continental_pricing')
      .select('*')
      .eq('service_id', service_id)
      .eq('continent', countryInfo.continent)
      .eq('is_active', true)
      .single();

    if (error && error.code !== 'PGRST116') {
      logger.error('Error fetching continental pricing:', error);
    }

    return data ? { ...data, continent: countryInfo.continent } : null;
  }

  /**
   * Calculate final amount with min/max constraints and currency conversion
   */
  private calculateFinalAmount(
    service: AddonService,
    pricingRule: any,
    order_value?: number,
    currency_code: string = 'USD'
  ) {
    let amount = 0;
    const min_amount = pricingRule.min_amount || service.min_amount || 0;
    const max_amount = pricingRule.max_amount || service.max_amount;

    if (service.pricing_type === 'percentage') {
      if (!order_value) {
        // If no order value provided but service requires it, use minimum
        amount = min_amount;
      } else {
        amount = order_value * pricingRule.rate;
      }
    } else {
      // Fixed pricing
      amount = pricingRule.rate;
    }

    // Apply min/max constraints
    if (amount < min_amount) {
      amount = min_amount;
    }
    
    if (max_amount && amount > max_amount) {
      amount = max_amount;
    }

    // Currency conversion if needed
    if (currency_code !== 'USD') {
      try {
        // Convert from USD to target currency
        const rate = currencyService.getRate('USD', currency_code);
        amount = amount * rate;
      } catch (error) {
        logger.warn(`Currency conversion failed for ${currency_code}, using USD amount`);
      }
    }

    return {
      amount: Math.round(amount * 100) / 100, // Round to 2 decimal places
      min_amount,
      max_amount
    };
  }

  /**
   * Get service configuration by key or ID
   */
  private async getServiceConfig(service_key?: string | null, service_id?: string): Promise<AddonService | null> {
    let query = supabase
      .from('addon_services')
      .select('*')
      .eq('is_active', true);

    if (service_key) {
      query = query.eq('service_key', service_key);
    } else if (service_id) {
      query = query.eq('id', service_id);
    } else {
      return null;
    }

    const { data, error } = await query.single();
    
    if (error) {
      if (error.code === 'PGRST116') { // No rows found
        return null;
      }
      throw error;
    }

    return data;
  }

  /**
   * Cache pricing calculation in database for longer-term storage
   */
  private async cacheInDatabase(
    service_id: string,
    country_code: string,
    order_value: number,
    pricingRule: any,
    calculated_amount: number
  ) {
    try {
      await supabase
        .from('pricing_calculation_cache')
        .upsert({
          service_id,
          country_code,
          order_value,
          applicable_rate: pricingRule.rate,
          calculated_amount,
          min_amount: pricingRule.min_amount || 0,
          max_amount: pricingRule.max_amount,
          pricing_tier: pricingRule.tier,
          calculation_metadata: {
            source_description: pricingRule.description,
            cached_at: new Date().toISOString()
          },
          expires_at: new Date(Date.now() + this.CACHE_DURATION).toISOString()
        }, {
          onConflict: 'service_id,country_code,order_value'
        });
    } catch (error) {
      // Non-critical error, just log it
      logger.warn('Failed to cache pricing in database:', error);
    }
  }

  /**
   * Get country pricing information and capabilities
   */
  async getCountryPricingInfo(country_code: string): Promise<CountryPricingInfo> {
    const startTime = Date.now();
    const operationId = `country_info_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Start performance monitoring
    performanceMonitoringService.startOperation(operationId, 'get_country_pricing_info', {
      countryCode: country_code
    });

    try {
      // Get all services with any pricing rules for this country
      const { data: services } = await supabase
        .from('addon_services')
        .select(`
          service_key,
          country_pricing_overrides!inner(country_code),
          regional_pricing(region_key, country_codes),
          continental_pricing!inner(
            continent,
            country_settings!inner(code)
          )
        `)
        .eq('is_active', true);

      // Get continent for this country
      const { data: countryData } = await supabase
        .from('country_settings')
        .select('continent')
        .eq('code', country_code)
        .single();

      // Process the data
      const supported_services = services?.map(s => s.service_key) || [];
      const has_country_overrides = services?.some(s => 
        s.country_pricing_overrides?.some(cpo => cpo.country_code === country_code)
      ) || false;
      
      const regional_groups = services?.flatMap(s => 
        s.regional_pricing?.filter(rp => 
          rp.country_codes?.includes(country_code)
        ).map(rp => rp.region_key) || []
      ) || [];

      const result = {
        country_code,
        continent: countryData?.continent,
        supported_services: [...new Set(supported_services)],
        regional_groups: [...new Set(regional_groups)],
        has_country_overrides
      };

      // End performance monitoring - success
      performanceMonitoringService.endOperation(
        operationId,
        'get_country_pricing_info',
        startTime,
        true,
        false,
        country_code,
        undefined,
        undefined,
        undefined,
        {
          continent: countryData?.continent,
          supportedServicesCount: result.supported_services.length,
          hasOverrides: has_country_overrides
        }
      );

      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // End performance monitoring - error
      performanceMonitoringService.endOperation(
        operationId,
        'get_country_pricing_info',
        startTime,
        false,
        false,
        country_code,
        undefined,
        undefined,
        errorMessage,
        { countryCode: country_code }
      );

      logger.error('Error getting country pricing info:', error);
      return {
        country_code,
        supported_services: [],
        regional_groups: [],
        has_country_overrides: false
      };
    }
  }

  /**
   * Clear all caches
   */
  clearCache(): void {
    this.cache.clear();
    logger.info('[RegionalPricing] All caches cleared');
  }

  /**
   * Get item from memory cache
   */
  private getFromCache(key: string): any {
    const cached = this.cache.get(key);
    if (cached && cached.expires > Date.now()) {
      return cached.data;
    }
    if (cached) {
      this.cache.delete(key); // Remove expired entry
    }
    return null;
  }

  /**
   * Set item in memory cache
   */
  private setCache(key: string, data: any): void {
    this.cache.set(key, {
      data,
      expires: Date.now() + this.CACHE_DURATION
    });
  }
}

// Export singleton instance
export const regionalPricingService = RegionalPricingServiceClass.getInstance();