// ============================================================================
// CLOUDFLARE FEATURES WORKER - API Proxy for CORS-free Frontend Access
// Handles all Cloudflare API requests from the frontend safely
// ============================================================================

export interface Env {
  CF_API_TOKEN: string;
  CF_ZONE_ID: string;
  SYNC_API_KEY: string;
}

interface CloudflareAPIRequest {
  endpoint: string;
  method: string;
  data?: any;
}

const CLOUDFLARE_API_BASE = 'https://api.cloudflare.com/client/v4';

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    // CORS headers for all responses
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
      'Access-Control-Max-Age': '86400',
    };

    // Handle preflight requests
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 200,
        headers: corsHeaders,
      });
    }

    const url = new URL(request.url);
    const pathname = url.pathname;

    try {
      // Route handling
      if (pathname.startsWith('/api/cloudflare/')) {
        return await handleCloudflareAPI(request, env, corsHeaders);
      }

      if (pathname === '/api/features/status') {
        return await handleFeatureStatus(env, corsHeaders);
      }

      if (pathname === '/api/features/setup') {
        return await handleBulkSetup(request, env, corsHeaders);
      }

      // Default response
      return new Response(
        JSON.stringify({
          message: 'Cloudflare Features Worker',
          endpoints: [
            '/api/cloudflare/*',
            '/api/features/status',
            '/api/features/setup',
          ],
          timestamp: new Date().toISOString(),
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      );
    } catch (error) {
      console.error('Worker error:', error);
      return new Response(
        JSON.stringify({
          error: 'Internal server error',
          message: error instanceof Error ? error.message : 'Unknown error',
        }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      );
    }
  },
};

// ============================================================================
// CLOUDFLARE API PROXY
// ============================================================================

async function handleCloudflareAPI(
  request: Request, 
  env: Env, 
  corsHeaders: Record<string, string>
): Promise<Response> {
  // Extract endpoint from URL
  const url = new URL(request.url);
  const endpoint = url.pathname.replace('/api/cloudflare', '');
  
  // Get request data
  let data: any = null;
  if (request.method !== 'GET') {
    try {
      data = await request.json();
    } catch (e) {
      // No JSON body
    }
  }

  // Make request to Cloudflare API
  const cloudflareUrl = `${CLOUDFLARE_API_BASE}${endpoint}${url.search}`;
  
  console.log(`🔄 Proxying ${request.method} ${cloudflareUrl}`);

  const cloudflareResponse = await fetch(cloudflareUrl, {
    method: request.method,
    headers: {
      'Authorization': `Bearer ${env.CF_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: data ? JSON.stringify(data) : undefined,
  });

  // Get response data
  const responseData = await cloudflareResponse.text();
  
  console.log(`✅ Cloudflare API response: ${cloudflareResponse.status}`);

  return new Response(responseData, {
    status: cloudflareResponse.status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders,
    },
  });
}

// ============================================================================
// FEATURE STATUS ENDPOINT
// ============================================================================

async function handleFeatureStatus(
  env: Env, 
  corsHeaders: Record<string, string>
): Promise<Response> {
  try {
    console.log('📊 Getting feature status...');

    // Parallel requests for better performance
    const [
      zoneSettings,
      loadBalancers,
      waitingRooms,
      accessApps,
    ] = await Promise.allSettled([
      fetch(`${CLOUDFLARE_API_BASE}/zones/${env.CF_ZONE_ID}/settings`, {
        headers: { 'Authorization': `Bearer ${env.CF_API_TOKEN}` },
      }).then(r => r.json()),
      
      fetch(`${CLOUDFLARE_API_BASE}/load_balancers`, {
        headers: { 'Authorization': `Bearer ${env.CF_API_TOKEN}` },
      }).then(r => r.json()),
      
      fetch(`${CLOUDFLARE_API_BASE}/waiting_rooms`, {
        headers: { 'Authorization': `Bearer ${env.CF_API_TOKEN}` },
      }).then(r => r.json()),
      
      fetch(`${CLOUDFLARE_API_BASE}/zones/${env.CF_ZONE_ID}/access/apps`, {
        headers: { 'Authorization': `Bearer ${env.CF_API_TOKEN}` },
      }).then(r => r.json()),
    ]);

    const status = {
      zone_settings: zoneSettings.status === 'fulfilled' ? zoneSettings.value : null,
      load_balancers: loadBalancers.status === 'fulfilled' ? loadBalancers.value : null,
      waiting_rooms: waitingRooms.status === 'fulfilled' ? waitingRooms.value : null,
      access_apps: accessApps.status === 'fulfilled' ? accessApps.value : null,
      timestamp: new Date().toISOString(),
    };

    console.log('✅ Feature status retrieved');

    return new Response(JSON.stringify(status), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    });
  } catch (error) {
    console.error('❌ Feature status error:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to get feature status',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );
  }
}

// ============================================================================
// BULK SETUP ENDPOINT
// ============================================================================

async function handleBulkSetup(
  request: Request,
  env: Env, 
  corsHeaders: Record<string, string>
): Promise<Response> {
  try {
    const { features } = await request.json();
    
    console.log('🚀 Starting bulk feature setup:', features);

    const results = [];

    // 1. Load Balancing
    if (features.includes('load_balancing')) {
      console.log('Setting up Load Balancing...');
      try {
        const loadBalancerResult = await setupLoadBalancing(env);
        results.push({ feature: 'load_balancing', success: true, data: loadBalancerResult });
      } catch (error) {
        results.push({ feature: 'load_balancing', success: false, error: error.message });
      }
    }

    // 2. Speed Optimizations
    if (features.includes('speed_optimizations')) {
      console.log('Setting up Speed Optimizations...');
      try {
        const speedResult = await setupSpeedOptimizations(env);
        results.push({ feature: 'speed_optimizations', success: true, data: speedResult });
      } catch (error) {
        results.push({ feature: 'speed_optimizations', success: false, error: error.message });
      }
    }

    // 3. Cache Reserve
    if (features.includes('cache_reserve')) {
      console.log('Setting up Cache Reserve...');
      try {
        const cacheResult = await setupCacheReserve(env);
        results.push({ feature: 'cache_reserve', success: true, data: cacheResult });
      } catch (error) {
        results.push({ feature: 'cache_reserve', success: false, error: error.message });
      }
    }

    console.log('✅ Bulk setup completed');

    return new Response(JSON.stringify({
      success: true,
      results,
      timestamp: new Date().toISOString(),
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    });
  } catch (error) {
    console.error('❌ Bulk setup error:', error);
    return new Response(
      JSON.stringify({
        error: 'Bulk setup failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );
  }
}

// ============================================================================
// FEATURE SETUP FUNCTIONS
// ============================================================================

async function setupLoadBalancing(env: Env) {
  // 1. Create Monitor
  const monitor = await fetch(`${CLOUDFLARE_API_BASE}/load_balancers/monitors`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.CF_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      type: 'https',
      method: 'GET',
      path: '/health',
      expected_codes: '200',
      interval: 60,
      retries: 3,
      timeout: 10,
      follow_redirects: true,
      allow_insecure: false,
      description: 'iwishBag health monitor',
    }),
  }).then(r => r.json());

  // 2. Create Pool
  const pool = await fetch(`${CLOUDFLARE_API_BASE}/load_balancers/pools`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.CF_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: 'iwishbag-main-pool',
      description: 'Main iwishBag application pool',
      enabled: true,
      minimum_origins: 1,
      monitor: monitor.result.id,
      origins: [
        {
          name: 'supabase-primary',
          address: 'grgvlrvywsfmnmkxrecd.supabase.co',
          enabled: true,
          weight: 1.0,
        },
        {
          name: 'pages-backup',
          address: 'iwishbag.pages.dev',
          enabled: true,
          weight: 0.8,
        },
      ],
      check_regions: ['WEU', 'EEU', 'SEAS'],
    }),
  }).then(r => r.json());

  // 3. Create Load Balancer
  const loadBalancer = await fetch(`${CLOUDFLARE_API_BASE}/load_balancers`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.CF_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: 'iwishbag-main-lb',
      description: 'Main iwishBag load balancer',
      enabled: true,
      proxied: true,
      fallback_pool: pool.result.id,
      default_pools: [pool.result.id],
      session_affinity: 'cookie',
      session_affinity_ttl: 300,
      steering_policy: 'dynamic_latency',
    }),
  }).then(r => r.json());

  return { monitor: monitor.result, pool: pool.result, loadBalancer: loadBalancer.result };
}

async function setupSpeedOptimizations(env: Env) {
  const results = [];

  // Auto Minify
  const minifyResult = await fetch(`${CLOUDFLARE_API_BASE}/zones/${env.CF_ZONE_ID}/settings/minify`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${env.CF_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      value: { css: true, html: true, js: true },
    }),
  }).then(r => r.json());
  results.push({ feature: 'auto_minify', result: minifyResult });

  // Polish
  const polishResult = await fetch(`${CLOUDFLARE_API_BASE}/zones/${env.CF_ZONE_ID}/settings/polish`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${env.CF_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      value: 'lossless',
    }),
  }).then(r => r.json());
  results.push({ feature: 'polish', result: polishResult });

  // Brotli
  const brotliResult = await fetch(`${CLOUDFLARE_API_BASE}/zones/${env.CF_ZONE_ID}/settings/brotli`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${env.CF_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      value: 'on',
    }),
  }).then(r => r.json());
  results.push({ feature: 'brotli', result: brotliResult });

  return results;
}

async function setupCacheReserve(env: Env) {
  const result = await fetch(`${CLOUDFLARE_API_BASE}/zones/${env.CF_ZONE_ID}/cache/cache_reserve`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${env.CF_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      value: 'on',
    }),
  }).then(r => r.json());

  return result;
}