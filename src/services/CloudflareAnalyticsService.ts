interface AnalyticsConfig {
  accountId: string;
  apiToken: string;
  datasetId: string;
}

interface AnalyticsEvent {
  timestamp?: number;
  doubles?: Record<string, number>;
  blobs?: Record<string, string>;
  indexes?: Record<string, string>;
}

export class CloudflareAnalyticsService {
  private static instance: CloudflareAnalyticsService;
  private config: AnalyticsConfig;

  private constructor() {
    this.config = {
      accountId: import.meta.env.VITE_CLOUDFLARE_ACCOUNT_ID || '610762493d34333f1a6d72a037b345cf',
      apiToken: import.meta.env.VITE_CLOUDFLARE_API_TOKEN || '4Y_WjuGIEtTpK85hmE6XrGwbi85d8zN5Me0T_45l',
      datasetId: 'iwishbag_analytics'
    };
  }

  static getInstance(): CloudflareAnalyticsService {
    if (!CloudflareAnalyticsService.instance) {
      CloudflareAnalyticsService.instance = new CloudflareAnalyticsService();
    }
    return CloudflareAnalyticsService.instance;
  }

  /**
   * Send analytics event
   */
  async sendEvent(event: AnalyticsEvent): Promise<void> {
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${this.config.accountId}/analytics_engine/report`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'analytics_engine',
          dataset: this.config.datasetId,
          data: [{ ...event, timestamp: event.timestamp || Date.now() }]
        })
      }
    );

    if (!response.ok) {
      throw new Error(`Analytics send failed: ${response.status}`);
    }
  }

  /**
   * Query analytics data
   */
  async query(sql: string): Promise<any> {
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${this.config.accountId}/analytics_engine/sql`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: sql })
      }
    );

    if (!response.ok) {
      throw new Error(`Analytics query failed: ${response.status}`);
    }

    return response.json();
  }

  // Use Cases for iwishBag:

  /**
   * Track quote creation
   */
  async trackQuoteCreated(
    quoteId: string,
    userId: string,
    totalAmount: number,
    itemCount: number,
    country: string
  ): Promise<void> {
    await this.sendEvent({
      doubles: {
        total_amount: totalAmount,
        item_count: itemCount
      },
      blobs: {
        event_type: 'quote_created',
        quote_id: quoteId,
        user_id: userId,
        country: country
      },
      indexes: {
        event: 'quote_created',
        country: country
      }
    });
  }

  /**
   * Track conversion events
   */
  async trackConversion(
    quoteId: string,
    userId: string,
    step: 'quote_approved' | 'payment_completed' | 'order_placed',
    amount?: number
  ): Promise<void> {
    await this.sendEvent({
      doubles: {
        amount: amount || 0,
        step_order: step === 'quote_approved' ? 1 : step === 'payment_completed' ? 2 : 3
      },
      blobs: {
        event_type: 'conversion',
        quote_id: quoteId,
        user_id: userId,
        step: step
      },
      indexes: {
        event: 'conversion',
        step: step
      }
    });
  }

  /**
   * Track page views
   */
  async trackPageView(
    page: string,
    userId?: string,
    loadTime?: number,
    country?: string
  ): Promise<void> {
    await this.sendEvent({
      doubles: {
        load_time: loadTime || 0
      },
      blobs: {
        event_type: 'page_view',
        page: page,
        user_id: userId || 'anonymous',
        country: country || 'unknown'
      },
      indexes: {
        event: 'page_view',
        page: page
      }
    });
  }

  /**
   * Track search queries
   */
  async trackSearch(
    query: string,
    resultsCount: number,
    userId?: string
  ): Promise<void> {
    await this.sendEvent({
      doubles: {
        results_count: resultsCount,
        query_length: query.length
      },
      blobs: {
        event_type: 'search',
        query: query,
        user_id: userId || 'anonymous'
      },
      indexes: {
        event: 'search'
      }
    });
  }

  /**
   * Track API performance
   */
  async trackAPICall(
    endpoint: string,
    method: string,
    responseTime: number,
    statusCode: number
  ): Promise<void> {
    await this.sendEvent({
      doubles: {
        response_time: responseTime,
        status_code: statusCode
      },
      blobs: {
        event_type: 'api_call',
        endpoint: endpoint,
        method: method
      },
      indexes: {
        event: 'api_call',
        endpoint: endpoint
      }
    });
  }

  // Analytics Queries:

  /**
   * Get conversion funnel data
   */
  async getConversionFunnel(days: number = 30): Promise<any> {
    return this.query(`
      SELECT 
        step,
        COUNT(*) as count,
        COUNT(*) * 100.0 / (
          SELECT COUNT(*) FROM iwishbag_analytics 
          WHERE event_type = 'quote_created' 
          AND timestamp > NOW() - INTERVAL ${days} DAY
        ) as conversion_rate
      FROM iwishbag_analytics
      WHERE event_type = 'conversion' 
      AND timestamp > NOW() - INTERVAL ${days} DAY
      GROUP BY step
      ORDER BY step_order
    `);
  }

  /**
   * Get popular pages
   */
  async getPopularPages(days: number = 7): Promise<any> {
    return this.query(`
      SELECT 
        page,
        COUNT(*) as views,
        COUNT(DISTINCT user_id) as unique_visitors,
        AVG(load_time) as avg_load_time
      FROM iwishbag_analytics
      WHERE event_type = 'page_view' 
      AND timestamp > NOW() - INTERVAL ${days} DAY
      GROUP BY page
      ORDER BY views DESC
      LIMIT 20
    `);
  }

  /**
   * Get country-wise analytics
   */
  async getCountryAnalytics(days: number = 30): Promise<any> {
    return this.query(`
      SELECT 
        country,
        COUNT(DISTINCT user_id) as users,
        COUNT(CASE WHEN event_type = 'quote_created' THEN 1 END) as quotes,
        SUM(CASE WHEN event_type = 'quote_created' THEN total_amount ELSE 0 END) as total_value
      FROM iwishbag_analytics
      WHERE timestamp > NOW() - INTERVAL ${days} DAY
      GROUP BY country
      ORDER BY total_value DESC
    `);
  }

  /**
   * Get search analytics
   */
  async getSearchAnalytics(days: number = 7): Promise<any> {
    return this.query(`
      SELECT 
        query,
        COUNT(*) as search_count,
        AVG(results_count) as avg_results,
        COUNT(DISTINCT user_id) as unique_searchers
      FROM iwishbag_analytics
      WHERE event_type = 'search' 
      AND timestamp > NOW() - INTERVAL ${days} DAY
      GROUP BY query
      ORDER BY search_count DESC
      LIMIT 50
    `);
  }
}