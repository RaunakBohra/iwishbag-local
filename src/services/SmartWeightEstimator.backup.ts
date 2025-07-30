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
