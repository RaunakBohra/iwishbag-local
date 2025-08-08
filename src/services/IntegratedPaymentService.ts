/**
 * Integrated Payment Service - Package Forwarding Payment Integration
 * 
 * Integrates package forwarding storage fees and forwarding charges with
 * the existing iwishBag payment system. Ensures seamless payment processing
 * for both regular quotes and package forwarding services.
 * 
 * INTEGRATION FEATURES:
 * - Storage fees automatically added to quotes
 * - Consolidation fees included in shipping calculations
 * - Package forwarding charges processed through existing gateways
 * - Automatic fee marking as paid when quote payment completes
 * - Integration with existing cart and checkout flow
 */

import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';
import type { UnifiedQuote } from '@/types/unified-quote';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface PackageForwardingPaymentSummary {
  quote_id: string;
  base_quote_total: number;
  storage_fees_origin: number;
  consolidation_fees_origin: number;
  service_fees_origin: number;
  forwarding_total_origin: number;
  grand_total_origin: number;
  payment_breakdown: {
    main_quote: number;
    package_forwarding: number;
    storage_fees: number;
  };
  fees_included: {
    storage_fees: boolean;
    consolidation_fees: boolean;
    service_fees: boolean;
  };
}

export interface StorageFeePaymentResult {
  fees_processed: number;
  total_amount_origin: number;
  payment_method: string;
  transaction_id?: string;
  fees_marked_paid: boolean;
  integration_status: 'success' | 'partial' | 'failed';
}

// ============================================================================
// INTEGRATED PAYMENT SERVICE
// ============================================================================

export class IntegratedPaymentService {
  private static instance: IntegratedPaymentService;

  static getInstance(): IntegratedPaymentService {
    if (!IntegratedPaymentService.instance) {
      IntegratedPaymentService.instance = new IntegratedPaymentService();
    }
    return IntegratedPaymentService.instance;
  }

  /**
   * Calculate complete payment summary including package forwarding fees
   */
  async calculatePackageForwardingPaymentSummary(
    quoteId: string
  ): Promise<PackageForwardingPaymentSummary> {
    try {
      // Get quote data with forwarding information
      const { data: quote, error: quoteError } = await supabase
        .from('quotes_v2')
        .select('*')
        .eq('id', quoteId)
        .single();

      if (quoteError || !quote) {
        throw new Error(`Quote not found: ${quoteError?.message}`);
      }

      const baseQuoteTotal = quote.final_total_origin || 0;
      let storageFees = 0;
      let consolidationFees = 0;
      let serviceFees = 0;

      // Extract forwarding fees from quote data
      if (quote.forwarding_data) {
        storageFees = quote.forwarding_data.storage_fees_origin || quote.forwarding_data.storage_fees_usd || 0;
        consolidationFees = quote.forwarding_data.consolidation_fee_origin || quote.forwarding_data.consolidation_fee_usd || 0;
        serviceFees = quote.forwarding_data.service_fee_origin || quote.forwarding_data.service_fee_usd || 0;
      }

      // If quote includes storage fees, get actual storage fee amounts
      if (quote.storage_fees_included) {
        const { data: actualStorageFees } = await supabase
          .from('storage_fees')
          .select('total_fee_origin, total_fee_usd')
          .eq('quote_id', quoteId)
          .eq('is_paid', false);

        const actualTotal = actualStorageFees?.reduce((sum, fee) => sum + (fee.total_fee_origin || fee.total_fee_usd || 0), 0) || 0;
        if (actualTotal > 0) {
          storageFees = actualTotal;
        }
      }

      const forwardingTotal = storageFees + consolidationFees + serviceFees;
      const grandTotal = baseQuoteTotal + forwardingTotal;

      return {
        quote_id: quoteId,
        base_quote_total: baseQuoteTotal,
        storage_fees_origin: storageFees,
        consolidation_fees_origin: consolidationFees,
        service_fees_origin: serviceFees,
        forwarding_total_origin: forwardingTotal,
        grand_total_origin: grandTotal,
        payment_breakdown: {
          main_quote: baseQuoteTotal,
          package_forwarding: consolidationFees + serviceFees,
          storage_fees: storageFees,
        },
        fees_included: {
          storage_fees: quote.storage_fees_included || false,
          consolidation_fees: consolidationFees > 0,
          service_fees: serviceFees > 0,
        },
      };

    } catch (error) {
      logger.error('❌ Failed to calculate package forwarding payment summary:', error);
      throw error;
    }
  }

  /**
   * Process payment for quote including package forwarding fees
   * This integrates with existing payment gateway system
   */
  async processPackageForwardingPayment(
    quoteId: string,
    paymentMethod: string,
    paymentGatewayResult: any
  ): Promise<StorageFeePaymentResult> {
    try {
      logger.info(`💳 Processing package forwarding payment for quote ${quoteId}`);

      // Get payment summary
      const paymentSummary = await this.calculatePackageForwardingPaymentSummary(quoteId);

      // Update quote status to paid (this will trigger the database trigger)
      const { error: quoteUpdateError } = await supabase
        .from('quotes_v2')
        .update({
          status: 'paid',
          // Add payment information to operational data
          operational_data: {
            payment_method: paymentMethod,
            payment_gateway_result: paymentGatewayResult,
            package_forwarding_payment_summary: paymentSummary,
            payment_processed_at: new Date().toISOString(),
          }
        })
        .eq('id', quoteId);

      if (quoteUpdateError) {
        throw new Error(`Failed to update quote payment status: ${quoteUpdateError.message}`);
      }

      // The database trigger should automatically mark storage fees as paid
      // Let's verify this happened
      let feesMarkedPaid = true;
      let feesProcessed = 0;

      if (paymentSummary.fees_included.storage_fees) {
        const { data: remainingFees, error: feesError } = await supabase
          .from('storage_fees')
          .select('count')
          .eq('quote_id', quoteId)
          .eq('is_paid', false);

        if (feesError) {
          logger.warn('Could not verify storage fees payment status:', feesError);
          feesMarkedPaid = false;
        } else {
          feesProcessed = remainingFees?.length || 0;
          feesMarkedPaid = feesProcessed === 0;
        }
      }

      // Update package status to ready for shipping if individual package
      if (paymentSummary.quote_id) {
        await this.updatePackageStatusAfterPayment(quoteId);
      }

      logger.info(`✅ Package forwarding payment processed successfully: $${paymentSummary.grand_total_origin}`);

      return {
        fees_processed: feesProcessed,
        total_amount_origin: paymentSummary.grand_total_origin,
        payment_method: paymentMethod,
        transaction_id: paymentGatewayResult?.transaction_id,
        fees_marked_paid: feesMarkedPaid,
        integration_status: feesMarkedPaid ? 'success' : 'partial',
      };

    } catch (error) {
      logger.error('❌ Failed to process package forwarding payment:', error);
      
      return {
        fees_processed: 0,
        total_amount_origin: 0,
        payment_method: paymentMethod,
        fees_marked_paid: false,
        integration_status: 'failed',
      };
    }
  }

  /**
   * Add storage fees to cart for existing customers
   * Integrates with existing cart system
   */
  async addStorageFeesToCart(userId: string): Promise<{
    cart_updated: boolean;
    storage_fees_quote_id?: string;
    total_storage_fees: number;
    message: string;
  }> {
    try {
      // Check if user has unpaid storage fees
      const { data: unpaidFees, error: feesError } = await supabase
        .from('storage_fees')
        .select('total_fee_origin, total_fee_usd, package_id')
        .eq('user_id', userId)
        .eq('is_paid', false)
        .is('quote_id', null);

      if (feesError) {
        throw new Error(`Failed to check storage fees: ${feesError.message}`);
      }

      if (!unpaidFees || unpaidFees.length === 0) {
        return {
          cart_updated: false,
          total_storage_fees: 0,
          message: 'No unpaid storage fees found',
        };
      }

      const totalStorageFees = unpaidFees.reduce((sum, fee) => sum + (fee.total_fee_origin || fee.total_fee_usd || 0), 0);

      // Create a storage fees only quote
      const { data: quote, error: quoteError } = await supabase
        .from('quotes_v2')
        .insert({
          user_id: userId,
          status: 'pending',
          origin_country: 'US',
          destination_country: 'US', // Storage fees don't require shipping
          items: [],
          costprice_total_quote_origincurrency: 0,
          final_total_origin: totalStorageFees,
          forwarding_type: 'storage_fees',
          storage_fees_included: true,
          in_cart: true, // Add to cart
          quote_source: 'storage_fees_cart',
          forwarding_data: {
            storage_fees_origin: totalStorageFees,
            storage_fees_usd: totalStorageFees, // Keep for backward compatibility
            fees_count: unpaidFees.length,
          }
        })
        .select('id')
        .single();

      if (quoteError || !quote) {
        throw new Error(`Failed to create storage fees quote: ${quoteError?.message}`);
      }

      // Link storage fees to the new quote
      const { error: linkError } = await supabase
        .from('storage_fees')
        .update({ quote_id: quote.id })
        .eq('user_id', userId)
        .eq('is_paid', false)
        .is('quote_id', null);

      if (linkError) {
        logger.warn('Failed to link storage fees to quote:', linkError);
      }

      logger.info(`🛒 Added $${totalStorageFees} storage fees to cart for user ${userId}`);

      return {
        cart_updated: true,
        storage_fees_quote_id: quote.id,
        total_storage_fees: totalStorageFees,
        message: `$${totalStorageFees} in storage fees added to cart`,
      };

    } catch (error) {
      logger.error('❌ Failed to add storage fees to cart:', error);
      
      return {
        cart_updated: false,
        total_storage_fees: 0,
        message: `Failed to add storage fees to cart: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Update package status after successful payment
   */
  private async updatePackageStatusAfterPayment(quoteId: string): Promise<void> {
    try {
      // Get quote information to determine what to update
      const { data: quote } = await supabase
        .from('quotes_v2')
        .select('forwarding_type, package_ids, consolidation_group_id')
        .eq('id', quoteId)
        .single();

      if (!quote) return;

      if (quote.forwarding_type === 'individual_package' && quote.package_ids?.length) {
        // Update individual package status
        const { error: packageError } = await supabase
          .from('received_packages')
          .update({
            status: 'ready_to_ship',
            last_scanned_at: new Date().toISOString(),
          })
          .in('id', quote.package_ids);

        if (packageError) {
          logger.warn('Failed to update package status after payment:', packageError);
        }
      } else if (quote.forwarding_type === 'consolidation' && quote.consolidation_group_id) {
        // Update consolidation group status
        const { error: groupError } = await supabase
          .from('consolidation_groups')
          .update({
            status: 'ready_to_ship',
            updated_at: new Date().toISOString(),
          })
          .eq('id', quote.consolidation_group_id);

        if (groupError) {
          logger.warn('Failed to update consolidation group status after payment:', groupError);
        }
      }

      logger.info(`📦 Updated package/consolidation status after payment for quote ${quoteId}`);

    } catch (error) {
      logger.warn('Failed to update package status after payment:', error);
    }
  }

  /**
   * Get payment history for package forwarding services
   */
  async getPackageForwardingPaymentHistory(userId: string): Promise<{
    total_paid: number;
    total_pending: number;
    payment_history: Array<{
      quote_id: string;
      payment_date: string;
      amount_origin: number;
      type: 'storage_fees' | 'individual_package' | 'consolidation';
      status: 'paid' | 'pending' | 'failed';
      description: string;
    }>;
  }> {
    try {
      // Get all package forwarding quotes
      const { data: quotes, error: quotesError } = await supabase
        .from('quotes_v2')
        .select('*')
        .eq('user_id', userId)
        .not('forwarding_type', 'is', null)
        .order('created_at', { ascending: false });

      if (quotesError) {
        throw new Error(`Failed to fetch payment history: ${quotesError.message}`);
      }

      let totalPaid = 0;
      let totalPending = 0;
      const paymentHistory: any[] = [];

      for (const quote of quotes || []) {
        const amount = quote.final_total_origin || 0;
        const isPaid = quote.status === 'paid';
        
        if (isPaid) {
          totalPaid += amount;
        } else {
          totalPending += amount;
        }

        let description = '';
        switch (quote.forwarding_type) {
          case 'storage_fees':
            description = 'Storage fees payment';
            break;
          case 'individual_package':
            description = 'Individual package shipping';
            break;
          case 'consolidation':
            description = 'Consolidated package shipping';
            break;
          default:
            description = 'Package forwarding service';
        }

        paymentHistory.push({
          quote_id: quote.id,
          payment_date: quote.updated_at,
          amount_origin: amount,
          type: quote.forwarding_type,
          status: quote.status,
          description: description,
        });
      }

      return {
        total_paid: totalPaid,
        total_pending: totalPending,
        payment_history: paymentHistory,
      };

    } catch (error) {
      logger.error('❌ Failed to get package forwarding payment history:', error);
      
      return {
        total_paid: 0,
        total_pending: 0,
        payment_history: [],
      };
    }
  }
}

export const integratedPaymentService = IntegratedPaymentService.getInstance();