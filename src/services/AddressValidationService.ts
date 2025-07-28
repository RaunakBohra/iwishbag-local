/**
 * Address Validation Service
 * 
 * Provides address validation, formatting, and geocoding capabilities
 * to ensure accurate delivery information.
 */

import { logger } from '@/utils/logger';

// ============================================================================
// TYPES
// ============================================================================

export interface AddressValidationResult {
  isValid: boolean;
  issues: AddressIssue[];
  suggestions?: AddressSuggestion[];
  formattedAddress?: FormattedAddress;
}

export interface AddressIssue {
  field: string;
  severity: 'error' | 'warning';
  message: string;
}

export interface AddressSuggestion {
  address: FormattedAddress;
  confidence: number;
}

export interface FormattedAddress {
  recipient_name: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  state_province_region: string;
  postal_code: string;
  country_code: string;
  country_name: string;
  formatted_display: string;
}

export interface CountryAddressFormat {
  code: string;
  name: string;
  postalCodePattern?: RegExp;
  postalCodeFormat?: string;
  stateRequired: boolean;
  stateLabel: string;
  postalCodeLabel: string;
  addressFormat: string[];
}

// ============================================================================
// COUNTRY-SPECIFIC FORMATS
// ============================================================================

const COUNTRY_FORMATS: Record<string, CountryAddressFormat> = {
  US: {
    code: 'US',
    name: 'United States',
    postalCodePattern: /^\d{5}(-\d{4})?$/,
    postalCodeFormat: '12345 or 12345-6789',
    stateRequired: true,
    stateLabel: 'State',
    postalCodeLabel: 'ZIP Code',
    addressFormat: ['address_line1', 'address_line2', 'city', 'state', 'postal_code'],
  },
  IN: {
    code: 'IN',
    name: 'India',
    postalCodePattern: /^\d{6}$/,
    postalCodeFormat: '110001',
    stateRequired: true,
    stateLabel: 'State',
    postalCodeLabel: 'PIN Code',
    addressFormat: ['address_line1', 'address_line2', 'city', 'state', 'postal_code'],
  },
  NP: {
    code: 'NP',
    name: 'Nepal',
    postalCodePattern: /^\d{5}$/,
    postalCodeFormat: '44600',
    stateRequired: true,
    stateLabel: 'Province',
    postalCodeLabel: 'Postal Code',
    addressFormat: ['address_line1', 'address_line2', 'city', 'state', 'postal_code'],
  },
  GB: {
    code: 'GB',
    name: 'United Kingdom',
    postalCodePattern: /^[A-Z]{1,2}\d[A-Z\d]? ?\d[A-Z]{2}$/i,
    postalCodeFormat: 'SW1A 1AA',
    stateRequired: false,
    stateLabel: 'County',
    postalCodeLabel: 'Postcode',
    addressFormat: ['address_line1', 'address_line2', 'city', 'postal_code'],
  },
  CA: {
    code: 'CA',
    name: 'Canada',
    postalCodePattern: /^[A-Z]\d[A-Z] ?\d[A-Z]\d$/i,
    postalCodeFormat: 'K1A 0B1',
    stateRequired: true,
    stateLabel: 'Province',
    postalCodeLabel: 'Postal Code',
    addressFormat: ['address_line1', 'address_line2', 'city', 'state', 'postal_code'],
  },
  AU: {
    code: 'AU',
    name: 'Australia',
    postalCodePattern: /^\d{4}$/,
    postalCodeFormat: '2000',
    stateRequired: true,
    stateLabel: 'State/Territory',
    postalCodeLabel: 'Postcode',
    addressFormat: ['address_line1', 'address_line2', 'city', 'state', 'postal_code'],
  },
};

// ============================================================================
// ADDRESS VALIDATION SERVICE
// ============================================================================

class AddressValidationService {
  private static instance: AddressValidationService;

  private constructor() {}

  public static getInstance(): AddressValidationService {
    if (!AddressValidationService.instance) {
      AddressValidationService.instance = new AddressValidationService();
    }
    return AddressValidationService.instance;
  }

  /**
   * Validate an address based on country-specific rules
   */
  async validateAddress(address: {
    recipient_name: string;
    address_line1: string;
    address_line2?: string;
    city: string;
    state_province_region: string;
    postal_code: string;
    country_code: string;
  }): Promise<AddressValidationResult> {
    const issues: AddressIssue[] = [];
    const countryFormat = COUNTRY_FORMATS[address.country_code] || this.getDefaultFormat();

    // Validate recipient name
    if (!address.recipient_name || address.recipient_name.trim().length < 2) {
      issues.push({
        field: 'recipient_name',
        severity: 'error',
        message: 'Recipient name must be at least 2 characters',
      });
    }

    // Validate address line 1
    if (!address.address_line1 || address.address_line1.trim().length < 5) {
      issues.push({
        field: 'address_line1',
        severity: 'error',
        message: 'Street address must be at least 5 characters',
      });
    }

    // Validate city
    if (!address.city || address.city.trim().length < 2) {
      issues.push({
        field: 'city',
        severity: 'error',
        message: 'City must be at least 2 characters',
      });
    }

    // Validate state/province (if required)
    if (countryFormat.stateRequired && !address.state_province_region) {
      issues.push({
        field: 'state_province_region',
        severity: 'error',
        message: `${countryFormat.stateLabel} is required`,
      });
    }

    // Validate postal code
    if (!address.postal_code) {
      issues.push({
        field: 'postal_code',
        severity: 'error',
        message: `${countryFormat.postalCodeLabel} is required`,
      });
    } else if (countryFormat.postalCodePattern) {
      const cleanPostalCode = address.postal_code.replace(/\s/g, '');
      if (!countryFormat.postalCodePattern.test(cleanPostalCode)) {
        issues.push({
          field: 'postal_code',
          severity: 'error',
          message: `Invalid ${countryFormat.postalCodeLabel} format. Expected: ${countryFormat.postalCodeFormat}`,
        });
      }
    }

    // Check for common issues
    if (this.containsPOBox(address.address_line1)) {
      issues.push({
        field: 'address_line1',
        severity: 'warning',
        message: 'P.O. Box addresses may have delivery restrictions',
      });
    }

    // Format the address
    const formattedAddress = this.formatAddress(address, countryFormat);

    return {
      isValid: issues.filter(i => i.severity === 'error').length === 0,
      issues,
      formattedAddress,
    };
  }

  /**
   * Format address according to country standards
   */
  formatAddress(
    address: {
      recipient_name: string;
      address_line1: string;
      address_line2?: string;
      city: string;
      state_province_region: string;
      postal_code: string;
      country_code: string;
    },
    format?: CountryAddressFormat
  ): FormattedAddress {
    const countryFormat = format || COUNTRY_FORMATS[address.country_code] || this.getDefaultFormat();
    
    // Clean and format postal code
    let formattedPostalCode = address.postal_code.trim().toUpperCase();
    if (address.country_code === 'GB') {
      // UK postcodes should have a space
      formattedPostalCode = formattedPostalCode.replace(/^([A-Z]{1,2}\d[A-Z\d]?)(\d[A-Z]{2})$/i, '$1 $2');
    } else if (address.country_code === 'CA') {
      // Canadian postcodes should have a space
      formattedPostalCode = formattedPostalCode.replace(/^([A-Z]\d[A-Z])(\d[A-Z]\d)$/i, '$1 $2');
    }

    // Build display address
    const addressParts: string[] = [
      address.recipient_name,
      address.address_line1,
    ];

    if (address.address_line2) {
      addressParts.push(address.address_line2);
    }

    // City, State, Postal Code line
    let cityStateLine = address.city;
    if (countryFormat.stateRequired && address.state_province_region) {
      cityStateLine += `, ${address.state_province_region}`;
    }
    cityStateLine += ` ${formattedPostalCode}`;
    addressParts.push(cityStateLine);

    addressParts.push(countryFormat.name);

    return {
      recipient_name: address.recipient_name.trim(),
      address_line1: address.address_line1.trim(),
      address_line2: address.address_line2?.trim(),
      city: address.city.trim(),
      state_province_region: address.state_province_region.trim(),
      postal_code: formattedPostalCode,
      country_code: address.country_code,
      country_name: countryFormat.name,
      formatted_display: addressParts.filter(Boolean).join('\n'),
    };
  }

  /**
   * Get country-specific address format
   */
  getCountryFormat(countryCode: string): CountryAddressFormat {
    return COUNTRY_FORMATS[countryCode] || this.getDefaultFormat();
  }

  /**
   * Get list of supported countries
   */
  getSupportedCountries(): CountryAddressFormat[] {
    return Object.values(COUNTRY_FORMATS);
  }

  /**
   * Check if address contains a P.O. Box
   */
  private containsPOBox(address: string): boolean {
    const poBoxPattern = /\b(p\.?\s*o\.?\s*box|post\s*office\s*box)\b/i;
    return poBoxPattern.test(address);
  }

  /**
   * Get default address format
   */
  private getDefaultFormat(): CountryAddressFormat {
    return {
      code: 'DEFAULT',
      name: 'Other',
      stateRequired: false,
      stateLabel: 'State/Province',
      postalCodeLabel: 'Postal Code',
      addressFormat: ['address_line1', 'address_line2', 'city', 'postal_code'],
    };
  }

  /**
   * Validate phone number format
   */
  validatePhoneNumber(phone: string, countryCode: string): {
    isValid: boolean;
    formatted?: string;
    issue?: string;
  } {
    // Remove all non-digit characters except + at the beginning
    const cleaned = phone.replace(/[^\d+]/g, '');
    
    // Basic validation - must have at least 10 digits
    const digitCount = cleaned.replace(/\D/g, '').length;
    if (digitCount < 10) {
      return {
        isValid: false,
        issue: 'Phone number must have at least 10 digits',
      };
    }

    // Country-specific validation
    switch (countryCode) {
      case 'US':
      case 'CA':
        // North American numbering plan
        if (digitCount === 10 || (digitCount === 11 && cleaned.startsWith('1'))) {
          const formatted = this.formatNAPhoneNumber(cleaned);
          return { isValid: true, formatted };
        }
        return {
          isValid: false,
          issue: 'US/Canada phone numbers should be 10 digits',
        };

      case 'IN':
        // Indian mobile numbers
        if (digitCount === 10 || (digitCount === 12 && cleaned.startsWith('91'))) {
          return { isValid: true, formatted: cleaned };
        }
        return {
          isValid: false,
          issue: 'Indian phone numbers should be 10 digits',
        };

      case 'NP':
        // Nepal mobile numbers
        if (digitCount === 10 || (digitCount === 13 && cleaned.startsWith('977'))) {
          return { isValid: true, formatted: cleaned };
        }
        return {
          isValid: false,
          issue: 'Nepal phone numbers should be 10 digits',
        };

      default:
        // Basic international format validation
        if (digitCount >= 10 && digitCount <= 15) {
          return { isValid: true, formatted: cleaned };
        }
        return {
          isValid: false,
          issue: 'Invalid phone number format',
        };
    }
  }

  /**
   * Format North American phone number
   */
  private formatNAPhoneNumber(phone: string): string {
    const digits = phone.replace(/\D/g, '');
    if (digits.length === 10) {
      return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
    } else if (digits.length === 11 && digits[0] === '1') {
      return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
    }
    return phone;
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const addressValidationService = AddressValidationService.getInstance();
export default addressValidationService;