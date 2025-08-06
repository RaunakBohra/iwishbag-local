/**
 * Tier Calculation Service
 * Handles volume-based discounts, tiered pricing, and quantity-based offers
 * Decomposed from DiscountService for focused tier management
 * 
 * RESPONSIBILITIES:
 * - Volume discount calculation based on order value and item count
 * - Tier-based pricing structures
 * - First-time customer special offers
 * - Country-specific discount tiers
 * - Progressive discount calculations
 * - Bulk order incentives
 */

import { logger } from '@/utils/logger';
import { supabase } from '@/integrations/supabase/client';

export interface DiscountTier {
  id: string;
  discount_type_id: string;
  tier_name: string;
  min_order_value: number;
  max_order_value?: number;
  min_item_count?: number;
  max_item_count?: number;
  discount_value: number;
  discount_type: 'percentage' | 'fixed_amount';
  applicable_components: string[];
  is_active: boolean;
  priority?: number;
}

export interface VolumeDiscountRequest {
  orderTotal: number;
  itemCount: number;
  customerId?: string;
  countryCode?: string;
  isFirstOrder?: boolean;
  itemCategories?: string[];
}

export interface TierDiscountResult {
  applicable_tier?: DiscountTier;
  discount_amount: number;
  tier_name: string;
  original_amount: number;
  savings_percentage: number;
  next_tier?: {
    min_order_value: number;
    potential_savings: number;
    additional_amount_needed: number;
  };
}

export interface ApplicableDiscount {
  discount_source: 'volume' | 'first_time' | 'tier' | 'bulk';
  discount_type: 'percentage' | 'fixed_amount';
  discount_value: number;
  discount_amount: number;
  applies_to: string;
  is_stackable: boolean;
  priority?: number;
  description: string;
  tier_info?: {
    tier_name: string;
    min_threshold: number;
    max_threshold?: number;
  };
}

export interface FirstTimeOfferConfig {
  id: string;
  discount_percentage: number;
  max_discount_amount?: number;
  min_order_value: number;
  valid_days: number;
  applicable_to: string;
  description: string;
}

export class TierCalculationService {
  private static instance: TierCalculationService;
  private tierCache = new Map<string, { data: any; timestamp: number }>();
  private readonly cacheTTL = 15 * 60 * 1000; // 15 minutes cache for tier data

  constructor() {
    logger.info('TierCalculationService initialized');
  }

  static getInstance(): TierCalculationService {
    if (!TierCalculationService.instance) {
      TierCalculationService.instance = new TierCalculationService();
    }
    return TierCalculationService.instance;
  }

  /**
   * Calculate volume-based discounts
   */
  async getVolumeDiscounts(request: VolumeDiscountRequest): Promise<ApplicableDiscount[]> {
    try {
      const { orderTotal, itemCount, countryCode } = request;

      const cacheKey = this.createCacheKey('volume_discounts', { orderTotal, itemCount, countryCode });
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        logger.debug('Using cached volume discounts');
        return cached;
      }

      // Fetch volume discount tiers from database
      const { data: volumeDiscounts, error } = await supabase
        .from('discount_types')
        .select(`
          *,
          tiers:discount_tiers(*)
        `)
        .eq('is_active', true)
        .eq('conditions->use_tiers', true);

      if (error || !volumeDiscounts) {
        logger.warn('Failed to fetch volume discounts:', error);
        return [];
      }

      const applicableDiscounts: ApplicableDiscount[] = [];

      for (const discount of volumeDiscounts) {
        if (!discount.tiers || discount.tiers.length === 0) continue;

        // Find applicable tier based on order total and item count
        const applicableTier = this.findApplicableTier(discount.tiers, orderTotal, itemCount);

        if (applicableTier) {
          // Create discounts for each applicable component
          for (const component of applicableTier.applicable_components) {
            applicableDiscounts.push({
              discount_source: 'volume',
              discount_type: applicableTier.discount_type as 'percentage' | 'fixed_amount',
              discount_value: applicableTier.discount_value,
              discount_amount: 0, // Will be calculated later based on component value
              applies_to: component,
              is_stackable: discount.conditions?.stacking_allowed !== false,
              priority: discount.priority || applicableTier.priority || 100,
              description: `Volume discount: ${applicableTier.discount_value}${applicableTier.discount_type === 'percentage' ? '%' : ''} off ${component}`,
              tier_info: {
                tier_name: applicableTier.tier_name,
                min_threshold: applicableTier.min_order_value,
                max_threshold: applicableTier.max_order_value
              }
            });
          }
        }
      }

      this.setCache(cacheKey, applicableDiscounts);
      logger.info(`Found ${applicableDiscounts.length} volume-based discounts`);
      return applicableDiscounts;

    } catch (error) {
      logger.error('Error getting volume discounts:', error);
      return [];
    }
  }

  /**
   * Calculate first-time customer discounts
   */
  async getFirstTimeDiscounts(request: VolumeDiscountRequest): Promise<ApplicableDiscount[]> {
    try {
      if (!request.isFirstOrder) {
        return [];
      }

      const { orderTotal, countryCode } = request;

      const cacheKey = this.createCacheKey('first_time_discounts', { orderTotal, countryCode });
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        logger.debug('Using cached first-time discounts');
        return cached;
      }

      const { data: firstTimeDiscounts, error } = await supabase
        .from('discount_types')
        .select('*')
        .eq('is_active', true)
        .eq('conditions->first_time_only', true)
        .or(`conditions->min_order.is.null,conditions->min_order.lte.${orderTotal}`);

      if (error || !firstTimeDiscounts) {
        logger.warn('Failed to fetch first-time discounts:', error);
        return [];
      }

      const discounts: ApplicableDiscount[] = firstTimeDiscounts.map(discount => ({
        discount_source: 'first_time',
        discount_type: discount.type.includes('percentage') ? 'percentage' : 'fixed_amount',
        discount_value: discount.value,
        discount_amount: 0, // Will be calculated later
        applies_to: discount.conditions?.applicable_to || 'total',
        is_stackable: discount.conditions?.stacking_allowed !== false,
        priority: discount.priority || 200, // Higher priority for first-time discounts
        description: discount.name || `First-time customer: ${discount.value}${discount.type.includes('percentage') ? '%' : ''} off`
      }));

      this.setCache(cacheKey, discounts);
      logger.info(`Found ${discounts.length} first-time customer discounts`);
      return discounts;

    } catch (error) {
      logger.error('Error getting first-time discounts:', error);
      return [];
    }
  }

  /**
   * Get country-specific tier discounts
   */
  async getCountrySpecificTiers(
    countryCode: string, 
    orderTotal: number, 
    includeAutomatic: boolean = true,
    appliedCodes: string[] = []
  ): Promise<ApplicableDiscount[]> {
    try {
      const cacheKey = this.createCacheKey('country_tiers', { countryCode, orderTotal, includeAutomatic });
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        logger.debug('Using cached country-specific tiers');
        return cached;
      }

      const { data: countryRules, error } = await supabase
        .from('country_discount_rules')
        .select(`
          *,
          discount_type:discount_types(*,tiers:discount_tiers(*))
        `)
        .eq('country_code', countryCode)
        .order('priority', { ascending: false });
      
      if (error) {
        logger.warn('Failed to fetch country-specific tiers:', error);
        return [];
      }

      // Filter by order total
      const applicableRules = (countryRules || []).filter(rule => 
        !rule.min_order_amount || orderTotal >= rule.min_order_amount
      );

      const discounts: ApplicableDiscount[] = [];
      
      for (const rule of applicableRules) {
        if (!rule.discount_type?.is_active) continue;

        const discountType = rule.discount_type;
        
        // Check if this is an automatic discount or requires a code
        const isAutomatic = rule.auto_apply || !rule.requires_code;
        const isCodeBased = appliedCodes.includes(rule.discount_code || '');
        
        if (!includeAutomatic && isAutomatic) continue;
        if (rule.requires_code && !isCodeBased) continue;

        // Handle tiered discounts
        if (discountType.tiers && discountType.tiers.length > 0) {
          const applicableTier = this.findApplicableTier(discountType.tiers, orderTotal);
          
          if (applicableTier) {
            for (const component of applicableTier.applicable_components) {
              discounts.push({
                discount_source: 'tier',
                discount_type: applicableTier.discount_type as 'percentage' | 'fixed_amount',
                discount_value: applicableTier.discount_value,
                discount_amount: 0,
                applies_to: component,
                is_stackable: discountType.conditions?.stacking_allowed !== false,
                priority: rule.priority || discountType.priority || 150,
                description: `${countryCode} tier: ${applicableTier.tier_name}`,
                tier_info: {
                  tier_name: applicableTier.tier_name,
                  min_threshold: applicableTier.min_order_value,
                  max_threshold: applicableTier.max_order_value
                }
              });
            }
          }
        } else {
          // Simple country discount without tiers
          let discountAmount = 0;
          const appliesTo = discountType.conditions?.applicable_to || 'total';
          
          if (discountType.type === 'percentage') {
            discountAmount = orderTotal * (discountType.value / 100);
            if (discountType.conditions?.max_discount) {
              discountAmount = Math.min(discountAmount, discountType.conditions.max_discount);
            }
          } else {
            discountAmount = Math.min(discountType.value, orderTotal);
          }

          discounts.push({
            discount_source: 'tier',
            discount_type: discountType.type as 'percentage' | 'fixed_amount',
            discount_value: discountType.value,
            discount_amount: discountAmount,
            applies_to: appliesTo,
            is_stackable: discountType.conditions?.stacking_allowed !== false,
            priority: rule.priority || discountType.priority || 150,
            description: `${countryCode} discount: ${discountType.name}`
          });
        }
      }

      this.setCache(cacheKey, discounts);
      logger.info(`Found ${discounts.length} country-specific tier discounts for ${countryCode}`);
      return discounts;

    } catch (error) {
      logger.error('Error getting country-specific tiers:', error);
      return [];
    }
  }

  /**
   * Calculate tier progression and next tier recommendations
   */
  calculateTierProgression(
    currentOrderTotal: number, 
    availableTiers: DiscountTier[]
  ): TierDiscountResult {
    try {
      // Find current applicable tier
      const currentTier = this.findApplicableTier(availableTiers, currentOrderTotal);
      
      // Find next tier with higher benefits
      const nextTier = availableTiers
        .filter(tier => tier.min_order_value > currentOrderTotal)
        .sort((a, b) => a.min_order_value - b.min_order_value)[0];

      let discountAmount = 0;
      let savingsPercentage = 0;

      if (currentTier) {
        if (currentTier.discount_type === 'percentage') {
          discountAmount = currentOrderTotal * (currentTier.discount_value / 100);
        } else {
          discountAmount = currentTier.discount_value;
        }
        savingsPercentage = (discountAmount / currentOrderTotal) * 100;
      }

      const result: TierDiscountResult = {
        applicable_tier: currentTier || undefined,
        discount_amount: discountAmount,
        tier_name: currentTier?.tier_name || 'No tier',
        original_amount: currentOrderTotal,
        savings_percentage: savingsPercentage
      };

      // Add next tier information
      if (nextTier) {
        const additionalAmountNeeded = nextTier.min_order_value - currentOrderTotal;
        let potentialSavings = 0;
        
        if (nextTier.discount_type === 'percentage') {
          potentialSavings = nextTier.min_order_value * (nextTier.discount_value / 100);
        } else {
          potentialSavings = nextTier.discount_value;
        }

        result.next_tier = {
          min_order_value: nextTier.min_order_value,
          potential_savings: potentialSavings - discountAmount,
          additional_amount_needed: additionalAmountNeeded
        };
      }

      return result;

    } catch (error) {
      logger.error('Error calculating tier progression:', error);
      return {
        discount_amount: 0,
        tier_name: 'Error',
        original_amount: currentOrderTotal,
        savings_percentage: 0
      };
    }
  }

  /**
   * Get bulk order incentives
   */
  async getBulkOrderIncentives(itemCount: number, orderTotal: number): Promise<ApplicableDiscount[]> {
    try {
      if (itemCount < 3) return []; // Only apply bulk incentives for 3+ items

      const cacheKey = this.createCacheKey('bulk_incentives', { itemCount, orderTotal });
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        logger.debug('Using cached bulk order incentives');
        return cached;
      }

      // Bulk discount logic based on item count
      const bulkDiscounts: ApplicableDiscount[] = [];

      // 3-5 items: 5% off handling
      if (itemCount >= 3 && itemCount <= 5) {
        bulkDiscounts.push({
          discount_source: 'bulk',
          discount_type: 'percentage',
          discount_value: 5,
          discount_amount: 0,
          applies_to: 'handling',
          is_stackable: true,
          priority: 120,
          description: 'Bulk order (3-5 items): 5% off handling'
        });
      }

      // 6-10 items: 8% off handling + 3% off shipping
      if (itemCount >= 6 && itemCount <= 10) {
        bulkDiscounts.push({
          discount_source: 'bulk',
          discount_type: 'percentage',
          discount_value: 8,
          discount_amount: 0,
          applies_to: 'handling',
          is_stackable: true,
          priority: 120,
          description: 'Bulk order (6-10 items): 8% off handling'
        });
        
        bulkDiscounts.push({
          discount_source: 'bulk',
          discount_type: 'percentage',
          discount_value: 3,
          discount_amount: 0,
          applies_to: 'shipping',
          is_stackable: true,
          priority: 120,
          description: 'Bulk order (6-10 items): 3% off shipping'
        });
      }

      // 11+ items: 12% off handling + 5% off shipping + 2% off total
      if (itemCount >= 11) {
        bulkDiscounts.push({
          discount_source: 'bulk',
          discount_type: 'percentage',
          discount_value: 12,
          discount_amount: 0,
          applies_to: 'handling',
          is_stackable: true,
          priority: 120,
          description: 'Large bulk order (11+ items): 12% off handling'
        });
        
        bulkDiscounts.push({
          discount_source: 'bulk',
          discount_type: 'percentage',
          discount_value: 5,
          discount_amount: 0,
          applies_to: 'shipping',
          is_stackable: true,
          priority: 120,
          description: 'Large bulk order (11+ items): 5% off shipping'
        });

        bulkDiscounts.push({
          discount_source: 'bulk',
          discount_type: 'percentage',
          discount_value: 2,
          discount_amount: 0,
          applies_to: 'total',
          is_stackable: true,
          priority: 120,
          description: 'Large bulk order (11+ items): 2% off total'
        });
      }

      this.setCache(cacheKey, bulkDiscounts);
      logger.info(`Generated ${bulkDiscounts.length} bulk order incentives for ${itemCount} items`);
      return bulkDiscounts;

    } catch (error) {
      logger.error('Error getting bulk order incentives:', error);
      return [];
    }
  }

  /**
   * Find the applicable tier for given parameters
   */
  private findApplicableTier(
    tiers: DiscountTier[], 
    orderTotal: number, 
    itemCount?: number
  ): DiscountTier | null {
    const eligibleTiers = tiers.filter(tier => {
      // Check order value range
      if (tier.min_order_value > orderTotal) return false;
      if (tier.max_order_value && tier.max_order_value < orderTotal) return false;
      
      // Check item count range if specified
      if (itemCount !== undefined) {
        if (tier.min_item_count && tier.min_item_count > itemCount) return false;
        if (tier.max_item_count && tier.max_item_count < itemCount) return false;
      }
      
      return tier.is_active;
    });

    // Return the tier with highest discount value
    return eligibleTiers.sort((a, b) => {
      if (a.discount_type === 'percentage' && b.discount_type === 'percentage') {
        return b.discount_value - a.discount_value;
      }
      return b.discount_value - a.discount_value;
    })[0] || null;
  }

  /**
   * Get tier recommendations for customer
   */
  async getTierRecommendations(
    customerId: string,
    currentOrderTotal: number
  ): Promise<{
    current_tier: string;
    current_savings: number;
    recommendations: Array<{
      tier_name: string;
      min_order_value: number;
      potential_savings: number;
      additional_needed: number;
      worth_upgrade: boolean;
    }>;
  }> {
    try {
      // Get all available tiers
      const { data: allTiers } = await supabase
        .from('discount_tiers')
        .select('*')
        .eq('is_active', true)
        .order('min_order_value');

      if (!allTiers || allTiers.length === 0) {
        return {
          current_tier: 'No tier',
          current_savings: 0,
          recommendations: []
        };
      }

      const progression = this.calculateTierProgression(currentOrderTotal, allTiers);
      
      const recommendations = allTiers
        .filter(tier => tier.min_order_value > currentOrderTotal)
        .slice(0, 3) // Show top 3 upgrade options
        .map(tier => {
          const additionalNeeded = tier.min_order_value - currentOrderTotal;
          let potentialSavings = 0;
          
          if (tier.discount_type === 'percentage') {
            potentialSavings = tier.min_order_value * (tier.discount_value / 100);
          } else {
            potentialSavings = tier.discount_value;
          }
          
          const additionalSavings = potentialSavings - progression.discount_amount;
          const worthUpgrade = additionalSavings > additionalNeeded * 0.1; // 10% return threshold

          return {
            tier_name: tier.tier_name,
            min_order_value: tier.min_order_value,
            potential_savings: additionalSavings,
            additional_needed: additionalNeeded,
            worth_upgrade: worthUpgrade
          };
        });

      return {
        current_tier: progression.tier_name,
        current_savings: progression.discount_amount,
        recommendations
      };

    } catch (error) {
      logger.error('Error getting tier recommendations:', error);
      return {
        current_tier: 'Error',
        current_savings: 0,
        recommendations: []
      };
    }
  }

  /**
   * Cache management
   */
  private createCacheKey(prefix: string, params: any = {}): string {
    const keyParts = [prefix];
    
    Object.keys(params)
      .sort()
      .forEach(key => {
        keyParts.push(`${key}:${params[key]}`);
      });

    return keyParts.join('|');
  }

  private getFromCache(key: string): any | null {
    const cached = this.tierCache.get(key);
    if (!cached) return null;

    const isExpired = Date.now() - cached.timestamp > this.cacheTTL;
    if (isExpired) {
      this.tierCache.delete(key);
      return null;
    }

    return cached.data;
  }

  private setCache(key: string, data: any): void {
    this.tierCache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  /**
   * Clear tier cache
   */
  clearCache(): void {
    this.tierCache.clear();
    logger.info('Tier calculation cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; entries: string[] } {
    return {
      size: this.tierCache.size,
      entries: Array.from(this.tierCache.keys())
    };
  }

  /**
   * Clean expired cache entries
   */
  cleanExpiredCache(): number {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [key, cached] of this.tierCache.entries()) {
      if (now - cached.timestamp > this.cacheTTL) {
        this.tierCache.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      logger.info(`Cleaned ${cleanedCount} expired tier cache entries`);
    }

    return cleanedCount;
  }

  /**
   * Dispose of resources
   */
  dispose(): void {
    this.clearCache();
    logger.info('TierCalculationService disposed');
  }
}

export default TierCalculationService;