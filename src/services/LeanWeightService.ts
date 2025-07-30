// ============================================================================
// LEAN WEIGHT SERVICE - Intelligent ML refinements, pattern matching, selective storage
// Designed for Supabase free tier efficiency
// ============================================================================

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