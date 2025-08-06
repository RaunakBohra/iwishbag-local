/**
 * Quote Insurance Service
 * Handles insurance toggle, fee calculation, and integration with quote recalculation
 * Provides comprehensive insurance management for quotes
 */

import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

export interface InsuranceDetails {
  enabled: boolean;
  coverage_amount: number;
  fee_amount: number;
  percentage_rate: number;
  min_fee: number;
  max_fee?: number;
  currency: string;
}

export interface InsuranceEstimate {
  available: boolean;
  fee_estimate: number;
  coverage_amount: number;
  percentage_rate: number;
  min_fee: number;
  max_fee?: number;
  currency: string;
  benefits: {
    lost_or_stolen: boolean;
    damage_in_transit: boolean;
    customs_confiscation: boolean;
    carrier_errors: boolean;
    full_refund_or_replacement: boolean;
  };
}

export interface InsuranceUpdateResult {
  success: boolean;
  message: string;
  recalculated_quote?: any;
  insurance_fee?: number;
  new_total?: number;
  insurance_details?: InsuranceDetails;
  error?: string;
}

export class QuoteInsuranceService {
  private static instance: QuoteInsuranceService;

  static getInstance(): QuoteInsuranceService {
    if (!QuoteInsuranceService.instance) {
      QuoteInsuranceService.instance = new QuoteInsuranceService();
    }
    return QuoteInsuranceService.instance;
  }

  /**
   * Update insurance status for a quote with proper recalculation
   */
  async updateQuoteInsurance(
    quoteId: string,
    insuranceEnabled: boolean,
    customerId?: string
  ): Promise<InsuranceUpdateResult> {
    try {
      logger.info('🛡️ Updating insurance for quote:', {
        quoteId,
        insuranceEnabled,
        customerId
      });

      const { data, error } = await supabase.rpc('update_quote_insurance', {
        p_quote_id: quoteId,
        p_insurance_enabled: insuranceEnabled,
        p_customer_id: customerId || null
      });

      if (error) {
        logger.error('❌ Failed to update insurance:', error);
        return {
          success: false,
          message: 'Failed to update insurance',
          error: error.message
        };
      }

      if (!data || data.length === 0) {
        return {
          success: false,
          message: 'No insurance update result returned',
          error: 'Empty response from server'
        };
      }

      const result = data[0];
      
      if (!result.success) {
        return {
          success: false,
          message: result.message || 'Insurance update failed',
          error: result.message
        };
      }

      logger.info('✅ Insurance updated successfully:', {
        insuranceFee: result.insurance_fee,
        newTotal: result.new_total,
        enabled: insuranceEnabled
      });

      return {
        success: true,
        message: result.message,
        recalculated_quote: result.recalculated_quote,
        insurance_fee: result.insurance_fee || 0,
        new_total: result.new_total || 0,
        insurance_details: result.insurance_details
      };

    } catch (error) {
      logger.error('❌ Error updating insurance:', error);
      return {
        success: false,
        message: 'Failed to update insurance',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get insurance estimate for a quote
   */
  async getInsuranceEstimate(
    quoteId: string,
    coverageAmount?: number
  ): Promise<InsuranceEstimate | null> {
    try {
      logger.info('💰 Getting insurance estimate for quote:', {
        quoteId,
        coverageAmount
      });

      const { data, error } = await supabase.rpc('get_insurance_estimate', {
        p_quote_id: quoteId,
        p_coverage_amount: coverageAmount || null
      });

      if (error) {
        logger.error('❌ Failed to get insurance estimate:', error);
        return null;
      }

      if (!data || data.length === 0) {
        logger.warn('⚠️ No insurance estimate data returned');
        return null;
      }

      const estimate = data[0];
      
      logger.info('✅ Insurance estimate retrieved:', {
        available: estimate.available,
        feeEstimate: estimate.fee_estimate,
        coverageAmount: estimate.coverage_amount
      });

      return {
        available: estimate.available,
        fee_estimate: estimate.fee_estimate,
        coverage_amount: estimate.coverage_amount,
        percentage_rate: estimate.percentage_rate,
        min_fee: estimate.min_fee,
        max_fee: estimate.max_fee,
        currency: estimate.currency,
        benefits: estimate.benefits || {
          lost_or_stolen: true,
          damage_in_transit: true,
          customs_confiscation: true,
          carrier_errors: true,
          full_refund_or_replacement: true
        }
      };

    } catch (error) {
      logger.error('❌ Error getting insurance estimate:', error);
      return null;
    }
  }

  /**
   * Check if insurance is available for a quote
   */
  async isInsuranceAvailable(quoteId: string): Promise<boolean> {
    try {
      const estimate = await this.getInsuranceEstimate(quoteId);
      return estimate?.available === true;
    } catch (error) {
      logger.error('❌ Error checking insurance availability:', error);
      return false;
    }
  }

  /**
   * Get current insurance status from quote
   */
  async getCurrentInsuranceStatus(quoteId: string): Promise<{
    enabled: boolean;
    fee: number;
    details?: InsuranceDetails;
  } | null> {
    try {
      const { data, error } = await supabase
        .from('quotes_v2')
        .select('insurance_required, calculation_data')
        .eq('id', quoteId)
        .single();

      if (error || !data) {
        logger.error('❌ Failed to get current insurance status:', error);
        return null;
      }

      const insuranceEnabled = data.insurance_required || false;
      const calculationData = data.calculation_data || {};
      const insuranceFee = calculationData.calculation_steps?.insurance_amount || 0;
      const insuranceDetails = calculationData.route_calculations?.insurance;

      return {
        enabled: insuranceEnabled,
        fee: insuranceFee,
        details: insuranceDetails ? {
          enabled: insuranceEnabled,
          coverage_amount: insuranceDetails.coverage_amount || 0,
          fee_amount: insuranceFee,
          percentage_rate: insuranceDetails.percentage || 1.5,
          min_fee: insuranceDetails.min_fee || 2,
          max_fee: insuranceDetails.max_fee,
          currency: insuranceDetails.currency || 'USD'
        } : undefined
      };

    } catch (error) {
      logger.error('❌ Error getting current insurance status:', error);
      return null;
    }
  }

  /**
   * Calculate insurance fee for a given amount
   */
  calculateInsuranceFee(
    coverageAmount: number,
    percentageRate: number = 1.5,
    minFee: number = 2,
    maxFee?: number
  ): number {
    let fee = Math.max(
      (coverageAmount * percentageRate) / 100,
      minFee
    );

    if (maxFee) {
      fee = Math.min(fee, maxFee);
    }

    return Math.round(fee * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Format insurance benefits for display
   */
  formatInsuranceBenefits(benefits: any): string[] {
    const benefitsList: string[] = [];
    
    if (benefits?.lost_or_stolen) benefitsList.push('Lost or stolen packages');
    if (benefits?.damage_in_transit) benefitsList.push('Damage during transit');
    if (benefits?.customs_confiscation) benefitsList.push('Customs confiscation');
    if (benefits?.carrier_errors) benefitsList.push('Shipping carrier errors');
    if (benefits?.full_refund_or_replacement) benefitsList.push('Full refund or replacement');

    return benefitsList;
  }

  /**
   * Get insurance analytics for admin
   */
  async getInsuranceAnalytics(dateRange?: { start: Date; end: Date }) {
    try {
      const startDate = dateRange?.start || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const endDate = dateRange?.end || new Date();

      // Get insurance usage statistics
      const { data: stats, error } = await supabase
        .from('quotes_v2')
        .select(`
          insurance_required,
          total_usd,
          calculation_data,
          created_at
        `)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      if (error) {
        logger.error('❌ Failed to get insurance analytics:', error);
        return {
          success: false,
          error: error.message
        };
      }

      const totalQuotes = stats?.length || 0;
      const quotesWithInsurance = stats?.filter(q => q.insurance_required)?.length || 0;
      const insuranceAdoptionRate = totalQuotes > 0 ? (quotesWithInsurance / totalQuotes) * 100 : 0;
      
      const totalInsuranceFees = stats
        ?.filter(q => q.insurance_required)
        ?.reduce((sum, q) => sum + (q.calculation_data?.calculation_steps?.insurance_amount || 0), 0) || 0;

      const avgInsuranceFee = quotesWithInsurance > 0 ? totalInsuranceFees / quotesWithInsurance : 0;

      return {
        success: true,
        analytics: {
          total_quotes: totalQuotes,
          quotes_with_insurance: quotesWithInsurance,
          adoption_rate: Math.round(insuranceAdoptionRate * 100) / 100,
          total_fees_collected: Math.round(totalInsuranceFees * 100) / 100,
          average_fee: Math.round(avgInsuranceFee * 100) / 100,
          date_range: { start: startDate, end: endDate }
        }
      };

    } catch (error) {
      logger.error('❌ Error getting insurance analytics:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

export const quoteInsuranceService = QuoteInsuranceService.getInstance();