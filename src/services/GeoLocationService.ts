/**
 * GeoLocationService - Country detection for content localization
 * Uses free Country.is API for IP-based country detection
 * Implements caching and fallback strategies
 */

export interface CountryInfo {
  country: string; // ISO 2-letter country code (IN, NP, US, etc.)
  ip?: string;
  timestamp?: number;
}

export class GeoLocationService {
  private static readonly CACHE_KEY = 'iwish_user_country';
  private static readonly CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
  private static readonly API_TIMEOUT = 5000; // 5 seconds
  
  /**
   * Get user's country code with caching
   */
  static async getUserCountry(): Promise<string> {
    try {
      // Check cache first
      const cached = this.getCachedCountry();
      if (cached) {
        return cached;
      }

      // Detect country from IP
      const countryInfo = await this.detectCountryFromIP();
      
      // Cache the result
      this.setCachedCountry(countryInfo);
      
      return countryInfo.country;
    } catch (error) {
      console.warn('Country detection failed:', error);
      return 'GLOBAL'; // Default fallback
    }
  }

  /**
   * Detect country using multiple free APIs with fallback
   */
  private static async detectCountryFromIP(): Promise<CountryInfo> {
    const apis = [
      {
        url: 'https://ipapi.co/json/',
        parseResponse: (data: any) => ({
          country: data.country_code?.toUpperCase(),
          ip: data.ip,
        }),
      },
      {
        url: 'https://api.country.is/',
        parseResponse: (data: any) => ({
          country: data.country?.toUpperCase(),
          ip: data.ip,
        }),
      },
      {
        url: 'https://ipwho.is/',
        parseResponse: (data: any) => ({
          country: data.country_code?.toUpperCase(),
          ip: data.ip,
        }),
      },
    ];

    let lastError: Error | null = null;

    // Try each API in order until one succeeds
    for (const api of apis) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.API_TIMEOUT);

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
        };
      } catch (error) {
        clearTimeout(timeoutId);
        lastError = error as Error;
        
        if (error.name === 'AbortError') {
          lastError = new Error('Request timeout');
        }
        
        // Continue to next API
        console.warn(`Failed to get country from ${api.url}:`, error);
      }
    }

    // All APIs failed
    throw lastError || new Error('All geolocation APIs failed');
  }

  /**
   * Get cached country if valid
   */
  private static getCachedCountry(): string | null {
    try {
      const cached = sessionStorage.getItem(this.CACHE_KEY);
      if (!cached) return null;

      const countryInfo: CountryInfo = JSON.parse(cached);
      
      // Check if cache is still valid
      if (countryInfo.timestamp && 
          Date.now() - countryInfo.timestamp < this.CACHE_DURATION) {
        return countryInfo.country;
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
   * Set manual country override
   */
  static setManualCountry(countryCode: string): void {
    const countryInfo: CountryInfo = {
      country: countryCode.toUpperCase(),
      timestamp: Date.now(),
    };
    this.setCachedCountry(countryInfo);
  }

  /**
   * Check if country is supported for localization
   */
  static isSupportedCountry(countryCode: string): boolean {
    const supported = ['IN', 'NP']; // India, Nepal
    return supported.includes(countryCode.toUpperCase());
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
      'GLOBAL': 'Global',
    };

    return countryNames[countryCode.toUpperCase()] || 'Global';
  }
}