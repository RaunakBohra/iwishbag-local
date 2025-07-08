import { getExchangeRate, ExchangeRateResult } from '@/lib/currencyUtils';
import { getShippingCost } from '@/lib/unified-shipping-calculator';
import { Tables } from '@/integrations/supabase/types';

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
  shippingAddress?: any;
}

export interface QuoteCalculationBreakdown {
  // Item totals
  total_item_price: number;
  total_item_weight: number;
  
  // Cost components
  sales_tax_price: number;
  merchant_shipping_price: number;
  international_shipping: number;
  domestic_shipping: number;
  handling_charge: number;
  insurance_amount: number;
  customs_and_ecs: number;
  discount: number;
  
  // Fees and totals
  payment_gateway_fee: number;
  subtotal_before_fees: number;
  subtotal: number;
  vat: number;
  final_total: number;
  
  // Metadata
  exchange_rate: number;
  exchange_rate_source: string;
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
    details?: any;
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
  private calculationCache = new Map<string, { result: QuoteCalculationResult; timestamp: number }>();
  private exchangeRateCache = new Map<string, { rate: ExchangeRateResult; timestamp: number }>();
  private readonly CACHE_DURATION = 15 * 60 * 1000; // 15 minutes
  private performanceMetrics = {
    totalCalculations: 0,
    totalCacheHits: 0,
    totalApiCalls: 0,
    averageCalculationTime: 0
  };

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
  async calculateQuote(params: QuoteCalculationParams): Promise<QuoteCalculationResult> {
    const startTime = Date.now();
    this.performanceMetrics.totalCalculations++;

    try {
      // Generate cache key
      const cacheKey = this.generateCacheKey(params);
      
      // Check cache first
      const cachedResult = this.getCachedCalculation(cacheKey);
      if (cachedResult) {
        this.performanceMetrics.totalCacheHits++;
        return cachedResult;
      }

      // Validate input parameters
      const validation = this.validateCalculationParams(params);
      if (!validation.isValid) {
        return {
          success: false,
          breakdown: null,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid calculation parameters',
            details: validation.errors
          }
        };
      }

      // Perform calculation
      const breakdown = await this.performCalculation(params);
      
      const result: QuoteCalculationResult = {
        success: true,
        breakdown,
        warnings: validation.warnings.map(w => w.message),
        performance: {
          calculation_time_ms: Date.now() - startTime,
          cache_hits: 0,
          api_calls: this.performanceMetrics.totalApiCalls
        }
      };

      // Cache the result
      this.cacheCalculation(cacheKey, result);
      
      // Update performance metrics
      this.updatePerformanceMetrics(Date.now() - startTime);

      return result;

    } catch (error) {
      console.error('[QuoteCalculatorService] Calculation error:', error);
      return {
        success: false,
        breakdown: null,
        error: {
          code: 'CALCULATION_ERROR',
          message: error instanceof Error ? error.message : 'Unknown calculation error',
          details: error
        }
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
        code: 'MISSING_ITEMS'
      });
    }

    // Validate countries
    if (!params.originCountry) {
      errors.push({
        field: 'originCountry',
        message: 'Origin country is required',
        code: 'MISSING_ORIGIN_COUNTRY'
      });
    }

    if (!params.destinationCountry) {
      errors.push({
        field: 'destinationCountry', 
        message: 'Destination country is required',
        code: 'MISSING_DESTINATION_COUNTRY'
      });
    }

    // Validate country settings
    if (!params.countrySettings) {
      errors.push({
        field: 'countrySettings',
        message: 'Country settings are required',
        code: 'MISSING_COUNTRY_SETTINGS'
      });
    } else {
      // Validate exchange rate
      const rate = params.countrySettings.rate_from_usd;
      if (!rate || rate <= 0 || !isFinite(rate)) {
        errors.push({
          field: 'exchangeRate',
          message: `Invalid exchange rate for ${params.originCountry}: ${rate}`,
          code: 'INVALID_EXCHANGE_RATE'
        });
      } else if (rate > 1000) {
        warnings.push({
          field: 'exchangeRate',
          message: `Very high exchange rate detected for ${params.originCountry}: ${rate}`,
          code: 'HIGH_EXCHANGE_RATE'
        });
      }
    }

    // Validate items
    params.items.forEach((item, index) => {
      if (!item.item_price || item.item_price < 0) {
        errors.push({
          field: `items[${index}].item_price`,
          message: 'Item price must be greater than 0',
          code: 'INVALID_ITEM_PRICE'
        });
      }

      if (!item.item_weight || item.item_weight < 0) {
        errors.push({
          field: `items[${index}].item_weight`,
          message: 'Item weight must be greater than 0',
          code: 'INVALID_ITEM_WEIGHT'
        });
      }

      if (!item.quantity || item.quantity < 1) {
        errors.push({
          field: `items[${index}].quantity`,
          message: 'Item quantity must be at least 1',
          code: 'INVALID_ITEM_QUANTITY'
        });
      }

      // Warn about extremely high values
      if (item.item_price > 100000) {
        warnings.push({
          field: `items[${index}].item_price`,
          message: `Very high item price: ${item.item_price}`,
          code: 'HIGH_ITEM_PRICE'
        });
      }
    });

    // Validate optional numeric fields
    const numericFields = [
      'sales_tax_price', 'merchant_shipping_price', 'domestic_shipping',
      'handling_charge', 'discount', 'insurance_amount', 'customs_percentage'
    ];

    numericFields.forEach(field => {
      const value = params[field as keyof QuoteCalculationParams] as number;
      if (value !== undefined && value !== null) {
        if (isNaN(value) || !isFinite(value)) {
          errors.push({
            field,
            message: `${field} must be a valid number`,
            code: 'INVALID_NUMERIC_VALUE'
          });
        } else if (value < 0 && field !== 'discount') {
          errors.push({
            field,
            message: `${field} cannot be negative`,
            code: 'NEGATIVE_VALUE'
          });
        } else if (value > 100000) {
          warnings.push({
            field,
            message: `Very high ${field}: ${value}`,
            code: 'HIGH_VALUE'
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
          code: 'HIGH_CUSTOMS_PERCENTAGE'
        });
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Perform the actual calculation
   */
  private async performCalculation(params: QuoteCalculationParams): Promise<QuoteCalculationBreakdown> {
    // Calculate item totals
    const total_item_price = params.items.reduce(
      (sum, item) => sum + (item.item_price * item.quantity), 0
    );
    const total_item_weight = params.items.reduce(
      (sum, item) => sum + (item.item_weight * item.quantity), 0
    );

    // Parse numeric values with safety
    const parseNumeric = (value: any, defaultValue = 0): number => {
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
    const shippingCost = await getShippingCost(
      params.originCountry,
      params.destinationCountry,
      total_item_weight,
      total_item_price
    );

    let international_shipping: number;
    let shipping_method: string;
    let shipping_route_id: number | undefined;
    let exchange_rate: number;
    let exchange_rate_source: string;

    const purchaseCurrencyRate = params.countrySettings.rate_from_usd || 1;

    if (shippingCost.method === 'route-specific' && shippingCost.route) {
      international_shipping = shippingCost.cost;
      shipping_method = 'route-specific';
      shipping_route_id = shippingCost.route.id || undefined;
      exchange_rate = (shippingCost.route as any)?.exchange_rate || purchaseCurrencyRate;
      exchange_rate_source = 'shipping_route';
    } else {
      // Fallback calculation - already returns cost in purchase currency
      international_shipping = shippingCost.cost;
      shipping_method = 'country_settings';
      exchange_rate = purchaseCurrencyRate;
      exchange_rate_source = 'country_settings';
    }

    // Calculate customs and duties
    const customs_and_ecs = ((total_item_price + sales_tax_price + merchant_shipping_price + international_shipping) * (customs_percentage / 100));

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
    const reasonable_percent_fee = gateway_percent_fee > 100 ? gateway_percent_fee / 100 : gateway_percent_fee;
    
    const payment_gateway_fee = 
      (params.countrySettings.payment_gateway_fixed_fee || 0) + 
      (subtotal_before_fees * reasonable_percent_fee) / 100;

    // Calculate final totals
    const subtotal = subtotal_before_fees + payment_gateway_fee;
    const vat = Math.round(subtotal * ((params.countrySettings.vat || 0) / 100) * 100) / 100;
    const final_total = Math.round((subtotal + vat) * 100) / 100;

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
      final_total,
      exchange_rate,
      exchange_rate_source,
      shipping_method,
      shipping_route_id,
      calculation_timestamp: new Date()
    };
  }

  /**
   * Generate cache key for calculation
   */
  private generateCacheKey(params: QuoteCalculationParams): string {
    const keyData = {
      items: params.items.map(item => ({
        price: item.item_price,
        weight: item.item_weight,
        quantity: item.quantity
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
      rate: params.countrySettings.rate_from_usd
    };
    
    return btoa(JSON.stringify(keyData)).replace(/[^a-zA-Z0-9]/g, '');
  }

  /**
   * Cache management methods
   */
  private getCachedCalculation(cacheKey: string): QuoteCalculationResult | null {
    const cached = this.calculationCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < this.CACHE_DURATION) {
      return cached.result;
    }
    this.calculationCache.delete(cacheKey);
    return null;
  }

  private cacheCalculation(cacheKey: string, result: QuoteCalculationResult): void {
    this.calculationCache.set(cacheKey, {
      result,
      timestamp: Date.now()
    });
  }

  /**
   * Performance tracking
   */
  private updatePerformanceMetrics(calculationTime: number): void {
    this.performanceMetrics.averageCalculationTime = 
      (this.performanceMetrics.averageCalculationTime * (this.performanceMetrics.totalCalculations - 1) + calculationTime) / 
      this.performanceMetrics.totalCalculations;
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics() {
    return {
      ...this.performanceMetrics,
      cacheHitRate: this.performanceMetrics.totalCalculations > 0 
        ? (this.performanceMetrics.totalCacheHits / this.performanceMetrics.totalCalculations) * 100 
        : 0,
      cacheSize: this.calculationCache.size
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
        entries: Array.from(this.calculationCache.keys())
      },
      exchangeRateCache: {
        size: this.exchangeRateCache.size,
        entries: Array.from(this.exchangeRateCache.keys())
      }
    };
  }
}

// Export singleton instance
export const quoteCalculatorService = QuoteCalculatorService.getInstance();