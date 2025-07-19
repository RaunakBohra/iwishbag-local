import { getShippingCost } from '@/lib/unified-shipping-calculator';
import { Tables } from '@/integrations/supabase/types';
import { currencyService } from '@/services/CurrencyService';
import { optimalExchangeRateService, ExchangeRateResult } from '@/services/OptimalExchangeRateService';
import {
  startQuoteCalculationMonitoring,
  completeQuoteCalculationMonitoring,
  recordQuoteCalculationApiCall,
  QuoteCalculationErrorCode,
} from '@/services/ErrorHandlingService';
import {
  logger,
  LogCategory,
  logInfo,
  logError,
  logWarn,
  logPerformanceStart,
  logPerformanceEnd,
} from '@/services/LoggingService';

// Types
export interface QuoteItem {
  id: string;
  item_price: number;
  item_weight: number;
  quantity: number;
  product_name?: string | null;
  options?: string | null;
  product_url?: string | null;
  image_url?: string | null;
}

export interface QuoteCalculationParams {
  items: QuoteItem[];
  originCountry: string;
  destinationCountry: string;
  currency: string;
  sales_tax_price?: number;
  merchant_shipping_price?: number;
  domestic_shipping?: number;
  handling_charge?: number;
  discount?: number;
  insurance_amount?: number;
  customs_percentage?: number;
  countrySettings: Tables<'country_settings'>;
  shippingAddress?: {
    destination_country?: string;
    city?: string;
    state_province_region?: string;
    postal_code?: string;
    address_line1?: string;
    address_line2?: string;
    recipient_name?: string;
    phone?: string;
  };
}

export interface QuoteCalculationBreakdown {
  // Item totals
  total_item_price: number;
  total_item_weight: number;

  // Cost components (all in USD - universal base)
  sales_tax_price: number;
  merchant_shipping_price: number;
  international_shipping: number;
  domestic_shipping: number;
  handling_charge: number;
  insurance_amount: number;
  customs_and_ecs: number;
  discount: number;

  // Fees and totals (USD base)
  payment_gateway_fee: number;
  subtotal_before_fees: number;
  subtotal: number;
  vat: number;
  final_total_usd: number;      // USD amount (for storage)
  final_total_local: number;    // Local currency amount (for display)

  // Currency metadata
  currency: string;             // Always 'USD' for calculations
  destination_currency: string; // Customer's preferred currency
  exchange_rate: number;
  exchange_rate_source: string;
  exchange_rate_method: string;
  shipping_method: string;
  shipping_route_id?: number;
  calculation_timestamp: Date;
}

export interface QuoteCalculationResult {
  success: boolean;
  breakdown: QuoteCalculationBreakdown | null;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  warnings?: string[];
  performance?: {
    calculation_time_ms: number;
    cache_hits: number;
    api_calls: number;
  };
}

export interface ValidationResult {
  isValid: boolean;
  errors: Array<{
    field: string;
    message: string;
    code: string;
  }>;
  warnings: Array<{
    field: string;
    message: string;
    code: string;
  }>;
}

export class QuoteCalculatorService {
  private static instance: QuoteCalculatorService;
  private calculationCache = new Map<
    string,
    { result: QuoteCalculationResult; timestamp: number }
  >();
  private exchangeRateCache = new Map<string, { rate: ExchangeRateResult; timestamp: number }>();
  private readonly CACHE_DURATION = 15 * 60 * 1000; // 15 minutes
  private performanceMetrics = {
    totalCalculations: 0,
    totalCacheHits: 0,
    totalApiCalls: 0,
    averageCalculationTime: 0,
  };

  // **NEW: Monitoring tracking**
  private activeCalculations = new Map<
    string,
    { apiCalls: number; cacheHits: number; userId?: string }
  >();

  private constructor() {}

  static getInstance(): QuoteCalculatorService {
    if (!QuoteCalculatorService.instance) {
      QuoteCalculatorService.instance = new QuoteCalculatorService();
    }
    return QuoteCalculatorService.instance;
  }

  /**
   * Main quote calculation method
   */
  async calculateQuote(
    params: QuoteCalculationParams,
    userId?: string,
    sessionId?: string,
  ): Promise<QuoteCalculationResult> {
    const startTime = Date.now();
    this.performanceMetrics.totalCalculations++;

    // **NEW: Generate unique calculation ID and start monitoring**
    const calculationId = `calc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const totalValue = params.items.reduce((sum, item) => sum + item.item_price * item.quantity, 0);

    // Initialize monitoring tracking
    this.activeCalculations.set(calculationId, {
      apiCalls: 0,
      cacheHits: 0,
      userId,
    });

    // Start monitoring
    startQuoteCalculationMonitoring(
      calculationId,
      params.originCountry,
      params.destinationCountry,
      params.currency,
      params.items.length,
      totalValue,
      userId,
      sessionId,
    );

    // Enhanced logging
    logInfo(LogCategory.QUOTE_CALCULATION, 'Quote calculation started', {
      quoteId: calculationId,
      userId,
      sessionId,
      originCountry: params.originCountry,
      destinationCountry: params.destinationCountry,
      currency: params.currency,
      metadata: {
        itemCount: params.items.length,
        totalValue,
        hasShippingAddress: !!params.shippingAddress,
        hasCustomsPercentage: params.customs_percentage !== undefined,
      },
    });

    try {
      // Generate cache key
      const cacheKey = this.generateCacheKey(params);

      // Check cache first
      const cachedResult = this.getCachedCalculation(cacheKey);
      if (cachedResult) {
        this.performanceMetrics.totalCacheHits++;
        // **NEW: Record cache hit**
        const tracking = this.activeCalculations.get(calculationId);
        if (tracking) {
          tracking.cacheHits++;
          recordQuoteCalculationApiCall(calculationId, true);
        }

        // Enhanced logging for cache hit
        logInfo(LogCategory.CACHE_OPERATION, 'Quote calculation cache hit', {
          quoteId: calculationId,
          userId,
          sessionId,
          metadata: {
            cacheKey,
            finalTotalUsd: cachedResult.breakdown?.final_total_usd,
          finalTotalLocal: cachedResult.breakdown?.final_total_local,
            calculationTime: Date.now() - startTime,
          },
        });

        // **NEW: Complete monitoring for cached result**
        completeQuoteCalculationMonitoring(
          calculationId,
          true, // success
          cachedResult.breakdown?.final_total_usd,
          undefined, // no error
          tracking?.apiCalls || 0,
          tracking?.cacheHits || 1,
          0, // no cache misses for pure cache hit
        );

        this.activeCalculations.delete(calculationId);
        return cachedResult;
      }

      // **NEW: Record cache miss**
      recordQuoteCalculationApiCall(calculationId, false);

      // Validate input parameters
      const validation = this.validateCalculationParams(params);
      if (!validation.isValid) {
        // Enhanced logging for validation errors
        logError(LogCategory.QUOTE_CALCULATION, 'Quote calculation validation failed', undefined, {
          quoteId: calculationId,
          userId,
          sessionId,
          errorCode: validation.errors[0]?.code,
          metadata: {
            errors: validation.errors,
            warnings: validation.warnings,
            originCountry: params.originCountry,
            destinationCountry: params.destinationCountry,
          },
        });

        // **NEW: Complete monitoring for validation error**
        const errorCode = this.mapValidationErrorToMonitoringCode(validation.errors[0]?.code);
        completeQuoteCalculationMonitoring(
          calculationId,
          false, // failed
          undefined,
          errorCode,
          this.activeCalculations.get(calculationId)?.apiCalls || 0,
          this.activeCalculations.get(calculationId)?.cacheHits || 0,
          1, // cache miss
        );

        this.activeCalculations.delete(calculationId);
        return {
          success: false,
          breakdown: null,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid calculation parameters',
            details: validation.errors,
          },
        };
      }

      // Perform calculation
      const breakdown = await this.performCalculation(params, calculationId);

      const tracking = this.activeCalculations.get(calculationId);
      const result: QuoteCalculationResult = {
        success: true,
        breakdown,
        warnings: validation.warnings.map((w) => w.message),
        performance: {
          calculation_time_ms: Date.now() - startTime,
          cache_hits: tracking?.cacheHits || 0,
          api_calls: tracking?.apiCalls || 0,
        },
      };

      // Cache the result
      this.cacheCalculation(cacheKey, result);

      // Update performance metrics
      this.updatePerformanceMetrics(Date.now() - startTime);

      // Enhanced logging for successful calculation
      logInfo(LogCategory.QUOTE_CALCULATION, 'Quote calculation completed successfully', {
        quoteId: calculationId,
        userId,
        sessionId,
        metadata: {
          finalTotalUsd: breakdown.final_total_usd,
          finalTotalLocal: breakdown.final_total_local,
          currency: params.currency,
          calculationTime: result.performance?.calculation_time_ms,
          apiCalls: tracking?.apiCalls || 0,
          cacheHits: tracking?.cacheHits || 0,
          warningCount: validation.warnings.length,
        },
      });

      // **NEW: Complete monitoring for successful calculation**
      completeQuoteCalculationMonitoring(
        calculationId,
        true, // success
        breakdown.final_total_usd,
        undefined, // no error
        tracking?.apiCalls || 0,
        tracking?.cacheHits || 0,
        1, // one cache miss (for the initial lookup)
      );

      this.activeCalculations.delete(calculationId);
      return result;
    } catch (error) {
      // Enhanced error logging
      logError(
        LogCategory.QUOTE_CALCULATION,
        'Quote calculation failed with exception',
        error instanceof Error ? error : new Error(String(error)),
        {
          quoteId: calculationId,
          userId,
          sessionId,
          metadata: {
            originCountry: params.originCountry,
            destinationCountry: params.destinationCountry,
            currency: params.currency,
            itemCount: params.items.length,
            calculationTime: Date.now() - startTime,
          },
        },
      );

      // **NEW: Complete monitoring for calculation error**
      const tracking = this.activeCalculations.get(calculationId);
      completeQuoteCalculationMonitoring(
        calculationId,
        false, // failed
        undefined,
        QuoteCalculationErrorCode.CALCULATION_FAILED,
        tracking?.apiCalls || 0,
        tracking?.cacheHits || 0,
        1, // cache miss
      );

      this.activeCalculations.delete(calculationId);
      return {
        success: false,
        breakdown: null,
        error: {
          code: 'CALCULATION_ERROR',
          message: error instanceof Error ? error.message : 'Unknown calculation error',
          details: error,
        },
      };
    }
  }

  /**
   * Validate calculation parameters
   */
  private validateCalculationParams(params: QuoteCalculationParams): ValidationResult {
    const errors: ValidationResult['errors'] = [];
    const warnings: ValidationResult['warnings'] = [];

    // Validate items
    if (!params.items || params.items.length === 0) {
      errors.push({
        field: 'items',
        message: 'At least one item is required',
        code: 'MISSING_ITEMS',
      });
    }

    // Validate countries
    if (!params.originCountry) {
      errors.push({
        field: 'originCountry',
        message: 'Origin country is required',
        code: 'MISSING_ORIGIN_COUNTRY',
      });
    }

    if (!params.destinationCountry) {
      errors.push({
        field: 'destinationCountry',
        message: 'Destination country is required',
        code: 'MISSING_DESTINATION_COUNTRY',
      });
    }

    // Validate country settings
    if (!params.countrySettings) {
      errors.push({
        field: 'countrySettings',
        message: 'Country settings are required',
        code: 'MISSING_COUNTRY_SETTINGS',
      });
    } else {
      // Validate exchange rate
      const rate = params.countrySettings.rate_from_usd;
      if (!rate || rate <= 0 || !isFinite(rate)) {
        errors.push({
          field: 'exchangeRate',
          message: `Invalid exchange rate for ${params.originCountry}: ${rate}`,
          code: 'INVALID_EXCHANGE_RATE',
        });
      } else if (rate > 1000) {
        warnings.push({
          field: 'exchangeRate',
          message: `Very high exchange rate detected for ${params.originCountry}: ${rate}`,
          code: 'HIGH_EXCHANGE_RATE',
        });
      }
    }

    // Validate items
    params.items.forEach((item, index) => {
      if (!item.item_price || item.item_price < 0) {
        errors.push({
          field: `items[${index}].item_price`,
          message: 'Item price must be greater than 0',
          code: 'INVALID_ITEM_PRICE',
        });
      }

      if (!item.item_weight || item.item_weight < 0) {
        errors.push({
          field: `items[${index}].item_weight`,
          message: 'Item weight must be greater than 0',
          code: 'INVALID_ITEM_WEIGHT',
        });
      }

      if (!item.quantity || item.quantity < 1) {
        errors.push({
          field: `items[${index}].quantity`,
          message: 'Item quantity must be at least 1',
          code: 'INVALID_ITEM_QUANTITY',
        });
      }

      // Warn about extremely high values
      if (item.item_price > 100000) {
        warnings.push({
          field: `items[${index}].item_price`,
          message: `Very high item price: ${item.item_price}`,
          code: 'HIGH_ITEM_PRICE',
        });
      }
    });

    // Validate optional numeric fields
    const numericFields = [
      'sales_tax_price',
      'merchant_shipping_price',
      'domestic_shipping',
      'handling_charge',
      'discount',
      'insurance_amount',
      'customs_percentage',
    ];

    numericFields.forEach((field) => {
      const value = params[field as keyof QuoteCalculationParams] as number;
      if (value !== undefined && value !== null) {
        if (isNaN(value) || !isFinite(value)) {
          errors.push({
            field,
            message: `${field} must be a valid number`,
            code: 'INVALID_NUMERIC_VALUE',
          });
        } else if (value < 0 && field !== 'discount') {
          errors.push({
            field,
            message: `${field} cannot be negative`,
            code: 'NEGATIVE_VALUE',
          });
        } else if (value > 100000) {
          warnings.push({
            field,
            message: `Very high ${field}: ${value}`,
            code: 'HIGH_VALUE',
          });
        }
      }
    });

    // Validate customs percentage
    if (params.customs_percentage !== undefined) {
      if (params.customs_percentage > 100) {
        warnings.push({
          field: 'customs_percentage',
          message: `Customs percentage seems high: ${params.customs_percentage}%`,
          code: 'HIGH_CUSTOMS_PERCENTAGE',
        });
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Map validation error codes to monitoring error codes
   */
  private mapValidationErrorToMonitoringCode(errorCode?: string): QuoteCalculationErrorCode {
    switch (errorCode) {
      case 'MISSING_ITEMS':
        return QuoteCalculationErrorCode.MISSING_ITEMS;
      case 'MISSING_ORIGIN_COUNTRY':
        return QuoteCalculationErrorCode.MISSING_ORIGIN_COUNTRY;
      case 'MISSING_DESTINATION_COUNTRY':
        return QuoteCalculationErrorCode.MISSING_DESTINATION_COUNTRY;
      case 'MISSING_COUNTRY_SETTINGS':
        return QuoteCalculationErrorCode.MISSING_COUNTRY_SETTINGS;
      case 'INVALID_ITEM_PRICE':
        return QuoteCalculationErrorCode.INVALID_ITEM_PRICE;
      case 'INVALID_ITEM_WEIGHT':
        return QuoteCalculationErrorCode.INVALID_ITEM_WEIGHT;
      case 'INVALID_ITEM_QUANTITY':
        return QuoteCalculationErrorCode.INVALID_ITEM_QUANTITY;
      case 'INVALID_EXCHANGE_RATE':
        return QuoteCalculationErrorCode.INVALID_EXCHANGE_RATE;
      case 'INVALID_NUMERIC_VALUE':
        return QuoteCalculationErrorCode.INVALID_NUMERIC_VALUE;
      case 'NEGATIVE_VALUE':
        return QuoteCalculationErrorCode.NEGATIVE_VALUE;
      default:
        return QuoteCalculationErrorCode.CALCULATION_FAILED;
    }
  }

  /**
   * Perform the actual calculation
   */
  private async performCalculation(
    params: QuoteCalculationParams,
    calculationId?: string,
  ): Promise<QuoteCalculationBreakdown> {
    // Start performance tracking for calculation steps
    logPerformanceStart(`calculation.${calculationId}`);

    // Calculate item totals
    const total_item_price = params.items.reduce(
      (sum, item) => sum + item.item_price * item.quantity,
      0,
    );
    const total_item_weight = params.items.reduce(
      (sum, item) => sum + item.item_weight * item.quantity,
      0,
    );

    // Determine destination currency
    const destinationCurrency = currencyService.getCurrencyForCountrySync(
      params.destinationCountry,
    );

    // Get optimal exchange rate using the new service
    this.performanceMetrics.totalApiCalls++;
    if (calculationId) {
      const tracking = this.activeCalculations.get(calculationId);
      if (tracking) {
        tracking.apiCalls++;
        recordQuoteCalculationApiCall(calculationId, false);
      }
    }

    const exchangeRateResult = await optimalExchangeRateService.getOptimalExchangeRate(
      'USD', // All calculations are based in USD
      destinationCurrency,
      params.originCountry,
      params.destinationCountry
    );

    // Log calculation details
    logger.debug(LogCategory.QUOTE_CALCULATION, 'Starting calculation breakdown', {
      quoteId: calculationId,
      metadata: {
        totalItemPrice: total_item_price,
        totalItemWeight: total_item_weight,
        itemCount: params.items.length,
      },
    });

    // Parse numeric values with safety
    const parseNumeric = (value: string | number | null | undefined, defaultValue = 0): number => {
      if (value === null || value === undefined || value === '') return defaultValue;
      const parsed = typeof value === 'string' ? parseFloat(value) : Number(value);
      return isNaN(parsed) ? defaultValue : parsed;
    };

    const sales_tax_price = parseNumeric(params.sales_tax_price);
    const merchant_shipping_price = parseNumeric(params.merchant_shipping_price);
    const domestic_shipping = parseNumeric(params.domestic_shipping);
    const handling_charge = parseNumeric(params.handling_charge);
    const discount = parseNumeric(params.discount);
    const insurance_amount = parseNumeric(params.insurance_amount);

    // Parse customs percentage with smart handling for incorrect storage
    let customs_percentage = parseNumeric(params.customs_percentage);
    if (customs_percentage > 10000) {
      customs_percentage = customs_percentage / 10000; // Handle basis points
    } else if (customs_percentage > 100) {
      customs_percentage = customs_percentage / 100; // Handle percentage stored as whole numbers
    }
    customs_percentage = Math.min(customs_percentage, 50); // Cap at 50%

    // Get shipping cost
    this.performanceMetrics.totalApiCalls++;
    // **NEW: Record API call for monitoring**
    if (calculationId) {
      const tracking = this.activeCalculations.get(calculationId);
      if (tracking) {
        tracking.apiCalls++;
        recordQuoteCalculationApiCall(calculationId, false); // Not a cache hit
      }
    }

    // Log shipping API call
    const shippingStartTime = performance.now();
    const apiRequestId = logger.logApiRequest('GET', 'getShippingCost', {
      quoteId: calculationId,
      metadata: {
        originCountry: params.originCountry,
        destinationCountry: params.destinationCountry,
        totalWeight: total_item_weight,
        totalPrice: total_item_price,
      },
    });

    const shippingCost = await getShippingCost(
      params.originCountry,
      params.destinationCountry,
      total_item_weight,
      total_item_price,
    );

    // Log shipping API response
    logger.logApiResponse(
      apiRequestId,
      200, // Assuming success
      performance.now() - shippingStartTime,
      {
        quoteId: calculationId,
        metadata: {
          method: shippingCost.method,
          cost: shippingCost.cost,
          hasRoute: !!shippingCost.route,
        },
      },
    );

    // All shipping costs are now in USD (universal base)
    const international_shipping = shippingCost.cost; // Assumed to be in USD
    const shipping_method = shippingCost.method === 'route-specific' ? 'route-specific' : 'country_settings';
    const shipping_route_id = shippingCost.route?.id;
    
    // Use optimal exchange rate result
    const exchange_rate = exchangeRateResult.rate;
    const exchange_rate_source = exchangeRateResult.source;
    const exchange_rate_method = exchangeRateResult.method;

    // Calculate customs and duties
    const customs_and_ecs =
      (total_item_price + sales_tax_price + merchant_shipping_price + international_shipping) *
      (customs_percentage / 100);

    // Calculate subtotal before fees
    const subtotal_before_fees =
      total_item_price +
      sales_tax_price +
      merchant_shipping_price +
      international_shipping +
      customs_and_ecs +
      domestic_shipping +
      handling_charge +
      insurance_amount -
      discount;

    // Calculate payment gateway fee
    const gateway_percent_fee = params.countrySettings.payment_gateway_percent_fee || 0;
    const reasonable_percent_fee =
      gateway_percent_fee > 100 ? gateway_percent_fee / 100 : gateway_percent_fee;

    const payment_gateway_fee =
      (params.countrySettings.payment_gateway_fixed_fee || 0) +
      (subtotal_before_fees * reasonable_percent_fee) / 100;

    // Calculate final totals in USD (universal base)
    const subtotal = subtotal_before_fees + payment_gateway_fee;
    const vat = Math.round(subtotal * ((params.countrySettings.vat || 0) / 100) * 100) / 100;
    const final_total_usd = Math.round((subtotal + vat) * 100) / 100;
    
    // Calculate local currency amount for display
    const final_total_local = Math.round((final_total_usd * exchange_rate) * 100) / 100;

    // End performance tracking
    logPerformanceEnd(`calculation.${calculationId}`, LogCategory.QUOTE_CALCULATION, {
      quoteId: calculationId,
      metadata: {
        finalTotalUsd: final_total_usd,
        finalTotalLocal: final_total_local,
        destinationCurrency: destinationCurrency,
      },
    });

    // Log calculation breakdown summary
    logger.debug(LogCategory.QUOTE_CALCULATION, 'Calculation breakdown completed', {
      quoteId: calculationId,
      metadata: {
        breakdown: {
          itemTotal: total_item_price,
          internationalShipping: international_shipping,
          customsAndEcs: customs_and_ecs,
          paymentGatewayFee: payment_gateway_fee,
          vat,
          finalTotalUsd: final_total_usd,
          finalTotalLocal: final_total_local,
        },
        exchangeRate: exchange_rate,
        exchangeRateSource: exchange_rate_source,
        shippingMethod: shipping_method,
      },
    });

    return {
      total_item_price,
      total_item_weight,
      sales_tax_price,
      merchant_shipping_price,
      international_shipping,
      domestic_shipping,
      handling_charge,
      insurance_amount,
      customs_and_ecs,
      discount,
      payment_gateway_fee,
      subtotal_before_fees,
      subtotal,
      vat,
      final_total_usd,                // USD amount (for storage)
      final_total_local,              // Local currency amount (for display)
      currency: 'USD',                // Always USD for calculations
      destination_currency: destinationCurrency,
      exchange_rate,
      exchange_rate_source,
      exchange_rate_method,
      shipping_method,
      shipping_route_id,
      calculation_timestamp: new Date(),
    };
  }

  /**
   * Generate cache key for calculation
   */
  private generateCacheKey(params: QuoteCalculationParams): string {
    const keyData = {
      items: params.items.map((item) => ({
        price: item.item_price,
        weight: item.item_weight,
        quantity: item.quantity,
      })),
      origin: params.originCountry,
      destination: params.destinationCountry,
      currency: params.currency,
      sales_tax: params.sales_tax_price || 0,
      merchant_shipping: params.merchant_shipping_price || 0,
      domestic_shipping: params.domestic_shipping || 0,
      handling: params.handling_charge || 0,
      discount: params.discount || 0,
      insurance: params.insurance_amount || 0,
      customs: params.customs_percentage || 0,
      rate: params.countrySettings.rate_from_usd,
    };

    return btoa(JSON.stringify(keyData)).replace(/[^a-zA-Z0-9]/g, '');
  }

  /**
   * Cache management methods
   */
  private getCachedCalculation(cacheKey: string): QuoteCalculationResult | null {
    const cached = this.calculationCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.result;
    }
    this.calculationCache.delete(cacheKey);
    return null;
  }

  private cacheCalculation(cacheKey: string, result: QuoteCalculationResult): void {
    this.calculationCache.set(cacheKey, {
      result,
      timestamp: Date.now(),
    });
  }

  /**
   * Performance tracking
   */
  private updatePerformanceMetrics(calculationTime: number): void {
    this.performanceMetrics.averageCalculationTime =
      (this.performanceMetrics.averageCalculationTime *
        (this.performanceMetrics.totalCalculations - 1) +
        calculationTime) /
      this.performanceMetrics.totalCalculations;
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics() {
    return {
      ...this.performanceMetrics,
      cacheHitRate:
        this.performanceMetrics.totalCalculations > 0
          ? (this.performanceMetrics.totalCacheHits / this.performanceMetrics.totalCalculations) *
            100
          : 0,
      cacheSize: this.calculationCache.size,
    };
  }

  /**
   * Clear all caches
   */
  clearCache(): void {
    this.calculationCache.clear();
    this.exchangeRateCache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      calculationCache: {
        size: this.calculationCache.size,
        entries: Array.from(this.calculationCache.keys()),
      },
      exchangeRateCache: {
        size: this.exchangeRateCache.size,
        entries: Array.from(this.exchangeRateCache.keys()),
      },
    };
  }
}

// Export singleton instance
export const quoteCalculatorService = QuoteCalculatorService.getInstance();
