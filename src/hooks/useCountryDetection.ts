/**
 * useCountryDetection - Enhanced React hook for automatic country detection
 * Provides country code, loading state, and regional pricing integration
 */

import { useState, useEffect } from 'react';
import { EnhancedGeoLocationService, CountryWithPricing, CountryDetectionOptions } from '@/services/EnhancedGeoLocationService';
import { GeoLocationService } from '@/services/GeoLocationService'; // Fallback service
import { useAuth } from '@/contexts/AuthContext';

export interface UseCountryDetectionResult {
  countryCode: string;
  isLoading: boolean;
  error: string | null;
  isSupported: boolean;
  displayName: string;
  setManualCountry: (country: string) => void;
  clearCache: () => void;
  // Enhanced features
  countryInfo?: CountryWithPricing;
  confidence: number;
  detectionSource: 'ip' | 'address' | 'manual' | 'fallback';
  supportLevel: 'full' | 'basic' | 'limited';
  hasRegionalPricing: boolean;
  refresh: () => Promise<void>;
}

export interface UseCountryDetectionOptions {
  includePricingData?: boolean;
  enableAddressFallback?: boolean;
  maxRetries?: number;
  timeout?: number;
}

export function useCountryDetection(options: UseCountryDetectionOptions = {}): UseCountryDetectionResult {
  const {
    includePricingData = false,
    enableAddressFallback = true,
    maxRetries = 2,
    timeout = 5000,
  } = options;

  const { user } = useAuth();
  const [countryCode, setCountryCode] = useState<string>('US');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [countryInfo, setCountryInfo] = useState<CountryWithPricing | undefined>();
  const [confidence, setConfidence] = useState<number>(0);
  const [detectionSource, setDetectionSource] = useState<'ip' | 'address' | 'manual' | 'fallback'>('fallback');

  // Detect country on component mount and when user changes
  useEffect(() => {
    detectUserCountry();
  }, [user?.id]); // Re-detect when user changes (for address fallback)

  const detectUserCountry = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const detectionOptions: CountryDetectionOptions = {
        userId: enableAddressFallback ? user?.id : undefined,
        includePricingData,
        maxRetries,
        timeout,
      };

      // Try enhanced detection first, fallback to original service if needed
      let result: CountryWithPricing;
      try {
        result = await EnhancedGeoLocationService.getCountryInfo(detectionOptions);
      } catch (enhancedError) {
        console.warn('Enhanced detection failed, using fallback:', enhancedError);
        // Fallback to original service
        const fallbackCountry = await GeoLocationService.getUserCountry();
        result = {
          country: fallbackCountry,
          source: 'fallback',
          confidence: 0.3,
          timestamp: Date.now(),
        };
      }

      setCountryCode(result.country);
      setCountryInfo(result);
      setConfidence(result.confidence);
      setDetectionSource(result.source);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Country detection failed';
      setError(errorMessage);
      setCountryCode('US'); // Better fallback than GLOBAL
      setConfidence(0);
      setDetectionSource('fallback');
    } finally {
      setIsLoading(false);
    }
  };

  // Manual country override
  const setManualCountry = (country: string) => {
    try {
      EnhancedGeoLocationService.setManualCountry(country);
      setCountryCode(country.toUpperCase());
      setDetectionSource('manual');
      setConfidence(1.0);
      setError(null);
      
      // Update country info if we had it
      if (countryInfo) {
        setCountryInfo({
          ...countryInfo,
          country: country.toUpperCase(),
          source: 'manual',
          confidence: 1.0,
        });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to set country';
      setError(errorMessage);
    }
  };

  // Clear cache and re-detect
  const clearCache = () => {
    try {
      EnhancedGeoLocationService.clearCache();
      EnhancedGeoLocationService.clearManualCountry();
      detectUserCountry();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to clear cache';
      setError(errorMessage);
    }
  };

  // Refresh detection (alias for detectUserCountry)
  const refresh = async () => {
    await detectUserCountry();
  };

  // Computed properties
  const isSupported = EnhancedGeoLocationService.isSupportedCountry(countryCode);
  const displayName = EnhancedGeoLocationService.getCountryDisplayName(countryCode);
  const supportLevel = EnhancedGeoLocationService.getCountrySupportLevel(countryCode);
  const hasRegionalPricing = countryInfo?.pricingInfo?.hasRegionalPricing || false;

  return {
    countryCode,
    isLoading,
    error,
    isSupported,
    displayName,
    setManualCountry,
    clearCache,
    // Enhanced features
    countryInfo,
    confidence,
    detectionSource,
    supportLevel,
    hasRegionalPricing,
    refresh,
  };
}

// Simplified hook for just getting country code
export function useCountryCode(): string {
  const { countryCode } = useCountryDetection();
  return countryCode;
}

// Hook for checking if current country is supported
export function useIsSupportedCountry(): boolean {
  const { isSupported } = useCountryDetection();
  return isSupported;
}

// Hook for getting country with pricing data
export function useCountryWithPricing(): {
  countryCode: string;
  countryInfo?: CountryWithPricing;
  hasRegionalPricing: boolean;
  isLoading: boolean;
} {
  const { countryCode, countryInfo, hasRegionalPricing, isLoading } = useCountryDetection({
    includePricingData: true,
  });
  
  return {
    countryCode,
    countryInfo,
    hasRegionalPricing,
    isLoading,
  };
}

// Hook for admin components that need full detection stats
export function useCountryDetectionStats(): {
  countryCode: string;
  confidence: number;
  source: 'ip' | 'address' | 'manual' | 'fallback';
  supportLevel: 'full' | 'basic' | 'limited';
  stats: ReturnType<typeof EnhancedGeoLocationService.getDetectionStats>;
  refresh: () => Promise<void>;
} {
  const { countryCode, confidence, detectionSource, supportLevel, refresh } = useCountryDetection();
  const stats = EnhancedGeoLocationService.getDetectionStats();
  
  return {
    countryCode,
    confidence,
    source: detectionSource,
    supportLevel,
    stats,
    refresh,
  };
}