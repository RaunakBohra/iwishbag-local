/**
 * Cloudflare Queue Consumer Worker
 * 
 * Processes async tasks like email notifications, order processing,
 * and webhook deliveries with automatic retries and DLQ
 */

export default {
  async queue(batch, env, ctx) {
    // Process messages in batches for efficiency
    const results = await Promise.allSettled(
      batch.messages.map(message => processMessage(message, env))
    );

    // Handle results
    const successful = [];
    const failed = [];

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        successful.push(batch.messages[index]);
      } else {
        console.error(`Message ${batch.messages[index].id} failed:`, result.reason);
        failed.push({
          message: batch.messages[index],
          error: result.reason
        });
      }
    });

    // Acknowledge successful messages
    if (successful.length > 0) {
      batch.ackAll(successful.map(msg => msg.id));
    }

    // Retry failed messages (Queues handles retry logic)
    if (failed.length > 0) {
      // Log to analytics or monitoring
      await logFailures(failed, env);
    }
  }
};

/**
 * Process individual message based on type
 */
async function processMessage(message, env) {
  const { type, data } = message.body;
  
  console.log(`Processing ${type} message:`, message.id);

  switch (type) {
    case 'email:order_confirmation':
      return await sendOrderConfirmationEmail(data, env);
    
    case 'email:quote_ready':
      return await sendQuoteReadyEmail(data, env);
    
    case 'email:payment_received':
      return await sendPaymentReceivedEmail(data, env);
    
    case 'email:shipping_update':
      return await sendShippingUpdateEmail(data, env);
    
    case 'webhook:order_created':
      return await sendOrderWebhook(data, env);
    
    case 'webhook:payment_completed':
      return await sendPaymentWebhook(data, env);
    
    case 'analytics:track_event':
      return await trackAnalyticsEvent(data, env);
    
    case 'cache:invalidate':
      return await invalidateCache(data, env);
    
    case 'sync:update_d1':
      return await syncToD1(data, env);
    
    default:
      throw new Error(`Unknown message type: ${type}`);
  }
}

/**
 * Send order confirmation email
 */
async function sendOrderConfirmationEmail(data, env) {
  const { orderId, customerEmail, customerName, orderDetails } = data;
  
  // Build email content
  const emailHtml = buildOrderConfirmationEmail({
    orderId,
    customerName,
    items: orderDetails.items,
    total: orderDetails.total,
    currency: orderDetails.currency,
    trackingUrl: `https://iwishbag.com/track/${orderId}`
  });

  // Send via email service (e.g., SendGrid, Mailgun, or Cloudflare Email)
  const response = await sendEmail(env, {
    to: customerEmail,
    subject: `Order Confirmation - ${orderId}`,
    html: emailHtml,
    tags: ['order-confirmation', orderId]
  });

  // Store email record
  await env.DB.prepare(`
    INSERT INTO email_logs (order_id, email_type, recipient, sent_at, status)
    VALUES (?, ?, ?, ?, ?)
  `).bind(orderId, 'order_confirmation', customerEmail, new Date().toISOString(), 'sent').run();

  return response;
}

/**
 * Send quote ready email
 */
async function sendQuoteReadyEmail(data, env) {
  const { quoteId, customerEmail, customerName, quoteUrl, expiresAt } = data;
  
  const emailHtml = buildQuoteReadyEmail({
    quoteId,
    customerName,
    quoteUrl,
    expiresAt,
    ctaUrl: `https://iwishbag.com/quote/${quoteId}`
  });

  return await sendEmail(env, {
    to: customerEmail,
    subject: 'Your Quote is Ready!',
    html: emailHtml,
    tags: ['quote-ready', quoteId]
  });
}

/**
 * Send payment received email
 */
async function sendPaymentReceivedEmail(data, env) {
  const { orderId, customerEmail, customerName, amount, currency, paymentMethod } = data;
  
  const emailHtml = buildPaymentReceivedEmail({
    orderId,
    customerName,
    amount,
    currency,
    paymentMethod,
    receiptUrl: `https://iwishbag.com/receipt/${orderId}`
  });

  return await sendEmail(env, {
    to: customerEmail,
    subject: `Payment Received - Order ${orderId}`,
    html: emailHtml,
    tags: ['payment-received', orderId]
  });
}

/**
 * Send shipping update email
 */
async function sendShippingUpdateEmail(data, env) {
  const { orderId, customerEmail, trackingNumber, carrier, estimatedDelivery } = data;
  
  const trackingUrl = getTrackingUrl(carrier, trackingNumber);
  
  const emailHtml = buildShippingUpdateEmail({
    orderId,
    trackingNumber,
    carrier,
    trackingUrl,
    estimatedDelivery
  });

  return await sendEmail(env, {
    to: customerEmail,
    subject: `Your Order ${orderId} Has Shipped!`,
    html: emailHtml,
    tags: ['shipping-update', orderId]
  });
}

/**
 * Send webhook notification
 */
async function sendOrderWebhook(data, env) {
  const { webhookUrl, payload, signature } = data;
  
  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Webhook-Signature': signature,
      'X-Webhook-Timestamp': Date.now().toString()
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(`Webhook failed: ${response.status}`);
  }

  return { success: true, status: response.status };
}

/**
 * Track analytics event
 */
async function trackAnalyticsEvent(data, env) {
  const { event, properties, userId, timestamp } = data;
  
  // Send to analytics service
  // This could be Cloudflare Analytics, Mixpanel, Amplitude, etc.
  
  // Store in D1 for internal analytics
  await env.DB.prepare(`
    INSERT INTO analytics_events (event, properties, user_id, timestamp)
    VALUES (?, ?, ?, ?)
  `).bind(event, JSON.stringify(properties), userId, timestamp).run();

  return { success: true };
}

/**
 * Invalidate cache entries
 */
async function invalidateCache(data, env) {
  const { keys, patterns } = data;
  
  // Delete specific keys
  if (keys && keys.length > 0) {
    await Promise.all(
      keys.map(key => env.IWISHBAG_CACHE.delete(key))
    );
  }
  
  // Delete by pattern (requires listing keys)
  if (patterns && patterns.length > 0) {
    for (const pattern of patterns) {
      const list = await env.IWISHBAG_CACHE.list({ prefix: pattern });
      await Promise.all(
        list.keys.map(key => env.IWISHBAG_CACHE.delete(key.name))
      );
    }
  }

  return { invalidated: true, keys: keys?.length || 0 };
}

/**
 * Sync data to D1
 */
async function syncToD1(data, env) {
  const { table, records, operation } = data;
  
  switch (operation) {
    case 'upsert':
      // Batch upsert records
      const stmt = env.DB.batch(
        records.map(record => {
          const keys = Object.keys(record);
          const values = Object.values(record);
          const placeholders = keys.map(() => '?').join(', ');
          
          return env.DB.prepare(`
            INSERT OR REPLACE INTO ${table} (${keys.join(', ')})
            VALUES (${placeholders})
          `).bind(...values);
        })
      );
      
      await stmt;
      break;
    
    case 'delete':
      // Delete records
      for (const id of records) {
        await env.DB.prepare(`DELETE FROM ${table} WHERE id = ?`).bind(id).run();
      }
      break;
  }

  return { synced: records.length };
}

/**
 * Send email helper
 */
async function sendEmail(env, options) {
  // Using SendGrid as example
  const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.SENDGRID_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      personalizations: [{
        to: [{ email: options.to }]
      }],
      from: {
        email: 'noreply@iwishbag.com',
        name: 'iwishBag'
      },
      subject: options.subject,
      content: [{
        type: 'text/html',
        value: options.html
      }],
      categories: options.tags
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Email send failed: ${error}`);
  }

  return { sent: true, messageId: response.headers.get('X-Message-Id') };
}

/**
 * Email template builders
 */
function buildOrderConfirmationEmail({ orderId, customerName, items, total, currency, trackingUrl }) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #0ea5e9; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9fafb; }
        .items { background: white; border-radius: 8px; padding: 20px; margin: 20px 0; }
        .item { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
        .total { font-size: 20px; font-weight: bold; text-align: right; margin-top: 20px; }
        .button { display: inline-block; background: #0ea5e9; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Order Confirmation</h1>
        </div>
        <div class="content">
          <p>Hi ${customerName},</p>
          <p>Thank you for your order! We've received your payment and will begin processing your items.</p>
          
          <div class="items">
            <h3>Order #${orderId}</h3>
            ${items.map(item => `
              <div class="item">
                <span>${item.name} (x${item.quantity})</span>
                <span>${currency} ${item.total}</span>
              </div>
            `).join('')}
            <div class="total">Total: ${currency} ${total}</div>
          </div>
          
          <center>
            <a href="${trackingUrl}" class="button">Track Your Order</a>
          </center>
          
          <p>We'll send you another email when your order ships.</p>
          <p>Best regards,<br>The iwishBag Team</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

function buildQuoteReadyEmail({ quoteId, customerName, quoteUrl, expiresAt, ctaUrl }) {
  return `
    <!DOCTYPE html>
    <html>
    <body>
      <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2>Your Quote is Ready!</h2>
        <p>Hi ${customerName},</p>
        <p>Your personalized quote #${quoteId} is ready for review.</p>
        <p>This quote is valid until ${new Date(expiresAt).toLocaleDateString()}.</p>
        <a href="${ctaUrl}" style="display: inline-block; background: #0ea5e9; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">View Quote</a>
      </div>
    </body>
    </html>
  `;
}

function buildPaymentReceivedEmail({ orderId, customerName, amount, currency, paymentMethod, receiptUrl }) {
  return `
    <!DOCTYPE html>
    <html>
    <body>
      <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2>Payment Received</h2>
        <p>Hi ${customerName},</p>
        <p>We've successfully received your payment of ${currency} ${amount} via ${paymentMethod}.</p>
        <p>Order: #${orderId}</p>
        <a href="${receiptUrl}" style="display: inline-block; background: #0ea5e9; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">View Receipt</a>
      </div>
    </body>
    </html>
  `;
}

function buildShippingUpdateEmail({ orderId, trackingNumber, carrier, trackingUrl, estimatedDelivery }) {
  return `
    <!DOCTYPE html>
    <html>
    <body>
      <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2>Your Order Has Shipped!</h2>
        <p>Great news! Your order #${orderId} is on its way.</p>
        <p><strong>Tracking Number:</strong> ${trackingNumber}</p>
        <p><strong>Carrier:</strong> ${carrier}</p>
        <p><strong>Estimated Delivery:</strong> ${estimatedDelivery}</p>
        <a href="${trackingUrl}" style="display: inline-block; background: #0ea5e9; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Track Package</a>
      </div>
    </body>
    </html>
  `;
}

/**
 * Get carrier tracking URL
 */
function getTrackingUrl(carrier, trackingNumber) {
  const carriers = {
    'dhl': `https://www.dhl.com/global-en/home/tracking.html?tracking-id=${trackingNumber}`,
    'fedex': `https://www.fedex.com/fedextrack/?tracknumbers=${trackingNumber}`,
    'ups': `https://www.ups.com/track?tracknum=${trackingNumber}`,
    'usps': `https://tools.usps.com/go/TrackConfirmAction?tLabels=${trackingNumber}`
  };
  
  return carriers[carrier.toLowerCase()] || '#';
}

/**
 * Log failures for monitoring
 */
async function logFailures(failed, env) {
  // Log to D1 for analysis
  const stmt = env.DB.batch(
    failed.map(({ message, error }) => 
      env.DB.prepare(`
        INSERT INTO queue_failures (message_id, message_type, error, failed_at)
        VALUES (?, ?, ?, ?)
      `).bind(
        message.id,
        message.body.type,
        error.toString(),
        new Date().toISOString()
      )
    )
  );
  
  await stmt;
}