/**
 * Per-Item Tax Calculator for HSN System
 *
 * This service calculates customs and local taxes for individual items
 * using HSN codes and currency-aware minimum valuations.
 *
 * CRITICAL FEATURE: Integrates with CurrencyConversionService to handle
 * minimum valuations stored in USD but applied in origin country currency.
 *
 * Example: Nepal kurta with $10 USD minimum → ~1330 NPR → apply 12% customs
 */

import CurrencyConversionService, { MinimumValuationConversion } from './CurrencyConversionService';

interface QuoteItem {
  id: string;
  name: string;
  price_origin_currency: number;
  weight_kg?: number;
  hsn_code?: string;
  category?: string;
  url?: string;
  quantity?: number;
}

interface ShippingRoute {
  id: number;
  origin_country: string;
  destination_country: string;
  tax_configuration?: any;
  weight_configuration?: any;
  api_configuration?: any;
}

interface HSNData {
  hsn_code: string;
  description: string;
  category: string;
  subcategory?: string;
  minimum_valuation_usd?: number;
  requires_currency_conversion: boolean;
  weight_data: any;
  tax_data: any;
  classification_data: any;
}

interface ItemTaxBreakdown {
  item_id: string;
  hsn_code: string;
  item_name: string;

  // Valuation details (critical for minimum valuation logic)
  original_price_origin_currency: number;
  minimum_valuation_conversion?: MinimumValuationConversion;
  taxable_amount_origin_currency: number;
  valuation_method: 'original_price' | 'minimum_valuation' | 'higher_of_both';

  // Tax calculations
  customs_calculation: {
    rate_percentage: number;
    amount_origin_currency: number;
    basis_amount: number;
  };

  local_tax_calculation: {
    tax_type: 'gst' | 'vat' | 'sales_tax';
    rate_percentage: number;
    amount_origin_currency: number;
    basis_amount: number;
  };

  // Total breakdown
  total_customs: number;
  total_local_taxes: number;
  total_taxes: number;

  // Metadata
  calculation_timestamp: Date;
  admin_overrides_applied: any[];
  confidence_score: number;
  warnings: string[];
}

interface TaxCalculationContext {
  route: ShippingRoute;
  admin_overrides?: any[];
  apply_exemptions?: boolean;
  calculation_date?: Date;
}

class PerItemTaxCalculator {
  private static instance: PerItemTaxCalculator;
  private currencyService: CurrencyConversionService;

  private constructor() {
    this.currencyService = CurrencyConversionService.getInstance();
  }

  static getInstance(): PerItemTaxCalculator {
    if (!PerItemTaxCalculator.instance) {
      PerItemTaxCalculator.instance = new PerItemTaxCalculator();
    }
    return PerItemTaxCalculator.instance;
  }

  /**
   * CORE METHOD: Calculate taxes for a single item with currency conversion
   * This implements the critical minimum valuation logic
   */
  async calculateItemTax(
    item: QuoteItem,
    context: TaxCalculationContext,
  ): Promise<ItemTaxBreakdown> {
    try {
      // Get HSN data for the item
      const hsnData = await this.getHSNData(item.hsn_code || '');
      if (!hsnData) {
        throw new Error(`HSN code not found: ${item.hsn_code}`);
      }

      // Determine taxable amount with currency conversion
      const valuationResult = await this.determineValuationAmount(
        item,
        hsnData,
        context.route.origin_country,
      );

      // Get tax rates (with admin overrides)
      const taxRates = await this.getTaxRates(hsnData, context);

      // Calculate customs
      const customsCalculation = this.calculateCustoms(
        valuationResult.taxable_amount_origin_currency,
        taxRates.customs_rate,
        context,
      );

      // Calculate local taxes (GST/VAT/Sales Tax)
      const localTaxCalculation = await this.calculateLocalTaxes(
        valuationResult.taxable_amount_origin_currency,
        taxRates,
        context,
      );

      // Build comprehensive breakdown
      const breakdown: ItemTaxBreakdown = {
        item_id: item.id,
        hsn_code: hsnData.hsn_code,
        item_name: item.name,

        // Valuation details
        original_price_origin_currency: item.price_origin_currency,
        minimum_valuation_conversion: valuationResult.minimum_valuation_conversion,
        taxable_amount_origin_currency: valuationResult.taxable_amount_origin_currency,
        valuation_method: valuationResult.valuation_method,

        // Tax calculations
        customs_calculation: customsCalculation,
        local_tax_calculation: localTaxCalculation,

        // Totals
        total_customs: customsCalculation.amount_origin_currency,
        total_local_taxes: localTaxCalculation.amount_origin_currency,
        total_taxes:
          customsCalculation.amount_origin_currency + localTaxCalculation.amount_origin_currency,

        // Metadata
        calculation_timestamp: new Date(),
        admin_overrides_applied: context.admin_overrides || [],
        confidence_score: this.calculateConfidenceScore(hsnData, item),
        warnings: this.generateWarnings(valuationResult, taxRates, item),
      };

      return breakdown;
    } catch (error) {
      console.error('Per-item tax calculation error:', error);
      throw new Error(`Tax calculation failed for item ${item.id}: ${error.message}`);
    }
  }

  /**
   * Calculate taxes for multiple items in batch
   */
  async calculateMultipleItemTaxes(
    items: QuoteItem[],
    context: TaxCalculationContext,
  ): Promise<ItemTaxBreakdown[]> {
    const promises = items.map((item) => this.calculateItemTax(item, context));
    return Promise.all(promises);
  }

  /**
   * CRITICAL METHOD: Determine valuation amount with currency conversion
   * This handles the core requirement of minimum valuation conversion
   */
  private async determineValuationAmount(
    item: QuoteItem,
    hsnData: HSNData,
    originCountry: string,
  ): Promise<{
    taxable_amount_origin_currency: number;
    valuation_method: 'original_price' | 'minimum_valuation' | 'higher_of_both';
    minimum_valuation_conversion?: MinimumValuationConversion;
  }> {
    // If no minimum valuation required, use original price
    if (!hsnData.minimum_valuation_usd || !hsnData.requires_currency_conversion) {
      return {
        taxable_amount_origin_currency: item.price_origin_currency,
        valuation_method: 'original_price',
      };
    }

    // Convert minimum valuation from USD to origin country currency
    const minimumValuationConversion = await this.currencyService.convertMinimumValuation(
      hsnData.minimum_valuation_usd,
      originCountry,
    );

    // Compare original price with converted minimum valuation
    const originalPrice = item.price_origin_currency;
    const minimumAmount = minimumValuationConversion.convertedAmount;

    if (originalPrice >= minimumAmount) {
      // Original price is higher - use original price
      return {
        taxable_amount_origin_currency: originalPrice,
        valuation_method: 'higher_of_both',
        minimum_valuation_conversion: minimumValuationConversion,
      };
    } else {
      // Minimum valuation is higher - use converted minimum
      return {
        taxable_amount_origin_currency: minimumAmount,
        valuation_method: 'minimum_valuation',
        minimum_valuation_conversion: minimumValuationConversion,
      };
    }
  }

  /**
   * Calculate customs duty
   */
  private calculateCustoms(
    taxableAmount: number,
    customsRate: number,
    context: TaxCalculationContext,
  ) {
    const customsAmount = (taxableAmount * customsRate) / 100;

    return {
      rate_percentage: customsRate,
      amount_origin_currency: Math.round(customsAmount * 100) / 100, // Round to 2 decimals
      basis_amount: taxableAmount,
    };
  }

  /**
   * Calculate local taxes (GST/VAT/Sales Tax)
   */
  private async calculateLocalTaxes(
    taxableAmount: number,
    taxRates: any,
    context: TaxCalculationContext,
  ) {
    // Determine tax type based on destination country
    const taxType = await this.getLocalTaxType(context.route.destination_country);
    const taxRate = taxRates[`${taxType}_rate`] || 0;

    // Calculate tax amount
    const taxAmount = (taxableAmount * taxRate) / 100;

    return {
      tax_type: taxType as 'gst' | 'vat' | 'sales_tax',
      rate_percentage: taxRate,
      amount_origin_currency: Math.round(taxAmount * 100) / 100,
      basis_amount: taxableAmount,
    };
  }

  /**
   * Get HSN data from database
   */
  private async getHSNData(hsnCode: string): Promise<HSNData | null> {
    try {
      const { supabase } = await import('@/integrations/supabase/client');

      const { data, error } = await supabase
        .from('hsn_master')
        .select('*')
        .eq('hsn_code', hsnCode)
        .eq('is_active', true)
        .single();

      if (error || !data) {
        console.error('HSN data fetch error:', error);
        return null;
      }

      return data as HSNData;
    } catch (error) {
      console.error('HSN data fetch error:', error);
      return null;
    }
  }

  /**
   * Get tax rates with admin overrides applied
   */
  private async getTaxRates(hsnData: HSNData, context: TaxCalculationContext) {
    // Get base rates from HSN data
    const baseRates = {
      customs_rate: hsnData.tax_data?.typical_rates?.customs?.common || 0,
      gst_rate: hsnData.tax_data?.typical_rates?.gst?.standard || 0,
      vat_rate: hsnData.tax_data?.typical_rates?.vat?.common || 0,
      sales_tax_rate: 0, // Will be determined by destination country
    };

    // Apply admin overrides if any
    if (context.admin_overrides && context.admin_overrides.length > 0) {
      return this.applyAdminOverrides(baseRates, context.admin_overrides, hsnData);
    }

    return baseRates;
  }

  /**
   * Apply admin overrides to tax rates
   */
  private applyAdminOverrides(baseRates: any, overrides: any[], hsnData: HSNData) {
    const adjustedRates = { ...baseRates };

    for (const override of overrides) {
      if (override.override_type === 'tax_rate') {
        const overrideData = override.override_data;

        // Check if override applies to this HSN code/category
        if (this.overrideApplies(override, hsnData)) {
          if (overrideData.tax_type === 'customs') {
            adjustedRates.customs_rate = overrideData.override_rate;
          }
          // Add other tax type overrides as needed
        }
      }
    }

    return adjustedRates;
  }

  /**
   * Check if admin override applies to current item
   */
  private overrideApplies(override: any, hsnData: HSNData): boolean {
    const { scope, scope_identifier } = override;

    switch (scope) {
      case 'category':
        return scope_identifier === hsnData.category;
      case 'hsn_code':
        return scope_identifier === hsnData.hsn_code;
      case 'global':
        return true;
      default:
        return false;
    }
  }

  /**
   * Get local tax type for destination country
   */
  private async getLocalTaxType(destinationCountry: string): Promise<string> {
    try {
      const { supabase } = await import('@/integrations/supabase/client');

      const { data, error } = await supabase
        .from('unified_configuration')
        .select('config_data')
        .eq('config_type', 'country')
        .eq('config_key', destinationCountry)
        .single();

      if (error || !data) {
        return 'sales_tax'; // Default fallback
      }

      const taxSystem = data.config_data?.tax_system;

      switch (taxSystem) {
        case 'GST':
          return 'gst';
        case 'VAT':
          return 'vat';
        case 'SALES_TAX':
          return 'sales_tax';
        default:
          return 'sales_tax';
      }
    } catch (error) {
      console.error('Tax type lookup error:', error);
      return 'sales_tax';
    }
  }

  /**
   * Calculate confidence score for tax calculation
   */
  private calculateConfidenceScore(hsnData: HSNData, item: QuoteItem): number {
    let score = 0.8; // Base score

    // Increase confidence if HSN code was explicitly provided
    if (item.hsn_code) {
      score += 0.1;
    }

    // Increase confidence if we have good classification data
    if (hsnData.classification_data?.auto_classification?.confidence) {
      const classificationConfidence = hsnData.classification_data.auto_classification.confidence;
      score = (score + classificationConfidence) / 2;
    }

    // Decrease confidence if minimum valuation was applied
    if (hsnData.minimum_valuation_usd && hsnData.requires_currency_conversion) {
      score -= 0.05; // Small penalty for currency conversion uncertainty
    }

    return Math.min(1.0, Math.max(0.0, score));
  }

  /**
   * Generate warnings for tax calculation
   */
  private generateWarnings(valuationResult: any, taxRates: any, item: QuoteItem): string[] {
    const warnings: string[] = [];

    // Warning if minimum valuation was applied
    if (valuationResult.valuation_method === 'minimum_valuation') {
      warnings.push(
        `Minimum valuation applied: ${valuationResult.minimum_valuation_conversion.convertedAmount} ${valuationResult.minimum_valuation_conversion.originCurrency} (converted from $${valuationResult.minimum_valuation_conversion.usdAmount} USD)`,
      );
    }

    // Warning if currency conversion used fallback rates
    if (valuationResult.minimum_valuation_conversion?.cacheSource === 'fallback') {
      warnings.push('Currency conversion used fallback exchange rates - actual rates may vary');
    }

    // Warning if tax rates are zero (might be exempt)
    if (taxRates.customs_rate === 0 && taxRates.gst_rate === 0 && taxRates.vat_rate === 0) {
      warnings.push('No taxes calculated - item may be tax-exempt');
    }

    // Warning if HSN code is missing
    if (!item.hsn_code) {
      warnings.push('HSN code not specified - using category-based classification');
    }

    return warnings;
  }

  /**
   * Get summary of all item calculations
   */
  async getCalculationSummary(breakdowns: ItemTaxBreakdown[]): Promise<{
    total_items: number;
    total_customs: number;
    total_local_taxes: number;
    total_all_taxes: number;
    average_confidence: number;
    items_with_minimum_valuation: number;
    items_with_warnings: number;
    currency_conversions_applied: number;
  }> {
    const summary = {
      total_items: breakdowns.length,
      total_customs: 0,
      total_local_taxes: 0,
      total_all_taxes: 0,
      average_confidence: 0,
      items_with_minimum_valuation: 0,
      items_with_warnings: 0,
      currency_conversions_applied: 0,
    };

    for (const breakdown of breakdowns) {
      summary.total_customs += breakdown.total_customs;
      summary.total_local_taxes += breakdown.total_local_taxes;
      summary.total_all_taxes += breakdown.total_taxes;
      summary.average_confidence += breakdown.confidence_score;

      if (breakdown.valuation_method === 'minimum_valuation') {
        summary.items_with_minimum_valuation++;
      }

      if (breakdown.warnings.length > 0) {
        summary.items_with_warnings++;
      }

      if (breakdown.minimum_valuation_conversion) {
        summary.currency_conversions_applied++;
      }
    }

    summary.average_confidence = summary.average_confidence / breakdowns.length;

    return summary;
  }
}

export default PerItemTaxCalculator;
export type { ItemTaxBreakdown, QuoteItem, ShippingRoute, TaxCalculationContext };
