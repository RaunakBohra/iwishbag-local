import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { createWebhookHeaders } from '../_shared/cors.ts';

type Database = any; // Add type for SupabaseClient

interface WebhookLog {
  request_id: string;
  webhook_type: string;
  status: string;
  user_agent?: string;
  error_message?: string;
  created_at: string;
}

interface PaymentTransactionInsert {
  user_id?: string | null;
  quote_id: string;
  amount: number;
  currency: string;
  status: 'completed' | 'failed' | 'pending';
  payment_method: string;
  transaction_id: string;
  gateway_response: Record<string, unknown>;
  created_at: string;
}

// Get webhook headers (empty object for webhooks)
const corsHeaders = createWebhookHeaders();

interface PayUWebhookData {
  txnid: string;
  mihpayid: string;
  status: string;
  amount: string;
  productinfo: string;
  firstname: string;
  email: string;
  phone: string;
  hash: string;
  mode: string;
  bankcode: string;
  bank_ref_num: string;
  error_code: string;
  error_Message: string;
  cardMask: string;
  name_on_card: string;
  card_no: string;
  is_seamless: string;
  surl: string;
  furl: string;
  merchant_key: string;
  merchant_salt: string;
  merchant_txnid: string;
  merchant_hash: string;
  merchant_udf1: string;
  merchant_udf2: string;
  merchant_udf3: string;
  merchant_udf4: string;
  merchant_udf5: string;
  merchant_udf6: string;
  merchant_udf7: string;
  merchant_udf8: string;
  merchant_udf9: string;
  merchant_udf10: string;
  merchant_udf11: string;
  merchant_udf12: string;
  merchant_udf13: string;
  merchant_udf14: string;
  merchant_udf15: string;
  merchant_udf16: string;
  merchant_udf17: string;
  merchant_udf18: string;
  merchant_udf19: string;
  merchant_udf20: string;
  merchant_udf21: string;
  merchant_udf22: string;
  merchant_udf23: string;
  merchant_udf24: string;
  merchant_udf25: string;
  merchant_udf26: string;
  merchant_udf27: string;
  merchant_udf28: string;
  merchant_udf29: string;
  merchant_udf30: string;
  merchant_udf31: string;
  merchant_udf32: string;
  merchant_udf33: string;
  merchant_udf34: string;
  merchant_udf35: string;
  merchant_udf36: string;
  merchant_udf37: string;
  merchant_udf38: string;
  merchant_udf39: string;
  merchant_udf40: string;
  merchant_udf41: string;
  merchant_udf42: string;
  merchant_udf43: string;
  merchant_udf44: string;
  merchant_udf45: string;
  merchant_udf46: string;
  merchant_udf47: string;
  merchant_udf48: string;
  merchant_udf49: string;
  merchant_udf50: string;
  merchant_udf51: string;
  merchant_udf52: string;
  udf1: string;
  udf2: string;
  udf3: string;
  udf4: string;
  udf5: string;
  merchant_udf53: string;
  merchant_udf54: string;
  merchant_udf55: string;
  merchant_udf56: string;
  merchant_udf57: string;
  merchant_udf58: string;
  merchant_udf59: string;
  merchant_udf60: string;
  merchant_udf61: string;
  merchant_udf62: string;
  merchant_udf63: string;
  merchant_udf64: string;
  merchant_udf65: string;
  merchant_udf66: string;
  merchant_udf67: string;
  merchant_udf68: string;
  merchant_udf69: string;
  merchant_udf70: string;
  merchant_udf71: string;
  merchant_udf72: string;
  merchant_udf73: string;
  merchant_udf74: string;
  merchant_udf75: string;
  merchant_udf76: string;
  merchant_udf77: string;
  merchant_udf78: string;
  merchant_udf79: string;
  merchant_udf80: string;
  merchant_udf81: string;
  merchant_udf82: string;
  merchant_udf83: string;
  merchant_udf84: string;
  merchant_udf85: string;
  merchant_udf86: string;
  merchant_udf87: string;
  merchant_udf88: string;
  merchant_udf89: string;
  merchant_udf90: string;
  merchant_udf91: string;
  merchant_udf92: string;
  merchant_udf93: string;
  merchant_udf94: string;
  merchant_udf95: string;
  merchant_udf96: string;
  merchant_udf97: string;
  merchant_udf98: string;
  merchant_udf99: string;
  merchant_udf100: string;
}

// Log webhook attempts for monitoring and debugging
async function logWebhookAttempt(
  supabaseAdmin: SupabaseClient<Database>,
  requestId: string,
  status: string,
  userAgent: string,
  errorMessage?: string,
) {
  try {
    await supabaseAdmin.from('webhook_logs').insert({
      request_id: requestId,
      webhook_type: 'payu',
      status: status,
      user_agent: userAgent,
      error_message: errorMessage,
      created_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Failed to log webhook attempt:', error);
    // Don't fail the webhook if logging fails
  }
}

// Verify PayU webhook hash
async function verifyPayUHash(data: PayUWebhookData, salt: string): Promise<boolean> {
  try {
    // PayU webhook verification hash
    const hashString = [
      salt,
      data.txnid,
      data.status,
      data.amount,
      data.productinfo,
      data.firstname,
      data.email,
      data.udf1 || '',
      data.udf2 || '',
      data.udf3 || '',
      data.udf4 || '',
      data.udf5 || '',
      data.udf6 || '',
      data.udf7 || '',
      data.udf8 || '',
      data.udf9 || '',
      data.udf10 || '',
    ].join('|');

    const encoder = new TextEncoder();
    const dataBytes = encoder.encode(hashString);
    const hashBuffer = await crypto.subtle.digest('SHA-512', dataBytes);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const calculatedHash = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

    return calculatedHash === data.hash;
  } catch (error) {
    console.error('Hash verification error:', error);
    return false;
  }
}

// Note: Individual retry functions removed - now using atomic RPC for data consistency

serve(async (req) => {
  // Webhooks should not accept OPTIONS requests - only POST
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  // Add comprehensive error handling and logging
  const requestId = crypto.randomUUID();
  const startTime = Date.now();

  try {
    console.log(`🔔 PayU Webhook Received [${requestId}]`);

    const supabaseAdmin: SupabaseClient<Database> = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Log webhook attempt
    await logWebhookAttempt(
      supabaseAdmin,
      requestId,
      'started',
      req.headers.get('user-agent') || '',
    );

    // Parse webhook data with error handling
    let webhookData: PayUWebhookData;
    try {
      webhookData = (await req.json()) as PayUWebhookData; // Explicit cast for safety
    } catch (parseError) {
      console.error(`[${requestId}] JSON parsing error:`, parseError);
      await logWebhookAttempt(supabaseAdmin, requestId, 'failed', '', 'JSON parsing failed');
      return new Response(JSON.stringify({ error: 'Invalid JSON data' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate required fields
    if (!webhookData.txnid || !webhookData.status || !webhookData.amount) {
      console.error(`[${requestId}] Missing required fields:`, {
        txnid: !!webhookData.txnid,
        status: !!webhookData.status,
        amount: !!webhookData.amount,
      });
      await logWebhookAttempt(supabaseAdmin, requestId, 'failed', '', 'Missing required fields');
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('PayU Webhook Data:', {
      txnid: webhookData.txnid,
      status: webhookData.status,
      amount: webhookData.amount,
      mihpayid: webhookData.mihpayid,
      email: webhookData.email,
      productinfo: webhookData.productinfo,
    });

    // Verify webhook hash
    const salt = Deno.env.get('PAYU_SALT_KEY');
    if (!salt) {
      console.error(`[${requestId}] PayU salt key not configured`);
      await logWebhookAttempt(
        supabaseAdmin,
        requestId,
        'failed',
        '',
        'PayU salt key not configured',
      );
      return new Response(JSON.stringify({ error: 'Configuration error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const isValidHash = await verifyPayUHash(webhookData, salt);
    if (!isValidHash) {
      console.error(`[${requestId}] Invalid webhook hash - possible security issue`);
      await logWebhookAttempt(
        supabaseAdmin,
        requestId,
        'failed',
        '',
        'Invalid webhook hash verification',
      );
      return new Response(JSON.stringify({ error: 'Invalid hash' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`✅ Webhook hash verified [${requestId}]`);

    // Extract quote IDs from productinfo with multiple fallback methods
    let quoteIds: string[] = [];
    const productInfo = webhookData.productinfo || '';

    console.log(`[${requestId}] 🔍 Extracting quote IDs from productinfo:`, productInfo);

    // Method 1: Extract from productinfo - Format: "Order: Product Name (quote_id1,quote_id2)"
    if (productInfo) {
      const quoteIdsMatch = productInfo.match(/\(([^)]+)\)$/);
      if (quoteIdsMatch) {
        quoteIds = quoteIdsMatch[1]
          .split(',')
          .map((id) => id.trim())
          .filter((id) => id);
        console.log(`[${requestId}] ✅ Found quote IDs in productinfo with parentheses:`, quoteIds);
      }
    }

    // Method 2: Primary fallback - Extract UUID-like strings directly from productinfo
    if (quoteIds.length === 0 && productInfo) {
      const uuidRegex = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
      const uuidMatches = productInfo.match(uuidRegex);
      if (uuidMatches) {
        quoteIds = uuidMatches;
        console.log(`[${requestId}] ✅ Found quote IDs via UUID regex in productinfo:`, quoteIds);
      }
    }

    // Method 3: Extract from transaction ID if it contains quote ID
    if (quoteIds.length === 0 && webhookData.txnid) {
      const txnUuidMatch = webhookData.txnid.match(
        /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i,
      );
      if (txnUuidMatch) {
        quoteIds = [txnUuidMatch[0]];
        console.log(`[${requestId}] ✅ Found quote ID in transaction ID:`, quoteIds);
      }
    }

    if (quoteIds.length === 0) {
      console.error(`[${requestId}] ❌ No quote IDs found in any location. PayU data:`, {
        productinfo: productInfo,
        txnid: webhookData.txnid,
      });
      await logWebhookAttempt(supabaseAdmin, requestId, 'failed', '', 'No quote IDs found');
      return new Response(JSON.stringify({ error: 'Quote IDs not found' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[${requestId}] 📋 Final quote IDs extracted:`, quoteIds);

    // Extract guest session token from UDF1 if present
    const guestSessionToken = webhookData.udf1 || '';
    console.log('Guest session token:', guestSessionToken ? 'Present' : 'Not present');

    // Determine payment status
    let paymentStatus: 'success' | 'failed' | 'pending';
    let orderStatus: 'paid' | 'failed' | 'pending';

    switch (webhookData.status.toLowerCase()) {
      case 'success':
        paymentStatus = 'success';
        orderStatus = 'paid';
        break;
      case 'failure':
      case 'failed':
        paymentStatus = 'failed';
        orderStatus = 'failed';
        break;
      default:
        paymentStatus = 'pending';
        orderStatus = 'pending';
    }

    // Get guest session data if token provided
    let guestSessionData = null;
    if (guestSessionToken) {
      try {
        const { data: guestSession, error: sessionError } = await supabaseAdmin
          .from('guest_checkout_sessions')
          .select('*')
          .eq('session_token', guestSessionToken)
          .eq('status', 'active')
          .single();

        if (!sessionError && guestSession) {
          guestSessionData = {
            guest_name: guestSession.guest_name,
            guest_email: guestSession.guest_email,
            shipping_address: guestSession.shipping_address,
            quote_id: guestSession.quote_id,
          };
          console.log('✅ Guest session data retrieved for atomic processing');
        } else {
          console.error('Guest session not found:', sessionError);
        }
      } catch (error) {
        console.error('Error retrieving guest session:', error);
      }
    }

    // First, verify the quotes exist and check their current status
    console.log(`[${requestId}] 🔍 Verifying quotes exist before update...`);
    const { data: existingQuotes, error: fetchError } = await supabaseAdmin
      .from('quotes')
      .select('id, status, display_id, final_total, user_id')
      .in('id', quoteIds);

    if (fetchError) {
      console.error(`[${requestId}] ❌ Error fetching quotes for verification:`, fetchError);
      await logWebhookAttempt(
        supabaseAdmin,
        requestId,
        'failed',
        '',
        'Error fetching quotes for verification',
      );
      return new Response(JSON.stringify({ error: 'Error verifying quotes' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!existingQuotes || existingQuotes.length === 0) {
      console.error(`[${requestId}] ❌ No quotes found with IDs:`, quoteIds);
      await logWebhookAttempt(
        supabaseAdmin,
        requestId,
        'failed',
        '',
        'No quotes found with provided IDs',
      );
      return new Response(JSON.stringify({ error: 'Quotes not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(
      `[${requestId}] 📋 Found quotes to update:`,
      existingQuotes.map((q) => ({
        id: q.id,
        display_id: q.display_id,
        status: q.status,
        final_total: q.final_total,
      })),
    );

    // Process webhook atomically using RPC
    console.log(`[${requestId}] 🔄 Processing webhook atomically...`);

    // Prepare payment data for atomic processing
    const paymentData = {
      transaction_id: webhookData.mihpayid || webhookData.txnid,
      gateway_transaction_id: webhookData.mihpayid,
      amount: parseFloat(webhookData.amount),
      currency: 'INR',
      customer_email: webhookData.email,
      customer_name: webhookData.firstname,
      customer_phone: webhookData.phone,
      payment_method: 'payu',
      gateway_response: {
        mihpayid: webhookData.mihpayid,
        txnid: webhookData.txnid,
        status: webhookData.status,
        amount: webhookData.amount,
        productinfo: webhookData.productinfo,
        firstname: webhookData.firstname,
        email: webhookData.email,
        phone: webhookData.phone,
        mode: webhookData.mode,
        bankcode: webhookData.bankcode,
        bank_ref_num: webhookData.bank_ref_num,
        cardMask: webhookData.cardMask,
        name_on_card: webhookData.name_on_card,
        error_code: webhookData.error_code,
        error_message: webhookData.error_Message,
        webhook_received_at: new Date().toISOString(),
      },
    };

    // Call atomic RPC function
    const { data: atomicResult, error: atomicError } = await supabaseAdmin.rpc(
      'process_payment_webhook_atomic',
      {
        p_quote_ids: quoteIds,
        p_payment_status: paymentStatus,
        p_payment_data: paymentData,
        p_guest_session_token: guestSessionToken,
        p_guest_session_data: guestSessionData,
        p_create_order: orderStatus === 'paid',
      },
    );

    if (atomicError) {
      console.error(`[${requestId}] ❌ Atomic webhook processing failed:`, atomicError);
      await logWebhookAttempt(
        supabaseAdmin,
        requestId,
        'failed',
        '',
        `Atomic processing failed: ${atomicError.message}`,
      );
      return new Response(
        JSON.stringify({
          error: 'Webhook processing failed',
          details: atomicError.message,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    if (!atomicResult || atomicResult.length === 0 || !atomicResult[0].success) {
      const errorMessage = atomicResult?.[0]?.error_message || 'Unknown atomic processing error';
      console.error(`[${requestId}] ❌ Atomic webhook processing failed:`, errorMessage);
      await logWebhookAttempt(
        supabaseAdmin,
        requestId,
        'failed',
        '',
        `Atomic processing failed: ${errorMessage}`,
      );
      return new Response(
        JSON.stringify({
          error: 'Webhook processing failed',
          details: errorMessage,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    const result = atomicResult[0];
    console.log(`[${requestId}] ✅ Atomic webhook processing completed:`, {
      payment_transaction_id: result.payment_transaction_id,
      payment_ledger_entry_id: result.payment_ledger_entry_id,
      quotes_updated: result.quotes_updated,
      guest_session_updated: result.guest_session_updated,
      order_created: !!result.order_id,
    });

    // Log successful webhook processing
    const processingTime = Date.now() - startTime;
    await logWebhookAttempt(
      supabaseAdmin,
      requestId,
      'success',
      '',
      `Processed in ${processingTime}ms`,
    );

    console.log(`✅ PayU webhook processed successfully [${requestId}] in ${processingTime}ms`);

    // Send success response with atomic results
    return new Response(
      JSON.stringify({
        success: true,
        message: `Payment ${paymentStatus}`,
        quoteIds,
        transactionId: webhookData.mihpayid || webhookData.txnid,
        requestId,
        processingTime: `${processingTime}ms`,
        atomicResults: {
          payment_transaction_id: result.payment_transaction_id,
          payment_ledger_entry_id: result.payment_ledger_entry_id,
          quotes_updated: result.quotes_updated,
          guest_session_updated: result.guest_session_updated,
          order_created: !!result.order_id,
          order_id: result.order_id,
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error(`❌ PayU webhook error [${requestId}]:`, error);

    // Log the error
    const supabaseAdmin: SupabaseClient<Database> = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );
    await logWebhookAttempt(
      supabaseAdmin,
      requestId,
      'failed',
      '',
      `Error after ${processingTime}ms: ${error.message}`,
    );

    return new Response(
      JSON.stringify({
        error: 'Webhook processing failed',
        details: error.message,
        requestId,
        processingTime: `${processingTime}ms`,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }
});
