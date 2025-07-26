// ============================================================================
// SMART CALCULATION ENGINE - Enhanced with Multiple Shipping Options
// Replaces QuoteCalculatorService + unified-shipping-calculator + 10+ components
// Provides all shipping options with smart recommendations
// ============================================================================

import { supabase } from '@/integrations/supabase/client';
import { optimizedCurrencyService } from '@/services/OptimizedCurrencyService';
import { calculationDefaultsService } from '@/services/CalculationDefaultsService';
import { smartQuoteCacheService } from '@/services/SmartQuoteCacheService';
import { calculateCustomsTier } from '@/lib/customs-tier-calculator';
import { addBusinessDays, format } from 'date-fns';
import PerItemTaxCalculator, {
  type ItemTaxBreakdown,
  type TaxCalculationContext,
} from '@/services/PerItemTaxCalculator';
import { unifiedTaxFallbackService } from '@/services/UnifiedTaxFallbackService';
import { autoProductClassifier } from '@/services/AutoProductClassifier';
import { weightDetectionService } from '@/services/WeightDetectionService';
import { vatService } from '@/services/VATService';
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
  // 2-tier tax system preferences
  tax_calculation_preferences?: {
    calculation_method_preference?: 'manual' | 'hsn_only' | 'country_based';
    valuation_method_preference?:
      | 'auto'
      | 'product_value'
      | 'minimum_valuation'
      | 'higher_of_both'
      | 'per_item_choice';
    admin_id?: string; // For audit logging
  };
}

export interface EnhancedCalculationResult {
  success: boolean;
  updated_quote: UnifiedQuote;
  shipping_options: ShippingOption[];
  smart_recommendations: ShippingRecommendation[];
  optimization_suggestions: SmartSuggestion[];
  hsn_tax_breakdown?: ItemTaxBreakdown[];
  hsn_calculation_summary?: {
    total_items: number;
    total_customs: number;
    total_local_taxes: number;
    total_all_taxes: number;
    items_with_minimum_valuation: number;
    currency_conversions_applied: number;
  };
  error?: string;
}

/**
 * Smart Calculation Engine with Enhanced Shipping Options
 * Calculates all costs + provides multiple shipping options + smart recommendations
 */
export class SmartCalculationEngine {
  private static instance: SmartCalculationEngine;
  private perItemTaxCalculator: PerItemTaxCalculator;
  
  // Legacy cache for backward compatibility (will be deprecated)
  private calculationCache = new Map<string, { result: any; timestamp: number }>();
  private readonly CACHE_DURATION = 15 * 60 * 1000; // 15 minutes

  private constructor() {
    this.perItemTaxCalculator = PerItemTaxCalculator.getInstance();
  }

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
      // Calculate base totals with NaN protection
      const itemsTotal = input.quote.items.reduce(
        (sum, item) => {
          const price = typeof item.costprice_origin === 'number' && !isNaN(item.costprice_origin) ? item.costprice_origin : 0;
          const quantity = typeof item.quantity === 'number' && !isNaN(item.quantity) ? item.quantity : 1;
          
          if (price !== item.costprice_origin || quantity !== item.quantity) {
            console.warn(`[SMART ENGINE] Invalid values for item "${item.name}": price=${item.costprice_origin} (using ${price}), quantity=${item.quantity} (using ${quantity})`);
          }
          
          return sum + price * quantity;
        },
        0,
      );
      const totalWeight = input.quote.items.reduce(
        (sum, item) => sum + item.weight * item.quantity,
        0,
      );

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
      console.log(`[SMART ENGINE DEBUG] Received tax preferences:`, {
        calculation_method: input.tax_calculation_preferences?.calculation_method_preference,
        valuation_method: input.tax_calculation_preferences?.valuation_method_preference,
        quote_method: input.quote.calculation_method_preference,
      });

      // 🚀 NEW: Check smart cache first
      const cachedResult = await smartQuoteCacheService.getCachedCalculation(input);
      if (cachedResult) {
        console.log(
          `[SMART ENGINE DEBUG] Smart Cache HIT - returning cached result, skipping all calculations`,
        );
        return cachedResult;
      }

      // Legacy cache check for backward compatibility
      const legacyCacheKey = this.generateCacheKey(input);
      const legacyCached = this.getCachedResult(legacyCacheKey);
      if (legacyCached) {
        console.log(
          `[SMART ENGINE DEBUG] Legacy Cache HIT - returning cached result`,
        );
        return legacyCached;
      }

      // Calculate base totals with NaN protection
      const itemsTotal = input.quote.items.reduce(
        (sum, item) => {
          const price = typeof item.costprice_origin === 'number' && !isNaN(item.costprice_origin) ? item.costprice_origin : 0;
          const quantity = typeof item.quantity === 'number' && !isNaN(item.quantity) ? item.quantity : 1;
          
          if (price !== item.costprice_origin || quantity !== item.quantity) {
            console.warn(`[SMART ENGINE FULL] Invalid values for item "${item.name}": price=${item.costprice_origin} (using ${price}), quantity=${item.quantity} (using ${quantity})`);
          }
          
          return sum + price * quantity;
        },
        0,
      );
      const totalWeight = input.quote.items.reduce(
        (sum, item) => {
          const weight = typeof item.weight === 'number' && !isNaN(item.weight) ? item.weight : 0;
          const quantity = typeof item.quantity === 'number' && !isNaN(item.quantity) ? item.quantity : 1;
          
          return sum + weight * quantity;
        },
        0,
      );

      // 🆕 ENHANCED: HSN-based per-item tax calculation with 2-tier method selection
      console.log(`[SMART ENGINE DEBUG] About to call calculateHSNBasedTaxes with preferences:`, {
        calculation_method: input.tax_calculation_preferences?.calculation_method_preference,
        quote_method: input.quote.calculation_method_preference,
      });

      const hsnTaxResults = await this.calculateHSNBasedTaxes(input.quote, input);

      console.log(`[SMART ENGINE DEBUG] HSN tax calculation completed:`, {
        breakdown_count: hsnTaxResults.breakdown.length,
        total_taxes: hsnTaxResults.summary.total_all_taxes,
      });

      // 🚀 NEW: Check for cached shipping options first
      let shippingOptions: ShippingOption[] = [];
      const cachedShipping = await smartQuoteCacheService.getCachedShippingOptions(
        input.quote.origin_country,
        input.quote.destination_country,
        totalWeight
      );
      
      if (cachedShipping) {
        console.log(`[SMART ENGINE DEBUG] Shipping options cache HIT`);
        shippingOptions = cachedShipping.options;
      } else {
        console.log(`[SMART ENGINE DEBUG] Shipping options cache MISS - calculating fresh`);
        // Get all available shipping options
        shippingOptions = await this.calculateAllShippingOptions({
          originCountry: input.quote.origin_country,
          destinationCountry: input.quote.destination_country,
          weight: totalWeight,
          value: itemsTotal,
        });
      }

      // Generate smart recommendations (use cached if available)
      let smartRecommendations: ShippingRecommendation[] = [];
      if (cachedShipping) {
        console.log(`[SMART ENGINE DEBUG] Using cached shipping recommendations`);
        smartRecommendations = cachedShipping.recommendations;
      } else {
        console.log(`[SMART ENGINE DEBUG] Generating fresh shipping recommendations`);
        smartRecommendations = this.generateShippingRecommendations(
          shippingOptions,
          input.preferences,
        );
        
        // 🚀 NEW: Cache shipping options and recommendations for future use
        await smartQuoteCacheService.setCachedShippingOptions(
          input.quote.origin_country,
          input.quote.destination_country,
          totalWeight,
          shippingOptions,
          smartRecommendations
        );
      }

      // Select optimal shipping option (or use existing selection)
      const selectedOption = this.selectOptimalShippingOption(
        shippingOptions,
        input.preferences,
        input.quote.operational_data?.shipping?.selected_option,
      );

      // Calculate all costs with selected shipping (now includes HSN taxes)
      const calculationResult = await this.calculateCompleteCosts({
        quote: input.quote,
        selectedShipping: selectedOption,
        itemsTotal,
        totalWeight,
        hsnTaxBreakdown: hsnTaxResults.breakdown,
        hsnTaxSummary: hsnTaxResults.summary,
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
        hsn_tax_breakdown: hsnTaxResults.breakdown,
        hsn_calculation_summary: hsnTaxResults.summary,
      };

      // 🚀 NEW: Cache result in smart cache system
      await smartQuoteCacheService.setCachedCalculation(input, result);
      
      // Legacy cache for backward compatibility
      this.setCachedResult(legacyCacheKey, result);
      
      console.log(`[SMART ENGINE DEBUG] Result cached in both smart cache and legacy cache`);
      return result;
    } catch (error) {
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
   * 🆕 ENHANCED: HSN-based per-item tax calculation with 2-tier method selection
   * This integrates with PerItemTaxCalculator and UnifiedTaxFallbackService
   * to provide accurate per-item taxes with admin preference support
   */
  private async calculateHSNBasedTaxes(
    quote: UnifiedQuote,
    input?: EnhancedCalculationInput,
  ): Promise<{
    breakdown: ItemTaxBreakdown[];
    summary: {
      total_items: number;
      total_customs: number;
      total_local_taxes: number;
      total_all_taxes: number;
      items_with_minimum_valuation: number;
      currency_conversions_applied: number;
    };
  }> {
    try {
      console.log(`[HSN TAX CALCULATION DEBUG] Starting HSN-based tax calculation:`, {
        input_method: input?.tax_calculation_preferences?.calculation_method_preference,
        quote_method: quote.calculation_method_preference,
        quote_id: quote.id,
      });

      // Get effective tax method from database based on quote preferences
      const { data: effectiveTaxMethod } = await supabase
        .rpc('get_effective_tax_method', { quote_id_param: quote.id })
        .single();

      // Prepare enhanced tax calculation context with 2-tier preferences
      const context: TaxCalculationContext = {
        route: {
          id: 1, // Will be resolved from actual shipping route if needed
          origin_country: quote.origin_country,
          destination_country: quote.destination_country,
          tax_configuration: {},
          weight_configuration: {},
          api_configuration: {},
        },
        admin_overrides: quote.operational_data?.admin_overrides || [],
        apply_exemptions: true,
        calculation_date: new Date(),
        // 2-tier tax system preferences
        calculation_method_preference:
          input?.tax_calculation_preferences?.calculation_method_preference ||
          quote.calculation_method_preference ||
          effectiveTaxMethod?.calculation_method ||
          'hsn_only',
        valuation_method_preference:
          input?.tax_calculation_preferences?.valuation_method_preference ||
          quote.valuation_method_preference ||
          effectiveTaxMethod?.valuation_method ||
          'product_value', // ✅ NEW: Default to product_value instead of 'auto'
        admin_id: input?.tax_calculation_preferences?.admin_id,
        // ✅ FIXED: Pass actual form input values for CIF calculation
        shipping_cost: quote.calculation_data?.breakdown?.shipping || 0,
        insurance_amount: quote.operational_data?.insurance_amount || 0,
        handling_charge: quote.operational_data?.handling_charge || 0,
        domestic_shipping: quote.operational_data?.domestic_shipping || 0,
      };

      console.log(`[HSN TAX CALCULATION DEBUG] Calculation context prepared:`, {
        input_tax_prefs: input?.tax_calculation_preferences?.calculation_method_preference,
        quote_method: quote.calculation_method_preference,
        effective_method: effectiveTaxMethod?.calculation_method,
        final_calculation_method: context.calculation_method_preference,
        final_valuation_method: context.valuation_method_preference,
        // ✅ NEW: CIF component values
        shipping_cost: context.shipping_cost,
        insurance_amount: context.insurance_amount,
        handling_charge: context.handling_charge,
        domestic_shipping: context.domestic_shipping,
      });

      // 🔍 [DEBUG] Enhanced logging for quote bbfc6b7f-c630-41be-a688-ab3bb7087520
      if (quote.id === 'bbfc6b7f-c630-41be-a688-ab3bb7087520') {
        console.log(`[DEBUG] Special quote data analysis:`, {
          operational_data: quote.operational_data,
          breakdown_shipping: quote.calculation_data?.breakdown?.shipping,
          breakdown_full: quote.calculation_data?.breakdown,
          method_preference: quote.calculation_method_preference,
        });
      }

      // Enhanced items with HSN classification and weight detection
      const enhancedItems = await Promise.all(
        quote.items.map(async (item) => {
          let hsnCode = item.hsn_code;
          let detectedWeight = item.weight;

          // Auto-classify HSN code if not provided
          if (!hsnCode) {
            try {
              const classificationResult = await autoProductClassifier.classifyProduct({
                productName: item.name,
                productUrl: item.url,
                category: item.category,
                productDescription: item.description,
              });

              if (classificationResult.hsnCode && classificationResult.confidence > 0.6) {
                hsnCode = classificationResult.hsnCode;
              } else {
              }
            } catch (error) {}
          }

          // Auto-detect weight if not provided or seems incorrect
          if (!detectedWeight || detectedWeight < 0.01) {
            try {
              const weightResult = await weightDetectionService.detectWeight({
                productName: item.name,
                productUrl: item.url,
                hsnCode: hsnCode,
                category: item.category,
              });

              if (weightResult.weight && weightResult.confidence > 0.5) {
                detectedWeight = weightResult.weight;
              } else {
              }
            } catch (error) {}
          }

          // ✅ FIXED: Add validation for price_origin_currency transformation
          const safePrice = typeof item.costprice_origin === 'number' && !isNaN(item.costprice_origin) 
            ? item.costprice_origin 
            : 0;
          
          if (safePrice !== item.costprice_origin) {
            console.warn(`[SMART ENGINE TRANSFORM] Invalid costprice_origin for item "${item.name}": ${item.costprice_origin}, using 0 instead`);
          }

          return {
            id: item.id || crypto.randomUUID(),
            name: item.name,
            price_origin_currency: safePrice, // Will be converted by PerItemTaxCalculator
            weight: detectedWeight,
            hsn_code: hsnCode,
            category: item.category,
            url: item.url,
            quantity: item.quantity,
          };
        }),
      );

      console.log(`[HSN TAX CALCULATION DEBUG] Enhanced items prepared:`, {
        full_context: context,
      });

      // Calculate per-item taxes
      const taxBreakdowns = await this.perItemTaxCalculator.calculateMultipleItemTaxes(
        enhancedItems,
        context,
      );

      // Get calculation summary
      const summary = await this.perItemTaxCalculator.getCalculationSummary(taxBreakdowns);

      return {
        breakdown: taxBreakdowns,
        summary,
      };
    } catch (error) {
      // Fallback to unified tax calculation if HSN calculation fails
      const fallbackMethod =
        input?.tax_calculation_preferences?.calculation_method_preference || 'hsn_only';
      if (fallbackMethod === 'country_based') {
        try {
          const fallbackResults = await this.calculateUnifiedFallbackTaxes(quote, input);
          return fallbackResults;
        } catch (fallbackError) {}
      }

      // Return empty results on complete failure to prevent breaking the main calculation
      return {
        breakdown: [],
        summary: {
          total_items: quote.items.length,
          total_customs: 0,
          total_local_taxes: 0,
          total_all_taxes: 0,
          items_with_minimum_valuation: 0,
          currency_conversions_applied: 0,
        },
      };
    }
  }

  /**
   * 🆕 NEW: Unified fallback tax calculation using UnifiedTaxFallbackService
   * Used when HSN calculation fails or when legacy_fallback method is selected
   */
  private async calculateUnifiedFallbackTaxes(
    quote: UnifiedQuote,
    input?: EnhancedCalculationInput,
  ): Promise<{
    breakdown: ItemTaxBreakdown[];
    summary: {
      total_items: number;
      total_customs: number;
      total_local_taxes: number;
      total_all_taxes: number;
      items_with_minimum_valuation: number;
      currency_conversions_applied: number;
    };
  }> {
    try {
      // Get unified tax data for this route
      const unifiedTaxData = await unifiedTaxFallbackService.getUnifiedTaxData(
        quote.origin_country,
        quote.destination_country,
      );

      // Calculate totals for traditional percentage-based calculation with NaN protection
      const itemsTotal = quote.items.reduce(
        (sum, item) => {
          const price = typeof item.costprice_origin === 'number' && !isNaN(item.costprice_origin) ? item.costprice_origin : 0;
          const quantity = typeof item.quantity === 'number' && !isNaN(item.quantity) ? item.quantity : 1;
          
          if (price !== item.costprice_origin || quantity !== item.quantity) {
            console.warn(`[UNIFIED FALLBACK] Invalid values for item "${item.name}": price=${item.costprice_origin} (using ${price}), quantity=${item.quantity} (using ${quantity})`);
          }
          
          return sum + price * quantity;
        },
        0,
      );

      // Apply unified tax rates to total value
      const customsAmount = itemsTotal * (unifiedTaxData.customs_percent / 100);
      const localTaxAmount = itemsTotal * (unifiedTaxData.vat_percent / 100);
      const totalTaxes = customsAmount + localTaxAmount;

      // Create simplified breakdown (since this is route-level, not per-item)
      const breakdown: ItemTaxBreakdown[] = [
        {
          item_id: 'unified_fallback',
          hsn_code: 'FALLBACK',
          category: 'unified_calculation',
          item_name: `${quote.items.length} items (unified calculation)`,

          // Valuation details
          original_price_origin_currency: itemsTotal,
          taxable_amount_origin_currency: itemsTotal,
          valuation_method: 'original_price',

          // Calculation options (simplified for fallback)
          calculation_options: {
            actual_price_calculation: {
              basis_amount: itemsTotal,
              customs_amount: customsAmount,
              local_tax_amount: localTaxAmount,
              total_tax: totalTaxes,
            },
            selected_method: 'actual_price',
            admin_can_override: true,
          },

          // Tax calculations
          customs_calculation: {
            rate_percentage: unifiedTaxData.customs_percent,
            amount_origin_currency: customsAmount,
            basis_amount: itemsTotal,
          },

          local_tax_calculation: {
            tax_type: 'vat', // Unified system uses VAT as local tax
            rate_percentage: unifiedTaxData.vat_percent,
            amount_origin_currency: localTaxAmount,
            basis_amount: itemsTotal,
          },

          // Totals
          total_customs: customsAmount,
          total_local_taxes: localTaxAmount,
          total_taxes: totalTaxes,

          // Metadata
          calculation_timestamp: new Date(),
          admin_overrides_applied: [],
          confidence_score: unifiedTaxData.confidence_score,
          warnings: [
            `Using ${unifiedTaxData.data_source} fallback calculation`,
            unifiedTaxData.fallback_reason ? `Reason: ${unifiedTaxData.fallback_reason}` : '',
          ].filter(Boolean),
        },
      ];

      const summary = {
        total_items: quote.items.length,
        total_customs: customsAmount,
        total_local_taxes: localTaxAmount,
        total_all_taxes: totalTaxes,
        items_with_minimum_valuation: 0, // Not applicable for unified fallback
        currency_conversions_applied: 0, // Not applicable for unified fallback
      };

      return {
        breakdown,
        summary,
      };
    } catch (error) {
      throw error; // Re-throw to be handled by the caller
    }
  }

  /**
   * Debug helper: Force fresh shipping routes data (bypass cache)
   */
  async debugFreshShippingRoutes(): Promise<void> {
    try {
      const { data: freshRoutes, error } = await supabase
        .from('shipping_routes')
        .select('*')
        .eq('is_active', true)
        // Add timestamp to force fresh query
        .order('updated_at', { ascending: false });

      if (error) {
        return;
      }
    } catch (error) {}
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
    } catch (error) {}
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

    // Debug: List all available routes first (check for caching issues)
    await this.debugListAllShippingRoutes();
    await this.debugFreshShippingRoutes();

    const options: ShippingOption[] = [];
    let routeOptions: ShippingOption[] = [];

    try {
      // Method 1: Route-specific shipping with multiple carriers
      routeOptions = await this.getRouteSpecificOptions(params);
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
      const finalOptions = options
        .sort((a, b) => a.cost_usd - b.cost_usd)
        .map((option, index) => ({
          ...option,
          id: option.id || `option_${index}`,
        }));

      // 🔍 ENHANCED DEBUG: Log final results summary

      return finalOptions;
    } catch (error) {
      const fallbackOptions = this.getEstimatedOptions(params);
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

    const { data: route, error } = await supabase
      .from('shipping_routes')
      .select('*')
      .eq('origin_country', params.originCountry)
      .eq('destination_country', params.destinationCountry)
      .eq('is_active', true)
      .single();

    // 🔍 ENHANCED DEBUG: Log query results with full route data

    if (error || !route) {
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
      handling_charge?: {
        base_fee: number;
        percentage_of_value: number;
        min_fee: number;
        max_fee: number;
      };
      insurance_options?: {
        available: boolean;
        default_enabled: boolean;
        coverage_percentage: number;
        min_fee?: number;
        max_coverage: number;
        customer_description?: string;
      };
    }>;

    // Validate that route has delivery options
    if (!deliveryOptions || deliveryOptions.length === 0) {
      return [];
    }

    // Validate that at least one delivery option is active
    const activeDeliveryOptions = deliveryOptions.filter((opt) => opt.active);
    if (activeDeliveryOptions.length === 0) {
      return [];
    }

    // Generate options for each delivery option
    for (const deliveryOption of deliveryOptions || []) {
      if (!deliveryOption.active) continue; // Skip inactive options

      let baseCost: number;
      try {
        baseCost = this.calculateRouteBaseCost(route, params.weight, params.value);
      } catch (error) {
        // Skip this delivery option if base cost calculation fails
        continue;
      }

      // ✅ FIXED: delivery option price is a PREMIUM on top of base cost, not absolute cost
      const deliveryPremium = deliveryOption.price || 0;
      const optionCost = baseCost + deliveryPremium;

      // Validate that we don't accidentally create zero-cost shipping
      if (optionCost <= 0) {
        continue;
      }

      // 🚨 IMPORTANT NOTE FOR DEVELOPERS: All costs in ORIGIN CURRENCY
      // This delivery option calculation keeps costs in origin country currency
      // NO currency conversion applied - rates stay as configured in shipping modal

      // ✅ FIX: Calculate total delivery days including processing + customs + shipping
      const processingDays = route.processing_days || 2; // Default 2 days
      const customsClearanceDays = route.customs_clearance_days || 3; // Default 3 days
      const localDeliveryDays = 1; // Standard 1 day local delivery

      const totalMinDays =
        processingDays + deliveryOption.min_days + customsClearanceDays + localDeliveryDays;
      const totalMaxDays =
        processingDays + deliveryOption.max_days + customsClearanceDays + localDeliveryDays;

      // Calculate actual delivery dates (business days)
      const currentDate = new Date();
      const estimatedDeliveryMin = addBusinessDays(currentDate, totalMinDays);
      const estimatedDeliveryMax = addBusinessDays(currentDate, totalMaxDays);

      const deliveryDays =
        totalMinDays === totalMaxDays
          ? `${totalMinDays} days (by ${format(estimatedDeliveryMin, 'MMM do')})`
          : `${totalMinDays}-${totalMaxDays} days (${format(estimatedDeliveryMin, 'MMM do')}-${format(estimatedDeliveryMax, 'MMM do')})`;

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
        // 🔧 FIX: Include handling/insurance configs from delivery options
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
      return [];
    }

    // Validate required country settings
    if (!countrySettings.min_shipping || !countrySettings.additional_weight) {
      return [];
    }

    const baseCost =
      countrySettings.min_shipping + params.weight * countrySettings.additional_weight;

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

    // Return empty array to force proper route configuration
    return [];
  }

  /**
   * Calculate route-specific base cost
   * 
   * 🌍 IMPORTANT: All shipping rates are in ORIGIN COUNTRY CURRENCY
   * IN→NP = INR, US→NP = USD, AU→GB = AUD (no conversion needed)
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
    // Validate required route data
    if (!route.base_shipping_cost) {
      throw new Error(
        `Missing base_shipping_cost for route ${route.origin_country}->${route.destination_country}. Please configure complete shipping route data.`,
      );
    }

    let baseCost = route.base_shipping_cost;
    const initialBaseCost = baseCost;

    // Weight-based cost calculation - ADDITIVE MODEL
    if (route.weight_tiers && route.weight_tiers.length > 0) {
      const tier = route.weight_tiers.find(
        (tier: any) => weight >= tier.min && (tier.max === null || weight <= tier.max),
      );

      if (tier) {
        // 🚀 FIXED: Tier cost is PER-KG rate, must multiply by weight
        const tierRatePerKg = tier.cost;
        const tierCost = weight * tierRatePerKg;
        baseCost += tierCost; // Add calculated tier cost to base cost
      } else {
        // Fallback to per-kg calculation when no tier matches
        const perKgRate = route.shipping_per_kg || route.cost_per_kg;
        if (!perKgRate || perKgRate <= 0) {
          throw new Error(
            `No valid weight tier found and missing shipping_per_kg for route ${route.origin_country}->${route.destination_country}. Weight: ${weight}kg`,
          );
        }
        const weightCost = weight * perKgRate;
        baseCost += weightCost;
      }
    } else {
      // Per-kilogram calculation (additive to base cost)
      const perKgRate = route.shipping_per_kg || route.cost_per_kg;
      if (!perKgRate || perKgRate <= 0) {
        throw new Error(
          `Missing or invalid shipping_per_kg for route ${route.origin_country}->${route.destination_country}. Please configure weight-based pricing.`,
        );
      }

      const weightCost = weight * perKgRate;
      baseCost += weightCost; // Additive model: base + (weight * rate)
    }

    // Value-based percentage

    if (route.cost_percentage && route.cost_percentage > 0) {
      const valueCost = value * (route.cost_percentage / 100);
      baseCost += valueCost;
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

    // 🚨 FINAL COST TRACKING (Updated with corrected per-kg tier calculation)

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
    // Use current selection if valid
    if (currentSelection) {
      const existing = options.find((opt) => opt.id === currentSelection);
      if (existing) {
        return existing;
      } else {
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

    // Use existing exchange rate or default
    const exchangeRate = quote.calculation_data?.exchange_rate?.rate || 1.0;

    // Calculate route-based insurance first (needed for CIF calculation)
    const insuranceAmount = this.calculateRouteBasedInsuranceSync(
      selectedShipping,
      itemsTotal,
      quote,
    );

    // Calculate customs using CIF value (Cost, Insurance, Freight) - RESPECT CALCULATION METHOD
    let customsPercentage = 0; // Default to 0 (no customs) if not specified
    const calculationMethod = quote.calculation_method_preference || 'hsn_only';

    if (calculationMethod === 'manual') {
      // Manual mode: use customs input value (allow 0)
      customsPercentage = quote.operational_data?.customs?.percentage ?? 0;
    } else if (calculationMethod === 'country_based') {
      // Country-based mode: use country tier (simplified for sync)
      customsPercentage = quote.operational_data?.customs?.smart_tier?.percentage ?? 0;
    } else {
      // HSN mode: use existing stored value or fallback
      customsPercentage = quote.operational_data?.customs?.percentage ?? 0;
    }

    const cifValue = itemsTotal + selectedShipping.cost_usd + insuranceAmount;
    const customsAmount = cifValue * (customsPercentage / 100);

    // Calculate route-based handling charge (sync version uses existing data or simple fallback)
    const handlingFee = this.calculateRouteBasedHandlingSync(selectedShipping, itemsTotal, quote);

    // Calculate other costs using route-based configuration
    const salesTax = quote.calculation_data?.breakdown?.taxes || itemsTotal * 0.1;
    const paymentGatewayFee =
      quote.operational_data?.payment_gateway_fee ||
      (itemsTotal + selectedShipping.cost_usd + customsAmount) * 0.029 + 0.3;

    // Calculate VAT on landed cost (CIF + Customs + Handling) - FIXED
    const vatPercentage = quote.operational_data?.customs?.smart_tier?.vat_percentage || 0;
    const landedCost = cifValue + customsAmount + handlingFee;
    const vatAmount = vatPercentage > 0 ? landedCost * (vatPercentage / 100) : 0;

    // Calculate totals
    const subtotal =
      itemsTotal +
      selectedShipping.cost_usd +
      customsAmount +
      salesTax +
      handlingFee +
      insuranceAmount +
      vatAmount;

    // Get discount amount and subtract it from final total
    const discount = quote.calculation_data?.discount || 0;
    const finalTotal = subtotal + paymentGatewayFee - discount;

    // 🔍 [DEBUG] Log breakdown shipping assignment

    // Update quote data structures
    // Calculate local currency total
    const finalTotalLocal = finalTotal * exchangeRate;

    const updatedQuote: UnifiedQuote = {
      ...quote,
      final_total_usd: Math.round(finalTotal * 100) / 100,
      final_total: Math.round(finalTotalLocal * 100) / 100, // Set local currency total
      calculation_data: {
        ...quote.calculation_data,
        breakdown: {
          items_total: itemsTotal,
          shipping: selectedShipping.cost_usd,
          customs: customsAmount,
          taxes: salesTax + vatAmount,
          fees: paymentGatewayFee, // Only gateway fees, not handling/insurance
          handling: handlingFee, // ✨ NEW: Separate handling field
          insurance: insuranceAmount, // ✨ NEW: Separate insurance field
          discount: discount,
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
      },
      optimization_score: this.calculateOptimizationScore(finalTotal, itemsTotal),
    };

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

    // Use existing exchange rate or default
    const exchangeRate = quote.calculation_data?.exchange_rate?.rate || 1.0;

    // Use the shipping cost directly from the breakdown (no fallback to options)
    const shippingCost = quote.calculation_data?.breakdown?.shipping || 0;

    // Validate shipping cost consistency and warn of potential data issues
    if (shippingCost === 0) {
    }

    // Check if selected shipping option exists and matches breakdown cost
    const selectedOptionId = quote.operational_data?.shipping?.selected_option;
    if (selectedOptionId && shippingCost > 0) {
    }

    // Calculate other costs using existing data - NO HARDCODED FALLBACKS
    const salesTax = quote.calculation_data?.sales_tax_price || 0;
    const handlingFee = quote.operational_data?.handling_charge || 0;
    const insuranceAmount = quote.operational_data?.insurance_amount || 0;

    // ✅ CALCULATE DESTINATION TAX for sync method (use cached data only)
    let destinationTax = 0;
    try {
      // Use cached VAT data only (no async calls in sync method)
      const cachedVATResult = vatService.getCachedVATData(
        quote.origin_country,
        quote.destination_country,
      );

      if (cachedVATResult && cachedVATResult.percentage > 0) {
        const landedCost =
          itemsTotal +
          shippingCost +
          insuranceAmount +
          (quote.calculation_data?.breakdown?.customs || 0) +
          handlingFee +
          salesTax;
        destinationTax = landedCost * (cachedVATResult.percentage / 100);
        console.log(
          `[DESTINATION TAX SYNC] ${quote.destination_country}: ${cachedVATResult.percentage}% = ${destinationTax} (cached)`,
        );
      } else {
        // Fallback to existing destination tax if no cached data
        destinationTax = quote.calculation_data?.breakdown?.destination_tax || 0;
        console.log(`[DESTINATION TAX SYNC] No cached VAT data, using existing: ${destinationTax}`);
      }
    } catch (error) {
      console.warn(`[DESTINATION TAX SYNC] Error:`, error);
      destinationTax = quote.calculation_data?.breakdown?.destination_tax || 0;
    }

    // ✅ CRITICAL FIX: Create separate customs calculation base - ONLY affects customs, not all calculations
    const valuationMethod = quote.valuation_method_preference || 'product_value';
    let customsCalculationBase = itemsTotal; // Default to actual product prices
    
    
    // Determine customs calculation base based on valuation method (for CUSTOMS ONLY)
    if (valuationMethod === 'minimum_valuation' || valuationMethod === 'higher_of_both') {
      // For sync calculation, check if HSN calculation data with minimum valuation is available
      const hsnCalculationData = quote.calculation_data?.hsn_calculation;
      if (hsnCalculationData && hsnCalculationData.items_with_minimum_valuation > 0) {
        // Use the recalculated total from HSN calculation that respects valuation method
        const hsnTotal = hsnCalculationData.recalculated_items_total || itemsTotal;
        
        if (valuationMethod === 'higher_of_both') {
          // Use whichever is higher FOR CUSTOMS ONLY
          customsCalculationBase = Math.max(itemsTotal, hsnTotal);
        } else {
          // Use minimum valuation FOR CUSTOMS ONLY
          customsCalculationBase = hsnTotal;
        }
      } else {
        // Fallback: estimate minimum valuation as 20% higher (rough approximation for sync mode)
        const estimatedMinimum = itemsTotal * 1.2;
        
        if (valuationMethod === 'higher_of_both') {
          // Use whichever is higher FOR CUSTOMS ONLY
          customsCalculationBase = Math.max(itemsTotal, estimatedMinimum);
        } else {
          // Use minimum valuation FOR CUSTOMS ONLY
          customsCalculationBase = estimatedMinimum;
        }
      }
    }

    // Calculate customs using CIF value (Cost, Insurance, Freight) - RESPECT CALCULATION METHOD
    let customsPercentage = 0; // Default to 0 (no customs) if not specified
    const calculationMethod = quote.calculation_method_preference || 'hsn_only';

    if (calculationMethod === 'manual') {
      // Manual mode: use customs input value (allow 0)
      customsPercentage = quote.operational_data?.customs?.percentage ?? 0;
    } else if (calculationMethod === 'country_based') {
      // Country-based mode: use country tier (simplified for sync)
      customsPercentage = quote.operational_data?.customs?.smart_tier?.percentage ?? 0;
    } else {
      // HSN mode: use existing stored value or fallback
      customsPercentage = quote.operational_data?.customs?.percentage ?? 0;
    }

    // ✅ CRITICAL FIX: Use actual itemsTotal for CIF, but customsCalculationBase for customs calculation
    const cifValue = customsCalculationBase + shippingCost + insuranceAmount; // Use customs basis for CIF
    const customsAmount = cifValue * (customsPercentage / 100);
    const domesticShipping = quote.operational_data?.domestic_shipping || 0;
    const discount = quote.calculation_data?.discount || 0;

    // ✅ FIXED: Payment gateway fee uses ACTUAL product prices, not customs basis
    const paymentGatewayFee =
      quote.operational_data?.payment_gateway_fee ||
      (itemsTotal + shippingCost + customsAmount) * 0.029 + 0.3;

    // ✅ FIXED: VAT calculated on landed cost using ACTUAL product prices
    const vatPercentage = quote.operational_data?.customs?.smart_tier?.vat_percentage || 0;
    const actualLandedCost = itemsTotal + shippingCost + insuranceAmount + customsAmount + handlingFee;
    const vatAmount = vatPercentage > 0 ? actualLandedCost * (vatPercentage / 100) : 0;

    // ✅ FIXED: Calculate totals using ACTUAL product prices (itemsTotal)
    const subtotal =
      itemsTotal +
      shippingCost +
      customsAmount +
      salesTax +
      destinationTax +
      handlingFee +
      insuranceAmount +
      domesticShipping +
      vatAmount;

    const finalTotal = subtotal + paymentGatewayFee - discount;

    // Build updated quote
    // Calculate local currency total
    const finalTotalLocal = finalTotal * exchangeRate;

    const updatedQuote: UnifiedQuote = {
      ...quote,
      final_total_usd: finalTotal,
      final_total: Math.round(finalTotalLocal * 100) / 100, // Set local currency total
      calculation_data: {
        ...quote.calculation_data,
        breakdown: {
          items_total: itemsTotal, // ✅ FIXED: Use ACTUAL product prices, not adjusted
          shipping: shippingCost, // ✅ Use the provided value directly
          customs: customsAmount, // Calculated using customsCalculationBase (but stored customs amount is result)
          taxes: salesTax, // Local taxes only (legacy field)
          destination_tax: destinationTax, // Destination tax as separate field
          fees: paymentGatewayFee,
          handling: handlingFee,
          insurance: insuranceAmount,
          discount: discount,
        },
        exchange_rate: {
          rate: exchangeRate,
          source: 'direct',
        },
        // ✅ FIXED: Track valuation method and customs calculation basis separately
        valuation_applied: {
          method: valuationMethod,
          original_items_total: itemsTotal, // Always actual product prices
          customs_calculation_base: customsCalculationBase, // Only affects customs calculation
          adjustment_applied: customsCalculationBase !== itemsTotal,
          calculation_type: 'sync',
          basis_explanation: valuationMethod === 'minimum_valuation' 
            ? 'Customs calculated on HSN minimum valuation' 
            : valuationMethod === 'higher_of_both'
            ? 'Customs calculated on higher of product value vs HSN minimum'
            : 'Customs calculated on actual product value'
        },
      },
      operational_data: {
        ...quote.operational_data,
        domestic_shipping: domesticShipping,
        handling_charge: handlingFee,
        insurance_amount: insuranceAmount,
        payment_gateway_fee: paymentGatewayFee,
      },
    };

    return { updated_quote: updatedQuote };
  }

  /**
   * Calculate complete costs with selected shipping (enhanced with HSN per-item taxes)
   */
  private async calculateCompleteCosts(params: {
    quote: UnifiedQuote;
    selectedShipping: ShippingOption;
    itemsTotal: number;
    totalWeight: number;
    hsnTaxBreakdown?: ItemTaxBreakdown[];
    hsnTaxSummary?: {
      total_items: number;
      total_customs: number;
      total_local_taxes: number;
      total_all_taxes: number;
      items_with_minimum_valuation: number;
      currency_conversions_applied: number;
    };
  }): Promise<{ updated_quote: UnifiedQuote }> {
    const { quote, selectedShipping, itemsTotal, hsnTaxBreakdown, hsnTaxSummary } = params;

    // Get exchange rate
    const exchangeRate = await optimizedCurrencyService.getExchangeRate(
      quote.origin_country,
      quote.destination_country,
    );

    // ✅ SIMPLIFIED: Always read tax values from input fields (single source of truth)
    let customsAmount = 0;
    let localTaxesAmount = 0;
    let destinationTaxAmount = 0;
    let insuranceAmount = 0;

    // 🔍 [DEBUG] Enhanced logging for quote bbfc6b7f-c630-41be-a688-ab3bb7087520
    if (quote.id === 'bbfc6b7f-c630-41be-a688-ab3bb7087520') {
      console.log(`[DEBUG] Reading input fields as single source of truth:`, {
        customs_percentage: quote.operational_data?.customs?.percentage,
        sales_tax_price: quote.calculation_data?.sales_tax_price,
        destination_tax: quote.calculation_data?.breakdown?.destination_tax,
        insurance_amount: quote.operational_data?.insurance_amount,
        handling_charge: quote.operational_data?.handling_charge,
        domestic_shipping: quote.operational_data?.domestic_shipping,
      });
    }

    // ✅ SIMPLIFIED TAX CALCULATION: Read directly from input fields
    const customsPercentage = quote.operational_data?.customs?.percentage || 0;

    // ✅ CRITICAL FIX: Create separate customs calculation base for ASYNC - ONLY affects customs
    const valuationMethod = quote.valuation_method_preference || 'product_value';
    let customsCalculationBase = itemsTotal; // Default to actual product prices
    
    // For HSN calculations, use the HSN summary data which already respects valuation methods
    if (hsnTaxSummary && hsnTaxSummary.items_with_minimum_valuation > 0) {
      // HSN calculation already handled valuation method - use for CUSTOMS ONLY
      if (hsnTaxBreakdown && hsnTaxBreakdown.length > 0) {
        customsCalculationBase = hsnTaxBreakdown.reduce((sum, item) => sum + item.taxable_amount_origin_currency, 0);
        console.log(`[VALUATION ASYNC] Customs basis from HSN calculation: ${itemsTotal} → ${customsCalculationBase}`);
      }
    } else if (valuationMethod === 'minimum_valuation' || valuationMethod === 'higher_of_both') {
      // Non-HSN calculation: check if minimum valuation data is available
      const hsnCalculationData = quote.calculation_data?.hsn_calculation;
      if (hsnCalculationData && hsnCalculationData.items_with_minimum_valuation > 0) {
        const hsnTotal = hsnCalculationData.recalculated_items_total || itemsTotal;
        
        if (valuationMethod === 'higher_of_both') {
          // Use whichever is higher FOR CUSTOMS ONLY
          customsCalculationBase = Math.max(itemsTotal, hsnTotal);
          console.log(`[VALUATION ASYNC] Customs basis - higher of both (cached): product=${itemsTotal}, hsn=${hsnTotal} → ${customsCalculationBase}`);
        } else {
          // Use minimum valuation FOR CUSTOMS ONLY
          customsCalculationBase = hsnTotal;
          console.log(`[VALUATION ASYNC] Customs basis - cached minimum valuation: ${itemsTotal} → ${customsCalculationBase}`);
        }
      } else {
        // Fallback: estimate minimum valuation as 20% higher (rough approximation)
        const estimatedMinimum = itemsTotal * 1.2;
        
        if (valuationMethod === 'higher_of_both') {
          // Use whichever is higher FOR CUSTOMS ONLY
          customsCalculationBase = Math.max(itemsTotal, estimatedMinimum);
          console.log(`[VALUATION ASYNC] Customs basis - higher of both (est.): product=${itemsTotal}, min=${estimatedMinimum} → ${customsCalculationBase}`);
        } else {
          // Use minimum valuation FOR CUSTOMS ONLY
          customsCalculationBase = estimatedMinimum;
          console.log(`[VALUATION ASYNC] Customs basis - estimating minimum valuation: ${itemsTotal} → ${customsCalculationBase} (est.)`);
        }
      }
    }
    
    console.log(`[VALUATION ASYNC] Product total: ${itemsTotal} (unchanged), Customs basis: ${customsCalculationBase} (method: ${valuationMethod})`);

    // ✅ FIXED: Calculate insurance using ACTUAL product prices, not customs basis
    insuranceAmount = await this.calculateRouteBasedInsurance(selectedShipping, itemsTotal, quote);

    // ✅ FIXED: Calculate customs using CIF value with customs calculation base
    if (customsPercentage > 0) {
      const cifValue = customsCalculationBase + selectedShipping.cost_usd + insuranceAmount;
      customsAmount = cifValue * (customsPercentage / 100);
    }

    // Read sales tax from input fields
    localTaxesAmount = quote.calculation_data?.sales_tax_price || 0;

    // ✅ FIXED: Calculate handling using ACTUAL product prices, not customs basis
    const handlingFee = await this.calculateRouteBasedHandling(selectedShipping, itemsTotal, quote);

    // ✅ CALCULATE DESTINATION TAX: Get VAT/GST rate for destination country
    try {
      const vatResult = await vatService.getVATPercentage(
        quote.origin_country,
        quote.destination_country,
      );

      if (vatResult.percentage > 0) {
        // ✅ FIXED: Calculate destination tax on landed cost using ACTUAL product prices
        const landedCost =
          itemsTotal +
          selectedShipping.cost_usd +
          insuranceAmount +
          customsAmount +
          handlingFee +
          localTaxesAmount;
        destinationTaxAmount = landedCost * (vatResult.percentage / 100);

        console.log(`[DESTINATION TAX DEBUG] Calculated destination tax:`, {
          destination_country: quote.destination_country,
          vat_rate: vatResult.percentage,
          vat_source: vatResult.source,
          landed_cost: landedCost,
          destination_tax_amount: destinationTaxAmount,
        });
      } else {
        destinationTaxAmount = 0;
        console.log(`[DESTINATION TAX DEBUG] No VAT/GST for ${quote.destination_country}`);
      }
    } catch (error) {
      console.warn(`[DESTINATION TAX] Error calculating destination tax:`, error);
      destinationTaxAmount = quote.calculation_data?.breakdown?.destination_tax || 0;
    }

    console.log(`[SMART ENGINE DEBUG] Final calculated values:`, {
      customs_percentage: customsPercentage,
      customs_amount: customsAmount,
      sales_tax: localTaxesAmount,
      destination_tax: destinationTaxAmount,
    });

    // ✅ FIXED: For non-HSN calculations, calculate insurance using ACTUAL product prices
    if (!hsnTaxSummary) {
      insuranceAmount = await this.calculateRouteBasedInsurance(
        selectedShipping,
        itemsTotal,
        quote,
      );
    }

    // ✅ FIXED: For HSN calculations, salesTax is already included in localTaxesAmount
    // For non-HSN, calculate on landed cost using ACTUAL product prices
    const landedCostForTax =
      itemsTotal + selectedShipping.cost_usd + insuranceAmount + customsAmount + handlingFee;
    const salesTax = hsnTaxSummary ? 0 : landedCostForTax * 0.1;
    const paymentGatewayFee =
      (itemsTotal + selectedShipping.cost_usd + customsAmount) * 0.029 + 0.3;

    // Calculate VAT (if applicable) - deprecated, replaced by destination tax
    let vatAmount = 0;
    if (hsnTaxSummary) {
      // VAT is already included in localTaxesAmount for HSN calculations
      vatAmount = 0;
    } else {
      // Legacy VAT calculation - will be replaced by destination tax
      vatAmount = 0; // Deprecated - destination tax is calculated separately
    }

    // ✅ FIXED: Calculate totals using ACTUAL product prices (itemsTotal)
    const subtotal =
      itemsTotal +
      selectedShipping.cost_usd +
      customsAmount +
      salesTax +
      localTaxesAmount + // Add HSN local taxes (GST/VAT)
      destinationTaxAmount + // Add destination tax (GST/VAT from input field)
      handlingFee +
      insuranceAmount +
      vatAmount;

    // Get discount amount and subtract it from final total
    const discount = quote.calculation_data?.discount || 0;
    const finalTotal = subtotal + paymentGatewayFee - discount;

    // Update quote data structures with HSN tax information
    console.log(`[SMART ENGINE DEBUG] Tax breakdown summary:`, {
      customs: customsAmount,
      taxes: salesTax + localTaxesAmount + vatAmount + destinationTaxAmount,
      localTaxes: localTaxesAmount,
      salesTax: salesTax,
      vatAmount: vatAmount,
      destinationTax: destinationTaxAmount,
      method: quote.calculation_method_preference,
    });

    const updatedCalculationData: CalculationData = {
      ...quote.calculation_data,
      breakdown: {
        items_total: itemsTotal, // ✅ FIXED: Use ACTUAL product prices, not adjusted
        shipping: selectedShipping.cost_usd,
        customs: customsAmount,
        taxes: salesTax + localTaxesAmount + vatAmount, // Local taxes only (legacy field)
        destination_tax: destinationTaxAmount, // Destination tax as separate field
        fees: paymentGatewayFee,
        handling: handlingFee,
        insurance: insuranceAmount,
        discount: discount,
      },
      exchange_rate: {
        rate: exchangeRate,
        source: 'currency_service',
        confidence: 0.95,
      },
      // 🆕 NEW: Add HSN calculation metadata
      hsn_calculation: hsnTaxSummary
        ? {
            method: 'per_item_hsn',
            total_items: hsnTaxSummary.total_items,
            items_with_minimum_valuation: hsnTaxSummary.items_with_minimum_valuation,
            currency_conversions_applied: hsnTaxSummary.currency_conversions_applied,
            total_hsn_customs: hsnTaxSummary.total_customs,
            total_hsn_local_taxes: hsnTaxSummary.total_local_taxes,
            calculation_timestamp: new Date().toISOString(),
            recalculated_items_total: customsCalculationBase, // ✅ FIXED: Track customs basis only
          }
        : {
            method: 'traditional_tier',
            customs_percentage: customsPercentage,
            tier_info: 'manual_calculation',
            calculation_timestamp: new Date().toISOString(),
            recalculated_items_total: customsCalculationBase, // ✅ FIXED: Track customs basis only
          },
      // ✅ FIXED: Track valuation method and customs calculation basis separately
      valuation_applied: {
        method: valuationMethod,
        original_items_total: itemsTotal, // Always actual product prices
        customs_calculation_base: customsCalculationBase, // Only affects customs calculation
        adjustment_applied: customsCalculationBase !== itemsTotal,
        calculation_type: 'async',
        hsn_calculation_used: !!hsnTaxSummary,
        basis_explanation: valuationMethod === 'minimum_valuation' 
          ? 'Customs calculated on HSN minimum valuation' 
          : valuationMethod === 'higher_of_both'
          ? 'Customs calculated on higher of product value vs HSN minimum'
          : 'Customs calculated on actual product value'
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
        smart_tier: null, // Smart tier calculation not used in this implementation
      },
      // 🆕 NEW: Add HSN operational data
      hsn_tax_data: hsnTaxBreakdown
        ? {
            per_item_breakdown: hsnTaxBreakdown.map((item) => ({
              item_id: item.item_id,
              item_name: item.item_name,
              hsn_code: item.hsn_code,
              valuation_method: item.valuation_method,
              taxable_amount: item.taxable_amount_origin_currency,
              customs: item.total_customs,
              local_taxes: item.total_local_taxes,
              total_taxes: item.total_taxes,
              minimum_valuation_applied: item.minimum_valuation_conversion
                ? {
                    usd_amount: item.minimum_valuation_conversion.usdAmount,
                    converted_amount: item.minimum_valuation_conversion.convertedAmount,
                    currency: item.minimum_valuation_conversion.originCurrency,
                    exchange_rate: item.minimum_valuation_conversion.exchangeRate,
                  }
                : null,
              warnings: item.warnings,
            })),
            calculation_method: 'hsn_per_item',
            confidence_scores: hsnTaxBreakdown.map((item) => ({
              item_id: item.item_id,
              confidence: item.confidence_score,
            })),
          }
        : null,
      // Add operational data to match live calculator structure
      domestic_shipping: quote.operational_data?.domestic_shipping || 0,
      handling_charge: handlingFee,
      insurance_amount: insuranceAmount,
      payment_gateway_fee: paymentGatewayFee,
      vat_amount: vatAmount,
    };

    // Calculate local currency total
    const finalTotalLocal = finalTotal * exchangeRate;

    const updatedQuote: UnifiedQuote = {
      ...quote,
      final_total_usd: Math.round(finalTotal * 100) / 100,
      final_total: Math.round(finalTotalLocal * 100) / 100, // Set local currency total
      calculation_data: updatedCalculationData,
      operational_data: updatedOperationalData,
      optimization_score: this.calculateOptimizationScore(finalTotal, itemsTotal),
    };

    console.log(`[SMART ENGINE DEBUG] Quote calculation completed:`, {
      id: updatedQuote.id,
      method: updatedQuote.calculation_method_preference,
      final_total: updatedQuote.final_total_usd,
      breakdown: updatedQuote.calculation_data?.breakdown,
    });

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
      originalQuote.items.reduce((sum, item) => sum + item.weight, 0) / originalQuote.items.length;
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
    // ✅ AUTO-APPLY: Calculate default handling charge when available in backend
    const calculatedDefault = calculationDefaultsService.calculateHandlingDefault(
      quote,
      shippingOption,
    );

    // If backend configuration is available, use calculated default (auto-apply)
    if (calculatedDefault > 0) {
      return calculatedDefault;
    }

    // Fallback: Check if there's a manual override when no backend config available
    const existingHandling = quote.operational_data?.handling_charge;
    if (existingHandling && existingHandling > 0) {
      return existingHandling;
    }

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
    // Check customer preference for insurance
    const customerOptedIn = quote.customer_data?.preferences?.insurance_opted_in ?? false;

    // Check if shipping option has route-based insurance configuration
    const routeInsuranceConfig = (shippingOption as any).insurance_options;

    console.log('[SmartCalculationEngine ASYNC] Insurance calculation debug:', {
      quoteId: quote.id,
      customerOptedIn,
      hasInsuranceConfig: !!routeInsuranceConfig,
      configAvailable: routeInsuranceConfig?.available,
      defaultEnabled: routeInsuranceConfig?.default_enabled,
      coveragePercentage: routeInsuranceConfig?.coverage_percentage,
      itemsTotal
    });

    if (routeInsuranceConfig && routeInsuranceConfig.available) {
      // Check if customer opted in OR if route has default_enabled
      const shouldCalculate = customerOptedIn || routeInsuranceConfig.default_enabled;
      
      console.log('[SmartCalculationEngine ASYNC] Insurance shouldCalculate:', shouldCalculate, {
        customerOptedIn,
        defaultEnabled: routeInsuranceConfig.default_enabled
      });
      
      if (!shouldCalculate) {
        console.log('[SmartCalculationEngine] Insurance not enabled - customer opt-in required and not default enabled');
        return 0;
      }

      const coveragePercentage = routeInsuranceConfig.coverage_percentage || 1.5; // Default 1.5%
      const calculatedInsurance = itemsTotal * (coveragePercentage / 100);

      // Apply min/max bounds
      const minFee = routeInsuranceConfig.min_fee || 0;
      const maxCoverage = routeInsuranceConfig.max_coverage || Infinity;
      const finalInsurance = Math.max(minFee, Math.min(maxCoverage, calculatedInsurance));

      console.log('[SmartCalculationEngine ASYNC] Insurance calculation result:', {
        coveragePercentage,
        calculatedInsurance,
        minFee,
        maxCoverage,
        finalInsurance
      });

      return finalInsurance;
    }

    // Fallback to existing operational data
    const existingInsurance = quote.operational_data?.insurance_amount;
    if (existingInsurance && existingInsurance > 0) {
      return existingInsurance;
    }

    // No fallback calculations - require explicit configuration
    if (!customerOptedIn) {
      return 0;
    }

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
    // ✅ AUTO-APPLY: Use CalculationDefaultsService for consistent calculation
    const calculatedDefault = calculationDefaultsService.calculateHandlingDefault(
      quote,
      shippingOption,
    );

    // If backend configuration is available, use calculated default (auto-apply)
    if (calculatedDefault > 0) {
      return calculatedDefault;
    }

    // Fallback to existing operational data when no backend config available
    const existingHandling = quote.operational_data?.handling_charge;
    if (existingHandling && existingHandling > 0) {
      return existingHandling;
    }

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

    console.log('[SmartCalculationEngine SYNC] Insurance calculation debug:', {
      quoteId: quote.id,
      customerOptedIn,
      hasInsuranceConfig: !!routeInsuranceConfig,
      configAvailable: routeInsuranceConfig?.available,
      defaultEnabled: routeInsuranceConfig?.default_enabled,
      coveragePercentage: routeInsuranceConfig?.coverage_percentage,
      itemsTotal
    });

    if (routeInsuranceConfig && routeInsuranceConfig.available) {
      // Check if customer opted in OR if route has default_enabled
      const shouldCalculate = customerOptedIn || routeInsuranceConfig.default_enabled;
      
      console.log('[SmartCalculationEngine SYNC] Insurance shouldCalculate:', shouldCalculate, {
        customerOptedIn,
        defaultEnabled: routeInsuranceConfig.default_enabled
      });
      
      if (!shouldCalculate) {
        console.log('[SmartCalculationEngine] Insurance not enabled - customer opt-in required and not default enabled');
        return 0;
      }

      const coveragePercentage = routeInsuranceConfig.coverage_percentage || 1.5; // Default 1.5%
      const calculatedInsurance = itemsTotal * (coveragePercentage / 100);

      // Apply min/max bounds
      const minFee = routeInsuranceConfig.min_fee || 0;
      const maxCoverage = routeInsuranceConfig.max_coverage || Infinity;
      const finalInsurance = Math.max(minFee, Math.min(maxCoverage, calculatedInsurance));

      console.log('[SmartCalculationEngine SYNC] Insurance calculation result:', {
        coveragePercentage,
        calculatedInsurance,
        minFee,
        maxCoverage,
        finalInsurance
      });
      
      return finalInsurance;
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
    // Put tax method at the beginning to ensure it's included in the truncated key
    const taxMethod =
      input.tax_calculation_preferences?.calculation_method_preference ||
      input.quote.calculation_method_preference ||
      'hsn_only'; // ✅ NEW: Consistent with calculation context
    const valuationMethod =
      input.tax_calculation_preferences?.valuation_method_preference ||
      input.quote.valuation_method_preference ||
      'product_value'; // ✅ NEW: Consistent with calculation context

    const keyData = {
      tax_method: taxMethod,
      valuation_method: valuationMethod,
      quote_id: input.quote.id,
      items: input.quote.items.map((item) => ({
        price: item.costprice_origin,
        weight: item.weight,
        quantity: item.quantity,
      })),
      countries: `${input.quote.origin_country}-${input.quote.destination_country}`,
      preferences: input.preferences,
    };

    // Use a hash function to ensure unique keys without length issues
    const keyString = JSON.stringify(keyData);
    let hash = 0;
    for (let i = 0; i < keyString.length; i++) {
      const char = keyString.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }

    // Combine hash with tax method to ensure different methods have different keys
    return `${taxMethod}_${valuationMethod}_${Math.abs(hash).toString(36)}`;
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

  /**
   * 🚀 NEW: Invalidate caches when quote data changes
   */
  async invalidateQuoteCache(quoteId: string): Promise<void> {
    // Clear smart cache
    await smartQuoteCacheService.invalidateQuoteCache(quoteId);
    
    // Clear legacy cache entries for this quote
    const keysToRemove = Array.from(this.calculationCache.keys()).filter(key => 
      key.includes(quoteId)
    );
    keysToRemove.forEach(key => this.calculationCache.delete(key));
    
    console.log(`[SMART ENGINE] Invalidated caches for quote: ${quoteId}`);
  }

  /**
   * 🚀 NEW: Get cache performance statistics
   */
  getCacheStats() {
    return {
      smartCache: smartQuoteCacheService.getCacheStats(),
      legacyCache: {
        size: this.calculationCache.size,
        oldestEntry: this.getOldestCacheEntry()
      }
    };
  }

  private getOldestCacheEntry(): number | null {
    let oldest = Date.now();
    for (const [_, entry] of this.calculationCache) {
      if (entry.timestamp < oldest) {
        oldest = entry.timestamp;
      }
    }
    return this.calculationCache.size > 0 ? oldest : null;
  }
}

// Export singleton instance
export const smartCalculationEngine = SmartCalculationEngine.getInstance();
