/**
 * Customs Calculation Service
 * Handles customs duty rates, HSN-based calculations, and CIF valuation
 * Decomposed from SimplifiedQuoteCalculator for better separation of concerns
 */

import { logger } from '@/utils/logger';
import { supabase } from '@/integrations/supabase/client';
import type { ItemValuationService, ProcessedItem } from './ItemValuationService';

export interface CustomsCalculationRequest {
  processedItems: ProcessedItem[];
  originCountry: string;
  destinationCountry: string;
  shippingCost: number;
  insuranceCost: number;
  itemsSubtotal: number;
  useHsnRates?: boolean;
  customsMethod?: 'standard' | 'hsn_weighted' | 'item_specific';
}

export interface CustomsCalculationResult {
  customs_duty: number;
  customs_rate_used: number;
  cif_value: number;
  calculation_method: string;
  item_customs_breakdown?: Array<{
    item_index: number;
    item_name: string;
    valuation_used: number;
    customs_rate: number;
    customs_amount: number;
    hsn_code?: string;
  }>;
  rate_sources: Array<{
    source: 'database' | 'hardcoded' | 'fallback';
    rate: number;
    hsn_code?: string;
    confidence: number;
  }>;
}

export interface CustomsRateRequest {
  hsnCode: string;
  destinationCountry: string;
  itemValue: number;
  fallbackRate?: number;
}

export interface CustomsRateResult {
  rate: number;
  source: 'database' | 'hardcoded' | 'fallback';
  confidence: number;
  hsn_data?: {
    classification_name: string;
    description: string;
    category: string;
  };
}

// Country-specific default customs rates
const DEFAULT_CUSTOMS_RATES: { [country: string]: number } = {
  'IN': 15, // India customs duty
  'NP': 15, // Nepal customs duty  
  'BD': 20, // Bangladesh customs duty
  'PK': 18, // Pakistan customs duty
  'LK': 16, // Sri Lanka customs duty
  'US': 0,  // USA (minimal customs for most goods)
  'GB': 12, // UK post-Brexit
  'EU': 10, // European Union average
  'DEFAULT': 15 // Global fallback
};

// HSN-specific customs rates (enhanced database fallback)
const HSN_CUSTOMS_DATABASE: { [country: string]: { [hsn: string]: { rate: number; confidence: number; category: string } } } = {
  'IN': {
    '8517': { rate: 20, confidence: 0.95, category: 'Electronics' }, // Mobile phones
    '8471': { rate: 5, confidence: 0.90, category: 'Computers' },    // Laptops/Computers
    '6204': { rate: 10, confidence: 0.85, category: 'Textiles' },    // Women's clothing
    '6203': { rate: 10, confidence: 0.85, category: 'Textiles' },    // Men's clothing
    '6110': { rate: 12, confidence: 0.80, category: 'Textiles' },    // Sweaters
    '9404': { rate: 10, confidence: 0.75, category: 'Home' },        // Bedding
    '6402': { rate: 25, confidence: 0.90, category: 'Footwear' },    // Footwear
    '9102': { rate: 10, confidence: 0.85, category: 'Accessories' },  // Watches
    '7113': { rate: 15, confidence: 0.80, category: 'Jewelry' }      // Jewelry
  },
  'NP': {
    '8517': { rate: 25, confidence: 0.90, category: 'Electronics' },
    '8471': { rate: 5, confidence: 0.85, category: 'Computers' },
    '6204': { rate: 15, confidence: 0.80, category: 'Textiles' },
    '6203': { rate: 15, confidence: 0.80, category: 'Textiles' },
    '6402': { rate: 30, confidence: 0.85, category: 'Footwear' }
  },
  'BD': {
    '8517': { rate: 25, confidence: 0.85, category: 'Electronics' },
    '8471': { rate: 10, confidence: 0.80, category: 'Computers' },
    '6204': { rate: 20, confidence: 0.75, category: 'Textiles' }
  }
};

export class CustomsCalculationService {
  private customsRateCache = new Map<string, CustomsRateResult>();
  private cifCalculationCache = new Map<string, number>();
  
  constructor(private itemValuationService?: ItemValuationService) {
    logger.info('CustomsCalculationService initialized');
  }

  /**
   * Calculate customs duty for a quote
   */
  async calculateCustomsDuty(request: CustomsCalculationRequest): Promise<CustomsCalculationResult> {
    try {
      const { processedItems, destinationCountry, shippingCost, insuranceCost, itemsSubtotal } = request;

      // Calculate CIF value (Cost + Insurance + Freight)
      const cifValue = this.calculateCIFValue(itemsSubtotal, shippingCost, insuranceCost);

      // Determine calculation method
      const method = request.customsMethod || this.determineCalculationMethod(processedItems, request.useHsnRates);

      let customsDuty = 0;
      let effectiveRate = 0;
      let itemBreakdown: CustomsCalculationResult['item_customs_breakdown'] = [];
      let rateSources: CustomsCalculationResult['rate_sources'] = [];

      if (method === 'hsn_weighted' && request.useHsnRates) {
        // Calculate using HSN-weighted average
        const result = await this.calculateHSNWeightedCustoms(processedItems, destinationCountry, cifValue);
        customsDuty = result.totalCustoms;
        effectiveRate = result.weightedRate;
        itemBreakdown = result.itemBreakdown;
        rateSources = result.rateSources;

      } else if (method === 'item_specific' && request.useHsnRates) {
        // Calculate per-item customs (most accurate)
        const result = await this.calculateItemSpecificCustoms(processedItems, destinationCountry);
        customsDuty = result.totalCustoms;
        effectiveRate = result.averageRate;
        itemBreakdown = result.itemBreakdown;
        rateSources = result.rateSources;

      } else {
        // Standard calculation using country default rate
        effectiveRate = await this.getCountryDefaultRate(destinationCountry);
        customsDuty = cifValue * (effectiveRate / 100);
        rateSources = [{
          source: 'fallback',
          rate: effectiveRate,
          confidence: 0.7
        }];
      }

      const result: CustomsCalculationResult = {
        customs_duty: Math.max(0, customsDuty),
        customs_rate_used: effectiveRate,
        cif_value: cifValue,
        calculation_method: method,
        item_customs_breakdown: itemBreakdown,
        rate_sources: rateSources
      };

      logger.info(`Customs calculation completed: $${customsDuty.toFixed(2)} (${effectiveRate.toFixed(2)}% on CIF $${cifValue.toFixed(2)})`);
      return result;

    } catch (error) {
      logger.error('Customs calculation failed:', error);
      
      // Safe fallback
      const fallbackRate = DEFAULT_CUSTOMS_RATES[request.destinationCountry] || DEFAULT_CUSTOMS_RATES['DEFAULT'];
      const cifValue = this.calculateCIFValue(request.itemsSubtotal, request.shippingCost, request.insuranceCost);
      
      return {
        customs_duty: cifValue * (fallbackRate / 100),
        customs_rate_used: fallbackRate,
        cif_value: cifValue,
        calculation_method: 'fallback',
        rate_sources: [{ source: 'fallback', rate: fallbackRate, confidence: 0.5 }]
      };
    }
  }

  /**
   * Calculate customs using HSN-weighted average approach
   */
  private async calculateHSNWeightedCustoms(
    items: ProcessedItem[],
    destinationCountry: string,
    cifValue: number
  ): Promise<{
    totalCustoms: number;
    weightedRate: number;
    itemBreakdown: CustomsCalculationResult['item_customs_breakdown'];
    rateSources: CustomsCalculationResult['rate_sources'];
  }> {
    let weightedRateSum = 0;
    let totalValue = 0;
    const itemBreakdown: CustomsCalculationResult['item_customs_breakdown'] = [];
    const rateSources: CustomsCalculationResult['rate_sources'] = [];
    const uniqueRates = new Map<string, CustomsRateResult>();

    // Calculate weighted average rate based on item values
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const itemValue = item.valuation.effective_value * item.original.quantity;
      
      let customsRate = DEFAULT_CUSTOMS_RATES[destinationCountry] || DEFAULT_CUSTOMS_RATES['DEFAULT'];
      let rateSource: CustomsRateResult['source'] = 'fallback';
      
      // Get HSN-specific rate if available
      if (item.original.hsn_code && item.original.use_hsn_rates) {
        try {
          const rateResult = await this.getCustomsRateForHSN({
            hsnCode: item.original.hsn_code,
            destinationCountry,
            itemValue,
            fallbackRate: customsRate
          });
          
          customsRate = rateResult.rate;
          rateSource = rateResult.source;
          
          // Store unique rates for sources
          const rateKey = `${item.original.hsn_code}_${customsRate}`;
          if (!uniqueRates.has(rateKey)) {
            uniqueRates.set(rateKey, rateResult);
          }
        } catch (error) {
          logger.warn(`Failed to get HSN rate for ${item.original.hsn_code}:`, error);
        }
      }

      // Add to weighted calculation
      weightedRateSum += customsRate * itemValue;
      totalValue += itemValue;

      itemBreakdown.push({
        item_index: i,
        item_name: item.original.name || `Item ${i + 1}`,
        valuation_used: itemValue,
        customs_rate: customsRate,
        customs_amount: 0, // Will be calculated proportionally
        hsn_code: item.original.hsn_code
      });
    }

    // Calculate weighted average rate
    const weightedRate = totalValue > 0 ? weightedRateSum / totalValue : DEFAULT_CUSTOMS_RATES[destinationCountry] || 15;
    const totalCustoms = cifValue * (weightedRate / 100);

    // Calculate proportional customs for each item
    itemBreakdown.forEach((breakdown, index) => {
      const proportion = breakdown.valuation_used / totalValue;
      breakdown.customs_amount = totalCustoms * proportion;
    });

    // Convert unique rates to sources
    Array.from(uniqueRates.values()).forEach(rateResult => {
      rateSources.push({
        source: rateResult.source,
        rate: rateResult.rate,
        confidence: rateResult.confidence,
        hsn_code: rateResult.hsn_data?.classification_name
      });
    });

    return {
      totalCustoms,
      weightedRate,
      itemBreakdown,
      rateSources
    };
  }

  /**
   * Calculate customs per individual item (most accurate)
   */
  private async calculateItemSpecificCustoms(
    items: ProcessedItem[],
    destinationCountry: string
  ): Promise<{
    totalCustoms: number;
    averageRate: number;
    itemBreakdown: CustomsCalculationResult['item_customs_breakdown'];
    rateSources: CustomsCalculationResult['rate_sources'];
  }> {
    let totalCustoms = 0;
    let totalRateWeightedByValue = 0;
    let totalValue = 0;
    const itemBreakdown: CustomsCalculationResult['item_customs_breakdown'] = [];
    const rateSources: CustomsCalculationResult['rate_sources'] = [];
    const uniqueRates = new Map<string, CustomsRateResult>();

    // Calculate customs for each item individually
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const itemValue = item.valuation.effective_value * item.original.quantity;
      
      let customsRate = DEFAULT_CUSTOMS_RATES[destinationCountry] || DEFAULT_CUSTOMS_RATES['DEFAULT'];
      let rateSource: CustomsRateResult['source'] = 'fallback';
      
      // Get item-specific customs rate
      if (item.original.hsn_code && item.original.use_hsn_rates) {
        try {
          const rateResult = await this.getCustomsRateForHSN({
            hsnCode: item.original.hsn_code,
            destinationCountry,
            itemValue,
            fallbackRate: customsRate
          });
          
          customsRate = rateResult.rate;
          rateSource = rateResult.source;
          
          const rateKey = `${item.original.hsn_code}_${customsRate}`;
          if (!uniqueRates.has(rateKey)) {
            uniqueRates.set(rateKey, rateResult);
          }
        } catch (error) {
          logger.warn(`Item-specific HSN rate lookup failed for ${item.original.hsn_code}:`, error);
        }
      }

      // Calculate customs for this item
      const itemCustoms = itemValue * (customsRate / 100);
      totalCustoms += itemCustoms;
      totalRateWeightedByValue += customsRate * itemValue;
      totalValue += itemValue;

      itemBreakdown.push({
        item_index: i,
        item_name: item.original.name || `Item ${i + 1}`,
        valuation_used: itemValue,
        customs_rate: customsRate,
        customs_amount: itemCustoms,
        hsn_code: item.original.hsn_code
      });
    }

    const averageRate = totalValue > 0 ? totalRateWeightedByValue / totalValue : DEFAULT_CUSTOMS_RATES[destinationCountry] || 15;

    // Convert unique rates to sources  
    Array.from(uniqueRates.values()).forEach(rateResult => {
      rateSources.push({
        source: rateResult.source,
        rate: rateResult.rate,
        confidence: rateResult.confidence,
        hsn_code: rateResult.hsn_data?.classification_name
      });
    });

    return {
      totalCustoms,
      averageRate,
      itemBreakdown,
      rateSources
    };
  }

  /**
   * Get customs rate for specific HSN code
   */
  async getCustomsRateForHSN(request: CustomsRateRequest): Promise<CustomsRateResult> {
    try {
      const { hsnCode, destinationCountry, fallbackRate } = request;
      const cacheKey = `${hsnCode}_${destinationCountry}`;
      
      // Check cache
      if (this.customsRateCache.has(cacheKey)) {
        return this.customsRateCache.get(cacheKey)!;
      }

      let result: CustomsRateResult;

      // Try database first
      try {
        const { data: hsnData, error } = await supabase
          .from('product_classifications')
          .select('customs_rate, classification_name, description, category')
          .eq('classification_code', hsnCode)
          .eq('country_code', destinationCountry)
          .eq('is_active', true)
          .limit(1)
          .single();

        if (!error && hsnData && hsnData.customs_rate !== null) {
          result = {
            rate: hsnData.customs_rate,
            source: 'database',
            confidence: 0.95,
            hsn_data: {
              classification_name: hsnData.classification_name || hsnCode,
              description: hsnData.description || 'No description',
              category: hsnData.category || 'General'
            }
          };
          
          logger.debug(`HSN rate from database: ${hsnCode} = ${hsnData.customs_rate}%`);
        } else {
          throw new Error('No database entry found');
        }
      } catch (dbError) {
        logger.debug('Database HSN lookup failed, trying hardcoded rates:', dbError);
        
        // Try hardcoded rates
        const countryRates = HSN_CUSTOMS_DATABASE[destinationCountry];
        if (countryRates && countryRates[hsnCode]) {
          const hsnRate = countryRates[hsnCode];
          result = {
            rate: hsnRate.rate,
            source: 'hardcoded',
            confidence: hsnRate.confidence,
            hsn_data: {
              classification_name: hsnCode,
              description: `${hsnRate.category} item`,
              category: hsnRate.category
            }
          };
          
          logger.debug(`HSN rate from hardcoded: ${hsnCode} = ${hsnRate.rate}%`);
        } else {
          // Use fallback rate
          const rate = fallbackRate || DEFAULT_CUSTOMS_RATES[destinationCountry] || DEFAULT_CUSTOMS_RATES['DEFAULT'];
          result = {
            rate,
            source: 'fallback',
            confidence: 0.6,
            hsn_data: {
              classification_name: hsnCode,
              description: 'Using country default rate',
              category: 'General'
            }
          };
          
          logger.debug(`HSN rate fallback: ${hsnCode} = ${rate}%`);
        }
      }

      // Cache the result
      this.customsRateCache.set(cacheKey, result);
      return result;

    } catch (error) {
      logger.error(`HSN customs rate lookup failed for ${request.hsnCode}:`, error);
      
      // Safe fallback
      const rate = request.fallbackRate || DEFAULT_CUSTOMS_RATES[request.destinationCountry] || DEFAULT_CUSTOMS_RATES['DEFAULT'];
      return {
        rate,
        source: 'fallback',
        confidence: 0.5
      };
    }
  }

  /**
   * Calculate CIF value (Cost + Insurance + Freight)
   */
  private calculateCIFValue(itemsCost: number, shippingCost: number, insuranceCost: number): number {
    const cifValue = itemsCost + shippingCost + insuranceCost;
    
    // Ensure minimum CIF value for customs purposes
    const minCifValue = 1; // $1 minimum
    return Math.max(cifValue, minCifValue);
  }

  /**
   * Get country default customs rate
   */
  private async getCountryDefaultRate(countryCode: string): Promise<number> {
    // Could be extended to fetch from database
    return DEFAULT_CUSTOMS_RATES[countryCode] || DEFAULT_CUSTOMS_RATES['DEFAULT'];
  }

  /**
   * Determine best calculation method based on available data
   */
  private determineCalculationMethod(items: ProcessedItem[], useHsn?: boolean): CustomsCalculationResult['calculation_method'] {
    if (!useHsn) {
      return 'standard';
    }

    const hsnItems = items.filter(item => item.original.hsn_code && item.original.use_hsn_rates);
    
    if (hsnItems.length === 0) {
      return 'standard';
    } else if (hsnItems.length === items.length) {
      return 'item_specific'; // All items have HSN codes
    } else {
      return 'hsn_weighted'; // Mix of HSN and non-HSN items
    }
  }

  /**
   * Validate customs calculation request
   */
  validateCustomsRequest(request: CustomsCalculationRequest): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!request.processedItems || request.processedItems.length === 0) {
      errors.push('Processed items are required');
    }

    if (!request.destinationCountry) {
      errors.push('Destination country is required');
    }

    if (request.itemsSubtotal < 0) {
      errors.push('Items subtotal cannot be negative');
    }

    if (request.shippingCost < 0) {
      errors.push('Shipping cost cannot be negative');
    }

    if (request.insuranceCost < 0) {
      errors.push('Insurance cost cannot be negative');
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Get customs exemption threshold for country
   */
  getCustomsExemptionThreshold(countryCode: string): number {
    const thresholds: { [country: string]: number } = {
      'US': 800,  // $800 de minimis
      'IN': 50,   // ₹3,500 ≈ $50 for gifts
      'GB': 15,   // £15 for gifts
      'EU': 22,   // €22 for gifts
      'CA': 20,   // CAD $20 for gifts
      'AU': 1000, // AUD $1000 for goods
      'DEFAULT': 0 // No exemption by default
    };

    return thresholds[countryCode] || thresholds['DEFAULT'];
  }

  /**
   * Check if customs duty applies
   */
  isCustomsDutyApplicable(itemsValue: number, destinationCountry: string): boolean {
    const threshold = this.getCustomsExemptionThreshold(destinationCountry);
    return itemsValue > threshold;
  }

  /**
   * Clear caches
   */
  clearCaches(): void {
    this.customsRateCache.clear();
    this.cifCalculationCache.clear();
    logger.info('CustomsCalculationService caches cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { customsRates: number; cifCalculations: number } {
    return {
      customsRates: this.customsRateCache.size,
      cifCalculations: this.cifCalculationCache.size
    };
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    this.clearCaches();
    logger.info('CustomsCalculationService disposed');
  }
}

export default CustomsCalculationService;