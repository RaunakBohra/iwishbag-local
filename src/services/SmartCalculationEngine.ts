// ============================================================================
// SMART CALCULATION ENGINE - Enhanced with Multiple Shipping Options
// Replaces QuoteCalculatorService + unified-shipping-calculator + 10+ components
// Provides all shipping options with smart recommendations
// ============================================================================

import { supabase } from '@/integrations/supabase/client';
import { currencyService } from '@/services/CurrencyService';
import { calculateCustomsTier } from '@/lib/customs-tier-calculator';
import type {
  UnifiedQuote,
  ShippingOption,
  ShippingRecommendation,
  SmartSuggestion,
  CalculationData,
  OperationalData,
} from '@/types/unified-quote';

export interface EnhancedCalculationInput {
  quote: UnifiedQuote;
  preferences?: {
    speed_priority: 'low' | 'medium' | 'high';
    cost_priority: 'low' | 'medium' | 'high';
    show_all_options: boolean;
  };
}

export interface EnhancedCalculationResult {
  success: boolean;
  updated_quote: UnifiedQuote;
  shipping_options: ShippingOption[];
  smart_recommendations: ShippingRecommendation[];
  optimization_suggestions: SmartSuggestion[];
  error?: string;
}

/**
 * Smart Calculation Engine with Enhanced Shipping Options
 * Calculates all costs + provides multiple shipping options + smart recommendations
 */
export class SmartCalculationEngine {
  private static instance: SmartCalculationEngine;
  private calculationCache = new Map<string, { result: any; timestamp: number }>();
  private readonly CACHE_DURATION = 15 * 60 * 1000; // 15 minutes

  private constructor() {}

  static getInstance(): SmartCalculationEngine {
    if (!SmartCalculationEngine.instance) {
      SmartCalculationEngine.instance = new SmartCalculationEngine();
    }
    return SmartCalculationEngine.instance;
  }

  /**
   * Fast synchronous calculation for live editing (no DB calls)
   */
  calculateLiveSync(input: EnhancedCalculationInput): EnhancedCalculationResult {
    try {
      // Calculate base totals
      const itemsTotal = input.quote.items.reduce(
        (sum, item) => sum + (item.price_usd * item.quantity), 0
      );
      const totalWeight = input.quote.items.reduce(
        (sum, item) => sum + (item.weight_kg * item.quantity), 0
      );

      // Use existing shipping options from context or calculate simple shipping
      const shippingOptions = this.calculateSimpleShippingOptions({
        originCountry: input.quote.origin_country,
        destinationCountry: input.quote.destination_country,
        weight: totalWeight,
        value: itemsTotal,
      });

      // Select shipping option
      const selectedOption = this.selectOptimalShippingOption(
        shippingOptions,
        input.preferences,
        input.quote.operational_data?.shipping?.selected_option
      );

      // Fast calculation without async operations
      const calculationResult = this.calculateCompleteCostsSync({
        quote: input.quote,
        selectedShipping: selectedOption,
        itemsTotal,
        totalWeight,
      });

      return {
        success: true,
        updated_quote: calculationResult.updated_quote,
        shipping_options: shippingOptions,
        smart_recommendations: [],
        optimization_suggestions: [],
      };

    } catch (error) {
      console.error('Fast calculation error:', error);
      return {
        success: false,
        updated_quote: input.quote,
        shipping_options: [],
        smart_recommendations: [],
        optimization_suggestions: [],
        error: error instanceof Error ? error.message : 'Fast calculation failed',
      };
    }
  }

  /**
   * Main calculation with enhanced shipping options (full async version)
   */
  async calculateWithShippingOptions(input: EnhancedCalculationInput): Promise<EnhancedCalculationResult> {
    try {
      const cacheKey = this.generateCacheKey(input);
      const cached = this.getCachedResult(cacheKey);
      if (cached) return cached;

      // Calculate base totals
      const itemsTotal = input.quote.items.reduce(
        (sum, item) => sum + (item.price_usd * item.quantity), 0
      );
      const totalWeight = input.quote.items.reduce(
        (sum, item) => sum + (item.weight_kg * item.quantity), 0
      );

      // Get all available shipping options
      const shippingOptions = await this.calculateAllShippingOptions({
        originCountry: input.quote.origin_country,
        destinationCountry: input.quote.destination_country,
        weight: totalWeight,
        value: itemsTotal,
      });

      // Generate smart recommendations
      const smartRecommendations = this.generateShippingRecommendations(
        shippingOptions,
        input.preferences
      );

      // Select optimal shipping option (or use existing selection)
      const selectedOption = this.selectOptimalShippingOption(
        shippingOptions,
        input.preferences,
        input.quote.operational_data?.shipping?.selected_option
      );

      // Calculate all costs with selected shipping
      const calculationResult = await this.calculateCompleteCosts({
        quote: input.quote,
        selectedShipping: selectedOption,
        itemsTotal,
        totalWeight,
      });

      // Generate optimization suggestions
      const optimizationSuggestions = this.generateOptimizationSuggestions(
        calculationResult,
        shippingOptions,
        input.quote
      );

      const result: EnhancedCalculationResult = {
        success: true,
        updated_quote: calculationResult.updated_quote,
        shipping_options: shippingOptions,
        smart_recommendations: smartRecommendations,
        optimization_suggestions: optimizationSuggestions,
      };

      this.setCachedResult(cacheKey, result);
      return result;

    } catch (error) {
      console.error('Smart calculation error:', error);
      return {
        success: false,
        updated_quote: input.quote,
        shipping_options: [],
        smart_recommendations: [],
        optimization_suggestions: [],
        error: error instanceof Error ? error.message : 'Calculation failed',
      };
    }
  }

  /**
   * Calculate ALL available shipping options (Enhanced)
   */
  private async calculateAllShippingOptions(params: {
    originCountry: string;
    destinationCountry: string;
    weight: number;
    value: number;
  }): Promise<ShippingOption[]> {
    const options: ShippingOption[] = [];

    try {
      // Method 1: Route-specific shipping with multiple carriers
      const routeOptions = await this.getRouteSpecificOptions(params);
      options.push(...routeOptions);

      // Method 2: Country settings fallback with standard options
      if (options.length === 0) {
        const fallbackOptions = await this.getCountrySettingsOptions(params);
        options.push(...fallbackOptions);
      }

      // Method 3: Smart estimation for missing routes
      if (options.length === 0) {
        const estimatedOptions = this.getEstimatedOptions(params);
        options.push(...estimatedOptions);
      }

      // Sort by cost and add rankings
      return options
        .sort((a, b) => a.cost_usd - b.cost_usd)
        .map((option, index) => ({
          ...option,
          id: option.id || `option_${index}`,
        }));

    } catch (error) {
      console.error('Error calculating shipping options:', error);
      return this.getEstimatedOptions(params);
    }
  }

  /**
   * Get route-specific shipping options with all carriers
   */
  private async getRouteSpecificOptions(params: {
    originCountry: string;
    destinationCountry: string;
    weight: number;
    value: number;
  }): Promise<ShippingOption[]> {
    const { data: route, error } = await supabase
      .from('shipping_routes')
      .select('*')
      .eq('origin_country', params.originCountry)
      .eq('destination_country', params.destinationCountry)
      .eq('is_active', true)
      .single();

    if (error || !route) return [];

    const options: ShippingOption[] = [];

    // Process all carriers for this route
    const carriers = route.carriers as Array<{
      name: string;
      costMultiplier: number;
      days: string;
    }>;

    const deliveryOptions = route.delivery_options as Array<{
      id: string;
      name: string;
      carrier: string;
      min_days: number;
      max_days: number;
      price: number;
      active: boolean;
    }>;

    // Debug logging for route analysis
    console.log('🚢 Route Analysis:', {
      route_id: route.id,
      origin: route.origin_country,
      destination: route.destination_country,
      carriers: carriers,
      delivery_options: deliveryOptions,
      weight: params.weight,
      value: params.value,
      base_shipping_cost: route.base_shipping_cost,
      cost_per_kg: route.cost_per_kg,
      shipping_per_kg: route.shipping_per_kg
    });

    // Generate options for each carrier + delivery option combination
    for (const carrier of carriers || []) {
      const baseCost = this.calculateRouteBaseCost(route, params.weight, params.value);
      const carrierCost = baseCost * (carrier.costMultiplier || 1);

      console.log('💰 Carrier Cost Calculation:', {
        carrier: carrier.name,
        baseCost,
        costMultiplier: carrier.costMultiplier,
        finalCarrierCost: carrierCost,
        weight: params.weight,
        weightCostComponent: params.weight * (route.cost_per_kg || route.shipping_per_kg || 5)
      });

      // Standard option for this carrier (use carrier_ prefix to differentiate)
      options.push({
        id: `${route.id}_carrier_${carrier.name.toLowerCase().replace(/\s+/g, '_')}_standard`,
        carrier: carrier.name,
        name: 'Standard',
        cost_usd: Math.round(carrierCost * 100) / 100,
        days: carrier.days,
        confidence: 0.95,
        restrictions: this.getCarrierRestrictions(carrier.name, params.weight, params.value),
        tracking: true,
      });

      // Add specific delivery options for this carrier (use delivery_ prefix)
      for (const deliveryOption of deliveryOptions || []) {
        if (deliveryOption.active && deliveryOption.carrier === carrier.name) {
          const optionCost = carrierCost + (deliveryOption.price || 0);
          options.push({
            id: `${route.id}_delivery_${carrier.name.toLowerCase().replace(/\s+/g, '_')}_${deliveryOption.id}`,
            carrier: carrier.name,
            name: deliveryOption.name,
            cost_usd: Math.round(optionCost * 100) / 100,
            days: `${deliveryOption.min_days}-${deliveryOption.max_days}`,
            confidence: 0.90,
            restrictions: this.getCarrierRestrictions(carrier.name, params.weight, params.value),
            tracking: true,
          });
        }
      }
    }

    return options;
  }

  /**
   * Get country settings fallback options
   */
  private async getCountrySettingsOptions(params: {
    originCountry: string;
    destinationCountry: string;
    weight: number;
    value: number;
  }): Promise<ShippingOption[]> {
    const { data: countrySettings, error } = await supabase
      .from('country_settings')
      .select('*')
      .eq('code', params.destinationCountry)
      .single();

    if (error || !countrySettings) return [];

    const baseCost = (countrySettings.min_shipping || 25) + 
                    (params.weight * (countrySettings.additional_weight || 5));

    return [
      {
        id: 'country_standard',
        carrier: 'Standard',
        name: 'Standard Shipping',
        cost_usd: Math.round(baseCost * 100) / 100,
        days: '7-14',
        confidence: 0.80,
        restrictions: [],
        tracking: true,
      },
      {
        id: 'country_express',
        carrier: 'Express',
        name: 'Express Shipping',
        cost_usd: Math.round(baseCost * 1.5 * 100) / 100,
        days: '3-7',
        confidence: 0.75,
        restrictions: [],
        tracking: true,
      },
    ];
  }

  /**
   * Get estimated options when no data available
   */
  private getEstimatedOptions(params: {
    originCountry: string;
    destinationCountry: string;
    weight: number;
    value: number;
  }): ShippingOption[] {
    const estimatedBaseCost = 30 + (params.weight * 8) + (params.value * 0.01);

    return [
      {
        id: 'estimated_economy',
        carrier: 'Economy',
        name: 'Economy (Estimated)',
        cost_usd: Math.round(estimatedBaseCost * 0.8 * 100) / 100,
        days: '14-21',
        confidence: 0.60,
        restrictions: ['estimated_pricing'],
        tracking: false,
      },
      {
        id: 'estimated_standard',
        carrier: 'Standard',
        name: 'Standard (Estimated)',
        cost_usd: Math.round(estimatedBaseCost * 100) / 100,
        days: '7-14',
        confidence: 0.60,
        restrictions: ['estimated_pricing'],
        tracking: true,
      },
      {
        id: 'estimated_express',
        carrier: 'Express',
        name: 'Express (Estimated)',
        cost_usd: Math.round(estimatedBaseCost * 1.5 * 100) / 100,
        days: '3-7',
        confidence: 0.60,
        restrictions: ['estimated_pricing'],
        tracking: true,
      },
    ];
  }

  /**
   * Calculate route-specific base cost
   */
  private calculateRouteBaseCost(route: any, weight: number, value: number): number {
    let baseCost = route.base_shipping_cost || 25;
    const initialBaseCost = baseCost;

    // Weight-based cost
    if (route.weight_tiers && route.weight_tiers.length > 0) {
      const tier = route.weight_tiers.find((tier: any) => 
        weight >= tier.min && (tier.max === null || weight <= tier.max)
      );
      if (tier) {
        baseCost = tier.cost;
        console.log('📦 Using weight tier:', { tier, weight, newBaseCost: baseCost });
      } else {
        console.log('⚠️ No matching weight tier found for:', { weight, weight_tiers: route.weight_tiers });
      }
    } else {
      const perKgRate = route.cost_per_kg || route.shipping_per_kg || 5;
      const weightCost = weight * perKgRate;
      baseCost += weightCost;
      console.log('⚖️ Weight-based calculation:', {
        weight,
        perKgRate,
        weightCost,
        initialBaseCost,
        newBaseCost: baseCost
      });
    }

    // Value-based percentage
    if (route.cost_percentage && route.cost_percentage > 0) {
      const valueCost = value * (route.cost_percentage / 100);
      baseCost += valueCost;
      console.log('💎 Value-based calculation:', {
        value,
        percentage: route.cost_percentage,
        valueCost,
        finalBaseCost: baseCost
      });
    }

    return baseCost;
  }

  /**
   * Get carrier-specific restrictions
   */
  private getCarrierRestrictions(carrier: string, weight: number, value: number): string[] {
    const restrictions: string[] = [];

    if (weight > 30) {
      restrictions.push('heavy_package');
    }
    if (value > 1000) {
      restrictions.push('high_value');
    }
    if (carrier.toLowerCase().includes('economy')) {
      restrictions.push('limited_tracking');
    }

    return restrictions;
  }

  /**
   * Generate smart shipping recommendations
   */
  private generateShippingRecommendations(
    options: ShippingOption[],
    preferences?: EnhancedCalculationInput['preferences']
  ): ShippingRecommendation[] {
    if (options.length < 2) return [];

    const recommendations: ShippingRecommendation[] = [];
    const sortedByCost = [...options].sort((a, b) => a.cost_usd - b.cost_usd);
    const cheapest = sortedByCost[0];
    const mostExpensive = sortedByCost[sortedByCost.length - 1];

    // Cost savings recommendation
    if (mostExpensive.cost_usd - cheapest.cost_usd > 10) {
      recommendations.push({
        option_id: cheapest.id,
        reason: 'cost_savings',
        savings_usd: mostExpensive.cost_usd - cheapest.cost_usd,
        trade_off: `Delivery may take ${cheapest.days} vs ${mostExpensive.days}`,
      });
    }

    // Speed recommendation
    const fastestOption = options.find(opt => 
      opt.days.includes('3-') || opt.days.includes('2-') || opt.days.includes('1-')
    );
    if (fastestOption && preferences?.speed_priority === 'high') {
      recommendations.push({
        option_id: fastestOption.id,
        reason: 'fast_delivery',
        savings_usd: 0,
        trade_off: `Costs $${(fastestOption.cost_usd - cheapest.cost_usd).toFixed(2)} more`,
      });
    }

    // Reliability recommendation
    const mostReliable = options.find(opt => 
      opt.confidence >= 0.9 && opt.tracking && opt.restrictions.length === 0
    );
    if (mostReliable) {
      recommendations.push({
        option_id: mostReliable.id,
        reason: 'reliability',
        savings_usd: 0,
        trade_off: 'High confidence and full tracking',
      });
    }

    return recommendations;
  }

  /**
   * Select optimal shipping option
   */
  private selectOptimalShippingOption(
    options: ShippingOption[],
    preferences?: EnhancedCalculationInput['preferences'],
    currentSelection?: string
  ): ShippingOption {
    // Use current selection if valid
    if (currentSelection) {
      const existing = options.find(opt => opt.id === currentSelection);
      if (existing) return existing;
    }

    // Apply preferences
    if (preferences?.cost_priority === 'high') {
      return options.sort((a, b) => a.cost_usd - b.cost_usd)[0];
    }
    if (preferences?.speed_priority === 'high') {
      return options.sort((a, b) => {
        const aSpeed = parseInt(a.days.split('-')[0]);
        const bSpeed = parseInt(b.days.split('-')[0]);
        return aSpeed - bSpeed;
      })[0];
    }

    // Default: best balance of cost and reliability
    return options.sort((a, b) => {
      const aScore = (1 / a.cost_usd) * a.confidence;
      const bScore = (1 / b.cost_usd) * b.confidence;
      return bScore - aScore;
    })[0];
  }

  /**
   * Calculate simple shipping options without DB calls (for live editing)
   */
  private calculateSimpleShippingOptions(params: {
    originCountry: string;
    destinationCountry: string;
    weight: number;
    value: number;
  }): ShippingOption[] {
    // For live editing, use basic calculations
    let baseCost = 25; // Default base cost
    
    // Special case for Chile -> India route (hardcoded for speed)
    if (params.originCountry === 'CL' && params.destinationCountry === 'IN') {
      baseCost = 15 + (params.weight * 8); // $15 base + $8/kg
    } else {
      baseCost = 25 + (params.weight * 5); // Default calculation
    }

    return [
      {
        id: 'standard_live',
        carrier: 'Standard',
        name: 'Standard Shipping',
        cost_usd: Math.round(baseCost * 100) / 100,
        days: '7-14',
        confidence: 0.85,
        restrictions: [],
        tracking: true,
      },
      {
        id: 'express_live',
        carrier: 'Express',
        name: 'Express Shipping',
        cost_usd: Math.round(baseCost * 1.5 * 100) / 100,
        days: '3-7',
        confidence: 0.80,
        restrictions: [],
        tracking: true,
      },
    ];
  }

  /**
   * Synchronous version of calculateCompleteCosts (for live editing)
   */
  private calculateCompleteCostsSync(params: {
    quote: UnifiedQuote;
    selectedShipping: ShippingOption;
    itemsTotal: number;
    totalWeight: number;
  }): { updated_quote: UnifiedQuote } {
    const { quote, selectedShipping, itemsTotal } = params;

    // Use existing exchange rate or default
    const exchangeRate = quote.calculation_data?.exchange_rate?.rate || 1.0;

    // Calculate customs using existing percentage or default
    const customsPercentage = quote.operational_data?.customs?.percentage || 10;
    const customsAmount = (itemsTotal + selectedShipping.cost_usd) * (customsPercentage / 100);

    // Calculate other costs (same logic as async version but faster)
    const salesTax = quote.calculation_data?.sales_tax_price || itemsTotal * 0.1;
    const handlingFee = quote.operational_data?.handling_charge || Math.max(5, itemsTotal * 0.02);
    const insuranceAmount = quote.operational_data?.insurance_amount || itemsTotal * 0.005;
    const paymentGatewayFee = quote.operational_data?.payment_gateway_fee || 
                             (itemsTotal + selectedShipping.cost_usd + customsAmount) * 0.029 + 0.30;

    // Calculate VAT
    const vatPercentage = quote.operational_data?.customs?.smart_tier?.vat_percentage || 0;
    const vatAmount = vatPercentage > 0 ? (itemsTotal * (vatPercentage / 100)) : 0;

    // Calculate totals
    const subtotal = itemsTotal + selectedShipping.cost_usd + customsAmount + 
                    salesTax + handlingFee + insuranceAmount + vatAmount;
    const finalTotal = subtotal + paymentGatewayFee;

    // Update quote data structures
    const updatedQuote: UnifiedQuote = {
      ...quote,
      final_total_usd: Math.round(finalTotal * 100) / 100,
      calculation_data: {
        ...quote.calculation_data,
        breakdown: {
          items_total: itemsTotal,
          shipping: selectedShipping.cost_usd,
          customs: customsAmount,
          taxes: salesTax + vatAmount,
          fees: handlingFee + insuranceAmount + paymentGatewayFee,
          discount: quote.calculation_data?.breakdown?.discount || 0,
        },
        exchange_rate: {
          rate: exchangeRate,
          source: 'cached',
          confidence: 0.90,
        },
      },
      operational_data: {
        ...quote.operational_data,
        shipping: {
          ...quote.operational_data?.shipping,
          selected_option: selectedShipping.id,
        },
        handling_charge: handlingFee,
        insurance_amount: insuranceAmount,
        payment_gateway_fee: paymentGatewayFee,
        vat_amount: vatAmount,
      },
      optimization_score: this.calculateOptimizationScore(finalTotal, itemsTotal),
    };

    return { updated_quote: updatedQuote };
  }

  /**
   * Calculate complete costs with selected shipping
   */
  private async calculateCompleteCosts(params: {
    quote: UnifiedQuote;
    selectedShipping: ShippingOption;
    itemsTotal: number;
    totalWeight: number;
  }): Promise<{ updated_quote: UnifiedQuote }> {
    const { quote, selectedShipping, itemsTotal } = params;

    // Get exchange rate
    const exchangeRate = await currencyService.getExchangeRate(
      quote.origin_country,
      quote.destination_country
    );

    // Calculate customs using smart tier calculator
    let customsPercentage = 10; // Default fallback
    let customsTierInfo = null;
    
    try {
      // Calculate total weight for customs calculation
      const totalWeight = quote.items.reduce((sum, item) => 
        sum + (item.weight_kg * item.quantity), 0
      );
      
      // Use smart customs tier calculation
      customsTierInfo = await calculateCustomsTier(
        quote.origin_country,
        quote.destination_country,
        itemsTotal,
        totalWeight
      );
      
      customsPercentage = customsTierInfo.customs_percentage;
      console.log(`🎯 Smart customs: ${customsPercentage}% (tier: ${customsTierInfo.applied_tier?.rule_name || 'default'})`);
      
    } catch (error) {
      console.warn('⚠️ Smart customs tier calculation failed, using manual/default:', error);
      // Fallback to manual percentage or default
      customsPercentage = quote.operational_data.customs?.percentage || 10;
    }
    
    const customsAmount = (itemsTotal + selectedShipping.cost_usd) * (customsPercentage / 100);

    // Calculate taxes and fees (aligned with live calculator)
    const salesTax = itemsTotal * 0.1; // Standard 10% rate
    const handlingFee = Math.max(5, itemsTotal * 0.02);
    const insuranceAmount = itemsTotal * 0.005;
    const paymentGatewayFee = (itemsTotal + selectedShipping.cost_usd + customsAmount) * 0.029 + 0.30;

    // Calculate VAT (if applicable) - use smart tier VAT percentage
    const vatPercentage = customsTierInfo?.vat_percentage || 0;
    const vatAmount = vatPercentage > 0 ? (itemsTotal * (vatPercentage / 100)) : 0;

    // Calculate totals (including VAT in subtotal like live calculator)
    const subtotal = itemsTotal + selectedShipping.cost_usd + customsAmount + 
                    salesTax + handlingFee + insuranceAmount + vatAmount;
    const finalTotal = subtotal + paymentGatewayFee;

    // Update quote data structures
    const updatedCalculationData: CalculationData = {
      ...quote.calculation_data,
      breakdown: {
        items_total: itemsTotal,
        shipping: selectedShipping.cost_usd,
        customs: customsAmount,
        taxes: salesTax + vatAmount, // Include VAT in taxes like live calculator
        fees: handlingFee + insuranceAmount + paymentGatewayFee,
        discount: 0,
      },
      exchange_rate: {
        rate: exchangeRate,
        source: 'currency_service',
        confidence: 0.95,
      },
    };

    const updatedOperationalData: OperationalData = {
      ...quote.operational_data,
      shipping: {
        ...quote.operational_data.shipping,
        selected_option: selectedShipping.id,
      },
      customs: {
        ...quote.operational_data.customs,
        percentage: customsPercentage,
        smart_tier: customsTierInfo ? {
          tier_name: customsTierInfo.applied_tier?.rule_name || 'default',
          tier_id: customsTierInfo.applied_tier?.id || null,
          fallback_used: customsTierInfo.fallback_used,
          route: customsTierInfo.route,
          vat_percentage: customsTierInfo.vat_percentage,
        } : null,
      },
      // Add operational data to match live calculator structure
      domestic_shipping: quote.operational_data?.domestic_shipping || 0,
      handling_charge: handlingFee,
      insurance_amount: insuranceAmount,
      payment_gateway_fee: paymentGatewayFee,
      vat_amount: vatAmount,
    };

    const updatedQuote: UnifiedQuote = {
      ...quote,
      final_total_usd: Math.round(finalTotal * 100) / 100,
      calculation_data: updatedCalculationData,
      operational_data: updatedOperationalData,
      optimization_score: this.calculateOptimizationScore(finalTotal, itemsTotal),
    };

    return { updated_quote: updatedQuote };
  }

  /**
   * Generate optimization suggestions
   */
  private generateOptimizationSuggestions(
    calculationResult: { updated_quote: UnifiedQuote },
    shippingOptions: ShippingOption[],
    originalQuote: UnifiedQuote
  ): SmartSuggestion[] {
    const suggestions: SmartSuggestion[] = [];

    // Shipping optimization
    const currentShipping = shippingOptions.find(opt => 
      opt.id === calculationResult.updated_quote.operational_data.shipping.selected_option
    );
    const cheapestShipping = shippingOptions.sort((a, b) => a.cost_usd - b.cost_usd)[0];

    if (currentShipping && cheapestShipping && currentShipping.id !== cheapestShipping.id) {
      const savings = currentShipping.cost_usd - cheapestShipping.cost_usd;
      if (savings > 5) {
        suggestions.push({
          id: crypto.randomUUID(),
          type: 'shipping',
          message: `Switch to ${cheapestShipping.carrier} ${cheapestShipping.name} to save $${savings.toFixed(2)}`,
          action: 'switch_shipping',
          confidence: 0.85,
          potential_impact: {
            cost_change: -savings,
            time_change: `Delivery: ${cheapestShipping.days}`,
          },
        });
      }
    }

    // Customs optimization
    const customsTier = calculationResult.updated_quote.operational_data.customs?.smart_tier;
    if (customsTier) {
      if (customsTier.fallback_used) {
        suggestions.push({
          id: crypto.randomUUID(),
          type: 'customs',
          message: `Using fallback customs rate. Consider configuring specific tiers for ${customsTier.route} route.`,
          confidence: 0.60,
          potential_impact: {
            cost_change: 0,
            time_change: 'Better accuracy',
          },
        });
      } else {
        suggestions.push({
          id: crypto.randomUUID(),
          type: 'customs',
          message: `Applied smart customs tier: ${customsTier.tier_name} (${calculationResult.updated_quote.operational_data.customs?.percentage}%)`,
          confidence: 0.90,
          potential_impact: {
            cost_change: 0,
            time_change: 'Accurate calculation',
          },
        });
      }
    }

    // Weight optimization
    const averageWeight = originalQuote.items.reduce((sum, item) => sum + item.weight_kg, 0) / originalQuote.items.length;
    if (averageWeight < 0.5) {
      suggestions.push({
        id: crypto.randomUUID(),
        type: 'weight',
        message: 'Item weights seem low. Verify weights to ensure accurate shipping costs.',
        confidence: 0.70,
        potential_impact: {
          accuracy_improvement: 0.25,
        },
      });
    }

    return suggestions;
  }

  /**
   * Calculate optimization score
   */
  private calculateOptimizationScore(finalTotal: number, itemsTotal: number): number {
    const overhead = finalTotal - itemsTotal;
    const overheadPercentage = (overhead / itemsTotal) * 100;
    
    // Score from 0-100, where lower overhead = higher score
    if (overheadPercentage < 20) return 90 + (20 - overheadPercentage) / 2;
    if (overheadPercentage < 40) return 70 + (40 - overheadPercentage);
    if (overheadPercentage < 60) return 50 + (60 - overheadPercentage) / 2;
    return Math.max(0, 40 - (overheadPercentage - 60) / 2);
  }

  /**
   * Cache management
   */
  private generateCacheKey(input: EnhancedCalculationInput): string {
    const keyData = {
      quote_id: input.quote.id,
      items: input.quote.items.map(item => ({
        price: item.price_usd,
        weight: item.weight_kg,
        quantity: item.quantity,
      })),
      countries: `${input.quote.origin_country}-${input.quote.destination_country}`,
      preferences: input.preferences,
    };
    return btoa(JSON.stringify(keyData)).slice(0, 32);
  }

  private getCachedResult(key: string): EnhancedCalculationResult | null {
    const cached = this.calculationCache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.result;
    }
    this.calculationCache.delete(key);
    return null;
  }

  private setCachedResult(key: string, result: EnhancedCalculationResult): void {
    this.calculationCache.set(key, { result, timestamp: Date.now() });
  }
}

// Export singleton instance
export const smartCalculationEngine = SmartCalculationEngine.getInstance();