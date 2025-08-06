/**
 * Quote Validation Service
 * Handles form validation and error management for the quote calculator
 */

import { logger } from '@/utils/logger';
import { QuoteFormData, QuoteItem, QuoteAddress } from './QuoteFormState';
import { currencyService } from '@/services/CurrencyService';

export interface ValidationRule {
  field: string;
  message: string;
  validator: (value: any, formData?: QuoteFormData) => boolean;
  severity: 'error' | 'warning' | 'info';
  dependencies?: string[];
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
  infos: ValidationError[];
  fieldErrors: Record<string, ValidationError[]>;
}

export interface ValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
  code?: string;
}

export interface ValidationOptions {
  validateAll?: boolean;
  skipWarnings?: boolean;
  skipInfos?: boolean;
  fieldWhitelist?: string[];
  fieldBlacklist?: string[];
  customRules?: ValidationRule[];
}

export class QuoteValidationService {
  private rules: ValidationRule[] = [];
  private customValidators: Map<string, (value: any) => boolean> = new Map();

  constructor() {
    this.initializeValidationRules();
    this.initializeCustomValidators();
    logger.info('QuoteValidationService initialized');
  }

  /**
   * Main validation method
   */
  validate(formData: QuoteFormData, options: ValidationOptions = {}): ValidationResult {
    const startTime = Date.now();
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];
    const infos: ValidationError[] = [];
    const fieldErrors: Record<string, ValidationError[]> = {};

    try {
      // Get applicable rules
      let applicableRules = [...this.rules];
      
      if (options.customRules) {
        applicableRules.push(...options.customRules);
      }

      // Filter rules based on options
      if (options.fieldWhitelist) {
        applicableRules = applicableRules.filter(rule => 
          options.fieldWhitelist!.includes(rule.field));
      }

      if (options.fieldBlacklist) {
        applicableRules = applicableRules.filter(rule => 
          !options.fieldBlacklist!.includes(rule.field));
      }

      // Run validations
      for (const rule of applicableRules) {
        try {
          const fieldValue = this.getFieldValue(formData, rule.field);
          const isValid = rule.validator(fieldValue, formData);

          if (!isValid) {
            const validationError: ValidationError = {
              field: rule.field,
              message: rule.message,
              severity: rule.severity,
              code: `validation_${rule.field}`
            };

            // Categorize by severity
            switch (rule.severity) {
              case 'error':
                errors.push(validationError);
                break;
              case 'warning':
                if (!options.skipWarnings) {
                  warnings.push(validationError);
                }
                break;
              case 'info':
                if (!options.skipInfos) {
                  infos.push(validationError);
                }
                break;
            }

            // Group by field
            if (!fieldErrors[rule.field]) {
              fieldErrors[rule.field] = [];
            }
            fieldErrors[rule.field].push(validationError);
          }
        } catch (error) {
          logger.warn(`Validation rule error for field ${rule.field}:`, error);
        }
      }

      const result: ValidationResult = {
        isValid: errors.length === 0,
        errors,
        warnings,
        infos,
        fieldErrors
      };

      logger.debug('Validation completed', {
        isValid: result.isValid,
        errorCount: errors.length,
        warningCount: warnings.length,
        processingTime: Date.now() - startTime
      });

      return result;

    } catch (error) {
      logger.error('Validation service error:', error);
      return {
        isValid: false,
        errors: [{
          field: 'general',
          message: 'Validation service error occurred',
          severity: 'error'
        }],
        warnings: [],
        infos: [],
        fieldErrors: {}
      };
    }
  }

  /**
   * Validate specific field
   */
  validateField(formData: QuoteFormData, fieldName: string): ValidationError[] {
    const fieldRules = this.rules.filter(rule => rule.field === fieldName);
    const fieldErrors: ValidationError[] = [];

    for (const rule of fieldRules) {
      try {
        const fieldValue = this.getFieldValue(formData, rule.field);
        const isValid = rule.validator(fieldValue, formData);

        if (!isValid) {
          fieldErrors.push({
            field: rule.field,
            message: rule.message,
            severity: rule.severity,
            code: `validation_${rule.field}`
          });
        }
      } catch (error) {
        logger.warn(`Field validation error for ${fieldName}:`, error);
      }
    }

    return fieldErrors;
  }

  /**
   * Real-time validation for live feedback
   */
  validateRealTime(formData: QuoteFormData, changedField?: string): ValidationResult {
    // For real-time validation, only validate errors and skip detailed validations
    return this.validate(formData, {
      skipWarnings: true,
      skipInfos: true,
      fieldWhitelist: changedField ? [changedField] : undefined
    });
  }

  /**
   * Validate items specifically
   */
  validateItems(items: QuoteItem[]): ValidationError[] {
    const errors: ValidationError[] = [];

    if (items.length === 0) {
      errors.push({
        field: 'items',
        message: 'At least one item is required',
        severity: 'error'
      });
      return errors;
    }

    items.forEach((item, index) => {
      // Name validation
      if (!item.name || item.name.trim().length === 0) {
        errors.push({
          field: `items.${index}.name`,
          message: `Item ${index + 1}: Name is required`,
          severity: 'error'
        });
      } else if (item.name.length > 200) {
        errors.push({
          field: `items.${index}.name`,
          message: `Item ${index + 1}: Name too long (max 200 characters)`,
          severity: 'error'
        });
      }

      // Price validation
      if (item.unit_price_usd <= 0) {
        errors.push({
          field: `items.${index}.unit_price_usd`,
          message: `Item ${index + 1}: Price must be greater than 0`,
          severity: 'error'
        });
      } else if (item.unit_price_usd > 50000) {
        errors.push({
          field: `items.${index}.unit_price_usd`,
          message: `Item ${index + 1}: Price seems unusually high`,
          severity: 'warning'
        });
      }

      // Quantity validation
      if (item.quantity <= 0) {
        errors.push({
          field: `items.${index}.quantity`,
          message: `Item ${index + 1}: Quantity must be greater than 0`,
          severity: 'error'
        });
      } else if (item.quantity > 1000) {
        errors.push({
          field: `items.${index}.quantity`,
          message: `Item ${index + 1}: Large quantity may affect shipping`,
          severity: 'warning'
        });
      }

      // Weight validation
      if (item.weight_kg !== undefined && item.weight_kg < 0) {
        errors.push({
          field: `items.${index}.weight_kg`,
          message: `Item ${index + 1}: Weight cannot be negative`,
          severity: 'error'
        });
      } else if (item.weight_kg === undefined || item.weight_kg === 0) {
        errors.push({
          field: `items.${index}.weight_kg`,
          message: `Item ${index + 1}: Weight is recommended for accurate shipping`,
          severity: 'warning'
        });
      }

      // URL validation
      if (item.url && !this.isValidUrl(item.url)) {
        errors.push({
          field: `items.${index}.url`,
          message: `Item ${index + 1}: Invalid URL format`,
          severity: 'warning'
        });
      }

      // Discount validation
      if (item.discount_percentage && (item.discount_percentage < 0 || item.discount_percentage > 100)) {
        errors.push({
          field: `items.${index}.discount_percentage`,
          message: `Item ${index + 1}: Discount percentage must be between 0-100`,
          severity: 'error'
        });
      }

      // HSN code validation
      if (item.hsn_code && !this.isValidHSNCode(item.hsn_code)) {
        errors.push({
          field: `items.${index}.hsn_code`,
          message: `Item ${index + 1}: Invalid HSN code format`,
          severity: 'warning'
        });
      }
    });

    return errors;
  }

  /**
   * Validate address
   */
  validateAddress(address: QuoteAddress): ValidationError[] {
    const errors: ValidationError[] = [];

    if (!address.city || address.city.trim().length === 0) {
      errors.push({
        field: 'address.city',
        message: 'City is required',
        severity: 'error'
      });
    }

    if (!address.state_province_region || address.state_province_region.trim().length === 0) {
      errors.push({
        field: 'address.state_province_region',
        message: 'State/Province is required',
        severity: 'error'
      });
    }

    if (!address.postal_code || address.postal_code.trim().length === 0) {
      errors.push({
        field: 'address.postal_code',
        message: 'Postal code is required',
        severity: 'error'
      });
    } else if (!this.isValidPostalCode(address.postal_code, address.destination_country)) {
      errors.push({
        field: 'address.postal_code',
        message: 'Invalid postal code format',
        severity: 'warning'
      });
    }

    if (!address.destination_country || address.destination_country.length !== 2) {
      errors.push({
        field: 'address.destination_country',
        message: 'Valid country code is required',
        severity: 'error'
      });
    }

    // Phone validation if provided
    if (address.recipient_phone && !this.isValidPhoneNumber(address.recipient_phone)) {
      errors.push({
        field: 'address.recipient_phone',
        message: 'Invalid phone number format',
        severity: 'warning'
      });
    }

    return errors;
  }

  /**
   * Initialize validation rules
   */
  private initializeValidationRules(): void {
    this.rules = [
      // Basic country validation
      {
        field: 'originCountry',
        message: 'Origin country is required',
        validator: (value) => !!value && value.length === 2,
        severity: 'error'
      },
      {
        field: 'destinationCountry',
        message: 'Destination country is required',
        validator: (value) => !!value && value.length === 2,
        severity: 'error'
      },

      // Customer info validation
      {
        field: 'customerEmail',
        message: 'Valid email is required when provided',
        validator: (value) => !value || this.isValidEmail(value),
        severity: 'warning'
      },
      {
        field: 'customerPhone',
        message: 'Valid phone number is required when provided',
        validator: (value) => !value || this.isValidPhoneNumber(value),
        severity: 'warning'
      },

      // Currency validation
      {
        field: 'customerCurrency',
        message: 'Valid currency code is required',
        validator: (value) => !!value && value.length === 3,
        severity: 'error'
      },

      // Payment gateway validation
      {
        field: 'paymentGateway',
        message: 'Payment gateway is required',
        validator: (value) => !!value,
        severity: 'error'
      },

      // Discount validation
      {
        field: 'orderDiscountValue',
        message: 'Order discount must be non-negative',
        validator: (value) => value >= 0,
        severity: 'error'
      },
      {
        field: 'shippingDiscountValue',
        message: 'Shipping discount must be non-negative',
        validator: (value) => value >= 0,
        severity: 'error'
      },

      // Destination specific validation
      {
        field: 'destinationPincode',
        message: 'Pincode is required for Indian deliveries',
        validator: (value, formData) => {
          if (formData?.destinationCountry === 'IN') {
            return !!value && value.length === 6 && /^\d{6}$/.test(value);
          }
          return true;
        },
        severity: 'error',
        dependencies: ['destinationCountry']
      },

      // Business logic validation
      {
        field: 'items',
        message: 'At least one item is required',
        validator: (items) => Array.isArray(items) && items.length > 0,
        severity: 'error'
      },

      // Weight validation
      {
        field: 'items',
        message: 'All items should have weight for accurate shipping calculation',
        validator: (items) => {
          if (!Array.isArray(items)) return false;
          return items.every(item => item.weight_kg && item.weight_kg > 0);
        },
        severity: 'warning'
      },

      // Total value validation
      {
        field: 'items',
        message: 'Order value seems unusually high',
        validator: (items) => {
          if (!Array.isArray(items)) return true;
          const total = items.reduce((sum, item) => sum + (item.unit_price_usd * item.quantity), 0);
          return total <= 100000; // $100k threshold
        },
        severity: 'warning'
      },

      // Shipping method validation
      {
        field: 'shippingMethod',
        message: 'Valid shipping method is required',
        validator: (value) => ['standard', 'express', 'economy'].includes(value),
        severity: 'error'
      }
    ];

    logger.info(`Initialized ${this.rules.length} validation rules`);
  }

  /**
   * Initialize custom validators
   */
  private initializeCustomValidators(): void {
    this.customValidators.set('email', (value) => this.isValidEmail(value));
    this.customValidators.set('phone', (value) => this.isValidPhoneNumber(value));
    this.customValidators.set('url', (value) => this.isValidUrl(value));
    this.customValidators.set('postalCode', (value, country) => this.isValidPostalCode(value, country));
    this.customValidators.set('hsnCode', (value) => this.isValidHSNCode(value));
  }

  /**
   * Helper methods
   */
  private getFieldValue(formData: QuoteFormData, fieldPath: string): any {
    const paths = fieldPath.split('.');
    let value: any = formData;
    
    for (const path of paths) {
      if (value === null || value === undefined) {
        return undefined;
      }
      value = value[path];
    }
    
    return value;
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private isValidPhoneNumber(phone: string): boolean {
    // Basic international phone number validation
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
    return phoneRegex.test(cleanPhone) && cleanPhone.length >= 7;
  }

  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  private isValidPostalCode(postalCode: string, country: string): boolean {
    const patterns: Record<string, RegExp> = {
      'US': /^\d{5}(-\d{4})?$/,
      'CA': /^[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d$/,
      'GB': /^[A-Z]{1,2}\d[A-Z\d]? ?\d[A-Z]{2}$/i,
      'IN': /^\d{6}$/,
      'NP': /^\d{5}$/,
      'AU': /^\d{4}$/,
      'DE': /^\d{5}$/,
      'FR': /^\d{5}$/,
      'JP': /^\d{3}-\d{4}$/
    };

    const pattern = patterns[country];
    return pattern ? pattern.test(postalCode) : postalCode.length >= 3;
  }

  private isValidHSNCode(hsnCode: string): boolean {
    // HSN codes are typically 4-8 digits
    return /^\d{4,8}$/.test(hsnCode);
  }

  /**
   * Custom validation rule management
   */
  addValidationRule(rule: ValidationRule): void {
    this.rules.push(rule);
    logger.info('Added custom validation rule', { field: rule.field });
  }

  removeValidationRule(field: string): void {
    this.rules = this.rules.filter(rule => rule.field !== field);
    logger.info('Removed validation rule', { field });
  }

  /**
   * Business-specific validations
   */
  validateBusinessRules(formData: QuoteFormData): ValidationError[] {
    const errors: ValidationError[] = [];

    // Minimum order value
    const totalValue = formData.items.reduce((sum, item) => 
      sum + (item.unit_price_usd * item.quantity), 0);
    
    if (totalValue < 10) {
      errors.push({
        field: 'items',
        message: 'Minimum order value is $10 USD',
        severity: 'error'
      });
    }

    // Maximum weight limit
    const totalWeight = formData.items.reduce((sum, item) => 
      sum + ((item.weight_kg || 0) * item.quantity), 0);
    
    if (totalWeight > 30) {
      errors.push({
        field: 'items',
        message: 'Total weight exceeds 30kg limit. Please split into multiple shipments.',
        severity: 'error'
      });
    }

    // Restricted countries
    const restrictedCountries = ['IR', 'KP', 'SY']; // Example restricted countries
    if (restrictedCountries.includes(formData.destinationCountry)) {
      errors.push({
        field: 'destinationCountry',
        message: 'Shipping to this country is currently restricted',
        severity: 'error'
      });
    }

    // Payment method restrictions
    if (formData.paymentGateway === 'cod' && totalValue > 500) {
      errors.push({
        field: 'paymentGateway',
        message: 'Cash on Delivery not available for orders over $500',
        severity: 'error'
      });
    }

    return errors;
  }

  /**
   * Get validation summary
   */
  getValidationSummary(result: ValidationResult): string {
    const parts: string[] = [];
    
    if (result.errors.length > 0) {
      parts.push(`${result.errors.length} error${result.errors.length > 1 ? 's' : ''}`);
    }
    
    if (result.warnings.length > 0) {
      parts.push(`${result.warnings.length} warning${result.warnings.length > 1 ? 's' : ''}`);
    }
    
    if (result.infos.length > 0) {
      parts.push(`${result.infos.length} info${result.infos.length > 1 ? 's' : ''}`);
    }

    return parts.length > 0 ? parts.join(', ') : 'All validations passed';
  }

  /**
   * Get field-specific errors
   */
  getFieldErrors(result: ValidationResult, fieldName: string): ValidationError[] {
    return result.fieldErrors[fieldName] || [];
  }

  /**
   * Check if field has errors
   */
  hasFieldError(result: ValidationResult, fieldName: string): boolean {
    return this.getFieldErrors(result, fieldName).some(error => error.severity === 'error');
  }

  /**
   * Cleanup
   */
  destroy(): void {
    this.rules = [];
    this.customValidators.clear();
    logger.info('QuoteValidationService destroyed');
  }
}

// Export singleton instance
export const quoteValidationService = new QuoteValidationService();