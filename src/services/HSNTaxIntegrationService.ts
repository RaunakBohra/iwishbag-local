/**
 * HSN Tax Integration Service
 * Orchestrates all HSN-related services for seamless tax automation:
 * - Product classification via AutoProductClassifier
 * - Weight detection via WeightDetectionService
 * - Per-item tax calculation via PerItemTaxCalculator
 * - Data management via UnifiedDataEngine
 * - Real-time updates and caching
 */

import {
  hsnSecurity,
  HSNPermission,
  SecurityContext,
  UserRole,
} from '@/lib/security/HSNSecurityManager';
import { HSNSystemError, HSNErrors, hsnErrorHandler } from '@/lib/error-handling/HSNSystemError';
import { unifiedDataEngine } from './UnifiedDataEngine';
import {
  autoProductClassifier,
  ClassificationInput,
  ClassificationResult,
} from './AutoProductClassifier';
import {
  weightDetectionService,
  WeightDetectionInput,
  WeightDetectionResult,
} from './WeightDetectionService';
import {
  perItemTaxCalculator,
  TaxCalculationInput,
  TaxCalculationResult,
} from './PerItemTaxCalculator';
import type { QuoteItem, UnifiedQuote } from '@/types/unified-quote';

export interface HSNProcessingInput {
  quote: UnifiedQuote;
  options?: {
    forceReclassification?: boolean;
    forceWeightDetection?: boolean;
    enableRealTimeUpdates?: boolean;
    skipCache?: boolean;
    includeAlternatives?: boolean;
  };
}

export interface HSNProcessingResult {
  success: boolean;
  processingId: string;
  timestamp: Date;

  // Updated quote with HSN enhancements
  updatedQuote: UnifiedQuote;

  // Processing summaries
  classification: {
    processed: number;
    classified: number;
    highConfidence: number;
    requiresReview: number;
    errors: number;
  };

  weightDetection: {
    processed: number;
    detected: number;
    highConfidence: number;
    fromSpecs: number;
    fromCategory: number;
    errors: number;
  };

  taxCalculation: TaxCalculationResult;

  // Performance metrics
  performance: {
    totalProcessingTime: number;
    classificationTime: number;
    weightDetectionTime: number;
    taxCalculationTime: number;
    cacheHits: number;
    apiCalls: number;
  };

  // Actionable insights
  insights: {
    warnings: string[];
    suggestions: string[];
    optimizations: string[];
    reviewItems: Array<{
      itemId: string;
      itemName: string;
      reason: string;
      confidence: number;
    }>;
  };

  error?: string;
}

export interface BulkProcessingResult {
  success: boolean;
  totalQuotes: number;
  processedQuotes: number;
  failedQuotes: number;

  aggregateStats: {
    totalItems: number;
    classifiedItems: number;
    weightDetectedItems: number;
    totalTaxesCalculated: number;
    averageProcessingTime: number;
  };

  errors: Array<{
    quoteId: string;
    error: string;
  }>;

  summary: string;
}

export class HSNTaxIntegrationService {
  private static instance: HSNTaxIntegrationService;
  private securityContext?: SecurityContext;
  private processingCache = new Map<string, { result: HSNProcessingResult; timestamp: number }>();
  private readonly CACHE_DURATION = 15 * 60 * 1000; // 15 minutes

  private constructor() {}

  public static getInstance(): HSNTaxIntegrationService {
    if (!HSNTaxIntegrationService.instance) {
      HSNTaxIntegrationService.instance = new HSNTaxIntegrationService();
    }
    return HSNTaxIntegrationService.instance;
  }

  public setSecurityContext(context: SecurityContext): void {
    this.securityContext = context;
    // Pass security context to all sub-services
    autoProductClassifier.setSecurityContext(context);
    weightDetectionService.setSecurityContext(context);
    perItemTaxCalculator.setSecurityContext(context);
    unifiedDataEngine.setSecurityContext(context);
  }

  /**
   * Main processing method - handles complete HSN workflow for a quote
   */
  async processQuote(input: HSNProcessingInput): Promise<HSNProcessingResult> {
    const startTime = Date.now();
    const processingId = this.generateProcessingId();

    try {
      // Security check
      if (this.securityContext) {
        hsnSecurity.checkPermission(this.securityContext, HSNPermission.CALCULATE_TAXES);
      }

      console.log(
        `🚀 [HSN-INTEGRATION] Starting HSN processing for quote ${input.quote.id} with ${input.quote.items.length} items`,
      );

      // Check cache first (unless forced to skip)
      if (!input.options?.skipCache) {
        const cacheKey = this.generateCacheKey(input);
        const cached = this.getCachedResult(cacheKey);
        if (cached) {
          console.log(`📋 [HSN-INTEGRATION] Returning cached result for quote ${input.quote.id}`);
          return cached;
        }
      }

      // Initialize result structure
      const result: HSNProcessingResult = {
        success: false,
        processingId,
        timestamp: new Date(),
        updatedQuote: { ...input.quote },
        classification: {
          processed: 0,
          classified: 0,
          highConfidence: 0,
          requiresReview: 0,
          errors: 0,
        },
        weightDetection: {
          processed: 0,
          detected: 0,
          highConfidence: 0,
          fromSpecs: 0,
          fromCategory: 0,
          errors: 0,
        },
        taxCalculation: {} as TaxCalculationResult,
        performance: {
          totalProcessingTime: 0,
          classificationTime: 0,
          weightDetectionTime: 0,
          taxCalculationTime: 0,
          cacheHits: 0,
          apiCalls: 0,
        },
        insights: {
          warnings: [],
          suggestions: [],
          optimizations: [],
          reviewItems: [],
        },
      };

      // Step 1: Product Classification
      const classificationStart = Date.now();
      const classificationResults = await this.processClassification(
        input.quote.items,
        input.options?.forceReclassification,
      );
      result.performance.classificationTime = Date.now() - classificationStart;
      result.classification = this.summarizeClassification(classificationResults);

      // Step 2: Weight Detection
      const weightDetectionStart = Date.now();
      const weightResults = await this.processWeightDetection(
        input.quote.items,
        classificationResults,
        input.options?.forceWeightDetection,
      );
      result.performance.weightDetectionTime = Date.now() - weightDetectionStart;
      result.weightDetection = this.summarizeWeightDetection(weightResults);

      // Step 3: Update quote items with classification and weight data
      result.updatedQuote.items = this.mergeItemEnhancements(
        input.quote.items,
        classificationResults,
        weightResults,
      );

      // Step 4: Tax Calculation
      const taxCalculationStart = Date.now();
      result.taxCalculation = await perItemTaxCalculator.calculateTaxes({
        originCountry: input.quote.origin_country,
        destinationCountry: input.quote.destination_country,
        items: result.updatedQuote.items,
        customerType: 'individual', // TODO: Determine from customer data
      });
      result.performance.taxCalculationTime = Date.now() - taxCalculationStart;

      // Step 5: Generate insights and suggestions
      this.generateInsights(result, input.quote);

      // Step 6: Update quote with tax calculation results
      if (result.taxCalculation.success) {
        result.updatedQuote.final_total_usd = result.taxCalculation.totals.totalWithTaxes;
        result.updatedQuote.calculation_data = {
          ...result.updatedQuote.calculation_data,
          breakdown: {
            ...result.updatedQuote.calculation_data?.breakdown,
            items_total: result.taxCalculation.totals.costPrice,
            customs: result.taxCalculation.totals.customsDuty,
            taxes: result.taxCalculation.totals.localTaxes,
          },
        };

        // Store item-level tax calculations
        result.updatedQuote.item_level_calculations = {
          calculation_id: result.taxCalculation.calculationId,
          timestamp: result.taxCalculation.timestamp,
          items: result.taxCalculation.itemBreakdowns,
          metadata: result.taxCalculation.metadata,
        };
      }

      // Calculate total processing time
      result.performance.totalProcessingTime = Date.now() - startTime;
      result.success = true;

      // Cache the result
      if (!input.options?.skipCache) {
        const cacheKey = this.generateCacheKey(input);
        this.setCachedResult(cacheKey, result);
      }

      console.log(
        `✅ [HSN-INTEGRATION] HSN processing completed for quote ${input.quote.id} in ${result.performance.totalProcessingTime}ms`,
      );
      console.log(
        `   📊 Classification: ${result.classification.classified}/${result.classification.processed} (${result.classification.highConfidence} high confidence)`,
      );
      console.log(
        `   ⚖️  Weight Detection: ${result.weightDetection.detected}/${result.weightDetection.processed} (${result.weightDetection.highConfidence} high confidence)`,
      );
      console.log(
        `   💰 Tax Calculation: ${result.taxCalculation.success ? '✅' : '❌'} Total: $${result.taxCalculation.totals?.totalTaxes?.toFixed(2) || 0}`,
      );

      return result;
    } catch (error) {
      await hsnErrorHandler.handleError(
        HSNErrors.invalidConfiguration('hsn integration', {
          quoteId: input.quote.id,
          route: `${input.quote.origin_country} → ${input.quote.destination_country}`,
        }),
      );

      return {
        success: false,
        processingId,
        timestamp: new Date(),
        updatedQuote: input.quote,
        classification: {
          processed: 0,
          classified: 0,
          highConfidence: 0,
          requiresReview: 0,
          errors: 0,
        },
        weightDetection: {
          processed: 0,
          detected: 0,
          highConfidence: 0,
          fromSpecs: 0,
          fromCategory: 0,
          errors: 0,
        },
        taxCalculation: {} as TaxCalculationResult,
        performance: {
          totalProcessingTime: Date.now() - startTime,
          classificationTime: 0,
          weightDetectionTime: 0,
          taxCalculationTime: 0,
          cacheHits: 0,
          apiCalls: 0,
        },
        insights: { warnings: [], suggestions: [], optimizations: [], reviewItems: [] },
        error: error instanceof Error ? error.message : 'Unknown processing error',
      };
    }
  }

  /**
   * Process product classification for all items
   */
  private async processClassification(
    items: QuoteItem[],
    forceReclassification?: boolean,
  ): Promise<ClassificationResult[]> {
    const classificationInputs: ClassificationInput[] = items.map((item) => ({
      productName: item.name,
      productUrl: item.url,
      category: item.smart_data?.category_detected,
    }));

    // Skip classification if already done and not forced
    if (!forceReclassification) {
      const needsClassification = items.filter(
        (item) => !item.smart_data?.hsn_code || item.smart_data?.classification_confidence < 0.7,
      );

      if (needsClassification.length === 0) {
        console.log(
          `📋 [HSN-INTEGRATION] All items already classified, skipping classification step`,
        );
        return items.map((item) => ({
          hsnCode: item.smart_data?.hsn_code,
          confidence: item.smart_data?.classification_confidence || 0,
          method: 'cached' as const,
          suggestions: item.smart_data?.hsn_suggestions || [],
          requiresReview: (item.smart_data?.classification_confidence || 0) < 0.7,
        }));
      }
    }

    return await autoProductClassifier.classifyBatch(classificationInputs);
  }

  /**
   * Process weight detection for all items
   */
  private async processWeightDetection(
    items: QuoteItem[],
    classificationResults: ClassificationResult[],
    forceWeightDetection?: boolean,
  ): Promise<WeightDetectionResult[]> {
    const weightInputs: WeightDetectionInput[] = items.map((item, index) => ({
      productName: item.name,
      productUrl: item.url,
      hsnCode: classificationResults[index].hsnCode,
      category: item.smart_data?.category_detected,
    }));

    // Skip weight detection if already done and not forced
    if (!forceWeightDetection) {
      const needsWeightDetection = items.filter(
        (item) =>
          !item.weight_kg ||
          item.weight_kg === 0.5 ||
          (item.smart_data?.weight_confidence || 0) < 0.7,
      );

      if (needsWeightDetection.length === 0) {
        console.log(
          `📋 [HSN-INTEGRATION] All items already have weight data, skipping weight detection step`,
        );
        return items.map((item) => ({
          weight: item.weight_kg,
          confidence: item.smart_data?.weight_confidence || 0.5,
          source: 'cached' as const,
          unit: 'kg' as const,
          requiresReview: (item.smart_data?.weight_confidence || 0) < 0.7,
        }));
      }
    }

    return await weightDetectionService.detectWeightBatch(weightInputs);
  }

  /**
   * Merge classification and weight detection results into quote items
   */
  private mergeItemEnhancements(
    originalItems: QuoteItem[],
    classificationResults: ClassificationResult[],
    weightResults: WeightDetectionResult[],
  ): QuoteItem[] {
    return originalItems.map((item, index) => {
      const classification = classificationResults[index];
      const weight = weightResults[index];

      return {
        ...item,
        weight_kg: weight.weight || item.weight_kg,
        smart_data: {
          ...item.smart_data,
          hsn_code: classification.hsnCode || item.smart_data?.hsn_code,
          classification_confidence: classification.confidence,
          hsn_suggestions: classification.suggestions.map((s) => ({
            hsn_code: s.hsnCode,
            description: s.description,
            confidence: s.confidence,
          })),
          weight_detected: weight.weight,
          weight_confidence: weight.confidence,
          category_detected:
            classification.category?.detected || item.smart_data?.category_detected,
          requires_review: classification.requiresReview || weight.requiresReview,
        },
      };
    });
  }

  /**
   * Summarize classification results
   */
  private summarizeClassification(results: ClassificationResult[]) {
    return {
      processed: results.length,
      classified: results.filter((r) => r.hsnCode).length,
      highConfidence: results.filter((r) => r.confidence > 0.8).length,
      requiresReview: results.filter((r) => r.requiresReview).length,
      errors: results.filter((r) => r.confidence === 0).length,
    };
  }

  /**
   * Summarize weight detection results
   */
  private summarizeWeightDetection(results: WeightDetectionResult[]) {
    return {
      processed: results.length,
      detected: results.filter((r) => r.weight && r.weight > 0).length,
      highConfidence: results.filter((r) => r.confidence > 0.8).length,
      fromSpecs: results.filter((r) => r.source === 'specifications').length,
      fromCategory: results.filter((r) => r.source === 'category_average').length,
      errors: results.filter((r) => !r.weight).length,
    };
  }

  /**
   * Generate actionable insights based on processing results
   */
  private generateInsights(result: HSNProcessingResult, originalQuote: UnifiedQuote): void {
    // Classification insights
    if (result.classification.requiresReview > 0) {
      result.insights.warnings.push(
        `${result.classification.requiresReview} items require manual HSN code review`,
      );
    }

    if (result.classification.classified / result.classification.processed < 0.8) {
      result.insights.suggestions.push(
        'Consider adding more detailed product descriptions to improve automatic classification',
      );
    }

    // Weight detection insights
    if (result.weightDetection.detected / result.weightDetection.processed < 0.7) {
      result.insights.suggestions.push(
        'Many items are using default weights - consider adding product specifications',
      );
    }

    // Tax calculation insights
    if (result.taxCalculation.success) {
      const taxPercentage =
        (result.taxCalculation.totals.totalTaxes / result.taxCalculation.totals.costPrice) * 100;

      if (taxPercentage > 50) {
        result.insights.warnings.push(
          `Tax rate is ${taxPercentage.toFixed(1)}% of product value - unusually high`,
        );
      }

      if (result.taxCalculation.metadata.itemsRequiringReview > 0) {
        result.insights.warnings.push(
          `${result.taxCalculation.metadata.itemsRequiringReview} items flagged for tax calculation review`,
        );
      }
    }

    // Performance insights
    if (result.performance.totalProcessingTime > 5000) {
      result.insights.optimizations.push(
        'Processing time is high - consider enabling caching for frequently accessed items',
      );
    }

    // Generate review items list
    result.updatedQuote.items.forEach((item) => {
      if (item.smart_data?.requires_review) {
        result.insights.reviewItems.push({
          itemId: item.id,
          itemName: item.name,
          reason:
            item.smart_data.classification_confidence < 0.7
              ? 'Low classification confidence'
              : 'Requires manual verification',
          confidence: item.smart_data.classification_confidence || 0,
        });
      }
    });
  }

  /**
   * Process multiple quotes in bulk
   */
  async processBulk(
    quotes: UnifiedQuote[],
    options?: HSNProcessingInput['options'],
  ): Promise<BulkProcessingResult> {
    const startTime = Date.now();
    let processedQuotes = 0;
    let failedQuotes = 0;
    const errors: Array<{ quoteId: string; error: string }> = [];

    let totalItems = 0;
    let classifiedItems = 0;
    let weightDetectedItems = 0;
    let totalTaxesCalculated = 0;

    console.log(`🚀 [HSN-BULK] Starting bulk processing for ${quotes.length} quotes`);

    for (const quote of quotes) {
      try {
        const result = await this.processQuote({ quote, options });

        if (result.success) {
          processedQuotes++;
          totalItems += quote.items.length;
          classifiedItems += result.classification.classified;
          weightDetectedItems += result.weightDetection.detected;
          totalTaxesCalculated += result.taxCalculation.totals?.totalTaxes || 0;
        } else {
          failedQuotes++;
          errors.push({
            quoteId: quote.id,
            error: result.error || 'Unknown processing error',
          });
        }
      } catch (error) {
        failedQuotes++;
        errors.push({
          quoteId: quote.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    const totalProcessingTime = Date.now() - startTime;
    const averageProcessingTime = totalProcessingTime / quotes.length;

    return {
      success: failedQuotes === 0,
      totalQuotes: quotes.length,
      processedQuotes,
      failedQuotes,
      aggregateStats: {
        totalItems,
        classifiedItems,
        weightDetectedItems,
        totalTaxesCalculated,
        averageProcessingTime,
      },
      errors,
      summary: `Processed ${processedQuotes}/${quotes.length} quotes successfully in ${totalProcessingTime}ms (avg: ${averageProcessingTime.toFixed(0)}ms per quote)`,
    };
  }

  /**
   * Get real-time HSN system status
   */
  async getSystemStatus(): Promise<{
    status: 'healthy' | 'degraded' | 'down';
    services: {
      classification: { status: string; stats: any };
      weightDetection: { status: string; stats: any };
      taxCalculation: { status: string; stats: any };
      dataEngine: { status: string; analytics: any };
    };
    performance: {
      cacheHitRate: number;
      averageProcessingTime: number;
      totalProcessedToday: number;
    };
  }> {
    try {
      // Get stats from all services
      const classificationStats = autoProductClassifier.getClassificationStats();
      const weightStats = weightDetectionService.getDetectionStats();
      const taxStats = perItemTaxCalculator.getCalculationStats();
      const dataEngineAnalytics = await unifiedDataEngine.getQuoteAnalytics('7d');

      return {
        status: 'healthy',
        services: {
          classification: { status: 'online', stats: classificationStats },
          weightDetection: { status: 'online', stats: weightStats },
          taxCalculation: { status: 'online', stats: taxStats },
          dataEngine: { status: 'online', analytics: dataEngineAnalytics },
        },
        performance: {
          cacheHitRate: 0.85, // Placeholder
          averageProcessingTime: 2500, // Placeholder
          totalProcessedToday: this.processingCache.size, // Simplified
        },
      };
    } catch (error) {
      return {
        status: 'degraded',
        services: {
          classification: { status: 'unknown', stats: {} },
          weightDetection: { status: 'unknown', stats: {} },
          taxCalculation: { status: 'unknown', stats: {} },
          dataEngine: { status: 'unknown', analytics: {} },
        },
        performance: {
          cacheHitRate: 0,
          averageProcessingTime: 0,
          totalProcessedToday: 0,
        },
      };
    }
  }

  /**
   * Clear all caches across HSN services
   */
  clearAllCaches(): void {
    autoProductClassifier.clearCache();
    weightDetectionService.clearCache();
    perItemTaxCalculator.clearCache();
    this.processingCache.clear();
    console.log('🧹 [HSN-INTEGRATION] All HSN service caches cleared');
  }

  // Private helper methods
  private generateProcessingId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `HSN_${timestamp}_${random}`.toUpperCase();
  }

  private generateCacheKey(input: HSNProcessingInput): string {
    const key = `${input.quote.id}_${input.quote.updated_at}_${JSON.stringify(input.options || {})}`;
    return btoa(key)
      .replace(/[^a-zA-Z0-9]/g, '')
      .substring(0, 64);
  }

  private getCachedResult(key: string): HSNProcessingResult | null {
    const cached = this.processingCache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.result;
    }
    this.processingCache.delete(key);
    return null;
  }

  private setCachedResult(key: string, result: HSNProcessingResult): void {
    this.processingCache.set(key, {
      result,
      timestamp: Date.now(),
    });
  }
}

// Export singleton instance
export const hsnTaxIntegration = HSNTaxIntegrationService.getInstance();
