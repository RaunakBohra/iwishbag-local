/**
 * Payment Actions Service
 * Handles all payment operations: record, verify, refund, and external integrations
 */

import { logger } from '@/utils/logger';
import { supabase } from '@/integrations/supabase/client';
import { currencyService } from '@/services/CurrencyService';
import { PaymentMethodType } from './PaymentValidationService';
import { format } from 'date-fns';

// Action result interfaces
export interface ActionResult {
  success: boolean;
  data?: any;
  error?: string;
  warnings?: string[];
}

export interface PaymentRecordResult extends ActionResult {
  paymentId?: string;
  balanceAfter?: number;
}

export interface PaymentVerificationResult extends ActionResult {
  verifiedAmount?: number;
  paymentId?: string;
}

export interface RefundResult extends ActionResult {
  refundId?: string;
  refundAmount?: number;
  refundMethod?: string;
}

// Action data interfaces
export interface RecordPaymentData {
  quoteId: string;
  amount: number;
  currency: string;
  method: PaymentMethodType;
  transactionId?: string;
  date: string;
  notes?: string;
}

export interface VerifyPaymentData {
  quoteId: string;
  proofId: string;
  amount: number;
  currency: string;
  notes?: string;
}

export interface RejectProofData {
  proofId: string;
  reason: string;
  senderNotification?: boolean;
}

export interface ProcessRefundData {
  paymentId: string;
  amount: number;
  reason: string;
  method: string;
  gatewayRefund?: boolean;
}

export interface ExportPaymentHistoryOptions {
  format: 'csv' | 'pdf' | 'json';
  dateRange?: {
    start: Date;
    end: Date;
  };
  includeRefunds?: boolean;
  includeProofs?: boolean;
}

export class PaymentActionsService {
  constructor() {
    logger.info('PaymentActionsService initialized');
  }

  /**
   * Record a new payment
   */
  async recordPayment(data: RecordPaymentData): Promise<PaymentRecordResult> {
    try {
      logger.info('Recording payment:', { quoteId: data.quoteId, amount: data.amount, currency: data.currency });

      const { data: user } = await supabase.auth.getUser();
      if (!user.user) {
        return {
          success: false,
          error: 'User authentication required'
        };
      }

      // Use the RPC function for recording payment with ledger and triggers
      const { data: result, error } = await supabase.rpc('record_payment_with_ledger_and_triggers', {
        p_quote_id: data.quoteId,
        p_amount: data.amount,
        p_currency: data.currency,
        p_payment_method: data.method,
        p_transaction_reference: data.transactionId || `MANUAL-${Date.now()}`,
        p_notes: data.notes || '',
        p_recorded_by: user.user.id,
        p_payment_date: data.date,
      });

      if (error) {
        logger.error('Payment recording error:', error);
        return {
          success: false,
          error: error.message || 'Failed to record payment'
        };
      }

      logger.info('Payment recorded successfully:', result);

      return {
        success: true,
        data: result,
        paymentId: result?.payment_id || result?.id
      };

    } catch (error) {
      logger.error('Payment recording exception:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Payment recording failed'
      };
    }
  }

  /**
   * Verify a payment proof and record the payment
   */
  async verifyPaymentProof(data: VerifyPaymentData): Promise<PaymentVerificationResult> {
    try {
      logger.info('Verifying payment proof:', { proofId: data.proofId, amount: data.amount });

      const { data: user } = await supabase.auth.getUser();
      if (!user.user) {
        return {
          success: false,
          error: 'User authentication required'
        };
      }

      // First, record the payment
      const paymentResult = await this.recordPayment({
        quoteId: data.quoteId,
        amount: data.amount,
        currency: data.currency,
        method: 'bank_transfer', // Payment proofs are typically for bank transfers
        transactionId: `PROOF-${data.proofId}`,
        date: new Date().toISOString().split('T')[0],
        notes: data.notes || 'Payment verified from uploaded proof'
      });

      if (!paymentResult.success) {
        return {
          success: false,
          error: paymentResult.error
        };
      }

      // Update proof status in messages table
      const { error: proofError } = await supabase
        .from('messages')
        .update({
          verified_at: new Date().toISOString(),
          verified_by: user.user.id,
          verified_amount: data.amount,
          verification_notes: data.notes,
          verification_status: 'verified',
        })
        .eq('id', data.proofId);

      if (proofError) {
        logger.error('Proof status update error:', proofError);
        return {
          success: false,
          error: 'Failed to update proof status'
        };
      }

      logger.info('Payment proof verified successfully');

      return {
        success: true,
        verifiedAmount: data.amount,
        paymentId: paymentResult.paymentId
      };

    } catch (error) {
      logger.error('Payment verification exception:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Payment verification failed'
      };
    }
  }

  /**
   * Reject a payment proof
   */
  async rejectPaymentProof(data: RejectProofData, quoteId?: string): Promise<ActionResult> {
    try {
      logger.info('Rejecting payment proof:', { proofId: data.proofId, reason: data.reason });

      const { data: user } = await supabase.auth.getUser();
      if (!user.user) {
        return {
          success: false,
          error: 'User authentication required'
        };
      }

      // Update proof status to rejected
      const { error: proofError } = await supabase
        .from('messages')
        .update({
          verified_at: new Date().toISOString(),
          verified_by: user.user.id,
          verification_status: 'rejected',
          admin_notes: data.reason,
        })
        .eq('id', data.proofId);

      if (proofError) {
        logger.error('Proof rejection error:', proofError);
        return {
          success: false,
          error: 'Failed to update proof status'
        };
      }

      // Send rejection notification to customer if requested
      if (data.senderNotification && quoteId) {
        try {
          // Get the original proof message to find sender
          const { data: proofMessage } = await supabase
            .from('messages')
            .select('sender_id')
            .eq('id', data.proofId)
            .single();

          if (proofMessage?.sender_id) {
            await supabase.from('messages').insert({
              sender_id: user.user.id,
              recipient_id: proofMessage.sender_id,
              quote_id: quoteId,
              subject: 'Payment Proof Rejected',
              content: `Your payment proof has been rejected. Reason: ${data.reason}\n\nPlease submit a new payment proof or contact support for assistance.`,
              message_type: 'payment_verification_result',
            });
          }
        } catch (notificationError) {
          logger.warn('Failed to send rejection notification:', notificationError);
          // Don't fail the main operation if notification fails
        }
      }

      logger.info('Payment proof rejected successfully');

      return {
        success: true
      };

    } catch (error) {
      logger.error('Proof rejection exception:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Proof rejection failed'
      };
    }
  }

  /**
   * Process a refund
   */
  async processRefund(data: ProcessRefundData): Promise<RefundResult> {
    try {
      logger.info('Processing refund:', { paymentId: data.paymentId, amount: data.amount });

      const { data: user } = await supabase.auth.getUser();
      if (!user.user) {
        return {
          success: false,
          error: 'User authentication required'
        };
      }

      // For now, record refund in the ledger
      // In the future, this would integrate with payment gateways for automatic refunds
      const refundReference = `REFUND-${data.paymentId}-${Date.now()}`;

      // Record refund as negative amount in payment ledger
      const { data: refundResult, error: refundError } = await supabase
        .from('payment_transactions')
        .insert({
          quote_id: data.paymentId, // This should be derived from the original payment
          amount: -Math.abs(data.amount), // Negative for refund
          currency: 'USD', // This should match the original payment currency
          payment_method: data.method,
          status: 'completed',
          transaction_id: refundReference,
          gateway_response: {
            refund_reason: data.reason,
            original_payment_id: data.paymentId,
            refund_method: data.method,
            gateway_refund: data.gatewayRefund || false
          },
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (refundError) {
        logger.error('Refund recording error:', refundError);
        return {
          success: false,
          error: 'Failed to record refund'
        };
      }

      // If gateway refund is requested, integrate with payment gateway APIs
      if (data.gatewayRefund) {
        const gatewayResult = await this.processGatewayRefund(data);
        if (!gatewayResult.success) {
          return {
            success: false,
            error: `Gateway refund failed: ${gatewayResult.error}`,
            warnings: ['Refund has been recorded locally but gateway processing failed']
          };
        }
      }

      logger.info('Refund processed successfully:', refundResult);

      return {
        success: true,
        refundId: refundResult.id,
        refundAmount: Math.abs(data.amount),
        refundMethod: data.method
      };

    } catch (error) {
      logger.error('Refund processing exception:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Refund processing failed'
      };
    }
  }

  /**
   * Process gateway-specific refund
   */
  private async processGatewayRefund(data: ProcessRefundData): Promise<ActionResult> {
    try {
      // This would integrate with specific payment gateways
      // For now, just log the attempt
      logger.info('Gateway refund would be processed here:', {
        paymentId: data.paymentId,
        amount: data.amount,
        method: data.method
      });

      // TODO: Implement actual gateway integrations
      // - PayU refund API
      // - Stripe refund API
      // - PayPal refund API
      // - Bank transfer reversal process

      return {
        success: true,
        data: {
          gateway_transaction_id: `GW-REFUND-${Date.now()}`,
          status: 'pending'
        }
      };

    } catch (error) {
      logger.error('Gateway refund error:', error);
      return {
        success: false,
        error: 'Gateway refund processing failed'
      };
    }
  }

  /**
   * Export payment history
   */
  async exportPaymentHistory(
    quoteId: string,
    quoteDisplayId: string,
    paymentLedger: any[],
    options: ExportPaymentHistoryOptions
  ): Promise<ActionResult> {
    try {
      logger.info('Exporting payment history:', { quoteId, format: options.format });

      switch (options.format) {
        case 'csv':
          return this.exportToCSV(quoteDisplayId, paymentLedger, options);
        case 'json':
          return this.exportToJSON(quoteDisplayId, paymentLedger, options);
        case 'pdf':
          return this.exportToPDF(quoteDisplayId, paymentLedger, options);
        default:
          return {
            success: false,
            error: 'Unsupported export format'
          };
      }

    } catch (error) {
      logger.error('Export error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Export failed'
      };
    }
  }

  /**
   * Export to CSV format
   */
  private exportToCSV(quoteDisplayId: string, paymentLedger: any[], options: ExportPaymentHistoryOptions): ActionResult {
    try {
      // Prepare CSV headers
      const headers = [
        'Date',
        'Type',
        'Method',
        'Gateway',
        'Amount',
        'Currency',
        'Balance After',
        'Reference',
        'Notes',
        'Recorded By',
      ];

      // Filter data based on options
      let filteredData = paymentLedger;
      if (options.dateRange) {
        filteredData = paymentLedger.filter(entry => {
          const entryDate = new Date(entry.created_at);
          return entryDate >= options.dateRange!.start && entryDate <= options.dateRange!.end;
        });
      }

      if (!options.includeRefunds) {
        filteredData = filteredData.filter(entry => {
          const type = entry.transaction_type || entry.payment_type;
          return !['refund', 'partial_refund', 'credit_note'].includes(type);
        });
      }

      // Prepare CSV rows
      const rows = filteredData.map((entry) => [
        format(new Date(entry.created_at || entry.payment_date), 'yyyy-MM-dd HH:mm:ss'),
        entry.transaction_type || entry.payment_type || 'payment',
        entry.payment_method || '-',
        entry.gateway_code || '-',
        entry.amount?.toFixed(2) || '0.00',
        entry.currency || 'USD',
        entry.balance_after?.toFixed(2) || '0.00',
        entry.reference_number || entry.gateway_transaction_id || '-',
        entry.notes?.replace(/,/g, ';') || '-',
        entry.created_by_profile?.full_name || entry.created_by_profile?.email || 'System',
      ]);

      // Create CSV content
      const csvContent = [
        `Payment History for Order ${quoteDisplayId}`,
        `Generated on ${format(new Date(), 'yyyy-MM-dd HH:mm:ss')}`,
        `Records: ${filteredData.length}`,
        '',
        headers.join(','),
        ...rows.map((row) => row.join(',')),
      ].join('\n');

      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const filename = `payment_history_${quoteDisplayId}_${format(new Date(), 'yyyyMMdd')}.csv`;

      return {
        success: true,
        data: {
          url,
          filename,
          content: csvContent,
          recordCount: filteredData.length
        }
      };

    } catch (error) {
      logger.error('CSV export error:', error);
      return {
        success: false,
        error: 'Failed to generate CSV export'
      };
    }
  }

  /**
   * Export to JSON format
   */
  private exportToJSON(quoteDisplayId: string, paymentLedger: any[], options: ExportPaymentHistoryOptions): ActionResult {
    try {
      const exportData = {
        quote_id: quoteDisplayId,
        generated_at: new Date().toISOString(),
        export_options: options,
        payment_history: paymentLedger,
        summary: {
          total_records: paymentLedger.length,
          total_payments: paymentLedger.filter(e => (e.amount || 0) > 0).length,
          total_refunds: paymentLedger.filter(e => (e.amount || 0) < 0).length,
        }
      };

      const jsonContent = JSON.stringify(exportData, null, 2);
      const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const filename = `payment_history_${quoteDisplayId}_${format(new Date(), 'yyyyMMdd')}.json`;

      return {
        success: true,
        data: {
          url,
          filename,
          content: jsonContent,
          recordCount: paymentLedger.length
        }
      };

    } catch (error) {
      logger.error('JSON export error:', error);
      return {
        success: false,
        error: 'Failed to generate JSON export'
      };
    }
  }

  /**
   * Export to PDF format
   */
  private exportToPDF(quoteDisplayId: string, paymentLedger: any[], options: ExportPaymentHistoryOptions): ActionResult {
    // PDF export would require a PDF library like jsPDF
    // For now, return an error indicating it's not implemented
    return {
      success: false,
      error: 'PDF export not yet implemented. Please use CSV or JSON format.'
    };
  }

  /**
   * Sync payment status with external gateways
   */
  async syncPaymentStatus(quoteId: string): Promise<ActionResult> {
    try {
      logger.info('Syncing payment status for quote:', quoteId);

      // This would integrate with payment gateway webhooks or APIs
      // to check for recent payments that might not be reflected locally

      // For now, just return success
      return {
        success: true,
        data: {
          sync_timestamp: new Date().toISOString(),
          changes_detected: false
        }
      };

    } catch (error) {
      logger.error('Payment sync error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Payment sync failed'
      };
    }
  }

  /**
   * Validate payment gateway credentials
   */
  async validateGatewayCredentials(gateway: string): Promise<ActionResult> {
    try {
      logger.info('Validating gateway credentials:', gateway);

      // This would test API connections to payment gateways
      // For now, just return success

      return {
        success: true,
        data: {
          gateway,
          status: 'valid',
          last_checked: new Date().toISOString()
        }
      };

    } catch (error) {
      logger.error('Gateway validation error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Gateway validation failed'
      };
    }
  }

  /**
   * Generate payment summary report
   */
  generatePaymentSummaryReport(paymentLedger: any[], currency: string): {
    totalPayments: number;
    totalRefunds: number;
    netAmount: number;
    paymentMethods: Record<string, number>;
    currencyBreakdown: Record<string, number>;
    timeline: Array<{ date: string; amount: number; type: string }>;
  } {
    const report = {
      totalPayments: 0,
      totalRefunds: 0,
      netAmount: 0,
      paymentMethods: {} as Record<string, number>,
      currencyBreakdown: {} as Record<string, number>,
      timeline: [] as Array<{ date: string; amount: number; type: string }>
    };

    paymentLedger.forEach(entry => {
      const amount = parseFloat(entry.amount.toString()) || 0;
      const entryDate = entry.created_at || entry.payment_date;
      const method = entry.payment_method || 'unknown';
      const entryCurrency = entry.currency || currency;

      // Categorize by payment type
      if (amount > 0) {
        report.totalPayments += amount;
      } else {
        report.totalRefunds += Math.abs(amount);
      }

      // Payment methods breakdown
      if (!report.paymentMethods[method]) {
        report.paymentMethods[method] = 0;
      }
      report.paymentMethods[method] += Math.abs(amount);

      // Currency breakdown
      if (!report.currencyBreakdown[entryCurrency]) {
        report.currencyBreakdown[entryCurrency] = 0;
      }
      report.currencyBreakdown[entryCurrency] += amount;

      // Timeline entry
      report.timeline.push({
        date: entryDate,
        amount,
        type: amount > 0 ? 'payment' : 'refund'
      });
    });

    report.netAmount = report.totalPayments - report.totalRefunds;

    // Sort timeline by date
    report.timeline.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return report;
  }

  /**
   * Clean up old payment data
   */
  async cleanupOldData(retentionDays: number = 365): Promise<ActionResult> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      logger.info(`Cleaning up payment data older than ${cutoffDate.toISOString()}`);

      // This would clean up old cached data, temporary files, etc.
      // Implementation would depend on specific cleanup requirements

      return {
        success: true,
        data: {
          cleanup_date: new Date().toISOString(),
          cutoff_date: cutoffDate.toISOString(),
          records_cleaned: 0
        }
      };

    } catch (error) {
      logger.error('Cleanup error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Cleanup failed'
      };
    }
  }
}

export default PaymentActionsService;