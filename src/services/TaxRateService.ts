
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