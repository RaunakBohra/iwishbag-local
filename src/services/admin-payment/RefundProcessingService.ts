/**
 * Refund Processing Service
 * Handles refund workflows, calculations, and payment gateway integrations
 * Extracted from UnifiedPaymentModal for clean refund management
 * 
 * RESPONSIBILITIES:
 * - Refund eligibility validation and calculations
 * - Gateway refund processing (PayU, Stripe, etc.)
 * - Refund status tracking and workflow management
 * - Partial and full refund support
 * - Refund approval workflows and admin controls
 * - Customer communication and notifications
 * - Refund analytics and reporting
 * - Integration with ledger service for balance updates
 */

import { logger } from '@/utils/logger';
import { supabase } from '@/integrations/supabase/client';

export interface RefundRequest {
  id: string;
  quote_id: string;
  payment_id: string;
  requested_amount: number;
  refund_reason: string;
  refund_type: RefundType;
  status: RefundStatus;
  requested_by: string;
  approved_by?: string;
  processed_by?: string;
  gateway_refund_id?: string;
  gateway_response?: Record<string, unknown>;
  created_at: string;
  approved_at?: string;
  processed_at?: string;
  completed_at?: string;
  notes?: string;
  customer_notification_sent?: boolean;
  admin_notes?: string;
}

export enum RefundType {
  FULL = 'full',
  PARTIAL = 'partial',
  PROCESSING_FEE_ONLY = 'processing_fee_only'
}

export enum RefundStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

export enum RefundReason {
  CUSTOMER_REQUEST = 'customer_request',
  ORDER_CANCELLATION = 'order_cancellation',
  PRODUCT_UNAVAILABLE = 'product_unavailable',
  SHIPPING_ISSUE = 'shipping_issue',
  QUALITY_ISSUE = 'quality_issue',
  DUPLICATE_PAYMENT = 'duplicate_payment',
  ADMIN_ADJUSTMENT = 'admin_adjustment',
  SYSTEM_ERROR = 'system_error',
  OTHER = 'other'
}

export interface CreateRefundInput {
  quote_id: string;
  payment_id: string;
  amount: number;
  refund_type: RefundType;
  reason: RefundReason;
  customer_reason?: string;
  requested_by: string;
  requires_approval?: boolean;
  auto_process?: boolean;
}

export interface ApproveRefundInput {
  refund_id: string;
  approved_by: string;
  approved_amount?: number;
  admin_notes?: string;
  auto_process?: boolean;
}

export interface ProcessRefundInput {
  refund_id: string;
  processed_by: string;
  gateway_method?: 'auto' | 'manual';
  processing_notes?: string;
}

export interface RefundEligibility {
  isEligible: boolean;
  maxRefundAmount: number;
  reasons: string[];
  restrictions: string[];
  processingFee?: number;
  eligiblePayments: Array<{
    payment_id: string;
    amount: number;
    payment_method: string;
    created_at: string;
  }>;
}

export interface RefundAnalytics {
  totalRefunds: number;
  totalRefundAmount: number;
  averageRefundAmount: number;
  refundRate: number;
  processingTimeAverage: number;
  refundsByReason: Record<RefundReason, number>;
  refundsByMethod: Record<string, { count: number; amount: number }>;
  monthlyTrends: Array<{ month: string; count: number; amount: number }>;
}

export class RefundProcessingService {
  private static instance: RefundProcessingService;
  private refundCache = new Map<string, { data: RefundRequest[]; timestamp: number }>();
  private eligibilityCache = new Map<string, { eligibility: RefundEligibility; timestamp: number }>();
  private readonly cacheTTL = 5 * 60 * 1000; // 5 minutes

  constructor() {
    logger.info('RefundProcessingService initialized');
  }

  static getInstance(): RefundProcessingService {
    if (!RefundProcessingService.instance) {
      RefundProcessingService.instance = new RefundProcessingService();
    }
    return RefundProcessingService.instance;
  }

  /**
   * Check refund eligibility for a quote
   */
  async checkRefundEligibility(quoteId: string, forceRefresh: boolean = false): Promise<RefundEligibility> {
    try {
      // Check cache first
      if (!forceRefresh) {
        const cached = this.getEligibilityFromCache(quoteId);
        if (cached) {
          logger.debug('Refund eligibility cache hit for quote:', quoteId);
          return cached;
        }
      }

      logger.info('Checking refund eligibility for quote:', quoteId);

      // Get quote details
      const { data: quote, error: quoteError } = await supabase
        .from('quotes_v2')
        .select('*')
        .eq('id', quoteId)
        .single();

      if (quoteError) throw quoteError;

      // Get payment history
      const { data: payments, error: paymentsError } = await supabase
        .from('payment_transactions')
        .select('*')
        .eq('quote_id', quoteId)
        .eq('status', 'completed')
        .order('created_at', { ascending: false });

      if (paymentsError) throw paymentsError;

      // Get existing refunds
      const { data: existingRefunds, error: refundsError } = await supabase
        .from('refund_requests')
        .select('*')
        .eq('quote_id', quoteId)
        .in('status', [RefundStatus.APPROVED, RefundStatus.PROCESSING, RefundStatus.COMPLETED]);

      if (refundsError && refundsError.code !== 'PGRST116') {
        throw refundsError;
      }

      // Calculate eligibility
      const eligibility = this.calculateRefundEligibility(quote, payments || [], existingRefunds || []);

      // Cache the result
      this.setEligibilityCache(quoteId, eligibility);

      return eligibility;

    } catch (error) {
      logger.error('Failed to check refund eligibility:', error);
      throw error;
    }
  }

  /**
   * Create a refund request
   */
  async createRefundRequest(refundData: CreateRefundInput): Promise<RefundRequest> {
    try {
      logger.info('Creating refund request:', { 
        quote_id: refundData.quote_id, 
        amount: refundData.amount,
        reason: refundData.reason
      });

      // Check eligibility first
      const eligibility = await this.checkRefundEligibility(refundData.quote_id);
      if (!eligibility.isEligible) {
        throw new Error(`Refund not eligible: ${eligibility.reasons.join(', ')}`);
      }

      if (refundData.amount > eligibility.maxRefundAmount) {
        throw new Error(`Refund amount exceeds maximum allowed: ${eligibility.maxRefundAmount}`);
      }

      // Validate payment exists and is refundable
      const payment = eligibility.eligiblePayments.find(p => p.payment_id === refundData.payment_id);
      if (!payment) {
        throw new Error('Payment not found or not eligible for refund');
      }

      // Determine initial status
      const initialStatus = refundData.requires_approval !== false ? RefundStatus.PENDING : RefundStatus.APPROVED;

      // Create refund request
      const refundRequestData = {
        quote_id: refundData.quote_id,
        payment_id: refundData.payment_id,
        requested_amount: refundData.amount,
        refund_reason: refundData.reason,
        refund_type: refundData.refund_type,
        status: initialStatus,
        requested_by: refundData.requested_by,
        notes: refundData.customer_reason,
        created_at: new Date().toISOString()
      };

      // Auto-approve if configured
      if (initialStatus === RefundStatus.APPROVED) {
        refundRequestData['approved_by'] = refundData.requested_by;
        refundRequestData['approved_at'] = new Date().toISOString();
      }

      const { data: savedRefund, error } = await supabase
        .from('refund_requests')
        .insert(refundRequestData)
        .select('*')
        .single();

      if (error) throw error;

      // Clear caches
      this.clearQuoteCache(refundData.quote_id);
      this.clearEligibilityCache(refundData.quote_id);

      // Send notifications
      await this.sendRefundNotifications(savedRefund, 'created');

      // Auto-process if configured
      if (refundData.auto_process && savedRefund.status === RefundStatus.APPROVED) {
        await this.processRefund({
          refund_id: savedRefund.id,
          processed_by: refundData.requested_by,
          gateway_method: 'auto'
        });
      }

      // Log the request
      await this.logRefundActivity({
        refund_id: savedRefund.id,
        quote_id: refundData.quote_id,
        action: 'refund_requested',
        user_id: refundData.requested_by,
        details: { amount: refundData.amount, reason: refundData.reason }
      });

      logger.info('Refund request created successfully:', savedRefund.id);
      return savedRefund;

    } catch (error) {
      logger.error('Failed to create refund request:', error);
      throw error;
    }
  }

  /**
   * Approve refund request (admin action)
   */
  async approveRefund(approvalData: ApproveRefundInput): Promise<RefundRequest> {
    try {
      logger.info('Approving refund request:', approvalData.refund_id);

      // Get current refund
      const { data: currentRefund, error: fetchError } = await supabase
        .from('refund_requests')
        .select('*')
        .eq('id', approvalData.refund_id)
        .single();

      if (fetchError) throw fetchError;

      if (currentRefund.status !== RefundStatus.PENDING) {
        throw new Error(`Cannot approve refund with status: ${currentRefund.status}`);
      }

      // Update refund status
      const updateData = {
        status: RefundStatus.APPROVED,
        approved_by: approvalData.approved_by,
        approved_at: new Date().toISOString(),
        admin_notes: approvalData.admin_notes,
        updated_at: new Date().toISOString()
      };

      // Update approved amount if provided
      if (approvalData.approved_amount && approvalData.approved_amount !== currentRefund.requested_amount) {
        updateData['approved_amount'] = approvalData.approved_amount;
      }

      const { data: approvedRefund, error } = await supabase
        .from('refund_requests')
        .update(updateData)
        .eq('id', approvalData.refund_id)
        .select('*')
        .single();

      if (error) throw error;

      // Clear caches
      this.clearQuoteCache(approvedRefund.quote_id);

      // Send notifications
      await this.sendRefundNotifications(approvedRefund, 'approved');

      // Auto-process if requested
      if (approvalData.auto_process) {
        await this.processRefund({
          refund_id: approvedRefund.id,
          processed_by: approvalData.approved_by,
          gateway_method: 'auto'
        });
      }

      // Log the approval
      await this.logRefundActivity({
        refund_id: approvedRefund.id,
        quote_id: approvedRefund.quote_id,
        action: 'refund_approved',
        user_id: approvalData.approved_by,
        details: { approved_amount: approvalData.approved_amount }
      });

      logger.info('Refund request approved successfully');
      return approvedRefund;

    } catch (error) {
      logger.error('Failed to approve refund request:', error);
      throw error;
    }
  }

  /**
   * Process approved refund through payment gateway
   */
  async processRefund(processData: ProcessRefundInput): Promise<RefundRequest> {
    try {
      logger.info('Processing refund:', processData.refund_id);

      // Get current refund
      const { data: currentRefund, error: fetchError } = await supabase
        .from('refund_requests')
        .select('*')
        .eq('id', processData.refund_id)
        .single();

      if (fetchError) throw fetchError;

      if (currentRefund.status !== RefundStatus.APPROVED) {
        throw new Error(`Cannot process refund with status: ${currentRefund.status}`);
      }

      // Update status to processing
      await supabase
        .from('refund_requests')
        .update({
          status: RefundStatus.PROCESSING,
          processed_by: processData.processed_by,
          processed_at: new Date().toISOString()
        })
        .eq('id', processData.refund_id);

      // Get original payment details
      const { data: originalPayment, error: paymentError } = await supabase
        .from('payment_transactions')
        .select('*')
        .eq('id', currentRefund.payment_id)
        .single();

      if (paymentError) throw paymentError;

      // Process through appropriate gateway
      let gatewayResponse: any;
      try {
        gatewayResponse = await this.processGatewayRefund(
          originalPayment,
          currentRefund.approved_amount || currentRefund.requested_amount,
          processData.gateway_method || 'auto'
        );

        // Update with successful completion
        const { data: completedRefund, error: updateError } = await supabase
          .from('refund_requests')
          .update({
            status: RefundStatus.COMPLETED,
            gateway_refund_id: gatewayResponse.refund_id,
            gateway_response: gatewayResponse,
            completed_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', processData.refund_id)
          .select('*')
          .single();

        if (updateError) throw updateError;

        // Record refund transaction in ledger
        await this.recordRefundTransaction(completedRefund, originalPayment);

        // Send completion notifications
        await this.sendRefundNotifications(completedRefund, 'completed');

        logger.info('Refund processed successfully');
        return completedRefund;

      } catch (gatewayError) {
        // Update with failure status
        await supabase
          .from('refund_requests')
          .update({
            status: RefundStatus.FAILED,
            gateway_response: { error: gatewayError.message },
            updated_at: new Date().toISOString()
          })
          .eq('id', processData.refund_id);

        throw gatewayError;
      }

    } catch (error) {
      logger.error('Failed to process refund:', error);
      throw error;
    }
  }

  /**
   * Get refund requests for a quote
   */
  async getRefundRequests(quoteId: string, forceRefresh: boolean = false): Promise<RefundRequest[]> {
    try {
      // Check cache first
      if (!forceRefresh) {
        const cached = this.getFromCache(quoteId);
        if (cached) {
          logger.debug('Refund requests cache hit for quote:', quoteId);
          return cached;
        }
      }

      const { data: refunds, error } = await supabase
        .from('refund_requests')
        .select('*')
        .eq('quote_id', quoteId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Cache the result
      this.setCache(quoteId, refunds || []);

      return refunds || [];

    } catch (error) {
      logger.error('Failed to get refund requests:', error);
      throw error;
    }
  }

  /**
   * Get refund analytics
   */
  async getRefundAnalytics(dateFrom: string, dateTo: string): Promise<RefundAnalytics> {
    try {
      const { data: refunds, error } = await supabase
        .from('refund_requests')
        .select('*')
        .gte('created_at', dateFrom)
        .lte('created_at', dateTo);

      if (error) throw error;

      const analytics = this.calculateRefundAnalytics(refunds || []);
      logger.info('Refund analytics calculated for date range');

      return analytics;

    } catch (error) {
      logger.error('Failed to get refund analytics:', error);
      throw error;
    }
  }

  /**
   * Private helper methods
   */
  private calculateRefundEligibility(
    quote: any,
    payments: any[],
    existingRefunds: any[]
  ): RefundEligibility {
    const eligiblePayments = payments.filter(payment => {
      // Only successful payments are eligible
      if (payment.status !== 'completed') return false;
      
      // Check if payment hasn't been fully refunded
      const refundedAmount = existingRefunds
        .filter(r => r.payment_id === payment.id && r.status === RefundStatus.COMPLETED)
        .reduce((sum, r) => sum + (r.approved_amount || r.requested_amount), 0);
      
      return payment.amount > refundedAmount;
    });

    const totalPaid = eligiblePayments.reduce((sum, p) => sum + p.amount, 0);
    const totalRefunded = existingRefunds
      .filter(r => r.status === RefundStatus.COMPLETED)
      .reduce((sum, r) => sum + (r.approved_amount || r.requested_amount), 0);

    const maxRefundAmount = totalPaid - totalRefunded;

    const reasons: string[] = [];
    const restrictions: string[] = [];

    if (eligiblePayments.length === 0) {
      reasons.push('No eligible payments found');
    }

    if (maxRefundAmount <= 0) {
      reasons.push('All payments have already been refunded');
    }

    // Add business rule checks
    const daysSinceLastPayment = eligiblePayments.length > 0 
      ? (Date.now() - new Date(eligiblePayments[0].created_at).getTime()) / (1000 * 60 * 60 * 24)
      : 0;

    if (daysSinceLastPayment > 365) {
      restrictions.push('Payment is older than 1 year - manual approval required');
    }

    return {
      isEligible: maxRefundAmount > 0 && eligiblePayments.length > 0,
      maxRefundAmount,
      reasons,
      restrictions,
      processingFee: this.calculateProcessingFee(maxRefundAmount),
      eligiblePayments: eligiblePayments.map(p => ({
        payment_id: p.id,
        amount: p.amount,
        payment_method: p.payment_method,
        created_at: p.created_at
      }))
    };
  }

  private calculateProcessingFee(amount: number): number {
    // Example processing fee calculation
    const feePercentage = 0.029; // 2.9%
    const fixedFee = 0.30;
    return Math.min(amount * feePercentage + fixedFee, 50); // Cap at $50
  }

  private async processGatewayRefund(
    originalPayment: any,
    refundAmount: number,
    method: string
  ): Promise<any> {
    // This would integrate with actual payment gateways
    logger.info('Processing gateway refund:', {
      payment_method: originalPayment.payment_method,
      amount: refundAmount,
      method
    });

    // Mock gateway processing
    await new Promise(resolve => setTimeout(resolve, 2000));

    return {
      refund_id: `ref_${Date.now()}`,
      status: 'succeeded',
      amount: refundAmount,
      gateway: originalPayment.payment_method,
      processed_at: new Date().toISOString()
    };
  }

  private async recordRefundTransaction(refund: RefundRequest, originalPayment: any): Promise<void> {
    try {
      const refundTransaction = {
        quote_id: refund.quote_id,
        payment_type: 'refund',
        transaction_type: 'refund',
        payment_method: originalPayment.payment_method,
        amount: -(refund.approved_amount || refund.requested_amount), // Negative amount for refunds
        currency: originalPayment.currency || 'USD',
        status: 'completed',
        reference_number: refund.gateway_refund_id,
        gateway_transaction_id: refund.gateway_refund_id,
        notes: `Refund for payment ${originalPayment.id}`,
        created_by: refund.processed_by,
        gateway_response: refund.gateway_response,
        created_at: new Date().toISOString()
      };

      await supabase
        .from('payment_transactions')
        .insert(refundTransaction);

      logger.info('Refund transaction recorded in ledger');

    } catch (error) {
      logger.error('Failed to record refund transaction:', error);
      // Don't throw, as the refund has already been processed
    }
  }

  private async sendRefundNotifications(refund: RefundRequest, event: string): Promise<void> {
    try {
      logger.info(`Sending refund notification: ${event} for refund ${refund.id}`);
      
      // TODO: Integrate with notification service
      // await notificationService.sendRefundNotification({
      //   refund_id: refund.id,
      //   quote_id: refund.quote_id,
      //   event,
      //   recipient: refund.requested_by
      // });

    } catch (error) {
      logger.error('Failed to send refund notifications:', error);
    }
  }

  private async logRefundActivity(activity: {
    refund_id: string;
    quote_id: string;
    action: string;
    user_id?: string;
    details?: any;
  }): Promise<void> {
    try {
      await supabase
        .from('refund_activity_logs')
        .insert({
          ...activity,
          timestamp: new Date().toISOString()
        });
    } catch (error) {
      logger.error('Failed to log refund activity:', error);
    }
  }

  private calculateRefundAnalytics(refunds: any[]): RefundAnalytics {
    const totalRefunds = refunds.length;
    const completedRefunds = refunds.filter(r => r.status === RefundStatus.COMPLETED);
    const totalRefundAmount = completedRefunds.reduce((sum, r) => sum + (r.approved_amount || r.requested_amount), 0);
    const averageRefundAmount = completedRefunds.length > 0 ? totalRefundAmount / completedRefunds.length : 0;

    // Calculate processing time for completed refunds
    const refundsWithProcessingTime = completedRefunds.filter(r => r.created_at && r.completed_at);
    const processingTimeAverage = refundsWithProcessingTime.length > 0
      ? refundsWithProcessingTime.reduce((sum, refund) => {
          const created = new Date(refund.created_at).getTime();
          const completed = new Date(refund.completed_at).getTime();
          return sum + (completed - created);
        }, 0) / refundsWithProcessingTime.length / (1000 * 60 * 60) // Convert to hours
      : 0;

    // Refunds by reason
    const refundsByReason: Record<RefundReason, number> = {} as any;
    Object.values(RefundReason).forEach(reason => {
      refundsByReason[reason] = refunds.filter(r => r.refund_reason === reason).length;
    });

    // Mock additional analytics
    const refundsByMethod: Record<string, { count: number; amount: number }> = {};
    const monthlyTrends: Array<{ month: string; count: number; amount: number }> = [];

    return {
      totalRefunds,
      totalRefundAmount,
      averageRefundAmount,
      refundRate: 0, // Would be calculated against total payments
      processingTimeAverage,
      refundsByReason,
      refundsByMethod,
      monthlyTrends
    };
  }

  // Cache management methods
  private getFromCache(quoteId: string): RefundRequest[] | null {
    const cached = this.refundCache.get(quoteId);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.data;
    }
    
    if (cached) {
      this.refundCache.delete(quoteId);
    }
    
    return null;
  }

  private setCache(quoteId: string, data: RefundRequest[]): void {
    this.refundCache.set(quoteId, {
      data,
      timestamp: Date.now()
    });
  }

  private getEligibilityFromCache(quoteId: string): RefundEligibility | null {
    const cached = this.eligibilityCache.get(quoteId);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.eligibility;
    }
    
    if (cached) {
      this.eligibilityCache.delete(quoteId);
    }
    
    return null;
  }

  private setEligibilityCache(quoteId: string, eligibility: RefundEligibility): void {
    this.eligibilityCache.set(quoteId, {
      eligibility,
      timestamp: Date.now()
    });
  }

  private clearQuoteCache(quoteId: string): void {
    this.refundCache.delete(quoteId);
  }

  private clearEligibilityCache(quoteId: string): void {
    this.eligibilityCache.delete(quoteId);
  }

  /**
   * Public utility methods
   */
  clearAllCache(): void {
    this.refundCache.clear();
    this.eligibilityCache.clear();
    logger.info('Refund processing cache cleared');
  }

  dispose(): void {
    this.refundCache.clear();
    this.eligibilityCache.clear();
    logger.info('RefundProcessingService disposed');
  }
}

// Create and export a singleton instance
export const refundProcessingService = new RefundProcessingService();

export default RefundProcessingService;