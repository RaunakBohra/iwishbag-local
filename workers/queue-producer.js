/**
 * Cloudflare Queue Producer Worker
 * 
 * Handles incoming requests to enqueue messages
 * Provides HTTP API for queue operations
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
      const path = url.pathname;
      
      // Send single message to queue
      if (path === '/queue/send' && request.method === 'POST') {
        return handleSendMessage(request, env, corsHeaders);
      }
      
      // Send batch of messages
      if (path === '/queue/batch' && request.method === 'POST') {
        return handleSendBatch(request, env, corsHeaders);
      }
      
      // Get queue statistics
      if (path === '/queue/stats' && request.method === 'GET') {
        return handleGetStats(request, env, corsHeaders);
      }
      
      // Health check
      if (path === '/health') {
        return new Response(JSON.stringify({
          status: 'healthy',
          timestamp: new Date().toISOString(),
          queue: 'iwishbag-tasks'
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
      console.error('Queue producer error:', error);
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
 * Handle single message send
 */
async function handleSendMessage(request, env, headers) {
  const message = await request.json();
  
  // Validate message structure
  if (!message.type || !message.data) {
    return new Response(JSON.stringify({
      error: 'Invalid message format',
      required: ['type', 'data']
    }), { 
      status: 400,
      headers 
    });
  }
  
  // Add metadata
  const enrichedMessage = {
    ...message,
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    attempts: 0
  };
  
  // Send to queue
  await env.TASK_QUEUE.send(enrichedMessage, {
    delaySeconds: message.delay || 0
  });
  
  // Log for monitoring
  console.log('Message queued:', {
    id: enrichedMessage.id,
    type: message.type,
    priority: message.priority || 'normal'
  });
  
  return new Response(JSON.stringify({
    success: true,
    messageId: enrichedMessage.id,
    type: message.type
  }), { headers });
}

/**
 * Handle batch message send
 */
async function handleSendBatch(request, env, headers) {
  const { messages } = await request.json();
  
  if (!Array.isArray(messages) || messages.length === 0) {
    return new Response(JSON.stringify({
      error: 'Invalid batch format',
      required: 'messages array'
    }), { 
      status: 400,
      headers 
    });
  }
  
  if (messages.length > 100) {
    return new Response(JSON.stringify({
      error: 'Batch too large',
      max: 100,
      received: messages.length
    }), { 
      status: 400,
      headers 
    });
  }
  
  // Enrich and validate messages
  const enrichedMessages = messages.map(message => {
    if (!message.type || !message.data) {
      throw new Error(`Invalid message format: ${JSON.stringify(message)}`);
    }
    
    return {
      ...message,
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      attempts: 0
    };
  });
  
  // Send batch to queue
  await env.TASK_QUEUE.sendBatch(enrichedMessages.map(msg => ({
    body: msg,
    delaySeconds: msg.delay || 0
  })));
  
  // Log batch
  console.log('Batch queued:', {
    count: enrichedMessages.length,
    types: [...new Set(messages.map(m => m.type))]
  });
  
  return new Response(JSON.stringify({
    success: true,
    count: enrichedMessages.length,
    messageIds: enrichedMessages.map(m => m.id)
  }), { headers });
}

/**
 * Handle queue statistics
 */
async function handleGetStats(request, env, headers) {
  try {
    // Note: Cloudflare Queues doesn't provide direct stats API yet
    // This is simulated based on typical queue metrics
    
    // Get recent activity from D1 logs if available
    let stats = {
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0,
      throughput: {
        last_hour: 0,
        last_day: 0
      }
    };
    
    // Try to get stats from D1 if configured
    if (env.DB) {
      try {
        // Get recent queue activity
        const hourAgo = Math.floor(Date.now() / 1000) - 3600;
        const dayAgo = Math.floor(Date.now() / 1000) - 86400;
        
        const hourlyResult = await env.DB.prepare(`
          SELECT COUNT(*) as count 
          FROM queue_logs 
          WHERE created_at > ?
        `).bind(hourAgo).first();
        
        const dailyResult = await env.DB.prepare(`
          SELECT COUNT(*) as count 
          FROM queue_logs 
          WHERE created_at > ?
        `).bind(dayAgo).first();
        
        const failureResult = await env.DB.prepare(`
          SELECT COUNT(*) as count 
          FROM queue_failures 
          WHERE failed_at > ?
        `).bind(dayAgo).first();
        
        stats.throughput.last_hour = hourlyResult?.count || 0;
        stats.throughput.last_day = dailyResult?.count || 0;
        stats.failed = failureResult?.count || 0;
        
      } catch (dbError) {
        console.warn('Could not fetch queue stats from D1:', dbError);
      }
    }
    
    return new Response(JSON.stringify({
      stats,
      queue: 'iwishbag-tasks',
      timestamp: new Date().toISOString()
    }), { headers });
    
  } catch (error) {
    return new Response(JSON.stringify({
      error: 'Failed to get stats',
      message: error.message
    }), { 
      status: 500,
      headers 
    });
  }
}

/**
 * Message validation helper
 */
function validateMessage(message) {
  const validTypes = [
    'email:order_confirmation',
    'email:quote_ready',
    'email:payment_received',
    'email:shipping_update',
    'webhook:order_created',
    'webhook:payment_completed',
    'analytics:track_event',
    'cache:invalidate',
    'sync:update_d1'
  ];
  
  if (!validTypes.includes(message.type)) {
    throw new Error(`Invalid message type: ${message.type}`);
  }
  
  const validPriorities = ['low', 'normal', 'high'];
  if (message.priority && !validPriorities.includes(message.priority)) {
    throw new Error(`Invalid priority: ${message.priority}`);
  }
  
  if (message.retries && (message.retries < 0 || message.retries > 10)) {
    throw new Error(`Invalid retries: ${message.retries} (0-10 allowed)`);
  }
  
  return true;
}