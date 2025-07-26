/**
 * Cloudflare Worker for API Endpoints
 * Handles edge API operations with caching and optimization
 */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Content-Type': 'application/json',
    };

    // Handle preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // Route handling
      const path = url.pathname;
      
      // Currency conversion endpoint
      if (path === '/api/currency/convert' && request.method === 'POST') {
        return handleCurrencyConversion(request, env, corsHeaders);
      }
      
      // Exchange rates endpoint
      if (path === '/api/currency/rates' && request.method === 'GET') {
        return handleExchangeRates(request, env, corsHeaders);
      }
      
      // Quote calculation endpoint
      if (path === '/api/quote/calculate' && request.method === 'POST') {
        return handleQuoteCalculation(request, env, corsHeaders);
      }
      
      // HSN lookup endpoint
      if (path === '/api/hsn/lookup' && request.method === 'GET') {
        return handleHSNLookup(request, env, corsHeaders);
      }
      
      // Product classification endpoint
      if (path === '/api/product/classify' && request.method === 'POST') {
        return handleProductClassification(request, env, corsHeaders);
      }
      
      // Popular products endpoint
      if (path === '/api/products/popular' && request.method === 'GET') {
        return handlePopularProducts(request, env, corsHeaders);
      }
      
      // Health check
      if (path === '/api/health') {
        return new Response(JSON.stringify({
          status: 'healthy',
          timestamp: new Date().toISOString(),
          edge_location: request.cf?.colo || 'unknown'
        }), { headers: corsHeaders });
      }
      
      // 404 for unknown routes
      return new Response(JSON.stringify({
        error: 'Not found',
        path: path
      }), { 
        status: 404,
        headers: corsHeaders 
      });
      
    } catch (error) {
      console.error('Worker error:', error);
      return new Response(JSON.stringify({
        error: 'Internal server error',
        message: error.message
      }), { 
        status: 500,
        headers: corsHeaders 
      });
    }
  }
};

/**
 * Currency conversion handler
 */
async function handleCurrencyConversion(request, env, headers) {
  const { amount, from, to } = await request.json();
  
  // Check cache first
  const cacheKey = `currency:${from}:${to}:${amount}`;
  const cached = await env.IWISHBAG_CACHE.get(cacheKey, 'json');
  
  if (cached) {
    return new Response(JSON.stringify({
      ...cached,
      cached: true
    }), { headers });
  }
  
  // Get rates from D1 or KV
  const fromRate = await getExchangeRate(env, from);
  const toRate = await getExchangeRate(env, to);
  
  // Convert via USD
  const usdAmount = amount / fromRate;
  const result = usdAmount * toRate;
  
  const response = {
    amount,
    from,
    to,
    result: Number(result.toFixed(2)),
    rate: Number((toRate / fromRate).toFixed(6)),
    timestamp: new Date().toISOString()
  };
  
  // Cache for 5 minutes
  await env.IWISHBAG_CACHE.put(cacheKey, JSON.stringify(response), {
    expirationTtl: 300
  });
  
  return new Response(JSON.stringify(response), { headers });
}

/**
 * Exchange rates handler
 */
async function handleExchangeRates(request, env, headers) {
  const url = new URL(request.url);
  const currency = url.searchParams.get('currency');
  
  // Get all rates from cache or D1
  const rates = await getAllExchangeRates(env);
  
  if (currency) {
    return new Response(JSON.stringify({
      currency,
      rate: rates[currency] || null,
      base: 'USD'
    }), { headers });
  }
  
  return new Response(JSON.stringify({
    base: 'USD',
    rates,
    timestamp: new Date().toISOString()
  }), { headers });
}

/**
 * Quote calculation handler
 */
async function handleQuoteCalculation(request, env, headers) {
  const quoteData = await request.json();
  
  // Generate cache key
  const cacheKey = generateQuoteCacheKey(quoteData);
  
  // Check cache
  const cached = await env.IWISHBAG_CACHE.get(cacheKey, 'json');
  if (cached) {
    return new Response(JSON.stringify({
      ...cached,
      cached: true
    }), { headers });
  }
  
  // Perform calculation
  const result = await calculateQuote(quoteData, env);
  
  // Cache for 15 minutes
  await env.IWISHBAG_CACHE.put(cacheKey, JSON.stringify(result), {
    expirationTtl: 900
  });
  
  return new Response(JSON.stringify(result), { headers });
}

/**
 * HSN lookup handler
 */
async function handleHSNLookup(request, env, headers) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const search = url.searchParams.get('search');
  
  if (code) {
    // Lookup specific HSN code
    const hsn = await env.DB.prepare(
      'SELECT * FROM hsn_tax_rates WHERE hsn_code = ?'
    ).bind(code).first();
    
    return new Response(JSON.stringify(hsn || { error: 'HSN code not found' }), { headers });
  }
  
  if (search) {
    // Search HSN codes
    const results = await env.DB.prepare(
      `SELECT * FROM hsn_tax_rates 
       WHERE description LIKE ? OR category LIKE ?
       LIMIT 10`
    ).bind(`%${search}%`, `%${search}%`).all();
    
    return new Response(JSON.stringify({
      search,
      results: results.results || []
    }), { headers });
  }
  
  return new Response(JSON.stringify({
    error: 'Please provide code or search parameter'
  }), { status: 400, headers });
}

/**
 * Product classification handler
 */
async function handleProductClassification(request, env, headers) {
  const { product, origin, destination } = await request.json();
  
  if (!product) {
    return new Response(JSON.stringify({
      error: 'Product description required'
    }), { status: 400, headers });
  }
  
  // Use Workers AI for classification
  const ai = env.AI;
  
  if (ai) {
    try {
      const response = await ai.run('@cf/meta/llama-2-7b-chat-int8', {
        prompt: `Classify this product for customs and provide HSN code: "${product}". 
                 Origin: ${origin || 'Unknown'}, Destination: ${destination || 'Unknown'}.
                 Provide: HSN code, category, customs rate, GST rate.`,
        max_tokens: 200
      });
      
      // Parse AI response
      const classification = parseAIClassification(response.response);
      
      return new Response(JSON.stringify({
        product,
        classification,
        ai_powered: true
      }), { headers });
    } catch (error) {
      console.error('AI classification error:', error);
    }
  }
  
  // Fallback to keyword matching
  const classification = await classifyByKeywords(product, env);
  
  return new Response(JSON.stringify({
    product,
    classification,
    ai_powered: false
  }), { headers });
}

/**
 * Popular products handler
 */
async function handlePopularProducts(request, env, headers) {
  const url = new URL(request.url);
  const category = url.searchParams.get('category');
  const limit = parseInt(url.searchParams.get('limit') || '10');
  
  // Get from D1
  let query = 'SELECT * FROM popular_products';
  const params = [];
  
  if (category) {
    query += ' WHERE category = ?';
    params.push(category);
  }
  
  query += ' ORDER BY popularity_score DESC LIMIT ?';
  params.push(limit);
  
  const results = await env.DB.prepare(query).bind(...params).all();
  
  return new Response(JSON.stringify({
    products: results.results || [],
    category,
    count: results.results?.length || 0
  }), { headers });
}

// Helper functions

async function getExchangeRate(env, currency) {
  if (currency === 'USD') return 1;
  
  // Try KV first
  const cached = await env.IWISHBAG_CACHE.get(`rate:${currency}`);
  if (cached) return parseFloat(cached);
  
  // Fallback to D1
  const result = await env.DB.prepare(
    'SELECT exchange_rate FROM country_settings_cache WHERE currency = ?'
  ).bind(currency).first();
  
  const rate = result?.exchange_rate || 1;
  
  // Cache in KV
  await env.IWISHBAG_CACHE.put(`rate:${currency}`, String(rate), {
    expirationTtl: 300
  });
  
  return rate;
}

async function getAllExchangeRates(env) {
  // Try cache first
  const cached = await env.IWISHBAG_CACHE.get('all_rates', 'json');
  if (cached) return cached;
  
  // Get from D1
  const results = await env.DB.prepare(
    'SELECT currency, exchange_rate FROM country_settings_cache'
  ).all();
  
  const rates = { USD: 1 };
  results.results?.forEach(r => {
    rates[r.currency] = r.exchange_rate;
  });
  
  // Cache for 5 minutes
  await env.IWISHBAG_CACHE.put('all_rates', JSON.stringify(rates), {
    expirationTtl: 300
  });
  
  return rates;
}

function generateQuoteCacheKey(quoteData) {
  const key = [
    quoteData.origin_country,
    quoteData.destination_country,
    quoteData.items?.length || 0,
    quoteData.shipping_method,
    JSON.stringify(quoteData.items?.map(i => ({
      category: i.category,
      price: i.price_usd,
      weight: i.weight_kg
    }))),
  ].join(':');
  
  return `quote:${btoa(key).substring(0, 32)}`;
}

async function calculateQuote(quoteData, env) {
  // Simplified calculation logic
  const items_total = quoteData.items?.reduce((sum, item) => 
    sum + (item.price_usd * item.quantity), 0) || 0;
  
  const total_weight = quoteData.items?.reduce((sum, item) => 
    sum + (item.weight_kg * item.quantity), 0) || 0;
  
  // Get shipping rate
  const shipping = total_weight * 10; // Simplified
  
  // Get tax rates
  const customs = items_total * 0.1; // 10% simplified
  const gst = (items_total + customs) * 0.18; // 18% GST
  
  return {
    items_total,
    shipping,
    customs,
    gst,
    total: items_total + shipping + customs + gst,
    currency: quoteData.destination_country === 'IN' ? 'INR' : 'USD',
    calculated_at: new Date().toISOString()
  };
}

function parseAIClassification(aiResponse) {
  // Simple parser for AI response
  const classification = {
    hsn_code: null,
    category: null,
    customs_rate: null,
    gst_rate: null
  };
  
  // Extract HSN code (4-8 digits)
  const hsnMatch = aiResponse.match(/\b\d{4,8}\b/);
  if (hsnMatch) classification.hsn_code = hsnMatch[0];
  
  // Extract rates (percentages)
  const customsMatch = aiResponse.match(/customs.*?(\d+)%/i);
  if (customsMatch) classification.customs_rate = parseInt(customsMatch[1]);
  
  const gstMatch = aiResponse.match(/gst.*?(\d+)%/i);
  if (gstMatch) classification.gst_rate = parseInt(gstMatch[1]);
  
  return classification;
}

async function classifyByKeywords(product, env) {
  const productLower = product.toLowerCase();
  
  // Common product patterns
  const patterns = {
    electronics: /phone|laptop|computer|tablet|camera|electronic/,
    clothing: /shirt|dress|pants|clothes|apparel|fashion/,
    toys: /toy|game|puzzle|doll|lego/,
    books: /book|novel|magazine|publication/,
    jewelry: /ring|necklace|bracelet|jewelry|jewellery/
  };
  
  for (const [category, pattern] of Object.entries(patterns)) {
    if (pattern.test(productLower)) {
      // Get HSN from D1
      const hsn = await env.DB.prepare(
        'SELECT * FROM hsn_tax_rates WHERE category = ? LIMIT 1'
      ).bind(category).first();
      
      return {
        hsn_code: hsn?.hsn_code || '9999',
        category,
        customs_rate: hsn?.customs_rate || 10,
        gst_rate: hsn?.gst_rate || 18
      };
    }
  }
  
  // Default classification
  return {
    hsn_code: '9999',
    category: 'general',
    customs_rate: 10,
    gst_rate: 18
  };
}