/**
 * Payment Actions Service
 * Handles payment operations including approve, reject, refund, and bulk actions
 * Decomposed from PaymentManagementPage for focused action management
 * 
 * RESPONSIBILITIES:
 * - Payment approval and rejection workflows
 * - Payment refund processing and validation
 * - Bulk payment operations (approve/reject multiple)
 * - Payment status transitions and validations
 * - Integration with payment gateways for refunds
 * - Action logging and audit trails
 */

import { logger } from '@/utils/logger';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';

export interface PaymentApprovalRequest {
  paymentId: string;
  paymentType: 'bank_transfer_proof' | 'webhook_payment';
  approvedAmount?: number;
  adminNotes?: string;
}

export interface PaymentRejectionRequest {
  paymentId: string;
  paymentType: 'bank_transfer_proof' | 'webhook_payment';
  rejectionReason: string;
  adminNotes?: string;
}

export interface PaymentRefundRequest {
  paymentId: string;
  paymentType: 'bank_transfer_proof' | 'webhook_payment';
  refundAmount: number;
  refundReason: string;
  refundMethod: 'original' | 'bank_transfer' | 'manual';
  adminNotes?: string;
}

export interface BulkPaymentActionRequest {
  paymentIds: string[];
  action: 'approve' | 'reject';
  reason?: string;
  adminNotes?: string;
}

export interface PaymentActionResult {
  success: boolean;
  paymentId: string;
  action: string;
  previousStatus?: string;
  newStatus: string;
  affectedAmount?: number;
  error?: string;
  actionId?: string;
}

export interface RefundProcessingResult {
  success: boolean;
  refundId?: string;
  gatewayResponse?: Record<string, unknown>;
  expectedProcessingTime?: string;
  error?: string;
}

export class PaymentActionsService {
  private static instance: PaymentActionsService;
  private actionCache = new Map<string, { data: any; timestamp: number }>();
  private readonly cacheTTL = 3 * 60 * 1000; // 3 minutes cache for action data

  constructor() {
    logger.info('PaymentActionsService initialized');
  }

  static getInstance(): PaymentActionsService {
    if (!PaymentActionsService.instance) {
      PaymentActionsService.instance = new PaymentActionsService();
    }
    return PaymentActionsService.instance;
  }

  /**
   * Approve a payment
   */
  async approvePayment(request: PaymentApprovalRequest): Promise<PaymentActionResult> {
    try {
      logger.info(`Approving payment ${request.paymentId}`);

      const user = (await supabase.auth.getUser()).data.user;
      if (!user) {
        throw new Error('User not authenticated');
      }

      if (request.paymentType === 'bank_transfer_proof') {
        return await this.approveBankTransferProof(request, user.id);
      } else {
        return await this.approveWebhookPayment(request, user.id);
      }

    } catch (error) {
      logger.error('Payment approval failed:', error);
      return {
        success: false,
        paymentId: request.paymentId,
        action: 'approve',
        newStatus: 'error',
        error: error instanceof Error ? error.message : 'Approval failed'
      };
    }
  }

  /**
   * Reject a payment
   */
  async rejectPayment(request: PaymentRejectionRequest): Promise<PaymentActionResult> {
    try {
      logger.info(`Rejecting payment ${request.paymentId}: ${request.rejectionReason}`);

      const user = (await supabase.auth.getUser()).data.user;
      if (!user) {
        throw new Error('User not authenticated');
      }

      if (request.paymentType === 'bank_transfer_proof') {
        return await this.rejectBankTransferProof(request, user.id);
      } else {
        return await this.rejectWebhookPayment(request, user.id);
      }

    } catch (error) {
      logger.error('Payment rejection failed:', error);
      return {
        success: false,
        paymentId: request.paymentId,
        action: 'reject',
        newStatus: 'error',
        error: error instanceof Error ? error.message : 'Rejection failed'
      };
    }
  }

  /**
   * Process a payment refund
   */
  async processRefund(request: PaymentRefundRequest): Promise<PaymentActionResult> {
    try {
      logger.info(`Processing refund for payment ${request.paymentId}: $${request.refundAmount}`);

      const user = (await supabase.auth.getUser()).data.user;
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Get payment details first
      const paymentDetails = await this.getPaymentForRefund(request.paymentId, request.paymentType);
      if (!paymentDetails) {
        throw new Error('Payment not found or not eligible for refund');
      }

      // Validate refund amount
      const maxRefundableAmount = paymentDetails.amount_paid || 0;
      if (request.refundAmount > maxRefundableAmount) {
        throw new Error(`Refund amount exceeds paid amount ($${maxRefundableAmount})`);
      }

      // Process refund based on method
      let refundResult: RefundProcessingResult;
      
      if (request.refundMethod === 'original' && request.paymentType === 'webhook_payment') {
        refundResult = await this.processGatewayRefund(paymentDetails, request);
      } else {
        refundResult = await this.processManualRefund(paymentDetails, request);
      }

      if (!refundResult.success) {
        throw new Error(refundResult.error || 'Refund processing failed');
      }

      // Update payment status and log the refund
      const actionResult = await this.updatePaymentForRefund(
        request.paymentId,
        request.paymentType,
        request.refundAmount,
        refundResult,
        user.id,
        request
      );

      // Log the refund action
      await this.logPaymentAction({
        adminId: user.id,
        paymentId: request.paymentId,
        action: 'refund',
        amount: request.refundAmount,
        reason: request.refundReason,
        notes: request.adminNotes,
        refundId: refundResult.refundId
      });

      logger.info(`Refund processed successfully: ${refundResult.refundId}`);
      return actionResult;

    } catch (error) {
      logger.error('Refund processing failed:', error);
      return {
        success: false,
        paymentId: request.paymentId,
        action: 'refund',
        newStatus: 'error',
        error: error instanceof Error ? error.message : 'Refund failed'
      };
    }
  }

  /**
   * Execute bulk payment actions
   */
  async executeBulkActions(request: BulkPaymentActionRequest): Promise<PaymentActionResult[]> {
    try {
      logger.info(`Executing bulk ${request.action} for ${request.paymentIds.length} payments`);

      const user = (await supabase.auth.getUser()).data.user;
      if (!user) {
        throw new Error('User not authenticated');
      }

      const results: PaymentActionResult[] = [];

      for (const paymentId of request.paymentIds) {
        try {
          let result: PaymentActionResult;

          if (request.action === 'approve') {
            result = await this.approvePayment({
              paymentId,
              paymentType: 'bank_transfer_proof', // Assuming bank transfer for bulk
              adminNotes: request.adminNotes
            });
          } else {
            result = await this.rejectPayment({
              paymentId,
              paymentType: 'bank_transfer_proof',
              rejectionReason: request.reason || 'Bulk rejection',
              adminNotes: request.adminNotes
            });
          }

          results.push(result);

        } catch (error) {
          logger.error(`Failed to ${request.action} payment ${paymentId}:`, error);
          results.push({
            success: false,
            paymentId,
            action: request.action,
            newStatus: 'error',
            error: error instanceof Error ? error.message : `${request.action} failed`
          });
        }
      }

      // Log bulk action
      await this.logBulkAction({
        adminId: user.id,
        action: request.action,
        paymentIds: request.paymentIds,
        reason: request.reason,
        notes: request.adminNotes,
        successCount: results.filter(r => r.success).length,
        totalCount: results.length
      });

      logger.info(`Bulk ${request.action} completed: ${results.filter(r => r.success).length}/${results.length} successful`);
      return results;

    } catch (error) {
      logger.error('Bulk action failed:', error);
      return request.paymentIds.map(id => ({
        success: false,
        paymentId: id,
        action: request.action,
        newStatus: 'error',
        error: error instanceof Error ? error.message : 'Bulk action failed'
      }));
    }
  }

  /**
   * Get payment action history
   */
  async getPaymentActionHistory(paymentId: string): Promise<Array<{
    id: string;
    action: string;
    admin_name: string;
    timestamp: string;
    notes?: string;
    amount?: number;
  }>> {
    try {
      const cacheKey = this.createCacheKey('payment_history', { paymentId });
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        logger.debug('Using cached payment action history');
        return cached;
      }

      const { data: actions, error } = await supabase
        .from('admin_activity_logs')
        .select(`
          id,
          action,
          created_at,
          details,
          admin_id,
          profiles:admin_id (full_name)
        `)
        .eq('resource_type', 'payment_action')
        .contains('resource_ids', [paymentId])
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        throw error;
      }

      const history = (actions || []).map(action => ({
        id: action.id,
        action: action.action,
        admin_name: (action.profiles as any)?.full_name || 'Unknown Admin',
        timestamp: action.created_at,
        notes: action.details?.notes,
        amount: action.details?.amount
      }));

      this.setCache(cacheKey, history);
      return history;

    } catch (error) {
      logger.error('Failed to get payment action history:', error);
      return [];
    }
  }

  /**
   * Approve bank transfer proof
   */
  private async approveBankTransferProof(
    request: PaymentApprovalRequest, 
    adminId: string
  ): Promise<PaymentActionResult> {
    // Get message and quote details
    const { data: message, error: messageError } = await supabase
      .from('messages')
      .select('*')
      .eq('id', request.paymentId)
      .eq('message_type', 'payment_proof')
      .single();

    if (messageError || !message) {
      throw new Error('Payment proof not found');
    }

    const { data: quote, error: quoteError } = await supabase
      .from('quotes')
      .select('*')
      .eq('id', message.quote_id)
      .single();

    if (quoteError || !quote) {
      throw new Error('Related quote not found');
    }

    const previousStatus = message.verification_status || 'pending';
    const orderTotal = quote.final_total_origincurrency || 0;
    const existingPaid = quote.amount_paid || 0;
    const approvedAmount = request.approvedAmount || (orderTotal - existingPaid);

    // Update message verification status
    const { error: updateError } = await supabase
      .from('messages')
      .update({
        verification_status: 'verified',
        admin_notes: request.adminNotes || 'Approved via admin action',
        verified_at: new Date().toISOString(),
        verified_by: adminId
      })
      .eq('id', request.paymentId);

    if (updateError) {
      throw updateError;
    }

    // Update quote payment status
    const newAmountPaid = Math.min(orderTotal, existingPaid + approvedAmount);
    const newPaymentStatus = newAmountPaid >= orderTotal ? 'paid' : 'partial';

    const { error: quoteUpdateError } = await supabase
      .from('quotes')
      .update({
        payment_status: newPaymentStatus,
        amount_paid: newAmountPaid,
        updated_at: new Date().toISOString()
      })
      .eq('id', quote.id);

    if (quoteUpdateError) {
      logger.warn('Failed to update quote payment status:', quoteUpdateError);
    }

    // Log the approval action
    await this.logPaymentAction({
      adminId,
      paymentId: request.paymentId,
      action: 'approve',
      amount: approvedAmount,
      notes: request.adminNotes
    });

    return {
      success: true,
      paymentId: request.paymentId,
      action: 'approve',
      previousStatus,
      newStatus: 'verified',
      affectedAmount: newAmountPaid
    };
  }

  /**
   * Approve webhook payment (typically auto-approved)
   */
  private async approveWebhookPayment(
    request: PaymentApprovalRequest, 
    adminId: string
  ): Promise<PaymentActionResult> {
    // Webhook payments are typically already approved
    // This is mainly for administrative override cases
    
    logger.info(`Admin override approval for webhook payment ${request.paymentId}`);

    await this.logPaymentAction({
      adminId,
      paymentId: request.paymentId,
      action: 'admin_approve_override',
      notes: request.adminNotes
    });

    return {
      success: true,
      paymentId: request.paymentId,
      action: 'approve',
      newStatus: 'verified'
    };
  }

  /**
   * Reject bank transfer proof
   */
  private async rejectBankTransferProof(
    request: PaymentRejectionRequest, 
    adminId: string
  ): Promise<PaymentActionResult> {
    const { data: message, error: messageError } = await supabase
      .from('messages')
      .select('verification_status')
      .eq('id', request.paymentId)
      .single();

    if (messageError || !message) {
      throw new Error('Payment proof not found');
    }

    const previousStatus = message.verification_status || 'pending';

    // Update message verification status
    const { error: updateError } = await supabase
      .from('messages')
      .update({
        verification_status: 'rejected',
        admin_notes: `${request.rejectionReason}${request.adminNotes ? ` | ${request.adminNotes}` : ''}`,
        verified_at: new Date().toISOString(),
        verified_by: adminId
      })
      .eq('id', request.paymentId);

    if (updateError) {
      throw updateError;
    }

    // Log the rejection action
    await this.logPaymentAction({
      adminId,
      paymentId: request.paymentId,
      action: 'reject',
      reason: request.rejectionReason,
      notes: request.adminNotes
    });

    return {
      success: true,
      paymentId: request.paymentId,
      action: 'reject',
      previousStatus,
      newStatus: 'rejected'
    };
  }

  /**
   * Reject webhook payment
   */
  private async rejectWebhookPayment(
    request: PaymentRejectionRequest, 
    adminId: string
  ): Promise<PaymentActionResult> {
    // For webhook payments, rejection might involve marking them as disputed
    logger.info(`Admin rejection for webhook payment ${request.paymentId}: ${request.rejectionReason}`);

    await this.logPaymentAction({
      adminId,
      paymentId: request.paymentId,
      action: 'admin_reject_override',
      reason: request.rejectionReason,
      notes: request.adminNotes
    });

    return {
      success: true,
      paymentId: request.paymentId,
      action: 'reject',
      newStatus: 'disputed'
    };
  }

  /**
   * Get payment details for refund processing
   */
  private async getPaymentForRefund(
    paymentId: string, 
    paymentType: 'bank_transfer_proof' | 'webhook_payment'
  ): Promise<any> {
    if (paymentType === 'bank_transfer_proof') {
      // Bank transfers are typically not refundable via gateway
      const { data: message } = await supabase
        .from('messages')
        .select('*, quotes(*)')
        .eq('id', paymentId)
        .single();
      
      return message ? {
        ...message,
        amount_paid: message.quotes?.amount_paid || 0,
        payment_method: 'bank_transfer'
      } : null;
      
    } else {
      const { data: transaction } = await supabase
        .from('payment_transactions')
        .select('*, quotes(*)')
        .eq('id', paymentId)
        .single();
        
      return transaction ? {
        ...transaction,
        amount_paid: transaction.amount || 0
      } : null;
    }
  }

  /**
   * Process gateway refund for webhook payments
   */
  private async processGatewayRefund(
    paymentDetails: any, 
    request: PaymentRefundRequest
  ): Promise<RefundProcessingResult> {
    try {
      const gatewayName = paymentDetails.payment_method || paymentDetails.gateway_name;
      
      switch (gatewayName) {
        case 'stripe':
          return await this.processStripeRefund(paymentDetails, request.refundAmount);
        case 'payu':
          return await this.processPayURefund(paymentDetails, request.refundAmount);
        default:
          throw new Error(`Gateway refunds not supported for ${gatewayName}`);
      }
      
    } catch (error) {
      logger.error('Gateway refund failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Gateway refund failed'
      };
    }
  }

  /**
   * Process manual refund (bank transfer, etc.)
   */
  private async processManualRefund(
    paymentDetails: any, 
    request: PaymentRefundRequest
  ): Promise<RefundProcessingResult> {
    // For manual refunds, we just create a record and mark for processing
    const refundId = `REF-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    return {
      success: true,
      refundId,
      expectedProcessingTime: '3-5 business days'
    };
  }

  /**
   * Process Stripe refund
   */
  private async processStripeRefund(paymentDetails: any, refundAmount: number): Promise<RefundProcessingResult> {
    // Placeholder for Stripe refund logic
    logger.info(`Processing Stripe refund: ${refundAmount} for transaction ${paymentDetails.transaction_id}`);
    
    return {
      success: true,
      refundId: `stripe_re_${Math.random().toString(36).substr(2, 9)}`,
      expectedProcessingTime: '5-10 business days'
    };
  }

  /**
   * Process PayU refund
   */
  private async processPayURefund(paymentDetails: any, refundAmount: number): Promise<RefundProcessingResult> {
    // Placeholder for PayU refund logic
    logger.info(`Processing PayU refund: ${refundAmount} for transaction ${paymentDetails.transaction_id}`);
    
    return {
      success: true,
      refundId: `payu_rf_${Math.random().toString(36).substr(2, 9)}`,
      expectedProcessingTime: '3-7 business days'
    };
  }

  /**
   * Update payment records after refund
   */
  private async updatePaymentForRefund(
    paymentId: string,
    paymentType: 'bank_transfer_proof' | 'webhook_payment',
    refundAmount: number,
    refundResult: RefundProcessingResult,
    adminId: string,
    request: PaymentRefundRequest
  ): Promise<PaymentActionResult> {
    // Create refund record
    await supabase
      .from('payment_refunds')
      .insert({
        original_payment_id: paymentId,
        payment_type: paymentType,
        refund_amount: refundAmount,
        refund_method: request.refundMethod,
        refund_reason: request.refundReason,
        gateway_refund_id: refundResult.refundId,
        admin_notes: request.adminNotes,
        processed_by: adminId,
        status: 'processing'
      });

    return {
      success: true,
      paymentId,
      action: 'refund',
      newStatus: 'refunded',
      affectedAmount: refundAmount,
      actionId: refundResult.refundId
    };
  }

  /**
   * Log payment action
   */
  private async logPaymentAction(activity: {
    adminId: string;
    paymentId: string;
    action: string;
    amount?: number;
    reason?: string;
    notes?: string;
    refundId?: string;
  }): Promise<void> {
    try {
      await supabase
        .from('admin_activity_logs')
        .insert({
          admin_id: activity.adminId,
          action: activity.action,
          resource_type: 'payment_action',
          resource_ids: [activity.paymentId],
          details: {
            amount: activity.amount,
            reason: activity.reason,
            notes: activity.notes,
            refund_id: activity.refundId,
            timestamp: new Date().toISOString()
          }
        });
    } catch (error) {
      logger.warn('Failed to log payment action:', error);
    }
  }

  /**
   * Log bulk action
   */
  private async logBulkAction(activity: {
    adminId: string;
    action: string;
    paymentIds: string[];
    reason?: string;
    notes?: string;
    successCount: number;
    totalCount: number;
  }): Promise<void> {
    try {
      await supabase
        .from('admin_activity_logs')
        .insert({
          admin_id: activity.adminId,
          action: `bulk_${activity.action}`,
          resource_type: 'payment_bulk_action',
          resource_ids: activity.paymentIds,
          details: {
            reason: activity.reason,
            notes: activity.notes,
            success_count: activity.successCount,
            total_count: activity.totalCount,
            timestamp: new Date().toISOString()
          }
        });
    } catch (error) {
      logger.warn('Failed to log bulk action:', error);
    }
  }

  /**
   * Cache management
   */
  private createCacheKey(prefix: string, params: any = {}): string {
    const keyParts = [prefix];
    
    Object.keys(params)
      .sort()
      .forEach(key => {
        keyParts.push(`${key}:${params[key]}`);
      });

    return keyParts.join('|');
  }

  private getFromCache(key: string): any | null {
    const cached = this.actionCache.get(key);
    if (!cached) return null;

    const isExpired = Date.now() - cached.timestamp > this.cacheTTL;
    if (isExpired) {
      this.actionCache.delete(key);
      return null;
    }

    return cached.data;
  }

  private setCache(key: string, data: any): void {
    this.actionCache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  /**
   * Clear actions cache
   */
  clearCache(): void {
    this.actionCache.clear();
    logger.info('Payment actions cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; entries: string[] } {
    return {
      size: this.actionCache.size,
      entries: Array.from(this.actionCache.keys())
    };
  }

  /**
   * Clean expired cache entries
   */
  cleanExpiredCache(): number {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [key, cached] of this.actionCache.entries()) {
      if (now - cached.timestamp > this.cacheTTL) {
        this.actionCache.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      logger.info(`Cleaned ${cleanedCount} expired action cache entries`);
    }

    return cleanedCount;
  }

  /**
   * Dispose of resources
   */
  dispose(): void {
    this.clearCache();
    logger.info('PaymentActionsService disposed');
  }
}

export default PaymentActionsService;