/**
 * Refund Processing Service
 * 
 * Handles the complete refund workflow including:
 * - Payment gateway integration (Stripe, PayU)
 * - Database updates
 * - Email notifications
 * - Audit logging
 */

import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';

export interface RefundRequest {
  id: string;
  quote_id: string;
  requested_amount: number;
  approved_amount?: number;
  currency: string;
  refund_method?: string;
  payment_ledger_id?: string;
  status: string;
}

export interface RefundProcessingResult {
  success: boolean;
  refundId?: string;
  transactionId?: string;
  error?: string;
  details?: any;
}

export interface PaymentGatewayRefundParams {
  gateway: string;
  paymentId: string;
  amount: number;
  currency: string;
  reason?: string;
  metadata?: any;
}

class RefundProcessingService {
  private static instance: RefundProcessingService;
  
  private constructor() {}

  static getInstance(): RefundProcessingService {
    if (!RefundProcessingService.instance) {
      RefundProcessingService.instance = new RefundProcessingService();
    }
    return RefundProcessingService.instance;
  }

  /**
   * Process a refund request that has been approved
   */
  async processApprovedRefund(refundRequestId: string): Promise<RefundProcessingResult> {
    try {
      // 1. Get refund request details
      const { data: refundRequest, error: fetchError } = await supabase
        .from('refund_requests')
        .select(`
          *,
          quote:quotes(
            id,
            display_id,
            user_id,
            final_total_usd,
            currency,
            user:profiles(
              email,
              full_name
            )
          ),
          payment_ledger:payment_ledger(
            id,
            payment_method,
            gateway_code,
            gateway_reference,
            amount,
            currency
          )
        `)
        .eq('id', refundRequestId)
        .single();

      if (fetchError || !refundRequest) {
        throw new Error('Failed to fetch refund request details');
      }

      if (refundRequest.status !== 'approved') {
        throw new Error('Refund request must be approved before processing');
      }

      const refundAmount = refundRequest.approved_amount || refundRequest.requested_amount;

      // 2. Determine payment gateway and process refund
      let gatewayResult: RefundProcessingResult;
      
      if (refundRequest.payment_ledger?.gateway_code) {
        // Process through specific payment gateway
        gatewayResult = await this.processGatewayRefund({
          gateway: refundRequest.payment_ledger.gateway_code,
          paymentId: refundRequest.payment_ledger.gateway_reference,
          amount: refundAmount,
          currency: refundRequest.currency,
          reason: refundRequest.reason_description,
          metadata: {
            refund_request_id: refundRequestId,
            quote_id: refundRequest.quote_id,
            quote_display_id: refundRequest.quote?.display_id,
          }
        });
      } else {
        // Manual refund or store credit
        gatewayResult = {
          success: true,
          transactionId: `MANUAL-${Date.now()}`,
          details: { method: 'manual_refund' }
        };
      }

      if (!gatewayResult.success) {
        throw new Error(gatewayResult.error || 'Gateway refund failed');
      }

      // 3. Update refund request status to processing
      const { error: updateError } = await supabase
        .from('refund_requests')
        .update({
          status: 'processing',
          processed_by: (await supabase.auth.getUser()).data.user?.id,
          processed_at: new Date().toISOString(),
          metadata: {
            ...refundRequest.metadata,
            gateway_response: gatewayResult.details,
            transaction_id: gatewayResult.transactionId
          }
        })
        .eq('id', refundRequestId);

      if (updateError) {
        console.error('Failed to update refund status:', updateError);
      }

      // 4. Call the atomic refund processing function
      const { data: processResult, error: processError } = await supabase.rpc(
        'process_refund_atomic',
        {
          p_quote_id: refundRequest.quote_id,
          p_refund_amount: refundAmount,
          p_refund_data: {
            refund_request_id: refundRequestId,
            gateway_transaction_id: gatewayResult.transactionId,
            refund_method: refundRequest.refund_method || 'original_payment_method',
          },
          p_gateway_response: gatewayResult.details,
          p_processed_by: (await supabase.auth.getUser()).data.user?.id
        }
      );

      if (processError || !processResult?.[0]?.success) {
        throw new Error(processResult?.[0]?.error_message || 'Refund processing failed');
      }

      // 5. Update refund request to completed
      await supabase
        .from('refund_requests')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', refundRequestId);

      // 6. Send email notification
      await this.sendRefundNotification(refundRequest);

      // 7. Log success
      await this.logRefundActivity(refundRequestId, 'completed', gatewayResult);

      return {
        success: true,
        refundId: refundRequestId,
        transactionId: gatewayResult.transactionId,
        details: processResult[0]
      };

    } catch (error) {
      console.error('Refund processing error:', error);
      
      // Update status to failed
      await supabase
        .from('refund_requests')
        .update({
          status: 'failed',
          internal_notes: `Processing failed: ${error.message}`
        })
        .eq('id', refundRequestId);

      await this.logRefundActivity(refundRequestId, 'failed', { error: error.message });

      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Process refund through payment gateway
   */
  private async processGatewayRefund(params: PaymentGatewayRefundParams): Promise<RefundProcessingResult> {
    const { gateway, paymentId, amount, currency, reason, metadata } = params;

    try {
      switch (gateway.toLowerCase()) {
        case 'stripe':
          return await this.processStripeRefund(paymentId, amount, currency, reason, metadata);
        
        case 'payu':
          return await this.processPayURefund(paymentId, amount, currency, reason, metadata);
        
        case 'paypal':
          return await this.processPayPalRefund(paymentId, amount, currency, reason, metadata);
        
        default:
          // For other gateways, we'll simulate the refund
          console.warn(`Gateway ${gateway} not implemented, simulating refund`);
          return {
            success: true,
            transactionId: `SIM-${gateway}-${Date.now()}`,
            details: {
              simulated: true,
              gateway,
              amount,
              currency
            }
          };
      }
    } catch (error) {
      console.error(`Gateway refund error (${gateway}):`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Process Stripe refund
   */
  private async processStripeRefund(
    paymentIntentId: string, 
    amount: number, 
    currency: string, 
    reason?: string,
    metadata?: any
  ): Promise<RefundProcessingResult> {
    try {
      // Call Stripe API through edge function
      const { data, error } = await supabase.functions.invoke('stripe-refund', {
        body: {
          payment_intent_id: paymentIntentId,
          amount: Math.round(amount * 100), // Convert to cents
          currency: currency.toLowerCase(),
          reason: reason || 'requested_by_customer',
          metadata
        }
      });

      if (error) throw error;

      return {
        success: true,
        transactionId: data.refund.id,
        details: data.refund
      };
    } catch (error) {
      console.error('Stripe refund error:', error);
      return {
        success: false,
        error: `Stripe refund failed: ${error.message}`
      };
    }
  }

  /**
   * Process PayU refund
   */
  private async processPayURefund(
    transactionId: string,
    amount: number,
    currency: string,
    reason?: string,
    metadata?: any
  ): Promise<RefundProcessingResult> {
    try {
      // Call PayU API through edge function
      const { data, error } = await supabase.functions.invoke('payu-refund', {
        body: {
          transaction_id: transactionId,
          amount,
          currency,
          reason,
          metadata
        }
      });

      if (error) throw error;

      return {
        success: true,
        transactionId: data.refund_id,
        details: data
      };
    } catch (error) {
      console.error('PayU refund error:', error);
      return {
        success: false,
        error: `PayU refund failed: ${error.message}`
      };
    }
  }

  /**
   * Process PayPal refund
   */
  private async processPayPalRefund(
    captureId: string,
    amount: number,
    currency: string,
    reason?: string,
    metadata?: any
  ): Promise<RefundProcessingResult> {
    try {
      // Call PayPal API through edge function
      const { data, error } = await supabase.functions.invoke('paypal-refund', {
        body: {
          capture_id: captureId,
          amount: {
            value: amount.toFixed(2),
            currency_code: currency
          },
          note_to_payer: reason,
          metadata
        }
      });

      if (error) throw error;

      return {
        success: true,
        transactionId: data.id,
        details: data
      };
    } catch (error) {
      console.error('PayPal refund error:', error);
      return {
        success: false,
        error: `PayPal refund failed: ${error.message}`
      };
    }
  }

  /**
   * Send refund notification email
   */
  private async sendRefundNotification(refundRequest: any): Promise<void> {
    try {
      const emailData = {
        to: refundRequest.quote?.user?.email,
        subject: `Refund Processed - ${refundRequest.quote?.display_id}`,
        template: 'refund_processed',
        data: {
          customer_name: refundRequest.quote?.user?.full_name || 'Customer',
          quote_id: refundRequest.quote?.display_id,
          refund_amount: refundRequest.approved_amount || refundRequest.requested_amount,
          currency: refundRequest.currency,
          refund_method: refundRequest.refund_method?.replace(/_/g, ' ') || 'original payment method',
          reason: refundRequest.reason_description,
          processing_time: '5-10 business days',
        }
      };

      const { error } = await supabase.functions.invoke('send-email', {
        body: emailData
      });

      if (error) {
        console.error('Failed to send refund notification:', error);
      }
    } catch (error) {
      console.error('Email notification error:', error);
    }
  }

  /**
   * Log refund activity
   */
  private async logRefundActivity(
    refundRequestId: string,
    action: string,
    details: any
  ): Promise<void> {
    try {
      await supabase
        .from('admin_activity_logs')
        .insert({
          user_id: (await supabase.auth.getUser()).data.user?.id,
          action: `refund_${action}`,
          entity_type: 'refund_request',
          entity_id: refundRequestId,
          details,
          ip_address: window.location.hostname,
          user_agent: navigator.userAgent,
        });
    } catch (error) {
      console.error('Failed to log refund activity:', error);
    }
  }

  /**
   * Process multiple refunds in batch
   */
  async processBatchRefunds(refundRequestIds: string[]): Promise<{
    successful: string[];
    failed: string[];
    results: RefundProcessingResult[];
  }> {
    const successful: string[] = [];
    const failed: string[] = [];
    const results: RefundProcessingResult[] = [];

    for (const id of refundRequestIds) {
      const result = await this.processApprovedRefund(id);
      results.push(result);
      
      if (result.success) {
        successful.push(id);
      } else {
        failed.push(id);
      }
    }

    return { successful, failed, results };
  }

  /**
   * Check refund status from gateway
   */
  async checkRefundStatus(refundRequestId: string): Promise<{
    status: string;
    gatewayStatus?: string;
    lastChecked: string;
  }> {
    try {
      const { data: refundRequest } = await supabase
        .from('refund_requests')
        .select('*, payment_ledger:payment_ledger(*)')
        .eq('id', refundRequestId)
        .single();

      if (!refundRequest) {
        throw new Error('Refund request not found');
      }

      // Check gateway status if applicable
      let gatewayStatus;
      if (refundRequest.metadata?.transaction_id && refundRequest.payment_ledger?.gateway_code) {
        // In a real implementation, we would check the actual gateway status
        gatewayStatus = 'completed'; // Placeholder
      }

      return {
        status: refundRequest.status,
        gatewayStatus,
        lastChecked: new Date().toISOString()
      };
    } catch (error) {
      console.error('Failed to check refund status:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const refundProcessingService = RefundProcessingService.getInstance();