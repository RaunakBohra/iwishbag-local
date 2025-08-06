/**
 * Quote Discount Service
 * Handles discount application, removal, and integration with quote recalculation
 * Bridges frontend coupon system with backend calculation and analytics
 */

import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

export interface AppliedDiscount {
  code: string;
  name: string;
  type: 'percentage' | 'fixed_amount';
  amount: number;
  applicable_to: string;
  usage_id: string;
}

export interface DiscountApplicationResult {
  success: boolean;
  message: string;
  recalculated_quote?: any;
  applied_discounts?: AppliedDiscount[];
  total_savings?: number;
  new_total?: number;
  error?: string;
}

export interface DiscountRemovalResult {
  success: boolean;
  message: string;
  recalculated_quote?: any;
  original_total?: number;
  error?: string;
}

export class QuoteDiscountService {
  private static instance: QuoteDiscountService;

  static getInstance(): QuoteDiscountService {
    if (!QuoteDiscountService.instance) {
      QuoteDiscountService.instance = new QuoteDiscountService();
    }
    return QuoteDiscountService.instance;
  }

  /**
   * Apply discount codes to a quote
   */
  async applyDiscountToQuote(
    quoteId: string,
    discountCodes: string[],
    customerId?: string
  ): Promise<DiscountApplicationResult> {
    try {
      logger.info('🏷️ Applying discounts to quote:', {
        quoteId,
        discountCodes,
        customerId
      });

      const { data, error } = await supabase.rpc('apply_discount_to_quote', {
        p_quote_id: quoteId,
        p_discount_codes: discountCodes,
        p_customer_id: customerId || null
      });

      if (error) {
        logger.error('❌ Failed to apply discount to quote:', error);
        return {
          success: false,
          message: 'Failed to apply discount',
          error: error.message
        };
      }

      if (!data || data.length === 0) {
        return {
          success: false,
          message: 'No discount application result returned',
          error: 'Empty response from server'
        };
      }

      const result = data[0];
      
      if (!result.success) {
        return {
          success: false,
          message: result.message || 'Discount application failed',
          error: result.message
        };
      }

      logger.info('✅ Discounts applied successfully:', {
        totalSavings: result.total_savings,
        newTotal: result.new_total,
        appliedDiscounts: result.applied_discounts?.length || 0
      });

      return {
        success: true,
        message: result.message,
        recalculated_quote: result.recalculated_quote,
        applied_discounts: result.applied_discounts || [],
        total_savings: result.total_savings || 0,
        new_total: result.new_total || 0
      };

    } catch (error) {
      logger.error('❌ Error applying discount to quote:', error);
      return {
        success: false,
        message: 'Failed to apply discount',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Remove discount codes from a quote
   */
  async removeDiscountFromQuote(
    quoteId: string,
    discountCodes?: string[]
  ): Promise<DiscountRemovalResult> {
    try {
      logger.info('🗑️ Removing discounts from quote:', {
        quoteId,
        discountCodes: discountCodes || 'all'
      });

      const { data, error } = await supabase.rpc('remove_discount_from_quote', {
        p_quote_id: quoteId,
        p_discount_codes: discountCodes || null
      });

      if (error) {
        logger.error('❌ Failed to remove discount from quote:', error);
        return {
          success: false,
          message: 'Failed to remove discount',
          error: error.message
        };
      }

      if (!data || data.length === 0) {
        return {
          success: false,
          message: 'No discount removal result returned',
          error: 'Empty response from server'
        };
      }

      const result = data[0];

      if (!result.success) {
        return {
          success: false,
          message: result.message || 'Discount removal failed',
          error: result.message
        };
      }

      logger.info('✅ Discounts removed successfully:', {
        originalTotal: result.original_total
      });

      return {
        success: true,
        message: result.message,
        recalculated_quote: result.recalculated_quote,
        original_total: result.original_total || 0
      };

    } catch (error) {
      logger.error('❌ Error removing discount from quote:', error);
      return {
        success: false,
        message: 'Failed to remove discount',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get applied discounts for a quote
   */
  async getQuoteDiscounts(quoteId: string): Promise<AppliedDiscount[]> {
    try {
      const { data, error } = await supabase
        .from('quotes_v2')
        .select('calculation_data')
        .eq('id', quoteId)
        .single();

      if (error || !data) {
        logger.error('❌ Failed to get quote discounts:', error);
        return [];
      }

      const appliedDiscounts = data.calculation_data?.applied_discounts || [];
      return appliedDiscounts;

    } catch (error) {
      logger.error('❌ Error getting quote discounts:', error);
      return [];
    }
  }

  /**
   * Validate if discount codes can be applied to quote
   */
  async validateDiscountCodes(
    quoteId: string,
    discountCodes: string[],
    customerId: string
  ): Promise<{
    valid: boolean;
    validCodes: string[];
    invalidCodes: string[];
    errors: string[];
  }> {
    try {
      // Get quote details
      const { data: quote, error: quoteError } = await supabase
        .from('quotes_v2')
        .select('*')
        .eq('id', quoteId)
        .single();

      if (quoteError || !quote) {
        return {
          valid: false,
          validCodes: [],
          invalidCodes: discountCodes,
          errors: ['Quote not found']
        };
      }

      // Get available discounts for this quote
      const { data: availableDiscounts, error: discountsError } = await supabase
        .rpc('calculate_applicable_discounts', {
          p_customer_id: customerId,
          p_quote_total: quote.total_customer_currency || quote.total_usd,
          p_handling_fee: quote.calculation_data?.calculation_steps?.handling_fee || 0,
          p_payment_method: 'card',
          p_country_code: quote.destination_country
        });

      if (discountsError) {
        logger.error('❌ Failed to validate discount codes:', discountsError);
        return {
          valid: false,
          validCodes: [],
          invalidCodes: discountCodes,
          errors: ['Failed to validate discount codes']
        };
      }

      const availableCodes = (availableDiscounts || []).map((d: any) => d.discount_code);
      const validCodes = discountCodes.filter(code => availableCodes.includes(code));
      const invalidCodes = discountCodes.filter(code => !availableCodes.includes(code));

      return {
        valid: invalidCodes.length === 0,
        validCodes,
        invalidCodes,
        errors: invalidCodes.map(code => `Invalid or expired discount code: ${code}`)
      };

    } catch (error) {
      logger.error('❌ Error validating discount codes:', error);
      return {
        valid: false,
        validCodes: [],
        invalidCodes: discountCodes,
        errors: ['Validation error occurred']
      };
    }
  }

  /**
   * Get discount analytics for admin
   */
  async getDiscountAnalytics(dateRange?: { start: Date; end: Date }) {
    try {
      const startDate = dateRange?.start || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const endDate = dateRange?.end || new Date();

      const [statsResult, analyticsResult] = await Promise.all([
        supabase.rpc('get_discount_stats'),
        supabase.rpc('get_discount_usage_analytics', {
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString()
        })
      ]);

      return {
        success: !statsResult.error && !analyticsResult.error,
        stats: statsResult.data?.[0] || {},
        analytics: analyticsResult.data || [],
        error: statsResult.error || analyticsResult.error
      };

    } catch (error) {
      logger.error('❌ Error getting discount analytics:', error);
      return {
        success: false,
        stats: {},
        analytics: [],
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get customer discount history
   */
  async getCustomerDiscountHistory(customerId: string, limit: number = 10) {
    try {
      const { data, error } = await supabase.rpc('get_customer_discount_history', {
        p_customer_id: customerId,
        p_limit: limit
      });

      if (error) {
        logger.error('❌ Failed to get customer discount history:', error);
        return [];
      }

      return data || [];

    } catch (error) {
      logger.error('❌ Error getting customer discount history:', error);
      return [];
    }
  }

  /**
   * Check if customer is eligible for first-time discount
   */
  async isEligibleForFirstTimeDiscount(customerId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc('is_eligible_for_first_time_discount', {
        p_customer_id: customerId
      });

      if (error) {
        logger.error('❌ Failed to check first-time discount eligibility:', error);
        return false;
      }

      return data === true;

    } catch (error) {
      logger.error('❌ Error checking first-time discount eligibility:', error);
      return false;
    }
  }
}

export const quoteDiscountService = QuoteDiscountService.getInstance();