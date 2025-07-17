// Test version of PayPal function without authentication
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { createCorsHeaders } from '../_shared/cors.ts';

interface PayPalPaymentLinkRequest {
  quoteIds: string[];
  amount: number;
  currency: string;
  success_url: string;
  cancel_url: string;
  customerInfo?: {
    name?: string;
    email?: string;
    phone?: string;
    address?: string;
  };
  metadata?: Record<string, unknown>;
}

serve(async (req) => {
  console.log('🔵 === TEST PAYPAL FUNCTION STARTED (NO AUTH) ===');
  console.log('Request method:', req.method);
  console.log('Request URL:', req.url);

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: createCorsHeaders(req),
    });
  }

  const corsHeaders = createCorsHeaders(req);

  try {
    // Skip authentication for testing
    console.log('⚠️ SKIPPING AUTHENTICATION FOR TESTING');
    
    // Validate method (but not authentication)
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        {
          status: 405,
          headers: {
            ...createCorsHeaders(req),
            'Content-Type': 'application/json',
          },
        },
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const body = await req.json();
    console.log('📥 Request body received:', JSON.stringify(body, null, 2));

    const {
      quoteIds,
      amount,
      currency,
      success_url,
      cancel_url,
      customerInfo,
    }: PayPalPaymentLinkRequest = body;

    console.log('🔵 Payment link request:', {
      quoteIds,
      amount,
      currency,
      hasCustomerInfo: !!customerInfo,
      success_url,
      cancel_url,
    });

    // Validate input
    if (!quoteIds || quoteIds.length === 0 || !amount || !currency) {
      console.error('❌ Missing required fields');
      return new Response(
        JSON.stringify({
          error: 'Missing required fields: quoteIds, amount, currency',
          received: { quoteIds, amount, currency },
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

    // Get PayPal gateway configuration
    console.log('🔍 Getting PayPal gateway configuration...');
    const { data: paypalGateway, error: gatewayError } = await supabaseAdmin
      .from('payment_gateways')
      .select('config, test_mode')
      .eq('code', 'paypal')
      .single();

    if (gatewayError || !paypalGateway) {
      console.error('❌ PayPal gateway config missing:', gatewayError);
      return new Response(
        JSON.stringify({
          error: 'PayPal gateway configuration not found',
          gatewayError,
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

    console.log('✅ PayPal gateway config found:', { 
      test_mode: paypalGateway.test_mode, 
      hasConfig: !!paypalGateway.config 
    });

    const config = paypalGateway.config || {};
    const testMode = paypalGateway.test_mode;

    // Get PayPal credentials based on mode
    const clientId = testMode ? config.client_id_sandbox : config.client_id_live;
    const clientSecret = testMode ? config.client_secret_sandbox : config.client_secret_live;
    const paypalApiUrl = testMode ? 'https://api-m.sandbox.paypal.com' : 'https://api-m.paypal.com';

    console.log('🔑 PayPal credentials check:', {
      testMode,
      paypalApiUrl,
      hasClientId: !!clientId,
      hasClientSecret: !!clientSecret,
      clientIdLength: clientId?.length,
    });

    if (!clientId || !clientSecret) {
      console.error('❌ PayPal credentials missing');
      return new Response(
        JSON.stringify({
          error: 'PayPal credentials not configured',
          testMode,
          hasClientId: !!clientId,
          hasClientSecret: !!clientSecret,
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

    // Currency conversion for PayPal (PayPal doesn't support NPR, convert to USD)
    let paypalAmount = amount;
    let paypalCurrency = currency;
    let exchangeRate = 1;
    const originalAmount = amount;
    const originalCurrency = currency;

    if (currency === 'NPR') {
      console.log('💱 Converting NPR to USD for PayPal...');
      
      // Get Nepal's exchange rate settings
      const { data: nepalSettings, error: countryError } = await supabaseAdmin
        .from('country_settings')
        .select('rate_from_usd')
        .eq('code', 'NP')
        .single();

      if (countryError || !nepalSettings || !nepalSettings.rate_from_usd) {
        console.error('❌ Error fetching Nepal exchange rate:', countryError);
        return new Response(
          JSON.stringify({
            error: 'Failed to get exchange rate for NPR to USD conversion',
            details: countryError,
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

      exchangeRate = nepalSettings.rate_from_usd;
      paypalAmount = amount / exchangeRate; // Convert NPR to USD
      paypalCurrency = 'USD';

      console.log(`💱 Currency conversion: ${amount} NPR → ${paypalAmount.toFixed(2)} USD (rate: ${exchangeRate})`);
    }

    // Get OAuth token
    console.log('🔑 Getting PayPal OAuth token...');
    const credentials = `${clientId}:${clientSecret}`;
    const encodedCredentials = btoa(credentials);
    console.log('Encoded credentials length:', encodedCredentials.length);

    const authResponse = await fetch(`${paypalApiUrl}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${encodedCredentials}`,
      },
      body: 'grant_type=client_credentials',
    });

    console.log('🔑 OAuth response status:', authResponse.status);

    if (!authResponse.ok) {
      const errorText = await authResponse.text();
      console.error('❌ PayPal OAuth error:', errorText);
      return new Response(
        JSON.stringify({
          error: 'Failed to authenticate with PayPal',
          status: authResponse.status,
          paypalError: errorText,
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

    const { access_token } = await authResponse.json();
    console.log('✅ PayPal OAuth token obtained, length:', access_token.length);

    // Create test order without database operations
    const _customerName = customerInfo?.name || 'Test Customer';
    const _customerEmail = customerInfo?.email || 'test@example.com';
    const transactionId = `TEST_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const description = `Test Order: ${quoteIds.join(',')}`;
    const invoiceId = `INV_${transactionId}`;

    console.log('📦 Creating PayPal test order...');
    const paypalOrder = {
      intent: 'CAPTURE',
      purchase_units: [
        {
          amount: {
            currency_code: paypalCurrency,
            value: paypalAmount.toFixed(2),
          },
          description: description.substring(0, 127),
          invoice_id: invoiceId,
          custom_id: transactionId,
        },
      ],
      application_context: {
        return_url: success_url || 'https://iwishbag.com/success',
        cancel_url: cancel_url || 'https://iwishbag.com/cancel',
        brand_name: 'iwishBag',
        landing_page: 'LOGIN',
        shipping_preference: 'NO_SHIPPING',
        user_action: 'PAY_NOW',
      },
    };

    console.log('📦 PayPal order payload:', JSON.stringify(paypalOrder, null, 2));

    const orderResponse = await fetch(`${paypalApiUrl}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${access_token}`,
      },
      body: JSON.stringify(paypalOrder),
    });

    console.log('📦 PayPal order response status:', orderResponse.status);

    if (!orderResponse.ok) {
      const errorData = await orderResponse.json();
      console.error('❌ PayPal order creation error:');
      console.error('Status:', orderResponse.status);
      console.error('Error data:', JSON.stringify(errorData, null, 2));
      
      return new Response(
        JSON.stringify({
          error: 'Failed to create PayPal order',
          status: orderResponse.status,
          details: errorData,
          paypalOrder: paypalOrder,
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

    const paypalOrderData = await orderResponse.json();
    console.log('✅ PayPal order created:', paypalOrderData.id);

    // Extract approval URL
    const links = paypalOrderData.links as Array<{ rel: string; href: string }>;
    const approvalUrl = links.find((link) => link.rel === 'approve')?.href;

    if (!approvalUrl) {
      console.error('❌ No approval URL in PayPal response');
      return new Response(
        JSON.stringify({
          error: 'PayPal order created but no approval URL found',
          paypalOrderData,
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

    console.log('✅ PayPal test completed successfully');
    console.log('🔗 Approval URL:', approvalUrl);

    return new Response(
      JSON.stringify({
        success: true,
        url: approvalUrl,
        transactionId: transactionId,
        order_id: paypalOrderData.id,
        test_mode: true,
        message: 'Test function completed - authentication bypassed',
        // Include currency conversion info
        originalAmount: originalAmount,
        originalCurrency: originalCurrency,
        paypalAmount: paypalAmount,
        paypalCurrency: paypalCurrency,
        exchangeRate: exchangeRate,
        currencyConverted: originalCurrency === 'NPR',
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);

    return new Response(
      JSON.stringify({
        error: 'An unexpected error occurred',
        details: error.message,
        type: error.name,
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