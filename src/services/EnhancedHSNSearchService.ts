// ============================================================================
// ENHANCED HSN SEARCH SERVICE - Smart HSN Code Discovery
// Features: Keyword search, category browsing, intelligent suggestions
// ============================================================================

import { supabase } from '@/integrations/supabase/client';

export interface HSNSearchResult {
  hsn_code: string;
  description: string;
  category: string;
  subcategory: string;
  keywords: string[];
  icon: string;
  color: string;
  display_name: string;
  search_priority: number;
  common_brands: string[];
  typical_price_range: {
    min: number;
    max: number;
    currency: string;
  };
  tax_data: {
    typical_rates: {
      customs: {
        min: number;
        max: number;
        common: number;
      };
      gst?: {
        standard: number;
      };
      vat?: {
        common: number;
      };
    };
  };
  weight_data: {
    typical_weights: {
      per_unit: {
        min: number;
        max: number;
        average: number;
      };
    };
    packaging: {
      additional_weight: number;
    };
  };
  confidence: number;
  match_reason: string;
}

export interface HSNCategoryGroup {
  category: string;
  display_name: string;
  icon: string;
  color: string;
  count: number;
  subcategories: {
    name: string;
    count: number;
    hsn_codes: string[];
  }[];
}

export interface HSNSearchOptions {
  query?: string;
  category?: string;
  subcategory?: string;
  limit?: number;
  include_inactive?: boolean;
  sort_by?: 'relevance' | 'priority' | 'alphabetical';
}

class EnhancedHSNSearchService {
  private cache = new Map<string, { data: any; timestamp: number }>();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  /**
   * Main search method - supports multiple search strategies
   */
  async searchHSN(options: HSNSearchOptions): Promise<HSNSearchResult[]> {
    const cacheKey = JSON.stringify(options);
    const cached = this.getCached(cacheKey);
    if (cached) return cached;

    try {
      let results: HSNSearchResult[] = [];

      if (options.query) {
        // Text-based search
        results = await this.performTextSearch(options.query, options.limit || 10);
      } else if (options.category) {
        // Category-based browsing
        results = await this.searchByCategory(options.category, options.subcategory, options.limit || 20);
      } else {
        // Get popular/recommended HSN codes
        results = await this.getPopularHSNCodes(options.limit || 15);
      }

      this.setCache(cacheKey, results);
      return results;

    } catch (error) {
      console.error('HSN search error:', error);
      return [];
    }
  }

  /**
   * Smart product name to HSN code detection with contextual learning
   */
  async detectHSNFromProductName(productName: string): Promise<HSNSearchResult[]> {
    if (!productName || productName.trim().length < 2) return [];

    const cacheKey = `detect:${productName.toLowerCase()}`;
    const cached = this.getCached(cacheKey);
    if (cached) return cached;

    try {
      // Multi-strategy approach for better detection
      const [textSearchResults, brandBasedResults, contextualResults] = await Promise.all([
        this.performTextBasedDetection(productName),
        this.performBrandBasedDetection(productName),
        this.performContextualDetection(productName)
      ]);

      // Merge and deduplicate results with confidence scoring  
      const allResults = [...textSearchResults, ...brandBasedResults, ...contextualResults];
      const uniqueResults = this.deduplicateResults(allResults);
      
      // Sort by confidence and limit to top 5
      const sortedResults = uniqueResults
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, 5);

      this.setCache(cacheKey, sortedResults);
      return sortedResults;

    } catch (error) {
      console.error('HSN detection error:', error);
      return [];
    }
  }

  /**
   * Learn HSN mappings from existing quote data for better suggestions
   */
  async learnFromQuoteData(): Promise<{ learned: number; updated: number }> {
    const cacheKey = 'learning_stats';
    const cached = this.getCached(cacheKey);
    if (cached) return cached;

    try {
      // Get quotes with both product names and HSN codes
      const { data: quotes, error } = await supabase
        .from('quotes')
        .select('items, item_level_calculations')
        .not('items', 'is', null)
        .not('item_level_calculations', 'is', null);

      if (error) throw error;

      let learned = 0;
      let updated = 0;
      const productHSNMappings = new Map<string, { hsn_code: string; frequency: number; categories: Set<string> }>();

      // Extract product name -> HSN mappings from quotes
      quotes?.forEach(quote => {
        const items = quote.items || [];
        const hsnData = quote.item_level_calculations?.hsn_classifications || [];

        items.forEach((item: any, index: number) => {
          const productName = item.name || item.product_name;
          const hsnInfo = hsnData[index];

          if (productName && hsnInfo?.hsn_code) {
            const cleanName = this.cleanProductName(productName);
            const key = cleanName.toLowerCase();
            
            if (!productHSNMappings.has(key)) {
              productHSNMappings.set(key, {
                hsn_code: hsnInfo.hsn_code,
                frequency: 1,
                categories: new Set([hsnInfo.category || 'unknown'])
              });
              learned++;
            } else {
              const existing = productHSNMappings.get(key)!;
              existing.frequency++;
              existing.categories.add(hsnInfo.category || 'unknown');
              updated++;
            }
          }
        });
      });

      // Store learned mappings for future use
      const mappingData = Array.from(productHSNMappings.entries()).map(([name, data]) => ({
        product_name: name,
        hsn_code: data.hsn_code,
        frequency: data.frequency,
        categories: Array.from(data.categories),
        confidence: Math.min(0.9, 0.5 + (data.frequency * 0.1)), // Higher frequency = higher confidence
        last_updated: new Date().toISOString()
      }));

      // Cache the learning results
      const stats = { learned, updated, mappings: mappingData };
      this.setCache(cacheKey, stats);
      this.setCache('product_hsn_mappings', mappingData);

      return { learned, updated };

    } catch (error) {
      console.error('Learning from quote data failed:', error);
      return { learned: 0, updated: 0 };
    }
  }

  /**
   * Get contextual HSN suggestions based on learned patterns
   */
  async getContextualSuggestions(productName: string, limit: number = 3): Promise<HSNSearchResult[]> {
    const cleanName = this.cleanProductName(productName).toLowerCase();
    const mappings = this.getCached('product_hsn_mappings') || [];

    // Find similar product names using fuzzy matching
    const similarProducts = mappings
      .filter((mapping: any) => {
        const similarity = this.calculateSimilarity(cleanName, mapping.product_name);
        return similarity > 0.6; // 60% similarity threshold
      })
      .sort((a: any, b: any) => b.confidence - a.confidence)
      .slice(0, limit);

    // Convert to HSN search results
    const results: HSNSearchResult[] = [];
    for (const mapping of similarProducts) {
      try {
        const hsnData = await this.getHSNDetails(mapping.hsn_code);
        if (hsnData) {
          results.push({
            ...hsnData,
            confidence: mapping.confidence,
            match_reason: `Similar to "${mapping.product_name}" (${mapping.frequency}x used)`
          });
        }
      } catch (error) {
        console.error(`Failed to get HSN details for ${mapping.hsn_code}:`, error);
      }
    }

    return results;
  }

  /**
   * Get category groups for browsing interface
   */
  async getCategoryGroups(): Promise<HSNCategoryGroup[]> {
    const cacheKey = 'categories';
    const cached = this.getCached(cacheKey);
    if (cached) return cached;

    try {
      const { data, error } = await supabase
        .from('hsn_search_optimized')
        .select('category, display_name, icon, color, hsn_code, subcategory')
        .order('search_priority', { ascending: true });

      if (error) throw error;

      // Group by category
      const categoryMap = new Map<string, HSNCategoryGroup>();

      data?.forEach((item: any) => {
        const category = item.category;
        
        if (!categoryMap.has(category)) {
          categoryMap.set(category, {
            category,
            display_name: item.display_name || this.formatCategoryName(category),
            icon: item.icon || '📦',
            color: item.color || '#64748B',
            count: 0,
            subcategories: []
          });
        }

        const group = categoryMap.get(category)!;
        group.count++;

        // Add subcategory if it exists
        if (item.subcategory) {
          let subcat = group.subcategories.find(s => s.name === item.subcategory);
          if (!subcat) {
            subcat = {
              name: item.subcategory,
              count: 0,
              hsn_codes: []
            };
            group.subcategories.push(subcat);
          }
          subcat.count++;
          subcat.hsn_codes.push(item.hsn_code);
        }
      });

      const results = Array.from(categoryMap.values())
        .sort((a, b) => b.count - a.count); // Sort by popularity

      this.setCache(cacheKey, results);
      return results;

    } catch (error) {
      console.error('Category groups error:', error);
      return [];
    }
  }

  /**
   * Get similar HSN codes based on category/keywords
   */
  async getSimilarHSNCodes(hsnCode: string, limit: number = 5): Promise<HSNSearchResult[]> {
    const cacheKey = `similar:${hsnCode}`;
    const cached = this.getCached(cacheKey);
    if (cached) return cached;

    try {
      // First get the reference HSN code
      const { data: referenceData, error: refError } = await supabase
        .from('hsn_search_optimized')
        .select('*')
        .eq('hsn_code', hsnCode)
        .single();

      if (refError || !referenceData) return [];

      // Find similar codes by category and keywords
      const { data, error } = await supabase
        .from('hsn_search_optimized')
        .select('*')
        .or(`category.eq.${referenceData.category},subcategory.eq.${referenceData.subcategory}`)
        .neq('hsn_code', hsnCode)
        .order('search_priority', { ascending: true })
        .limit(limit);

      if (error) throw error;

      const results = data?.map((item: any) => this.mapToSearchResult(item, '')) || [];
      this.setCache(cacheKey, results);
      return results;

    } catch (error) {
      console.error('Similar HSN codes error:', error);
      return [];
    }
  }

  /**
   * Initialize contextual learning system
   */
  async initializeContextualLearning(): Promise<{ success: boolean; learned: number; updated: number }> {
    try {
      const stats = await this.learnFromQuoteData();
      return { success: true, ...stats };
    } catch (error) {
      console.error('Failed to initialize contextual learning:', error);
      return { success: false, learned: 0, updated: 0 };
    }
  }

  /**
   * Get enhanced product suggestions with multiple strategies
   */
  async getEnhancedProductSuggestions(productName: string): Promise<{
    suggestions: HSNSearchResult[];
    strategies: { [key: string]: number };
    learningStats: { learned: number; updated: number } | null;
  }> {
    try {
      // Initialize learning if not done
      let learningStats = this.getCached('learning_stats');
      if (!learningStats) {
        learningStats = await this.learnFromQuoteData();
      }

      // Get suggestions using enhanced detection
      const suggestions = await this.detectHSNFromProductName(productName);

      // Track which strategies contributed results
      const strategies = {
        text_search: 0,
        brand_match: 0,
        contextual: 0
      };

      suggestions.forEach(suggestion => {
        if (suggestion.match_reason.includes('Brand match')) strategies.brand_match++;
        else if (suggestion.match_reason.includes('Similar to')) strategies.contextual++;
        else strategies.text_search++;
      });

      return {
        suggestions,
        strategies,
        learningStats: learningStats ? { learned: learningStats.learned, updated: learningStats.updated } : null
      };

    } catch (error) {
      console.error('Enhanced suggestions failed:', error);
      return {
        suggestions: [],
        strategies: { text_search: 0, brand_match: 0, contextual: 0 },
        learningStats: null
      };
    }
  }

  /**
   * Refresh search cache - call after data updates
   */
  async refreshSearchCache(): Promise<boolean> {
    try {
      const { error } = await supabase.rpc('refresh_hsn_search_cache');
      if (error) throw error;
      
      // Clear local cache and reinitialize learning
      this.cache.clear();
      await this.initializeContextualLearning();
      return true;

    } catch (error) {
      console.error('Cache refresh error:', error);
      return false;
    }
  }

  // Private methods

  private async performTextBasedDetection(productName: string): Promise<HSNSearchResult[]> {
    try {
      const { data, error } = await supabase
        .from('hsn_search_optimized')
        .select('*')
        .textSearch('search_vector', productName.trim(), {
          type: 'websearch',
          config: 'english'
        })
        .order('search_priority', { ascending: true })
        .limit(3);

      if (error) throw error;
      return data?.map((item: any) => this.mapToSearchResult(item, productName)) || [];
    } catch (error) {
      console.error('Text-based detection failed:', error);
      return [];
    }
  }

  private async performBrandBasedDetection(productName: string): Promise<HSNSearchResult[]> {
    try {
      // Extract potential brand names (usually first word or recognizable brands)
      const brands = this.extractBrands(productName);
      if (brands.length === 0) return [];

      const { data, error } = await supabase
        .from('hsn_search_optimized')
        .select('*')
        .or(brands.map(brand => `common_brands.cs.{${brand}}`).join(','))
        .order('search_priority', { ascending: true })
        .limit(2);

      if (error) throw error;

      return data?.map((item: any) => ({
        ...this.mapToSearchResult(item, productName),
        confidence: item.confidence + 0.1, // Brand match gets bonus
        match_reason: `Brand match: ${brands.join(', ')}`
      })) || [];
    } catch (error) {
      console.error('Brand-based detection failed:', error);
      return [];
    }
  }

  private async performContextualDetection(productName: string): Promise<HSNSearchResult[]> {
    try {
      return await this.getContextualSuggestions(productName, 2);
    } catch (error) {
      console.error('Contextual detection failed:', error);
      return [];
    }
  }

  private deduplicateResults(results: HSNSearchResult[]): HSNSearchResult[] {
    const seen = new Set<string>();
    return results.filter(result => {
      if (seen.has(result.hsn_code)) {
        return false;
      }
      seen.add(result.hsn_code);
      return true;
    });
  }

  private cleanProductName(productName: string): string {
    return productName
      .replace(/[^\w\s]/g, ' ') // Remove special characters
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim()
      .toLowerCase();
  }

  private extractBrands(productName: string): string[] {
    const knownBrands = [
      'apple', 'samsung', 'nike', 'adidas', 'sony', 'lg', 'microsoft', 'google',
      'amazon', 'dell', 'hp', 'lenovo', 'asus', 'acer', 'canon', 'nikon',
      'xiaomi', 'huawei', 'oneplus', 'oppo', 'vivo', 'realme', 'motorola',
      'nokia', 'phillips', 'panasonic', 'bosch', 'whirlpool', 'zara', 'h&m',
      'uniqlo', 'levis', 'tommy', 'calvin', 'ralph', 'gucci', 'prada', 'chanel'
    ];

    const words = productName.toLowerCase().split(/\s+/);
    return words.filter(word => knownBrands.includes(word));
  }

  private calculateSimilarity(str1: string, str2: string): number {
    // Simple Jaccard similarity for product names
    const set1 = new Set(str1.split(/\s+/));
    const set2 = new Set(str2.split(/\s+/));
    
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    
    return intersection.size / union.size;
  }

  private async getHSNDetails(hsnCode: string): Promise<HSNSearchResult | null> {
    try {
      const { data, error } = await supabase
        .from('hsn_search_optimized')
        .select('*')
        .eq('hsn_code', hsnCode)
        .single();

      if (error || !data) return null;
      return this.mapToSearchResult(data, '');
    } catch (error) {
      console.error('Failed to get HSN details:', error);
      return null;
    }
  }

  private async performTextSearch(query: string, limit: number): Promise<HSNSearchResult[]> {
    const searchTerms = query.trim().toLowerCase();
    
    // Use full-text search with ranking
    const { data, error } = await supabase
      .from('hsn_search_optimized')
      .select('*')
      .textSearch('search_vector', searchTerms, {
        type: 'websearch',
        config: 'english'
      })
      .order('search_priority', { ascending: true })
      .limit(limit);

    if (error) throw error;

    return data?.map((item: any) => this.mapToSearchResult(item, query)) || [];
  }

  private async searchByCategory(category: string, subcategory?: string, limit: number = 20): Promise<HSNSearchResult[]> {
    let query = supabase
      .from('hsn_search_optimized')
      .select('*')
      .eq('category', category);

    if (subcategory) {
      query = query.eq('subcategory', subcategory);
    }

    const { data, error } = await query
      .order('search_priority', { ascending: true })
      .limit(limit);

    if (error) throw error;

    return data?.map((item: any) => this.mapToSearchResult(item, '')) || [];
  }

  private async getPopularHSNCodes(limit: number): Promise<HSNSearchResult[]> {
    const { data, error } = await supabase
      .from('hsn_search_optimized')
      .select('*')
      .order('search_priority', { ascending: true })
      .limit(limit);

    if (error) throw error;

    return data?.map((item: any) => this.mapToSearchResult(item, '')) || [];
  }

  private mapToSearchResult(item: any, query: string): HSNSearchResult {
    // Calculate confidence based on match quality
    let confidence = 0.7; // Base confidence
    
    if (query) {
      const lowerQuery = query.toLowerCase();
      const keywords = item.keywords_text?.toLowerCase() || '';
      const description = item.description?.toLowerCase() || '';
      
      // Exact HSN code match
      if (item.hsn_code === query) confidence = 1.0;
      // Exact keyword match
      else if (keywords.includes(lowerQuery)) confidence = 0.9;
      // Description match
      else if (description.includes(lowerQuery)) confidence = 0.8;
      // Partial match
      else if (keywords.includes(lowerQuery.split(' ')[0])) confidence = 0.75;
    }

    // Determine match reason
    let matchReason = 'Category match';
    if (query) {
      const lowerQuery = query.toLowerCase();
      if (item.hsn_code === query) matchReason = 'Exact HSN code';
      else if (item.keywords_text?.toLowerCase().includes(lowerQuery)) matchReason = 'Keyword match';
      else if (item.description?.toLowerCase().includes(lowerQuery)) matchReason = 'Description match';
      else matchReason = 'Text search match';
    }

    return {
      hsn_code: item.hsn_code,
      description: item.description,
      category: item.category,
      subcategory: item.subcategory,
      keywords: item.keywords || [],
      icon: item.icon || '📦',
      color: item.color || '#64748B',
      display_name: item.display_name || item.description,
      search_priority: parseInt(item.search_priority) || 5,
      common_brands: this.parseJSONField(item.common_brands) || [],
      typical_price_range: this.parseJSONField(item.typical_price_range) || { min: 0, max: 100, currency: 'USD' },
      tax_data: this.parseJSONField(item.tax_data) || { typical_rates: { customs: { min: 10, max: 20, common: 15 } } },
      weight_data: this.parseJSONField(item.weight_data) || { 
        typical_weights: { per_unit: { min: 0.1, max: 1.0, average: 0.5 } },
        packaging: { additional_weight: 0.05 }
      },
      confidence,
      match_reason: matchReason
    };
  }

  private parseJSONField(field: any): any {
    if (typeof field === 'string') {
      try {
        return JSON.parse(field);
      } catch {
        return null;
      }
    }
    return field;
  }

  private formatCategoryName(category: string): string {
    return category
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  private getCached(key: string): any {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data;
    }
    return null;
  }

  private setCache(key: string, data: any): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }
}

export const enhancedHSNSearchService = new EnhancedHSNSearchService();