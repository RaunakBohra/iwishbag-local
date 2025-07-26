/**
 * Cloudflare Queue Service
 * 
 * Handles async task queuing for emails, webhooks, and background processing
 * Provides type-safe interfaces for queue operations
 */

import { logger } from '@/lib/logger';

// Queue message types
export interface QueueMessage<T = any> {
  type: string;
  data: T;
  priority?: 'low' | 'normal' | 'high';
  delay?: number; // seconds
  retries?: number;
}

// Email message types
export interface EmailOrderConfirmation {
  orderId: string;
  customerEmail: string;
  customerName: string;
  orderDetails: {
    items: Array<{
      name: string;
      quantity: number;
      total: number;
    }>;
    total: number;
    currency: string;
  };
}

export interface EmailQuoteReady {
  quoteId: string;
  customerEmail: string;
  customerName: string;
  quoteUrl: string;
  expiresAt: string;
}

export interface EmailPaymentReceived {
  orderId: string;
  customerEmail: string;
  customerName: string;
  amount: number;
  currency: string;
  paymentMethod: string;
}

export interface EmailShippingUpdate {
  orderId: string;
  customerEmail: string;
  trackingNumber: string;
  carrier: string;
  estimatedDelivery: string;
}

// Webhook message types
export interface WebhookPayload {
  webhookUrl: string;
  payload: any;
  signature: string;
  eventType: string;
}

// Analytics message types
export interface AnalyticsEvent {
  event: string;
  properties: Record<string, any>;
  userId?: string;
  timestamp: string;
}

// Cache invalidation message types
export interface CacheInvalidation {
  keys?: string[];
  patterns?: string[];
}

// D1 sync message types
export interface D1Sync {
  table: string;
  records: any[];
  operation: 'upsert' | 'delete';
}

export class CloudflareQueueService {
  private static instance: CloudflareQueueService;
  private workerUrl: string;
  
  private constructor() {
    this.workerUrl = import.meta.env.VITE_QUEUE_WORKER_URL || 
      'https://iwishbag-queue-producer.YOUR_SUBDOMAIN.workers.dev';
  }
  
  static getInstance(): CloudflareQueueService {
    if (!CloudflareQueueService.instance) {
      CloudflareQueueService.instance = new CloudflareQueueService();
    }
    return CloudflareQueueService.instance;
  }
  
  /**
   * Send message to queue
   */
  private async sendMessage<T>(message: QueueMessage<T>): Promise<void> {
    try {
      const response = await fetch(`${this.workerUrl}/queue/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
      });
      
      if (!response.ok) {
        throw new Error(`Queue send failed: ${response.status}`);
      }
      
      logger.info(`Message queued: ${message.type}`, message, 'QueueService');
    } catch (error) {
      logger.error(`Failed to queue message: ${message.type}`, error, 'QueueService');
      throw error;
    }
  }
  
  /**
   * Send order confirmation email
   */
  async sendOrderConfirmationEmail(data: EmailOrderConfirmation): Promise<void> {
    return this.sendMessage({
      type: 'email:order_confirmation',
      data,
      priority: 'high',
    });
  }
  
  /**
   * Send quote ready email
   */
  async sendQuoteReadyEmail(data: EmailQuoteReady): Promise<void> {
    return this.sendMessage({
      type: 'email:quote_ready',
      data,
      priority: 'normal',
    });
  }
  
  /**
   * Send payment received email
   */
  async sendPaymentReceivedEmail(data: EmailPaymentReceived): Promise<void> {
    return this.sendMessage({
      type: 'email:payment_received',
      data,
      priority: 'high',
    });
  }
  
  /**
   * Send shipping update email
   */
  async sendShippingUpdateEmail(data: EmailShippingUpdate): Promise<void> {
    return this.sendMessage({
      type: 'email:shipping_update',
      data,
      priority: 'normal',
    });
  }
  
  /**
   * Send webhook notification
   */
  async sendWebhook(data: WebhookPayload): Promise<void> {
    return this.sendMessage({
      type: `webhook:${data.eventType}`,
      data,
      priority: 'high',
      retries: 3,
    });
  }
  
  /**
   * Track analytics event
   */
  async trackAnalyticsEvent(data: AnalyticsEvent): Promise<void> {
    return this.sendMessage({
      type: 'analytics:track_event',
      data,
      priority: 'low',
    });
  }
  
  /**
   * Invalidate cache
   */
  async invalidateCache(data: CacheInvalidation): Promise<void> {
    return this.sendMessage({
      type: 'cache:invalidate',
      data,
      priority: 'high',
    });
  }
  
  /**
   * Sync data to D1
   */
  async syncToD1(data: D1Sync): Promise<void> {
    return this.sendMessage({
      type: 'sync:update_d1',
      data,
      priority: 'normal',
    });
  }
  
  /**
   * Send batch of messages
   */
  async sendBatch<T>(messages: QueueMessage<T>[]): Promise<void> {
    try {
      const response = await fetch(`${this.workerUrl}/queue/batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ messages }),
      });
      
      if (!response.ok) {
        throw new Error(`Batch queue send failed: ${response.status}`);
      }
      
      logger.info(`Batch queued: ${messages.length} messages`, null, 'QueueService');
    } catch (error) {
      logger.error('Failed to queue batch messages', error, 'QueueService');
      throw error;
    }
  }
  
  /**
   * Get queue statistics
   */
  async getQueueStats(): Promise<{
    pending: number;
    processing: number;
    completed: number;
    failed: number;
  }> {
    try {
      const response = await fetch(`${this.workerUrl}/queue/stats`);
      if (!response.ok) {
        throw new Error(`Failed to get queue stats: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      logger.error('Failed to get queue stats', error, 'QueueService');
      return { pending: 0, processing: 0, completed: 0, failed: 0 };
    }
  }
  
  // Convenience methods for common operations
  
  /**
   * Send order completion workflow
   */
  async sendOrderCompletionWorkflow(orderId: string, customerData: {
    email: string;
    name: string;
  }, orderDetails: any): Promise<void> {
    const messages: QueueMessage<any>[] = [
      // Send confirmation email
      {
        type: 'email:order_confirmation',
        data: {
          orderId,
          customerEmail: customerData.email,
          customerName: customerData.name,
          orderDetails,
        },
        priority: 'high',
      },
      
      // Send webhook to external systems
      {
        type: 'webhook:order_created',
        data: {
          webhookUrl: import.meta.env.VITE_ORDER_WEBHOOK_URL,
          payload: { orderId, customer: customerData, order: orderDetails },
          signature: 'generated_signature',
          eventType: 'order_created',
        },
        priority: 'normal',
      },
      
      // Track analytics
      {
        type: 'analytics:track_event',
        data: {
          event: 'order_completed',
          properties: {
            order_id: orderId,
            value: orderDetails.total,
            currency: orderDetails.currency,
            items: orderDetails.items.length,
          },
          userId: customerData.email,
          timestamp: new Date().toISOString(),
        },
        priority: 'low',
      },
      
      // Update popular products cache
      {
        type: 'sync:update_d1',
        data: {
          table: 'popular_products_cache',
          records: orderDetails.items.map((item: any) => ({
            id: item.id,
            name: item.name,
            category: item.category,
            purchase_count: 1, // Will be incremented
          })),
          operation: 'upsert',
        },
        priority: 'low',
      },
    ];
    
    await this.sendBatch(messages);
  }
  
  /**
   * Send quote workflow
   */
  async sendQuoteWorkflow(quoteId: string, customerData: {
    email: string;
    name: string;
  }, quoteData: any): Promise<void> {
    const messages: QueueMessage<any>[] = [
      // Send quote ready email
      {
        type: 'email:quote_ready',
        data: {
          quoteId,
          customerEmail: customerData.email,
          customerName: customerData.name,
          quoteUrl: `${window.location.origin}/quote/${quoteId}`,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
        },
        priority: 'normal',
      },
      
      // Track quote created
      {
        type: 'analytics:track_event',
        data: {
          event: 'quote_created',
          properties: {
            quote_id: quoteId,
            value: quoteData.total,
            currency: quoteData.currency,
            items: quoteData.items.length,
            origin: quoteData.origin,
            destination: quoteData.destination,
          },
          userId: customerData.email,
          timestamp: new Date().toISOString(),
        },
        priority: 'low',
      },
    ];
    
    await this.sendBatch(messages);
  }
  
  /**
   * Send payment workflow
   */
  async sendPaymentWorkflow(orderId: string, paymentData: {
    amount: number;
    currency: string;
    method: string;
    customerEmail: string;
    customerName: string;
  }): Promise<void> {
    const messages: QueueMessage<any>[] = [
      // Send payment confirmation
      {
        type: 'email:payment_received',
        data: {
          orderId,
          customerEmail: paymentData.customerEmail,
          customerName: paymentData.customerName,
          amount: paymentData.amount,
          currency: paymentData.currency,
          paymentMethod: paymentData.method,
        },
        priority: 'high',
      },
      
      // Send webhook
      {
        type: 'webhook:payment_completed',
        data: {
          webhookUrl: import.meta.env.VITE_PAYMENT_WEBHOOK_URL,
          payload: { orderId, payment: paymentData },
          signature: 'generated_signature',
          eventType: 'payment_completed',
        },
        priority: 'normal',
      },
      
      // Track payment
      {
        type: 'analytics:track_event',
        data: {
          event: 'payment_completed',
          properties: {
            order_id: orderId,
            amount: paymentData.amount,
            currency: paymentData.currency,
            method: paymentData.method,
          },
          userId: paymentData.customerEmail,
          timestamp: new Date().toISOString(),
        },
        priority: 'low',
      },
    ];
    
    await this.sendBatch(messages);
  }
}

// Export singleton instance
export const cloudflareQueueService = CloudflareQueueService.getInstance();