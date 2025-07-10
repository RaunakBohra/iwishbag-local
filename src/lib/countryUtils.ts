import { useAllCountries } from "@/hooks/useAllCountries";

/**
 * Centralized country utility functions for consistent code/name conversion
 */

export interface CountryInfo {
  code: string;
  name: string;
  currency: string;
}

/**
 * Convert country code to display name
 * @param code - Country code (e.g., 'US', 'IN')
 * @param countries - Array of country objects from useAllCountries
 * @param showCode - Whether to include the code in parentheses
 * @returns Display name (e.g., 'United States' or 'United States (US)')
 */
export const getCountryDisplayName = (
  code: string, 
  countries: CountryInfo[] = [], 
  showCode: boolean = false
): string => {
  if (!code) return 'Unknown';
  
  const country = countries.find(c => c.code === code);
  if (!country) return code;
  
  return showCode ? `${country.name} (${code})` : country.name;
};

/**
 * Convert country name to code
 * @param name - Country name (e.g., 'United States')
 * @param countries - Array of country objects from useAllCountries
 * @returns Country code (e.g., 'US') or original name if not found
 */
export const getCountryCode = (
  name: string, 
  countries: CountryInfo[] = []
): string => {
  if (!name) return '';
  
  // If it's already a 2-letter code, return it
  if (name.length === 2 && /^[A-Z]{2}$/.test(name.toUpperCase())) {
    return name.toUpperCase();
  }
  
  const country = countries.find(c => c.name === name);
  return country ? country.code : name;
};

/**
 * React hook for country utilities
 * Provides consistent country code/name conversion across components
 */
export const useCountryUtils = () => {
  const { data: countries = [] } = useAllCountries();
  
  return {
    countries,
    getCountryDisplayName: (code: string, showCode: boolean = false) => 
      getCountryDisplayName(code, countries, showCode),
    getCountryCode: (name: string) => getCountryCode(name, countries),
    getCountryByCode: (code: string) => countries.find(c => c.code === code),
    getCountryByName: (name: string) => countries.find(c => c.name === name),
  };
};

/**
 * Format shipping route display
 * @param originCode - Origin country code
 * @param destinationCode - Destination country code
 * @param countries - Array of country objects
 * @param showCodes - Whether to include country codes
 * @returns Formatted route string (e.g., 'United States → India')
 */
export const formatShippingRoute = (
  originCode: string,
  destinationCode: string,
  countries: CountryInfo[] = [],
  showCodes: boolean = false
): string => {
  // Handle empty or invalid inputs
  if (!originCode || !destinationCode) {
    return '—';
  }
  
  const originName = getCountryDisplayName(originCode, countries, showCodes);
  const destinationName = getCountryDisplayName(destinationCode, countries, showCodes);
  
  // If either country name is invalid, return a dash
  if (originName === 'Unknown' || destinationName === 'Unknown') {
    return '—';
  }
  
  return `${originName} → ${destinationName}`;
}; 