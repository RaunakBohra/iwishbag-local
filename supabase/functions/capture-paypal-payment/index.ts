import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { createCorsHeaders } from '../_shared/cors.ts'

serve(async (req) => {
  console.log("🔵 === CAPTURE PAYPAL PAYMENT FUNCTION STARTED ===");
  const corsHeaders = createCorsHeaders(req);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 204,
      headers: corsHeaders 
    })
  }

  try {
    // Authorization is optional for guest checkout
    const authHeader = req.headers.get('authorization');
    console.log('🔐 Authorization header present:', !!authHeader);

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { orderID } = await req.json();
    
    if (!orderID) {
      return new Response(JSON.stringify({ 
        error: 'PayPal Order ID is required' 
      }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('🔍 Capturing PayPal order:', orderID);

    // Get PayPal gateway configuration
    const { data: paypalGateway, error: gatewayError } = await supabaseAdmin
      .from('payment_gateways')
      .select('*')
      .eq('code', 'paypal')
      .eq('is_active', true)
      .single();

    if (gatewayError || !paypalGateway) {
      console.error('❌ PayPal gateway config missing:', gatewayError);
      return new Response(JSON.stringify({ 
        error: 'PayPal gateway configuration not found' 
      }), { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const config = paypalGateway.config || {};
    const testMode = paypalGateway.test_mode;
    
    // Get PayPal credentials - support both old and new config formats
    const clientId = config.client_id || (testMode ? config.client_id_sandbox : config.client_id_live);
    const clientSecret = config.client_secret || (testMode ? config.client_secret_sandbox : config.client_secret_live);
    const paypalApiUrl = testMode 
      ? 'https://api-m.sandbox.paypal.com' 
      : 'https://api-m.paypal.com';

    if (!clientId || !clientSecret) {
      console.error('❌ PayPal credentials missing');
      return new Response(JSON.stringify({ 
        error: 'PayPal credentials not configured' 
      }), { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get OAuth token
    console.log('🔑 Getting PayPal OAuth token...');
    const credentials = `${clientId}:${clientSecret}`;
    const encodedCredentials = btoa(credentials);
    
    const authResponse = await fetch(`${paypalApiUrl}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${encodedCredentials}`
      },
      body: 'grant_type=client_credentials'
    });

    if (!authResponse.ok) {
      const errorText = await authResponse.text();
      console.error('❌ PayPal OAuth error:', errorText);
      return new Response(JSON.stringify({ 
        error: 'Failed to authenticate with PayPal' 
      }), { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { access_token } = await authResponse.json();
    console.log('✅ PayPal OAuth token obtained');

    // Capture the payment
    console.log('💰 Capturing PayPal payment...');
    const captureResponse = await fetch(`${paypalApiUrl}/v2/checkout/orders/${orderID}/capture`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${access_token}`
      }
    });

    if (!captureResponse.ok) {
      const errorData = await captureResponse.json();
      console.error('❌ PayPal capture error:', errorData);
      return new Response(JSON.stringify({ 
        error: 'Failed to capture PayPal payment',
        details: errorData 
      }), { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const captureData = await captureResponse.json();
    console.log('✅ PayPal payment captured successfully');

    // Extract comprehensive capture details
    const capture = captureData.purchase_units?.[0]?.payments?.captures?.[0];
    const captureID = capture?.id;
    const payer = captureData.payer || {};
    const payerEmail = payer.email_address;
    const payerID = payer.payer_id;
    
    // Extract additional payer information
    const payerName = payer.name || {};
    const payerAddress = payer.address || {};
    
    // Extract payment details
    const paymentSource = captureData.payment_source || {};
    const purchaseUnit = captureData.purchase_units?.[0] || {};
    const shipping = purchaseUnit.shipping || {};
    
    // Extract financial details
    const captureAmount = capture?.amount || {};
    const sellerProtection = capture?.seller_protection || {};
    const sellerReceivableBreakdown = capture?.seller_receivable_breakdown || {};
    
    // Extract timestamps
    const timestamps = {
      create_time: captureData.create_time,
      update_time: captureData.update_time,
      capture_create_time: capture?.create_time,
      capture_update_time: capture?.update_time
    };

    console.log('📋 Comprehensive capture details:', {
      captureID,
      payerEmail,
      payerID,
      payerName: `${payerName.given_name || ''} ${payerName.surname || ''}`.trim(),
      status: capture?.status,
      captureAmount: captureAmount.value,
      currency: captureAmount.currency_code,
      paypalFee: sellerReceivableBreakdown?.paypal_fee?.value,
      netAmount: sellerReceivableBreakdown?.net_amount?.value
    });

    return new Response(JSON.stringify({
      success: true,
      captureID,
      payerEmail,
      payerID,
      payerName,
      payerAddress,
      paymentSource,
      status: capture?.status,
      amount: captureAmount,
      sellerProtection,
      sellerReceivableBreakdown,
      timestamps,
      shipping,
      invoiceId: purchaseUnit.invoice_id,
      customId: purchaseUnit.custom_id,
      description: purchaseUnit.description,
      fullResponse: captureData
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return new Response(JSON.stringify({ 
      error: 'An unexpected error occurred',
      details: error.message 
    }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});