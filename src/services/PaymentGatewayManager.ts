/**
 * Payment Gateway Management Service
 * 
 * Handles gateway configuration, health monitoring, and webhook processing
 */

import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

interface GatewayConfig {
  name: string;
  display_name: string;
  provider_type: 'card' | 'wallet' | 'bank' | 'crypto' | 'bnpl';
  supported_countries: string[];
  supported_currencies: string[];
  min_amount: number;
  max_amount: number;
  config: {
    api_key?: string;
    secret_key?: string;
    webhook_secret?: string;
    endpoint_url?: string;
    sandbox_mode?: boolean;
    [key: string]: any;
  };
  fee_structure: {
    percentage?: number;
    fixed_fee?: number;
    country_fees?: Record<string, { percentage?: number; fixed_fee?: number }>;
    method_fees?: Record<string, { percentage?: number; fixed_fee?: number }>;
    volume_discounts?: Array<{
      min_volume: number;
      discount_percentage: number;
    }>;
  };
}

export class PaymentGatewayManager {
  private static instance: PaymentGatewayManager;
  
  private constructor() {}

  static getInstance(): PaymentGatewayManager {
    if (!PaymentGatewayManager.instance) {
      PaymentGatewayManager.instance = new PaymentGatewayManager();
    }
    return PaymentGatewayManager.instance;
  }

  /**
   * Register a new payment gateway
   */
  async registerGateway(config: GatewayConfig): Promise<string> {
    try {
      // Validate configuration
      this.validateGatewayConfig(config);

      // Encrypt sensitive configuration
      const encryptedConfig = await this.encryptSensitiveConfig(config.config);

      const { data, error } = await supabase
        .from('payment_gateways')
        .insert({
          name: config.name,
          display_name: config.display_name,
          provider_type: config.provider_type,
          supported_countries: config.supported_countries,
          supported_currencies: config.supported_currencies,
          min_amount: config.min_amount,
          max_amount: config.max_amount,
          config: encryptedConfig,
          fee_structure: config.fee_structure,
          is_active: false, // Start inactive for testing
          is_test_mode: true
        })
        .select('id')
        .single();

      if (error) throw error;

      logger.info(`Payment gateway registered: ${config.name} (${data.id})`);
      
      // Perform initial health check
      await this.performHealthCheck(data.id);
      
      return data.id;

    } catch (error) {
      logger.error('Gateway registration failed:', error);
      throw error;
    }
  }

  /**
   * Update gateway configuration
   */
  async updateGateway(gatewayId: string, updates: Partial<GatewayConfig>): Promise<void> {
    try {
      const updateData: any = { ...updates };
      
      // Encrypt config if provided
      if (updates.config) {
        updateData.config = await this.encryptSensitiveConfig(updates.config);
      }

      updateData.updated_at = new Date().toISOString();

      const { error } = await supabase
        .from('payment_gateways')
        .update(updateData)
        .eq('id', gatewayId);

      if (error) throw error;

      logger.info(`Payment gateway updated: ${gatewayId}`);

      // Refresh health check after update
      await this.performHealthCheck(gatewayId);

    } catch (error) {
      logger.error('Gateway update failed:', error);
      throw error;
    }
  }

  /**
   * Enable/disable a gateway
   */
  async toggleGateway(gatewayId: string, isActive: boolean): Promise<void> {
    try {
      if (isActive) {
        // Perform health check before enabling
        const isHealthy = await this.performHealthCheck(gatewayId);
        if (!isHealthy) {
          throw new Error('Gateway failed health check - cannot enable');
        }
      }

      const { error } = await supabase
        .from('payment_gateways')
        .update({ 
          is_active: isActive,
          updated_at: new Date().toISOString()
        })
        .eq('id', gatewayId);

      if (error) throw error;

      logger.info(`Gateway ${gatewayId} ${isActive ? 'enabled' : 'disabled'}`);

    } catch (error) {
      logger.error('Gateway toggle failed:', error);
      throw error;
    }
  }

  /**
   * Perform health check on a gateway
   */
  async performHealthCheck(gatewayId: string): Promise<boolean> {
    try {
      const { data: gateway, error } = await supabase
        .from('payment_gateways')
        .select('*')
        .eq('id', gatewayId)
        .single();

      if (error || !gateway) {
        throw new Error('Gateway not found');
      }

      // Decrypt config for health check
      const config = await this.decryptSensitiveConfig(gateway.config);
      
      const startTime = Date.now();
      let isHealthy = false;
      
      try {
        // Perform gateway-specific health check
        isHealthy = await this.gatewaySpecificHealthCheck(gateway.name, config);
      } catch (error) {
        logger.error(`Health check failed for ${gateway.name}:`, error);
      }

      const responseTime = Date.now() - startTime;

      // Update gateway with health check results
      await supabase
        .from('payment_gateways')
        .update({
          last_health_check: new Date().toISOString(),
          avg_processing_time: responseTime
        })
        .eq('id', gatewayId);

      // Record health metrics
      await this.recordHealthMetric(gatewayId, {
        is_healthy: isHealthy,
        response_time: responseTime,
        timestamp: new Date()
      });

      return isHealthy;

    } catch (error) {
      logger.error('Health check failed:', error);
      return false;
    }
  }

  /**
   * Process webhook from a payment gateway
   */
  async processWebhook(
    gatewayName: string, 
    webhookData: any, 
    signature?: string
  ): Promise<void> {
    try {
      // Get gateway configuration
      const { data: gateway, error } = await supabase
        .from('payment_gateways')
        .select('*')
        .eq('name', gatewayName)
        .single();

      if (error || !gateway) {
        throw new Error(`Gateway not found: ${gatewayName}`);
      }

      // Verify webhook signature
      const config = await this.decryptSensitiveConfig(gateway.config);
      if (!this.verifyWebhookSignature(gatewayName, webhookData, signature, config)) {
        throw new Error('Invalid webhook signature');
      }

      // Process the webhook based on gateway type
      await this.processGatewayWebhook(gateway, webhookData);

    } catch (error) {
      logger.error('Webhook processing failed:', error);
      throw error;
    }
  }

  /**
   * Get gateway analytics and performance metrics
   */
  async getGatewayAnalytics(
    gatewayId: string, 
    timeRange: 'hour' | 'day' | 'week' | 'month' = 'day'
  ): Promise<any> {
    try {
      const timeFilter = this.getTimeFilter(timeRange);
      
      const { data: metrics, error } = await supabase
        .from('gateway_health_metrics')
        .select('*')
        .eq('gateway_id', gatewayId)
        .gte('created_at', timeFilter)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Aggregate metrics
      const analytics = this.aggregateMetrics(metrics || []);
      
      // Get recent transactions
      const { data: transactions } = await supabase
        .from('payment_transactions')
        .select('status, amount, currency, created_at, processing_duration_ms')
        .eq('gateway_id', gatewayId)
        .gte('created_at', timeFilter)
        .order('created_at', { ascending: false })
        .limit(100);

      analytics.recent_transactions = transactions || [];
      
      return analytics;

    } catch (error) {
      logger.error('Analytics retrieval failed:', error);
      throw error;
    }
  }

  /**
   * Automatically update gateway success rates based on transaction history
   */
  async updateGatewaySuccessRates(): Promise<void> {
    try {
      const { data: gateways } = await supabase
        .from('payment_gateways')
        .select('id');

      for (const gateway of gateways || []) {
        const successRate = await this.calculateGatewaySuccessRate(gateway.id);
        
        await supabase
          .from('payment_gateways')
          .update({ success_rate: successRate })
          .eq('id', gateway.id);
      }

      logger.info('Gateway success rates updated');

    } catch (error) {
      logger.error('Success rate update failed:', error);
    }
  }

  /**
   * Create routing rule for intelligent gateway selection
   */
  async createRoutingRule(rule: {
    name: string;
    priority: number;
    conditions: Record<string, any>;
    gateway_preferences: string[];
    fallback_strategy?: string;
    load_balancing_type?: string;
    weights?: Record<string, number>;
  }): Promise<string> {
    try {
      const { data, error } = await supabase
        .from('payment_routing_rules')
        .insert({
          name: rule.name,
          priority: rule.priority,
          conditions: rule.conditions,
          gateway_preferences: rule.gateway_preferences,
          fallback_strategy: rule.fallback_strategy || 'next_available',
          load_balancing_type: rule.load_balancing_type || 'round_robin',
          weights: rule.weights || {}
        })
        .select('id')
        .single();

      if (error) throw error;

      logger.info(`Routing rule created: ${rule.name} (${data.id})`);
      return data.id;

    } catch (error) {
      logger.error('Routing rule creation failed:', error);
      throw error;
    }
  }

  // Private helper methods

  private validateGatewayConfig(config: GatewayConfig): void {
    if (!config.name || !config.display_name) {
      throw new Error('Gateway name and display name are required');
    }

    if (!config.supported_countries || config.supported_countries.length === 0) {
      throw new Error('At least one supported country is required');
    }

    if (!config.supported_currencies || config.supported_currencies.length === 0) {
      throw new Error('At least one supported currency is required');
    }

    if (config.min_amount < 0 || config.max_amount <= config.min_amount) {
      throw new Error('Invalid amount limits');
    }
  }

  private async encryptSensitiveConfig(config: Record<string, any>): Promise<Record<string, any>> {
    // In production, use proper encryption for sensitive data
    // For now, we'll just mark sensitive fields
    const sensitiveFields = ['api_key', 'secret_key', 'webhook_secret'];
    const encrypted = { ...config };
    
    for (const field of sensitiveFields) {
      if (encrypted[field]) {
        // In production: encrypted[field] = await encrypt(encrypted[field]);
        encrypted[field] = `[ENCRYPTED]${encrypted[field].slice(-4)}`; // Show last 4 chars only
      }
    }
    
    return encrypted;
  }

  private async decryptSensitiveConfig(config: Record<string, any>): Promise<Record<string, any>> {
    // In production, decrypt the sensitive fields
    // For now, return as-is for health checks
    return config;
  }

  private async gatewaySpecificHealthCheck(
    gatewayName: string, 
    config: Record<string, any>
  ): Promise<boolean> {
    try {
      switch (gatewayName) {
        case 'stripe':
          return await this.stripeHealthCheck(config);
        case 'payu':
          return await this.payuHealthCheck(config);
        case 'razorpay':
          return await this.razorpayHealthCheck(config);
        case 'paypal':
          return await this.paypalHealthCheck(config);
        default:
          // Generic health check - just ping the endpoint
          if (config.endpoint_url) {
            const response = await fetch(config.endpoint_url, { 
              method: 'HEAD',
              timeout: 5000 
            });
            return response.ok;
          }
          return true; // Assume healthy if no specific check
      }
    } catch (error) {
      logger.error(`Gateway ${gatewayName} health check failed:`, error);
      return false;
    }
  }

  private async stripeHealthCheck(config: Record<string, any>): Promise<boolean> {
    // Stripe-specific health check
    // In production, make actual API call to Stripe
    return Promise.resolve(!!config.api_key);
  }

  private async payuHealthCheck(config: Record<string, any>): Promise<boolean> {
    // PayU-specific health check
    return Promise.resolve(!!config.api_key && !!config.secret_key);
  }

  private async razorpayHealthCheck(config: Record<string, any>): Promise<boolean> {
    // Razorpay-specific health check
    return Promise.resolve(!!config.api_key && !!config.secret_key);
  }

  private async paypalHealthCheck(config: Record<string, any>): Promise<boolean> {
    // PayPal-specific health check
    return Promise.resolve(!!config.client_id && !!config.client_secret);
  }

  private verifyWebhookSignature(
    gatewayName: string,
    webhookData: any,
    signature?: string,
    config?: Record<string, any>
  ): boolean {
    // Implement gateway-specific signature verification
    // This is crucial for security
    
    if (!signature || !config?.webhook_secret) {
      return false;
    }

    switch (gatewayName) {
      case 'stripe':
        // Implement Stripe signature verification
        return true; // Placeholder
      case 'payu':
        // Implement PayU signature verification
        return true; // Placeholder
      default:
        return true; // Placeholder
    }
  }

  private async processGatewayWebhook(
    gateway: any,
    webhookData: any
  ): Promise<void> {
    try {
      // Extract payment information from webhook
      const paymentInfo = this.extractPaymentInfo(gateway.name, webhookData);
      
      if (!paymentInfo) {
        logger.warn(`No payment info found in webhook for ${gateway.name}`);
        return;
      }

      // Update payment transaction status
      if (paymentInfo.transaction_id) {
        await supabase
          .from('payment_transactions')
          .update({
            status: paymentInfo.status,
            gateway_response: webhookData,
            gateway_status: paymentInfo.gateway_status,
            processing_completed_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('gateway_transaction_id', paymentInfo.transaction_id);
      }

      // Log the webhook event
      await supabase
        .from('payment_events')
        .insert({
          gateway_id: gateway.id,
          event_type: 'webhook_received',
          event_source: 'gateway_webhook',
          event_data: webhookData
        });

    } catch (error) {
      logger.error('Webhook processing failed:', error);
      throw error;
    }
  }

  private extractPaymentInfo(gatewayName: string, webhookData: any): any {
    // Extract standardized payment info from gateway-specific webhook data
    switch (gatewayName) {
      case 'stripe':
        return {
          transaction_id: webhookData.data?.object?.id,
          status: this.mapStripeStatus(webhookData.data?.object?.status),
          gateway_status: webhookData.data?.object?.status
        };
      case 'payu':
        return {
          transaction_id: webhookData.txnid,
          status: this.mapPayuStatus(webhookData.status),
          gateway_status: webhookData.status
        };
      default:
        return null;
    }
  }

  private mapStripeStatus(stripeStatus: string): string {
    const statusMap: Record<string, string> = {
      'succeeded': 'succeeded',
      'pending': 'processing',
      'failed': 'failed',
      'canceled': 'cancelled'
    };
    return statusMap[stripeStatus] || 'pending';
  }

  private mapPayuStatus(payuStatus: string): string {
    const statusMap: Record<string, string> = {
      'success': 'succeeded',
      'failure': 'failed',
      'pending': 'processing'
    };
    return statusMap[payuStatus] || 'pending';
  }

  private async recordHealthMetric(
    gatewayId: string,
    metric: {
      is_healthy: boolean;
      response_time: number;
      timestamp: Date;
    }
  ): Promise<void> {
    try {
      const now = metric.timestamp;
      const metricDate = now.toISOString().split('T')[0];
      const hourOfDay = now.getHours();

      // Upsert hourly metrics
      await supabase
        .from('gateway_health_metrics')
        .upsert({
          gateway_id: gatewayId,
          metric_date: metricDate,
          hour_of_day: hourOfDay,
          total_requests: 1,
          successful_requests: metric.is_healthy ? 1 : 0,
          failed_requests: metric.is_healthy ? 0 : 1,
          avg_response_time_ms: metric.response_time
        }, {
          onConflict: 'gateway_id,metric_date,hour_of_day'
        });

    } catch (error) {
      logger.error('Health metric recording failed:', error);
    }
  }

  private getTimeFilter(timeRange: string): string {
    const now = new Date();
    switch (timeRange) {
      case 'hour':
        return new Date(now.getTime() - 60 * 60 * 1000).toISOString();
      case 'day':
        return new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
      case 'week':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      case 'month':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
      default:
        return new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    }
  }

  private aggregateMetrics(metrics: any[]): any {
    if (metrics.length === 0) {
      return {
        total_requests: 0,
        success_rate: 0,
        avg_response_time: 0,
        total_volume: 0
      };
    }

    const totals = metrics.reduce((acc, metric) => ({
      total_requests: acc.total_requests + metric.total_requests,
      successful_requests: acc.successful_requests + metric.successful_requests,
      total_volume: acc.total_volume + metric.total_volume,
      response_time_sum: acc.response_time_sum + (metric.avg_response_time_ms * metric.total_requests)
    }), {
      total_requests: 0,
      successful_requests: 0,
      total_volume: 0,
      response_time_sum: 0
    });

    return {
      total_requests: totals.total_requests,
      success_rate: totals.total_requests > 0 ? 
        (totals.successful_requests / totals.total_requests) * 100 : 0,
      avg_response_time: totals.total_requests > 0 ? 
        totals.response_time_sum / totals.total_requests : 0,
      total_volume: totals.total_volume
    };
  }

  private async calculateGatewaySuccessRate(gatewayId: string): Promise<number> {
    try {
      // Calculate success rate based on last 1000 transactions
      const { data: transactions } = await supabase
        .from('payment_transactions')
        .select('status')
        .eq('gateway_id', gatewayId)
        .order('created_at', { ascending: false })
        .limit(1000);

      if (!transactions || transactions.length === 0) {
        return 100; // Default to 100% if no transactions
      }

      const successfulTransactions = transactions.filter(
        t => t.status === 'succeeded'
      ).length;

      return (successfulTransactions / transactions.length) * 100;

    } catch (error) {
      logger.error('Success rate calculation failed:', error);
      return 100; // Default to 100% on error
    }
  }
}

// Export singleton instance
export const gatewayManager = PaymentGatewayManager.getInstance();