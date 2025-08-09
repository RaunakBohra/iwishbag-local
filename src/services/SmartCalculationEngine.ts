

import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { getDestinationCurrency } from '@/utils/originCurrency';

import { shippingService } from '@/services/ShippingService';
import { currencyService } from '@/services/CurrencyService';
import { routeTierTaxService } from '@/services/RouteTierTaxService';
import { weightDetectionService } from '@/services/WeightDetectionService';
import { vatService } from '@/services/VATService';
import { volumetricWeightService } from '@/services/VolumetricWeightService';
import { DiscountService } from '@/services/DiscountService';
import { MembershipService } from '@/services/MembershipService';

import type { UnifiedQuote } from '@/types/unified-quote';
import type { ShippingOption, ShippingRecommendation, SmartSuggestion } from '@/types/shipping';

interface SimplifiedCalculationInput {
  quote: UnifiedQuote;
  tax_calculation_preferences?: {
    calculation_method_preference?: 'manual' | 'route_based';
    valuation_method_preference?: 'auto' | 'product_value' | 'minimum_valuation' | 'higher_of_both';
    force_per_item_calculation?: boolean;
  };
}

interface SimplifiedCalculationResult {
  updated_quote: UnifiedQuote;
  shipping_options: ShippingOption[];
  smart_recommendations: ShippingRecommendation[];
  optimization_suggestions: SmartSuggestion[];
}

interface SimplifiedTaxBreakdown {
  item_id: string;
  category: string;
  item_name: string;
  customs_rate: number;
  customs: number;
  sales_tax_rate: number;
  sales_tax: number;
  vat_rate: number;
  vat: number;
  total_tax: number;
  taxable_amount_origin_currency: number;
  tax_method: string;
}

class SimplifiedSmartCalculationEngine {
  
  async calculateEnhanced(input: SimplifiedCalculationInput): Promise<SimplifiedCalculationResult> {
    try {
      console.log('[SIMPLIFIED ENGINE] Starting calculation without HSN dependencies');

      const { quote } = input;

      // Basic validation
      if (!quote || !quote.items || quote.items.length === 0) {
        throw new Error('Quote must have at least one item');
      }

      // Calculate basic totals
      const itemsTotal = quote.items.reduce((sum, item) => {
        return sum + (item.costprice_origin || 0) * (item.quantity || 1);
      }, 0);

      let totalWeight = quote.items.reduce((sum, item) => {
        return sum + (item.weight || 0) * (item.quantity || 1);
      }, 0);

      // Auto-detect weights if missing
      if (totalWeight === 0) {
        for (const item of quote.items) {
          if (!item.weight && item.name) {
            try {
              const weightResult = await weightDetectionService.detectWeight({
                productName: item.name,
                productUrl: item.url,
                category: item.category,
              });
              if (weightResult.detectedWeight > 0) {
                item.weight = weightResult.detectedWeight;
                totalWeight += weightResult.detectedWeight * (item.quantity || 1);
              }
            } catch (error) {
              console.warn('[WEIGHT DETECTION] Failed for item:', item.name, error);
            }
          }
        }
      }

      // Get shipping options
      const shippingOptions = await shippingService.getShippingOptions({
        origin_country: quote.origin_country,
        destination_country: quote.destination_country,
        total_weight: totalWeight,
        items_value: itemsTotal,
        is_express: false,
      });

      if (!shippingOptions || shippingOptions.length === 0) {
        throw new Error('No shipping options available for this route');
      }

      // Select optimal shipping option
      const selectedOption = shippingOptions.find(option => option.recommended) || shippingOptions[0];

      // Calculate complete costs with simplified tax calculation
      const calculationResult = await this.calculateSimplifiedCosts({
        quote: input.quote,
        selectedShipping: selectedOption,
        itemsTotal,
        totalWeight,
        taxCalculationPreferences: input.tax_calculation_preferences,
      });

      // Generate recommendations (simplified)
      const smartRecommendations: ShippingRecommendation[] = [];
      const optimizationSuggestions: SmartSuggestion[] = [];

      return {
        updated_quote: calculationResult.updated_quote,
        shipping_options: shippingOptions,
        smart_recommendations: smartRecommendations,
        optimization_suggestions: optimizationSuggestions,
      };

    } catch (error) {
      console.error('[SIMPLIFIED ENGINE] Calculation failed:', error);
      throw error;
    }
  }

  
  private async calculateSimplifiedCosts(params: {
    quote: UnifiedQuote;
    selectedShipping: ShippingOption;
    itemsTotal: number;
    totalWeight: number;
    taxCalculationPreferences?: any;
  }): Promise<{ updated_quote: UnifiedQuote }> {
    const { quote, selectedShipping, itemsTotal, taxCalculationPreferences } = params;

    // Get exchange rate
    const exchangeRate = await currencyService.getExchangeRateByCurrency(
      'USD', 
      quote.customer_currency || getDestinationCurrency(quote.destination_country)
    );

    // Convert amounts to customer currency
    const itemsTotalCustomerCurrency = itemsTotal * exchangeRate;
    const shippingCostCustomerCurrency = selectedShipping.cost_usd * exchangeRate;

    // Calculate taxes using simplified methods
    let customsPercentage = quote.operational_data?.customs?.percentage || 0;
    let localTaxesAmount = 0;
    let vatAmount = 0;

    // Use route-based calculation if available
    const calculationMethod = quote.calculation_method_preference || 'manual';
    
    if (calculationMethod === 'route_based') {
      try {
        const routeRates = await routeTierTaxService.getTaxRates(
          quote.origin_country,
          quote.destination_country
        );
        
        if (routeRates) {
          customsPercentage = routeRates.customs || customsPercentage;
          localTaxesAmount = (itemsTotal * (routeRates.sales_tax || 0)) / 100;
          vatAmount = (itemsTotal * (routeRates.vat || 0)) / 100;
        }
      } catch (error) {
        console.warn('[ROUTE TAX] Failed to get route rates:', error);
      }
    }

    // Calculate insurance
    let insuranceAmount = 0;
    try {
      insuranceAmount = await this.calculateRouteBasedInsurance(selectedShipping, itemsTotal, quote);
    } catch (error) {
      console.warn('[INSURANCE] Calculation failed:', error);
    }

    // Calculate customs using CIF value (Cost, Insurance, Freight)
    const cifValue = itemsTotal + selectedShipping.cost_usd + insuranceAmount;
    const customsAmount = customsPercentage > 0 ? cifValue * (customsPercentage / 100) : 0;

    // Calculate totals
    const subtotalUSD = itemsTotal + selectedShipping.cost_usd + insuranceAmount;
    const taxesUSD = customsAmount + localTaxesAmount + vatAmount;
    const totalUSD = subtotalUSD + taxesUSD;

    // Convert to customer currency
    const subtotalCustomerCurrency = subtotalUSD * exchangeRate;
    const taxesCustomerCurrency = taxesUSD * exchangeRate;
    const totalCustomerCurrency = totalUSD * exchangeRate;

    // Create simplified tax breakdown
    const taxBreakdown: SimplifiedTaxBreakdown[] = quote.items.map(item => ({
      item_id: item.id,
      category: item.category || 'general',
      item_name: item.name,
      customs_rate: customsPercentage,
      customs: (((item.costprice_origin || 0) * (item.quantity || 1)) / itemsTotal) * customsAmount,
      sales_tax_rate: localTaxesAmount > 0 ? (localTaxesAmount / itemsTotal) * 100 : 0,
      sales_tax: (((item.costprice_origin || 0) * (item.quantity || 1)) / itemsTotal) * localTaxesAmount,
      vat_rate: vatAmount > 0 ? (vatAmount / itemsTotal) * 100 : 0,
      vat: (((item.costprice_origin || 0) * (item.quantity || 1)) / itemsTotal) * vatAmount,
      total_tax: (((item.costprice_origin || 0) * (item.quantity || 1)) / itemsTotal) * taxesUSD,
      taxable_amount_origin_currency: (item.costprice_origin || 0) * (item.quantity || 1),
      tax_method: calculationMethod,
    }));

    // Update quote with calculated values
    const updatedQuote: UnifiedQuote = {
      ...quote,
      calculation_data: {
        ...quote.calculation_data,
        items_total_origin_currency: itemsTotal,
        items_total_quote_origincurrency: itemsTotalCustomerCurrency,
        shipping_cost_usd: selectedShipping.cost_usd,
        shipping_cost_customer_currency: shippingCostCustomerCurrency,
        insurance_usd: insuranceAmount,
        insurance_customer_currency: insuranceAmount * exchangeRate,
        customs_percentage: customsPercentage,
        customs_usd: customsAmount,
        customs_customer_currency: customsAmount * exchangeRate,
        local_taxes_usd: localTaxesAmount,
        local_taxes_customer_currency: localTaxesAmount * exchangeRate,
        vat_usd: vatAmount,
        vat_customer_currency: vatAmount * exchangeRate,
        subtotal_quote_origincurrency: subtotalUSD,
        subtotal_quote_origincurrency: subtotalCustomerCurrency,
        total_taxes_usd: taxesUSD,
        total_taxes_customer_currency: taxesCustomerCurrency,
        total_quote_origincurrency: totalUSD,
        total_quote_origincurrency: totalCustomerCurrency,
        exchange_rate: exchangeRate,
        calculation_method: calculationMethod,
        item_breakdowns: taxBreakdown,
        last_updated: new Date().toISOString(),
      },
      operational_data: {
        ...quote.operational_data,
        selected_shipping: selectedShipping,
        total_weight: params.totalWeight,
      },
    };

    return { updated_quote: updatedQuote };
  }

  /**
   * Calculate route-based insurance
   */
  private async calculateRouteBasedInsurance(
    selectedShipping: ShippingOption,
    itemsTotal: number,
    quote: UnifiedQuote
  ): Promise<number> {
    try {
      // Basic insurance calculation - 1% of items value, minimum $5
      const baseInsurance = Math.max(itemsTotal * 0.01, 5);
      
      // Adjust based on shipping method risk
      let riskMultiplier = 1.0;
      if (selectedShipping.carrier?.toLowerCase().includes('express')) {
        riskMultiplier = 0.8; // Lower risk for express
      } else if (selectedShipping.carrier?.toLowerCase().includes('economy')) {
        riskMultiplier = 1.2; // Higher risk for economy
      }

      return baseInsurance * riskMultiplier;
    } catch (error) {
      console.warn('[INSURANCE] Calculation failed:', error);
      return Math.max(itemsTotal * 0.01, 5); // Fallback to basic calculation
    }
  }

  /**
   * Synchronous calculation for immediate UI updates
   */
  calculateSync(quote: UnifiedQuote): any {
    try {
      const itemsTotal = quote.items.reduce((sum, item) => {
        return sum + (item.costprice_origin || 0) * (item.quantity || 1);
      }, 0);

      const calculationMethod = quote.calculation_method_preference || 'manual';
      let customsPercentage = quote.operational_data?.customs?.percentage || 0;

      if (calculationMethod === 'route_based') {
        // Use route tier percentage if available
        customsPercentage = quote.operational_data?.customs?.smart_tier?.percentage ?? customsPercentage;
      }

      // Basic shipping estimate (simplified)
      const estimatedShipping = Math.max(itemsTotal * 0.1, 25); // 10% of value, minimum $25
      const estimatedInsurance = Math.max(itemsTotal * 0.01, 5); // 1% of value, minimum $5

      // Calculate customs using CIF
      const cifValue = itemsTotal + estimatedShipping + estimatedInsurance;
      const customsAmount = cifValue * (customsPercentage / 100);

      // Basic tax estimates
      const localTaxesAmount = 0; // Only for specific routes
      const vatAmount = 0; // Country-specific

      const subtotalUSD = itemsTotal + estimatedShipping + estimatedInsurance;
      const taxesUSD = customsAmount + localTaxesAmount + vatAmount;
      const totalUSD = subtotalUSD + taxesUSD;

      return {
        items_total: itemsTotal,
        shipping_estimated: estimatedShipping,
        insurance_estimated: estimatedInsurance,
        customs_percentage: customsPercentage,
        customs_amount: customsAmount,
        local_taxes: localTaxesAmount,
        vat_amount: vatAmount,
        subtotal: subtotalUSD,
        total_taxes: taxesUSD,
        total: totalUSD,
        calculation_method: calculationMethod,
      };
    } catch (error) {
      console.error('[SIMPLIFIED SYNC] Calculation failed:', error);
      throw error;
    }
  }
}

// Export singleton instance with original name for compatibility
export const smartCalculationEngine = new SimplifiedSmartCalculationEngine();