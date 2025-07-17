// Debug version of PayPal function with enhanced logging
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  console.log('🔵 === DEBUG PAYPAL FUNCTION STARTED ===');
  console.log('Request method:', req.method);
  console.log('Request headers:', Object.fromEntries(req.headers.entries()));

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  try {
    // Get the request body
    const body = await req.text();
    console.log('Request body:', body);
    
    const parsedBody = JSON.parse(body);
    console.log('Parsed body:', parsedBody);
    
    // Check required fields
    const { quoteIds, amount, currency, gateway } = parsedBody;
    console.log('Required fields:', { quoteIds, amount, currency, gateway });
    
    if (!quoteIds || !amount || !currency) {
      console.error('Missing required fields');
      return new Response(
        JSON.stringify({
          error: 'Missing required fields',
          received: { quoteIds, amount, currency, gateway },
        }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        },
      );
    }

    // Create Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Get PayPal gateway configuration
    console.log('Getting PayPal configuration...');
    const { data: paypalGateway, error: gatewayError } = await supabaseAdmin
      .from('payment_gateways')
      .select('config, test_mode')
      .eq('code', 'paypal')
      .single();

    if (gatewayError || !paypalGateway) {
      console.error('PayPal gateway config error:', gatewayError);
      return new Response(
        JSON.stringify({
          error: 'PayPal gateway configuration not found',
          details: gatewayError,
        }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        },
      );
    }

    console.log('PayPal gateway config:', paypalGateway);

    const config = paypalGateway.config || {};
    const testMode = paypalGateway.test_mode;

    console.log('PayPal config details:', {
      testMode,
      hasClientId: !!config.client_id_sandbox,
      hasClientSecret: !!config.client_secret_sandbox,
    });

    // Get PayPal credentials
    const clientId = testMode ? config.client_id_sandbox : config.client_id_live;
    const clientSecret = testMode ? config.client_secret_sandbox : config.client_secret_live;
    const paypalApiUrl = testMode ? 'https://api-m.sandbox.paypal.com' : 'https://api-m.paypal.com';

    if (!clientId || !clientSecret) {
      console.error('PayPal credentials missing');
      return new Response(
        JSON.stringify({
          error: 'PayPal credentials not configured',
          details: { hasClientId: !!clientId, hasClientSecret: !!clientSecret },
        }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        },
      );
    }

    // Test PayPal OAuth
    console.log('Testing PayPal OAuth...');
    const credentials = `${clientId}:${clientSecret}`;
    const encodedCredentials = btoa(credentials);

    const authResponse = await fetch(`${paypalApiUrl}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${encodedCredentials}`,
      },
      body: 'grant_type=client_credentials',
    });

    if (!authResponse.ok) {
      const errorText = await authResponse.text();
      console.error('PayPal OAuth error:', errorText);
      return new Response(
        JSON.stringify({
          error: 'Failed to authenticate with PayPal',
          details: errorText,
        }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        },
      );
    }

    const authData = await authResponse.json();
    console.log('PayPal OAuth successful, token received');

    // Create a simple test order
    const testOrder = {
      intent: 'CAPTURE',
      purchase_units: [
        {
          amount: {
            currency_code: currency,
            value: amount.toFixed(2),
          },
          description: `Test order for ${quoteIds.join(', ')}`,
        },
      ],
      application_context: {
        return_url: 'https://iwishbag.com/success',
        cancel_url: 'https://iwishbag.com/cancel',
        brand_name: 'iwishBag',
        landing_page: 'LOGIN',
        shipping_preference: 'NO_SHIPPING',
        user_action: 'PAY_NOW',
      },
    };

    console.log('Creating PayPal order:', testOrder);

    const orderResponse = await fetch(`${paypalApiUrl}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authData.access_token}`,
      },
      body: JSON.stringify(testOrder),
    });

    if (!orderResponse.ok) {
      const errorData = await orderResponse.json();
      console.error('PayPal order creation error:', errorData);
      return new Response(
        JSON.stringify({
          error: 'Failed to create PayPal order',
          details: errorData,
        }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        },
      );
    }

    const orderData = await orderResponse.json();
    console.log('PayPal order created successfully:', orderData.id);

    // Find approval URL
    const approvalUrl = orderData.links.find((link: any) => link.rel === 'approve')?.href;

    return new Response(
      JSON.stringify({
        success: true,
        url: approvalUrl,
        order_id: orderData.id,
        debug: {
          testMode,
          paypalApiUrl,
          orderStatus: orderData.status,
        },
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      },
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({
        error: 'Unexpected error occurred',
        details: error.message,
        stack: error.stack,
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      },
    );
  }
});