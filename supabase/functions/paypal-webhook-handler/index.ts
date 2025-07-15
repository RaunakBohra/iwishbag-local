import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { createHash } from "node:crypto"
import { Database } from '../../src/integrations/supabase/types.ts';

// Enhanced type interfaces for better type safety
interface PaymentTransactionGatewayResponse {
  quote_ids?: string[];
  webhook_event?: PayPalWebhookEvent;
  capture_details?: any;
  [key: string]: any;
}

interface ProcessedWebhookResult {
  payment_transaction?: { id: string } | null;
  quotes_updated?: number;
  ledger_entries?: number;
  error?: string;
}

interface AtomicProcessingResult {
  success: boolean;
  payment_transaction_id?: string;
  updated_quotes_count?: number;
  payment_ledger_entries_count?: number;
  error_message?: string;
}

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
    const errorMessage = error instanceof Error ? error.message : 'Unknown verification error';
    console.error('PayPal signature verification error:', errorMessage);
    console.error('Error details:', error);
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
    const supabaseAdmin: SupabaseClient<Database> = createClient(
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
    const processed: ProcessedWebhookResult = { payment_transaction: null };

    switch (eventType) {
      case 'CHECKOUT.ORDER.APPROVED':
        // Customer approved the payment, but it's not captured yet
        console.log("💳 Order approved by customer");
        
        const { data: updatedTx } = await supabaseAdmin
          .from('payment_transactions')
          .update({
            status: 'approved',
            gateway_response: {
              ...(paymentTx.gateway_response as PaymentTransactionGatewayResponse),
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
        
        // Get quote IDs from gateway response
        const existingGatewayResponse = paymentTx.gateway_response as PaymentTransactionGatewayResponse;
        const quoteIds = existingGatewayResponse?.quote_ids || [];
        
        // Prepare gateway response data
        const updatedGatewayResponse: PaymentTransactionGatewayResponse = {
          ...existingGatewayResponse,
          webhook_event: webhookData,
          capture_details: capture
        };
        
        // Use atomic function to process payment
        console.log("🔄 Processing payment atomically...");
        const { data: result, error: rpcError } = await supabaseAdmin
          .rpc('process_paypal_payment_atomic', {
            p_payment_transaction_id: paymentTx.id,
            p_capture_id: captureId,
            p_payer_email: payerEmail,
            p_payer_id: payerId,
            p_amount: amount,
            p_currency: currency,
            p_order_id: orderId,
            p_gateway_response: updatedGatewayResponse,
            p_quote_ids: quoteIds
          });
        
        if (rpcError || !result || !result[0]?.success) {
          const errorMessage = rpcError?.message || result?.[0]?.error_message || 'Unknown error';
          console.error("❌ Atomic payment processing failed:", errorMessage);
          
          // Return error but don't fail the webhook completely
          return new Response(JSON.stringify({ 
            error: 'Payment processing failed', 
            details: errorMessage 
          }), { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        
        const processingResult = result[0] as AtomicProcessingResult;
        console.log("✅ Payment processed atomically:", {
          payment_transaction_id: processingResult.payment_transaction_id,
          updated_quotes_count: processingResult.updated_quotes_count,
          payment_ledger_entries_count: processingResult.payment_ledger_entries_count
        });
        
        // Store result for response
        processed.payment_transaction = { id: processingResult.payment_transaction_id || '' };
        processed.quotes_updated = processingResult.updated_quotes_count || 0;
        processed.ledger_entries = processingResult.payment_ledger_entries_count || 0;
        break;

      case 'PAYMENT.CAPTURE.DENIED':
        // Payment capture was denied
        console.log("❌ Payment capture denied");
        
        // Update the existing payment transaction to failed status
        const { data: failedTransaction } = await supabaseAdmin
          .from('payment_transactions')
          .update({
            status: 'failed',
            gateway_response: {
              ...(paymentTx.gateway_response as PaymentTransactionGatewayResponse),
              webhook_event: webhookData
            },
            error_message: webhookData.summary || 'Payment capture denied',
            updated_at: new Date().toISOString()
          })
          .eq('id', paymentTx.id)
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
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('❌ Webhook processing error:', error);
    console.error('Error type:', typeof error);
    
    return new Response(JSON.stringify({ 
      error: 'Webhook processing failed',
      details: errorMessage,
      error_type: error instanceof Error ? 'Error' : typeof error
    }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});