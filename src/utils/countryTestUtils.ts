/**
 * Testing utilities for country detection
 * Allows manual testing of different country scenarios
 */

import { GeoLocationService } from '@/services/GeoLocationService';

export class CountryTestUtils {
  /**
   * Simulate Nepal user for testing
   */
  static simulateNepalUser(): void {
    GeoLocationService.setManualCountry('NP');
    console.log('🇳🇵 Simulating Nepal user - refresh page to see Nepal phone numbers');
  }

  /**
   * Simulate India user for testing
   */
  static simulateIndiaUser(): void {
    GeoLocationService.setManualCountry('IN');
    console.log('🇮🇳 Simulating India user - refresh page to see India contact info');
  }

  /**
   * Simulate global/US user for testing
   */
  static simulateGlobalUser(): void {
    GeoLocationService.setManualCountry('US');
    console.log('🌍 Simulating Global user - refresh page to see email-only contact');
  }

  /**
   * Reset to auto-detection
   */
  static resetToAutoDetection(): void {
    GeoLocationService.clearCache();
    console.log('🔄 Reset to auto-detection - refresh page to detect real country');
  }

  /**
   * Show current country info
   */
  static async showCurrentCountry(): Promise<void> {
    const country = await GeoLocationService.getUserCountry();
    const displayName = GeoLocationService.getCountryDisplayName(country);
    console.log(`📍 Current detected country: ${country} (${displayName})`);
  }
}

// Add to window for browser console testing
if (typeof window !== 'undefined') {
  (window as any).CountryTestUtils = CountryTestUtils;
  console.log(`
🧪 Country Testing Utils Available:
- CountryTestUtils.simulateNepalUser() - Test Nepal phone numbers
- CountryTestUtils.simulateIndiaUser() - Test India contact info  
- CountryTestUtils.simulateGlobalUser() - Test global email-only
- CountryTestUtils.resetToAutoDetection() - Reset to real detection
- CountryTestUtils.showCurrentCountry() - Show current detected country

Visit /help page after running these commands to see the changes.
  `);
}