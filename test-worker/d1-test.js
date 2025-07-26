/**
 * D1 Test Worker
 * Tests D1 database connectivity
 */

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    
    const headers = {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    };

    try {
      // Test D1 connection
      if (path === '/d1/test') {
        const result = await env.DB.prepare('SELECT 1 as test').first();
        return new Response(JSON.stringify({
          d1_connected: true,
          result
        }), { headers });
      }

      // List tables
      if (path === '/d1/tables') {
        const tables = await env.DB.prepare(
          "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE '_cf_%'"
        ).all();
        return new Response(JSON.stringify({
          tables: tables.results
        }), { headers });
      }

      // Insert test country
      if (path === '/d1/country/add' && request.method === 'POST') {
        const data = await request.json();
        await env.DB.prepare(
          `INSERT INTO country_settings_cache 
           (code, name, currency, symbol, exchange_rate) 
           VALUES (?, ?, ?, ?, ?)`
        ).bind(
          data.code || 'US',
          data.name || 'United States',
          data.currency || 'USD',
          data.symbol || '$',
          data.exchange_rate || 1
        ).run();
        
        return new Response(JSON.stringify({
          success: true,
          message: 'Country added'
        }), { headers });
      }

      // Get countries
      if (path === '/d1/countries') {
        const countries = await env.DB.prepare(
          'SELECT * FROM country_settings_cache'
        ).all();
        return new Response(JSON.stringify({
          countries: countries.results
        }), { headers });
      }

      // Queue log endpoints
      if (path === '/queue/log' && request.method === 'POST') {
        const data = await request.json();
        
        const result = await env.DB.prepare(
          `INSERT INTO queue_logs 
           (message_id, message_type, status, processing_time_ms, attempt_number) 
           VALUES (?, ?, ?, ?, ?)`
        ).bind(
          data.message_id || `msg-${Date.now()}`,
          data.message_type || 'email_notification',
          data.status || 'queued',
          data.processing_time_ms || null,
          data.attempt_number || 1
        ).run();
        
        return new Response(JSON.stringify({
          success: true,
          log_id: result.meta.last_row_id
        }), { headers });
      }

      // Get recent queue activity
      if (path === '/queue/activity') {
        const activity = await env.DB.prepare(
          `SELECT * FROM recent_queue_activity`
        ).all();
        
        return new Response(JSON.stringify({
          activity: activity.results
        }), { headers });
      }

      // Log email
      if (path === '/email/log' && request.method === 'POST') {
        const data = await request.json();
        
        await env.DB.prepare(
          `INSERT INTO email_logs 
           (message_id, email_type, recipient, subject, status) 
           VALUES (?, ?, ?, ?, ?)`
        ).bind(
          data.message_id || `email-${Date.now()}`,
          data.email_type || 'order_confirmation',
          data.recipient,
          data.subject,
          data.status || 'queued'
        ).run();
        
        return new Response(JSON.stringify({
          success: true,
          message: 'Email logged'
        }), { headers });
      }

      // Get email delivery stats
      if (path === '/email/stats') {
        const stats = await env.DB.prepare(
          `SELECT * FROM email_delivery_stats`
        ).all();
        
        return new Response(JSON.stringify({
          stats: stats.results
        }), { headers });
      }

      return new Response(JSON.stringify({ 
        error: 'Not found',
        available_endpoints: [
          '/d1/test',
          '/d1/tables',
          '/d1/countries',
          '/d1/country/add (POST)',
          '/queue/log (POST)',
          '/queue/activity',
          '/email/log (POST)',
          '/email/stats'
        ]
      }), { 
        status: 404, 
        headers 
      });

    } catch (error) {
      return new Response(JSON.stringify({ 
        error: 'D1 Error',
        message: error.message,
        d1_available: !!env.DB
      }), { 
        status: 500, 
        headers 
      });
    }
  }
};