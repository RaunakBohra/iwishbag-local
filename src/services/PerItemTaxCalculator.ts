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
import { unifiedTaxFallbackService, UnifiedTaxData } from './UnifiedTaxFallbackService';

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
    tax_type: 'gst' | 'vat' | 'sales_tax' | 'state_tax' | 'local_tax' | 'pst' | 'excise_tax' | 'import_duty' | 'service_tax' | 'cess';
    rate_percentage: number;
    amount_origin_currency: number;
    basis_amount: number;
    breakdown?: {
      state_tax?: number;
      local_tax?: number;
      additional_taxes?: number;
    };
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
  // 2-tier tax system preferences
  calculation_method_preference?: 'auto' | 'hsn_only' | 'legacy_fallback' | 'admin_choice';
  valuation_method_preference?: 'auto' | 'actual_price' | 'minimum_valuation' | 'higher_of_both' | 'per_item_choice';
  admin_id?: string; // For audit logging
}

class PerItemTaxCalculator {
  private static instance: PerItemTaxCalculator;
  private currencyService: CurrencyConversionService;
  private unifiedTaxService = unifiedTaxFallbackService;

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
   * ENHANCED CORE METHOD: Calculate taxes with CIF/landed cost basis following international standards
   * Provides transparency and admin override capabilities
   */
  async calculateItemTax(
    item: QuoteItem,
    context: TaxCalculationContext,
    quoteTotals?: {
      totalItemsValue: number;
      totalShippingCost: number;
      totalInsuranceAmount: number;
      totalHandlingFee: number;
    }
  ): Promise<ItemTaxBreakdown | null> {
    try {
      // Create placeholder breakdown for items without HSN codes
      if (!item.hsn_code || item.hsn_code.trim() === '') {
        console.log(`⚠️ [HSN] Creating placeholder breakdown for item ${item.name} - no HSN code assigned`);
        return this.createPlaceholderBreakdown(item, context);
      }

      // Get HSN data for the item
      const hsnData = await this.getHSNData(item.hsn_code);
      if (!hsnData) {
        console.warn(`⚠️ [HSN] HSN code not found in database: ${item.hsn_code} for item: ${item.name}`);
        return null; // Return null if HSN data not found
      }

      // Get unified tax data with fallback mechanisms
      const unifiedTaxData = await this.unifiedTaxService.getUnifiedTaxData(
        context.route.origin_country,
        context.route.destination_country
      );

      // Get tax rates with admin overrides and preferences
      const taxRates = await this.getTaxRatesWithPreferences(hsnData, context, unifiedTaxData);

      // Use default quoteTotals if not provided (for backward compatibility)
      const totals = quoteTotals || this.getQuoteTotals([item], context);

      // Step 1: Calculate CIF value per item (Cost + Insurance + Freight)
      const cifValue = this.calculateCIFValue(
        item,
        context,
        totals.totalItemsValue,
        totals.totalShippingCost,
        totals.totalInsuranceAmount
      );

      // Step 2: Calculate customs duty on CIF basis (international standard)
      const customsCalculation = this.calculateCustoms(
        cifValue,
        taxRates.customs_rate,
        context,
      );

      // Step 3: Calculate landed cost (CIF + Customs + Handling)
      const landedCost = this.calculateLandedCost(
        cifValue,
        customsCalculation.amount_origin_currency,
        totals.totalHandlingFee,
        totals.totalItemsValue,
        item.price_origin_currency
      );

      // Step 4: Calculate local taxes on landed cost basis (international standard)
      const localTaxCalculation = await this.calculateLocalTaxes(
        landedCost,
        taxRates,
        context,
      );

      // Calculate both valuation options with the new CIF/landed cost logic
      const valuationOptions = await this.calculateBothValuationOptions(
        item,
        hsnData,
        context.route.origin_country,
        taxRates,
        context.valuation_method_preference
      );

      // Build enhanced calculation options object
      const calculation_options = {
        actual_price_calculation: valuationOptions.actual_price_calculation,
        minimum_valuation_calculation: valuationOptions.minimum_valuation_calculation,
        selected_method: valuationOptions.selected_method,
        admin_can_override: true, // Always allow admin override
      };

      // Build comprehensive breakdown with CIF/landed cost transparency
      const breakdown: ItemTaxBreakdown = {
        item_id: item.id,
        hsn_code: hsnData.hsn_code,
        category: hsnData.category,
        item_name: item.name,

        // CIF/Landed Cost details (international standard)
        original_price_origin_currency: item.price_origin_currency,
        minimum_valuation_conversion: valuationOptions.minimum_valuation_conversion,
        taxable_amount_origin_currency: landedCost, // Now shows landed cost for transparency
        valuation_method: valuationOptions.valuation_method,

        // Enhanced: Both calculation options for admin choice
        calculation_options,

        // Tax calculations (based on CIF/landed cost)
        customs_calculation: {
          ...customsCalculation,
          basis_amount: cifValue, // CIF basis for customs
        },
        local_tax_calculation: {
          ...localTaxCalculation,
          basis_amount: landedCost, // Landed cost basis for local tax
        },

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
   * Create placeholder breakdown for items without HSN codes
   * This ensures all items appear in the UI for HSN assignment
   */
  private createPlaceholderBreakdown(
    item: QuoteItem,
    context: TaxCalculationContext,
  ): ItemTaxBreakdown {
    // Create zero-value calculation structures
    const zeroCalculation = {
      basis_amount: 0,
      customs_amount: 0,
      local_tax_amount: 0,
      total_tax: 0,
    };

    const placeholderBreakdown: ItemTaxBreakdown = {
      item_id: item.id,
      hsn_code: '', // Empty HSN code to indicate unclassified
      category: 'unclassified',
      item_name: item.name,

      // Valuation details
      original_price_origin_currency: item.price_origin_currency,
      minimum_valuation_conversion: undefined,
      taxable_amount_origin_currency: item.price_origin_currency,
      valuation_method: 'original_price',

      // Enhanced: Both calculation options (zeros for unclassified items)
      calculation_options: {
        actual_price_calculation: zeroCalculation,
        minimum_valuation_calculation: undefined,
        selected_method: 'actual_price',
        admin_can_override: true,
      },

      // Tax calculations (all zeros)
      customs_calculation: {
        rate_percentage: 0,
        amount_origin_currency: 0,
        basis_amount: item.price_origin_currency,
      },

      local_tax_calculation: {
        tax_type: 'vat',
        rate_percentage: 0,
        amount_origin_currency: 0,
        basis_amount: item.price_origin_currency,
      },

      // Totals (all zeros)
      total_customs: 0,
      total_local_taxes: 0,
      total_taxes: 0,

      // Metadata
      calculation_timestamp: new Date(),
      admin_overrides_applied: [],
      confidence_score: 0, // Zero confidence for unclassified items
      warnings: [
        'HSN code not assigned - classification required for accurate tax calculation',
        'Using placeholder values - actual taxes will be calculated after HSN assignment'
      ],
    };

    return placeholderBreakdown;
  }

  /**
   * Get quote-level totals needed for CIF/landed cost calculations
   */
  private getQuoteTotals(items: QuoteItem[], context: TaxCalculationContext) {
    const totalItemsValue = items.reduce((sum, item) => sum + item.price_origin_currency, 0);
    
    // These would ideally come from the quote context, but we'll use defaults for now
    // In a real implementation, these should be passed through the context
    const totalShippingCost = 0; // TODO: Get from context
    const totalInsuranceAmount = 0; // TODO: Get from context  
    const totalHandlingFee = 0; // TODO: Get from context
    
    console.log(`[QUOTE TOTALS] Items: ${totalItemsValue}, Shipping: ${totalShippingCost}, Insurance: ${totalInsuranceAmount}, Handling: ${totalHandlingFee}`);
    
    return {
      totalItemsValue,
      totalShippingCost,
      totalInsuranceAmount,
      totalHandlingFee
    };
  }

  /**
   * Calculate taxes for multiple items in batch with proper CIF/landed cost
   */
  async calculateMultipleItemTaxes(
    items: QuoteItem[],
    context: TaxCalculationContext,
  ): Promise<ItemTaxBreakdown[]> {
    console.log(`[TAX CALCULATOR DEBUG] Received context:`, {
      calculation_method_preference: context.calculation_method_preference,
      valuation_method_preference: context.valuation_method_preference,
      items_count: items.length
    });

    // Get quote-level totals for proper allocation
    const quoteTotals = this.getQuoteTotals(items, context);

    const promises = items.map((item) => this.calculateItemTax(item, context, quoteTotals));
    const results = await Promise.all(promises);
    
    // All items now get breakdown objects (real calculations or placeholders)
    const allBreakdowns = results.filter((breakdown): breakdown is ItemTaxBreakdown => breakdown !== null);
    
    const itemsWithHSN = allBreakdowns.filter(b => b.hsn_code && b.hsn_code.trim() !== '').length;
    const itemsWithoutHSN = allBreakdowns.length - itemsWithHSN;
    
    console.log(`✅ [HSN] Generated breakdowns for ${allBreakdowns.length} items (${itemsWithHSN} classified, ${itemsWithoutHSN} awaiting HSN assignment)`);
    
    return allBreakdowns;
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
    valuationMethodPreference?: string,
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
    
    // Calculate local tax based on available rates (enhanced for new tax types)
    let actualPriceLocalTax = 0;
    if (taxRates.state_tax_rate || taxRates.local_tax_rate) {
      // US taxes: combine state and local
      actualPriceLocalTax = (originalPrice * ((taxRates.state_tax_rate || 0) + (taxRates.local_tax_rate || 0))) / 100;
    } else if (taxRates.gst_rate && taxRates.cess_rate) {
      // India taxes: GST + CESS
      actualPriceLocalTax = (originalPrice * ((taxRates.gst_rate || 0) + (taxRates.cess_rate || 0))) / 100;
    } else if (taxRates.gst_rate && taxRates.pst_rate) {
      // Canada taxes: GST + PST
      actualPriceLocalTax = (originalPrice * ((taxRates.gst_rate || 0) + (taxRates.pst_rate || 0))) / 100;
    } else {
      // Standard single tax rate
      actualPriceLocalTax = (originalPrice * (taxRates.gst_rate || taxRates.vat_rate || taxRates.sales_tax_rate || 0)) / 100;
    }
    
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
    
    // Calculate minimum valuation local tax (enhanced for new tax types)
    let minimumValuationLocalTax = 0;
    if (taxRates.state_tax_rate || taxRates.local_tax_rate) {
      // US taxes: combine state and local
      minimumValuationLocalTax = (minimumAmount * ((taxRates.state_tax_rate || 0) + (taxRates.local_tax_rate || 0))) / 100;
    } else if (taxRates.gst_rate && taxRates.cess_rate) {
      // India taxes: GST + CESS
      minimumValuationLocalTax = (minimumAmount * ((taxRates.gst_rate || 0) + (taxRates.cess_rate || 0))) / 100;
    } else if (taxRates.gst_rate && taxRates.pst_rate) {
      // Canada taxes: GST + PST
      minimumValuationLocalTax = (minimumAmount * ((taxRates.gst_rate || 0) + (taxRates.pst_rate || 0))) / 100;
    } else {
      // Standard single tax rate
      minimumValuationLocalTax = (minimumAmount * (taxRates.gst_rate || taxRates.vat_rate || taxRates.sales_tax_rate || 0)) / 100;
    }

    const minimum_valuation_calculation = {
      basis_amount: minimumAmount,
      customs_amount: Math.round(minimumValuationCustoms * 100) / 100,
      local_tax_amount: Math.round(minimumValuationLocalTax * 100) / 100,
      total_tax: Math.round((minimumValuationCustoms + minimumValuationLocalTax) * 100) / 100,
      currency_conversion_details: `$${hsnData.minimum_valuation_usd} USD → ${minimumAmount} ${minimumValuationConversion.originCurrency}`,
    };

    // Determine which method to auto-select based on admin preferences
    let selected_method: 'actual_price' | 'minimum_valuation';
    let auto_selected_amount: number;
    let valuation_method: 'original_price' | 'minimum_valuation' | 'higher_of_both';

    // Handle admin preferences for valuation method
    switch (valuationMethodPreference) {
      case 'actual_price':
        selected_method = 'actual_price';
        auto_selected_amount = originalPrice;
        valuation_method = 'original_price';
        break;
      case 'minimum_valuation':
        selected_method = 'minimum_valuation';
        auto_selected_amount = minimumAmount;
        valuation_method = 'minimum_valuation';
        break;
      case 'higher_of_both':
        // Use the higher amount (existing logic)
        if (originalPrice >= minimumAmount) {
          selected_method = 'actual_price';
          auto_selected_amount = originalPrice;
          valuation_method = 'higher_of_both';
        } else {
          selected_method = 'minimum_valuation';
          auto_selected_amount = minimumAmount;
          valuation_method = 'minimum_valuation';
        }
        break;
      default:
        // 'auto' or undefined - use higher amount (default behavior)
        if (originalPrice >= minimumAmount) {
          selected_method = 'actual_price';
          auto_selected_amount = originalPrice;
          valuation_method = 'higher_of_both';
        } else {
          selected_method = 'minimum_valuation';
          auto_selected_amount = minimumAmount;
          valuation_method = 'minimum_valuation';
        }
        break;
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
   * Calculate CIF value per item (Cost + Insurance + Freight)
   * Following international customs standards
   */
  private calculateCIFValue(
    item: QuoteItem,
    context: TaxCalculationContext,
    totalItemsValue: number,
    totalShippingCost: number,
    totalInsuranceAmount: number
  ): number {
    // Allocate shipping and insurance proportionally to item value
    const itemProportion = item.price_origin_currency / totalItemsValue;
    const allocatedShipping = totalShippingCost * itemProportion;
    const allocatedInsurance = totalInsuranceAmount * itemProportion;
    
    const cifValue = item.price_origin_currency + allocatedShipping + allocatedInsurance;
    
    console.log(`[CIF DEBUG] Item: ${item.name}`);
    console.log(`[CIF DEBUG] Item Price: ${item.price_origin_currency}`);
    console.log(`[CIF DEBUG] Allocated Shipping: ${allocatedShipping}`);
    console.log(`[CIF DEBUG] Allocated Insurance: ${allocatedInsurance}`);
    console.log(`[CIF DEBUG] CIF Value: ${cifValue}`);
    
    return cifValue;
  }

  /**
   * Calculate customs duty on CIF basis (international standard)
   */
  private calculateCustoms(
    cifValue: number,
    customsRate: number,
    context: TaxCalculationContext,
  ) {
    const customsAmount = (cifValue * customsRate) / 100;

    console.log(`[CUSTOMS DEBUG] CIF Value: ${cifValue}, Rate: ${customsRate}%, Amount: ${customsAmount}`);

    return {
      rate_percentage: customsRate,
      amount_origin_currency: Math.round(customsAmount * 100) / 100, // Round to 2 decimals
      basis_amount: cifValue, // Now using CIF as basis
    };
  }

  /**
   * Calculate landed cost per item (CIF + Customs + Handling)
   * Following international customs standards for local tax basis
   */
  private calculateLandedCost(
    cifValue: number,
    customsAmount: number,
    totalHandlingFee: number,
    totalItemsValue: number,
    itemValue: number
  ): number {
    // Allocate handling fee proportionally to item value
    const itemProportion = itemValue / totalItemsValue;
    const allocatedHandling = totalHandlingFee * itemProportion;
    
    const landedCost = cifValue + customsAmount + allocatedHandling;
    
    console.log(`[LANDED COST DEBUG] CIF: ${cifValue}, Customs: ${customsAmount}, Allocated Handling: ${allocatedHandling}, Landed Cost: ${landedCost}`);
    
    return landedCost;
  }

  /**
   * Calculate local taxes on landed cost basis (international standard)
   */
  private async calculateLocalTaxes(
    landedCost: number,
    taxRates: any,
    context: TaxCalculationContext,
  ) {
    // Determine tax type based on destination country
    const taxType = await this.getLocalTaxType(context.route.destination_country);
    
    console.log(`[LOCAL TAX DEBUG] Landed Cost: ${landedCost}, Tax Type: ${taxType}`);
    
    // Handle different tax calculation methods based on type
    switch (taxType) {
      case 'state_tax':
        return this.calculateUSStateTaxes(landedCost, taxRates, context);
      case 'pst':
        return this.calculateCanadianTaxes(landedCost, taxRates, context);
      case 'cess':
        return this.calculateIndiaTaxesWithCess(landedCost, taxRates, context);
      default:
        return this.calculateStandardLocalTax(landedCost, taxRates, taxType, context);
    }
  }

  /**
   * Calculate US State and Local taxes (separate state and local components)
   */
  private calculateUSStateTaxes(
    taxableAmount: number,
    taxRates: any,
    context: TaxCalculationContext,
  ) {
    const stateRate = taxRates.state_tax_rate || 0;
    const localRate = taxRates.local_tax_rate || 0;
    
    const stateTaxAmount = (taxableAmount * stateRate) / 100;
    const localTaxAmount = (taxableAmount * localRate) / 100;
    const totalTaxAmount = stateTaxAmount + localTaxAmount;
    
    return {
      tax_type: 'state_tax' as const,
      rate_percentage: stateRate + localRate,
      amount_origin_currency: Math.round(totalTaxAmount * 100) / 100,
      basis_amount: taxableAmount,
      breakdown: {
        state_tax: Math.round(stateTaxAmount * 100) / 100,
        local_tax: Math.round(localTaxAmount * 100) / 100,
      },
    };
  }

  /**
   * Calculate Canadian taxes (GST + PST)
   */
  private calculateCanadianTaxes(
    taxableAmount: number,
    taxRates: any,
    context: TaxCalculationContext,
  ) {
    const gstRate = taxRates.gst_rate || 0;
    const pstRate = taxRates.pst_rate || 0;
    
    const gstAmount = (taxableAmount * gstRate) / 100;
    const pstAmount = (taxableAmount * pstRate) / 100;
    const totalTaxAmount = gstAmount + pstAmount;
    
    return {
      tax_type: 'pst' as const,
      rate_percentage: gstRate + pstRate,
      amount_origin_currency: Math.round(totalTaxAmount * 100) / 100,
      basis_amount: taxableAmount,
      breakdown: {
        state_tax: Math.round(gstAmount * 100) / 100, // GST as state equivalent
        local_tax: Math.round(pstAmount * 100) / 100, // PST as local equivalent
      },
    };
  }

  /**
   * Calculate India taxes with CESS
   */
  private calculateIndiaTaxesWithCess(
    taxableAmount: number,
    taxRates: any,
    context: TaxCalculationContext,
  ) {
    const gstRate = taxRates.gst_rate || 0;
    const cessRate = taxRates.cess_rate || 0;
    
    const gstAmount = (taxableAmount * gstRate) / 100;
    const cessAmount = (taxableAmount * cessRate) / 100;
    const totalTaxAmount = gstAmount + cessAmount;
    
    return {
      tax_type: 'gst' as const,
      rate_percentage: gstRate + cessRate,
      amount_origin_currency: Math.round(totalTaxAmount * 100) / 100,
      basis_amount: taxableAmount,
      breakdown: {
        state_tax: Math.round(gstAmount * 100) / 100,
        additional_taxes: Math.round(cessAmount * 100) / 100,
      },
    };
  }

  /**
   * Calculate standard local tax (single rate)
   */
  private calculateStandardLocalTax(
    taxableAmount: number,
    taxRates: any,
    taxType: string,
    context: TaxCalculationContext,
  ) {
    const taxRate = taxRates[`${taxType}_rate`] || 0;
    const taxAmount = (taxableAmount * taxRate) / 100;

    return {
      tax_type: taxType as 'gst' | 'vat' | 'sales_tax' | 'excise_tax' | 'import_duty' | 'service_tax',
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
   * Get tax rates with admin overrides and preferences applied (2-tier system)
   */
  private async getTaxRatesWithPreferences(
    hsnData: HSNData, 
    context: TaxCalculationContext,
    unifiedTaxData: UnifiedTaxData
  ) {
    // Determine calculation method based on admin preferences
    const calculationMethod = context.calculation_method_preference || 'auto';
    
    console.log(`[TAX CALCULATOR DEBUG] Using calculation method: ${calculationMethod} for HSN: ${hsnData.hsn_code}`);
    
    let baseRates;
    
    switch (calculationMethod) {
      case 'hsn_only':
        // Use only HSN-specific rates
        baseRates = this.getHSNTaxRates(hsnData);
        console.log(`[TAX CALCULATOR DEBUG] HSN rates applied:`, baseRates);
        break;
      case 'legacy_fallback':
        // Use only unified fallback rates
        baseRates = this.getUnifiedFallbackRates(unifiedTaxData);
        console.log(`[TAX CALCULATOR DEBUG] Legacy fallback rates applied:`, baseRates);
        break;
      case 'admin_choice':
        // Admin has manually selected rates - check for overrides
        baseRates = this.getAdminChosenRates(hsnData, unifiedTaxData, context);
        console.log(`[TAX CALCULATOR DEBUG] Admin choice rates applied:`, baseRates);
        break;
      default:
        // 'auto' - intelligent selection between HSN and fallback
        baseRates = await this.getAutoSelectedRates(hsnData, unifiedTaxData);
        console.log(`[TAX CALCULATOR DEBUG] Auto-selected rates applied:`, baseRates);
        break;
    }

    // Apply admin overrides if any
    if (context.admin_overrides && context.admin_overrides.length > 0) {
      return this.applyAdminOverrides(baseRates, context.admin_overrides, hsnData);
    }

    return baseRates;
  }

  /**
   * Get HSN-specific tax rates (Extended for US local taxes and more countries)
   */
  private getHSNTaxRates(hsnData: HSNData) {
    return {
      customs_rate: hsnData.tax_data?.typical_rates?.customs?.common || 0,
      gst_rate: hsnData.tax_data?.typical_rates?.gst?.standard || 0,
      vat_rate: hsnData.tax_data?.typical_rates?.vat?.common || 0,
      sales_tax_rate: 0, // Legacy compatibility
      
      // US Tax Types
      state_tax_rate: hsnData.tax_data?.typical_rates?.sales_tax?.state || 0,
      local_tax_rate: hsnData.tax_data?.typical_rates?.sales_tax?.local || 0,
      
      // Other Country Tax Types
      pst_rate: hsnData.tax_data?.typical_rates?.pst?.provincial || 0,
      excise_tax_rate: hsnData.tax_data?.typical_rates?.excise_tax?.federal || 0,
      import_duty_rate: hsnData.tax_data?.typical_rates?.import_duty?.standard || 0,
      service_tax_rate: hsnData.tax_data?.typical_rates?.service_tax?.standard || 0,
      cess_rate: hsnData.tax_data?.typical_rates?.cess?.additional || 0,
      
      data_source: 'hsn_specific'
    };
  }

  /**
   * Get unified fallback tax rates
   */
  private getUnifiedFallbackRates(unifiedTaxData: UnifiedTaxData) {
    return {
      customs_rate: unifiedTaxData.customs_percent,
      gst_rate: unifiedTaxData.vat_percent, // VAT can serve as GST fallback
      vat_rate: unifiedTaxData.vat_percent,
      sales_tax_rate: unifiedTaxData.vat_percent, // Use VAT as sales tax fallback
      data_source: unifiedTaxData.data_source,
      confidence_score: unifiedTaxData.confidence_score
    };
  }

  /**
   * Get admin-chosen tax rates (manual override mode)
   */
  private getAdminChosenRates(
    hsnData: HSNData, 
    unifiedTaxData: UnifiedTaxData,
    context: TaxCalculationContext
  ) {
    // In admin choice mode, start with HSN rates but allow fallback
    const hsnRates = this.getHSNTaxRates(hsnData);
    const fallbackRates = this.getUnifiedFallbackRates(unifiedTaxData);
    
    // Use HSN rates where available, fallback where not
    return {
      customs_rate: hsnRates.customs_rate || fallbackRates.customs_rate,
      gst_rate: hsnRates.gst_rate || fallbackRates.gst_rate,
      vat_rate: hsnRates.vat_rate || fallbackRates.vat_rate,
      sales_tax_rate: fallbackRates.sales_tax_rate,
      data_source: 'admin_choice',
      admin_id: context.admin_id
    };
  }

  /**
   * Auto-select between HSN and unified fallback rates
   */
  private async getAutoSelectedRates(hsnData: HSNData, unifiedTaxData: UnifiedTaxData) {
    const hsnRates = this.getHSNTaxRates(hsnData);
    const fallbackRates = this.getUnifiedFallbackRates(unifiedTaxData);
    
    // Calculate completeness scores
    const hsnCompleteness = this.calculateRateCompleteness(hsnRates);
    const fallbackCompleteness = this.calculateRateCompleteness(fallbackRates);
    
    // Prefer HSN if it has good completeness, otherwise use fallback
    if (hsnCompleteness >= 0.7 && unifiedTaxData.confidence_score < 0.9) {
      return {
        ...hsnRates,
        data_source: 'hsn_auto_selected',
        selection_reason: `HSN completeness: ${hsnCompleteness.toFixed(2)}`
      };
    } else {
      return {
        ...fallbackRates,
        data_source: 'fallback_auto_selected',
        selection_reason: `Fallback confidence: ${unifiedTaxData.confidence_score.toFixed(2)}`
      };
    }
  }

  /**
   * Calculate completeness score for tax rates (Extended for new tax types)
   */
  private calculateRateCompleteness(rates: any): number {
    let total = 0;
    let available = 0;
    
    // Core rate fields to check for completeness
    const rateFields = [
      'customs_rate', 'gst_rate', 'vat_rate', 'sales_tax_rate',
      'state_tax_rate', 'local_tax_rate', 'pst_rate', 'excise_tax_rate',
      'import_duty_rate', 'service_tax_rate', 'cess_rate'
    ];
    
    for (const field of rateFields) {
      total++;
      if (rates[field] && rates[field] > 0) {
        available++;
      }
    }
    
    return available / total;
  }

  /**
   * Legacy method for backward compatibility (Extended with new tax types)
   */
  private async getTaxRates(hsnData: HSNData, context: TaxCalculationContext) {
    // Get extended base rates from HSN data
    const baseRates = {
      customs_rate: hsnData.tax_data?.typical_rates?.customs?.common || 0,
      gst_rate: hsnData.tax_data?.typical_rates?.gst?.standard || 0,
      vat_rate: hsnData.tax_data?.typical_rates?.vat?.common || 0,
      sales_tax_rate: 0, // Legacy - will be determined by destination country
      
      // Extended tax types
      state_tax_rate: hsnData.tax_data?.typical_rates?.sales_tax?.state || 0,
      local_tax_rate: hsnData.tax_data?.typical_rates?.sales_tax?.local || 0,
      pst_rate: hsnData.tax_data?.typical_rates?.pst?.provincial || 0,
      excise_tax_rate: hsnData.tax_data?.typical_rates?.excise_tax?.federal || 0,
      import_duty_rate: hsnData.tax_data?.typical_rates?.import_duty?.standard || 0,
      service_tax_rate: hsnData.tax_data?.typical_rates?.service_tax?.standard || 0,
      cess_rate: hsnData.tax_data?.typical_rates?.cess?.additional || 0,
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
   * Get local tax type for destination country (Extended for US local taxes and more countries)
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
        // Enhanced country-specific defaults
        return this.getDefaultTaxTypeForCountry(destinationCountry);
      }

      const taxSystem = data.config_data?.tax_system;

      switch (taxSystem) {
        case 'GST':
          return 'gst';
        case 'VAT':
          return 'vat';
        case 'SALES_TAX':
          return 'sales_tax';
        case 'STATE_LOCAL_TAX': // US-specific
          return 'state_tax';
        case 'PST': // Canada
          return 'pst';
        case 'EXCISE_TAX':
          return 'excise_tax';
        case 'IMPORT_DUTY':
          return 'import_duty';
        case 'SERVICE_TAX':
          return 'service_tax';
        case 'CESS': // India additional tax
          return 'cess';
        default:
          return this.getDefaultTaxTypeForCountry(destinationCountry);
      }
    } catch (error) {
      console.error('Tax type lookup error:', error);
      return this.getDefaultTaxTypeForCountry(destinationCountry);
    }
  }

  /**
   * Get default tax type based on country code
   */
  private getDefaultTaxTypeForCountry(countryCode: string): string {
    // Enhanced country-specific tax type mapping
    const countryTaxTypes: Record<string, string> = {
      // India - GST + CESS
      'IN': 'gst',
      
      // USA - State + Local Sales Tax
      'US': 'state_tax',
      
      // Canada - GST + PST
      'CA': 'pst',
      
      // European Union - VAT
      'DE': 'vat', 'FR': 'vat', 'IT': 'vat', 'ES': 'vat', 'NL': 'vat',
      'BE': 'vat', 'AT': 'vat', 'SE': 'vat', 'DK': 'vat', 'FI': 'vat',
      'IE': 'vat', 'PT': 'vat', 'GR': 'vat', 'CZ': 'vat', 'PL': 'vat',
      'HU': 'vat', 'SK': 'vat', 'SI': 'vat', 'EE': 'vat', 'LV': 'vat',
      'LT': 'vat', 'LU': 'vat', 'MT': 'vat', 'CY': 'vat',
      
      // Other VAT countries
      'GB': 'vat', // UK
      'NP': 'vat', // Nepal
      'NO': 'vat', // Norway
      'CH': 'vat', // Switzerland
      
      // Sales Tax countries
      'AU': 'sales_tax', // Australia (GST but similar to sales tax)
      'NZ': 'sales_tax', // New Zealand
      'SG': 'sales_tax', // Singapore
      'MY': 'sales_tax', // Malaysia
      'TH': 'sales_tax', // Thailand
      'VN': 'sales_tax', // Vietnam
      'KR': 'sales_tax', // South Korea
      'JP': 'sales_tax', // Japan
      
      // Service Tax countries
      'AE': 'service_tax', // UAE
      'SA': 'service_tax', // Saudi Arabia
      'QA': 'service_tax', // Qatar
      'KW': 'service_tax', // Kuwait
      
      // Default fallback
      'default': 'sales_tax'
    };

    return countryTaxTypes[countryCode] || countryTaxTypes['default'];
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
