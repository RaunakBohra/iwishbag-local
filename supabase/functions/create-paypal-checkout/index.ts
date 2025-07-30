import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  authenticateUser,
  AuthError,
  createAuthErrorResponse,
  validateMethod,
} from '../_shared/auth.ts';
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

interface PayPalOrderRequest {
  intent: string;
  purchase_units: Array<{
    amount: {
      currency_code: string;
      value: string;
    };
    description?: string;
    invoice_id?: string;
    custom_id?: string;
  }>;
  application_context: {
    return_url: string;
    cancel_url: string;
    brand_name: string;
    landing_page: string;
    shipping_preference: string;
    user_action: string;
  };
}

serve(async (req) => {
  console.log('🔵 === CREATE PAYPAL CHECKOUT FUNCTION STARTED ===');
  console.log('Request method:', req.method);
  console.log('Request URL:', req.url);
  console.log('Request headers:', Object.fromEntries(req.headers.entries()));

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: createCorsHeaders(req),
    });
  }

  const corsHeaders = createCorsHeaders(req);

  try {
    // Validate request method
    validateMethod(req, ['POST']);

    // Authenticate user
    const { user } = await authenticateUser(req);

    console.log(`🔐 Authenticated user ${user.email} creating PayPal checkout`);

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
      metadata: _metadata,
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
      hasConfig: !!paypalGateway.config,
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

    // Fetch quote details if not test quotes
    let quotesToUse = [];
    let customerName = customerInfo?.name || 'Customer';
    let customerEmail = customerInfo?.email || 'customer@example.com';
    let customerPhone = customerInfo?.phone || '';

    if (!quoteIds.some((id) => id.startsWith('test-'))) {
      console.log('🔍 Fetching quote details for:', quoteIds);
      const { data: quotes, error: quotesError } = await supabaseAdmin
        .from('quotes')
        .select('id, product_name, email, customer_name, shipping_address, final_total_usd')
        .in('id', quoteIds);

      if (quotesError || !quotes || quotes.length === 0) {
        console.error('❌ Error fetching quotes:', quotesError);
        return new Response(
          JSON.stringify({
            error: 'Quotes not found',
            quotesError,
            quoteIds,
          }),
          {
            status: 404,
            headers: {
              ...createCorsHeaders(req),
              'Content-Type': 'application/json',
            },
          },
        );
      }

      quotesToUse = quotes;
      console.log('✅ Quotes fetched:', quotes.length);

      // Get customer info from first quote if not provided
      if (!customerInfo && quotes.length > 0) {
        const firstQuote = quotes[0];
        customerEmail = firstQuote.email || customerEmail;
        customerName = firstQuote.customer_name || customerName;

        if (firstQuote.shipping_address && typeof firstQuote.shipping_address === 'object') {
          const shippingAddress = firstQuote.shipping_address as Record<string, unknown>;
          customerPhone = shippingAddress.phone || customerPhone;
        }
      }
    }

    // Generate unique transaction ID for PayPal
    const transactionId = `PAYPAL_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    // Create product info
    const productNames = quotesToUse.map((q) => q.product_name || 'Product').join(', ');
    const description = `Order: ${productNames} (${quoteIds.join(',')})`;

    // Generate invoice ID
    const invoiceId = `INV_${transactionId}`;

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

      console.log(
        `💱 Currency conversion: ${amount} NPR → ${paypalAmount.toFixed(2)} USD (rate: ${exchangeRate})`,
      );
    }

    // Create PayPal order
    console.log('📦 Creating PayPal order...');
    const paypalOrder: PayPalOrderRequest = {
      intent: 'CAPTURE',
      purchase_units: [
        {
          amount: {
            currency_code: paypalCurrency,
            value: paypalAmount.toFixed(2),
          },
          description: description.substring(0, 127), // PayPal limit
          invoice_id: invoiceId,
          custom_id: transactionId,
        },
      ],
      application_context: {
        return_url: success_url
          ? `${success_url.split('/order-confirmation')[0]}/paypal-success`
          : `${Deno.env.get('SUPABASE_URL')?.replace('.supabase.co', '.app')}/paypal-success`,
        cancel_url: cancel_url
          ? `${cancel_url.split('/checkout')[0]}/paypal-failure`
          : `${Deno.env.get('SUPABASE_URL')?.replace('.supabase.co', '.app')}/paypal-failure`,
        brand_name: 'iwishBag',
        landing_page: 'LOGIN',
        shipping_preference: 'NO_SHIPPING',
        user_action: 'PAY_NOW',
      },
    };

    console.log('📦 PayPal order payload:', JSON.stringify(paypalOrder, null, 2));

    // Add payer info if available
    if (customerEmail !== 'customer@example.com') {
      (paypalOrder as Record<string, unknown>).payer = {
        email_address: customerEmail,
        name: {
          given_name: customerName.split(' ')[0] || customerName,
          surname: customerName.split(' ').slice(1).join(' ') || '',
        },
      };
      console.log('👤 Added payer info:', customerEmail, customerName);
    }

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

    // Store PayPal order info for later verification
    console.log('✅ PayPal order created successfully');

    // Get user ID from auth header if available
    let userId = null;
    try {
      const authHeader = req.headers.get('authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        const {
          data: { user },
        } = await supabaseAdmin.auth.getUser(token);
        userId = user?.id || null;
      }
    } catch (error) {
      console.log('No authenticated user found, proceeding as guest');
    }

    // Create a pending payment transaction (similar to PayU pattern)
    const { data: paymentTx, error: txError } = await supabaseAdmin
      .from('payment_transactions')
      .insert({
        user_id: userId,
        quote_id: quoteIds[0], // Primary quote ID
        amount: amount,
        currency: currency,
        status: 'pending',
        payment_method: 'paypal',
        paypal_order_id: paypalOrderData.id,
        gateway_response: {
          order_id: paypalOrderData.id,
          status: paypalOrderData.status,
          links: paypalOrderData.links,
          quote_ids: quoteIds,
          transaction_id: transactionId,
          original_amount: originalAmount,
          original_currency: originalCurrency,
          paypal_amount: paypalAmount,
          paypal_currency: paypalCurrency,
          exchange_rate: exchangeRate,
          currency_converted: originalCurrency === 'NPR',
          created_at: new Date().toISOString(),
        },
      })
      .select()
      .single();

    if (txError) {
      console.log('⚠️ Could not store payment transaction:', txError);
      // Try guest checkout session as fallback
      const sessionId = crypto.randomUUID();
      const { error: sessionError } = await supabaseAdmin.from('checkout_sessions').insert({
        id: sessionId,
        session_token: crypto.randomUUID(),
        quote_ids: quoteIds,
        is_guest: true,
        checkout_data: {
          amount: amount,
          currency: currency,
          customer_email: customerEmail,
          customer_name: customerName,
          transaction_id: transactionId,
          paypal_order_id: paypalOrderData.id,
          created_at: new Date().toISOString(),
        },
        metadata: {
          paypal_order_id: paypalOrderData.id,
        },
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      if (sessionError) {
        console.log('⚠️ Could not store session either:', sessionError);
      }
    }

    console.log('✅ PayPal checkout completed successfully');
    console.log('🔗 Approval URL:', approvalUrl);

    // Return response similar to PayU pattern - just the redirect URL
    return new Response(
      JSON.stringify({
        success: true,
        url: approvalUrl,
        transactionId: transactionId,
        order_id: paypalOrderData.id,
        // Include currency conversion info for display
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

    if (error instanceof AuthError) {
      return createAuthErrorResponse(error, createCorsHeaders(req));
    }

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
