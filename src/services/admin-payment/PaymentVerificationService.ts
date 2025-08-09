/**
 * Payment Verification Service
 * Handles payment verification workflows, status management, and verification logic
 * Decomposed from PaymentManagementPage for focused verification management
 * 
 * RESPONSIBILITIES:
 * - Payment proof verification and validation
 * - Status management (pending, verified, rejected)
 * - Verification workflow orchestration
 * - Payment amount calculations and validation
 * - Admin verification tracking and logging
 * - Bulk verification operations
 */

import { logger } from '@/utils/logger';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';

export interface VerificationRequest {
  paymentId: string;
  paymentType: 'bank_transfer_proof' | 'webhook_payment';
  status: 'verified' | 'rejected';
  adminNotes?: string;
  verifiedAmount?: number;
}

export interface BulkVerificationRequest {
  paymentIds: string[];
  status: 'verified' | 'rejected';
  adminNotes: string;
}

export interface VerificationResult {
  success: boolean;
  paymentId: string;
  newStatus: string;
  verifiedAmount?: number;
  error?: string;
}

export interface PaymentVerificationDetails {
  paymentId: string;
  quoteId: string;
  orderTotal: number;
  existingPaid: number;
  remainingBalance: number;
  suggestedAmount: number;
  canVerify: boolean;
  verificationNotes: string[];
}

export interface VerificationStats {
  total_pending: number;
  total_verified_today: number;
  total_rejected_today: number;
  average_verification_time_hours: number;
  oldest_pending_days: number;
}

export class PaymentVerificationService {
  private static instance: PaymentVerificationService;
  private verificationCache = new Map<string, { data: any; timestamp: number }>();
  private readonly cacheTTL = 2 * 60 * 1000; // 2 minutes cache for verification data

  constructor() {
    logger.info('PaymentVerificationService initialized');
  }

  static getInstance(): PaymentVerificationService {
    if (!PaymentVerificationService.instance) {
      PaymentVerificationService.instance = new PaymentVerificationService();
    }
    return PaymentVerificationService.instance;
  }

  /**
   * Verify a single payment
   */
  async verifyPayment(request: VerificationRequest): Promise<VerificationResult> {
    try {
      logger.info(`Verifying payment ${request.paymentId} as ${request.status}`);

      if (request.paymentType === 'bank_transfer_proof') {
        return await this.verifyBankTransferProof(request);
      } else {
        return await this.verifyWebhookPayment(request);
      }

    } catch (error) {
      logger.error('Payment verification failed:', error);
      return {
        success: false,
        paymentId: request.paymentId,
        newStatus: 'error',
        error: error instanceof Error ? error.message : 'Verification failed'
      };
    }
  }

  /**
   * Verify multiple payments in bulk
   */
  async verifyPaymentsBulk(request: BulkVerificationRequest): Promise<VerificationResult[]> {
    try {
      logger.info(`Bulk verifying ${request.paymentIds.length} payments as ${request.status}`);

      const user = (await supabase.auth.getUser()).data.user;
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Get message details first
      const { data: messages, error: fetchError } = await supabase
        .from('messages')
        .select('*')
        .in('id', request.paymentIds);

      if (fetchError) {
        throw fetchError;
      }

      if (!messages || messages.length === 0) {
        throw new Error('No payment records found');
      }

      // Get quote IDs from messages
      const quoteIds = messages.map(m => m.quote_id).filter(Boolean);

      // Fetch quote details
      let quotes: Tables<'quotes'>[] = [];
      if (quoteIds.length > 0) {
        const { data: quotesData, error: quotesError } = await supabase
          .from('quotes_v2')
          .select('*')
          .in('id', quoteIds);

        if (quotesError) {
          throw quotesError;
        }
        quotes = quotesData || [];
      }

      // Process each payment
      const results: VerificationResult[] = [];
      
      for (const message of messages) {
        try {
          const quote = quotes.find(q => q.id === message.quote_id);
          const orderTotal = quote?.final_total_origincurrency || 0;
          const existingPaid = quote?.amount_paid || 0;
          
          // Update message verification status
          const { error: updateError } = await supabase
            .from('messages')
            .update({
              verification_status: request.status,
              admin_notes: request.adminNotes,
              verified_at: new Date().toISOString(),
              verified_by: user.id
            })
            .eq('id', message.id);

          if (updateError) {
            throw updateError;
          }

          // If verified, update quote payment status and amount
          if (request.status === 'verified' && quote) {
            const newAmountPaid = Math.min(orderTotal, existingPaid + orderTotal);
            const newPaymentStatus = newAmountPaid >= orderTotal ? 'paid' : 'partial';

            const { error: quoteUpdateError } = await supabase
              .from('quotes_v2')
              .update({
                payment_status: newPaymentStatus,
                amount_paid: newAmountPaid,
                updated_at: new Date().toISOString()
              })
              .eq('id', quote.id);

            if (quoteUpdateError) {
              logger.warn('Failed to update quote payment status:', quoteUpdateError);
            }

            results.push({
              success: true,
              paymentId: message.id,
              newStatus: request.status,
              verifiedAmount: newAmountPaid
            });
          } else {
            results.push({
              success: true,
              paymentId: message.id,
              newStatus: request.status
            });
          }

        } catch (error) {
          logger.error(`Failed to verify payment ${message.id}:`, error);
          results.push({
            success: false,
            paymentId: message.id,
            newStatus: 'error',
            error: error instanceof Error ? error.message : 'Update failed'
          });
        }
      }

      // Log bulk verification activity
      await this.logVerificationActivity({
        action: 'bulk_verification',
        paymentIds: request.paymentIds,
        status: request.status,
        adminId: user.id,
        notes: request.adminNotes,
        results: results.filter(r => r.success).length
      });

      logger.info(`Bulk verification completed: ${results.filter(r => r.success).length}/${results.length} successful`);
      return results;

    } catch (error) {
      logger.error('Bulk verification failed:', error);
      return request.paymentIds.map(id => ({
        success: false,
        paymentId: id,
        newStatus: 'error',
        error: error instanceof Error ? error.message : 'Bulk verification failed'
      }));
    }
  }

  /**
   * Get verification details for a payment
   */
  async getVerificationDetails(paymentId: string, paymentType: 'bank_transfer_proof' | 'webhook_payment'): Promise<PaymentVerificationDetails> {
    try {
      const cacheKey = this.createCacheKey('verification_details', { paymentId, paymentType });
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        logger.debug('Using cached verification details');
        return cached;
      }

      let verificationDetails: PaymentVerificationDetails;

      if (paymentType === 'bank_transfer_proof') {
        verificationDetails = await this.getBankTransferVerificationDetails(paymentId);
      } else {
        verificationDetails = await this.getWebhookPaymentVerificationDetails(paymentId);
      }

      this.setCache(cacheKey, verificationDetails);
      return verificationDetails;

    } catch (error) {
      logger.error('Failed to get verification details:', error);
      return {
        paymentId,
        quoteId: '',
        orderTotal: 0,
        existingPaid: 0,
        remainingBalance: 0,
        suggestedAmount: 0,
        canVerify: false,
        verificationNotes: ['Error loading verification details']
      };
    }
  }

  /**
   * Get verification statistics
   */
  async getVerificationStats(): Promise<VerificationStats> {
    try {
      const cacheKey = 'verification_stats';
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        logger.debug('Using cached verification stats');
        return cached;
      }

      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());

      // Get pending count
      const { count: pendingCount } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('message_type', 'payment_proof')
        .or('verification_status.is.null,verification_status.eq.pending');

      // Get today's verified count
      const { count: verifiedTodayCount } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('message_type', 'payment_proof')
        .eq('verification_status', 'verified')
        .gte('verified_at', startOfDay.toISOString());

      // Get today's rejected count
      const { count: rejectedTodayCount } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('message_type', 'payment_proof')
        .eq('verification_status', 'rejected')
        .gte('verified_at', startOfDay.toISOString());

      // Get oldest pending payment
      const { data: oldestPending } = await supabase
        .from('messages')
        .select('created_at')
        .eq('message_type', 'payment_proof')
        .or('verification_status.is.null,verification_status.eq.pending')
        .order('created_at', { ascending: true })
        .limit(1);

      const oldestPendingDays = oldestPending?.[0] ? 
        Math.floor((today.getTime() - new Date(oldestPending[0].created_at).getTime()) / (1000 * 60 * 60 * 24)) : 0;

      // Calculate average verification time (simplified)
      const { data: recentVerifications } = await supabase
        .from('messages')
        .select('created_at, verified_at')
        .eq('message_type', 'payment_proof')
        .eq('verification_status', 'verified')
        .not('verified_at', 'is', null)
        .gte('verified_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()) // Last 7 days
        .limit(100);

      let averageVerificationTimeHours = 0;
      if (recentVerifications && recentVerifications.length > 0) {
        const totalTime = recentVerifications.reduce((sum, record) => {
          const created = new Date(record.created_at).getTime();
          const verified = new Date(record.verified_at!).getTime();
          return sum + (verified - created);
        }, 0);
        averageVerificationTimeHours = (totalTime / recentVerifications.length) / (1000 * 60 * 60);
      }

      const stats: VerificationStats = {
        total_pending: pendingCount || 0,
        total_verified_today: verifiedTodayCount || 0,
        total_rejected_today: rejectedTodayCount || 0,
        average_verification_time_hours: Math.round(averageVerificationTimeHours * 100) / 100,
        oldest_pending_days: oldestPendingDays
      };

      this.setCache(cacheKey, stats);
      logger.info('Generated verification statistics:', stats);
      return stats;

    } catch (error) {
      logger.error('Failed to get verification stats:', error);
      return {
        total_pending: 0,
        total_verified_today: 0,
        total_rejected_today: 0,
        average_verification_time_hours: 0,
        oldest_pending_days: 0
      };
    }
  }

  /**
   * Verify bank transfer proof
   */
  private async verifyBankTransferProof(request: VerificationRequest): Promise<VerificationResult> {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Get message and quote details
    const { data: message, error: messageError } = await supabase
      .from('messages')
      .select('*')
      .eq('id', request.paymentId)
      .single();

    if (messageError || !message) {
      throw new Error('Payment proof not found');
    }

    const { data: quote, error: quoteError } = await supabase
      .from('quotes_v2')
      .select('*')
      .eq('id', message.quote_id)
      .single();

    if (quoteError || !quote) {
      throw new Error('Quote not found');
    }

    // Update message verification status
    const { error: updateError } = await supabase
      .from('messages')
      .update({
        verification_status: request.status,
        admin_notes: request.adminNotes || '',
        verified_at: new Date().toISOString(),
        verified_by: user.id
      })
      .eq('id', request.paymentId);

    if (updateError) {
      throw updateError;
    }

    // If verified, update quote payment status
    if (request.status === 'verified') {
      const orderTotal = quote.final_total_origincurrency || 0;
      const existingPaid = quote.amount_paid || 0;
      const verifiedAmount = request.verifiedAmount || orderTotal;
      
      const newAmountPaid = Math.min(orderTotal, existingPaid + verifiedAmount);
      const newPaymentStatus = newAmountPaid >= orderTotal ? 'paid' : 'partial';

      const { error: quoteUpdateError } = await supabase
        .from('quotes_v2')
        .update({
          payment_status: newPaymentStatus,
          amount_paid: newAmountPaid,
          updated_at: new Date().toISOString()
        })
        .eq('id', quote.id);

      if (quoteUpdateError) {
        logger.warn('Failed to update quote payment status:', quoteUpdateError);
      }

      return {
        success: true,
        paymentId: request.paymentId,
        newStatus: request.status,
        verifiedAmount: newAmountPaid
      };
    }

    return {
      success: true,
      paymentId: request.paymentId,
      newStatus: request.status
    };
  }

  /**
   * Verify webhook payment (for completeness)
   */
  private async verifyWebhookPayment(request: VerificationRequest): Promise<VerificationResult> {
    // For webhook payments, they are typically auto-verified
    // This method is a placeholder for any additional webhook verification logic
    
    logger.info(`Webhook payment ${request.paymentId} verification - typically auto-verified`);
    
    return {
      success: true,
      paymentId: request.paymentId,
      newStatus: request.status
    };
  }

  /**
   * Get bank transfer verification details
   */
  private async getBankTransferVerificationDetails(paymentId: string): Promise<PaymentVerificationDetails> {
    const { data: message } = await supabase
      .from('messages')
      .select('*')
      .eq('id', paymentId)
      .single();

    if (!message) {
      throw new Error('Payment proof not found');
    }

    const { data: quote } = await supabase
      .from('quotes_v2')
      .select('*')
      .eq('id', message.quote_id)
      .single();

    if (!quote) {
      throw new Error('Quote not found');
    }

    const orderTotal = quote.final_total_origincurrency || 0;
    const existingPaid = quote.amount_paid || 0;
    const remainingBalance = Math.max(0, orderTotal - existingPaid);
    
    const verificationNotes: string[] = [];
    let canVerify = true;

    // Add verification checks
    if (message.verification_status === 'verified') {
      verificationNotes.push('✅ Already verified');
      canVerify = false;
    } else if (message.verification_status === 'rejected') {
      verificationNotes.push('❌ Previously rejected');
    } else {
      verificationNotes.push('⏳ Pending verification');
    }

    if (remainingBalance <= 0) {
      verificationNotes.push('💰 Quote already fully paid');
      canVerify = false;
    }

    if (!message.attachment_url) {
      verificationNotes.push('📎 No payment proof attachment');
      canVerify = false;
    }

    return {
      paymentId,
      quoteId: message.quote_id,
      orderTotal,
      existingPaid,
      remainingBalance,
      suggestedAmount: remainingBalance,
      canVerify,
      verificationNotes
    };
  }

  /**
   * Get webhook payment verification details
   */
  private async getWebhookPaymentVerificationDetails(paymentId: string): Promise<PaymentVerificationDetails> {
    const { data: transaction } = await supabase
      .from('payment_transactions')
      .select('*')
      .eq('id', paymentId)
      .single();

    if (!transaction) {
      throw new Error('Payment transaction not found');
    }

    const { data: quote } = await supabase
      .from('quotes_v2')
      .select('*')
      .eq('id', transaction.quote_id)
      .single();

    const orderTotal = quote?.final_total_origincurrency || 0;
    const existingPaid = quote?.amount_paid || 0;
    const transactionAmount = transaction.amount || 0;

    const verificationNotes: string[] = [];
    let canVerify = true;

    // Webhook payments are typically auto-verified
    if (transaction.status === 'completed') {
      verificationNotes.push('✅ Auto-verified by webhook');
      canVerify = false;
    } else if (transaction.status === 'failed') {
      verificationNotes.push('❌ Failed transaction');
      canVerify = false;
    } else {
      verificationNotes.push('⏳ Pending completion');
    }

    return {
      paymentId,
      quoteId: transaction.quote_id,
      orderTotal,
      existingPaid,
      remainingBalance: Math.max(0, orderTotal - existingPaid),
      suggestedAmount: transactionAmount,
      canVerify,
      verificationNotes
    };
  }

  /**
   * Log verification activity
   */
  private async logVerificationActivity(activity: {
    action: string;
    paymentIds: string[];
    status: string;
    adminId: string;
    notes?: string;
    results?: number;
  }): Promise<void> {
    try {
      await supabase
        .from('admin_activity_logs')
        .insert({
          admin_id: activity.adminId,
          action: activity.action,
          resource_type: 'payment_verification',
          resource_ids: activity.paymentIds,
          details: {
            status: activity.status,
            notes: activity.notes,
            results: activity.results,
            timestamp: new Date().toISOString()
          }
        });
    } catch (error) {
      logger.warn('Failed to log verification activity:', error);
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
    const cached = this.verificationCache.get(key);
    if (!cached) return null;

    const isExpired = Date.now() - cached.timestamp > this.cacheTTL;
    if (isExpired) {
      this.verificationCache.delete(key);
      return null;
    }

    return cached.data;
  }

  private setCache(key: string, data: any): void {
    this.verificationCache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  /**
   * Clear verification cache
   */
  clearCache(): void {
    this.verificationCache.clear();
    logger.info('Payment verification cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; entries: string[] } {
    return {
      size: this.verificationCache.size,
      entries: Array.from(this.verificationCache.keys())
    };
  }

  /**
   * Clean expired cache entries
   */
  cleanExpiredCache(): number {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [key, cached] of this.verificationCache.entries()) {
      if (now - cached.timestamp > this.cacheTTL) {
        this.verificationCache.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      logger.info(`Cleaned ${cleanedCount} expired verification cache entries`);
    }

    return cleanedCount;
  }

  /**
   * Dispose of resources
   */
  dispose(): void {
    this.clearCache();
    logger.info('PaymentVerificationService disposed');
  }
}

export default PaymentVerificationService;