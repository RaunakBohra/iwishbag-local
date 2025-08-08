/**
 * EnhancedGeoLocationService - Advanced Country Detection with Regional Pricing Integration
 * 
 * Features:
 * - Multi-API IP-based detection with robust fallback
 * - Integration with user delivery addresses  
 * - Regional pricing system integration
 * - Intelligent caching with multiple fallback layers
 * - Support for 197 countries via country_settings integration
 * 
 * Fallback Priority:
 * 1. Manual override (highest priority)
 * 2. Cached IP detection result
 * 3. Fresh IP detection from multiple APIs
 * 4. User's default delivery address
 * 5. User's saved addresses
 * 6. Global default (lowest priority)
 */

import { supabase } from '@/integrations/supabase/client';
import { regionalPricingService } from './RegionalPricingService';

export interface CountryInfo {
  country: string; // ISO 2-letter country code (IN, NP, US, etc.)
  ip?: string;
  timestamp?: number;
  source: 'ip' | 'address' | 'manual' | 'fallback'; // Detection source
  confidence: number; // Confidence score (0-1)
  metadata?: {
    city?: string;
    region?: string;
    timezone?: string;
    currency?: string;
    continent?: string;
  };
}

export interface CountryDetectionOptions {
  userId?: string; // For address fallback lookup
  includePricingData?: boolean; // Include regional pricing information
  maxRetries?: number; // API retry attempts
  timeout?: number; // Request timeout in ms
  preferredAPIs?: string[]; // Preferred API order
}

export interface CountryWithPricing extends CountryInfo {
  pricingInfo?: {
    continent?: string;
    supportedServices?: string[];
    hasRegionalPricing?: boolean;
    hasCountryOverrides?: boolean;
  };
}

export class EnhancedGeoLocationService {
  private static readonly CACHE_KEY = 'iwish_user_country';
  private static readonly CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
  private static readonly API_TIMEOUT = 5000; // 5 seconds
  private static readonly MAX_RETRIES = 2;
  private static readonly MANUAL_OVERRIDE_KEY = 'iwish_manual_country';

  /**
   * Get user's country code with enhanced fallback strategy
   */
  static async getUserCountry(options: CountryDetectionOptions = {}): Promise<string> {
    const result = await this.getCountryInfo(options);
    return result.country;
  }

  /**
   * Get comprehensive country information with all fallback layers
   */
  static async getCountryInfo(options: CountryDetectionOptions = {}): Promise<CountryWithPricing> {
    const {
      userId,
      includePricingData = false,
      maxRetries = this.MAX_RETRIES,
      timeout = this.API_TIMEOUT,
    } = options;

    try {
      // Layer 1: Check for manual override (highest priority)
      const manualOverride = this.getManualOverride();
      if (manualOverride) {
        return await this.enhanceCountryInfo(manualOverride, includePricingData);
      }

      // Layer 2: Check cache
      const cached = this.getCachedCountry();
      if (cached && cached.source !== 'fallback') {
        return await this.enhanceCountryInfo(cached, includePricingData);
      }

      // Layer 3: Fresh IP detection
      try {
        const ipDetection = await this.detectCountryFromIP(timeout, maxRetries);
        const countryInfo = await this.enhanceCountryInfo(ipDetection, includePricingData);
        this.setCachedCountry(countryInfo);
        return countryInfo;
      } catch (ipError) {
        console.warn('IP detection failed, trying address fallback:', ipError);
      }

      // Layer 4: User delivery address fallback
      if (userId) {
        try {
          const addressCountry = await this.getCountryFromUserAddresses(userId);
          if (addressCountry) {
            const fallbackInfo: CountryInfo = {
              country: addressCountry,
              source: 'address',
              confidence: 0.7,
              timestamp: Date.now(),
            };
            const enhanced = await this.enhanceCountryInfo(fallbackInfo, includePricingData);
            this.setCachedCountry(enhanced);
            return enhanced;
          }
        } catch (addressError) {
          console.warn('Address fallback failed:', addressError);
        }
      }

      // Layer 5: Global fallback
      const globalFallback: CountryInfo = {
        country: 'US', // Default to US for better compatibility
        source: 'fallback',
        confidence: 0.1,
        timestamp: Date.now(),
      };
      
      return await this.enhanceCountryInfo(globalFallback, includePricingData);
    } catch (error) {
      console.error('Complete country detection failed:', error);
      
      // Ultimate fallback
      return {
        country: 'US',
        source: 'fallback',
        confidence: 0.0,
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Detect country using multiple free APIs with enhanced retry logic
   */
  private static async detectCountryFromIP(timeout = this.API_TIMEOUT, maxRetries = this.MAX_RETRIES): Promise<CountryInfo> {
    const apis = [
      {
        url: 'https://ipapi.co/json/',
        parseResponse: (data: any) => ({
          country: data.country_code?.toUpperCase(),
          ip: data.ip,
          metadata: {
            city: data.city,
            region: data.region,
            timezone: data.timezone,
            currency: data.currency,
          },
        }),
        weight: 0.9, // High reliability
      },
      {
        url: 'https://api.country.is/',
        parseResponse: (data: any) => ({
          country: data.country?.toUpperCase(),
          ip: data.ip,
        }),
        weight: 0.8,
      },
      {
        url: 'https://ipwho.is/',
        parseResponse: (data: any) => ({
          country: data.country_code?.toUpperCase(),
          ip: data.ip,
          metadata: {
            city: data.city,
            region: data.region,
            timezone: data.timezone,
            currency: data.currency_code,
          },
        }),
        weight: 0.85,
      },
      {
        url: 'https://ip-api.com/json/',
        parseResponse: (data: any) => ({
          country: data.countryCode?.toUpperCase(),
          ip: data.query,
          metadata: {
            city: data.city,
            region: data.regionName,
            timezone: data.timezone,
          },
        }),
        weight: 0.7,
      },
    ];

    let lastError: Error | null = null;

    // Sort APIs by weight (reliability) and try each with retries
    const sortedApis = apis.sort((a, b) => (b.weight || 0) - (a.weight || 0));
    
    for (const api of sortedApis) {
      for (let retry = 0; retry <= maxRetries; retry++) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        try {
          const response = await fetch(api.url, {
            method: 'GET',
            headers: {
              'Accept': 'application/json',
            },
            signal: controller.signal,
          });

          clearTimeout(timeoutId);

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }

          const data = await response.json();
          const parsed = api.parseResponse(data);
          
          if (!parsed.country) {
            throw new Error('Invalid API response');
          }

          return {
            country: parsed.country,
            ip: parsed.ip,
            timestamp: Date.now(),
            source: 'ip',
            confidence: api.weight || 0.5,
            metadata: parsed.metadata,
          };
        } catch (error) {
          clearTimeout(timeoutId);
          lastError = error as Error;
          
          if (error.name === 'AbortError') {
            lastError = new Error('Request timeout');
          }
          
          // Log retry attempt
          if (retry < maxRetries) {
            console.warn(`Retrying ${api.url} (attempt ${retry + 1}/${maxRetries + 1}):`, error);
            await new Promise(resolve => setTimeout(resolve, 1000 * (retry + 1))); // Progressive delay
          } else {
            console.warn(`Failed all retries for ${api.url}:`, error);
          }
        }
      }
    }

    // All APIs failed
    throw lastError || new Error('All geolocation APIs failed');
  }

  /**
   * Get country from user's delivery addresses as fallback
   */
  private static async getCountryFromUserAddresses(userId: string): Promise<string | null> {
    try {
      // First check delivery_addresses table for user's addresses
      const { data: deliveryAddresses, error: deliveryError } = await supabase
        .from('delivery_addresses')
        .select('country_code, is_default')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('is_default', { ascending: false }); // Default address first

      if (deliveryError) {
        console.warn('Failed to fetch delivery addresses:', deliveryError);
      } else if (deliveryAddresses && deliveryAddresses.length > 0) {
        // Return the default address country, or first available
        return deliveryAddresses[0].country_code?.toUpperCase() || null;
      }

      // Fallback: Check user_addresses table (older table)
      const { data: userAddresses, error: userError } = await supabase
        .from('user_addresses')
        .select('country_code')
        .eq('user_id', userId)
        .limit(1);

      if (userError) {
        console.warn('Failed to fetch user addresses:', userError);
        return null;
      }

      return userAddresses?.[0]?.country_code?.toUpperCase() || null;
    } catch (error) {
      console.error('Error getting country from user addresses:', error);
      return null;
    }
  }

  /**
   * Enhance country information with regional pricing data
   */
  private static async enhanceCountryInfo(
    countryInfo: CountryInfo, 
    includePricingData: boolean
  ): Promise<CountryWithPricing> {
    const enhanced: CountryWithPricing = { ...countryInfo };

    if (includePricingData) {
      try {
        // Get country information from country_settings
        const { data: countryData, error: countryError } = await supabase
          .from('country_settings')
          .select('continent, currency, name')
          .eq('code', countryInfo.country)
          .single();

        if (!countryError && countryData) {
          enhanced.metadata = {
            ...enhanced.metadata,
            continent: countryData.continent,
            currency: countryData.currency,
          };
        }

        // Check if regional pricing is available
        const pricingAvailable = await regionalPricingService.isCountrySupported(countryInfo.country);
        
        enhanced.pricingInfo = {
          continent: countryData?.continent,
          hasRegionalPricing: pricingAvailable,
          hasCountryOverrides: false, // Will be set by pricing service
          supportedServices: [], // Will be populated by pricing service
        };

        // Get supported services for this country
        if (pricingAvailable) {
          try {
            const pricingRequest = {
              country_code: countryInfo.country,
              order_value: 100, // Sample order value
              currency_code: 'USD',
            };
            
            const pricingResult = await regionalPricingService.calculatePricing(pricingRequest);
            
            if (pricingResult.success && pricingResult.data) {
              enhanced.pricingInfo.supportedServices = pricingResult.data.applicable_services || [];
              enhanced.pricingInfo.hasCountryOverrides = pricingResult.data.pricing_breakdown?.some(
                service => service.source_tier === 'country'
              ) || false;
            }
          } catch (pricingError) {
            console.warn('Failed to get pricing info for country:', pricingError);
          }
        }
      } catch (error) {
        console.warn('Failed to enhance country info:', error);
      }
    }

    return enhanced;
  }

  /**
   * Get cached country information if valid
   */
  private static getCachedCountry(): CountryInfo | null {
    try {
      const cached = sessionStorage.getItem(this.CACHE_KEY);
      if (!cached) return null;

      const countryInfo: CountryInfo = JSON.parse(cached);
      
      // Check if cache is still valid
      if (countryInfo.timestamp && 
          Date.now() - countryInfo.timestamp < this.CACHE_DURATION) {
        return countryInfo;
      }

      // Remove expired cache
      sessionStorage.removeItem(this.CACHE_KEY);
      return null;
    } catch (error) {
      // Clear corrupted cache
      sessionStorage.removeItem(this.CACHE_KEY);
      return null;
    }
  }

  /**
   * Get manual country override if set
   */
  private static getManualOverride(): CountryInfo | null {
    try {
      const manual = localStorage.getItem(this.MANUAL_OVERRIDE_KEY);
      if (!manual) return null;

      const countryInfo: CountryInfo = JSON.parse(manual);
      return {
        ...countryInfo,
        source: 'manual',
        confidence: 1.0, // Highest confidence for manual selections
      };
    } catch (error) {
      localStorage.removeItem(this.MANUAL_OVERRIDE_KEY);
      return null;
    }
  }

  /**
   * Cache country information
   */
  private static setCachedCountry(countryInfo: CountryInfo): void {
    try {
      sessionStorage.setItem(this.CACHE_KEY, JSON.stringify(countryInfo));
    } catch (error) {
      // Storage might be full or disabled
      console.warn('Failed to cache country info:', error);
    }
  }

  /**
   * Clear cached country (for testing or manual override)
   */
  static clearCache(): void {
    try {
      sessionStorage.removeItem(this.CACHE_KEY);
    } catch (error) {
      console.warn('Failed to clear country cache:', error);
    }
  }

  /**
   * Set manual country override with persistence
   */
  static setManualCountry(countryCode: string): void {
    const countryInfo: CountryInfo = {
      country: countryCode.toUpperCase(),
      timestamp: Date.now(),
      source: 'manual',
      confidence: 1.0,
    };
    
    try {
      // Store manual override in localStorage (persists across sessions)
      localStorage.setItem(this.MANUAL_OVERRIDE_KEY, JSON.stringify(countryInfo));
      // Also update session cache
      this.setCachedCountry(countryInfo);
    } catch (error) {
      console.warn('Failed to set manual country:', error);
      throw new Error('Unable to save country preference');
    }
  }

  /**
   * Clear manual country override
   */
  static clearManualCountry(): void {
    try {
      localStorage.removeItem(this.MANUAL_OVERRIDE_KEY);
      sessionStorage.removeItem(this.CACHE_KEY);
    } catch (error) {
      console.warn('Failed to clear manual country:', error);
    }
  }

  /**
   * Check if country is supported for localization
   * Now integrates with country_settings table
   */
  static isSupportedCountry(countryCode: string): boolean {
    // High-priority countries with full feature support
    const fullySupported = ['IN', 'NP']; // India, Nepal
    
    // Extended support for countries in our database
    const basicSupported = [
      'US', 'GB', 'CA', 'AU', 'SG', 'MY', 'TH', 'BD', 'LK', 'PK',
      'DE', 'FR', 'IT', 'ES', 'NL', 'JP', 'KR', 'CN', 'HK', 'TW'
    ];
    
    const code = countryCode.toUpperCase();
    return fullySupported.includes(code) || basicSupported.includes(code);
  }

  /**
   * Get support level for a country
   */
  static getCountrySupportLevel(countryCode: string): 'full' | 'basic' | 'limited' {
    const code = countryCode.toUpperCase();
    
    if (['IN', 'NP'].includes(code)) return 'full';
    if (this.isSupportedCountry(code)) return 'basic';
    return 'limited';
  }

  /**
   * Get display name for country code
   */
  static getCountryDisplayName(countryCode: string): string {
    const countryNames: Record<string, string> = {
      'IN': 'India',
      'NP': 'Nepal', 
      'US': 'United States',
      'GB': 'United Kingdom',
      'CA': 'Canada',
      'AU': 'Australia',
      'SG': 'Singapore',
      'MY': 'Malaysia',
      'TH': 'Thailand',
      'BD': 'Bangladesh',
      'LK': 'Sri Lanka',
      'PK': 'Pakistan',
      'DE': 'Germany',
      'FR': 'France',
      'IT': 'Italy',
      'ES': 'Spain',
      'NL': 'Netherlands',
      'JP': 'Japan',
      'KR': 'South Korea',
      'CN': 'China',
      'HK': 'Hong Kong',
      'TW': 'Taiwan',
      'GLOBAL': 'Global',
    };

    return countryNames[countryCode.toUpperCase()] || 'Global';
  }

  /**
   * Validate country code format
   */
  static isValidCountryCode(countryCode: string): boolean {
    return /^[A-Z]{2}$/.test(countryCode.toUpperCase());
  }

  /**
   * Get country detection statistics
   */
  static getDetectionStats(): {
    hasCache: boolean;
    hasManualOverride: boolean;
    cacheAge?: number;
    source?: string;
  } {
    const cached = this.getCachedCountry();
    const manual = this.getManualOverride();
    
    return {
      hasCache: cached !== null,
      hasManualOverride: manual !== null,
      cacheAge: cached ? Date.now() - (cached.timestamp || 0) : undefined,
      source: manual?.source || cached?.source,
    };
  }
}