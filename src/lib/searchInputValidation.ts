/**
 * Search Input Validation and Sanitization
 *
 * Provides security utilities for validating and sanitizing search inputs
 * to prevent injection attacks and malicious input.
 */

export interface ValidationResult {
  isValid: boolean;
  sanitizedValue: string;
  errors: string[];
}

/**
 * Maximum lengths for search inputs
 */
export const SEARCH_INPUT_LIMITS = {
  SEARCH_TEXT_MAX_LENGTH: 255,
  STATUS_MAX_COUNT: 20,
  COUNTRY_MAX_COUNT: 50,
} as const;

/**
 * Characters allowed in search text (alphanumeric + basic punctuation)
 */
const ALLOWED_SEARCH_CHARS = /^[a-zA-Z0-9\s\-_@.#()[\]{},'":;!?&+*/=<>~`|\\^$%]*$/;

/**
 * Patterns that could indicate injection attempts
 */
const SUSPICIOUS_PATTERNS = [
  /(\bOR\b|\bAND\b|\bUNION\b|\bSELECT\b|\bINSERT\b|\bUPDATE\b|\bDELETE\b|\bDROP\b)/i,
  /[<>]/g, // HTML/XML tags
  /javascript:/i,
  /vbscript:/i,
  /onload=/i,
  /onerror=/i,
];

/**
 * Validates and sanitizes search text input
 */
export function validateSearchText(input: string): ValidationResult {
  const errors: string[] = [];
  let sanitizedValue = input;

  // Check for null/undefined
  if (!input) {
    return {
      isValid: true,
      sanitizedValue: '',
      errors: [],
    };
  }

  // Trim whitespace
  sanitizedValue = input.trim();

  // Length validation
  if (sanitizedValue.length > SEARCH_INPUT_LIMITS.SEARCH_TEXT_MAX_LENGTH) {
    errors.push(
      `Search text must be ${SEARCH_INPUT_LIMITS.SEARCH_TEXT_MAX_LENGTH} characters or less`,
    );
  }

  // Character allowlist validation
  if (!ALLOWED_SEARCH_CHARS.test(sanitizedValue)) {
    errors.push('Search text contains invalid characters');
  }

  // Check for suspicious patterns that could indicate injection attempts
  for (const pattern of SUSPICIOUS_PATTERNS) {
    if (pattern.test(sanitizedValue)) {
      errors.push('Search text contains potentially unsafe content');
      break;
    }
  }

  // Additional sanitization: remove potentially dangerous sequences
  sanitizedValue = sanitizedValue
    .replace(/[<>]/g, '') // Remove angle brackets
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/vbscript:/gi, '') // Remove vbscript: protocol
    .replace(/on\w+=/gi, ''); // Remove event handlers

  return {
    isValid: errors.length === 0,
    sanitizedValue,
    errors,
  };
}

/**
 * Validates status filter array
 */
export function validateStatusFilters(statuses: string[]): ValidationResult {
  const errors: string[] = [];

  if (!Array.isArray(statuses)) {
    return {
      isValid: false,
      sanitizedValue: '',
      errors: ['Status filters must be an array'],
    };
  }

  if (statuses.length > SEARCH_INPUT_LIMITS.STATUS_MAX_COUNT) {
    errors.push(`Too many status filters (max ${SEARCH_INPUT_LIMITS.STATUS_MAX_COUNT})`);
  }

  // Validate each status
  const validStatuses = [
    'pending',
    'sent',
    'approved',
    'rejected',
    'paid',
    'shipped',
    'completed',
    'expired',
    'cancelled',
  ];
  const sanitizedStatuses = statuses.filter((status) => {
    if (typeof status !== 'string') return false;
    if (!validStatuses.includes(status.toLowerCase())) return false;
    return true;
  });

  return {
    isValid: errors.length === 0,
    sanitizedValue: JSON.stringify(sanitizedStatuses),
    errors,
  };
}

/**
 * Validates country filter array
 */
export function validateCountryFilters(countries: string[]): ValidationResult {
  const errors: string[] = [];

  if (!Array.isArray(countries)) {
    return {
      isValid: false,
      sanitizedValue: '',
      errors: ['Country filters must be an array'],
    };
  }

  if (countries.length > SEARCH_INPUT_LIMITS.COUNTRY_MAX_COUNT) {
    errors.push(`Too many country filters (max ${SEARCH_INPUT_LIMITS.COUNTRY_MAX_COUNT})`);
  }

  // Validate each country code (2-letter ISO codes)
  const countryCodePattern = /^[A-Z]{2}$/;
  const sanitizedCountries = countries.filter((country) => {
    if (typeof country !== 'string') return false;
    if (!countryCodePattern.test(country.toUpperCase())) return false;
    return true;
  });

  return {
    isValid: errors.length === 0,
    sanitizedValue: JSON.stringify(sanitizedCountries),
    errors,
  };
}

/**
 * Comprehensive validation for all search filters
 */
export function validateSearchFilters(filters: {
  searchText?: string;
  statuses?: string[];
  countries?: string[];
}): {
  isValid: boolean;
  sanitizedFilters: typeof filters;
  errors: string[];
} {
  const allErrors: string[] = [];
  const sanitizedFilters = { ...filters };

  // Validate search text
  if (filters.searchText !== undefined) {
    const textResult = validateSearchText(filters.searchText);
    if (!textResult.isValid) {
      allErrors.push(...textResult.errors);
    } else {
      sanitizedFilters.searchText = textResult.sanitizedValue;
    }
  }

  // Validate status filters
  if (filters.statuses !== undefined) {
    const statusResult = validateStatusFilters(filters.statuses);
    if (!statusResult.isValid) {
      allErrors.push(...statusResult.errors);
    }
  }

  // Validate country filters
  if (filters.countries !== undefined) {
    const countryResult = validateCountryFilters(filters.countries);
    if (!countryResult.isValid) {
      allErrors.push(...countryResult.errors);
    }
  }

  return {
    isValid: allErrors.length === 0,
    sanitizedFilters,
    errors: allErrors,
  };
}

/**
 * Security utility: Logs suspicious search attempts for monitoring
 */
export function logSuspiciousSearchAttempt(
  input: string,
  userId?: string,
  userAgent?: string,
): void {
  console.warn('🚨 Suspicious search input detected:', {
    timestamp: new Date().toISOString(),
    input: input.substring(0, 100), // Only log first 100 chars for privacy
    userId: userId || 'anonymous',
    userAgent: userAgent || 'unknown',
    suspiciousPatterns: SUSPICIOUS_PATTERNS.map((pattern) =>
      pattern.test(input) ? pattern.source : null,
    ).filter(Boolean),
  });

  // In production, this would send to security monitoring system
  // Example: Sentry.captureMessage('Suspicious search attempt', 'warning', { extra: ... });
}
