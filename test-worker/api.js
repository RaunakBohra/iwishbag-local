/**
 * Full API Worker for Free Plan
 * Uses KV instead of D1, no Queue dependencies
 */

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    
    // CORS headers
    const headers = {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers });
    }

    try {
      // Currency rates endpoint
      if (path === '/api/currency/rates') {
        const cached = await env.IWISHBAG_CACHE.get('currency_rates', 'json');
        if (cached) {
          return new Response(JSON.stringify(cached), { headers });
        }
        
        const rates = {
          base: 'USD',
          rates: {
            USD: 1,
            INR: 83.12,
            NPR: 132.45,
            EUR: 0.92,
            GBP: 0.79
          },
          updated: new Date().toISOString()
        };
        
        await env.IWISHBAG_CACHE.put('currency_rates', JSON.stringify(rates), {
          expirationTtl: 300 // 5 minutes
        });
        
        return new Response(JSON.stringify(rates), { headers });
      }

      // Popular products (stored in KV)
      if (path === '/api/products/popular') {
        const products = await env.IWISHBAG_CACHE.get('popular_products', 'json') || [];
        return new Response(JSON.stringify({ products }), { headers });
      }

      // HSN lookup (stored in KV)
      if (path.startsWith('/api/hsn/')) {
        const code = path.split('/')[3];
        const hsn = await env.IWISHBAG_CACHE.get(`hsn_${code}`, 'json');
        
        if (!hsn) {
          return new Response(JSON.stringify({ error: 'HSN not found' }), { 
            status: 404, 
            headers 
          });
        }
        
        return new Response(JSON.stringify(hsn), { headers });
      }

      // Health check
      if (path === '/health') {
        return new Response(JSON.stringify({
          status: 'healthy',
          timestamp: new Date().toISOString(),
          location: request.cf?.colo || 'unknown',
          services: {
            kv: true,
            d1: false,
            queues: false
          }
        }), { headers });
      }

      return new Response(JSON.stringify({ 
        error: 'Not found',
        path 
      }), { 
        status: 404, 
        headers 
      });

    } catch (error) {
      return new Response(JSON.stringify({ 
        error: 'Internal server error',
        message: error.message 
      }), { 
        status: 500, 
        headers 
      });
    }
  }
};