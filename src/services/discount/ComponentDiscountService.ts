/**
 * Component Discount Service
 * Handles component-specific discount calculations and application logic
 * Decomposed from DiscountService for focused component discount management
 * 
 * RESPONSIBILITIES:
 * - Component-specific discount calculation (shipping, handling, customs, etc.)
 * - Stacking rules and priority-based discount application
 * - Component discount aggregation
 * - Discount composition and conflict resolution
 * - Component-level discount analytics
 * - Interactive discount suggestions
 */

import { logger } from '@/utils/logger';

export interface ComponentDiscountRequest {
  componentName: 'customs' | 'shipping' | 'handling' | 'delivery' | 'taxes' | 'items' | 'total' | 'all_fees';
  componentValue: number;
  applicableDiscounts: ApplicableDiscount[];
  customerId?: string;
  quoteId?: string;
  orderContext?: {
    totalValue: number;
    itemCount: number;
    countryCode: string;
    isFirstOrder: boolean;
  };
}

export interface ComponentDiscountResult {
  component_name: string;
  original_amount: number;
  final_amount: number;
  total_discount: number;
  savings_percentage: number;
  applied_discounts: Array<{
    source: string;
    type: 'percentage' | 'fixed_amount' | 'free';
    value: number;
    amount: number;
    description: string;
    priority: number;
    code?: string;
  }>;
  skipped_discounts: Array<{
    discount: ApplicableDiscount;
    reason: string;
  }>;
  next_tier_suggestion?: {
    additional_amount_needed: number;
    potential_additional_savings: number;
  };
}

export interface ApplicableDiscount {
  discount_source: 'code' | 'campaign' | 'membership' | 'payment_method' | 'volume' | 'first_time' | 'tier' | 'bulk';
  discount_type: 'percentage' | 'fixed_amount';
  discount_value: number;
  discount_amount: number;
  applies_to: string;
  is_stackable: boolean;
  priority?: number;
  description: string;
  discount_code_id?: string;
  campaign_id?: string;
  conditions?: any;
  tier_info?: {
    tier_name: string;
    min_threshold: number;
    max_threshold?: number;
  };
}

export interface StackingRule {
  max_discounts_per_component: number;
  max_total_discount_percentage: number;
  allowed_combinations: string[];
  priority_override: { [source: string]: number };
  exclusions: Array<{
    source1: string;
    source2: string;
    reason: string;
  }>;
}

export class ComponentDiscountService {
  private static instance: ComponentDiscountService;
  private componentCache = new Map<string, { result: ComponentDiscountResult; timestamp: number }>();
  private readonly cacheTTL = 3 * 60 * 1000; // 3 minutes cache for component calculations

  // Default stacking rules
  private readonly defaultStackingRules: StackingRule = {
    max_discounts_per_component: 3,
    max_total_discount_percentage: 50,
    allowed_combinations: ['membership', 'payment_method', 'volume', 'first_time', 'campaign'],
    priority_override: {
      'code': 300,      // User codes have highest priority
      'membership': 250, // Premium memberships
      'first_time': 200, // First-time customers
      'campaign': 150,   // Active campaigns
      'volume': 120,     // Volume discounts
      'payment_method': 100, // Payment method discounts
      'tier': 80,        // Tier-based discounts
      'bulk': 60         // Bulk order discounts
    },
    exclusions: [
      { source1: 'code', source2: 'campaign', reason: 'Code discounts override campaign discounts' },
      { source1: 'first_time', source2: 'membership', reason: 'First-time and membership discounts cannot stack' }
    ]
  };

  constructor() {
    logger.info('ComponentDiscountService initialized');
  }

  static getInstance(): ComponentDiscountService {
    if (!ComponentDiscountService.instance) {
      ComponentDiscountService.instance = new ComponentDiscountService();
    }
    return ComponentDiscountService.instance;
  }

  /**
   * Calculate discounts for a specific component
   */
  async calculateComponentDiscount(request: ComponentDiscountRequest): Promise<ComponentDiscountResult> {
    try {
      const { componentName, componentValue, applicableDiscounts } = request;

      // Check cache
      const cacheKey = this.createCacheKey(request);
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        logger.debug(`Using cached component discount for ${componentName}`);
        return cached;
      }

      logger.info(`Calculating component discount for ${componentName}: $${componentValue}`);

      // Filter discounts applicable to this component
      const componentDiscounts = this.filterComponentDiscounts(applicableDiscounts, componentName);

      // Apply stacking rules and sort by priority
      const stackedDiscounts = this.applyStackingRules(componentDiscounts, this.defaultStackingRules);

      // Calculate final discount amounts
      const calculationResult = this.calculateFinalAmounts(
        componentValue, 
        stackedDiscounts.applicable, 
        componentName
      );

      // Build comprehensive result
      const result: ComponentDiscountResult = {
        component_name: componentName,
        original_amount: componentValue,
        final_amount: calculationResult.finalAmount,
        total_discount: calculationResult.totalDiscount,
        savings_percentage: componentValue > 0 ? (calculationResult.totalDiscount / componentValue) * 100 : 0,
        applied_discounts: calculationResult.appliedDiscounts,
        skipped_discounts: stackedDiscounts.skipped.map(item => ({
          discount: item.discount,
          reason: item.reason
        }))
      };

      // Add tier progression suggestion if applicable
      const tierSuggestion = this.generateTierSuggestion(request, stackedDiscounts.applicable);
      if (tierSuggestion) {
        result.next_tier_suggestion = tierSuggestion;
      }

      // Cache the result
      this.setCache(cacheKey, result);

      logger.info(`${componentName} discount calculated: $${result.total_discount.toFixed(2)} (${result.savings_percentage.toFixed(1)}%)`);
      return result;

    } catch (error) {
      logger.error(`Component discount calculation failed for ${request.componentName}:`, error);
      
      // Return safe fallback
      return {
        component_name: request.componentName,
        original_amount: request.componentValue,
        final_amount: request.componentValue,
        total_discount: 0,
        savings_percentage: 0,
        applied_discounts: [],
        skipped_discounts: []
      };
    }
  }

  /**
   * Calculate discounts for all components in a quote
   */
  async calculateAllComponentDiscounts(
    componentValues: { [componentName: string]: number },
    allDiscounts: ApplicableDiscount[],
    orderContext?: ComponentDiscountRequest['orderContext']
  ): Promise<{ [componentName: string]: ComponentDiscountResult }> {
    try {
      const results: { [componentName: string]: ComponentDiscountResult } = {};

      // Calculate discounts for each component in parallel
      const calculations = Object.entries(componentValues).map(async ([componentName, value]) => {
        const componentDiscounts = this.filterComponentDiscounts(allDiscounts, componentName);
        
        const result = await this.calculateComponentDiscount({
          componentName: componentName as any,
          componentValue: value,
          applicableDiscounts: componentDiscounts,
          orderContext
        });

        return { componentName, result };
      });

      const calculationResults = await Promise.all(calculations);
      
      calculationResults.forEach(({ componentName, result }) => {
        results[componentName] = result;
      });

      logger.info(`Calculated discounts for ${Object.keys(results).length} components`);
      return results;

    } catch (error) {
      logger.error('Failed to calculate all component discounts:', error);
      return {};
    }
  }

  /**
   * Filter discounts applicable to a specific component
   */
  private filterComponentDiscounts(
    discounts: ApplicableDiscount[], 
    componentName: string
  ): ApplicableDiscount[] {
    return discounts.filter(discount => {
      // Direct component match
      if (discount.applies_to === componentName) {
        return true;
      }
      
      // Special cases
      if (discount.applies_to === 'all_fees' && 
          ['customs', 'handling', 'taxes', 'delivery'].includes(componentName)) {
        return true;
      }
      
      if (discount.applies_to === 'total' && componentName === 'total') {
        return true;
      }

      return false;
    });
  }

  /**
   * Apply stacking rules and resolve conflicts
   */
  private applyStackingRules(
    discounts: ApplicableDiscount[], 
    rules: StackingRule
  ): {
    applicable: ApplicableDiscount[];
    skipped: Array<{ discount: ApplicableDiscount; reason: string }>;
  } {
    const applicable: ApplicableDiscount[] = [];
    const skipped: Array<{ discount: ApplicableDiscount; reason: string }> = [];

    // Sort by priority (higher priority first)
    const sortedDiscounts = [...discounts].sort((a, b) => {
      const priorityA = rules.priority_override[a.discount_source] || a.priority || 0;
      const priorityB = rules.priority_override[b.discount_source] || b.priority || 0;
      return priorityB - priorityA;
    });

    // Track applied sources for exclusion rules
    const appliedSources = new Set<string>();
    let totalPercentageDiscount = 0;

    for (const discount of sortedDiscounts) {
      // Check maximum discounts per component
      if (applicable.length >= rules.max_discounts_per_component) {
        skipped.push({ discount, reason: 'Maximum discounts per component reached' });
        continue;
      }

      // Check if source is allowed
      if (!rules.allowed_combinations.includes(discount.discount_source)) {
        skipped.push({ discount, reason: 'Discount source not allowed in stacking combinations' });
        continue;
      }

      // Check exclusion rules
      const conflictingSource = this.findConflictingSource(discount.discount_source, appliedSources, rules);
      if (conflictingSource) {
        const exclusion = rules.exclusions.find(e => 
          (e.source1 === discount.discount_source && e.source2 === conflictingSource) ||
          (e.source2 === discount.discount_source && e.source1 === conflictingSource)
        );
        skipped.push({ 
          discount, 
          reason: exclusion?.reason || `Cannot stack with ${conflictingSource}` 
        });
        continue;
      }

      // Check total discount percentage limit
      if (discount.discount_type === 'percentage') {
        if (totalPercentageDiscount + discount.discount_value > rules.max_total_discount_percentage) {
          skipped.push({ discount, reason: 'Would exceed maximum total discount percentage' });
          continue;
        }
        totalPercentageDiscount += discount.discount_value;
      }

      // Check stackability
      if (!discount.is_stackable && applicable.length > 0) {
        skipped.push({ discount, reason: 'Discount is not stackable' });
        continue;
      }

      // Apply the discount
      applicable.push(discount);
      appliedSources.add(discount.discount_source);
    }

    return { applicable, skipped };
  }

  /**
   * Find conflicting source based on exclusion rules
   */
  private findConflictingSource(
    source: string, 
    appliedSources: Set<string>, 
    rules: StackingRule
  ): string | null {
    for (const appliedSource of appliedSources) {
      const hasConflict = rules.exclusions.some(exclusion =>
        (exclusion.source1 === source && exclusion.source2 === appliedSource) ||
        (exclusion.source2 === source && exclusion.source1 === appliedSource)
      );
      
      if (hasConflict) {
        return appliedSource;
      }
    }
    
    return null;
  }

  /**
   * Calculate final discount amounts
   */
  private calculateFinalAmounts(
    originalAmount: number, 
    discounts: ApplicableDiscount[], 
    componentName: string
  ): {
    finalAmount: number;
    totalDiscount: number;
    appliedDiscounts: ComponentDiscountResult['applied_discounts'];
  } {
    let remainingAmount = originalAmount;
    let totalDiscount = 0;
    const appliedDiscounts: ComponentDiscountResult['applied_discounts'] = [];

    for (const discount of discounts) {
      let discountAmount = 0;

      // Calculate discount amount
      if (discount.discount_type === 'percentage') {
        discountAmount = remainingAmount * (discount.discount_value / 100);
        
        // Apply any maximum discount conditions
        if (discount.conditions?.max_discount) {
          discountAmount = Math.min(discountAmount, discount.conditions.max_discount);
        }
        if (discount.conditions?.max_discount_percentage) {
          const maxAllowed = originalAmount * (discount.conditions.max_discount_percentage / 100);
          discountAmount = Math.min(discountAmount, maxAllowed);
        }
      } else if (discount.discount_type === 'fixed_amount') {
        discountAmount = Math.min(discount.discount_value, remainingAmount);
      }

      // Ensure discount doesn't exceed remaining amount
      discountAmount = Math.min(discountAmount, remainingAmount);

      if (discountAmount > 0) {
        totalDiscount += discountAmount;
        remainingAmount -= discountAmount;

        appliedDiscounts.push({
          source: discount.discount_source,
          type: discount.discount_type,
          value: discount.discount_value,
          amount: discountAmount,
          description: discount.description,
          priority: discount.priority || 0,
          code: discount.discount_code_id
        });

        // If amount reaches zero, stop applying more discounts
        if (remainingAmount <= 0) break;
      }
    }

    return {
      finalAmount: Math.max(0, remainingAmount),
      totalDiscount,
      appliedDiscounts
    };
  }

  /**
   * Generate tier progression suggestion
   */
  private generateTierSuggestion(
    request: ComponentDiscountRequest,
    appliedDiscounts: ApplicableDiscount[]
  ): ComponentDiscountResult['next_tier_suggestion'] | null {
    try {
      if (!request.orderContext) return null;

      // Look for tier-based discounts that could be improved
      const tierDiscounts = appliedDiscounts.filter(d => d.tier_info);
      
      if (tierDiscounts.length === 0) return null;

      // Find the next tier for the highest-value tier discount
      const primaryTierDiscount = tierDiscounts[0];
      const currentThreshold = primaryTierDiscount.tier_info?.min_threshold || 0;
      
      // Simulate next tier (simple logic - could be enhanced with database lookup)
      const nextTierThreshold = currentThreshold * 1.5; // Assume 50% increase for next tier
      const additionalAmountNeeded = nextTierThreshold - request.orderContext.totalValue;
      
      if (additionalAmountNeeded <= 0) return null;

      // Estimate potential additional savings (assume 2% more discount)
      const currentSavings = primaryTierDiscount.discount_amount;
      const potentialAdditionalSavings = request.orderContext.totalValue * 0.02;

      return {
        additional_amount_needed: additionalAmountNeeded,
        potential_additional_savings: potentialAdditionalSavings
      };

    } catch (error) {
      logger.warn('Failed to generate tier suggestion:', error);
      return null;
    }
  }

  /**
   * Get discount recommendations for component optimization
   */
  async getComponentOptimizationSuggestions(
    componentValues: { [componentName: string]: number },
    currentDiscounts: ApplicableDiscount[]
  ): Promise<Array<{
    component: string;
    current_discount: number;
    optimization_type: 'increase_order' | 'add_items' | 'change_shipping' | 'upgrade_membership';
    required_action: string;
    potential_additional_savings: number;
  }>> {
    const suggestions: Array<{
      component: string;
      current_discount: number;
      optimization_type: 'increase_order' | 'add_items' | 'change_shipping' | 'upgrade_membership';
      required_action: string;
      potential_additional_savings: number;
    }> = [];

    try {
      for (const [componentName, value] of Object.entries(componentValues)) {
        const componentDiscounts = this.filterComponentDiscounts(currentDiscounts, componentName);
        const result = await this.calculateComponentDiscount({
          componentName: componentName as any,
          componentValue: value,
          applicableDiscounts: componentDiscounts
        });

        // Analyze potential optimizations
        if (result.savings_percentage < 10 && value > 50) {
          // Low discount percentage suggests opportunity for improvement
          suggestions.push({
            component: componentName,
            current_discount: result.total_discount,
            optimization_type: 'increase_order',
            required_action: `Add $${Math.ceil(value * 0.5)} to reach volume discount threshold`,
            potential_additional_savings: value * 0.05 // 5% potential savings
          });
        }

        // Check for tier progression opportunities
        if (result.next_tier_suggestion) {
          suggestions.push({
            component: componentName,
            current_discount: result.total_discount,
            optimization_type: 'increase_order',
            required_action: `Add $${result.next_tier_suggestion.additional_amount_needed.toFixed(2)} for next tier`,
            potential_additional_savings: result.next_tier_suggestion.potential_additional_savings
          });
        }
      }

      logger.info(`Generated ${suggestions.length} component optimization suggestions`);
      return suggestions;

    } catch (error) {
      logger.error('Error generating optimization suggestions:', error);
      return [];
    }
  }

  /**
   * Cache management
   */
  private createCacheKey(request: ComponentDiscountRequest): string {
    return [
      request.componentName,
      request.componentValue,
      request.customerId || 'anonymous',
      request.applicableDiscounts.length,
      JSON.stringify(request.applicableDiscounts.map(d => ({ source: d.discount_source, value: d.discount_value })))
    ].join('|');
  }

  private getFromCache(key: string): ComponentDiscountResult | null {
    const cached = this.componentCache.get(key);
    if (!cached) return null;

    const isExpired = Date.now() - cached.timestamp > this.cacheTTL;
    if (isExpired) {
      this.componentCache.delete(key);
      return null;
    }

    return cached.result;
  }

  private setCache(key: string, result: ComponentDiscountResult): void {
    this.componentCache.set(key, {
      result,
      timestamp: Date.now()
    });
  }

  /**
   * Clear component discount cache
   */
  clearCache(): void {
    this.componentCache.clear();
    logger.info('Component discount cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; entries: Array<{ key: string; component: string; savings: number }> } {
    const entries = Array.from(this.componentCache.entries()).map(([key, cached]) => ({
      key,
      component: cached.result.component_name,
      savings: cached.result.total_discount
    }));

    return { size: this.componentCache.size, entries };
  }

  /**
   * Clean expired cache entries
   */
  cleanExpiredCache(): number {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [key, cached] of this.componentCache.entries()) {
      if (now - cached.timestamp > this.cacheTTL) {
        this.componentCache.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      logger.info(`Cleaned ${cleanedCount} expired component discount cache entries`);
    }

    return cleanedCount;
  }

  /**
   * Dispose of resources
   */
  dispose(): void {
    this.clearCache();
    logger.info('ComponentDiscountService disposed');
  }
}

export default ComponentDiscountService;