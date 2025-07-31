/**
 * International Address Validator Service
 * Provides country-specific validation for postal codes, phone numbers, and address formats
 */

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  formatted?: string;
}

export class InternationalAddressValidator {
  // Postal code patterns by country
  private static POSTAL_CODE_PATTERNS: Record<string, RegExp> = {
    // North America
    US: /^\d{5}(-\d{4})?$/,              // 12345 or 12345-6789
    CA: /^[A-Z]\d[A-Z]\s?\d[A-Z]\d$/i,  // A1A 1A1
    MX: /^\d{5}$/,                       // 12345
    
    // Europe
    UK: /^[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}$/i,  // SW1A 1AA
    GB: /^[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}$/i,  // Same as UK
    DE: /^\d{5}$/,                       // 12345
    FR: /^\d{5}$/,                       // 75001
    IT: /^\d{5}$/,                       // 00100
    ES: /^\d{5}$/,                       // 28001
    NL: /^\d{4}\s?[A-Z]{2}$/i,          // 1234 AB
    BE: /^\d{4}$/,                       // 1000
    CH: /^\d{4}$/,                       // 8000
    AT: /^\d{4}$/,                       // 1010
    
    // Asia
    IN: /^\d{6}$/,                       // 110001
    NP: /^\d{5}$/,                       // 44600
    JP: /^\d{3}-?\d{4}$/,                // 100-0001
    CN: /^\d{6}$/,                       // 100000
    KR: /^\d{5}$/,                       // 03187
    SG: /^\d{6}$/,                       // 179098
    MY: /^\d{5}$/,                       // 50450
    TH: /^\d{5}$/,                       // 10110
    ID: /^\d{5}$/,                       // 12345
    PH: /^\d{4}$/,                       // 1000
    VN: /^\d{6}$/,                       // 100000
    
    // Oceania
    AU: /^\d{4}$/,                       // 2000
    NZ: /^\d{4}$/,                       // 1010
    
    // South America
    BR: /^\d{5}-?\d{3}$/,                // 01310-100
    AR: /^[A-Z]?\d{4}[A-Z]{0,3}$/,      // C1425 or 1425
    CL: /^\d{7}$/,                       // 8320000
    CO: /^\d{6}$/,                       // 110111
    PE: /^\d{5}$/,                       // 15001
    
    // Middle East
    AE: /^$/,                            // No postal codes in UAE
    SA: /^\d{5}$/,                       // 11564
    IL: /^\d{5,7}$/,                     // 12345 or 1234567
    
    // Africa
    ZA: /^\d{4}$/,                       // 0001
    EG: /^\d{5}$/,                       // 11511
    NG: /^\d{6}$/,                       // 100001
    KE: /^\d{5}$/,                       // 00100
  };

  // Country-specific field labels
  private static FIELD_LABELS: Record<string, Record<string, string>> = {
    US: { state: 'State', postal: 'ZIP Code', city: 'City' },
    CA: { state: 'Province', postal: 'Postal Code', city: 'City' },
    UK: { state: 'County', postal: 'Postcode', city: 'City' },
    GB: { state: 'County', postal: 'Postcode', city: 'City' },
    AU: { state: 'State/Territory', postal: 'Postcode', city: 'City' },
    JP: { state: 'Prefecture', postal: 'Postal Code', city: 'City' },
    IN: { state: 'State', postal: 'PIN Code', city: 'City' },
    NP: { state: 'Province', postal: 'Postal Code', city: 'District' },
    DE: { state: 'State', postal: 'Postcode', city: 'City' },
    FR: { state: 'Region', postal: 'Code Postal', city: 'City' },
    // Default
    default: { state: 'State/Province', postal: 'Postal Code', city: 'City', address: 'Address' }
  };

  // Phone number patterns (simplified - in production use libphonenumber)
  private static PHONE_PATTERNS: Record<string, RegExp> = {
    US: /^\+?1?\s?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}$/,
    UK: /^\+?44\s?7\d{3}\s?\d{6}$/,
    IN: /^\+?91\s?\d{10}$/,
    NP: /^\+?977\s?\d{9,10}$/,
    // Add more as needed
  };

  // Countries where postal codes are optional (not commonly used or enforced)
  private static POSTAL_CODE_OPTIONAL_COUNTRIES = [
    'NP', // Nepal - postal codes exist but not commonly used
    'AE', // UAE - no postal codes
    'SA', // Saudi Arabia - optional in many areas
    'OM', // Oman - not widely used
    'BH', // Bahrain - optional
    'QA', // Qatar - optional
    'KW', // Kuwait - optional
    'LB', // Lebanon - not always required
    'JO', // Jordan - optional in rural areas
    'IQ', // Iraq - not widely implemented
    'AF', // Afghanistan - limited postal system
    'BD', // Bangladesh - not always required
    'MM', // Myanmar - limited system
    'KH', // Cambodia - not widely used
    'LA', // Laos - limited system
    'MN', // Mongolia - optional outside cities
    'BT', // Bhutan - optional
    'MV', // Maldives - not required
  ];

  /**
   * Check if postal code is required for a country
   */
  static isPostalCodeRequired(countryCode: string): boolean {
    return !this.POSTAL_CODE_OPTIONAL_COUNTRIES.includes(countryCode.toUpperCase());
  }

  /**
   * Validate postal code based on country
   */
  static validatePostalCode(postalCode: string, countryCode: string): ValidationResult {
    if (!countryCode) {
      return { isValid: false, error: 'Country is required' };
    }

    const isRequired = this.isPostalCodeRequired(countryCode);
    
    // If postal code is not provided
    if (!postalCode || postalCode.trim() === '') {
      if (isRequired) {
        return { isValid: false, error: 'Postal code is required for this country' };
      } else {
        return { isValid: true }; // Optional for this country
      }
    }

    // If postal code IS provided, validate the format regardless of whether it's required
    const pattern = this.POSTAL_CODE_PATTERNS[countryCode.toUpperCase()];
    
    // If no pattern exists for the country, accept any non-empty value
    if (!pattern) {
      return { isValid: postalCode.trim().length > 0 };
    }

    // Special case for UAE (no postal codes) - if someone enters something, it's invalid
    if (countryCode.toUpperCase() === 'AE') {
      return { 
        isValid: false, 
        error: 'Postal codes are not used in UAE' 
      };
    }

    const isValid = pattern.test(postalCode.trim());
    
    if (!isValid) {
      return { 
        isValid: false, 
        error: `Invalid postal code format. Expected format: ${this.getPostalCodeExample(countryCode)}` 
      };
    }

    return { isValid: true };
  }

  /**
   * Format postal code based on country conventions
   */
  static formatPostalCode(postalCode: string, countryCode: string): string {
    if (!postalCode) return '';
    
    const trimmed = postalCode.trim().toUpperCase();
    
    switch (countryCode.toUpperCase()) {
      case 'CA':
        // Canadian postal codes: A1A 1A1
        if (trimmed.length === 6) {
          return `${trimmed.slice(0, 3)} ${trimmed.slice(3)}`;
        }
        break;
      case 'UK':
      case 'GB':
        // UK postcodes: SW1A 1AA
        if (trimmed.length >= 5) {
          const inward = trimmed.slice(-3);
          const outward = trimmed.slice(0, -3);
          return `${outward} ${inward}`;
        }
        break;
      case 'BR':
        // Brazilian CEP: 01310-100
        if (trimmed.length === 8) {
          return `${trimmed.slice(0, 5)}-${trimmed.slice(5)}`;
        }
        break;
      case 'JP':
        // Japanese postal codes: 100-0001
        if (trimmed.length === 7) {
          return `${trimmed.slice(0, 3)}-${trimmed.slice(3)}`;
        }
        break;
    }
    
    return postalCode;
  }

  /**
   * Get field labels based on country
   */
  static getFieldLabels(countryCode: string): { state: string; postal: string; city: string; address: string } {
    const labels = this.FIELD_LABELS[countryCode.toUpperCase()] || this.FIELD_LABELS.default;
    return {
      state: labels.state || 'State/Province',
      postal: labels.postal || 'Postal Code',
      city: labels.city || 'City',
      address: labels.address || 'Address'
    };
  }

  /**
   * Check if state/province is required for a country
   */
  static isStateRequired(countryCode: string): boolean {
    // Most countries require state/province except some small countries
    const noStateRequired = ['SG', 'HK', 'MO', 'MT', 'LU', 'MC', 'VA', 'SM', 'LI'];
    return !noStateRequired.includes(countryCode.toUpperCase());
  }

  /**
   * Validate phone number (basic validation)
   */
  static validatePhoneNumber(phone: string, countryCode: string): ValidationResult {
    if (!phone) {
      return { isValid: false, error: 'Phone number is required' };
    }

    // Remove common formatting characters
    const cleaned = phone.replace(/[\s\-\(\)\.]/g, '');
    
    // Basic validation: must have at least 7 digits
    if (cleaned.length < 7) {
      return { isValid: false, error: 'Phone number too short' };
    }

    // Check country-specific pattern if available
    const pattern = this.PHONE_PATTERNS[countryCode.toUpperCase()];
    if (pattern && !pattern.test(phone)) {
      return { 
        isValid: false, 
        error: `Invalid phone format for ${countryCode}` 
      };
    }

    return { isValid: true };
  }

  /**
   * Get example postal code for a country
   */
  static getPostalCodeExample(countryCode: string): string {
    const examples: Record<string, string> = {
      US: '12345',
      CA: 'A1A 1A1',
      UK: 'SW1A 1AA',
      GB: 'SW1A 1AA',
      DE: '10115',
      FR: '75001',
      IN: '110001',
      NP: '44600',
      JP: '100-0001',
      AU: '2000',
      BR: '01310-100',
      // Add more examples
    };
    
    return examples[countryCode.toUpperCase()] || '12345';
  }
}