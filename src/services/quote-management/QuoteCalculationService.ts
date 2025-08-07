/**
 * Quote Calculation Service
 * Core business logic engine for quote pricing, tax, and shipping calculations
 * Extracted from QuoteCalculatorV2 for clean service-oriented architecture
 * 
 * RESPONSIBILITIES:
 * - Pricing calculations and item cost processing
 * - Tax and customs duty calculations
 * - Shipping cost calculations and route optimization
 * - Discount and coupon code processing
 * - Currency conversion and formatting
 * - HSN code integration and customs classification
 * - Volumetric weight calculations
 * - Quote totals and breakdown generation
 */

import { logger } from '@/utils/logger';
import { simplifiedQuoteCalculator } from '@/services/SimplifiedQuoteCalculator';
import { currencyService } from '@/services/CurrencyService';
import { delhiveryService } from '@/services/DelhiveryService';
import { DynamicShippingService } from '@/services/DynamicShippingService';
import { volumetricWeightService } from '@/services/VolumetricWeightService';
import NCMService from '@/services/NCMService';

export interface QuoteItem {
  id: string;
  name: string;
  url?: string;
  quantity: number;
  unit_price_origin: number;
  weight_kg?: number;
  category?: string;
  notes?: string;
  discount_percentage?: number;
  discount_amount?: number;
  discount_type?: 'percentage' | 'amount';
  hsn_code?: string;
  use_hsn_rates?: boolean;
  valuation_preference?: 'auto' | 'product_price' | 'minimum_valuation';
  images?: string[];
  main_image?: string;
  ai_weight_suggestion?: {
    weight: number;
    confidence: number;
  };
  dimensions?: {
    length: number;
    width: number;
    height: number;
    unit?: 'cm' | 'in';
  };
  volumetric_divisor?: number;
}

export interface ShippingRoute {
  origin_country: string;
  destination_country: string;
  shipping_method: string;
  estimated_days: number;
}

export interface CalculationInputs {
  items: QuoteItem[];
  route: ShippingRoute;
  customerEmail?: string;
  customerName?: string;
  customerPhone?: string;
  deliveryAddress?: any;
  discountCode?: string;
  adminDiscounts?: {
    percentage?: number;
    amount?: number;
    reason?: string;
  };
  forceRecalculate?: boolean;
}

export interface CalculationResult {
  success: boolean;
  data?: {
    items_total: number;
    items_total_local: number;
    shipping: number;
    shipping_local: number;
    insurance: number;
    insurance_local: number;
    customs: number;
    customs_local: number;
    handling_fee: number;
    handling_fee_local: number;
    discount_total: number;
    discount_total_local: number;
    total_usd: number;
    total_local: number;
    local_currency: string;
    breakdown: any;
    shipping_options?: any[];
    tax_breakdown?: any;
    item_details?: any[];
  };
  error?: string;
  warnings?: string[];
  calculation_metadata?: {
    calculation_time: number;
    services_used: string[];
    cache_hit: boolean;
    route_optimization: boolean;
  };
}

export interface DiscountCalculation {
  item_discounts: number;
  coupon_discount: number;
  admin_discount: number;
  total_discount: number;
  discount_breakdown: {
    type: string;
    description: string;
    amount: number;
    percentage?: number;
  }[];
}

export interface TaxCalculation {
  customs_duty: number;
  import_tax: number;
  handling_charges: number;
  total_tax: number;
  tax_rate: number;
  hsn_classification?: {
    code: string;
    description: string;
    rate: number;
  };
}

export class QuoteCalculationService {
  private static instance: QuoteCalculationService;
  private calculationCache = new Map<string, { result: CalculationResult; timestamp: number }>();
  private readonly cacheTTL = 5 * 60 * 1000; // 5 minutes

  constructor() {
    logger.info('QuoteCalculationService initialized');
  }

  static getInstance(): QuoteCalculationService {
    if (!QuoteCalculationService.instance) {
      QuoteCalculationService.instance = new QuoteCalculationService();
    }
    return QuoteCalculationService.instance;
  }

  /**
   * Main calculation orchestrator
   */
  async calculateQuote(inputs: CalculationInputs): Promise<CalculationResult> {
    const startTime = Date.now();
    const calculationId = this.generateCalculationId(inputs);

    try {
      // Check cache first unless forced recalculation
      if (!inputs.forceRecalculate) {
        const cachedResult = this.getFromCache(calculationId);
        if (cachedResult) {
          logger.debug('Quote calculation cache hit');
          return {
            ...cachedResult,
            calculation_metadata: {
              ...cachedResult.calculation_metadata,
              cache_hit: true
            }
          };
        }
      }

      // Validate inputs
      const validation = this.validateCalculationInputs(inputs);
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.errors.join(', ')
        };
      }

      // Step 1: Calculate item totals and apply item-level discounts
      const itemCalculation = await this.calculateItemTotals(inputs.items);
      
      // Step 2: Calculate shipping costs
      const shippingCalculation = await this.calculateShipping(inputs.route, itemCalculation.totalWeight);
      
      // Step 3: Calculate taxes and customs
      const taxCalculation = await this.calculateTaxes(inputs.items, inputs.route, itemCalculation.itemsTotal);
      
      // Step 4: Apply discounts and coupons
      const discountCalculation = await this.calculateDiscounts(inputs, itemCalculation.itemsTotal);
      
      // Step 5: Calculate final totals
      const finalCalculation = await this.calculateFinalTotals({
        itemCalculation,
        shippingCalculation,
        taxCalculation,
        discountCalculation,
        route: inputs.route
      });

      const result: CalculationResult = {
        success: true,
        data: finalCalculation,
        calculation_metadata: {
          calculation_time: Date.now() - startTime,
          services_used: ['SimplifiedQuoteCalculator', 'CurrencyService', 'ShippingService', 'TaxService'],
          cache_hit: false,
          route_optimization: shippingCalculation.optimized
        }
      };

      // Cache the result
      this.setCache(calculationId, result);
      
      logger.info(`Quote calculation completed in ${Date.now() - startTime}ms`);
      return result;

    } catch (error) {
      logger.error('Quote calculation failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown calculation error',
        calculation_metadata: {
          calculation_time: Date.now() - startTime,
          services_used: [],
          cache_hit: false,
          route_optimization: false
        }
      };
    }
  }

  /**
   * Calculate item totals with discounts and weight
   */
  private async calculateItemTotals(items: QuoteItem[]): Promise<{
    itemsTotal: number;
    itemsWithDiscounts: QuoteItem[];
    totalWeight: number;
    itemDetails: any[];
  }> {
    let itemsTotal = 0;
    let totalWeight = 0;
    const itemDetails: any[] = [];
    const itemsWithDiscounts = [...items];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      
      // Calculate item total price
      const itemPrice = item.unit_price_origin * item.quantity;
      
      // Apply item-level discounts
      let discountAmount = 0;
      if (item.discount_type === 'percentage' && item.discount_percentage) {
        discountAmount = itemPrice * (item.discount_percentage / 100);
      } else if (item.discount_type === 'amount' && item.discount_amount) {
        discountAmount = Math.min(item.discount_amount, itemPrice);
      }
      
      const finalItemPrice = itemPrice - discountAmount;
      itemsTotal += finalItemPrice;
      
      // Calculate weight (including volumetric weight if applicable)
      let itemWeight = item.weight_kg || 0;
      
      if (item.dimensions) {
        const volumetricWeight = await this.calculateVolumetricWeight(
          item.dimensions,
          item.volumetric_divisor || 5000
        );
        itemWeight = Math.max(itemWeight, volumetricWeight);
      }
      
      // Apply AI weight suggestion if available and no manual weight
      if (!item.weight_kg && item.ai_weight_suggestion) {
        itemWeight = item.ai_weight_suggestion.weight;
      }
      
      totalWeight += itemWeight * item.quantity;
      
      // Store item calculation details
      itemDetails.push({
        id: item.id,
        name: item.name,
        quantity: item.quantity,
        unit_price: item.unit_price_origin,
        total_price: itemPrice,
        discount_amount: discountAmount,
        final_price: finalItemPrice,
        weight: itemWeight,
        total_weight: itemWeight * item.quantity,
        hsn_code: item.hsn_code,
        valuation_method: item.valuation_preference || 'auto'
      });
      
      // Update item with calculated values
      itemsWithDiscounts[i] = {
        ...item,
        weight_kg: itemWeight
      };
    }

    return {
      itemsTotal,
      itemsWithDiscounts,
      totalWeight,
      itemDetails
    };
  }

  /**
   * Calculate shipping costs with route optimization
   */
  private async calculateShipping(route: ShippingRoute, totalWeight: number): Promise<{
    cost: number;
    method: string;
    estimatedDays: number;
    options: any[];
    optimized: boolean;
  }> {
    try {
      // Use DynamicShippingService for route optimization
      const dynamicShipping = new DynamicShippingService();
      const shippingOptions = await dynamicShipping.getShippingOptions(
        route.origin_country,
        route.destination_country,
        totalWeight
      );

      if (shippingOptions && shippingOptions.length > 0) {
        // Find the best option or use the specified method
        const selectedOption = shippingOptions.find(opt => 
          opt.method === route.shipping_method
        ) || shippingOptions[0];

        return {
          cost: selectedOption.cost,
          method: selectedOption.method,
          estimatedDays: selectedOption.estimated_days,
          options: shippingOptions,
          optimized: true
        };
      }

      // Fallback to Delhivery service for India routes
      if (route.destination_country === 'IN') {
        const delhiveryOptions = await delhiveryService.getServiceOptions(totalWeight);
        if (delhiveryOptions.length > 0) {
          const selectedOption = delhiveryOptions.find(opt => 
            opt.service_type === route.shipping_method
          ) || delhiveryOptions[0];

          return {
            cost: selectedOption.rate,
            method: selectedOption.service_type,
            estimatedDays: selectedOption.estimated_days,
            options: delhiveryOptions.map(opt => ({
              method: opt.service_type,
              cost: opt.rate,
              estimated_days: opt.estimated_days
            })),
            optimized: false
          };
        }
      }

      // Ultimate fallback - simplified calculator
      const fallbackResult = await simplifiedQuoteCalculator.calculateShipping({
        origin: route.origin_country,
        destination: route.destination_country,
        weight: totalWeight,
        method: route.shipping_method
      });

      return {
        cost: fallbackResult.cost || 0,
        method: route.shipping_method,
        estimatedDays: route.estimated_days,
        options: [],
        optimized: false
      };

    } catch (error) {
      logger.error('Shipping calculation failed:', error);
      return {
        cost: 0,
        method: route.shipping_method,
        estimatedDays: route.estimated_days,
        options: [],
        optimized: false
      };
    }
  }

  /**
   * Calculate taxes and customs duties
   */
  private async calculateTaxes(
    items: QuoteItem[],
    route: ShippingRoute,
    itemsTotal: number
  ): Promise<TaxCalculation> {
    try {
      let totalTax = 0;
      let customsDuty = 0;
      let importTax = 0;
      let handlingCharges = 0;
      let effectiveTaxRate = 0;
      let hsnClassification;

      // Use HSN-based tax calculation for supported items
      const hsnItems = items.filter(item => item.hsn_code && item.use_hsn_rates);
      
      if (hsnItems.length > 0) {
        for (const item of hsnItems) {
          try {
            const hsnData = await NCMService.getHSNData(item.hsn_code!, route.destination_country);
            if (hsnData) {
              const itemValue = item.unit_price_origin * item.quantity;
              const itemTax = itemValue * (hsnData.tax_rate / 100);
              
              totalTax += itemTax;
              customsDuty += itemValue * (hsnData.duty_rate || 0) / 100;
              
              if (!hsnClassification) {
                hsnClassification = {
                  code: item.hsn_code!,
                  description: hsnData.description,
                  rate: hsnData.tax_rate
                };
              }
            }
          } catch (error) {
            logger.warn(`HSN calculation failed for ${item.hsn_code}:`, error);
          }
        }
      }

      // Fallback to simplified calculator for remaining items
      if (totalTax === 0 || items.length > hsnItems.length) {
        const simplifiedTax = await simplifiedQuoteCalculator.calculateTaxes({
          itemsTotal,
          destination: route.destination_country,
          origin: route.origin_country
        });

        totalTax = Math.max(totalTax, simplifiedTax.totalTax || 0);
        customsDuty = Math.max(customsDuty, simplifiedTax.customsDuty || 0);
        importTax = simplifiedTax.importTax || 0;
        handlingCharges = simplifiedTax.handlingCharges || 0;
        effectiveTaxRate = simplifiedTax.taxRate || 0;
      }

      return {
        customs_duty: customsDuty,
        import_tax: importTax,
        handling_charges: handlingCharges,
        total_tax: totalTax,
        tax_rate: effectiveTaxRate,
        hsn_classification: hsnClassification
      };

    } catch (error) {
      logger.error('Tax calculation failed:', error);
      return {
        customs_duty: 0,
        import_tax: 0,
        handling_charges: 0,
        total_tax: 0,
        tax_rate: 0
      };
    }
  }

  /**
   * Calculate all applicable discounts
   */
  private async calculateDiscounts(
    inputs: CalculationInputs,
    itemsTotal: number
  ): Promise<DiscountCalculation> {
    const discountBreakdown: any[] = [];
    let itemDiscounts = 0;
    let couponDiscount = 0;
    let adminDiscount = 0;

    // Calculate item-level discounts (already calculated, but get total)
    for (const item of inputs.items) {
      const itemPrice = item.unit_price_origin * item.quantity;
      
      if (item.discount_type === 'percentage' && item.discount_percentage) {
        const discount = itemPrice * (item.discount_percentage / 100);
        itemDiscounts += discount;
        
        discountBreakdown.push({
          type: 'item_discount',
          description: `${item.discount_percentage}% off ${item.name}`,
          amount: discount,
          percentage: item.discount_percentage
        });
      } else if (item.discount_type === 'amount' && item.discount_amount) {
        const discount = Math.min(item.discount_amount, itemPrice);
        itemDiscounts += discount;
        
        discountBreakdown.push({
          type: 'item_discount',
          description: `$${item.discount_amount} off ${item.name}`,
          amount: discount
        });
      }
    }

    // Apply coupon code discount
    if (inputs.discountCode) {
      couponDiscount = await this.calculateCouponDiscount(inputs.discountCode, itemsTotal);
      
      if (couponDiscount > 0) {
        discountBreakdown.push({
          type: 'coupon_discount',
          description: `Coupon: ${inputs.discountCode}`,
          amount: couponDiscount
        });
      }
    }

    // Apply admin discounts
    if (inputs.adminDiscounts) {
      if (inputs.adminDiscounts.percentage) {
        adminDiscount = itemsTotal * (inputs.adminDiscounts.percentage / 100);
        
        discountBreakdown.push({
          type: 'admin_discount',
          description: inputs.adminDiscounts.reason || `Admin discount: ${inputs.adminDiscounts.percentage}%`,
          amount: adminDiscount,
          percentage: inputs.adminDiscounts.percentage
        });
      } else if (inputs.adminDiscounts.amount) {
        adminDiscount = Math.min(inputs.adminDiscounts.amount, itemsTotal);
        
        discountBreakdown.push({
          type: 'admin_discount',
          description: inputs.adminDiscounts.reason || `Admin discount: $${inputs.adminDiscounts.amount}`,
          amount: adminDiscount
        });
      }
    }

    return {
      item_discounts: itemDiscounts,
      coupon_discount: couponDiscount,
      admin_discount: adminDiscount,
      total_discount: itemDiscounts + couponDiscount + adminDiscount,
      discount_breakdown: discountBreakdown
    };
  }

  /**
   * Calculate final totals with currency conversion
   */
  private async calculateFinalTotals(calculations: {
    itemCalculation: any;
    shippingCalculation: any;
    taxCalculation: TaxCalculation;
    discountCalculation: DiscountCalculation;
    route: ShippingRoute;
  }): Promise<any> {
    const { itemCalculation, shippingCalculation, taxCalculation, discountCalculation, route } = calculations;
    
    // Calculate USD totals
    const subtotalUSD = itemCalculation.itemsTotal - discountCalculation.total_discount;
    const shippingUSD = shippingCalculation.cost;
    const insuranceUSD = this.calculateInsurance(subtotalUSD);
    const taxesUSD = taxCalculation.total_tax;
    const handlingUSD = taxCalculation.handling_charges;
    
    const totalUSD = subtotalUSD + shippingUSD + insuranceUSD + taxesUSD + handlingUSD;
    
    // Get local currency and convert
    const localCurrency = await currencyService.getCurrency(route.destination_country);
    const exchangeRate = await currencyService.getExchangeRate('USD', localCurrency);
    
    const convertToLocal = (usdAmount: number) => usdAmount * exchangeRate;
    
    return {
      items_total: subtotalUSD,
      items_total_local: convertToLocal(subtotalUSD),
      shipping: shippingUSD,
      shipping_local: convertToLocal(shippingUSD),
      insurance: insuranceUSD,
      insurance_local: convertToLocal(insuranceUSD),
      customs: taxesUSD,
      customs_local: convertToLocal(taxesUSD),
      handling_fee: handlingUSD,
      handling_fee_local: convertToLocal(handlingUSD),
      discount_total: discountCalculation.total_discount,
      discount_total_local: convertToLocal(discountCalculation.total_discount),
      total_usd: totalUSD,
      total_local: convertToLocal(totalUSD),
      local_currency: localCurrency,
      exchange_rate: exchangeRate,
      breakdown: {
        items: itemCalculation.itemDetails,
        shipping: {
          method: shippingCalculation.method,
          cost: shippingUSD,
          estimated_days: shippingCalculation.estimatedDays,
          options: shippingCalculation.options
        },
        taxes: taxCalculation,
        discounts: discountCalculation,
        insurance: {
          rate: 0.02, // 2% of subtotal
          amount: insuranceUSD
        }
      }
    };
  }

  /**
   * Helper methods
   */
  private async calculateVolumetricWeight(
    dimensions: { length: number; width: number; height: number; unit?: 'cm' | 'in' },
    divisor: number = 5000
  ): Promise<number> {
    try {
      return await volumetricWeightService.calculateWeight(
        dimensions.length,
        dimensions.width,
        dimensions.height,
        dimensions.unit || 'cm',
        divisor
      );
    } catch (error) {
      logger.error('Volumetric weight calculation failed:', error);
      return 0;
    }
  }

  private calculateInsurance(subtotal: number): number {
    const insuranceRate = 0.02; // 2% of subtotal
    const minInsurance = 5; // Minimum $5
    const maxInsurance = 200; // Maximum $200
    
    const insurance = subtotal * insuranceRate;
    return Math.max(minInsurance, Math.min(maxInsurance, insurance));
  }

  private async calculateCouponDiscount(couponCode: string, itemsTotal: number): Promise<number> {
    // This would integrate with a coupon service
    // For now, implement basic coupon logic
    const couponRates: Record<string, number> = {
      'WELCOME10': 0.10,
      'SAVE5': 0.05,
      'BULK15': 0.15,
      'FIRST20': 0.20
    };

    const rate = couponRates[couponCode.toUpperCase()];
    if (rate) {
      return itemsTotal * rate;
    }

    return 0;
  }

  private validateCalculationInputs(inputs: CalculationInputs): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!inputs.items || inputs.items.length === 0) {
      errors.push('At least one item is required');
    }

    if (!inputs.route) {
      errors.push('Shipping route is required');
    } else {
      if (!inputs.route.origin_country) errors.push('Origin country is required');
      if (!inputs.route.destination_country) errors.push('Destination country is required');
    }

    for (const item of inputs.items) {
      if (!item.name) errors.push(`Item name is required for item ${item.id}`);
      if (!item.unit_price_origin || item.unit_price_origin <= 0) {
        errors.push(`Valid price is required for item ${item.name}`);
      }
      if (!item.quantity || item.quantity <= 0) {
        errors.push(`Valid quantity is required for item ${item.name}`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  private generateCalculationId(inputs: CalculationInputs): string {
    const key = JSON.stringify({
      items: inputs.items.map(i => ({ 
        id: i.id, 
        price: i.unit_price_origin, 
        quantity: i.quantity, 
        weight: i.weight_kg,
        hsn: i.hsn_code
      })),
      route: inputs.route,
      discountCode: inputs.discountCode,
      adminDiscounts: inputs.adminDiscounts
    });
    
    return this.hashString(key);
  }

  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  private getFromCache(key: string): CalculationResult | null {
    const cached = this.calculationCache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.result;
    }
    
    if (cached) {
      this.calculationCache.delete(key);
    }
    
    return null;
  }

  private setCache(key: string, result: CalculationResult): void {
    this.calculationCache.set(key, {
      result,
      timestamp: Date.now()
    });
  }

  /**
   * Public utility methods
   */
  clearCalculationCache(): void {
    this.calculationCache.clear();
    logger.info('Calculation cache cleared');
  }

  getCacheStats(): { size: number; hitRate: number } {
    // Implementation would track cache hits/misses
    return {
      size: this.calculationCache.size,
      hitRate: 0.85 // Placeholder
    };
  }

  dispose(): void {
    this.calculationCache.clear();
    logger.info('QuoteCalculationService disposed');
  }
}

export default QuoteCalculationService;