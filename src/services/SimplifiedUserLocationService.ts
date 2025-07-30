/**
 * Simplified User Location Service
 * 
 * Single-purpose service for one-time location detection on first visit.
 * No complex fallbacks, no auto-switching - just simple detection.
 */

import { currencyService } from './CurrencyService';

export interface LocationSuggestion {
  countryCode: string;
  countryName: string;
  currencyCode: string;
  currencyName: string;
  confidence: 'high' | 'medium' | 'low';
  source: 'geolocation' | 'oauth' | 'fallback';
}

class SimplifiedUserLocationService {
  private static instance: SimplifiedUserLocationService;
  private hasDetected = false;

  private constructor() {}

  static getInstance(): SimplifiedUserLocationService {
    if (!SimplifiedUserLocationService.instance) {
      SimplifiedUserLocationService.instance = new SimplifiedUserLocationService();
    }
    return SimplifiedUserLocationService.instance;
  }

  /**
   * One-time location detection for new users
   * Only runs once per session, returns suggestion for user to accept/reject
   */
  async detectUserLocation(user?: any): Promise<LocationSuggestion> {
    if (this.hasDetected) {
      return this.getFallbackSuggestion();
    }

    this.hasDetected = true;
    console.log('[SimplifiedLocationService] Starting one-time location detection');

    // Method 1: Try OAuth user metadata (highest confidence)
    const oauthSuggestion = this.getOAuthSuggestion(user);
    if (oauthSuggestion) {
      console.log('[SimplifiedLocationService] Using OAuth data:', oauthSuggestion);
      return oauthSuggestion;
    }

    // Method 2: Try browser geolocation (medium confidence)
    const geoSuggestion = await this.getGeolocationSuggestion();
    if (geoSuggestion) {
      console.log('[SimplifiedLocationService] Using geolocation:', geoSuggestion);
      return geoSuggestion;
    }

    // Method 3: Fallback to US/USD (low confidence)
    console.log('[SimplifiedLocationService] Using fallback: US/USD');
    return this.getFallbackSuggestion();
  }

  /**
   * Extract location from OAuth user metadata
   */
  private getOAuthSuggestion(user?: any): LocationSuggestion | null {
    if (!user?.user_metadata) return null;

    // Try to extract country from OAuth metadata
    const metadata = user.user_metadata;
    let countryCode: string | null = null;

    // Common OAuth country fields
    if (metadata.country) countryCode = metadata.country;
    else if (metadata.locale?.includes('-')) {
      countryCode = metadata.locale.split('-')[1].toUpperCase();
    }
    else if (metadata.address?.country) countryCode = metadata.address.country;

    if (!countryCode) return null;

    // Normalize country code (handle common variations)
    countryCode = this.normalizeCountryCode(countryCode);
    
    const currencyCode = currencyService.getCurrencyForCountrySync(countryCode);
    
    return {
      countryCode,
      countryName: this.getCountryName(countryCode),
      currencyCode,
      currencyName: currencyService.getCurrencyName(currencyCode),
      confidence: 'high',
      source: 'oauth'
    };
  }

  /**
   * Try browser geolocation API
   */
  private async getGeolocationSuggestion(): Promise<LocationSuggestion | null> {
    if (!navigator.geolocation) return null;

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          timeout: 5000,
          enableHighAccuracy: false
        });
      });

      // For demo purposes, map coordinates to common countries
      // In production, you'd use a proper geocoding service
      const countryCode = this.coordinatesToCountry(
        position.coords.latitude, 
        position.coords.longitude
      );

      if (!countryCode) return null;

      const currencyCode = currencyService.getCurrencyForCountrySync(countryCode);

      return {
        countryCode,
        countryName: this.getCountryName(countryCode),
        currencyCode,
        currencyName: currencyService.getCurrencyName(currencyCode),
        confidence: 'medium',
        source: 'geolocation'
      };
    } catch (error) {
      console.warn('[SimplifiedLocationService] Geolocation failed:', error);
      return null;
    }
  }

  /**
   * Simple fallback - always US/USD
   */
  private getFallbackSuggestion(): LocationSuggestion {
    return {
      countryCode: 'US',
      countryName: 'United States',
      currencyCode: 'USD',
      currencyName: 'US Dollar',
      confidence: 'low',
      source: 'fallback'
    };
  }

  /**
   * Normalize country code variations
   */
  private normalizeCountryCode(code: string): string {
    const normalized = code.toUpperCase();
    
    // Handle common variations
    const mapping: Record<string, string> = {
      'USA': 'US',
      'INDIA': 'IN',
      'NEPAL': 'NP',
      'BRITAIN': 'GB',
      'UK': 'GB',
      'ENGLAND': 'GB'
    };

    return mapping[normalized] || normalized;
  }

  /**
   * Simple coordinate to country mapping (for common regions)
   */
  private coordinatesToCountry(lat: number, lng: number): string | null {
    // Very basic mapping - in production use proper geocoding
    if (lat >= 28 && lat <= 30 && lng >= 80 && lng <= 88) return 'NP'; // Nepal
    if (lat >= 8 && lat <= 37 && lng >= 68 && lng <= 97) return 'IN'; // India
    if (lat >= 25 && lat <= 49 && lng >= -125 && lng <= -66) return 'US'; // USA
    if (lat >= 49 && lat <= 61 && lng >= -141 && lng <= -52) return 'CA'; // Canada
    if (lat >= 50 && lat <= 61 && lng >= -8 && lng <= 2) return 'GB'; // UK
    if (lat >= -44 && lat <= -10 && lng >= 113 && lng <= 154) return 'AU'; // Australia
    
    return null;
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
      'DE': 'Germany',
      'FR': 'France',
      'JP': 'Japan',
      'CN': 'China'
    };
    
    return names[countryCode] || countryCode;
  }

  /**
   * Reset detection state (for testing)
   */
  resetDetection(): void {
    this.hasDetected = false;
  }
}

// Export singleton instance
export const simplifiedUserLocationService = SimplifiedUserLocationService.getInstance();
export default simplifiedUserLocationService;