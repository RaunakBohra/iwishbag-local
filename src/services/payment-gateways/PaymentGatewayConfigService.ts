/**
 * Payment Gateway Configuration Service
 * Handles gateway configuration management and validation
 * Decomposed from usePaymentGateways hook for better separation of concerns
 */

import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';
import * as Sentry from '@sentry/react';
import type { PaymentGateway, PaymentGatewayConfig, FALLBACK_GATEWAY_CODES } from '@/types/payment';

export interface GatewayAvailabilityFilter {
  currency: string;
  country?: string;
  isGuest?: boolean;
  userProfile?: {
    country?: string;
    preferred_display_currency?: string;
    cod_enabled?: boolean;
  };
}

export interface GatewayConfigValidation {
  isValid: boolean;
  missingFields: string[];
  warnings: string[];
  gateway: PaymentGateway;
}

export interface CountryGatewaySettings {
  available_gateways: PaymentGateway[];
  default_gateway: PaymentGateway;
  gateway_config?: Record<string, any>;
}

export interface GatewayCredentials {
  hasValidCredentials: boolean;
  requiredFields: string[];
  missingFields: string[];
  isTestMode: boolean;
}

export class PaymentGatewayConfigService {
  private cache = new Map<string, { data: any; timestamp: number }>();
  private readonly CACHE_DURATION = 10 * 60 * 1000; // 10 minutes for config data

  // Gateway configuration requirements
  private readonly GATEWAY_REQUIREMENTS: Record<PaymentGateway, string[]> = {
    stripe: ['publishable_key', 'secret_key'],
    payu: ['merchant_id', 'merchant_key', 'salt_key'],
    paypal: ['client_id', 'client_secret'],
    esewa: ['merchant_id', 'secret_key'],
    khalti: ['public_key', 'secret_key'],
    fonepay: ['merchant_id', 'secret_key'],
    airwallex: ['client_id', 'api_key'],
    bank_transfer: [], // No special config required
    cod: [], // No special config required
  };

  constructor() {
    logger.info('PaymentGatewayConfigService initialized');
  }

  /**
   * Get all active payment gateways with their configurations
   */
  async getActiveGateways(): Promise<PaymentGatewayConfig[]> {
    try {
      const cacheKey = this.getCacheKey('active_gateways');
      const cached = this.getFromCache<PaymentGatewayConfig[]>(cacheKey);
      if (cached) return cached;

      const { data, error } = await supabase
        .from('payment_gateways')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) {
        logger.error('Failed to fetch active gateways:', error);
        throw error;
      }

      const gateways = data || [];
      this.setCache(cacheKey, gateways);

      return gateways;

    } catch (error) {
      logger.error('Error getting active gateways:', error);
      Sentry.captureException(error);
      return [];
    }
  }

  /**
   * Get gateways filtered by availability criteria
   */
  async getAvailableGateways(filter: GatewayAvailabilityFilter): Promise<PaymentGateway[]> {
    try {
      const cacheKey = this.getCacheKey('available_gateways', filter);
      const cached = this.getFromCache<PaymentGateway[]>(cacheKey);
      if (cached) return cached;

      // Get all active gateways
      const allGateways = await this.getActiveGateways();
      
      // Try country-specific configuration first
      const countryGateways = filter.country ? 
        await this.getCountrySpecificGateways(filter.country, filter.currency) : null;

      let availableGateways: PaymentGateway[];

      if (countryGateways && countryGateways.length > 0) {
        availableGateways = countryGateways;
        logger.info('Using country-specific gateway configuration:', { 
          country: filter.country, 
          gateways: countryGateways 
        });
      } else {
        // Fallback to global filtering
        availableGateways = await this.filterGatewaysByGlobal(allGateways, filter);
      }

      // Add special method handling
      availableGateways = await this.addSpecialMethods(availableGateways, filter, allGateways);

      // Remove duplicates
      const uniqueGateways = [...new Set(availableGateways)];

      this.setCache(cacheKey, uniqueGateways);
      return uniqueGateways;

    } catch (error) {
      logger.error('Error getting available gateways:', error);
      return this.getFallbackGateways(filter);
    }
  }

  /**
   * Get country-specific gateway configuration
   */
  async getCountrySpecificGateways(
    countryCode: string,
    currency: string
  ): Promise<PaymentGateway[]> {
    try {
      const cacheKey = this.getCacheKey('country_gateways', { countryCode, currency });
      const cached = this.getFromCache<PaymentGateway[]>(cacheKey);
      if (cached) return cached;

      // Get country settings
      const { data: countrySettings, error: countryError } = await supabase
        .from('country_settings')
        .select('available_gateways, default_gateway, gateway_config')
        .eq('code', countryCode)
        .single();

      if (countryError || !countrySettings?.available_gateways) {
        return [];
      }

      // Get gateway configurations for country gateways
      const { data: gateways, error: gatewaysError } = await supabase
        .from('payment_gateways')
        .select('code, supported_currencies, is_active, test_mode, config, supported_countries')
        .in('code', countrySettings.available_gateways)
        .eq('is_active', true);

      if (gatewaysError || !gateways) {
        return [];
      }

      // Filter by currency support and valid configuration
      const filteredGateways = gateways
        .filter(gateway => {
          // Check currency support
          if (!gateway.supported_currencies.includes(currency)) {
            return false;
          }

          // Check country support
          if (gateway.supported_countries && 
              !gateway.supported_countries.includes(countryCode)) {
            return false;
          }

          // Validate gateway configuration
          const validation = this.validateGatewayCredentials(gateway);
          return validation.hasValidCredentials;
        })
        .map(gateway => gateway.code as PaymentGateway);

      this.setCache(cacheKey, filteredGateways);
      return filteredGateways;

    } catch (error) {
      logger.error('Error getting country-specific gateways:', error);
      return [];
    }
  }

  /**
   * Filter gateways by global criteria
   */
  private async filterGatewaysByGlobal(
    allGateways: PaymentGatewayConfig[],
    filter: GatewayAvailabilityFilter
  ): Promise<PaymentGateway[]> {
    try {
      return allGateways
        .filter(gateway => {
          // Check currency support
          if (!gateway.supported_currencies.includes(filter.currency)) {
            return false;
          }

          // Check country support if specified
          if (filter.country && 
              gateway.supported_countries && 
              !gateway.supported_countries.includes(filter.country)) {
            return false;
          }

          // Validate gateway configuration
          const validation = this.validateGatewayCredentials(gateway);
          return validation.hasValidCredentials;
        })
        .map(gateway => gateway.code as PaymentGateway);

    } catch (error) {
      logger.error('Error filtering gateways globally:', error);
      return [];
    }
  }

  /**
   * Add special methods like bank transfer and COD
   */
  private async addSpecialMethods(
    gateways: PaymentGateway[],
    filter: GatewayAvailabilityFilter,
    allGateways: PaymentGatewayConfig[]
  ): Promise<PaymentGateway[]> {
    try {
      const result = [...gateways];

      // Add Bank Transfer if supported
      const bankTransferGateway = allGateways.find(g => g.code === 'bank_transfer');
      if (bankTransferGateway && 
          bankTransferGateway.supported_currencies.includes(filter.currency) &&
          !result.includes('bank_transfer')) {
        result.push('bank_transfer');
      }

      // Add COD based on user preference or guest country
      const codGateway = allGateways.find(g => g.code === 'cod');
      if (codGateway && 
          codGateway.supported_currencies.includes(filter.currency) &&
          !result.includes('cod')) {
        
        // For authenticated users: check user preference
        if (!filter.isGuest && filter.userProfile?.cod_enabled) {
          result.push('cod');
        }
        // For guests: check if country supports COD
        else if (filter.isGuest && 
                 filter.country &&
                 codGateway.supported_countries?.includes(filter.country)) {
          result.push('cod');
        }
      }

      return result;

    } catch (error) {
      logger.error('Error adding special methods:', error);
      return gateways;
    }
  }

  /**
   * Validate gateway credentials and configuration
   */
  validateGatewayCredentials(gateway: PaymentGatewayConfig): GatewayCredentials {
    try {
      const requiredFields = this.GATEWAY_REQUIREMENTS[gateway.code as PaymentGateway] || [];
      
      if (requiredFields.length === 0) {
        // No special requirements (bank_transfer, cod)
        return {
          hasValidCredentials: true,
          requiredFields: [],
          missingFields: [],
          isTestMode: gateway.test_mode,
        };
      }

      const config = gateway.config || {};
      const missingFields: string[] = [];

      for (const field of requiredFields) {
        let hasField = false;

        if (gateway.test_mode) {
          // Check test mode fields first
          const testField = `${field}_test` || `${field}_sandbox`;
          hasField = !!config[testField] || !!config[field];
        } else {
          // Production mode
          hasField = !!config[field];
        }

        if (!hasField) {
          missingFields.push(field);
        }
      }

      // Special validation for specific gateways
      if (gateway.code === 'payu') {
        const hasMerchantId = !!config.merchant_id;
        const hasMerchantKey = !!config.merchant_key;
        const hasSaltKey = !!config.salt_key;
        
        if (!hasMerchantId || !hasMerchantKey || !hasSaltKey) {
          return {
            hasValidCredentials: false,
            requiredFields,
            missingFields: ['merchant_id', 'merchant_key', 'salt_key'].filter(field => !config[field]),
            isTestMode: gateway.test_mode,
          };
        }
      }

      if (gateway.code === 'paypal') {
        const clientId = gateway.test_mode ? 
          config.client_id_sandbox : config.client_id;
        const clientSecret = gateway.test_mode ?
          config.client_secret_sandbox : config.client_secret;
        
        if (!clientId || !clientSecret) {
          return {
            hasValidCredentials: false,
            requiredFields,
            missingFields: ['client_id', 'client_secret'].filter(field => 
              !config[gateway.test_mode ? `${field}_sandbox` : field]
            ),
            isTestMode: gateway.test_mode,
          };
        }
      }

      return {
        hasValidCredentials: missingFields.length === 0,
        requiredFields,
        missingFields,
        isTestMode: gateway.test_mode,
      };

    } catch (error) {
      logger.error('Error validating gateway credentials:', error);
      return {
        hasValidCredentials: false,
        requiredFields: [],
        missingFields: [],
        isTestMode: gateway.test_mode,
      };
    }
  }

  /**
   * Get gateway configuration by code
   */
  async getGatewayConfig(gatewayCode: PaymentGateway): Promise<PaymentGatewayConfig | null> {
    try {
      const cacheKey = this.getCacheKey('gateway_config', { gatewayCode });
      const cached = this.getFromCache<PaymentGatewayConfig>(cacheKey);
      if (cached) return cached;

      const { data, error } = await supabase
        .from('payment_gateways')
        .select('*')
        .eq('code', gatewayCode)
        .eq('is_active', true)
        .single();

      if (error) {
        logger.warn(`Gateway config not found: ${gatewayCode}`, error);
        return null;
      }

      this.setCache(cacheKey, data);
      return data;

    } catch (error) {
      logger.error('Error getting gateway config:', error);
      return null;
    }
  }

  /**
   * Check if gateway supports currency
   */
  async supportsCurrency(gatewayCode: PaymentGateway, currency: string): Promise<boolean> {
    try {
      const config = await this.getGatewayConfig(gatewayCode);
      return config?.supported_currencies?.includes(currency) || false;
    } catch (error) {
      logger.error('Error checking currency support:', error);
      return false;
    }
  }

  /**
   * Check if gateway supports country
   */
  async supportsCountry(gatewayCode: PaymentGateway, country: string): Promise<boolean> {
    try {
      const config = await this.getGatewayConfig(gatewayCode);
      return config?.supported_countries?.includes(country) || false;
    } catch (error) {
      logger.error('Error checking country support:', error);
      return false;
    }
  }

  /**
   * Get default gateway for country
   */
  async getDefaultGateway(countryCode: string): Promise<PaymentGateway | null> {
    try {
      const cacheKey = this.getCacheKey('default_gateway', { countryCode });
      const cached = this.getFromCache<PaymentGateway>(cacheKey);
      if (cached) return cached;

      const { data, error } = await supabase
        .from('country_settings')
        .select('default_gateway')
        .eq('code', countryCode)
        .single();

      if (error || !data?.default_gateway) {
        return null;
      }

      this.setCache(cacheKey, data.default_gateway);
      return data.default_gateway;

    } catch (error) {
      logger.error('Error getting default gateway:', error);
      return null;
    }
  }

  /**
   * Get fallback gateways when primary methods fail
   */
  private getFallbackGateways(filter: GatewayAvailabilityFilter): PaymentGateway[] {
    const fallbacks: PaymentGateway[] = [];

    // Universal fallback methods
    if (['USD', 'INR', 'NPR'].includes(filter.currency)) {
      fallbacks.push('bank_transfer');
    }

    // Regional fallbacks
    if (filter.currency === 'USD') {
      fallbacks.push('stripe');
    }

    if (filter.currency === 'INR') {
      fallbacks.push('payu');
    }

    if (filter.currency === 'NPR') {
      fallbacks.push('esewa', 'khalti');
    }

    logger.info('Using fallback gateways:', { filter, fallbacks });
    return fallbacks;
  }

  /**
   * Refresh gateway configurations (admin function)
   */
  async refreshGatewayConfigs(): Promise<boolean> {
    try {
      this.clearCache();
      const gateways = await this.getActiveGateways();
      logger.info('Gateway configurations refreshed:', { count: gateways.length });
      return true;
    } catch (error) {
      logger.error('Failed to refresh gateway configs:', error);
      return false;
    }
  }

  /**
   * Validate all gateway configurations (admin function)
   */
  async validateAllGateways(): Promise<{
    valid: GatewayConfigValidation[];
    invalid: GatewayConfigValidation[];
    warnings: GatewayConfigValidation[];
  }> {
    try {
      const gateways = await this.getActiveGateways();
      const results = {
        valid: [] as GatewayConfigValidation[],
        invalid: [] as GatewayConfigValidation[],
        warnings: [] as GatewayConfigValidation[]
      };

      for (const gateway of gateways) {
        const credentials = this.validateGatewayCredentials(gateway);
        const validation: GatewayConfigValidation = {
          isValid: credentials.hasValidCredentials,
          missingFields: credentials.missingFields,
          warnings: credentials.isTestMode ? ['Gateway is in test mode'] : [],
          gateway: gateway.code as PaymentGateway,
        };

        if (validation.isValid) {
          if (validation.warnings.length > 0) {
            results.warnings.push(validation);
          } else {
            results.valid.push(validation);
          }
        } else {
          results.invalid.push(validation);
        }
      }

      return results;

    } catch (error) {
      logger.error('Error validating all gateways:', error);
      return { valid: [], invalid: [], warnings: [] };
    }
  }

  /**
   * Get gateway health status
   */
  async getGatewayHealthStatus(): Promise<Record<PaymentGateway, {
    status: 'healthy' | 'degraded' | 'unhealthy';
    lastChecked: string;
    issues: string[];
  }>> {
    try {
      const gateways = await this.getActiveGateways();
      const healthStatus: Record<string, any> = {};

      for (const gateway of gateways) {
        const credentials = this.validateGatewayCredentials(gateway);
        const issues: string[] = [];

        if (!credentials.hasValidCredentials) {
          issues.push(`Missing credentials: ${credentials.missingFields.join(', ')}`);
        }

        if (credentials.isTestMode) {
          issues.push('Gateway is in test mode');
        }

        let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
        if (issues.length > 0) {
          status = credentials.hasValidCredentials ? 'degraded' : 'unhealthy';
        }

        healthStatus[gateway.code] = {
          status,
          lastChecked: new Date().toISOString(),
          issues,
        };
      }

      return healthStatus;

    } catch (error) {
      logger.error('Error getting gateway health status:', error);
      return {};
    }
  }

  /**
   * Cache management utilities
   */
  private getCacheKey(operation: string, params: any = {}): string {
    return `gateway_config_${operation}_${JSON.stringify(params)}`;
  }

  private getFromCache<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data as T;
    }
    this.cache.delete(key);
    return null;
  }

  private setCache<T>(key: string, data: T): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  private clearCache(pattern?: string): void {
    if (pattern) {
      for (const key of this.cache.keys()) {
        if (key.includes(pattern)) {
          this.cache.delete(key);
        }
      }
    } else {
      this.cache.clear();
    }
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    this.cache.clear();
    logger.info('PaymentGatewayConfigService cleanup completed');
  }
}

export default PaymentGatewayConfigService;