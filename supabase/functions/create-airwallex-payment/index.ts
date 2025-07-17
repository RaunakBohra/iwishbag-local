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
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    // Get the authorization header for user context
    const authHeader = req.headers.get('Authorization');
    let userId = null;
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const {
        data: { user },
        error: authError,
      } = await supabaseAdmin.auth.getUser(token);
      if (!authError && user) {
        userId = user.id;
      }
    }
    const paymentRequest = await req.json();
    const {
      quote_ids: quoteIds,
      success_url,
      cancel_url: _cancel_url,
      metadata,
      customer_info: customerInfo,
    } = paymentRequest;
    console.log('Airwallex payment request:', {
      quoteIds,
      userId,
      metadata,
    });
    // Validate quotes and calculate total
    const { data: quotes, error: quotesError } = await supabaseAdmin
      .from('quotes')
      .select('*')
      .in('id', quoteIds);
    if (quotesError || !quotes || quotes.length === 0) {
      console.error('Error fetching quotes:', quotesError);
      return new Response(
        JSON.stringify({
          error: 'Invalid quotes',
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
    // Verify quotes belong to user (unless guest checkout)
    if (userId && !metadata?.guest_session_token) {
      const unauthorizedQuotes = quotes.filter((q) => q.user_id !== userId);
      if (unauthorizedQuotes.length > 0) {
        return new Response(
          JSON.stringify({
            error: 'Unauthorized access to quotes',
          }),
          {
            status: 403,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
            },
          },
        );
      }
    }
    // Calculate total amount
    const totalAmount = quotes.reduce((sum, quote) => sum + (quote.final_total || 0), 0);
    const totalCurrency = quotes[0].currency || 'USD';
    // Get Airwallex configuration
    const { data: airwallexGateway, error: gatewayError } = await supabaseAdmin
      .from('payment_gateways')
      .select('config, test_mode')
      .eq('code', 'airwallex')
      .single();
    if (gatewayError || !airwallexGateway) {
      console.error('Airwallex gateway not configured:', gatewayError);
      return new Response(
        JSON.stringify({
          error: 'Airwallex gateway not configured',
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
    const config = airwallexGateway.config || {};
    const testMode = airwallexGateway.test_mode;
    const apiBaseUrl =
      config.api_base_url ||
      (testMode ? 'https://api-demo.airwallex.com' : 'https://api.airwallex.com');
    const apiKey = config.api_key;
    if (!apiKey || apiKey === 'YOUR_AIRWALLEX_API_KEY') {
      console.error('Airwallex API key not configured properly:', {
        hasApiKey: !!apiKey,
        isPlaceholder: apiKey === 'YOUR_AIRWALLEX_API_KEY',
        configKeys: Object.keys(config),
      });
      return new Response(
        JSON.stringify({
          error: 'Airwallex API key not configured',
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
    // Get customer information
    let customerName = customerInfo?.name || 'Customer';
    let customerEmail = customerInfo?.email || 'customer@example.com';
    const customerPhone = customerInfo?.phone || '';
    // Try to get from quotes if not provided
    if (!customerInfo && quotes.length > 0) {
      const firstQuote = quotes[0];
      if (firstQuote.email) {
        customerEmail = firstQuote.email;
      }
      if (firstQuote.shipping_address?.recipient_name) {
        customerName = firstQuote.shipping_address.recipient_name;
      }
    }
    // Get shipping address from quotes
    let shippingAddress = null;
    const quoteWithAddress = quotes.find((q) => q.shipping_address);
    if (quoteWithAddress?.shipping_address) {
      const addr = quoteWithAddress.shipping_address;
      shippingAddress = {
        first_name: customerName.split(' ')[0] || 'Customer',
        last_name: customerName.split(' ').slice(1).join(' ') || '',
        phone_number: customerPhone || addr.phone || '',
        address: {
          street: addr.address_line_1 || addr.street || '',
          city: addr.city || '',
          state: addr.state || addr.province || '',
          postcode: addr.postal_code || addr.zip || '',
          country_code: addr.country_code || addr.country || 'US',
        },
      };
    }
    // Create Airwallex payment intent
    const paymentIntentRequest = {
      request_id: `REQ_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      amount: totalAmount,
      currency: totalCurrency,
      merchant_order_id: quoteIds.join(','),
      order: {
        type: 'goods',
      },
      metadata: {
        quote_ids: quoteIds,
        user_id: userId,
        guest_session_token: metadata?.guest_session_token,
      },
      return_url: success_url,
      customer: {
        email: customerEmail,
        first_name: customerName.split(' ')[0] || 'Customer',
        last_name: customerName.split(' ').slice(1).join(' ') || '',
        phone_number: customerPhone,
      },
      ...(shippingAddress && {
        shipping: shippingAddress,
      }),
      // Enable multiple payment methods
      payment_method_options: {
        card: {
          auto_capture: config.auto_capture !== false,
          three_ds_action: 'force_3ds', // Enhanced security
        },
      },
    };
    console.log('Creating Airwallex payment intent:', {
      url: `${apiBaseUrl}/api/v1/pa/payment_intents/create`,
      hasApiKey: !!apiKey,
      apiKeyLength: apiKey?.length,
      clientId: config.client_id || 'not-set',
      environment: config.environment,
      requestAmount: paymentIntentRequest.amount,
      requestCurrency: paymentIntentRequest.currency,
    });
    // Create payment intent
    const paymentIntentResponse = await fetch(`${apiBaseUrl}/api/v1/pa/payment_intents/create`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'x-api-version': '2024-06-14',
        'x-client-id': config.client_id || '',
        Accept: 'application/json',
      },
      body: JSON.stringify(paymentIntentRequest),
    });
    console.log('Airwallex API response status:', paymentIntentResponse.status);
    if (!paymentIntentResponse.ok) {
      const errorData = await paymentIntentResponse.text();
      console.error('Airwallex payment intent creation failed:', {
        status: paymentIntentResponse.status,
        statusText: paymentIntentResponse.statusText,
        errorData: errorData,
      });
      return new Response(
        JSON.stringify({
          error: 'Failed to create payment session',
          details: errorData,
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
    const paymentIntent = await paymentIntentResponse.json();
    console.log('Airwallex payment intent created:', paymentIntent.id);
    // Create payment transaction record
    const { data: transaction, error: transactionError } = await supabaseAdmin
      .from('payment_transactions')
      .insert({
        user_id: userId,
        quote_ids: quoteIds,
        amount: totalAmount,
        currency: totalCurrency,
        payment_method: 'airwallex',
        status: 'pending',
        gateway_transaction_id: paymentIntent.id,
        gateway_response: paymentIntent,
        metadata: {
          guest_session_token: metadata?.guest_session_token,
          customer_info: customerInfo,
        },
      })
      .select()
      .single();
    if (transactionError) {
      console.error('Error creating transaction record:', transactionError);
      return new Response(
        JSON.stringify({
          error: 'Failed to create transaction record',
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
    // Generate the hosted payment page URL
    const hostedPageUrl = `${apiBaseUrl}/pa/payment/${paymentIntent.id}?client_secret=${paymentIntent.client_secret}`;
    // Return payment session details
    return new Response(
      JSON.stringify({
        payment_url: hostedPageUrl,
        payment_intent_id: paymentIntent.id,
        client_secret: paymentIntent.client_secret,
        transaction_id: transaction.id,
        amount: totalAmount,
        currency: totalCurrency,
        status: 'created',
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      },
    );
  } catch (error) {
    console.error('Create Airwallex payment error:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: error.message,
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      },
    );
  }
});
