/**
 * IP-based Location Detection Service
 * 
 * Uses Cloudflare headers and fallback APIs for automatic country detection
 * No user permission required - works automatically
 */

interface IPLocationData {
  countryCode: string;
  countryName?: string;
  confidence: 'high' | 'medium' | 'low';
  source: 'cloudflare' | 'ipapi' | 'fallback';
}

class IPLocationService {
  private static instance: IPLocationService;
  private cachedLocation: IPLocationData | null = null;
  private cacheKey = 'ipLocation';
  private cacheExpiry = 24 * 60 * 60 * 1000; // 24 hours

  private constructor() {
    this.loadFromCache();
  }

  static getInstance(): IPLocationService {
    if (!IPLocationService.instance) {
      IPLocationService.instance = new IPLocationService();
    }
    return IPLocationService.instance;
  }

  /**
   * Detect user's country from IP address
   */
  async detectCountry(forceRefresh: boolean = false): Promise<IPLocationData> {
    // Return cached location if available and not forcing refresh
    if (this.cachedLocation && !forceRefresh) {
      console.log('[IPLocationService] Returning cached location:', this.cachedLocation);
      return this.cachedLocation;
    }

    console.log('[IPLocationService] Detecting country from IP...');

    // Method 1: Try Cloudflare headers (if deployed on Cloudflare)
    const cloudflareCountry = this.getCloudflareCountry();
    if (cloudflareCountry) {
      const location = {
        countryCode: cloudflareCountry,
        countryName: this.getCountryName(cloudflareCountry),
        confidence: 'high' as const,
        source: 'cloudflare' as const
      };
      this.cacheLocation(location);
      return location;
    }

    // Method 2: Try free IP geolocation API
    try {
      const ipApiLocation = await this.getIPAPILocation();
      if (ipApiLocation) {
        this.cacheLocation(ipApiLocation);
        return ipApiLocation;
      }
    } catch (error) {
      console.warn('[IPLocationService] IP API failed:', error);
    }

    // Method 3: Fallback to US
    const fallback = {
      countryCode: 'US',
      countryName: 'United States',
      confidence: 'low' as const,
      source: 'fallback' as const
    };
    
    this.cacheLocation(fallback);
    return fallback;
  }

  /**
   * Get country from Cloudflare headers
   */
  private getCloudflareCountry(): string | null {
    // In production, Cloudflare adds CF-IPCountry header
    // For development, check if we're running through Cloudflare
    if (typeof window !== 'undefined') {
      // Check for Cloudflare's injected data
      const cfData = (window as any).__CF;
      if (cfData?.country) {
        return cfData.country;
      }
    }
    return null;
  }

  /**
   * Get location from free IP API service
   */
  private async getIPAPILocation(): Promise<IPLocationData | null> {
    try {
      // Using ipapi.co - free tier available, HTTPS supported
      const response = await fetch('https://ipapi.co/json/', {
        signal: AbortSignal.timeout(3000) // 3 second timeout
      });

      if (!response.ok) {
        throw new Error('IP API request failed');
      }

      const data = await response.json();
      
      console.log('[IPLocationService] IP API response:', data);
      
      if (data.country_code) {
        return {
          countryCode: data.country_code,
          countryName: data.country_name,
          confidence: 'medium',
          source: 'ipapi'
        };
      }

      return null;
    } catch (error) {
      console.error('[IPLocationService] IP API error:', error);
      return null;
    }
  }

  /**
   * Get country name from code
   */
  private getCountryName(countryCode: string): string {
    const names: Record<string, string> = {
      'US': 'United States',
      'IN': 'India',
      'NP': 'Nepal',
      'GB': 'United Kingdom',
      'CA': 'Canada',
      'AU': 'Australia',
      'NZ': 'New Zealand',
      'DE': 'Germany',
      'FR': 'France',
      'IT': 'Italy',
      'ES': 'Spain',
      'JP': 'Japan',
      'CN': 'China',
      'KR': 'South Korea',
      'SG': 'Singapore',
      'MY': 'Malaysia',
      'TH': 'Thailand',
      'ID': 'Indonesia',
      'PH': 'Philippines',
      'VN': 'Vietnam',
      'BD': 'Bangladesh',
      'LK': 'Sri Lanka',
      'PK': 'Pakistan',
      'AE': 'United Arab Emirates',
      'SA': 'Saudi Arabia',
      'BR': 'Brazil',
      'MX': 'Mexico',
      'AR': 'Argentina',
      'CL': 'Chile',
      'CO': 'Colombia',
      'PE': 'Peru',
      'ZA': 'South Africa',
      'NG': 'Nigeria',
      'EG': 'Egypt',
      'KE': 'Kenya',
      'IL': 'Israel',
      'TR': 'Turkey',
      'RU': 'Russia',
      'UA': 'Ukraine',
      'PL': 'Poland',
      'NL': 'Netherlands',
      'BE': 'Belgium',
      'CH': 'Switzerland',
      'AT': 'Austria',
      'SE': 'Sweden',
      'NO': 'Norway',
      'DK': 'Denmark',
      'FI': 'Finland'
    };
    
    return names[countryCode] || countryCode;
  }

  /**
   * Cache location data
   */
  private cacheLocation(location: IPLocationData): void {
    this.cachedLocation = location;
    
    if (typeof localStorage !== 'undefined') {
      const cacheData = {
        location,
        timestamp: Date.now()
      };
      localStorage.setItem(this.cacheKey, JSON.stringify(cacheData));
    }
  }

  /**
   * Load location from cache
   */
  private loadFromCache(): void {
    if (typeof localStorage === 'undefined') return;
    
    try {
      const cached = localStorage.getItem(this.cacheKey);
      if (!cached) return;
      
      const cacheData = JSON.parse(cached);
      const age = Date.now() - cacheData.timestamp;
      
      if (age < this.cacheExpiry) {
        this.cachedLocation = cacheData.location;
        console.log('[IPLocationService] Loaded from cache:', this.cachedLocation);
      } else {
        // Clear expired cache
        localStorage.removeItem(this.cacheKey);
      }
    } catch (error) {
      console.error('[IPLocationService] Cache load error:', error);
    }
  }

  /**
   * Clear cached location
   */
  clearCache(): void {
    this.cachedLocation = null;
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(this.cacheKey);
    }
  }

  /**
   * Get cached location without making new request
   */
  getCachedLocation(): IPLocationData | null {
    return this.cachedLocation;
  }
}

// Export singleton instance
export const ipLocationService = IPLocationService.getInstance();
export default ipLocationService;