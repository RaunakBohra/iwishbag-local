interface D1Config {
  accountId: string;
  databaseId: string;
  apiToken: string;
}

interface D1QueryResult {
  success: boolean;
  result: any[];
  meta: {
    changed_db: boolean;
    changes: number;
    duration: number;
    last_row_id: number;
    rows_read: number;
    rows_written: number;
  };
}

export class CloudflareD1Service {
  private static instance: CloudflareD1Service;
  private config: D1Config;

  private constructor() {
    this.config = {
      accountId: import.meta.env.VITE_CLOUDFLARE_ACCOUNT_ID || '610762493d34333f1a6d72a037b345cf',
      databaseId: import.meta.env.VITE_CLOUDFLARE_D1_DATABASE_ID || '',
      apiToken: import.meta.env.VITE_CLOUDFLARE_API_TOKEN || '4Y_WjuGIEtTpK85hmE6XrGwbi85d8zN5Me0T_45l'
    };
  }

  static getInstance(): CloudflareD1Service {
    if (!CloudflareD1Service.instance) {
      CloudflareD1Service.instance = new CloudflareD1Service();
    }
    return CloudflareD1Service.instance;
  }

  /**
   * Execute SQL query on D1
   */
  async query(sql: string, params: any[] = []): Promise<D1QueryResult> {
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${this.config.accountId}/d1/database/${this.config.databaseId}/query`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sql,
          params
        })
      }
    );

    if (!response.ok) {
      throw new Error(`D1 query failed: ${response.status}`);
    }

    const result = await response.json();
    return result.result[0]; // D1 returns array of results
  }

  // Use Cases for iwishBag:

  /**
   * Track page views and user analytics
   */
  async trackPageView(userId: string, page: string, userAgent: string, country: string): Promise<void> {
    await this.query(`
      INSERT INTO analytics_pageviews (user_id, page, user_agent, country, timestamp)
      VALUES (?, ?, ?, ?, datetime('now'))
    `, [userId, page, userAgent, country]);
  }

  /**
   * Store search analytics
   */
  async trackSearch(query: string, resultsCount: number, userId?: string): Promise<void> {
    await this.query(`
      INSERT INTO analytics_searches (query, results_count, user_id, timestamp)
      VALUES (?, ?, ?, datetime('now'))
    `, [query, resultsCount, userId || null]);
  }

  /**
   * Log quote interactions
   */
  async logQuoteInteraction(quoteId: string, action: string, userId: string, metadata?: any): Promise<void> {
    await this.query(`
      INSERT INTO quote_interactions (quote_id, action, user_id, metadata, timestamp)
      VALUES (?, ?, ?, ?, datetime('now'))
    `, [quoteId, action, userId, JSON.stringify(metadata)]);
  }

  /**
   * Store conversion funnel data
   */
  async trackConversion(step: string, userId: string, quoteId?: string): Promise<void> {
    await this.query(`
      INSERT INTO conversion_funnel (step, user_id, quote_id, timestamp)
      VALUES (?, ?, ?, datetime('now'))
    `, [step, userId, quoteId || null]);
  }

  /**
   * Cache frequently accessed data at the edge
   */
  async cacheCountrySettings(): Promise<any[]> {
    const result = await this.query(`
      SELECT * FROM country_cache 
      WHERE updated_at > datetime('now', '-1 hour')
    `);
    return result.result;
  }

  /**
   * Get popular products for recommendations
   */
  async getPopularProducts(limit: number = 10): Promise<any[]> {
    const result = await this.query(`
      SELECT product_name, COUNT(*) as quote_count
      FROM popular_products 
      WHERE created_at > datetime('now', '-7 days')
      GROUP BY product_name
      ORDER BY quote_count DESC
      LIMIT ?
    `, [limit]);
    return result.result;
  }

  /**
   * Initialize D1 tables for analytics
   */
  async initializeTables(): Promise<void> {
    const tables = [
      `CREATE TABLE IF NOT EXISTS analytics_pageviews (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT,
        page TEXT NOT NULL,
        user_agent TEXT,
        country TEXT,
        timestamp DATETIME NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS analytics_searches (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        query TEXT NOT NULL,
        results_count INTEGER,
        user_id TEXT,
        timestamp DATETIME NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS quote_interactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        quote_id TEXT NOT NULL,
        action TEXT NOT NULL,
        user_id TEXT NOT NULL,
        metadata TEXT,
        timestamp DATETIME NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS conversion_funnel (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        step TEXT NOT NULL,
        user_id TEXT NOT NULL,
        quote_id TEXT,
        timestamp DATETIME NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS country_cache (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        country_code TEXT UNIQUE,
        settings TEXT,
        updated_at DATETIME NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS popular_products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_name TEXT NOT NULL,
        quote_id TEXT,
        created_at DATETIME NOT NULL
      )`
    ];

    for (const sql of tables) {
      await this.query(sql);
    }
  }
}