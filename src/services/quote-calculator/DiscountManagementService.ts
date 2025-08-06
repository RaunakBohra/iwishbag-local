/**
 * Discount Management Service
 * Handles discount code validation, multi-tier calculations, and component-specific discounts
 * Decomposed from QuoteCalculatorV2 for better separation of concerns
 */

import { logger } from '@/utils/logger';
import { DiscountService, type DiscountType, type DiscountTier } from '@/services/DiscountService';
import { supabase } from '@/integrations/supabase/client';

export interface DiscountApplication {
  code: string;
  type: 'percentage' | 'fixed_amount' | 'shipping' | 'component_specific';
  value: number;
  appliedTo: string[]; // Components the discount applies to
  calculatedAmount: number;
  maxDiscount?: number;
  conditions: {
    minOrder?: number;
    maxDiscount?: number;
    applicable_to?: string;
    membership_required?: boolean;
  };
}

export interface DiscountValidationResult {
  isValid: boolean;
  discount?: DiscountApplication;
  error?: string;
  warnings?: string[];
  suggestions?: string[];
}

export interface DiscountBreakdown {
  totalDiscount: number;
  itemDiscounts: number;
  shippingDiscounts: number;
  handlingDiscounts: number;
  customsDiscounts: number;
  taxDiscounts: number;
  appliedDiscounts: DiscountApplication[];
  stackingAllowed: boolean;
}

export interface DiscountPreview {
  originalTotal: number;
  discountedTotal: number;
  totalSavings: number;
  savingsPercentage: number;
  breakdown: DiscountBreakdown;
  eligibleForAdditional: boolean;
  nextTierInfo?: {
    nextTierAt: number;
    additionalSavings: number;
    amountNeeded: number;
  };
}

export interface ComponentDiscountConfig {
  items: number;
  shipping: number;
  handling: number;
  customs: number;
  taxes: number;
  insurance: number;
  delivery: number;
}

export class DiscountManagementService {
  private discountService: DiscountService;
  private cache = new Map<string, any>();
  private readonly CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

  // Built-in discount codes for testing/demos
  private readonly BUILT_IN_DISCOUNTS: Record<string, {
    type: 'percentage' | 'fixed_amount';
    value: number;
    description: string;
    conditions: {
      minOrder?: number;
      maxDiscount?: number;
      applicable_to?: string;
    };
  }> = {
    'FIRST10': {
      type: 'percentage',
      value: 10,
      description: 'First-time customer discount',
      conditions: { maxDiscount: 50, applicable_to: 'total' }
    },
    'WELCOME5': {
      type: 'percentage',
      value: 5,
      description: 'Welcome discount',
      conditions: { applicable_to: 'total' }
    },
    'SAVE15': {
      type: 'percentage',
      value: 15,
      description: 'Save 15% on your order',
      conditions: { minOrder: 100, maxDiscount: 75, applicable_to: 'total' }
    },
    'BUNDLE20': {
      type: 'percentage',
      value: 20,
      description: 'Bundle discount for multiple items',
      conditions: { minOrder: 200, maxDiscount: 100, applicable_to: 'items' }
    },
    'FREESHIP': {
      type: 'percentage',
      value: 100,
      description: 'Free shipping',
      conditions: { minOrder: 75, applicable_to: 'shipping' }
    },
    'SAVE25': {
      type: 'fixed_amount',
      value: 25,
      description: '$25 off your order',
      conditions: { minOrder: 150, applicable_to: 'total' }
    }
  };

  constructor() {
    this.discountService = new DiscountService();
    logger.info('DiscountManagementService initialized');
  }

  /**
   * Validate discount code
   */
  async validateDiscountCode(
    code: string,
    orderTotal: number,
    customerId?: string,
    countryCode?: string
  ): Promise<DiscountValidationResult> {
    if (!code?.trim()) {
      return { isValid: false, error: 'Discount code is required' };
    }

    const normalizedCode = code.toUpperCase().trim();
    const cacheKey = `discount_validation_${normalizedCode}_${orderTotal}_${customerId}`;
    
    try {
      // Check cache first
      const cached = this.getFromCache<DiscountValidationResult>(cacheKey);
      if (cached) return cached;

      // First try built-in discounts
      const builtInDiscount = this.BUILT_IN_DISCOUNTS[normalizedCode];
      if (builtInDiscount) {
        const validation = this.validateBuiltInDiscount(builtInDiscount, orderTotal, normalizedCode);
        this.setCache(cacheKey, validation, 5 * 60 * 1000); // Cache for 5 minutes
        return validation;
      }

      // Try discount service for database discounts
      try {
        const discountType = await this.discountService.getDiscountByCode(normalizedCode);
        if (discountType && discountType.is_active) {
          const validation = await this.validateDatabaseDiscount(
            discountType,
            orderTotal,
            customerId,
            countryCode
          );
          this.setCache(cacheKey, validation);
          return validation;
        }
      } catch (error) {
        logger.warn('Database discount lookup failed:', error);
      }

      return {
        isValid: false,
        error: 'Invalid discount code',
        suggestions: ['Check the code spelling', 'Ensure the code hasn\'t expired']
      };

    } catch (error) {
      logger.error('Discount validation failed:', error);
      return {
        isValid: false,
        error: 'Failed to validate discount code',
        suggestions: ['Please try again later']
      };
    }
  }

  /**
   * Apply discount to order breakdown
   */
  applyDiscount(
    discount: DiscountApplication,
    breakdown: {
      items: number;
      shipping: number;
      handling: number;
      customs: number;
      taxes: number;
      insurance?: number;
      delivery?: number;
    }
  ): DiscountBreakdown {
    const appliedDiscounts: DiscountApplication[] = [discount];
    let itemDiscounts = 0;
    let shippingDiscounts = 0;
    let handlingDiscounts = 0;
    let customsDiscounts = 0;
    let taxDiscounts = 0;

    // Apply discount based on type and applicable components
    switch (discount.conditions.applicable_to) {
      case 'total':
        // Distribute discount proportionally across all components
        const total = breakdown.items + breakdown.shipping + breakdown.handling + 
                     breakdown.customs + breakdown.taxes;
        const discountRatio = discount.calculatedAmount / total;
        
        itemDiscounts = breakdown.items * discountRatio;
        shippingDiscounts = breakdown.shipping * discountRatio;
        handlingDiscounts = breakdown.handling * discountRatio;
        customsDiscounts = breakdown.customs * discountRatio;
        taxDiscounts = breakdown.taxes * discountRatio;
        break;

      case 'items':
        itemDiscounts = Math.min(discount.calculatedAmount, breakdown.items);
        break;

      case 'shipping':
        shippingDiscounts = Math.min(discount.calculatedAmount, breakdown.shipping);
        break;

      case 'handling':
        handlingDiscounts = Math.min(discount.calculatedAmount, breakdown.handling);
        break;

      case 'customs':
        customsDiscounts = Math.min(discount.calculatedAmount, breakdown.customs);
        break;

      case 'taxes':
        taxDiscounts = Math.min(discount.calculatedAmount, breakdown.taxes);
        break;

      default:
        // Apply to items by default
        itemDiscounts = Math.min(discount.calculatedAmount, breakdown.items);
        break;
    }

    const totalDiscount = itemDiscounts + shippingDiscounts + handlingDiscounts + 
                         customsDiscounts + taxDiscounts;

    return {
      totalDiscount,
      itemDiscounts,
      shippingDiscounts,
      handlingDiscounts,
      customsDiscounts,
      taxDiscounts,
      appliedDiscounts,
      stackingAllowed: false // Most discounts don't stack
    };
  }

  /**
   * Calculate component-specific discounts
   */
  applyComponentDiscounts(
    discountConfig: ComponentDiscountConfig,
    breakdown: {
      items: number;
      shipping: number;
      handling: number;
      customs: number;
      taxes: number;
      insurance?: number;
      delivery?: number;
    }
  ): DiscountBreakdown {
    const appliedDiscounts: DiscountApplication[] = [];

    // Calculate each component discount
    const itemDiscounts = breakdown.items * (discountConfig.items / 100);
    const shippingDiscounts = breakdown.shipping * (discountConfig.shipping / 100);
    const handlingDiscounts = breakdown.handling * (discountConfig.handling / 100);
    const customsDiscounts = breakdown.customs * (discountConfig.customs / 100);
    const taxDiscounts = breakdown.taxes * (discountConfig.taxes / 100);

    // Create discount applications for each component
    if (discountConfig.items > 0) {
      appliedDiscounts.push({
        code: 'COMPONENT_ITEMS',
        type: 'percentage',
        value: discountConfig.items,
        appliedTo: ['items'],
        calculatedAmount: itemDiscounts,
        conditions: { applicable_to: 'items' }
      });
    }

    if (discountConfig.shipping > 0) {
      appliedDiscounts.push({
        code: 'COMPONENT_SHIPPING',
        type: 'percentage',
        value: discountConfig.shipping,
        appliedTo: ['shipping'],
        calculatedAmount: shippingDiscounts,
        conditions: { applicable_to: 'shipping' }
      });
    }

    // Add other component discounts as needed...

    return {
      totalDiscount: itemDiscounts + shippingDiscounts + handlingDiscounts + 
                    customsDiscounts + taxDiscounts,
      itemDiscounts,
      shippingDiscounts,
      handlingDiscounts,
      customsDiscounts,
      taxDiscounts,
      appliedDiscounts,
      stackingAllowed: true // Component discounts can stack
    };
  }

  /**
   * Preview discount application
   */
  previewDiscount(
    discountCode: string,
    breakdown: {
      items: number;
      shipping: number;
      handling: number;
      customs: number;
      taxes: number;
      insurance?: number;
      delivery?: number;
    },
    customerId?: string
  ): Promise<DiscountPreview> {
    return new Promise(async (resolve) => {
      const originalTotal = breakdown.items + breakdown.shipping + breakdown.handling + 
                          breakdown.customs + breakdown.taxes + 
                          (breakdown.insurance || 0) + (breakdown.delivery || 0);

      // Validate discount
      const validation = await this.validateDiscountCode(discountCode, originalTotal, customerId);
      
      if (!validation.isValid || !validation.discount) {
        resolve({
          originalTotal,
          discountedTotal: originalTotal,
          totalSavings: 0,
          savingsPercentage: 0,
          breakdown: {
            totalDiscount: 0,
            itemDiscounts: 0,
            shippingDiscounts: 0,
            handlingDiscounts: 0,
            customsDiscounts: 0,
            taxDiscounts: 0,
            appliedDiscounts: [],
            stackingAllowed: false
          },
          eligibleForAdditional: false
        });
        return;
      }

      // Apply discount
      const discountBreakdown = this.applyDiscount(validation.discount, breakdown);
      const discountedTotal = originalTotal - discountBreakdown.totalDiscount;
      const savingsPercentage = (discountBreakdown.totalDiscount / originalTotal) * 100;

      // Check for next tier eligibility
      const nextTierInfo = await this.getNextTierInfo(discountCode, originalTotal);

      resolve({
        originalTotal,
        discountedTotal,
        totalSavings: discountBreakdown.totalDiscount,
        savingsPercentage,
        breakdown: discountBreakdown,
        eligibleForAdditional: false, // Would need to check against other available discounts
        nextTierInfo
      });
    });
  }

  /**
   * Get available discount suggestions
   */
  async getDiscountSuggestions(
    orderTotal: number,
    itemCount: number,
    customerId?: string,
    countryCode?: string
  ): Promise<Array<{
    code: string;
    description: string;
    estimatedSavings: number;
    conditions: string[];
    priority: number;
  }>> {
    const suggestions: Array<{
      code: string;
      description: string;
      estimatedSavings: number;
      conditions: string[];
      priority: number;
    }> = [];

    // Check built-in discounts
    for (const [code, discount] of Object.entries(this.BUILT_IN_DISCOUNTS)) {
      const meetsMinOrder = !discount.conditions.minOrder || orderTotal >= discount.conditions.minOrder;
      
      if (meetsMinOrder) {
        let estimatedSavings = 0;
        if (discount.type === 'percentage') {
          estimatedSavings = Math.min(
            orderTotal * (discount.value / 100),
            discount.conditions.maxDiscount || orderTotal
          );
        } else {
          estimatedSavings = discount.value;
        }

        const conditions = [];
        if (discount.conditions.minOrder) {
          conditions.push(`Minimum order: $${discount.conditions.minOrder}`);
        }
        if (discount.conditions.maxDiscount) {
          conditions.push(`Maximum discount: $${discount.conditions.maxDiscount}`);
        }

        suggestions.push({
          code,
          description: discount.description,
          estimatedSavings,
          conditions,
          priority: estimatedSavings > 20 ? 3 : estimatedSavings > 10 ? 2 : 1
        });
      }
    }

    // Sort by priority and estimated savings
    suggestions.sort((a, b) => b.priority - a.priority || b.estimatedSavings - a.estimatedSavings);

    return suggestions.slice(0, 5); // Return top 5 suggestions
  }

  /**
   * Get discount eligibility information
   */
  async getDiscountEligibility(
    customerId?: string,
    orderHistory?: number,
    membershipLevel?: string
  ): Promise<{
    firstTimeCustomer: boolean;
    membershipDiscounts: string[];
    volumeDiscounts: string[];
    seasonalDiscounts: string[];
  }> {
    // This would typically check against user history and membership data
    return {
      firstTimeCustomer: orderHistory === 0,
      membershipDiscounts: membershipLevel ? [`${membershipLevel.toUpperCase()}10`] : [],
      volumeDiscounts: [],
      seasonalDiscounts: []
    };
  }

  /**
   * Private helper methods
   */
  private validateBuiltInDiscount(
    discount: typeof this.BUILT_IN_DISCOUNTS[string],
    orderTotal: number,
    code: string
  ): DiscountValidationResult {
    const warnings: string[] = [];
    
    // Check minimum order
    if (discount.conditions.minOrder && orderTotal < discount.conditions.minOrder) {
      return {
        isValid: false,
        error: `Minimum order of $${discount.conditions.minOrder} required`,
        suggestions: [`Add $${discount.conditions.minOrder - orderTotal} more to qualify`]
      };
    }

    // Calculate discount amount
    let calculatedAmount = 0;
    if (discount.type === 'percentage') {
      calculatedAmount = orderTotal * (discount.value / 100);
      if (discount.conditions.maxDiscount) {
        calculatedAmount = Math.min(calculatedAmount, discount.conditions.maxDiscount);
        if (calculatedAmount === discount.conditions.maxDiscount) {
          warnings.push(`Discount capped at $${discount.conditions.maxDiscount}`);
        }
      }
    } else {
      calculatedAmount = Math.min(discount.value, orderTotal);
    }

    return {
      isValid: true,
      discount: {
        code,
        type: discount.type,
        value: discount.value,
        appliedTo: [discount.conditions.applicable_to || 'total'],
        calculatedAmount,
        maxDiscount: discount.conditions.maxDiscount,
        conditions: discount.conditions
      },
      warnings: warnings.length > 0 ? warnings : undefined
    };
  }

  private async validateDatabaseDiscount(
    discountType: DiscountType,
    orderTotal: number,
    customerId?: string,
    countryCode?: string
  ): Promise<DiscountValidationResult> {
    // Check conditions
    if (discountType.conditions.min_order && orderTotal < discountType.conditions.min_order) {
      return {
        isValid: false,
        error: `Minimum order of $${discountType.conditions.min_order} required`
      };
    }

    if (discountType.conditions.membership_required && !customerId) {
      return {
        isValid: false,
        error: 'Account required for this discount'
      };
    }

    // Calculate discount amount
    let calculatedAmount = 0;
    if (discountType.type === 'percentage') {
      calculatedAmount = orderTotal * (discountType.value / 100);
      if (discountType.conditions.max_discount) {
        calculatedAmount = Math.min(calculatedAmount, discountType.conditions.max_discount);
      }
    } else {
      calculatedAmount = Math.min(discountType.value, orderTotal);
    }

    return {
      isValid: true,
      discount: {
        code: discountType.code,
        type: discountType.type,
        value: discountType.value,
        appliedTo: discountType.applicable_components || ['total'],
        calculatedAmount,
        maxDiscount: discountType.conditions.max_discount,
        conditions: discountType.conditions
      }
    };
  }

  private async getNextTierInfo(code: string, currentTotal: number): Promise<{
    nextTierAt: number;
    additionalSavings: number;
    amountNeeded: number;
  } | undefined> {
    // Check if there are tier-based discounts for this code
    const builtInDiscount = this.BUILT_IN_DISCOUNTS[code];
    if (!builtInDiscount) return undefined;

    // For built-in discounts, check if increasing order value would increase savings
    if (builtInDiscount.conditions.maxDiscount) {
      const currentSavings = Math.min(
        currentTotal * (builtInDiscount.value / 100),
        builtInDiscount.conditions.maxDiscount
      );
      
      // If we're not at max discount, calculate next meaningful tier
      if (currentSavings < builtInDiscount.conditions.maxDiscount) {
        const nextTierAt = Math.ceil(currentTotal * 1.25); // 25% more
        const nextTierSavings = Math.min(
          nextTierAt * (builtInDiscount.value / 100),
          builtInDiscount.conditions.maxDiscount
        );
        
        return {
          nextTierAt,
          additionalSavings: nextTierSavings - currentSavings,
          amountNeeded: nextTierAt - currentTotal
        };
      }
    }

    return undefined;
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
    logger.info('DiscountManagementService disposed');
  }
}

export default DiscountManagementService;