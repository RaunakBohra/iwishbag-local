import { ShippingAddress, AddressValidationResult, addressValidationSchema } from '@/types/address';

/**
 * Validates a shipping address according to the defined schema
 */
export function validateAddress(address: ShippingAddress): AddressValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate fullName
  if (!address.fullName?.trim()) {
    errors.push('Full name is required');
  } else if (address.fullName.length < addressValidationSchema.fullName.minLength) {
    errors.push(
      `Full name must be at least ${addressValidationSchema.fullName.minLength} characters`,
    );
  } else if (address.fullName.length > addressValidationSchema.fullName.maxLength) {
    errors.push(
      `Full name must be no more than ${addressValidationSchema.fullName.maxLength} characters`,
    );
  }

  // Validate streetAddress
  if (!address.streetAddress?.trim()) {
    errors.push('Street address is required');
  } else if (address.streetAddress.length < addressValidationSchema.streetAddress.minLength) {
    errors.push(
      `Street address must be at least ${addressValidationSchema.streetAddress.minLength} characters`,
    );
  } else if (address.streetAddress.length > addressValidationSchema.streetAddress.maxLength) {
    errors.push(
      `Street address must be no more than ${addressValidationSchema.streetAddress.maxLength} characters`,
    );
  }

  // Validate city
  if (!address.city?.trim()) {
    errors.push('City is required');
  } else if (address.city.length < addressValidationSchema.city.minLength) {
    errors.push(`City must be at least ${addressValidationSchema.city.minLength} characters`);
  } else if (address.city.length > addressValidationSchema.city.maxLength) {
    errors.push(`City must be no more than ${addressValidationSchema.city.maxLength} characters`);
  }

  // Validate state (optional)
  if (address.state && address.state.length > addressValidationSchema.state.maxLength) {
    errors.push(`State must be no more than ${addressValidationSchema.state.maxLength} characters`);
  }

  // Validate postalCode
  if (!address.postalCode?.trim()) {
    errors.push('Postal code is required');
  } else if (address.postalCode.length < addressValidationSchema.postalCode.minLength) {
    errors.push(
      `Postal code must be at least ${addressValidationSchema.postalCode.minLength} characters`,
    );
  } else if (address.postalCode.length > addressValidationSchema.postalCode.maxLength) {
    errors.push(
      `Postal code must be no more than ${addressValidationSchema.postalCode.maxLength} characters`,
    );
  }

  // Validate country
  if (!address.country?.trim()) {
    errors.push('Country is required');
  } else if (address.country.length !== 2) {
    errors.push('Country must be a 2-letter country code (e.g., US, CA, UK)');
  } else if (!/^[A-Z]{2}$/.test(address.country)) {
    errors.push('Country must be a valid 2-letter uppercase country code');
  }

  // Validate phone (optional)
  if (address.phone) {
    if (!addressValidationSchema.phone.pattern.test(address.phone)) {
      errors.push('Phone number must be a valid international format');
    }
  }

  // Validate email (optional)
  if (address.email) {
    if (!addressValidationSchema.email.pattern.test(address.email)) {
      errors.push('Email must be a valid email address');
    }
  }

  // Additional warnings
  if (address.streetAddress && !address.streetAddress.includes(' ')) {
    warnings.push('Street address should include street number and name');
  }

  if (address.postalCode && !/^\d+/.test(address.postalCode)) {
    warnings.push('Postal code should start with numbers');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validates if a country change is allowed based on user role
 */
export function validateCountryChange(
  oldCountry: string,
  newCountry: string,
  userRole: string,
): { allowed: boolean; reason?: string } {
  // No change
  if (oldCountry === newCountry) {
    return { allowed: true };
  }

  // Only admins can change country
  if (userRole !== 'admin') {
    return {
      allowed: false,
      reason:
        'Only administrators can change the shipping country as it affects shipping costs and delivery times',
    };
  }

  // Validate new country format
  if (!/^[A-Z]{2}$/.test(newCountry)) {
    return {
      allowed: false,
      reason: 'Invalid country code format',
    };
  }

  return { allowed: true };
}

/**
 * Formats an address for display
 */
export function formatAddress(address: ShippingAddress): string {
  const parts = [
    address.fullName,
    address.streetAddress,
    address.city,
    address.state,
    address.postalCode,
    address.country,
  ].filter(Boolean);

  return parts.join(', ');
}

/**
 * Normalizes an address for consistent storage
 */
export function normalizeAddress(address: ShippingAddress): ShippingAddress {
  return {
    fullName: address.fullName?.trim() || '',
    streetAddress: address.streetAddress?.trim() || '',
    city: address.city?.trim() || '',
    state: address.state?.trim() || undefined,
    postalCode: address.postalCode?.trim() || '',
    country: address.country?.trim().toUpperCase() || '',
    phone: address.phone?.trim() || undefined,
    email: address.email?.trim() || undefined,
  };
}

/**
 * Compares two addresses and returns the differences
 */
export function compareAddresses(
  oldAddress: ShippingAddress,
  newAddress: ShippingAddress,
): { field: keyof ShippingAddress; oldValue: string; newValue: string }[] {
  const changes: {
    field: keyof ShippingAddress;
    oldValue: string;
    newValue: string;
  }[] = [];

  const fields: (keyof ShippingAddress)[] = [
    'fullName',
    'streetAddress',
    'city',
    'state',
    'postalCode',
    'country',
    'phone',
    'email',
  ];

  fields.forEach((field) => {
    const oldValue = oldAddress[field] || '';
    const newValue = newAddress[field] || '';

    if (oldValue !== newValue) {
      changes.push({
        field,
        oldValue,
        newValue,
      });
    }
  });

  return changes;
}

/**
 * Checks if an address is complete (has all required fields)
 */
export function isAddressComplete(address: ShippingAddress): boolean {
  const requiredFields: (keyof ShippingAddress)[] = [
    'fullName',
    'streetAddress',
    'city',
    'postalCode',
    'country',
  ];

  return requiredFields.every((field) => {
    const value = address[field];
    return value && typeof value === 'string' && value.trim().length > 0;
  });
}

/**
 * Generates a human-readable summary of address changes
 */
export function getAddressChangeSummary(
  changes: {
    field: keyof ShippingAddress;
    oldValue: string;
    newValue: string;
  }[],
): string {
  if (changes.length === 0) return 'No changes detected';

  const fieldLabels: Record<keyof ShippingAddress, string> = {
    fullName: 'Full Name',
    streetAddress: 'Street Address',
    city: 'City',
    state: 'State/Province',
    postalCode: 'Postal Code',
    country: 'Country',
    phone: 'Phone',
    email: 'Email',
  };

  const summaries = changes.map((change) => {
    const fieldLabel = fieldLabels[change.field];
    if (change.oldValue && change.newValue) {
      return `${fieldLabel}: "${change.oldValue}" → "${change.newValue}"`;
    } else if (change.newValue) {
      return `${fieldLabel}: Added "${change.newValue}"`;
    } else {
      return `${fieldLabel}: Removed "${change.oldValue}"`;
    }
  });

  return summaries.join(', ');
}
