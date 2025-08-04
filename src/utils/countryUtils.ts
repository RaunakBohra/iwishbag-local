/**
 * Country utility functions for flags, formatting, and display
 */

/**
 * Get flag emoji for a country code
 * @param countryCode - ISO 2-letter country code (e.g., 'US', 'GB')
 * @returns Flag emoji or default flag if not found
 */
export const getFlagEmoji = (countryCode: string): string => {
  const flagMap: Record<string, string> = {
    // Major purchase countries
    'US': '🇺🇸', 'CN': '🇨🇳', 'GB': '🇬🇧', 'JP': '🇯🇵', 'DE': '🇩🇪', 
    'CA': '🇨🇦', 'AU': '🇦🇺', 'FR': '🇫🇷', 'IT': '🇮🇹', 'ES': '🇪🇸',
    'KR': '🇰🇷', 'IN': '🇮🇳', 'BR': '🇧🇷', 'MX': '🇲🇽', 'RU': '🇷🇺',
    
    // Asian markets
    'SG': '🇸🇬', 'HK': '🇭🇰', 'TW': '🇹🇼', 'TH': '🇹🇭', 'MY': '🇲🇾',
    'ID': '🇮🇩', 'PH': '🇵🇭', 'VN': '🇻🇳', 'BD': '🇧🇩', 'LK': '🇱🇰',
    'PK': '🇵🇰', 'NP': '🇳🇵',
    
    // Middle East & Africa
    'AE': '🇦🇪', 'SA': '🇸🇦', 'IL': '🇮🇱', 'TR': '🇹🇷', 'ZA': '🇿🇦',
    'EG': '🇪🇬', 'NG': '🇳🇬', 'KE': '🇰🇪',
    
    // Europe
    'NL': '🇳🇱', 'BE': '🇧🇪', 'CH': '🇨🇭', 'AT': '🇦🇹', 'SE': '🇸🇪',
    'NO': '🇳🇴', 'DK': '🇩🇰', 'FI': '🇫🇮', 'PL': '🇵🇱', 'CZ': '🇨🇿',
    'IE': '🇮🇪', 'PT': '🇵🇹', 'GR': '🇬🇷',
    
    // Americas
    'AR': '🇦🇷', 'CL': '🇨🇱', 'CO': '🇨🇴', 'PE': '🇵🇪', 'UY': '🇺🇾',
    'EC': '🇪🇨', 'BO': '🇧🇴', 'VE': '🇻🇪'
  };
  
  return flagMap[countryCode.toUpperCase()] || '🏳️';
};

/**
 * Format country display with flag, name, and currency
 * @param country - Country object with code, name, currency
 * @param showCurrency - Whether to show currency in parentheses
 * @returns Formatted string like "🇺🇸 United States (USD)"
 */
export const formatCountryDisplay = (
  country: { code: string; name: string; currency: string }, 
  showCurrency: boolean = true
): string => {
  const flag = getFlagEmoji(country.code);
  const name = country.name;
  const currency = showCurrency ? ` (${country.currency})` : '';
  
  return `${flag} ${name}${currency}`;
};

/**
 * Sort countries with popular/major countries first
 * @param countries - Array of country objects
 * @returns Sorted array with popular countries first
 */
export const sortCountriesByPopularity = (countries: any[]): any[] => {
  const popularCountries = ['US', 'CN', 'GB', 'JP', 'DE', 'CA', 'FR', 'AU', 'IT', 'ES'];
  
  return countries.sort((a, b) => {
    const aIndex = popularCountries.indexOf(a.code);
    const bIndex = popularCountries.indexOf(b.code);
    
    // If both are popular, sort by popularity order
    if (aIndex !== -1 && bIndex !== -1) {
      return aIndex - bIndex;
    }
    
    // Popular countries come first
    if (aIndex !== -1 && bIndex === -1) return -1;
    if (aIndex === -1 && bIndex !== -1) return 1;
    
    // For non-popular countries, sort alphabetically
    return a.name.localeCompare(b.name);
  });
};