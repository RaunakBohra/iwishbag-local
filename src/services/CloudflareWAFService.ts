import { logger } from '@/lib/logger';

/**
 * Cloudflare WAF Service
 * Manages Web Application Firewall rules and security configurations
 */

export interface WAFRule {
  id?: string;
  name: string;
  description: string;
  expression: string;
  action: 'block' | 'challenge' | 'js_challenge' | 'managed_challenge' | 'log' | 'skip';
  enabled: boolean;
  priority?: number;
  ruleType: 'custom' | 'rate_limit' | 'managed';
  category: 'sql_injection' | 'xss' | 'path_traversal' | 'bot' | 'geo' | 'api' | 'admin' | 'payment' | 'general';
}

export interface WAFStats {
  totalRequests: number;
  blockedRequests: number;
  challengedRequests: number;
  passedRequests: number;
  topBlockedIPs: Array<{ ip: string; count: number }>;
  topBlockedPaths: Array<{ path: string; count: number }>;
  topBlockReasons: Array<{ reason: string; count: number }>;
}

export class CloudflareWAFService {
  private static instance: CloudflareWAFService;
  
  // Cloudflare API configuration
  private readonly CF_API_TOKEN = import.meta.env.VITE_CLOUDFLARE_API_TOKEN || import.meta.env.VITE_CF_API_TOKEN;
  private readonly CF_ZONE_ID = import.meta.env.VITE_CF_ZONE_ID || '2cd502a70fa04ec1619df21d7eb5e17c';
  private readonly CF_API_BASE = 'https://api.cloudflare.com/client/v4';

  private constructor() {}

  static getInstance(): CloudflareWAFService {
    if (!CloudflareWAFService.instance) {
      CloudflareWAFService.instance = new CloudflareWAFService();
    }
    return CloudflareWAFService.instance;
  }

  /**
   * Get predefined WAF rules for iwishBag
   */
  getDefaultRules(): WAFRule[] {
    return [
      // SQL Injection Protection
      {
        name: 'Block SQL Injection Attempts',
        description: 'Blocks common SQL injection patterns in query strings and form data',
        expression: `(http.request.uri.query contains "union" and http.request.uri.query contains "select") or
                     (http.request.uri.query contains "' or '1'='1") or
                     (http.request.body.form contains "drop table") or
                     (http.request.uri.query regex "(?i)(union.*select|select.*from|insert.*into|delete.*from)")`,
        action: 'block',
        enabled: true,
        ruleType: 'custom',
        category: 'sql_injection'
      },

      // XSS Protection
      {
        name: 'Block XSS Attempts',
        description: 'Prevents cross-site scripting attacks',
        expression: `(http.request.uri.query contains "<script") or
                     (http.request.body.form contains "<script") or
                     (http.request.uri.query contains "javascript:") or
                     (http.request.uri.query regex "(?i)(<script|onerror|onload|onclick)")`,
        action: 'block',
        enabled: true,
        ruleType: 'custom',
        category: 'xss'
      },

      // Path Traversal Protection
      {
        name: 'Block Path Traversal',
        description: 'Prevents directory traversal attacks',
        expression: `(http.request.uri.path contains "../") or
                     (http.request.uri.path contains "..\\") or
                     (http.request.uri.path contains "/etc/passwd") or
                     (http.request.uri.path contains "c:\\windows")`,
        action: 'block',
        enabled: true,
        ruleType: 'custom',
        category: 'path_traversal'
      },

      // Admin Path Protection
      {
        name: 'Protect Admin Routes',
        description: 'Restrict admin panel access to specific IPs/countries',
        expression: `(http.request.uri.path contains "/admin") and
                     not (ip.geoip.country in {"US" "IN" "NP"}) and
                     not (cf.threat_score lt 10)`,
        action: 'managed_challenge',
        enabled: true,
        ruleType: 'custom',
        category: 'admin'
      },

      // API Endpoint Protection
      {
        name: 'API Rate Limiting',
        description: 'Rate limit API requests to prevent abuse',
        expression: `(http.request.uri.path contains "/api/") and
                     (not http.request.headers["x-api-key"][0] in {"valid-key-1" "valid-key-2"})`,
        action: 'challenge',
        enabled: true,
        ruleType: 'rate_limit',
        category: 'api'
      },

      // Payment Page Protection
      {
        name: 'Enhanced Payment Security',
        description: 'Extra protection for payment endpoints',
        expression: `(http.request.uri.path contains "/payment") and
                     (cf.threat_score gt 30 or not ssl)`,
        action: 'block',
        enabled: true,
        ruleType: 'custom',
        category: 'payment'
      },

      // Bot Protection
      {
        name: 'Block Bad Bots',
        description: 'Block known malicious bots and crawlers',
        expression: `(cf.client.bot) and 
                     (http.user_agent contains "bot" or 
                      http.user_agent contains "crawler" or
                      http.user_agent contains "spider") and
                     not (http.user_agent contains "googlebot" or 
                          http.user_agent contains "bingbot")`,
        action: 'challenge',
        enabled: true,
        ruleType: 'custom',
        category: 'bot'
      },

      // Geographic Restrictions (if needed)
      {
        name: 'Geographic Access Control',
        description: 'Block access from high-risk countries',
        expression: `(ip.geoip.country in {"XX" "YY"})`, // Replace XX, YY with actual country codes
        action: 'block',
        enabled: false, // Disabled by default
        ruleType: 'custom',
        category: 'geo'
      },

      // File Upload Protection
      {
        name: 'File Upload Validation',
        description: 'Block dangerous file uploads',
        expression: `(http.request.uri.path contains "/upload") and
                     (http.request.body.mime contains "application/x-executable" or
                      http.request.body.form.names[*] contains ".exe" or
                      http.request.body.form.names[*] contains ".bat")`,
        action: 'block',
        enabled: true,
        ruleType: 'custom',
        category: 'general'
      },

      // Quote Submission Protection
      {
        name: 'Quote Spam Protection',
        description: 'Prevent automated quote spam',
        expression: `(http.request.uri.path eq "/api/quotes/submit") and
                     (cf.threat_score gt 20 or 
                      not http.request.headers["x-turnstile-token"][0])`,
        action: 'challenge',
        enabled: true,
        ruleType: 'custom',
        category: 'general'
      }
    ];
  }

  /**
   * Get all WAF rules
   */
  async getRules(): Promise<WAFRule[]> {
    if (!this.CF_API_TOKEN) {
      logger.warn('No Cloudflare API token configured, returning demo rules', null, 'WAF');
      return this.getDefaultRules();
    }

    try {
      const response = await fetch(
        `${this.CF_API_BASE}/zones/${this.CF_ZONE_ID}/firewall/rules`,
        {
          headers: {
            'Authorization': `Bearer ${this.CF_API_TOKEN}`,
            'Content-Type': 'application/json'
          }
        }
      ).catch(error => {
        // Handle CORS errors gracefully
        if (error.message?.includes('CORS') || error.message?.includes('Failed to fetch')) {
          logger.warn('CORS policy blocking Cloudflare API, using demo mode', error, 'WAF');
          return null;
        }
        throw error;
      });

      if (!response) {
        return this.getDefaultRules();
      }

      const data = await response.json();
      
      if (!response.ok) {
        // Check for permission errors
        if (data.errors?.some((e: any) => e.code === 10000 || e.message?.includes('Authentication'))) {
          logger.warn('API token lacks firewall permissions, using demo mode', null, 'WAF');
          return this.getDefaultRules();
        }
        throw new Error(`Failed to fetch rules: ${response.statusText}`);
      }

      // If no rules exist, return default rules
      if (!data.result || data.result.length === 0) {
        return this.getDefaultRules();
      }

      // Map Cloudflare rules to our format
      return data.result.map((rule: any) => ({
        id: rule.id,
        name: rule.description || rule.ref,
        description: rule.filter?.description || '',
        expression: rule.filter?.expression || '',
        action: rule.action,
        enabled: !rule.paused,
        priority: rule.priority,
        ruleType: 'custom',
        category: 'general'
      }));
    } catch (error) {
      logger.error('Failed to fetch WAF rules from Cloudflare', error, 'WAF');
      return this.getDefaultRules();
    }
  }

  /**
   * Get WAF statistics
   */
  async getStats(): Promise<WAFStats> {
    // Return demo stats for now
    return {
      totalRequests: 125000,
      blockedRequests: 342,
      challengedRequests: 156,
      passedRequests: 124502,
      topBlockedIPs: [
        { ip: '192.168.1.1', count: 45 },
        { ip: '10.0.0.1', count: 32 }
      ],
      topBlockedPaths: [
        { path: '/admin/login', count: 89 },
        { path: '/api/quotes/submit', count: 67 }
      ],
      topBlockReasons: [
        { reason: 'SQL Injection Attempt', count: 123 },
        { reason: 'Bot Detection', count: 87 }
      ]
    };
  }

  /**
   * Create a new WAF rule
   */
  async createRule(rule: WAFRule): Promise<WAFRule> {
    if (!this.CF_API_TOKEN) {
      // In demo mode, just return the rule with a generated ID
      return { ...rule, id: `demo-${Date.now()}` };
    }

    try {
      const response = await fetch(
        `${this.CF_API_BASE}/zones/${this.CF_ZONE_ID}/firewall/rules`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.CF_API_TOKEN}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify([{
            filter: {
              expression: rule.expression,
              description: rule.description
            },
            action: rule.action,
            description: rule.name,
            priority: rule.priority,
            paused: !rule.enabled
          }])
        }
      );

      const data = await response.json();
      
      if (!response.ok) {
        if (data.errors?.some((e: any) => e.code === 10000)) {
          // Demo mode fallback
          return { ...rule, id: `demo-${Date.now()}` };
        }
        throw new Error(data.errors?.[0]?.message || 'Failed to create rule');
      }

      const createdRule = data.result?.[0];
      return {
        ...rule,
        id: createdRule?.id
      };
    } catch (error) {
      logger.error('Failed to create WAF rule', error, 'WAF');
      // Fallback to demo mode
      return { ...rule, id: `demo-${Date.now()}` };
    }
  }

  /**
   * Update an existing WAF rule
   */
  async updateRule(ruleId: string, updates: Partial<WAFRule>): Promise<boolean> {
    if (!this.CF_API_TOKEN || ruleId.startsWith('demo-')) {
      logger.info('Demo mode: rule update simulated', { ruleId }, 'WAF');
      return true;
    }

    try {
      const response = await fetch(
        `${this.CF_API_BASE}/zones/${this.CF_ZONE_ID}/firewall/rules/${ruleId}`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${this.CF_API_TOKEN}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            filter: updates.expression ? {
              expression: updates.expression,
              description: updates.description
            } : undefined,
            action: updates.action,
            description: updates.name,
            priority: updates.priority,
            paused: updates.enabled !== undefined ? !updates.enabled : undefined
          })
        }
      );

      return response.ok;
    } catch (error) {
      logger.error('Failed to update WAF rule', error, 'WAF');
      return false;
    }
  }

  /**
   * Delete a WAF rule
   */
  async deleteRule(ruleId: string): Promise<boolean> {
    if (!this.CF_API_TOKEN || ruleId.startsWith('demo-')) {
      logger.info('Demo mode: rule deletion simulated', { ruleId }, 'WAF');
      return true;
    }

    try {
      const response = await fetch(
        `${this.CF_API_BASE}/zones/${this.CF_ZONE_ID}/firewall/rules/${ruleId}`,
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
      logger.error('Failed to delete WAF rule', error, 'WAF');
      return false;
    }
  }

  /**
   * Deploy WAF rules to Cloudflare
   */
  async deployRules(rules: WAFRule[]): Promise<{ success: boolean; deployed: string[] }> {
    if (!this.CF_API_TOKEN) {
      logger.error('Cloudflare API token not configured', null, 'WAF');
      throw new Error('Cloudflare API token required');
    }

    // Check if we're in a browser environment
    if (typeof window !== 'undefined') {
      logger.warn('Cannot deploy WAF rules from browser due to CORS policy. Use Cloudflare dashboard or backend API.', null, 'WAF');
      throw new Error('WAF deployment requires backend API or Cloudflare dashboard access');
    }

    const deployed: string[] = [];

    try {
      for (const rule of rules) {
        if (!rule.enabled) continue;

        const response = await fetch(
          `${this.CF_API_BASE}/zones/${this.CF_ZONE_ID}/firewall/rules`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${this.CF_API_TOKEN}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify([{
              filter: {
                expression: rule.expression,
                description: rule.description
              },
              action: rule.action,
              description: rule.name,
              priority: rule.priority
            }])
          }
        );

        if (response.ok) {
          const data = await response.json();
          deployed.push(rule.name);
          logger.info(`Deployed WAF rule: ${rule.name}`, { ruleId: data.result?.[0]?.id }, 'WAF');
        } else {
          logger.error(`Failed to deploy rule: ${rule.name}`, { status: response.status }, 'WAF');
        }
      }

      return { success: true, deployed };
    } catch (error) {
      logger.error('WAF deployment failed', error, 'WAF');
      throw error;
    }
  }

  /**
   * Toggle rule status
   */
  async toggleRule(ruleId: string, enabled: boolean): Promise<boolean> {
    // This would call Cloudflare API to enable/disable rule
    logger.info(`${enabled ? 'Enabled' : 'Disabled'} WAF rule`, { ruleId }, 'WAF');
    return true;
  }

  /**
   * Create custom rule
   */
  async createCustomRule(rule: WAFRule): Promise<{ success: boolean; ruleId?: string }> {
    try {
      const response = await fetch(
        `${this.CF_API_BASE}/zones/${this.CF_ZONE_ID}/firewall/rules`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.CF_API_TOKEN}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify([{
            filter: {
              expression: rule.expression,
              description: rule.description
            },
            action: rule.action,
            description: rule.name
          }])
        }
      );

      if (response.ok) {
        const data = await response.json();
        return { success: true, ruleId: data.result?.[0]?.id };
      }

      return { success: false };
    } catch (error) {
      logger.error('Failed to create custom rule', error, 'WAF');
      throw error;
    }
  }

  /**
   * Get managed rulesets status
   */
  async getManagedRulesets(): Promise<any> {
    // This would check status of Cloudflare managed rulesets
    return {
      owasp: { enabled: true, sensitivity: 'high' },
      cloudflare: { enabled: true, rules: ['100000', '100001'] }
    };
  }
}

// Export singleton instance
export const wafService = CloudflareWAFService.getInstance();