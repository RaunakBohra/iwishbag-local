/**
 * Payment Link Service
 * Manages payment link generation, tracking, and gateway integrations
 * Extracted from UnifiedPaymentModal for clean payment link management
 * 
 * RESPONSIBILITIES:
 * - Dynamic payment link generation for multiple gateways
 * - Payment link expiration and security management
 * - Gateway-specific configurations and customizations
 * - Payment tracking and status synchronization
 * - Link analytics and performance monitoring
 * - Multi-currency and multi-region support
 * - Custom payment pages and branding
 * - Webhook handling and payment confirmations
 */

import { logger } from '@/utils/logger';
import { supabase } from '@/integrations/supabase/client';

export interface PaymentLink {
  id: string;
  quote_id: string;
  amount: number;
  currency: string;
  status: PaymentLinkStatus;
  gateway: PaymentGateway;
  payment_url?: string;
  gateway_payment_id?: string;
  description?: string;
  expires_at?: string;
  created_at: string;
  updated_at?: string;
  completed_at?: string;
  metadata?: {
    customer_name?: string;
    customer_email?: string;
    custom_fields?: Record<string, any>;
    success_url?: string;
    cancel_url?: string;
    webhook_url?: string;
  };
  gateway_response?: Record<string, unknown>;
  analytics?: {
    clicks: number;
    conversions: number;
    last_accessed?: string;
  };
}

export enum PaymentLinkStatus {
  ACTIVE = 'active',
  EXPIRED = 'expired',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  FAILED = 'failed'
}

export enum PaymentGateway {
  PAYU = 'payu',
  STRIPE = 'stripe',
  ESEWA = 'esewa',
  KHALTI = 'khalti',
  PAYPAL = 'paypal',
  RAZORPAY = 'razorpay'
}

export interface CreatePaymentLinkInput {
  quote_id: string;
  amount: number;
  currency: string;
  gateway: PaymentGateway;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  description?: string;
  expires_in_hours?: number;
  success_url?: string;
  cancel_url?: string;
  custom_fields?: Record<string, any>;
  auto_capture?: boolean;
  send_sms?: boolean;
  send_email?: boolean;
}

export interface PaymentLinkConfig {
  gateway: PaymentGateway;
  api_key: string;
  secret_key?: string;
  merchant_id?: string;
  environment: 'sandbox' | 'production';
  webhook_url?: string;
  success_url?: string;
  cancel_url?: string;
  logo_url?: string;
  brand_color?: string;
  custom_css?: string;
}

export interface GatewayCapabilities {
  supports_partial_payments: boolean;
  supports_installments: boolean;
  supports_recurring: boolean;
  supports_refunds: boolean;
  supports_webhooks: boolean;
  min_amount: number;
  max_amount: number;
  supported_currencies: string[];
  processing_fee_percentage: number;
  processing_fee_fixed: number;
}

export interface PaymentLinkAnalytics {
  total_links: number;
  active_links: number;
  completed_links: number;
  total_clicks: number;
  conversion_rate: number;
  average_completion_time: number;
  revenue_generated: number;
  gateway_performance: Record<PaymentGateway, {
    links: number;
    revenue: number;
    success_rate: number;
    average_processing_time: number;
  }>;
}

export class PaymentLinkService {
  private static instance: PaymentLinkService;
  private linkCache = new Map<string, { data: PaymentLink[]; timestamp: number }>();
  private configCache = new Map<PaymentGateway, { config: PaymentLinkConfig; timestamp: number }>();
  private readonly cacheTTL = 15 * 60 * 1000; // 15 minutes
  private readonly defaultExpiryHours = 24;

  // Gateway capabilities configuration
  private readonly gatewayCapabilities: Record<PaymentGateway, GatewayCapabilities> = {
    [PaymentGateway.PAYU]: {
      supports_partial_payments: false,
      supports_installments: true,
      supports_recurring: true,
      supports_refunds: true,
      supports_webhooks: true,
      min_amount: 1,
      max_amount: 500000,
      supported_currencies: ['INR', 'USD'],
      processing_fee_percentage: 2.9,
      processing_fee_fixed: 0
    },
    [PaymentGateway.STRIPE]: {
      supports_partial_payments: false,
      supports_installments: false,
      supports_recurring: true,
      supports_refunds: true,
      supports_webhooks: true,
      min_amount: 0.5,
      max_amount: 999999,
      supported_currencies: ['USD', 'EUR', 'GBP', 'INR'],
      processing_fee_percentage: 2.9,
      processing_fee_fixed: 0.30
    },
    [PaymentGateway.ESEWA]: {
      supports_partial_payments: false,
      supports_installments: false,
      supports_recurring: false,
      supports_refunds: false,
      supports_webhooks: false,
      min_amount: 1,
      max_amount: 100000,
      supported_currencies: ['NPR'],
      processing_fee_percentage: 2.5,
      processing_fee_fixed: 0
    },
    [PaymentGateway.KHALTI]: {
      supports_partial_payments: false,
      supports_installments: false,
      supports_recurring: false,
      supports_refunds: true,
      supports_webhooks: true,
      min_amount: 10,
      max_amount: 1000000,
      supported_currencies: ['NPR'],
      processing_fee_percentage: 3.5,
      processing_fee_fixed: 0
    },
    [PaymentGateway.PAYPAL]: {
      supports_partial_payments: false,
      supports_installments: true,
      supports_recurring: true,
      supports_refunds: true,
      supports_webhooks: true,
      min_amount: 0.01,
      max_amount: 10000,
      supported_currencies: ['USD', 'EUR', 'GBP', 'CAD', 'AUD'],
      processing_fee_percentage: 2.9,
      processing_fee_fixed: 0.30
    },
    [PaymentGateway.RAZORPAY]: {
      supports_partial_payments: true,
      supports_installments: true,
      supports_recurring: true,
      supports_refunds: true,
      supports_webhooks: true,
      min_amount: 1,
      max_amount: 500000,
      supported_currencies: ['INR'],
      processing_fee_percentage: 2,
      processing_fee_fixed: 0
    }
  };

  constructor() {
    logger.info('PaymentLinkService initialized');
  }

  static getInstance(): PaymentLinkService {
    if (!PaymentLinkService.instance) {
      PaymentLinkService.instance = new PaymentLinkService();
    }
    return PaymentLinkService.instance;
  }

  /**
   * Create payment link for a quote
   */
  async createPaymentLink(linkData: CreatePaymentLinkInput): Promise<PaymentLink> {
    try {
      logger.info('Creating payment link:', { 
        quote_id: linkData.quote_id, 
        amount: linkData.amount,
        gateway: linkData.gateway
      });

      // Validate input
      await this.validatePaymentLinkInput(linkData);

      // Get gateway configuration
      const config = await this.getGatewayConfig(linkData.gateway);

      // Calculate expiry
      const expiryHours = linkData.expires_in_hours || this.defaultExpiryHours;
      const expiresAt = new Date(Date.now() + expiryHours * 60 * 60 * 1000).toISOString();

      // Create payment link with gateway
      const gatewayResult = await this.createGatewayPaymentLink(linkData, config);

      // Save payment link to database
      const paymentLinkData = {
        quote_id: linkData.quote_id,
        amount: linkData.amount,
        currency: linkData.currency,
        status: PaymentLinkStatus.ACTIVE,
        gateway: linkData.gateway,
        payment_url: gatewayResult.payment_url,
        gateway_payment_id: gatewayResult.gateway_payment_id,
        description: linkData.description || `Payment for Quote ${linkData.quote_id}`,
        expires_at: expiresAt,
        metadata: {
          customer_name: linkData.customer_name,
          customer_email: linkData.customer_email,
          custom_fields: linkData.custom_fields,
          success_url: linkData.success_url,
          cancel_url: linkData.cancel_url,
          webhook_url: config.webhook_url
        },
        gateway_response: gatewayResult.raw_response,
        analytics: {
          clicks: 0,
          conversions: 0
        },
        created_at: new Date().toISOString()
      };

      const { data: savedLink, error } = await supabase
        .from('payment_links')
        .insert(paymentLinkData)
        .select('*')
        .single();

      if (error) throw error;

      // Clear cache for the quote
      this.clearQuoteCache(linkData.quote_id);

      // Send notifications if requested
      if (linkData.send_email && linkData.customer_email) {
        await this.sendPaymentLinkEmail(savedLink, linkData.customer_email);
      }

      if (linkData.send_sms && linkData.customer_phone) {
        await this.sendPaymentLinkSMS(savedLink, linkData.customer_phone);
      }

      // Log the creation
      await this.logLinkActivity({
        link_id: savedLink.id,
        quote_id: linkData.quote_id,
        action: 'link_created',
        gateway: linkData.gateway
      });

      logger.info('Payment link created successfully:', savedLink.id);
      return savedLink;

    } catch (error) {
      logger.error('Failed to create payment link:', error);
      throw error;
    }
  }

  /**
   * Get payment links for a quote
   */
  async getPaymentLinks(quoteId: string, forceRefresh: boolean = false): Promise<PaymentLink[]> {
    try {
      // Check cache first
      if (!forceRefresh) {
        const cached = this.getFromCache(quoteId);
        if (cached) {
          logger.debug('Payment links cache hit for quote:', quoteId);
          return cached;
        }
      }

      const { data: links, error } = await supabase
        .from('payment_links')
        .select('*')
        .eq('quote_id', quoteId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const processedLinks = this.processLinkData(links || []);

      // Update expired links
      await this.updateExpiredLinks(processedLinks);

      // Cache the result
      this.setCache(quoteId, processedLinks);

      return processedLinks;

    } catch (error) {
      logger.error('Failed to get payment links:', error);
      throw error;
    }
  }

  /**
   * Update payment link status (from webhook or manual check)
   */
  async updatePaymentLinkStatus(
    linkId: string,
    status: PaymentLinkStatus,
    gatewayData?: Record<string, unknown>
  ): Promise<PaymentLink> {
    try {
      logger.info('Updating payment link status:', { linkId, status });

      const updateData: any = {
        status,
        updated_at: new Date().toISOString()
      };

      if (status === PaymentLinkStatus.COMPLETED) {
        updateData.completed_at = new Date().toISOString();
      }

      if (gatewayData) {
        updateData.gateway_response = gatewayData;
      }

      const { data: updatedLink, error } = await supabase
        .from('payment_links')
        .update(updateData)
        .eq('id', linkId)
        .select('*')
        .single();

      if (error) throw error;

      // Clear cache for the quote
      this.clearQuoteCache(updatedLink.quote_id);

      // If completed, trigger payment processing
      if (status === PaymentLinkStatus.COMPLETED) {
        await this.processCompletedPayment(updatedLink, gatewayData);
      }

      return updatedLink;

    } catch (error) {
      logger.error('Failed to update payment link status:', error);
      throw error;
    }
  }

  /**
   * Track payment link click
   */
  async trackLinkClick(linkId: string, userAgent?: string, ipAddress?: string): Promise<void> {
    try {
      // Update analytics
      const { data: currentLink, error: fetchError } = await supabase
        .from('payment_links')
        .select('analytics')
        .eq('id', linkId)
        .single();

      if (fetchError) throw fetchError;

      const currentAnalytics = currentLink.analytics || { clicks: 0, conversions: 0 };
      const updatedAnalytics = {
        ...currentAnalytics,
        clicks: currentAnalytics.clicks + 1,
        last_accessed: new Date().toISOString()
      };

      await supabase
        .from('payment_links')
        .update({ analytics: updatedAnalytics })
        .eq('id', linkId);

      // Log the click
      await supabase
        .from('payment_link_analytics')
        .insert({
          link_id: linkId,
          event_type: 'click',
          user_agent: userAgent,
          ip_address: ipAddress,
          timestamp: new Date().toISOString()
        });

      logger.debug('Payment link click tracked:', linkId);

    } catch (error) {
      logger.error('Failed to track link click:', error);
      // Don't throw, as this is non-critical
    }
  }

  /**
   * Cancel payment link
   */
  async cancelPaymentLink(linkId: string, reason?: string): Promise<PaymentLink> {
    try {
      logger.info('Cancelling payment link:', linkId);

      const { data: link, error: fetchError } = await supabase
        .from('payment_links')
        .select('*')
        .eq('id', linkId)
        .single();

      if (fetchError) throw fetchError;

      if (link.status !== PaymentLinkStatus.ACTIVE) {
        throw new Error(`Cannot cancel link with status: ${link.status}`);
      }

      // Cancel with gateway if supported
      if (this.gatewayCapabilities[link.gateway].supports_webhooks) {
        try {
          await this.cancelGatewayPaymentLink(link);
        } catch (gatewayError) {
          logger.warn('Gateway cancellation failed:', gatewayError);
          // Continue with local cancellation
        }
      }

      // Update local status
      const { data: cancelledLink, error } = await supabase
        .from('payment_links')
        .update({
          status: PaymentLinkStatus.CANCELLED,
          updated_at: new Date().toISOString(),
          metadata: {
            ...link.metadata,
            cancellation_reason: reason
          }
        })
        .eq('id', linkId)
        .select('*')
        .single();

      if (error) throw error;

      // Clear cache
      this.clearQuoteCache(link.quote_id);

      return cancelledLink;

    } catch (error) {
      logger.error('Failed to cancel payment link:', error);
      throw error;
    }
  }

  /**
   * Get payment link analytics
   */
  async getLinkAnalytics(dateFrom: string, dateTo: string): Promise<PaymentLinkAnalytics> {
    try {
      const { data: links, error } = await supabase
        .from('payment_links')
        .select('*')
        .gte('created_at', dateFrom)
        .lte('created_at', dateTo);

      if (error) throw error;

      const analytics = this.calculateLinkAnalytics(links || []);
      logger.info('Payment link analytics calculated for date range');

      return analytics;

    } catch (error) {
      logger.error('Failed to get link analytics:', error);
      throw error;
    }
  }

  /**
   * Get gateway capabilities
   */
  getGatewayCapabilities(gateway: PaymentGateway): GatewayCapabilities {
    return this.gatewayCapabilities[gateway];
  }

  /**
   * Recommend best gateway for payment
   */
  recommendGateway(amount: number, currency: string, country?: string): {
    recommended: PaymentGateway;
    alternatives: PaymentGateway[];
    reasons: string[];
  } {
    const suitableGateways = Object.entries(this.gatewayCapabilities)
      .filter(([gateway, caps]) => {
        return caps.supported_currencies.includes(currency) &&
               amount >= caps.min_amount &&
               amount <= caps.max_amount;
      })
      .map(([gateway]) => gateway as PaymentGateway);

    // Simple recommendation logic based on country and currency
    let recommended: PaymentGateway;
    const reasons: string[] = [];

    if (currency === 'NPR') {
      recommended = PaymentGateway.ESEWA;
      reasons.push('Best coverage for Nepal');
    } else if (currency === 'INR') {
      recommended = PaymentGateway.PAYU;
      reasons.push('Excellent coverage for India');
    } else {
      recommended = PaymentGateway.STRIPE;
      reasons.push('Global coverage and reliability');
    }

    // Ensure recommended gateway is suitable
    if (!suitableGateways.includes(recommended)) {
      recommended = suitableGateways[0] || PaymentGateway.STRIPE;
      reasons.push('Fallback selection based on amount and currency');
    }

    const alternatives = suitableGateways.filter(g => g !== recommended);

    return {
      recommended,
      alternatives,
      reasons
    };
  }

  /**
   * Private helper methods
   */
  private async validatePaymentLinkInput(linkData: CreatePaymentLinkInput): Promise<void> {
    if (!linkData.quote_id) {
      throw new Error('Quote ID is required');
    }

    if (!linkData.amount || linkData.amount <= 0) {
      throw new Error('Valid payment amount is required');
    }

    if (!linkData.currency) {
      throw new Error('Currency is required');
    }

    if (!linkData.gateway) {
      throw new Error('Payment gateway is required');
    }

    // Check gateway capabilities
    const capabilities = this.gatewayCapabilities[linkData.gateway];
    if (!capabilities) {
      throw new Error(`Unsupported gateway: ${linkData.gateway}`);
    }

    if (!capabilities.supported_currencies.includes(linkData.currency)) {
      throw new Error(`Gateway ${linkData.gateway} does not support currency ${linkData.currency}`);
    }

    if (linkData.amount < capabilities.min_amount || linkData.amount > capabilities.max_amount) {
      throw new Error(`Amount must be between ${capabilities.min_amount} and ${capabilities.max_amount} for ${linkData.gateway}`);
    }
  }

  private async getGatewayConfig(gateway: PaymentGateway): Promise<PaymentLinkConfig> {
    try {
      // Check cache first
      const cached = this.configCache.get(gateway);
      if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
        return cached.config;
      }

      // Fetch from database
      const { data: config, error } = await supabase
        .from('payment_gateway_configs')
        .select('*')
        .eq('gateway', gateway)
        .eq('is_active', true)
        .single();

      if (error) {
        logger.error('Failed to get gateway config:', error);
        throw new Error(`Gateway configuration not found for ${gateway}`);
      }

      // Cache the config
      this.configCache.set(gateway, {
        config,
        timestamp: Date.now()
      });

      return config;

    } catch (error) {
      logger.error('Failed to get gateway config:', error);
      throw error;
    }
  }

  private async createGatewayPaymentLink(
    linkData: CreatePaymentLinkInput,
    config: PaymentLinkConfig
  ): Promise<{
    payment_url: string;
    gateway_payment_id: string;
    raw_response: Record<string, unknown>;
  }> {
    try {
      // This would integrate with actual payment gateway APIs
      logger.info('Creating gateway payment link:', linkData.gateway);

      // Mock implementation for different gateways
      switch (linkData.gateway) {
        case PaymentGateway.PAYU:
          return this.createPayULink(linkData, config);
        case PaymentGateway.STRIPE:
          return this.createStripeLink(linkData, config);
        case PaymentGateway.ESEWA:
          return this.createEsewaLink(linkData, config);
        default:
          throw new Error(`Gateway integration not implemented: ${linkData.gateway}`);
      }

    } catch (error) {
      logger.error('Gateway payment link creation failed:', error);
      throw error;
    }
  }

  private async createPayULink(
    linkData: CreatePaymentLinkInput,
    config: PaymentLinkConfig
  ): Promise<any> {
    // Mock PayU integration
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return {
      payment_url: `https://secure.payu.in/payment/pay?id=payu_${Date.now()}`,
      gateway_payment_id: `payu_${Date.now()}`,
      raw_response: {
        status: 'success',
        payment_id: `payu_${Date.now()}`,
        amount: linkData.amount,
        currency: linkData.currency
      }
    };
  }

  private async createStripeLink(
    linkData: CreatePaymentLinkInput,
    config: PaymentLinkConfig
  ): Promise<any> {
    // Mock Stripe integration
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return {
      payment_url: `https://checkout.stripe.com/pay/stripe_${Date.now()}`,
      gateway_payment_id: `pi_${Date.now()}`,
      raw_response: {
        id: `pi_${Date.now()}`,
        amount: linkData.amount * 100, // Stripe uses cents
        currency: linkData.currency.toLowerCase(),
        status: 'requires_payment_method'
      }
    };
  }

  private async createEsewaLink(
    linkData: CreatePaymentLinkInput,
    config: PaymentLinkConfig
  ): Promise<any> {
    // Mock eSewa integration
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return {
      payment_url: `https://esewa.com.np/epay/main?id=esewa_${Date.now()}`,
      gateway_payment_id: `esewa_${Date.now()}`,
      raw_response: {
        status: 'pending',
        payment_id: `esewa_${Date.now()}`,
        amount: linkData.amount,
        currency: linkData.currency
      }
    };
  }

  private async cancelGatewayPaymentLink(link: PaymentLink): Promise<void> {
    // This would integrate with gateway cancellation APIs
    logger.info('Cancelling gateway payment link:', link.gateway);
    
    // Mock implementation
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  private processLinkData(links: any[]): PaymentLink[] {
    return links.map(link => ({
      ...link,
      metadata: typeof link.metadata === 'string' ? JSON.parse(link.metadata) : link.metadata,
      analytics: typeof link.analytics === 'string' ? JSON.parse(link.analytics) : link.analytics
    }));
  }

  private async updateExpiredLinks(links: PaymentLink[]): Promise<void> {
    const now = new Date();
    const expiredLinks = links.filter(link => 
      link.status === PaymentLinkStatus.ACTIVE && 
      link.expires_at && 
      new Date(link.expires_at) < now
    );

    if (expiredLinks.length > 0) {
      const expiredIds = expiredLinks.map(link => link.id);
      
      await supabase
        .from('payment_links')
        .update({ 
          status: PaymentLinkStatus.EXPIRED,
          updated_at: new Date().toISOString()
        })
        .in('id', expiredIds);

      logger.info(`Updated ${expiredIds.length} expired payment links`);
    }
  }

  private async processCompletedPayment(link: PaymentLink, gatewayData?: Record<string, unknown>): Promise<void> {
    try {
      logger.info('Processing completed payment for link:', link.id);

      // This would integrate with PaymentLedgerService to record the payment
      // await paymentLedgerService.recordPayment({
      //   quote_id: link.quote_id,
      //   amount: link.amount,
      //   currency: link.currency,
      //   payment_method: link.gateway,
      //   gateway_transaction_id: link.gateway_payment_id,
      //   gateway_response: gatewayData
      // });

      // Update analytics
      const currentAnalytics = link.analytics || { clicks: 0, conversions: 0 };
      const updatedAnalytics = {
        ...currentAnalytics,
        conversions: currentAnalytics.conversions + 1
      };

      await supabase
        .from('payment_links')
        .update({ analytics: updatedAnalytics })
        .eq('id', link.id);

    } catch (error) {
      logger.error('Failed to process completed payment:', error);
    }
  }

  private async sendPaymentLinkEmail(link: PaymentLink, email: string): Promise<void> {
    try {
      logger.info('Sending payment link email:', { link_id: link.id, email });
      
      // TODO: Integrate with email service
      // await emailService.sendPaymentLink({
      //   to: email,
      //   link: link.payment_url,
      //   amount: link.amount,
      //   currency: link.currency
      // });

    } catch (error) {
      logger.error('Failed to send payment link email:', error);
    }
  }

  private async sendPaymentLinkSMS(link: PaymentLink, phone: string): Promise<void> {
    try {
      logger.info('Sending payment link SMS:', { link_id: link.id, phone });
      
      // TODO: Integrate with SMS service
      // await smsService.sendPaymentLink({
      //   to: phone,
      //   link: link.payment_url,
      //   amount: link.amount,
      //   currency: link.currency
      // });

    } catch (error) {
      logger.error('Failed to send payment link SMS:', error);
    }
  }

  private async logLinkActivity(activity: {
    link_id: string;
    quote_id: string;
    action: string;
    gateway: PaymentGateway;
    details?: any;
  }): Promise<void> {
    try {
      await supabase
        .from('payment_link_activity_logs')
        .insert({
          ...activity,
          timestamp: new Date().toISOString()
        });
    } catch (error) {
      logger.error('Failed to log link activity:', error);
    }
  }

  private calculateLinkAnalytics(links: any[]): PaymentLinkAnalytics {
    const totalLinks = links.length;
    const activeLinks = links.filter(l => l.status === PaymentLinkStatus.ACTIVE).length;
    const completedLinks = links.filter(l => l.status === PaymentLinkStatus.COMPLETED).length;
    
    const totalClicks = links.reduce((sum, link) => sum + (link.analytics?.clicks || 0), 0);
    const totalConversions = links.reduce((sum, link) => sum + (link.analytics?.conversions || 0), 0);
    const conversionRate = totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0;

    const completedLinksWithTime = links.filter(l => l.status === PaymentLinkStatus.COMPLETED && l.created_at && l.completed_at);
    const averageCompletionTime = completedLinksWithTime.length > 0
      ? completedLinksWithTime.reduce((sum, link) => {
          const created = new Date(link.created_at).getTime();
          const completed = new Date(link.completed_at).getTime();
          return sum + (completed - created);
        }, 0) / completedLinksWithTime.length / (1000 * 60) // Convert to minutes
      : 0;

    const revenueGenerated = links
      .filter(l => l.status === PaymentLinkStatus.COMPLETED)
      .reduce((sum, l) => sum + l.amount, 0);

    // Gateway performance analysis
    const gatewayPerformance: Record<PaymentGateway, any> = {} as any;
    Object.values(PaymentGateway).forEach(gateway => {
      const gatewayLinks = links.filter(l => l.gateway === gateway);
      const gatewayCompleted = gatewayLinks.filter(l => l.status === PaymentLinkStatus.COMPLETED);
      
      gatewayPerformance[gateway] = {
        links: gatewayLinks.length,
        revenue: gatewayCompleted.reduce((sum, l) => sum + l.amount, 0),
        success_rate: gatewayLinks.length > 0 ? (gatewayCompleted.length / gatewayLinks.length) * 100 : 0,
        average_processing_time: 0 // Would be calculated from actual data
      };
    });

    return {
      total_links: totalLinks,
      active_links: activeLinks,
      completed_links: completedLinks,
      total_clicks: totalClicks,
      conversion_rate: conversionRate,
      average_completion_time: averageCompletionTime,
      revenue_generated: revenueGenerated,
      gateway_performance: gatewayPerformance
    };
  }

  // Cache management methods
  private getFromCache(quoteId: string): PaymentLink[] | null {
    const cached = this.linkCache.get(quoteId);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.data;
    }
    
    if (cached) {
      this.linkCache.delete(quoteId);
    }
    
    return null;
  }

  private setCache(quoteId: string, data: PaymentLink[]): void {
    this.linkCache.set(quoteId, {
      data,
      timestamp: Date.now()
    });
  }

  private clearQuoteCache(quoteId: string): void {
    this.linkCache.delete(quoteId);
  }

  /**
   * Public utility methods
   */
  clearAllCache(): void {
    this.linkCache.clear();
    this.configCache.clear();
    logger.info('Payment link cache cleared');
  }

  dispose(): void {
    this.linkCache.clear();
    this.configCache.clear();
    logger.info('PaymentLinkService disposed');
  }
}

export default PaymentLinkService;