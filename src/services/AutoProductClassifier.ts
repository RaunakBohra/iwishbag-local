/**
 * Auto Product Classifier - HSN Code Detection Service
 * Advanced product classification using multiple detection methods:
 * - URL pattern analysis
 * - Product name keyword matching
 * - Category-based classification
 * - Image analysis (future enhancement)
 * - Machine learning classification (future enhancement)
 */

import {
  hsnSecurity,
  HSNPermission,
  SecurityContext,
  UserRole,
} from '@/lib/security/HSNSecurityManager';
import { HSNSystemError, HSNErrors, hsnErrorHandler } from '@/lib/error-handling/HSNSystemError';
import { unifiedDataEngine, HSNMasterRecord } from './UnifiedDataEngine';

export interface ClassificationInput {
  productName: string;
  productUrl?: string;
  category?: string;
  merchantUrl?: string;
  imageUrl?: string;
  productDescription?: string;
  productSpecs?: Record<string, any>;
}

export interface ClassificationResult {
  hsnCode?: string;
  confidence: number;
  method:
    | 'url_pattern'
    | 'keyword_matching'
    | 'category_mapping'
    | 'ml_classification'
    | 'fallback';
  suggestions: Array<{
    hsnCode: string;
    description: string;
    confidence: number;
    reasoning: string;
  }>;
  weight?: {
    value: number;
    confidence: number;
    source: 'hsn_data' | 'category_average' | 'url_extraction' | 'spec_analysis';
  };
  category?: {
    detected: string;
    confidence: number;
  };
  requiresReview: boolean;
  debug?: {
    extractedKeywords: string[];
    urlPatterns: string[];
    categoryMatches: string[];
    processingTime: number;
  };
}

export class AutoProductClassifier {
  private static instance: AutoProductClassifier;
  private securityContext?: SecurityContext;
  private classificationCache = new Map<
    string,
    { result: ClassificationResult; timestamp: number }
  >();
  private readonly CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

  // URL pattern mappings for major e-commerce sites
  private readonly urlPatterns = new Map<string, { category: string; confidence: number }>([
    // Amazon
    ['/dp/B0', { category: 'electronics', confidence: 0.8 }],
    ['/electronics/', { category: 'electronics', confidence: 0.9 }],
    ['/clothing/', { category: 'clothing', confidence: 0.9 }],
    ['/books/', { category: 'books', confidence: 0.9 }],
    ['/mobile-phones/', { category: 'electronics', confidence: 0.95 }],
    ['/computers/', { category: 'electronics', confidence: 0.95 }],

    // Flipkart
    ['mobile-phones-store', { category: 'electronics', confidence: 0.9 }],
    ['clothing-and-fashion', { category: 'clothing', confidence: 0.9 }],
    ['electronics-store', { category: 'electronics', confidence: 0.85 }],
    ['books-store', { category: 'books', confidence: 0.9 }],

    // eBay
    ['/itm/', { category: 'general', confidence: 0.6 }],
    ['Electronics-Technology', { category: 'electronics', confidence: 0.8 }],
    ['Clothing-Shoes-Accessories', { category: 'clothing', confidence: 0.8 }],

    // Alibaba
    ['showroom/mobile', { category: 'electronics', confidence: 0.85 }],
    ['showroom/apparel', { category: 'clothing', confidence: 0.85 }],
    ['product-detail/', { category: 'general', confidence: 0.5 }],
  ]);

  // Category-specific keyword patterns
  private readonly categoryKeywords = new Map<string, { keywords: string[]; hsn_codes: string[] }>([
    [
      'electronics',
      {
        keywords: [
          'iphone',
          'samsung',
          'laptop',
          'mobile',
          'phone',
          'computer',
          'tablet',
          'headphones',
          'camera',
          'tv',
          'smart',
          'bluetooth',
          'wireless',
        ],
        hsn_codes: ['8517', '8471', '8518', '8525', '8521'],
      },
    ],
    [
      'clothing',
      {
        keywords: [
          'shirt',
          'tshirt',
          't-shirt',
          'dress',
          'jeans',
          'kurti',
          'kurta',
          'saree',
          'jacket',
          'sweater',
          'pants',
          'skirt',
        ],
        hsn_codes: ['6109', '6204', '6203', '6104', '6206'],
      },
    ],
    [
      'books',
      {
        keywords: [
          'book',
          'novel',
          'textbook',
          'manual',
          'guide',
          'encyclopedia',
          'dictionary',
          'biography',
        ],
        hsn_codes: ['4901', '4902', '4903'],
      },
    ],
    [
      'home_garden',
      {
        keywords: [
          'furniture',
          'chair',
          'table',
          'sofa',
          'bed',
          'kitchen',
          'decor',
          'lamp',
          'mirror',
        ],
        hsn_codes: ['9403', '9405', '7009', '6302'],
      },
    ],
    [
      'sports',
      {
        keywords: [
          'cricket',
          'football',
          'tennis',
          'gym',
          'fitness',
          'sports',
          'ball',
          'racket',
          'shoes',
        ],
        hsn_codes: ['9506', '6402', '6404'],
      },
    ],
  ]);

  private constructor() {}

  public static getInstance(): AutoProductClassifier {
    if (!AutoProductClassifier.instance) {
      AutoProductClassifier.instance = new AutoProductClassifier();
    }
    return AutoProductClassifier.instance;
  }

  public setSecurityContext(context: SecurityContext): void {
    this.securityContext = context;
  }

  /**
   * Main classification method - orchestrates all detection techniques
   */
  async classifyProduct(input: ClassificationInput): Promise<ClassificationResult> {
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

      const extractedKeywords = this.extractKeywords(input.productName);
      const urlPatterns = this.analyzeUrlPatterns(input.productUrl);

      // Multiple classification attempts in order of confidence
      const methods = [
        () => this.classifyByUrlPattern(input, urlPatterns),
        () => this.classifyByKeywordMatching(input, extractedKeywords),
        () => this.classifyByCategory(input),
        () => this.classifyByFallback(input),
      ];

      let bestResult: ClassificationResult | null = null;

      for (const method of methods) {
        try {
          const result = await method();
          if (result.confidence > 0.6 || !bestResult) {
            bestResult = result;
            if (result.confidence > 0.8) break; // High confidence, stop here
          }
        } catch (error) {
          console.warn('Classification method failed:', error);
          continue;
        }
      }

      if (!bestResult) {
        bestResult = {
          confidence: 0,
          method: 'fallback',
          suggestions: [],
          requiresReview: true,
        };
      }

      // Add debug information
      bestResult.debug = {
        extractedKeywords,
        urlPatterns,
        categoryMatches: [],
        processingTime: Date.now() - startTime,
      };

      // Cache the result
      this.setCachedResult(cacheKey, bestResult);

      return bestResult;
    } catch (error) {
      await hsnErrorHandler.handleError(
        HSNErrors.classificationFailed(
          {
            productName: input.productName,
            productUrl: input.productUrl,
          },
          error as Error,
        ),
      );

      return {
        confidence: 0,
        method: 'fallback',
        suggestions: [],
        requiresReview: true,
        debug: {
          extractedKeywords: [],
          urlPatterns: [],
          categoryMatches: [],
          processingTime: Date.now() - startTime,
        },
      };
    }
  }

  /**
   * Classify based on URL patterns from major e-commerce sites
   */
  private async classifyByUrlPattern(
    input: ClassificationInput,
    urlPatterns: string[],
  ): Promise<ClassificationResult> {
    if (!input.productUrl) {
      return { confidence: 0, method: 'url_pattern', suggestions: [], requiresReview: true };
    }

    const url = input.productUrl.toLowerCase();
    let bestMatch: { category: string; confidence: number } | null = null;

    // Check URL patterns
    for (const [pattern, data] of this.urlPatterns) {
      if (url.includes(pattern.toLowerCase())) {
        if (!bestMatch || data.confidence > bestMatch.confidence) {
          bestMatch = data;
        }
      }
    }

    if (!bestMatch) {
      return { confidence: 0, method: 'url_pattern', suggestions: [], requiresReview: true };
    }

    // Get HSN suggestions for the detected category
    const categoryData = this.categoryKeywords.get(bestMatch.category);
    const suggestions = [];

    if (categoryData) {
      for (const hsnCode of categoryData.hsn_codes.slice(0, 3)) {
        const hsnRecord = await unifiedDataEngine.getHSNRecord(hsnCode);
        if (hsnRecord) {
          suggestions.push({
            hsnCode: hsnRecord.hsn_code,
            description: hsnRecord.description,
            confidence: bestMatch.confidence * 0.9,
            reasoning: `URL pattern match for ${bestMatch.category} category`,
          });
        }
      }
    }

    return {
      hsnCode: suggestions.length > 0 ? suggestions[0].hsnCode : undefined,
      confidence: bestMatch.confidence,
      method: 'url_pattern',
      suggestions,
      category: {
        detected: bestMatch.category,
        confidence: bestMatch.confidence,
      },
      requiresReview: bestMatch.confidence < 0.7,
    };
  }

  /**
   * Classify based on keyword matching with HSN database
   */
  private async classifyByKeywordMatching(
    input: ClassificationInput,
    keywords: string[],
  ): Promise<ClassificationResult> {
    if (keywords.length === 0) {
      return { confidence: 0, method: 'keyword_matching', suggestions: [], requiresReview: true };
    }

    // Search HSN database for matching keywords
    const hsnMatches = await unifiedDataEngine.searchHSNByKeywords(keywords, input.category, 10);

    if (hsnMatches.length === 0) {
      return { confidence: 0, method: 'keyword_matching', suggestions: [], requiresReview: true };
    }

    // Score matches based on keyword overlap
    const suggestions = hsnMatches
      .map((hsn) => {
        const overlapScore = this.calculateKeywordOverlap(keywords, hsn.keywords);
        return {
          hsnCode: hsn.hsn_code,
          description: hsn.description,
          confidence: overlapScore,
          reasoning: `Keyword match: ${this.getMatchingKeywords(keywords, hsn.keywords).join(', ')}`,
        };
      })
      .sort((a, b) => b.confidence - a.confidence);

    const bestMatch = suggestions[0];
    const confidence = bestMatch.confidence;

    // Get weight estimation if available
    let weight;
    const hsnRecord = hsnMatches.find((h) => h.hsn_code === bestMatch.hsnCode);
    if (hsnRecord?.weight_data?.typical_weights?.per_unit) {
      const weightData = hsnRecord.weight_data.typical_weights.per_unit;
      weight = {
        value: weightData.average || (weightData.min + weightData.max) / 2 || 0.5,
        confidence: 0.8,
        source: 'hsn_data' as const,
      };
    }

    return {
      hsnCode: confidence > 0.6 ? bestMatch.hsnCode : undefined,
      confidence,
      method: 'keyword_matching',
      suggestions: suggestions.slice(0, 5),
      weight,
      requiresReview: confidence < 0.7,
    };
  }

  /**
   * Classify based on provided category
   */
  private async classifyByCategory(input: ClassificationInput): Promise<ClassificationResult> {
    if (!input.category) {
      return { confidence: 0, method: 'category_mapping', suggestions: [], requiresReview: true };
    }

    const categoryData = this.categoryKeywords.get(input.category.toLowerCase());
    if (!categoryData) {
      return { confidence: 0, method: 'category_mapping', suggestions: [], requiresReview: true };
    }

    const suggestions = [];
    for (const hsnCode of categoryData.hsn_codes.slice(0, 3)) {
      const hsnRecord = await unifiedDataEngine.getHSNRecord(hsnCode);
      if (hsnRecord) {
        suggestions.push({
          hsnCode: hsnRecord.hsn_code,
          description: hsnRecord.description,
          confidence: 0.7,
          reasoning: `Category-based mapping for ${input.category}`,
        });
      }
    }

    return {
      hsnCode: suggestions.length > 0 ? suggestions[0].hsnCode : undefined,
      confidence: 0.7,
      method: 'category_mapping',
      suggestions,
      category: {
        detected: input.category,
        confidence: 0.8,
      },
      requiresReview: false,
    };
  }

  /**
   * Fallback classification using general product category
   */
  private async classifyByFallback(input: ClassificationInput): Promise<ClassificationResult> {
    // Use general goods HSN code as fallback
    const generalHsn = await unifiedDataEngine.getHSNRecord('9999'); // General merchandise

    return {
      hsnCode: undefined, // Don't auto-assign fallback HSN
      confidence: 0.1,
      method: 'fallback',
      suggestions: generalHsn
        ? [
            {
              hsnCode: generalHsn.hsn_code,
              description: generalHsn.description,
              confidence: 0.1,
              reasoning: 'Fallback classification - requires manual review',
            },
          ]
        : [],
      requiresReview: true,
    };
  }

  /**
   * Extract meaningful keywords from product name
   */
  private extractKeywords(productName: string): string[] {
    const cleanName = productName
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const stopWords = new Set([
      'the',
      'a',
      'an',
      'and',
      'or',
      'but',
      'in',
      'on',
      'at',
      'to',
      'for',
      'of',
      'with',
      'by',
      'new',
      'old',
      'good',
      'best',
      'top',
      'high',
      'low',
      'big',
      'small',
      'cheap',
      'expensive',
    ]);

    return cleanName
      .split(' ')
      .filter((word) => word.length > 2 && !stopWords.has(word))
      .slice(0, 10); // Limit to 10 most relevant keywords
  }

  /**
   * Analyze URL patterns to extract category hints
   */
  private analyzeUrlPatterns(url?: string): string[] {
    if (!url) return [];

    const patterns = [];
    const lowerUrl = url.toLowerCase();

    for (const [pattern] of this.urlPatterns) {
      if (lowerUrl.includes(pattern.toLowerCase())) {
        patterns.push(pattern);
      }
    }

    return patterns;
  }

  /**
   * Calculate keyword overlap score
   */
  private calculateKeywordOverlap(keywords1: string[], keywords2: string[]): number {
    if (keywords1.length === 0 || keywords2.length === 0) return 0;

    const matches = keywords1.filter((k1) =>
      keywords2.some((k2) => k1.includes(k2) || k2.includes(k1)),
    );

    return Math.min(matches.length / Math.min(keywords1.length, keywords2.length), 1);
  }

  /**
   * Get matching keywords between two arrays
   */
  private getMatchingKeywords(keywords1: string[], keywords2: string[]): string[] {
    return keywords1.filter((k1) => keywords2.some((k2) => k1.includes(k2) || k2.includes(k1)));
  }

  /**
   * Generate cache key for classification input
   */
  private generateCacheKey(input: ClassificationInput): string {
    const key = `${input.productName}_${input.productUrl || ''}_${input.category || ''}`;
    return btoa(key)
      .replace(/[^a-zA-Z0-9]/g, '')
      .substring(0, 32);
  }

  /**
   * Get cached classification result
   */
  private getCachedResult(key: string): ClassificationResult | null {
    const cached = this.classificationCache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.result;
    }
    this.classificationCache.delete(key);
    return null;
  }

  /**
   * Cache classification result
   */
  private setCachedResult(key: string, result: ClassificationResult): void {
    this.classificationCache.set(key, {
      result,
      timestamp: Date.now(),
    });
  }

  /**
   * Batch process multiple products
   */
  async classifyBatch(inputs: ClassificationInput[]): Promise<ClassificationResult[]> {
    try {
      const results = await Promise.allSettled(inputs.map((input) => this.classifyProduct(input)));

      return results.map((result, index) => {
        if (result.status === 'fulfilled') {
          return result.value;
        } else {
          console.error(`Batch classification failed for item ${index}:`, result.reason);
          return {
            confidence: 0,
            method: 'fallback' as const,
            suggestions: [],
            requiresReview: true,
          };
        }
      });
    } catch (error) {
      await hsnErrorHandler.handleError(
        HSNErrors.classificationFailed({ productName: 'batch_process' }, error as Error),
      );
      throw error;
    }
  }

  /**
   * Get classification statistics
   */
  getClassificationStats(): {
    cacheSize: number;
    cacheHitRate: number;
    supportedPatterns: number;
    supportedCategories: number;
  } {
    return {
      cacheSize: this.classificationCache.size,
      cacheHitRate: 0, // Would need to track hits/misses
      supportedPatterns: this.urlPatterns.size,
      supportedCategories: this.categoryKeywords.size,
    };
  }

  /**
   * Clear classification cache
   */
  clearCache(): void {
    this.classificationCache.clear();
  }
}

// Export singleton instance
export const autoProductClassifier = AutoProductClassifier.getInstance();
