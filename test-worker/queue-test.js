/**
 * Queue Test Worker for D1
 * Tests queue logging functionality
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
      // Test queue log insertion
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

      // Update queue metrics
      if (path === '/metrics/update' && request.method === 'POST') {
        const data = await request.json();
        
        await env.DB.prepare(
          `INSERT OR REPLACE INTO queue_metrics 
           (id, metric_name, metric_value, time_bucket, bucket_start, bucket_end) 
           VALUES (?, ?, ?, ?, ?, ?)`
        ).bind(
          `metric-${data.metric_name}-${Date.now()}`,
          data.metric_name,
          data.metric_value,
          data.time_bucket || 'hour',
          Math.floor(Date.now() / 1000),
          Math.floor(Date.now() / 1000) + 3600
        ).run();
        
        return new Response(JSON.stringify({
          success: true,
          message: 'Metric updated'
        }), { headers });
      }

      // Get metrics
      if (path === '/metrics') {
        const metrics = await env.DB.prepare(
          `SELECT * FROM queue_metrics ORDER BY bucket_start DESC LIMIT 10`
        ).all();
        
        return new Response(JSON.stringify({
          metrics: metrics.results
        }), { headers });
      }

      // Failed message tracking
      if (path === '/queue/fail' && request.method === 'POST') {
        const data = await request.json();
        
        await env.DB.prepare(
          `INSERT INTO queue_failures 
           (message_id, message_type, message_body, error) 
           VALUES (?, ?, ?, ?)`
        ).bind(
          data.message_id,
          data.message_type,
          JSON.stringify(data.message_body || {}),
          data.error
        ).run();
        
        return new Response(JSON.stringify({
          success: true,
          message: 'Failure logged'
        }), { headers });
      }

      // Get failure summary
      if (path === '/queue/failures') {
        const failures = await env.DB.prepare(
          `SELECT * FROM failed_messages_summary`
        ).all();
        
        return new Response(JSON.stringify({
          failures: failures.results
        }), { headers });
      }

      return new Response(JSON.stringify({ 
        error: 'Not found',
        available_endpoints: [
          'POST /queue/log - Log queue message',
          'GET /queue/activity - Recent queue activity',
          'POST /email/log - Log email',
          'GET /email/stats - Email delivery stats',
          'POST /metrics/update - Update metrics',
          'GET /metrics - Get metrics',
          'POST /queue/fail - Log failed message',
          'GET /queue/failures - Get failure summary'
        ]
      }), { 
        status: 404, 
        headers 
      });

    } catch (error) {
      return new Response(JSON.stringify({ 
        error: 'Queue Test Error',
        message: error.message,
        stack: error.stack
      }), { 
        status: 500, 
        headers 
      });
    }
  }
};