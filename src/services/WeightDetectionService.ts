

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
