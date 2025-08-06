/**
 * Quote Validation Service
 * Comprehensive validation logic for quotes, items, and business rules
 * Extracted from QuoteCalculatorV2 for centralized validation management
 * 
 * RESPONSIBILITIES:
 * - Quote data validation and business rule enforcement
 * - Item validation (pricing, weight, categories)
 * - Shipping route validation and constraints
 * - Customer data validation integration
 * - HSN code validation and compliance
 * - Discount and coupon validation
 * - Administrative validation rules
 * - Cross-field validation and dependencies
 */

import { logger } from '@/utils/logger';
import { QuoteItem, ShippingRoute } from './QuoteCalculationService';
import { CustomerData, DeliveryAddress } from './CustomerManagementService';

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  suggestions?: ValidationSuggestion[];
  score?: number; // Overall validation score (0-100)
}

export interface ValidationError {
  field: string;
  code: string;
  message: string;
  severity: 'critical' | 'high' | 'medium';
  context?: any;
}

export interface ValidationWarning {
  field: string;
  code: string;
  message: string;
  impact: 'high' | 'medium' | 'low';
  context?: any;
}

export interface ValidationSuggestion {
  field: string;
  type: 'correction' | 'optimization' | 'enhancement';
  message: string;
  suggested_value?: any;
  confidence: number; // 0-100
}

export interface QuoteValidationContext {
  items: QuoteItem[];
  route: ShippingRoute;
  customer?: CustomerData;
  deliveryAddress?: DeliveryAddress;
  adminOverrides?: {
    skip_weight_validation?: boolean;
    skip_price_validation?: boolean;
    skip_route_validation?: boolean;
  };
  business_rules?: {
    max_items?: number;
    max_value_usd?: number;
    min_weight_kg?: number;
    max_weight_kg?: number;
    restricted_countries?: string[];
    require_hsn_codes?: boolean;
  };
}

export interface ItemValidationRules {
  min_price_usd: number;
  max_price_usd: number;
  min_weight_kg: number;
  max_weight_kg: number;
  max_quantity: number;
  required_fields: string[];
  restricted_categories: string[];
  hsn_validation: {
    required_for_countries: string[];
    validate_format: boolean;
    check_classification: boolean;
  };
}

export class QuoteValidationService {
  private static instance: QuoteValidationService;
  private validationCache = new Map<string, { result: ValidationResult; timestamp: number }>();
  private readonly cacheTTL = 10 * 60 * 1000; // 10 minutes

  private readonly defaultItemRules: ItemValidationRules = {
    min_price_usd: 0.01,
    max_price_usd: 50000,
    min_weight_kg: 0.001,
    max_weight_kg: 100,
    max_quantity: 999,
    required_fields: ['name', 'unit_price_usd', 'quantity'],
    restricted_categories: ['weapons', 'drugs', 'adult'],
    hsn_validation: {
      required_for_countries: ['IN', 'BD', 'LK'],
      validate_format: true,
      check_classification: true
    }
  };

  constructor() {
    logger.info('QuoteValidationService initialized');
  }

  static getInstance(): QuoteValidationService {
    if (!QuoteValidationService.instance) {
      QuoteValidationService.instance = new QuoteValidationService();
    }
    return QuoteValidationService.instance;
  }

  /**
   * Comprehensive quote validation
   */
  async validateQuote(context: QuoteValidationContext): Promise<ValidationResult> {
    const validationId = this.generateValidationId(context);

    try {
      // Check cache first
      const cached = this.getFromCache(validationId);
      if (cached) {
        logger.debug('Quote validation cache hit');
        return cached;
      }

      const errors: ValidationError[] = [];
      const warnings: ValidationWarning[] = [];
      const suggestions: ValidationSuggestion[] = [];

      // Step 1: Validate basic quote structure
      const structureValidation = this.validateQuoteStructure(context);
      errors.push(...structureValidation.errors);
      warnings.push(...structureValidation.warnings);
      suggestions.push(...structureValidation.suggestions || []);

      // Step 2: Validate each item
      const itemValidations = await Promise.all(
        context.items.map(item => this.validateItem(item, context))
      );

      itemValidations.forEach(validation => {
        errors.push(...validation.errors);
        warnings.push(...validation.warnings);
        suggestions.push(...validation.suggestions || []);
      });

      // Step 3: Validate shipping route
      const routeValidation = await this.validateShippingRoute(context.route, context);
      errors.push(...routeValidation.errors);
      warnings.push(...routeValidation.warnings);
      suggestions.push(...routeValidation.suggestions || []);

      // Step 4: Validate customer data if provided
      if (context.customer) {
        const customerValidation = this.validateCustomerData(context.customer, context.deliveryAddress);
        errors.push(...customerValidation.errors);
        warnings.push(...customerValidation.warnings);
        suggestions.push(...customerValidation.suggestions || []);
      }

      // Step 5: Cross-field validations
      const crossValidation = await this.validateCrossFieldRules(context);
      errors.push(...crossValidation.errors);
      warnings.push(...crossValidation.warnings);
      suggestions.push(...crossValidation.suggestions || []);

      // Step 6: Business rule validations
      const businessValidation = this.validateBusinessRules(context);
      errors.push(...businessValidation.errors);
      warnings.push(...businessValidation.warnings);
      suggestions.push(...businessValidation.suggestions || []);

      // Calculate overall validation score
      const score = this.calculateValidationScore(errors, warnings);

      const result: ValidationResult = {
        isValid: errors.filter(e => e.severity === 'critical').length === 0,
        errors,
        warnings,
        suggestions: suggestions.length > 0 ? suggestions : undefined,
        score
      };

      // Cache the result
      this.setCache(validationId, result);

      logger.info(`Quote validation completed. Score: ${score}/100, Errors: ${errors.length}, Warnings: ${warnings.length}`);
      return result;

    } catch (error) {
      logger.error('Quote validation failed:', error);
      return {
        isValid: false,
        errors: [{
          field: 'system',
          code: 'VALIDATION_ERROR',
          message: 'Validation system error: ' + (error instanceof Error ? error.message : 'Unknown error'),
          severity: 'critical' as const
        }],
        warnings: [],
        score: 0
      };
    }
  }

  /**
   * Validate quote structure and basic requirements
   */
  private validateQuoteStructure(context: QuoteValidationContext): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const suggestions: ValidationSuggestion[] = [];

    // Check if items exist
    if (!context.items || context.items.length === 0) {
      errors.push({
        field: 'items',
        code: 'NO_ITEMS',
        message: 'At least one item is required for the quote',
        severity: 'critical'
      });
    } else {
      // Check item count limits
      const maxItems = context.business_rules?.max_items || 50;
      if (context.items.length > maxItems) {
        errors.push({
          field: 'items',
          code: 'TOO_MANY_ITEMS',
          message: `Maximum ${maxItems} items allowed per quote`,
          severity: 'high',
          context: { current: context.items.length, max: maxItems }
        });
      }

      // Check for duplicate items
      const itemNames = context.items.map(item => item.name.toLowerCase().trim());
      const duplicates = itemNames.filter((name, index) => itemNames.indexOf(name) !== index);
      
      if (duplicates.length > 0) {
        warnings.push({
          field: 'items',
          code: 'DUPLICATE_ITEMS',
          message: 'Duplicate items detected in the quote',
          impact: 'medium',
          context: { duplicates: [...new Set(duplicates)] }
        });

        suggestions.push({
          field: 'items',
          type: 'optimization',
          message: 'Consider combining duplicate items into single entries with higher quantities',
          confidence: 85
        });
      }
    }

    // Check shipping route
    if (!context.route) {
      errors.push({
        field: 'route',
        code: 'NO_ROUTE',
        message: 'Shipping route is required',
        severity: 'critical'
      });
    }

    return { isValid: errors.length === 0, errors, warnings, suggestions };
  }

  /**
   * Validate individual item
   */
  private async validateItem(item: QuoteItem, context: QuoteValidationContext): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const suggestions: ValidationSuggestion[] = [];
    const rules = this.defaultItemRules;

    // Required field validation
    for (const field of rules.required_fields) {
      if (!item[field as keyof QuoteItem]) {
        errors.push({
          field: `items.${item.id}.${field}`,
          code: 'REQUIRED_FIELD_MISSING',
          message: `${field.replace('_', ' ')} is required for item "${item.name}"`,
          severity: 'critical',
          context: { item_id: item.id, field }
        });
      }
    }

    // Price validation
    if (item.unit_price_usd) {
      if (item.unit_price_usd < rules.min_price_usd) {
        errors.push({
          field: `items.${item.id}.unit_price_usd`,
          code: 'PRICE_TOO_LOW',
          message: `Price must be at least $${rules.min_price_usd} for item "${item.name}"`,
          severity: 'high',
          context: { current: item.unit_price_usd, min: rules.min_price_usd }
        });
      }

      if (item.unit_price_usd > rules.max_price_usd) {
        warnings.push({
          field: `items.${item.id}.unit_price_usd`,
          code: 'HIGH_VALUE_ITEM',
          message: `High-value item detected: $${item.unit_price_usd}. Additional documentation may be required.`,
          impact: 'medium',
          context: { current: item.unit_price_usd, max: rules.max_price_usd }
        });
      }

      // Unusual pricing patterns
      if (item.unit_price_usd % 1 === 0 && item.unit_price_usd > 100) {
        suggestions.push({
          field: `items.${item.id}.unit_price_usd`,
          type: 'enhancement',
          message: 'Consider verifying the exact price for high-value round numbers',
          confidence: 60,
          context: { price: item.unit_price_usd }
        });
      }
    }

    // Quantity validation
    if (item.quantity) {
      if (item.quantity <= 0) {
        errors.push({
          field: `items.${item.id}.quantity`,
          code: 'INVALID_QUANTITY',
          message: `Quantity must be greater than 0 for item "${item.name}"`,
          severity: 'critical'
        });
      }

      if (item.quantity > rules.max_quantity) {
        errors.push({
          field: `items.${item.id}.quantity`,
          code: 'QUANTITY_TOO_HIGH',
          message: `Maximum quantity is ${rules.max_quantity} for item "${item.name}"`,
          severity: 'high',
          context: { current: item.quantity, max: rules.max_quantity }
        });
      }

      // Large quantity warning
      if (item.quantity > 10) {
        warnings.push({
          field: `items.${item.id}.quantity`,
          code: 'LARGE_QUANTITY',
          message: `Large quantity (${item.quantity}) may affect shipping costs and delivery time`,
          impact: 'low',
          context: { quantity: item.quantity }
        });
      }
    }

    // Weight validation
    if (item.weight_kg) {
      if (!context.adminOverrides?.skip_weight_validation) {
        if (item.weight_kg < rules.min_weight_kg) {
          warnings.push({
            field: `items.${item.id}.weight_kg`,
            code: 'WEIGHT_TOO_LOW',
            message: `Weight seems unusually low (${item.weight_kg}kg) for item "${item.name}"`,
            impact: 'medium'
          });

          suggestions.push({
            field: `items.${item.id}.weight_kg`,
            type: 'correction',
            message: 'Consider verifying the weight or using AI weight estimation',
            confidence: 75
          });
        }

        if (item.weight_kg > rules.max_weight_kg) {
          errors.push({
            field: `items.${item.id}.weight_kg`,
            code: 'WEIGHT_TOO_HIGH',
            message: `Weight exceeds maximum limit (${rules.max_weight_kg}kg) for standard shipping`,
            severity: 'high',
            context: { current: item.weight_kg, max: rules.max_weight_kg }
          });
        }
      }
    } else {
      // Missing weight warning
      warnings.push({
        field: `items.${item.id}.weight_kg`,
        code: 'MISSING_WEIGHT',
        message: `Weight not specified for item "${item.name}". This may affect shipping calculations.`,
        impact: 'medium'
      });

      if (item.ai_weight_suggestion) {
        suggestions.push({
          field: `items.${item.id}.weight_kg`,
          type: 'enhancement',
          message: `AI suggests weight: ${item.ai_weight_suggestion.weight}kg (${item.ai_weight_suggestion.confidence}% confidence)`,
          suggested_value: item.ai_weight_suggestion.weight,
          confidence: item.ai_weight_suggestion.confidence
        });
      }
    }

    // Category validation
    if (item.category && rules.restricted_categories.includes(item.category.toLowerCase())) {
      errors.push({
        field: `items.${item.id}.category`,
        code: 'RESTRICTED_CATEGORY',
        message: `Items in category "${item.category}" are not allowed for international shipping`,
        severity: 'critical',
        context: { category: item.category }
      });
    }

    // HSN code validation for applicable countries
    if (context.route?.destination_country && rules.hsn_validation.required_for_countries.includes(context.route.destination_country)) {
      if (!item.hsn_code) {
        warnings.push({
          field: `items.${item.id}.hsn_code`,
          code: 'MISSING_HSN_CODE',
          message: `HSN code recommended for shipping to ${context.route.destination_country}`,
          impact: 'high',
          context: { destination: context.route.destination_country }
        });
      } else if (rules.hsn_validation.validate_format) {
        const hsnValidation = this.validateHSNCode(item.hsn_code);
        if (!hsnValidation.isValid) {
          warnings.push({
            field: `items.${item.id}.hsn_code`,
            code: 'INVALID_HSN_FORMAT',
            message: `Invalid HSN code format: ${item.hsn_code}`,
            impact: 'medium'
          });
        }
      }
    }

    // URL validation if provided
    if (item.url) {
      try {
        new URL(item.url);
      } catch {
        warnings.push({
          field: `items.${item.id}.url`,
          code: 'INVALID_URL',
          message: `Invalid product URL format for item "${item.name}"`,
          impact: 'low'
        });
      }
    }

    // Discount validation
    if (item.discount_type && (item.discount_percentage || item.discount_amount)) {
      if (item.discount_type === 'percentage' && item.discount_percentage) {
        if (item.discount_percentage < 0 || item.discount_percentage > 100) {
          errors.push({
            field: `items.${item.id}.discount_percentage`,
            code: 'INVALID_DISCOUNT_PERCENTAGE',
            message: `Discount percentage must be between 0-100% for item "${item.name}"`,
            severity: 'high'
          });
        }
      }

      if (item.discount_type === 'amount' && item.discount_amount) {
        const itemTotal = item.unit_price_usd * item.quantity;
        if (item.discount_amount > itemTotal) {
          errors.push({
            field: `items.${item.id}.discount_amount`,
            code: 'DISCOUNT_EXCEEDS_PRICE',
            message: `Discount amount cannot exceed item total for "${item.name}"`,
            severity: 'high'
          });
        }
      }
    }

    return { isValid: errors.length === 0, errors, warnings, suggestions };
  }

  /**
   * Validate shipping route
   */
  private async validateShippingRoute(route: ShippingRoute, context: QuoteValidationContext): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const suggestions: ValidationSuggestion[] = [];

    if (!route) {
      return { isValid: false, errors: [], warnings: [], suggestions: [] };
    }

    // Country validation
    if (!route.origin_country || route.origin_country.length !== 2) {
      errors.push({
        field: 'route.origin_country',
        code: 'INVALID_ORIGIN_COUNTRY',
        message: 'Valid origin country code is required',
        severity: 'critical'
      });
    }

    if (!route.destination_country || route.destination_country.length !== 2) {
      errors.push({
        field: 'route.destination_country',
        code: 'INVALID_DESTINATION_COUNTRY',
        message: 'Valid destination country code is required',
        severity: 'critical'
      });
    }

    // Same origin/destination check
    if (route.origin_country === route.destination_country) {
      warnings.push({
        field: 'route',
        code: 'DOMESTIC_SHIPPING',
        message: 'Domestic shipping detected. Consider local shipping options.',
        impact: 'medium'
      });
    }

    // Restricted destinations
    const restrictedCountries = context.business_rules?.restricted_countries || [];
    if (restrictedCountries.includes(route.destination_country)) {
      errors.push({
        field: 'route.destination_country',
        code: 'RESTRICTED_DESTINATION',
        message: `Shipping to ${route.destination_country} is currently restricted`,
        severity: 'critical',
        context: { country: route.destination_country }
      });
    }

    // Shipping method validation
    const validMethods = ['standard', 'express', 'priority', 'economy'];
    if (route.shipping_method && !validMethods.includes(route.shipping_method.toLowerCase())) {
      warnings.push({
        field: 'route.shipping_method',
        code: 'UNKNOWN_SHIPPING_METHOD',
        message: `Unknown shipping method: ${route.shipping_method}`,
        impact: 'low'
      });
    }

    // Estimated days validation
    if (route.estimated_days) {
      if (route.estimated_days < 1 || route.estimated_days > 60) {
        warnings.push({
          field: 'route.estimated_days',
          code: 'UNUSUAL_DELIVERY_TIME',
          message: `Unusual delivery time: ${route.estimated_days} days`,
          impact: 'medium'
        });
      }
    }

    return { isValid: errors.length === 0, errors, warnings, suggestions };
  }

  /**
   * Validate customer data
   */
  private validateCustomerData(customer: CustomerData, address?: DeliveryAddress): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const suggestions: ValidationSuggestion[] = [];

    // Basic customer validation
    if (!customer.name?.trim()) {
      errors.push({
        field: 'customer.name',
        code: 'MISSING_CUSTOMER_NAME',
        message: 'Customer name is required',
        severity: 'critical'
      });
    }

    if (!customer.email?.trim()) {
      errors.push({
        field: 'customer.email',
        code: 'MISSING_CUSTOMER_EMAIL',
        message: 'Customer email is required',
        severity: 'critical'
      });
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(customer.email)) {
        errors.push({
          field: 'customer.email',
          code: 'INVALID_EMAIL_FORMAT',
          message: 'Invalid email address format',
          severity: 'high'
        });
      }
    }

    // Address validation if provided
    if (address) {
      if (!address.address_line_1?.trim()) {
        errors.push({
          field: 'delivery_address.address_line_1',
          code: 'MISSING_ADDRESS',
          message: 'Street address is required',
          severity: 'critical'
        });
      }

      if (!address.city?.trim()) {
        errors.push({
          field: 'delivery_address.city',
          code: 'MISSING_CITY',
          message: 'City is required',
          severity: 'critical'
        });
      }

      if (!address.postal_code?.trim()) {
        warnings.push({
          field: 'delivery_address.postal_code',
          code: 'MISSING_POSTAL_CODE',
          message: 'Postal code is recommended for accurate delivery',
          impact: 'high'
        });
      }
    }

    return { isValid: errors.length === 0, errors, warnings, suggestions };
  }

  /**
   * Validate cross-field business rules
   */
  private async validateCrossFieldRules(context: QuoteValidationContext): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const suggestions: ValidationSuggestion[] = [];

    // Total value check
    const totalValue = context.items.reduce((sum, item) => sum + (item.unit_price_usd * item.quantity), 0);
    const maxValue = context.business_rules?.max_value_usd || 10000;

    if (totalValue > maxValue) {
      warnings.push({
        field: 'quote',
        code: 'HIGH_VALUE_QUOTE',
        message: `High-value quote ($${totalValue.toFixed(2)}). Additional documentation may be required.`,
        impact: 'high',
        context: { total: totalValue, threshold: maxValue }
      });
    }

    // Total weight check
    const totalWeight = context.items.reduce((sum, item) => sum + ((item.weight_kg || 0) * item.quantity), 0);
    const maxWeight = context.business_rules?.max_weight_kg || 50;

    if (totalWeight > maxWeight) {
      errors.push({
        field: 'quote',
        code: 'WEIGHT_LIMIT_EXCEEDED',
        message: `Total weight (${totalWeight.toFixed(2)}kg) exceeds shipping limit (${maxWeight}kg)`,
        severity: 'high',
        context: { total: totalWeight, max: maxWeight }
      });
    }

    // Minimum weight check
    const minWeight = context.business_rules?.min_weight_kg || 0.1;
    if (totalWeight < minWeight) {
      warnings.push({
        field: 'quote',
        code: 'LOW_WEIGHT_QUOTE',
        message: `Total weight (${totalWeight.toFixed(3)}kg) is very low. Consider dimensional weight pricing.`,
        impact: 'medium'
      });
    }

    return { isValid: errors.length === 0, errors, warnings, suggestions };
  }

  /**
   * Validate business-specific rules
   */
  private validateBusinessRules(context: QuoteValidationContext): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const suggestions: ValidationSuggestion[] = [];

    // HSN requirement for certain countries
    if (context.business_rules?.require_hsn_codes && 
        context.route?.destination_country && 
        ['IN', 'BD', 'LK'].includes(context.route.destination_country)) {
      
      const itemsWithoutHSN = context.items.filter(item => !item.hsn_code);
      if (itemsWithoutHSN.length > 0) {
        warnings.push({
          field: 'items',
          code: 'HSN_CODES_RECOMMENDED',
          message: `HSN codes strongly recommended for ${itemsWithoutHSN.length} items shipping to ${context.route.destination_country}`,
          impact: 'high',
          context: { 
            items_without_hsn: itemsWithoutHSN.length,
            destination: context.route.destination_country 
          }
        });
      }
    }

    return { isValid: errors.length === 0, errors, warnings, suggestions };
  }

  /**
   * Helper methods
   */
  private validateHSNCode(hsnCode: string): { isValid: boolean; error?: string } {
    // HSN codes are typically 4, 6, or 8 digits
    const hsnRegex = /^\d{4}(\d{2})?(\d{2})?$/;
    
    if (!hsnRegex.test(hsnCode)) {
      return { 
        isValid: false, 
        error: 'HSN code should be 4, 6, or 8 digits' 
      };
    }

    return { isValid: true };
  }

  private calculateValidationScore(errors: ValidationError[], warnings: ValidationWarning[]): number {
    let score = 100;

    // Deduct points for errors
    errors.forEach(error => {
      switch (error.severity) {
        case 'critical': score -= 25; break;
        case 'high': score -= 15; break;
        case 'medium': score -= 10; break;
      }
    });

    // Deduct points for warnings
    warnings.forEach(warning => {
      switch (warning.impact) {
        case 'high': score -= 8; break;
        case 'medium': score -= 5; break;
        case 'low': score -= 2; break;
      }
    });

    return Math.max(0, score);
  }

  private generateValidationId(context: QuoteValidationContext): string {
    const key = JSON.stringify({
      items: context.items.map(i => ({
        id: i.id,
        name: i.name,
        price: i.unit_price_usd,
        quantity: i.quantity,
        weight: i.weight_kg
      })),
      route: context.route,
      customer_id: context.customer?.id,
      rules: context.business_rules
    });
    
    return this.hashString(key);
  }

  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  private getFromCache(key: string): ValidationResult | null {
    const cached = this.validationCache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.result;
    }
    
    if (cached) {
      this.validationCache.delete(key);
    }
    
    return null;
  }

  private setCache(key: string, result: ValidationResult): void {
    this.validationCache.set(key, {
      result,
      timestamp: Date.now()
    });
  }

  /**
   * Public utility methods
   */
  clearValidationCache(): void {
    this.validationCache.clear();
    logger.info('Validation cache cleared');
  }

  getCacheStats(): { size: number; entries: string[] } {
    return {
      size: this.validationCache.size,
      entries: Array.from(this.validationCache.keys())
    };
  }

  dispose(): void {
    this.validationCache.clear();
    logger.info('QuoteValidationService disposed');
  }
}

export default QuoteValidationService;