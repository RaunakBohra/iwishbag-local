interface QueueConfig {
  accountId: string;
  queueId: string;
  apiToken: string;
}

interface QueueMessage {
  body: any;
  timestamp?: number;
  delaySeconds?: number;
}

export class CloudflareQueuesService {
  private static instance: CloudflareQueuesService;
  private config: QueueConfig;

  private constructor() {
    this.config = {
      accountId: import.meta.env.VITE_CLOUDFLARE_ACCOUNT_ID || '610762493d34333f1a6d72a037b345cf',
      queueId: import.meta.env.VITE_CLOUDFLARE_QUEUE_ID || '',
      apiToken: import.meta.env.VITE_CLOUDFLARE_API_TOKEN || '4Y_WjuGIEtTpK85hmE6XrGwbi85d8zN5Me0T_45l'
    };
  }

  static getInstance(): CloudflareQueuesService {
    if (!CloudflareQueuesService.instance) {
      CloudflareQueuesService.instance = new CloudflareQueuesService();
    }
    return CloudflareQueuesService.instance;
  }

  /**
   * Send message to queue
   */
  async sendMessage(message: QueueMessage): Promise<void> {
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${this.config.accountId}/queues/${this.config.queueId}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [message]
        })
      }
    );

    if (!response.ok) {
      throw new Error(`Queue send failed: ${response.status}`);
    }
  }

  // Use Cases for iwishBag:

  /**
   * Queue email notifications
   */
  async queueEmailNotification(
    type: 'quote_approved' | 'quote_rejected' | 'payment_received' | 'order_shipped',
    userId: string,
    quoteId: string,
    data: any
  ): Promise<void> {
    await this.sendMessage({
      body: {
        type: 'email_notification',
        emailType: type,
        userId,
        quoteId,
        data,
        timestamp: Date.now()
      }
    });
  }

  /**
   * Queue product price updates
   */
  async queuePriceUpdate(productUrl: string, quoteId: string): Promise<void> {
    await this.sendMessage({
      body: {
        type: 'price_update',
        productUrl,
        quoteId,
        timestamp: Date.now()
      },
      delaySeconds: 300 // Check price after 5 minutes
    });
  }

  /**
   * Queue analytics processing
   */
  async queueAnalyticsEvent(event: string, data: any): Promise<void> {
    await this.sendMessage({
      body: {
        type: 'analytics_event',
        event,
        data,
        timestamp: Date.now()
      }
    });
  }

  /**
   * Queue order status updates
   */
  async queueOrderStatusCheck(orderId: string, trackingNumber?: string): Promise<void> {
    await this.sendMessage({
      body: {
        type: 'order_status_check',
        orderId,
        trackingNumber,
        timestamp: Date.now()
      },
      delaySeconds: 3600 // Check every hour
    });
  }

  /**
   * Queue image optimization
   */
  async queueImageOptimization(imageUrl: string, sizes: number[]): Promise<void> {
    await this.sendMessage({
      body: {
        type: 'image_optimization',
        imageUrl,
        sizes,
        timestamp: Date.now()
      }
    });
  }

  /**
   * Queue webhook processing
   */
  async queueWebhookProcessing(provider: string, payload: any): Promise<void> {
    await this.sendMessage({
      body: {
        type: 'webhook_processing',
        provider,
        payload,
        timestamp: Date.now()
      }
    });
  }

  /**
   * Queue database maintenance
   */
  async queueDatabaseCleanup(): Promise<void> {
    await this.sendMessage({
      body: {
        type: 'database_cleanup',
        timestamp: Date.now()
      },
      delaySeconds: 86400 // Daily cleanup
    });
  }

  /**
   * Queue report generation
   */
  async queueReportGeneration(
    type: 'monthly' | 'weekly' | 'custom',
    userId: string,
    parameters: any
  ): Promise<void> {
    await this.sendMessage({
      body: {
        type: 'report_generation',
        reportType: type,
        userId,
        parameters,
        timestamp: Date.now()
      }
    });
  }
}