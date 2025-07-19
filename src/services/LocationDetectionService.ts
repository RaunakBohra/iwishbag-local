/**
 * LocationDetectionService - IP-based country and currency detection
 * 
 * Priority order for currency selection:
 * 1. User Profile Preference (highest priority)
 * 2. IP-based Auto-detection (fallback if no profile)
 * 3. Quote Destination Country (for guests)
 * 4. USD (final fallback)
 */

import { currencyService } from './CurrencyService';

interface LocationData {
  country: string;
  countryCode: string;
  currency: string;
  timezone: string;
  city?: string;
  region?: string;
}

interface IPLocationResponse {
  country_code: string;
  country_name: string;
  currency: string;
  timezone: string;
  city?: string;
  region?: string;
}

class LocationDetectionService {
  private cachedLocation: LocationData | null = null;
  private cacheExpiry: number = 0;
  private readonly CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
  private readonly REQUEST_TIMEOUT = 5000; // 5 seconds

  /**
   * Detect user's country and currency based on IP address
   * Uses ipapi.co service with fallback to browser timezone detection
   */
  async detectLocation(): Promise<LocationData | null> {
    // Return cached result if still valid
    if (this.cachedLocation && Date.now() < this.cacheExpiry) {
      console.log('🌍 Using cached location:', this.cachedLocation);
      return this.cachedLocation;
    }

    try {
      // Try IP-based detection first
      const ipLocation = await this.detectLocationByIP();
      if (ipLocation) {
        this.cacheLocation(ipLocation);
        return ipLocation;
      }

      // Fallback to timezone-based detection
      const timezoneLocation = this.detectLocationByTimezone();
      if (timezoneLocation) {
        this.cacheLocation(timezoneLocation);
        return timezoneLocation;
      }

    } catch (error) {
      console.warn('Location detection failed:', error);
    }

    return null;
  }

  /**
   * Detect location using IP geolocation API
   */
  private async detectLocationByIP(): Promise<LocationData | null> {
    try {
      console.log('🌍 Detecting location via IP...');
      
      // Use ipapi.co (free tier allows 1000 requests/day)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.REQUEST_TIMEOUT);

      const response = await fetch('https://ipapi.co/json/', {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data: IPLocationResponse = await response.json();
      
      // Validate response
      if (!data.country_code || !data.currency) {
        throw new Error('Invalid response format');
      }

      const location: LocationData = {
        country: data.country_name,
        countryCode: data.country_code.toUpperCase(),
        currency: data.currency.toUpperCase(),
        timezone: data.timezone,
        city: data.city,
        region: data.region,
      };

      console.log('✅ IP-based location detected:', location);
      return location;

    } catch (error) {
      console.warn('IP-based detection failed:', error);
      return null;
    }
  }

  /**
   * Fallback detection using browser timezone
   */
  private detectLocationByTimezone(): LocationData | null {
    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      console.log('🌍 Detecting location via timezone:', timezone);

      // Basic timezone to country mapping for major regions
      const timezoneMap: Record<string, { country: string; countryCode: string; currency: string }> = {
        // US timezones
        'America/New_York': { country: 'United States', countryCode: 'US', currency: 'USD' },
        'America/Chicago': { country: 'United States', countryCode: 'US', currency: 'USD' },
        'America/Denver': { country: 'United States', countryCode: 'US', currency: 'USD' },
        'America/Los_Angeles': { country: 'United States', countryCode: 'US', currency: 'USD' },
        
        // European timezones
        'Europe/London': { country: 'United Kingdom', countryCode: 'GB', currency: 'GBP' },
        'Europe/Paris': { country: 'France', countryCode: 'FR', currency: 'EUR' },
        'Europe/Berlin': { country: 'Germany', countryCode: 'DE', currency: 'EUR' },
        'Europe/Rome': { country: 'Italy', countryCode: 'IT', currency: 'EUR' },
        'Europe/Madrid': { country: 'Spain', countryCode: 'ES', currency: 'EUR' },

        // Asian timezones
        'Asia/Kolkata': { country: 'India', countryCode: 'IN', currency: 'INR' },
        'Asia/Kathmandu': { country: 'Nepal', countryCode: 'NP', currency: 'NPR' },
        'Asia/Tokyo': { country: 'Japan', countryCode: 'JP', currency: 'JPY' },
        'Asia/Shanghai': { country: 'China', countryCode: 'CN', currency: 'CNY' },
        'Asia/Singapore': { country: 'Singapore', countryCode: 'SG', currency: 'SGD' },

        // Other major timezones
        'Australia/Sydney': { country: 'Australia', countryCode: 'AU', currency: 'AUD' },
        'America/Toronto': { country: 'Canada', countryCode: 'CA', currency: 'CAD' },
      };

      const match = timezoneMap[timezone];
      if (match) {
        const location: LocationData = {
          ...match,
          timezone,
        };
        console.log('✅ Timezone-based location detected:', location);
        return location;
      }

      console.warn('🌍 Timezone not recognized:', timezone);
      return null;

    } catch (error) {
      console.warn('Timezone-based detection failed:', error);
      return null;
    }
  }

  /**
   * Get smart currency based on priority:
   * 1. User profile preference
   * 2. IP-detected currency  
   * 3. Quote destination currency
   * 4. USD fallback
   */
  async getSmartCurrency(
    userProfileCurrency?: string,
    quoteDestinationCountry?: string
  ): Promise<string> {
    // 1. User profile preference (highest priority)
    if (userProfileCurrency) {
      console.log('💰 Using user profile currency:', userProfileCurrency);
      return userProfileCurrency;
    }

    // 2. IP-based detection
    const detectedLocation = await this.detectLocation();
    if (detectedLocation?.currency) {
      // Validate currency is supported by our system
      try {
        const currencyInfo = await currencyService.getCurrency(detectedLocation.currency);
        if (currencyInfo) {
          console.log('💰 Using IP-detected currency:', detectedLocation.currency);
          return detectedLocation.currency;
        }
      } catch (error) {
        console.warn('IP-detected currency not supported:', detectedLocation.currency);
      }
    }

    // 3. Quote destination country currency
    if (quoteDestinationCountry) {
      try {
        const destinationCurrency = await currencyService.getCurrencyForCountry(quoteDestinationCountry);
        if (destinationCurrency) {
          console.log('💰 Using quote destination currency:', destinationCurrency);
          return destinationCurrency;
        }
      } catch (error) {
        console.warn('Quote destination currency lookup failed:', error);
      }
    }

    // 4. USD fallback
    console.log('💰 Using USD fallback currency');
    return 'USD';
  }

  /**
   * Get smart country based on similar priority
   */
  async getSmartCountry(
    userProfileCountry?: string,
    quoteDestinationCountry?: string
  ): Promise<string> {
    // 1. User profile preference
    if (userProfileCountry) {
      return userProfileCountry;
    }

    // 2. IP-based detection
    const detectedLocation = await this.detectLocation();
    if (detectedLocation?.countryCode) {
      return detectedLocation.countryCode;
    }

    // 3. Quote destination country
    if (quoteDestinationCountry) {
      return quoteDestinationCountry;
    }

    // 4. US fallback
    return 'US';
  }

  /**
   * Cache location data
   */
  private cacheLocation(location: LocationData): void {
    this.cachedLocation = location;
    this.cacheExpiry = Date.now() + this.CACHE_DURATION;
    
    // Also cache in localStorage for persistence across sessions
    try {
      localStorage.setItem('iwishbag_location_cache', JSON.stringify({
        location,
        expiry: this.cacheExpiry,
      }));
    } catch (error) {
      console.warn('Failed to cache location in localStorage:', error);
    }
  }

  /**
   * Load cached location from localStorage
   */
  private loadCachedLocation(): void {
    try {
      const cached = localStorage.getItem('iwishbag_location_cache');
      if (cached) {
        const { location, expiry } = JSON.parse(cached);
        if (Date.now() < expiry) {
          this.cachedLocation = location;
          this.cacheExpiry = expiry;
        } else {
          localStorage.removeItem('iwishbag_location_cache');
        }
      }
    } catch (error) {
      console.warn('Failed to load cached location:', error);
    }
  }

  /**
   * Clear cached location (useful for testing)
   */
  clearCache(): void {
    this.cachedLocation = null;
    this.cacheExpiry = 0;
    try {
      localStorage.removeItem('iwishbag_location_cache');
    } catch (error) {
      console.warn('Failed to clear location cache:', error);
    }
  }

  constructor() {
    this.loadCachedLocation();
  }
}

// Export singleton instance
export const locationDetectionService = new LocationDetectionService();