/**
 * Product Intelligence Service - Phase 2
 * 
 * Provides smart suggestions for product classification, weight estimation,
 * and customs rate calculation based on multi-country data.
 * 
 * Features:
 * - Country-aware HSN/HS/HTS suggestions
 * - Weight estimation based on product type
 * - Category-based customs rate suggestions
 * - Confidence scoring for recommendations
 */

import { supabase } from '@/lib/supabase';

export interface ProductClassification {
  id: string;
  classification_code: string;
  country_code: string;
  product_name: string;
  category: string;
  subcategory?: string;
  description?: string;
  country_data: {
    customs_rate?: number;
    local_exemptions?: string[];
    restricted?: boolean;
    documentation_required?: string[];
    seasonal_adjustments?: any;
  };
  typical_weight_kg?: number;
  weight_variance_factor?: number;
  typical_dimensions?: {
    length?: number;
    width?: number;
    height?: number;
    unit?: string;
    notes?: string;
  };
  volume_category?: 'compact' | 'standard' | 'bulky' | 'oversized';
  customs_rate?: number;
  valuation_method?: 'product_price' | 'minimum_valuation';
  minimum_valuation_usd?: number;
  confidence_score: number;
  usage_frequency: number;
  search_keywords?: string[];
  tags?: string[];
}

export interface CountryConfig {
  id: string;
  country_code: string;
  country_name: string;
  classification_system: 'HSN' | 'HS' | 'HTS';
  classification_digits: number;
  default_customs_rate: number;
  default_local_tax_rate: number;
  local_tax_name: string;
  enable_weight_estimation: boolean;
  enable_category_suggestions: boolean;
  enable_customs_valuation_override: boolean;
}

export interface SmartSuggestion {
  classification_code?: string;
  product_name?: string;
  category?: string;
  suggested_weight_kg?: number;
  weight_confidence?: number;
  customs_rate?: number;
  customs_confidence?: number;
  valuation_method?: 'product_price' | 'minimum_valuation';
  minimum_valuation_usd?: number;
  alternative_suggestions?: Array<{
    classification_code: string;
    product_name: string;
    confidence: number;
    customs_rate: number;
  }>;
  reasoning?: string;
  documentation_required?: string[];
  confidence_score: number;
}

export interface ProductSuggestionRequest {
  product_name: string;
  category?: string;
  destination_country: string;
  product_url?: string;
  price_usd?: number;
  description?: string;
  weight_kg?: number;
  dimensions?: {
    length?: number;
    width?: number;
    height?: number;
    unit?: string;
  };
}

class ProductIntelligenceService {
  private static instance: ProductIntelligenceService;
  private countryConfigCache: Map<string, CountryConfig> = new Map();
  private cacheExpiry: number = 15 * 60 * 1000; // 15 minutes
  private lastCacheUpdate: number = 0;

  private constructor() {}

  public static getInstance(): ProductIntelligenceService {
    if (!ProductIntelligenceService.instance) {
      ProductIntelligenceService.instance = new ProductIntelligenceService();
    }
    return ProductIntelligenceService.instance;
  }

  /**
   * Get country configuration with caching
   */
  async getCountryConfig(countryCode: string): Promise<CountryConfig | null> {
    // Check cache first
    if (this.countryConfigCache.has(countryCode) && 
        Date.now() - this.lastCacheUpdate < this.cacheExpiry) {
      return this.countryConfigCache.get(countryCode) || null;
    }

    try {
      const { data, error } = await supabase
        .from('country_configs')
        .select('*')
        .eq('country_code', countryCode)
        .single();

      if (error) {
        console.error('Error fetching country config:', error);
        return null;
      }

      if (data) {
        this.countryConfigCache.set(countryCode, data);
        this.lastCacheUpdate = Date.now();
      }

      return data;
    } catch (error) {
      console.error('Country config fetch error:', error);
      return null;
    }
  }

  /**
   * Search for product classifications based on keywords
   */
  async searchProductClassifications(
    query: string,
    countryCode: string,
    limit: number = 5
  ): Promise<ProductClassification[]> {
    try {
      // First try exact classification code match
      const { data: exactMatch, error: exactError } = await supabase
        .from('product_classifications')
        .select('*')
        .eq('country_code', countryCode)
        .eq('classification_code', query.toUpperCase())
        .eq('is_active', true)
        .limit(1);

      if (exactMatch && exactMatch.length > 0) {
        return exactMatch;
      }

      // Then try keyword search
      const { data: keywordResults, error: keywordError } = await supabase
        .from('product_classifications')
        .select('*')
        .eq('country_code', countryCode)
        .contains('search_keywords', [query.toLowerCase()])
        .eq('is_active', true)
        .order('confidence_score', { ascending: false })
        .order('usage_frequency', { ascending: false })
        .limit(limit);

      if (keywordResults && keywordResults.length > 0) {
        return keywordResults;
      }

      // Finally try full-text search
      const { data: ftsResults, error: ftsError } = await supabase
        .rpc('search_product_classifications_fts', {
          search_query: query,
          target_country: countryCode,
          result_limit: limit
        });

      if (ftsError) {
        console.error('Full-text search error:', ftsError);
        // Fallback to simple ILIKE search
        const { data: fallbackResults } = await supabase
          .from('product_classifications')
          .select('*')
          .eq('country_code', countryCode)
          .or(`product_name.ilike.%${query}%,category.ilike.%${query}%,description.ilike.%${query}%`)
          .eq('is_active', true)
          .order('confidence_score', { ascending: false })
          .limit(limit);

        return fallbackResults || [];
      }

      return ftsResults || [];
    } catch (error) {
      console.error('Search product classifications error:', error);
      return [];
    }
  }

  /**
   * Get smart suggestions for a product
   */
  async getSmartSuggestions(request: ProductSuggestionRequest): Promise<SmartSuggestion | null> {
    try {
      const countryConfig = await this.getCountryConfig(request.destination_country);
      if (!countryConfig) {
        return null;
      }

      // Search for matching classifications
      const searchQuery = this.buildSearchQuery(request);
      const classifications = await this.searchProductClassifications(
        searchQuery,
        request.destination_country,
        5
      );

      if (classifications.length === 0) {
        // Return default suggestion based on country config
        return this.getDefaultSuggestion(countryConfig, request);
      }

      // Use best match for primary suggestion
      const bestMatch = classifications[0];
      const suggestion: SmartSuggestion = {
        classification_code: bestMatch.classification_code,
        product_name: bestMatch.product_name,
        category: bestMatch.category,
        customs_rate: bestMatch.customs_rate || countryConfig.default_customs_rate,
        customs_confidence: bestMatch.confidence_score,
        valuation_method: bestMatch.valuation_method || 'product_price',
        minimum_valuation_usd: bestMatch.minimum_valuation_usd,
        confidence_score: bestMatch.confidence_score,
        documentation_required: bestMatch.country_data.documentation_required,
        reasoning: this.generateReasoning(bestMatch, request)
      };

      // Add weight estimation if enabled
      if (countryConfig.enable_weight_estimation) {
        const weightSuggestion = this.estimateWeight(bestMatch, request);
        suggestion.suggested_weight_kg = weightSuggestion.weight;
        suggestion.weight_confidence = weightSuggestion.confidence;
      }

      // Add alternative suggestions
      if (classifications.length > 1) {
        suggestion.alternative_suggestions = classifications.slice(1, 4).map(alt => ({
          classification_code: alt.classification_code,
          product_name: alt.product_name,
          confidence: alt.confidence_score,
          customs_rate: alt.customs_rate || countryConfig.default_customs_rate
        }));
      }

      return suggestion;
    } catch (error) {
      console.error('Get smart suggestions error:', error);
      return null;
    }
  }

  /**
   * Get suggestions by category
   */
  async getSuggestionsByCategory(
    category: string,
    countryCode: string,
    limit: number = 10
  ): Promise<ProductClassification[]> {
    try {
      const { data, error } = await supabase
        .from('product_classifications')
        .select('*')
        .eq('country_code', countryCode)
        .eq('category', category)
        .eq('is_active', true)
        .order('usage_frequency', { ascending: false })
        .order('confidence_score', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Get suggestions by category error:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Category suggestions error:', error);
      return [];
    }
  }

  /**
   * Get available categories for a country
   */
  async getAvailableCategories(countryCode: string): Promise<string[]> {
    try {
      const { data, error } = await supabase
        .from('product_classifications')
        .select('category')
        .eq('country_code', countryCode)
        .eq('is_active', true);

      if (error) {
        console.error('Get available categories error:', error);
        return [];
      }

      // Get unique categories
      const categories = [...new Set(data?.map(item => item.category) || [])];
      return categories.filter(Boolean).sort();
    } catch (error) {
      console.error('Available categories error:', error);
      return [];
    }
  }

  /**
   * Update classification usage frequency (for learning)
   */
  async updateUsageFrequency(classificationId: string): Promise<void> {
    try {
      const { error } = await supabase
        .rpc('increment_classification_usage', { classification_id: classificationId });

      if (error) {
        console.error('Update usage frequency error:', error);
      }
    } catch (error) {
      console.error('Usage frequency update error:', error);
    }
  }

  /**
   * Record customs valuation override for audit
   */
  async recordCustomsValuationOverride(override: {
    quote_id?: string;
    order_id?: string;
    product_classification_id: string;
    original_method: 'product_price' | 'minimum_valuation';
    override_method: 'product_price' | 'minimum_valuation';
    original_value_usd: number;
    override_value_usd: number;
    override_reason: string;
    justification_documents?: any[];
  }): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('customs_valuation_overrides')
        .insert({
          ...override,
          justification_documents: override.justification_documents || [],
          created_by: (await supabase.auth.getUser()).data.user?.id
        });

      if (error) {
        console.error('Record customs override error:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Customs override recording error:', error);
      return false;
    }
  }

  // Private helper methods

  private buildSearchQuery(request: ProductSuggestionRequest): string {
    const parts = [request.product_name];
    
    if (request.category) {
      parts.push(request.category);
    }
    
    if (request.description) {
      parts.push(request.description);
    }

    return parts.join(' ').toLowerCase();
  }

  private getDefaultSuggestion(
    config: CountryConfig,
    request: ProductSuggestionRequest
  ): SmartSuggestion {
    return {
      customs_rate: config.default_customs_rate,
      customs_confidence: 0.5, // Low confidence for default
      valuation_method: 'product_price',
      confidence_score: 0.5,
      reasoning: `Using default ${config.classification_system} rate for ${config.country_name} as no specific classification found.`,
      suggested_weight_kg: request.weight_kg || 0.5 // Default 500g
    };
  }

  private estimateWeight(
    classification: ProductClassification,
    request: ProductSuggestionRequest
  ): { weight: number; confidence: number } {
    // If we already have weight, use it
    if (request.weight_kg && request.weight_kg > 0) {
      return { weight: request.weight_kg, confidence: 1.0 };
    }

    // Use typical weight from classification
    if (classification.typical_weight_kg) {
      const variance = classification.weight_variance_factor || 1.0;
      const estimatedWeight = classification.typical_weight_kg * variance;
      return { weight: Math.max(0.1, estimatedWeight), confidence: 0.8 };
    }

    // Category-based estimation
    const categoryWeights: Record<string, number> = {
      'Electronics': 0.5,
      'Clothing': 0.3,
      'Toys': 0.4,
      'Books': 0.2,
      'Home': 1.0,
      'Sports': 0.8
    };

    const categoryWeight = categoryWeights[classification.category] || 0.5;
    return { weight: categoryWeight, confidence: 0.6 };
  }

  private generateReasoning(
    classification: ProductClassification,
    request: ProductSuggestionRequest
  ): string {
    const parts = [];
    
    parts.push(`Matched "${request.product_name}" to ${classification.classification_system} code ${classification.classification_code}`);
    
    if (classification.customs_rate) {
      parts.push(`${classification.customs_rate}% customs rate for ${classification.category}`);
    }
    
    if (classification.confidence_score > 0.9) {
      parts.push('High confidence match based on keywords and usage data');
    } else if (classification.confidence_score > 0.7) {
      parts.push('Good match based on product characteristics');
    } else {
      parts.push('Suggested match - please verify classification');
    }

    return parts.join('. ') + '.';
  }
}

// Create and export the singleton instance
export const productIntelligenceService = ProductIntelligenceService.getInstance();

// Export types for use in other components
export type {
  ProductClassification,
  CountryConfig,
  SmartSuggestion,
  ProductSuggestionRequest
};