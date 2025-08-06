/**
 * Shipping Cost Service  
 * Handles shipping rate calculation, carrier integration, and delivery options
 * Decomposed from SimplifiedQuoteCalculator for better separation of concerns
 */

import { logger } from '@/utils/logger';
import { delhiveryService, DelhiveryService } from '@/services/DelhiveryService';
import type { DelhiveryRateRequest, DelhiveryMultiRateResponse } from '@/services/DelhiveryService';
import NCMService from '@/services/NCMService';
import type { NCMRateRequest, NCMMultiRateResponse } from '@/services/NCMService';
import { ncmBranchMappingService } from '@/services/NCMBranchMappingService';
import { DynamicShippingService, type RouteCalculations } from '@/services/DynamicShippingService';
import { currencyService } from '@/services/CurrencyService';
import type { CurrencyCalculationService } from './CurrencyCalculationService';

export interface ShippingRequest {
  originCountry: string;
  originState?: string;
  destinationCountry: string;
  destinationState?: string;
  destinationPincode?: string;
  destinationAddress?: {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    pincode?: string;
    district?: string;
  };
  totalWeight: number;
  totalValue: number;
  shippingMethod: 'standard' | 'express' | 'economy';
  serviceType?: 'standard' | 'express' | 'same_day' | 'pickup' | 'collect';
  originCurrency: string;
}

export interface ShippingRate {
  carrier: string;
  service: string;
  cost: number;
  currency: string;
  costUSD: number;
  estimatedDays: number;
  features: string[];
  restrictions: string[];
  confidence: number;
  available: boolean;
}

export interface ShippingCalculationResult {
  selectedRate: ShippingRate | null;
  allRates: ShippingRate[];
  domesticDelivery: {
    cost: number;
    costUSD: number;
    currency: string;
    provider: string;
    estimatedDays: number;
  } | null;
  routeCalculations?: RouteCalculations;
  delhiveryRates?: DelhiveryMultiRateResponse;
  ncmRates?: NCMMultiRateResponse;
  error?: string;
}

export interface ShippingDiscountRequest {
  shippingCost: number;
  shippingMethod: string;
  discountType: 'percentage' | 'fixed' | 'free';
  discountValue?: number;
  conditions?: {
    minOrderValue?: number;
    applicableCountries?: string[];
    applicableMethods?: string[];
  };
}

export interface ShippingDiscountResult {
  originalCost: number;
  discountAmount: number;
  finalCost: number;
  discountApplied: boolean;
  discountType: string;
}

// Base shipping rates per country (fallback)
const BASE_SHIPPING_RATES: { [country: string]: { [method: string]: number } } = {
  'IN': {
    'economy': 15,
    'standard': 25,
    'express': 35
  },
  'NP': {
    'economy': 20,
    'standard': 30,  
    'express': 45
  },
  'BD': {
    'economy': 18,
    'standard': 28,
    'express': 40
  },
  'DEFAULT': {
    'economy': 20,
    'standard': 30,
    'express': 50
  }
};

export class ShippingCostService {
  private dynamicShippingService: DynamicShippingService;
  private rateCache = new Map<string, { result: ShippingCalculationResult; timestamp: Date }>();
  private readonly cacheTTL = 10 * 60 * 1000; // 10 minutes
  
  constructor(private currencyService?: CurrencyCalculationService) {
    this.dynamicShippingService = new DynamicShippingService();
    logger.info('ShippingCostService initialized');
  }

  /**
   * Calculate shipping costs with carrier integration
   */
  async calculateShippingCosts(request: ShippingRequest): Promise<ShippingCalculationResult> {
    try {
      const cacheKey = this.createCacheKey(request);
      
      // Check cache
      if (this.rateCache.has(cacheKey)) {
        const cached = this.rateCache.get(cacheKey)!;
        if (new Date().getTime() - cached.timestamp.getTime() < this.cacheTTL) {
          logger.debug('Returning cached shipping rates');
          return cached.result;
        }
        this.rateCache.delete(cacheKey);
      }

      const result: ShippingCalculationResult = {
        selectedRate: null,
        allRates: [],
        domesticDelivery: null
      };

      // Try dynamic shipping service first (most comprehensive)
      try {
        const routeCalculations = await this.dynamicShippingService.calculateRoute({
          origin: { country: request.originCountry, state: request.originState },
          destination: { 
            country: request.destinationCountry, 
            state: request.destinationState,
            pincode: request.destinationPincode
          },
          items: [{
            weight: request.totalWeight,
            value: request.totalValue,
            category: 'general'
          }],
          preferences: {
            service_level: request.shippingMethod,
            delivery_speed: request.serviceType
          }
        });

        if (routeCalculations && routeCalculations.available_options?.length > 0) {
          result.routeCalculations = routeCalculations;
          result.allRates = routeCalculations.available_options.map(option => ({
            carrier: option.carrier || 'Unknown',
            service: option.service_type || request.shippingMethod,
            cost: option.cost || 0,
            currency: option.costCurrency || 'USD',
            costUSD: option.cost_usd || option.cost || 0,
            estimatedDays: option.estimatedDays || this.getEstimatedDays(request.shippingMethod),
            features: option.features || [],
            restrictions: option.restrictions || [],
            confidence: option.confidence || 0.8,
            available: option.available !== false
          }));

          result.selectedRate = result.allRates.find(rate => 
            routeCalculations.delivery_option_used?.id === rate.carrier + '_' + rate.service
          ) || result.allRates[0];
        }
      } catch (dynamicError) {
        logger.warn('Dynamic shipping service failed:', dynamicError);
      }

      // Fallback to carrier-specific APIs
      if (!result.selectedRate) {
        await this.tryCarrierSpecificAPIs(request, result);
      }

      // Ultimate fallback to base rates
      if (!result.selectedRate) {
        result.selectedRate = await this.getBaseShippingRate(request);
        result.allRates = [result.selectedRate];
      }

      // Calculate domestic delivery for destination country
      if (this.needsDomesticDelivery(request.destinationCountry)) {
        result.domesticDelivery = await this.calculateDomesticDelivery(request);
      }

      // Cache the result
      this.rateCache.set(cacheKey, {
        result,
        timestamp: new Date()
      });

      logger.info(`Shipping calculation completed for ${request.originCountry} → ${request.destinationCountry}`);
      return result;

    } catch (error) {
      logger.error('Shipping calculation failed:', error);
      
      // Return safe fallback
      const fallbackRate = await this.getBaseShippingRate(request);
      return {
        selectedRate: fallbackRate,
        allRates: [fallbackRate],
        domesticDelivery: null,
        error: error instanceof Error ? error.message : 'Unknown shipping error'
      };
    }
  }

  /**
   * Try carrier-specific APIs (Delhivery, NCM)
   */
  private async tryCarrierSpecificAPIs(
    request: ShippingRequest,
    result: ShippingCalculationResult
  ): Promise<void> {
    // Try Delhivery for India
    if (request.destinationCountry === 'IN' && request.destinationPincode) {
      try {
        const delhiveryRequest: DelhiveryRateRequest = {
          origin_pincode: '110001', // Default Delhi pincode
          destination_pincode: request.destinationPincode,
          weight: Math.max(0.5, request.totalWeight), // Minimum 0.5kg
          payment_mode: 'pre-paid',
          delivery_type: request.serviceType === 'express' ? 'express' : 'standard'
        };

        const delhiveryRates = await delhiveryService.getDeliveryRates(delhiveryRequest);
        
        if (delhiveryRates && delhiveryRates.rates?.length > 0) {
          result.delhiveryRates = delhiveryRates;
          
          // Convert Delhivery rates to standard format
          const delhiveryShippingRates = await Promise.all(
            delhiveryRates.rates.map(async (rate) => {
              const costUSD = await delhiveryService.convertToUSD(rate.total_amount);
              return {
                carrier: 'Delhivery',
                service: rate.service_type || 'standard',
                cost: rate.total_amount,
                currency: 'INR',
                costUSD,
                estimatedDays: rate.estimated_delivery_days || this.getEstimatedDays(request.shippingMethod),
                features: ['tracking', 'insurance'],
                restrictions: [],
                confidence: 0.9,
                available: true
              };
            })
          );

          result.allRates.push(...delhiveryShippingRates);
          
          if (!result.selectedRate) {
            result.selectedRate = delhiveryShippingRates[0];
          }
        }
      } catch (delhiveryError) {
        logger.warn('Delhivery API failed:', delhiveryError);
      }
    }

    // Try NCM for Nepal  
    if (request.destinationCountry === 'NP' && request.destinationAddress?.district) {
      try {
        const branch = await ncmBranchMappingService.findNearestBranch(request.destinationAddress.district);
        
        if (branch) {
          const ncmRequest: NCMRateRequest = {
            origin: 'KTM', // Default Kathmandu
            destination: branch.branch_code,
            weight: Math.max(1, request.totalWeight), // Minimum 1kg for NCM
            service_type: request.serviceType === 'express' ? 'express' : 'standard'
          };

          const ncmRates = await ncmService.getDeliveryRates(ncmRequest);
          
          if (ncmRates && ncmRates.rates?.length > 0) {
            result.ncmRates = ncmRates;
            
            // Convert NCM rates to standard format
            const ncmShippingRates = await Promise.all(
              ncmRates.rates.map(async (rate) => {
                const costUSD = await ncmService.convertToUSD(rate.rate);
                return {
                  carrier: 'NCM',
                  service: rate.service || 'standard',
                  cost: rate.rate,
                  currency: 'NPR',
                  costUSD,
                  estimatedDays: rate.delivery_days || this.getEstimatedDays(request.shippingMethod),
                  features: ['tracking'],
                  restrictions: [`Branch: ${branch.branch_name}`],
                  confidence: 0.85,
                  available: true
                };
              })
            );

            result.allRates.push(...ncmShippingRates);
            
            if (!result.selectedRate) {
              result.selectedRate = ncmShippingRates[0];
            }
          }
        }
      } catch (ncmError) {
        logger.warn('NCM API failed:', ncmError);
      }
    }
  }

  /**
   * Calculate domestic delivery costs
   */
  private async calculateDomesticDelivery(request: ShippingRequest): Promise<{
    cost: number;
    costUSD: number;
    currency: string;
    provider: string;
    estimatedDays: number;
  } | null> {
    try {
      const { destinationCountry } = request;
      
      if (destinationCountry === 'IN' && request.destinationPincode) {
        // Use Delhivery for domestic India delivery
        const deliveryRateINR = await delhiveryService.getDomesticRate(
          request.destinationPincode,
          Math.max(0.5, request.totalWeight)
        );
        
        const deliveryRateUSD = await delhiveryService.convertToUSD(deliveryRateINR);
        
        return {
          cost: deliveryRateINR,
          costUSD: deliveryRateUSD,
          currency: 'INR',
          provider: 'Delhivery',
          estimatedDays: 2
        };
        
      } else if (destinationCountry === 'NP' && request.destinationAddress?.district) {
        // Use NCM for domestic Nepal delivery
        const branch = await ncmBranchMappingService.findNearestBranch(request.destinationAddress.district);
        
        if (branch) {
          const deliveryRateNPR = await ncmService.getDomesticRate(
            branch.branch_code,
            Math.max(1, request.totalWeight)
          );
          
          const deliveryRateUSD = await ncmService.convertToUSD(deliveryRateNPR);
          
          return {
            cost: deliveryRateNPR,
            costUSD: deliveryRateUSD,
            currency: 'NPR', 
            provider: 'NCM',
            estimatedDays: 3
          };
        }
      }

      return null;

    } catch (error) {
      logger.warn('Domestic delivery calculation failed:', error);
      return null;
    }
  }

  /**
   * Get base shipping rate (fallback)
   */
  private async getBaseShippingRate(request: ShippingRequest): Promise<ShippingRate> {
    const countryRates = BASE_SHIPPING_RATES[request.destinationCountry] || BASE_SHIPPING_RATES['DEFAULT'];
    const baseCost = countryRates[request.shippingMethod] || countryRates['standard'];
    
    // Adjust for weight (simple formula)
    const weightAdjustment = Math.max(0, request.totalWeight - 1) * 2; // $2 per kg over 1kg
    const totalCost = baseCost + weightAdjustment;

    let costUSD = totalCost;
    
    // Convert to USD if needed
    if (request.originCurrency !== 'USD') {
      try {
        const rate = await currencyService.getExchangeRate(request.originCurrency, 'USD');
        costUSD = totalCost * rate;
      } catch (error) {
        logger.warn('Currency conversion failed for base rate:', error);
      }
    }

    return {
      carrier: 'Standard',
      service: request.shippingMethod,
      cost: totalCost,
      currency: request.originCurrency,
      costUSD,
      estimatedDays: this.getEstimatedDays(request.shippingMethod),
      features: ['tracking'],
      restrictions: [],
      confidence: 0.7,
      available: true
    };
  }

  /**
   * Apply shipping discount
   */
  calculateShippingDiscount(request: ShippingDiscountRequest): ShippingDiscountResult {
    try {
      let discountAmount = 0;
      let discountApplied = false;

      // Apply discount based on type
      if (request.discountType === 'free') {
        discountAmount = request.shippingCost;
        discountApplied = true;
      } else if (request.discountType === 'percentage' && request.discountValue) {
        discountAmount = request.shippingCost * (request.discountValue / 100);
        discountApplied = true;
      } else if (request.discountType === 'fixed' && request.discountValue) {
        discountAmount = Math.min(request.discountValue, request.shippingCost);
        discountApplied = true;
      }

      const finalCost = Math.max(0, request.shippingCost - discountAmount);

      return {
        originalCost: request.shippingCost,
        discountAmount,
        finalCost,
        discountApplied,
        discountType: request.discountType
      };

    } catch (error) {
      logger.error('Shipping discount calculation failed:', error);
      
      return {
        originalCost: request.shippingCost,
        discountAmount: 0,
        finalCost: request.shippingCost,
        discountApplied: false,
        discountType: request.discountType
      };
    }
  }

  /**
   * Get estimated delivery days for shipping method
   */
  private getEstimatedDays(method: string): number {
    const estimates: { [method: string]: number } = {
      'economy': 25,
      'standard': 15,
      'express': 10,
      'same_day': 1
    };

    return estimates[method] || estimates['standard'];
  }

  /**
   * Check if destination needs domestic delivery calculation
   */
  private needsDomesticDelivery(country: string): boolean {
    return ['IN', 'NP'].includes(country);
  }

  /**
   * Create cache key for shipping request
   */
  private createCacheKey(request: ShippingRequest): string {
    return [
      request.originCountry,
      request.destinationCountry,
      request.destinationPincode || 'no-pin',
      request.totalWeight,
      request.shippingMethod,
      request.serviceType || 'default'
    ].join('|');
  }

  /**
   * Get cheapest available shipping rate
   */
  getCheapestRate(rates: ShippingRate[]): ShippingRate | null {
    const availableRates = rates.filter(rate => rate.available);
    if (availableRates.length === 0) return null;

    return availableRates.reduce((cheapest, current) => 
      current.costUSD < cheapest.costUSD ? current : cheapest
    );
  }

  /**
   * Get fastest available shipping rate
   */
  getFastestRate(rates: ShippingRate[]): ShippingRate | null {
    const availableRates = rates.filter(rate => rate.available);
    if (availableRates.length === 0) return null;

    return availableRates.reduce((fastest, current) => 
      current.estimatedDays < fastest.estimatedDays ? current : fastest
    );
  }

  /**
   * Get recommended shipping rate (best balance of cost/speed)
   */
  getRecommendedRate(rates: ShippingRate[]): ShippingRate | null {
    const availableRates = rates.filter(rate => rate.available);
    if (availableRates.length === 0) return null;

    // Find rate with highest confidence and reasonable cost/speed balance
    return availableRates.reduce((recommended, current) => {
      const currentScore = current.confidence * (1 / current.costUSD) * (1 / current.estimatedDays);
      const recommendedScore = recommended.confidence * (1 / recommended.costUSD) * (1 / recommended.estimatedDays);
      
      return currentScore > recommendedScore ? current : recommended;
    });
  }

  /**
   * Validate shipping request
   */
  validateShippingRequest(request: ShippingRequest): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!request.originCountry) {
      errors.push('Origin country is required');
    }

    if (!request.destinationCountry) {
      errors.push('Destination country is required');
    }

    if (!request.totalWeight || request.totalWeight <= 0) {
      errors.push('Total weight must be greater than 0');
    }

    if (!request.totalValue || request.totalValue <= 0) {
      errors.push('Total value must be greater than 0');
    }

    if (!['standard', 'express', 'economy'].includes(request.shippingMethod)) {
      errors.push('Invalid shipping method');
    }

    // Country-specific validations
    if (request.destinationCountry === 'IN' && !request.destinationPincode) {
      errors.push('Pincode is required for India deliveries');
    }

    if (request.destinationCountry === 'NP' && !request.destinationAddress?.district) {
      errors.push('District is required for Nepal deliveries');
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Clear rate cache
   */
  clearCache(): void {
    this.rateCache.clear();
    logger.info('Shipping rate cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; entries: Array<{ key: string; age: number }> } {
    const entries = Array.from(this.rateCache.entries()).map(([key, data]) => ({
      key,
      age: new Date().getTime() - data.timestamp.getTime()
    }));

    return { size: this.rateCache.size, entries };
  }

  /**
   * Clean expired cache entries
   */
  cleanExpiredCache(): number {
    const now = new Date().getTime();
    let cleaned = 0;

    for (const [key, data] of this.rateCache.entries()) {
      if (now - data.timestamp.getTime() > this.cacheTTL) {
        this.rateCache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logger.info(`Cleaned ${cleaned} expired shipping rate cache entries`);
    }

    return cleaned;
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    this.clearCache();
    logger.info('ShippingCostService disposed');
  }
}

export default ShippingCostService;