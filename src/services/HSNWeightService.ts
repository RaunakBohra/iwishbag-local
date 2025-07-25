/**
 * HSN Weight Service
 * 
 * Fetches weight data from HSN master table for accurate weight estimation.
 * Provides weight ranges (min, max, average) and packaging weight from HSN data.
 */

import { supabase } from '@/integrations/supabase/client';

interface HSNWeightData {
  average: number;
  min: number;
  max: number;
  packaging?: number;
  source: 'hsn';
  confidence: number; // Always high for HSN data
}

class HSNWeightService {
  private static instance: HSNWeightService;
  private cache: Map<string, { data: HSNWeightData | null; timestamp: number }> = new Map();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  private constructor() {}

  static getInstance(): HSNWeightService {
    if (!HSNWeightService.instance) {
      HSNWeightService.instance = new HSNWeightService();
    }
    return HSNWeightService.instance;
  }

  /**
   * Get weight data for an HSN code
   */
  async getHSNWeight(hsnCode: string): Promise<HSNWeightData | null> {
    if (!hsnCode || hsnCode.trim() === '') {
      return null;
    }

    // Check cache first
    const cached = this.getCached(hsnCode);
    if (cached !== undefined) {
      return cached;
    }

    try {
      // Fetching HSN weight data
      
      const { data: hsnRecord, error } = await supabase
        .from('hsn_master')
        .select('weight_data')
        .eq('hsn_code', hsnCode)
        .eq('is_active', true)
        .single();

      if (error || !hsnRecord) {
        // No HSN weight data found
        this.setCache(hsnCode, null);
        return null;
      }

      // Extract weight data from JSONB
      const weightData = hsnRecord.weight_data?.typical_weights?.per_unit;
      const packagingData = hsnRecord.weight_data?.typical_weights?.packaging;

      if (!weightData || !weightData.average) {
        // HSN record has no weight data
        this.setCache(hsnCode, null);
        return null;
      }

      const result: HSNWeightData = {
        average: Number(weightData.average) || 0,
        min: Number(weightData.min) || 0,
        max: Number(weightData.max) || 0,
        packaging: packagingData?.additional_weight ? Number(packagingData.additional_weight) : undefined,
        source: 'hsn',
        confidence: 0.95 // High confidence for HSN data
      };

      // HSN weight data found
      this.setCache(hsnCode, result);
      return result;

    } catch (error) {
      console.error(`❌ [HSN Weight] Error fetching weight for HSN ${hsnCode}:`, error);
      this.setCache(hsnCode, null);
      return null;
    }
  }

  /**
   * Get weight data for multiple HSN codes (batch operation)
   */
  async getMultipleHSNWeights(hsnCodes: string[]): Promise<Map<string, HSNWeightData | null>> {
    const results = new Map<string, HSNWeightData | null>();
    const uncachedCodes: string[] = [];

    // Check cache for each code
    for (const code of hsnCodes) {
      const cached = this.getCached(code);
      if (cached !== undefined) {
        results.set(code, cached);
      } else {
        uncachedCodes.push(code);
      }
    }

    // Fetch uncached codes in batch
    if (uncachedCodes.length > 0) {
      try {
        const { data: hsnRecords, error } = await supabase
          .from('hsn_master')
          .select('hsn_code, weight_data')
          .in('hsn_code', uncachedCodes)
          .eq('is_active', true);

        if (!error && hsnRecords) {
          // Process fetched records
          for (const record of hsnRecords) {
            const weightData = this.processWeightData(record);
            results.set(record.hsn_code, weightData);
            this.setCache(record.hsn_code, weightData);
          }

          // Mark missing codes as null
          for (const code of uncachedCodes) {
            if (!results.has(code)) {
              results.set(code, null);
              this.setCache(code, null);
            }
          }
        }
      } catch (error) {
        console.error('[HSN Weight] Batch fetch error:', error);
        // Mark all uncached as null on error
        for (const code of uncachedCodes) {
          results.set(code, null);
          this.setCache(code, null);
        }
      }
    }

    return results;
  }

  /**
   * Process weight data from database record
   */
  private processWeightData(record: any): HSNWeightData | null {
    const weightData = record.weight_data?.typical_weights?.per_unit;
    const packagingData = record.weight_data?.typical_weights?.packaging;

    if (!weightData || !weightData.average) {
      return null;
    }

    return {
      average: Number(weightData.average) || 0,
      min: Number(weightData.min) || 0,
      max: Number(weightData.max) || 0,
      packaging: packagingData?.additional_weight ? Number(packagingData.additional_weight) : undefined,
      source: 'hsn',
      confidence: 0.95
    };
  }

  /**
   * Get cached data
   */
  private getCached(hsnCode: string): HSNWeightData | null | undefined {
    const cached = this.cache.get(hsnCode);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data;
    }
    return undefined;
  }

  /**
   * Set cache
   */
  private setCache(hsnCode: string, data: HSNWeightData | null): void {
    this.cache.set(hsnCode, {
      data,
      timestamp: Date.now()
    });
  }

  /**
   * Clear cache (useful for testing or admin operations)
   */
  clearCache(): void {
    this.cache.clear();
    console.log('🧹 [HSN Weight] Cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; entries: string[] } {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.keys())
    };
  }
}

export const hsnWeightService = HSNWeightService.getInstance();
export type { HSNWeightData };