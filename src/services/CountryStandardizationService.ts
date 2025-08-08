/**
 * Country Standardization Service
 * Converts any country input to standardized country codes for database storage
 * STANDARD FORMAT: Country codes (NP, IN, US, AU) - NO backward compatibility confusion
 */

import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

export interface CountryMapping {
  code: string;
  name: string;
}

export class CountryStandardizationService {
  private static instance: CountryStandardizationService;
  private countryMappings: CountryMapping[] = [];
  private nameToCodeMap = new Map<string, string>(); // Only need name->code conversion
  private initialized = false;

  private constructor() {}

  static getInstance(): CountryStandardizationService {
    if (!CountryStandardizationService.instance) {
      CountryStandardizationService.instance = new CountryStandardizationService();
    }
    return CountryStandardizationService.instance;
  }

  /**
   * Initialize country mappings from database
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      const { data: countries, error } = await supabase
        .from('country_settings')
        .select('code, name');

      if (error) {
        logger.error('Failed to load country mappings:', error);
        return;
      }

      if (countries) {
        this.countryMappings = countries;
        
        // Build name->code mapping for standardization
        countries.forEach(country => {
          this.nameToCodeMap.set(country.name.toLowerCase(), country.code.toUpperCase());
        });

        this.initialized = true;
        logger.info('Country standardization mapping initialized', { 
          count: countries.length 
        });
      }
    } catch (error) {
      logger.error('Error initializing country mappings:', error);
    }
  }

  /**
   * Standardize any country input to the standard country code format
   * INPUT: "Nepal", "nepal", "NP", "np" -> OUTPUT: "NP"
   */
  standardizeCountry(countryInput: string): string {
    if (!countryInput || !countryInput.trim()) {
      return '';
    }

    const input = countryInput.trim();

    if (!this.initialized) {
      logger.warn('CountryStandardizationService not initialized, returning uppercase input');
      return input.toUpperCase();
    }

    // If it's already a 2-letter code, normalize to uppercase
    if (input.length === 2) {
      return input.toUpperCase();
    }

    // Try to find country code by name (case-insensitive)
    const code = this.nameToCodeMap.get(input.toLowerCase());
    if (code) {
      return code;
    }

    // If no match found, log warning and return uppercase (might be a code)
    logger.warn(`Unknown country input: "${input}". Expected country name or code.`);
    return input.toUpperCase();
  }

  /**
   * Check if a country input is valid (either valid name or valid code)
   */
  isValidCountry(countryInput: string): boolean {
    if (!countryInput || !countryInput.trim() || !this.initialized) {
      return false;
    }

    const input = countryInput.trim();

    // Check if it's a valid 2-letter code
    if (input.length === 2) {
      return this.countryMappings.some(c => c.code.toUpperCase() === input.toUpperCase());
    }

    // Check if it's a valid country name
    return this.nameToCodeMap.has(input.toLowerCase());
  }

  /**
   * Check if two country inputs refer to the same country
   */
  areCountriesEqual(country1: string, country2: string): boolean {
    if (!this.initialized) {
      return country1.toUpperCase() === country2.toUpperCase();
    }

    const standardized1 = this.standardizeCountry(country1);
    const standardized2 = this.standardizeCountry(country2);
    
    return standardized1 === standardized2;
  }

  /**
   * Get all available countries
   */
  getAllCountries(): CountryMapping[] {
    return [...this.countryMappings];
  }

  /**
   * Reset the service (useful for testing)
   */
  reset(): void {
    this.initialized = false;
    this.countryMappings = [];
    this.nameToCodeMap.clear();
  }
}

// Export singleton instance
export const countryStandardizationService = CountryStandardizationService.getInstance();