/**
 * Weight Detection Service
 * Automatic weight detection using multiple methods:
 * - Product specification parsing
 * - URL content scraping
 * - HSN-based weight averages
 * - Category-based weight estimation
 * - ML-based weight prediction (future enhancement)
 */

import { hsnSecurity, HSNPermission, SecurityContext } from '@/lib/security/HSNSecurityManager';
import { HSNSystemError, HSNErrors, hsnErrorHandler } from '@/lib/error-handling/HSNSystemError';
import { unifiedDataEngine } from './UnifiedDataEngine';

export interface WeightDetectionInput {
  productName: string;
  productUrl?: string;
  productSpecs?: Record<string, any>;
  hsnCode?: string;
  category?: string;
  imageUrl?: string;
  merchantData?: Record<string, any>;
}

export interface WeightDetectionResult {
  weight?: number; // in kg
  confidence: number; // 0-1 scale
  source:
    | 'specifications'
    | 'url_scraping'
    | 'hsn_data'
    | 'category_average'
    | 'ml_prediction'
    | 'fallback';
  unit: 'kg' | 'g' | 'lb' | 'oz';
  originalValue?: number; // Original value before conversion
  originalUnit?: string;
  alternatives?: Array<{
    weight: number;
    confidence: number;
    source: string;
    reasoning: string;
  }>;
  debug?: {
    extractedValues: Array<{ value: number; unit: string; source: string }>;
    conversionApplied: boolean;
    processingTime: number;
  };
  requiresReview: boolean;
}

export class WeightDetectionService {
  private static instance: WeightDetectionService;
  private securityContext?: SecurityContext;
  private weightCache = new Map<string, { result: WeightDetectionResult; timestamp: number }>();
  private readonly CACHE_DURATION = 6 * 60 * 60 * 1000; // 6 hours

  // Weight patterns for different units
  private readonly weightPatterns = [
    // Metric units
    { regex: /(\d+(?:\.\d+)?)\s*kg\b/gi, unit: 'kg', multiplier: 1 },
    { regex: /(\d+(?:\.\d+)?)\s*kilogram/gi, unit: 'kg', multiplier: 1 },
    { regex: /(\d+(?:\.\d+)?)\s*g\b/gi, unit: 'g', multiplier: 0.001 },
    { regex: /(\d+(?:\.\d+)?)\s*gram/gi, unit: 'g', multiplier: 0.001 },

    // Imperial units
    { regex: /(\d+(?:\.\d+)?)\s*lb/gi, unit: 'lb', multiplier: 0.453592 },
    { regex: /(\d+(?:\.\d+)?)\s*pound/gi, unit: 'lb', multiplier: 0.453592 },
    { regex: /(\d+(?:\.\d+)?)\s*oz/gi, unit: 'oz', multiplier: 0.0283495 },
    { regex: /(\d+(?:\.\d+)?)\s*ounce/gi, unit: 'oz', multiplier: 0.0283495 },

    // Alternative formats
    { regex: /weight:?\s*(\d+(?:\.\d+)?)\s*(kg|g|lb|oz)/gi, unit: 'variable', multiplier: 1 },
    { regex: /(\d+(?:\.\d+)?)\s*(kg|g|lb|oz)\s*weight/gi, unit: 'variable', multiplier: 1 },
  ];

  // Category-based weight averages (in kg)
  private readonly categoryWeightAverages = new Map<
    string,
    { average: number; min: number; max: number; confidence: number }
  >([
    ['electronics', { average: 0.8, min: 0.1, max: 5.0, confidence: 0.6 }],
    ['mobile_phones', { average: 0.18, min: 0.12, max: 0.25, confidence: 0.8 }],
    ['laptops', { average: 1.5, min: 1.0, max: 3.0, confidence: 0.7 }],
    ['tablets', { average: 0.5, min: 0.3, max: 0.8, confidence: 0.75 }],
    ['headphones', { average: 0.25, min: 0.05, max: 0.6, confidence: 0.7 }],

    ['clothing', { average: 0.3, min: 0.1, max: 1.0, confidence: 0.6 }],
    ['shirts', { average: 0.2, min: 0.1, max: 0.3, confidence: 0.75 }],
    ['jeans', { average: 0.6, min: 0.4, max: 0.8, confidence: 0.8 }],
    ['dresses', { average: 0.4, min: 0.2, max: 0.7, confidence: 0.7 }],
    ['jackets', { average: 0.8, min: 0.5, max: 1.2, confidence: 0.7 }],

    ['books', { average: 0.3, min: 0.1, max: 2.0, confidence: 0.65 }],
    ['textbooks', { average: 0.8, min: 0.5, max: 1.5, confidence: 0.75 }],
    ['novels', { average: 0.25, min: 0.15, max: 0.4, confidence: 0.8 }],

    ['home_garden', { average: 2.0, min: 0.2, max: 20.0, confidence: 0.4 }],
    ['furniture', { average: 15.0, min: 2.0, max: 50.0, confidence: 0.3 }],
    ['kitchenware', { average: 0.8, min: 0.1, max: 3.0, confidence: 0.5 }],

    ['sports', { average: 1.0, min: 0.1, max: 10.0, confidence: 0.5 }],
    ['balls', { average: 0.4, min: 0.1, max: 0.8, confidence: 0.8 }],
    ['shoes', { average: 0.7, min: 0.3, max: 1.2, confidence: 0.75 }],
  ]);

  // Product-specific weight hints based on keywords
  private readonly productWeightHints = new Map<string, { weight: number; confidence: number }>([
    // Specific products with known weights
    ['iphone 14', { weight: 0.172, confidence: 0.9 }],
    ['iphone 13', { weight: 0.174, confidence: 0.9 }],
    ['macbook air', { weight: 1.24, confidence: 0.85 }],
    ['macbook pro 13', { weight: 1.4, confidence: 0.85 }],
    ['macbook pro 16', { weight: 2.0, confidence: 0.85 }],
    ['ipad air', { weight: 0.458, confidence: 0.9 }],
    ['ipad pro', { weight: 0.682, confidence: 0.9 }],
    ['airpods', { weight: 0.038, confidence: 0.95 }],
    ['nintendo switch', { weight: 0.297, confidence: 0.9 }],
    ['ps5', { weight: 4.5, confidence: 0.85 }],
    ['xbox series x', { weight: 4.45, confidence: 0.85 }],
  ]);

  private constructor() {}

  public static getInstance(): WeightDetectionService {
    if (!WeightDetectionService.instance) {
      WeightDetectionService.instance = new WeightDetectionService();
    }
    return WeightDetectionService.instance;
  }

  public setSecurityContext(context: SecurityContext): void {
    this.securityContext = context;
  }

  /**
   * Main weight detection method
   */
  async detectWeight(input: WeightDetectionInput): Promise<WeightDetectionResult> {
    const startTime = Date.now();

    try {
      // Security check
      if (this.securityContext) {
        hsnSecurity.checkPermission(this.securityContext, HSNPermission.CALCULATE_TAXES);
      }

      // Check cache first
      const cacheKey = this.generateCacheKey(input);
      const cached = this.getCachedResult(cacheKey);
      if (cached) {
        return cached;
      }

      const extractedValues: Array<{ value: number; unit: string; source: string }> = [];

      // Try different detection methods in order of reliability
      const methods = [
        () => this.detectFromSpecifications(input, extractedValues),
        () => this.detectFromProductHints(input, extractedValues),
        () => this.detectFromHSNData(input, extractedValues),
        () => this.detectFromURL(input, extractedValues),
        () => this.detectFromCategory(input, extractedValues),
      ];

      let bestResult: WeightDetectionResult | null = null;

      for (const method of methods) {
        try {
          const result = await method();
          if (result.weight && (result.confidence > 0.7 || !bestResult)) {
            bestResult = result;
            if (result.confidence > 0.9) break; // Very high confidence, stop here
          }
        } catch (error) {
          console.warn('Weight detection method failed:', error);
          continue;
        }
      }

      if (!bestResult || !bestResult.weight) {
        bestResult = this.getFallbackWeight(input);
      }

      // Add debug information
      bestResult.debug = {
        extractedValues,
        conversionApplied: extractedValues.some((v) => v.unit !== 'kg'),
        processingTime: Date.now() - startTime,
      };

      // Cache the result
      this.setCachedResult(cacheKey, bestResult);

      return bestResult;
    } catch (error) {
      await hsnErrorHandler.handleError(
        HSNErrors.weightDetectionFailed(
          {
            productName: input.productName,
            productUrl: input.productUrl,
          },
          error as Error,
        ),
      );

      return this.getFallbackWeight(input);
    }
  }

  /**
   * Extract weight from product specifications
   */
  private async detectFromSpecifications(
    input: WeightDetectionInput,
    extractedValues: Array<{ value: number; unit: string; source: string }>,
  ): Promise<WeightDetectionResult> {
    if (!input.productSpecs) {
      return { confidence: 0, source: 'specifications', unit: 'kg', requiresReview: true };
    }

    const specs = input.productSpecs;
    let bestWeight: { value: number; unit: string; confidence: number } | null = null;

    // Check common specification fields
    const weightFields = [
      'weight',
      'shipping_weight',
      'item_weight',
      'product_weight',
      'net_weight',
      'gross_weight',
    ];

    for (const field of weightFields) {
      const value = specs[field];
      if (value) {
        const parsed = this.parseWeightString(value.toString());
        if (parsed) {
          extractedValues.push({ value: parsed.value, unit: parsed.unit, source: `spec_${field}` });

          if (!bestWeight || parsed.confidence > bestWeight.confidence) {
            bestWeight = { value: parsed.value, unit: parsed.unit, confidence: parsed.confidence };
          }
        }
      }
    }

    if (!bestWeight) {
      return { confidence: 0, source: 'specifications', unit: 'kg', requiresReview: true };
    }

    const weightInKg = this.convertToKg(bestWeight.value, bestWeight.unit);

    return {
      weight: weightInKg,
      confidence: Math.min(bestWeight.confidence * 0.95, 0.95), // Very high confidence for spec data
      source: 'specifications',
      unit: 'kg',
      originalValue: bestWeight.value,
      originalUnit: bestWeight.unit,
      requiresReview: bestWeight.confidence < 0.8,
    };
  }

  /**
   * Use product-specific weight hints
   */
  private async detectFromProductHints(
    input: WeightDetectionInput,
    extractedValues: Array<{ value: number; unit: string; source: string }>,
  ): Promise<WeightDetectionResult> {
    const productName = input.productName.toLowerCase();

    for (const [hint, data] of this.productWeightHints) {
      if (productName.includes(hint)) {
        extractedValues.push({ value: data.weight, unit: 'kg', source: `hint_${hint}` });

        return {
          weight: data.weight,
          confidence: data.confidence,
          source: 'specifications',
          unit: 'kg',
          requiresReview: data.confidence < 0.8,
        };
      }
    }

    return { confidence: 0, source: 'specifications', unit: 'kg', requiresReview: true };
  }

  /**
   * Get weight from HSN master data
   */
  private async detectFromHSNData(
    input: WeightDetectionInput,
    extractedValues: Array<{ value: number; unit: string; source: string }>,
  ): Promise<WeightDetectionResult> {
    if (!input.hsnCode) {
      return { confidence: 0, source: 'hsn_data', unit: 'kg', requiresReview: true };
    }

    const hsnRecord = await unifiedDataEngine.getHSNRecord(input.hsnCode);
    if (!hsnRecord?.weight_data?.typical_weights?.per_unit) {
      return { confidence: 0, source: 'hsn_data', unit: 'kg', requiresReview: true };
    }

    const weightData = hsnRecord.weight_data.typical_weights.per_unit;
    const averageWeight = weightData.average || (weightData.min + weightData.max) / 2;

    if (!averageWeight) {
      return { confidence: 0, source: 'hsn_data', unit: 'kg', requiresReview: true };
    }

    extractedValues.push({ value: averageWeight, unit: 'kg', source: 'hsn_database' });

    const alternatives = [];
    if (weightData.min && weightData.max) {
      alternatives.push({
        weight: weightData.min,
        confidence: 0.6,
        source: 'hsn_data',
        reasoning: 'HSN minimum weight',
      });
      alternatives.push({
        weight: weightData.max,
        confidence: 0.6,
        source: 'hsn_data',
        reasoning: 'HSN maximum weight',
      });
    }

    return {
      weight: averageWeight,
      confidence: 0.75,
      source: 'hsn_data',
      unit: 'kg',
      alternatives,
      requiresReview: false,
    };
  }

  /**
   * Scrape weight from product URL (simplified implementation)
   */
  private async detectFromURL(
    input: WeightDetectionInput,
    extractedValues: Array<{ value: number; unit: string; source: string }>,
  ): Promise<WeightDetectionResult> {
    if (!input.productUrl) {
      return { confidence: 0, source: 'url_scraping', unit: 'kg', requiresReview: true };
    }

    // In a real implementation, this would scrape the URL
    // For now, return placeholder result
    return { confidence: 0, source: 'url_scraping', unit: 'kg', requiresReview: true };
  }

  /**
   * Use category-based weight averages
   */
  private async detectFromCategory(
    input: WeightDetectionInput,
    extractedValues: Array<{ value: number; unit: string; source: string }>,
  ): Promise<WeightDetectionResult> {
    const category = input.category?.toLowerCase();
    if (!category) {
      return { confidence: 0, source: 'category_average', unit: 'kg', requiresReview: true };
    }

    // Try exact category match first
    let categoryData = this.categoryWeightAverages.get(category);

    // If no exact match, try partial matches
    if (!categoryData) {
      for (const [cat, data] of this.categoryWeightAverages) {
        if (category.includes(cat) || cat.includes(category)) {
          categoryData = data;
          break;
        }
      }
    }

    if (!categoryData) {
      return { confidence: 0, source: 'category_average', unit: 'kg', requiresReview: true };
    }

    extractedValues.push({
      value: categoryData.average,
      unit: 'kg',
      source: `category_${category}`,
    });

    const alternatives = [
      {
        weight: categoryData.min,
        confidence: categoryData.confidence * 0.8,
        source: 'category_average',
        reasoning: `${category} category minimum weight`,
      },
      {
        weight: categoryData.max,
        confidence: categoryData.confidence * 0.8,
        source: 'category_average',
        reasoning: `${category} category maximum weight`,
      },
    ];

    return {
      weight: categoryData.average,
      confidence: categoryData.confidence,
      source: 'category_average',
      unit: 'kg',
      alternatives,
      requiresReview: categoryData.confidence < 0.7,
    };
  }

  /**
   * Parse weight string and extract numeric value with unit
   */
  private parseWeightString(
    weightStr: string,
  ): { value: number; unit: string; confidence: number } | null {
    const str = weightStr.toLowerCase().trim();

    for (const pattern of this.weightPatterns) {
      const matches = str.match(pattern.regex);
      if (matches) {
        const value = parseFloat(matches[1]);
        if (!isNaN(value) && value > 0) {
          return {
            value,
            unit: pattern.unit === 'variable' ? matches[2] : pattern.unit,
            confidence: 0.9,
          };
        }
      }
    }

    return null;
  }

  /**
   * Convert weight to kilograms
   */
  private convertToKg(value: number, unit: string): number {
    const conversions: Record<string, number> = {
      kg: 1,
      g: 0.001,
      lb: 0.453592,
      oz: 0.0283495,
    };

    return value * (conversions[unit.toLowerCase()] || 1);
  }

  /**
   * Get fallback weight when all detection methods fail
   */
  private getFallbackWeight(input: WeightDetectionInput): WeightDetectionResult {
    // Use a reasonable default based on category or general fallback
    const fallbackWeights: Record<string, number> = {
      electronics: 0.5,
      clothing: 0.3,
      books: 0.3,
      home_garden: 1.0,
      sports: 0.8,
    };

    const category = input.category?.toLowerCase();
    const fallbackWeight = fallbackWeights[category || ''] || 0.5;

    return {
      weight: fallbackWeight,
      confidence: 0.3,
      source: 'fallback',
      unit: 'kg',
      requiresReview: true,
    };
  }

  /**
   * Generate cache key for weight detection input
   */
  private generateCacheKey(input: WeightDetectionInput): string {
    const key = `${input.productName}_${input.hsnCode || ''}_${input.category || ''}`;
    return btoa(key)
      .replace(/[^a-zA-Z0-9]/g, '')
      .substring(0, 32);
  }

  /**
   * Get cached weight detection result
   */
  private getCachedResult(key: string): WeightDetectionResult | null {
    const cached = this.weightCache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.result;
    }
    this.weightCache.delete(key);
    return null;
  }

  /**
   * Cache weight detection result
   */
  private setCachedResult(key: string, result: WeightDetectionResult): void {
    this.weightCache.set(key, {
      result,
      timestamp: Date.now(),
    });
  }

  /**
   * Batch process multiple products for weight detection
   */
  async detectWeightBatch(inputs: WeightDetectionInput[]): Promise<WeightDetectionResult[]> {
    try {
      const results = await Promise.allSettled(inputs.map((input) => this.detectWeight(input)));

      return results.map((result, index) => {
        if (result.status === 'fulfilled') {
          return result.value;
        } else {
          console.error(`Batch weight detection failed for item ${index}:`, result.reason);
          return this.getFallbackWeight(inputs[index]);
        }
      });
    } catch (error) {
      await hsnErrorHandler.handleError(
        HSNErrors.weightDetectionFailed({ productName: 'batch_process' }, error as Error),
      );
      throw error;
    }
  }

  /**
   * Get weight detection statistics
   */
  getDetectionStats(): {
    cacheSize: number;
    supportedUnits: number;
    categoryAverages: number;
    productHints: number;
  } {
    return {
      cacheSize: this.weightCache.size,
      supportedUnits: this.weightPatterns.length,
      categoryAverages: this.categoryWeightAverages.size,
      productHints: this.productWeightHints.size,
    };
  }

  /**
   * Clear weight detection cache
   */
  clearCache(): void {
    this.weightCache.clear();
  }

  /**
   * Add custom product weight hint
   */
  addProductWeightHint(productKeyword: string, weight: number, confidence: number): void {
    this.productWeightHints.set(productKeyword.toLowerCase(), { weight, confidence });
  }

  /**
   * Add custom category weight average
   */
  addCategoryWeightAverage(
    category: string,
    average: number,
    min: number,
    max: number,
    confidence: number,
  ): void {
    this.categoryWeightAverages.set(category.toLowerCase(), { average, min, max, confidence });
  }
}

// Export singleton instance
export const weightDetectionService = WeightDetectionService.getInstance();
