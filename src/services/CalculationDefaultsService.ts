// ============================================================================
// CALCULATION DEFAULTS SERVICE - Singleton Service for Managing Global Defaults
// Manages configurable fallback values for handling charges, insurance, and shipping
// ============================================================================

import { supabase } from '@/integrations/supabase/client';
import type {
  GlobalCalculationDefaults,
  GlobalCalculationDefaultsDB,
  FallbackUsageLog,
  CalculationDefaultsResponse,
  CalculationDefaultsListResponse,
  HandlingChargeDefaults,
  InsuranceDefaults,
  ShippingDefaults,
  PaymentGatewayDefaults,
  TaxDefaults,
} from '@/types/calculation-defaults';

interface FallbackUsageOptions {
  quote_id: string;
  calculation_type: 'handling_charge' | 'insurance' | 'shipping' | 'payment_gateway' | 'taxes';
  fallback_value_used: number;
  route_id?: string;
  route_origin?: string;
  route_destination?: string;
  reason: string;
  user_id?: string;
}

export class CalculationDefaultsService {
  private static instance: CalculationDefaultsService;
  private cache: GlobalCalculationDefaults | null = null;
  private cacheTimestamp: number = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  private constructor() {}

  static getInstance(): CalculationDefaultsService {
    if (!CalculationDefaultsService.instance) {
      CalculationDefaultsService.instance = new CalculationDefaultsService();
    }
    return CalculationDefaultsService.instance;
  }

  /**
   * Get the active calculation defaults configuration
   */
  async getActiveDefaults(): Promise<GlobalCalculationDefaults> {
    // Check cache first
    const now = Date.now();
    if (this.cache && (now - this.cacheTimestamp) < this.CACHE_DURATION) {
      return this.cache;
    }

    try {
      const { data, error } = await supabase
        .from('global_calculation_defaults')
        .select('*')
        .eq('is_active', true)
        .single();

      if (error) {
        console.warn('⚠️ Failed to load calculation defaults, using hardcoded fallbacks:', error);
        return this.getHardcodedDefaults();
      }

      if (!data) {
        console.warn('⚠️ No active calculation defaults found, using hardcoded fallbacks');
        return this.getHardcodedDefaults();
      }

      // Parse the configuration from JSONB
      const defaults = data.configuration as GlobalCalculationDefaults;
      
      // Update cache
      this.cache = defaults;
      this.cacheTimestamp = now;

      console.log('✅ Loaded calculation defaults from database:', defaults.name);
      return defaults;

    } catch (error) {
      console.error('❌ Error loading calculation defaults:', error);
      return this.getHardcodedDefaults();
    }
  }

  /**
   * Get handling charge defaults
   */
  async getHandlingChargeDefaults(): Promise<HandlingChargeDefaults> {
    const defaults = await this.getActiveDefaults();
    return defaults.handling_charge;
  }

  /**
   * Get insurance defaults
   */
  async getInsuranceDefaults(): Promise<InsuranceDefaults> {
    const defaults = await this.getActiveDefaults();
    return defaults.insurance;
  }

  /**
   * Get shipping defaults
   */
  async getShippingDefaults(): Promise<ShippingDefaults> {
    const defaults = await this.getActiveDefaults();
    return defaults.shipping;
  }

  /**
   * Get payment gateway defaults
   */
  async getPaymentGatewayDefaults(): Promise<PaymentGatewayDefaults> {
    const defaults = await this.getActiveDefaults();
    return defaults.payment_gateway;
  }

  /**
   * Get tax defaults
   */
  async getTaxDefaults(): Promise<TaxDefaults> {
    const defaults = await this.getActiveDefaults();
    return defaults.taxes;
  }

  /**
   * Calculate handling charge using configured defaults
   */
  async calculateHandlingCharge(itemsTotal: number, currency: string = 'USD'): Promise<number> {
    const defaults = await this.getHandlingChargeDefaults();
    
    // Check for currency-specific overrides
    const currencyDefaults = defaults.currency_specific?.[currency];
    const minimumFee = currencyDefaults?.minimum_fee ?? defaults.minimum_fee_usd;
    const percentage = currencyDefaults?.percentage ?? defaults.percentage_of_value;

    const percentageAmount = itemsTotal * (percentage / 100);
    const fixedAmount = minimumFee;

    switch (defaults.calculation_method) {
      case 'max':
        return Math.max(fixedAmount, percentageAmount);
      case 'sum':
        return fixedAmount + percentageAmount;
      case 'percentage_only':
        return percentageAmount;
      case 'fixed_only':
        return fixedAmount;
      default:
        return Math.max(fixedAmount, percentageAmount);
    }
  }

  /**
   * Calculate insurance amount using configured defaults
   */
  async calculateInsurance(
    itemsTotal: number, 
    customerOptedIn: boolean, 
    currency: string = 'USD'
  ): Promise<number> {
    const defaults = await this.getInsuranceDefaults();
    
    // If customer hasn't opted in and insurance is optional, return 0
    if (!customerOptedIn && defaults.customer_optional) {
      return 0;
    }

    // Check for currency-specific overrides
    const currencyDefaults = defaults.currency_specific?.[currency];
    const coveragePercentage = currencyDefaults?.coverage_percentage ?? defaults.default_coverage_percentage;
    const minimumFee = currencyDefaults?.minimum_fee ?? defaults.minimum_fee_usd;

    const calculatedInsurance = itemsTotal * (coveragePercentage / 100);
    const finalInsurance = Math.max(minimumFee, calculatedInsurance);

    // Apply maximum coverage if set
    if (defaults.maximum_coverage_usd) {
      return Math.min(finalInsurance, defaults.maximum_coverage_usd);
    }

    return finalInsurance;
  }

  /**
   * Get default shipping cost using configured defaults
   */
  async calculateDefaultShipping(weight: number, originCountry?: string, destinationCountry?: string): Promise<number> {
    const defaults = await this.getShippingDefaults();
    
    // Check for country-specific overrides
    const routeKey = originCountry && destinationCountry ? `${originCountry}-${destinationCountry}` : undefined;
    const countryDefaults = routeKey ? defaults.country_specific?.[routeKey] : undefined;
    
    const baseCost = countryDefaults?.base_cost_usd ?? defaults.base_cost_usd;
    const costPerKg = countryDefaults?.cost_per_kg_usd ?? defaults.cost_per_kg_usd;

    return baseCost + (weight * costPerKg);
  }

  /**
   * Get default weight for items
   */
  async getDefaultWeight(): Promise<number> {
    const defaults = await this.getShippingDefaults();
    return defaults.default_weight_kg;
  }

  /**
   * Log fallback usage for analytics
   */
  async logFallbackUsage(options: FallbackUsageOptions): Promise<void> {
    const defaults = await this.getActiveDefaults();
    
    // Only log if fallback warnings are enabled
    if (!defaults.fallback_behavior.show_fallback_warnings) {
      return;
    }

    try {
      const logEntry: FallbackUsageLog = {
        quote_id: options.quote_id,
        calculation_type: options.calculation_type,
        fallback_value_used: options.fallback_value_used,
        route_id: options.route_id,
        route_origin: options.route_origin,
        route_destination: options.route_destination,
        reason: options.reason,
        timestamp: new Date().toISOString(),
        user_id: options.user_id,
      };

      console.warn(`🔄 FALLBACK USED [${options.calculation_type}]:`, {
        quote_id: options.quote_id,
        value: options.fallback_value_used,
        reason: options.reason,
        route: options.route_origin && options.route_destination 
          ? `${options.route_origin} → ${options.route_destination}` 
          : 'Unknown',
      });

      // Store in database for analytics (optional table)
      await supabase.from('fallback_usage_logs').insert(logEntry);

    } catch (error) {
      console.error('Failed to log fallback usage:', error);
    }
  }

  /**
   * Clear cache to force refresh
   */
  clearCache(): void {
    this.cache = null;
    this.cacheTimestamp = 0;
  }

  /**
   * Hardcoded defaults as ultimate fallback
   * These match the current hardcoded values in SmartCalculationEngine
   */
  private getHardcodedDefaults(): GlobalCalculationDefaults {
    return {
      name: 'System Hardcoded Defaults',
      description: 'Fallback defaults when database configuration is unavailable',
      is_active: true,
      
      handling_charge: {
        minimum_fee_usd: 5.0,
        percentage_of_value: 2.0,
        calculation_method: 'max',
      },
      
      insurance: {
        default_coverage_percentage: 1.5,
        minimum_fee_usd: 0,
        customer_optional: true,
        default_opted_in: false,
      },
      
      shipping: {
        base_cost_usd: 25.0,
        cost_per_kg_usd: 5.0,
        default_weight_kg: 0.5,
        weight_confidence_default: 0.5,
        default_delivery_days: '7-14',
        default_carrier_name: 'Standard',
      },
      
      payment_gateway: {
        percentage_fee: 2.9,
        fixed_fee_usd: 0.3,
      },
      
      taxes: {
        default_sales_tax_percentage: 10.0,
        default_vat_percentage: 0.0,
        default_customs_percentage: 15.0,
      },
      
      fallback_behavior: {
        use_fallbacks_when_route_missing: true,
        show_fallback_warnings: true,
        require_admin_approval_for_fallbacks: false,
      },
    };
  }

  /**
   * Create or update calculation defaults
   */
  async saveDefaults(defaults: GlobalCalculationDefaults): Promise<CalculationDefaultsResponse> {
    try {
      // Deactivate all existing configurations first
      await supabase
        .from('global_calculation_defaults')
        .update({ is_active: false })
        .eq('is_active', true);

      // Insert new configuration
      const { data, error } = await supabase
        .from('global_calculation_defaults')
        .insert({
          name: defaults.name,
          description: defaults.description || null,
          is_active: true,
          configuration: defaults,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      // Clear cache to force refresh
      this.clearCache();

      return { success: true, data: data.configuration as GlobalCalculationDefaults };

    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Get all calculation defaults configurations
   */
  async getAllDefaults(): Promise<CalculationDefaultsListResponse> {
    try {
      const { data, error } = await supabase
        .from('global_calculation_defaults')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        return { success: false, error: error.message };
      }

      const configurations = data.map(item => item.configuration as GlobalCalculationDefaults);
      return { success: true, data: configurations };

    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }
}

// Export singleton instance
export const calculationDefaultsService = CalculationDefaultsService.getInstance();