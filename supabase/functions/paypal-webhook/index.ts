import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { createWebhookHeaders } from '../_shared/cors.ts';

// PayPal webhook-specific headers (if needed for debugging)
const paypalWebhookHeaders = [
  'paypal-transmission-id', 
  'paypal-cert-id', 
  'paypal-auth-algo', 
  'paypal-transmission-time', 
  'paypal-transmission-sig'
];
// Verify PayPal webhook signature
async function verifyWebhookSignature(webhookId, eventBody, headers, clientId, clientSecret, baseUrl) {
  try {
    // Get required headers
    const transmissionId = headers.get('paypal-transmission-id');
    const transmissionTime = headers.get('paypal-transmission-time');
    const transmissionSig = headers.get('paypal-transmission-sig');
    const certUrl = headers.get('paypal-cert-url');
    const authAlgo = headers.get('paypal-auth-algo');
    if (!transmissionId || !transmissionTime || !transmissionSig || !certUrl || !authAlgo) {
      console.error('Missing PayPal webhook headers');
      return false;
    }
    // Get access token
    const authString = btoa(`${clientId}:${clientSecret}`);
    const tokenResponse = await fetch(`${baseUrl}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${authString}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: 'grant_type=client_credentials'
    });
    if (!tokenResponse.ok) {
      console.error('Failed to get PayPal access token');
      return false;
    }
    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;
    // Verify webhook signature
    const verifyRequest = {
      auth_algo: authAlgo,
      cert_url: certUrl,
      transmission_id: transmissionId,
      transmission_sig: transmissionSig,
      transmission_time: transmissionTime,
      webhook_id: webhookId,
      webhook_event: JSON.parse(eventBody)
    };
    const verifyResponse = await fetch(`${baseUrl}/v1/notifications/verify-webhook-signature`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(verifyRequest)
    });
    if (!verifyResponse.ok) {
      console.error('Failed to verify webhook signature');
      return false;
    }
    const verifyData = await verifyResponse.json();
    return verifyData.verification_status === 'SUCCESS';
  } catch (error) {
    console.error('Webhook verification error:', error);
    return false;
  }
}
serve(async (req)=>{
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: createWebhookHeaders()
    });
  }
  // Allow GET requests without authentication for webhook info page
  if (req.method === 'GET') {
    const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>PayPal Webhook Handler</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
              height: 100vh;
              margin: 0;
              background-color: #f5f5f5;
            }
            .container {
              text-align: center;
              padding: 40px;
              background: white;
              border-radius: 8px;
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
              max-width: 500px;
            }
            h1 { color: #333; }
            p { color: #666; margin: 20px 0; }
            .info { 
              background: #e3f2fd; 
              padding: 15px; 
              border-radius: 5px;
              margin-top: 20px;
            }
            .webhook-info {
              background: #fff3cd;
              padding: 15px;
              border-radius: 5px;
              margin-top: 20px;
              text-align: left;
            }
            .paypal-logo {
              width: 120px;
              margin-bottom: 20px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <svg class="paypal-logo" viewBox="0 0 124 33">
              <path fill="#003087" d="M 23.541 0.552 C 23.095 0.186 22.239 0 21.091 0 L 8.542 0 C 7.627 0 6.857 0.644 6.703 1.551 L 2.019 31.448 C 1.907 32.09 2.406 32.665 3.057 32.665 L 9.721 32.665 L 11.423 21.711 L 11.368 22.053 C 11.522 21.146 12.286 20.502 13.201 20.502 L 16.399 20.502 C 22.843 20.502 27.846 17.897 29.284 10.404 C 29.332 10.163 29.375 9.928 29.413 9.698 C 29.019 9.485 29.019 9.485 29.413 9.698 C 30.231 5.203 29.406 2.041 26.846 0.917 C 25.959 0.593 24.848 0.448 23.541 0.552 Z"/>
              <path fill="#009cde" d="M 50.924 16.779 C 50.453 19.571 48.249 19.571 46.112 19.571 L 44.914 19.571 L 45.755 14.033 C 45.807 13.694 46.098 13.445 46.442 13.445 L 46.985 13.445 C 48.403 13.445 49.745 13.445 50.447 14.24 C 50.872 14.714 51.006 15.405 50.924 16.779 Z M 50.002 8.906 L 42.502 8.906 C 41.96 8.906 41.499 9.283 41.397 9.818 L 38.486 28.251 C 38.414 28.618 38.686 28.953 39.056 28.953 L 42.615 28.953 C 43.157 28.953 43.618 28.576 43.72 28.041 L 44.515 23.119 C 44.617 22.584 45.078 22.207 45.62 22.207 L 47.745 22.207 C 52.451 22.207 55.148 19.947 55.806 15.464 C 56.101 13.523 55.821 12.009 54.982 11.036 C 54.063 9.971 52.396 9.458 50.002 8.906 Z"/>
            </svg>
            <h1>PayPal Webhook Handler</h1>
            <p>This is a server-to-server webhook endpoint for PayPal payment notifications.</p>
            <div class="info">
              <strong>Note:</strong> This endpoint only accepts POST requests from PayPal servers.
            </div>
            <div class="webhook-info">
              <strong>Configuration in PayPal Dashboard:</strong>
              <ul>
                <li>URL: ${req.url}</li>
                <li>Method: POST</li>
                <li>Events: 
                  <ul>
                    <li>CHECKOUT.ORDER.APPROVED</li>
                    <li>PAYMENT.CAPTURE.COMPLETED</li>
                    <li>PAYMENT.CAPTURE.DENIED</li>
                    <li>PAYMENT.CAPTURE.REFUNDED</li>
                  </ul>
                </li>
              </ul>
            </div>
          </div>
        </body>
        </html>
      `;
    return new Response(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html'
      }
    });
  }
  try {
    console.log('PayPal webhook received:', req.method, req.url);
    // Only process POST requests
    if (req.method !== 'POST') {
      return new Response('Method not allowed', {
        status: 405
      });
    }
    // Get raw body for signature verification
    const rawBody = await req.text();
    const event = JSON.parse(rawBody);
    console.log('PayPal webhook event:', {
      id: event.id,
      type: event.event_type,
      resource_type: event.resource_type,
      resource_id: event.resource?.id
    });
    // Initialize Supabase client
    const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
    // Store webhook event in database for audit trail
    const webhookHeaders = {
      'paypal-transmission-id': req.headers.get('paypal-transmission-id') || '',
      'paypal-cert-id': req.headers.get('paypal-cert-id') || '',
      'paypal-auth-algo': req.headers.get('paypal-auth-algo') || '',
      'paypal-transmission-time': req.headers.get('paypal-transmission-time') || '',
      'paypal-transmission-sig': req.headers.get('paypal-transmission-sig') || ''
    };
    // Determine event type mapping for our enum
    const SUPPORTED_EVENT_TYPES = [
      'INVOICING.INVOICE.PAID',
      'INVOICING.INVOICE.CANCELLED',
      'INVOICING.INVOICE.REFUNDED',
      'INVOICING.INVOICE.UPDATED',
      'INVOICING.INVOICE.SENT',
      'PAYMENT.CAPTURE.COMPLETED',
      'PAYMENT.CAPTURE.DENIED',
      'PAYMENT.CAPTURE.REFUNDED'
    ];
    const eventType = SUPPORTED_EVENT_TYPES.includes(event.event_type) ? event.event_type : 'OTHER';
    const { error: webhookLogError } = await supabaseAdmin.from('paypal_webhook_events').insert({
      webhook_id: req.headers.get('paypal-webhook-id') || 'unknown',
      event_id: event.id,
      event_type: eventType,
      event_version: event.event_version || '1.0',
      create_time: event.create_time,
      resource_type: event.resource_type,
      resource_id: event.resource?.id,
      processing_status: 'pending',
      raw_payload: event,
      headers: webhookHeaders,
      signature_verified: false
    });
    if (webhookLogError) {
      console.error('Error logging webhook event:', webhookLogError);
    }
    // Get PayPal configuration
    const { data: paypalGateway, error: paypalGatewayError } = await supabaseAdmin.from('payment_gateways').select('config, test_mode').eq('code', 'paypal').single();
    if (paypalGatewayError || !paypalGateway) {
      console.error('PayPal configuration not found');
      return new Response('Configuration error', {
        status: 500
      });
    }
    const config = paypalGateway.config || {};
    const testMode = paypalGateway.test_mode;
    const baseUrl = testMode ? 'https://api-m.sandbox.paypal.com' : 'https://api-m.paypal.com';
    console.log(`PayPal webhook processing in ${testMode ? 'SANDBOX' : 'LIVE'} mode`);
    // Verify webhook signature if webhook ID is configured
    let signatureVerified = false;
    if (config.webhook_id) {
      signatureVerified = await verifyWebhookSignature(config.webhook_id, rawBody, req.headers, config.client_id, config.client_secret, baseUrl);
      if (!signatureVerified) {
        console.error('PayPal webhook signature verification failed');
        // Update webhook event status
        await supabaseAdmin.from('paypal_webhook_events').update({
          verification_status: 'failed',
          error_message: 'Signature verification failed'
        }).eq('event_id', event.id);
        return new Response('Unauthorized', {
          status: 401
        });
      }
      console.log('PayPal webhook signature verified successfully');
    } else {
      console.warn('PayPal webhook ID not configured - skipping signature verification');
    }
    // Update webhook event verification status
    await supabaseAdmin.from('paypal_webhook_events').update({
      signature_verified: signatureVerified,
      processing_status: 'processing',
      last_processing_attempt: new Date().toISOString(),
      processing_attempts: 1
    }).eq('event_id', event.id);
    // Process different event types
    let processingResult = {
      success: false,
      message: 'Event type not supported'
    };
    try {
      switch(event.event_type){
        // Invoice-specific events
        case 'INVOICING.INVOICE.PAID':
          processingResult = await processInvoicePaidEvent(supabaseAdmin, event);
          break;
        case 'INVOICING.INVOICE.CANCELLED':
          processingResult = await processInvoiceCancelledEvent(supabaseAdmin, event);
          break;
        case 'INVOICING.INVOICE.REFUNDED':
          processingResult = await processInvoiceRefundedEvent(supabaseAdmin, event);
          break;
        case 'INVOICING.INVOICE.SENT':
          processingResult = await processInvoiceSentEvent(supabaseAdmin, event);
          break;
        // Subscription-specific events
        case 'BILLING.SUBSCRIPTION.CREATED':
          processingResult = await processSubscriptionCreatedEvent(supabaseAdmin, event);
          break;
        case 'BILLING.SUBSCRIPTION.ACTIVATED':
          processingResult = await processSubscriptionActivatedEvent(supabaseAdmin, event);
          break;
        case 'BILLING.SUBSCRIPTION.UPDATED':
          processingResult = await processSubscriptionUpdatedEvent(supabaseAdmin, event);
          break;
        case 'BILLING.SUBSCRIPTION.EXPIRED':
          processingResult = await processSubscriptionExpiredEvent(supabaseAdmin, event);
          break;
        case 'BILLING.SUBSCRIPTION.CANCELLED':
          processingResult = await processSubscriptionCancelledEvent(supabaseAdmin, event);
          break;
        case 'BILLING.SUBSCRIPTION.SUSPENDED':
          processingResult = await processSubscriptionSuspendedEvent(supabaseAdmin, event);
          break;
        case 'BILLING.SUBSCRIPTION.PAYMENT.FAILED':
          processingResult = await processSubscriptionPaymentFailedEvent(supabaseAdmin, event);
          break;
        case 'PAYMENT.SALE.COMPLETED':
          processingResult = await processSubscriptionPaymentCompletedEvent(supabaseAdmin, event);
          break;
        // Payment capture events (existing)
        case 'CHECKOUT.ORDER.APPROVED':
          console.log('Order approved, waiting for capture');
          // Order is approved but not yet captured
          // Update payment status to approved
          if (event.resource?.id) {
            // First try to update by column, then by JSONB
            const { data: updated } = await supabaseAdmin.from('payment_transactions').update({
              status: 'approved',
              paypal_order_id: event.resource.id,
              gateway_response: event.resource,
              updated_at: new Date().toISOString()
            }).eq('paypal_order_id', event.resource.id).select();
            // If no rows updated, try JSONB search
            if (!updated || updated.length === 0) {
              await supabaseAdmin.from('payment_transactions').update({
                status: 'approved',
                paypal_order_id: event.resource.id,
                gateway_response: event.resource,
                updated_at: new Date().toISOString()
              }).eq('gateway_response->paypal_order_id', event.resource.id);
            }
          }
          break;
        case 'PAYMENT.CAPTURE.COMPLETED':
          console.log('Payment capture completed');
          // Payment successfully captured
          if (event.resource?.id && event.resource?.purchase_units?.[0]) {
            const purchaseUnit = event.resource.purchase_units[0];
            const customData = purchaseUnit.custom_id ? JSON.parse(purchaseUnit.custom_id) : {};
            const quoteIds = customData.quoteIds || [];
            const captureId = purchaseUnit.payments?.captures?.[0]?.id;
            // Update payment transaction
            // First try by column, then by JSONB
            const { data: updated, error: txnUpdateError } = await supabaseAdmin.from('payment_transactions').update({
              status: 'completed',
              paypal_order_id: event.resource.id,
              paypal_capture_id: captureId,
              gateway_response: {
                ...event.resource,
                capture_id: captureId
              },
              updated_at: new Date().toISOString()
            }).eq('paypal_order_id', event.resource.id).select();
            // If no rows updated, try JSONB search
            if (!updated || updated.length === 0) {
              const { error: jsonbUpdateError } = await supabaseAdmin.from('payment_transactions').update({
                status: 'completed',
                paypal_order_id: event.resource.id,
                paypal_capture_id: captureId,
                gateway_response: {
                  ...event.resource,
                  capture_id: captureId
                },
                updated_at: new Date().toISOString()
              }).eq('gateway_response->paypal_order_id', event.resource.id);
              if (jsonbUpdateError) {
                console.error('Error updating payment transaction (JSONB search):', jsonbUpdateError);
              }
            }
            if (txnUpdateError) {
              console.error('Error updating payment transaction:', txnUpdateError);
            }
            // Update quote status to paid
            if (quoteIds.length > 0) {
              console.log('Updating quote status for IDs:', quoteIds);
              const { error: quoteError } = await supabaseAdmin.from('quotes').update({
                status: 'paid',
                payment_status: 'paid',
                paid_at: new Date().toISOString()
              }).in('id', quoteIds);
              if (quoteError) {
                console.error('Error updating quote status:', quoteError);
              } else {
                console.log('Quote status updated successfully');
              }
            }
            // Extract payer information if available
            if (event.resource.payer) {
              const payerInfo = {
                paypal_payer_id: event.resource.payer.payer_id,
                paypal_payer_email: event.resource.payer.email_address,
                customer_name: event.resource.payer.name ? `${event.resource.payer.name.given_name || ''} ${event.resource.payer.name.surname || ''}`.trim() : null
              };
              // Update payment record with payer info
              // First try by column, then by JSONB
              const { data: payerUpdated } = await supabaseAdmin.from('payment_transactions').update({
                paypal_payer_id: event.resource.payer.payer_id,
                paypal_payer_email: event.resource.payer.email_address,
                gateway_response: {
                  ...event.resource,
                  payer_info: payerInfo
                }
              }).eq('paypal_order_id', event.resource.id).select();
              // If no rows updated, try JSONB search
              if (!payerUpdated || payerUpdated.length === 0) {
                await supabaseAdmin.from('payment_transactions').update({
                  paypal_payer_id: event.resource.payer.payer_id,
                  paypal_payer_email: event.resource.payer.email_address,
                  gateway_response: {
                    ...event.resource,
                    payer_info: payerInfo
                  }
                }).eq('gateway_response->paypal_order_id', event.resource.id);
              }
            }
          }
          break;
        case 'PAYMENT.CAPTURE.DENIED':
        case 'PAYMENT.CAPTURE.PENDING':
          console.log(`Payment capture ${event.event_type}`);
          // Payment capture denied or pending
          if (event.resource?.id) {
            const status = event.event_type === 'PAYMENT.CAPTURE.DENIED' ? 'failed' : 'pending';
            await supabaseAdmin.from('payment_transactions').update({
              status: status,
              gateway_response: event.resource,
              error_message: event.summary || `Payment ${status}`,
              updated_at: new Date().toISOString()
            }).eq('gateway_response->paypal_order_id', event.resource.id);
            // Update quotes if payment failed
            if (status === 'failed' && event.resource.purchase_units?.[0]) {
              const customData = JSON.parse(event.resource.purchase_units[0].custom_id || '{}');
              const quoteIds = customData.quoteIds || [];
              if (quoteIds.length > 0) {
                await supabaseAdmin.from('quotes').update({
                  payment_status: 'failed',
                  payment_error: event.summary || 'Payment capture denied'
                }).in('id', quoteIds);
              }
            }
          }
          break;
        case 'PAYMENT.CAPTURE.REFUNDED':
          console.log('Payment refunded');
          // Handle refund
          if (event.resource?.id) {
            await supabaseAdmin.from('payment_transactions').update({
              status: 'refunded',
              gateway_response: event.resource,
              updated_at: new Date().toISOString()
            }).eq('gateway_response->capture_id', event.resource.id);
          }
          break;
        default:
          console.log('Unhandled webhook event type:', event.event_type);
          processingResult = {
            success: true,
            message: 'Event type ignored'
          };
      }
      // Update processing status based on result
      if (processingResult.success) {
        await supabaseAdmin.from('paypal_webhook_events').update({
          processing_status: 'completed',
          processed_at: new Date().toISOString()
        }).eq('event_id', event.id);
      } else {
        await supabaseAdmin.from('paypal_webhook_events').update({
          processing_status: 'failed',
          processing_error: processingResult.message || 'Unknown processing error'
        }).eq('event_id', event.id);
      }
    } catch (processingError) {
      console.error('Error processing webhook:', processingError);
      // Update to failed status
      await supabaseAdmin.from('paypal_webhook_events').update({
        processing_status: 'failed',
        processing_error: processingError.message || 'Processing exception'
      }).eq('event_id', event.id);
      processingResult = {
        success: false,
        message: processingError.message || 'Processing failed'
      };
    }
    console.log('Webhook processing result:', processingResult);
    // Return 200 OK to PayPal
    return new Response(JSON.stringify({
      success: true,
      event_id: event.id,
      processing_result: processingResult
    }), {
      status: 200,
      headers: {
        ...createWebhookHeaders(),
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('PayPal webhook error:', error);
    return new Response('Internal server error', {
      status: 500
    });
  }
});
// Invoice processing functions
// Process invoice paid event
async function processInvoicePaidEvent(supabaseAdmin, webhookEvent) {
  console.log('Processing invoice paid event for invoice:', webhookEvent.resource?.id);
  const paypalInvoiceId = webhookEvent.resource?.id;
  if (!paypalInvoiceId) {
    return {
      success: false,
      message: 'No invoice ID in webhook payload'
    };
  }
  const paymentAmount = webhookEvent.resource?.amount ? parseFloat(webhookEvent.resource.amount.value) : null;
  const paymentCurrency = webhookEvent.resource?.amount?.currency_code || 'USD';
  // Call the database function to process payment
  const { data, error } = await supabaseAdmin.rpc('process_invoice_payment_webhook', {
    p_event_id: webhookEvent.id,
    p_paypal_invoice_id: paypalInvoiceId,
    p_payment_amount: paymentAmount,
    p_payment_currency: paymentCurrency
  });
  if (error) {
    console.error('Error processing invoice payment:', error);
    return {
      success: false,
      message: error.message
    };
  }
  const result = data[0];
  return {
    success: result.success,
    message: result.message,
    invoice_updated: result.invoice_updated,
    quote_updated: result.quote_updated
  };
}
// Process invoice cancelled event
async function processInvoiceCancelledEvent(supabaseAdmin, webhookEvent) {
  console.log('Processing invoice cancelled event for invoice:', webhookEvent.resource?.id);
  const paypalInvoiceId = webhookEvent.resource?.id;
  if (!paypalInvoiceId) {
    return {
      success: false,
      message: 'No invoice ID in webhook payload'
    };
  }
  // Call the database function to process cancellation
  const { data, error } = await supabaseAdmin.rpc('process_invoice_cancellation_webhook', {
    p_event_id: webhookEvent.id,
    p_paypal_invoice_id: paypalInvoiceId
  });
  if (error) {
    console.error('Error processing invoice cancellation:', error);
    return {
      success: false,
      message: error.message
    };
  }
  const result = data[0];
  return {
    success: result.success,
    message: result.message,
    invoice_updated: result.invoice_updated
  };
}
// Process invoice refunded event
async function processInvoiceRefundedEvent(supabaseAdmin, webhookEvent) {
  console.log('Processing invoice refunded event for invoice:', webhookEvent.resource?.id);
  const paypalInvoiceId = webhookEvent.resource?.id;
  if (!paypalInvoiceId) {
    return {
      success: false,
      message: 'No invoice ID in webhook payload'
    };
  }
  // Find the invoice and update status to refunded
  const { data: invoice, error: findError } = await supabaseAdmin.from('paypal_invoices').select('id, status').eq('paypal_invoice_id', paypalInvoiceId).single();
  if (findError || !invoice) {
    return {
      success: false,
      message: 'Invoice not found'
    };
  }
  // Update invoice status to refunded
  const { error: updateError } = await supabaseAdmin.from('paypal_invoices').update({
    status: 'refunded',
    webhook_last_update: new Date().toISOString()
  }).eq('id', invoice.id);
  if (updateError) {
    return {
      success: false,
      message: updateError.message
    };
  }
  return {
    success: true,
    message: 'Invoice marked as refunded'
  };
}
// Process invoice sent event
async function processInvoiceSentEvent(supabaseAdmin, webhookEvent) {
  console.log('Processing invoice sent event for invoice:', webhookEvent.resource?.id);
  const paypalInvoiceId = webhookEvent.resource?.id;
  if (!paypalInvoiceId) {
    return {
      success: false,
      message: 'No invoice ID in webhook payload'
    };
  }
  // Find the invoice and update status to sent if currently draft
  const { data: invoice, error: findError } = await supabaseAdmin.from('paypal_invoices').select('id, status').eq('paypal_invoice_id', paypalInvoiceId).single();
  if (findError || !invoice) {
    return {
      success: false,
      message: 'Invoice not found'
    };
  }
  // Only update if currently in draft status
  if (invoice.status === 'draft') {
    const { error: updateError } = await supabaseAdmin.from('paypal_invoices').update({
      status: 'sent',
      sent_at: new Date().toISOString(),
      webhook_last_update: new Date().toISOString()
    }).eq('id', invoice.id);
    if (updateError) {
      return {
        success: false,
        message: updateError.message
      };
    }
    return {
      success: true,
      message: 'Invoice status updated to sent'
    };
  }
  return {
    success: true,
    message: 'Invoice already in final status'
  };
}
// Subscription processing functions
// Process subscription created event
async function processSubscriptionCreatedEvent(supabaseAdmin, webhookEvent) {
  console.log('Processing subscription created event for subscription:', webhookEvent.resource?.id);
  const paypalSubscriptionId = webhookEvent.resource?.id;
  if (!paypalSubscriptionId) {
    return {
      success: false,
      message: 'No subscription ID in webhook payload'
    };
  }
  // Find the subscription and update webhook tracking
  const { data: subscription1, error: findError } = await supabaseAdmin.from('paypal_subscriptions').select('id, status, webhook_events_count').eq('paypal_subscription_id', paypalSubscriptionId).single();
  if (findError || !subscription1) {
    return {
      success: false,
      message: 'Subscription not found'
    };
  }
  // Update webhook tracking
  const { error: updateError } = await supabaseAdmin.from('paypal_subscriptions').update({
    webhook_last_update: new Date().toISOString(),
    webhook_events_count: (subscription1.webhook_events_count || 0) + 1
  }).eq('id', subscription1.id);
  if (updateError) {
    return {
      success: false,
      message: updateError.message
    };
  }
  return {
    success: true,
    message: 'Subscription created event processed'
  };
}
// Process subscription activated event
async function processSubscriptionActivatedEvent(supabaseAdmin, webhookEvent) {
  console.log('Processing subscription activated event for subscription:', webhookEvent.resource?.id);
  const paypalSubscriptionId = webhookEvent.resource?.id;
  if (!paypalSubscriptionId) {
    return {
      success: false,
      message: 'No subscription ID in webhook payload'
    };
  }
  // Find the subscription and update status
  const { data: subscription1, error: findError } = await supabaseAdmin.from('paypal_subscriptions').select('id, status, webhook_events_count').eq('paypal_subscription_id', paypalSubscriptionId).single();
  if (findError || !subscription1) {
    return {
      success: false,
      message: 'Subscription not found'
    };
  }
  // Extract billing info from webhook
  const billingInfo = webhookEvent.resource?.billing_info;
  const nextBillingTime = billingInfo?.next_billing_time;
  // Update subscription to active
  const { error: updateError } = await supabaseAdmin.from('paypal_subscriptions').update({
    status: 'active',
    start_date: new Date().toISOString(),
    next_billing_date: nextBillingTime || null,
    webhook_last_update: new Date().toISOString(),
    webhook_events_count: (subscription1.webhook_events_count || 0) + 1
  }).eq('id', subscription1.id);
  if (updateError) {
    return {
      success: false,
      message: updateError.message
    };
  }
  return {
    success: true,
    message: 'Subscription activated successfully'
  };
}
// Process subscription updated event
async function processSubscriptionUpdatedEvent(supabaseAdmin, webhookEvent) {
  console.log('Processing subscription updated event for subscription:', webhookEvent.resource?.id);
  const paypalSubscriptionId = webhookEvent.resource?.id;
  if (!paypalSubscriptionId) {
    return {
      success: false,
      message: 'No subscription ID in webhook payload'
    };
  }
  // Find the subscription and update tracking
  const { data: subscription1, error: findError } = await supabaseAdmin.from('paypal_subscriptions').select('id, webhook_events_count').eq('paypal_subscription_id', paypalSubscriptionId).single();
  if (findError || !subscription1) {
    return {
      success: false,
      message: 'Subscription not found'
    };
  }
  // Update webhook tracking and response data
  const { error: updateError } = await supabaseAdmin.from('paypal_subscriptions').update({
    paypal_response: webhookEvent.resource,
    webhook_last_update: new Date().toISOString(),
    webhook_events_count: (subscription1.webhook_events_count || 0) + 1
  }).eq('id', subscription1.id);
  if (updateError) {
    return {
      success: false,
      message: updateError.message
    };
  }
  return {
    success: true,
    message: 'Subscription updated event processed'
  };
}
// Process subscription expired event
async function processSubscriptionExpiredEvent(supabaseAdmin, webhookEvent) {
  console.log('Processing subscription expired event for subscription:', webhookEvent.resource?.id);
  const paypalSubscriptionId = webhookEvent.resource?.id;
  if (!paypalSubscriptionId) {
    return {
      success: false,
      message: 'No subscription ID in webhook payload'
    };
  }
  // Find the subscription and update status
  const { error: updateError } = await supabaseAdmin.from('paypal_subscriptions').update({
    status: 'expired',
    end_date: new Date().toISOString(),
    webhook_last_update: new Date().toISOString(),
    webhook_events_count: (subscription.webhook_events_count || 0) + 1
  }).eq('paypal_subscription_id', paypalSubscriptionId);
  if (updateError) {
    return {
      success: false,
      message: updateError.message
    };
  }
  return {
    success: true,
    message: 'Subscription marked as expired'
  };
}
// Process subscription cancelled event
async function processSubscriptionCancelledEvent(supabaseAdmin, webhookEvent) {
  console.log('Processing subscription cancelled event for subscription:', webhookEvent.resource?.id);
  const paypalSubscriptionId = webhookEvent.resource?.id;
  if (!paypalSubscriptionId) {
    return {
      success: false,
      message: 'No subscription ID in webhook payload'
    };
  }
  // Extract cancellation reason if available
  const cancellationReason = webhookEvent.resource?.status_change_note || 'Cancelled via PayPal';
  // Find the subscription and update status
  const { error: updateError } = await supabaseAdmin.from('paypal_subscriptions').update({
    status: 'cancelled',
    end_date: new Date().toISOString(),
    cancellation_reason: cancellationReason,
    webhook_last_update: new Date().toISOString(),
    webhook_events_count: (subscription.webhook_events_count || 0) + 1
  }).eq('paypal_subscription_id', paypalSubscriptionId);
  if (updateError) {
    return {
      success: false,
      message: updateError.message
    };
  }
  return {
    success: true,
    message: 'Subscription cancelled successfully'
  };
}
// Process subscription suspended event
async function processSubscriptionSuspendedEvent(supabaseAdmin, webhookEvent) {
  console.log('Processing subscription suspended event for subscription:', webhookEvent.resource?.id);
  const paypalSubscriptionId = webhookEvent.resource?.id;
  if (!paypalSubscriptionId) {
    return {
      success: false,
      message: 'No subscription ID in webhook payload'
    };
  }
  // Find the subscription and update status
  const { error: updateError } = await supabaseAdmin.from('paypal_subscriptions').update({
    status: 'suspended',
    webhook_last_update: new Date().toISOString(),
    webhook_events_count: (subscription.webhook_events_count || 0) + 1
  }).eq('paypal_subscription_id', paypalSubscriptionId);
  if (updateError) {
    return {
      success: false,
      message: updateError.message
    };
  }
  return {
    success: true,
    message: 'Subscription suspended successfully'
  };
}
// Process subscription payment failed event
async function processSubscriptionPaymentFailedEvent(supabaseAdmin, webhookEvent) {
  console.log('Processing subscription payment failed event for subscription:', webhookEvent.resource?.id);
  const paypalSubscriptionId = webhookEvent.resource?.id;
  if (!paypalSubscriptionId) {
    return {
      success: false,
      message: 'No subscription ID in webhook payload'
    };
  }
  // Find the subscription and increment failed payments
  const { data: subscription1, error: findError } = await supabaseAdmin.from('paypal_subscriptions').select('id, failed_payments, webhook_events_count').eq('paypal_subscription_id', paypalSubscriptionId).single();
  if (findError || !subscription1) {
    return {
      success: false,
      message: 'Subscription not found'
    };
  }
  // Update failed payments count
  const { error: updateError } = await supabaseAdmin.from('paypal_subscriptions').update({
    failed_payments: (subscription1.failed_payments || 0) + 1,
    webhook_last_update: new Date().toISOString(),
    webhook_events_count: (subscription1.webhook_events_count || 0) + 1
  }).eq('id', subscription1.id);
  if (updateError) {
    return {
      success: false,
      message: updateError.message
    };
  }
  return {
    success: true,
    message: 'Subscription payment failure recorded'
  };
}
// Process subscription payment completed event
async function processSubscriptionPaymentCompletedEvent(supabaseAdmin, webhookEvent) {
  console.log('Processing subscription payment completed event for payment:', webhookEvent.resource?.id);
  const paymentId = webhookEvent.resource?.id;
  const amount = webhookEvent.resource?.amount;
  const billingAgreementId = webhookEvent.resource?.billing_agreement_id;
  if (!paymentId || !billingAgreementId) {
    return {
      success: false,
      message: 'Missing payment or billing agreement ID'
    };
  }
  // Find the subscription by billing agreement ID (this might be the subscription ID)
  const { data: subscription1, error: findError } = await supabaseAdmin.from('paypal_subscriptions').select('id, user_id, completed_cycles, total_paid, webhook_events_count').eq('paypal_subscription_id', billingAgreementId).single();
  if (findError || !subscription1) {
    return {
      success: false,
      message: 'Subscription not found for billing agreement'
    };
  }
  const paymentAmount = amount ? parseFloat(amount.total) : 0;
  const currency = amount?.currency || 'USD';
  // Record the payment
  const { error: paymentError } = await supabaseAdmin.from('paypal_subscription_payments').insert({
    subscription_id: subscription1.id,
    user_id: subscription1.user_id,
    paypal_payment_id: paymentId,
    amount: paymentAmount,
    currency: currency,
    status: 'COMPLETED',
    cycle_sequence: (subscription1.completed_cycles || 0) + 1,
    payment_time: new Date().toISOString(),
    paypal_response: webhookEvent.resource
  });
  if (paymentError) {
    console.error('Error recording subscription payment:', paymentError);
  }
  // Update subscription with payment info
  const { error: updateError } = await supabaseAdmin.from('paypal_subscriptions').update({
    last_payment_date: new Date().toISOString(),
    last_payment_amount: paymentAmount,
    completed_cycles: (subscription1.completed_cycles || 0) + 1,
    total_paid: (subscription1.total_paid || 0) + paymentAmount,
    failed_payments: 0,
    webhook_last_update: new Date().toISOString(),
    webhook_events_count: (subscription1.webhook_events_count || 0) + 1
  }).eq('id', subscription1.id);
  if (updateError) {
    return {
      success: false,
      message: updateError.message
    };
  }
  return {
    success: true,
    message: 'Subscription payment recorded successfully',
    payment_amount: paymentAmount,
    cycle: (subscription1.completed_cycles || 0) + 1
  };
}
