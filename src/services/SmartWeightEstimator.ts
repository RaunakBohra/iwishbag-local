// ============================================================================
// SMART WEIGHT ESTIMATOR - ML-Powered Weight Estimation Service
// Features: Product name analysis, URL parsing, category-based estimation
// ============================================================================

/**
 * Smart Weight Estimator - AI-powered weight guessing from product data
 * Helps reduce manual weight entry errors and improves shipping calculations
 */
export class SmartWeightEstimator {
  private static instance: SmartWeightEstimator;
  private weightDatabase = new Map<string, { weight: number; confidence: number }>();
  private categoryWeights = new Map<string, { min: number; max: number; avg: number }>();

  private constructor() {
    this.initializeWeightDatabase();
    this.initializeCategoryWeights();
  }

  static getInstance(): SmartWeightEstimator {
    if (!SmartWeightEstimator.instance) {
      SmartWeightEstimator.instance = new SmartWeightEstimator();
    }
    return SmartWeightEstimator.instance;
  }

  /**
   * Estimate weight from product name and optional URL
   */
  async estimateWeight(productName: string, url?: string): Promise<{
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

    // Beauty & Personal Care
    this.weightDatabase.set('perfume', { weight: 0.15, confidence: 0.8 });
    this.weightDatabase.set('shampoo', { weight: 0.4, confidence: 0.7 });
    this.weightDatabase.set('lipstick', { weight: 0.02, confidence: 0.8 });
    this.weightDatabase.set('foundation', { weight: 0.05, confidence: 0.8 });
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
    if (/\b(iphone|samsung|laptop|computer|tablet|headphones|earbuds|charger|cable|mouse|keyboard|speaker|camera|phone|mobile|smart|electronic|tech|gadget)\b/.test(text)) {
      return 'electronics';
    }

    // Clothing keywords
    if (/\b(shirt|jeans|dress|jacket|pants|shoes|sneakers|boots|clothing|apparel|fashion|wear|size|cotton|polyester)\b/.test(text)) {
      return 'clothing';
    }

    // Books keywords
    if (/\b(book|novel|paperback|hardcover|textbook|guide|manual|reading|author|isbn|pages)\b/.test(text)) {
      return 'books';
    }

    // Beauty keywords
    if (/\b(perfume|cologne|makeup|lipstick|foundation|shampoo|conditioner|cream|lotion|beauty|cosmetic|skincare)\b/.test(text)) {
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
    if (/\b(sports|fitness|gym|exercise|ball|equipment|athletic|outdoor|bike|weights)\b/.test(text)) {
      return 'sports';
    }

    // Jewelry keywords
    if (/\b(jewelry|ring|necklace|bracelet|earrings|watch|gold|silver|diamond|precious)\b/.test(text)) {
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
    if (/\b(xs|extra small)\b/.test(text)) return { multiplier: 0.6, reasoning: 'Extra small size' };
    if (/\b(s|small)\b/.test(text)) return { multiplier: 0.8, reasoning: 'Small size' };
    if (/\b(m|medium)\b/.test(text)) return { multiplier: 1.0, reasoning: 'Medium size' };
    if (/\b(l|large)\b/.test(text)) return { multiplier: 1.3, reasoning: 'Large size' };
    if (/\b(xl|extra large)\b/.test(text)) return { multiplier: 1.6, reasoning: 'Extra large size' };
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
   * Analyze URL for additional weight hints
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

      // Domain-specific logic
      if (domain.includes('amazon')) {
        reasoning.push('Amazon product detected');
        confidence = 0.7;
      }

      if (domain.includes('electronics') || path.includes('electronics')) {
        weight = 1.0;
        reasoning.push('Electronics category from URL');
      }

      if (domain.includes('books') || path.includes('books')) {
        weight = 0.3;
        reasoning.push('Books category from URL');
      }

    } catch (error) {
      reasoning.push('Could not parse URL');
    }

    return { weight, confidence, reasoning };
  }

  /**
   * Generate helpful suggestions
   */
  private generateSuggestions(productName: string, category: string, estimatedWeight: number): string[] {
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
   * Learn from actual weights to improve future estimates
   */
  async learnFromActualWeight(
    productName: string, 
    actualWeight: number, 
    url?: string
  ): Promise<void> {
    try {
      // Store the learning data
      const normalizedName = productName.toLowerCase().trim();
      this.weightDatabase.set(normalizedName, { 
        weight: actualWeight, 
        confidence: 0.95 // High confidence for learned data
      });

      // Update category averages
      const category = this.detectCategory(productName, url);
      const categoryWeight = this.categoryWeights.get(category);
      if (categoryWeight) {
        // Simple moving average update
        categoryWeight.avg = (categoryWeight.avg + actualWeight) / 2;
        categoryWeight.min = Math.min(categoryWeight.min, actualWeight);
        categoryWeight.max = Math.max(categoryWeight.max, actualWeight);
      }

    } catch (error) {
      console.error('Error learning from actual weight:', error);
    }
  }

  /**
   * Get confidence assessment for a given weight
   */
  assessWeightConfidence(
    productName: string, 
    providedWeight: number, 
    url?: string
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
    estimation.then(result => {
      const difference = Math.abs(providedWeight - result.estimated_weight);
      const relativeDifference = difference / result.estimated_weight;

      if (relativeDifference > 2) { // More than 200% difference
        confidence *= 0.3;
        issues.push('Weight significantly different from estimate');
        suggestions.push('Please double-check the weight');
      } else if (relativeDifference > 1) { // More than 100% difference
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
}

// Export singleton instance
export const smartWeightEstimator = SmartWeightEstimator.getInstance();