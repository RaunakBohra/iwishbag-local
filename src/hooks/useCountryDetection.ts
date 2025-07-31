/**
 * useCountryDetection - React hook for automatic country detection
 * Provides country code and loading state for components
 */

import { useState, useEffect } from 'react';
import { GeoLocationService } from '@/services/GeoLocationService';

export interface UseCountryDetectionResult {
  countryCode: string;
  isLoading: boolean;
  error: string | null;
  isSupported: boolean;
  displayName: string;
  setManualCountry: (country: string) => void;
  clearCache: () => void;
}

export function useCountryDetection(): UseCountryDetectionResult {
  const [countryCode, setCountryCode] = useState<string>('GLOBAL');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Detect country on component mount
  useEffect(() => {
    detectUserCountry();
  }, []);

  const detectUserCountry = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const detectedCountry = await GeoLocationService.getUserCountry();
      setCountryCode(detectedCountry);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Country detection failed';
      setError(errorMessage);
      setCountryCode('GLOBAL'); // Fallback
    } finally {
      setIsLoading(false);
    }
  };

  // Manual country override
  const setManualCountry = (country: string) => {
    try {
      GeoLocationService.setManualCountry(country);
      setCountryCode(country.toUpperCase());
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to set country';
      setError(errorMessage);
    }
  };

  // Clear cache and re-detect
  const clearCache = () => {
    try {
      GeoLocationService.clearCache();
      detectUserCountry();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to clear cache';
      setError(errorMessage);
    }
  };

  // Computed properties
  const isSupported = GeoLocationService.isSupportedCountry(countryCode);
  const displayName = GeoLocationService.getCountryDisplayName(countryCode);

  return {
    countryCode,
    isLoading,
    error,
    isSupported,
    displayName,
    setManualCountry,
    clearCache,
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