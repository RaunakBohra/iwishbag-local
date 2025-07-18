import { parsePhoneNumber, isValidPhoneNumber, CountryCode } from 'libphonenumber-js';

/**
 * Validates a phone number string
 */
export function isValidPhone(phone: string): boolean {
  if (!phone || phone.length < 3) return false;
  
  try {
    return isValidPhoneNumber(phone);
  } catch {
    return false;
  }
}

/**
 * Formats a phone number for display
 */
export function formatPhoneNumber(phone: string, country?: CountryCode): string {
  if (!phone) return '';
  
  try {
    const phoneNumber = parsePhoneNumber(phone, country);
    return phoneNumber ? phoneNumber.formatInternational() : phone;
  } catch {
    return phone;
  }
}

/**
 * Gets the national format of a phone number
 */
export function formatPhoneNumberNational(phone: string, country?: CountryCode): string {
  if (!phone) return '';
  
  try {
    const phoneNumber = parsePhoneNumber(phone, country);
    return phoneNumber ? phoneNumber.formatNational() : phone;
  } catch {
    return phone;
  }
}

/**
 * Gets the E.164 format of a phone number (for database storage)
 */
export function formatPhoneNumberE164(phone: string, country?: CountryCode): string {
  if (!phone) return '';
  
  try {
    const phoneNumber = parsePhoneNumber(phone, country);
    return phoneNumber ? phoneNumber.format('E.164') : phone;
  } catch {
    return phone;
  }
}

/**
 * Extracts country code from phone number
 */
export function getCountryFromPhone(phone: string): CountryCode | undefined {
  if (!phone) return undefined;
  
  try {
    const phoneNumber = parsePhoneNumber(phone);
    return phoneNumber?.country;
  } catch {
    return undefined;
  }
}

/**
 * Detects if a phone number is mobile
 */
export function isMobileNumber(phone: string): boolean {
  if (!phone) return false;
  
  try {
    const phoneNumber = parsePhoneNumber(phone);
    return phoneNumber?.getType() === 'MOBILE';
  } catch {
    return false;
  }
}

/**
 * Gets the default country based on common countries in your app
 * Returns safe country codes that are known to work with react-international-phone
 */
export function getDefaultCountryForUser(userCountry?: string): string {
  if (!userCountry) return 'us';
  
  // List of countries definitely supported by react-international-phone
  const supportedCountries = ['us', 'in', 'au', 'gb', 'jp', 'ca', 'de', 'fr', 'it', 'es'];
  
  // Primary mapping for our main countries
  const countryMap: Record<string, string> = {
    'IN': 'in',
    'NP': 'in', // Nepal -> India (similar region, +977 is covered by +91 format)
    'US': 'us',
    'AU': 'au',
    'GB': 'gb',
    'JP': 'jp',
  };
  
  const upperCountry = userCountry.toUpperCase();
  const mappedCountry = countryMap[upperCountry];
  
  // If we have a direct mapping, use it
  if (mappedCountry && supportedCountries.includes(mappedCountry)) {
    return mappedCountry;
  }
  
  // Try pattern matching for common variations
  const lowerCountry = userCountry.toLowerCase();
  if (lowerCountry.includes('ind') || lowerCountry.includes('भारत')) return 'in';
  if (lowerCountry.includes('nep') || lowerCountry.includes('nepal')) return 'in'; // Fallback to India
  if (lowerCountry.includes('usa') || lowerCountry.includes('america') || lowerCountry.includes('states')) return 'us';
  if (lowerCountry.includes('aus') || lowerCountry.includes('australia')) return 'au';
  if (lowerCountry.includes('uk') || lowerCountry.includes('britain') || lowerCountry.includes('england')) return 'gb';
  if (lowerCountry.includes('jap') || lowerCountry.includes('japan')) return 'jp';
  
  // Default to US if no match found
  return 'us';
}

/**
 * Phone validation schema for Zod
 */
export const phoneValidationSchema = (required = true) => {
  return required 
    ? (phone: string) => {
        if (!phone || phone.length < 3) return false;
        return isValidPhone(phone);
      }
    : (phone: string) => {
        if (!phone) return true; // Optional field
        return isValidPhone(phone);
      };
};