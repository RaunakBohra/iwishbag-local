/**
 * Item Valuation Service
 * Handles HSN code processing, valuation methods, and item data validation
 * Decomposed from SimplifiedQuoteCalculator for better separation of concerns
 */

import { logger } from '@/utils/logger';
import { supabase } from '@/integrations/supabase/client';
import { volumetricWeightService } from '@/services/VolumetricWeightService';

export interface CalculationItem {
  name?: string;
  quantity: number;
  costprice_origin: number;
  weight_kg?: number;
  discount_percentage?: number;
  discount_amount?: number;
  discount_type?: 'percentage' | 'amount';
  hsn_code?: string;
  use_hsn_rates?: boolean;
  valuation_preference?: 'auto' | 'product_price' | 'minimum_valuation';
  dimensions?: {
    length: number;
    width: number;
    height: number;
    unit?: 'cm' | 'in';
  };
  volumetric_divisor?: number;
}

export interface ItemValuationResult {
  product_price: number;
  minimum_valuation: number | null;
  effective_value: number;
  customs_rate?: number;
  method_used: 'product_price' | 'minimum_valuation';
  hsn_data?: {
    code: string;
    rate: number;
    source: 'database' | 'hardcoded' | 'fallback';
  };
}

export interface WeightAnalysis {
  actual_weight: number;
  volumetric_weight?: number;
  chargeable_weight: number;
  weight_source: 'actual' | 'volumetric';
  volumetric_calculation?: {
    dimensions: string;
    divisor: number;
    calculated_weight: number;
  };
}

export interface ProcessedItem {
  original: CalculationItem;
  valuation: ItemValuationResult;
  weight: WeightAnalysis;
  subtotal: number;
  discounted_subtotal: number;
  item_discount_amount: number;
}

// HSN Customs Rates Database - Hardcoded fallback
const HSN_CUSTOMS_RATES: { [country: string]: { [hsn: string]: number } } = {
  'IN': {
    '8517': 20,    // Mobile phones
    '8471': 5,     // Laptops (lower rate)
    '6204': 10,    // Women's dresses
    'DEFAULT': 15  // Fallback to country default
  },
  'NP': {
    '8517': 25,    // Mobile phones (higher in Nepal)
    '8471': 5,     // Laptops (lower rate)
    '6204': 10,    // Women's dresses
    'DEFAULT': 15  // Fallback to country default
  }
};

export class ItemValuationService {
  private hsnRateCache = new Map<string, number>();
  private valuationCache = new Map<string, ItemValuationResult>();
  
  constructor() {
    logger.info('ItemValuationService initialized');
  }

  /**
   * Process multiple items for valuation and weight analysis
   */
  async processItems(
    items: CalculationItem[], 
    destinationCountry: string, 
    originCountry: string
  ): Promise<{
    processedItems: ProcessedItem[];
    totals: {
      items_cost: number;
      total_actual_weight: number;
      total_volumetric_weight: number;
      total_chargeable_weight: number;
      total_discount_amount: number;
      discounted_subtotal: number;
    };
    weight_analysis: {
      items: Array<{
        item_index: number;
        actual_weight: number;
        volumetric_weight?: number;
        chargeable_weight: number;
        weight_source: string;
      }>;
    };
  }> {
    try {
      const processedItems: ProcessedItem[] = [];
      let totalItemsCost = 0;
      let totalActualWeight = 0;
      let totalVolumetricWeight = 0;
      let totalChargeableWeight = 0;
      let totalDiscountAmount = 0;
      let discountedSubtotal = 0;

      // Process each item
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        
        // Get item valuation
        const valuation = await this.getItemValuation(item, destinationCountry, originCountry);
        
        // Calculate weight analysis
        const weightAnalysis = await this.analyzeItemWeight(item);
        
        // Calculate item costs
        const itemSubtotal = item.costprice_origin * item.quantity;
        const itemDiscountAmount = this.calculateItemDiscount(item, itemSubtotal);
        const itemDiscountedSubtotal = itemSubtotal - itemDiscountAmount;

        // Create processed item
        const processedItem: ProcessedItem = {
          original: item,
          valuation,
          weight: weightAnalysis,
          subtotal: itemSubtotal,
          discounted_subtotal: itemDiscountedSubtotal,
          item_discount_amount: itemDiscountAmount
        };

        processedItems.push(processedItem);

        // Accumulate totals
        totalItemsCost += itemSubtotal;
        totalActualWeight += weightAnalysis.actual_weight;
        if (weightAnalysis.volumetric_weight) {
          totalVolumetricWeight += weightAnalysis.volumetric_weight;
        }
        totalChargeableWeight += weightAnalysis.chargeable_weight;
        totalDiscountAmount += itemDiscountAmount;
        discountedSubtotal += itemDiscountedSubtotal;
      }

      const result = {
        processedItems,
        totals: {
          items_cost: totalItemsCost,
          total_actual_weight: totalActualWeight,
          total_volumetric_weight: totalVolumetricWeight || 0,
          total_chargeable_weight: totalChargeableWeight,
          total_discount_amount: totalDiscountAmount,
          discounted_subtotal: discountedSubtotal
        },
        weight_analysis: {
          items: processedItems.map((item, index) => ({
            item_index: index,
            actual_weight: item.weight.actual_weight,
            volumetric_weight: item.weight.volumetric_weight,
            chargeable_weight: item.weight.chargeable_weight,
            weight_source: item.weight.weight_source
          }))
        }
      };

      logger.info(`Processed ${items.length} items successfully`);
      return result;

    } catch (error) {
      logger.error('Item processing failed:', error);
      throw new Error('Failed to process items for valuation');
    }
  }

  /**
   * Get valuation data for a single item
   */
  async getItemValuation(
    item: CalculationItem, 
    destinationCountry: string, 
    originCountry: string
  ): Promise<ItemValuationResult> {
    try {
      const cacheKey = `${item.name || 'unknown'}_${item.costprice_origin}_${destinationCountry}`;
      
      // Check cache first
      if (this.valuationCache.has(cacheKey)) {
        return this.valuationCache.get(cacheKey)!;
      }

      // Get product price and minimum valuation
      const productPrice = item.costprice_origin;
      let minimumValuation: number | null = null;
      
      // Fetch minimum valuation from database if HSN code provided
      if (item.hsn_code) {
        minimumValuation = await this.getMinimumValuation(item.hsn_code, destinationCountry);
      }

      // Determine effective value based on preference
      let effectiveValue = productPrice;
      let methodUsed: 'product_price' | 'minimum_valuation' = 'product_price';

      if (item.valuation_preference === 'minimum_valuation' && minimumValuation !== null) {
        effectiveValue = minimumValuation;
        methodUsed = 'minimum_valuation';
      } else if (item.valuation_preference === 'auto' && minimumValuation !== null) {
        // Use minimum valuation if it's higher than product price (protects against undervaluation)
        if (minimumValuation > productPrice) {
          effectiveValue = minimumValuation;
          methodUsed = 'minimum_valuation';
        }
      }

      // Get customs rate if HSN enabled
      let customsRate: number | undefined;
      let hsnData: ItemValuationResult['hsn_data'];

      if (item.use_hsn_rates && item.hsn_code) {
        const rateResult = await this.getCustomsRateForItem(item.hsn_code, destinationCountry);
        customsRate = rateResult.rate;
        hsnData = {
          code: item.hsn_code,
          rate: rateResult.rate,
          source: rateResult.source
        };
      }

      const result: ItemValuationResult = {
        product_price: productPrice,
        minimum_valuation: minimumValuation,
        effective_value: effectiveValue,
        customs_rate: customsRate,
        method_used: methodUsed,
        hsn_data: hsnData
      };

      // Cache the result
      this.valuationCache.set(cacheKey, result);

      logger.debug(`Item valuation completed for ${item.name}: ${effectiveValue} (method: ${methodUsed})`);
      return result;

    } catch (error) {
      logger.error('Item valuation failed:', error);
      throw new Error(`Failed to get valuation for item: ${item.name}`);
    }
  }

  /**
   * Get customs rate for HSN code
   */
  async getCustomsRateForItem(
    hsnCode: string, 
    destinationCountry: string
  ): Promise<{ rate: number; source: 'database' | 'hardcoded' | 'fallback' }> {
    try {
      const cacheKey = `${hsnCode}_${destinationCountry}`;
      
      // Check cache
      if (this.hsnRateCache.has(cacheKey)) {
        return { rate: this.hsnRateCache.get(cacheKey)!, source: 'database' };
      }

      // Try database first
      try {
        const { data: hsnData, error } = await supabase
          .from('product_classifications')
          .select('customs_rate')
          .eq('classification_code', hsnCode)
          .eq('country_code', destinationCountry)
          .eq('is_active', true)
          .limit(1)
          .single();

        if (!error && hsnData && hsnData.customs_rate !== null) {
          this.hsnRateCache.set(cacheKey, hsnData.customs_rate);
          logger.info(`HSN rate from database: ${hsnCode} = ${hsnData.customs_rate}%`);
          return { rate: hsnData.customs_rate, source: 'database' };
        }
      } catch (dbError) {
        logger.warn('Database HSN lookup failed:', dbError);
      }

      // Fallback to hardcoded rates
      const countryRates = HSN_CUSTOMS_RATES[destinationCountry];
      if (countryRates) {
        const hsnRate = countryRates[hsnCode];
        if (hsnRate !== undefined) {
          this.hsnRateCache.set(cacheKey, hsnRate);
          logger.info(`HSN rate from hardcoded: ${hsnCode} = ${hsnRate}%`);
          return { rate: hsnRate, source: 'hardcoded' };
        }

        // Use country default
        const defaultRate = countryRates['DEFAULT'];
        if (defaultRate !== undefined) {
          logger.info(`HSN rate fallback: ${hsnCode} = ${defaultRate}%`);
          return { rate: defaultRate, source: 'fallback' };
        }
      }

      // Ultimate fallback
      const fallbackRate = 15;
      logger.warn(`HSN rate ultimate fallback: ${hsnCode} = ${fallbackRate}%`);
      return { rate: fallbackRate, source: 'fallback' };

    } catch (error) {
      logger.error('HSN rate lookup failed:', error);
      return { rate: 15, source: 'fallback' }; // Safe fallback
    }
  }

  /**
   * Analyze item weight (actual vs volumetric)
   */
  async analyzeItemWeight(item: CalculationItem): Promise<WeightAnalysis> {
    try {
      const actualWeight = (item.weight_kg || 0.5) * item.quantity; // Default 0.5kg per item
      let volumetricWeight: number | undefined;
      let volumetricCalculation: WeightAnalysis['volumetric_calculation'];

      // Calculate volumetric weight if dimensions provided
      if (item.dimensions) {
        const divisor = item.volumetric_divisor || 5000; // Default divisor
        
        try {
          volumetricWeight = volumetricWeightService.calculateVolumetricWeight(
            item.dimensions.length,
            item.dimensions.width,
            item.dimensions.height,
            divisor,
            item.dimensions.unit || 'cm'
          ) * item.quantity;

          volumetricCalculation = {
            dimensions: `${item.dimensions.length}×${item.dimensions.width}×${item.dimensions.height} ${item.dimensions.unit || 'cm'}`,
            divisor,
            calculated_weight: volumetricWeight / item.quantity
          };
        } catch (volError) {
          logger.warn('Volumetric weight calculation failed:', volError);
        }
      }

      // Determine chargeable weight (higher of actual vs volumetric)
      const chargeableWeight = Math.max(actualWeight, volumetricWeight || 0);
      const weightSource: 'actual' | 'volumetric' = 
        volumetricWeight && volumetricWeight > actualWeight ? 'volumetric' : 'actual';

      return {
        actual_weight: actualWeight,
        volumetric_weight: volumetricWeight,
        chargeable_weight: chargeableWeight,
        weight_source: weightSource,
        volumetric_calculation: volumetricCalculation
      };

    } catch (error) {
      logger.error('Weight analysis failed:', error);
      
      // Safe fallback
      const fallbackWeight = (item.weight_kg || 0.5) * item.quantity;
      return {
        actual_weight: fallbackWeight,
        chargeable_weight: fallbackWeight,
        weight_source: 'actual'
      };
    }
  }

  /**
   * Calculate item-level discount
   */
  private calculateItemDiscount(item: CalculationItem, subtotal: number): number {
    try {
      let discountAmount = 0;

      if (item.discount_type === 'percentage' && item.discount_percentage) {
        discountAmount = subtotal * (item.discount_percentage / 100);
      } else if (item.discount_type === 'amount' && item.discount_amount) {
        discountAmount = item.discount_amount * item.quantity;
      }

      return Math.min(discountAmount, subtotal); // Don't exceed item cost

    } catch (error) {
      logger.error('Item discount calculation failed:', error);
      return 0;
    }
  }

  /**
   * Get minimum valuation from database
   */
  private async getMinimumValuation(hsnCode: string, country: string): Promise<number | null> {
    try {
      const { data, error } = await supabase
        .from('product_classifications')
        .select('minimum_valuation_usd')
        .eq('classification_code', hsnCode)
        .eq('country_code', country)
        .eq('is_active', true)
        .limit(1)
        .single();

      if (!error && data && data.minimum_valuation_usd !== null) {
        return data.minimum_valuation_usd;
      }

      return null;
    } catch (error) {
      logger.warn('Minimum valuation lookup failed:', error);
      return null;
    }
  }

  /**
   * Validate items before processing
   */
  validateItems(items: CalculationItem[]): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!Array.isArray(items) || items.length === 0) {
      errors.push('Items array is required and must not be empty');
      return { valid: false, errors };
    }

    items.forEach((item, index) => {
      if (!item.quantity || item.quantity <= 0) {
        errors.push(`Item ${index + 1}: Quantity must be greater than 0`);
      }

      if (!item.costprice_origin || item.costprice_origin <= 0) {
        errors.push(`Item ${index + 1}: Cost price must be greater than 0`);
      }

      if (item.use_hsn_rates && !item.hsn_code) {
        errors.push(`Item ${index + 1}: HSN code is required when HSN rates are enabled`);
      }

      if (item.dimensions) {
        const { length, width, height } = item.dimensions;
        if (!length || !width || !height || length <= 0 || width <= 0 || height <= 0) {
          errors.push(`Item ${index + 1}: All dimensions must be positive numbers`);
        }
      }
    });

    return { valid: errors.length === 0, errors };
  }

  /**
   * Clear caches
   */
  clearCaches(): void {
    this.hsnRateCache.clear();
    this.valuationCache.clear();
    logger.info('ItemValuationService caches cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { hsnRates: number; valuations: number } {
    return {
      hsnRates: this.hsnRateCache.size,
      valuations: this.valuationCache.size
    };
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    this.clearCaches();
    logger.info('ItemValuationService disposed');
  }
}

export default ItemValuationService;