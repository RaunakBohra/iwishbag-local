/**
 * Product Validation Service
 * Data validation, enrichment, and quality control for scraped products
 * Decomposed from BrightDataProductService for better separation of concerns
 */

import { logger } from '@/utils/logger';
import { ProductData } from '../ProductDataFetchService';
import { SupportedPlatform } from './PlatformDetectionService';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  score: number; // 0-100 quality score
  enrichments: string[];
}

export interface ValidationOptions {
  strict?: boolean;
  enrichData?: boolean;
  checkDuplicates?: boolean;
  validateImages?: boolean;
  estimateMissingData?: boolean;
}

export interface QualityMetrics {
  completeness: number; // 0-100
  accuracy: number; // 0-100
  freshness: number; // 0-100
  reliability: number; // 0-100
}

export interface EnrichmentSuggestion {
  field: keyof ProductData;
  currentValue: any;
  suggestedValue: any;
  confidence: number; // 0-100
  reason: string;
}

export class ProductValidationService {
  private cache = new Map<string, ValidationResult>();
  private readonly CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

  // Required fields by platform
  private readonly REQUIRED_FIELDS: Record<SupportedPlatform, (keyof ProductData)[]> = {
    amazon: ['title', 'price', 'currency', 'images', 'availability'],
    ebay: ['title', 'price', 'currency', 'availability'],
    walmart: ['title', 'price', 'currency', 'images'],
    bestbuy: ['title', 'price', 'currency', 'brand'],
    target: ['title', 'price', 'currency', 'category'],
    etsy: ['title', 'price', 'currency', 'images', 'brand'],
    ae: ['title', 'price', 'currency', 'category'],
    myntra: ['title', 'price', 'currency', 'images', 'brand'],
    hm: ['title', 'price', 'currency', 'category'],
    asos: ['title', 'price', 'currency', 'category'],
    zara: ['title', 'price', 'currency', 'category'],
    lego: ['title', 'price', 'currency', 'images', 'brand'],
    hermes: ['title', 'price', 'currency', 'category'],
    flipkart: ['title', 'price', 'currency', 'images', 'brand'],
    toysrus: ['title', 'price', 'currency', 'images', 'category'],
    carters: ['title', 'price', 'currency', 'category'],
    prada: ['title', 'price', 'currency', 'category'],
    ysl: ['title', 'price', 'currency', 'category'],
    balenciaga: ['title', 'price', 'currency', 'category'],
    dior: ['title', 'price', 'currency', 'category'],
    chanel: ['title', 'price', 'currency', 'category'],
    aliexpress: ['title', 'price', 'currency'],
    alibaba: ['title', 'price', 'currency'],
    dhgate: ['title', 'price', 'currency'],
    wish: ['title', 'price', 'currency'],
    shein: ['title', 'price', 'currency', 'category'],
    romwe: ['title', 'price', 'currency', 'category'],
    nordstrom: ['title', 'price', 'currency', 'brand'],
    macys: ['title', 'price', 'currency', 'brand'],
    bloomingdales: ['title', 'price', 'currency', 'brand'],
    saks: ['title', 'price', 'currency', 'brand'],
    neimanmarcus: ['title', 'price', 'currency', 'brand'],
  };

  // Suspicious patterns that might indicate low-quality data
  private readonly SUSPICIOUS_PATTERNS = [
    /lorem ipsum/i,
    /test product/i,
    /sample item/i,
    /dummy data/i,
    /placeholder/i,
    /^(title|name|product)$/i,
    /^\d+$/,
    /^[^a-zA-Z]*$/,
  ];

  // Common weight ranges by category (in kg)
  private readonly WEIGHT_RANGES: Record<string, { min: number; max: number }> = {
    'electronics': { min: 0.05, max: 50 },
    'fashion': { min: 0.05, max: 3 },
    'books': { min: 0.1, max: 5 },
    'toys': { min: 0.05, max: 10 },
    'home': { min: 0.1, max: 100 },
    'beauty-health': { min: 0.01, max: 2 },
    'luxury-bags': { min: 0.2, max: 3 },
    'luxury-footwear': { min: 0.3, max: 2 },
    'luxury-jewelry': { min: 0.01, max: 1 },
    'baby-clothing': { min: 0.02, max: 0.5 },
  };

  constructor() {
    logger.info('ProductValidationService initialized');
  }

  /**
   * Validate product data comprehensively
   */
  validateProduct(
    product: ProductData,
    platform: SupportedPlatform,
    options: ValidationOptions = {}
  ): ValidationResult {
    try {
      const cacheKey = this.getCacheKey(product, platform, options);
      const cached = this.getFromCache(cacheKey);
      if (cached) return cached;

      const errors: string[] = [];
      const warnings: string[] = [];
      const enrichments: string[] = [];
      let score = 100;

      // 1. Required fields validation
      const requiredFieldsResult = this.validateRequiredFields(product, platform);
      errors.push(...requiredFieldsResult.errors);
      warnings.push(...requiredFieldsResult.warnings);
      score -= requiredFieldsResult.penalty;

      // 2. Data type validation
      const dataTypesResult = this.validateDataTypes(product);
      errors.push(...dataTypesResult.errors);
      warnings.push(...dataTypesResult.warnings);
      score -= dataTypesResult.penalty;

      // 3. Value validation
      const valuesResult = this.validateValues(product, platform);
      errors.push(...valuesResult.errors);
      warnings.push(...valuesResult.warnings);
      score -= valuesResult.penalty;

      // 4. Content quality validation
      const qualityResult = this.validateContentQuality(product);
      warnings.push(...qualityResult.warnings);
      score -= qualityResult.penalty;

      // 5. Image validation (if requested)
      if (options.validateImages && product.images?.length) {
        const imageResult = this.validateImages(product.images);
        warnings.push(...imageResult.warnings);
        score -= imageResult.penalty;
      }

      // 6. Data enrichment (if requested)
      if (options.enrichData) {
        const enrichmentResult = this.enrichProductData(product, platform);
        enrichments.push(...enrichmentResult.enrichments);
        
        // Apply enrichments to improve score
        if (enrichmentResult.enrichments.length > 0) {
          score += Math.min(10, enrichmentResult.enrichments.length * 2);
        }
      }

      // 7. Duplicate detection (if requested)
      if (options.checkDuplicates) {
        const duplicateResult = this.checkForDuplicates(product);
        if (duplicateResult.isDuplicate) {
          warnings.push(`Potential duplicate product detected: ${duplicateResult.reason}`);
          score -= 5;
        }
      }

      // Ensure score stays within bounds
      score = Math.max(0, Math.min(100, score));

      const result: ValidationResult = {
        isValid: errors.length === 0,
        errors,
        warnings,
        score,
        enrichments,
      };

      this.setCache(cacheKey, result);
      return result;

    } catch (error) {
      logger.error('Product validation failed:', error);
      return {
        isValid: false,
        errors: [`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`],
        warnings: [],
        score: 0,
        enrichments: [],
      };
    }
  }

  /**
   * Calculate quality metrics for product data
   */
  calculateQualityMetrics(product: ProductData, platform: SupportedPlatform): QualityMetrics {
    const requiredFields = this.REQUIRED_FIELDS[platform] || [];
    const totalFields = Object.keys(product).length;
    const filledFields = Object.values(product).filter(value => 
      value !== null && value !== undefined && value !== ''
    ).length;

    // Completeness: percentage of non-empty fields
    const completeness = (filledFields / totalFields) * 100;

    // Accuracy: based on data validation score
    const validation = this.validateProduct(product, platform, { strict: true });
    const accuracy = validation.score;

    // Freshness: always 100 for newly scraped data
    const freshness = 100;

    // Reliability: based on platform and data quality
    const platformReliability = this.getPlatformReliability(platform);
    const dataQuality = this.assessDataQuality(product);
    const reliability = (platformReliability + dataQuality) / 2;

    return {
      completeness: Math.round(completeness),
      accuracy: Math.round(accuracy),
      freshness: Math.round(freshness),
      reliability: Math.round(reliability),
    };
  }

  /**
   * Get enrichment suggestions for incomplete data
   */
  getEnrichmentSuggestions(product: ProductData, platform: SupportedPlatform): EnrichmentSuggestion[] {
    const suggestions: EnrichmentSuggestion[] = [];

    // Suggest missing brand from title
    if (!product.brand && product.title) {
      const suggestedBrand = this.extractBrandFromTitle(product.title);
      if (suggestedBrand) {
        suggestions.push({
          field: 'brand',
          currentValue: undefined,
          suggestedValue: suggestedBrand,
          confidence: 70,
          reason: 'Extracted from product title',
        });
      }
    }

    // Suggest missing category
    if (!product.category && product.title) {
      const suggestedCategory = this.inferCategory(product.title, platform);
      if (suggestedCategory) {
        suggestions.push({
          field: 'category',
          currentValue: undefined,
          suggestedValue: suggestedCategory,
          confidence: 80,
          reason: 'Inferred from product title and platform',
        });
      }
    }

    // Suggest missing weight
    if (!product.weight && product.category) {
      const suggestedWeight = this.estimateWeight(product.title || '', product.category);
      if (suggestedWeight > 0) {
        suggestions.push({
          field: 'weight',
          currentValue: undefined,
          suggestedValue: suggestedWeight,
          confidence: 60,
          reason: 'Estimated based on category and title',
        });
      }
    }

    // Suggest availability if missing
    if (!product.availability) {
      suggestions.push({
        field: 'availability',
        currentValue: undefined,
        suggestedValue: 'unknown',
        confidence: 50,
        reason: 'Default fallback value',
      });
    }

    return suggestions.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Validate specific field types and patterns
   */
  validateField(field: keyof ProductData, value: any, platform: SupportedPlatform): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    let score = 100;

    switch (field) {
      case 'title':
        if (typeof value !== 'string' || value.trim().length === 0) {
          errors.push('Title must be a non-empty string');
          score = 0;
        } else if (value.length < 3) {
          warnings.push('Title is very short');
          score -= 20;
        } else if (value.length > 500) {
          warnings.push('Title is very long');
          score -= 10;
        }
        break;

      case 'price':
        if (typeof value !== 'number' || value < 0) {
          errors.push('Price must be a positive number');
          score = 0;
        } else if (value === 0) {
          warnings.push('Price is zero');
          score -= 30;
        } else if (value > 100000) {
          warnings.push('Price is unusually high');
          score -= 10;
        }
        break;

      case 'currency':
        if (typeof value !== 'string' || !/^[A-Z]{3}$/.test(value)) {
          errors.push('Currency must be a 3-letter code (e.g., USD)');
          score = 0;
        }
        break;

      case 'weight':
        if (value !== undefined && (typeof value !== 'number' || value <= 0)) {
          errors.push('Weight must be a positive number');
          score -= 20;
        }
        break;

      case 'images':
        if (!Array.isArray(value)) {
          errors.push('Images must be an array');
          score -= 30;
        } else if (value.length === 0) {
          warnings.push('No images provided');
          score -= 20;
        }
        break;

      case 'availability':
        const validAvailability = ['in_stock', 'out_of_stock', 'unknown'];
        if (value && !validAvailability.includes(value)) {
          errors.push(`Availability must be one of: ${validAvailability.join(', ')}`);
          score -= 15;
        }
        break;
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      score: Math.max(0, score),
      enrichments: [],
    };
  }

  /**
   * Private validation methods
   */
  private validateRequiredFields(product: ProductData, platform: SupportedPlatform): {
    errors: string[];
    warnings: string[];
    penalty: number;
  } {
    const errors: string[] = [];
    const warnings: string[] = [];
    let penalty = 0;

    const requiredFields = this.REQUIRED_FIELDS[platform] || ['title', 'price', 'currency'];

    for (const field of requiredFields) {
      const value = product[field];
      
      if (value === null || value === undefined || value === '') {
        errors.push(`Missing required field: ${field}`);
        penalty += 20;
      } else if (Array.isArray(value) && value.length === 0) {
        errors.push(`Required array field is empty: ${field}`);
        penalty += 15;
      }
    }

    return { errors, warnings, penalty };
  }

  private validateDataTypes(product: ProductData): {
    errors: string[];
    warnings: string[];
    penalty: number;
  } {
    const errors: string[] = [];
    const warnings: string[] = [];
    let penalty = 0;

    // Type validations
    if (product.title && typeof product.title !== 'string') {
      errors.push('Title must be a string');
      penalty += 15;
    }

    if (product.price && typeof product.price !== 'number') {
      errors.push('Price must be a number');
      penalty += 20;
    }

    if (product.currency && typeof product.currency !== 'string') {
      errors.push('Currency must be a string');
      penalty += 10;
    }

    if (product.weight && typeof product.weight !== 'number') {
      errors.push('Weight must be a number');
      penalty += 5;
    }

    if (product.images && !Array.isArray(product.images)) {
      errors.push('Images must be an array');
      penalty += 10;
    }

    return { errors, warnings, penalty };
  }

  private validateValues(product: ProductData, platform: SupportedPlatform): {
    errors: string[];
    warnings: string[];
    penalty: number;
  } {
    const errors: string[] = [];
    const warnings: string[] = [];
    let penalty = 0;

    // Price validation
    if (product.price !== undefined) {
      if (product.price < 0) {
        errors.push('Price cannot be negative');
        penalty += 25;
      } else if (product.price === 0) {
        warnings.push('Price is zero');
        penalty += 15;
      } else if (product.price > 100000) {
        warnings.push('Price is unusually high');
        penalty += 5;
      }
    }

    // Weight validation
    if (product.weight && product.category) {
      const range = this.WEIGHT_RANGES[product.category];
      if (range && (product.weight < range.min || product.weight > range.max)) {
        warnings.push(`Weight ${product.weight}kg seems unusual for category ${product.category}`);
        penalty += 3;
      }
    }

    // Currency validation
    if (product.currency && !/^[A-Z]{3}$/.test(product.currency)) {
      errors.push('Currency must be a 3-letter code');
      penalty += 10;
    }

    // URL validation
    if (product.url) {
      try {
        new URL(product.url);
      } catch {
        warnings.push('Invalid URL format');
        penalty += 5;
      }
    }

    return { errors, warnings, penalty };
  }

  private validateContentQuality(product: ProductData): {
    warnings: string[];
    penalty: number;
  } {
    const warnings: string[] = [];
    let penalty = 0;

    // Check for suspicious patterns in title
    if (product.title) {
      for (const pattern of this.SUSPICIOUS_PATTERNS) {
        if (pattern.test(product.title)) {
          warnings.push('Title contains suspicious content');
          penalty += 10;
          break;
        }
      }

      // Check title length and quality
      if (product.title.length < 10) {
        warnings.push('Title is very short');
        penalty += 5;
      }

      if (product.title.split(' ').length < 3) {
        warnings.push('Title has very few words');
        penalty += 5;
      }
    }

    // Check description quality
    if (product.description) {
      if (product.description.length < 20) {
        warnings.push('Description is very short');
        penalty += 3;
      }

      for (const pattern of this.SUSPICIOUS_PATTERNS) {
        if (pattern.test(product.description)) {
          warnings.push('Description contains suspicious content');
          penalty += 5;
          break;
        }
      }
    }

    return { warnings, penalty };
  }

  private validateImages(images: string[]): {
    warnings: string[];
    penalty: number;
  } {
    const warnings: string[] = [];
    let penalty = 0;

    let validImages = 0;
    
    for (const image of images) {
      if (typeof image !== 'string') {
        warnings.push('Invalid image URL format');
        penalty += 2;
        continue;
      }

      try {
        const url = new URL(image);
        if (!url.protocol.startsWith('http')) {
          warnings.push('Image URL uses invalid protocol');
          penalty += 2;
        } else {
          validImages++;
        }
      } catch {
        warnings.push('Invalid image URL');
        penalty += 2;
      }
    }

    if (validImages === 0 && images.length > 0) {
      warnings.push('No valid image URLs found');
      penalty += 10;
    }

    return { warnings, penalty };
  }

  private enrichProductData(product: ProductData, platform: SupportedPlatform): {
    enrichments: string[];
  } {
    const enrichments: string[] = [];

    // Enrich missing brand
    if (!product.brand && product.title) {
      const brand = this.extractBrandFromTitle(product.title);
      if (brand) {
        (product as any).brand = brand;
        enrichments.push(`Added brand: ${brand}`);
      }
    }

    // Enrich missing category
    if (!product.category && product.title) {
      const category = this.inferCategory(product.title, platform);
      if (category) {
        (product as any).category = category;
        enrichments.push(`Added category: ${category}`);
      }
    }

    // Enrich missing weight
    if (!product.weight && product.title && product.category) {
      const weight = this.estimateWeight(product.title, product.category);
      if (weight > 0) {
        (product as any).weight = weight;
        enrichments.push(`Estimated weight: ${weight}kg`);
      }
    }

    return { enrichments };
  }

  private checkForDuplicates(product: ProductData): {
    isDuplicate: boolean;
    reason: string;
  } {
    // Simple duplicate detection based on title similarity
    // In a real implementation, this would check against a database
    
    if (!product.title || product.title.length < 10) {
      return { isDuplicate: false, reason: '' };
    }

    // Check for generic titles that might indicate duplicates
    const genericPatterns = [
      /^product \d+$/i,
      /^item \d+$/i,
      /^untitled/i,
      /^new product/i,
    ];

    for (const pattern of genericPatterns) {
      if (pattern.test(product.title)) {
        return {
          isDuplicate: true,
          reason: 'Generic or template-based title detected',
        };
      }
    }

    return { isDuplicate: false, reason: '' };
  }

  private extractBrandFromTitle(title: string): string | null {
    // Simple brand extraction - first capitalized word
    const match = title.match(/^([A-Z][a-zA-Z]+)\s/);
    return match ? match[1] : null;
  }

  private inferCategory(title: string, platform: SupportedPlatform): string | null {
    const titleLower = title.toLowerCase();

    // Electronics
    if (titleLower.includes('laptop') || titleLower.includes('computer') || 
        titleLower.includes('phone') || titleLower.includes('tablet')) {
      return 'electronics';
    }

    // Fashion
    if (titleLower.includes('shirt') || titleLower.includes('dress') || 
        titleLower.includes('jeans') || titleLower.includes('shoes')) {
      return 'fashion';
    }

    // Platform-specific defaults
    if (['ae', 'myntra', 'hm', 'asos', 'zara', 'shein', 'romwe'].includes(platform)) {
      return 'fashion';
    }

    if (['bestbuy'].includes(platform)) {
      return 'electronics';
    }

    return 'general';
  }

  private estimateWeight(title: string, category: string): number {
    const weights: Record<string, number> = {
      'electronics': 0.5,
      'fashion': 0.3,
      'books': 0.2,
      'toys': 0.4,
      'home': 1.0,
      'beauty-health': 0.2,
    };

    return weights[category] || 0.5;
  }

  private getPlatformReliability(platform: SupportedPlatform): number {
    // Reliability scores based on platform data quality
    const reliabilityScores: Record<SupportedPlatform, number> = {
      amazon: 95, ebay: 85, walmart: 90, bestbuy: 92, target: 88,
      etsy: 80, ae: 85, myntra: 82, hm: 87, asos: 83, zara: 88,
      lego: 95, hermes: 98, flipkart: 85, toysrus: 85, carters: 87,
      prada: 95, ysl: 95, balenciaga: 95, dior: 95, chanel: 98,
      aliexpress: 70, alibaba: 75, dhgate: 70, wish: 65, shein: 70,
      romwe: 70, nordstrom: 90, macys: 87, bloomingdales: 88,
      saks: 92, neimanmarcus: 90,
    };

    return reliabilityScores[platform] || 75;
  }

  private assessDataQuality(product: ProductData): number {
    let score = 100;

    // Penalize missing important fields
    if (!product.title) score -= 30;
    if (!product.price) score -= 25;
    if (!product.currency) score -= 15;
    if (!product.images?.length) score -= 10;
    if (!product.brand) score -= 5;
    if (!product.category) score -= 5;

    // Bonus for additional data
    if (product.description) score += 5;
    if (product.weight) score += 3;
    if (product.reviews) score += 3;
    if (product.specifications) score += 2;

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Cache management
   */
  private getCacheKey(product: ProductData, platform: SupportedPlatform, options: ValidationOptions): string {
    const key = `validate_${platform}_${product.url || 'unknown'}_${JSON.stringify(options)}`;
    return key.slice(0, 100); // Limit key length
  }

  private getFromCache(key: string): ValidationResult | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - (cached as any).timestamp < this.CACHE_DURATION) {
      return cached;
    }
    this.cache.delete(key);
    return null;
  }

  private setCache(key: string, result: ValidationResult): void {
    (result as any).timestamp = Date.now();
    this.cache.set(key, result);
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    this.cache.clear();
    logger.info('ProductValidationService cleanup completed');
  }
}

export default ProductValidationService;