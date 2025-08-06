/**
 * Shipping Options Service
 * Handles shipping method selection, pricing, and integration with various shipping providers
 * Decomposed from QuoteCalculatorV2 for better separation of concerns
 */

import { logger } from '@/utils/logger';
import { delhiveryService, type DelhiveryServiceOption } from '@/services/DelhiveryService';
import NCMService from '@/services/NCMService';
import { ncmBranchMappingService } from '@/services/NCMBranchMappingService';
import { smartNCMBranchMapper, type SmartBranchMapping } from '@/services/SmartNCMBranchMapper';
import { DynamicShippingService } from '@/services/DynamicShippingService';
import { addBusinessDays } from 'date-fns';

export interface ShippingMethod {
  id: string;
  name: string;
  provider: string;
  cost: number;
  costCurrency: string;
  estimatedDays: number;
  deliveryDate?: Date;
  features: string[];
  restrictions?: string[];
  available: boolean;
  recommended?: boolean;
}

export interface ShippingQuote {
  methods: ShippingMethod[];
  recommendedMethod?: ShippingMethod;
  errors?: string[];
  warnings?: string[];
  metadata: {
    totalWeight: number;
    dimensions?: {
      length: number;
      width: number;
      height: number;
    };
    origin: string;
    destination: string;
    requestedAt: Date;
  };
}

export interface DelhiveryConfig {
  serviceType: 'standard' | 'express' | 'same_day';
  pincode: string;
  paymentMode?: 'prepaid' | 'cod';
  productType?: 'documents' | 'non_documents';
}

export interface NCMConfig {
  serviceType: 'pickup' | 'collect';
  district: string;
  branch?: any;
  destinationAddress?: {
    city: string;
    district: string;
    ward?: string;
    municipality?: string;
  };
}

export interface ShippingValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
}

export interface ShippingEstimate {
  cost: number;
  currency: string;
  minDays: number;
  maxDays: number;
  provider: string;
  method: string;
  confidence: number;
}

export class ShippingOptionsService {
  private cache = new Map<string, any>();
  private readonly CACHE_DURATION = 15 * 60 * 1000; // 15 minutes

  // Shipping provider configurations
  private readonly PROVIDER_CONFIGS = {
    delhivery: {
      name: 'Delhivery',
      countries: ['IN'],
      services: ['standard', 'express', 'same_day'],
      features: ['tracking', 'insurance', 'cod']
    },
    ncm: {
      name: 'NCM Express',
      countries: ['NP'],
      services: ['pickup', 'collect'],
      features: ['tracking', 'branch_network']
    },
    dynamic: {
      name: 'Dynamic Shipping',
      countries: ['*'], // All countries
      services: ['standard', 'express', 'economy'],
      features: ['tracking', 'insurance']
    }
  };

  // Standard shipping rates for common routes (fallback)
  private readonly STANDARD_RATES: Record<string, Record<string, ShippingEstimate>> = {
    'US-IN': {
      standard: { cost: 25, currency: 'USD', minDays: 15, maxDays: 22, provider: 'usps', method: 'standard', confidence: 0.8 },
      express: { cost: 45, currency: 'USD', minDays: 10, maxDays: 15, provider: 'fedex', method: 'express', confidence: 0.8 },
      economy: { cost: 15, currency: 'USD', minDays: 20, maxDays: 30, provider: 'usps', method: 'economy', confidence: 0.7 }
    },
    'US-NP': {
      standard: { cost: 35, currency: 'USD', minDays: 12, maxDays: 18, provider: 'dhl', method: 'standard', confidence: 0.8 },
      express: { cost: 55, currency: 'USD', minDays: 8, maxDays: 12, provider: 'fedex', method: 'express', confidence: 0.8 }
    },
    'US-BD': {
      standard: { cost: 30, currency: 'USD', minDays: 15, maxDays: 20, provider: 'dhl', method: 'standard', confidence: 0.7 },
      express: { cost: 50, currency: 'USD', minDays: 10, maxDays: 15, provider: 'fedex', method: 'express', confidence: 0.7 }
    },
    'CN-IN': {
      standard: { cost: 20, currency: 'USD', minDays: 10, maxDays: 18, provider: 'china_post', method: 'standard', confidence: 0.7 },
      express: { cost: 40, currency: 'USD', minDays: 7, maxDays: 12, provider: 'dhl', method: 'express', confidence: 0.8 }
    },
    'CN-NP': {
      standard: { cost: 25, currency: 'USD', minDays: 12, maxDays: 20, provider: 'china_post', method: 'standard', confidence: 0.6 },
      express: { cost: 45, currency: 'USD', minDays: 8, maxDays: 15, provider: 'dhl', method: 'express', confidence: 0.7 }
    }
  };

  constructor() {
    logger.info('ShippingOptionsService initialized');
  }

  /**
   * Get shipping quotes for a route
   */
  async getShippingQuotes(
    originCountry: string,
    destinationCountry: string,
    weight: number,
    value: number,
    config?: {
      delhivery?: DelhiveryConfig;
      ncm?: NCMConfig;
      currency?: string;
      dimensions?: { length: number; width: number; height: number };
    }
  ): Promise<ShippingQuote> {
    const cacheKey = `shipping_quote_${originCountry}_${destinationCountry}_${weight}_${value}`;
    const cached = this.getFromCache<ShippingQuote>(cacheKey);
    if (cached) return cached;

    try {
      const methods: ShippingMethod[] = [];
      const errors: string[] = [];
      const warnings: string[] = [];

      // Get provider-specific quotes
      if (destinationCountry === 'IN' && config?.delhivery) {
        const delhiveryMethods = await this.getDelhiveryMethods(config.delhivery, weight, value);
        methods.push(...delhiveryMethods);
      }

      if (destinationCountry === 'NP' && config?.ncm) {
        const ncmMethods = await this.getNCMMethods(config.ncm, weight, value);
        methods.push(...ncmMethods);
      }

      // Get dynamic shipping methods
      try {
        const dynamicMethods = await this.getDynamicShippingMethods(
          originCountry,
          destinationCountry,
          weight,
          value,
          config?.dimensions
        );
        methods.push(...dynamicMethods);
      } catch (error) {
        logger.warn('Dynamic shipping methods failed:', error);
        warnings.push('Some shipping options may not be available');
      }

      // Fallback to standard rates if no methods found
      if (methods.length === 0) {
        const fallbackMethods = this.getStandardRateMethods(originCountry, destinationCountry, weight, value);
        methods.push(...fallbackMethods);
        
        if (fallbackMethods.length === 0) {
          warnings.push('No shipping methods available for this route');
        }
      }

      // Sort methods by cost and mark recommended
      methods.sort((a, b) => a.cost - b.cost);
      
      // Mark middle option as recommended (balance of cost and speed)
      if (methods.length >= 3) {
        methods[1].recommended = true;
      } else if (methods.length === 2) {
        methods[0].recommended = true;
      }

      const quote: ShippingQuote = {
        methods,
        recommendedMethod: methods.find(m => m.recommended),
        errors: errors.length > 0 ? errors : undefined,
        warnings: warnings.length > 0 ? warnings : undefined,
        metadata: {
          totalWeight: weight,
          dimensions: config?.dimensions,
          origin: originCountry,
          destination: destinationCountry,
          requestedAt: new Date()
        }
      };

      this.setCache(cacheKey, quote);
      return quote;

    } catch (error) {
      logger.error('Failed to get shipping quotes:', error);
      
      // Return fallback quote with error
      return {
        methods: this.getStandardRateMethods(originCountry, destinationCountry, weight, value),
        errors: [`Failed to fetch shipping quotes: ${error instanceof Error ? error.message : 'Unknown error'}`],
        metadata: {
          totalWeight: weight,
          origin: originCountry,
          destination: destinationCountry,
          requestedAt: new Date()
        }
      };
    }
  }

  /**
   * Get Delhivery shipping methods
   */
  private async getDelhiveryMethods(config: DelhiveryConfig, weight: number, value: number): Promise<ShippingMethod[]> {
    try {
      const services = await delhiveryService.getAvailableServices(
        config.pincode,
        weight,
        config.paymentMode || 'prepaid',
        config.productType || 'non_documents'
      );

      return services.map((service: DelhiveryServiceOption) => ({
        id: `delhivery_${service.service_type}`,
        name: `Delhivery ${service.service_type}`,
        provider: 'delhivery',
        cost: service.rate,
        costCurrency: 'INR',
        estimatedDays: service.estimated_delivery_days,
        deliveryDate: addBusinessDays(new Date(), service.estimated_delivery_days),
        features: ['tracking', 'insurance', ...(service.cod_available ? ['cod'] : [])],
        available: service.available,
        recommended: service.service_type === config.serviceType
      }));

    } catch (error) {
      logger.error('Delhivery methods fetch failed:', error);
      return [];
    }
  }

  /**
   * Get NCM shipping methods
   */
  private async getNCMMethods(config: NCMConfig, weight: number, value: number): Promise<ShippingMethod[]> {
    try {
      const methods: ShippingMethod[] = [];
      
      // Get rates if branch is selected
      if (config.branch) {
        try {
          const rates = await NCMService.getRates(
            config.branch.branch_code,
            weight,
            value,
            config.serviceType === 'pickup'
          );

          if (rates) {
            methods.push({
              id: `ncm_${config.serviceType}`,
              name: `NCM ${config.serviceType === 'pickup' ? 'Door Pickup' : 'Branch Collection'}`,
              provider: 'ncm',
              cost: rates.total_charge || rates.service_charge,
              costCurrency: 'NPR',
              estimatedDays: config.serviceType === 'pickup' ? 3 : 2,
              deliveryDate: addBusinessDays(new Date(), config.serviceType === 'pickup' ? 3 : 2),
              features: ['tracking', 'branch_network'],
              restrictions: config.serviceType === 'collect' ? ['Requires branch collection'] : undefined,
              available: true,
              recommended: true
            });
          }
        } catch (error) {
          logger.warn('NCM rates fetch failed:', error);
        }
      }

      // Add generic NCM option if no specific rates
      if (methods.length === 0) {
        methods.push({
          id: `ncm_${config.serviceType}_generic`,
          name: `NCM ${config.serviceType === 'pickup' ? 'Door Pickup' : 'Branch Collection'}`,
          provider: 'ncm',
          cost: config.serviceType === 'pickup' ? 150 : 100, // Estimated rates in NPR
          costCurrency: 'NPR',
          estimatedDays: config.serviceType === 'pickup' ? 3 : 2,
          deliveryDate: addBusinessDays(new Date(), config.serviceType === 'pickup' ? 3 : 2),
          features: ['tracking', 'branch_network'],
          restrictions: config.serviceType === 'collect' ? ['Requires branch collection'] : undefined,
          available: true,
          recommended: true
        });
      }

      return methods;

    } catch (error) {
      logger.error('NCM methods fetch failed:', error);
      return [];
    }
  }

  /**
   * Get dynamic shipping methods
   */
  private async getDynamicShippingMethods(
    originCountry: string,
    destinationCountry: string,
    weight: number,
    value: number,
    dimensions?: { length: number; width: number; height: number }
  ): Promise<ShippingMethod[]> {
    try {
      const dynamicService = new DynamicShippingService();
      const methods = await dynamicService.getShippingOptions(
        originCountry,
        destinationCountry,
        weight,
        value,
        dimensions
      );

      return methods.map(method => ({
        id: `dynamic_${method.id}`,
        name: method.name,
        provider: 'dynamic',
        cost: method.cost,
        costCurrency: method.currency,
        estimatedDays: method.estimatedDays,
        deliveryDate: method.estimatedDeliveryDate,
        features: method.features || ['tracking'],
        restrictions: method.restrictions,
        available: true,
        recommended: method.recommended
      }));

    } catch (error) {
      logger.warn('Dynamic shipping methods unavailable:', error);
      return [];
    }
  }

  /**
   * Get standard rate methods (fallback)
   */
  private getStandardRateMethods(
    originCountry: string,
    destinationCountry: string,
    weight: number,
    value: number
  ): ShippingMethod[] {
    const routeKey = `${originCountry}-${destinationCountry}`;
    const rates = this.STANDARD_RATES[routeKey] || {};

    return Object.entries(rates).map(([methodKey, estimate]) => ({
      id: `standard_${methodKey}`,
      name: `${estimate.provider.toUpperCase()} ${methodKey}`,
      provider: estimate.provider,
      cost: this.calculateWeightAdjustedCost(estimate.cost, weight),
      costCurrency: estimate.currency,
      estimatedDays: Math.round((estimate.minDays + estimate.maxDays) / 2),
      deliveryDate: addBusinessDays(new Date(), Math.round((estimate.minDays + estimate.maxDays) / 2)),
      features: ['tracking'],
      available: true,
      recommended: methodKey === 'standard'
    }));
  }

  /**
   * Get available NCM branches
   */
  async getNCMBranches(district?: string): Promise<any[]> {
    const cacheKey = `ncm_branches_${district || 'all'}`;
    const cached = this.getFromCache<any[]>(cacheKey);
    if (cached) return cached;

    try {
      const branches = await NCMService.getBranches(district);
      this.setCache(cacheKey, branches, 60 * 60 * 1000); // Cache for 1 hour
      return branches;
    } catch (error) {
      logger.error('Failed to get NCM branches:', error);
      return [];
    }
  }

  /**
   * Get smart NCM branch suggestions
   */
  async getSmartNCMBranchSuggestions(destinationAddress: {
    city: string;
    district: string;
    state?: string;
  }): Promise<SmartBranchMapping[]> {
    try {
      const suggestions = await smartNCMBranchMapper.findBestBranches(
        destinationAddress.city,
        destinationAddress.district,
        5 // Limit to top 5 suggestions
      );

      return suggestions;
    } catch (error) {
      logger.error('Failed to get smart NCM branch suggestions:', error);
      return [];
    }
  }

  /**
   * Validate shipping configuration
   */
  validateShippingConfig(
    originCountry: string,
    destinationCountry: string,
    config: {
      delhivery?: DelhiveryConfig;
      ncm?: NCMConfig;
    }
  ): ShippingValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    // Delhivery validation
    if (destinationCountry === 'IN' && config.delhivery) {
      if (!config.delhivery.pincode) {
        errors.push('Pincode is required for Delhivery shipping to India');
      } else if (!/^\d{6}$/.test(config.delhivery.pincode)) {
        errors.push('Invalid pincode format for India (must be 6 digits)');
      }
    }

    // NCM validation
    if (destinationCountry === 'NP' && config.ncm) {
      if (!config.ncm.district) {
        warnings.push('District selection recommended for better NCM branch suggestions');
      }
      
      if (config.ncm.serviceType === 'collect' && !config.ncm.branch) {
        suggestions.push('Select an NCM branch for collection service');
      }
    }

    // General validations
    if (originCountry === destinationCountry) {
      warnings.push('Domestic shipping - consider local courier services for better rates');
    }

    // Provider availability checks
    const availableProviders = this.getAvailableProvidersForRoute(originCountry, destinationCountry);
    if (availableProviders.length === 0) {
      warnings.push('Limited shipping options available for this route');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions
    };
  }

  /**
   * Get available providers for route
   */
  private getAvailableProvidersForRoute(originCountry: string, destinationCountry: string): string[] {
    const providers: string[] = [];

    // Check each provider's country support
    for (const [providerId, config] of Object.entries(this.PROVIDER_CONFIGS)) {
      if (config.countries.includes('*') || config.countries.includes(destinationCountry)) {
        providers.push(providerId);
      }
    }

    return providers;
  }

  /**
   * Calculate weight-adjusted shipping cost
   */
  private calculateWeightAdjustedCost(baseCost: number, weight: number): number {
    // Base cost is for 1kg, add $2 for each additional kg
    const additionalWeight = Math.max(0, weight - 1);
    return baseCost + (additionalWeight * 2);
  }

  /**
   * Estimate shipping cost for route
   */
  estimateShippingCost(
    originCountry: string,
    destinationCountry: string,
    weight: number,
    method = 'standard'
  ): ShippingEstimate | null {
    const routeKey = `${originCountry}-${destinationCountry}`;
    const rates = this.STANDARD_RATES[routeKey];
    
    if (!rates || !rates[method]) {
      return null;
    }

    const baseEstimate = rates[method];
    return {
      ...baseEstimate,
      cost: this.calculateWeightAdjustedCost(baseEstimate.cost, weight)
    };
  }

  /**
   * Get shipping method by ID
   */
  async getShippingMethodById(
    methodId: string,
    originCountry: string,
    destinationCountry: string,
    weight: number,
    value: number
  ): Promise<ShippingMethod | null> {
    const quote = await this.getShippingQuotes(originCountry, destinationCountry, weight, value);
    return quote.methods.find(method => method.id === methodId) || null;
  }

  /**
   * Compare shipping methods
   */
  compareShippingMethods(methods: ShippingMethod[]): {
    cheapest: ShippingMethod | null;
    fastest: ShippingMethod | null;
    recommended: ShippingMethod | null;
    comparison: Array<{
      method: ShippingMethod;
      costRank: number;
      speedRank: number;
      valueScore: number;
    }>;
  } {
    if (methods.length === 0) {
      return { cheapest: null, fastest: null, recommended: null, comparison: [] };
    }

    // Sort by cost and speed
    const byCost = [...methods].sort((a, b) => a.cost - b.cost);
    const bySpeed = [...methods].sort((a, b) => a.estimatedDays - b.estimatedDays);

    // Calculate value scores (balance of cost and speed)
    const comparison = methods.map(method => {
      const costRank = byCost.findIndex(m => m.id === method.id) + 1;
      const speedRank = bySpeed.findIndex(m => m.id === method.id) + 1;
      const valueScore = (methods.length - costRank + 1) + (methods.length - speedRank + 1);

      return { method, costRank, speedRank, valueScore };
    });

    // Sort by value score
    comparison.sort((a, b) => b.valueScore - a.valueScore);

    return {
      cheapest: byCost[0],
      fastest: bySpeed[0],
      recommended: methods.find(m => m.recommended) || comparison[0]?.method || null,
      comparison
    };
  }

  /**
   * Cache management
   */
  private getFromCache<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data as T;
    }
    this.cache.delete(key);
    return null;
  }

  private setCache<T>(key: string, data: T, duration?: number): void {
    this.cache.set(key, { 
      data, 
      timestamp: Date.now(),
      duration: duration || this.CACHE_DURATION
    });
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    this.cache.clear();
    logger.info('ShippingOptionsService disposed');
  }
}

export default ShippingOptionsService;