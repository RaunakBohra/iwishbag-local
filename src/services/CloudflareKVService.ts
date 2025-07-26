interface KVConfig {
  accountId: string;
  namespaceId: string;
  apiToken: string;
}

interface CachedData<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

interface CacheOptions {
  ttl?: number; // Time to live in seconds
  metadata?: Record<string, any>;
}

export class CloudflareKVService {
  private static instance: CloudflareKVService;
  private config: KVConfig;

  private constructor() {
    this.config = {
      accountId: import.meta.env.VITE_CLOUDFLARE_ACCOUNT_ID || '610762493d34333f1a6d72a037b345cf',
      namespaceId: import.meta.env.VITE_CLOUDFLARE_KV_NAMESPACE_ID || '6f5087b9d89146dfbeb8efa92a9b4756',
      apiToken: import.meta.env.VITE_CLOUDFLARE_API_TOKEN || '4Y_WjuGIEtTpK85hmE6XrGwbi85d8zN5Me0T_45l'
    };
  }

  static getInstance(): CloudflareKVService {
    if (!CloudflareKVService.instance) {
      CloudflareKVService.instance = new CloudflareKVService();
    }
    return CloudflareKVService.instance;
  }

  /**
   * Store data in KV with optional TTL
   */
  async set(key: string, value: any, options: CacheOptions = {}): Promise<void> {
    const { ttl, metadata } = options;
    
    const body: any = {
      value: typeof value === 'string' ? value : JSON.stringify(value)
    };
    
    if (ttl) body.expiration_ttl = ttl;
    if (metadata) body.metadata = metadata;

    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${this.config.accountId}/storage/kv/namespaces/${this.config.namespaceId}/values/${key}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${this.config.apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body)
      }
    );

    if (!response.ok) {
      throw new Error(`KV set failed: ${response.status}`);
    }
  }

  /**
   * Get data from KV
   */
  async get<T = any>(key: string): Promise<T | null> {
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${this.config.accountId}/storage/kv/namespaces/${this.config.namespaceId}/values/${key}`,
      {
        headers: {
          'Authorization': `Bearer ${this.config.apiToken}`,
        }
      }
    );

    if (response.status === 404) return null;
    if (!response.ok) throw new Error(`KV get failed: ${response.status}`);

    const text = await response.text();
    try {
      return JSON.parse(text);
    } catch {
      return text as T;
    }
  }

  /**
   * Delete from KV
   */
  async delete(key: string): Promise<void> {
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${this.config.accountId}/storage/kv/namespaces/${this.config.namespaceId}/values/${key}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${this.config.apiToken}`,
        }
      }
    );

    if (!response.ok) {
      throw new Error(`KV delete failed: ${response.status}`);
    }
  }

  // Use Cases for iwishBag:

  /**
   * Cache exchange rates globally
   */
  async cacheExchangeRate(from: string, to: string, rate: number): Promise<void> {
    const key = `exchange_rate:${from}_${to}`;
    await this.set(key, { rate, timestamp: Date.now() }, { ttl: 3600 }); // 1 hour cache
  }

  /**
   * Store user sessions at the edge
   */
  async setUserSession(sessionId: string, userData: any): Promise<void> {
    const key = `session:${sessionId}`;
    await this.set(key, userData, { ttl: 86400 }); // 24 hours
  }

  /**
   * Cache frequently accessed quotes
   */
  async cacheQuote(quoteId: string, quoteData: any): Promise<void> {
    const key = `quote:${quoteId}`;
    await this.set(key, quoteData, { ttl: 1800 }); // 30 minutes
  }

  /**
   * Store API rate limiting data
   */
  async trackAPIUsage(userId: string, endpoint: string): Promise<boolean> {
    const key = `rate_limit:${userId}:${endpoint}`;
    const current = await this.get<number>(key) || 0;
    
    if (current >= 100) return false; // Rate limit exceeded
    
    await this.set(key, current + 1, { ttl: 3600 });
    return true;
  }

  /**
   * Cache product search results
   */
  async cacheSearchResults(query: string, results: any[]): Promise<void> {
    const key = `search:${encodeURIComponent(query)}`;
    await this.set(key, results, { ttl: 300 }); // 5 minutes
  }
}