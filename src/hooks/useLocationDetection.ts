import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { locationDetectionService } from '@/services/LocationDetectionService';

interface UseLocationDetectionOptions {
  userProfileCurrency?: string;
  userProfileCountry?: string;
  quoteDestinationCountry?: string;
  enabled?: boolean;
}

export const useLocationDetection = (options: UseLocationDetectionOptions = {}) => {
  const {
    userProfileCurrency,
    userProfileCountry,
    quoteDestinationCountry,
    enabled = true,
  } = options;

  // Query to detect location data
  const {
    data: locationData,
    isLoading: isDetecting,
    error: detectionError,
  } = useQuery({
    queryKey: ['location-detection'],
    queryFn: () => locationDetectionService.detectLocation(),
    enabled,
    staleTime: 24 * 60 * 60 * 1000, // 24 hours
    cacheTime: 24 * 60 * 60 * 1000, // 24 hours
    retry: false, // Don't retry on failure
  });

  // Query to get smart currency
  const { data: smartCurrency, isLoading: isCurrencyLoading } = useQuery({
    queryKey: [
      'smart-currency',
      userProfileCurrency,
      quoteDestinationCountry,
      locationData?.currency,
    ],
    queryFn: () =>
      locationDetectionService.getSmartCurrency(userProfileCurrency, quoteDestinationCountry),
    enabled: enabled && (!!userProfileCurrency || !!locationData || !!quoteDestinationCountry),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Query to get smart country
  const { data: smartCountry, isLoading: isCountryLoading } = useQuery({
    queryKey: [
      'smart-country',
      userProfileCountry,
      quoteDestinationCountry,
      locationData?.countryCode,
    ],
    queryFn: () =>
      locationDetectionService.getSmartCountry(userProfileCountry, quoteDestinationCountry),
    enabled: enabled && (!!userProfileCountry || !!locationData || !!quoteDestinationCountry),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    // Raw location data from IP detection
    locationData,
    isDetecting,
    detectionError,

    // Smart defaults with priority order applied
    smartCurrency,
    smartCountry,
    isCurrencyLoading,
    isCountryLoading,

    // Loading states
    isLoading: isDetecting || isCurrencyLoading || isCountryLoading,

    // Utility methods
    clearCache: locationDetectionService.clearCache.bind(locationDetectionService),
  };
};
