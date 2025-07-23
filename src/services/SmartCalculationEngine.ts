// ============================================================================
// SMART CALCULATION ENGINE - Enhanced with Multiple Shipping Options
// Replaces QuoteCalculatorService + unified-shipping-calculator + 10+ components
// Provides all shipping options with smart recommendations
// ============================================================================

import { supabase } from '@/integrations/supabase/client';
import { currencyService } from '@/services/CurrencyService';
import { calculationDefaultsService } from '@/services/CalculationDefaultsService';
import { paymentGatewayFeeService } from '@/services/PaymentGatewayFeeService';
import { calculateCustomsTier } from '@/lib/customs-tier-calculator';
import { vatService } from '@/services/VATService';
import { addBusinessDays, format } from 'date-fns';
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
   * Get customs percentage from shipping route (simple lookup)
   */
  private async getCustomsPercentageFromRoute(
    originCountry: string,
    destinationCountry: string
  ): Promise<number> {
    try {
      const { data: route, error } = await supabase
        .from('shipping_routes')
        .select('customs_percentage')
        .eq('origin_country', originCountry)
        .eq('destination_country', destinationCountry)
        .eq('is_active', true)
        .single();

      if (!error && route?.customs_percentage != null) {
        console.log(`✅ [CUSTOMS] Found shipping route customs: ${originCountry}→${destinationCountry} = ${route.customs_percentage}%`);
        return Number(route.customs_percentage);
      }
    } catch (error) {
      console.warn(`⚠️ [CUSTOMS] Failed to get customs from shipping route ${originCountry}→${destinationCountry}:`, error);
    }
    
    console.warn(`⚠️ [CUSTOMS] No customs percentage found for ${originCountry}→${destinationCountry}`);
    return 0; // No default value - must be configured
  }

  /**
   * Fast synchronous calculation for live editing (no DB calls)
   */
  calculateLiveSync(input: EnhancedCalculationInput): EnhancedCalculationResult {
    try {
      console.log('🔄 [SYNC DEBUG] calculateLiveSync called for quote:', {
        quoteId: input.quote.id,
        originCountry: input.quote.origin_country,
        destinationCountry: input.quote.destination_country,
        hasSmartTier: !!input.quote.operational_data?.customs?.smart_tier,
        smartTierVat: input.quote.operational_data?.customs?.smart_tier?.vat_percentage,
      });

      // Calculate base totals
      const itemsTotal = input.quote.items.reduce(
        (sum, item) => sum + item.costprice_origin * item.quantity,
        0,
      );
      const totalWeight = input.quote.items.reduce(
        (sum, item) => sum + item.weight_kg * item.quantity,
        0,
      );
      
      console.log('🏋️ [WEIGHT DEBUG] Total weight calculation:', {
        quoteId: input.quote.id,
        totalWeight,
        itemBreakdown: input.quote.items.map(item => ({
          name: item.name,
          weight_kg: item.weight_kg,
          quantity: item.quantity,
          totalItemWeight: item.weight_kg * item.quantity
        })),
        hasZeroWeight: totalWeight === 0,
        warningIfZero: totalWeight === 0 ? '⚠️ Zero weight detected - this will result in base-only shipping cost!' : '✅ Weight detected'
      });

      // ✅ SIMPLIFIED: Don't generate shipping options in sync mode
      // Just use the breakdown values that were passed in via the quote
      const calculationResult = this.calculateCompleteCostsSyncDirect({
        quote: input.quote,
        itemsTotal,
        totalWeight,
      });

      return {
        success: true,
        updated_quote: calculationResult.updated_quote,
        shipping_options: [], // No shipping options in sync mode
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
  async calculateWithShippingOptions(
    input: EnhancedCalculationInput,
  ): Promise<EnhancedCalculationResult> {
    try {
      const cacheKey = this.generateCacheKey(input);
      const cached = this.getCachedResult(cacheKey);
      if (cached) return cached;

      // Calculate base totals
      const itemsTotal = input.quote.items.reduce(
        (sum, item) => sum + item.costprice_origin * item.quantity,
        0,
      );
      const totalWeight = input.quote.items.reduce(
        (sum, item) => sum + item.weight_kg * item.quantity,
        0,
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
        input.preferences,
      );

      // Select optimal shipping option (or use existing selection)
      const selectedOption = this.selectOptimalShippingOption(
        shippingOptions,
        input.preferences,
        input.quote.operational_data?.shipping?.selected_option,
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
        input.quote,
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
   * Debug helper: Force fresh shipping routes data (bypass cache)
   */
  async debugFreshShippingRoutes(): Promise<void> {
    try {
      console.log('🔄 [DEBUG] Force fetching FRESH shipping routes (bypass cache)...');
      
      const { data: freshRoutes, error } = await supabase
        .from('shipping_routes')
        .select('*')
        .eq('is_active', true)
        // Add timestamp to force fresh query
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('❌ [DEBUG] Error fetching fresh routes:', error);
        return;
      }

      console.log('🔄 [DEBUG] FRESH Routes Data (just fetched from DB):', {
        fetchTime: new Date().toISOString(),
        routeCount: freshRoutes?.length || 0,
        routes: freshRoutes?.map(route => ({
          id: route.id,
          route: `${route.origin_country} → ${route.destination_country}`,
          base_cost: route.base_shipping_cost,
          per_kg: route.shipping_per_kg,
          delivery_options: route.delivery_options,
          last_updated: route.updated_at,
          last_created: route.created_at
        }))
      });
    } catch (error) {
      console.error('❌ [DEBUG] Failed to fetch fresh routes:', error);
    }
  }

  /**
   * Debug helper: List all available shipping routes in database
   */
  async debugListAllShippingRoutes(): Promise<void> {
    try {
      const { data: allRoutes, error } = await supabase
        .from('shipping_routes')
        .select('*')
        .eq('is_active', true);

      console.log('🔍 [DEBUG] All Available Shipping Routes (FULL DATABASE DATA):', {
        routeCount: allRoutes?.length || 0,
        routes: allRoutes?.map(route => ({
          id: route.id,
          route: `${route.origin_country} → ${route.destination_country}`,
          base_shipping_cost: route.base_shipping_cost,
          shipping_per_kg: route.shipping_per_kg,
          cost_per_kg: route.cost_per_kg,
          weight_tiers: route.weight_tiers,
          delivery_options_count: route.delivery_options?.length || 0,
          delivery_options_full: route.delivery_options,
          is_active: route.is_active,
          updated_at: route.updated_at,
          created_at: route.created_at
        })) || [],
        error: error ? error.message : null,
        timestamp: new Date().toISOString(),
        note: '🚨 CHECK: Are these values matching your shipping routes modal settings?'
      });
    } catch (error) {
      console.error('❌ [DEBUG] Failed to list shipping routes:', error);
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
    // 🔍 ENHANCED DEBUG: Log main calculation flow  
    console.log('🚀 [DEBUG] calculateAllShippingOptions - Starting calculation flow:', {
      originCountry: params.originCountry,
      destinationCountry: params.destinationCountry,
      weight: params.weight,
      value: params.value
    });

    // Debug: List all available routes first (check for caching issues)
    await this.debugListAllShippingRoutes();
    await this.debugFreshShippingRoutes();

    const options: ShippingOption[] = [];
    let routeOptions: ShippingOption[] = [];

    try {
      // Method 1: Route-specific shipping with multiple carriers
      console.log('🔍 [DEBUG] calculateAllShippingOptions - Method 1: Attempting route-specific options');
      routeOptions = await this.getRouteSpecificOptions(params);
      console.log('🔍 [DEBUG] calculateAllShippingOptions - Route-specific results:', {
        optionsFound: routeOptions.length,
        options: routeOptions.map(opt => ({
          id: opt.id,
          carrier: opt.carrier,
          cost: opt.cost_usd,
          name: opt.name
        }))
      });
      options.push(...routeOptions);

      // Method 2: Country settings fallback with standard options
      if (options.length === 0) {
        console.log('🔍 [DEBUG] calculateAllShippingOptions - Method 2: Attempting country settings fallback');
        const fallbackOptions = await this.getCountrySettingsOptions(params);
        console.log('🔍 [DEBUG] calculateAllShippingOptions - Country settings results:', {
          optionsFound: fallbackOptions.length
        });
        options.push(...fallbackOptions);
      }

      // Method 3: Smart estimation for missing routes
      if (options.length === 0) {
        console.log('🔍 [DEBUG] calculateAllShippingOptions - Method 3: Using estimated options as last resort');
        const estimatedOptions = this.getEstimatedOptions(params);
        console.log('🔍 [DEBUG] calculateAllShippingOptions - Estimated results:', {
          optionsFound: estimatedOptions.length
        });
        options.push(...estimatedOptions);
      }

      // Sort by cost and add rankings
      const finalOptions = options
        .sort((a, b) => a.cost_usd - b.cost_usd)
        .map((option, index) => ({
          ...option,
          id: option.id || `option_${index}`,
        }));

      // 🔍 ENHANCED DEBUG: Log final results summary
      console.log('✅ [DEBUG] calculateAllShippingOptions - Final Results Summary:', {
        totalOptionsFound: finalOptions.length,
        methodUsed: options.length > 0 ? 
          (routeOptions.length > 0 ? 'route-specific' : 'country-settings') : 
          'estimated-fallback',
        finalOptions: finalOptions.map(opt => ({
          id: opt.id,
          carrier: opt.carrier,
          name: opt.name,
          cost: opt.cost_usd,
          days: opt.days
        }))
      });

      return finalOptions;
    } catch (error) {
      console.error('❌ [ERROR] calculateAllShippingOptions - Exception occurred:', error);
      const fallbackOptions = this.getEstimatedOptions(params);
      console.log('🔍 [DEBUG] calculateAllShippingOptions - Using fallback due to error:', {
        fallbackOptionsCount: fallbackOptions.length
      });
      return fallbackOptions;
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
    // 🔍 ENHANCED DEBUG: Log exact query parameters
    console.log('🔍 [DEBUG] getRouteSpecificOptions - Query Parameters:', {
      originCountry: params.originCountry,
      destinationCountry: params.destinationCountry,
      weight: params.weight,
      value: params.value,
      timestamp: new Date().toISOString(),
      expectedQuery: `SELECT * FROM shipping_routes WHERE origin_country='${params.originCountry}' AND destination_country='${params.destinationCountry}' AND is_active=true`
    });

    const { data: route, error } = await supabase
      .from('shipping_routes')
      .select('*')
      .eq('origin_country', params.originCountry)
      .eq('destination_country', params.destinationCountry)
      .eq('is_active', true)
      .single();

    // 🔍 ENHANCED DEBUG: Log query results with full route data
    console.log('🔍 [DEBUG] getRouteSpecificOptions - Database Query Results:', {
      querySuccess: !error,
      routeFound: !!route,
      error: error ? {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      } : null,
      routeData: route ? {
        id: route.id,
        origin_country: route.origin_country,
        destination_country: route.destination_country,
        is_active: route.is_active,
        base_shipping_cost: route.base_shipping_cost,
        shipping_per_kg: route.shipping_per_kg,
        cost_per_kg: route.cost_per_kg,
        cost_percentage: route.cost_percentage,
        weight_tiers: route.weight_tiers,
        delivery_options_count: route.delivery_options?.length || 0,
        delivery_options_raw: route.delivery_options,
        exchange_rate: route.exchange_rate,
        // NEW: Debug the weight tiers specifically
        weightTierBreakdown: route.weight_tiers?.map((tier: any) => ({
          range: `${tier.min}kg - ${tier.max === null ? '∞' : tier.max + 'kg'}`,
          cost: tier.cost,
          tierData: tier
        })) || []
      } : null
    });

    if (error || !route) {
      console.log('❌ [DEBUG] getRouteSpecificOptions - No route found or error occurred, returning empty options');
      return [];
    }

    const options: ShippingOption[] = [];

    // Process all delivery options for this route (carriers field is deprecated)

    const deliveryOptions = route.delivery_options as Array<{
      id: string;
      name: string;
      carrier: string;
      min_days: number;
      max_days: number;
      price: number;
      active: boolean;
    }>;

    // Validate that route has delivery options
    if (!deliveryOptions || deliveryOptions.length === 0) {
      console.warn(`⚠️ Route ${route.origin_country}->${route.destination_country} has no delivery options configured.`);
      return [];
    }

    // Validate that at least one delivery option is active
    const activeDeliveryOptions = deliveryOptions.filter(opt => opt.active);
    if (activeDeliveryOptions.length === 0) {
      console.warn(`⚠️ Route ${route.origin_country}->${route.destination_country} has no active delivery options.`);
      return [];
    }

    // Debug logging for route analysis
    console.log('🚢 [DEBUG] Route Analysis - DELIVERY OPTIONS FROM DATABASE:', {
      route_id: route.id,
      origin: route.origin_country,
      destination: route.destination_country,
      route_updated_at: route.updated_at,
      inputParams: {
        weight: params.weight,
        value: params.value
      },
      routeBasicInfo: {
        base_shipping_cost: route.base_shipping_cost,
        shipping_per_kg: route.shipping_per_kg,
        weight_tiers: route.weight_tiers
      },
      deliveryOptionsFromDB: deliveryOptions?.map(opt => ({
        id: opt.id,
        name: opt.name,
        carrier: opt.carrier,
        price: opt.price,
        active: opt.active,
        min_days: opt.min_days,
        max_days: opt.max_days,
        full_option: opt
      })) || [],
      expectedFromModal: {
        dhl_premium_should_be: 0,
        note: '🚨 VERIFY: Does this match your modal settings?'
      }
    });

    // Generate options for each delivery option
    for (const deliveryOption of deliveryOptions || []) {
      if (!deliveryOption.active) continue; // Skip inactive options

      let baseCost: number;
      try {
        baseCost = this.calculateRouteBaseCost(route, params.weight, params.value);
      } catch (error) {
        console.error(`❌ Failed to calculate base cost for delivery option ${deliveryOption.name}:`, error);
        // Skip this delivery option if base cost calculation fails
        continue;
      }
      
      // ✅ FIXED: delivery option price is a PREMIUM on top of base cost, not absolute cost
      const deliveryPremium = deliveryOption.price || 0;
      const optionCost = baseCost + deliveryPremium;
      
      console.log('🔍 [SHIPPING COST DEBUG] Option cost breakdown:', {
        deliveryOptionName: deliveryOption.name,
        deliveryOptionCarrier: deliveryOption.carrier,
        baseCost: baseCost,
        deliveryPremium: deliveryPremium,
        finalOptionCost: optionCost,
        calculationFormula: `${baseCost} (base) + ${deliveryPremium} (premium) = ${optionCost}`,
        possibleIssue: optionCost < baseCost ? '🚨 PREMIUM IS NEGATIVE!' : '✅ Premium added correctly'
      });
      
      // Validate that we don't accidentally create zero-cost shipping
      if (optionCost <= 0) {
        console.warn(`⚠️ Zero or negative shipping cost detected for ${deliveryOption.name}: $${optionCost}. Skipping option.`);
        continue;
      }

      // 🚨 IMPORTANT NOTE FOR DEVELOPERS: All costs in ORIGIN CURRENCY
      // This delivery option calculation keeps costs in origin country currency
      // NO currency conversion applied - rates stay as configured in shipping modal
      console.log('💰 [DEBUG] Delivery Option Cost Calculation (ADDITIVE MODEL - ORIGIN CURRENCY):', {
        option: deliveryOption.name,
        carrier: deliveryOption.carrier,
        deliveryOptionRaw: deliveryOption,
        aditiveCostBreakdown: {
          routeBaseCost: route.base_shipping_cost,
          weightTierCost: route.weight_tiers?.find(t => params.weight >= t.min && (t.max === null || params.weight <= t.max))?.cost || 'N/A',
          calculatedBaseCost: baseCost,
          deliveryPremium: deliveryPremium,
          finalTotalCost: optionCost,
          roundedCost: Math.round(optionCost * 100) / 100,
          currencyNote: 'All values in origin country currency (no conversion)'
        },
        inputParameters: {
          weight: params.weight,
          value: params.value
        },
        expectedForUser: {
          description: 'For 1kg package with your settings (origin currency)',
          shouldBe: '₹1 (base) + ₹15 (tier) + ₹' + deliveryPremium + ' (premium) = ₹' + (1 + 15 + deliveryPremium),
          note: 'Currency symbol shown as example - actual currency depends on origin country'
        },
        businessRule: 'Shipping costs remain in origin currency as per business requirements',
        fullCalculation: `${route.base_shipping_cost} (route base) + tier cost + ${deliveryPremium} (${deliveryOption.name} premium) = ${optionCost} (origin currency)`,
      });

      // ✅ FIX: Calculate total delivery days including processing + customs + shipping
      const processingDays = route.processing_days || 2; // Default 2 days
      const customsClearanceDays = route.customs_clearance_days || 3; // Default 3 days
      const localDeliveryDays = 1; // Standard 1 day local delivery
      
      const totalMinDays = processingDays + deliveryOption.min_days + customsClearanceDays + localDeliveryDays;
      const totalMaxDays = processingDays + deliveryOption.max_days + customsClearanceDays + localDeliveryDays;
      
      // Calculate actual delivery dates (business days)
      const currentDate = new Date();
      const estimatedDeliveryMin = addBusinessDays(currentDate, totalMinDays);
      const estimatedDeliveryMax = addBusinessDays(currentDate, totalMaxDays);
      
      const deliveryDays = totalMinDays === totalMaxDays 
        ? `${totalMinDays} days (by ${format(estimatedDeliveryMin, 'MMM do')})`
        : `${totalMinDays}-${totalMaxDays} days (${format(estimatedDeliveryMin, 'MMM do')}-${format(estimatedDeliveryMax, 'MMM do')})`;

      console.log('📅 [DELIVERY DAYS DEBUG] Complete delivery timeline calculation:', {
        deliveryOptionName: deliveryOption.name,
        breakdown: {
          processingDays: `${processingDays} days (order processing)`,
          shippingDays: `${deliveryOption.min_days}-${deliveryOption.max_days} days (${deliveryOption.carrier} transit)`,
          customsClearance: `${customsClearanceDays} days (customs processing)`,
          localDelivery: `${localDeliveryDays} day (final delivery)`,
        },
        totalDays: deliveryDays,
        estimatedDates: {
          minDate: format(estimatedDeliveryMin, 'EEEE, MMMM do, yyyy'),
          maxDate: format(estimatedDeliveryMax, 'EEEE, MMMM do, yyyy'),
        },
        formula: `${processingDays} + ${deliveryOption.min_days}-${deliveryOption.max_days} + ${customsClearanceDays} + ${localDeliveryDays} = ${totalMinDays}-${totalMaxDays} days`
      });

      options.push({
        id: `${route.id}_delivery_${deliveryOption.id}`,
        carrier: deliveryOption.carrier,
        name: deliveryOption.name,
        cost_usd: Math.round(optionCost * 100) / 100,
        days: deliveryDays,
        confidence: 0.95,
        restrictions: this.getCarrierRestrictions(
          deliveryOption.carrier,
          params.weight,
          params.value,
        ),
        tracking: true,
        // ✅ FIX: Copy handling_charge and insurance_options from delivery option
        handling_charge: deliveryOption.handling_charge,
        insurance_options: deliveryOption.insurance_options,
      });
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

    if (error || !countrySettings) {
      console.warn(`⚠️ No country settings found for ${params.destinationCountry}. Admin must configure country-specific shipping settings.`);
      return [];
    }

    // Validate required country settings
    if (!countrySettings.min_shipping || !countrySettings.additional_weight) {
      console.warn(`⚠️ Incomplete country settings for ${params.destinationCountry}: min_shipping=${countrySettings.min_shipping}, additional_weight=${countrySettings.additional_weight}. Admin must configure complete shipping settings.`);
      return [];
    }

    const baseCost = countrySettings.min_shipping + params.weight * countrySettings.additional_weight;

    // ✅ FIX: Country fallback should also include processing + customs days
    const processingDays = 2; // Default processing time
    const customsClearanceDays = 3; // Default customs clearance time
    const shippingDays = 7; // Standard shipping estimate
    const localDeliveryDays = 1; // Local delivery
    
    const totalDays = processingDays + shippingDays + customsClearanceDays + localDeliveryDays;
    const totalMaxDays = processingDays + 14 + customsClearanceDays + localDeliveryDays; // Max case
    
    // Calculate actual delivery dates
    const currentDate = new Date();
    const estimatedDeliveryMin = addBusinessDays(currentDate, totalDays);
    const estimatedDeliveryMax = addBusinessDays(currentDate, totalMaxDays);
    
    const deliveryDays = `${totalDays}-${totalMaxDays} days (${format(estimatedDeliveryMin, 'MMM do')}-${format(estimatedDeliveryMax, 'MMM do')})`;

    console.log('🏳️ [COUNTRY FALLBACK DEBUG] Standard delivery calculation:', {
      fallbackReason: 'No specific shipping route found',
      destinationCountry: params.destinationCountry,
      breakdown: {
        processingDays: `${processingDays} days (order processing)`,
        shippingDays: `${shippingDays}-14 days (standard shipping)`,
        customsClearance: `${customsClearanceDays} days (customs processing)`,
        localDelivery: `${localDeliveryDays} day (final delivery)`,
      },
      totalDays: deliveryDays,
      estimatedDates: {
        minDate: format(estimatedDeliveryMin, 'EEEE, MMMM do, yyyy'),
        maxDate: format(estimatedDeliveryMax, 'EEEE, MMMM do, yyyy'),
      },
    });

    return [
      {
        id: `country_${params.destinationCountry.toLowerCase()}_standard`,
        carrier: 'Country Standard',
        name: 'Standard Delivery',
        cost_usd: Math.round(baseCost * 100) / 100,
        days: deliveryDays,
        confidence: 0.8,
        restrictions: ['country_fallback'],
        tracking: true,
        // ✅ FIX: Country fallback doesn't have handling/insurance config
        handling_charge: undefined,
        insurance_options: undefined,
      },
    ];
  }

  /**
   * Get estimated options when no data available - NO MORE HARDCODED ESTIMATES
   */
  private getEstimatedOptions(params: {
    originCountry: string;
    destinationCountry: string;
    weight: number;
    value: number;
  }): ShippingOption[] {
    // No more hardcoded estimates - admin must configure proper shipping routes
    console.error(`❌ No shipping route configured for ${params.originCountry} → ${params.destinationCountry}. Admin must configure shipping routes with proper pricing data.`);
    
    // Return empty array to force proper route configuration
    return [];
  }

  /**
   * Calculate route-specific base cost
   * 
   * 🚨 CRITICAL BUSINESS RULE: ALL COSTS IN ORIGIN COUNTRY CURRENCY
   * 
   * This function calculates shipping costs WITHOUT currency conversion.
   * Shipping rates configured in the modal should be used AS-IS.
   * 
   * Example: India → Nepal shipping
   * - Configuration: Base ₹1, Weight Tier ₹15, DHL Premium ₹0  
   * - Result: ₹16 INR (NO conversion to NPR)
   * 
   * @param route - Shipping route configuration 
   * @param weight - Package weight in kg
   * @param value - Package value (for percentage-based fees)
   * @returns Base shipping cost in ORIGIN COUNTRY CURRENCY (no conversion)
   */
  private calculateRouteBaseCost(route: any, weight: number, value: number): number {
    // 🚨 [DEBUG] Show EXACT route data being used for calculations
    console.log('🧮 [DEBUG] calculateRouteBaseCost - Route Data Used:', {
      route_id: route.id,
      origin_destination: `${route.origin_country} → ${route.destination_country}`,
      inputParameters: { weight, value },
      routeDataFromDB: {
        base_shipping_cost: route.base_shipping_cost,
        shipping_per_kg: route.shipping_per_kg,
        cost_per_kg: route.cost_per_kg,
        cost_percentage: route.cost_percentage,
        weight_tiers: route.weight_tiers,
        updated_at: route.updated_at
      },
      expectedFromModal: {
        base_should_be: 1,
        per_kg_should_be: 50,
        note: '🚨 COMPARE: Does DB data match your modal settings?'
      },
      weightInputs: {
        weight: weight,
        value: value,
        willCalculateWeight: weight > 0
      }
    });

    // Validate required route data
    if (!route.base_shipping_cost) {
      throw new Error(`Missing base_shipping_cost for route ${route.origin_country}->${route.destination_country}. Please configure complete shipping route data.`);
    }

    let baseCost = route.base_shipping_cost;
    const initialBaseCost = baseCost;

    // Weight-based cost calculation - ADDITIVE MODEL
    if (route.weight_tiers && route.weight_tiers.length > 0) {
      console.log('🔍 [TIER DEBUG] Weight tier matching process:', {
        weight,
        allTiers: route.weight_tiers,
        tierMatchingLogic: route.weight_tiers.map((t: any) => ({
          tier: t,
          weightMin: t.min,
          weightMax: t.max,
          matches: weight >= t.min && (t.max === null || weight <= t.max),
          reason: `${weight} >= ${t.min} AND (${t.max} === null OR ${weight} <= ${t.max})`
        }))
      });

      const tier = route.weight_tiers.find(
        (tier: any) => weight >= tier.min && (tier.max === null || weight <= tier.max),
      );
      
      console.log('🔍 [TIER DEBUG] Final tier selection:', {
        selectedTier: tier,
        weight,
        selectionLogic: tier ? 'Found matching tier' : 'No matching tier found'
      });

      if (tier) {
        // 🚀 FIXED: Tier cost is PER-KG rate, must multiply by weight
        const tierRatePerKg = tier.cost;
        const tierCost = weight * tierRatePerKg;
        baseCost += tierCost; // Add calculated tier cost to base cost
        console.log('📦 Using weight tier (CORRECTED - PER KG MODEL):', { 
          tier, 
          weight, 
          initialBaseCost,
          tierRatePerKg,
          tierCost,
          finalBaseCost: baseCost,
          calculation: `${initialBaseCost} (base) + (${weight}kg × ₹${tierRatePerKg}/kg = ₹${tierCost}) = ₹${baseCost}`,
          reasoning: 'Tier cost is per-kg rate multiplied by actual weight'
        });
      } else {
        console.warn('⚠️ No matching weight tier found, falling back to per-kg calculation:', {
          weight,
          weight_tiers: route.weight_tiers,
          fallback: 'Using base_cost + shipping_per_kg instead'
        });
        // Fallback to per-kg calculation when no tier matches
        const perKgRate = route.shipping_per_kg || route.cost_per_kg;
        if (!perKgRate || perKgRate <= 0) {
          throw new Error(`No valid weight tier found and missing shipping_per_kg for route ${route.origin_country}->${route.destination_country}. Weight: ${weight}kg`);
        }
        const weightCost = weight * perKgRate;
        baseCost += weightCost;
      }
    } else {
      // Per-kilogram calculation (additive to base cost)
      const perKgRate = route.shipping_per_kg || route.cost_per_kg;
      if (!perKgRate || perKgRate <= 0) {
        throw new Error(`Missing or invalid shipping_per_kg for route ${route.origin_country}->${route.destination_country}. Please configure weight-based pricing.`);
      }
      
      const weightCost = weight * perKgRate;
      baseCost += weightCost; // Additive model: base + (weight * rate)
      console.log('⚖️ Per-kg weight calculation (additive model):', {
        weight,
        perKgRate,
        weightCost,
        initialBaseCost,
        finalBaseCost: baseCost,
        calculation: `${initialBaseCost} (base) + ${weightCost} (weight) = ${baseCost}`
      });
    }

    // Value-based percentage
    console.log('💎 [DEBUG] Checking value-based costs:', {
      value,
      costPercentage: route.cost_percentage,
      shouldAddValueCost: !!(route.cost_percentage && route.cost_percentage > 0),
      baseCostBeforeValue: baseCost
    });
    
    if (route.cost_percentage && route.cost_percentage > 0) {
      const valueCost = value * (route.cost_percentage / 100);
      baseCost += valueCost;
      console.log('💎 Value-based calculation APPLIED:', {
        value,
        percentage: route.cost_percentage,
        valueCost,
        finalBaseCost: baseCost,
      });
    }

    // 🚨 IMPORTANT: NO CURRENCY CONVERSION FOR SHIPPING COSTS
    // 
    // BUSINESS RULE: Shipping costs should always remain in ORIGIN COUNTRY CURRENCY
    // 
    // Rationale:
    // - Shipping companies quote rates in origin country currency
    // - Modal configuration values should be used AS-IS without conversion
    // - Currency conversion creates confusion and incorrect pricing
    // - International shipping rates are standardized in origin currency
    //
    // Example: India → Nepal shipping (12kg package)
    // - Shipping rates entered in INR (Indian Rupees) 
    // - Base: ₹1, Tier: ₹45/kg × 12kg = ₹540 → Final: ₹541 INR
    // - NO conversion to NPR (Nepali Rupees) for shipping costs
    //
    // For future developers: 
    // - Do NOT apply route.exchange_rate to shipping costs
    // - Keep shipping calculations in origin currency
    // - Only convert item prices/totals for customer display if needed

    console.log('✅ [DEBUG] Shipping cost calculation (NO currency conversion):', {
      baseCostInOriginCurrency: baseCost,
      originCountry: route.origin_country,
      destinationCountry: route.destination_country,
      note: 'Shipping costs remain in origin currency as per business rules'
    });

    // 🚨 FINAL COST TRACKING (Updated with corrected per-kg tier calculation)
    console.log('🧮 [DEBUG] COMPLETE calculateRouteBaseCost breakdown (CORRECTED PER-KG MODEL):', {
      step1_routeBase: route.base_shipping_cost,
      step2_afterWeightTier: baseCost,
      step3_afterValuePercentage: baseCost,
      step4_finalCostOriginCurrency: baseCost,
      currencyConversion: 'REMOVED - shipping stays in origin currency',
      calculationModel: 'Base + (Weight × TierRate/kg) + ValuePercent = Total',
      exampleFor12kg: {
        base: route.base_shipping_cost,
        weight: weight,
        expectedTierRate: '₹45/kg for 12kg = ₹540',
        expectedTotal: route.base_shipping_cost + (weight * 45),
        actualTotal: baseCost,
        isCorrect: baseCost > 500 ? '✅ Looks correct for 12kg' : '❌ Too low - check calculation'
      }
    });

    return baseCost; // Return cost in origin country currency (no conversion)
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
    preferences?: EnhancedCalculationInput['preferences'],
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
    const fastestOption = options.find(
      (opt) => opt.days.includes('3-') || opt.days.includes('2-') || opt.days.includes('1-'),
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
    const mostReliable = options.find(
      (opt) => opt.confidence >= 0.9 && opt.tracking && opt.restrictions.length === 0,
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
    currentSelection?: string,
  ): ShippingOption {
    console.log('🎯 [DEBUG] selectOptimalShippingOption called:', {
      currentSelection,
      availableOptions: options.map((opt) => ({
        id: opt.id,
        carrier: opt.carrier,
        cost: opt.cost_usd,
      })),
      preferences,
    });

    // Use current selection if valid
    if (currentSelection) {
      const existing = options.find((opt) => opt.id === currentSelection);
      if (existing) {
        console.log('✅ [DEBUG] Using current selection:', {
          id: existing.id,
          carrier: existing.carrier,
          cost: existing.cost_usd,
        });
        return existing;
      } else {
        console.log('⚠️ [DEBUG] Current selection not found in options:', currentSelection);
      }
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
    const selected = options.sort((a, b) => {
      const aScore = (1 / a.cost_usd) * a.confidence;
      const bScore = (1 / b.cost_usd) * b.confidence;
      return bScore - aScore;
    })[0];

    console.log('🎯 [DEBUG] Final selected option:', {
      id: selected.id,
      carrier: selected.carrier,
      cost: selected.cost_usd,
    });
    return selected;
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
    // ✅ REMOVED: No more generic fallback options
    // Live calculation should use existing shipping options from the context
    // If no shipping options exist, return empty array to prevent generic fallbacks
    console.log('⚠️ [DEBUG] calculateSimpleShippingOptions called but returning empty - should use real route data');
    return [];
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

    console.log('🧮 [DEBUG] calculateCompleteCostsSync called:', {
      quoteId: quote.id,
      selectedShipping: {
        id: selectedShipping.id,
        carrier: selectedShipping.carrier,
        cost: selectedShipping.cost_usd,
      },
      storedSelectedOption: quote.operational_data?.shipping?.selected_option,
      itemsTotal,
      currentBreakdownShipping: quote.calculation_data?.breakdown?.shipping,
    });

    // Use existing exchange rate or default
    const exchangeRate = quote.calculation_data?.exchange_rate?.rate ;

    // ✅ SIMPLE FIX: Get customs percentage from shipping route or operational data
    const customsPercentage = quote.operational_data?.shipping?.route_config?.customs_percentage || 
                             quote.operational_data?.customs?.percentage || 10;

    // Calculate other costs using route-based configuration
    const salesTaxLegacy = quote.calculation_data?.breakdown?.taxes; // Keep for backward compatibility

    // ✅ TRANSPARENT TAX MODEL: Calculate purchase tax first
    const purchaseTaxRate = quote.operational_data?.purchase_tax_rate || 0;
    const purchaseTax = itemsTotal * (purchaseTaxRate / 100);
    const actualItemCost = itemsTotal + purchaseTax;

    console.log('💰 [TAX DEBUG] Purchase tax calculation (sync with shipping):', {
      quoteId: quote.id,
      baseItemsTotal: itemsTotal,
      purchaseTaxRate: purchaseTaxRate,
      purchaseTax: purchaseTax,
      actualItemCost: actualItemCost,
      explanation: `Items $${itemsTotal} + Purchase Tax $${purchaseTax} = $${actualItemCost}`
    });

    // ✅ FIXED: Calculate customs using actual item cost (including purchase tax)
    const customsAmount = (actualItemCost + selectedShipping.cost_usd) * (customsPercentage / 100);
    
    console.log('🛃 [CUSTOMS DEBUG] Customs calculation on correct base (sync with shipping):', {
      quoteId: quote.id,
      customsBase: actualItemCost + selectedShipping.cost_usd,
      customsPercentage: customsPercentage,
      customsAmount: customsAmount,
      improvement: `Now includes purchase tax in base: $${actualItemCost} + $${selectedShipping.cost_usd} = $${actualItemCost + selectedShipping.cost_usd}`
    });

    // Calculate route-based handling charge (sync version uses actual item cost)
    const handlingFee = this.calculateRouteBasedHandlingSync(selectedShipping, actualItemCost, quote);

    // Calculate route-based insurance (sync version uses actual item cost)
    const insuranceAmount = this.calculateRouteBasedInsuranceSync(
      selectedShipping,
      actualItemCost,
      quote,
    );

    // ✅ FIXED: Calculate VAT on full taxable base (destination country tax)
    // For sync method, we need to use a fallback approach since calculateCustomsTier is async
    let vatPercentage = quote.operational_data?.customs?.smart_tier?.vat_percentage || 0;
    
    // ✅ ENHANCED: Try to get VAT from shipping route if smart tier is missing
    if (vatPercentage === 0) {
      // Check if we have shipping route data with VAT configuration
      const shippingRouteVat = quote.operational_data?.shipping?.route_config?.vat_percentage;
      if (shippingRouteVat && shippingRouteVat > 0) {
        vatPercentage = shippingRouteVat;
        console.log('✅ [VAT DEBUG] Found VAT in shipping route config:', shippingRouteVat + '%');
      }
    }

    console.log('🔍 [VAT DEBUG] Sync method VAT percentage lookup:', {
      quoteId: quote.id,
      fromSmartTier: quote.operational_data?.customs?.smart_tier?.vat_percentage,
      fromShippingRoute: quote.operational_data?.shipping?.route_config?.vat_percentage,
      finalVatPercentage: vatPercentage,
      hasSmartTier: !!quote.operational_data?.customs?.smart_tier,
      hasShippingRoute: !!quote.operational_data?.shipping?.route_config,
      originCountry: quote.origin_country,
      destinationCountry: quote.destination_country
    });
    
    const vatBase = actualItemCost + selectedShipping.cost_usd + customsAmount + handlingFee + insuranceAmount;
    const vatAmount = vatPercentage > 0 ? vatBase * (vatPercentage / 100) : 0;
    
    console.log('🏛️ [VAT DEBUG] VAT calculation on correct base (sync with shipping):', {
      quoteId: quote.id,
      vatPercentage: vatPercentage,
      vatBaseComponents: {
        actualItemCost: actualItemCost,
        shipping: selectedShipping.cost_usd,
        customs: customsAmount,
        handling: handlingFee,
        insurance: insuranceAmount,
        total: vatBase
      },
      vatAmount: vatAmount,
      improvement: `VAT now calculated on full base: $${vatBase} × ${vatPercentage}% = $${vatAmount}`
    });

    // ✅ FIXED: Payment gateway fee calculated on updated base (sync version - no async calls)
    const paymentGatewayFee =
      quote.operational_data?.payment_gateway_fee ||
      (actualItemCost + selectedShipping.cost_usd + customsAmount + vatAmount) * 0.029 + 0.3;

    // ✅ TRANSPARENT MODEL: Calculate totals with separate tax components
    const subtotal =
      actualItemCost +           // Items + purchase tax combined
      (quote.merchant_shipping_price || 0) + // Merchant to hub shipping
      selectedShipping.cost_usd +
      customsAmount +
      handlingFee +
      insuranceAmount +
      vatAmount;                // Only destination VAT, no sales tax double-counting

    // Get discount amount and subtract it from final total
    const discount = quote.calculation_data?.discount || 0;
    const finalTotal = subtotal + paymentGatewayFee - discount;

    // 🔍 [DEBUG] Log breakdown shipping assignment (updated for transparent model)
    console.log('📊 [DEBUG] Transparent Tax Model Breakdown (sync with shipping):', {
      quoteId: quote.id,
      selectedShippingOption: {
        id: selectedShipping.id,
        name: selectedShipping.name,
        carrier: selectedShipping.carrier,
        cost_usd: selectedShipping.cost_usd
      },
      transparentBreakdown: {
        items_total: itemsTotal,              // Base product price
        purchase_tax: purchaseTax,            // NEW: Purchase tax (transparent)
        shipping: selectedShipping.cost_usd,  // International shipping
        customs: customsAmount,               // Customs (on actualItemCost base)
        destination_tax: vatAmount,           // Only destination VAT/GST
        fees: paymentGatewayFee,             // Payment processing
        handling: handlingFee,               // Handling charges
        insurance: insuranceAmount,          // Insurance amount
        discount: discount,                  // Applied discounts
        finalTotal: Math.round(finalTotal * 100) / 100
      },
      improvement: `Purchase tax $${purchaseTax} now transparent, VAT calculated on $${vatBase} base instead of $${itemsTotal}`
    });

    // Update quote data structures
    const updatedQuote: UnifiedQuote = {
      ...quote,
      final_total_usd: Math.round(finalTotal * 100) / 100,
      calculation_data: {
        ...quote.calculation_data,
        breakdown: {
          items_total: itemsTotal,                    // Base product price
          merchant_shipping: quote.merchant_shipping_price || 0, // Merchant to hub shipping
          purchase_tax: purchaseTax,                  // ✅ NEW: Transparent purchase tax
          shipping: selectedShipping.cost_usd,        // International shipping cost
          customs: customsAmount,                     // Customs duty (on actualItemCost base)
          destination_tax: vatAmount,                 // ✅ RENAMED: Only destination VAT/GST
          fees: paymentGatewayFee,                   // Payment processing fees
          handling: handlingFee,                     // Handling charges
          insurance: insuranceAmount,                // Insurance amount
          discount: discount,                        // Applied discounts
          // Legacy field for backward compatibility
          taxes: salesTaxLegacy,                     // Deprecated - use destination_tax instead
        },
        exchange_rate: {
          rate: exchangeRate,
          source: 'cached',
          confidence: 0.9,
        },
      },
      operational_data: {
        ...quote.operational_data,
        shipping: {
          ...quote.operational_data?.shipping,
          selected_option: selectedShipping.id,
          calculated_handling: handlingFee,
          calculated_insurance: insuranceAmount,
          route_based_calculation: true,
        },
        handling_charge: handlingFee,
        insurance_amount: insuranceAmount,
        payment_gateway_fee: paymentGatewayFee,
        vat_amount: vatAmount,
        // ✅ NEW: Track purchase tax data
        purchase_tax_amount: purchaseTax,
        purchase_tax_rate: purchaseTaxRate,
        actual_item_cost: actualItemCost, // For debugging and transparency
      },
      optimization_score: this.calculateOptimizationScore(finalTotal, itemsTotal),
    };

    console.log('💾 [DEBUG] SmartCalculationEngine operational data update (sync):', {
      quoteId: quote.id,
      updatedOperationalData: {
        handling_charge: updatedQuote.operational_data.handling_charge,
        insurance_amount: updatedQuote.operational_data.insurance_amount,
        payment_gateway_fee: updatedQuote.operational_data.payment_gateway_fee,
      },
      breakdown: updatedQuote.calculation_data.breakdown,
    });

    return { updated_quote: updatedQuote };
  }

  /**
   * Direct sync calculation without shipping option fallbacks (for live editing)
   */
  private calculateCompleteCostsSyncDirect(params: {
    quote: UnifiedQuote;
    itemsTotal: number;
    totalWeight: number;
  }): { updated_quote: UnifiedQuote } {
    const { quote, itemsTotal } = params;

    console.log('🧮 [DEBUG] calculateCompleteCostsSyncDirect called:', {
      quoteId: quote.id,
      itemsTotal,
      currentBreakdownShipping: quote.calculation_data?.breakdown?.shipping,
      useDirectValues: true,
    });

    // Use existing exchange rate or default
    const exchangeRate = quote.calculation_data?.exchange_rate?.rate || 1.0;

    // Use the shipping cost directly from the breakdown (no fallback to options)
    const shippingCost = quote.calculation_data?.breakdown?.shipping || 0;
    
    // Validate shipping cost consistency and warn of potential data issues
    if (shippingCost === 0) {
      console.warn(`⚠️ Zero shipping cost in breakdown for quote ${quote.id}. This may indicate missing shipping selection or data sync issue.`);
    }
    
    // Check if selected shipping option exists and matches breakdown cost
    const selectedOptionId = quote.operational_data?.shipping?.selected_option;
    if (selectedOptionId && shippingCost > 0) {
      console.log('✅ [DEBUG] Sync calculation using breakdown shipping:', {
        selectedOptionId,
        breakdownShippingCost: shippingCost,
        dataSource: 'calculation_data.breakdown.shipping'
      });
    }

    // ✅ TRANSPARENT TAX MODEL: Calculate purchase tax (origin country sales tax)
    const purchaseTaxRate = quote.operational_data?.purchase_tax_rate || 0;
    const purchaseTax = itemsTotal * (purchaseTaxRate / 100);
    const actualItemCost = itemsTotal + purchaseTax; // Real cost including purchase tax
    
    console.log('💰 [TAX DEBUG] Purchase tax calculation (sync):', {
      quoteId: quote.id,
      baseItemsTotal: itemsTotal,
      purchaseTaxRate: purchaseTaxRate,
      purchaseTax: purchaseTax,
      actualItemCost: actualItemCost,
      explanation: `Items $${itemsTotal} + Purchase Tax $${purchaseTax} = $${actualItemCost}`,
      // ✅ DEBUG: Check what operational_data we actually received
      receivedOperationalData: quote.operational_data,
      specificPurchaseTaxRate: quote.operational_data?.purchase_tax_rate
    });

    // ✅ SIMPLE FIX: Get customs percentage from shipping route or operational data
    const customsPercentage = quote.operational_data?.shipping?.route_config?.customs_percentage || 
                             quote.operational_data?.customs?.percentage || 10;
    const customsAmount = (actualItemCost + shippingCost) * (customsPercentage / 100);
    
    console.log('🛃 [CUSTOMS DEBUG] Customs calculation on correct base (sync):', {
      quoteId: quote.id,
      customsBase: actualItemCost + shippingCost,
      customsPercentage: customsPercentage,
      customsAmount: customsAmount,
      improvement: `Now includes purchase tax in base: $${actualItemCost} + $${shippingCost} = $${actualItemCost + shippingCost}`
    });

    // Calculate other costs using existing data - NO HARDCODED FALLBACKS
    const salesTaxLegacy = quote.calculation_data?.breakdown?.taxes || 0; // Keep for backward compatibility
    const handlingFee = quote.operational_data?.handling_charge || 0;
    const insuranceAmount = quote.operational_data?.insurance_amount || 0;
    const domesticShipping = quote.operational_data?.domestic_shipping || 0;
    const discount = quote.calculation_data?.discount || 0;

    // ✅ ENHANCED: Use VAT hierarchy (shipping_routes → country_settings) for sync calculations
    let vatPercentage = 0;
    let vatSource = 'none';
    
    // Try to get VAT from VATService hierarchy (sync fallback approach)
    if (quote.origin_country && quote.destination_country) {
      try {
        // Quick synchronous lookup attempt using pre-loaded data
        const cachedVATData = vatService.getCachedVATData(quote.origin_country, quote.destination_country);
        if (cachedVATData) {
          vatPercentage = cachedVATData.percentage;
          vatSource = cachedVATData.source;
        } else {
          // Fallback to operational data if available
          vatPercentage = quote.operational_data?.customs?.smart_tier?.vat_percentage || 0;
          vatSource = 'operational_data_fallback';
        }
      } catch (error) {
        console.warn('🚨 [VAT SYNC] Failed to get VAT from hierarchy, using fallback:', error);
        vatPercentage = quote.operational_data?.customs?.smart_tier?.vat_percentage || 0;
        vatSource = 'fallback';
      }
    }
    
    const vatBase = actualItemCost + shippingCost + customsAmount + handlingFee + insuranceAmount;
    const vatAmount = vatPercentage > 0 ? vatBase * (vatPercentage / 100) : 0;
    
    console.log('🏛️ [VAT DEBUG] VAT calculation with hierarchy (sync):', {
      quoteId: quote.id,
      route: `${quote.origin_country}→${quote.destination_country}`,
      vatPercentage: vatPercentage,
      vatSource: vatSource,
      vatBaseComponents: {
        actualItemCost: actualItemCost,
        shippingCost: shippingCost,
        customsAmount: customsAmount,
        handlingFee: handlingFee,
        insuranceAmount: insuranceAmount,
        total: vatBase
      },
      vatAmount: vatAmount,
      improvement: `VAT from ${vatSource}: $${vatBase} × ${vatPercentage}% = $${vatAmount}`
    });

    // ✅ FIXED: Payment gateway fee using centralized service (sync fallback)
    let paymentGatewayFee = quote.operational_data?.payment_gateway_fee;
    
    if (!paymentGatewayFee) {
      // For sync mode, use a cached approach or fallback to defaults
      const baseAmount = actualItemCost + shippingCost + customsAmount + vatAmount;
      
      console.log('💳 [DEBUG] Sync payment gateway fee calculation (using fallback):', {
        baseAmount,
        destinationCountry: quote.destination_country,
        note: 'Using fallback since sync mode - recommend async for accurate fees'
      });
      
      // Use hardcoded fallback for sync mode
      paymentGatewayFee = baseAmount * 0.029 + 0.3;
    }

    // ✅ TRANSPARENT MODEL: Calculate totals with separate tax components
    const subtotal =
      actualItemCost +
      (quote.merchant_shipping_price || 0) + // Merchant to hub shipping
      shippingCost +
      customsAmount +
      handlingFee +
      insuranceAmount +
      domesticShipping +
      vatAmount; // Only destination VAT, no sales tax double-counting

    const finalTotal = subtotal + paymentGatewayFee - discount;

    // Build updated quote
    const updatedQuote: UnifiedQuote = {
      ...quote,
      final_total_usd: finalTotal,
      calculation_data: {
        ...quote.calculation_data,
        breakdown: {
          items_total: itemsTotal,              // Base product price
          merchant_shipping: quote.merchant_shipping_price || 0, // Merchant to hub shipping
          purchase_tax: purchaseTax,            // ✅ NEW: Transparent purchase tax
          shipping: shippingCost,               // International shipping cost
          customs: customsAmount,               // Customs duty (on actualItemCost base)
          destination_tax: vatAmount,           // ✅ RENAMED: Only destination VAT/GST
          fees: paymentGatewayFee,             // Payment processing fees
          handling: handlingFee,               // Handling charges
          insurance: insuranceAmount,          // Insurance amount
          discount: discount,                  // Applied discounts
          // Legacy field for backward compatibility
          taxes: salesTaxLegacy,               // Deprecated - use destination_tax instead
        },
        exchange_rate: {
          rate: exchangeRate,
          source: 'direct',
        },
      },
      operational_data: {
        ...quote.operational_data,
        domestic_shipping: domesticShipping,
        handling_charge: handlingFee,
        insurance_amount: insuranceAmount,
        payment_gateway_fee: paymentGatewayFee,
        // ✅ NEW: Track purchase tax data
        purchase_tax_amount: purchaseTax,
        purchase_tax_rate: purchaseTaxRate,
        vat_amount: vatAmount,
        actual_item_cost: actualItemCost, // For debugging and transparency
      },
    };

    console.log('💾 [DEBUG] SmartCalculationEngine direct calculation result:', {
      quoteId: quote.id,
      finalTotal: updatedQuote.final_total_usd,
      breakdown: updatedQuote.calculation_data.breakdown,
      shippingUsed: shippingCost,
    });

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
      quote.destination_country,
    );

    // ✅ SIMPLE FIX: Get customs percentage directly from shipping route
    const customsPercentage = await this.getCustomsPercentageFromRoute(
      quote.origin_country, 
      quote.destination_country
    );

    // ✅ TRANSPARENT TAX MODEL: Ensure we have purchase tax calculated (may have been done above)
    const purchaseTaxRate = quote.operational_data?.purchase_tax_rate || 0;
    const purchaseTax = itemsTotal * (purchaseTaxRate / 100);
    const actualItemCost = itemsTotal + purchaseTax;
    const customsAmount = (actualItemCost + selectedShipping.cost_usd) * (customsPercentage / 100);

    console.log('💰 [TAX DEBUG] Purchase tax calculation (async):', {
      quoteId: quote.id,
      baseItemsTotal: itemsTotal,
      purchaseTaxRate: purchaseTaxRate,
      purchaseTax: purchaseTax,
      actualItemCost: actualItemCost,
      explanation: `Items $${itemsTotal} + Purchase Tax $${purchaseTax} = $${actualItemCost}`
    });

    // Calculate fees using route-based configuration
    const handlingFee = await this.calculateRouteBasedHandling(selectedShipping, actualItemCost, quote);
    const insuranceAmount = await this.calculateRouteBasedInsurance(
      selectedShipping,
      actualItemCost,
      quote,
    );

    // ✅ ENHANCED: Use new VATService with hierarchical lookup (shipping_routes → country_settings)
    const taxData = await vatService.getTaxData(quote.origin_country!, quote.destination_country!);
    const vatPercentage = taxData.vat.percentage;
    const vatBase = actualItemCost + selectedShipping.cost_usd + customsAmount + handlingFee + insuranceAmount;
    const vatAmount = vatPercentage > 0 ? vatBase * (vatPercentage / 100) : 0;
    
    console.log('🏛️ [VAT DEBUG] VAT calculation with new hierarchy (async):', {
      quoteId: quote.id,
      vatSource: taxData.vat.source,
      vatPercentage: vatPercentage,
      vatConfidence: taxData.vat.confidence,
      vatBaseComponents: {
        actualItemCost: actualItemCost,
        shipping: selectedShipping.cost_usd,
        customs: customsAmount,
        handling: handlingFee,
        insurance: insuranceAmount,
        total: vatBase
      },
      vatAmount: vatAmount,
      improvement: `VAT hierarchy: ${taxData.vat.source} → ${vatPercentage}% on $${vatBase} = $${vatAmount}`
    });

    // ✅ FIXED: Payment gateway fee using centralized service
    let paymentGatewayFee: number;
    
    try {
      const baseAmount = actualItemCost + selectedShipping.cost_usd + customsAmount + vatAmount;
      const feeCalculation = await paymentGatewayFeeService.calculatePaymentGatewayFee(
        baseAmount,
        quote.destination_country
      );
      paymentGatewayFee = feeCalculation.calculatedAmount;
      
      console.log('💳 [DEBUG] Using centralized payment gateway fee service (async):', {
        baseAmount,
        destinationCountry: quote.destination_country,
        feeCalculation: feeCalculation.breakdown,
        totalFee: paymentGatewayFee,
        source: feeCalculation.fees.source
      });
    } catch (error) {
      console.warn('⚠️ Payment gateway fee service error, using fallback:', error);
      paymentGatewayFee = (actualItemCost + selectedShipping.cost_usd + customsAmount + vatAmount) * 0.029 + 0.3;
    }

    // ✅ TRANSPARENT MODEL: Calculate totals with separate tax components
    const subtotal =
      actualItemCost +           // Items + purchase tax combined
      (quote.merchant_shipping_price || 0) + // Merchant to hub shipping
      selectedShipping.cost_usd +
      customsAmount +
      handlingFee +
      insuranceAmount +
      vatAmount;                // Only destination VAT, no sales tax double-counting

    // Get discount amount and subtract it from final total
    const discount = quote.calculation_data?.discount || 0;
    const finalTotal = subtotal + paymentGatewayFee - discount;

    // Update quote data structures
    const updatedCalculationData: CalculationData = {
      ...quote.calculation_data,
      breakdown: {
        items_total: itemsTotal,                    // Base product price
        merchant_shipping: quote.merchant_shipping_price || 0, // Merchant to hub shipping
        purchase_tax: purchaseTax,                  // ✅ NEW: Transparent purchase tax
        shipping: selectedShipping.cost_usd,        // International shipping cost
        customs: customsAmount,                     // Customs duty (on actualItemCost base)
        destination_tax: vatAmount,                 // ✅ RENAMED: Only destination VAT/GST
        fees: paymentGatewayFee,                   // Payment processing fees
        handling: handlingFee,                     // Handling charges
        insurance: insuranceAmount,                // Insurance amount
        discount: discount,                        // Applied discounts
        // Legacy field for backward compatibility
        taxes: vatAmount,                          // Deprecated - use destination_tax instead
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
        calculated_handling: handlingFee,
        calculated_insurance: insuranceAmount,
        route_based_calculation: true,
      },
      customs: {
        ...quote.operational_data.customs,
        percentage: customsPercentage,
        // ✅ SIMPLIFIED: No more complex smart tier logic
        smart_tier: null,
      },
      // Add operational data to match live calculator structure
      domestic_shipping: quote.operational_data?.domestic_shipping || 0,
      handling_charge: handlingFee,
      insurance_amount: insuranceAmount,
      payment_gateway_fee: paymentGatewayFee,
      vat_amount: vatAmount,
      // ✅ NEW: Track purchase tax data
      purchase_tax_amount: purchaseTax,
      purchase_tax_rate: purchaseTaxRate,
      actual_item_cost: actualItemCost, // For debugging and transparency
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
    originalQuote: UnifiedQuote,
  ): SmartSuggestion[] {
    const suggestions: SmartSuggestion[] = [];

    // Shipping optimization
    const currentShipping = shippingOptions.find(
      (opt) => opt.id === calculationResult.updated_quote.operational_data.shipping.selected_option,
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
          confidence: 0.6,
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
          confidence: 0.9,
          potential_impact: {
            cost_change: 0,
            time_change: 'Accurate calculation',
          },
        });
      }
    }

    // Weight optimization
    const averageWeight =
      originalQuote.items.reduce((sum, item) => sum + item.weight_kg, 0) /
      originalQuote.items.length;
    if (averageWeight < 0.5) {
      suggestions.push({
        id: crypto.randomUUID(),
        type: 'weight',
        message: 'Item weights seem low. Verify weights to ensure accurate shipping costs.',
        confidence: 0.7,
        potential_impact: {
          accuracy_improvement: 0.25,
        },
      });
    }

    return suggestions;
  }

  /**
   * Calculate route-based handling charge
   */
  private async calculateRouteBasedHandling(
    shippingOption: ShippingOption,
    itemsTotal: number,
    quote: UnifiedQuote,
  ): Promise<number> {
    console.log('🎯 [DEBUG] calculateRouteBasedHandling called:', {
      shippingOptionId: shippingOption.id,
      itemsTotal,
      quoteId: quote.id,
    });

    // ✅ AUTO-APPLY: Calculate default handling charge when available in backend
    const calculatedDefault = calculationDefaultsService.calculateHandlingDefault(quote, shippingOption);
    
    // If backend configuration is available, use calculated default (auto-apply)
    if (calculatedDefault > 0) {
      console.log('📦 [DEBUG] Auto-applying route-based handling charge:', {
        calculatedDefault,
        shippingOptionId: shippingOption.id,
        autoApplied: true,
      });
      return calculatedDefault;
    }

    // Fallback: Check if there's a manual override when no backend config available
    const existingHandling = quote.operational_data?.handling_charge;
    if (existingHandling && existingHandling > 0) {
      console.log('📦 [DEBUG] Using manual override handling (no backend config):', existingHandling);
      return existingHandling;
    }

    console.log('📦 [DEBUG] No handling charge - no backend config and no manual override');
    return 0;
  }

  /**
   * Calculate route-based insurance amount
   */
  private async calculateRouteBasedInsurance(
    shippingOption: ShippingOption,
    itemsTotal: number,
    quote: UnifiedQuote,
  ): Promise<number> {
    console.log('🛡️ [DEBUG] calculateRouteBasedInsurance called:', {
      shippingOptionId: shippingOption.id,
      itemsTotal,
      quoteId: quote.id,
    });

    // Check customer preference for insurance
    const customerOptedIn = quote.customer_data?.preferences?.insurance_opted_in ?? false;

    console.log('🛡️ [DEBUG] Customer insurance preference:', {
      customerOptedIn,
      customerPreferences: quote.customer_data?.preferences,
    });

    // Check if shipping option has route-based insurance configuration
    const routeInsuranceConfig = (shippingOption as any).insurance_options;

    if (routeInsuranceConfig && routeInsuranceConfig.available) {
      console.log('🛡️ [DEBUG] Using route-based insurance:', routeInsuranceConfig);

      // If customer hasn't opted in and route allows optional insurance, return 0
      if (!customerOptedIn && routeInsuranceConfig.optional !== false) {
        console.log('🛡️ [DEBUG] Customer opted out of optional route insurance, returning 0');
        return 0;
      }

      const coveragePercentage = routeInsuranceConfig.coverage_percentage || 1.5; // Default 1.5%
      const calculatedInsurance = itemsTotal * (coveragePercentage / 100);

      // Apply min/max bounds
      const minFee = routeInsuranceConfig.min_fee || 0;
      const maxCoverage = routeInsuranceConfig.max_coverage || Infinity;
      const finalInsurance = Math.max(minFee, Math.min(maxCoverage, calculatedInsurance));

      console.log('🛡️ [DEBUG] Route-based insurance calculation:', {
        coveragePercentage,
        calculatedInsurance,
        minFee,
        maxCoverage,
        finalInsurance,
      });

      return finalInsurance;
    }

    // Fallback to existing operational data
    const existingInsurance = quote.operational_data?.insurance_amount;
    if (existingInsurance && existingInsurance > 0) {
      console.log('🛡️ [DEBUG] Using existing operational insurance:', existingInsurance);
      return existingInsurance;
    }

    // No fallback calculations - require explicit configuration
    if (!customerOptedIn) {
      console.log('🛡️ [DEBUG] Customer opted out of insurance');
      return 0;
    }

    console.error(`❌ No insurance configuration found for route ${quote.origin_country} → ${quote.destination_country}. Admin must configure route-specific insurance options or provide operational data.`);
    
    // Return 0 instead of hardcoded values to force proper configuration
    return 0;
  }

  /**
   * Calculate route-based handling charge (sync version for live editing)
   */
  private calculateRouteBasedHandlingSync(
    shippingOption: ShippingOption,
    itemsTotal: number,
    quote: UnifiedQuote,
  ): number {
    console.log('🎯 [DEBUG] calculateRouteBasedHandlingSync called:', {
      shippingOptionId: shippingOption.id,
      itemsTotal,
      quoteId: quote.id,
    });

    // ✅ AUTO-APPLY: Use CalculationDefaultsService for consistent calculation
    const calculatedDefault = calculationDefaultsService.calculateHandlingDefault(quote, shippingOption);
    
    // If backend configuration is available, use calculated default (auto-apply)
    if (calculatedDefault > 0) {
      console.log('📦 [DEBUG] Auto-applying route-based handling charge (sync):', {
        calculatedDefault,
        shippingOptionId: shippingOption.id,
        autoApplied: true,
      });
      return calculatedDefault;
    }

    // Fallback to existing operational data when no backend config available
    const existingHandling = quote.operational_data?.handling_charge;
    if (existingHandling && existingHandling > 0) {
      console.log('📦 [DEBUG] Using manual override handling (sync, no backend config):', existingHandling);
      return existingHandling;
    }

    console.log('📦 [DEBUG] No handling charge (sync) - no backend config and no manual override');
    return 0;
  }

  /**
   * Calculate route-based insurance amount (sync version for live editing)
   */
  private calculateRouteBasedInsuranceSync(
    shippingOption: ShippingOption,
    itemsTotal: number,
    quote: UnifiedQuote,
  ): number {
    // Check customer preference for insurance
    const customerOptedIn = quote.customer_data?.preferences?.insurance_opted_in ?? false;

    // Check if shipping option has route-based insurance configuration
    const routeInsuranceConfig = (shippingOption as any).insurance_options;

    if (routeInsuranceConfig && routeInsuranceConfig.available) {
      // If customer hasn't opted in and route allows optional insurance, return 0
      if (!customerOptedIn && routeInsuranceConfig.optional !== false) {
        return 0;
      }

      const coveragePercentage = routeInsuranceConfig.coverage_percentage || 1.5; // Default 1.5%
      const calculatedInsurance = itemsTotal * (coveragePercentage / 100);

      // Apply min/max bounds
      const minFee = routeInsuranceConfig.min_fee || 0;
      const maxCoverage = routeInsuranceConfig.max_coverage || Infinity;
      return Math.max(minFee, Math.min(maxCoverage, calculatedInsurance));
    }

    // Fallback to existing operational data
    const existingInsurance = quote.operational_data?.insurance_amount;
    if (existingInsurance && existingInsurance > 0) {
      return existingInsurance;
    }

    // No hardcoded fallbacks in sync operation
    if (!customerOptedIn) {
      return 0;
    }

    // Return 0 to force proper configuration even in sync mode
    console.warn(`⚠️ No insurance configuration for sync operation ${quote.origin_country} → ${quote.destination_country}`);
    return 0;
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
      items: input.quote.items.map((item) => ({
        price: item.costprice_origin,
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
