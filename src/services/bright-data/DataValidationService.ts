/**
 * Data Validation Service
 * Handles product data validation, sanitization, and quality checks
 */

import { logger } from '@/utils/logger';
import { ProductData } from './ProductScrapingEngine';

export interface ValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  sanitizedData: ProductData;
  quality: {
    score: number; // 0-100
    completeness: number; // 0-100
    confidence: number; // 0-100
  };
}

export interface ValidationOptions {
  requireImages?: boolean;
  requireWeight?: boolean;
  requireBrand?: boolean;
  requireDescription?: boolean;
  minPriceThreshold?: number;
  maxPriceThreshold?: number;
  allowedCurrencies?: string[];
  strictMode?: boolean;
}

export class DataValidationService {
  private readonly defaultOptions: ValidationOptions = {
    requireImages: false,
    requireWeight: false,
    requireBrand: false,
    requireDescription: false,
    minPriceThreshold: 0.01,
    maxPriceThreshold: 100000,
    allowedCurrencies: ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'INR', 'JPY', 'CNY', 'KRW'],
    strictMode: false
  };

  /**
   * Validate and sanitize product data
   */
  validateProductData(data: ProductData, options: ValidationOptions = {}): ValidationResult {
    const opts = { ...this.defaultOptions, ...options };
    const errors: ValidationError[] = [];
    let sanitizedData = { ...data };

    try {
      // Core field validation
      this.validateTitle(sanitizedData, errors, opts);
      this.validatePrice(sanitizedData, errors, opts);
      this.validateCurrency(sanitizedData, errors, opts);
      this.validateImages(sanitizedData, errors, opts);
      this.validateWeight(sanitizedData, errors, opts);
      this.validateCategory(sanitizedData, errors, opts);
      this.validateAvailability(sanitizedData, errors, opts);
      this.validateBrand(sanitizedData, errors, opts);
      this.validateDescription(sanitizedData, errors, opts);
      this.validateVariants(sanitizedData, errors, opts);
      this.validateReviews(sanitizedData, errors, opts);
      this.validateSpecifications(sanitizedData, errors, opts);

      // Sanitize data
      sanitizedData = this.sanitizeData(sanitizedData);

      // Calculate quality metrics
      const quality = this.calculateQualityMetrics(sanitizedData, errors);

      // Determine if data is valid
      const criticalErrors = errors.filter(e => e.severity === 'error');
      const isValid = criticalErrors.length === 0;

      return {
        isValid,
        errors,
        sanitizedData,
        quality
      };

    } catch (error) {
      logger.error('Data validation error:', error);
      errors.push({
        field: 'general',
        message: 'Validation process failed',
        severity: 'error'
      });

      return {
        isValid: false,
        errors,
        sanitizedData: data,
        quality: { score: 0, completeness: 0, confidence: 0 }
      };
    }
  }

  /**
   * Validate product title
   */
  private validateTitle(data: ProductData, errors: ValidationError[], options: ValidationOptions): void {
    if (!data.title || typeof data.title !== 'string') {
      errors.push({
        field: 'title',
        message: 'Product title is required and must be a string',
        severity: 'error'
      });
      data.title = 'Unknown Product';
      return;
    }

    // Clean and validate title
    data.title = data.title.trim();

    if (data.title.length === 0) {
      errors.push({
        field: 'title',
        message: 'Product title cannot be empty',
        severity: 'error'
      });
      data.title = 'Unknown Product';
    } else if (data.title.length < 3) {
      errors.push({
        field: 'title',
        message: 'Product title is too short (minimum 3 characters)',
        severity: 'warning'
      });
    } else if (data.title.length > 200) {
      errors.push({
        field: 'title',
        message: 'Product title is too long (maximum 200 characters)',
        severity: 'warning'
      });
      data.title = data.title.substring(0, 200).trim();
    }

    // Check for suspicious content
    if (this.containsSuspiciousContent(data.title)) {
      errors.push({
        field: 'title',
        message: 'Product title contains suspicious content',
        severity: 'warning'
      });
    }
  }

  /**
   * Validate product price
   */
  private validatePrice(data: ProductData, errors: ValidationError[], options: ValidationOptions): void {
    if (typeof data.price !== 'number') {
      errors.push({
        field: 'price',
        message: 'Product price must be a number',
        severity: 'error'
      });
      data.price = 0;
      return;
    }

    if (data.price < 0) {
      errors.push({
        field: 'price',
        message: 'Product price cannot be negative',
        severity: 'error'
      });
      data.price = 0;
    } else if (data.price === 0) {
      errors.push({
        field: 'price',
        message: 'Product price is zero - may indicate pricing error',
        severity: 'warning'
      });
    } else if (data.price < (options.minPriceThreshold || 0.01)) {
      errors.push({
        field: 'price',
        message: `Product price is below minimum threshold (${options.minPriceThreshold})`,
        severity: 'warning'
      });
    } else if (data.price > (options.maxPriceThreshold || 100000)) {
      errors.push({
        field: 'price',
        message: `Product price exceeds maximum threshold (${options.maxPriceThreshold})`,
        severity: 'warning'
      });
    }

    // Round to 2 decimal places
    data.price = Math.round(data.price * 100) / 100;
  }

  /**
   * Validate currency
   */
  private validateCurrency(data: ProductData, errors: ValidationError[], options: ValidationOptions): void {
    if (!data.currency || typeof data.currency !== 'string') {
      errors.push({
        field: 'currency',
        message: 'Currency is required and must be a string',
        severity: 'error'
      });
      data.currency = 'USD';
      return;
    }

    data.currency = data.currency.toUpperCase().trim();

    if (data.currency.length !== 3) {
      errors.push({
        field: 'currency',
        message: 'Currency must be a 3-letter ISO code',
        severity: 'error'
      });
      data.currency = 'USD';
    } else if (options.allowedCurrencies && !options.allowedCurrencies.includes(data.currency)) {
      errors.push({
        field: 'currency',
        message: `Currency ${data.currency} is not in allowed currencies list`,
        severity: 'warning'
      });
    }

    // Validate currency format
    if (!/^[A-Z]{3}$/.test(data.currency)) {
      errors.push({
        field: 'currency',
        message: 'Currency must contain only uppercase letters',
        severity: 'error'
      });
      data.currency = 'USD';
    }
  }

  /**
   * Validate product images
   */
  private validateImages(data: ProductData, errors: ValidationError[], options: ValidationOptions): void {
    if (!Array.isArray(data.images)) {
      errors.push({
        field: 'images',
        message: 'Images must be an array',
        severity: 'error'
      });
      data.images = [];
      return;
    }

    // Filter and validate image URLs
    data.images = data.images
      .filter((img): img is string => typeof img === 'string' && img.trim().length > 0)
      .map(img => img.trim())
      .filter(img => this.isValidImageUrl(img))
      .slice(0, 10); // Limit to 10 images

    if (options.requireImages && data.images.length === 0) {
      errors.push({
        field: 'images',
        message: 'At least one valid image is required',
        severity: 'error'
      });
    } else if (data.images.length === 0) {
      errors.push({
        field: 'images',
        message: 'No valid images found',
        severity: 'warning'
      });
    }

    // Check for duplicate images
    const uniqueImages = [...new Set(data.images)];
    if (uniqueImages.length !== data.images.length) {
      errors.push({
        field: 'images',
        message: 'Duplicate images found and removed',
        severity: 'info'
      });
      data.images = uniqueImages;
    }
  }

  /**
   * Validate product weight
   */
  private validateWeight(data: ProductData, errors: ValidationError[], options: ValidationOptions): void {
    if (data.weight !== undefined) {
      if (typeof data.weight !== 'number') {
        errors.push({
          field: 'weight',
          message: 'Weight must be a number',
          severity: 'error'
        });
        delete data.weight;
        return;
      }

      if (data.weight < 0) {
        errors.push({
          field: 'weight',
          message: 'Weight cannot be negative',
          severity: 'error'
        });
        delete data.weight;
      } else if (data.weight === 0) {
        errors.push({
          field: 'weight',
          message: 'Weight is zero - may indicate estimation error',
          severity: 'warning'
        });
      } else if (data.weight > 1000) {
        errors.push({
          field: 'weight',
          message: 'Weight seems unusually high (>1000kg)',
          severity: 'warning'
        });
      }

      // Round weight to 3 decimal places
      if (data.weight !== undefined) {
        data.weight = Math.round(data.weight * 1000) / 1000;
      }
    } else if (options.requireWeight) {
      errors.push({
        field: 'weight',
        message: 'Weight is required but not provided',
        severity: 'error'
      });
    }

    // Validate weight unit if provided
    if (data.weight_unit && typeof data.weight_unit === 'string') {
      const validUnits = ['kg', 'lbs', 'g', 'oz'];
      if (!validUnits.includes(data.weight_unit.toLowerCase())) {
        errors.push({
          field: 'weight_unit',
          message: `Invalid weight unit: ${data.weight_unit}`,
          severity: 'warning'
        });
      }
    }
  }

  /**
   * Validate product category
   */
  private validateCategory(data: ProductData, errors: ValidationError[], options: ValidationOptions): void {
    if (!data.category || typeof data.category !== 'string') {
      errors.push({
        field: 'category',
        message: 'Category is required and must be a string',
        severity: 'error'
      });
      data.category = 'general';
      return;
    }

    data.category = data.category.trim().toLowerCase();

    if (data.category.length === 0) {
      errors.push({
        field: 'category',
        message: 'Category cannot be empty',
        severity: 'error'
      });
      data.category = 'general';
    }

    // Validate against known categories
    const validCategories = [
      'electronics', 'fashion', 'home', 'books', 'toys', 'sports', 'beauty', 'health',
      'automotive', 'jewelry', 'footwear', 'bags', 'watches', 'art', 'crafts',
      'luxury-fashion', 'luxury-bags', 'luxury-accessories', 'general'
    ];

    if (!validCategories.includes(data.category)) {
      errors.push({
        field: 'category',
        message: `Unknown category: ${data.category}`,
        severity: 'info'
      });
      data.category = 'general';
    }
  }

  /**
   * Validate product availability
   */
  private validateAvailability(data: ProductData, errors: ValidationError[], options: ValidationOptions): void {
    const validAvailability = ['in-stock', 'out-of-stock', 'unknown'];

    if (!data.availability || !validAvailability.includes(data.availability)) {
      errors.push({
        field: 'availability',
        message: 'Invalid availability status',
        severity: 'warning'
      });
      data.availability = 'unknown';
    }
  }

  /**
   * Validate brand
   */
  private validateBrand(data: ProductData, errors: ValidationError[], options: ValidationOptions): void {
    if (data.brand !== undefined) {
      if (typeof data.brand !== 'string') {
        errors.push({
          field: 'brand',
          message: 'Brand must be a string',
          severity: 'warning'
        });
        delete data.brand;
        return;
      }

      data.brand = data.brand.trim();

      if (data.brand.length === 0) {
        delete data.brand;
      } else if (data.brand.length > 100) {
        errors.push({
          field: 'brand',
          message: 'Brand name is too long (maximum 100 characters)',
          severity: 'warning'
        });
        data.brand = data.brand.substring(0, 100).trim();
      }
    } else if (options.requireBrand) {
      errors.push({
        field: 'brand',
        message: 'Brand is required but not provided',
        severity: 'error'
      });
    }
  }

  /**
   * Validate description
   */
  private validateDescription(data: ProductData, errors: ValidationError[], options: ValidationOptions): void {
    if (data.description !== undefined) {
      if (typeof data.description !== 'string') {
        errors.push({
          field: 'description',
          message: 'Description must be a string',
          severity: 'warning'
        });
        delete data.description;
        return;
      }

      data.description = data.description.trim();

      if (data.description.length === 0) {
        delete data.description;
      } else if (data.description.length > 5000) {
        errors.push({
          field: 'description',
          message: 'Description is too long (maximum 5000 characters)',
          severity: 'warning'
        });
        data.description = data.description.substring(0, 5000).trim();
      }

      // Check for suspicious content
      if (data.description && this.containsSuspiciousContent(data.description)) {
        errors.push({
          field: 'description',
          message: 'Description contains suspicious content',
          severity: 'warning'
        });
      }
    } else if (options.requireDescription) {
      errors.push({
        field: 'description',
        message: 'Description is required but not provided',
        severity: 'error'
      });
    }
  }

  /**
   * Validate variants
   */
  private validateVariants(data: ProductData, errors: ValidationError[], options: ValidationOptions): void {
    if (data.variants !== undefined) {
      if (!Array.isArray(data.variants)) {
        errors.push({
          field: 'variants',
          message: 'Variants must be an array',
          severity: 'warning'
        });
        delete data.variants;
        return;
      }

      data.variants = data.variants
        .filter(variant => variant && typeof variant === 'object')
        .map(variant => ({
          name: typeof variant.name === 'string' ? variant.name.trim() : 'Variant',
          options: Array.isArray(variant.options) 
            ? variant.options.filter(opt => typeof opt === 'string' && opt.trim().length > 0)
            : []
        }))
        .filter(variant => variant.options.length > 0)
        .slice(0, 5); // Limit to 5 variant types

      if (data.variants.length === 0) {
        delete data.variants;
      }
    }
  }

  /**
   * Validate reviews
   */
  private validateReviews(data: ProductData, errors: ValidationError[], options: ValidationOptions): void {
    if (data.reviews !== undefined) {
      if (typeof data.reviews !== 'object' || data.reviews === null) {
        errors.push({
          field: 'reviews',
          message: 'Reviews must be an object',
          severity: 'warning'
        });
        delete data.reviews;
        return;
      }

      // Validate rating
      if (typeof data.reviews.rating !== 'number' || data.reviews.rating < 0 || data.reviews.rating > 5) {
        errors.push({
          field: 'reviews.rating',
          message: 'Review rating must be a number between 0 and 5',
          severity: 'warning'
        });
        delete data.reviews;
        return;
      }

      // Validate count
      if (typeof data.reviews.count !== 'number' || data.reviews.count < 0) {
        errors.push({
          field: 'reviews.count',
          message: 'Review count must be a non-negative number',
          severity: 'warning'
        });
        delete data.reviews;
        return;
      }

      // Round rating to 1 decimal place
      data.reviews.rating = Math.round(data.reviews.rating * 10) / 10;
    }
  }

  /**
   * Validate specifications
   */
  private validateSpecifications(data: ProductData, errors: ValidationError[], options: ValidationOptions): void {
    if (data.specifications !== undefined) {
      if (typeof data.specifications !== 'object' || data.specifications === null || Array.isArray(data.specifications)) {
        errors.push({
          field: 'specifications',
          message: 'Specifications must be an object',
          severity: 'info'
        });
        delete data.specifications;
        return;
      }

      // Clean up specifications object
      const cleanSpecs: Record<string, any> = {};
      for (const [key, value] of Object.entries(data.specifications)) {
        if (typeof key === 'string' && key.trim().length > 0) {
          const cleanKey = key.trim();
          if (value !== null && value !== undefined && value !== '') {
            cleanSpecs[cleanKey] = value;
          }
        }
      }

      if (Object.keys(cleanSpecs).length === 0) {
        delete data.specifications;
      } else {
        data.specifications = cleanSpecs;
      }
    }
  }

  /**
   * Sanitize product data
   */
  private sanitizeData(data: ProductData): ProductData {
    // Remove any potential script tags or harmful content
    if (data.title) {
      data.title = this.sanitizeHtml(data.title);
    }

    if (data.description) {
      data.description = this.sanitizeHtml(data.description);
    }

    if (data.brand) {
      data.brand = this.sanitizeHtml(data.brand);
    }

    // Sanitize image URLs
    data.images = data.images.map(img => this.sanitizeUrl(img));

    return data;
  }

  /**
   * Calculate quality metrics for product data
   */
  private calculateQualityMetrics(data: ProductData, errors: ValidationError[]): {
    score: number;
    completeness: number;
    confidence: number;
  } {
    let completeness = 0;
    let confidence = 100;

    // Calculate completeness score
    const fields = [
      { field: 'title', weight: 20, present: !!data.title },
      { field: 'price', weight: 20, present: data.price > 0 },
      { field: 'currency', weight: 10, present: !!data.currency },
      { field: 'images', weight: 15, present: data.images.length > 0 },
      { field: 'brand', weight: 10, present: !!data.brand },
      { field: 'category', weight: 10, present: !!data.category },
      { field: 'description', weight: 10, present: !!data.description },
      { field: 'weight', weight: 5, present: !!data.weight }
    ];

    completeness = fields.reduce((sum, field) => {
      return sum + (field.present ? field.weight : 0);
    }, 0);

    // Adjust confidence based on errors
    const errorPenalties = {
      error: -20,
      warning: -5,
      info: -1
    };

    errors.forEach(error => {
      confidence += errorPenalties[error.severity];
    });

    // Ensure values are within bounds
    completeness = Math.max(0, Math.min(100, completeness));
    confidence = Math.max(0, Math.min(100, confidence));

    // Calculate overall score
    const score = Math.round((completeness * 0.6 + confidence * 0.4));

    return { score, completeness, confidence };
  }

  /**
   * Helper methods
   */
  private isValidImageUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      const validProtocols = ['http:', 'https:'];
      const validExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];
      
      if (!validProtocols.includes(urlObj.protocol)) {
        return false;
      }

      const pathname = urlObj.pathname.toLowerCase();
      const hasValidExtension = validExtensions.some(ext => pathname.includes(ext));
      const hasImagePath = pathname.includes('image') || pathname.includes('img') || pathname.includes('photo');
      
      return hasValidExtension || hasImagePath;
    } catch {
      return false;
    }
  }

  private containsSuspiciousContent(text: string): boolean {
    const suspiciousPatterns = [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /javascript:/gi,
      /onclick\s*=/gi,
      /onload\s*=/gi,
      /eval\s*\(/gi,
      /document\.cookie/gi,
      /window\.location/gi
    ];

    return suspiciousPatterns.some(pattern => pattern.test(text));
  }

  private sanitizeHtml(text: string): string {
    return text
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<[^>]*>/g, '')
      .replace(/javascript:/gi, '')
      .trim();
  }

  private sanitizeUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      return urlObj.href;
    } catch {
      return '';
    }
  }

  /**
   * Quick validation for basic requirements
   */
  quickValidate(data: ProductData): boolean {
    return !!(
      data.title && 
      data.title.trim().length > 0 &&
      typeof data.price === 'number' && 
      data.price >= 0 &&
      data.currency && 
      data.currency.length === 3 &&
      data.category &&
      ['in-stock', 'out-of-stock', 'unknown'].includes(data.availability)
    );
  }

  /**
   * Get validation summary
   */
  getValidationSummary(result: ValidationResult): string {
    const { isValid, errors, quality } = result;
    
    const errorCount = errors.filter(e => e.severity === 'error').length;
    const warningCount = errors.filter(e => e.severity === 'warning').length;
    
    let summary = `Status: ${isValid ? 'Valid' : 'Invalid'} | `;
    summary += `Quality: ${quality.score}/100 | `;
    summary += `Completeness: ${quality.completeness}% | `;
    
    if (errorCount > 0) {
      summary += `Errors: ${errorCount} | `;
    }
    if (warningCount > 0) {
      summary += `Warnings: ${warningCount} | `;
    }
    
    return summary.trim().replace(/\|$/, '');
  }
}

// Export singleton instance
export const dataValidationService = new DataValidationService();