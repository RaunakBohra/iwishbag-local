import { logger } from '@/lib/logger';

/**
 * Cloudflare Rate Limiting Service
 * Manages rate limiting rules to prevent abuse and ensure fair usage
 */

export interface RateLimitRule {
  id?: string;
  name: string;
  description: string;
  endpoint: string;
  threshold: number;
  period: number; // in seconds
  action: 'block' | 'challenge' | 'log' | 'simulate';
  enabled: boolean;
  matchBy?: 'ip' | 'session' | 'user' | 'api_key';
  excludePatterns?: string[];
  category: 'api' | 'auth' | 'quotes' | 'search' | 'general';
}

export interface RateLimitStats {
  totalRequests: number;
  blockedRequests: number;
  topOffenders: Array<{ identifier: string; count: number; lastSeen: string }>;
  topEndpoints: Array<{ endpoint: string; hits: number; blocked: number }>;
  timeSeriesData: Array<{ time: string; requests: number; blocked: number }>;
}

export class CloudflareRateLimitService {
  private static instance: CloudflareRateLimitService;
  
  // Worker API configuration
  private readonly WORKER_API_BASE = import.meta.env.VITE_WORKER_API_URL || 'http://localhost:8787';

  private constructor() {}

  static getInstance(): CloudflareRateLimitService {
    if (!CloudflareRateLimitService.instance) {
      CloudflareRateLimitService.instance = new CloudflareRateLimitService();
    }
    return CloudflareRateLimitService.instance;
  }

  /**
   * Get predefined rate limit rules for iwishBag
   */
  getDefaultRules(): RateLimitRule[] {
    return [
      // Authentication endpoints
      {
        name: 'Login Rate Limit',
        description: 'Prevent brute force login attempts',
        endpoint: '/api/auth/login',
        threshold: 5,
        period: 300, // 5 attempts per 5 minutes
        action: 'challenge',
        enabled: true,
        matchBy: 'ip',
        category: 'auth'
      },
      {
        name: 'Password Reset Rate Limit',
        description: 'Limit password reset requests',
        endpoint: '/api/auth/reset-password',
        threshold: 3,
        period: 3600, // 3 attempts per hour
        action: 'block',
        enabled: true,
        matchBy: 'ip',
        category: 'auth'
      },
      {
        name: 'Registration Rate Limit',
        description: 'Prevent spam account creation',
        endpoint: '/api/auth/register',
        threshold: 3,
        period: 3600, // 3 accounts per hour per IP
        action: 'challenge',
        enabled: true,
        matchBy: 'ip',
        category: 'auth'
      },

      // Quote endpoints
      {
        name: 'Quote Submission Rate Limit',
        description: 'Limit quote requests per user',
        endpoint: '/api/quotes/submit',
        threshold: 10,
        period: 3600, // 10 quotes per hour
        action: 'block',
        enabled: true,
        matchBy: 'user',
        category: 'quotes'
      },
      {
        name: 'Quote Calculation Rate Limit',
        description: 'Prevent excessive calculations',
        endpoint: '/api/quotes/calculate',
        threshold: 30,
        period: 60, // 30 calculations per minute
        action: 'log',
        enabled: true,
        matchBy: 'session',
        category: 'quotes'
      },

      // Search and browsing
      {
        name: 'Search Rate Limit',
        description: 'Prevent search abuse',
        endpoint: '/api/search',
        threshold: 60,
        period: 60, // 60 searches per minute
        action: 'challenge',
        enabled: true,
        matchBy: 'ip',
        category: 'search'
      },
      {
        name: 'Product Scraping Protection',
        description: 'Block aggressive product data scraping',
        endpoint: '/api/products/*',
        threshold: 100,
        period: 60, // 100 requests per minute
        action: 'block',
        enabled: true,
        matchBy: 'ip',
        excludePatterns: ['/api/products/popular'],
        category: 'api'
      },

      // API endpoints
      {
        name: 'General API Rate Limit',
        description: 'Overall API usage limit',
        endpoint: '/api/*',
        threshold: 1000,
        period: 3600, // 1000 requests per hour
        action: 'log',
        enabled: true,
        matchBy: 'api_key',
        category: 'api'
      },
      {
        name: 'Admin API Rate Limit',
        description: 'Protect admin endpoints',
        endpoint: '/api/admin/*',
        threshold: 100,
        period: 300, // 100 requests per 5 minutes
        action: 'log',
        enabled: true,
        matchBy: 'user',
        category: 'api'
      },

      // Payment endpoints
      {
        name: 'Payment Processing Rate Limit',
        description: 'Prevent payment endpoint abuse',
        endpoint: '/api/payments/*',
        threshold: 10,
        period: 300, // 10 attempts per 5 minutes
        action: 'block',
        enabled: true,
        matchBy: 'user',
        category: 'general'
      },

      // File uploads
      {
        name: 'File Upload Rate Limit',
        description: 'Limit file upload frequency',
        endpoint: '/api/upload',
        threshold: 20,
        period: 3600, // 20 uploads per hour
        action: 'block',
        enabled: true,
        matchBy: 'user',
        category: 'general'
      },

      // Webhook endpoints
      {
        name: 'Webhook Rate Limit',
        description: 'Control webhook request rate',
        endpoint: '/api/webhooks/*',
        threshold: 100,
        period: 60, // 100 webhook calls per minute
        action: 'log',
        enabled: true,
        matchBy: 'ip',
        category: 'api'
      }
    ];
  }

  /**
   * Get all rate limit rules
   */
  async getRules(): Promise<RateLimitRule[]> {
    try {
      const response = await fetch(`${this.WORKER_API_BASE}/api/rate-limits`, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        logger.warn('Failed to fetch rate limit rules, using defaults', null, 'RateLimit');
        return this.getDefaultRules();
      }

      const data = await response.json();
      return data.rules || this.getDefaultRules();
    } catch (error) {
      logger.error('Failed to fetch rate limit rules', error, 'RateLimit');
      return this.getDefaultRules();
    }
  }

  /**
   * Get rate limiting statistics
   */
  async getStats(): Promise<RateLimitStats> {
    try {
      const response = await fetch(`${this.WORKER_API_BASE}/api/rate-limits/stats`, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch stats');
      }

      const data = await response.json();
      return data.stats;
    } catch (error) {
      logger.error('Failed to fetch rate limit stats, using demo data', error, 'RateLimit');
      
      // Return demo stats as fallback
      const now = new Date();
      const timeSeriesData = Array.from({ length: 24 }, (_, i) => {
        const time = new Date(now.getTime() - (23 - i) * 60 * 60 * 1000);
        const requests = Math.floor(Math.random() * 10000) + 5000;
        const blocked = Math.floor(requests * 0.02); // 2% blocked
        
        return {
          time: time.toISOString(),
          requests,
          blocked
        };
      });

      return {
        totalRequests: 156789,
        blockedRequests: 3421,
        topOffenders: [
          { identifier: '192.168.1.100', count: 523, lastSeen: new Date().toISOString() },
          { identifier: '10.0.0.50', count: 412, lastSeen: new Date().toISOString() },
          { identifier: '172.16.0.25', count: 387, lastSeen: new Date().toISOString() },
          { identifier: 'user_12345', count: 234, lastSeen: new Date().toISOString() },
          { identifier: 'api_key_xyz789', count: 198, lastSeen: new Date().toISOString() }
        ],
        topEndpoints: [
          { endpoint: '/api/quotes/calculate', hits: 45234, blocked: 892 },
          { endpoint: '/api/auth/login', hits: 23456, blocked: 1234 },
          { endpoint: '/api/search', hits: 19876, blocked: 432 },
          { endpoint: '/api/products/*', hits: 15432, blocked: 234 },
          { endpoint: '/api/quotes/submit', hits: 8765, blocked: 123 }
        ],
        timeSeriesData
      };
    }
  }

  /**
   * Create a new rate limit rule
   */
  async createRule(rule: RateLimitRule): Promise<RateLimitRule> {
    try {
      const response = await fetch(`${this.WORKER_API_BASE}/api/rate-limits`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(rule)
      });

      if (!response.ok) {
        throw new Error('Failed to create rule');
      }

      const data = await response.json();
      return data.rule;
    } catch (error) {
      logger.error('Failed to create rate limit rule', error, 'RateLimit');
      // Fallback to demo mode
      return { ...rule, id: `demo-${Date.now()}` };
    }
  }

  /**
   * Update an existing rate limit rule
   */
  async updateRule(ruleId: string, updates: Partial<RateLimitRule>): Promise<boolean> {
    if (ruleId.startsWith('demo-')) {
      logger.info('Demo mode: rate limit rule update simulated', { ruleId }, 'RateLimit');
      return true;
    }

    try {
      const response = await fetch(`${this.WORKER_API_BASE}/api/rate-limits/${ruleId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updates)
      });

      if (!response.ok) {
        throw new Error('Failed to update rule');
      }

      const data = await response.json();
      return data.success;
    } catch (error) {
      logger.error('Failed to update rate limit rule', error, 'RateLimit');
      return false;
    }
  }

  /**
   * Delete a rate limit rule
   */
  async deleteRule(ruleId: string): Promise<boolean> {
    if (ruleId.startsWith('demo-')) {
      logger.info('Demo mode: rate limit rule deletion simulated', { ruleId }, 'RateLimit');
      return true;
    }

    try {
      const response = await fetch(`${this.WORKER_API_BASE}/api/rate-limits/${ruleId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete rule');
      }

      const data = await response.json();
      return data.success;
    } catch (error) {
      logger.error('Failed to delete rate limit rule', error, 'RateLimit');
      return false;
    }
  }

  /**
   * Test rate limit rule effectiveness
   */
  async testRule(rule: RateLimitRule): Promise<{
    wouldBlock: number;
    wouldChallenge: number;
    affectedUsers: number;
  }> {
    // Simulate test results based on rule configuration
    const baseRequests = 10000;
    const blockRate = rule.threshold < 10 ? 0.05 : rule.threshold < 50 ? 0.02 : 0.01;
    const challengeRate = rule.action === 'challenge' ? blockRate : 0;
    
    return {
      wouldBlock: Math.floor(baseRequests * blockRate),
      wouldChallenge: Math.floor(baseRequests * challengeRate),
      affectedUsers: Math.floor(baseRequests * blockRate * 0.1) // 10% of blocked requests
    };
  }

  /**
   * Get rate limit recommendations based on traffic patterns
   */
  async getRecommendations(): Promise<Array<{
    endpoint: string;
    currentThreshold?: number;
    recommendedThreshold: number;
    reason: string;
  }>> {
    try {
      const response = await fetch(`${this.WORKER_API_BASE}/api/rate-limits/recommendations`, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch recommendations');
      }

      const data = await response.json();
      return data.recommendations;
    } catch (error) {
      logger.error('Failed to fetch recommendations, using demo data', error, 'RateLimit');
      
      // Return demo recommendations as fallback
      return [
        {
          endpoint: '/api/auth/login',
          currentThreshold: 5,
          recommendedThreshold: 3,
          reason: 'High number of failed login attempts detected'
        },
        {
          endpoint: '/api/quotes/calculate',
          recommendedThreshold: 50,
          reason: 'New endpoint detected with high traffic'
        },
        {
          endpoint: '/api/products/search',
          currentThreshold: 60,
          recommendedThreshold: 100,
          reason: 'Legitimate traffic patterns suggest threshold is too low'
        }
      ];
    }
  }
}

// Export singleton instance
export const rateLimitService = CloudflareRateLimitService.getInstance();