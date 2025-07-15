import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { createHash } from "node:crypto"

// PayPal API configuration
const PAYPAL_BASE_URL = Deno.env.get('PAYPAL_ENVIRONMENT') === 'sandbox' 
  ? 'https://api-m.sandbox.paypal.com'
  : 'https://api-m.paypal.com';

// PayPal OAuth token cache
let cachedToken: { access_token: string; expires_at: number } | null = null;

// Get PayPal OAuth token
async function getPayPalOAuthToken(): Promise<string> {
  const clientId = Deno.env.get('PAYPAL_CLIENT_ID');
  const clientSecret = Deno.env.get('PAYPAL_CLIENT_SECRET');
  
  if (!clientId || !clientSecret) {
    throw new Error('PayPal credentials not configured');
  }

  // Check if we have a valid cached token
  if (cachedToken && Date.now() < cachedToken.expires_at) {
    return cachedToken.access_token;
  }

  const auth = btoa(`${clientId}:${clientSecret}`);
  
  const response = await fetch(`${PAYPAL_BASE_URL}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials'
  });

  if (!response.ok) {
    throw new Error(`PayPal OAuth failed: ${response.status}`);
  }

  const tokenData = await response.json();
  
  // Cache the token (expires in 9 hours, we'll refresh after 8 hours)
  cachedToken = {
    access_token: tokenData.access_token,
    expires_at: Date.now() + (8 * 60 * 60 * 1000) // 8 hours
  };

  return tokenData.access_token;
}

// Verify PayPal webhook signature
async function verifyPayPalWebhookSignature(
  rawBody: string,
  headers: { [key: string]: string }
): Promise<boolean> {
  try {
    const webhookId = Deno.env.get('PAYPAL_WEBHOOK_ID');
    if (!webhookId) {
      throw new Error('PAYPAL_WEBHOOK_ID not configured');
    }

    const transmissionId = headers['paypal-transmission-id'];
    const transmissionTime = headers['paypal-transmission-time'];
    const transmissionSig = headers['paypal-transmission-signature'];
    const certUrl = headers['paypal-cert-url'];

    if (!transmissionId || !transmissionTime || !transmissionSig) {
      console.error('Missing PayPal webhook headers');
      return false;
    }

    const accessToken = await getPayPalOAuthToken();
    
    const verificationBody = {
      auth_algo: 'NONE',
      cert_url: certUrl || '',
      transmission_id: transmissionId,
      transmission_time: transmissionTime,
      webhook_id: webhookId,
      transmission_sig: transmissionSig,
      webhook_event: JSON.parse(rawBody)
    };

    const response = await fetch(`${PAYPAL_BASE_URL}/v1/notifications/verify-webhook-signature`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(verificationBody)
    });

    if (!response.ok) {
      console.error('PayPal verification API error:', response.status);
      return false;
    }

    const verificationResult = await response.json();
    return verificationResult.verification_status === 'SUCCESS';
  } catch (error) {
    console.error('PayPal signature verification error:', error);
    return false;
  }
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Max-Age': '86400',
}

interface PayPalWebhookEvent {
  id: string;
  event_type: string;
  resource_type: string;
  summary: string;
  resource: {
    id?: string;
    status?: string;
    amount?: {
      currency_code: string;
      value: string;
    };
    custom_id?: string;
    invoice_id?: string;
    purchase_units?: Array<{
      payments?: {
        captures?: Array<{
          id: string;
          status: string;
          amount: {
            currency_code: string;
            value: string;
          };
        }>;
      };
    }>;
    payer?: {
      name?: {
        given_name?: string;
        surname?: string;
      };
      email_address?: string;
      payer_id?: string;
    };
  };
  create_time: string;
  links: Array<{
    href: string;
    rel: string;
    method: string;
  }>;
}

serve(async (req) => {
  console.log("🔵 === PAYPAL WEBHOOK HANDLER STARTED ===");
  console.log("🔵 Request method:", req.method);
  console.log("🔵 Request URL:", req.url);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 204,
      headers: corsHeaders 
    })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get raw body for signature verification
    const rawBody = await req.text();
    
    // Convert headers to object for verification
    const headerObj: { [key: string]: string } = {};
    req.headers.forEach((value, key) => {
      headerObj[key.toLowerCase()] = value;
    });

    // Verify PayPal webhook signature
    console.log("🔐 Verifying PayPal webhook signature...");
    const isValidSignature = await verifyPayPalWebhookSignature(rawBody, headerObj);
    
    if (!isValidSignature) {
      console.error("❌ PayPal webhook signature verification failed");
      return new Response(JSON.stringify({ 
        error: 'Webhook signature verification failed' 
      }), { 
        status: 401, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log("✅ PayPal webhook signature verified successfully");

    // Parse webhook payload
    const webhookData: PayPalWebhookEvent = JSON.parse(rawBody);
    console.log("🔵 Webhook event received:", webhookData.event_type);
    console.log("🔵 Resource type:", webhookData.resource_type);

    // Extract key information
    const eventType = webhookData.event_type;
    const resource = webhookData.resource;
    
    // We're primarily interested in order and payment capture events
    const relevantEvents = [
      'CHECKOUT.ORDER.APPROVED',
      'CHECKOUT.ORDER.COMPLETED',
      'PAYMENT.CAPTURE.COMPLETED',
      'PAYMENT.CAPTURE.DENIED',
      'PAYMENT.CAPTURE.REFUNDED'
    ];

    if (!relevantEvents.includes(eventType)) {
      console.log("⚠️ Ignoring non-relevant event:", eventType);
      return new Response(JSON.stringify({ 
        message: 'Event ignored' 
      }), { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get order ID and transaction info
    const orderId = resource.id;
    const transactionId = resource.custom_id;
    
    if (!orderId) {
      console.error("❌ No order ID in webhook");
      return new Response(JSON.stringify({ 
        error: 'Missing order ID' 
      }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Find the payment transaction
    const { data: paymentTx, error: txError } = await supabaseAdmin
      .from('payment_transactions')
      .select('*')
      .eq('paypal_order_id', orderId)
      .single();
    
    if (txError || !paymentTx) {
      console.error("❌ Payment transaction not found for order:", orderId);
      // Don't return error - PayPal might retry. Just log and acknowledge.
      return new Response(JSON.stringify({ 
        message: 'Payment transaction not found, webhook acknowledged' 
      }), { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log("✅ Found payment transaction:", paymentTx.id);

    // Handle different event types
    const processed: any = { payment_transaction: null, quotes: null };

    switch (eventType) {
      case 'CHECKOUT.ORDER.APPROVED':
        // Customer approved the payment, but it's not captured yet
        console.log("💳 Order approved by customer");
        
        const { data: updatedTx } = await supabaseAdmin
          .from('payment_transactions')
          .update({
            status: 'approved',
            gateway_response: {
              ...paymentTx.gateway_response,
              webhook_event: webhookData
            },
            updated_at: new Date().toISOString()
          })
          .eq('id', paymentTx.id)
          .select()
          .single();
        
        processed.payment_transaction = updatedTx;
        break;

      case 'PAYMENT.CAPTURE.COMPLETED':
      case 'CHECKOUT.ORDER.COMPLETED':
        // Payment successfully captured
        console.log("✅ Payment captured successfully");
        
        // Extract capture details
        const capture = resource.purchase_units?.[0]?.payments?.captures?.[0];
        const captureId = capture?.id || resource.id;
        const captureStatus = capture?.status || resource.status;
        const amount = parseFloat(capture?.amount?.value || resource.amount?.value || paymentTx.amount);
        const currency = capture?.amount?.currency_code || resource.amount?.currency_code || paymentTx.currency;
        
        // Extract payer info
        const payerEmail = resource.payer?.email_address;
        const payerId = resource.payer?.payer_id;
        
        // Update payment transaction
        const { data: completedTx } = await supabaseAdmin
          .from('payment_transactions')
          .update({
            status: 'completed',
            paypal_capture_id: captureId,
            paypal_payer_email: payerEmail,
            paypal_payer_id: payerId,
            gateway_response: {
              ...paymentTx.gateway_response,
              webhook_event: webhookData,
              capture_details: capture
            },
            updated_at: new Date().toISOString()
          })
          .eq('id', paymentTx.id)
          .select()
          .single();
        
        processed.payment_transaction = completedTx;

        // Update related quotes
        const quoteIds = (paymentTx.gateway_response as any)?.quote_ids || [];
        if (quoteIds.length > 0) {
          console.log("📝 Updating quotes:", quoteIds);
          
          const { data: updatedQuotes, error: quoteError } = await supabaseAdmin
            .from('quotes')
            .update({
              status: 'paid',
              payment_method: 'paypal',
              paid_at: new Date().toISOString(),
              payment_details: {
                paypal_order_id: orderId,
                paypal_capture_id: captureId,
                paypal_payer_id: payerId,
                paypal_payer_email: payerEmail,
                transaction_id: transactionId
              }
            })
            .in('id', quoteIds)
            .select();
            
          if (quoteError) {
            console.error("❌ Error updating quotes:", quoteError);
          } else {
            processed.quotes = updatedQuotes;
            console.log("✅ Updated quotes:", updatedQuotes.length);
          }
          
          // Note: Following PayU pattern - no separate order creation needed
          // The quote with status 'paid' IS the order
          
          // Record payment in ledger (following PayU pattern)
          if (amount && quoteIds.length > 0) {
            for (const quoteId of quoteIds) {
              const { error: ledgerError } = await supabaseAdmin
                .from('payment_ledger')
                .insert({
                  quote_id: quoteId,
                  payment_transaction_id: paymentTx.id,
                  payment_type: 'customer_payment',
                  amount: amount,
                  currency: currency,
                  payment_method: 'paypal',
                  gateway_code: 'paypal',
                  gateway_transaction_id: captureId || orderId,
                  reference_number: orderId,
                  status: 'completed',
                  payment_date: new Date().toISOString(),
                  base_amount: amount, // Assuming USD for now
                  balance_before: 0, // Would need to calculate this properly
                  balance_after: amount, // Would need to calculate this properly
                  notes: `PayPal payment - Order: ${orderId}, Capture: ${captureId || 'N/A'}, Payer: ${payerEmail || 'N/A'}`,
                  created_by: paymentTx.user_id || null,
                  gateway_response: {
                    order_id: orderId,
                    capture_id: captureId,
                    payer_id: payerId,
                    payer_email: payerEmail,
                    webhook_event: webhookData
                  }
                });

              if (ledgerError) {
                console.error("❌ Failed to record payment in ledger for quote:", quoteId, ledgerError);
              } else {
                console.log("✅ Payment recorded in ledger for quote:", quoteId);
              }
            }
          }
        }

        // Update quote status if payment successful
        if (paymentLink.quote_id && processed.payment_transaction) {
          const { data: quote } = await supabaseAdmin
            .from('quotes')
            .update({
              status: 'paid',
              payment_status: 'paid',
              updated_at: new Date().toISOString()
            })
            .eq('id', paymentLink.quote_id)
            .select()
            .single();
          
          processed.quote = quote;
          console.log("✅ Quote marked as paid");
        }
        break;

      case 'PAYMENT.CAPTURE.DENIED':
        // Payment capture was denied
        console.log("❌ Payment capture denied");
        
        const { data: deniedLink } = await supabaseAdmin
          .from('payment_links')
          .update({
            status: 'cancelled',
            gateway_response: webhookData,
            updated_at: new Date().toISOString()
          })
          .eq('id', paymentLink.id)
          .select()
          .single();
        
        processed.payment_link = deniedLink;
        
        // Create failed transaction record
        const failedTxnId = `PAYPAL_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const { data: failedTransaction } = await supabaseAdmin
          .from('payment_transactions')
          .insert({
            user_id: paymentLink.user_id,
            quote_id: paymentLink.quote_id,
            amount: paymentLink.amount,
            currency: paymentLink.currency,
            status: 'failed',
            payment_method: 'paypal',
            transaction_id: failedTxnId,
            gateway_response: webhookData,
            error_message: webhookData.summary || 'Payment capture denied',
            paypal_order_id: orderId
          })
          .select()
          .single();
        
        processed.payment_transaction = failedTransaction;
        break;

      case 'PAYMENT.CAPTURE.REFUNDED':
        // Handle refund webhook
        console.log("💸 Payment refunded");
        
        // This should be handled by a separate refund flow
        // For now, just log it
        console.log("Refund webhook received, should be handled by refund system");
        break;
    }

    console.log("✅ Webhook processed successfully:", {
      event: eventType,
      processed: Object.keys(processed).filter(k => processed[k] !== null)
    });

    return new Response(JSON.stringify({
      success: true,
      event_type: eventType,
      processed: processed
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Webhook processing error:', error);
    return new Response(JSON.stringify({ 
      error: 'Webhook processing failed',
      details: error.message 
    }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});