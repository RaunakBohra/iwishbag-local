/**
 * Smart Quote Enhancement Service - Phase 2
 * 
 * Integration layer between existing quote system and new product intelligence.
 * Provides backward-compatible enhancements to quote calculation with smart suggestions.
 * 
 * Features:
 * - Non-breaking integration with existing QuoteCalculator
 * - Optional smart suggestions for weight, HSN codes, customs rates
 * - Graceful degradation when intelligence service unavailable
 * - Caching for performance
 */

import { productIntelligenceService, SmartSuggestion, ProductSuggestionRequest } from './ProductIntelligenceService';

export interface QuoteItem {
  id?: string;
  name: string;
  unit_price_usd: number;
  quantity: number;
  weight_kg?: number;
  category?: string;
  description?: string;
  product_url?: string;
  // Optional HSN fields (existing structure preserved)
  hsn_code?: string;
  use_hsn_rates?: boolean;
  // Optional volumetric weight fields (existing structure preserved)
  dimensions?: {
    length: number;
    width: number;
    height: number;
    unit?: 'cm' | 'in';
  };
  volumetric_divisor?: number;
}

export interface EnhancedQuoteItem extends QuoteItem {
  // Smart suggestions (optional, non-breaking)
  smart_suggestions?: {
    suggested_hsn_code?: string;
    suggested_weight_kg?: number;
    suggested_category?: string;
    suggested_customs_rate?: number;
    weight_confidence?: number;
    hsn_confidence?: number;
    reasoning?: string;
    alternatives?: Array<{
      hsn_code: string;
      product_name: string;
      confidence: number;
      customs_rate: number;
    }>;
  };
  // Enhancement metadata
  enhancement_applied?: boolean;
  enhancement_timestamp?: string;
}

export interface SmartEnhancementOptions {
  destination_country: string;
  enable_weight_suggestions: boolean;
  enable_hsn_suggestions: boolean;
  enable_category_suggestions: boolean;
  fallback_to_defaults: boolean;
  confidence_threshold: number; // Minimum confidence to apply suggestions
  max_suggestions_per_item: number;
}

class SmartQuoteEnhancementService {
  private static instance: SmartQuoteEnhancementService;
  private suggestionCache: Map<string, SmartSuggestion> = new Map();
  private cacheExpiry: number = 10 * 60 * 1000; // 10 minutes
  private lastCacheCleanup: number = 0;

  private constructor() {}

  public static getInstance(): SmartQuoteEnhancementService {
    if (!SmartQuoteEnhancementService.instance) {
      SmartQuoteEnhancementService.instance = new SmartQuoteEnhancementService();
    }
    return SmartQuoteEnhancementService.instance;
  }

  /**
   * Enhance a single quote item with smart suggestions (non-breaking)
   */
  async enhanceQuoteItem(
    item: QuoteItem,
    options: SmartEnhancementOptions
  ): Promise<EnhancedQuoteItem> {
    try {
      // Return original item if enhancements disabled
      if (!options.enable_weight_suggestions && !options.enable_hsn_suggestions) {
        return { ...item, enhancement_applied: false };
      }

      // Create cache key
      const cacheKey = this.createCacheKey(item, options);
      
      // Check cache first
      let suggestion = this.suggestionCache.get(cacheKey);
      
      if (!suggestion || this.isCacheExpired(cacheKey)) {
        // Get smart suggestions
        const request: ProductSuggestionRequest = {
          product_name: item.name,
          category: item.category,
          destination_country: options.destination_country,
          product_url: item.product_url,
          price_usd: item.unit_price_usd,
          description: item.description,
          weight_kg: item.weight_kg,
          dimensions: item.dimensions
        };

        suggestion = await productIntelligenceService.getSmartSuggestions(request);
        
        if (suggestion) {
          this.suggestionCache.set(cacheKey, suggestion);
        }
      }

      // Apply suggestions if confidence meets threshold
      const enhancedItem: EnhancedQuoteItem = { ...item };
      
      if (suggestion && suggestion.confidence_score >= options.confidence_threshold) {
        enhancedItem.smart_suggestions = {
          reasoning: suggestion.reasoning
        };

        // Apply HSN suggestion if enabled and not already set
        if (options.enable_hsn_suggestions && !item.hsn_code && suggestion.classification_code) {
          if (suggestion.customs_confidence && suggestion.customs_confidence >= options.confidence_threshold) {
            enhancedItem.smart_suggestions.suggested_hsn_code = suggestion.classification_code;
            enhancedItem.smart_suggestions.suggested_customs_rate = suggestion.customs_rate;
            enhancedItem.smart_suggestions.hsn_confidence = suggestion.customs_confidence;
            
            // Auto-apply if high confidence and option enabled
            if (suggestion.customs_confidence >= 0.9) {
              enhancedItem.hsn_code = suggestion.classification_code;
              enhancedItem.use_hsn_rates = true;
            }
          }
        }

        // Apply weight suggestion if enabled and not already set
        if (options.enable_weight_suggestions && (!item.weight_kg || item.weight_kg <= 0)) {
          if (suggestion.suggested_weight_kg && suggestion.weight_confidence && 
              suggestion.weight_confidence >= options.confidence_threshold) {
            enhancedItem.smart_suggestions.suggested_weight_kg = suggestion.suggested_weight_kg;
            enhancedItem.smart_suggestions.weight_confidence = suggestion.weight_confidence;
            
            // Auto-apply if high confidence
            if (suggestion.weight_confidence >= 0.8) {
              enhancedItem.weight_kg = suggestion.suggested_weight_kg;
            }
          }
        }

        // Apply category suggestion
        if (options.enable_category_suggestions && !item.category && suggestion.category) {
          enhancedItem.smart_suggestions.suggested_category = suggestion.category;
          enhancedItem.category = suggestion.category;
        }

        // Add alternatives
        if (suggestion.alternative_suggestions && suggestion.alternative_suggestions.length > 0) {
          enhancedItem.smart_suggestions.alternatives = suggestion.alternative_suggestions
            .slice(0, options.max_suggestions_per_item);
        }

        enhancedItem.enhancement_applied = true;
        enhancedItem.enhancement_timestamp = new Date().toISOString();
      } else {
        // Apply fallback defaults if enabled
        if (options.fallback_to_defaults) {
          enhancedItem.smart_suggestions = {
            reasoning: 'Using default values - no confident suggestions available'
          };
          
          if (!item.weight_kg || item.weight_kg <= 0) {
            enhancedItem.weight_kg = this.getDefaultWeight(item.category);
            enhancedItem.smart_suggestions.suggested_weight_kg = enhancedItem.weight_kg;
            enhancedItem.smart_suggestions.weight_confidence = 0.5;
          }
        }
        
        enhancedItem.enhancement_applied = false;
      }

      // Clean cache periodically
      this.cleanupCache();
      
      return enhancedItem;
    } catch (error) {
      console.error('Error enhancing quote item:', error);
      // Graceful degradation - return original item
      return { ...item, enhancement_applied: false };
    }
  }

  /**
   * Enhance multiple quote items (batch processing)
   */
  async enhanceQuoteItems(
    items: QuoteItem[],
    options: SmartEnhancementOptions
  ): Promise<EnhancedQuoteItem[]> {
    const enhancedItems: EnhancedQuoteItem[] = [];
    
    // Process items concurrently but with limit to avoid overwhelming the service
    const batchSize = 3;
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      const batchPromises = batch.map(item => this.enhanceQuoteItem(item, options));
      const batchResults = await Promise.allSettled(batchPromises);
      
      batchResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          enhancedItems.push(result.value);
        } else {
          console.error(`Error enhancing item ${i + index}:`, result.reason);
          // Fallback to original item
          enhancedItems.push({ ...batch[index], enhancement_applied: false });
        }
      });
    }
    
    return enhancedItems;
  }

  /**
   * Get available categories for a country
   */
  async getAvailableCategories(countryCode: string): Promise<string[]> {
    try {
      return await productIntelligenceService.getAvailableCategories(countryCode);
    } catch (error) {
      console.error('Error fetching categories:', error);
      return this.getDefaultCategories();
    }
  }

  /**
   * Get HSN suggestions for a specific product query
   */
  async getHSNSuggestions(
    productName: string,
    countryCode: string,
    category?: string
  ): Promise<Array<{ code: string; name: string; rate: number; confidence: number }>> {
    try {
      const classifications = await productIntelligenceService.searchProductClassifications(
        productName,
        countryCode,
        5
      );

      return classifications
        .filter(c => !category || c.category === category)
        .map(c => ({
          code: c.classification_code,
          name: c.product_name,
          rate: c.customs_rate || 0,
          confidence: c.confidence_score
        }));
    } catch (error) {
      console.error('Error getting HSN suggestions:', error);
      return [];
    }
  }

  /**
   * Record usage of a suggestion (for learning)
   */
  async recordSuggestionUsage(
    classificationCode: string,
    countryCode: string,
    wasAccepted: boolean
  ): Promise<void> {
    try {
      if (wasAccepted) {
        // Find the classification ID and increment usage
        const classifications = await productIntelligenceService.searchProductClassifications(
          classificationCode,
          countryCode,
          1
        );
        
        if (classifications.length > 0) {
          await productIntelligenceService.updateUsageFrequency(classifications[0].id);
        }
      }
    } catch (error) {
      console.error('Error recording suggestion usage:', error);
    }
  }

  /**
   * Get enhancement statistics for analytics
   */
  getEnhancementStats(): {
    cacheSize: number;
    cacheHitRate: number;
    successRate: number;
  } {
    return {
      cacheSize: this.suggestionCache.size,
      cacheHitRate: 0.85, // Placeholder - implement proper tracking
      successRate: 0.92   // Placeholder - implement proper tracking
    };
  }

  // Private helper methods

  private createCacheKey(item: QuoteItem, options: SmartEnhancementOptions): string {
    return `${item.name}_${options.destination_country}_${item.category || 'none'}_${Date.now()}`;
  }

  private isCacheExpired(cacheKey: string): boolean {
    // Simple time-based expiry - could be enhanced with more sophisticated logic
    return Date.now() - this.lastCacheCleanup > this.cacheExpiry;
  }

  private cleanupCache(): void {
    const now = Date.now();
    if (now - this.lastCacheCleanup > this.cacheExpiry) {
      this.suggestionCache.clear();
      this.lastCacheCleanup = now;
    }
  }

  private getDefaultWeight(category?: string): number {
    const defaultWeights: Record<string, number> = {
      'Electronics': 0.5,
      'Clothing': 0.3,
      'Toys': 0.4,
      'Books': 0.2,
      'Home': 1.0,
      'Sports': 0.8,
      'Beauty': 0.2,
      'Food': 0.5
    };

    return defaultWeights[category || 'default'] || 0.5;
  }

  private getDefaultCategories(): string[] {
    return [
      'Electronics',
      'Clothing',
      'Toys',
      'Books',
      'Home',
      'Sports',
      'Beauty',
      'Food',
      'Health',
      'Automotive'
    ];
  }
}

// Export singleton instance
export const smartQuoteEnhancementService = SmartQuoteEnhancementService.getInstance();

// Export types
export type {
  QuoteItem,
  EnhancedQuoteItem,
  SmartEnhancementOptions
};