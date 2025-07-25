// ============================================================================
// CALCULATION DEFAULTS SERVICE - Route-Based Default Value Calculator
// Calculates handling charges and insurance based on shipping route configurations
// Provides smart defaults that can be overridden manually by admins
// ============================================================================

import type { UnifiedQuote, ShippingOption } from '@/types/unified-quote';
import { currencyService } from '@/services/CurrencyService';

interface HandlingChargeConfig {
  base_fee: number;
  percentage_of_value: number;
  min_fee: number;
  max_fee: number;
}

interface InsuranceConfig {
  coverage_percentage: number;
  max_coverage: number;
  min_fee?: number;
  available: boolean;
  default_enabled: boolean;
}

export class CalculationDefaultsService {
  private static instance: CalculationDefaultsService;

  static getInstance(): CalculationDefaultsService {
    if (!CalculationDefaultsService.instance) {
      CalculationDefaultsService.instance = new CalculationDefaultsService();
    }
    return CalculationDefaultsService.instance;
  }

  /**
   * Calculate default handling charge based on shipping option configuration
   */
  calculateHandlingDefault(
    quote: UnifiedQuote,
    selectedOption: ShippingOption | null = null,
  ): number {
    console.log('[CalculationDefaults] calculateHandlingDefault called:', {
      quoteId: quote.id,
      selectedOptionId: selectedOption?.id,
      hasHandlingConfig: !!selectedOption?.handling_charge,
    });

    if (!selectedOption?.handling_charge) {
      console.log(
        '[CalculationDefaults] No handling_charge config found for option:',
        selectedOption?.id,
      );
      return 0;
    }

    const config: HandlingChargeConfig = selectedOption.handling_charge;
    // Use base_total_usd as primary source, fallback to calculated value from items
    const itemsValue =
      quote.base_total_usd ||
      quote.items.reduce((sum, item) => sum + item.price_usd * item.quantity, 0);

    console.log('[CalculationDefaults] Items value extracted:', {
      quoteId: quote.id,
      base_total_usd: quote.base_total_usd,
      itemsValue,
      itemsCount: quote.items?.length,
      originCountry: quote.origin_country,
      currency: quote.currency,
    });

    // Calculate: base fee + percentage of value
    const percentageAmount = (itemsValue * config.percentage_of_value) / 100;
    const calculatedAmount = config.base_fee + percentageAmount;

    // Apply min/max constraints
    const constrainedAmount = Math.max(config.min_fee, Math.min(calculatedAmount, config.max_fee));

    console.log('[CalculationDefaults] Handling calculation DETAILED:', {
      quoteId: quote.id,
      step1_itemsValue: itemsValue,
      step2_baseFee: config.base_fee,
      step3_percentage: config.percentage_of_value,
      step4_percentageCalc: `${itemsValue} * ${config.percentage_of_value} / 100 = ${percentageAmount}`,
      step5_beforeConstraints: `${config.base_fee} + ${percentageAmount} = ${calculatedAmount}`,
      step6_minConstraint: config.min_fee,
      step7_maxConstraint: config.max_fee,
      step8_finalResult: constrainedAmount,
      expectedFormulaCheck: `Base $${config.base_fee} + ${config.percentage_of_value}% of $${itemsValue} = $${calculatedAmount.toFixed(2)}`,
    });

    return Math.round(constrainedAmount * 100) / 100;
  }

  /**
   * Calculate default insurance amount based on shipping option and customer preference
   */
  calculateInsuranceDefault(
    quote: UnifiedQuote,
    selectedOption: ShippingOption | null = null,
    customerOptedIn: boolean = false,
  ): number {
    console.log('[CalculationDefaults] calculateInsuranceDefault called:', {
      quoteId: quote.id,
      selectedOptionId: selectedOption?.id,
      hasInsuranceConfig: !!selectedOption?.insurance_options,
      customerOptedIn,
    });

    if (!selectedOption?.insurance_options?.available) {
      console.log('[CalculationDefaults] Insurance not available for option:', selectedOption?.id);
      return 0;
    }

    const config: InsuranceConfig = selectedOption.insurance_options;
    // Use base_total_usd as primary source, fallback to calculated value from items
    const itemsValue =
      quote.base_total_usd ||
      quote.items.reduce((sum, item) => sum + item.price_usd * item.quantity, 0);

    // Check if customer opted in or if it's default enabled
    const shouldCalculate = customerOptedIn || config.default_enabled;

    if (!shouldCalculate) {
      console.log('[CalculationDefaults] Insurance not enabled - customer opt-in required');
      return 0;
    }

    // Calculate: percentage of value with max coverage limit
    const percentageAmount = (itemsValue * config.coverage_percentage) / 100;
    const constrainedAmount = Math.min(percentageAmount, config.max_coverage);

    // Apply minimum fee if configured
    const finalAmount = config.min_fee
      ? Math.max(constrainedAmount, config.min_fee)
      : constrainedAmount;

    console.log('[CalculationDefaults] Insurance calculation:', {
      quoteId: quote.id,
      itemsValue,
      coveragePercentage: config.coverage_percentage,
      percentageAmount,
      maxCoverage: config.max_coverage,
      constrainedAmount,
      finalAmount,
      customerOptedIn,
      defaultEnabled: config.default_enabled,
    });

    return Math.round(finalAmount * 100) / 100;
  }

  /**
   * Get human-readable explanation of how the default was calculated
   */
  getDefaultExplanation(
    type: 'handling' | 'insurance',
    amount: number,
    selectedOption: ShippingOption | null = null,
    itemsValue: number = 0,
    originCountry: string = 'US',
  ): string {
    // Get currency symbol for origin country (amounts are calculated in origin currency)
    const countryCurrency = currencyService.getCurrencyForCountrySync(originCountry);
    const currencySymbol = currencyService.getCurrencySymbol(countryCurrency);

    if (!selectedOption) return `Default ${type}: ${currencySymbol}${amount.toFixed(2)}`;

    if (type === 'handling' && selectedOption.handling_charge) {
      const config = selectedOption.handling_charge;
      return `Base ${currencySymbol}${config.base_fee} + ${config.percentage_of_value}% of ${currencySymbol}${itemsValue.toFixed(2)} = ${currencySymbol}${amount.toFixed(2)} (min: ${currencySymbol}${config.min_fee}, max: ${currencySymbol}${config.max_fee})`;
    }

    if (type === 'insurance' && selectedOption.insurance_options) {
      const config = selectedOption.insurance_options;
      if (amount === 0) {
        return config.available ? 'Optional - customer can opt-in' : 'Not available';
      }
      return `${config.coverage_percentage}% of ${currencySymbol}${itemsValue.toFixed(2)} = ${currencySymbol}${amount.toFixed(2)} (max coverage: ${currencySymbol}${config.max_coverage})`;
    }

    return `Default ${type}: ${currencySymbol}${amount.toFixed(2)}`;
  }

  /**
   * Check if current manual values differ significantly from calculated defaults
   */
  suggestDefaultReset(
    quote: UnifiedQuote,
    selectedOption: ShippingOption | null = null,
  ): {
    shouldSuggestHandlingReset: boolean;
    shouldSuggestInsuranceReset: boolean;
    handlingDifference: number;
    insuranceDifference: number;
  } {
    const currentHandling = quote.operational_data?.handling_charge || 0;
    const currentInsurance = quote.operational_data?.insurance_amount || 0;

    const defaultHandling = this.calculateHandlingDefault(quote, selectedOption);
    const customerOptedIn = quote.customer_data?.preferences?.insurance_opted_in || false;
    const defaultInsurance = this.calculateInsuranceDefault(quote, selectedOption, customerOptedIn);

    const handlingDifference = Math.abs(currentHandling - defaultHandling);
    const insuranceDifference = Math.abs(currentInsurance - defaultInsurance);

    // Suggest reset if difference is more than 20% or $5, whichever is greater
    const handlingThreshold = Math.max(defaultHandling * 0.2, 5);
    const insuranceThreshold = Math.max(defaultInsurance * 0.2, 3);

    return {
      shouldSuggestHandlingReset: handlingDifference > handlingThreshold,
      shouldSuggestInsuranceReset: insuranceDifference > insuranceThreshold,
      handlingDifference,
      insuranceDifference,
    };
  }

  /**
   * Get route-based calculation data for admin interface
   */
  getCalculationData(
    quote: UnifiedQuote,
    selectedOption: ShippingOption | null = null,
  ): {
    handlingDefault: number;
    insuranceDefault: number;
    handlingExplanation: string;
    insuranceExplanation: string;
    isManualOverride: boolean;
  } {
    const customerOptedIn = quote.customer_data?.preferences?.insurance_opted_in || false;
    const handlingDefault = this.calculateHandlingDefault(quote, selectedOption);
    const insuranceDefault = this.calculateInsuranceDefault(quote, selectedOption, customerOptedIn);
    const itemsValue =
      quote.base_total_usd ||
      quote.items.reduce((sum, item) => sum + item.price_usd * item.quantity, 0);

    const currentHandling = quote.operational_data?.handling_charge || 0;
    const currentInsurance = quote.operational_data?.insurance_amount || 0;

    return {
      handlingDefault,
      insuranceDefault,
      handlingExplanation: this.getDefaultExplanation(
        'handling',
        handlingDefault,
        selectedOption,
        itemsValue,
        quote.origin_country,
      ),
      insuranceExplanation: this.getDefaultExplanation(
        'insurance',
        insuranceDefault,
        selectedOption,
        itemsValue,
        quote.origin_country,
      ),
      isManualOverride:
        currentHandling !== handlingDefault || currentInsurance !== insuranceDefault,
    };
  }
}

// Export singleton instance
export const calculationDefaultsService = CalculationDefaultsService.getInstance();
