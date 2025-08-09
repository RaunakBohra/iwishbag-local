/**
 * Quote Calculation Engine
 * Handles all calculation logic and service coordination for quotes
 */

import { logger } from '@/utils/logger';
import { simplifiedQuoteCalculator } from '@/services/SimplifiedQuoteCalculator';
import { delhiveryService, type DelhiveryServiceOption } from '@/services/DelhiveryService';
import { currencyService } from '@/services/CurrencyService';
import { volumetricWeightService } from '@/services/VolumetricWeightService';
import { productIntelligenceService } from '@/services/ProductIntelligenceService';
import { DynamicShippingService } from '@/services/DynamicShippingService';
import NCMService from '@/services/NCMService';
import { QuoteFormData, QuoteItem } from './QuoteFormState';

export interface CalculationResult {
  success: boolean;
  data?: QuoteCalculationData;
  error?: string;
  warnings?: string[];
  processingTime?: number;
}

export interface QuoteCalculationData {
  // Basic totals
  items_subtotal: number;
  total_quote_origincurrency: number;
  total_quote_origincurrency: number;
  
  // Breakdown components
  shipping_cost: number;
  insurance_cost: number;
  customs_duty: number;
  local_tax_amount: number;
  payment_gateway_fee: number;
  service_fee: number;
  
  // Applied rates
  applied_rates: {
    shipping_rate_per_kg: number;
    insurance_percentage: number;
    customs_percentage: number;
    local_tax_percentage: number;
    payment_gateway_percentage: number;
    payment_gateway_fixed: number;
    exchange_rate: number;
  };
  
  // Input data
  inputs: {
    origin_country: string;
    destination_country: string;
    destination_state: string;
    shipping_method: string;
    payment_gateway: string;
    customer_currency: string;
    total_weight_kg: number;
    total_volumetric_weight_kg?: number;
    total_chargeable_weight_kg: number;
    exchange_rate: number;
  };
  
  // Discount information
  discounts?: {
    order_discount: number;
    shipping_discount: number;
    component_discounts: number;
    total_discount: number;
    applied_codes: string[];
  };
  
  // Shipping details
  shipping_details?: {
    service_type: string;
    estimated_delivery: string;
    tracking_available: boolean;
    domestic_delivery?: number;
    delhivery_rates?: any;
    ncm_rates?: any;
  };
  
  // Calculation metadata
  calculation_steps: any;
  timestamp: Date;
  version: string;
}

export interface CalculationOptions {
  includeDiscounts?: boolean;
  includeInsurance?: boolean;
  validateInputs?: boolean;
  enableCaching?: boolean;
  forceRecalculation?: boolean;
  includeShippingDetails?: boolean;
  includeVolumetricWeight?: boolean;
}

export class QuoteCalculationEngine {
  private readonly version = '2.0.0';
  private calculationCache = new Map<string, CalculationResult>();
  private readonly cacheTimeout = 5 * 60 * 1000; // 5 minutes

  constructor() {
    logger.info('QuoteCalculationEngine initialized');
  }

  /**
   * Main calculation method
   */
  async calculateQuote(formData: QuoteFormData, options: CalculationOptions = {}): Promise<CalculationResult> {
    const startTime = Date.now();
    
    try {
      // Validate inputs if requested
      if (options.validateInputs !== false) {
        const validation = this.validateCalculationInputs(formData);
        if (!validation.isValid) {
          return {
            success: false,
            error: validation.errors.join(', '),
            processingTime: Date.now() - startTime
          };
        }
      }

      // Check cache if enabled
      if (options.enableCaching !== false && !options.forceRecalculation) {
        const cacheKey = this.generateCacheKey(formData, options);
        const cached = this.calculationCache.get(cacheKey);
        if (cached && this.isCacheValid(cached)) {
          logger.debug('Using cached calculation result');
          return cached;
        }
      }

      // Perform calculations
      const calculationData = await this.performCalculations(formData, options);
      
      const result: CalculationResult = {
        success: true,
        data: calculationData,
        processingTime: Date.now() - startTime
      };

      // Cache result if enabled
      if (options.enableCaching !== false) {
        const cacheKey = this.generateCacheKey(formData, options);
        this.calculationCache.set(cacheKey, result);
      }

      logger.info('Quote calculation completed', {
        totalUSD: calculationData.total_quote_origincurrency,
        processingTime: result.processingTime
      });

      return result;

    } catch (error) {
      logger.error('Quote calculation error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Calculation failed',
        processingTime: Date.now() - startTime
      };
    }
  }

  /**
   * Perform the actual calculations
   */
  private async performCalculations(formData: QuoteFormData, options: CalculationOptions): Promise<QuoteCalculationData> {
    // Step 1: Calculate item subtotal and weights
    const itemsSubtotal = this.calculateItemsSubtotal(formData.items);
    const totalWeight = this.calculateTotalWeight(formData.items);
    
    // Step 2: Calculate volumetric weight if enabled
    let totalVolumetricWeight = 0;
    if (options.includeVolumetricWeight !== false) {
      totalVolumetricWeight = this.calculateVolumetricWeight(formData.items);
    }
    
    // Step 3: Determine chargeable weight
    const chargeableWeight = Math.max(totalWeight, totalVolumetricWeight);
    
    // Step 4: Get exchange rate
    const exchangeRate = await this.getExchangeRate(formData.originCountry, formData.customerCurrency);
    
    // Step 5: Calculate shipping costs
    const shippingResult = await this.calculateShippingCosts(formData, chargeableWeight);
    
    // Step 6: Calculate taxes and duties
    const taxResult = this.calculateTaxesAndDuties(formData, itemsSubtotal);
    
    // Step 7: Calculate insurance
    const insuranceCost = options.includeInsurance !== false && formData.insuranceEnabled 
      ? this.calculateInsurance(itemsSubtotal) : 0;
    
    // Step 8: Calculate payment gateway fees
    const paymentGatewayFee = this.calculatePaymentGatewayFee(formData, itemsSubtotal);
    
    // Step 9: Calculate discounts if enabled
    const discountResult = options.includeDiscounts !== false 
      ? this.calculateDiscounts(formData, itemsSubtotal, shippingResult.cost) : null;
    
    // Step 10: Calculate final totals
    const totalBeforeDiscounts = itemsSubtotal + shippingResult.cost + insuranceCost + 
                                 taxResult.customsDuty + taxResult.localTax + paymentGatewayFee;
    
    const totalDiscount = discountResult?.total_discount || 0;
    const totalUSD = Math.max(0, totalBeforeDiscounts - totalDiscount);
    const totalCustomerCurrency = totalUSD * exchangeRate;

    // Step 11: Build calculation data
    const calculationData: QuoteCalculationData = {
      items_subtotal: itemsSubtotal,
      total_quote_origincurrency: totalUSD,
      total_quote_origincurrency: totalCustomerCurrency,
      
      shipping_cost: shippingResult.cost,
      insurance_cost: insuranceCost,
      customs_duty: taxResult.customsDuty,
      local_tax_amount: taxResult.localTax,
      payment_gateway_fee: paymentGatewayFee,
      service_fee: 0, // Can be added later if needed
      
      applied_rates: {
        shipping_rate_per_kg: shippingResult.ratePerKg,
        insurance_percentage: formData.insuranceEnabled ? 2.0 : 0,
        customs_percentage: taxResult.customsPercentage,
        local_tax_percentage: taxResult.localTaxPercentage,
        payment_gateway_percentage: 2.9, // Default, can be dynamic
        payment_gateway_fixed: 0.30,
        exchange_rate: exchangeRate
      },
      
      inputs: {
        origin_country: formData.originCountry,
        destination_country: formData.destinationCountry,
        destination_state: formData.destinationState,
        shipping_method: formData.shippingMethod,
        payment_gateway: formData.paymentGateway,
        customer_currency: formData.customerCurrency,
        total_weight_kg: totalWeight,
        total_volumetric_weight_kg: totalVolumetricWeight > 0 ? totalVolumetricWeight : undefined,
        total_chargeable_weight_kg: chargeableWeight,
        exchange_rate: exchangeRate
      },
      
      discounts: discountResult,
      shipping_details: options.includeShippingDetails !== false ? shippingResult.details : undefined,
      calculation_steps: this.buildCalculationSteps(formData, shippingResult, taxResult, discountResult),
      timestamp: new Date(),
      version: this.version
    };

    return calculationData;
  }

  /**
   * Calculate items subtotal
   */
  private calculateItemsSubtotal(items: QuoteItem[]): number {
    return items.reduce((sum, item) => {
      const itemTotal = item.unit_price_origin * item.quantity;
      
      // Apply item-level discounts
      if (item.discount_type === 'percentage' && item.discount_percentage) {
        return sum + (itemTotal * (1 - item.discount_percentage / 100));
      } else if (item.discount_type === 'amount' && item.discount_amount) {
        return sum + Math.max(0, itemTotal - item.discount_amount);
      }
      
      return sum + itemTotal;
    }, 0);
  }

  /**
   * Calculate total weight
   */
  private calculateTotalWeight(items: QuoteItem[]): number {
    return items.reduce((sum, item) => {
      return sum + ((item.weight_kg || 0) * item.quantity);
    }, 0);
  }

  /**
   * Calculate volumetric weight
   */
  private calculateVolumetricWeight(items: QuoteItem[]): number {
    return items.reduce((sum, item) => {
      if (item.volumetric_weight_kg) {
        return sum + (item.volumetric_weight_kg * item.quantity);
      }
      
      // Calculate from dimensions if available
      if (item.dimensions) {
        const volumetric = volumetricWeightService.calculateVolumetricWeight(
          item.dimensions.length,
          item.dimensions.width,
          item.dimensions.height,
          item.dimensions.unit
        );
        return sum + (volumetric * item.quantity);
      }
      
      return sum;
    }, 0);
  }

  /**
   * Get exchange rate
   */
  private async getExchangeRate(originCountry: string, customerCurrency: string): Promise<number> {
    try {
      // Get origin currency from country
      const originCurrency = currencyService.getCountryCurrency(originCountry) || 'USD';
      
      if (originCurrency === customerCurrency) {
        return 1.0;
      }
      
      const rate = await currencyService.getExchangeRateByCurrency(originCurrency, customerCurrency);
      return rate || 1.0;
      
    } catch (error) {
      logger.warn('Exchange rate fetch failed, using default', error);
      return 1.0;
    }
  }

  /**
   * Calculate shipping costs
   */
  private async calculateShippingCosts(formData: QuoteFormData, weight: number): Promise<{
    cost: number;
    ratePerKg: number;
    details?: any;
  }> {
    try {
      // Use simplified quote calculator for basic shipping
      const shippingRate = await simplifiedQuoteCalculator.getShippingRate(
        formData.originCountry,
        formData.destinationCountry,
        formData.shippingMethod
      );
      
      const baseCost = weight * shippingRate;
      
      // Get additional service-specific costs
      let additionalCosts = 0;
      const serviceDetails: any = {};
      
      // Add Delhivery costs for India
      if (formData.destinationCountry === 'IN' && formData.destinationPincode) {
        try {
          const delhiveryRates = await delhiveryService.calculateShippingCost({
            origin_pincode: '110001', // Default Delhi pincode
            destination_pincode: formData.destinationPincode,
            weight_kg: weight,
            cod_enabled: false,
            service_type: formData.delhiveryServiceType
          });
          
          if (delhiveryRates.success && delhiveryRates.rates.length > 0) {
            const selectedRate = delhiveryRates.rates.find(r => r.service_type === formData.delhiveryServiceType) 
                                || delhiveryRates.rates[0];
            additionalCosts += selectedRate.total_cost;
            serviceDetails.delhivery_rates = delhiveryRates;
          }
        } catch (error) {
          logger.warn('Delhivery rate calculation failed:', error);
        }
      }
      
      // Add NCM costs for Nepal
      if (formData.destinationCountry === 'NP' && formData.selectedNCMBranch) {
        try {
          const ncmRates = await NCMService.calculateShippingCost(
            weight,
            formData.selectedNCMBranch,
            formData.ncmServiceType
          );
          
          if (ncmRates && ncmRates.total_cost) {
            additionalCosts += ncmRates.total_cost;
            serviceDetails.ncm_rates = ncmRates;
          }
        } catch (error) {
          logger.warn('NCM rate calculation failed:', error);
        }
      }
      
      const totalCost = baseCost + additionalCosts;
      
      return {
        cost: totalCost,
        ratePerKg: shippingRate,
        details: serviceDetails
      };
      
    } catch (error) {
      logger.error('Shipping cost calculation failed:', error);
      
      // Fallback to basic rate
      const fallbackRate = this.getFallbackShippingRate(formData.originCountry, formData.destinationCountry);
      return {
        cost: weight * fallbackRate,
        ratePerKg: fallbackRate
      };
    }
  }

  /**
   * Calculate taxes and duties
   */
  private calculateTaxesAndDuties(formData: QuoteFormData, subtotal: number): {
    customsDuty: number;
    localTax: number;
    customsPercentage: number;
    localTaxPercentage: number;
  } {
    try {
      const taxInfo = simplifiedQuoteCalculator.getTaxInfo(formData.destinationCountry);
      
      const customsPercentage = taxInfo.customs_duty_percentage || 0;
      const localTaxPercentage = taxInfo.local_tax_percentage || 0;
      
      const customsDuty = subtotal * (customsPercentage / 100);
      const taxableAmount = subtotal + customsDuty;
      const localTax = taxableAmount * (localTaxPercentage / 100);
      
      return {
        customsDuty,
        localTax,
        customsPercentage,
        localTaxPercentage
      };
      
    } catch (error) {
      logger.error('Tax calculation failed:', error);
      return {
        customsDuty: 0,
        localTax: 0,
        customsPercentage: 0,
        localTaxPercentage: 0
      };
    }
  }

  /**
   * Calculate insurance cost
   */
  private calculateInsurance(subtotal: number): number {
    // Standard 2% insurance on item value
    return subtotal * 0.02;
  }

  /**
   * Calculate payment gateway fees
   */
  private calculatePaymentGatewayFee(formData: QuoteFormData, subtotal: number): number {
    // Basic calculation - can be enhanced with gateway-specific rates
    const percentage = 2.9; // 2.9%
    const fixed = 0.30; // $0.30
    
    return (subtotal * percentage / 100) + fixed;
  }

  /**
   * Calculate discounts
   */
  private calculateDiscounts(formData: QuoteFormData, subtotal: number, shippingCost: number): {
    order_discount: number;
    shipping_discount: number;
    component_discounts: number;
    total_discount: number;
    applied_codes: string[];
  } {
    let orderDiscount = 0;
    let shippingDiscount = 0;
    const componentDiscounts = 0;
    const appliedCodes: string[] = [];

    // Order discount
    if (formData.orderDiscountValue > 0) {
      if (formData.orderDiscountType === 'percentage') {
        orderDiscount = subtotal * (formData.orderDiscountValue / 100);
      } else {
        orderDiscount = Math.min(formData.orderDiscountValue, subtotal);
      }
      
      if (formData.orderDiscountCode) {
        appliedCodes.push(formData.orderDiscountCode);
      }
    }

    // Shipping discount
    if (formData.shippingDiscountValue > 0) {
      if (formData.shippingDiscountType === 'free') {
        shippingDiscount = shippingCost;
      } else if (formData.shippingDiscountType === 'percentage') {
        shippingDiscount = shippingCost * (formData.shippingDiscountValue / 100);
      } else {
        shippingDiscount = Math.min(formData.shippingDiscountValue, shippingCost);
      }
    }

    // Component discounts (from discount codes)
    if (formData.applyComponentDiscounts && formData.discountCodes.length > 0) {
      // This would integrate with a discount service
      // For now, just track the codes
      appliedCodes.push(...formData.discountCodes);
    }

    const totalDiscount = orderDiscount + shippingDiscount + componentDiscounts;

    return {
      order_discount: orderDiscount,
      shipping_discount: shippingDiscount,
      component_discounts: componentDiscounts,
      total_discount: totalDiscount,
      applied_codes: appliedCodes
    };
  }

  /**
   * Build detailed calculation steps for debugging
   */
  private buildCalculationSteps(
    formData: QuoteFormData,
    shippingResult: any,
    taxResult: any,
    discountResult: any
  ): any {
    return {
      items_subtotal: this.calculateItemsSubtotal(formData.items),
      shipping_cost: shippingResult.cost,
      insurance_cost: formData.insuranceEnabled ? this.calculateInsurance(this.calculateItemsSubtotal(formData.items)) : 0,
      customs_duty: taxResult.customsDuty,
      local_tax_amount: taxResult.localTax,
      discounts: discountResult,
      delhivery_rates: shippingResult.details?.delhivery_rates,
      ncm_rates: shippingResult.details?.ncm_rates
    };
  }

  /**
   * Validation methods
   */
  private validateCalculationInputs(formData: QuoteFormData): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check required fields
    if (!formData.originCountry) errors.push('Origin country is required');
    if (!formData.destinationCountry) errors.push('Destination country is required');
    if (formData.items.length === 0) errors.push('At least one item is required');

    // Validate items
    formData.items.forEach((item, index) => {
      if (!item.name) errors.push(`Item ${index + 1}: Name is required`);
      if (item.unit_price_origin <= 0) errors.push(`Item ${index + 1}: Price must be greater than 0`);
      if (item.quantity <= 0) errors.push(`Item ${index + 1}: Quantity must be greater than 0`);
    });

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Cache management
   */
  private generateCacheKey(formData: QuoteFormData, options: CalculationOptions): string {
    const keyData = {
      items: formData.items.map(item => ({
        name: item.name,
        quantity: item.quantity,
        unit_price_origin: item.unit_price_origin,
        weight_kg: item.weight_kg
      })),
      originCountry: formData.originCountry,
      destinationCountry: formData.destinationCountry,
      shippingMethod: formData.shippingMethod,
      discounts: {
        orderDiscountType: formData.orderDiscountType,
        orderDiscountValue: formData.orderDiscountValue,
        shippingDiscountType: formData.shippingDiscountType,
        shippingDiscountValue: formData.shippingDiscountValue
      },
      options
    };

    return Buffer.from(JSON.stringify(keyData)).toString('base64').slice(0, 32);
  }

  private isCacheValid(cachedResult: CalculationResult): boolean {
    if (!cachedResult.data) return false;
    
    const age = Date.now() - cachedResult.data.timestamp.getTime();
    return age < this.cacheTimeout;
  }

  /**
   * Fallback methods
   */
  private getFallbackShippingRate(originCountry: string, destinationCountry: string): number {
    // Basic fallback rates per kg
    const fallbackRates: Record<string, number> = {
      'US-NP': 15.0,
      'US-IN': 12.0,
      'US-US': 8.0,
      'IN-NP': 5.0,
      'IN-IN': 3.0
    };

    const routeKey = `${originCountry}-${destinationCountry}`;
    return fallbackRates[routeKey] || 20.0; // Default $20/kg
  }

  /**
   * Enhanced calculation methods
   */
  
  /**
   * Calculate with AI suggestions
   */
  async calculateWithAISuggestions(formData: QuoteFormData): Promise<CalculationResult & { suggestions?: any[] }> {
    const result = await this.calculateQuote(formData);
    
    if (!result.success || !result.data) {
      return result;
    }

    // Get AI suggestions for optimization
    try {
      const suggestions = await this.getAISuggestions(formData, result.data);
      return {
        ...result,
        suggestions
      };
    } catch (error) {
      logger.warn('AI suggestions failed:', error);
      return result;
    }
  }

  private async getAISuggestions(formData: QuoteFormData, calculationData: QuoteCalculationData): Promise<any[]> {
    const suggestions: any[] = [];

    // Weight optimization suggestions
    const totalWeight = calculationData.inputs.total_weight_kg;
    if (totalWeight > 10) {
      suggestions.push({
        type: 'weight_optimization',
        message: 'Consider consolidating items to reduce shipping costs',
        potential_savings: totalWeight * 2 // Rough estimate
      });
    }

    // Shipping method suggestions
    if (formData.shippingMethod === 'express' && calculationData.shipping_cost > 100) {
      suggestions.push({
        type: 'shipping_method',
        message: 'Standard shipping could save you money with minimal time difference',
        potential_savings: calculationData.shipping_cost * 0.3
      });
    }

    // Discount opportunities
    if (!formData.orderDiscountCode && calculationData.items_subtotal > 200) {
      suggestions.push({
        type: 'discount_opportunity',
        message: 'You may be eligible for volume discounts on large orders'
      });
    }

    return suggestions;
  }

  /**
   * Real-time calculation for live updates
   */
  async calculateRealTime(formData: QuoteFormData): Promise<CalculationResult> {
    return this.calculateQuote(formData, {
      enableCaching: false,
      validateInputs: false,
      includeShippingDetails: false
    });
  }

  /**
   * Clear calculation cache
   */
  clearCache(): void {
    this.calculationCache.clear();
    logger.info('Calculation cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; hitRate: number } {
    return {
      size: this.calculationCache.size,
      hitRate: 0 // Would need to track hits/misses
    };
  }

  /**
   * Cleanup
   */
  destroy(): void {
    this.calculationCache.clear();
    logger.info('QuoteCalculationEngine destroyed');
  }
}

// Export singleton instance
export const quoteCalculationEngine = new QuoteCalculationEngine();