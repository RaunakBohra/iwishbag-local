/**
 * D1 API Worker - Provides edge database access for iwishBag
 * 
 * Endpoints:
 * GET /api/countries - Get all countries
 * GET /api/countries/:code - Get specific country
 * GET /api/products/popular - Get popular products
 * GET /api/hsn/:code/:origin/:destination - Get HSN tax rates
 * GET /api/rates/:from/:to - Get exchange rate
 * POST /api/track/product/:id - Track product access
 */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Content-Type': 'application/json',
    };

    // Handle OPTIONS
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // Route handlers
      if (path === '/api/countries' && request.method === 'GET') {
        const countries = await getAllCountries(env.DB);
        return new Response(JSON.stringify(countries), { headers: corsHeaders });
      }

      if (path.startsWith('/api/countries/') && request.method === 'GET') {
        const code = path.split('/')[3];
        const country = await getCountry(env.DB, code);
        if (!country) {
          return new Response(JSON.stringify({ error: 'Country not found' }), {
            status: 404,
            headers: corsHeaders,
          });
        }
        return new Response(JSON.stringify(country), { headers: corsHeaders });
      }

      if (path === '/api/products/popular' && request.method === 'GET') {
        const limit = parseInt(url.searchParams.get('limit') || '10');
        const products = await getPopularProducts(env.DB, limit);
        return new Response(JSON.stringify(products), { headers: corsHeaders });
      }

      if (path.startsWith('/api/hsn/') && request.method === 'GET') {
        const parts = path.split('/');
        const hsn = parts[3];
        const origin = parts[4];
        const destination = parts[5];
        
        const taxRates = await getHSNTaxRates(env.DB, hsn, origin, destination);
        if (!taxRates) {
          return new Response(JSON.stringify({ error: 'Tax rates not found' }), {
            status: 404,
            headers: corsHeaders,
          });
        }
        return new Response(JSON.stringify(taxRates), { headers: corsHeaders });
      }

      if (path.startsWith('/api/rates/') && request.method === 'GET') {
        const parts = path.split('/');
        const from = parts[3];
        const to = parts[4];
        
        const rate = await getExchangeRate(env.DB, from, to);
        if (!rate) {
          return new Response(JSON.stringify({ error: 'Exchange rate not found' }), {
            status: 404,
            headers: corsHeaders,
          });
        }
        return new Response(JSON.stringify({ rate }), { headers: corsHeaders });
      }

      if (path.startsWith('/api/track/product/') && request.method === 'POST') {
        const productId = path.split('/')[4];
        const body = await request.json();
        const type = body.type || 'search';
        
        await trackProductAccess(env.DB, productId, type);
        return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
      }

      // Sync endpoints for updating cache
      if (path === '/api/sync/countries' && request.method === 'POST') {
        const countries = await request.json();
        const results = await syncCountries(env.DB, countries);
        return new Response(JSON.stringify(results), { headers: corsHeaders });
      }

      if (path === '/api/sync/rates' && request.method === 'POST') {
        const rates = await request.json();
        const success = await syncExchangeRates(env.DB, rates);
        return new Response(JSON.stringify({ success }), { headers: corsHeaders });
      }

      // Not found
      return new Response(JSON.stringify({ error: 'Not found' }), {
        status: 404,
        headers: corsHeaders,
      });

    } catch (error) {
      console.error('Worker error:', error);
      return new Response(JSON.stringify({ error: 'Internal server error' }), {
        status: 500,
        headers: corsHeaders,
      });
    }
  },
};

// Database functions
async function getAllCountries(db) {
  const result = await db
    .prepare('SELECT * FROM country_settings_cache ORDER BY name')
    .all();
  
  return result.results.map(parseCountry);
}

async function getCountry(db, code) {
  const result = await db
    .prepare('SELECT * FROM country_settings_cache WHERE code = ?')
    .bind(code)
    .first();
  
  return result ? parseCountry(result) : null;
}

async function getPopularProducts(db, limit) {
  const result = await db
    .prepare('SELECT * FROM popular_products_cache ORDER BY popularity_score DESC LIMIT ?')
    .bind(limit)
    .all();
  
  return result.results.map(product => ({
    ...product,
    metadata: product.metadata ? JSON.parse(product.metadata) : null,
  }));
}

async function getHSNTaxRates(db, hsn_code, origin, destination) {
  const result = await db
    .prepare(
      'SELECT * FROM hsn_tax_cache WHERE hsn_code = ? AND origin_country = ? AND destination_country = ?'
    )
    .bind(hsn_code, origin, destination)
    .first();
  
  if (!result) return null;
  
  return {
    ...result,
    additional_taxes: result.additional_taxes ? JSON.parse(result.additional_taxes) : null,
    restrictions: result.restrictions ? JSON.parse(result.restrictions) : [],
  };
}

async function getExchangeRate(db, from, to) {
  const result = await db
    .prepare('SELECT rate FROM exchange_rates_cache WHERE currency_pair = ?')
    .bind(`${from}_${to}`)
    .first();
  
  return result ? result.rate : null;
}

async function trackProductAccess(db, productId, type) {
  const column = type === 'purchase' ? 'purchase_count' : 'search_count';
  
  await db
    .prepare(`
      UPDATE popular_products_cache 
      SET ${column} = ${column} + 1,
          popularity_score = search_count + (purchase_count * 10),
          last_accessed = ?
      WHERE id = ?
    `)
    .bind(Math.floor(Date.now() / 1000), productId)
    .run();
}

async function syncCountries(db, countries) {
  const statements = countries.map(country =>
    db.prepare(`
      INSERT OR REPLACE INTO country_settings_cache 
      (code, name, currency, symbol, exchange_rate, flag, phone_prefix, payment_gateways, shipping_zones, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      country.code,
      country.name,
      country.currency,
      country.symbol,
      country.exchange_rate,
      country.flag || null,
      country.phone_prefix || null,
      JSON.stringify(country.payment_gateways || []),
      JSON.stringify(country.shipping_zones || []),
      Math.floor(Date.now() / 1000)
    )
  );

  const results = await db.batch(statements);
  return { success: true, count: results.length };
}

async function syncExchangeRates(db, rates) {
  const statements = rates.map(({ pair, rate }) =>
    db.prepare(
      'INSERT OR REPLACE INTO exchange_rates_cache (currency_pair, rate, updated_at) VALUES (?, ?, ?)'
    ).bind(pair, rate, Math.floor(Date.now() / 1000))
  );

  await db.batch(statements);
  return true;
}

// Helper to parse country data
function parseCountry(country) {
  return {
    ...country,
    payment_gateways: country.payment_gateways ? JSON.parse(country.payment_gateways) : [],
    shipping_zones: country.shipping_zones ? JSON.parse(country.shipping_zones) : [],
  };
}