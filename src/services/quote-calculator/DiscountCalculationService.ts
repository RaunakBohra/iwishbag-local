/**
 * Discount Calculation Service
 * Handles component-based discount application, promotional codes, and savings calculation
 * Decomposed from SimplifiedQuoteCalculator for better separation of concerns
 */

import { logger } from '@/utils/logger';
import { DiscountService } from '@/services/DiscountService';
import { DiscountLoggingService } from '@/services/DiscountLoggingService';

export interface DiscountCalculationRequest {
  componentName: 'customs' | 'shipping' | 'handling' | 'delivery' | 'taxes' | 'items' | 'total';
  componentValue: number;
  destinationCountry: string;
  customerId?: string;
  quoteId?: string;
  discountCodes?: string[];
  isFirstOrder?: boolean;
  orderValue?: number;
  itemCategories?: string[];
  shippingMethod?: string;
  paymentMethod?: string;
}

export interface DiscountCalculationResult {
  original_amount: number;
  discount_amount: number;
  final_amount: number;
  discounts_applied: Array<{
    source: string;
    type: 'percentage' | 'fixed' | 'free';
    value: number;
    amount: number;
    description: string;
    code?: string;
  }>;
  total_savings: number;
  savings_percentage: number;
}

export interface QuoteDiscountsRequest {
  itemsSubtotal: number;
  shippingCost: number;
  customsDuty: number;
  handlingFee: number;
  deliveryCost: number;
  taxAmount: number;
  totalAmount: number;
  destinationCountry: string;
  customerId?: string;
  quoteId?: string;
  discountCodes?: string[];
  isFirstOrder?: boolean;
  itemCategories?: string[];
  shippingMethod?: string;
  paymentMethod?: string;
}

export interface QuoteDiscountsResult {
  components: {
    items: DiscountCalculationResult;
    shipping: DiscountCalculationResult;
    customs: DiscountCalculationResult;
    handling: DiscountCalculationResult;
    delivery: DiscountCalculationResult;
    taxes: DiscountCalculationResult;
  };
  order_level: DiscountCalculationResult;
  total_original: number;
  total_discounted: number;
  total_savings: number;
  overall_savings_percentage: number;
}

export interface PromotionalDiscount {
  code: string;
  type: 'percentage' | 'fixed' | 'free_shipping' | 'bogo';
  value: number;
  description: string;
  conditions: {
    minOrderValue?: number;
    maxDiscount?: number;
    applicableCountries?: string[];
    applicableCategories?: string[];
    firstTimeOnly?: boolean;
    validUntil?: Date;
  };
}

// Promotional discount codes (could be moved to database)
const PROMOTIONAL_DISCOUNTS: { [code: string]: PromotionalDiscount } = {
  'WELCOME10': {
    code: 'WELCOME10',
    type: 'percentage',
    value: 10,
    description: 'Welcome discount for new customers',
    conditions: { firstTimeOnly: true, minOrderValue: 50 }
  },
  'FIRST20': {
    code: 'FIRST20',
    type: 'percentage',
    value: 20,
    description: 'First order discount',
    conditions: { firstTimeOnly: true, minOrderValue: 100, maxDiscount: 50 }
  },
  'SAVE15': {
    code: 'SAVE15',
    type: 'percentage',
    value: 15,
    description: 'General savings discount',
    conditions: { minOrderValue: 75 }
  },
  'FREESHIP': {
    code: 'FREESHIP',
    type: 'free_shipping',
    value: 0,
    description: 'Free shipping on all orders',
    conditions: { minOrderValue: 50 }
  },
  'BUNDLE25': {
    code: 'BUNDLE25',
    type: 'percentage',
    value: 25,
    description: 'Bundle discount for multiple items',
    conditions: { minOrderValue: 200, maxDiscount: 100 }
  }
};

export class DiscountCalculationService {
  private discountService: DiscountService;
  private loggingService: DiscountLoggingService;
  private calculationCache = new Map<string, DiscountCalculationResult>();
  private readonly cacheTTL = 5 * 60 * 1000; // 5 minutes
  
  constructor() {
    this.discountService = DiscountService.getInstance();
    this.loggingService = DiscountLoggingService.getInstance();
    logger.info('DiscountCalculationService initialized');
  }

  /**
   * Calculate discounts for a specific component
   */
  async calculateComponentDiscount(request: DiscountCalculationRequest): Promise<DiscountCalculationResult> {
    try {
      const cacheKey = this.createCacheKey(request);
      
      // Check cache
      if (this.calculationCache.has(cacheKey)) {
        const cached = this.calculationCache.get(cacheKey)!;
        logger.debug(`Using cached discount for ${request.componentName}`);
        return cached;
      }

      const originalAmount = request.componentValue;
      let totalDiscountAmount = 0;
      const appliedDiscounts: DiscountCalculationResult['discounts_applied'] = [];

      // Get component-specific discounts from DiscountService
      try {
        const discountResult = await this.discountService.calculateComponentDiscount(
          request.componentName,
          originalAmount,
          request.destinationCountry,
          {
            customer_id: request.customerId,
            quote_id: request.quoteId,
            discount_codes: request.discountCodes,
            is_first_order: request.isFirstOrder,
            order_value: request.orderValue,
            item_categories: request.itemCategories
          }
        );

        if (discountResult.appliedDiscounts && discountResult.appliedDiscounts.length > 0) {
          for (const discount of discountResult.appliedDiscounts) {
            totalDiscountAmount += discount.discount_amount;
            appliedDiscounts.push({
              source: discount.source || 'system',
              type: discount.discount_type === 'percentage' ? 'percentage' : 'fixed',
              value: discount.discount_value,
              amount: discount.discount_amount,
              description: discount.description || `${request.componentName} discount`,
              code: discount.code
            });
          }
        }
      } catch (discountServiceError) {
        logger.warn('DiscountService calculation failed, trying promotional codes:', discountServiceError);
      }

      // Apply promotional discount codes if provided
      if (request.discountCodes && request.discountCodes.length > 0) {
        const promoDiscounts = await this.applyPromotionalCodes(
          request.discountCodes,
          originalAmount,
          request.componentName,
          {
            destinationCountry: request.destinationCountry,
            isFirstOrder: request.isFirstOrder,
            orderValue: request.orderValue,
            itemCategories: request.itemCategories
          }
        );

        totalDiscountAmount += promoDiscounts.totalDiscount;
        appliedDiscounts.push(...promoDiscounts.appliedDiscounts);
      }

      // Ensure discount doesn't exceed original amount
      totalDiscountAmount = Math.min(totalDiscountAmount, originalAmount);
      const finalAmount = Math.max(0, originalAmount - totalDiscountAmount);
      const savingsPercentage = originalAmount > 0 ? (totalDiscountAmount / originalAmount) * 100 : 0;

      const result: DiscountCalculationResult = {
        original_amount: originalAmount,
        discount_amount: totalDiscountAmount,
        final_amount: finalAmount,
        discounts_applied: appliedDiscounts,
        total_savings: totalDiscountAmount,
        savings_percentage: savingsPercentage
      };

      // Cache the result
      this.calculationCache.set(cacheKey, result);

      // Log the discount application
      if (totalDiscountAmount > 0) {
        await this.loggingService.logDiscountApplication({
          component: request.componentName,
          originalAmount,
          discountAmount: totalDiscountAmount,
          appliedDiscounts: appliedDiscounts.map(d => d.description),
          customerId: request.customerId,
          quoteId: request.quoteId
        });
      }

      logger.info(`${request.componentName} discount calculated: $${totalDiscountAmount.toFixed(2)} (${savingsPercentage.toFixed(1)}%)`);
      return result;

    } catch (error) {
      logger.error(`Discount calculation failed for ${request.componentName}:`, error);
      
      // Return no discount on error
      return {
        original_amount: request.componentValue,
        discount_amount: 0,
        final_amount: request.componentValue,
        discounts_applied: [],
        total_savings: 0,
        savings_percentage: 0
      };
    }
  }

  /**
   * Calculate discounts for all quote components
   */
  async calculateQuoteDiscounts(request: QuoteDiscountsRequest): Promise<QuoteDiscountsResult> {
    try {
      // Calculate component-specific discounts in parallel
      const [
        itemsDiscount,
        shippingDiscount,
        customsDiscount,
        handlingDiscount,
        deliveryDiscount,
        taxesDiscount
      ] = await Promise.all([
        this.calculateComponentDiscount({
          componentName: 'items',
          componentValue: request.itemsSubtotal,
          destinationCountry: request.destinationCountry,
          customerId: request.customerId,
          quoteId: request.quoteId,
          discountCodes: request.discountCodes,
          isFirstOrder: request.isFirstOrder,
          orderValue: request.totalAmount,
          itemCategories: request.itemCategories
        }),
        this.calculateComponentDiscount({
          componentName: 'shipping',
          componentValue: request.shippingCost,
          destinationCountry: request.destinationCountry,
          customerId: request.customerId,
          quoteId: request.quoteId,
          discountCodes: request.discountCodes,
          shippingMethod: request.shippingMethod,
          orderValue: request.totalAmount
        }),
        this.calculateComponentDiscount({
          componentName: 'customs',
          componentValue: request.customsDuty,
          destinationCountry: request.destinationCountry,
          customerId: request.customerId,
          quoteId: request.quoteId,
          orderValue: request.totalAmount
        }),
        this.calculateComponentDiscount({
          componentName: 'handling',
          componentValue: request.handlingFee,
          destinationCountry: request.destinationCountry,
          customerId: request.customerId,
          quoteId: request.quoteId,
          orderValue: request.totalAmount
        }),
        this.calculateComponentDiscount({
          componentName: 'delivery',
          componentValue: request.deliveryCost,
          destinationCountry: request.destinationCountry,
          customerId: request.customerId,
          quoteId: request.quoteId,
          orderValue: request.totalAmount
        }),
        this.calculateComponentDiscount({
          componentName: 'taxes',
          componentValue: request.taxAmount,
          destinationCountry: request.destinationCountry,
          customerId: request.customerId,
          quoteId: request.quoteId,
          orderValue: request.totalAmount
        })
      ]);

      // Calculate order-level discount (applied to total after component discounts)
      const subtotalAfterComponentDiscounts = 
        itemsDiscount.final_amount +
        shippingDiscount.final_amount +
        customsDiscount.final_amount +
        handlingDiscount.final_amount +
        deliveryDiscount.final_amount +
        taxesDiscount.final_amount;

      const orderLevelDiscount = await this.calculateComponentDiscount({
        componentName: 'total',
        componentValue: subtotalAfterComponentDiscounts,
        destinationCountry: request.destinationCountry,
        customerId: request.customerId,
        quoteId: request.quoteId,
        discountCodes: request.discountCodes,
        isFirstOrder: request.isFirstOrder,
        orderValue: request.totalAmount,
        itemCategories: request.itemCategories,
        shippingMethod: request.shippingMethod,
        paymentMethod: request.paymentMethod
      });

      // Calculate totals
      const totalOriginal = request.totalAmount;
      const totalDiscounted = orderLevelDiscount.final_amount;
      const totalSavings = totalOriginal - totalDiscounted;
      const overallSavingsPercentage = totalOriginal > 0 ? (totalSavings / totalOriginal) * 100 : 0;

      const result: QuoteDiscountsResult = {
        components: {
          items: itemsDiscount,
          shipping: shippingDiscount,
          customs: customsDiscount,
          handling: handlingDiscount,
          delivery: deliveryDiscount,
          taxes: taxesDiscount
        },
        order_level: orderLevelDiscount,
        total_original: totalOriginal,
        total_discounted: totalDiscounted,
        total_savings: totalSavings,
        overall_savings_percentage: overallSavingsPercentage
      };

      logger.info(`Quote discounts calculated: $${totalSavings.toFixed(2)} total savings (${overallSavingsPercentage.toFixed(1)}%)`);
      return result;

    } catch (error) {
      logger.error('Quote discounts calculation failed:', error);
      
      // Return zero discounts on error
      return {
        components: {
          items: this.createZeroDiscount(request.itemsSubtotal),
          shipping: this.createZeroDiscount(request.shippingCost),
          customs: this.createZeroDiscount(request.customsDuty),
          handling: this.createZeroDiscount(request.handlingFee),
          delivery: this.createZeroDiscount(request.deliveryCost),
          taxes: this.createZeroDiscount(request.taxAmount)
        },
        order_level: this.createZeroDiscount(request.totalAmount),
        total_original: request.totalAmount,
        total_discounted: request.totalAmount,
        total_savings: 0,
        overall_savings_percentage: 0
      };
    }
  }

  /**
   * Apply promotional discount codes
   */
  private async applyPromotionalCodes(
    codes: string[],
    componentValue: number,
    componentName: string,
    context: {
      destinationCountry: string;
      isFirstOrder?: boolean;
      orderValue?: number;
      itemCategories?: string[];
    }
  ): Promise<{
    totalDiscount: number;
    appliedDiscounts: DiscountCalculationResult['discounts_applied'];
  }> {
    let totalDiscount = 0;
    const appliedDiscounts: DiscountCalculationResult['discounts_applied'] = [];

    for (const code of codes) {
      const upperCode = code.toUpperCase();
      const promoDiscount = PROMOTIONAL_DISCOUNTS[upperCode];
      
      if (!promoDiscount) {
        logger.warn(`Unknown promotional code: ${code}`);
        continue;
      }

      // Check conditions
      const conditionsValid = this.validatePromotionalConditions(promoDiscount, context);
      if (!conditionsValid.valid) {
        logger.info(`Promotional code ${code} not applicable: ${conditionsValid.reason}`);
        continue;
      }

      // Calculate discount amount based on type
      let discountAmount = 0;
      
      if (promoDiscount.type === 'percentage') {
        discountAmount = componentValue * (promoDiscount.value / 100);
        
        // Apply maximum discount limit if set
        if (promoDiscount.conditions.maxDiscount) {
          discountAmount = Math.min(discountAmount, promoDiscount.conditions.maxDiscount);
        }
      } else if (promoDiscount.type === 'fixed') {
        discountAmount = Math.min(promoDiscount.value, componentValue);
      } else if (promoDiscount.type === 'free_shipping' && componentName === 'shipping') {
        discountAmount = componentValue; // Free shipping = full shipping cost
      }

      if (discountAmount > 0) {
        totalDiscount += discountAmount;
        appliedDiscounts.push({
          source: 'promotional',
          type: promoDiscount.type === 'percentage' ? 'percentage' : 
                promoDiscount.type === 'free_shipping' ? 'free' : 'fixed',
          value: promoDiscount.value,
          amount: discountAmount,
          description: promoDiscount.description,
          code: promoDiscount.code
        });

        logger.info(`Applied promotional code ${code}: $${discountAmount.toFixed(2)} discount`);
      }
    }

    return { totalDiscount, appliedDiscounts };
  }

  /**
   * Validate promotional discount conditions
   */
  private validatePromotionalConditions(
    discount: PromotionalDiscount,
    context: {
      destinationCountry: string;
      isFirstOrder?: boolean;
      orderValue?: number;
      itemCategories?: string[];
    }
  ): { valid: boolean; reason?: string } {
    const { conditions } = discount;

    // Check minimum order value
    if (conditions.minOrderValue && context.orderValue && context.orderValue < conditions.minOrderValue) {
      return { valid: false, reason: `Minimum order value $${conditions.minOrderValue} not met` };
    }

    // Check first-time only condition
    if (conditions.firstTimeOnly && !context.isFirstOrder) {
      return { valid: false, reason: 'Discount valid for first-time customers only' };
    }

    // Check country restrictions
    if (conditions.applicableCountries && !conditions.applicableCountries.includes(context.destinationCountry)) {
      return { valid: false, reason: 'Discount not available in this country' };
    }

    // Check category restrictions
    if (conditions.applicableCategories && context.itemCategories) {
      const hasApplicableCategory = context.itemCategories.some(cat => 
        conditions.applicableCategories!.includes(cat)
      );
      if (!hasApplicableCategory) {
        return { valid: false, reason: 'Discount not applicable to item categories' };
      }
    }

    // Check expiration date
    if (conditions.validUntil && conditions.validUntil < new Date()) {
      return { valid: false, reason: 'Discount code has expired' };
    }

    return { valid: true };
  }

  /**
   * Get available promotional codes for customer
   */
  getAvailablePromotionalCodes(context: {
    destinationCountry: string;
    isFirstOrder?: boolean;
    orderValue?: number;
    itemCategories?: string[];
  }): PromotionalDiscount[] {
    return Object.values(PROMOTIONAL_DISCOUNTS).filter(discount => {
      const validation = this.validatePromotionalConditions(discount, context);
      return validation.valid;
    });
  }

  /**
   * Validate discount code
   */
  async validateDiscountCode(code: string, context: {
    destinationCountry: string;
    orderValue: number;
    isFirstOrder?: boolean;
    itemCategories?: string[];
  }): Promise<{ valid: boolean; discount?: PromotionalDiscount; reason?: string }> {
    const upperCode = code.toUpperCase();
    const discount = PROMOTIONAL_DISCOUNTS[upperCode];
    
    if (!discount) {
      return { valid: false, reason: 'Invalid discount code' };
    }

    const validation = this.validatePromotionalConditions(discount, context);
    
    return {
      valid: validation.valid,
      discount: validation.valid ? discount : undefined,
      reason: validation.reason
    };
  }

  /**
   * Create zero discount result
   */
  private createZeroDiscount(amount: number): DiscountCalculationResult {
    return {
      original_amount: amount,
      discount_amount: 0,
      final_amount: amount,
      discounts_applied: [],
      total_savings: 0,
      savings_percentage: 0
    };
  }

  /**
   * Create cache key for discount calculation
   */
  private createCacheKey(request: DiscountCalculationRequest): string {
    return [
      request.componentName,
      request.componentValue,
      request.destinationCountry,
      request.customerId || 'anonymous',
      (request.discountCodes || []).sort().join(','),
      request.isFirstOrder ? 'first' : 'return',
      request.orderValue || 0
    ].join('|');
  }

  /**
   * Clear discount calculation cache
   */
  clearCache(): void {
    this.calculationCache.clear();
    logger.info('Discount calculation cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; entries: Array<{ key: string; savings: number }> } {
    const entries = Array.from(this.calculationCache.entries()).map(([key, result]) => ({
      key,
      savings: result.total_savings
    }));

    return { size: this.calculationCache.size, entries };
  }

  /**
   * Clean expired cache entries
   */
  cleanExpiredCache(): number {
    // Note: Current implementation doesn't track timestamps in cache
    // Could be enhanced to include timestamps and TTL cleanup
    logger.info('Cache cleanup not implemented for DiscountCalculationService');
    return 0;
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    this.clearCache();
    logger.info('DiscountCalculationService disposed');
  }
}

export default DiscountCalculationService;