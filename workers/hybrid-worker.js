// Hybrid Worker: R2 Storage + KV Cache + Background Processing
export default {
  async fetch(request, env, ctx) {
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      const url = new URL(request.url);
      const path = url.pathname;

      // KV Cache Operations
      if (path.startsWith('/kv/')) {
        return handleKVOperations(request, env, corsHeaders);
      }

      // R2 Storage Operations  
      if (path.startsWith('/r2/')) {
        return handleR2Operations(request, env, corsHeaders);
      }

      // Performance Optimization
      if (path.startsWith('/optimize/')) {
        return handleOptimization(request, env, corsHeaders);
      }

      return new Response('Not found', { status: 404, headers: corsHeaders });

    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }
};

// KV Cache Operations
async function handleKVOperations(request, env, corsHeaders) {
  const url = new URL(request.url);
  const key = url.pathname.replace('/kv/', '');
  const kv = env.IWISHBAG_CACHE;

  switch (request.method) {
    case 'GET':
      const value = await kv.get(key);
      return new Response(JSON.stringify({ success: true, data: value }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    case 'PUT':
      const { data, ttl } = await request.json();
      await kv.put(key, JSON.stringify(data), { expirationTtl: ttl });
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    case 'DELETE':
      await kv.delete(key);
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    default:
      return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  }
}

// R2 Storage Operations (Enhanced)
async function handleR2Operations(request, env, corsHeaders) {
  const url = new URL(request.url);
  const key = url.pathname.replace('/r2/', '');
  const bucket = env.IWISHBAG_NEW;

  switch (request.method) {
    case 'PUT':
    case 'POST':
      const contentType = request.headers.get('Content-Type') || 'application/octet-stream';
      const body = await request.arrayBuffer();
      
      await bucket.put(key, body, {
        httpMetadata: { contentType },
      });

      return new Response(JSON.stringify({
        success: true,
        key,
        url: `https://r2.iwishbag.com/${key}`,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    case 'GET':
      const object = await bucket.get(key);
      
      if (!object) {
        return new Response('Not found', { status: 404, headers: corsHeaders });
      }

      const headers = new Headers({
        ...corsHeaders,
        'Content-Type': object.httpMetadata?.contentType || 'application/octet-stream',
        'Cache-Control': 'public, max-age=31536000', // 1 year cache
      });

      return new Response(object.body, { headers });

    case 'DELETE':
      await bucket.delete(key);
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    default:
      return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  }
}

// Performance Optimization Endpoints
async function handleOptimization(request, env, corsHeaders) {
  const url = new URL(request.url);
  const action = url.pathname.replace('/optimize/', '');

  switch (action) {
    case 'exchange-rates':
      return await cacheExchangeRates(env, corsHeaders);
    
    case 'country-settings':
      return await cacheCountrySettings(env, corsHeaders);
    
    case 'popular-products':
      return await cachePopularProducts(env, corsHeaders);
    
    case 'warm-cache':
      return await warmUpCache(env, corsHeaders);

    default:
      return new Response('Invalid optimization action', { 
        status: 400, 
        headers: corsHeaders 
      });
  }
}

// Cache Exchange Rates
async function cacheExchangeRates(env, corsHeaders) {
  try {
    // Fetch latest rates from your API
    const rates = {
      'USD_INR': 83.25,
      'USD_NPR': 134.50,
      'USD_EUR': 0.85,
      'USD_GBP': 0.73,
      'USD_AUD': 1.55,
      'USD_CAD': 1.38,
      timestamp: Date.now()
    };

    const kv = env.IWISHBAG_CACHE;
    
    // Cache each rate with 24-hour TTL
    for (const [pair, rate] of Object.entries(rates)) {
      if (pair !== 'timestamp') {
        await kv.put(`exchange_rate:${pair}`, JSON.stringify({
          rate,
          timestamp: rates.timestamp
        }), { expirationTtl: 86400 }); // 24 hours
      }
    }

    // Cache the complete rates object
    await kv.put('all_exchange_rates', JSON.stringify(rates), { 
      expirationTtl: 86400 
    });

    return new Response(JSON.stringify({
      success: true,
      cached_rates: Object.keys(rates).length - 1,
      expires_in: 86400
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

// Cache Country Settings
async function cacheCountrySettings(env, corsHeaders) {
  const countries = {
    'IN': { currency: 'INR', tax_rate: 0.18, shipping_zone: 'domestic' },
    'NP': { currency: 'NPR', tax_rate: 0.13, shipping_zone: 'south_asia' },
    'US': { currency: 'USD', tax_rate: 0.08, shipping_zone: 'international' },
    'GB': { currency: 'GBP', tax_rate: 0.20, shipping_zone: 'europe' },
    'AU': { currency: 'AUD', tax_rate: 0.10, shipping_zone: 'oceania' }
  };

  const kv = env.IWISHBAG_CACHE;

  // Cache each country with 7-day TTL
  for (const [code, settings] of Object.entries(countries)) {
    await kv.put(`country:${code}`, JSON.stringify({
      ...settings,
      updated_at: Date.now()
    }), { expirationTtl: 604800 }); // 7 days
  }

  return new Response(JSON.stringify({
    success: true,
    cached_countries: Object.keys(countries).length
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

// Cache Popular Products
async function cachePopularProducts(env, corsHeaders) {
  // Mock popular products data
  const popularProducts = [
    { name: 'iPhone 15 Pro', category: 'electronics', quotes: 45 },
    { name: 'Nike Air Jordan', category: 'fashion', quotes: 32 },
    { name: 'MacBook Pro M3', category: 'electronics', quotes: 28 },
    { name: 'Samsung Galaxy S24', category: 'electronics', quotes: 25 },
    { name: 'Adidas Ultraboost', category: 'fashion', quotes: 22 }
  ];

  const kv = env.IWISHBAG_CACHE;
  
  await kv.put('popular_products', JSON.stringify({
    products: popularProducts,
    updated_at: Date.now()
  }), { expirationTtl: 3600 }); // 1 hour

  return new Response(JSON.stringify({
    success: true,
    cached_products: popularProducts.length
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

// Warm Up Cache
async function warmUpCache(env, corsHeaders) {
  try {
    // Warm up all critical cache keys
    await Promise.all([
      cacheExchangeRates(env, corsHeaders),
      cacheCountrySettings(env, corsHeaders),
      cachePopularProducts(env, corsHeaders)
    ]);

    return new Response(JSON.stringify({
      success: true,
      message: 'Cache warmed up successfully',
      timestamp: Date.now()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}