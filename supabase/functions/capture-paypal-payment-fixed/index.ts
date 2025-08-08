import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { createCorsHeaders } from '../_shared/cors.ts';
serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: createCorsHeaders(req),
    });
  }
  try {
    const { orderId, payerId } = await req.json();
    if (!orderId) {
      return new Response(
        JSON.stringify({
          error: 'Missing order ID',
        }),
        {
          status: 400,
          headers: {
            ...createCorsHeaders(req),
            'Content-Type': 'application/json',
          },
        },
      );
    }
    console.log(`🚀 Starting PayPal capture for order: ${orderId}, payer: ${payerId}`);
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );
    // Get PayPal configuration
    const { data: paypalGateway, error: paypalGatewayError } = await supabaseAdmin
      .from('payment_gateways')
      .select('config, test_mode')
      .eq('code', 'paypal')
      .single();
    if (paypalGatewayError || !paypalGateway) {
      console.error('PayPal configuration not found');
      return new Response(
        JSON.stringify({
          error: 'PayPal configuration not found',
        }),
        {
          status: 500,
          headers: {
            ...createCorsHeaders(req),
            'Content-Type': 'application/json',
          },
        },
      );
    }
    const config = paypalGateway.config || {};
    const testMode = paypalGateway.test_mode;
    if (!config.client_id || !config.client_secret) {
      console.error('PayPal credentials missing');
      return new Response(
        JSON.stringify({
          error: 'PayPal credentials not configured',
        }),
        {
          status: 500,
          headers: {
            ...createCorsHeaders(req),
            'Content-Type': 'application/json',
          },
        },
      );
    }
    // PayPal API base URL
    const baseUrl = testMode ? 'https://api-m.sandbox.paypal.com' : 'https://api-m.paypal.com';
    console.log(`Using PayPal ${testMode ? 'SANDBOX' : 'LIVE'} environment`);
    // Get PayPal access token
    const authString = btoa(`${config.client_id}:${config.client_secret}`);
    const tokenResponse = await fetch(`${baseUrl}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${authString}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });
    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json();
      console.error('Failed to get PayPal access token:', errorData);
      return new Response(
        JSON.stringify({
          error: 'PayPal authentication failed',
        }),
        {
          status: 500,
          headers: {
            ...createCorsHeaders(req),
            'Content-Type': 'application/json',
          },
        },
      );
    }
    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;
    // Capture the payment
    console.log(`📝 Capturing PayPal order ${orderId}...`);
    const captureResponse = await fetch(`${baseUrl}/v2/checkout/orders/${orderId}/capture`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });
    if (!captureResponse.ok) {
      const errorData = await captureResponse.json();
      console.error('PayPal capture failed:', errorData);
      // Update payment transaction status to failed
      await supabaseAdmin
        .from('payment_transactions')
        .update({
          status: 'failed',
          error_message: errorData.message || 'Payment capture failed',
          updated_at: new Date().toISOString(),
        })
        .or(`paypal_order_id.eq.${orderId},gateway_response->>paypal_order_id.eq.${orderId}`);
      return new Response(
        JSON.stringify({
          error: 'Payment capture failed',
          details: errorData,
        }),
        {
          status: 400,
          headers: {
            ...createCorsHeaders(req),
            'Content-Type': 'application/json',
          },
        },
      );
    }
    const captureData = await captureResponse.json();
    console.log('✅ PayPal API capture successful:', captureData.id);
    // Extract amount and currency from capture response
    const purchaseUnit = captureData.purchase_units?.[0];
    const capture = purchaseUnit?.payments?.captures?.[0];
    const amount = parseFloat(capture?.amount?.value || '0');
    const currency = capture?.amount?.currency_code || 'USD';
    // Update payment transaction with capture details
    console.log(`💾 Updating payment_transactions for order ${orderId}...`);
    // First try to update by paypal_order_id column
    let { data: updatedRows, error: updateError } = await supabaseAdmin
      .from('payment_transactions')
      .update({
        status: 'completed',
        paypal_capture_id: capture?.id,
        gateway_response: captureData,
        updated_at: new Date().toISOString(),
      })
      .eq('paypal_order_id', orderId)
      .select();
    console.log('Update by paypal_order_id column result:', {
      rowsUpdated: updatedRows?.length || 0,
      error: updateError,
    });
    // If no rows updated, try searching in JSONB field
    if (!updatedRows || updatedRows.length === 0) {
      console.log('No rows found by paypal_order_id column, trying JSONB search...');
      const result = await supabaseAdmin
        .from('payment_transactions')
        .update({
          status: 'completed',
          paypal_capture_id: capture?.id,
          paypal_order_id: orderId,
          gateway_response: captureData,
          updated_at: new Date().toISOString(),
        })
        .eq('gateway_response->>paypal_order_id', orderId)
        .select();
      updatedRows = result.data;
      updateError = result.error;
      console.log('Update by JSONB field result:', {
        rowsUpdated: updatedRows?.length || 0,
        error: updateError,
      });
    }
    if (updateError) {
      console.error('❌ Error updating payment transaction:', updateError);
      // Continue execution - we still want to update quotes if possible
    } else if (!updatedRows || updatedRows.length === 0) {
      console.error('⚠️ WARNING: No payment_transactions rows were updated!');
      // Try to find the transaction to debug
      const { data: existingTxn } = await supabaseAdmin
        .from('payment_transactions')
        .select('id, paypal_order_id, status, gateway_response')
        .or(`paypal_order_id.eq.${orderId},gateway_response->>paypal_order_id.eq.${orderId}`)
        .single();
      console.log('Existing transaction found:', existingTxn);
    } else {
      console.log(`✅ Successfully updated ${updatedRows.length} payment_transactions rows`);
    }
    // Extract quote IDs from custom_id
    const customData = purchaseUnit?.custom_id ? JSON.parse(purchaseUnit.custom_id) : {};
    const quoteIds = customData.quoteIds || [];
    // Update quote status to paid
    if (quoteIds.length > 0) {
      console.log('📝 Updating quote status for IDs:', quoteIds);
      const { data: updatedQuotes, error: quoteError } = await supabaseAdmin
        .from('quotes_v2')
        .update({
          status: 'paid',
          payment_status: 'paid',
          paid_at: new Date().toISOString(),
        })
        .in('id', quoteIds)
        .select();
      if (quoteError) {
        console.error('❌ Error updating quote status:', quoteError);
      } else {
        console.log(`✅ Successfully updated ${updatedQuotes?.length || 0} quotes`);
      }
    }
    return new Response(
      JSON.stringify({
        success: true,
        capture_id: capture?.id,
        order_id: orderId,
        status: captureData.status,
        amount: amount,
        currency: currency,
        payer: captureData.payer,
        payment_transactions_updated: updatedRows?.length || 0,
        quotes_updated: quoteIds.length,
      }),
      {
        status: 200,
        headers: {
          ...createCorsHeaders(req),
          'Content-Type': 'application/json',
        },
      },
    );
  } catch (error) {
    console.error('PayPal capture error:', error);
    return new Response(
      JSON.stringify({
        error: 'Payment capture failed',
        details: error.message,
      }),
      {
        status: 500,
        headers: {
          ...createCorsHeaders(req),
          'Content-Type': 'application/json',
        },
      },
    );
  }
});
