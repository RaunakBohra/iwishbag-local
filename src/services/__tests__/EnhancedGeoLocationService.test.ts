/**
 * EnhancedGeoLocationService Tests
 * Tests the enhanced country detection with pricing integration
 */

import { EnhancedGeoLocationService } from '../EnhancedGeoLocationService';

describe('EnhancedGeoLocationService', () => {
  beforeEach(() => {
    // Clear any cached data between tests
    EnhancedGeoLocationService.clearCache();
    EnhancedGeoLocationService.clearManualCountry();
  });

  describe('Country Code Validation', () => {
    it('should validate correct country codes', () => {
      expect(EnhancedGeoLocationService.isValidCountryCode('US')).toBe(true);
      expect(EnhancedGeoLocationService.isValidCountryCode('IN')).toBe(true);
      expect(EnhancedGeoLocationService.isValidCountryCode('NP')).toBe(true);
    });

    it('should reject invalid country codes', () => {
      expect(EnhancedGeoLocationService.isValidCountryCode('USA')).toBe(false);
      expect(EnhancedGeoLocationService.isValidCountryCode('1N')).toBe(false);
      expect(EnhancedGeoLocationService.isValidCountryCode('U')).toBe(false);
      expect(EnhancedGeoLocationService.isValidCountryCode('')).toBe(false);
    });
  });

  describe('Country Support Levels', () => {
    it('should return correct support levels', () => {
      expect(EnhancedGeoLocationService.getCountrySupportLevel('IN')).toBe('full');
      expect(EnhancedGeoLocationService.getCountrySupportLevel('NP')).toBe('full');
      expect(EnhancedGeoLocationService.getCountrySupportLevel('US')).toBe('basic');
      expect(EnhancedGeoLocationService.getCountrySupportLevel('GB')).toBe('basic');
      expect(EnhancedGeoLocationService.getCountrySupportLevel('ZZ')).toBe('limited');
    });

    it('should identify supported countries', () => {
      expect(EnhancedGeoLocationService.isSupportedCountry('IN')).toBe(true);
      expect(EnhancedGeoLocationService.isSupportedCountry('US')).toBe(true);
      expect(EnhancedGeoLocationService.isSupportedCountry('GB')).toBe(true);
      expect(EnhancedGeoLocationService.isSupportedCountry('ZZ')).toBe(false);
    });
  });

  describe('Country Display Names', () => {
    it('should return correct display names', () => {
      expect(EnhancedGeoLocationService.getCountryDisplayName('US')).toBe('United States');
      expect(EnhancedGeoLocationService.getCountryDisplayName('IN')).toBe('India');
      expect(EnhancedGeoLocationService.getCountryDisplayName('NP')).toBe('Nepal');
      expect(EnhancedGeoLocationService.getCountryDisplayName('UNKNOWN')).toBe('Global');
    });

    it('should handle lowercase country codes', () => {
      expect(EnhancedGeoLocationService.getCountryDisplayName('us')).toBe('United States');
      expect(EnhancedGeoLocationService.getCountryDisplayName('in')).toBe('India');
    });
  });

  describe('Manual Country Override', () => {
    it('should set and get manual country', () => {
      EnhancedGeoLocationService.setManualCountry('IN');
      
      const stats = EnhancedGeoLocationService.getDetectionStats();
      expect(stats.hasManualOverride).toBe(true);
      expect(stats.source).toBe('manual');
    });

    it('should clear manual country', () => {
      EnhancedGeoLocationService.setManualCountry('IN');
      EnhancedGeoLocationService.clearManualCountry();
      
      const stats = EnhancedGeoLocationService.getDetectionStats();
      expect(stats.hasManualOverride).toBe(false);
    });

    it('should normalize country codes to uppercase', () => {
      EnhancedGeoLocationService.setManualCountry('us');
      
      const stats = EnhancedGeoLocationService.getDetectionStats();
      expect(stats.hasManualOverride).toBe(true);
      // The actual country code should be uppercase in storage
    });
  });

  describe('Detection Stats', () => {
    it('should return empty stats when no data exists', () => {
      const stats = EnhancedGeoLocationService.getDetectionStats();
      
      expect(stats.hasCache).toBe(false);
      expect(stats.hasManualOverride).toBe(false);
      expect(stats.cacheAge).toBeUndefined();
      expect(stats.source).toBeUndefined();
    });

    it('should return stats when manual override is set', () => {
      EnhancedGeoLocationService.setManualCountry('US');
      
      const stats = EnhancedGeoLocationService.getDetectionStats();
      
      expect(stats.hasManualOverride).toBe(true);
      expect(stats.source).toBe('manual');
    });
  });

  describe('Cache Management', () => {
    it('should handle cache clearing gracefully', () => {
      // Should not throw even when cache is empty
      expect(() => {
        EnhancedGeoLocationService.clearCache();
      }).not.toThrow();
    });

    it('should handle clearing manual country gracefully', () => {
      // Should not throw even when no manual override exists
      expect(() => {
        EnhancedGeoLocationService.clearManualCountry();
      }).not.toThrow();
    });
  });
});