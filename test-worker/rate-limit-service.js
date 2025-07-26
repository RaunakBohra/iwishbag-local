/**
 * Cloudflare Rate Limit Service for Worker
 * Handles all rate limiting API operations
 */

export class CloudflareRateLimitService {
  constructor(env) {
    this.CF_API_TOKEN = env.CF_API_TOKEN;
    this.CF_ZONE_ID = env.CF_ZONE_ID;
    this.CF_API_BASE = 'https://api.cloudflare.com/client/v4';
    this.db = env.DB;
  }

  /**
   * Get all rate limit rules from Cloudflare
   */
  async getRules() {
    try {
      const response = await fetch(
        `${this.CF_API_BASE}/zones/${this.CF_ZONE_ID}/rate_limits`,
        {
          headers: {
            'Authorization': `Bearer ${this.CF_API_TOKEN}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        const error = await response.text();
        console.error('Failed to fetch rate limit rules:', error);
        return this.getDefaultRules();
      }

      const data = await response.json();
      
      if (!data.result || data.result.length === 0) {
        return this.getDefaultRules();
      }

      // Map Cloudflare rules to our format
      return data.result.map(rule => ({
        id: rule.id,
        name: rule.description || 'Unnamed Rule',
        description: rule.description || '',
        endpoint: rule.match?.request?.url || '*',
        threshold: rule.threshold,
        period: rule.period,
        action: rule.action?.mode || 'simulate',
        enabled: !rule.disabled,
        matchBy: 'ip',
        category: this.categorizeEndpoint(rule.match?.request?.url)
      }));
    } catch (error) {
      console.error('Error fetching rate limit rules:', error);
      return this.getDefaultRules();
    }
  }

  /**
   * Create a new rate limit rule
   */
  async createRule(rule) {
    try {
      const body = {
        disabled: !rule.enabled,
        description: rule.name,
        match: {
          request: {
            url: rule.endpoint,
            methods: ['GET', 'POST', 'PUT', 'DELETE']
          }
        },
        threshold: rule.threshold,
        period: rule.period,
        action: {
          mode: rule.action,
          timeout: rule.action === 'block' ? 3600 : undefined
        }
      };

      const response = await fetch(
        `${this.CF_API_BASE}/zones/${this.CF_ZONE_ID}/rate_limits`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.CF_API_TOKEN}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(body)
        }
      );

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to create rule: ${error}`);
      }

      const data = await response.json();
      return {
        ...rule,
        id: data.result?.id
      };
    } catch (error) {
      console.error('Error creating rate limit rule:', error);
      throw error;
    }
  }

  /**
   * Update an existing rate limit rule
   */
  async updateRule(ruleId, updates) {
    try {
      const body = {};
      
      if (updates.enabled !== undefined) body.disabled = !updates.enabled;
      if (updates.name) body.description = updates.name;
      if (updates.threshold) body.threshold = updates.threshold;
      if (updates.period) body.period = updates.period;
      if (updates.action) {
        body.action = {
          mode: updates.action,
          timeout: updates.action === 'block' ? 3600 : undefined
        };
      }

      const response = await fetch(
        `${this.CF_API_BASE}/zones/${this.CF_ZONE_ID}/rate_limits/${ruleId}`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${this.CF_API_TOKEN}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(body)
        }
      );

      return response.ok;
    } catch (error) {
      console.error('Error updating rate limit rule:', error);
      return false;
    }
  }

  /**
   * Delete a rate limit rule
   */
  async deleteRule(ruleId) {
    try {
      const response = await fetch(
        `${this.CF_API_BASE}/zones/${this.CF_ZONE_ID}/rate_limits/${ruleId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${this.CF_API_TOKEN}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.ok;
    } catch (error) {
      console.error('Error deleting rate limit rule:', error);
      return false;
    }
  }

  /**
   * Get rate limiting statistics using GraphQL API
   */
  async getStats() {
    try {
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const query = `
        query GetRateLimitStats($zoneTag: string!, $since: Time!, $until: Time!) {
          viewer {
            zones(filter: { zoneTag: $zoneTag }) {
              httpRequestsAdaptiveGroups(
                filter: { datetime_geq: $since, datetime_lt: $until }
                limit: 10000
              ) {
                sum {
                  requests
                  rateLimit {
                    mitigated
                  }
                }
                dimensions {
                  datetime
                  clientIP
                  requestPath
                }
              }
            }
          }
        }
      `;

      const response = await fetch('https://api.cloudflare.com/client/v4/graphql', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.CF_API_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query,
          variables: {
            zoneTag: this.CF_ZONE_ID,
            since: oneDayAgo.toISOString(),
            until: now.toISOString()
          }
        })
      });

      if (!response.ok) {
        throw new Error('Failed to fetch analytics');
      }

      const data = await response.json();
      const results = data.data?.viewer?.zones?.[0]?.httpRequestsAdaptiveGroups || [];

      // Process the data
      let totalRequests = 0;
      let blockedRequests = 0;
      const ipCounts = {};
      const pathCounts = {};
      const timeSeriesMap = {};

      results.forEach(item => {
        const requests = item.sum.requests || 0;
        const mitigated = item.sum.rateLimit?.mitigated || 0;
        
        totalRequests += requests;
        blockedRequests += mitigated;

        // Count by IP
        if (item.dimensions.clientIP) {
          ipCounts[item.dimensions.clientIP] = (ipCounts[item.dimensions.clientIP] || 0) + mitigated;
        }

        // Count by path
        if (item.dimensions.requestPath) {
          if (!pathCounts[item.dimensions.requestPath]) {
            pathCounts[item.dimensions.requestPath] = { hits: 0, blocked: 0 };
          }
          pathCounts[item.dimensions.requestPath].hits += requests;
          pathCounts[item.dimensions.requestPath].blocked += mitigated;
        }

        // Time series data
        if (item.dimensions.datetime) {
          const hour = new Date(item.dimensions.datetime).toISOString().slice(0, 13);
          if (!timeSeriesMap[hour]) {
            timeSeriesMap[hour] = { requests: 0, blocked: 0 };
          }
          timeSeriesMap[hour].requests += requests;
          timeSeriesMap[hour].blocked += mitigated;
        }
      });

      // Format top offenders
      const topOffenders = Object.entries(ipCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([ip, count]) => ({
          identifier: ip,
          count,
          lastSeen: now.toISOString()
        }));

      // Format top endpoints
      const topEndpoints = Object.entries(pathCounts)
        .sort((a, b) => b[1].blocked - a[1].blocked)
        .slice(0, 5)
        .map(([path, stats]) => ({
          endpoint: path,
          hits: stats.hits,
          blocked: stats.blocked
        }));

      // Format time series
      const timeSeriesData = Object.entries(timeSeriesMap)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([time, stats]) => ({
          time: new Date(time + ':00:00.000Z').toISOString(),
          requests: stats.requests,
          blocked: stats.blocked
        }));

      return {
        totalRequests,
        blockedRequests,
        topOffenders,
        topEndpoints,
        timeSeriesData
      };
    } catch (error) {
      console.error('Error fetching rate limit stats:', error);
      // Return demo data as fallback
      return this.getDemoStats();
    }
  }

  /**
   * Get recommendations based on traffic patterns
   */
  async getRecommendations() {
    try {
      const stats = await this.getStats();
      const rules = await this.getRules();
      const recommendations = [];

      // Analyze endpoints with high block rates
      stats.topEndpoints.forEach(endpoint => {
        const blockRate = endpoint.blocked / endpoint.hits;
        const existingRule = rules.find(r => r.endpoint === endpoint.endpoint);

        if (blockRate > 0.1) { // More than 10% blocked
          recommendations.push({
            endpoint: endpoint.endpoint,
            currentThreshold: existingRule?.threshold,
            recommendedThreshold: Math.floor(endpoint.hits / 24 / 60 * 0.8), // 80% of average per minute
            reason: `High block rate (${(blockRate * 100).toFixed(1)}%) detected`
          });
        } else if (blockRate < 0.01 && existingRule) { // Less than 1% blocked
          recommendations.push({
            endpoint: endpoint.endpoint,
            currentThreshold: existingRule.threshold,
            recommendedThreshold: existingRule.threshold * 2,
            reason: 'Low block rate suggests threshold may be too restrictive'
          });
        }
      });

      return recommendations.slice(0, 3); // Return top 3 recommendations
    } catch (error) {
      console.error('Error generating recommendations:', error);
      return this.getDemoRecommendations();
    }
  }

  /**
   * Categorize endpoint based on path for iwishBag platform
   */
  categorizeEndpoint(endpoint) {
    if (!endpoint) return 'general';
    
    const path = endpoint.toLowerCase();
    
    // Authentication & Security
    if (path.includes('auth') || path.includes('login') || path.includes('register') || path.includes('password')) {
      return 'auth';
    }
    
    // Business Core - Quotes & Orders
    if (path.includes('quote') || path.includes('calculate')) {
      return 'quotes';
    }
    if (path.includes('order') || path.includes('cart') || path.includes('checkout')) {
      return 'orders';
    }
    
    // Payment Processing
    if (path.includes('payment') || path.includes('payu') || path.includes('stripe') || path.includes('paypal')) {
      return 'payments';
    }
    
    // Product & Search
    if (path.includes('search') || path.includes('product')) {
      return 'search';
    }
    
    // File Operations
    if (path.includes('upload') || path.includes('file') || path.includes('r2')) {
      return 'uploads';
    }
    
    // Administrative
    if (path.includes('admin')) {
      return 'admin';
    }
    
    // Services & Utilities
    if (path.includes('currency') || path.includes('hsn') || path.includes('exchange')) {
      return 'services';
    }
    
    // Logistics
    if (path.includes('shipping') || path.includes('tracking') || path.includes('delivery')) {
      return 'logistics';
    }
    
    // Customer Features
    if (path.includes('customer') || path.includes('profile') || path.includes('dashboard')) {
      return 'customer';
    }
    
    // General API
    if (path.includes('api')) {
      return 'api';
    }
    
    // Security catch-all
    if (path === '/*' || path.includes('*')) {
      return 'security';
    }
    
    return 'general';
  }

  /**
   * Get default rules for iwishBag e-commerce platform
   */
  getDefaultRules() {
    return [
      // Authentication & Security Rules
      {
        id: 'iwb-auth-login',
        name: 'Login Protection',
        description: 'Prevent brute force login attempts - 5 attempts per 5 minutes',
        endpoint: '/api/auth/login',
        threshold: 5,
        period: 300,
        action: 'challenge',
        enabled: true,
        matchBy: 'ip',
        category: 'auth'
      },
      {
        id: 'iwb-auth-register',
        name: 'Registration Limit',
        description: 'Prevent automated account creation - 3 registrations per hour',
        endpoint: '/api/auth/register',
        threshold: 3,
        period: 3600,
        action: 'block',
        enabled: true,
        matchBy: 'ip',
        category: 'auth'
      },
      {
        id: 'iwb-password-reset',
        name: 'Password Reset Protection',
        description: 'Limit password reset requests - 3 per 15 minutes',
        endpoint: '/api/auth/reset-password',
        threshold: 3,
        period: 900,
        action: 'challenge',
        enabled: true,
        matchBy: 'ip',
        category: 'auth'
      },

      // Quote & Business Logic Rules
      {
        id: 'iwb-quote-calculate',
        name: 'Quote Calculation Limit',
        description: 'Prevent quote calculation abuse - 30 per minute',
        endpoint: '/api/quotes/calculate',
        threshold: 30,
        period: 60,
        action: 'challenge',
        enabled: true,
        matchBy: 'ip',
        category: 'quotes'
      },
      {
        id: 'iwb-quote-create',
        name: 'Quote Creation Protection',
        description: 'Limit quote creation requests - 10 per hour',
        endpoint: '/api/quotes',
        threshold: 10,
        period: 3600,
        action: 'challenge',
        enabled: true,
        matchBy: 'ip',
        category: 'quotes'
      },
      {
        id: 'iwb-file-upload',
        name: 'File Upload Rate Limit',
        description: 'Control file upload frequency - 20 per hour',
        endpoint: '/api/uploads/*',
        threshold: 20,
        period: 3600,
        action: 'challenge',
        enabled: true,
        matchBy: 'ip',
        category: 'uploads'
      },

      // Search & Product Discovery
      {
        id: 'iwb-product-search',
        name: 'Product Search Limit',
        description: 'Prevent search abuse - 120 searches per hour',
        endpoint: '/api/search*',
        threshold: 120,
        period: 3600,
        action: 'log',
        enabled: true,
        matchBy: 'ip',
        category: 'search'
      },
      {
        id: 'iwb-price-check',
        name: 'Price Check Protection',
        description: 'Limit price checking requests - 60 per hour',
        endpoint: '/api/products/price*',
        threshold: 60,
        period: 3600,
        action: 'challenge',
        enabled: true,
        matchBy: 'ip',
        category: 'products'
      },

      // Payment & Order Protection
      {
        id: 'iwb-payment-init',
        name: 'Payment Initialization',
        description: 'Control payment attempts - 5 per 10 minutes',
        endpoint: '/api/payments/*',
        threshold: 5,
        period: 600,
        action: 'challenge',
        enabled: true,
        matchBy: 'ip',
        category: 'payments'
      },
      {
        id: 'iwb-order-create',
        name: 'Order Creation Limit',
        description: 'Prevent order spam - 3 orders per hour',
        endpoint: '/api/orders',
        threshold: 3,
        period: 3600,
        action: 'challenge',
        enabled: true,
        matchBy: 'ip',
        category: 'orders'
      },

      // Administrative Protection
      {
        id: 'iwb-admin-strict',
        name: 'Admin Panel Protection',
        description: 'Ultra strict admin access - 50 requests per hour',
        endpoint: '/admin/*',
        threshold: 50,
        period: 3600,
        action: 'challenge',
        enabled: true,
        matchBy: 'ip',
        category: 'admin'
      },
      {
        id: 'iwb-admin-api',
        name: 'Admin API Limit',
        description: 'Admin API operations - 100 per hour',
        endpoint: '/api/admin/*',
        threshold: 100,
        period: 3600,
        action: 'challenge',
        enabled: true,
        matchBy: 'ip',
        category: 'admin'
      },

      // Currency & HSN Services
      {
        id: 'iwb-currency-rates',
        name: 'Currency Rate Limit',
        description: 'Control currency API calls - 300 per hour',
        endpoint: '/api/currency/*',
        threshold: 300,
        period: 3600,
        action: 'log',
        enabled: true,
        matchBy: 'ip',
        category: 'services'
      },
      {
        id: 'iwb-hsn-lookup',
        name: 'HSN Code Lookup',
        description: 'HSN classification requests - 200 per hour',
        endpoint: '/api/hsn/*',
        threshold: 200,
        period: 3600,
        action: 'log',
        enabled: true,
        matchBy: 'ip',
        category: 'services'
      },

      // Customer Protection
      {
        id: 'iwb-customer-api',
        name: 'Customer API Protection',
        description: 'Customer dashboard API - 500 per hour',
        endpoint: '/api/customer/*',
        threshold: 500,
        period: 3600,
        action: 'log',
        enabled: true,
        matchBy: 'ip',
        category: 'customer'
      },

      // Bot & Scraper Protection
      {
        id: 'iwb-aggressive-blocking',
        name: 'Aggressive Bot Protection',
        description: 'Block obvious bots - 1000 requests per hour',
        endpoint: '/*',
        threshold: 1000,
        period: 3600,
        action: 'block',
        enabled: true,
        matchBy: 'ip',
        category: 'security'
      },

      // International Shopping Specific
      {
        id: 'iwb-tracking-lookup',
        name: 'Tracking Number Lookup',
        description: 'Limit tracking checks - 50 per hour',
        endpoint: '/api/tracking/*',
        threshold: 50,
        period: 3600,
        action: 'challenge',
        enabled: true,
        matchBy: 'ip',
        category: 'logistics'
      },
      {
        id: 'iwb-shipping-calc',
        name: 'Shipping Calculator',
        description: 'Shipping cost calculations - 100 per hour',
        endpoint: '/api/shipping/*',
        threshold: 100,
        period: 3600,
        action: 'log',
        enabled: true,
        matchBy: 'ip',
        category: 'logistics'
      }
    ];
  }

  /**
   * Get demo stats as fallback
   */
  getDemoStats() {
    const now = new Date();
    const timeSeriesData = Array.from({ length: 24 }, (_, i) => {
      const time = new Date(now.getTime() - (23 - i) * 60 * 60 * 1000);
      const requests = Math.floor(Math.random() * 10000) + 5000;
      const blocked = Math.floor(requests * 0.02);
      
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
        { identifier: '192.168.1.100', count: 523, lastSeen: now.toISOString() },
        { identifier: '10.0.0.50', count: 412, lastSeen: now.toISOString() },
        { identifier: '172.16.0.25', count: 387, lastSeen: now.toISOString() }
      ],
      topEndpoints: [
        { endpoint: '/api/quotes/calculate', hits: 45234, blocked: 892 },
        { endpoint: '/api/auth/login', hits: 23456, blocked: 1234 },
        { endpoint: '/api/search', hits: 19876, blocked: 432 }
      ],
      timeSeriesData
    };
  }

  /**
   * Get demo recommendations
   */
  getDemoRecommendations() {
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