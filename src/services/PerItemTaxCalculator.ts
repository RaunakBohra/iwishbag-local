
  async calculateItemTax(
    item: QuoteItem,
    context: TaxCalculationContext,
    quoteTotals?: {
      totalItemsValue: number;
      totalShippingCost: number;
      totalInsuranceAmount: number;
      totalHandlingFee: number;
    },
  ): Promise<ItemTaxBreakdown | null> {
    try {
      
      if (!item.hsn_code || item.hsn_code.trim() === '') {
        console.log(
          `⚠️ [HSN] Creating placeholder breakdown for item ${item.name} - no );
        return this.createPlaceholderBreakdown(item, context);
      }

      
      const hsnData = await this.getHSNData(item.hsn_code);
      if (!hsnData) {
        console.warn(
          `⚠️ [HSN] HSN code not found in database: ${item.hsn_code} for item: ${item.name}`,
        );
        return null; 
      }

      // Get unified tax data with fallback mechanisms
      const unifiedTaxData = await this.unifiedTaxService.getUnifiedTaxData(
        context.route.origin_country,
        context.route.destination_country,
      );

      // Get tax rates with admin overrides and preferences
      const taxRates = await this.getTaxRatesWithPreferences(hsnData, context, unifiedTaxData);

      // Use default quoteTotals if not provided (for backward compatibility)
      const totals = quoteTotals || this.getQuoteTotals([item], context);

      // FIXED: Step 1 - First determine valuation method and get the correct base amount
      const valuationOptions = await this.calculateBothValuationOptions(
        item,
        hsnData,
        context.route.origin_country,
        taxRates,
        context.valuation_method_preference,
      );

      // Step 2: Use the selected valuation amount for CIF calculation
      const baseAmount = valuationOptions.selected_method === 'minimum_valuation' 
        ? valuationOptions.auto_selected_amount 
        : item.price_origin_currency;

      console.log(`[TAX CALC] Using ${valuationOptions.selected_method} for CIF calculation: ${baseAmount} ${valuationOptions.minimum_valuation_conversion?.originCurrency || 'USD'}`);
      
      // Log valuation decision for transparency
      if (valuationOptions.selected_method === 'minimum_valuation') {
        console.log(`[TAX CALC] ✅ Minimum valuation selected: ${baseAmount} (converted from $${valuationOptions.minimum_valuation_conversion?.usdAmount} USD)`);
        console.log(`[TAX CALC] → Product price: ${item.price_origin_currency} | Minimum: ${baseAmount} | Using: ${baseAmount}`);
      } else {
        console.log(`[TAX CALC] → Product price: ${item.price_origin_currency} | Minimum: ${valuationOptions.auto_selected_amount} | Using: ${item.price_origin_currency}`);
      }

      // Step 3: Calculate CIF value using the correct base amount
      const cifValue = this.calculateCIFValue(
        item,
        context,
        totals.totalItemsValue,
        totals.totalShippingCost,
        totals.totalInsuranceAmount,
        totals.totalHandlingFee,
        baseAmount, // Pass the selected valuation amount
      );

      // Step 4: Calculate customs duty on CIF basis (now using correct valuation)
      const customsCalculation = this.calculateCustoms(cifValue, taxRates.customs_rate, context);

      // Step 5: Calculate landed cost (CIF + Customs + Handling)
      const landedCost = this.calculateLandedCost(
        cifValue,
        customsCalculation.amount_origin_currency,
        totals.totalHandlingFee,
        totals.totalItemsValue,
        baseAmount, // Use selected amount instead of item price
      );

      // Step 6: Calculate local taxes on landed cost basis
      const localTaxCalculation = await this.calculateLocalTaxes(landedCost, taxRates, context);

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
        taxable_amount_origin_currency: baseAmount, // Use the selected valuation amount
        valuation_method: valuationOptions.valuation_method,

        // Enhanced: Both calculation options for admin choice
        calculation_options,

        // Tax calculations (based on CIF/landed cost with correct valuation)
        customs_calculation: {
          ...customsCalculation,
          basis_amount: cifValue, // CIF basis for customs (now includes correct valuation)
        },
        local_tax_calculation: {
          ...localTaxCalculation,
          basis_amount: landedCost, // Landed cost basis for local tax
        },

        // Totals (now calculated with correct valuation method)
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
            taxable_amount_origin_currency: landedCost,
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

  
  
  private calculateCIFValue(
    item: QuoteItem,
    context: TaxCalculationContext,
    totalItemsValue: number,
    totalShippingCost: number,
    totalInsuranceAmount: number,
    totalHandlingFee: number,
    baseAmount?: number, // NEW: Optional base amount to use instead of item price
  ): number {
    // Use the provided base amount or fall back to item price
    const itemPrice = baseAmount !== undefined 
      ? baseAmount 
      : (typeof item.price_origin_currency === 'number' && !isNaN(item.price_origin_currency) 
        ? item.price_origin_currency 
        : 0);
    
    if (baseAmount !== undefined) {
      console.log(`[CIF CALCULATION] Using valuation base amount: ${baseAmount} for item "${item.name}"`);
    } else if (itemPrice !== item.price_origin_currency) {
      console.warn(`[CIF CALCULATION] Invalid price for item "${item.name}": ${item.price_origin_currency}, using 0 instead`);
    }
    
    // Protect against division by zero or invalid totalItemsValue
    const safeTotal = totalItemsValue > 0 ? totalItemsValue : 1;
    const itemProportion = itemPrice / safeTotal;
    
    if (totalItemsValue <= 0) {
      console.warn(`[CIF CALCULATION] Invalid totalItemsValue: ${totalItemsValue}, using proportion 1 for item "${item.name}"`);
    }
    
    // Allocate shipping, insurance, and handling proportionally to item value
    const allocatedShipping = totalShippingCost * itemProportion;
    const allocatedInsurance = totalInsuranceAmount * itemProportion;
    const allocatedHandling = totalHandlingFee * itemProportion;

    // CIF = Cost + Insurance + Freight (including handling as part of freight)
    const cifValue = itemPrice + allocatedShipping + allocatedInsurance + allocatedHandling;

    console.log(`[CIF DEBUG] Item: ${item.name}, Base: ${itemPrice}, Proportion: ${itemProportion.toFixed(4)}, CIF: ${cifValue.toFixed(2)}`);

    return cifValue;
  }

  
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
        console.error('error);
        return null;
      }

      return data as HSNData;
    } catch (error) {
      console.error('error);
      return null;
    }
  }

  
  private getUnifiedFallbackRates(unifiedTaxData: UnifiedTaxData) {
    return {
      customs_rate: unifiedTaxData.customs_percent,
      gst_rate: unifiedTaxData.vat_percent, // VAT can serve as GST fallback
      vat_rate: unifiedTaxData.vat_percent,
      sales_tax_rate: unifiedTaxData.vat_percent, // Use VAT as sales tax fallback
      data_source: unifiedTaxData.data_source,
      confidence_score: unifiedTaxData.confidence_score,
    };
  }

  
  private calculateRateCompleteness(rates: any): number {
    let total = 0;
    let available = 0;

    // Core rate fields to check for completeness
    const rateFields = [
      'customs_rate',
      'gst_rate',
      'vat_rate',
      'sales_tax_rate',
      'state_tax_rate',
      'local_tax_rate',
      'pst_rate',
      'excise_tax_rate',
      'import_duty_rate',
      'service_tax_rate',
      'cess_rate',
    ];

    for (const field of rateFields) {
      total++;
      if (rates[field] && rates[field] > 0) {
        available++;
      }
    }

    return available / total;
  }

  
  private overrideApplies(override: any, hsnData: scope_identifier } = override;

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
