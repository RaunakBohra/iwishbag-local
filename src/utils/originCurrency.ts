/**
 * Origin Currency Utilities
 * 
 * Provides utilities for deriving currency from country codes and handling
 * currency mapping in the simplified origin-currency storage system.
 * 
 * Core Principle: Store all breakdown amounts in origin currency only,
 * convert on-demand for display based on context (admin/customer preferences).
 */

import { logger } from '@/utils/logger';

/**
 * Country to Currency Mapping
 * Maps 2-letter country codes to their primary currencies
 */
export const COUNTRY_CURRENCIES: Record<string, string> = {
  // Major economies
  'US': 'USD',  // United States Dollar
  'IN': 'INR',  // Indian Rupee  
  'GB': 'GBP',  // British Pound Sterling
  'DE': 'EUR',  // Euro (Germany)
  'FR': 'EUR',  // Euro (France)
  'IT': 'EUR',  // Euro (Italy)
  'ES': 'EUR',  // Euro (Spain)
  'NL': 'EUR',  // Euro (Netherlands)
  'BE': 'EUR',  // Euro (Belgium)
  'AT': 'EUR',  // Euro (Austria)
  'PT': 'EUR',  // Euro (Portugal)
  'IE': 'EUR',  // Euro (Ireland)
  'FI': 'EUR',  // Euro (Finland)
  'LU': 'EUR',  // Euro (Luxembourg)
  
  // Asia Pacific
  'CN': 'CNY',  // Chinese Yuan
  'JP': 'JPY',  // Japanese Yen
  'KR': 'KRW',  // South Korean Won
  'AU': 'AUD',  // Australian Dollar
  'NZ': 'NZD',  // New Zealand Dollar
  'SG': 'SGD',  // Singapore Dollar
  'HK': 'HKD',  // Hong Kong Dollar
  'TW': 'TWD',  // Taiwan Dollar
  'TH': 'THB',  // Thai Baht
  'MY': 'MYR',  // Malaysian Ringgit
  'ID': 'IDR',  // Indonesian Rupiah
  'PH': 'PHP',  // Philippine Peso
  'VN': 'VND',  // Vietnamese Dong
  
  // South Asia  
  'NP': 'NPR',  // Nepalese Rupee
  'BD': 'BDT',  // Bangladeshi Taka
  'LK': 'LKR',  // Sri Lankan Rupee
  'PK': 'PKR',  // Pakistani Rupee
  
  // Americas
  'CA': 'CAD',  // Canadian Dollar
  'MX': 'MXN',  // Mexican Peso
  'BR': 'BRL',  // Brazilian Real
  'AR': 'ARS',  // Argentine Peso
  'CL': 'CLP',  // Chilean Peso
  'CO': 'COP',  // Colombian Peso
  'PE': 'PEN',  // Peruvian Sol
  
  // Middle East & Africa
  'AE': 'AED',  // UAE Dirham
  'SA': 'SAR',  // Saudi Riyal
  'ZA': 'ZAR',  // South African Rand
  'EG': 'EGP',  // Egyptian Pound
  'NG': 'NGN',  // Nigerian Naira
  'KE': 'KES',  // Kenyan Shilling
  
  // Europe (Non-Euro)
  'CH': 'CHF',  // Swiss Franc
  'NO': 'NOK',  // Norwegian Krone
  'SE': 'SEK',  // Swedish Krona
  'DK': 'DKK',  // Danish Krone
  'CZ': 'CZK',  // Czech Koruna
  'PL': 'PLN',  // Polish Zloty
  'HU': 'HUF',  // Hungarian Forint
  'RO': 'RON',  // Romanian Leu
  'BG': 'BGN',  // Bulgarian Lev
  'HR': 'HRK',  // Croatian Kuna
  'RU': 'RUB',  // Russian Ruble
  'TR': 'TRY',  // Turkish Lira
  'UA': 'UAH',  // Ukrainian Hryvnia
  'IL': 'ILS',  // Israeli Shekel
};

/**
 * Get origin currency for a country code
 * 
 * @param originCountry - 2-letter country code (e.g., 'IN', 'US', 'DE')
 * @returns Currency code (e.g., 'INR', 'USD', 'EUR')
 */
export function getOriginCurrency(originCountry: string): string {
  if (!originCountry || typeof originCountry !== 'string') {
    logger.warn(`[OriginCurrency] Invalid country code provided: ${originCountry}, defaulting to USD`);
    return 'USD';
  }
  
  // Normalize to uppercase
  const countryCode = originCountry.trim().toUpperCase();
  
  // Check if country exists in mapping
  const currency = COUNTRY_CURRENCIES[countryCode];
  
  if (!currency) {
    logger.warn(`[OriginCurrency] No currency mapping found for country: ${countryCode}, defaulting to USD`);
    return 'USD';
  }
  
  // Reduced logging to prevent spam
  // logger.info(`[OriginCurrency] Mapped ${countryCode} → ${currency}`);
  return currency;
}

/**
 * Get destination currency for a country code
 * Same as origin currency but with different logging for clarity
 * 
 * @param destinationCountry - 2-letter country code
 * @returns Currency code
 */
export function getDestinationCurrency(destinationCountry: string): string {
  if (!destinationCountry || typeof destinationCountry !== 'string') {
    logger.warn(`[DestinationCurrency] Invalid country code provided: ${destinationCountry}, defaulting to USD`);
    return 'USD';
  }
  
  const countryCode = destinationCountry.trim().toUpperCase();
  const currency = COUNTRY_CURRENCIES[countryCode];
  
  if (!currency) {
    logger.warn(`[DestinationCurrency] No currency mapping found for country: ${countryCode}, defaulting to USD`);
    return 'USD';
  }
  
  // Reduced logging to prevent spam
  // logger.info(`[DestinationCurrency] Mapped ${countryCode} → ${currency}`);
  return currency;
}

/**
 * Check if a country uses EUR currency
 * Useful for grouping Euro zone countries
 */
export function isEuroZoneCountry(countryCode: string): boolean {
  return getOriginCurrency(countryCode) === 'EUR';
}

/**
 * Get currency symbol for display
 * Basic symbol mapping for common currencies
 */
export const CURRENCY_SYMBOLS: Record<string, string> = {
  'USD': '$',
  'EUR': '€', 
  'GBP': '£',
  'JPY': '¥',
  'INR': '₹',
  'CAD': 'C$',
  'AUD': 'A$',
  'CHF': 'CHF',
  'CNY': '¥',
  'KRW': '₩',
  'NPR': 'Rs',
  'BDT': '৳',
  'SGD': 'S$',
  'HKD': 'HK$',
  'AED': 'د.إ',
  'ZAR': 'R',
  'MXN': '$',
  'BRL': 'R$',
  'RUB': '₽',
  'TRY': '₺',
  'NOK': 'kr',
  'SEK': 'kr',
  'DKK': 'kr',
  'PLN': 'zł',
  'CZK': 'Kč',
};

/**
 * Get currency symbol for a currency code
 */
export function getCurrencySymbol(currencyCode: string): string {
  return CURRENCY_SYMBOLS[currencyCode.toUpperCase()] || currencyCode;
}

/**
 * Validate if a currency code exists in our mapping
 */
export function isValidCurrency(currencyCode: string): boolean {
  return Object.values(COUNTRY_CURRENCIES).includes(currencyCode.toUpperCase());
}

/**
 * Get all supported currency codes
 */
export function getSupportedCurrencies(): string[] {
  return Array.from(new Set(Object.values(COUNTRY_CURRENCIES))).sort();
}

/**
 * Get countries that use a specific currency
 */
export function getCountriesForCurrency(currencyCode: string): string[] {
  return Object.entries(COUNTRY_CURRENCIES)
    .filter(([_, currency]) => currency === currencyCode.toUpperCase())
    .map(([country, _]) => country);
}