import { parsePhoneNumber, formatIncompletePhoneNumber, getCountryCallingCode, CountryCode } from 'libphonenumber-js';

/**
 * Phone formatting utilities for world-class phone input UX
 */

// Common phone number patterns for different countries
const phonePatterns: Record<string, string> = {
  US: '(###) ###-####',
  CA: '(###) ###-####',
  GB: '##### ######',
  IN: '##### #####',
  AU: '#### ### ###',
  NZ: '### ### ####',
  DE: '### #######',
  FR: '## ## ## ## ##',
  IT: '### ### ####',
  ES: '### ### ###',
  JP: '###-####-####',
  CN: '### #### ####',
  KR: '###-####-####',
  SG: '#### ####',
  MY: '###-### ####',
  TH: '###-###-####',
  ID: '####-####-####',
  PH: '#### ### ####',
  VN: '### ### ####',
  BD: '####-######',
  LK: '### ### ####',
  PK: '####-#######',
  AE: '### ### ####',
  SA: '### ### ####',
  BR: '(##) #####-####',
  MX: '### ### ####',
  AR: '### ### ####',
  CL: '# #### ####',
  CO: '### ### ####',
  PE: '### ### ###',
  ZA: '### ### ####',
  NG: '### ### ####',
  EG: '### ### ####',
  KE: '### ######',
  IL: '###-###-####',
  TR: '### ### ## ##',
  RU: '### ###-##-##',
  UA: '### ### ## ##',
  PL: '### ### ###',
  NL: '## ### ####',
  BE: '### ## ## ##',
  CH: '### ### ## ##',
  AT: '### ######',
  SE: '###-### ## ##',
  NO: '### ## ###',
  DK: '## ## ## ##',
  FI: '### ### ####',
  PT: '### ### ###',
  GR: '### ### ####',
  CZ: '### ### ###',
  HU: '### ### ###',
  RO: '### ### ###',
  BG: '### ### ###',
  HR: '### ### ###',
  RS: '### ### ###',
  SK: '### ### ###',
  SI: '### ### ###',
  LT: '### #####',
  LV: '### #####',
  EE: '### ####',
  IS: '### ####',
  IE: '### ### ####',
  LU: '### ###',
  MT: '#### ####',
  CY: '### #####',
  NP: '###-#######'
};

/**
 * Get dial code for a country
 */
export function getDialCode(countryCode: string): string {
  try {
    return `+${getCountryCallingCode(countryCode as CountryCode)}`;
  } catch {
    return '+1'; // fallback to US
  }
}

/**
 * Extract just the digits from a phone number
 */
export function extractPhoneDigits(phone: string): string {
  return phone.replace(/\D/g, '');
}

/**
 * Format phone number for display (without country code)
 */
export function formatPhoneNumber(digits: string, countryCode: string): string {
  if (!digits) return '';
  
  const pattern = phonePatterns[countryCode];
  if (!pattern) {
    // Fallback: use libphonenumber-js formatting
    try {
      const formatted = formatIncompletePhoneNumber(digits, countryCode as CountryCode);
      return formatted.replace(getDialCode(countryCode), '').trim();
    } catch {
      return digits;
    }
  }
  
  // Apply custom pattern
  let formatted = '';
  let digitIndex = 0;
  
  for (let i = 0; i < pattern.length && digitIndex < digits.length; i++) {
    const char = pattern[i];
    if (char === '#') {
      formatted += digits[digitIndex];
      digitIndex++;
    } else {
      formatted += char;
    }
  }
  
  // Add remaining digits if any
  if (digitIndex < digits.length) {
    formatted += digits.slice(digitIndex);
  }
  
  return formatted;
}

/**
 * Parse phone number and extract country and digits
 */
export function parsePhoneInput(phoneInput: string): {
  countryCode: string | null;
  digits: string;
  isValid: boolean;
} {
  const digits = extractPhoneDigits(phoneInput);
  
  try {
    const parsed = parsePhoneNumber(phoneInput);
    if (parsed) {
      return {
        countryCode: parsed.country || null,
        digits: parsed.nationalNumber,
        isValid: parsed.isValid()
      };
    }
  } catch {
    // Fall through to basic parsing
  }
  
  return {
    countryCode: null,
    digits,
    isValid: false
  };
}

/**
 * Create a complete phone number from country and digits
 */
export function createCompletePhoneNumber(countryCode: string, digits: string): string {
  if (!digits) return '';
  
  const dialCode = getDialCode(countryCode);
  return `${dialCode} ${digits}`;
}

/**
 * Validate phone number for specific country
 */
export function validatePhoneForCountry(digits: string, countryCode: string): {
  isValid: boolean;
  error?: string;
} {
  if (!digits) {
    return { isValid: false, error: 'Phone number is required' };
  }
  
  try {
    const fullNumber = createCompletePhoneNumber(countryCode, digits);
    const parsed = parsePhoneNumber(fullNumber);
    
    if (!parsed) {
      return { isValid: false, error: 'Invalid phone number format' };
    }
    
    if (!parsed.isValid()) {
      return { 
        isValid: false, 
        error: `Please enter a valid phone number for ${countryCode}` 
      };
    }
    
    if (parsed.country !== countryCode) {
      return { 
        isValid: false, 
        error: `Phone number doesn't match selected country` 
      };
    }
    
    return { isValid: true };
  } catch (error) {
    return { 
      isValid: false, 
      error: 'Invalid phone number format' 
    };
  }
}

/**
 * Get phone number placeholder for country
 */
export function getPhonePlaceholder(countryCode: string): string {
  const pattern = phonePatterns[countryCode];
  if (pattern) {
    return pattern.replace(/#/g, '0');
  }
  
  // Country-specific placeholders
  const placeholders: Record<string, string> = {
    US: '(555) 123-4567',
    CA: '(555) 123-4567',
    GB: '07123 456789',
    IN: '98765 43210',
    AU: '0412 345 678',
    NZ: '021 123 4567',
    DE: '030 12345678',
    FR: '01 23 45 67 89',
    IT: '320 123 4567',
    ES: '612 345 678',
    JP: '090-1234-5678',
    CN: '138 0013 8000',
    NP: '984-1234567'
  };
  
  return placeholders[countryCode] || 'Enter phone number';
}

/**
 * Check if phone number is complete for the country
 */
export function isPhoneComplete(digits: string, countryCode: string): boolean {
  if (!digits) return false;
  
  try {
    const fullNumber = createCompletePhoneNumber(countryCode, digits);
    const parsed = parsePhoneNumber(fullNumber);
    return parsed ? parsed.isValid() : false;
  } catch {
    return false;
  }
}