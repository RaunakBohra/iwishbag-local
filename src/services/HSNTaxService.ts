// ============================================================================
// HSN TAX SERVICE - Extract Tax Rates from HSN Master
// Provides tax rates (customs, VAT/GST, sales tax) based on HSN codes
// ============================================================================

import { supabase } from '@/integrations/supabase/client';
import { taxRateService } from './TaxRateService';
import * as Sentry from '@sentry/react';

export interface HSNTaxRates {
  customs: number;      // Customs percentage
  vat: number;          // VAT/GST percentage based on destination
  sales_tax: number;    // Sales tax percentage
  source: 'hsn';
  hsn_code: string;
  confidence: number;   // Confidence score for the rates
}

interface HSNTaxData {
  typical_rates?: {
    customs?: {
      min?: number;
      max?: number;
      common?: number;
    };
    gst?: {
      standard?: number;
    };
    vat?: {
      common?: number;
    };
    sales_tax?: {
      common?: number;
    };
  };
}

/**
 * HSN TAX SERVICE - Extracts tax rates from HSN master data
 * 
 * Priority: HSN-specific rates based on product classification
 * Supports: Customs, VAT/GST, and Sales Tax rates
 */
class HSNTaxService {
  private static instance: HSNTaxService;
  private cache = new Map<string, { data: HSNTaxRates; timestamp: number }>();
  private readonly CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

  private constructor() {
    console.log('📊 HSNTaxService initialized');
  }

  static getInstance(): HSNTaxService {
    if (!HSNTaxService.instance) {
      HSNTaxService.instance = new HSNTaxService();
    }
    return HSNTaxService.instance;
  }

  /**
   * Get tax rates based on HSN code and destination country
   * @param hsnCode - HSN classification code
   * @param destinationCountry - Destination country code (e.g., 'NP', 'IN', 'US')
   * @returns Tax rates or null if HSN not found
   */
  async getHSNTaxRates(
    hsnCode: string,
    destinationCountry: string
  ): Promise<HSNTaxRates | null> {
    // Temporarily disable Sentry transaction
    // const transaction = Sentry.startTransaction({
    //   name: 'HSNTaxService.getHSNTaxRates',
    //   op: 'hsn_tax_lookup',
    // });

    try {
      // Check cache
      const cacheKey = `${hsnCode}:${destinationCountry}`;
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        console.log('💾 [HSN TAX] Using cached rates for:', hsnCode);
        // transaction.setStatus('ok');
        return cached;
      }

      console.log('🔍 [HSN TAX] Fetching tax rates:', {
        hsnCode,
        destinationCountry,
      });

      // Query HSN master
      const { data: hsnData, error } = await supabase
        .from('hsn_master')
        .select('hsn_code, description, category, tax_data')
        .eq('hsn_code', hsnCode)
        .single();

      if (error || !hsnData) {
        console.warn('⚠️ [HSN TAX] No HSN data found for:', hsnCode);
        // transaction.setStatus('not_found');
        return null;
      }

      // Extract tax data
      const taxData = hsnData.tax_data as HSNTaxData;
      if (!taxData?.typical_rates) {
        console.warn('⚠️ [HSN TAX] No tax rates in HSN data for:', hsnCode);
        // transaction.setStatus('invalid_data');
        return null;
      }

      // Calculate rates based on destination
      const rates = this.calculateRatesForDestination(
        taxData.typical_rates,
        destinationCountry,
        hsnCode
      );

      console.log('✅ [HSN TAX] Calculated rates:', {
        hsnCode,
        destinationCountry,
        rates,
      });

      // Cache the result
      this.setCache(cacheKey, rates);
      // transaction.setStatus('ok');
      return rates;

    } catch (error) {
      console.error('❌ [HSN TAX] Error fetching rates:', error);
      Sentry.captureException(error);
      // transaction.setStatus('internal_error');
      return null;
    } finally {
      // transaction.finish();
    }
  }

  /**
   * Calculate tax rates based on destination country
   */
  private async calculateRatesForDestination(
    typicalRates: HSNTaxData['typical_rates'],
    destinationCountry: string,
    hsnCode: string
  ): Promise<HSNTaxRates> {
    // Customs rate (common for all destinations)
    const customs = typicalRates?.customs?.common || 
                   typicalRates?.customs?.min || 
                   0;

    // ✅ CRITICAL FIX: VAT/GST should ALWAYS be based on destination country, NOT HSN data
    // HSN data may contain origin country tax rates, but destination tax must come from destination
    const vat = await taxRateService.getCountryVATRate(destinationCountry);
    console.log(`💰 [HSN TAX] Using destination country VAT/GST rate: ${vat}% for ${destinationCountry} (ignoring any HSN VAT data)`);
    
    // Log if HSN had different VAT data for debugging
    if (typicalRates?.vat?.common || typicalRates?.gst?.standard) {
      const hsnVat = typicalRates?.vat?.common || typicalRates?.gst?.standard;
      console.log(`🚨 [HSN TAX] HSN ${hsnCode} had VAT rate ${hsnVat}% but using destination ${destinationCountry} rate ${vat}% instead`);
    }

    // Sales tax (typically for US origin)
    const salesTax = typicalRates?.sales_tax?.common || 0;

    // Calculate confidence based on data completeness
    let confidence = 0.5; // Base confidence
    if (typicalRates?.customs?.common) confidence += 0.2;
    if (typicalRates?.vat || typicalRates?.gst) confidence += 0.2;
    if (typicalRates?.customs?.min && typicalRates?.customs?.max) confidence += 0.1;

    return {
      customs,
      vat,
      sales_tax: salesTax,
      source: 'hsn',
      hsn_code: hsnCode,
      confidence: Math.min(confidence, 1.0),
    };
  }

  /**
   * Get tax rates for multiple HSN codes (batch operation)
   */
  async getMultipleHSNTaxRates(
    hsnCodes: string[],
    destinationCountry: string
  ): Promise<Map<string, HSNTaxRates | null>> {
    const results = new Map<string, HSNTaxRates | null>();

    // Process in parallel for efficiency
    const promises = hsnCodes.map(async (hsnCode) => {
      const rates = await this.getHSNTaxRates(hsnCode, destinationCountry);
      results.set(hsnCode, rates);
    });

    await Promise.all(promises);
    return results;
  }

  /**
   * Search for HSN codes by keywords and get tax rates
   */
  async searchHSNWithTaxRates(
    keywords: string,
    destinationCountry: string,
    limit: number = 5
  ): Promise<Array<{ hsn_code: string; description: string; rates: HSNTaxRates }>> {
    try {
      // Search HSN codes
      const { data: hsnResults, error } = await supabase
        .from('hsn_search_optimized')
        .select('hsn_code, display_name')
        .textSearch('search_vector', keywords)
        .limit(limit);

      if (error || !hsnResults) {
        console.error('❌ [HSN TAX] Search error:', error);
        return [];
      }

      // Get tax rates for each result
      const resultsWithRates = await Promise.all(
        hsnResults.map(async (hsn) => {
          const rates = await this.getHSNTaxRates(hsn.hsn_code, destinationCountry);
          return rates ? {
            hsn_code: hsn.hsn_code,
            description: hsn.display_name,
            rates,
          } : null;
        })
      );

      return resultsWithRates.filter(r => r !== null) as any;

    } catch (error) {
      console.error('❌ [HSN TAX] Search error:', error);
      return [];
    }
  }

  // Cache management
  private getFromCache(key: string): HSNTaxRates | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    const isExpired = Date.now() - cached.timestamp > this.CACHE_DURATION;
    if (isExpired) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  private setCache(key: string, data: HSNTaxRates): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  // Clear cache (useful for testing or updates)
  clearCache(): void {
    this.cache.clear();
    console.log('🧹 [HSN TAX] Cache cleared');
  }
}

// Export singleton instance
export const hsnTaxService = HSNTaxService.getInstance();