/**
 * Payment Processing Service
 * Handles payment initiation, processing, and completion for all payment gateways
 * Decomposed from usePaymentGateways hook for better separation of concerns
 */

import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';
import * as Sentry from '@sentry/react';
import type { PaymentGateway, PaymentMethod } from '@/types/payment';
import PaymentGatewayConfigService from './PaymentGatewayConfigService';

export interface PaymentRequest {
  gateway: PaymentGateway;
  amount: number;
  currency: string;
  order_id: string;
  customer: {
    id: string;
    name: string;
    email: string;
    phone?: string;
  };
  billing_address?: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
  };
  items?: Array<{
    name: string;
    price: number;
    quantity: number;
  }>;
  metadata?: Record<string, any>;
  return_url?: string;
  cancel_url?: string;
  webhook_url?: string;
}

export interface PaymentResponse {
  success: boolean;
  payment_id?: string;
  payment_url?: string;
  redirect_url?: string;
  client_secret?: string;
  payment_status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  transaction_id?: string;
  gateway_response?: any;
  error?: string;
  requires_action?: boolean;
  next_action?: {
    type: 'redirect' | '3ds' | 'webhook' | 'polling';
    data: any;
  };
}

export interface PaymentStatus {
  payment_id: string;
  gateway: PaymentGateway;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'refunded';
  amount: number;
  currency: string;
  transaction_id?: string;
  gateway_payment_id?: string;
  created_at: string;
  updated_at: string;
  failure_reason?: string;
  gateway_response?: any;
  refund_amount?: number;
  refund_reason?: string;
}

export interface RefundRequest {
  payment_id: string;
  amount?: number; // Partial refund if specified, full refund if not
  reason: string;
  metadata?: Record<string, any>;
}

export interface RefundResponse {
  success: boolean;
  refund_id?: string;
  refund_status: 'pending' | 'processing' | 'completed' | 'failed';
  refunded_amount?: number;
  transaction_id?: string;
  error?: string;
  gateway_response?: any;
}

export interface PaymentWebhook {
  gateway: PaymentGateway;
  payment_id: string;
  event_type: 'payment_completed' | 'payment_failed' | 'payment_cancelled' | 'refund_completed' | 'chargeback';
  data: any;
  signature: string;
  timestamp: string;
}

export class PaymentProcessingService {
  private configService: PaymentGatewayConfigService;
  private cache = new Map<string, { data: any; timestamp: number }>();
  private readonly CACHE_DURATION = 2 * 60 * 1000; // 2 minutes for payment data

  constructor(configService?: PaymentGatewayConfigService) {
    this.configService = configService || new PaymentGatewayConfigService();
    logger.info('PaymentProcessingService initialized');
  }

  /**
   * Initiate payment with selected gateway
   */
  async initiatePayment(request: PaymentRequest): Promise<PaymentResponse> {
    try {
      logger.info('Initiating payment:', { 
        gateway: request.gateway, 
        amount: request.amount, 
        currency: request.currency,
        orderId: request.order_id 
      });

      // Validate gateway configuration
      const config = await this.configService.getGatewayConfig(request.gateway);
      if (!config) {
        throw new Error(`Gateway ${request.gateway} is not configured`);
      }

      const validation = this.configService.validateGatewayCredentials(config);
      if (!validation.hasValidCredentials) {
        throw new Error(`Gateway ${request.gateway} has invalid credentials`);
      }

      // Create payment record
      const paymentRecord = await this.createPaymentRecord(request);
      if (!paymentRecord) {
        throw new Error('Failed to create payment record');
      }

      // Process payment based on gateway
      let response: PaymentResponse;
      
      switch (request.gateway) {
        case 'stripe':
          response = await this.processStripePayment(request, config);
          break;
        case 'payu':
          response = await this.processPayUPayment(request, config);
          break;
        case 'paypal':
          response = await this.processPayPalPayment(request, config);
          break;
        case 'esewa':
          response = await this.processEsewaPayment(request, config);
          break;
        case 'khalti':
          response = await this.processKhaltiPayment(request, config);
          break;
        case 'fonepay':
          response = await this.processFonepayPayment(request, config);
          break;
        case 'airwallex':
          response = await this.processAirwallexPayment(request, config);
          break;
        case 'bank_transfer':
          response = await this.processBankTransferPayment(request);
          break;
        case 'cod':
          response = await this.processCODPayment(request);
          break;
        default:
          throw new Error(`Unsupported payment gateway: ${request.gateway}`);
      }

      // Update payment record with response
      await this.updatePaymentRecord(paymentRecord.id, response);

      logger.info('Payment initiated successfully:', {
        gateway: request.gateway,
        paymentId: response.payment_id,
        status: response.payment_status
      });

      return response;

    } catch (error) {
      logger.error('Payment initiation failed:', error);
      Sentry.captureException(error);
      return {
        success: false,
        payment_status: 'failed',
        error: error instanceof Error ? error.message : 'Payment initiation failed',
      };
    }
  }

  /**
   * Check payment status
   */
  async checkPaymentStatus(paymentId: string): Promise<PaymentStatus | null> {
    try {
      const cacheKey = this.getCacheKey('status', { paymentId });
      const cached = this.getFromCache<PaymentStatus>(cacheKey);
      if (cached) return cached;

      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('id', paymentId)
        .single();

      if (error || !data) {
        logger.error('Payment not found:', { paymentId, error });
        return null;
      }

      const status: PaymentStatus = {
        payment_id: data.id,
        gateway: data.gateway,
        status: data.status,
        amount: data.amount,
        currency: data.currency,
        transaction_id: data.transaction_id,
        gateway_payment_id: data.gateway_payment_id,
        created_at: data.created_at,
        updated_at: data.updated_at,
        failure_reason: data.failure_reason,
        gateway_response: data.gateway_response,
        refund_amount: data.refund_amount,
        refund_reason: data.refund_reason,
      };

      this.setCache(cacheKey, status);
      return status;

    } catch (error) {
      logger.error('Error checking payment status:', error);
      return null;
    }
  }

  /**
   * Process refund
   */
  async processRefund(refundRequest: RefundRequest): Promise<RefundResponse> {
    try {
      logger.info('Processing refund:', refundRequest);

      // Get payment details
      const payment = await this.checkPaymentStatus(refundRequest.payment_id);
      if (!payment) {
        throw new Error('Payment not found');
      }

      if (payment.status !== 'completed') {
        throw new Error('Only completed payments can be refunded');
      }

      // Calculate refund amount
      const refundAmount = refundRequest.amount || payment.amount;
      if (refundAmount > payment.amount) {
        throw new Error('Refund amount cannot exceed payment amount');
      }

      // Get gateway config
      const config = await this.configService.getGatewayConfig(payment.gateway);
      if (!config) {
        throw new Error(`Gateway ${payment.gateway} configuration not found`);
      }

      // Process refund based on gateway
      let response: RefundResponse;

      switch (payment.gateway) {
        case 'stripe':
          response = await this.processStripeRefund(payment, refundAmount, refundRequest.reason, config);
          break;
        case 'payu':
          response = await this.processPayURefund(payment, refundAmount, refundRequest.reason, config);
          break;
        case 'paypal':
          response = await this.processPayPalRefund(payment, refundAmount, refundRequest.reason, config);
          break;
        default:
          throw new Error(`Refunds not supported for gateway: ${payment.gateway}`);
      }

      // Update payment record with refund info
      if (response.success) {
        await this.updatePaymentRefund(payment.payment_id, refundAmount, refundRequest.reason, response);
      }

      logger.info('Refund processed:', {
        paymentId: payment.payment_id,
        refundAmount,
        status: response.refund_status
      });

      return response;

    } catch (error) {
      logger.error('Refund processing failed:', error);
      return {
        success: false,
        refund_status: 'failed',
        error: error instanceof Error ? error.message : 'Refund processing failed',
      };
    }
  }

  /**
   * Process webhook from payment gateway
   */
  async processWebhook(webhook: PaymentWebhook): Promise<boolean> {
    try {
      logger.info('Processing webhook:', { 
        gateway: webhook.gateway, 
        eventType: webhook.event_type,
        paymentId: webhook.payment_id 
      });

      // Verify webhook signature
      const isValid = await this.verifyWebhookSignature(webhook);
      if (!isValid) {
        throw new Error('Invalid webhook signature');
      }

      // Process based on event type
      switch (webhook.event_type) {
        case 'payment_completed':
          await this.handlePaymentCompleted(webhook);
          break;
        case 'payment_failed':
          await this.handlePaymentFailed(webhook);
          break;
        case 'payment_cancelled':
          await this.handlePaymentCancelled(webhook);
          break;
        case 'refund_completed':
          await this.handleRefundCompleted(webhook);
          break;
        case 'chargeback':
          await this.handleChargeback(webhook);
          break;
        default:
          logger.warn('Unhandled webhook event type:', webhook.event_type);
      }

      return true;

    } catch (error) {
      logger.error('Webhook processing failed:', error);
      return false;
    }
  }

  /**
   * Gateway-specific payment processors
   */
  private async processStripePayment(request: PaymentRequest, config: any): Promise<PaymentResponse> {
    try {
      // Mock Stripe payment processing
      const paymentIntent = {
        id: `pi_${Date.now()}`,
        client_secret: `pi_${Date.now()}_secret`,
        status: 'requires_payment_method',
      };

      return {
        success: true,
        payment_id: paymentIntent.id,
        client_secret: paymentIntent.client_secret,
        payment_status: 'pending',
        requires_action: true,
        next_action: {
          type: '3ds',
          data: { client_secret: paymentIntent.client_secret },
        },
      };

    } catch (error) {
      logger.error('Stripe payment processing failed:', error);
      throw error;
    }
  }

  private async processPayUPayment(request: PaymentRequest, config: any): Promise<PaymentResponse> {
    try {
      // Mock PayU payment processing
      const paymentId = `payu_${Date.now()}`;
      const redirectUrl = `https://secure.payu.in/_payment?id=${paymentId}`;

      return {
        success: true,
        payment_id: paymentId,
        payment_url: redirectUrl,
        redirect_url: redirectUrl,
        payment_status: 'pending',
        requires_action: true,
        next_action: {
          type: 'redirect',
          data: { url: redirectUrl },
        },
      };

    } catch (error) {
      logger.error('PayU payment processing failed:', error);
      throw error;
    }
  }

  private async processPayPalPayment(request: PaymentRequest, config: any): Promise<PaymentResponse> {
    try {
      // Mock PayPal payment processing
      const orderId = `PAYPAL_${Date.now()}`;
      const approvalUrl = `https://www.paypal.com/checkoutnow?token=${orderId}`;

      return {
        success: true,
        payment_id: orderId,
        payment_url: approvalUrl,
        redirect_url: approvalUrl,
        payment_status: 'pending',
        requires_action: true,
        next_action: {
          type: 'redirect',
          data: { url: approvalUrl },
        },
      };

    } catch (error) {
      logger.error('PayPal payment processing failed:', error);
      throw error;
    }
  }

  private async processEsewaPayment(request: PaymentRequest, config: any): Promise<PaymentResponse> {
    try {
      // Mock eSewa payment processing
      const paymentId = `esewa_${Date.now()}`;
      const redirectUrl = `https://uat.esewa.com.np/epay/main?amt=${request.amount}&txAmt=0&pdc=0&psc=0&tAmt=${request.amount}&pid=${paymentId}&scd=${config.merchant_id}`;

      return {
        success: true,
        payment_id: paymentId,
        payment_url: redirectUrl,
        redirect_url: redirectUrl,
        payment_status: 'pending',
        requires_action: true,
        next_action: {
          type: 'redirect',
          data: { url: redirectUrl },
        },
      };

    } catch (error) {
      logger.error('eSewa payment processing failed:', error);
      throw error;
    }
  }

  private async processKhaltiPayment(request: PaymentRequest, config: any): Promise<PaymentResponse> {
    try {
      // Mock Khalti payment processing
      const paymentId = `khalti_${Date.now()}`;
      
      return {
        success: true,
        payment_id: paymentId,
        payment_status: 'pending',
        requires_action: true,
        next_action: {
          type: 'webhook',
          data: { payment_id: paymentId, public_key: config.public_key },
        },
      };

    } catch (error) {
      logger.error('Khalti payment processing failed:', error);
      throw error;
    }
  }

  private async processFonepayPayment(request: PaymentRequest, config: any): Promise<PaymentResponse> {
    try {
      // Mock FonePay payment processing
      const paymentId = `fonepay_${Date.now()}`;
      const redirectUrl = `https://clientapi.fonepay.com/api/merchantRequest?amt=${request.amount}&pid=${paymentId}&mid=${config.merchant_id}`;

      return {
        success: true,
        payment_id: paymentId,
        payment_url: redirectUrl,
        redirect_url: redirectUrl,
        payment_status: 'pending',
        requires_action: true,
        next_action: {
          type: 'redirect',
          data: { url: redirectUrl },
        },
      };

    } catch (error) {
      logger.error('FonePay payment processing failed:', error);
      throw error;
    }
  }

  private async processAirwallexPayment(request: PaymentRequest, config: any): Promise<PaymentResponse> {
    try {
      // Mock Airwallex payment processing
      const paymentIntentId = `awx_${Date.now()}`;
      
      return {
        success: true,
        payment_id: paymentIntentId,
        client_secret: `${paymentIntentId}_secret`,
        payment_status: 'pending',
        requires_action: true,
        next_action: {
          type: '3ds',
          data: { client_secret: `${paymentIntentId}_secret` },
        },
      };

    } catch (error) {
      logger.error('Airwallex payment processing failed:', error);
      throw error;
    }
  }

  private async processBankTransferPayment(request: PaymentRequest): Promise<PaymentResponse> {
    try {
      // Bank transfer doesn't require immediate processing
      const paymentId = `bt_${Date.now()}`;

      return {
        success: true,
        payment_id: paymentId,
        payment_status: 'pending',
        requires_action: false,
      };

    } catch (error) {
      logger.error('Bank transfer processing failed:', error);
      throw error;
    }
  }

  private async processCODPayment(request: PaymentRequest): Promise<PaymentResponse> {
    try {
      // COD is completed when order is delivered
      const paymentId = `cod_${Date.now()}`;

      return {
        success: true,
        payment_id: paymentId,
        payment_status: 'pending',
        requires_action: false,
      };

    } catch (error) {
      logger.error('COD processing failed:', error);
      throw error;
    }
  }

  /**
   * Refund processors
   */
  private async processStripeRefund(
    payment: PaymentStatus,
    amount: number,
    reason: string,
    config: any
  ): Promise<RefundResponse> {
    try {
      // Mock Stripe refund
      return {
        success: true,
        refund_id: `re_${Date.now()}`,
        refund_status: 'completed',
        refunded_amount: amount,
        transaction_id: `txn_${Date.now()}`,
      };
    } catch (error) {
      throw error;
    }
  }

  private async processPayURefund(
    payment: PaymentStatus,
    amount: number,
    reason: string,
    config: any
  ): Promise<RefundResponse> {
    try {
      // Mock PayU refund
      return {
        success: true,
        refund_id: `payu_ref_${Date.now()}`,
        refund_status: 'processing',
        refunded_amount: amount,
      };
    } catch (error) {
      throw error;
    }
  }

  private async processPayPalRefund(
    payment: PaymentStatus,
    amount: number,
    reason: string,
    config: any
  ): Promise<RefundResponse> {
    try {
      // Mock PayPal refund
      return {
        success: true,
        refund_id: `paypal_ref_${Date.now()}`,
        refund_status: 'completed',
        refunded_amount: amount,
        transaction_id: `ref_${Date.now()}`,
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Database operations
   */
  private async createPaymentRecord(request: PaymentRequest): Promise<{ id: string } | null> {
    try {
      const { data, error } = await supabase
        .from('payments')
        .insert({
          gateway: request.gateway,
          amount: request.amount,
          currency: request.currency,
          order_id: request.order_id,
          customer_id: request.customer.id,
          customer_data: request.customer,
          billing_address: request.billing_address,
          items: request.items,
          metadata: request.metadata,
          status: 'pending',
          created_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (error) throw error;
      return data;

    } catch (error) {
      logger.error('Failed to create payment record:', error);
      return null;
    }
  }

  private async updatePaymentRecord(paymentId: string, response: PaymentResponse): Promise<void> {
    try {
      await supabase
        .from('payments')
        .update({
          gateway_payment_id: response.payment_id,
          payment_url: response.payment_url,
          client_secret: response.client_secret,
          status: response.payment_status,
          gateway_response: response.gateway_response,
          updated_at: new Date().toISOString(),
        })
        .eq('id', paymentId);

      // Clear cache
      this.clearCache('status');

    } catch (error) {
      logger.error('Failed to update payment record:', error);
    }
  }

  private async updatePaymentRefund(
    paymentId: string,
    refundAmount: number,
    refundReason: string,
    refundResponse: RefundResponse
  ): Promise<void> {
    try {
      await supabase
        .from('payments')
        .update({
          refund_amount: refundAmount,
          refund_reason: refundReason,
          refund_id: refundResponse.refund_id,
          refund_status: refundResponse.refund_status,
          updated_at: new Date().toISOString(),
        })
        .eq('id', paymentId);

      // Clear cache
      this.clearCache('status');

    } catch (error) {
      logger.error('Failed to update payment refund:', error);
    }
  }

  /**
   * Webhook handlers
   */
  private async verifyWebhookSignature(webhook: PaymentWebhook): Promise<boolean> {
    try {
      // In real implementation, verify the webhook signature
      // This is crucial for security
      return true; // Mock verification
    } catch (error) {
      logger.error('Webhook signature verification failed:', error);
      return false;
    }
  }

  private async handlePaymentCompleted(webhook: PaymentWebhook): Promise<void> {
    await supabase
      .from('payments')
      .update({
        status: 'completed',
        transaction_id: webhook.data.transaction_id,
        gateway_response: webhook.data,
        updated_at: new Date().toISOString(),
      })
      .eq('gateway_payment_id', webhook.payment_id);

    this.clearCache('status');
  }

  private async handlePaymentFailed(webhook: PaymentWebhook): Promise<void> {
    await supabase
      .from('payments')
      .update({
        status: 'failed',
        failure_reason: webhook.data.failure_reason,
        gateway_response: webhook.data,
        updated_at: new Date().toISOString(),
      })
      .eq('gateway_payment_id', webhook.payment_id);

    this.clearCache('status');
  }

  private async handlePaymentCancelled(webhook: PaymentWebhook): Promise<void> {
    await supabase
      .from('payments')
      .update({
        status: 'cancelled',
        gateway_response: webhook.data,
        updated_at: new Date().toISOString(),
      })
      .eq('gateway_payment_id', webhook.payment_id);

    this.clearCache('status');
  }

  private async handleRefundCompleted(webhook: PaymentWebhook): Promise<void> {
    await supabase
      .from('payments')
      .update({
        refund_status: 'completed',
        gateway_response: webhook.data,
        updated_at: new Date().toISOString(),
      })
      .eq('gateway_payment_id', webhook.payment_id);

    this.clearCache('status');
  }

  private async handleChargeback(webhook: PaymentWebhook): Promise<void> {
    // Handle chargeback notification
    logger.warn('Chargeback received:', webhook);
    // Would typically update payment status and notify relevant teams
  }

  /**
   * Cache management utilities
   */
  private getCacheKey(operation: string, params: any = {}): string {
    return `payment_processing_${operation}_${JSON.stringify(params)}`;
  }

  private getFromCache<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data as T;
    }
    this.cache.delete(key);
    return null;
  }

  private setCache<T>(key: string, data: T): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  private clearCache(pattern?: string): void {
    if (pattern) {
      for (const key of this.cache.keys()) {
        if (key.includes(pattern)) {
          this.cache.delete(key);
        }
      }
    } else {
      this.cache.clear();
    }
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    this.cache.clear();
    logger.info('PaymentProcessingService cleanup completed');
  }
}

export default PaymentProcessingService;