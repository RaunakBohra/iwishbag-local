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
 * Check if digits contain a country code and remove it
 */
export function sanitizePhoneDigits(digits: string, countryCode: string): string {
  if (!digits || !countryCode) return digits;
  
  try {
    const callingCode = getCountryCallingCode(countryCode as CountryCode).toString();
    
    // If digits start with the country calling code, remove it
    if (digits.startsWith(callingCode)) {
      const withoutCountryCode = digits.substring(callingCode.length);
      // Only return if the remaining digits look reasonable (not too short)
      if (withoutCountryCode.length >= 7) { // Most countries have at least 7 digit national numbers
        return withoutCountryCode;
      }
    }
  } catch {
    // Ignore errors and return original digits
  }
  
  return digits;
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
export function parsePhoneInput(phoneInput: string, knownCountry?: string): {
  countryCode: string | null;
  digits: string;
  isValid: boolean;
} {
  if (!phoneInput) {
    return {
      countryCode: knownCountry || null,
      digits: '',
      isValid: false
    };
  }

  try {
    // First try to parse with libphonenumber-js
    const parsed = parsePhoneNumber(phoneInput);
    if (parsed && parsed.country) {
      return {
        countryCode: parsed.country,
        digits: parsed.nationalNumber,
        isValid: parsed.isValid()
      };
    }
  } catch {
    // Fall through to manual parsing
  }

  // If we have a known country, try parsing with that context
  if (knownCountry) {
    try {
      const parsed = parsePhoneNumber(phoneInput, knownCountry as CountryCode);
      if (parsed) {
        return {
          countryCode: knownCountry,
          digits: parsed.nationalNumber,
          isValid: parsed.isValid()
        };
      }
    } catch {
      // Fall through to digit extraction
    }

    // Manual extraction: remove the known country's dial code
    const dialCode = getDialCode(knownCountry);
    let cleanInput = phoneInput;
    
    // Remove dial code if present at the start
    if (cleanInput.startsWith(dialCode)) {
      cleanInput = cleanInput.substring(dialCode.length).trim();
    }
    
    let digits = extractPhoneDigits(cleanInput);
    // Sanitize to ensure no country code leaked in
    digits = sanitizePhoneDigits(digits, knownCountry);
    
    return {
      countryCode: knownCountry,
      digits,
      isValid: false
    };
  }
  
  // Fallback: extract all digits but don't assume country
  const digits = extractPhoneDigits(phoneInput);
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
 * Get expected phone number length for country
 */
function getExpectedPhoneLength(countryCode: string): { min: number; max: number } {
  // Country-specific phone number lengths (national number without country code)
  const lengths: Record<string, { min: number; max: number }> = {
    US: { min: 10, max: 10 },
    CA: { min: 10, max: 10 },
    GB: { min: 10, max: 11 },
    IN: { min: 10, max: 10 },
    AU: { min: 9, max: 9 },
    NZ: { min: 8, max: 9 },
    DE: { min: 10, max: 12 },
    FR: { min: 10, max: 10 },
    IT: { min: 10, max: 11 },
    ES: { min: 9, max: 9 },
    JP: { min: 10, max: 11 },
    CN: { min: 11, max: 11 },
    KR: { min: 10, max: 11 },
    SG: { min: 8, max: 8 },
    MY: { min: 9, max: 10 },
    TH: { min: 9, max: 9 },
    ID: { min: 10, max: 12 },
    PH: { min: 10, max: 10 },
    VN: { min: 9, max: 10 },
    BD: { min: 10, max: 10 },
    LK: { min: 9, max: 9 },
    PK: { min: 10, max: 11 },
    AE: { min: 9, max: 9 },
    SA: { min: 9, max: 9 },
    BR: { min: 10, max: 11 },
    MX: { min: 10, max: 10 },
    AR: { min: 10, max: 10 },
    CL: { min: 9, max: 9 },
    CO: { min: 10, max: 10 },
    PE: { min: 9, max: 9 },
    ZA: { min: 9, max: 9 },
    NG: { min: 10, max: 11 },
    EG: { min: 10, max: 11 },
    KE: { min: 9, max: 9 },
    IL: { min: 9, max: 9 },
    TR: { min: 10, max: 10 },
    RU: { min: 10, max: 10 },
    UA: { min: 9, max: 9 },
    PL: { min: 9, max: 9 },
    NL: { min: 9, max: 9 },
    BE: { min: 9, max: 9 },
    CH: { min: 9, max: 9 },
    AT: { min: 10, max: 11 },
    SE: { min: 9, max: 9 },
    NO: { min: 8, max: 8 },
    DK: { min: 8, max: 8 },
    FI: { min: 9, max: 10 },
    PT: { min: 9, max: 9 },
    GR: { min: 10, max: 10 },
    CZ: { min: 9, max: 9 },
    HU: { min: 9, max: 9 },
    RO: { min: 9, max: 9 },
    BG: { min: 8, max: 9 },
    HR: { min: 8, max: 9 },
    RS: { min: 8, max: 9 },
    SK: { min: 9, max: 9 },
    SI: { min: 8, max: 8 },
    LT: { min: 8, max: 8 },
    LV: { min: 8, max: 8 },
    EE: { min: 7, max: 8 },
    IS: { min: 7, max: 7 },
    IE: { min: 9, max: 9 },
    LU: { min: 9, max: 9 },
    MT: { min: 8, max: 8 },
    CY: { min: 8, max: 8 },
    NP: { min: 10, max: 10 }, // Nepal: 10 digits
  };
  
  return lengths[countryCode] || { min: 7, max: 15 }; // Default fallback
}

/**
 * Validate phone number for specific country with progressive validation
 */
export function validatePhoneForCountry(digits: string, countryCode: string): {
  isValid: boolean;
  error?: string;
} {
  if (!digits) {
    return { isValid: false, error: 'Phone number is required' };
  }
  
  const expectedLength = getExpectedPhoneLength(countryCode);
  const currentLength = digits.length;
  
  // Progressive validation based on length
  if (currentLength < expectedLength.min) {
    // Number is too short - don't show error while typing
    return { isValid: false }; // Clean, no distracting messages
  }
  
  if (currentLength > expectedLength.max) {
    return { 
      isValid: false, 
      error: `Phone number is too long for ${countryCode}` 
    };
  }
  
  // Use libphonenumber for final validation
  try {
    const fullNumber = createCompletePhoneNumber(countryCode, digits);
    const parsed = parsePhoneNumber(fullNumber);
    
    if (!parsed) {
      return { isValid: false, error: 'Invalid phone number format' };
    }
    
    if (!parsed.isValid()) {
      // Check if it's just incomplete vs actually invalid
      if (currentLength === expectedLength.min || currentLength === expectedLength.max) {
        return { 
          isValid: false, 
          error: `Please enter a valid phone number for ${countryCode}` 
        };
      } else {
        // Still being typed, don't show harsh error
        return { isValid: false };
      }
    }
    
    if (parsed.country !== countryCode) {
      return { 
        isValid: false, 
        error: `Phone number doesn't match selected country` 
      };
    }
    
    return { isValid: true };
  } catch (error) {
    // If libphonenumber fails but length is correct, might still be valid
    if (currentLength >= expectedLength.min && currentLength <= expectedLength.max) {
      return { isValid: false }; // Don't show error, might still be typing
    }
    
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