/**
 * Simplified Location Detection Service
 * 
 * DEPRECATED: This service had too many complex fallbacks.
 * Use SimplifiedUserLocationService for new implementations.
 * 
 * Simple fallback: US/USD only
 */

interface LocationData {
  country: string;
  countryCode: string;
  currency: string;
  timezone: string;
  source: 'fallback';
}

class LocationDetectionService {
  private static instance: LocationDetectionService;

  private constructor() {}

  static getInstance(): LocationDetectionService {
    if (!LocationDetectionService.instance) {
      LocationDetectionService.instance = new LocationDetectionService();
    }
    return LocationDetectionService.instance;
  }

  /**
   * Simplified detection - always returns US/USD
   * For complex detection, use SimplifiedUserLocationService
   */
  async detectLocation(options: any = {}): Promise<LocationData> {
    console.warn('[LocationDetectionService] DEPRECATED: Use SimplifiedUserLocationService instead');
    return this.getFallbackLocation();
  }

  /**
   * Simple fallback location (US/USD)
   */
  private getFallbackLocation(): LocationData {
    console.log('[LocationDetection] Using simple fallback: US/USD');
    
    return {
      country: 'United States',
      countryCode: 'US',
      currency: 'USD',
      timezone: 'America/New_York',
      source: 'fallback'
    };
  }

  /**
   * No-op cache clear for compatibility
   */
  clearCache(): void {
    // No-op
  }

  /**
   * Legacy compatibility methods
   */
  async getLocationFromIP(): Promise<LocationData> {
    return this.getFallbackLocation();
  }

  async detectUserLocation(): Promise<LocationData> {
    return this.getFallbackLocation();
  }
}

// Export singleton instance
export const locationDetectionService = LocationDetectionService.getInstance();
export default locationDetectionService;