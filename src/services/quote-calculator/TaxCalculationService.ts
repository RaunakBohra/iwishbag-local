/**
 * Tax Calculation Service
 * Handles local tax computation (GST/VAT/Sales Tax) for different countries
 * Decomposed from SimplifiedQuoteCalculator for better separation of concerns
 */

import { logger } from '@/utils/logger';
import { supabase } from '@/integrations/supabase/client';

export interface TaxCalculationRequest {
  taxableValue: number;
  destinationCountry: string;
  destinationState?: string;
  originCountry: string;
  originState?: string;
  taxType?: 'gst' | 'vat' | 'sales_tax' | 'auto';
  itemCategories?: string[];
  isBusinessTransaction?: boolean;
}

export interface TaxCalculationResult {
  tax_amount: number;
  tax_rate: number;
  tax_type: string;
  taxable_value: number;
  tax_breakdown?: {
    central_tax?: number;
    state_tax?: number;
    integrated_tax?: number;
    local_tax?: number;
  };
  exemptions_applied?: Array<{
    type: string;
    amount: number;
    reason: string;
  }>;
  calculation_method: string;
}

// Country-specific tax rates and systems
const TAX_SYSTEMS: { [country: string]: {
  type: 'gst' | 'vat' | 'sales_tax';
  standard_rate: number;
  reduced_rates?: { [category: string]: number };
  state_specific?: boolean;
  threshold?: number;
  business_registration_threshold?: number;
} } = {
  'IN': {
    type: 'gst',
    standard_rate: 18,
    reduced_rates: {
      'food': 5,
      'books': 5,
      'medicines': 5,
      'textiles': 12,
      'electronics': 18,
      'luxury': 28
    },
    state_specific: true,
    threshold: 10000, // ₹10,000 turnover threshold
    business_registration_threshold: 40000 // ₹40 lakh for registration
  },
  'NP': {
    type: 'vat',
    standard_rate: 13,
    reduced_rates: {
      'food': 0,
      'medicines': 0,
      'books': 0,
      'textiles': 13,
      'electronics': 13
    },
    threshold: 2000 // NPR 20 lakh threshold
  },
  'GB': {
    type: 'vat',
    standard_rate: 20,
    reduced_rates: {
      'food': 0,
      'books': 0,
      'medicines': 0,
      'children_clothes': 0,
      'energy': 5
    },
    threshold: 85000 // £85,000 threshold
  },
  'EU': {
    type: 'vat',
    standard_rate: 21, // Average EU rate
    reduced_rates: {
      'food': 9,
      'books': 9,
      'medicines': 6,
      'transport': 9
    },
    threshold: 10000 // €10,000 average threshold
  },
  'US': {
    type: 'sales_tax',
    standard_rate: 7.25, // Average across states
    state_specific: true,
    threshold: 100000 // $100,000 economic nexus threshold
  },
  'CA': {
    type: 'gst',
    standard_rate: 13, // HST average (GST + PST)
    state_specific: true,
    reduced_rates: {
      'food': 0,
      'medicines': 0,
      'books': 0
    },
    threshold: 30000 // CAD $30,000 threshold
  },
  'AU': {
    type: 'gst',
    standard_rate: 10,
    reduced_rates: {
      'food': 0,
      'medicines': 0,
      'books': 0,
      'education': 0
    },
    threshold: 75000 // AUD $75,000 threshold
  },
  'DEFAULT': {
    type: 'vat',
    standard_rate: 15, // Global average
    threshold: 0
  }
};

// State-specific tax rates for countries with regional variations
const STATE_TAX_RATES: { [country: string]: { [state: string]: number } } = {
  'US': {
    'CA': 7.25,  // California
    'NY': 8.0,   // New York
    'TX': 6.25,  // Texas
    'FL': 6.0,   // Florida
    'WA': 6.5,   // Washington
    'OR': 0,     // Oregon (no sales tax)
    'NH': 0,     // New Hampshire (no sales tax)
    'DE': 0,     // Delaware (no sales tax)
    'MT': 0,     // Montana (no sales tax)
    'DEFAULT': 7.25
  },
  'IN': {
    'MH': 18,    // Maharashtra (Mumbai)
    'KA': 18,    // Karnataka (Bangalore)
    'TN': 18,    // Tamil Nadu (Chennai)
    'DL': 18,    // Delhi
    'GJ': 18,    // Gujarat
    'RJ': 18,    // Rajasthan
    'UP': 18,    // Uttar Pradesh
    'WB': 18,    // West Bengal (Kolkata)
    'DEFAULT': 18
  },
  'CA': {
    'ON': 13,    // Ontario (HST)
    'QC': 14.975, // Quebec (GST + QST)
    'BC': 12,    // British Columbia (GST + PST)
    'AB': 5,     // Alberta (GST only)
    'SK': 11,    // Saskatchewan
    'MB': 12,    // Manitoba
    'NB': 15,    // New Brunswick (HST)
    'NS': 15,    // Nova Scotia (HST)
    'PE': 15,    // Prince Edward Island (HST)
    'NL': 15,    // Newfoundland and Labrador (HST)
    'NT': 5,     // Northwest Territories (GST only)
    'NU': 5,     // Nunavut (GST only)
    'YT': 5,     // Yukon (GST only)
    'DEFAULT': 13
  }
};

export class TaxCalculationService {
  private taxRateCache = new Map<string, { rate: number; type: string; timestamp: Date }>();
  private readonly cacheTTL = 60 * 60 * 1000; // 1 hour
  
  constructor() {
    logger.info('TaxCalculationService initialized');
  }

  /**
   * Calculate local tax (GST/VAT/Sales Tax) for a quote
   */
  async calculateLocalTax(request: TaxCalculationRequest): Promise<TaxCalculationResult> {
    try {
      const { taxableValue, destinationCountry, destinationState, taxType } = request;

      // Get tax system for country
      const taxSystem = TAX_SYSTEMS[destinationCountry] || TAX_SYSTEMS['DEFAULT'];
      const effectiveTaxType = taxType === 'auto' || !taxType ? taxSystem.type : taxType;

      // Check if tax applies (threshold check)
      if (taxableValue <= 0) {
        return {
          tax_amount: 0,
          tax_rate: 0,
          tax_type: effectiveTaxType,
          taxable_value: taxableValue,
          calculation_method: 'zero_value'
        };
      }

      // Check business threshold exemptions
      if (taxSystem.threshold && taxableValue < taxSystem.threshold) {
        return {
          tax_amount: 0,
          tax_rate: 0,
          tax_type: effectiveTaxType,
          taxable_value: taxableValue,
          exemptions_applied: [{
            type: 'threshold',
            amount: taxableValue,
            reason: `Below ${taxSystem.threshold} threshold`
          }],
          calculation_method: 'threshold_exemption'
        };
      }

      // Get applicable tax rate
      const taxRate = await this.getTaxRate(
        destinationCountry,
        destinationState,
        effectiveTaxType,
        request.itemCategories
      );

      // Calculate tax amount
      const taxAmount = taxableValue * (taxRate / 100);

      // Create detailed breakdown for complex tax systems
      let taxBreakdown: TaxCalculationResult['tax_breakdown'];
      let calculationMethod = 'standard';

      if (destinationCountry === 'IN' && effectiveTaxType === 'gst') {
        // GST breakdown (CGST + SGST or IGST)
        taxBreakdown = this.calculateGSTBreakdown(taxRate, taxAmount, request.originState, destinationState);
        calculationMethod = 'gst_breakdown';
      } else if (destinationCountry === 'CA' && taxSystem.state_specific) {
        // Canadian HST/GST+PST breakdown
        taxBreakdown = this.calculateCanadianTaxBreakdown(taxRate, taxAmount, destinationState);
        calculationMethod = 'canadian_tax';
      }

      const result: TaxCalculationResult = {
        tax_amount: Math.max(0, taxAmount),
        tax_rate: taxRate,
        tax_type: effectiveTaxType,
        taxable_value: taxableValue,
        tax_breakdown: taxBreakdown,
        calculation_method: calculationMethod
      };

      logger.info(`Tax calculation completed: $${taxAmount.toFixed(2)} (${taxRate}% ${effectiveTaxType.toUpperCase()})`);
      return result;

    } catch (error) {
      logger.error('Tax calculation failed:', error);
      
      // Safe fallback
      const fallbackRate = TAX_SYSTEMS[request.destinationCountry]?.standard_rate || TAX_SYSTEMS['DEFAULT'].standard_rate;
      const fallbackAmount = request.taxableValue * (fallbackRate / 100);
      
      return {
        tax_amount: fallbackAmount,
        tax_rate: fallbackRate,
        tax_type: 'vat',
        taxable_value: request.taxableValue,
        calculation_method: 'fallback'
      };
    }
  }

  /**
   * Get applicable tax rate for country/state/category
   */
  private async getTaxRate(
    country: string,
    state?: string,
    taxType: string = 'auto',
    categories?: string[]
  ): Promise<number> {
    try {
      const cacheKey = `${country}_${state || 'default'}_${taxType}_${categories?.join(',') || 'all'}`;
      
      // Check cache
      if (this.taxRateCache.has(cacheKey)) {
        const cached = this.taxRateCache.get(cacheKey)!;
        if (new Date().getTime() - cached.timestamp.getTime() < this.cacheTTL) {
          return cached.rate;
        }
        this.taxRateCache.delete(cacheKey);
      }

      let effectiveRate: number;
      const taxSystem = TAX_SYSTEMS[country] || TAX_SYSTEMS['DEFAULT'];

      // Try database lookup first
      try {
        effectiveRate = await this.getTaxRateFromDatabase(country, state, categories);
      } catch (dbError) {
        logger.debug('Database tax rate lookup failed, using hardcoded rates:', dbError);
        
        // Fallback to hardcoded rates
        effectiveRate = this.getHardcodedTaxRate(country, state, categories, taxSystem);
      }

      // Cache the result
      this.taxRateCache.set(cacheKey, {
        rate: effectiveRate,
        type: taxSystem.type,
        timestamp: new Date()
      });

      return effectiveRate;

    } catch (error) {
      logger.error('Tax rate lookup failed:', error);
      return TAX_SYSTEMS[country]?.standard_rate || TAX_SYSTEMS['DEFAULT'].standard_rate;
    }
  }

  /**
   * Get tax rate from database
   */
  private async getTaxRateFromDatabase(country: string, state?: string, categories?: string[]): Promise<number> {
    const { data: taxData, error } = await supabase
      .from('tax_rates')
      .select('rate, category, state_code')
      .eq('country_code', country)
      .eq('is_active', true);

    if (error || !taxData || taxData.length === 0) {
      throw new Error('No tax rates found in database');
    }

    // Filter by state if provided
    const stateFilteredRates = state 
      ? taxData.filter(rate => !rate.state_code || rate.state_code === state)
      : taxData;

    // Filter by category if provided
    if (categories && categories.length > 0) {
      const categoryRates = stateFilteredRates.filter(rate => 
        !rate.category || categories.includes(rate.category)
      );
      
      if (categoryRates.length > 0) {
        return categoryRates[0].rate; // Use first matching category rate
      }
    }

    // Use first available rate
    return stateFilteredRates[0]?.rate || TAX_SYSTEMS[country]?.standard_rate || TAX_SYSTEMS['DEFAULT'].standard_rate;
  }

  /**
   * Get hardcoded tax rate
   */
  private getHardcodedTaxRate(
    country: string,
    state?: string,
    categories?: string[],
    taxSystem: typeof TAX_SYSTEMS[string]
  ): number {
    // Check for category-specific rates
    if (categories && categories.length > 0 && taxSystem.reduced_rates) {
      for (const category of categories) {
        if (taxSystem.reduced_rates[category] !== undefined) {
          return taxSystem.reduced_rates[category];
        }
      }
    }

    // Check for state-specific rates
    if (state && taxSystem.state_specific) {
      const stateRates = STATE_TAX_RATES[country];
      if (stateRates) {
        return stateRates[state] || stateRates['DEFAULT'] || taxSystem.standard_rate;
      }
    }

    // Use standard rate
    return taxSystem.standard_rate;
  }

  /**
   * Calculate GST breakdown for India (CGST + SGST or IGST)
   */
  private calculateGSTBreakdown(
    totalRate: number,
    totalAmount: number,
    originState?: string,
    destinationState?: string
  ): TaxCalculationResult['tax_breakdown'] {
    // Inter-state transaction (IGST)
    if (originState && destinationState && originState !== destinationState) {
      return {
        integrated_tax: totalAmount // IGST = full rate
      };
    }
    
    // Intra-state transaction (CGST + SGST)
    const halfRate = totalRate / 2;
    const halfAmount = totalAmount / 2;
    
    return {
      central_tax: halfAmount,  // CGST
      state_tax: halfAmount     // SGST
    };
  }

  /**
   * Calculate Canadian tax breakdown (GST + PST or HST)
   */
  private calculateCanadianTaxBreakdown(
    totalRate: number,
    totalAmount: number,
    province?: string
  ): TaxCalculationResult['tax_breakdown'] {
    const hstProvinces = ['ON', 'NB', 'NS', 'PE', 'NL']; // Harmonized Sales Tax provinces
    
    if (province && hstProvinces.includes(province)) {
      return {
        integrated_tax: totalAmount // HST = combined rate
      };
    }
    
    // GST + PST breakdown
    const gstRate = 5; // Federal GST is always 5%
    const pstRate = totalRate - gstRate;
    const gstAmount = (totalAmount * gstRate) / totalRate;
    const pstAmount = totalAmount - gstAmount;
    
    return {
      central_tax: gstAmount, // GST
      state_tax: pstAmount    // PST
    };
  }

  /**
   * Calculate tax on specific item categories
   */
  async calculateCategorySpecificTax(
    items: Array<{ value: number; category: string; quantity: number }>,
    country: string,
    state?: string
  ): Promise<{
    total_tax: number;
    category_breakdown: Array<{
      category: string;
      taxable_value: number;
      tax_rate: number;
      tax_amount: number;
    }>;
  }> {
    let totalTax = 0;
    const categoryBreakdown: Array<{
      category: string;
      taxable_value: number;
      tax_rate: number;
      tax_amount: number;
    }> = [];

    // Group items by category
    const categoryGroups = new Map<string, number>();
    items.forEach(item => {
      const categoryValue = item.value * item.quantity;
      categoryGroups.set(
        item.category,
        (categoryGroups.get(item.category) || 0) + categoryValue
      );
    });

    // Calculate tax for each category
    for (const [category, totalValue] of categoryGroups.entries()) {
      const taxRate = await this.getTaxRate(country, state, 'auto', [category]);
      const taxAmount = totalValue * (taxRate / 100);
      
      totalTax += taxAmount;
      categoryBreakdown.push({
        category,
        taxable_value: totalValue,
        tax_rate: taxRate,
        tax_amount: taxAmount
      });
    }

    return { total_tax: totalTax, category_breakdown: categoryBreakdown };
  }

  /**
   * Check if transaction is exempt from tax
   */
  isExemptFromTax(
    country: string,
    categories?: string[],
    isBusinessTransaction?: boolean,
    transactionValue?: number
  ): { exempt: boolean; reason?: string } {
    const taxSystem = TAX_SYSTEMS[country] || TAX_SYSTEMS['DEFAULT'];

    // Check threshold exemption
    if (transactionValue && taxSystem.threshold && transactionValue < taxSystem.threshold) {
      return { exempt: true, reason: 'Below tax threshold' };
    }

    // Check category exemptions
    if (categories && taxSystem.reduced_rates) {
      const exemptCategories = Object.entries(taxSystem.reduced_rates)
        .filter(([_, rate]) => rate === 0)
        .map(([category, _]) => category);
      
      const hasExemptCategory = categories.some(cat => exemptCategories.includes(cat));
      if (hasExemptCategory) {
        return { exempt: true, reason: 'Exempt category' };
      }
    }

    return { exempt: false };
  }

  /**
   * Get tax registration requirements for country
   */
  getTaxRegistrationInfo(country: string): {
    required: boolean;
    threshold?: number;
    currency: string;
    registration_url?: string;
  } {
    const taxSystem = TAX_SYSTEMS[country] || TAX_SYSTEMS['DEFAULT'];
    const currencyMap: { [country: string]: string } = {
      'IN': 'INR',
      'US': 'USD',
      'GB': 'GBP',
      'EU': 'EUR',
      'CA': 'CAD',
      'AU': 'AUD',
      'NP': 'NPR',
      'DEFAULT': 'USD'
    };

    return {
      required: !!taxSystem.business_registration_threshold,
      threshold: taxSystem.business_registration_threshold,
      currency: currencyMap[country] || currencyMap['DEFAULT'],
      registration_url: this.getTaxRegistrationURL(country)
    };
  }

  /**
   * Get tax registration URL for country
   */
  private getTaxRegistrationURL(country: string): string | undefined {
    const urls: { [country: string]: string } = {
      'IN': 'https://www.gst.gov.in/',
      'GB': 'https://www.gov.uk/vat-registration',
      'US': 'https://www.irs.gov/',
      'CA': 'https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/gst-hst-businesses.html',
      'AU': 'https://www.ato.gov.au/business/gst/'
    };

    return urls[country];
  }

  /**
   * Validate tax calculation request
   */
  validateTaxRequest(request: TaxCalculationRequest): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (request.taxableValue < 0) {
      errors.push('Taxable value cannot be negative');
    }

    if (!request.destinationCountry) {
      errors.push('Destination country is required');
    }

    if (request.taxType && !['gst', 'vat', 'sales_tax', 'auto'].includes(request.taxType)) {
      errors.push('Invalid tax type');
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Clear tax rate cache
   */
  clearCache(): void {
    this.taxRateCache.clear();
    logger.info('Tax rate cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; entries: Array<{ key: string; rate: number; type: string; age: number }> } {
    const entries = Array.from(this.taxRateCache.entries()).map(([key, data]) => ({
      key,
      rate: data.rate,
      type: data.type,
      age: new Date().getTime() - data.timestamp.getTime()
    }));

    return { size: this.taxRateCache.size, entries };
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    this.clearCache();
    logger.info('TaxCalculationService disposed');
  }
}

export default TaxCalculationService;