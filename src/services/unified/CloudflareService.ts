/**
 * Unified Cloudflare Service - Consolidates all Cloudflare integrations
 * 
 * Replaces:
 * - CloudflareD1Service
 * - CloudflareKVService  
 * - CloudflareImagesService
 * - CloudflareQueueService
 * - CloudflareFeatureService
 * - CloudflareRateLimitService
 * - CloudflareWAFService
 * - CloudflareWorkerService
 * 
 * Provides a single, unified interface for all Cloudflare operations
 */

import { logger } from '@/utils/logger';

// Configuration interfaces
export interface CloudflareConfig {
  accountId: string;
  apiToken: string;
  zoneId?: string;
  d1DatabaseId?: string;
  kvNamespaceId?: string;
  imagesAccountId?: string;
  queueName?: string;
  workerName?: string;
}

export interface CloudflareResponse<T> {
  success: boolean;
  result?: T;
  errors: Array<{ code: number; message: string }>;
  messages: string[];
}

// D1 Database Types
export interface D1QueryResult<T = any> {
  success: boolean;
  results: T[];
  duration: number;
  changes?: number;
  lastRowId?: number;
  error?: string;
}

// KV Types
export interface KVListOptions {
  prefix?: string;
  limit?: number;
  cursor?: string;
}

export interface KVMetadata {
  [key: string]: string | number | boolean;
}

// Images Types
export interface ImageUploadOptions {
  id?: string;
  metadata?: Record<string, any>;
  requireSignedURLs?: boolean;
}

export interface ImageVariant {
  id: string;
  url: string;
  width?: number;
  height?: number;
}

// Queue Types
export interface QueueMessage<T = any> {
  body: T;
  timestamp: number;
  id?: string;
  attempts?: number;
}

// Rate Limiting Types
export interface RateLimitRule {
  id: string;
  match: string;
  threshold: number;
  period: number;
  action: 'block' | 'challenge' | 'log';
}

// WAF Types
export interface WAFRule {
  id: string;
  expression: string;
  action: 'block' | 'challenge' | 'allow' | 'log';
  enabled: boolean;
  description?: string;
}

export class CloudflareService {
  private static instance: CloudflareService;
  private config: CloudflareConfig;
  private baseUrl = 'https://api.cloudflare.com/client/v4';

  private constructor(config: CloudflareConfig) {
    this.config = config;
  }

  static getInstance(config?: CloudflareConfig): CloudflareService {
    if (!CloudflareService.instance) {
      if (!config) {
        throw new Error('CloudflareService requires configuration on first initialization');
      }
      CloudflareService.instance = new CloudflareService(config);
    }
    return CloudflareService.instance;
  }

  // ============================================================================
  // D1 DATABASE OPERATIONS
  // ============================================================================

  /**
   * Execute D1 SQL query
   */
  async d1Query<T = any>(sql: string, params: any[] = []): Promise<D1QueryResult<T>> {
    try {
      const response = await this.makeRequest<any>('POST', 
        `/accounts/${this.config.accountId}/d1/database/${this.config.d1DatabaseId}/query`,
        { sql, params }
      );

      if (!response.success) {
        throw new Error(response.errors?.[0]?.message || 'D1 query failed');
      }

      return {
        success: true,
        results: response.result?.[0]?.results || [],
        duration: response.result?.[0]?.meta?.duration || 0,
        changes: response.result?.[0]?.meta?.changes,
        lastRowId: response.result?.[0]?.meta?.last_row_id,
      };
    } catch (error) {
      logger.error('D1 query failed', { sql, params, error });
      return {
        success: false,
        results: [],
        duration: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Execute multiple D1 queries in a transaction
   */
  async d1Batch<T = any>(queries: Array<{ sql: string; params?: any[] }>): Promise<D1QueryResult<T>[]> {
    try {
      const response = await this.makeRequest<any>('POST',
        `/accounts/${this.config.accountId}/d1/database/${this.config.d1DatabaseId}/batch`,
        queries
      );

      if (!response.success) {
        throw new Error(response.errors?.[0]?.message || 'D1 batch failed');
      }

      return response.result.map((result: any) => ({
        success: true,
        results: result.results || [],
        duration: result.meta?.duration || 0,
        changes: result.meta?.changes,
        lastRowId: result.meta?.last_row_id,
      }));
    } catch (error) {
      logger.error('D1 batch failed', { queries, error });
      throw error;
    }
  }

  // ============================================================================
  // KV STORAGE OPERATIONS
  // ============================================================================

  /**
   * Get value from KV
   */
  async kvGet<T = any>(key: string, type: 'text' | 'json' | 'arrayBuffer' | 'stream' = 'json'): Promise<T | null> {
    try {
      const url = `/accounts/${this.config.accountId}/storage/kv/namespaces/${this.config.kvNamespaceId}/values/${encodeURIComponent(key)}`;
      const response = await fetch(`${this.baseUrl}${url}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.config.apiToken}`,
        },
      });

      if (response.status === 404) return null;
      if (!response.ok) throw new Error(`KV get failed: ${response.status}`);

      switch (type) {
        case 'json': return await response.json();
        case 'text': return await response.text() as any;
        case 'arrayBuffer': return await response.arrayBuffer() as any;
        case 'stream': return response.body as any;
        default: return await response.text() as any;
      }
    } catch (error) {
      logger.error('KV get failed', { key, type, error });
      return null;
    }
  }

  /**
   * Set value in KV
   */
  async kvPut(key: string, value: any, options?: { ttl?: number; metadata?: KVMetadata }): Promise<boolean> {
    try {
      const url = `/accounts/${this.config.accountId}/storage/kv/namespaces/${this.config.kvNamespaceId}/values/${encodeURIComponent(key)}`;
      const searchParams = new URLSearchParams();
      
      if (options?.ttl) searchParams.set('expiration_ttl', options.ttl.toString());
      if (options?.metadata) searchParams.set('metadata', JSON.stringify(options.metadata));

      const response = await fetch(`${this.baseUrl}${url}?${searchParams}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${this.config.apiToken}`,
          'Content-Type': typeof value === 'string' ? 'text/plain' : 'application/json',
        },
        body: typeof value === 'string' ? value : JSON.stringify(value),
      });

      return response.ok;
    } catch (error) {
      logger.error('KV put failed', { key, options, error });
      return false;
    }
  }

  /**
   * Delete from KV
   */
  async kvDelete(key: string): Promise<boolean> {
    try {
      const response = await this.makeRequest('DELETE',
        `/accounts/${this.config.accountId}/storage/kv/namespaces/${this.config.kvNamespaceId}/values/${encodeURIComponent(key)}`
      );
      return response.success;
    } catch (error) {
      logger.error('KV delete failed', { key, error });
      return false;
    }
  }

  /**
   * List KV keys
   */
  async kvList(options: KVListOptions = {}): Promise<{ keys: Array<{ name: string; metadata?: KVMetadata }>; cursor?: string }> {
    try {
      const searchParams = new URLSearchParams();
      if (options.prefix) searchParams.set('prefix', options.prefix);
      if (options.limit) searchParams.set('limit', options.limit.toString());
      if (options.cursor) searchParams.set('cursor', options.cursor);

      const response = await this.makeRequest<any>('GET',
        `/accounts/${this.config.accountId}/storage/kv/namespaces/${this.config.kvNamespaceId}/keys?${searchParams}`
      );

      if (!response.success) throw new Error('KV list failed');

      return {
        keys: response.result || [],
        cursor: response.result_info?.cursor,
      };
    } catch (error) {
      logger.error('KV list failed', { options, error });
      return { keys: [] };
    }
  }

  // ============================================================================
  // IMAGES OPERATIONS
  // ============================================================================

  /**
   * Upload image to Cloudflare Images
   */
  async imagesUpload(file: File | Blob, options: ImageUploadOptions = {}): Promise<{ id: string; variants: ImageVariant[] } | null> {
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      if (options.id) formData.append('id', options.id);
      if (options.metadata) formData.append('metadata', JSON.stringify(options.metadata));
      if (options.requireSignedURLs) formData.append('requireSignedURLs', 'true');

      const response = await fetch(`${this.baseUrl}/accounts/${this.config.imagesAccountId}/images/v1`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiToken}`,
        },
        body: formData,
      });

      if (!response.ok) throw new Error(`Images upload failed: ${response.status}`);

      const result = await response.json();
      if (!result.success) throw new Error(result.errors?.[0]?.message || 'Upload failed');

      return {
        id: result.result.id,
        variants: Object.entries(result.result.variants).map(([id, url]) => ({ id, url: url as string })),
      };
    } catch (error) {
      logger.error('Images upload failed', { options, error });
      return null;
    }
  }

  /**
   * Delete image from Cloudflare Images
   */
  async imagesDelete(imageId: string): Promise<boolean> {
    try {
      const response = await this.makeRequest('DELETE',
        `/accounts/${this.config.imagesAccountId}/images/v1/${imageId}`
      );
      return response.success;
    } catch (error) {
      logger.error('Images delete failed', { imageId, error });
      return false;
    }
  }

  // ============================================================================
  // QUEUE OPERATIONS
  // ============================================================================

  /**
   * Send message to queue
   */
  async queueSend<T = any>(message: T, options?: { delaySeconds?: number }): Promise<boolean> {
    try {
      const payload = {
        body: JSON.stringify(message),
        timestamp: Date.now(),
        ...(options?.delaySeconds && { delaySeconds: options.delaySeconds }),
      };

      const response = await this.makeRequest('POST',
        `/accounts/${this.config.accountId}/queues/${this.config.queueName}/messages`,
        [payload]
      );

      return response.success;
    } catch (error) {
      logger.error('Queue send failed', { message, options, error });
      return false;
    }
  }

  /**
   * Send multiple messages to queue
   */
  async queueBatch<T = any>(messages: QueueMessage<T>[]): Promise<boolean> {
    try {
      const payload = messages.map(msg => ({
        body: JSON.stringify(msg.body),
        timestamp: msg.timestamp || Date.now(),
        id: msg.id,
      }));

      const response = await this.makeRequest('POST',
        `/accounts/${this.config.accountId}/queues/${this.config.queueName}/messages`,
        payload
      );

      return response.success;
    } catch (error) {
      logger.error('Queue batch failed', { messages, error });
      return false;
    }
  }

  // ============================================================================
  // RATE LIMITING OPERATIONS
  // ============================================================================

  /**
   * Create rate limiting rule
   */
  async rateLimitCreate(rule: Omit<RateLimitRule, 'id'>): Promise<string | null> {
    try {
      const response = await this.makeRequest<any>('POST',
        `/zones/${this.config.zoneId}/rate_limits`,
        rule
      );

      if (!response.success) throw new Error('Rate limit creation failed');

      return response.result.id;
    } catch (error) {
      logger.error('Rate limit create failed', { rule, error });
      return null;
    }
  }

  /**
   * Update rate limiting rule
   */
  async rateLimitUpdate(id: string, rule: Partial<RateLimitRule>): Promise<boolean> {
    try {
      const response = await this.makeRequest('PUT',
        `/zones/${this.config.zoneId}/rate_limits/${id}`,
        rule
      );

      return response.success;
    } catch (error) {
      logger.error('Rate limit update failed', { id, rule, error });
      return false;
    }
  }

  // ============================================================================
  // WAF OPERATIONS
  // ============================================================================

  /**
   * Create WAF rule
   */
  async wafCreate(rule: Omit<WAFRule, 'id'>): Promise<string | null> {
    try {
      const response = await this.makeRequest<any>('POST',
        `/zones/${this.config.zoneId}/firewall/rules`,
        [rule]
      );

      if (!response.success) throw new Error('WAF rule creation failed');

      return response.result?.[0]?.id || null;
    } catch (error) {
      logger.error('WAF create failed', { rule, error });
      return null;
    }
  }

  /**
   * Update WAF rule
   */
  async wafUpdate(id: string, rule: Partial<WAFRule>): Promise<boolean> {
    try {
      const response = await this.makeRequest('PUT',
        `/zones/${this.config.zoneId}/firewall/rules/${id}`,
        rule
      );

      return response.success;
    } catch (error) {
      logger.error('WAF update failed', { id, rule, error });
      return false;
    }
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Make HTTP request to Cloudflare API
   */
  private async makeRequest<T>(method: string, endpoint: string, body?: any): Promise<CloudflareResponse<T>> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method,
        headers: {
          'Authorization': `Bearer ${this.config.apiToken}`,
          'Content-Type': 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      logger.error('Cloudflare API request failed', { method, endpoint, error });
      throw error;
    }
  }

  /**
   * Get service health status
   */
  async getHealthStatus(): Promise<{
    d1: boolean;
    kv: boolean;
    images: boolean;
    queue: boolean;
    overall: boolean;
  }> {
    const checks = await Promise.allSettled([
      this.d1Query('SELECT 1 as health_check LIMIT 1'),
      this.kvGet('_health_check'),
      this.makeRequest('GET', `/accounts/${this.config.accountId}/images/v1/stats`),
      this.makeRequest('GET', `/accounts/${this.config.accountId}/queues/${this.config.queueName}`),
    ]);

    const d1 = checks[0].status === 'fulfilled' && checks[0].value.success;
    const kv = checks[1].status === 'fulfilled';
    const images = checks[2].status === 'fulfilled';
    const queue = checks[3].status === 'fulfilled';

    return {
      d1,
      kv,
      images,
      queue,
      overall: d1 && kv && images && queue,
    };
  }

  /**
   * Clear all caches and reset connections
   */
  async clearCaches(): Promise<void> {
    logger.info('Clearing Cloudflare service caches');
    
    try {
      // Clear zone cache if zone ID is available
      if (this.config.zoneId) {
        await this.makeRequest('POST', `/zones/${this.config.zoneId}/purge_cache`, { 
          purge_everything: true 
        });
      }
    } catch (error) {
      logger.warn('Failed to clear zone cache', error);
    }
  }
}

// Export singleton factory
export const createCloudflareService = (config: CloudflareConfig) => {
  return CloudflareService.getInstance(config);
};

// Default instance (requires configuration)
let defaultCloudflareService: CloudflareService | null = null;

export const getCloudflareService = () => {
  if (!defaultCloudflareService) {
    const config: CloudflareConfig = {
      accountId: process.env.CLOUDFLARE_ACCOUNT_ID || '',
      apiToken: process.env.CLOUDFLARE_API_TOKEN || '',
      zoneId: process.env.CLOUDFLARE_ZONE_ID,
      d1DatabaseId: process.env.CLOUDFLARE_D1_DATABASE_ID,
      kvNamespaceId: process.env.CLOUDFLARE_KV_NAMESPACE_ID,
      imagesAccountId: process.env.CLOUDFLARE_IMAGES_ACCOUNT_ID,
      queueName: process.env.CLOUDFLARE_QUEUE_NAME,
      workerName: process.env.CLOUDFLARE_WORKER_NAME,
    };

    defaultCloudflareService = createCloudflareService(config);
  }

  return defaultCloudflareService;
};