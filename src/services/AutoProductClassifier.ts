
class AutoProductClassifier {
  private classificationCache = new Map();
  private urlPatterns = new Map();
  private categoryKeywords = new Map();
  
  private static instance: AutoProductClassifier;
  
  public static getInstance(): AutoProductClassifier {
    if (!AutoProductClassifier.instance) {
      AutoProductClassifier.instance = new AutoProductClassifier();
    }
    return AutoProductClassifier.instance;
  }

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
