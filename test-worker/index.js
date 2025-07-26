/**
 * IWishBag Edge API Worker
 * Provides fast global access to cached data via D1
 */

import { CloudflareD1Service } from './d1-service.js';
import { CloudflareRateLimitService } from './rate-limit-service.js';

export default {
  async fetch(request, env, ctx) {
    // Initialize services
    const d1Service = new CloudflareD1Service(env.DB);
    const rateLimitService = new CloudflareRateLimitService(env);
    
    const url = new URL(request.url);
    const path = url.pathname;
    
    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const headers = {
      'Content-Type': 'application/json',
      ...corsHeaders,
      'Cache-Control': 'public, max-age=60', // 1 minute edge cache
    };

    try {
      // Country endpoints
      if (path === '/api/countries') {
        const countries = await d1Service.getAllCountrySettings();
        return new Response(JSON.stringify({ countries }), { headers });
      }

      if (path.match(/^\/api\/countries\/[\w]+$/)) {
        const code = path.split('/').pop().toUpperCase();
        const country = await d1Service.getCountrySettings(code);
        
        if (!country) {
          return new Response(JSON.stringify({ error: 'Country not found' }), { 
            status: 404, 
            headers 
          });
        }
        
        return new Response(JSON.stringify({ country }), { headers });
      }

      // Currency/Exchange rate endpoints
      if (path === '/api/currency/rates') {
        const from = url.searchParams.get('from') || 'USD';
        const to = url.searchParams.get('to');
        
        if (to) {
          const rate = await d1Service.getExchangeRate(from, to);
          return new Response(JSON.stringify({ 
            from, 
            to, 
            rate: rate || null,
            timestamp: new Date().toISOString()
          }), { headers });
        }
        
        // Get all rates from country settings
        const countries = await d1Service.getAllCountrySettings();
        const rates = {};
        countries.forEach(country => {
          rates[country.currency] = country.exchange_rate;
        });
        
        return new Response(JSON.stringify({ 
          base: 'USD',
          rates,
          timestamp: new Date().toISOString()
        }), { headers });
      }

      // Popular products
      if (path === '/api/products/popular') {
        const limit = parseInt(url.searchParams.get('limit') || '10');
        const products = await d1Service.getPopularProducts(limit);
        return new Response(JSON.stringify({ products }), { headers });
      }

      // Track product access
      if (path === '/api/products/track' && request.method === 'POST') {
        const { productId, action } = await request.json();
        await d1Service.trackProductAccess(productId, action || 'search');
        return new Response(JSON.stringify({ success: true }), { headers });
      }

      // HSN tax rates
      if (path === '/api/hsn/tax') {
        const hsn_code = url.searchParams.get('hsn');
        const origin = url.searchParams.get('origin');
        const destination = url.searchParams.get('destination');
        
        if (!hsn_code || !origin || !destination) {
          return new Response(JSON.stringify({ 
            error: 'Missing required parameters: hsn, origin, destination' 
          }), { 
            status: 400, 
            headers 
          });
        }
        
        const taxRates = await d1Service.getHSNTaxRates(hsn_code, origin, destination);
        return new Response(JSON.stringify({ 
          hsn_code,
          origin,
          destination,
          taxRates: taxRates || null 
        }), { headers });
      }

      // Sync endpoint (protected - requires API key)
      if (path === '/api/sync' && request.method === 'POST') {
        const apiKey = request.headers.get('X-API-Key');
        
        if (apiKey !== env.SYNC_API_KEY) {
          return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
            status: 401, 
            headers 
          });
        }
        
        const data = await request.json();
        
        if (data.type === 'country') {
          // Handle batch country updates
          if (Array.isArray(data.data)) {
            let successCount = 0;
            for (const country of data.data) {
              const success = await d1Service.updateCountrySettings(country);
              if (success) successCount++;
            }
            return new Response(JSON.stringify({ 
              success: true, 
              updated: successCount,
              total: data.data.length 
            }), { headers });
          } else {
            // Single country update (backward compatibility)
            const success = await d1Service.updateCountrySettings(data.country);
            return new Response(JSON.stringify({ success }), { headers });
          }
        }
        
        if (data.type === 'exchange_rates') {
          const success = await d1Service.updateExchangeRates(data.rates);
          return new Response(JSON.stringify({ success }), { headers });
        }
        
        return new Response(JSON.stringify({ 
          error: 'Invalid sync type' 
        }), { 
          status: 400, 
          headers 
        });
      }

      // Queue logging endpoints (for monitoring)
      if (path === '/api/queue/stats') {
        const stats = await env.DB.prepare(`
          SELECT 
            COUNT(*) as total_messages,
            COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
            COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed,
            AVG(processing_time_ms) as avg_processing_time
          FROM queue_logs
          WHERE created_at > unixepoch() - 3600
        `).first();
        
        return new Response(JSON.stringify({ stats }), { headers });
      }

      // Health check
      if (path === '/api/health') {
        const tableCheck = await env.DB.prepare(
          "SELECT COUNT(*) as count FROM sqlite_master WHERE type='table'"
        ).first();
        
        return new Response(JSON.stringify({
          status: 'healthy',
          timestamp: new Date().toISOString(),
          location: request.cf?.colo || 'unknown',
          d1_tables: tableCheck.count,
          cache_enabled: true
        }), { headers });
      }

      // Populate data endpoint (temporary)
      if (path === '/populate' && request.method === 'POST') {
        try {
          // Insert exchange rates
          const exchangeRates = [
            { pair: 'USD_INR', rate: 83.12 },
            { pair: 'USD_NPR', rate: 132.45 },
            { pair: 'USD_EUR', rate: 0.92 },
            { pair: 'USD_GBP', rate: 0.79 },
            { pair: 'INR_NPR', rate: 1.59 },
            { pair: 'EUR_USD', rate: 1.09 },
            { pair: 'GBP_USD', rate: 1.27 }
          ];

          for (const { pair, rate } of exchangeRates) {
            await env.DB.prepare(
              'INSERT OR REPLACE INTO exchange_rates_cache (currency_pair, rate, updated_at) VALUES (?, ?, ?)'
            ).bind(pair, rate, Math.floor(Date.now() / 1000)).run();
          }

          return new Response(JSON.stringify({
            success: true,
            message: 'Exchange rates populated',
            count: exchangeRates.length
          }), { headers });
        } catch (error) {
          return new Response(JSON.stringify({
            error: 'Population failed',
            message: error.message
          }), { status: 500, headers });
        }
      }

      // Rate limiting endpoints
      if (path === '/api/rate-limits' && request.method === 'GET') {
        const rules = await rateLimitService.getRules();
        return new Response(JSON.stringify({ rules }), { headers });
      }

      if (path === '/api/rate-limits' && request.method === 'POST') {
        const rule = await request.json();
        const createdRule = await rateLimitService.createRule(rule);
        return new Response(JSON.stringify({ rule: createdRule }), { headers });
      }

      if (path.match(/^\/api\/rate-limits\/[\w-]+$/) && request.method === 'PATCH') {
        const ruleId = path.split('/').pop();
        const updates = await request.json();
        const success = await rateLimitService.updateRule(ruleId, updates);
        return new Response(JSON.stringify({ success }), { headers });
      }

      if (path.match(/^\/api\/rate-limits\/[\w-]+$/) && request.method === 'DELETE') {
        const ruleId = path.split('/').pop();
        const success = await rateLimitService.deleteRule(ruleId);
        return new Response(JSON.stringify({ success }), { headers });
      }

      if (path === '/api/rate-limits/stats' && request.method === 'GET') {
        const stats = await rateLimitService.getStats();
        return new Response(JSON.stringify({ stats }), { headers });
      }

      if (path === '/api/rate-limits/recommendations' && request.method === 'GET') {
        const recommendations = await rateLimitService.getRecommendations();
        return new Response(JSON.stringify({ recommendations }), { headers });
      }

      // API documentation
      if (path === '/api' || path === '/api/') {
        return new Response(JSON.stringify({
          name: 'IWishBag Edge API',
          version: '1.0.0',
          endpoints: {
            countries: {
              'GET /api/countries': 'Get all countries',
              'GET /api/countries/:code': 'Get country by code'
            },
            currency: {
              'GET /api/currency/rates': 'Get exchange rates',
              'GET /api/currency/rates?from=USD&to=INR': 'Get specific rate'
            },
            products: {
              'GET /api/products/popular': 'Get popular products',
              'POST /api/products/track': 'Track product access'
            },
            hsn: {
              'GET /api/hsn/tax?hsn=CODE&origin=XX&destination=YY': 'Get HSN tax rates'
            },
            rateLimits: {
              'GET /api/rate-limits': 'Get all rate limit rules',
              'POST /api/rate-limits': 'Create new rate limit rule',
              'PATCH /api/rate-limits/:id': 'Update rate limit rule',
              'DELETE /api/rate-limits/:id': 'Delete rate limit rule',
              'GET /api/rate-limits/stats': 'Get rate limiting statistics',
              'GET /api/rate-limits/recommendations': 'Get AI recommendations'
            },
            monitoring: {
              'GET /api/queue/stats': 'Queue processing stats',
              'GET /api/health': 'Health check'
            }
          }
        }), { 
          headers: {
            ...headers,
            'Content-Type': 'application/json; charset=utf-8'
          }
        });
      }

      return new Response(JSON.stringify({ 
        error: 'Not found',
        path,
        message: 'See /api for available endpoints'
      }), { 
        status: 404, 
        headers 
      });

    } catch (error) {
      console.error('Edge API Error:', error);
      
      // Log to queue_logs for monitoring
      try {
        await env.DB.prepare(`
          INSERT INTO queue_logs 
          (message_id, message_type, status, error_message, created_at)
          VALUES (?, ?, ?, ?, ?)
        `).bind(
          `api-error-${Date.now()}`,
          'api_request',
          'failed',
          error.message,
          Math.floor(Date.now() / 1000)
        ).run();
      } catch (logError) {
        console.error('Failed to log error:', logError);
      }
      
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