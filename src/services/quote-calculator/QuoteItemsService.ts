/**
 * Quote Items Service
 * Handles item management, AI suggestions, weight calculations, and validations
 * Decomposed from QuoteCalculatorV2 for better separation of concerns
 */

import { logger } from '@/utils/logger';
import { productIntelligenceService } from '@/services/ProductIntelligenceService';
import { volumetricWeightService } from '@/services/VolumetricWeightService';
import { weightDetectionService } from '@/services/WeightDetectionService';
import { autoProductClassifier } from '@/services/AutoProductClassifier';
import type { QuoteItem } from './QuoteFormStateService';

export interface AIWeightSuggestion {
  weight: number;
  confidence: number;
  source: 'ai_model' | 'category_average' | 'similar_product';
  reasoning?: string;
}

export interface VolumetricWeightResult {
  volumetricWeight: number;
  actualWeight: number;
  chargeableWeight: number;
  dimensions: {
    length: number;
    width: number;
    height: number;
    unit: 'cm' | 'in';
  };
  divisor: number;
}

export interface ItemValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
}

export interface ItemEnhancement {
  category?: string;
  suggestedPrice?: number;
  suggestedWeight?: number;
  images?: string[];
  specifications?: Record<string, string>;
  brandInfo?: {
    name: string;
    confidence: number;
  };
}

export interface BulkOperationResult {
  successful: number;
  failed: number;
  errors: string[];
  processedItems: string[];
}

export interface ItemAnalytics {
  totalItems: number;
  totalValue: number;
  averagePrice: number;
  totalWeight: number;
  categoriesCount: Record<string, number>;
  missingWeightCount: number;
  missingCategoryCount: number;
  averageConfidence: number;
}

export class QuoteItemsService {
  private cache = new Map<string, any>();
  private readonly CACHE_DURATION = 30 * 60 * 1000; // 30 minutes
  
  // Category-based weight averages (in kg)
  private readonly CATEGORY_WEIGHT_AVERAGES: Record<string, number> = {
    'electronics': 0.8,
    'clothing': 0.3,
    'books': 0.4,
    'shoes': 0.6,
    'toys': 0.5,
    'home_decor': 1.2,
    'kitchenware': 0.9,
    'beauty': 0.2,
    'sports': 1.5,
    'jewelry': 0.1,
    'bags': 0.4,
    'watches': 0.3,
    'furniture': 15.0,
    'appliances': 5.0
  };

  // Price range validations by category
  private readonly CATEGORY_PRICE_RANGES: Record<string, { min: number; max: number; typical: number }> = {
    'electronics': { min: 10, max: 5000, typical: 200 },
    'clothing': { min: 5, max: 500, typical: 50 },
    'books': { min: 3, max: 100, typical: 15 },
    'shoes': { min: 15, max: 800, typical: 80 },
    'toys': { min: 5, max: 300, typical: 25 },
    'home_decor': { min: 10, max: 1000, typical: 75 },
    'beauty': { min: 5, max: 200, typical: 30 },
    'jewelry': { min: 10, max: 10000, typical: 150 }
  };

  constructor() {
    logger.info('QuoteItemsService initialized');
  }

  /**
   * Create new item with defaults
   */
  createNewItem(template?: Partial<QuoteItem>): QuoteItem {
    return {
      id: crypto.randomUUID(),
      name: '',
      url: '',
      quantity: 1,
      unit_price_origin: 0,
      weight_kg: undefined,
      category: '',
      notes: '',
      ...template
    };
  }

  /**
   * Validate item data
   */
  validateItem(item: QuoteItem): ItemValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    // Required field validations
    if (!item.name?.trim()) {
      errors.push('Item name is required');
    }

    if (item.unit_price_origin <= 0) {
      errors.push('Item price must be greater than 0');
    }

    if (item.quantity <= 0) {
      errors.push('Quantity must be greater than 0');
    }

    // Weight validations
    if (!item.weight_kg && !item.ai_weight_suggestion) {
      warnings.push('No weight provided - calculations may be inaccurate');
      suggestions.push('Consider using AI weight suggestion or enter manual weight');
    }

    if (item.weight_kg && item.weight_kg <= 0) {
      errors.push('Weight must be greater than 0');
    }

    // Price range validations
    if (item.category && this.CATEGORY_PRICE_RANGES[item.category]) {
      const range = this.CATEGORY_PRICE_RANGES[item.category];
      if (item.unit_price_origin < range.min) {
        warnings.push(`Price seems low for ${item.category} (typically $${range.typical})`);
      } else if (item.unit_price_origin > range.max) {
        warnings.push(`Price seems high for ${item.category} (typically $${range.typical})`);
      }
    }

    // URL validation
    if (item.url && !this.isValidURL(item.url)) {
      errors.push('Invalid URL format');
    }

    // Volumetric weight validation
    if (item.dimensions && item.volumetric_divisor) {
      const volumetricResult = this.calculateVolumetricWeight(item.dimensions, item.volumetric_divisor);
      if (volumetricResult.chargeableWeight > (item.weight_kg || 0)) {
        warnings.push(`Volumetric weight (${volumetricResult.chargeableWeight}kg) exceeds actual weight`);
      }
    }

    // HSN code validation
    if (item.hsn_code && !this.isValidHSNCode(item.hsn_code)) {
      errors.push('Invalid HSN code format');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions
    };
  }

  /**
   * Get AI weight suggestion for item
   */
  async getAIWeightSuggestion(item: QuoteItem, destinationCountry: string): Promise<AIWeightSuggestion | null> {
    if (!item.name?.trim()) return null;

    const cacheKey = `ai_weight_${item.name}_${item.category || 'unknown'}_${destinationCountry}`;
    const cached = this.getFromCache<AIWeightSuggestion>(cacheKey);
    if (cached) return cached;

    try {
      // First try product intelligence service
      const suggestion = await productIntelligenceService.getSmartSuggestions({
        product_name: item.name,
        destination_country: destinationCountry,
        category: item.category,
        product_url: item.url
      });

      if (suggestion?.suggested_weight_kg && suggestion.suggested_weight_kg > 0) {
        const aiSuggestion: AIWeightSuggestion = {
          weight: suggestion.suggested_weight_kg,
          confidence: suggestion.weight_confidence || 0.75,
          source: 'ai_model',
          reasoning: suggestion.reasoning || 'Based on product analysis and similar items'
        };

        this.setCache(cacheKey, aiSuggestion);
        return aiSuggestion;
      }

      // Fallback to category average
      if (item.category && this.CATEGORY_WEIGHT_AVERAGES[item.category]) {
        const categoryWeight: AIWeightSuggestion = {
          weight: this.CATEGORY_WEIGHT_AVERAGES[item.category],
          confidence: 0.5,
          source: 'category_average',
          reasoning: `Average weight for ${item.category} category`
        };

        this.setCache(cacheKey, categoryWeight, 10 * 60 * 1000); // Cache category averages for 10 minutes
        return categoryWeight;
      }

      // Try weight detection service as final fallback
      const detectedWeight = await weightDetectionService.detectWeight(item.name, item.category);
      if (detectedWeight && detectedWeight > 0) {
        const detectionSuggestion: AIWeightSuggestion = {
          weight: detectedWeight,
          confidence: 0.6,
          source: 'similar_product',
          reasoning: 'Based on similar product patterns'
        };

        this.setCache(cacheKey, detectionSuggestion);
        return detectionSuggestion;
      }

      return null;

    } catch (error) {
      logger.error('Failed to get AI weight suggestion:', error);
      return null;
    }
  }

  /**
   * Enhance item with AI suggestions
   */
  async enhanceItem(item: QuoteItem, destinationCountry: string): Promise<ItemEnhancement> {
    const enhancement: ItemEnhancement = {};

    try {
      // Get AI weight suggestion
      const weightSuggestion = await this.getAIWeightSuggestion(item, destinationCountry);
      if (weightSuggestion) {
        enhancement.suggestedWeight = weightSuggestion.weight;
      }

      // Auto-classify if no category
      if (!item.category && item.name) {
        try {
          const classification = await autoProductClassifier.classifyProduct(
            item.name,
            item.url,
            destinationCountry
          );
          if (classification?.category) {
            enhancement.category = classification.category;
          }
        } catch (error) {
          logger.warn('Product classification failed:', error);
        }
      }

      // Validate price against category
      if (item.category && this.CATEGORY_PRICE_RANGES[item.category]) {
        const range = this.CATEGORY_PRICE_RANGES[item.category];
        if (item.unit_price_origin < range.min * 0.5 || item.unit_price_origin > range.max * 2) {
          enhancement.suggestedPrice = range.typical;
        }
      }

      return enhancement;

    } catch (error) {
      logger.error('Item enhancement failed:', error);
      return enhancement;
    }
  }

  /**
   * Calculate volumetric weight
   */
  calculateVolumetricWeight(
    dimensions: { length: number; width: number; height: number; unit?: 'cm' | 'in' },
    divisor = 5000
  ): VolumetricWeightResult {
    let { length, width, height, unit = 'cm' } = dimensions;

    // Convert to cm if in inches
    if (unit === 'in') {
      length *= 2.54;
      width *= 2.54;
      height *= 2.54;
    }

    const volumeCm3 = length * width * height;
    const volumetricWeight = volumeCm3 / divisor;

    return {
      volumetricWeight,
      actualWeight: 0, // Will be set by caller
      chargeableWeight: Math.max(volumetricWeight, 0),
      dimensions: { length, width, height, unit: 'cm' },
      divisor
    };
  }

  /**
   * Bulk validate items
   */
  validateItems(items: QuoteItem[]): {
    validItems: QuoteItem[];
    invalidItems: { item: QuoteItem; validation: ItemValidationResult }[];
    overallValid: boolean;
  } {
    const validItems: QuoteItem[] = [];
    const invalidItems: { item: QuoteItem; validation: ItemValidationResult }[] = [];

    for (const item of items) {
      const validation = this.validateItem(item);
      if (validation.isValid) {
        validItems.push(item);
      } else {
        invalidItems.push({ item, validation });
      }
    }

    return {
      validItems,
      invalidItems,
      overallValid: invalidItems.length === 0
    };
  }

  /**
   * Bulk enhance items with AI
   */
  async bulkEnhanceItems(items: QuoteItem[], destinationCountry: string): Promise<BulkOperationResult> {
    const result: BulkOperationResult = {
      successful: 0,
      failed: 0,
      errors: [],
      processedItems: []
    };

    for (const item of items) {
      try {
        const enhancement = await this.enhanceItem(item, destinationCountry);
        
        // Apply enhancements
        if (enhancement.suggestedWeight && !item.weight_kg) {
          item.ai_weight_suggestion = {
            weight: enhancement.suggestedWeight,
            confidence: 0.75
          };
        }
        
        if (enhancement.category && !item.category) {
          item.category = enhancement.category;
        }

        result.successful++;
        result.processedItems.push(item.id);

        // Add delay to avoid overwhelming services
        await new Promise(resolve => setTimeout(resolve, 200));

      } catch (error) {
        result.failed++;
        result.errors.push(`Failed to enhance item ${item.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        logger.error(`Bulk enhancement failed for item ${item.id}:`, error);
      }
    }

    logger.info(`Bulk enhancement completed: ${result.successful} successful, ${result.failed} failed`);
    return result;
  }

  /**
   * Calculate item analytics
   */
  calculateAnalytics(items: QuoteItem[]): ItemAnalytics {
    const analytics: ItemAnalytics = {
      totalItems: items.length,
      totalValue: 0,
      averagePrice: 0,
      totalWeight: 0,
      categoriesCount: {},
      missingWeightCount: 0,
      missingCategoryCount: 0,
      averageConfidence: 0
    };

    let totalConfidence = 0;
    let confidenceCount = 0;

    for (const item of items) {
      // Value calculations
      const itemValue = item.unit_price_origin * item.quantity;
      analytics.totalValue += itemValue;

      // Weight calculations
      const itemWeight = item.weight_kg || item.ai_weight_suggestion?.weight || 0;
      analytics.totalWeight += itemWeight * item.quantity;

      if (!itemWeight) {
        analytics.missingWeightCount++;
      }

      // Category tracking
      if (item.category) {
        analytics.categoriesCount[item.category] = (analytics.categoriesCount[item.category] || 0) + 1;
      } else {
        analytics.missingCategoryCount++;
      }

      // Confidence tracking
      if (item.ai_weight_suggestion?.confidence) {
        totalConfidence += item.ai_weight_suggestion.confidence;
        confidenceCount++;
      }
    }

    analytics.averagePrice = analytics.totalItems > 0 ? analytics.totalValue / analytics.totalItems : 0;
    analytics.averageConfidence = confidenceCount > 0 ? totalConfidence / confidenceCount : 0;

    return analytics;
  }

  /**
   * Generate item summary for display
   */
  generateItemSummary(items: QuoteItem[]): {
    summary: string;
    details: {
      categories: string[];
      priceRange: { min: number; max: number };
      totalWeight: number;
      hasImages: boolean;
    };
  } {
    if (items.length === 0) {
      return {
        summary: 'No items',
        details: {
          categories: [],
          priceRange: { min: 0, max: 0 },
          totalWeight: 0,
          hasImages: false
        }
      };
    }

    const analytics = this.calculateAnalytics(items);
    const categories = Object.keys(analytics.categoriesCount);
    const prices = items.map(item => item.unit_price_origin);
    const hasImages = items.some(item => item.images && item.images.length > 0);

    const summary = items.length === 1
      ? `1 item: ${items[0].name}`
      : `${items.length} items (${categories.length} categories)`;

    return {
      summary,
      details: {
        categories,
        priceRange: {
          min: Math.min(...prices),
          max: Math.max(...prices)
        },
        totalWeight: analytics.totalWeight,
        hasImages
      }
    };
  }

  /**
   * Export items to different formats
   */
  exportItems(items: QuoteItem[], format: 'json' | 'csv' | 'xlsx'): string | ArrayBuffer {
    switch (format) {
      case 'json':
        return JSON.stringify(items, null, 2);
        
      case 'csv':
        return this.exportToCSV(items);
        
      case 'xlsx':
        // Would need a library like xlsx for this
        throw new Error('XLSX export not implemented');
        
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  /**
   * Import items from various formats
   */
  async importItems(data: string | ArrayBuffer, format: 'json' | 'csv' | 'xlsx'): Promise<QuoteItem[]> {
    switch (format) {
      case 'json':
        return this.importFromJSON(data as string);
        
      case 'csv':
        return this.importFromCSV(data as string);
        
      case 'xlsx':
        throw new Error('XLSX import not implemented');
        
      default:
        throw new Error(`Unsupported import format: ${format}`);
    }
  }

  /**
   * Private helper methods
   */
  private isValidURL(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  private isValidHSNCode(hsnCode: string): boolean {
    // HSN codes are typically 4, 6, or 8 digits
    return /^\d{4}(\d{2}(\d{2})?)?$/.test(hsnCode);
  }

  private exportToCSV(items: QuoteItem[]): string {
    const headers = [
      'Name', 'URL', 'Quantity', 'Unit Price (USD)', 'Weight (kg)', 
      'Category', 'Notes', 'HSN Code'
    ];
    
    const rows = items.map(item => [
      item.name,
      item.url || '',
      item.quantity,
      item.unit_price_origin,
      item.weight_kg || item.ai_weight_suggestion?.weight || '',
      item.category || '',
      item.notes || '',
      item.hsn_code || ''
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    return csvContent;
  }

  private importFromJSON(data: string): QuoteItem[] {
    try {
      const parsed = JSON.parse(data);
      if (!Array.isArray(parsed)) {
        throw new Error('JSON data must be an array');
      }
      
      return parsed.map(item => ({
        id: item.id || crypto.randomUUID(),
        name: item.name || '',
        url: item.url || '',
        quantity: Number(item.quantity) || 1,
        unit_price_origin: Number(item.unit_price_origin) || 0,
        weight_kg: item.weight_kg ? Number(item.weight_kg) : undefined,
        category: item.category || '',
        notes: item.notes || ''
      }));
      
    } catch (error) {
      throw new Error(`Failed to parse JSON: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private importFromCSV(data: string): QuoteItem[] {
    const lines = data.trim().split('\n');
    if (lines.length <= 1) {
      throw new Error('CSV must have at least a header and one data row');
    }

    const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim().toLowerCase());
    const items: QuoteItem[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.replace(/"/g, '').trim());
      const item: QuoteItem = {
        id: crypto.randomUUID(),
        name: values[headers.indexOf('name')] || '',
        url: values[headers.indexOf('url')] || '',
        quantity: Number(values[headers.indexOf('quantity')]) || 1,
        unit_price_origin: Number(values[headers.indexOf('unit price (usd)')]) || 0,
        weight_kg: values[headers.indexOf('weight (kg)')] ? Number(values[headers.indexOf('weight (kg)')]) : undefined,
        category: values[headers.indexOf('category')] || '',
        notes: values[headers.indexOf('notes')] || ''
      };

      if (item.name) {
        items.push(item);
      }
    }

    return items;
  }

  /**
   * Cache management
   */
  private getFromCache<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data as T;
    }
    this.cache.delete(key);
    return null;
  }

  private setCache<T>(key: string, data: T, duration?: number): void {
    this.cache.set(key, { 
      data, 
      timestamp: Date.now(),
      duration: duration || this.CACHE_DURATION
    });
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    this.cache.clear();
    logger.info('QuoteItemsService disposed');
  }
}

export default QuoteItemsService;