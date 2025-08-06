/**
 * Product Validation Service
 * Handles validation, data quality checks, and enhancement of scraped product data
 * Extracted from BrightDataProductService for better maintainability
 */

import { FetchResult, ProductData } from '../ProductDataFetchService';
import { PlatformConfig } from './ProductSearchService';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  confidence: number; // 0-1 score indicating data quality
  suggestions: string[];
}

export interface EnhancementOptions {
  normalizeTitle?: boolean;
  standardizeCurrency?: boolean;
  validateWeight?: boolean;
  enhanceImages?: boolean;
  extractFeatures?: boolean;
  categorizeProduct?: boolean;
}

export interface ProductEnhancement {
  originalData: ProductData;
  enhancedData: ProductData;
  enhancements: string[];
  qualityScore: number;
}

export class ProductValidationService {
  private static instance: ProductValidationService;

  // Validation rules and patterns
  private readonly validationRules = {
    title: {
      minLength: 3,
      maxLength: 500,
      forbiddenPatterns: [/^[\s\W]*$/, /^(null|undefined|N\/A)$/i]
    },
    price: {
      minValue: 0,
      maxValue: 1000000,
      validCurrencies: ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'INR', 'CNY', 'BRL', 'MXN', 'KRW', 'SGD', 'HKD', 'THB', 'VND']
    },
    weight: {
      minValue: 0,
      maxValue: 10000, // 10kg max for most consumer products
      units: ['kg', 'g', 'lb', 'oz', 'pounds', 'grams', 'kilograms', 'ounces']
    },
    images: {
      minCount: 1,
      maxCount: 20,
      validFormats: ['jpg', 'jpeg', 'png', 'webp', 'gif']
    }
  };

  // Common data normalization patterns
  private readonly normalizationPatterns = {
    currency: {
      '$': 'USD',
      '£': 'GBP',
      '€': 'EUR',
      '¥': 'JPY',
      '₹': 'INR',
      '₩': 'KRW',
      'C$': 'CAD',
      'A$': 'AUD',
      'S$': 'SGD',
      'HK$': 'HKD',
      '฿': 'THB',
      'R$': 'BRL',
      'MX$': 'MXN',
      '₫': 'VND'
    },
    weight: {
      'kg': { unit: 'kg', multiplier: 1 },
      'kilogram': { unit: 'kg', multiplier: 1 },
      'kilograms': { unit: 'kg', multiplier: 1 },
      'g': { unit: 'kg', multiplier: 0.001 },
      'gram': { unit: 'kg', multiplier: 0.001 },
      'grams': { unit: 'kg', multiplier: 0.001 },
      'lb': { unit: 'kg', multiplier: 0.453592 },
      'lbs': { unit: 'kg', multiplier: 0.453592 },
      'pound': { unit: 'kg', multiplier: 0.453592 },
      'pounds': { unit: 'kg', multiplier: 0.453592 },
      'oz': { unit: 'kg', multiplier: 0.0283495 },
      'ounce': { unit: 'kg', multiplier: 0.0283495 },
      'ounces': { unit: 'kg', multiplier: 0.0283495 }
    }
  };

  private constructor() {}

  static getInstance(): ProductValidationService {
    if (!ProductValidationService.instance) {
      ProductValidationService.instance = new ProductValidationService();
    }
    return ProductValidationService.instance;
  }

  /**
   * Validate scraped product data
   */
  validateProduct(data: ProductData, platform: string, config?: PlatformConfig): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];
    let confidence = 1.0;

    // Title validation
    const titleValidation = this.validateTitle(data.title);
    if (!titleValidation.isValid) {
      errors.push(...titleValidation.errors);
      confidence -= 0.3;
    }
    warnings.push(...titleValidation.warnings);

    // Price validation
    const priceValidation = this.validatePrice(data.price, data.currency);
    if (!priceValidation.isValid) {
      errors.push(...priceValidation.errors);
      confidence -= 0.25;
    }
    warnings.push(...priceValidation.warnings);

    // Weight validation (if present)
    if (data.weight !== undefined) {
      const weightValidation = this.validateWeight(data.weight);
      if (!weightValidation.isValid) {
        warnings.push(...weightValidation.errors);
        confidence -= 0.1;
      }
    }

    // Images validation
    if (data.images && data.images.length > 0) {
      const imagesValidation = this.validateImages(data.images);
      if (!imagesValidation.isValid) {
        warnings.push(...imagesValidation.errors);
        confidence -= 0.15;
      }
    } else {
      warnings.push('No product images found');
      confidence -= 0.1;
    }

    // Platform-specific validation
    if (config) {
      const platformValidation = this.validatePlatformRequirements(data, config);
      if (!platformValidation.isValid) {
        warnings.push(...platformValidation.errors);
        confidence -= 0.05;
      }
    }

    // Generate suggestions based on findings
    suggestions.push(...this.generateSuggestions(data, platform));

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      confidence: Math.max(0, confidence),
      suggestions
    };
  }

  /**
   * Validate product title
   */
  private validateTitle(title?: string): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!title || typeof title !== 'string') {
      errors.push('Product title is missing or invalid');
      return { isValid: false, errors, warnings, confidence: 0, suggestions: [] };
    }

    const trimmedTitle = title.trim();
    
    if (trimmedTitle.length < this.validationRules.title.minLength) {
      errors.push(`Title too short (minimum ${this.validationRules.title.minLength} characters)`);
    }
    
    if (trimmedTitle.length > this.validationRules.title.maxLength) {
      warnings.push(`Title very long (${trimmedTitle.length} characters), may be truncated`);
    }

    // Check for forbidden patterns
    for (const pattern of this.validationRules.title.forbiddenPatterns) {
      if (pattern.test(trimmedTitle)) {
        errors.push('Title contains invalid or placeholder content');
        break;
      }
    }

    // Check for common issues
    if (trimmedTitle.toUpperCase() === trimmedTitle && trimmedTitle.length > 10) {
      warnings.push('Title is all uppercase, may need formatting');
    }

    if (trimmedTitle.includes('  ')) {
      warnings.push('Title contains multiple consecutive spaces');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      confidence: errors.length === 0 ? 1 : 0,
      suggestions: []
    };
  }

  /**
   * Validate product price
   */
  private validatePrice(price?: number, currency?: string): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (price === undefined || price === null) {
      errors.push('Product price is missing');
      return { isValid: false, errors, warnings, confidence: 0, suggestions: [] };
    }

    if (typeof price !== 'number' || isNaN(price)) {
      errors.push('Product price is not a valid number');
      return { isValid: false, errors, warnings, confidence: 0, suggestions: [] };
    }

    if (price < this.validationRules.price.minValue) {
      errors.push('Product price cannot be negative');
    }

    if (price > this.validationRules.price.maxValue) {
      warnings.push('Product price is very high, please verify accuracy');
    }

    if (price === 0) {
      warnings.push('Product price is zero, may be out of stock or free item');
    }

    // Currency validation
    if (currency) {
      if (!this.validationRules.price.validCurrencies.includes(currency.toUpperCase())) {
        warnings.push(`Unusual currency code: ${currency}`);
      }
    } else {
      warnings.push('Currency information is missing');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      confidence: errors.length === 0 ? 1 : 0,
      suggestions: []
    };
  }

  /**
   * Validate product weight
   */
  private validateWeight(weight: number | string): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (weight === undefined || weight === null) {
      return { isValid: true, errors, warnings, confidence: 1, suggestions: [] };
    }

    let numericWeight: number;
    
    if (typeof weight === 'string') {
      // Try to extract numeric value from string
      const weightMatch = weight.match(/(\d+\.?\d*)/);
      if (!weightMatch) {
        errors.push('Cannot extract numeric weight value');
        return { isValid: false, errors, warnings, confidence: 0, suggestions: [] };
      }
      numericWeight = parseFloat(weightMatch[1]);
    } else {
      numericWeight = weight;
    }

    if (numericWeight < this.validationRules.weight.minValue) {
      errors.push('Product weight cannot be negative');
    }

    if (numericWeight > this.validationRules.weight.maxValue) {
      warnings.push('Product weight is very high, please verify accuracy');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      confidence: errors.length === 0 ? 1 : 0,
      suggestions: []
    };
  }

  /**
   * Validate product images
   */
  private validateImages(images: string[]): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!Array.isArray(images)) {
      errors.push('Images field is not an array');
      return { isValid: false, errors, warnings, confidence: 0, suggestions: [] };
    }

    if (images.length < this.validationRules.images.minCount) {
      warnings.push('No product images available');
    }

    if (images.length > this.validationRules.images.maxCount) {
      warnings.push(`Large number of images (${images.length}), may affect performance`);
    }

    // Validate individual image URLs
    let validImageCount = 0;
    for (const imageUrl of images) {
      if (typeof imageUrl !== 'string' || !this.isValidImageUrl(imageUrl)) {
        warnings.push(`Invalid image URL: ${imageUrl}`);
      } else {
        validImageCount++;
      }
    }

    if (validImageCount === 0 && images.length > 0) {
      errors.push('No valid image URLs found');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      confidence: errors.length === 0 ? 1 : 0,
      suggestions: []
    };
  }

  /**
   * Validate platform-specific requirements
   */
  private validatePlatformRequirements(data: ProductData, config: PlatformConfig): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check if required fields are present based on platform config
    const missingFields: string[] = [];
    
    for (const field of config.fields) {
      const fieldValue = (data as any)[field];
      if (fieldValue === undefined || fieldValue === null || fieldValue === '') {
        missingFields.push(field);
      }
    }

    if (missingFields.length > 0) {
      warnings.push(`Missing platform-specific fields: ${missingFields.join(', ')}`);
    }

    // Platform-specific validations
    if (config.fashionFocus) {
      if (!data.brand && !data.title?.toLowerCase().includes('brand')) {
        warnings.push('Fashion item missing brand information');
      }
    }

    if (config.luxuryFocus) {
      if (data.price && data.price < 100) {
        warnings.push('Luxury item has unusually low price');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      confidence: errors.length === 0 ? 1 : 0,
      suggestions: []
    };
  }

  /**
   * Generate improvement suggestions
   */
  private generateSuggestions(data: ProductData, platform: string): string[] {
    const suggestions: string[] = [];

    // Title suggestions
    if (data.title) {
      if (data.title.toUpperCase() === data.title) {
        suggestions.push('Consider normalizing title capitalization');
      }
      
      if (data.title.length > 100) {
        suggestions.push('Consider shortening title for better display');
      }
    }

    // Price suggestions
    if (data.price && !data.currency) {
      suggestions.push('Add currency information for better price display');
    }

    // Weight suggestions
    if (!data.weight && ['amazon', 'walmart', 'bestbuy'].includes(platform)) {
      suggestions.push('Weight information would improve shipping calculations');
    }

    // Image suggestions
    if (!data.images || data.images.length === 0) {
      suggestions.push('Add product images to improve user experience');
    } else if (data.images.length === 1) {
      suggestions.push('Multiple images would provide better product view');
    }

    // Brand suggestions
    if (!data.brand && data.title && !data.title.toLowerCase().includes('generic')) {
      suggestions.push('Brand information would enhance product categorization');
    }

    return suggestions;
  }

  /**
   * Enhance product data with normalization and improvements
   */
  enhanceProduct(data: ProductData, options: EnhancementOptions = {}): ProductEnhancement {
    const enhancedData = { ...data };
    const enhancements: string[] = [];
    let qualityScore = 0.5; // Base score

    // Title normalization
    if (options.normalizeTitle !== false && enhancedData.title) {
      const originalTitle = enhancedData.title;
      enhancedData.title = this.normalizeTitle(enhancedData.title);
      if (enhancedData.title !== originalTitle) {
        enhancements.push('Normalized title capitalization and spacing');
        qualityScore += 0.1;
      }
    }

    // Currency standardization
    if (options.standardizeCurrency !== false) {
      if (enhancedData.currency && enhancedData.currency in this.normalizationPatterns.currency) {
        const originalCurrency = enhancedData.currency;
        enhancedData.currency = this.normalizationPatterns.currency[enhancedData.currency as keyof typeof this.normalizationPatterns.currency];
        if (enhancedData.currency !== originalCurrency) {
          enhancements.push(`Standardized currency from ${originalCurrency} to ${enhancedData.currency}`);
          qualityScore += 0.1;
        }
      }
    }

    // Weight validation and normalization
    if (options.validateWeight !== false && enhancedData.weight) {
      const normalizedWeight = this.normalizeWeight(enhancedData.weight);
      if (normalizedWeight !== null && normalizedWeight !== enhancedData.weight) {
        enhancedData.weight = normalizedWeight;
        enhancements.push('Normalized weight to kilograms');
        qualityScore += 0.1;
      }
    }

    // Image enhancement
    if (options.enhanceImages !== false && enhancedData.images) {
      const originalImageCount = enhancedData.images.length;
      enhancedData.images = this.enhanceImages(enhancedData.images);
      if (enhancedData.images.length !== originalImageCount) {
        enhancements.push(`Filtered invalid images (${originalImageCount} → ${enhancedData.images.length})`);
        qualityScore += 0.05;
      }
    }

    // Quality score adjustments based on data completeness
    if (enhancedData.title && enhancedData.title.length >= 10) qualityScore += 0.15;
    if (enhancedData.price && enhancedData.price > 0) qualityScore += 0.15;
    if (enhancedData.currency) qualityScore += 0.05;
    if (enhancedData.images && enhancedData.images.length > 0) qualityScore += 0.1;
    if (enhancedData.weight) qualityScore += 0.05;
    if (enhancedData.brand) qualityScore += 0.05;

    return {
      originalData: data,
      enhancedData,
      enhancements,
      qualityScore: Math.min(1, qualityScore)
    };
  }

  /**
   * Normalize product title
   */
  private normalizeTitle(title: string): string {
    return title
      .trim()
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .replace(/([a-z])([A-Z])/g, '$1 $2') // Add space between camelCase
      .split(' ')
      .map(word => {
        // Don't change all caps words (likely acronyms)
        if (word === word.toUpperCase() && word.length > 1) return word;
        // Capitalize first letter, lowercase rest
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      })
      .join(' ');
  }

  /**
   * Normalize weight to kilograms
   */
  private normalizeWeight(weight: number | string): number | null {
    if (typeof weight === 'number') {
      return weight > 0 ? weight : null;
    }

    const weightStr = weight.toString().toLowerCase().trim();
    const weightMatch = weightStr.match(/(\d+\.?\d*)\s*([a-z]+)/);
    
    if (!weightMatch) return null;
    
    const value = parseFloat(weightMatch[1]);
    const unit = weightMatch[2];
    
    const unitConversion = this.normalizationPatterns.weight[unit as keyof typeof this.normalizationPatterns.weight];
    if (unitConversion) {
      return value * unitConversion.multiplier;
    }
    
    return null;
  }

  /**
   * Enhance and filter image URLs
   */
  private enhanceImages(images: string[]): string[] {
    return images.filter(imageUrl => this.isValidImageUrl(imageUrl));
  }

  /**
   * Check if image URL is valid
   */
  private isValidImageUrl(url: string): boolean {
    if (typeof url !== 'string' || !url.trim()) return false;
    
    try {
      const urlObj = new URL(url);
      
      // Check for valid protocol
      if (!['http:', 'https:'].includes(urlObj.protocol)) return false;
      
      // Check for valid image file extension
      const pathname = urlObj.pathname.toLowerCase();
      const hasValidExtension = this.validationRules.images.validFormats.some(format => 
        pathname.includes(`.${format}`)
      );
      
      // Also accept URLs that might be image endpoints without extensions
      const looksLikeImageUrl = pathname.includes('image') || 
                               pathname.includes('img') || 
                               pathname.includes('photo') ||
                               pathname.includes('picture') ||
                               hasValidExtension;
      
      return looksLikeImageUrl;
    } catch {
      return false;
    }
  }

  /**
   * Calculate overall data quality score
   */
  calculateQualityScore(data: ProductData, validationResult: ValidationResult): number {
    let score = validationResult.confidence;
    
    // Bonus points for completeness
    if (data.title && data.title.length >= 10) score += 0.1;
    if (data.price && data.price > 0) score += 0.1;
    if (data.currency) score += 0.05;
    if (data.images && data.images.length > 0) score += 0.1;
    if (data.weight) score += 0.05;
    if (data.brand) score += 0.05;
    if (data.description && data.description.length >= 20) score += 0.05;
    
    // Penalty for warnings
    score -= validationResult.warnings.length * 0.02;
    
    return Math.max(0, Math.min(1, score));
  }
}