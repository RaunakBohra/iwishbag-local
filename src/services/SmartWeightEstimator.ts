// ============================================================================
// SMART WEIGHT ESTIMATOR - ML-Powered Weight Estimation Service
// Features: Product name analysis, URL parsing, category-based estimation
// Enhanced with persistent database storage for ML learning
// ============================================================================

import { supabase } from '@/integrations/supabase/client';

interface MLProductWeight {
  id: string;
  name: string;
  normalized_name: string;
  weight_kg: number;
  confidence: number;
  category?: string;
  brand?: string;
  learned_from_url?: string;
  training_count: number;
  accuracy_score?: number;
  created_at: string;
  updated_at: string;
}

interface MLCategoryWeight {
  id: string;
  category: string;
  min_weight: number;
  max_weight: number;
  avg_weight: number;
  sample_count: number;
  last_updated: string;
}

interface MLTrainingHistory {
  id: string;
  name: string;
  estimated_weight: number;
  actual_weight: number;
  confidence: number;
  accuracy: number;
  url?: string;
  category?: string;
  brand?: string;
  user_confirmed: boolean;
  trained_at: string;
  trained_by?: string;
}

/**
 * Smart Weight Estimator - AI-powered weight guessing from product data
 * Helps reduce manual weight entry errors and improves shipping calculations
 * Now with persistent database storage for ML learning
 */
export class SmartWeightEstimator {
  private static instance: SmartWeightEstimator;
  private weightDatabase = new Map<string, { weight: number; confidence: number }>();
  private categoryWeights = new Map<string, { min: number; max: number; avg: number }>();
  private dbCacheTime = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  private constructor() {
    this.initializeWeightDatabase();
    this.initializeCategoryWeights();
    this.loadFromDatabase();
  }

  static getInstance(): SmartWeightEstimator {
    if (!SmartWeightEstimator.instance) {
      SmartWeightEstimator.instance = new SmartWeightEstimator();
    }
    return SmartWeightEstimator.instance;
  }

  /**
   * Load ML data from database with caching
   */
  private async loadFromDatabase(): Promise<void> {
    const now = Date.now();
    if (now - this.dbCacheTime < this.CACHE_DURATION) {
      return; // Use cached data
    }

    try {
      // Load product weights
      const { data: productWeights } = await supabase
        .from('ml_product_weights')
        .select('*')
        .order('confidence', { ascending: false });

      if (productWeights) {
        for (const product of productWeights) {
          this.weightDatabase.set(product.normalized_name, {
            weight: product.weight_kg,
            confidence: product.confidence,
          });
        }
      }

      // Load category weights
      const { data: categoryWeights } = await supabase.from('ml_category_weights').select('*');

      if (categoryWeights) {
        for (const category of categoryWeights) {
          this.categoryWeights.set(category.category, {
            min: category.min_weight,
            max: category.max_weight,
            avg: category.avg_weight,
          });
        }
      }

      this.dbCacheTime = now;
      console.log('🔄 ML data loaded from database');
    } catch (error) {
      console.error('Error loading ML data from database:', error);
    }
  }

  /**
   * Save learned weight to database
   */
  private async saveToDatabase(
    productName: string,
    weight: number,
    confidence: number,
    url?: string,
    category?: string,
    brand?: string,
  ): Promise<void> {
    try {
      const normalizedName = productName.toLowerCase().trim();

      const { error } = await supabase.from('ml_product_weights').upsert(
        {
          name: productName,
          normalized_name: normalizedName,
          weight_kg: weight,
          confidence: confidence,
          category: category,
          brand: brand,
          learned_from_url: url,
          training_count: 1,
        },
        {
          onConflict: 'normalized_name',
        },
      );

      if (error) {
        console.error('Error saving to database:', error);
      } else {
        console.log(`💾 Saved to database: "${productName}" → ${weight}kg`);
      }
    } catch (error) {
      console.error('Database save error:', error);
    }
  }

  /**
   * Save training history to database
   */
  private async saveTrainingHistory(
    productName: string,
    estimatedWeight: number,
    actualWeight: number,
    confidence: number,
    url?: string,
    category?: string,
    brand?: string,
    userConfirmed: boolean = false,
  ): Promise<void> {
    try {
      const accuracy = (1 - Math.abs(estimatedWeight - actualWeight) / actualWeight) * 100;

      const { error } = await supabase.from('ml_training_history').insert({
        name: productName,
        estimated_weight: estimatedWeight,
        actual_weight: actualWeight,
        confidence: confidence,
        accuracy: Math.max(0, Math.min(100, accuracy)),
        url: url,
        category: category,
        brand: brand,
        user_confirmed: userConfirmed,
      });

      if (error) {
        console.error('Error saving training history:', error);
      }
    } catch (error) {
      console.error('Training history save error:', error);
    }
  }

  /**
   * Estimate weight from product name and optional URL
   */
  async estimateWeight(
    productName: string,
    url?: string,
  ): Promise<{
    estimated_weight: number;
    confidence: number;
    reasoning: string[];
    suggestions: string[];
  }> {
    const reasoning: string[] = [];
    const suggestions: string[] = [];
    let estimatedWeight = 0.5; // Default fallback
    let confidence = 0.3; // Low default confidence

    try {
      // Load fresh data from database if cache expired
      await this.loadFromDatabase();
      // Method 1: Direct database lookup
      const directMatch = this.findDirectMatch(productName);
      if (directMatch) {
        estimatedWeight = directMatch.weight;
        confidence = directMatch.confidence;
        reasoning.push(`Found direct match for "${productName}"`);
        return { estimated_weight: estimatedWeight, confidence, reasoning, suggestions };
      }

      // Method 2: Category-based estimation
      const category = this.detectCategory(productName, url);
      const categoryWeight = this.getCategoryWeight(category);
      if (categoryWeight) {
        estimatedWeight = categoryWeight.avg;
        confidence = 0.6;
        reasoning.push(`Detected category: ${category}`);
        reasoning.push(`Average weight for ${category}: ${categoryWeight.avg} kg`);
      }

      // Method 3: Keyword analysis
      const keywordAnalysis = this.analyzeKeywords(productName);
      if (keywordAnalysis.weight > 0) {
        estimatedWeight = (estimatedWeight + keywordAnalysis.weight) / 2;
        confidence = Math.max(confidence, keywordAnalysis.confidence);
        reasoning.push(...keywordAnalysis.reasoning);
      }

      // Method 4: Size indicators
      const sizeAnalysis = this.analyzeSizeIndicators(productName);
      if (sizeAnalysis.multiplier !== 1) {
        estimatedWeight *= sizeAnalysis.multiplier;
        reasoning.push(`Size adjustment: ${sizeAnalysis.reasoning}`);
      }

      // Method 5: URL analysis (if available)
      if (url) {
        const urlAnalysis = this.analyzeURL(url);
        if (urlAnalysis.weight > 0) {
          estimatedWeight = (estimatedWeight + urlAnalysis.weight) / 2;
          confidence = Math.max(confidence, urlAnalysis.confidence);
          reasoning.push(...urlAnalysis.reasoning);
        }
      }

      // Generate suggestions
      suggestions.push(...this.generateSuggestions(productName, category, estimatedWeight));

      // Ensure reasonable bounds
      estimatedWeight = Math.max(0.05, Math.min(50, estimatedWeight)); // 50g to 50kg
      confidence = Math.max(0.1, Math.min(0.95, confidence)); // 10% to 95%

      return {
        estimated_weight: Math.round(estimatedWeight * 100) / 100,
        confidence: Math.round(confidence * 100) / 100,
        reasoning,
        suggestions,
      };
    } catch (error) {
      console.error('Error in weight estimation:', error);
      return {
        estimated_weight: 0.5,
        confidence: 0.3,
        reasoning: ['Using fallback weight due to estimation error'],
        suggestions: ['Please verify weight manually'],
      };
    }
  }

  /**
   * Initialize weight database with common products
   */
  private initializeWeightDatabase() {
    // Electronics
    this.weightDatabase.set('iphone', { weight: 0.2, confidence: 0.9 });
    this.weightDatabase.set('macbook', { weight: 1.5, confidence: 0.9 });
    this.weightDatabase.set('laptop', { weight: 2.0, confidence: 0.8 });
    this.weightDatabase.set('tablet', { weight: 0.5, confidence: 0.8 });
    this.weightDatabase.set('smartwatch', { weight: 0.05, confidence: 0.9 });
    this.weightDatabase.set('headphones', { weight: 0.3, confidence: 0.8 });
    this.weightDatabase.set('earbuds', { weight: 0.05, confidence: 0.9 });
    this.weightDatabase.set('charger', { weight: 0.1, confidence: 0.8 });
    this.weightDatabase.set('mouse', { weight: 0.1, confidence: 0.8 });
    this.weightDatabase.set('keyboard', { weight: 0.8, confidence: 0.8 });

    // Clothing
    this.weightDatabase.set('t-shirt', { weight: 0.2, confidence: 0.8 });
    this.weightDatabase.set('jeans', { weight: 0.6, confidence: 0.8 });
    this.weightDatabase.set('jacket', { weight: 0.8, confidence: 0.7 });
    this.weightDatabase.set('dress', { weight: 0.4, confidence: 0.7 });
    this.weightDatabase.set('shoes', { weight: 0.8, confidence: 0.8 });
    this.weightDatabase.set('sneakers', { weight: 0.6, confidence: 0.8 });
    this.weightDatabase.set('boots', { weight: 1.2, confidence: 0.8 });

    // Books & Media
    this.weightDatabase.set('book', { weight: 0.3, confidence: 0.8 });
    this.weightDatabase.set('paperback', { weight: 0.2, confidence: 0.8 });
    this.weightDatabase.set('hardcover', { weight: 0.5, confidence: 0.8 });
    this.weightDatabase.set('dvd', { weight: 0.1, confidence: 0.9 });
    this.weightDatabase.set('cd', { weight: 0.05, confidence: 0.9 });
    this.weightDatabase.set('textbook', { weight: 0.8, confidence: 0.8 });
    this.weightDatabase.set('magazine', { weight: 0.1, confidence: 0.9 });

    // Beauty & Personal Care
    this.weightDatabase.set('perfume', { weight: 0.15, confidence: 0.8 });
    this.weightDatabase.set('shampoo', { weight: 0.4, confidence: 0.7 });
    this.weightDatabase.set('lipstick', { weight: 0.02, confidence: 0.8 });
    this.weightDatabase.set('foundation', { weight: 0.05, confidence: 0.8 });
    this.weightDatabase.set('moisturizer', { weight: 0.2, confidence: 0.8 });
    this.weightDatabase.set('soap', { weight: 0.1, confidence: 0.9 });
    this.weightDatabase.set('lotion', { weight: 0.3, confidence: 0.8 });

    // Popular Amazon/Shopping Products
    this.weightDatabase.set('airpods', { weight: 0.04, confidence: 0.95 });
    this.weightDatabase.set('kindle', { weight: 0.19, confidence: 0.9 });
    this.weightDatabase.set('nintendo switch', { weight: 0.4, confidence: 0.9 });
    this.weightDatabase.set('xbox controller', { weight: 0.28, confidence: 0.9 });
    this.weightDatabase.set('ps5 controller', { weight: 0.28, confidence: 0.9 });
    this.weightDatabase.set('portable charger', { weight: 0.3, confidence: 0.8 });
    this.weightDatabase.set('phone case', { weight: 0.05, confidence: 0.9 });
    this.weightDatabase.set('screen protector', { weight: 0.01, confidence: 0.95 });
    this.weightDatabase.set('bluetooth speaker', { weight: 0.6, confidence: 0.8 });
    this.weightDatabase.set('webcam', { weight: 0.15, confidence: 0.8 });

    // Home & Kitchen
    this.weightDatabase.set('coffee mug', { weight: 0.3, confidence: 0.8 });
    this.weightDatabase.set('water bottle', { weight: 0.2, confidence: 0.8 });
    this.weightDatabase.set('kitchen knife', { weight: 0.15, confidence: 0.8 });
    this.weightDatabase.set('cutting board', { weight: 0.8, confidence: 0.7 });
    this.weightDatabase.set('blender', { weight: 2.5, confidence: 0.8 });
    this.weightDatabase.set('toaster', { weight: 3.0, confidence: 0.8 });

    // Toys & Games
    this.weightDatabase.set('lego set', { weight: 0.5, confidence: 0.7 });
    this.weightDatabase.set('action figure', { weight: 0.1, confidence: 0.8 });
    this.weightDatabase.set('board game', { weight: 1.0, confidence: 0.7 });
    this.weightDatabase.set('puzzle', { weight: 0.6, confidence: 0.8 });
  }

  /**
   * Initialize category weight ranges
   */
  private initializeCategoryWeights() {
    this.categoryWeights.set('electronics', { min: 0.05, max: 5.0, avg: 1.0 });
    this.categoryWeights.set('clothing', { min: 0.1, max: 2.0, avg: 0.5 });
    this.categoryWeights.set('books', { min: 0.1, max: 1.0, avg: 0.3 });
    this.categoryWeights.set('beauty', { min: 0.01, max: 0.5, avg: 0.1 });
    this.categoryWeights.set('toys', { min: 0.05, max: 3.0, avg: 0.8 });
    this.categoryWeights.set('home', { min: 0.1, max: 10.0, avg: 2.0 });
    this.categoryWeights.set('sports', { min: 0.1, max: 20.0, avg: 2.5 });
    this.categoryWeights.set('jewelry', { min: 0.005, max: 0.2, avg: 0.05 });
    this.categoryWeights.set('food', { min: 0.1, max: 5.0, avg: 1.0 });
  }

  /**
   * Find direct match in weight database
   */
  private findDirectMatch(productName: string): { weight: number; confidence: number } | null {
    const normalizedName = productName.toLowerCase().trim();

    // Check exact matches
    for (const [key, value] of this.weightDatabase) {
      if (normalizedName.includes(key)) {
        return value;
      }
    }

    return null;
  }

  /**
   * Detect product category from name and URL
   */
  private detectCategory(productName: string, url?: string): string {
    const text = `${productName} ${url || ''}`.toLowerCase();

    // Electronics keywords
    if (
      /\b(iphone|samsung|laptop|computer|tablet|headphones|earbuds|charger|cable|mouse|keyboard|speaker|camera|phone|mobile|smart|electronic|tech|gadget)\b/.test(
        text,
      )
    ) {
      return 'electronics';
    }

    // Clothing keywords
    if (
      /\b(shirt|jeans|dress|jacket|pants|shoes|sneakers|boots|clothing|apparel|fashion|wear|size|cotton|polyester)\b/.test(
        text,
      )
    ) {
      return 'clothing';
    }

    // Books keywords
    if (
      /\b(book|novel|paperback|hardcover|textbook|guide|manual|reading|author|isbn|pages)\b/.test(
        text,
      )
    ) {
      return 'books';
    }

    // Beauty keywords
    if (
      /\b(perfume|cologne|makeup|lipstick|foundation|shampoo|conditioner|cream|lotion|beauty|cosmetic|skincare)\b/.test(
        text,
      )
    ) {
      return 'beauty';
    }

    // Toys keywords
    if (/\b(toy|game|puzzle|doll|figure|lego|board game|kids|children|play)\b/.test(text)) {
      return 'toys';
    }

    // Home keywords
    if (/\b(home|kitchen|furniture|decor|lamp|pillow|blanket|curtain|appliance)\b/.test(text)) {
      return 'home';
    }

    // Sports keywords
    if (
      /\b(sports|fitness|gym|exercise|ball|equipment|athletic|outdoor|bike|weights)\b/.test(text)
    ) {
      return 'sports';
    }

    // Jewelry keywords
    if (
      /\b(jewelry|ring|necklace|bracelet|earrings|watch|gold|silver|diamond|precious)\b/.test(text)
    ) {
      return 'jewelry';
    }

    return 'general';
  }

  /**
   * Get category weight information
   */
  private getCategoryWeight(category: string): { min: number; max: number; avg: number } | null {
    return this.categoryWeights.get(category) || null;
  }

  /**
   * Analyze keywords for weight hints
   */
  private analyzeKeywords(productName: string): {
    weight: number;
    confidence: number;
    reasoning: string[];
  } {
    const text = productName.toLowerCase();
    const reasoning: string[] = [];
    let weight = 0;
    let confidence = 0;

    // Heavy indicators
    if (/\b(heavy|thick|solid|metal|steel|iron|cast|dense)\b/.test(text)) {
      weight += 2.0;
      confidence = 0.7;
      reasoning.push('Heavy material indicators detected');
    }

    // Light indicators
    if (/\b(light|thin|plastic|paper|foam|air|feather|lightweight)\b/.test(text)) {
      weight = Math.max(0.1, weight * 0.5);
      confidence = 0.7;
      reasoning.push('Light material indicators detected');
    }

    // Portable indicators
    if (/\b(portable|travel|mini|compact|pocket|handheld)\b/.test(text)) {
      weight = Math.max(0.2, weight * 0.7);
      confidence = 0.6;
      reasoning.push('Portable size indicators detected');
    }

    // Large indicators
    if (/\b(large|big|jumbo|xl|extra large|oversized|giant)\b/.test(text)) {
      weight = Math.max(weight, 2.0);
      confidence = 0.6;
      reasoning.push('Large size indicators detected');
    }

    return { weight, confidence, reasoning };
  }

  /**
   * Analyze size indicators in product name
   */
  private analyzeSizeIndicators(productName: string): {
    multiplier: number;
    reasoning: string;
  } {
    const text = productName.toLowerCase();

    // Size multipliers
    if (/\b(xs|extra small)\b/.test(text))
      return { multiplier: 0.6, reasoning: 'Extra small size' };
    if (/\b(s|small)\b/.test(text)) return { multiplier: 0.8, reasoning: 'Small size' };
    if (/\b(m|medium)\b/.test(text)) return { multiplier: 1.0, reasoning: 'Medium size' };
    if (/\b(l|large)\b/.test(text)) return { multiplier: 1.3, reasoning: 'Large size' };
    if (/\b(xl|extra large)\b/.test(text))
      return { multiplier: 1.6, reasoning: 'Extra large size' };
    if (/\b(xxl|2xl)\b/.test(text)) return { multiplier: 2.0, reasoning: 'XXL size' };

    // Quantity multipliers
    if (/\bpack of (\d+)\b/.test(text)) {
      const match = text.match(/\bpack of (\d+)\b/);
      const quantity = parseInt(match![1]);
      return { multiplier: quantity, reasoning: `Pack of ${quantity}` };
    }

    if (/\bset of (\d+)\b/.test(text)) {
      const match = text.match(/\bset of (\d+)\b/);
      const quantity = parseInt(match![1]);
      return { multiplier: quantity, reasoning: `Set of ${quantity}` };
    }

    return { multiplier: 1, reasoning: 'No size indicators' };
  }

  /**
   * Analyze URL for additional weight hints (Enhanced with more patterns)
   */
  private analyzeURL(url: string): {
    weight: number;
    confidence: number;
    reasoning: string[];
  } {
    const reasoning: string[] = [];
    let weight = 0;
    let confidence = 0;

    // Extract domain information
    try {
      const urlObj = new URL(url);
      const domain = urlObj.hostname.toLowerCase();
      const path = urlObj.pathname.toLowerCase();
      const searchParams = urlObj.searchParams;

      // Enhanced domain-specific logic
      if (domain.includes('amazon')) {
        reasoning.push('Amazon product detected - high accuracy expected');
        confidence = 0.8;

        // Extract ASIN for potential API lookup
        const asinMatch = path.match(/\/dp\/([A-Z0-9]{10})/);
        if (asinMatch) {
          reasoning.push(`ASIN detected: ${asinMatch[1]}`);
          confidence = 0.85;
        }
      }

      if (domain.includes('flipkart')) {
        reasoning.push('Flipkart product detected');
        confidence = 0.75;
      }

      if (domain.includes('ebay')) {
        reasoning.push('eBay product detected');
        confidence = 0.7;
      }

      if (domain.includes('alibaba') || domain.includes('aliexpress')) {
        reasoning.push('Alibaba/AliExpress product - weight may vary');
        confidence = 0.6;
      }

      // Enhanced category detection from URL paths
      const categoryMappings = {
        electronics: { weight: 1.0, boost: 0.1 },
        books: { weight: 0.3, boost: 0.15 },
        clothing: { weight: 0.4, boost: 0.1 },
        'home-kitchen': { weight: 1.5, boost: 0.1 },
        toys: { weight: 0.8, boost: 0.1 },
        beauty: { weight: 0.15, boost: 0.15 },
        sports: { weight: 2.0, boost: 0.1 },
        automotive: { weight: 5.0, boost: 0.1 },
        health: { weight: 0.2, boost: 0.1 },
        jewelry: { weight: 0.05, boost: 0.2 },
      };

      for (const [category, data] of Object.entries(categoryMappings)) {
        if (path.includes(category) || searchParams.get('category')?.includes(category)) {
          weight = data.weight;
          confidence += data.boost;
          reasoning.push(`${category} category detected from URL structure`);
          break;
        }
      }

      // Brand-specific weight hints
      const brandHints = {
        apple: { multiplier: 0.8, reason: 'Apple products tend to be lightweight but premium' },
        samsung: { multiplier: 0.9, reason: 'Samsung products typical weight range' },
        sony: { multiplier: 1.1, reason: 'Sony products often slightly heavier' },
        nike: { multiplier: 0.7, reason: 'Nike focuses on lightweight designs' },
        lego: { multiplier: 1.5, reason: 'LEGO sets are denser than typical toys' },
      };

      for (const [brand, hint] of Object.entries(brandHints)) {
        if (path.includes(brand) || domain.includes(brand)) {
          weight *= hint.multiplier;
          confidence += 0.1;
          reasoning.push(hint.reason);
          break;
        }
      }
    } catch (error) {
      reasoning.push('Could not parse URL for analysis');
    }

    return { weight, confidence, reasoning };
  }

  /**
   * Generate helpful suggestions
   */
  private generateSuggestions(
    productName: string,
    category: string,
    estimatedWeight: number,
  ): string[] {
    const suggestions: string[] = [];

    if (estimatedWeight < 0.1) {
      suggestions.push('Very light item - consider verifying packaging weight');
    }

    if (estimatedWeight > 5) {
      suggestions.push('Heavy item - check shipping restrictions');
    }

    if (category === 'electronics') {
      suggestions.push('Electronics often have precise specs - check manufacturer website');
    }

    if (category === 'clothing') {
      suggestions.push('Clothing weight varies by material and size');
    }

    if (productName.toLowerCase().includes('set') || productName.toLowerCase().includes('pack')) {
      suggestions.push('Multi-item product - verify total weight includes all items');
    }

    return suggestions;
  }

  /**
   * Learn from actual weights to improve future estimates (Enhanced with database storage)
   */
  async learnFromActualWeight(
    productName: string,
    actualWeight: number,
    url?: string,
    context?: {
      userConfirmed?: boolean;
      originalEstimate?: number;
      brand?: string;
      size?: string;
    },
  ): Promise<void> {
    try {
      // Store the learning data with enhanced context
      const normalizedName = productName.toLowerCase().trim();
      const confidence = context?.userConfirmed ? 0.95 : 0.85;
      const category = this.detectCategory(productName, url);

      // Update in-memory cache
      this.weightDatabase.set(normalizedName, {
        weight: actualWeight,
        confidence,
      });

      // Save to persistent database
      await this.saveToDatabase(
        productName,
        actualWeight,
        confidence,
        url,
        category,
        context?.brand,
      );

      // Save training history for analytics
      if (context?.originalEstimate) {
        await this.saveTrainingHistory(
          productName,
          context.originalEstimate,
          actualWeight,
          confidence,
          url,
          category,
          context.brand,
          context.userConfirmed || false,
        );
      }

      // Learn from similar products (fuzzy matching)
      this.learnFromSimilarProducts(normalizedName, actualWeight);

      // Update category averages with smart weighting
      this.updateCategoryLearning(category, actualWeight, confidence);

      // Store brand-specific learning
      if (context?.brand) {
        this.learnBrandWeightPattern(context.brand, actualWeight, category);
      }

      // Validate and improve estimation accuracy
      if (context?.originalEstimate) {
        this.updateEstimationAccuracy(context.originalEstimate, actualWeight);
      }

      console.log(
        `🧠 ML Learning: "${productName}" → ${actualWeight}kg (confidence: ${confidence})`,
      );
    } catch (error) {
      console.error('Error learning from actual weight:', error);
    }
  }

  /**
   * Learn from similar product patterns
   */
  private learnFromSimilarProducts(productName: string, actualWeight: number): void {
    const similarThreshold = 0.7; // 70% similarity threshold

    for (const [existingProduct, data] of this.weightDatabase) {
      const similarity = this.calculateSimilarity(productName, existingProduct);

      if (similarity > similarThreshold) {
        // Update weight with weighted average based on similarity
        const weightedAverage = data.weight * (1 - similarity) + actualWeight * similarity;
        const newConfidence = Math.min(0.9, data.confidence + 0.1); // Boost confidence

        this.weightDatabase.set(existingProduct, {
          weight: weightedAverage,
          confidence: newConfidence,
        });
      }
    }
  }

  /**
   * Calculate text similarity between product names
   */
  private calculateSimilarity(text1: string, text2: string): number {
    const words1 = text1.split(' ');
    const words2 = text2.split(' ');
    const commonWords = words1.filter((word) => words2.includes(word));

    return commonWords.length / Math.max(words1.length, words2.length);
  }

  /**
   * Update category learning with smart weighting
   */
  private updateCategoryLearning(category: string, actualWeight: number, confidence: number): void {
    const categoryWeight = this.categoryWeights.get(category);
    if (categoryWeight) {
      // Weighted moving average (higher confidence = more weight in average)
      const currentWeight = confidence; // Use confidence as weight factor
      const existingWeight = 1 - confidence;

      categoryWeight.avg = categoryWeight.avg * existingWeight + actualWeight * currentWeight;
      categoryWeight.min = Math.min(categoryWeight.min, actualWeight);
      categoryWeight.max = Math.max(categoryWeight.max, actualWeight);
    }
  }

  /**
   * Learn brand-specific weight patterns
   */
  private learnBrandWeightPattern(brand: string, actualWeight: number, category: string): void {
    // Store brand patterns for future use
    const brandKey = `${brand.toLowerCase()}_${category}`;
    // This could be expanded to a brand-specific weight database
    console.log(`📊 Brand Learning: ${brand} ${category} products → ${actualWeight}kg`);
  }

  /**
   * Record weight selection for analytics and ML improvement
   * Tracks when admin chooses between HSN, ML, or manual weight entry
   */
  async recordWeightSelection(
    productName: string,
    hsnWeight: number | null,
    mlWeight: number,
    selectedWeight: number,
    selectedSource: 'hsn' | 'ml' | 'manual',
    url?: string,
    category?: string,
    hsnCode?: string,
  ): Promise<void> {
    try {
      // Determine if HSN was available
      const hsnAvailable = hsnWeight !== null && hsnWeight > 0;

      // Calculate accuracy if ML weight was tested
      const mlAccuracy =
        selectedSource === 'ml' || selectedSource === 'manual'
          ? (1 - Math.abs(mlWeight - selectedWeight) / selectedWeight) * 100
          : 0;

      // Create extended training record
      const trainingRecord = {
        name: productName,
        estimated_weight: mlWeight,
        actual_weight: selectedWeight,
        confidence: this.calculateConfidenceScore(
          { min: 0, max: 0, avg: mlWeight },
          { name: productName },
        ).confidence,
        accuracy: Math.max(0, Math.min(100, mlAccuracy)),
        url: url,
        category: category,
        brand: this.extractBrand(productName),
        user_confirmed: true,
        // Extended metadata for HSN tracking
        metadata: {
          hsn_code: hsnCode,
          hsn_weight_available: hsnAvailable,
          hsn_weight: hsnWeight,
          selected_source: selectedSource,
          weight_difference_from_hsn: hsnAvailable
            ? Math.abs((hsnWeight || 0) - selectedWeight)
            : null,
          weight_difference_from_ml: Math.abs(mlWeight - selectedWeight),
        },
      };

      // Save to training history
      const { error } = await supabase.from('ml_training_history').insert(trainingRecord);

      if (error) {
        console.error('Error saving weight selection:', error);
      } else {
        console.log(
          `📊 [Weight Selection] Recorded: ${selectedSource} selected for "${productName}"`,
        );

        // Log analytics
        if (hsnAvailable) {
          const hsnAccuracy =
            (1 - Math.abs((hsnWeight || 0) - selectedWeight) / selectedWeight) * 100;
          console.log(
            `📊 [Analytics] HSN accuracy: ${hsnAccuracy.toFixed(1)}%, ML accuracy: ${mlAccuracy.toFixed(1)}%`,
          );
        }
      }

      // If manual weight was selected, learn from it
      if (
        selectedSource === 'manual' ||
        (selectedSource === 'ml' && Math.abs(mlWeight - selectedWeight) > 0.1)
      ) {
        await this.learn(productName, selectedWeight, 0.8, url, category);
      }
    } catch (error) {
      console.error('Error recording weight selection:', error);
    }
  }

  /**
   * Update estimation accuracy metrics
   */
  private updateEstimationAccuracy(estimated: number, actual: number): void {
    const accuracy = 1 - Math.abs(estimated - actual) / actual;
    console.log(
      `🎯 Estimation Accuracy: ${(accuracy * 100).toFixed(1)}% (Est: ${estimated}kg, Actual: ${actual}kg)`,
    );
  }

  /**
   * Get confidence assessment for a given weight
   */
  assessWeightConfidence(
    productName: string,
    providedWeight: number,
    url?: string,
  ): {
    confidence: number;
    issues: string[];
    suggestions: string[];
  } {
    const issues: string[] = [];
    const suggestions: string[] = [];
    let confidence = 0.8; // Start with good confidence

    // Check against estimated weight
    const estimation = this.estimateWeight(productName, url);
    estimation.then((result) => {
      const difference = Math.abs(providedWeight - result.estimated_weight);
      const relativeDifference = difference / result.estimated_weight;

      if (relativeDifference > 2) {
        // More than 200% difference
        confidence *= 0.3;
        issues.push('Weight significantly different from estimate');
        suggestions.push('Please double-check the weight');
      } else if (relativeDifference > 1) {
        // More than 100% difference
        confidence *= 0.6;
        issues.push('Weight notably different from estimate');
      }
    });

    // Check for unrealistic weights
    if (providedWeight < 0.01) {
      confidence *= 0.2;
      issues.push('Extremely low weight (less than 10g)');
      suggestions.push('Consider packaging weight');
    }

    if (providedWeight > 50) {
      confidence *= 0.4;
      issues.push('Very high weight (over 50kg)');
      suggestions.push('Check if this includes shipping packaging');
    }

    return {
      confidence: Math.max(0.1, Math.min(0.95, confidence)),
      issues,
      suggestions,
    };
  }

  /**
   * Get ML analytics and statistics from database
   */
  async getMLAnalytics(): Promise<{
    totalProducts: number;
    totalTrainingSessions: number;
    averageAccuracy: number;
    topCategories: Array<{ category: string; count: number; avgWeight: number }>;
    recentTraining: MLTrainingHistory[];
  }> {
    try {
      // Get total products learned
      const { count: totalProducts } = await supabase
        .from('ml_product_weights')
        .select('*', { count: 'exact', head: true });

      // Get total training sessions
      const { count: totalTrainingSessions } = await supabase
        .from('ml_training_history')
        .select('*', { count: 'exact', head: true });

      // Get average accuracy
      const { data: accuracyData } = await supabase.from('ml_training_history').select('accuracy');

      const averageAccuracy = accuracyData?.length
        ? accuracyData.reduce((sum, item) => sum + item.accuracy, 0) / accuracyData.length
        : 0;

      // Get top categories
      const { data: categories } = await supabase
        .from('ml_category_weights')
        .select('*')
        .order('sample_count', { ascending: false })
        .limit(10);

      const topCategories =
        categories?.map((cat) => ({
          category: cat.category,
          count: cat.sample_count,
          avgWeight: cat.avg_weight,
        })) || [];

      // Get recent training sessions
      const { data: recentTraining } = await supabase
        .from('ml_training_history')
        .select('*')
        .order('trained_at', { ascending: false })
        .limit(10);

      return {
        totalProducts: totalProducts || 0,
        totalTrainingSessions: totalTrainingSessions || 0,
        averageAccuracy: Math.round(averageAccuracy * 100) / 100,
        topCategories,
        recentTraining: recentTraining || [],
      };
    } catch (error) {
      console.error('Error getting ML analytics:', error);
      return {
        totalProducts: 0,
        totalTrainingSessions: 0,
        averageAccuracy: 0,
        topCategories: [],
        recentTraining: [],
      };
    }
  }

  /**
   * Clear all ML data (for testing/reset purposes)
   */
  async clearMLData(): Promise<void> {
    try {
      await supabase
        .from('ml_training_history')
        .delete()
        .gte('id', '00000000-0000-0000-0000-000000000000');
      await supabase
        .from('ml_product_weights')
        .delete()
        .gte('id', '00000000-0000-0000-0000-000000000000');

      // Reset category weights to defaults
      await supabase
        .from('ml_category_weights')
        .delete()
        .gte('id', '00000000-0000-0000-0000-000000000000');

      // Re-insert default categories
      await supabase.from('ml_category_weights').insert([
        {
          category: 'electronics',
          min_weight: 0.05,
          max_weight: 5.0,
          avg_weight: 1.0,
          sample_count: 0,
        },
        {
          category: 'clothing',
          min_weight: 0.1,
          max_weight: 2.0,
          avg_weight: 0.5,
          sample_count: 0,
        },
        { category: 'books', min_weight: 0.1, max_weight: 1.0, avg_weight: 0.3, sample_count: 0 },
        { category: 'beauty', min_weight: 0.01, max_weight: 0.5, avg_weight: 0.1, sample_count: 0 },
        { category: 'toys', min_weight: 0.05, max_weight: 3.0, avg_weight: 0.8, sample_count: 0 },
        { category: 'home', min_weight: 0.1, max_weight: 10.0, avg_weight: 2.0, sample_count: 0 },
        { category: 'sports', min_weight: 0.1, max_weight: 20.0, avg_weight: 2.5, sample_count: 0 },
        {
          category: 'jewelry',
          min_weight: 0.005,
          max_weight: 0.2,
          avg_weight: 0.05,
          sample_count: 0,
        },
        { category: 'food', min_weight: 0.1, max_weight: 5.0, avg_weight: 1.0, sample_count: 0 },
        {
          category: 'general',
          min_weight: 0.05,
          max_weight: 5.0,
          avg_weight: 0.5,
          sample_count: 0,
        },
      ]);

      // Clear cache
      this.weightDatabase.clear();
      this.categoryWeights.clear();
      this.initializeCategoryWeights();
      this.dbCacheTime = 0;

      console.log('🗑️ ML data cleared and reset to defaults');
    } catch (error) {
      console.error('Error clearing ML data:', error);
    }
  }
}

// Export singleton instance
export const smartWeightEstimator = SmartWeightEstimator.getInstance();
