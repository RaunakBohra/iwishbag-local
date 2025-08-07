// ============================================================================
// UNIFIED CONFIGURATION SERVICE - Centralized Configuration Management
// Provides unified access to all application configuration data
// ============================================================================

import { supabase } from '../integrations/supabase/client';
import * as Sentry from '@sentry/react';

// ============================================================================
// Type Definitions
// ============================================================================

export type ConfigCategory = 'country' | 'calculation' | 'system' | 'template' | 'gateway';

export interface CountryConfig {
  name: string;
  currency: string;
  symbol: string;
  rate_from_usd: number;
  minimum_payment_amount: number;
  customs_percent: number;
  vat_percent: number;
  payment_gateway_fixed_fee: number;
  payment_gateway_percent_fee: number;
  supported_gateways: string[];
  shipping_zones: string[];
  business_hours?: {
    timezone: string;
    weekdays: string;
    weekend: boolean;
  };
}

export interface CalculationConfig {
  default_handling_charge_percent: number;
  default_insurance_percent: number;
  default_customs_percentage: number;
  default_domestic_shipping: number;
  weight_estimation_multiplier: number;
  volume_weight_divisor: number;
  min_declared_value: number;
  max_declared_value: number;
}

export interface SystemConfig {
  maintenance_mode: boolean;
  max_quote_items: number;
  quote_expiry_days: number;
  auto_archive_days: number;
  rate_limit: {
    quotes_per_hour: number;
    api_calls_per_minute: number;
  };
  feature_flags: {
    advanced_calculator: boolean;
    ml_weight_prediction: boolean;
    auto_assignment: boolean;
    [key: string]: boolean;
  };
}

export interface TemplateConfig {
  name: string;
  subject?: string;
  content: string;
  template_type: 'email' | 'sms' | 'push';
  variables: string[];
  category: string;
  is_active: boolean;
  usage_count: number;
  last_used?: string;
}

export interface GatewayConfig {
  gateway_name: string;
  display_name: string;
  is_active: boolean;
  supported_currencies: string[];
  supported_countries: string[];
  api_config: {
    public_key?: string;
    webhook_endpoint: string;
    supported_payment_methods: string[];
  };
  fees: {
    fixed_fee: number;
    percent_fee: number;
    international_fee: number;
  };
  limits: {
    min_amount: number;
    max_amount: number;
  };
}

export interface ConfigurationRecord {
  id: string;
  category: ConfigCategory;
  config_key: string;
  config_data: any;
  metadata: any;
  is_active: boolean;
  priority: number;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// UNIFIED CONFIGURATION SERVICE - Singleton
// ============================================================================

class UnifiedConfigurationService {
  private static instance: UnifiedConfigurationService;
  private cache = new Map<string, { data: any; timestamp: number }>();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  private constructor() {
    console.log('⚙️ UnifiedConfigurationService initialized');
  }

  static getInstance(): UnifiedConfigurationService {
    if (!UnifiedConfigurationService.instance) {
      UnifiedConfigurationService.instance = new UnifiedConfigurationService();
    }
    return UnifiedConfigurationService.instance;
  }

  // ============================================================================
  // Cache Management
  // ============================================================================

  private getCacheKey(category: string, key?: string): string {
    return key ? `${category}:${key}` : `${category}:all`;
  }

  private getFromCache<T>(cacheKey: string): T | null {
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      console.log(`📦 Config cache hit: ${cacheKey}`);
      return cached.data as T;
    }
    return null;
  }

  private setCache<T>(cacheKey: string, data: T): void {
    this.cache.set(cacheKey, { data, timestamp: Date.now() });
  }

  private clearCache(pattern?: string): void {
    if (pattern) {
      Array.from(this.cache.keys())
        .filter((key) => key.includes(pattern))
        .forEach((key) => this.cache.delete(key));
    } else {
      this.cache.clear();
    }
    console.log(`🗑️ Config cache cleared: ${pattern || 'all'}`);
  }

  // ============================================================================
  // Core Configuration Methods
  // ============================================================================

  /**
   * Get configuration by category and optional key
   */
  async getConfig<T = any>(category: ConfigCategory, key?: string): Promise<T | null> {
    // Temporarily disable Sentry transaction due to API change
    const transaction = null;
    // const transaction = typeof Sentry?.startTransaction === 'function' 
    //   ? Sentry.startTransaction({
    //       name: 'UnifiedConfigurationService.getConfig',
    //       op: 'config',
    //     })
    //   : null;

    try {
      const cacheKey = this.getCacheKey(category, key);
      const cached = this.getFromCache<T>(cacheKey);
      if (cached) {
        transaction?.setStatus('ok');
        return cached;
      }

      console.log(`⚙️ Fetching config: ${category}${key ? `:${key}` : ''}`);

      // Direct query since get_app_config RPC doesn't exist yet
      let result: T | null = null;
      
      // Handle different categories with existing tables
      if (category === 'country') {
        let query = supabase.from('country_settings').select('*');
        
        // If a specific key is provided, filter by code
        if (key) {
          query = query.eq('code', key);
        }
        
        const { data, error } = await query;
        
        if (error) {
          console.error('❌ Error fetching country config:', error);
          if (typeof Sentry?.captureException === 'function') {
            Sentry.captureException(error);
          }
          transaction?.setStatus('internal_error');
          return null;
        }
        
        if (key) {
          // Single country config
          const country = data?.[0];
          if (country) {
            result = {
              name: country.name,
              currency: country.currency,
              symbol: '$', // Default symbol - will be overridden by CurrencyService
              rate_from_usd: country.rate_from_usd,
              minimum_payment_amount: country.minimum_payment_amount,
              customs_percent: (country.sales_tax || 0) + (country.vat || 0),
              vat_percent: country.vat || 0,
              payment_gateway_fixed_fee: country.payment_gateway_fixed_fee || 0.30,
              payment_gateway_percent_fee: country.payment_gateway_percent_fee || 2.9,
              supported_gateways: ['stripe', 'payu'],
              shipping_zones: ['standard', 'express']
            } as T;
          }
        } else {
          // All countries
          const countries: Record<string, CountryConfig> = {};
          data?.forEach(country => {
            countries[country.code] = {
              name: country.name,
              currency: country.currency,
              symbol: '$', // Default symbol - will be overridden by CurrencyService
              rate_from_usd: country.rate_from_usd,
              minimum_payment_amount: country.minimum_payment_amount,
              customs_percent: (country.sales_tax || 0) + (country.vat || 0),
              vat_percent: country.vat || 0,
              payment_gateway_fixed_fee: country.payment_gateway_fixed_fee || 0.30,
              payment_gateway_percent_fee: country.payment_gateway_percent_fee || 2.9,
              supported_gateways: ['stripe', 'payu'],
              shipping_zones: ['standard', 'express']
            };
          });
          result = countries as T;
        }
      } else if (category === 'calculation') {
        const { data, error } = await supabase
          .from('calculation_defaults')
          .select('*')
          .single();
        
        if (error) {
          console.error('❌ Error fetching calculation defaults:', error);
          if (typeof Sentry?.captureException === 'function') {
            Sentry.captureException(error);
          }
          transaction?.setStatus('internal_error');
          return null;
        }
        
        if (data) {
          result = data as T;
        }
      } else {
        console.warn(`⚠️ Config category '${category}' not implemented`);
        transaction?.setStatus('ok');
        return null;
      }

      if (result) {
        this.setCache(cacheKey, result);
      }

      console.log(`✅ Config fetched: ${category}${key ? `:${key}` : ''}`);
      transaction?.setStatus('ok');
      return result;
    } catch (error) {
      console.error('❌ Exception in getConfig:', error);
      if (typeof Sentry?.captureException === 'function') {
        if (typeof Sentry?.captureException === 'function') {
          Sentry.captureException(error);
        }
      }
      transaction?.setStatus('internal_error');
      return null;
    } finally {
      transaction?.finish();
    }
  }

  /**
   * Set configuration
   */
  async setConfig(
    category: ConfigCategory,
    key: string,
    configData: any,
    metadata?: any,
  ): Promise<string | null> {
    try {
      console.log(`⚙️ Setting config: ${category}:${key}`);

      // Direct update since set_app_config RPC doesn't exist yet
      console.warn('⚠️ setConfig is not fully implemented for existing tables');
      
      // For now, just clear cache
      this.clearCache(category);
      
      // Return a dummy ID
      const dummyId = crypto.randomUUID();
      console.log(`✅ Config cache cleared for: ${category}:${key}`);
      return dummyId;
    } catch (error) {
      console.error('❌ Exception in setConfig:', error);
      if (typeof Sentry?.captureException === 'function') {
        if (typeof Sentry?.captureException === 'function') {
          Sentry.captureException(error);
        }
      }
      return null;
    }
  }

  // ============================================================================
  // Country Configuration
  // ============================================================================

  /**
   * Get country configuration
   */
  async getCountryConfig(countryCode: string): Promise<CountryConfig | null> {
    try {
      const cacheKey = `country:${countryCode}`;
      const cached = this.getFromCache<CountryConfig>(cacheKey);
      if (cached) return cached;

      // Direct query since get_country_config RPC doesn't exist yet
      const { data, error } = await supabase
        .from('country_settings')
        .select('*')
        .eq('code', countryCode)
        .single();

      if (error || !data) {
        console.warn(`⚠️ No config found for country: ${countryCode}`);
        return null;
      }

      const config: CountryConfig = {
        name: data.name,
        currency: data.currency,
        symbol: data.symbol,
        rate_from_usd: data.rate_from_usd,
        minimum_payment_amount: data.minimum_payment_amount,
        customs_percent: data.customs_percent || 0,
        vat_percent: data.vat_percent || 0,
        payment_gateway_fixed_fee: data.payment_gateway_fixed_fee || 0.30,
        payment_gateway_percent_fee: data.payment_gateway_percent_fee || 2.9,
        supported_gateways: ['stripe', 'payu'],
        shipping_zones: ['standard', 'express']
      };
      
      this.setCache(cacheKey, config);
      return config;
    } catch (error) {
      console.error(`❌ Error getting country config for ${countryCode}:`, error);
      if (typeof Sentry?.captureException === 'function') {
        if (typeof Sentry?.captureException === 'function') {
          Sentry.captureException(error);
        }
      }
      return null;
    }
  }

  /**
   * Get all countries
   */
  async getAllCountries(): Promise<Record<string, CountryConfig>> {
    return (await this.getConfig<Record<string, CountryConfig>>('country')) || {};
  }

  /**
   * Get currency symbol for a country
   */
  async getCurrencySymbol(countryCode: string): Promise<string> {
    const config = await this.getCountryConfig(countryCode);
    return config?.symbol || '$';
  }

  /**
   * Get exchange rate for a country
   */
  async getExchangeRate(countryCode: string): Promise<number> {
    const config = await this.getCountryConfig(countryCode);
    return config?.rate_from_usd || 1.0;
  }

  /**
   * Get minimum payment amount for a country
   */
  async getMinimumPaymentAmount(countryCode: string): Promise<number> {
    const config = await this.getCountryConfig(countryCode);
    return config?.minimum_payment_amount || 1.0;
  }

  // ============================================================================
  // Calculation Configuration
  // ============================================================================

  /**
   * Get calculation defaults
   */
  async getCalculationDefaults(): Promise<CalculationConfig | null> {
    try {
      const cacheKey = 'calculation:defaults';
      const cached = this.getFromCache<CalculationConfig>(cacheKey);
      if (cached) return cached;

      // Direct query since get_calculation_defaults RPC doesn't exist yet
      const { data, error } = await supabase
        .from('calculation_defaults')
        .select('*')
        .single();

      if (error || !data) {
        console.warn('⚠️ No calculation defaults found, using fallback values');
        const fallback: CalculationConfig = {
          default_handling_charge_percent: 5.0,
          default_insurance_percent: 2.0,
          default_customs_percentage: 0.0,
          default_domestic_shipping: 5.0,
          weight_estimation_multiplier: 1.2,
          volume_weight_divisor: 5000,
          min_declared_value: 1.0,
          max_declared_value: 2500.0,
        };
        this.setCache(cacheKey, fallback);
        return fallback;
      }

      const config = data as CalculationConfig;
      this.setCache(cacheKey, config);
      return config;
    } catch (error) {
      console.error('❌ Error getting calculation defaults:', error);
      if (typeof Sentry?.captureException === 'function') {
        if (typeof Sentry?.captureException === 'function') {
          Sentry.captureException(error);
        }
      }
      return null;
    }
  }

  // ============================================================================
  // System Configuration
  // ============================================================================

  /**
   * Get system configuration
   */
  async getSystemConfig(): Promise<SystemConfig | null> {
    return await this.getConfig<SystemConfig>('system', 'main');
  }

  /**
   * Check if feature is enabled
   */
  async isFeatureEnabled(featureName: string): Promise<boolean> {
    try {
      const systemConfig = await this.getSystemConfig();
      return systemConfig?.feature_flags?.[featureName] || false;
    } catch (error) {
      console.error(`❌ Error checking feature ${featureName}:`, error);
      return false;
    }
  }

  /**
   * Check if maintenance mode is enabled
   */
  async isMaintenanceModeEnabled(): Promise<boolean> {
    try {
      const systemConfig = await this.getSystemConfig();
      return systemConfig?.maintenance_mode || false;
    } catch (error) {
      console.error('❌ Error checking maintenance mode:', error);
      return false;
    }
  }

  // ============================================================================
  // Template Configuration
  // ============================================================================

  /**
   * Get templates by type
   */
  async getTemplates(templateType?: string): Promise<TemplateConfig[]> {
    try {
      const cacheKey = `templates:${templateType || 'all'}`;
      const cached = this.getFromCache<TemplateConfig[]>(cacheKey);
      if (cached) return cached;

      // Templates table doesn't exist yet, return empty array
      console.warn('⚠️ Templates functionality not implemented yet');
      const templates: TemplateConfig[] = [];
      this.setCache(cacheKey, templates);
      return templates;
    } catch (error) {
      console.error('❌ Error getting templates:', error);
      if (typeof Sentry?.captureException === 'function') {
        if (typeof Sentry?.captureException === 'function') {
          Sentry.captureException(error);
        }
      }
      return [];
    }
  }

  /**
   * Get specific template
   */
  async getTemplate(templateKey: string): Promise<TemplateConfig | null> {
    return await this.getConfig<TemplateConfig>('template', templateKey);
  }

  // ============================================================================
  // Gateway Configuration
  // ============================================================================

  /**
   * Get active payment gateways for a country
   */
  async getActiveGateways(countryCode?: string): Promise<GatewayConfig[]> {
    try {
      const cacheKey = `gateways:${countryCode || 'all'}`;
      const cached = this.getFromCache<GatewayConfig[]>(cacheKey);
      if (cached) return cached;

      // Gateways table doesn't exist yet, return empty array
      console.warn('⚠️ Gateway configuration not implemented yet');
      const gateways: GatewayConfig[] = [];
      this.setCache(cacheKey, gateways);
      return gateways;
    } catch (error) {
      console.error('❌ Error getting gateways:', error);
      if (typeof Sentry?.captureException === 'function') {
        if (typeof Sentry?.captureException === 'function') {
          Sentry.captureException(error);
        }
      }
      return [];
    }
  }

  /**
   * Get specific gateway configuration
   */
  async getGatewayConfig(gatewayName: string): Promise<GatewayConfig | null> {
    return await this.getConfig<GatewayConfig>('gateway', gatewayName);
  }

  /**
   * Check if gateway supports currency
   */
  async isGatewaySupportedForCurrency(gatewayName: string, currency: string): Promise<boolean> {
    try {
      const gateway = await this.getGatewayConfig(gatewayName);
      return gateway?.supported_currencies?.includes(currency) || false;
    } catch (error) {
      console.error(`❌ Error checking gateway ${gatewayName} for ${currency}:`, error);
      return false;
    }
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  /**
   * Format currency amount with proper symbol and formatting
   */
  async formatCurrencyAmount(amount: number, countryCode: string): Promise<string> {
    try {
      const config = await this.getCountryConfig(countryCode);
      const symbol = config?.symbol || '$';

      // Basic formatting - could be enhanced with locale-specific formatting
      return `${symbol}${amount.toFixed(2)}`;
    } catch (error) {
      console.error(`❌ Error formatting currency for ${countryCode}:`, error);
      return `$${amount.toFixed(2)}`;
    }
  }

  /**
   * Convert amount between currencies
   */
  async convertCurrency(amount: number, fromCountry: string, toCountry: string): Promise<number> {
    try {
      const [fromConfig, toConfig] = await Promise.all([
        this.getCountryConfig(fromCountry),
        this.getCountryConfig(toCountry),
      ]);

      if (!fromConfig || !toConfig) {
        console.warn(`⚠️ Missing config for currency conversion: ${fromCountry} -> ${toCountry}`);
        return amount;
      }

      // Convert through USD as base currency
      const usdAmount = amount / fromConfig.rate_from_usd;
      const convertedAmount = usdAmount * toConfig.rate_from_usd;

      return convertedAmount;
    } catch (error) {
      console.error(`❌ Error converting currency ${fromCountry} -> ${toCountry}:`, error);
      return amount;
    }
  }

  /**
   * Get business hours for a country
   */
  async getBusinessHours(countryCode: string): Promise<any> {
    const config = await this.getCountryConfig(countryCode);
    return (
      config?.business_hours || {
        timezone: 'UTC',
        weekdays: '09:00-17:00',
        weekend: false,
      }
    );
  }

  /**
   * Refresh cache for a specific category
   */
  async refreshCache(category?: ConfigCategory): Promise<void> {
    if (category) {
      this.clearCache(category);
    } else {
      this.clearCache();
    }
    console.log(`🔄 Config cache refreshed: ${category || 'all'}`);
  }

  /**
   * Validate configuration data
   */
  validateConfig(category: ConfigCategory, data: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    switch (category) {
      case 'country':
        if (!data.currency) errors.push('Currency is required');
        if (!data.symbol) errors.push('Currency symbol is required');
        if (typeof data.rate_from_usd !== 'number') errors.push('Exchange rate must be a number');
        break;

      case 'calculation':
        if (typeof data.default_handling_charge_percent !== 'number') {
          errors.push('Handling charge percent must be a number');
        }
        break;

      case 'template':
        if (!data.name) errors.push('Template name is required');
        if (!data.content) errors.push('Template content is required');
        break;

      case 'gateway':
        if (!data.gateway_name) errors.push('Gateway name is required');
        if (typeof data.is_active !== 'boolean')
          errors.push('Gateway active status must be boolean');
        break;

      default:
        break;
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}

// Export singleton instance
export const unifiedConfigService = UnifiedConfigurationService.getInstance();
export default unifiedConfigService;
