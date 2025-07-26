/**
 * Simple API Worker without Queue dependencies
 * Works on free plan
 */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Content-Type': 'application/json',
    };

    // Handle preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      const path = url.pathname;
      
      // Health check
      if (path === '/health') {
        return new Response(JSON.stringify({
          status: 'healthy',
          timestamp: new Date().toISOString(),
          edge_location: request.cf?.colo || 'unknown'
        }), { headers: corsHeaders });
      }
      
      // Currency conversion endpoint
      if (path === '/api/currency/rates') {
        // Use KV for caching
        const cached = await env.IWISHBAG_CACHE?.get('exchange_rates');
        if (cached) {
          return new Response(cached, { headers: corsHeaders });
        }
        
        // Default rates
        const rates = {
          base: 'USD',
          rates: {
            USD: 1,
            INR: 83.12,
            NPR: 132.45,
            EUR: 0.92
          },
          timestamp: new Date().toISOString()
        };
        
        // Cache for 5 minutes
        if (env.IWISHBAG_CACHE) {
          await env.IWISHBAG_CACHE.put('exchange_rates', JSON.stringify(rates), {
            expirationTtl: 300
          });
        }
        
        return new Response(JSON.stringify(rates), { headers: corsHeaders });
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