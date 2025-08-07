/**
 * QuoteOptionsService - Unified Real-Time Quote Options Management
 * 
 * Handles all quote option updates (shipping, insurance, discounts) with:
 * - Real-time recalculation using SimplifiedQuoteCalculator
 * - Database persistence with optimistic updates
 * - WebSocket notifications for cross-device sync
 * - Unified validation and error handling
 * - Currency conversion consistency
 */

import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';
import { simplifiedQuoteCalculator } from './SimplifiedQuoteCalculator';
import { currencyService } from './CurrencyService';
import { quoteOptionsWebSocketService } from './QuoteOptionsWebSocketService';

export interface QuoteOptionUpdate {
  type: 'shipping' | 'insurance' | 'discount';
  data: {
    // Shipping updates
    shipping_option_id?: string;
    shipping_method?: string;
    
    // Insurance updates  
    insurance_enabled?: boolean;
    
    // Discount updates
    discount_code?: string;
    discount_action?: 'apply' | 'remove';
  };
}

export interface QuoteOptionsState {
  shipping: {
    selected_option_id: string | null;
    selected_method: string | null;
    available_options: any[];
    cost: number;
    cost_currency: string;
  };
  insurance: {
    enabled: boolean;
    available: boolean;
    cost: number;
    cost_currency: string;
    coverage_amount: number;
    rate_percentage: number;
  };
  discounts: {
    applied_codes: string[];
    total_discount: number;
    discount_currency: string;
    available_codes: string[];
  };
  totals: {
    base_total: number;
    adjusted_total: number;
    currency: string;
    savings: number;
  };
}

export interface QuoteRecalculationResult {
  success: boolean;
  quote: any;
  breakdown: any;
  options_state: QuoteOptionsState;
  changes: {
    shipping_change: number;
    insurance_change: number;
    discount_change: number;
    total_change: number;
  };
  errors?: string[];
  warnings?: string[];
}

class QuoteOptionsService {
  private static instance: QuoteOptionsService;
  private optionsCache = new Map<string, { state: QuoteOptionsState; expires: number }>();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  static getInstance(): QuoteOptionsService {
    if (!QuoteOptionsService.instance) {
      QuoteOptionsService.instance = new QuoteOptionsService();
    }
    return QuoteOptionsService.instance;
  }

  /**
   * Get current quote options state with caching
   */
  async getQuoteOptionsState(quoteId: string): Promise<QuoteOptionsState> {
    const cacheKey = `options_${quoteId}`;
    const cached = this.optionsCache.get(cacheKey);
    
    if (cached && Date.now() < cached.expires) {
      logger.info(`📦 [QuoteOptions] Cache hit for quote ${quoteId}`);
      return cached.state;
    }

    try {
      logger.info(`📦 [QuoteOptions] Fetching options state for quote ${quoteId}`);
      
      const { data: quote, error } = await supabase
        .from('quotes_v2')
        .select(`
          *,
          calculation_data,
          shipping_method,
          insurance_required
        `)
        .eq('id', quoteId)
        .single();

      if (error) {
        throw new Error(`Failed to fetch quote: ${error.message}`);
      }

      const optionsState = await this.buildOptionsState(quote);
      
      // Cache the result
      this.optionsCache.set(cacheKey, {
        state: optionsState,
        expires: Date.now() + this.CACHE_DURATION
      });

      return optionsState;
      
    } catch (error) {
      logger.error(`❌ [QuoteOptions] Failed to get options state for ${quoteId}:`, error);
      throw error;
    }
  }

  /**
   * Update quote options with real-time recalculation
   */
  async updateQuoteOptions(
    quoteId: string, 
    updates: QuoteOptionUpdate[],
    userId?: string
  ): Promise<QuoteRecalculationResult> {
    try {
      logger.info(`🔄 [QuoteOptions] Updating options for quote ${quoteId}:`, updates);

      // Get current quote
      const { data: currentQuote, error: fetchError } = await supabase
        .from('quotes_v2')
        .select('*')
        .eq('id', quoteId)
        .single();

      if (fetchError) {
        throw new Error(`Failed to fetch quote: ${fetchError.message}`);
      }

      // Get current options state for comparison
      const currentState = await this.getQuoteOptionsState(quoteId);
      
      // Build updated quote input for recalculation
      const updatedQuoteInput = await this.buildUpdatedQuoteInput(currentQuote, updates);
      
      // Recalculate quote with new options
      const recalculationResult = await simplifiedQuoteCalculator.calculateQuote(updatedQuoteInput);
      
      // Prepare database update
      const dbUpdates: any = {
        calculation_data: recalculationResult.calculation_data,
        total_usd: recalculationResult.total_usd,
        total_customer_currency: recalculationResult.total_customer_currency,
        customer_currency: recalculationResult.customer_currency,
        updated_at: new Date().toISOString()
      };

      // Apply specific option updates to database fields
      for (const update of updates) {
        switch (update.type) {
          case 'shipping':
            if (update.data.shipping_method) {
              dbUpdates.shipping_method = update.data.shipping_method;
            }
            break;
            
          case 'insurance':
            if (update.data.insurance_enabled !== undefined) {
              dbUpdates.insurance_required = update.data.insurance_enabled;
            }
            break;
            
          case 'discount':
            // Discount codes stored in calculation_data
            break;
        }
      }

      // Add audit trail
      if (userId) {
        dbUpdates.last_updated_by = userId;
        dbUpdates.options_last_updated_at = new Date().toISOString();
      }

      // Update database
      const { data: updatedQuote, error: updateError } = await supabase
        .from('quotes_v2')
        .update(dbUpdates)
        .eq('id', quoteId)
        .select()
        .single();

      if (updateError) {
        throw new Error(`Failed to update quote: ${updateError.message}`);
      }

      // Get new options state
      this.clearCache(quoteId); // Clear cache to force refresh
      const newState = await this.getQuoteOptionsState(quoteId);

      // Calculate changes
      const changes = {
        shipping_change: newState.shipping.cost - currentState.shipping.cost,
        insurance_change: newState.insurance.cost - currentState.insurance.cost,
        discount_change: newState.discounts.total_discount - currentState.discounts.total_discount,
        total_change: newState.totals.adjusted_total - currentState.totals.adjusted_total
      };

      const result: QuoteRecalculationResult = {
        success: true,
        quote: updatedQuote,
        breakdown: recalculationResult.breakdown,
        options_state: newState,
        changes,
        warnings: []
      };

      // Notify WebSocket subscribers
      await this.notifySubscribers(quoteId, result, userId);

      logger.info(`✅ [QuoteOptions] Successfully updated options for quote ${quoteId}`, changes);
      return result;

    } catch (error) {
      logger.error(`❌ [QuoteOptions] Failed to update options for quote ${quoteId}:`, error);
      
      return {
        success: false,
        quote: null,
        breakdown: null,
        options_state: await this.getQuoteOptionsState(quoteId), // Return current state
        changes: { shipping_change: 0, insurance_change: 0, discount_change: 0, total_change: 0 },
        errors: [error.message || 'Unknown error occurred']
      };
    }
  }

  /**
   * Validate discount code
   */
  async validateDiscountCode(
    quoteId: string, 
    code: string, 
    customerId?: string
  ): Promise<{ valid: boolean; discount: any; error?: string }> {
    try {
      logger.info(`🏷️ [QuoteOptions] Validating discount code '${code}' for quote ${quoteId}`);

      // Get quote for validation context
      const { data: quote, error } = await supabase
        .from('quotes_v2')
        .select('*')
        .eq('id', quoteId)
        .single();

      if (error) {
        throw new Error(`Failed to fetch quote for validation: ${error.message}`);
      }

      // For now, implement basic validation
      // TODO: Integrate with your existing DiscountService
      const validCodes = ['FIRST10', 'WELCOME5', 'SAVE15', 'BUNDLE20'];
      const discountPercentages = { 
        'FIRST10': 0.1, 
        'WELCOME5': 0.05, 
        'SAVE15': 0.15, 
        'BUNDLE20': 0.2 
      };

      if (validCodes.includes(code.toUpperCase())) {
        const percentage = discountPercentages[code.toUpperCase()];
        const discountAmount = (quote.total_customer_currency || quote.total_usd || 0) * percentage;

        return {
          valid: true,
          discount: {
            code: code.toUpperCase(),
            type: 'percentage',
            value: percentage,
            amount: discountAmount,
            currency: quote.customer_currency || 'USD'
          }
        };
      } else {
        return {
          valid: false,
          discount: null,
          error: 'Invalid discount code'
        };
      }

    } catch (error) {
      logger.error(`❌ [QuoteOptions] Discount validation failed:`, error);
      return {
        valid: false,
        discount: null,
        error: error.message || 'Validation failed'
      };
    }
  }

  /**
   * Get available shipping options for a quote
   */
  async getAvailableShippingOptions(quoteId: string): Promise<any[]> {
    try {
      const { data: quote, error } = await supabase
        .from('quotes_v2')
        .select('origin_country, destination_country')
        .eq('id', quoteId)
        .single();

      if (error) {
        throw new Error(`Failed to fetch quote: ${error.message}`);
      }

      const { data: routeData, error: routeError } = await supabase
        .from('shipping_routes')
        .select('delivery_options')
        .eq('origin_country', quote.origin_country)
        .eq('destination_country', quote.destination_country)
        .eq('is_active', true)
        .single();

      if (routeError || !routeData?.delivery_options) {
        logger.warn(`No shipping options found for ${quote.origin_country} → ${quote.destination_country}`);
        return [];
      }

      return routeData.delivery_options.filter((opt: any) => opt.active);

    } catch (error) {
      logger.error(`❌ [QuoteOptions] Failed to get shipping options:`, error);
      return [];
    }
  }

  /**
   * Build options state from quote data
   */
  private async buildOptionsState(quote: any): Promise<QuoteOptionsState> {
    const calcData = quote.calculation_data || {};
    const routeCalc = calcData.route_calculations || {};
    
    // Get available shipping options
    const availableOptions = await this.getAvailableShippingOptions(quote.id);
    const selectedOption = routeCalc.delivery_option_used;

    return {
      shipping: {
        selected_option_id: selectedOption?.id || null,
        selected_method: quote.shipping_method || null,
        available_options: availableOptions,
        cost: calcData.breakdown?.shipping || 0,
        cost_currency: quote.customer_currency || 'USD'
      },
      insurance: {
        enabled: quote.insurance_required || false,
        available: routeCalc.insurance?.available !== false,
        cost: calcData.breakdown?.insurance || 0,
        cost_currency: quote.customer_currency || 'USD',
        coverage_amount: quote.total_usd || 0,
        rate_percentage: routeCalc.insurance?.percentage || 1.5
      },
      discounts: {
        applied_codes: [], // TODO: Extract from calculation_data
        total_discount: calcData.breakdown?.discount || 0,
        discount_currency: quote.customer_currency || 'USD',
        available_codes: ['FIRST10', 'WELCOME5', 'SAVE15', 'BUNDLE20'] // TODO: Dynamic lookup
      },
      totals: {
        base_total: calcData.breakdown?.items_total || quote.costprice_total_usd || 0,
        adjusted_total: quote.total_customer_currency || quote.total_usd || 0,
        currency: quote.customer_currency || 'USD',
        savings: calcData.total_savings || 0
      }
    };
  }

  /**
   * Build updated quote input for recalculation
   */
  private async buildUpdatedQuoteInput(quote: any, updates: QuoteOptionUpdate[]): Promise<any> {
    const input = {
      items: quote.items || [],
      origin_currency: quote.origin_currency || 'USD',
      origin_country: quote.origin_country,
      destination_country: quote.destination_country,
      destination_state: quote.destination_state,
      shipping_method: quote.shipping_method || 'standard',
      insurance_enabled: quote.insurance_required || false,
      discount_codes: []
    };

    // Apply updates to input
    for (const update of updates) {
      switch (update.type) {
        case 'shipping':
          if (update.data.shipping_method) {
            input.shipping_method = update.data.shipping_method;
          }
          break;
          
        case 'insurance':
          if (update.data.insurance_enabled !== undefined) {
            input.insurance_enabled = update.data.insurance_enabled;
          }
          break;
          
        case 'discount':
          if (update.data.discount_code && update.data.discount_action === 'apply') {
            input.discount_codes.push(update.data.discount_code);
          }
          break;
      }
    }

    return input;
  }

  /**
   * Clear cache for a specific quote
   */
  private clearCache(quoteId: string): void {
    const cacheKey = `options_${quoteId}`;
    this.optionsCache.delete(cacheKey);
    logger.info(`🗑️ [QuoteOptions] Cleared cache for quote ${quoteId}`);
  }

  /**
   * Notify WebSocket subscribers
   */
  private async notifySubscribers(
    quoteId: string, 
    result: QuoteRecalculationResult,
    updatedBy?: string
  ): Promise<void> {
    try {
      await quoteOptionsWebSocketService.notifyQuoteOptionsUpdate(
        quoteId,
        result,
        updatedBy
      );
      
      logger.info(`📡 [QuoteOptions] Notified WebSocket subscribers for quote ${quoteId}`, {
        changes: result.changes
      });
    } catch (error) {
      logger.warn(`⚠️ [QuoteOptions] Failed to notify WebSocket subscribers:`, error);
      // Non-critical error - don't fail the main operation
    }
  }

  /**
   * Subscribe to real-time quote option changes
   */
  subscribeToQuoteChanges(
    quoteId: string,
    userId: string | undefined,
    userType: 'admin' | 'customer',
    callback: (result: QuoteRecalculationResult) => void
  ): () => void {
    logger.info(`📡 [QuoteOptions] Creating subscription for quote ${quoteId} (user: ${userId}, type: ${userType})`);
    
    // Subscribe to WebSocket notifications
    const subscriberId = quoteOptionsWebSocketService.subscribeToQuote(
      quoteId,
      userId,
      userType,
      (notification) => {
        if (notification.type === 'quote_options_updated' && notification.data) {
          // Convert WebSocket notification to QuoteRecalculationResult format
          const result: QuoteRecalculationResult = {
            success: true,
            quote: null, // Not available in notification
            breakdown: null, // Not available in notification
            options_state: notification.data.options_state,
            changes: notification.data.changes || {
              shipping_change: 0,
              insurance_change: 0, 
              discount_change: 0,
              total_change: 0
            }
          };
          
          callback(result);
        }
      }
    );
    
    // Return unsubscribe function
    return () => {
      quoteOptionsWebSocketService.unsubscribeFromQuote(subscriberId);
      logger.info(`📡 [QuoteOptions] Unsubscribed from quote ${quoteId}`);
    };
  }

  /**
   * Batch update multiple options atomically
   */
  async batchUpdateOptions(
    quoteId: string,
    updates: QuoteOptionUpdate[],
    userId?: string
  ): Promise<QuoteRecalculationResult> {
    logger.info(`🔄 [QuoteOptions] Batch updating ${updates.length} options for quote ${quoteId}`);
    
    // Process all updates in a single transaction
    return await this.updateQuoteOptions(quoteId, updates, userId);
  }
}

// Export singleton instance
export const quoteOptionsService = QuoteOptionsService.getInstance();
export default QuoteOptionsService;