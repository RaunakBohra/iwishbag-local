// ============================================================================
// CLOUDFLARE FEATURE SERVICE - Comprehensive Feature Management
// Manages all Cloudflare free tier features for iwishBag platform
// ============================================================================

export interface CloudflareConfig {
  zoneId: string;
  apiToken: string;
  domain: string;
}

export interface LoadBalancerPool {
  id?: string;
  name: string;
  description: string;
  enabled: boolean;
  origins: Array<{
    name: string;
    address: string;
    enabled: boolean;
    weight: number;
  }>;
  minimum_origins: number;
  monitor?: string;
  check_regions: string[];
}

export interface ZeroTrustApplication {
  name: string;
  domain: string;
  type: 'self_hosted' | 'saas';
  session_duration: string;
  policies: Array<{
    name: string;
    action: 'allow' | 'deny' | 'bypass';
    include: Array<{
      email_domain?: { domain: string };
      ip?: { ip: string };
      country?: { country_code: string };
    }>;
  }>;
}

export interface SpeedOptimizations {
  auto_minify: {
    css: boolean;
    html: boolean;
    js: boolean;
  };
  polish: 'off' | 'lossless' | 'lossy';
  mirage: boolean;
  rocket_loader: boolean;
  brotli: boolean;
}

export class CloudflareFeatureService {
  private config: CloudflareConfig;
  private baseUrl: string;

  constructor(config: CloudflareConfig) {
    this.config = config;
    // Use Worker proxy instead of direct API calls to avoid CORS
    this.baseUrl = this.config.domain.startsWith('localhost') 
      ? 'http://localhost:8787/api/cloudflare'  // Local development
      : 'https://whyteclub.com/api/cloudflare';   // Production
  }

  private async makeRequest(endpoint: string, method: string = 'GET', data?: any) {
    const url = `${this.baseUrl}${endpoint}`;
    
    console.log(`🔄 Making request to Worker: ${method} ${url}`);
    
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: data ? JSON.stringify(data) : undefined,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Worker API Error: ${response.status} - ${error}`);
    }

    return response.json();
  }

  // Add a method to use the Worker's bulk setup endpoint
  async bulkSetupFeatures(features: string[]) {
    console.log('🚀 Starting bulk feature setup via Worker:', features);
    
    const workerUrl = this.config.domain.startsWith('localhost') 
      ? 'http://localhost:8787/api/features/setup'
      : 'https://whyteclub.com/api/features/setup';
    
    const response = await fetch(workerUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ features }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Bulk setup failed: ${response.status} - ${error}`);
    }

    return response.json();
  }

  // ============================================================================
  // LOAD BALANCING - High Availability Setup
  // ============================================================================

  async createLoadBalancer(poolConfig: LoadBalancerPool) {
    console.log('🔄 Creating Load Balancer Pool:', poolConfig.name);
    
    // 1. Create Monitor for Health Checks
    const monitor = await this.createHealthMonitor({
      type: 'https',
      method: 'GET',
      path: '/health',
      expected_codes: '200',
      interval: 60,
      retries: 3,
      timeout: 10,
      follow_redirects: true,
      allow_insecure: false,
      description: `Health monitor for ${poolConfig.name}`,
    });

    // 2. Create Pool with Origins
    const pool = await this.makeRequest('/load_balancers/pools', 'POST', {
      name: poolConfig.name,
      description: poolConfig.description,
      enabled: poolConfig.enabled,
      minimum_origins: poolConfig.minimum_origins,
      monitor: monitor.result.id,
      origins: poolConfig.origins,
      check_regions: poolConfig.check_regions,
      notification_email: 'admin@iwishbag.com',
    });

    // 3. Create Load Balancer
    const loadBalancer = await this.makeRequest('/load_balancers', 'POST', {
      name: `iwishbag-${poolConfig.name}`,
      description: `Load balancer for ${poolConfig.description}`,
      enabled: true,
      proxied: true,
      fallback_pool: pool.result.id,
      default_pools: [pool.result.id],
      region_pools: {},
      pop_pools: {},
      rules: [],
      session_affinity: 'cookie',
      session_affinity_ttl: 300,
      steering_policy: 'dynamic_latency',
    });

    console.log('✅ Load Balancer Created:', loadBalancer.result.id);
    return {
      monitor: monitor.result,
      pool: pool.result,
      loadBalancer: loadBalancer.result,
    };
  }

  private async createHealthMonitor(config: any) {
    return this.makeRequest('/load_balancers/monitors', 'POST', config);
  }

  async getLoadBalancerStats(loadBalancerId: string) {
    return this.makeRequest(`/load_balancers/${loadBalancerId}/analytics/events`);
  }

  // ============================================================================
  // ZERO TRUST ACCESS - Admin Security
  // ============================================================================

  async setupZeroTrustApplication(app: ZeroTrustApplication) {
    console.log('🔐 Setting up Zero Trust Application:', app.name);
    
    const application = await this.makeRequest('/zones/access/apps', 'POST', {
      name: app.name,
      domain: app.domain,
      type: app.type,
      session_duration: app.session_duration,
      auto_redirect_to_identity: true,
      enable_binding_cookie: true,
      allowed_idps: [],
      policies: app.policies.map(policy => ({
        name: policy.name,
        action: policy.action,
        include: policy.include,
        require: [],
        exclude: [],
      })),
    });

    console.log('✅ Zero Trust Application Created:', application.result.id);
    return application.result;
  }

  async createAccessPolicy(appId: string, policy: any) {
    return this.makeRequest(`/zones/access/apps/${appId}/policies`, 'POST', policy);
  }

  // ============================================================================
  // SPEED OPTIMIZATIONS - Performance Enhancements
  // ============================================================================

  async enableSpeedOptimizations(optimizations: SpeedOptimizations) {
    console.log('⚡ Enabling Speed Optimizations');
    
    const results = [];

    // 1. Auto Minify
    if (optimizations.auto_minify) {
      const minifyResult = await this.makeRequest(`/zones/${this.config.zoneId}/settings/minify`, 'PATCH', {
        value: optimizations.auto_minify,
      });
      results.push({ feature: 'auto_minify', result: minifyResult });
    }

    // 2. Polish (Image Optimization)
    if (optimizations.polish) {
      const polishResult = await this.makeRequest(`/zones/${this.config.zoneId}/settings/polish`, 'PATCH', {
        value: optimizations.polish,
      });
      results.push({ feature: 'polish', result: polishResult });
    }

    // 3. Mirage (Adaptive Image Quality)
    if (optimizations.mirage !== undefined) {
      const mirageResult = await this.makeRequest(`/zones/${this.config.zoneId}/settings/mirage`, 'PATCH', {
        value: optimizations.mirage ? 'on' : 'off',
      });
      results.push({ feature: 'mirage', result: mirageResult });
    }

    // 4. Rocket Loader
    if (optimizations.rocket_loader !== undefined) {
      const rocketResult = await this.makeRequest(`/zones/${this.config.zoneId}/settings/rocket_loader`, 'PATCH', {
        value: optimizations.rocket_loader ? 'on' : 'off',
      });
      results.push({ feature: 'rocket_loader', result: rocketResult });
    }

    // 5. Brotli Compression
    if (optimizations.brotli !== undefined) {
      const brotliResult = await this.makeRequest(`/zones/${this.config.zoneId}/settings/brotli`, 'PATCH', {
        value: optimizations.brotli ? 'on' : 'off',
      });
      results.push({ feature: 'brotli', result: brotliResult });
    }

    console.log('✅ Speed Optimizations Enabled:', results.length);
    return results;
  }

  // ============================================================================
  // CACHE RESERVE - Extended Cache Persistence
  // ============================================================================

  async enableCacheReserve() {
    console.log('💾 Enabling Cache Reserve');
    
    const result = await this.makeRequest(`/zones/${this.config.zoneId}/cache/cache_reserve`, 'PATCH', {
      value: 'on',
    });

    console.log('✅ Cache Reserve Enabled');
    return result;
  }

  // ============================================================================
  // WAITING ROOM - Traffic Spike Management
  // ============================================================================

  async createWaitingRoom(config: {
    name: string;
    host: string;
    path: string;
    total_active_users: number;
    new_users_per_minute: number;
    custom_page_html?: string;
  }) {
    console.log('⏳ Creating Waiting Room:', config.name);
    
    const waitingRoom = await this.makeRequest('/waiting_rooms', 'POST', {
      name: config.name,
      host: config.host,
      path: config.path,
      total_active_users: config.total_active_users,
      new_users_per_minute: config.new_users_per_minute,
      session_duration: 10,
      description: `Waiting room for ${config.name}`,
      custom_page_html: config.custom_page_html || this.getDefaultWaitingRoomHTML(),
      default_template_language: 'en-US',
      disable_session_renewal: false,
      json_response_enabled: false,
      queueing_method: 'fifo',
      suspended: false,
    });

    console.log('✅ Waiting Room Created:', waitingRoom.result.id);
    return waitingRoom.result;
  }

  private getDefaultWaitingRoomHTML(): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <title>iwishBag - Please Wait</title>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; text-align: center; padding: 50px; background: #f8fafc; }
        .container { max-width: 400px; margin: 0 auto; background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
        .logo { font-size: 28px; font-weight: bold; color: #2563eb; margin-bottom: 20px; }
        .message { color: #64748b; margin-bottom: 30px; line-height: 1.5; }
        .progress { width: 100%; height: 8px; background: #e2e8f0; border-radius: 4px; overflow: hidden; }
        .progress-bar { height: 100%; background: linear-gradient(90deg, #3b82f6, #06b6d4); animation: progress 2s infinite; }
        @keyframes progress { 0% { width: 0%; } 100% { width: 100%; } }
        .stats { margin-top: 20px; font-size: 14px; color: #94a3b8; }
    </style>
</head>
<body>
    <div class="container">
        <div class="logo">iwishBag</div>
        <h2>You're in line!</h2>
        <p class="message">We're experiencing high traffic. You'll be automatically redirected when it's your turn.</p>
        <div class="progress"><div class="progress-bar"></div></div>
        <div class="stats">
            <div>Estimated wait time: {{waitTimeKnown}}</div>
            <div>Users ahead of you: {{usersInLineAhead}}</div>
        </div>
    </div>
</body>
</html>`;
  }

  // ============================================================================
  // DNS FIREWALL - Security Enhancement
  // ============================================================================

  async enableDNSFirewall() {
    console.log('🛡️ Enabling DNS Firewall');
    
    const result = await this.makeRequest(`/zones/${this.config.zoneId}/settings/security_level`, 'PATCH', {
      value: 'high',
    });

    console.log('✅ DNS Firewall Enabled');
    return result;
  }

  // ============================================================================
  // TRANSFORM RULES - URL Optimization
  // ============================================================================

  async createTransformRules() {
    console.log('🔄 Creating Transform Rules');
    
    const rules = [
      {
        action: 'rewrite',
        action_parameters: {
          uri: {
            path: {
              value: '/api/v1$1',
            },
          },
        },
        expression: 'http.request.uri.path matches "^/api/(.*)$"',
        description: 'API v1 path normalization',
        enabled: true,
      },
      {
        action: 'rewrite',
        action_parameters: {
          headers: {
            'X-iwishBag-Version': {
              operation: 'set',
              value: '2.0',
            },
          },
        },
        expression: 'true',
        description: 'Add version header',
        enabled: true,
      },
    ];

    const results = [];
    for (const rule of rules) {
      const result = await this.makeRequest(`/zones/${this.config.zoneId}/rulesets`, 'POST', {
        name: 'iwishBag Transform Rules',
        kind: 'zone',
        phase: 'http_request_transform',
        rules: [rule],
      });
      results.push(result);
    }

    console.log('✅ Transform Rules Created:', results.length);
    return results;
  }

  // ============================================================================
  // FEATURE STATUS & MONITORING
  // ============================================================================

  async getAllFeatureStatus() {
    // Use the Worker's dedicated status endpoint for better performance
    const workerUrl = this.config.domain.startsWith('localhost') 
      ? 'http://localhost:8787/api/features/status'
      : 'https://whyteclub.com/api/features/status';
    
    console.log('📊 Getting feature status from Worker:', workerUrl);
    
    const response = await fetch(workerUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Feature status failed: ${response.status} - ${error}`);
    }

    return response.json();
  }

  async getPerformanceMetrics() {
    const analytics = await this.makeRequest(`/zones/${this.config.zoneId}/analytics/dashboard`, 'GET', {
      since: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    });

    return analytics.result;
  }
}

// ============================================================================
// CLOUDFLARE FEATURE CONFIGURATION
// ============================================================================

export const cloudflareFeatures = {
  iwishbag: {
    zoneId: '2cd502a70fa04ec1619df21d7eb5e17c',
    apiToken: '4Y_WjuGIEtTpK85hmE6XrGwbi85d8zN5Me0T_45l',
    domain: window.location.hostname === 'localhost' ? 'localhost:8082' : 'iwishbag.com',
  },
};

// Singleton instance
export const cloudflareService = new CloudflareFeatureService(cloudflareFeatures.iwishbag);