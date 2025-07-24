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

export interface ItemTaxBreakdown {
  item_id: string;
  hsn_code: string;
  category: string;
  item_name: string;

  // Valuation details (critical for minimum valuation logic)
  original_price_origin_currency: number;
  minimum_valuation_conversion?: MinimumValuationConversion;
  taxable_amount_origin_currency: number;
  valuation_method: 'original_price' | 'minimum_valuation' | 'higher_of_both' | 'admin_override';

  // Enhanced: Both calculation options for admin choice
  calculation_options: {
    actual_price_calculation: {
      basis_amount: number;
      customs_amount: number;
      local_tax_amount: number;
      total_tax: number;
    };
    minimum_valuation_calculation?: {
      basis_amount: number;
      customs_amount: number;
      local_tax_amount: number;
      total_tax: number;
      currency_conversion_details: string; // e.g., "$10 USD → ₹830 INR"
    };
    selected_method: 'actual_price' | 'minimum_valuation' | 'manual_override';
    admin_can_override: boolean;
  };

  // Tax calculations (based on selected method)
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
   * ENHANCED CORE METHOD: Calculate taxes with both valuation options for admin choice
   * Provides transparency and admin override capabilities
   */
  async calculateItemTax(
    item: QuoteItem,
    context: TaxCalculationContext,
  ): Promise<ItemTaxBreakdown | null> {
    try {
      // Skip items without HSN codes
      if (!item.hsn_code || item.hsn_code.trim() === '') {
        console.log(`⚠️ [HSN] Skipping item ${item.name} - no HSN code assigned`);
        return null; // Return null for items without HSN codes
      }

      // Get HSN data for the item
      const hsnData = await this.getHSNData(item.hsn_code);
      if (!hsnData) {
        console.warn(`⚠️ [HSN] HSN code not found in database: ${item.hsn_code} for item: ${item.name}`);
        return null; // Return null if HSN data not found
      }

      // Get tax rates (with admin overrides)
      const taxRates = await this.getTaxRates(hsnData, context);

      // Calculate both valuation options
      const valuationOptions = await this.calculateBothValuationOptions(
        item,
        hsnData,
        context.route.origin_country,
        taxRates,
      );

      // Use the auto-selected amount for the main calculations (backward compatibility)
      const selectedAmount = valuationOptions.auto_selected_amount;

      // Calculate customs and local taxes based on selected amount
      const customsCalculation = this.calculateCustoms(
        selectedAmount,
        taxRates.customs_rate,
        context,
      );

      const localTaxCalculation = await this.calculateLocalTaxes(
        selectedAmount,
        taxRates,
        context,
      );

      // Build enhanced calculation options object
      const calculation_options = {
        actual_price_calculation: valuationOptions.actual_price_calculation,
        minimum_valuation_calculation: valuationOptions.minimum_valuation_calculation,
        selected_method: valuationOptions.selected_method,
        admin_can_override: true, // Always allow admin override
      };

      // Build comprehensive breakdown with both legacy and enhanced fields
      const breakdown: ItemTaxBreakdown = {
        item_id: item.id,
        hsn_code: hsnData.hsn_code,
        category: hsnData.category,
        item_name: item.name,

        // Valuation details (legacy fields for backward compatibility)
        original_price_origin_currency: item.price_origin_currency,
        minimum_valuation_conversion: valuationOptions.minimum_valuation_conversion,
        taxable_amount_origin_currency: selectedAmount,
        valuation_method: valuationOptions.valuation_method,

        // Enhanced: Both calculation options for admin choice
        calculation_options,

        // Tax calculations (based on auto-selected method)
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
        warnings: this.generateWarnings(
          {
            taxable_amount_origin_currency: selectedAmount,
            valuation_method: valuationOptions.valuation_method,
            minimum_valuation_conversion: valuationOptions.minimum_valuation_conversion,
          },
          taxRates,
          item,
        ),
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
    const results = await Promise.all(promises);
    
    // Filter out null results (items without HSN codes)
    const validBreakdowns = results.filter((breakdown): breakdown is ItemTaxBreakdown => breakdown !== null);
    
    console.log(`✅ [HSN] Calculated taxes for ${validBreakdowns.length}/${items.length} items with HSN codes`);
    
    return validBreakdowns;
  }

  /**
   * ENHANCED METHOD: Calculate both actual price and minimum valuation options
   * Returns both calculations for admin choice, maintains currency uniformity
   */
  private async calculateBothValuationOptions(
    item: QuoteItem,
    hsnData: HSNData,
    originCountry: string,
    taxRates: any,
  ): Promise<{
    actual_price_calculation: {
      basis_amount: number;
      customs_amount: number;
      local_tax_amount: number;
      total_tax: number;
    };
    minimum_valuation_calculation?: {
      basis_amount: number;
      customs_amount: number;
      local_tax_amount: number;
      total_tax: number;
      currency_conversion_details: string;
    };
    selected_method: 'actual_price' | 'minimum_valuation';
    minimum_valuation_conversion?: MinimumValuationConversion;
    auto_selected_amount: number;
    valuation_method: 'original_price' | 'minimum_valuation' | 'higher_of_both';
  }> {
    const originalPrice = item.price_origin_currency;
    
    // Calculate actual price taxes
    const actualPriceCustoms = (originalPrice * taxRates.customs_rate) / 100;
    const actualPriceLocalTax = (originalPrice * (taxRates.gst_rate || taxRates.vat_rate || 0)) / 100;
    
    const actual_price_calculation = {
      basis_amount: originalPrice,
      customs_amount: Math.round(actualPriceCustoms * 100) / 100,
      local_tax_amount: Math.round(actualPriceLocalTax * 100) / 100,
      total_tax: Math.round((actualPriceCustoms + actualPriceLocalTax) * 100) / 100,
    };

    // If no minimum valuation required, return only actual price calculation
    if (!hsnData.minimum_valuation_usd || !hsnData.requires_currency_conversion) {
      return {
        actual_price_calculation,
        selected_method: 'actual_price',
        auto_selected_amount: originalPrice,
        valuation_method: 'original_price',
      };
    }

    // Convert minimum valuation from USD to origin country currency (maintains uniformity)
    const minimumValuationConversion = await this.currencyService.convertMinimumValuation(
      hsnData.minimum_valuation_usd,
      originCountry,
    );

    const minimumAmount = minimumValuationConversion.convertedAmount;
    
    // Calculate minimum valuation taxes
    const minimumValuationCustoms = (minimumAmount * taxRates.customs_rate) / 100;
    const minimumValuationLocalTax = (minimumAmount * (taxRates.gst_rate || taxRates.vat_rate || 0)) / 100;

    const minimum_valuation_calculation = {
      basis_amount: minimumAmount,
      customs_amount: Math.round(minimumValuationCustoms * 100) / 100,
      local_tax_amount: Math.round(minimumValuationLocalTax * 100) / 100,
      total_tax: Math.round((minimumValuationCustoms + minimumValuationLocalTax) * 100) / 100,
      currency_conversion_details: `$${hsnData.minimum_valuation_usd} USD → ${minimumAmount} ${minimumValuationConversion.originCurrency}`,
    };

    // Determine which method to auto-select (higher amount)
    let selected_method: 'actual_price' | 'minimum_valuation';
    let auto_selected_amount: number;
    let valuation_method: 'original_price' | 'minimum_valuation' | 'higher_of_both';

    if (originalPrice >= minimumAmount) {
      selected_method = 'actual_price';
      auto_selected_amount = originalPrice;
      valuation_method = 'higher_of_both';
    } else {
      selected_method = 'minimum_valuation';
      auto_selected_amount = minimumAmount;
      valuation_method = 'minimum_valuation';
    }

    return {
      actual_price_calculation,
      minimum_valuation_calculation,
      selected_method,
      minimum_valuation_conversion: minimumValuationConversion,
      auto_selected_amount,
      valuation_method,
    };
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
