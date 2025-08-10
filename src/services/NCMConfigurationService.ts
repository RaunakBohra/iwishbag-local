/**
 * Configuration-driven system for NCM branch mappings
 * Allows admin management of city mappings and branch priorities
 */

import { supabase } from '../integrations/supabase/client';
import { ncmLogger } from './NCMLogger';

export interface NCMConfiguration {
  id?: string;
  // City to district mappings
  city_mappings: Record<string, string>;
  // Branch priority configurations
  branch_priorities: Record<string, number>;
  // Fallback strategies configuration
  fallback_strategies: {
    enabled_strategies: ('city_match' | 'city_to_district' | 'district_match' | 'fuzzy_match' | 'province_fallback')[];
    confidence_thresholds: {
      high: number;
      medium: number;
      low: number;
    };
    auto_select_confidence: 'high' | 'medium' | 'low';
  };
  // Province to hub mappings
  province_hub_mappings: Record<string, string[]>;
  // Performance settings
  performance_settings: {
    cache_duration_ms: number;
    debounce_delay_ms: number;
    max_suggestions: number;
  };
  updated_at?: string;
  updated_by?: string;
}

class NCMConfigurationService {
  private static instance: NCMConfigurationService;
  private cache: NCMConfiguration | null = null;
  private cacheTimestamp = 0;
  private readonly CACHE_DURATION = 300000; // 5 minutes

  private constructor() {}

  static getInstance(): NCMConfigurationService {
    if (!NCMConfigurationService.instance) {
      NCMConfigurationService.instance = new NCMConfigurationService();
    }
    return NCMConfigurationService.instance;
  }

  /**
   * Get current NCM configuration with caching
   */
  async getConfiguration(): Promise<NCMConfiguration> {
    // Return cached config if still valid
    if (this.cache && (Date.now() - this.cacheTimestamp) < this.CACHE_DURATION) {
      ncmLogger.debug('Configuration', 'Using cached configuration');
      return this.cache;
    }

    try {
      ncmLogger.debug('Configuration', 'Fetching NCM configuration from database');
      
      const { data, error } = await supabase
        .from('ncm_configurations')
        .select('*')
        .eq('active', true)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw error;
      }

      let config: NCMConfiguration;
      
      if (!data) {
        // No configuration found, use defaults
        ncmLogger.info('Configuration', 'No configuration found, using defaults');
        config = this.getDefaultConfiguration();
        
        // Save default configuration to database
        await this.saveConfiguration(config);
      } else {
        config = data as NCMConfiguration;
        ncmLogger.info('Configuration', 'Loaded configuration from database');
      }

      // Cache the configuration
      this.cache = config;
      this.cacheTimestamp = Date.now();
      
      return config;
    } catch (error) {
      ncmLogger.error('Configuration', 'Failed to load configuration, using defaults', error);
      return this.getDefaultConfiguration();
    }
  }

  /**
   * Save NCM configuration to database
   */
  async saveConfiguration(config: Omit<NCMConfiguration, 'id' | 'updated_at'>): Promise<void> {
    try {
      ncmLogger.info('Configuration', 'Saving NCM configuration');
      
      // First deactivate existing configurations
      await supabase
        .from('ncm_configurations')
        .update({ active: false })
        .eq('active', true);

      // Insert new configuration
      const { error } = await supabase
        .from('ncm_configurations')
        .insert({
          ...config,
          active: true,
          updated_at: new Date().toISOString(),
          updated_by: 'admin' // TODO: Get actual user ID
        });

      if (error) throw error;

      // Clear cache to force reload
      this.cache = null;
      
      ncmLogger.info('Configuration', 'Successfully saved NCM configuration');
    } catch (error) {
      ncmLogger.error('Configuration', 'Failed to save configuration', error);
      throw error;
    }
  }

  /**
   * Update specific configuration section
   */
  async updateConfiguration(updates: Partial<NCMConfiguration>): Promise<void> {
    const currentConfig = await this.getConfiguration();
    const mergedConfig = { ...currentConfig, ...updates };
    
    // Remove database-specific fields before saving
    const { id, updated_at, ...configToSave } = mergedConfig;
    
    await this.saveConfiguration(configToSave);
  }

  /**
   * Add new city mappings
   */
  async addCityMappings(newMappings: Record<string, string>): Promise<void> {
    const config = await this.getConfiguration();
    const updatedMappings = { ...config.city_mappings, ...newMappings };
    
    await this.updateConfiguration({ city_mappings: updatedMappings });
    ncmLogger.info('Configuration', `Added ${Object.keys(newMappings).length} city mappings`);
  }

  /**
   * Update branch priorities
   */
  async updateBranchPriorities(priorities: Record<string, number>): Promise<void> {
    const config = await this.getConfiguration();
    const updatedPriorities = { ...config.branch_priorities, ...priorities };
    
    await this.updateConfiguration({ branch_priorities: updatedPriorities });
    ncmLogger.info('Configuration', `Updated ${Object.keys(priorities).length} branch priorities`);
  }

  /**
   * Get default configuration
   */
  private getDefaultConfiguration(): NCMConfiguration {
    return {
      city_mappings: {
        // Kathmandu Valley - All to Tinkune branch
        'kathmandu': 'kathmandu',
        'lalitpur': 'kathmandu',  // Route to Tinkune branch
        'bhaktapur': 'kathmandu', // Route to Tinkune branch
        'patan': 'kathmandu',     // Route to Tinkune branch
        // Other major cities
        'pokhara': 'kaski',
        'chitwan': 'chitwan',
        'biratnagar': 'morang',
        'birgunj': 'parsa',
        'butwal': 'rupandehi',
        'nepalgunj': 'banke',
        'dhangadhi': 'kailali'
      },
      branch_priorities: {
        'KATHMANDU': 100,
        'POKHARA': 90,
        'CHITWAN': 80,
        'BIRATNAGAR': 75,
        'BIRGUNJ': 70,
        'BUTWAL': 65,
        'NEPALGUNJ': 60,
        'DHANGADHI': 55
      },
      fallback_strategies: {
        enabled_strategies: ['city_match', 'city_to_district', 'district_match', 'fuzzy_match', 'province_fallback'],
        confidence_thresholds: {
          high: 90,
          medium: 70,
          low: 50
        },
        auto_select_confidence: 'high'
      },
      province_hub_mappings: {
        'province 1': ['morang', 'sunsari', 'jhapa'],
        'bagmati': ['kathmandu', 'lalitpur', 'chitwan'],
        'gandaki': ['kaski', 'gorkha', 'lamjung'],
        'lumbini': ['rupandehi', 'dang', 'banke'],
        'sudurpashchim': ['kailali', 'kanchanpur']
      },
      performance_settings: {
        cache_duration_ms: 300000, // 5 minutes
        debounce_delay_ms: 1500,   // 1.5 seconds
        max_suggestions: 3
      }
    };
  }

  /**
   * Export configuration for backup
   */
  async exportConfiguration(): Promise<string> {
    const config = await this.getConfiguration();
    return JSON.stringify(config, null, 2);
  }

  /**
   * Import configuration from backup
   */
  async importConfiguration(configJson: string): Promise<void> {
    try {
      const config = JSON.parse(configJson) as NCMConfiguration;
      
      // Validate configuration structure
      this.validateConfiguration(config);
      
      // Remove database-specific fields
      const { id, updated_at, ...cleanConfig } = config;
      
      await this.saveConfiguration(cleanConfig);
      ncmLogger.info('Configuration', 'Successfully imported configuration');
    } catch (error) {
      ncmLogger.error('Configuration', 'Failed to import configuration', error);
      throw new Error('Invalid configuration format');
    }
  }

  /**
   * Validate configuration structure
   */
  private validateConfiguration(config: any): void {
    const requiredFields = ['city_mappings', 'branch_priorities', 'fallback_strategies', 'province_hub_mappings', 'performance_settings'];
    
    for (const field of requiredFields) {
      if (!config[field]) {
        throw new Error(`Missing required configuration field: ${field}`);
      }
    }
    
    // Validate fallback strategies
    if (!config.fallback_strategies.enabled_strategies || !Array.isArray(config.fallback_strategies.enabled_strategies)) {
      throw new Error('Invalid fallback_strategies.enabled_strategies');
    }
    
    // Validate confidence thresholds
    const thresholds = config.fallback_strategies.confidence_thresholds;
    if (!thresholds || typeof thresholds.high !== 'number' || typeof thresholds.medium !== 'number' || typeof thresholds.low !== 'number') {
      throw new Error('Invalid confidence_thresholds');
    }
  }

  /**
   * Clear configuration cache
   */
  clearCache(): void {
    this.cache = null;
    this.cacheTimestamp = 0;
    ncmLogger.debug('Configuration', 'Configuration cache cleared');
  }
}

// Export singleton instance
export const ncmConfigurationService = NCMConfigurationService.getInstance();
export default ncmConfigurationService;