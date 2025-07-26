// ============================================================================
// LEAN WEIGHT SERVICE - Intelligent HSN + ML Weight Prediction
// Features: HSN primary, ML refinements, pattern matching, selective storage
// Designed for Supabase free tier efficiency
// ============================================================================

import { hsnWeightService, type HSNWeightData } from './HSNWeightService';
import { smartWeightEstimator } from './SmartWeightEstimator';
import { supabase } from '@/integrations/supabase/client';

interface WeightPrediction {
  weight: number;
  source: 'hsn' | 'ml' | 'pattern' | 'hybrid';
  confidence: number;
  hsnWeight?: number;
  mlWeight?: number;
  reasoning: string[];
  modifiers: string[];
}

interface WeightSelectionRecord {
  productName: string;
  hsnCode?: string;
  selectedWeight: number;
  selectedSource: 'hsn' | 'ml' | 'manual';
  hsnWeight?: number;
  mlWeight?: number;
  timestamp: Date;
}

/**
 * Lean Weight Service - Efficient weight prediction staying within free tier limits
 * Combines HSN accuracy with ML flexibility and pattern matching
 */
export class LeanWeightService {
  private static instance: LeanWeightService;
  
  // Pattern-based modifiers (no storage needed)
  private readonly sizeModifiers: Record<string, number> = {
    'mini': 0.7,
    'small': 0.85,
    'compact': 0.8,
    'lite': 0.75,
    'air': 0.8,
    'pro': 1.2,
    'plus': 1.15,
    'max': 1.5,
    'ultra': 1.6,
    'jumbo': 2.0,
    'xl': 1.3,
    'xxl': 1.6,
  };

  private readonly brandModifiers: Record<string, number> = {
    'apple': 0.95,      // Apple products typically lighter (premium materials)
    'samsung': 1.05,    // Samsung slightly heavier
    'xiaomi': 0.98,     // Xiaomi competitive weight
    'sony': 1.1,        // Sony often heavier (quality build)
    'nike': 0.9,        // Nike focuses on lightweight
    'adidas': 0.92,     // Adidas similar to Nike
    'lego': 1.2,        // LEGO sets denser than typical toys
  };

  private readonly materialIndicators: Record<string, number> = {
    'aluminum': 0.85,
    'carbon fiber': 0.7,
    'titanium': 0.9,
    'steel': 1.3,
    'plastic': 0.8,
    'glass': 1.2,
    'leather': 1.1,
    'fabric': 0.7,
  };

  // Cache for performance
  private cache = new Map<string, { prediction: WeightPrediction; timestamp: number }>();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  private constructor() {}

  static getInstance(): LeanWeightService {
    if (!LeanWeightService.instance) {
      LeanWeightService.instance = new LeanWeightService();
    }
    return LeanWeightService.instance;
  }

  /**
   * Get weight prediction using intelligent source selection
   */
  async predictWeight(
    productName: string,
    hsnCode?: string,
    productUrl?: string
  ): Promise<WeightPrediction> {
    // Check cache first
    const cacheKey = `${productName}|${hsnCode || ''}|${productUrl || ''}`;
    const cached = this.getCached(cacheKey);
    if (cached) return cached;

    const reasoning: string[] = [];
    const modifiers: string[] = [];
    let prediction: WeightPrediction;

    try {
      // Step 1: Try HSN first (most reliable)
      let hsnData: HSNWeightData | null = null;
      if (hsnCode) {
        hsnData = await hsnWeightService.getHSNWeight(hsnCode);
        if (hsnData) {
          reasoning.push(`HSN weight found for code ${hsnCode}`);
          
          // Apply pattern modifiers to HSN weight
          const modifiedWeight = this.applyModifiers(
            hsnData.average,
            productName,
            modifiers
          );
          
          if (modifiers.length > 0) {
            reasoning.push(`Applied modifiers: ${modifiers.join(', ')}`);
          }

          prediction = {
            weight: modifiedWeight,
            source: modifiers.length > 0 ? 'hybrid' : 'hsn',
            confidence: hsnData.confidence * (modifiers.length > 0 ? 0.9 : 1),
            hsnWeight: hsnData.average,
            reasoning,
            modifiers,
          };

          this.setCache(cacheKey, prediction);
          return prediction;
        }
      }

      // Step 2: Use ML estimation if no HSN
      const mlEstimation = await smartWeightEstimator.estimateWeight(
        productName,
        productUrl
      );

      reasoning.push(...mlEstimation.reasoning);

      // Step 3: Check if we should trust ML or use patterns
      if (mlEstimation.confidence >= 0.7) {
        // High confidence ML prediction
        prediction = {
          weight: mlEstimation.estimated_weight,
          source: 'ml',
          confidence: mlEstimation.confidence,
          mlWeight: mlEstimation.estimated_weight,
          reasoning,
          modifiers: [],
        };
      } else {
        // Low confidence - use pattern matching
        const patternWeight = this.estimateFromPatterns(productName, reasoning);
        prediction = {
          weight: patternWeight,
          source: 'pattern',
          confidence: 0.5,
          reasoning,
          modifiers: [],
        };
      }

      this.setCache(cacheKey, prediction);
      return prediction;

    } catch (error) {
      console.error('Weight prediction error:', error);
      
      // Fallback to pattern estimation
      const fallbackWeight = this.estimateFromPatterns(productName, reasoning);
      reasoning.push('Using fallback pattern estimation due to error');
      
      prediction = {
        weight: fallbackWeight,
        source: 'pattern',
        confidence: 0.3,
        reasoning,
        modifiers: [],
      };

      return prediction;
    }
  }

  /**
   * Apply smart modifiers to base weight
   */
  private applyModifiers(
    baseWeight: number,
    productName: string,
    modifiers: string[]
  ): number {
    let weight = baseWeight;
    const lower = productName.toLowerCase();

    // Apply size modifiers
    for (const [pattern, modifier] of Object.entries(this.sizeModifiers)) {
      if (lower.includes(pattern)) {
        weight *= modifier;
        modifiers.push(`Size: ${pattern} (${modifier}x)`);
        break; // Only apply one size modifier
      }
    }

    // Apply brand modifiers
    for (const [brand, modifier] of Object.entries(this.brandModifiers)) {
      if (lower.includes(brand)) {
        weight *= modifier;
        modifiers.push(`Brand: ${brand} (${modifier}x)`);
        break; // Only apply one brand modifier
      }
    }

    // Apply material modifiers
    for (const [material, modifier] of Object.entries(this.materialIndicators)) {
      if (lower.includes(material)) {
        weight *= modifier;
        modifiers.push(`Material: ${material} (${modifier}x)`);
        break; // Only apply one material modifier
      }
    }

    // Handle quantity indicators
    const packMatch = lower.match(/pack of (\d+)|(\d+) pack|set of (\d+)|(\d+) set/);
    if (packMatch) {
      const quantity = parseInt(
        packMatch[1] || packMatch[2] || packMatch[3] || packMatch[4]
      );
      if (quantity > 1 && quantity <= 100) {
        weight *= quantity;
        modifiers.push(`Quantity: ${quantity} units`);
      }
    }

    return Math.round(weight * 100) / 100; // Round to 2 decimals
  }

  /**
   * Pattern-based weight estimation (no ML, no HSN)
   */
  private estimateFromPatterns(productName: string, reasoning: string[]): number {
    const lower = productName.toLowerCase();
    
    // Category detection with default weights
    const categoryWeights: Record<string, number> = {
      'phone': 0.2,
      'laptop': 2.0,
      'tablet': 0.5,
      'watch': 0.15,
      'headphone': 0.3,
      'shoe': 0.8,
      'shirt': 0.25,
      'jeans': 0.6,
      'book': 0.3,
      'toy': 0.5,
      'jewelry': 0.05,
      'bag': 1.0,
    };

    // Find matching category
    for (const [category, weight] of Object.entries(categoryWeights)) {
      if (lower.includes(category)) {
        reasoning.push(`Detected category: ${category}`);
        
        // Apply modifiers to category weight
        const modifiers: string[] = [];
        return this.applyModifiers(weight, productName, modifiers);
      }
    }

    // Default weight if no pattern matches
    reasoning.push('No specific patterns detected, using default weight');
    return 0.5;
  }

  /**
   * Record weight selection for selective ML training
   */
  async recordWeightSelection(
    record: WeightSelectionRecord
  ): Promise<void> {
    try {
      // Determine if this selection is valuable for ML training
      const shouldTrainML = this.shouldTrainML(record);

      if (shouldTrainML) {
        // Only train ML on high-value data to save storage
        await smartWeightEstimator.learnFromActualWeight(
          record.productName,
          record.selectedWeight,
          undefined,
          {
            userConfirmed: true,
            originalEstimate: record.mlWeight,
          }
        );
        
        console.log(`📊 [Lean Weight] ML trained with ${record.productName} → ${record.selectedWeight}kg`);
      }

      // Always record analytics (lightweight)
      await this.recordAnalytics(record);

    } catch (error) {
      console.error('Error recording weight selection:', error);
    }
  }

  /**
   * Determine if ML should learn from this selection
   */
  private shouldTrainML(record: WeightSelectionRecord): boolean {
    // Train ML only if:
    // 1. Manual weight significantly different from HSN (>20%)
    if (record.hsnWeight && record.selectedSource === 'manual') {
      const deviation = Math.abs(record.selectedWeight - record.hsnWeight) / record.hsnWeight;
      if (deviation > 0.2) return true;
    }

    // 2. No HSN available and manual weight entered
    if (!record.hsnCode && record.selectedSource === 'manual') {
      return true;
    }

    // 3. ML was very wrong (>50% error)
    if (record.mlWeight && record.selectedSource === 'manual') {
      const mlError = Math.abs(record.selectedWeight - record.mlWeight) / record.selectedWeight;
      if (mlError > 0.5) return true;
    }

    return false;
  }

  /**
   * Lightweight analytics recording
   */
  private async recordAnalytics(record: WeightSelectionRecord): Promise<void> {
    try {
      // Simple analytics table insert (consider creating a lightweight table)
      const analyticsData = {
        product_name: record.productName,
        hsn_code: record.hsnCode,
        selected_weight: record.selectedWeight,
        selected_source: record.selectedSource,
        hsn_available: !!record.hsnWeight,
        ml_available: !!record.mlWeight,
        hsn_deviation: record.hsnWeight 
          ? Math.abs(record.selectedWeight - record.hsnWeight) / record.hsnWeight 
          : null,
        ml_deviation: record.mlWeight
          ? Math.abs(record.selectedWeight - record.mlWeight) / record.mlWeight
          : null,
        timestamp: record.timestamp,
      };

      // Log for now, can add to a simple analytics table later
      console.log('📊 [Weight Analytics]', analyticsData);

    } catch (error) {
      console.error('Analytics recording error:', error);
    }
  }

  /**
   * Get weight suggestions from both sources
   */
  async getWeightSuggestions(
    productName: string,
    hsnCode?: string,
    productUrl?: string
  ): Promise<{
    primary: WeightPrediction;
    alternatives: WeightPrediction[];
  }> {
    const alternatives: WeightPrediction[] = [];

    // Get primary prediction
    const primary = await this.predictWeight(productName, hsnCode, productUrl);

    // If we have HSN, also get ML suggestion as alternative
    if (hsnCode && primary.source === 'hsn') {
      try {
        const mlEstimation = await smartWeightEstimator.estimateWeight(
          productName,
          productUrl
        );
        
        if (mlEstimation.confidence > 0.5) {
          alternatives.push({
            weight: mlEstimation.estimated_weight,
            source: 'ml',
            confidence: mlEstimation.confidence,
            mlWeight: mlEstimation.estimated_weight,
            reasoning: mlEstimation.reasoning,
            modifiers: [],
          });
        }
      } catch (error) {
        // Silently fail for alternatives
      }
    }

    // If primary is not HSN, try to get HSN suggestion
    if (hsnCode && primary.source !== 'hsn') {
      try {
        const hsnData = await hsnWeightService.getHSNWeight(hsnCode);
        if (hsnData) {
          alternatives.push({
            weight: hsnData.average,
            source: 'hsn',
            confidence: hsnData.confidence,
            hsnWeight: hsnData.average,
            reasoning: [`HSN weight for code ${hsnCode}`],
            modifiers: [],
          });
        }
      } catch (error) {
        // Silently fail for alternatives
      }
    }

    return { primary, alternatives };
  }

  /**
   * Cache management
   */
  private getCached(key: string): WeightPrediction | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.prediction;
    }
    return null;
  }

  private setCache(key: string, prediction: WeightPrediction): void {
    this.cache.set(key, {
      prediction,
      timestamp: Date.now(),
    });

    // Limit cache size
    if (this.cache.size > 1000) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
    console.log('🧹 [Lean Weight] Cache cleared');
  }

  /**
   * Get service statistics
   */
  getStats(): {
    cacheSize: number;
    patterns: {
      sizes: number;
      brands: number;
      materials: number;
    };
  } {
    return {
      cacheSize: this.cache.size,
      patterns: {
        sizes: Object.keys(this.sizeModifiers).length,
        brands: Object.keys(this.brandModifiers).length,
        materials: Object.keys(this.materialIndicators).length,
      },
    };
  }
}

// Export singleton instance
export const leanWeightService = LeanWeightService.getInstance();
export type { WeightPrediction, WeightSelectionRecord };