/**
 * Scalable Domestic Delivery Configuration Service
 * 
 * Provides dynamic, database-driven configuration for domestic delivery providers
 * Eliminates hardcoded rates and supports unlimited future providers
 * 
 * Note: Uses country's main currency automatically (no separate domestic currency needed)
 */

import { supabase } from '@/integrations/supabase/client';
import { currencyService } from './CurrencyService';

export interface DomesticDeliveryConfig {
  provider: string;
  currency: string; // Uses country's main currency (INR for India, NPR for Nepal, etc.)
  urban_rate: number;
  rural_rate: number;
  api_enabled: boolean;
  fallback_enabled: boolean;
  country_code: string;
  country_name: string;
}

export class DomesticDeliveryConfigService {
  private static instance: DomesticDeliveryConfigService;
  private configCache = new Map<string, { config: DomesticDeliveryConfig; expires: number }>();
  private readonly CACHE_DURATION = 15 * 60 * 1000; // 15 minutes

  static getInstance(): DomesticDeliveryConfigService {
    if (!DomesticDeliveryConfigService.instance) {
      DomesticDeliveryConfigService.instance = new DomesticDeliveryConfigService();
    }
    return DomesticDeliveryConfigService.instance;
  }

  /**
   * Get domestic delivery configuration for a country
   * Returns cached config or fetches from database
   */
  async getDomesticDeliveryConfig(countryCode: string): Promise<DomesticDeliveryConfig> {
    const cacheKey = `config_${countryCode}`;
    const cached = this.configCache.get(cacheKey);
    
    if (cached && Date.now() < cached.expires) {
      console.log(`📦 [DomesticConfig] Cache hit for ${countryCode}:`, cached.config.provider);
      return cached.config;
    }

    try {
      console.log(`📦 [DomesticConfig] Fetching config for ${countryCode}...`);
      
      const { data, error } = await supabase
        .rpc('get_domestic_delivery_config', { country_code: countryCode });
      
      if (error) {
        console.error(`📦 [DomesticConfig] Database error for ${countryCode}:`, error);
        return this.getDefaultConfig(countryCode);
      }

      const config = data as DomesticDeliveryConfig;
      
      // Cache the result
      this.configCache.set(cacheKey, {
        config,
        expires: Date.now() + this.CACHE_DURATION
      });

      console.log(`📦 [DomesticConfig] Loaded config for ${countryCode}:`, {
        provider: config.provider,
        currency: config.currency,
        urban: config.urban_rate,
        rural: config.rural_rate
      });

      return config;
      
    } catch (error) {
      console.error(`📦 [DomesticConfig] Failed to fetch config for ${countryCode}:`, error);
      return this.getDefaultConfig(countryCode);
    }
  }

  /**
   * Get domestic delivery rate for specific area type and convert to target currency
   */
  async getDomesticRate(
    countryCode: string, 
    areaType: 'urban' | 'rural',
    targetCurrency: string
  ): Promise<number> {
    const config = await this.getDomesticDeliveryConfig(countryCode);
    
    // Get base rate in local currency
    const baseRate = areaType === 'urban' ? config.urban_rate : config.rural_rate;
    
    console.log(`📦 [DomesticRate] ${countryCode} ${areaType}: ${baseRate} ${config.currency}`);
    
    // If target currency matches local currency, return as-is
    if (targetCurrency === config.currency) {
      console.log(`📦 [DomesticRate] Same currency, returning: ${baseRate} ${config.currency}`);
      return baseRate;
    }
    
    // Convert local currency to target currency
    try {
      const convertedRate = await currencyService.convertAmount(
        baseRate,
        config.currency,
        targetCurrency
      );
      
      console.log(`📦 [DomesticRate] Converted: ${baseRate} ${config.currency} → ${convertedRate} ${targetCurrency}`);
      return convertedRate;
      
    } catch (error) {
      console.error(`📦 [DomesticRate] Conversion failed:`, error);
      
      // Fallback to base rate if conversion fails
      console.log(`📦 [DomesticRate] Using fallback rate: ${baseRate} ${config.currency}`);
      return baseRate;
    }
  }

  /**
   * Check if API is enabled for a country's domestic delivery provider
   */
  async isApiEnabled(countryCode: string): Promise<boolean> {
    const config = await this.getDomesticDeliveryConfig(countryCode);
    return config.api_enabled;
  }

  /**
   * Check if fallback rates are enabled for a country
   */
  async isFallbackEnabled(countryCode: string): Promise<boolean> {
    const config = await this.getDomesticDeliveryConfig(countryCode);
    return config.fallback_enabled;
  }

  /**
   * Get provider name for a country
   */
  async getProviderName(countryCode: string): Promise<string> {
    const config = await this.getDomesticDeliveryConfig(countryCode);
    return config.provider;
  }

  /**
   * Clear cache (useful for testing or config updates)
   */
  clearCache(): void {
    this.configCache.clear();
    console.log('📦 [DomesticConfig] Cache cleared');
  }

  /**
   * Default fallback configuration for unknown countries
   */
  private getDefaultConfig(countryCode: string): DomesticDeliveryConfig {
    return {
      provider: 'generic',
      currency: 'USD',
      urban_rate: 10.00,
      rural_rate: 20.00,
      api_enabled: false,
      fallback_enabled: true,
      country_code: countryCode,
      country_name: 'Unknown'
    };
  }

  /**
   * Preload configurations for commonly used countries
   * Call this on app startup for better performance
   */
  async preloadConfigs(countryCodes: string[]): Promise<void> {
    console.log(`📦 [DomesticConfig] Preloading configs for: ${countryCodes.join(', ')}`);
    
    const promises = countryCodes.map(code => 
      this.getDomesticDeliveryConfig(code).catch(error => 
        console.warn(`Failed to preload config for ${code}:`, error)
      )
    );
    
    await Promise.allSettled(promises);
    console.log(`📦 [DomesticConfig] Preload complete`);
  }
}

// Export singleton instance
export const domesticDeliveryConfigService = DomesticDeliveryConfigService.getInstance();