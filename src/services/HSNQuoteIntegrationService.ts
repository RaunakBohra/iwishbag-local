/**
 * HSN Quote Integration Service
 * Real-time integration between HSN tax system and quote calculations
 * Eliminates page refresh requirements with intelligent caching and updates
 */

import { hsnSecurity, HSNPermission, SecurityContext } from '@/lib/security/HSNSecurityManager';
import { HSNSystemError, HSNErrors, hsnErrorHandler } from '@/lib/error-handling/HSNSystemError';
import {
  governmentAPIOrchestrator,
  UnifiedTaxQuery,
  UnifiedTaxResponse,
} from './api/GovernmentAPIOrchestrator';
import { hsnTaxIntegrationService } from './HSNTaxIntegrationService';
import { autoProductClassifier } from './AutoProductClassifier';
import { weightDetectionService } from './WeightDetectionService';
import PerItemTaxCalculator, { ItemTaxBreakdown } from './PerItemTaxCalculator';
import { smartCalculationEngine } from './SmartCalculationEngine';
import type { UnifiedQuote, QuoteItem } from '@/types/unified-quote';

export interface HSNCalculationResult {
  success: boolean;
  quote: UnifiedQuote;
  itemBreakdowns: ItemTaxBreakdown[];
  realTimeUpdates: {
    taxRatesUpdated: boolean;
    weightDetected: boolean;
    hsnCodesClassified: number;
    apiCallsMade: number;
    cacheHits: number;
  };
  warnings?: string[];
  errors?: string[];
}

export interface HSNRealTimeOptions {
  enableGovernmentAPIs: boolean;
  enableAutoClassification: boolean;
  enableWeightDetection: boolean;
  enableMinimumValuation: boolean;
  updateFrequency: 'immediate' | 'batch' | 'manual';
  cacheDuration: number; // milliseconds
}

export class HSNQuoteIntegrationService {
  private static instance: HSNQuoteIntegrationService;
  private securityContext?: SecurityContext;

  // Real-time calculation cache
  private calculationCache = new Map<
    string,
    {
      result: HSNCalculationResult;
      timestamp: number;
      version: number;
    }
  >();

  // Performance tracking
  private performanceMetrics = {
    totalCalculations: 0,
    averageProcessingTime: 0,
    cacheHitRate: 0,
    apiCallsSaved: 0,
    errorsHandled: 0,
  };

  private constructor() {}

  public static getInstance(): HSNQuoteIntegrationService {
    if (!HSNQuoteIntegrationService.instance) {
      HSNQuoteIntegrationService.instance = new HSNQuoteIntegrationService();
    }
    return HSNQuoteIntegrationService.instance;
  }

  public setSecurityContext(context: SecurityContext): void {
    this.securityContext = context;
  }

  /**
   * Calculate quote with HSN-based taxes in real-time
   * This replaces the need for page refreshes
   */
  async calculateQuoteWithHSN(
    quote: UnifiedQuote,
    options: HSNRealTimeOptions = this.getDefaultOptions(),
  ): Promise<HSNCalculationResult> {
    const startTime = Date.now();
    this.performanceMetrics.totalCalculations++;

    try {
      // Security check
      if (this.securityContext) {
        hsnSecurity.checkPermission(this.securityContext, HSNPermission.CALCULATE_TAXES);
      }

      console.log(`🔄 [HSN-INTEGRATION] Starting real-time HSN calculation for quote ${quote.id}`);

      // Check cache first for real-time performance
      const cacheKey = this.generateCacheKey(quote, options);
      const cached = this.getCachedResult(cacheKey, options.cacheDuration);
      if (cached) {
        console.log(`⚡ [HSN-INTEGRATION] Cache hit for quote ${quote.id}`);
        this.performanceMetrics.cacheHitRate++;
        return cached;
      }

      // Step 1: Enhance items with HSN data and classifications
      const enhancedItems = await this.enhanceItemsWithHSNData(quote.items, options);

      // Step 2: Get real-time tax rates from government APIs
      const taxRates = await this.getRealTimeTaxRates(
        quote.origin_country!,
        quote.destination_country!,
        enhancedItems,
        options,
      );

      // Step 3: Calculate per-item taxes with minimum valuation support
      const itemBreakdowns = await this.calculatePerItemTaxes(
        enhancedItems,
        taxRates,
        quote,
        options,
      );

      // Step 4: Update quote with HSN-based calculations
      const updatedQuote = await this.updateQuoteWithHSNCalculations(
        quote,
        itemBreakdowns,
        options,
      );

      // Step 5: Apply smart calculation engine for final totals
      const finalQuote = await this.applySmartCalculationEngine(updatedQuote, options);

      const processingTime = Date.now() - startTime;
      this.updatePerformanceMetrics(processingTime);

      const result: HSNCalculationResult = {
        success: true,
        quote: finalQuote,
        itemBreakdowns,
        realTimeUpdates: {
          taxRatesUpdated: taxRates.apiCallsMade > 0,
          weightDetected: enhancedItems.some((item) => item.weight > 0),
          hsnCodesClassified: enhancedItems.filter((item) => item.hsn_code).length,
          apiCallsMade: taxRates.apiCallsMade,
          cacheHits: taxRates.cacheHits,
        },
      };

      // Cache the result for real-time performance
      this.setCachedResult(cacheKey, result, options.cacheDuration);

      console.log(`✅ [HSN-INTEGRATION] Completed HSN calculation in ${processingTime}ms`);
      return result;
    } catch (error) {
      this.performanceMetrics.errorsHandled++;

      await hsnErrorHandler.handleError(
        HSNErrors.calculationFailed(
          'HSN Quote Integration',
          {
            quoteId: quote.id,
            origin: quote.origin_country,
            destination: quote.destination_country,
          },
          error as Error,
        ),
      );

      // Return fallback calculation
      return this.getFallbackCalculation(quote, options);
    }
  }

  /**
   * Real-time live update for quote editing (synchronous where possible)
   */
  calculateQuoteLiveSync(
    quote: UnifiedQuote,
    options: HSNRealTimeOptions = this.getDefaultOptions(),
  ): HSNCalculationResult {
    try {
      console.log(`⚡ [HSN-INTEGRATION] Live sync calculation for quote ${quote.id}`);

      // Use cached HSN data and tax rates for instant updates
      const cachedData = this.getCachedHSNData(quote);
      if (!cachedData) {
        console.warn(`⚠️ No cached HSN data for live sync - recommend full calculation first`);
        return this.getMinimalSyncResult(quote);
      }

      // Quick sync calculation using cached data
      const syncResult = this.performSyncCalculation(quote, cachedData, options);

      console.log(`⚡ [HSN-INTEGRATION] Live sync completed instantly`);
      return syncResult;
    } catch (error) {
      console.error('Live sync calculation error:', error);
      return this.getMinimalSyncResult(quote);
    }
  }

  /**
   * Enhance quote items with HSN codes, weights, and classifications
   */
  private async enhanceItemsWithHSNData(
    items: QuoteItem[],
    options: HSNRealTimeOptions,
  ): Promise<QuoteItem[]> {
    const enhancedItems: QuoteItem[] = [];

    for (const item of items) {
      const enhancedItem = { ...item };

      try {
        // Auto-classify product to get HSN code
        if (options.enableAutoClassification && !item.hsn_code) {
          const classification = await autoProductClassifier.classifyProduct({
            name: item.name,
            url: item.url,
            description: item.description,
            price: item.costprice_origin,
          });

          if (classification.success && classification.hsnCode) {
            enhancedItem.hsn_code = classification.hsnCode;
            enhancedItem.category = classification.category;
            console.log(
              `🏷️ [HSN-INTEGRATION] Auto-classified ${item.name}: ${classification.hsnCode}`,
            );
          }
        }

        // Auto-detect weight if missing
        if (options.enableWeightDetection && (!item.weight || item.weight === 0)) {
          const weightResult = await weightDetectionService.detectWeight({
            productName: item.name,
            productURL: item.url,
            hsnCode: enhancedItem.hsn_code,
            category: enhancedItem.category,
          });

          if (weightResult.success && weightResult.detectedWeight > 0) {
            enhancedItem.weight = weightResult.detectedWeight;
            console.log(
              `⚖️ [HSN-INTEGRATION] Auto-detected weight for ${item.name}: ${weightResult.detectedWeight}kg`,
            );
          }
        }

        enhancedItems.push(enhancedItem);
      } catch (error) {
        console.warn(`⚠️ Failed to enhance item ${item.name}:`, error);
        enhancedItems.push(enhancedItem);
      }
    }

    return enhancedItems;
  }

  /**
   * Get real-time tax rates from government APIs
   */
  private async getRealTimeTaxRates(
    originCountry: string,
    destinationCountry: string,
    items: QuoteItem[],
    options: HSNRealTimeOptions,
  ): Promise<{
    rates: Map<string, UnifiedTaxResponse>;
    apiCallsMade: number;
    cacheHits: number;
  }> {
    if (!options.enableGovernmentAPIs) {
      return { rates: new Map(), apiCallsMade: 0, cacheHits: 0 };
    }

    const rates = new Map<string, UnifiedTaxResponse>();
    let apiCallsMade = 0;
    let cacheHits = 0;

    // Group items by HSN code to minimize API calls
    const hsnCodes = [...new Set(items.map((item) => item.hsn_code).filter(Boolean))];

    for (const hsnCode of hsnCodes) {
      try {
        const query: UnifiedTaxQuery = {
          destinationCountry: destinationCountry as 'IN' | 'NP' | 'US',
          originCountry,
          hsnCode: hsnCode!,
          amount: 100, // Sample amount for rate calculation
          checkMinimumValuation: options.enableMinimumValuation,
        };

        const taxResponse = await governmentAPIOrchestrator.getTaxRate(query);
        rates.set(hsnCode!, taxResponse);

        if (taxResponse.source === 'government_api') {
          apiCallsMade++;
        } else {
          cacheHits++;
        }
      } catch (error) {
        console.warn(`⚠️ Failed to get tax rate for HSN ${hsnCode}:`, error);
      }
    }

    console.log(
      `🌐 [HSN-INTEGRATION] Retrieved ${rates.size} tax rates (${apiCallsMade} API calls, ${cacheHits} cache hits)`,
    );
    return { rates, apiCallsMade, cacheHits };
  }

  /**
   * Calculate per-item taxes with minimum valuation support
   */
  private async calculatePerItemTaxes(
    items: QuoteItem[],
    taxRates: Map<string, UnifiedTaxResponse>,
    quote: UnifiedQuote,
    options: HSNRealTimeOptions,
  ): Promise<ItemTaxBreakdown[]> {
    const breakdowns: ItemTaxBreakdown[] = [];

    for (const item of items) {
      try {
        const taxData = item.hsn_code ? taxRates.get(item.hsn_code) : null;

        const breakdown = await PerItemTaxCalculator.getInstance().calculateItemTaxes({
          item,
          taxData,
          originCountry: quote.origin_country!,
          destinationCountry: quote.destination_country!,
          enableMinimumValuation: options.enableMinimumValuation,
        });

        breakdowns.push(breakdown);
      } catch (error) {
        console.warn(`⚠️ Failed to calculate taxes for item ${item.name}:`, error);

        // Create fallback breakdown
        breakdowns.push({
          itemId: item.id,
          itemName: item.name,
          costPrice: item.costprice_origin,
          costPriceUSD: item.costprice_origin,
          quantity: item.quantity,
          valuationMethod: 'cost_price',
          valuationAmount: item.costprice_origin * item.quantity,
          hsnCode: item.hsn_code,
          category: item.category || 'general',
          classificationConfidence: 0.5,
          customsDuty: { rate: 10, amount: item.costprice_origin * item.quantity * 0.1 },
          localTax: { rate: 13, amount: item.costprice_origin * item.quantity * 0.13 },
          totalTaxAmount: item.costprice_origin * item.quantity * 0.23,
          totalItemCostWithTax: item.costprice_origin * item.quantity * 1.23,
        } as ItemTaxBreakdown);
      }
    }

    return breakdowns;
  }

  /**
   * Update quote with HSN-based calculations
   */
  private async updateQuoteWithHSNCalculations(
    quote: UnifiedQuote,
    itemBreakdowns: ItemTaxBreakdown[],
    options: HSNRealTimeOptions,
  ): Promise<UnifiedQuote> {
    // Calculate totals from item breakdowns
    const totalCustomsDuty = itemBreakdowns.reduce((sum, item) => sum + item.customsDuty.amount, 0);
    const totalLocalTax = itemBreakdowns.reduce((sum, item) => sum + item.localTax.amount, 0);
    const totalTaxAmount = itemBreakdowns.reduce((sum, item) => sum + item.totalTaxAmount, 0);

    // Update items with enhanced data
    const updatedItems = quote.items.map((item) => {
      const breakdown = itemBreakdowns.find((b) => b.itemId === item.id);
      if (breakdown) {
        return {
          ...item,
          hsn_code: breakdown.hsnCode,
          category: breakdown.category,
          weight: item.weight, // Keep existing or detected weight
        };
      }
      return item;
    });

    // Update quote with HSN tax data
    const updatedQuote: UnifiedQuote = {
      ...quote,
      items: updatedItems,
      calculation_data: {
        ...quote.calculation_data,
        breakdown: {
          ...quote.calculation_data?.breakdown,
          customs: totalCustomsDuty,
          destination_tax: totalLocalTax,
          taxes: totalLocalTax, // Legacy compatibility
        },
        hsn_breakdown: {
          total_items: itemBreakdowns.length,
          total_customs_duty: totalCustomsDuty,
          total_local_tax: totalLocalTax,
          total_tax_amount: totalTaxAmount,
          classification_confidence:
            itemBreakdowns.reduce((sum, item) => sum + item.classificationConfidence, 0) /
            itemBreakdowns.length,
          minimum_valuation_applied: itemBreakdowns.some(
            (item) => item.valuationMethod === 'minimum_valuation',
          ),
          item_breakdowns: itemBreakdowns,
        },
      },
      operational_data: {
        ...quote.operational_data,
        hsn_tax_calculation: true,
        last_hsn_update: new Date().toISOString(),
        calculation_method: 'per_item_hsn',
      },
    };

    return updatedQuote;
  }

  /**
   * Apply smart calculation engine for final totals
   */
  private async applySmartCalculationEngine(
    quote: UnifiedQuote,
    options: HSNRealTimeOptions,
  ): Promise<UnifiedQuote> {
    try {
      // Use smart calculation engine for shipping, handling, insurance, etc.
      const result = await smartCalculationEngine.calculateWithShippingOptions({
        quote,
        preferences: {
          speed_priority: 'medium',
          cost_priority: 'medium',
          show_all_options: false,
        },
      });

      return result.updated_quote;
    } catch (error) {
      console.warn('Smart calculation engine failed, using HSN-only calculation:', error);
      return quote;
    }
  }

  /**
   * Performance and caching methods
   */
  private generateCacheKey(quote: UnifiedQuote, options: HSNRealTimeOptions): string {
    const keyData = {
      quote_id: quote.id,
      items_hash: this.hashItems(quote.items),
      countries: `${quote.origin_country}-${quote.destination_country}`,
      options_hash: this.hashOptions(options),
      timestamp: Math.floor(Date.now() / options.cacheDuration), // Cache bucket
    };
    return btoa(JSON.stringify(keyData)).slice(0, 32);
  }

  private getCachedResult(key: string, maxAge: number): HSNCalculationResult | null {
    const cached = this.calculationCache.get(key);
    if (cached && Date.now() - cached.timestamp < maxAge) {
      return cached.result;
    }
    this.calculationCache.delete(key);
    return null;
  }

  private setCachedResult(key: string, result: HSNCalculationResult, maxAge: number): void {
    this.calculationCache.set(key, {
      result,
      timestamp: Date.now(),
      version: 1,
    });

    // Clean up old cache entries
    if (this.calculationCache.size > 1000) {
      const oldest = Array.from(this.calculationCache.entries()).sort(
        ([, a], [, b]) => a.timestamp - b.timestamp,
      )[0];
      this.calculationCache.delete(oldest[0]);
    }
  }

  /**
   * Fallback and sync methods
   */
  private getFallbackCalculation(
    quote: UnifiedQuote,
    options: HSNRealTimeOptions,
  ): HSNCalculationResult {
    return {
      success: false,
      quote,
      itemBreakdowns: [],
      realTimeUpdates: {
        taxRatesUpdated: false,
        weightDetected: false,
        hsnCodesClassified: 0,
        apiCallsMade: 0,
        cacheHits: 0,
      },
      errors: ['HSN calculation failed, using fallback'],
    };
  }

  private getCachedHSNData(quote: UnifiedQuote): any {
    // Return cached HSN data for live sync operations
    const cacheKey = `hsn_data_${quote.id}`;
    const cached = this.calculationCache.get(cacheKey);
    return cached?.result.itemBreakdowns || null;
  }

  private performSyncCalculation(
    quote: UnifiedQuote,
    cachedData: any,
    options: HSNRealTimeOptions,
  ): HSNCalculationResult {
    // Perform instant sync calculation using cached HSN data
    const syncQuote = smartCalculationEngine.calculateLiveSync({
      quote,
      preferences: { speed_priority: 'high', cost_priority: 'medium', show_all_options: false },
    });

    return {
      success: true,
      quote: syncQuote.updated_quote,
      itemBreakdowns: cachedData || [],
      realTimeUpdates: {
        taxRatesUpdated: false,
        weightDetected: false,
        hsnCodesClassified: 0,
        apiCallsMade: 0,
        cacheHits: 1,
      },
    };
  }

  private getMinimalSyncResult(quote: UnifiedQuote): HSNCalculationResult {
    return {
      success: true,
      quote,
      itemBreakdowns: [],
      realTimeUpdates: {
        taxRatesUpdated: false,
        weightDetected: false,
        hsnCodesClassified: 0,
        apiCallsMade: 0,
        cacheHits: 0,
      },
      warnings: ['Minimal sync - full HSN calculation recommended'],
    };
  }

  /**
   * Utility methods
   */
  private getDefaultOptions(): HSNRealTimeOptions {
    return {
      enableGovernmentAPIs: true,
      enableAutoClassification: true,
      enableWeightDetection: true,
      enableMinimumValuation: true,
      updateFrequency: 'immediate',
      cacheDuration: 15 * 60 * 1000, // 15 minutes
    };
  }

  private hashItems(items: QuoteItem[]): string {
    const itemData = items.map((item) => ({
      id: item.id,
      price: item.costprice_origin,
      quantity: item.quantity,
      hsn: item.hsn_code,
    }));
    return btoa(JSON.stringify(itemData)).slice(0, 16);
  }

  private hashOptions(options: HSNRealTimeOptions): string {
    return btoa(JSON.stringify(options)).slice(0, 8);
  }

  private updatePerformanceMetrics(processingTime: number): void {
    this.performanceMetrics.averageProcessingTime =
      (this.performanceMetrics.averageProcessingTime + processingTime) / 2;
  }

  /**
   * Get performance statistics
   */
  getPerformanceStats(): typeof this.performanceMetrics {
    return { ...this.performanceMetrics };
  }

  /**
   * Clear all caches
   */
  clearCaches(): void {
    this.calculationCache.clear();
    governmentAPIOrchestrator.clearAllCaches();
    console.log('🧹 [HSN-INTEGRATION] All caches cleared');
  }
}

// Export singleton instance
export const hsnQuoteIntegrationService = HSNQuoteIntegrationService.getInstance();
