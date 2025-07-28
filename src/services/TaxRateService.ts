/**
 * TAX RATE SERVICE
 * Dynamic tax rate lookup from database instead of hardcoded values
 * Replaces all hardcoded tax rates with database-driven configuration
 * 
 * IMPORTANT: Database stores tax values as percentages (13 = 13%, not 0.13)
 * This service returns raw percentage values that must be divided by 100 
 * during calculations: amount * (rate / 100)
 */

import { supabase } from '@/integrations/supabase/client';

interface CountryTaxRates {
  country_code: string;
  gst_rate?: number;
  vat_rate?: number;
  sales_tax_rate?: number;
  customs_default_rate?: number;
  manual_default_rate?: number;
  tax_type: 'GST' | 'VAT' | 'Sales Tax' | 'None';
}

export class TaxRateService {
  private static instance: TaxRateService;
  private cache = new Map<string, { data: CountryTaxRates; timestamp: number }>();
  private readonly CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

  private constructor() {
    console.log('💰 TaxRateService initialized');
  }

  static getInstance(): TaxRateService {
    if (!TaxRateService.instance) {
      TaxRateService.instance = new TaxRateService();
    }
    return TaxRateService.instance;
  }

  /**
   * Get country-specific tax rates from database
   */
  async getCountryTaxRates(countryCode: string): Promise<CountryTaxRates | null> {
    // Check cache first
    const cached = this.getFromCache(countryCode);
    if (cached) {
      console.log(`💾 [TAX RATES] Cache hit for ${countryCode}`);
      return cached;
    }

    try {
      console.log(`🔍 [TAX RATES] Fetching rates for ${countryCode} from database`);

      const { data, error } = await supabase
        .from('country_settings')
        .select('code, vat, sales_tax')
        .eq('code', countryCode)
        .single();

      if (error || !data) {
        console.warn(`⚠️ [TAX RATES] No rates found for ${countryCode}:`, error?.message);
        return null;
      }

      // Determine tax type and primary rate based on actual database columns
      let taxType: CountryTaxRates['tax_type'] = 'None';
      
      // For India, treat VAT as GST (they use GST system)
      if (countryCode === 'IN' && data.vat > 0) {
        taxType = 'GST';
      } else if (data.vat > 0) {
        taxType = 'VAT';
      } else if (data.sales_tax > 0) {
        taxType = 'Sales Tax';
      }

      const rates: CountryTaxRates = {
        country_code: data.code,
        gst_rate: countryCode === 'IN' ? data.vat : undefined, // India uses GST
        vat_rate: countryCode !== 'IN' ? data.vat : undefined, // Other countries use VAT
        sales_tax_rate: data.sales_tax,
        customs_default_rate: 10,  // Standard default
        manual_default_rate: 15,   // Standard default
        tax_type: taxType
      };

      console.log(`✅ [TAX RATES] Found rates for ${countryCode}:`, {
        tax_type: rates.tax_type,
        primary_rate: rates.gst_rate || rates.vat_rate || rates.sales_tax_rate || 0,
        customs_default: rates.customs_default_rate,
        manual_default: rates.manual_default_rate
      });

      // Cache the result
      this.setCache(countryCode, rates);
      return rates;

    } catch (error) {
      console.error(`❌ [TAX RATES] Error fetching rates for ${countryCode}:`, error);
      return null;
    }
  }

  /**
   * Get VAT/GST/Sales Tax rate for a specific country
   * This replaces hardcoded rates in HSNTaxService
   */
  async getCountryVATRate(countryCode: string): Promise<number> {
    const rates = await this.getCountryTaxRates(countryCode);
    if (!rates) {
      console.warn(`⚠️ [TAX RATES] No VAT rate found for ${countryCode}, using 0%`);
      return 0;
    }

    // Return the appropriate rate based on country's tax system
    const rate = rates.gst_rate || rates.vat_rate || rates.sales_tax_rate || 0;
    
    console.log(`💰 [TAX RATES] ${countryCode} ${rates.tax_type} rate: ${rate}%`);
    return rate;
  }

  /**
   * Get customs default rate for a country (replaces hardcoded 10%)
   */
  async getCountryCustomsDefault(countryCode: string): Promise<number> {
    const rates = await this.getCountryTaxRates(countryCode);
    const defaultRate = rates?.customs_default_rate || 10; // Fallback to 10% if no country-specific default
    
    console.log(`🚢 [TAX RATES] ${countryCode} customs default: ${defaultRate}%`);
    return defaultRate;
  }

  /**
   * Get manual tax default rate for a country (replaces hardcoded 18%)
   */
  async getCountryManualDefault(countryCode: string): Promise<number> {
    const rates = await this.getCountryTaxRates(countryCode);
    const defaultRate = rates?.manual_default_rate || 15; // Fallback to 15% if no country-specific default
    
    console.log(`✋ [TAX RATES] ${countryCode} manual default: ${defaultRate}%`);
    return defaultRate;
  }

  /**
   * Get tax information summary for debugging
   */
  async getTaxSummary(countryCode: string): Promise<{
    country: string;
    primary_tax: { type: string; rate: number };
    defaults: { customs: number; manual: number };
    source: 'database' | 'fallback';
  }> {
    const rates = await this.getCountryTaxRates(countryCode);
    
    if (!rates) {
      return {
        country: countryCode,
        primary_tax: { type: 'None', rate: 0 },
        defaults: { customs: 10, manual: 15 },
        source: 'fallback'
      };
    }

    const primaryRate = rates.gst_rate || rates.vat_rate || rates.sales_tax_rate || 0;

    return {
      country: countryCode,
      primary_tax: { type: rates.tax_type, rate: primaryRate },
      defaults: { 
        customs: rates.customs_default_rate || 10, 
        manual: rates.manual_default_rate || 15 
      },
      source: 'database'
    };
  }

  /**
   * Cache management
   */
  private getFromCache(countryCode: string): CountryTaxRates | null {
    const cached = this.cache.get(countryCode);
    if (!cached) return null;

    const isExpired = Date.now() - cached.timestamp > this.CACHE_DURATION;
    if (isExpired) {
      this.cache.delete(countryCode);
      return null;
    }

    return cached.data;
  }

  private setCache(countryCode: string, data: CountryTaxRates): void {
    this.cache.set(countryCode, {
      data,
      timestamp: Date.now()
    });
  }

  /**
   * Clear cache for specific country or all
   */
  clearCache(countryCode?: string): void {
    if (countryCode) {
      this.cache.delete(countryCode);
      console.log(`🗑️ [TAX RATES] Cache cleared for ${countryCode}`);
    } else {
      this.cache.clear();
      console.log(`🗑️ [TAX RATES] All cache cleared`);
    }
  }

  /**
   * Preload common countries into cache
   */
  async preloadCommonCountries(): Promise<void> {
    const commonCountries = ['IN', 'NP', 'US', 'CN', 'UK', 'AU'];
    console.log(`🚀 [TAX RATES] Preloading rates for common countries: ${commonCountries.join(', ')}`);
    
    await Promise.all(
      commonCountries.map(country => this.getCountryTaxRates(country))
    );
    
    console.log(`✅ [TAX RATES] Preloaded ${commonCountries.length} countries`);
  }
}

// Export singleton instance
export const taxRateService = TaxRateService.getInstance();