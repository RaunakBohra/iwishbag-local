/**
 * Comprehensive input validation and sanitization for customer data
 * Implements defensive programming principles for security
 */

import { CustomerInfo, CustomerAddress, ValidationResult, CustomerValidationRules } from '@/types/stripeCustomer';

export class CustomerValidator {
  // Stripe API limits for customer data
  private static readonly STRIPE_LIMITS = {
    email: 512,
    name: 256,
    phone: 20,
    address_line: 200,
    city: 100,
    state: 100,
    postal_code: 20,
    country: 2, // ISO 2-letter country code
  };

  // Email validation regex (RFC 5322 compliant)
  private static readonly EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

  // Phone validation regex (international format)
  private static readonly PHONE_REGEX = /^\+?[1-9]\d{1,14}$/;

  // Country code validation (ISO 3166-1 alpha-2)
  private static readonly COUNTRY_CODE_REGEX = /^[A-Z]{2}$/;

  /**
   * Sanitizes a string by removing dangerous characters and limiting length
   */
  private static sanitizeString(input: string, maxLength: number): string {
    if (!input || typeof input !== 'string') {
      return '';
    }

    return input
      .trim()
      .replace(/[<>'"&]/g, '') // Remove potentially dangerous characters
      .substring(0, maxLength);
  }

  /**
   * Validates email format and length
   */
  private static validateEmail(email: string): ValidationResult {
    const errors: string[] = [];
    
    if (!email || typeof email !== 'string') {
      errors.push('Email is required');
      return { isValid: false, errors };
    }

    if (email.length > this.STRIPE_LIMITS.email) {
      errors.push(`Email exceeds maximum length of ${this.STRIPE_LIMITS.email} characters`);
    }

    if (!this.EMAIL_REGEX.test(email)) {
      errors.push('Invalid email format');
    }

    return { isValid: errors.length === 0, errors };
  }

  /**
   * Validates name format and length
   */
  private static validateName(name: string): ValidationResult {
    const errors: string[] = [];
    
    if (!name || typeof name !== 'string') {
      errors.push('Name is required');
      return { isValid: false, errors };
    }

    if (name.length > this.STRIPE_LIMITS.name) {
      errors.push(`Name exceeds maximum length of ${this.STRIPE_LIMITS.name} characters`);
    }

    if (name.length < 2) {
      errors.push('Name must be at least 2 characters long');
    }

    // Check for potentially malicious content
    if (/<script|javascript:|data:/i.test(name)) {
      errors.push('Name contains invalid characters');
    }

    return { isValid: errors.length === 0, errors };
  }

  /**
   * Validates phone number format and length
   */
  private static validatePhone(phone: string): ValidationResult {
    const errors: string[] = [];
    
    if (!phone || typeof phone !== 'string') {
      // Phone is optional, so empty is valid
      return { isValid: true, errors: [] };
    }

    if (phone.length > this.STRIPE_LIMITS.phone) {
      errors.push(`Phone exceeds maximum length of ${this.STRIPE_LIMITS.phone} characters`);
    }

    // Remove common formatting characters for validation
    const cleanPhone = phone.replace(/[\s\-\(\)\.]/g, '');
    
    if (!this.PHONE_REGEX.test(cleanPhone)) {
      errors.push('Invalid phone number format. Use international format (e.g., +1234567890)');
    }

    return { isValid: errors.length === 0, errors };
  }

  /**
   * Validates address fields
   */
  private static validateAddress(address: CustomerAddress): ValidationResult {
    const errors: string[] = [];

    if (!address || typeof address !== 'object') {
      errors.push('Address is required');
      return { isValid: false, errors };
    }

    // Validate required fields
    if (!address.line1 || address.line1.length === 0) {
      errors.push('Address line 1 is required');
    } else if (address.line1.length > this.STRIPE_LIMITS.address_line) {
      errors.push(`Address line 1 exceeds maximum length of ${this.STRIPE_LIMITS.address_line} characters`);
    }

    if (!address.city || address.city.length === 0) {
      errors.push('City is required');
    } else if (address.city.length > this.STRIPE_LIMITS.city) {
      errors.push(`City exceeds maximum length of ${this.STRIPE_LIMITS.city} characters`);
    }

    if (!address.state || address.state.length === 0) {
      errors.push('State is required');
    } else if (address.state.length > this.STRIPE_LIMITS.state) {
      errors.push(`State exceeds maximum length of ${this.STRIPE_LIMITS.state} characters`);
    }

    if (!address.postal_code || address.postal_code.length === 0) {
      errors.push('Postal code is required');
    } else if (address.postal_code.length > this.STRIPE_LIMITS.postal_code) {
      errors.push(`Postal code exceeds maximum length of ${this.STRIPE_LIMITS.postal_code} characters`);
    }

    if (!address.country || address.country.length === 0) {
      errors.push('Country is required');
    } else if (!this.COUNTRY_CODE_REGEX.test(address.country.toUpperCase())) {
      errors.push('Country must be a valid ISO 3166-1 alpha-2 country code');
    }

    return { isValid: errors.length === 0, errors };
  }

  /**
   * Validates and sanitizes customer information
   */
  public static validateCustomerInfo(customerInfo: CustomerInfo): ValidationResult & { sanitizedData?: CustomerInfo } {
    const errors: string[] = [];
    const sanitizedData: CustomerInfo = {};

    // Validate and sanitize email
    if (customerInfo.email) {
      const emailValidation = this.validateEmail(customerInfo.email);
      if (!emailValidation.isValid) {
        errors.push(...emailValidation.errors);
      } else {
        sanitizedData.email = this.sanitizeString(customerInfo.email, this.STRIPE_LIMITS.email);
      }
    }

    // Validate and sanitize name
    if (customerInfo.name) {
      const nameValidation = this.validateName(customerInfo.name);
      if (!nameValidation.isValid) {
        errors.push(...nameValidation.errors);
      } else {
        sanitizedData.name = this.sanitizeString(customerInfo.name, this.STRIPE_LIMITS.name);
      }
    }

    // Validate and sanitize phone
    if (customerInfo.phone) {
      const phoneValidation = this.validatePhone(customerInfo.phone);
      if (!phoneValidation.isValid) {
        errors.push(...phoneValidation.errors);
      } else {
        sanitizedData.phone = this.sanitizeString(customerInfo.phone, this.STRIPE_LIMITS.phone);
      }
    }

    // Validate and sanitize address
    if (customerInfo.address) {
      const addressValidation = this.validateAddress(customerInfo.address);
      if (!addressValidation.isValid) {
        errors.push(...addressValidation.errors);
      } else {
        sanitizedData.address = {
          line1: this.sanitizeString(customerInfo.address.line1, this.STRIPE_LIMITS.address_line),
          line2: customerInfo.address.line2 ? this.sanitizeString(customerInfo.address.line2, this.STRIPE_LIMITS.address_line) : undefined,
          city: this.sanitizeString(customerInfo.address.city, this.STRIPE_LIMITS.city),
          state: this.sanitizeString(customerInfo.address.state, this.STRIPE_LIMITS.state),
          postal_code: this.sanitizeString(customerInfo.address.postal_code, this.STRIPE_LIMITS.postal_code),
          country: customerInfo.address.country.toUpperCase(),
        };
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitizedData: errors.length === 0 ? sanitizedData : undefined,
    };
  }

  /**
   * Validates customer data for Stripe metadata (limited character set)
   */
  public static validateForStripeMetadata(value: string): string {
    if (!value || typeof value !== 'string') {
      return '';
    }

    // Stripe metadata values must be strings and have specific limitations
    return value
      .trim()
      .replace(/[^\w\s\-\.@]/g, '') // Allow only alphanumeric, spaces, hyphens, dots, and @
      .substring(0, 500); // Stripe metadata value limit
  }

  /**
   * Checks if customer information is complete for payment processing
   */
  public static isCompleteForPayment(customerInfo: CustomerInfo): boolean {
    return !!(
      customerInfo.email &&
      customerInfo.name &&
      customerInfo.address &&
      customerInfo.address.line1 &&
      customerInfo.address.city &&
      customerInfo.address.state &&
      customerInfo.address.postal_code &&
      customerInfo.address.country
    );
  }
}