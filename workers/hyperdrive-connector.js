// Cloudflare Worker with Hyperdrive for database acceleration
// Deploy this to accelerate your Supabase connections

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

      // Use Hyperdrive to connect to your Supabase database
      // Hyperdrive pools connections and caches queries at the edge
      
      if (path.startsWith('/api/quotes')) {
        // Accelerated quote queries
        return await handleQuoteQueries(request, env, corsHeaders);
      }
      
      if (path.startsWith('/api/analytics')) {
        // Fast analytics queries
        return await handleAnalyticsQueries(request, env, corsHeaders);
      }

      if (path.startsWith('/api/cache-warm')) {
        // Warm up frequently accessed data
        return await warmCache(request, env, corsHeaders);
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

async function handleQuoteQueries(request, env, corsHeaders) {
  // Connect to Supabase via Hyperdrive for faster database access
  const hyperdrive = env.HYPERDRIVE;
  
  // Example: Get quotes with acceleration
  const url = new URL(request.url);
  const quoteId = url.searchParams.get('id');
  
  if (quoteId) {
    // This query will be accelerated by Hyperdrive
    // Connection pooling + query caching at the edge
    const query = `
      SELECT q.*, qi.* 
      FROM quotes q 
      LEFT JOIN quote_items qi ON q.id = qi.quote_id 
      WHERE q.id = $1
    `;
    
    // Hyperdrive handles connection pooling automatically
    const result = await hyperdrive.prepare(query).bind(quoteId).first();
    
    return new Response(JSON.stringify({ data: result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  // List recent quotes with caching
  const recentQuotes = await hyperdrive.prepare(`
    SELECT id, customer_name, total_amount_usd, status, created_at
    FROM quotes 
    WHERE created_at > NOW() - INTERVAL '7 days'
    ORDER BY created_at DESC 
    LIMIT 50
  `).all();

  return new Response(JSON.stringify({ data: recentQuotes }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

async function handleAnalyticsQueries(request, env, corsHeaders) {
  const hyperdrive = env.HYPERDRIVE;
  const url = new URL(request.url);
  const metric = url.searchParams.get('metric');

  switch (metric) {
    case 'conversion_rate':
      const conversionData = await hyperdrive.prepare(`
        SELECT 
          DATE(created_at) as date,
          COUNT(CASE WHEN status = 'approved' THEN 1 END) * 100.0 / COUNT(*) as conversion_rate
        FROM quotes 
        WHERE created_at > NOW() - INTERVAL '30 days'
        GROUP BY DATE(created_at)
        ORDER BY date DESC
      `).all();
      
      return new Response(JSON.stringify({ data: conversionData }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    case 'popular_products':
      const popularProducts = await hyperdrive.prepare(`
        SELECT 
          product_name,
          COUNT(*) as quote_count,
          AVG(price_usd) as avg_price
        FROM quote_items qi
        JOIN quotes q ON qi.quote_id = q.id
        WHERE q.created_at > NOW() - INTERVAL '7 days'
        GROUP BY product_name
        ORDER BY quote_count DESC
        LIMIT 20
      `).all();
      
      return new Response(JSON.stringify({ data: popularProducts }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    default:
      return new Response('Invalid metric', { status: 400, headers: corsHeaders });
  }
}

async function warmCache(request, env, corsHeaders) {
  // Pre-populate KV cache with frequently accessed data
  const kv = env.IWISHBAG_CACHE;
  const hyperdrive = env.HYPERDRIVE;

  try {
    // Cache exchange rates
    const rates = await hyperdrive.prepare(`
      SELECT from_currency, to_currency, rate 
      FROM exchange_rates 
      WHERE updated_at > NOW() - INTERVAL '1 hour'
    `).all();
    
    for (const rate of rates) {
      await kv.put(
        `exchange_rate:${rate.from_currency}_${rate.to_currency}`,
        JSON.stringify({ rate: rate.rate, timestamp: Date.now() }),
        { expirationTtl: 3600 }
      );
    }

    // Cache country settings
    const countries = await hyperdrive.prepare(`
      SELECT country_code, currency, tax_rate, shipping_zones
      FROM country_settings
    `).all();
    
    await kv.put('country_settings', JSON.stringify(countries), { expirationTtl: 7200 });

    // Cache popular HSN codes
    const hsnCodes = await hyperdrive.prepare(`
      SELECT hsn_code, description, customs_rate, usage_count
      FROM hsn_master 
      ORDER BY usage_count DESC 
      LIMIT 100
    `).all();
    
    await kv.put('popular_hsn_codes', JSON.stringify(hsnCodes), { expirationTtl: 3600 });

    return new Response(JSON.stringify({ 
      success: true, 
      cached: {
        exchange_rates: rates.length,
        countries: countries.length,
        hsn_codes: hsnCodes.length
      }
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