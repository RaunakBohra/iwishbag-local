/**
 * Weight Estimation Service
 * ML-powered weight estimation system with persistent learning capabilities
 */

import { logger } from '@/utils/logger';
import { ProductData } from './ProductScrapingEngine';

export interface WeightEstimationData {
  title: string;
  category: string;
  brand?: string;
  price?: number;
  specifications?: Record<string, any>;
  dimensions?: {
    length?: number;
    width?: number;
    height?: number;
    unit: 'cm' | 'inch';
  };
  material?: string;
  platform?: string;
}

export interface WeightPrediction {
  weight: number;
  confidence: number; // 0-1
  method: 'exact' | 'category-based' | 'ml-estimated' | 'dimension-based' | 'material-based';
  factors: string[];
  unit: 'kg' | 'lbs';
}

export interface WeightLearningData {
  input: WeightEstimationData;
  actualWeight: number;
  predictedWeight: number;
  accuracy: number;
  timestamp: Date;
}

export class WeightEstimationService {
  private learningData: WeightLearningData[] = [];
  private categoryWeights: Map<string, { average: number; samples: number; stdDev: number }> = new Map();
  private brandWeights: Map<string, { average: number; samples: number }> = new Map();
  private materialWeights: Map<string, { densityFactor: number; samples: number }> = new Map();
  
  constructor() {
    this.initializeBaseWeights();
    this.initializeMaterialDensities();
  }

  /**
   * Estimate weight for a product with confidence scoring
   */
  estimateWeight(data: WeightEstimationData): WeightPrediction {
    try {
      // Try multiple estimation methods and pick the best one
      const estimations: WeightPrediction[] = [
        this.estimateByDimensions(data),
        this.estimateByCategory(data),
        this.estimateByBrand(data),
        this.estimateByMaterial(data),
        this.estimateByPriceCorrelation(data),
        this.estimateByMLModel(data)
      ].filter(estimation => estimation !== null) as WeightPrediction[];

      if (estimations.length === 0) {
        return this.getFallbackEstimation(data);
      }

      // Sort by confidence and select the best estimation
      estimations.sort((a, b) => b.confidence - a.confidence);
      const bestEstimation = estimations[0];

      // If we have multiple high-confidence estimations, use weighted average
      const highConfidenceEstimations = estimations.filter(e => e.confidence >= 0.7);
      if (highConfidenceEstimations.length > 1) {
        return this.combineEstimations(highConfidenceEstimations);
      }

      logger.info('Weight estimation completed', {
        title: data.title,
        method: bestEstimation.method,
        weight: bestEstimation.weight,
        confidence: bestEstimation.confidence
      });

      return bestEstimation;

    } catch (error) {
      logger.error('Weight estimation error:', error);
      return this.getFallbackEstimation(data);
    }
  }

  /**
   * Estimate weight based on product dimensions
   */
  private estimateByDimensions(data: WeightEstimationData): WeightPrediction | null {
    if (!data.dimensions || !data.dimensions.length || !data.dimensions.width || !data.dimensions.height) {
      return null;
    }

    const { length, width, height, unit } = data.dimensions;
    
    // Convert to cubic meters
    let volumeM3: number;
    if (unit === 'cm') {
      volumeM3 = (length! * width * height) / 1000000; // cm³ to m³
    } else { // inches
      volumeM3 = (length! * width * height) * 0.0000163871; // in³ to m³
    }

    // Get density factor based on category and material
    let densityFactor = this.getDensityFactor(data.category, data.material);
    
    // Category-specific density adjustments
    const categoryLower = data.category.toLowerCase();
    if (categoryLower.includes('electronics')) {
      densityFactor = this.adjustElectronicsDensity(data.title, densityFactor);
    } else if (categoryLower.includes('fashion')) {
      densityFactor = this.adjustFashionDensity(data.title, densityFactor);
    } else if (categoryLower.includes('furniture')) {
      densityFactor = this.adjustFurnitureDensity(data.title, data.material, densityFactor);
    }

    const estimatedWeight = volumeM3 * densityFactor;
    
    // Sanity check
    if (estimatedWeight <= 0 || estimatedWeight > 1000) {
      return null;
    }

    const confidence = this.calculateDimensionConfidence(data, volumeM3, estimatedWeight);

    return {
      weight: Math.round(estimatedWeight * 1000) / 1000,
      confidence,
      method: 'dimension-based',
      factors: [
        `Volume: ${(volumeM3 * 1000000).toFixed(2)} cm³`,
        `Density factor: ${densityFactor}`,
        `Category: ${data.category}`
      ],
      unit: 'kg'
    };
  }

  /**
   * Estimate weight based on category patterns
   */
  private estimateByCategory(data: WeightEstimationData): WeightPrediction {
    const categoryLower = data.category.toLowerCase();
    const titleLower = data.title.toLowerCase();
    
    let baseWeight = this.getCategoryBaseWeight(categoryLower);
    let confidence = 0.6; // Default category confidence
    const factors: string[] = [`Category: ${data.category}`];

    // Apply title-based adjustments
    const titleAdjustments = this.getTitleWeightAdjustments(titleLower, categoryLower);
    baseWeight *= titleAdjustments.multiplier;
    confidence += titleAdjustments.confidenceBonus;
    factors.push(...titleAdjustments.factors);

    // Apply size indicators
    const sizeAdjustment = this.getSizeAdjustment(titleLower);
    baseWeight *= sizeAdjustment.multiplier;
    if (sizeAdjustment.detected) {
      confidence += 0.1;
      factors.push(`Size indicator: ${sizeAdjustment.indicator}`);
    }

    // Use historical data if available
    const categoryData = this.categoryWeights.get(categoryLower);
    if (categoryData && categoryData.samples >= 5) {
      // Blend with historical average
      const historicalWeight = categoryData.average;
      const blendRatio = Math.min(categoryData.samples / 100, 0.7);
      baseWeight = baseWeight * (1 - blendRatio) + historicalWeight * blendRatio;
      confidence += 0.15;
      factors.push(`Historical data: ${categoryData.samples} samples`);
    }

    return {
      weight: Math.round(baseWeight * 1000) / 1000,
      confidence: Math.min(confidence, 0.95),
      method: 'category-based',
      factors,
      unit: 'kg'
    };
  }

  /**
   * Estimate weight based on brand patterns
   */
  private estimateByBrand(data: WeightEstimationData): WeightPrediction | null {
    if (!data.brand) return null;

    const brandLower = data.brand.toLowerCase();
    const brandData = this.brandWeights.get(brandLower);
    
    if (!brandData || brandData.samples < 3) {
      return null; // Not enough brand data
    }

    const categoryWeight = this.estimateByCategory(data).weight;
    const brandWeight = brandData.average;
    
    // Blend category and brand estimates
    const blendRatio = Math.min(brandData.samples / 50, 0.4);
    const estimatedWeight = categoryWeight * (1 - blendRatio) + brandWeight * blendRatio;
    
    const confidence = 0.5 + (brandData.samples / 100) * 0.3;

    return {
      weight: Math.round(estimatedWeight * 1000) / 1000,
      confidence: Math.min(confidence, 0.8),
      method: 'category-based', // Still primarily category-based
      factors: [
        `Brand: ${data.brand}`,
        `Brand samples: ${brandData.samples}`,
        `Category baseline: ${categoryWeight}kg`
      ],
      unit: 'kg'
    };
  }

  /**
   * Estimate weight based on material properties
   */
  private estimateByMaterial(data: WeightEstimationData): WeightPrediction | null {
    if (!data.material) return null;

    const materialLower = data.material.toLowerCase();
    const materialData = this.materialWeights.get(materialLower);
    
    if (!materialData) return null;

    // Get base category weight and adjust by material density
    const categoryWeight = this.estimateByCategory(data).weight;
    const materialAdjustedWeight = categoryWeight * materialData.densityFactor;

    const confidence = 0.4 + (materialData.samples / 20) * 0.2;

    return {
      weight: Math.round(materialAdjustedWeight * 1000) / 1000,
      confidence: Math.min(confidence, 0.7),
      method: 'material-based',
      factors: [
        `Material: ${data.material}`,
        `Density factor: ${materialData.densityFactor}`,
        `Category baseline: ${categoryWeight}kg`
      ],
      unit: 'kg'
    };
  }

  /**
   * Estimate weight based on price correlation (luxury goods, etc.)
   */
  private estimateByPriceCorrelation(data: WeightEstimationData): WeightPrediction | null {
    if (!data.price || data.price <= 0) return null;

    const categoryLower = data.category.toLowerCase();
    
    // Price-weight correlation is useful for certain categories
    if (!this.hasPriceWeightCorrelation(categoryLower)) {
      return null;
    }

    const baseWeight = this.estimateByCategory(data).weight;
    const priceAdjustment = this.getPriceWeightAdjustment(data.price, categoryLower);
    
    if (priceAdjustment.multiplier === 1.0) {
      return null; // No price adjustment needed
    }

    const estimatedWeight = baseWeight * priceAdjustment.multiplier;
    
    return {
      weight: Math.round(estimatedWeight * 1000) / 1000,
      confidence: priceAdjustment.confidence,
      method: 'category-based',
      factors: [
        `Price: $${data.price}`,
        `Price tier: ${priceAdjustment.tier}`,
        `Category baseline: ${baseWeight}kg`
      ],
      unit: 'kg'
    };
  }

  /**
   * ML-based weight estimation (simplified neural network approach)
   */
  private estimateByMLModel(data: WeightEstimationData): WeightPrediction | null {
    // This would integrate with a more sophisticated ML model
    // For now, using a simplified rule-based approach that mimics ML patterns
    
    if (this.learningData.length < 100) {
      return null; // Need more training data
    }

    // Find similar products in learning data
    const similarProducts = this.findSimilarProducts(data, 10);
    if (similarProducts.length < 3) {
      return null;
    }

    // Calculate weighted average based on similarity
    let weightedSum = 0;
    let weightSum = 0;
    const factors: string[] = [];

    similarProducts.forEach((similar, index) => {
      const similarity = this.calculateSimilarity(data, similar.input);
      const weight = Math.pow(similarity, 2); // Square to emphasize closer matches
      
      weightedSum += similar.actualWeight * weight;
      weightSum += weight;
      
      if (index < 3) {
        factors.push(`Similar: ${similar.input.title.substring(0, 30)}... (${(similarity * 100).toFixed(0)}%)`);
      }
    });

    const estimatedWeight = weightedSum / weightSum;
    const confidence = Math.min(0.4 + (similarProducts.length / 50) * 0.4, 0.85);

    return {
      weight: Math.round(estimatedWeight * 1000) / 1000,
      confidence,
      method: 'ml-estimated',
      factors: [
        `Similar products: ${similarProducts.length}`,
        ...factors
      ],
      unit: 'kg'
    };
  }

  /**
   * Combine multiple high-confidence estimations
   */
  private combineEstimations(estimations: WeightPrediction[]): WeightPrediction {
    let weightedSum = 0;
    let weightSum = 0;
    const combinedFactors: string[] = [];
    const methods: string[] = [];

    estimations.forEach(estimation => {
      const weight = Math.pow(estimation.confidence, 2);
      weightedSum += estimation.weight * weight;
      weightSum += weight;
      
      methods.push(estimation.method);
      combinedFactors.push(`${estimation.method}: ${estimation.weight}kg (${(estimation.confidence * 100).toFixed(0)}%)`);
    });

    const combinedWeight = weightedSum / weightSum;
    const combinedConfidence = Math.min(
      estimations.reduce((sum, e) => sum + e.confidence, 0) / estimations.length * 1.1,
      0.95
    );

    return {
      weight: Math.round(combinedWeight * 1000) / 1000,
      confidence: combinedConfidence,
      method: 'ml-estimated',
      factors: [
        `Combined from ${methods.join(', ')}`,
        ...combinedFactors.slice(0, 3)
      ],
      unit: 'kg'
    };
  }

  /**
   * Learn from actual weight data to improve future predictions
   */
  learnFromActualWeight(data: WeightEstimationData, actualWeight: number): void {
    try {
      const prediction = this.estimateWeight(data);
      const accuracy = 1 - Math.abs(prediction.weight - actualWeight) / actualWeight;

      // Store learning data
      const learningEntry: WeightLearningData = {
        input: data,
        actualWeight,
        predictedWeight: prediction.weight,
        accuracy: Math.max(0, Math.min(1, accuracy)),
        timestamp: new Date()
      };

      this.learningData.push(learningEntry);

      // Update category weights
      this.updateCategoryWeights(data.category, actualWeight);

      // Update brand weights
      if (data.brand) {
        this.updateBrandWeights(data.brand, actualWeight);
      }

      // Update material weights
      if (data.material) {
        this.updateMaterialWeights(data.material, actualWeight, data);
      }

      // Trim learning data to prevent memory issues (keep last 10000 entries)
      if (this.learningData.length > 10000) {
        this.learningData = this.learningData.slice(-10000);
      }

      logger.info('Weight estimation learning update', {
        category: data.category,
        actualWeight,
        predictedWeight: prediction.weight,
        accuracy: accuracy * 100
      });

    } catch (error) {
      logger.error('Weight learning error:', error);
    }
  }

  /**
   * Helper methods
   */
  private initializeBaseWeights(): void {
    const baseWeights = {
      'electronics': { average: 0.8, samples: 1000, stdDev: 1.2 },
      'fashion': { average: 0.3, samples: 800, stdDev: 0.4 },
      'footwear': { average: 0.6, samples: 300, stdDev: 0.3 },
      'home': { average: 2.0, samples: 500, stdDev: 5.0 },
      'furniture': { average: 15.0, samples: 200, stdDev: 20.0 },
      'books': { average: 0.4, samples: 600, stdDev: 0.3 },
      'toys': { average: 0.6, samples: 400, stdDev: 1.0 },
      'sports': { average: 1.0, samples: 300, stdDev: 2.0 },
      'beauty': { average: 0.2, samples: 500, stdDev: 0.3 },
      'jewelry': { average: 0.1, samples: 200, stdDev: 0.2 },
      'automotive': { average: 5.0, samples: 100, stdDev: 10.0 },
      'general': { average: 0.5, samples: 200, stdDev: 1.0 }
    };

    Object.entries(baseWeights).forEach(([category, data]) => {
      this.categoryWeights.set(category, data);
    });
  }

  private initializeMaterialDensities(): void {
    const materialDensities = {
      'plastic': { densityFactor: 0.7, samples: 100 },
      'metal': { densityFactor: 2.5, samples: 80 },
      'wood': { densityFactor: 1.2, samples: 60 },
      'glass': { densityFactor: 2.0, samples: 40 },
      'cotton': { densityFactor: 0.3, samples: 150 },
      'polyester': { densityFactor: 0.4, samples: 120 },
      'leather': { densityFactor: 0.8, samples: 70 },
      'silk': { densityFactor: 0.2, samples: 30 },
      'ceramic': { densityFactor: 1.8, samples: 25 },
      'aluminum': { densityFactor: 1.8, samples: 45 },
      'steel': { densityFactor: 4.0, samples: 35 },
      'carbon-fiber': { densityFactor: 1.0, samples: 15 }
    };

    Object.entries(materialDensities).forEach(([material, data]) => {
      this.materialWeights.set(material, data);
    });
  }

  private getCategoryBaseWeight(category: string): number {
    const categoryData = this.categoryWeights.get(category);
    return categoryData?.average || 0.5;
  }

  private getDensityFactor(category: string, material?: string): number {
    if (material) {
      const materialData = this.materialWeights.get(material.toLowerCase());
      if (materialData) {
        return materialData.densityFactor * 100; // Convert to kg/m³
      }
    }

    // Default densities by category (kg/m³)
    const categoryDensities: Record<string, number> = {
      'electronics': 300,
      'fashion': 100,
      'furniture': 200,
      'books': 700,
      'toys': 150,
      'sports': 200,
      'beauty': 800,
      'jewelry': 5000,
      'home': 300
    };

    return categoryDensities[category] || 200;
  }

  private getTitleWeightAdjustments(title: string, category: string): {
    multiplier: number;
    confidenceBonus: number;
    factors: string[];
  } {
    let multiplier = 1.0;
    let confidenceBonus = 0;
    const factors: string[] = [];

    // Electronics specific adjustments
    if (category.includes('electronics')) {
      if (title.includes('laptop')) {
        multiplier = 2.5;
        confidenceBonus = 0.2;
        factors.push('Laptop detected');
      } else if (title.includes('phone') || title.includes('smartphone')) {
        multiplier = 0.25;
        confidenceBonus = 0.15;
        factors.push('Phone detected');
      } else if (title.includes('tablet')) {
        multiplier = 0.6;
        confidenceBonus = 0.15;
        factors.push('Tablet detected');
      } else if (title.includes('tv') || title.includes('television')) {
        multiplier = 10;
        confidenceBonus = 0.2;
        factors.push('TV detected');
      }
    }

    // Fashion specific adjustments
    else if (category.includes('fashion')) {
      if (title.includes('jacket') || title.includes('coat')) {
        multiplier = 2.6;
        confidenceBonus = 0.1;
        factors.push('Heavy outerwear detected');
      } else if (title.includes('jeans') || title.includes('pants')) {
        multiplier = 1.3;
        confidenceBonus = 0.1;
        factors.push('Pants detected');
      } else if (title.includes('t-shirt') || title.includes('shirt')) {
        multiplier = 0.7;
        confidenceBonus = 0.1;
        factors.push('Shirt detected');
      }
    }

    return { multiplier, confidenceBonus, factors };
  }

  private getSizeAdjustment(title: string): {
    multiplier: number;
    detected: boolean;
    indicator?: string;
  } {
    const sizePatterns = [
      { pattern: /\b(mini|small|xs|extra small)\b/i, multiplier: 0.6, name: 'small' },
      { pattern: /\b(large|big|xl|extra large|xxl)\b/i, multiplier: 1.4, name: 'large' },
      { pattern: /\b(medium|m|regular)\b/i, multiplier: 1.0, name: 'medium' },
      { pattern: /\b(giant|huge|massive|oversized)\b/i, multiplier: 2.0, name: 'oversized' },
      { pattern: /\b(compact|portable|travel-size)\b/i, multiplier: 0.7, name: 'compact' }
    ];

    for (const { pattern, multiplier, name } of sizePatterns) {
      if (pattern.test(title)) {
        return { multiplier, detected: true, indicator: name };
      }
    }

    return { multiplier: 1.0, detected: false };
  }

  private calculateDimensionConfidence(
    data: WeightEstimationData,
    volume: number,
    estimatedWeight: number
  ): number {
    let confidence = 0.8; // Base confidence for dimension-based estimation

    // Adjust based on category (some categories have more predictable densities)
    if (data.category.includes('electronics')) confidence += 0.1;
    if (data.category.includes('fashion')) confidence -= 0.1;
    if (data.category.includes('furniture')) confidence += 0.05;

    // Adjust based on material information
    if (data.material) confidence += 0.1;

    // Sanity checks
    if (estimatedWeight < 0.01 || estimatedWeight > 100) confidence -= 0.3;
    if (volume < 0.000001 || volume > 1) confidence -= 0.2; // Very small or very large volumes

    return Math.max(0.1, Math.min(0.95, confidence));
  }

  private hasPriceWeightCorrelation(category: string): boolean {
    const correlationCategories = ['jewelry', 'electronics', 'luxury', 'automotive', 'sports'];
    return correlationCategories.some(cat => category.includes(cat));
  }

  private getPriceWeightAdjustment(price: number, category: string): {
    multiplier: number;
    confidence: number;
    tier: string;
  } {
    // Price tiers vary by category
    let tiers: { threshold: number; multiplier: number; name: string }[];

    if (category.includes('electronics')) {
      tiers = [
        { threshold: 50, multiplier: 0.7, name: 'budget' },
        { threshold: 200, multiplier: 1.0, name: 'mid-range' },
        { threshold: 1000, multiplier: 1.3, name: 'premium' },
        { threshold: Infinity, multiplier: 1.6, name: 'luxury' }
      ];
    } else if (category.includes('jewelry')) {
      tiers = [
        { threshold: 100, multiplier: 0.8, name: 'costume' },
        { threshold: 500, multiplier: 1.2, name: 'fine' },
        { threshold: 2000, multiplier: 1.8, name: 'luxury' },
        { threshold: Infinity, multiplier: 2.5, name: 'haute' }
      ];
    } else {
      return { multiplier: 1.0, confidence: 0.3, tier: 'standard' };
    }

    for (const tier of tiers) {
      if (price <= tier.threshold) {
        return {
          multiplier: tier.multiplier,
          confidence: 0.4,
          tier: tier.name
        };
      }
    }

    return { multiplier: 1.0, confidence: 0.3, tier: 'standard' };
  }

  private findSimilarProducts(data: WeightEstimationData, count: number): WeightLearningData[] {
    const similarities = this.learningData.map(entry => ({
      entry,
      similarity: this.calculateSimilarity(data, entry.input)
    }));

    return similarities
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, count)
      .map(item => item.entry);
  }

  private calculateSimilarity(data1: WeightEstimationData, data2: WeightEstimationData): number {
    let similarity = 0;
    let factors = 0;

    // Category similarity (most important)
    if (data1.category === data2.category) {
      similarity += 0.4;
    } else if (data1.category.split('-')[0] === data2.category.split('-')[0]) {
      similarity += 0.2;
    }
    factors += 0.4;

    // Brand similarity
    if (data1.brand && data2.brand) {
      if (data1.brand.toLowerCase() === data2.brand.toLowerCase()) {
        similarity += 0.15;
      }
      factors += 0.15;
    }

    // Title similarity (simplified)
    const title1Words = data1.title.toLowerCase().split(/\s+/);
    const title2Words = data2.title.toLowerCase().split(/\s+/);
    const commonWords = title1Words.filter(word => 
      word.length > 3 && title2Words.includes(word)
    ).length;
    const titleSim = commonWords / Math.max(title1Words.length, title2Words.length);
    similarity += titleSim * 0.25;
    factors += 0.25;

    // Price similarity
    if (data1.price && data2.price) {
      const priceDiff = Math.abs(data1.price - data2.price) / Math.max(data1.price, data2.price);
      const priceSim = Math.max(0, 1 - priceDiff);
      similarity += priceSim * 0.1;
      factors += 0.1;
    }

    // Material similarity
    if (data1.material && data2.material) {
      if (data1.material.toLowerCase() === data2.material.toLowerCase()) {
        similarity += 0.1;
      }
      factors += 0.1;
    }

    return factors > 0 ? similarity / factors : 0;
  }

  private updateCategoryWeights(category: string, actualWeight: number): void {
    const current = this.categoryWeights.get(category) || { average: 0.5, samples: 0, stdDev: 0 };
    
    const newSamples = current.samples + 1;
    const newAverage = (current.average * current.samples + actualWeight) / newSamples;
    
    // Simple running standard deviation approximation
    const newStdDev = current.samples === 0 ? 0 : 
      Math.sqrt((current.stdDev * current.stdDev * current.samples + 
                Math.pow(actualWeight - newAverage, 2)) / newSamples);

    this.categoryWeights.set(category, {
      average: newAverage,
      samples: newSamples,
      stdDev: newStdDev
    });
  }

  private updateBrandWeights(brand: string, actualWeight: number): void {
    const brandLower = brand.toLowerCase();
    const current = this.brandWeights.get(brandLower) || { average: 0.5, samples: 0 };
    
    const newSamples = current.samples + 1;
    const newAverage = (current.average * current.samples + actualWeight) / newSamples;

    this.brandWeights.set(brandLower, {
      average: newAverage,
      samples: newSamples
    });
  }

  private updateMaterialWeights(material: string, actualWeight: number, data: WeightEstimationData): void {
    const materialLower = material.toLowerCase();
    const current = this.materialWeights.get(materialLower) || { densityFactor: 1.0, samples: 0 };
    
    // Estimate density factor based on category baseline
    const categoryBaseline = this.getCategoryBaseWeight(data.category);
    const densityFactor = categoryBaseline > 0 ? actualWeight / categoryBaseline : 1.0;
    
    const newSamples = current.samples + 1;
    const newDensityFactor = (current.densityFactor * current.samples + densityFactor) / newSamples;

    this.materialWeights.set(materialLower, {
      densityFactor: newDensityFactor,
      samples: newSamples
    });
  }

  private adjustElectronicsDensity(title: string, baseDensity: number): number {
    const titleLower = title.toLowerCase();
    if (titleLower.includes('laptop') || titleLower.includes('computer')) return baseDensity * 1.5;
    if (titleLower.includes('phone') || titleLower.includes('mobile')) return baseDensity * 2.0;
    if (titleLower.includes('tv') || titleLower.includes('monitor')) return baseDensity * 0.3;
    return baseDensity;
  }

  private adjustFashionDensity(title: string, baseDensity: number): number {
    const titleLower = title.toLowerCase();
    if (titleLower.includes('jacket') || titleLower.includes('coat')) return baseDensity * 1.8;
    if (titleLower.includes('dress') || titleLower.includes('gown')) return baseDensity * 1.2;
    if (titleLower.includes('t-shirt') || titleLower.includes('tank')) return baseDensity * 0.6;
    return baseDensity;
  }

  private adjustFurnitureDensity(title: string, material: string | undefined, baseDensity: number): number {
    let density = baseDensity;
    
    const titleLower = title.toLowerCase();
    if (titleLower.includes('table') || titleLower.includes('desk')) density *= 1.5;
    if (titleLower.includes('chair')) density *= 0.8;
    if (titleLower.includes('sofa') || titleLower.includes('couch')) density *= 0.6;
    
    if (material) {
      const materialLower = material.toLowerCase();
      if (materialLower.includes('metal') || materialLower.includes('steel')) density *= 2.0;
      if (materialLower.includes('wood') || materialLower.includes('oak')) density *= 1.3;
      if (materialLower.includes('plastic')) density *= 0.4;
    }
    
    return density;
  }

  private getFallbackEstimation(data: WeightEstimationData): WeightPrediction {
    return {
      weight: 0.5,
      confidence: 0.1,
      method: 'category-based',
      factors: ['Fallback estimation'],
      unit: 'kg'
    };
  }

  /**
   * Get learning statistics
   */
  getLearningStats(): {
    totalSamples: number;
    averageAccuracy: number;
    categoryCoverage: number;
    brandCoverage: number;
    recentAccuracy: number;
  } {
    const totalSamples = this.learningData.length;
    
    if (totalSamples === 0) {
      return {
        totalSamples: 0,
        averageAccuracy: 0,
        categoryCoverage: 0,
        brandCoverage: 0,
        recentAccuracy: 0
      };
    }

    const averageAccuracy = this.learningData.reduce((sum, entry) => sum + entry.accuracy, 0) / totalSamples;
    
    const recentSamples = this.learningData.slice(-100);
    const recentAccuracy = recentSamples.reduce((sum, entry) => sum + entry.accuracy, 0) / recentSamples.length;
    
    const categoryCoverage = this.categoryWeights.size;
    const brandCoverage = this.brandWeights.size;

    return {
      totalSamples,
      averageAccuracy: averageAccuracy * 100,
      categoryCoverage,
      brandCoverage,
      recentAccuracy: recentAccuracy * 100
    };
  }
}

// Export singleton instance
export const weightEstimationService = new WeightEstimationService();