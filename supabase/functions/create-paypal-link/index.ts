import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { createCorsHeaders } from '../_shared/cors.ts';
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: createCorsHeaders(req),
    });
  }
  try {
    console.log('PayPal payment link creation started');
    // Parse request
    const linkRequest = await req.json();
    console.log('Request received:', {
      title: linkRequest.title,
      amount: linkRequest.amount,
      currency: linkRequest.currency,
      quote_id: linkRequest.quote_id,
      user_id: linkRequest.user_id,
      expires_in_hours: linkRequest.expires_in_hours,
      max_uses: linkRequest.max_uses,
    });
    const {
      title,
      description,
      amount,
      currency = 'USD',
      quote_id,
      user_id,
      expires_in_hours = 48,
      max_uses = 1,
      allow_partial_payment = false,
      minimum_payment_amount,
      payment_note,
      custom_redirect_url,
      is_public = true,
      metadata = {},
    } = linkRequest;
    // Validate required fields
    if (!title || !amount || amount <= 0) {
      return new Response(
        JSON.stringify({
          error: 'Missing required fields: title and amount > 0',
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
    // Get authenticated user
    const authHeader = req.headers.get('authorization');
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );
    const {
      data: { user },
      error: userError,
    } = await supabaseAdmin.auth.getUser(authHeader?.replace('Bearer ', '') || '');
    if (userError || !user) {
      console.error('Auth error:', userError);
      return new Response(
        JSON.stringify({
          error: 'Unauthorized',
        }),
        {
          status: 401,
          headers: {
            ...createCorsHeaders(req),
            'Content-Type': 'application/json',
          },
        },
      );
    }
    console.log('User authenticated:', user.id);
    // Validate quote_id if provided
    if (quote_id && quote_id.trim() !== '') {
      const { data: quote, error: quoteError } = await supabaseAdmin
        .from('quotes_v2')
        .select('id, status')
        .eq('id', quote_id)
        .single();
      if (quoteError || !quote) {
        console.error('Quote validation failed:', quoteError);
        return new Response(
          JSON.stringify({
            error: 'Invalid quote ID provided',
            details: 'Quote not found or access denied',
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
      console.log('Quote validated:', quote.id, 'Status:', quote.status);
    }
    // Validate user_id if provided
    if (user_id && user_id.trim() !== '') {
      const { data: profile, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('id', user_id)
        .single();
      if (profileError || !profile) {
        console.error('User validation failed:', profileError);
        return new Response(
          JSON.stringify({
            error: 'Invalid user ID provided',
            details: 'User profile not found',
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
      console.log('User validated:', profile.id);
    }
    // Generate unique link code
    const { data: linkCode, error: codeError } = await supabaseAdmin.rpc(
      'generate_payment_link_code',
    );
    if (codeError || !linkCode) {
      console.error('Failed to generate link code:', codeError);
      return new Response(
        JSON.stringify({
          error: 'Failed to generate link code',
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
    // Get PayPal configuration
    const { data: paypalGateway, error: gatewayError } = await supabaseAdmin
      .from('payment_gateways')
      .select('config, test_mode')
      .eq('code', 'paypal')
      .single();
    if (gatewayError || !paypalGateway) {
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
    const paypalConfig = {
      client_id: config.client_id,
      client_secret: config.client_secret,
      base_url: testMode ? 'https://api-m.sandbox.paypal.com' : 'https://api-m.paypal.com',
    };
    if (!paypalConfig.client_id || !paypalConfig.client_secret) {
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
    // Get PayPal access token
    const authString = btoa(`${paypalConfig.client_id}:${paypalConfig.client_secret}`);
    const tokenResponse = await fetch(`${paypalConfig.base_url}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${authString}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });
    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error('PayPal auth error:', errorData);
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
    // Prepare redirect URLs
    // Try to get app URL from environment, fallback to deriving from Supabase URL
    let baseUrl = Deno.env.get('APP_URL') || Deno.env.get('VERCEL_URL');
    if (!baseUrl) {
      // Try to derive from Supabase URL as fallback
      const supabaseUrl = Deno.env.get('SUPABASE_URL');
      if (supabaseUrl && supabaseUrl.includes('supabase.co')) {
        // Production deployment domain
        baseUrl = 'https://whyteclub.com';
      } else {
        baseUrl = 'http://localhost:5173'; // Local development
      }
    }
    // Ensure baseUrl has protocol
    if (baseUrl && !baseUrl.startsWith('http')) {
      baseUrl = `https://${baseUrl}`;
    }
    console.log('Using base URL:', baseUrl);
    const successUrl = custom_redirect_url || `${baseUrl}/payment/success?link=${linkCode}`;
    const cancelUrl = `${baseUrl}/payment/cancelled?link=${linkCode}`;
    // Create PayPal payment order (not a payment link)
    // PayPal doesn't have dedicated "payment links" - we create orders and use the approval URL
    const paypalPaymentRequest = {
      intent: 'CAPTURE',
      purchase_units: [
        {
          amount: {
            currency_code: currency,
            value: amount.toFixed(2),
          },
          description: description || title,
          custom_id: linkCode,
          invoice_id: `LINK_${linkCode}_${Date.now()}`,
        },
      ],
      application_context: {
        brand_name: 'iwishBag',
        locale: 'en-US',
        landing_page: 'LOGIN',
        shipping_preference: 'NO_SHIPPING',
        user_action: 'PAY_NOW',
        return_url: successUrl,
        cancel_url: cancelUrl,
      },
    };
    console.log('Creating PayPal payment link:', {
      link_code: linkCode,
      amount: amount,
      currency: currency,
      title: title,
    });
    // Create payment with PayPal
    const paymentResponse = await fetch(`${paypalConfig.base_url}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'PayPal-Request-Id': `LINK_${linkCode}_${Date.now()}`,
        Prefer: 'return=representation',
      },
      body: JSON.stringify(paypalPaymentRequest),
    });
    const paymentData = await paymentResponse.json();
    console.log('PayPal API Response Status:', paymentResponse.status);
    console.log('PayPal API Response Data:', JSON.stringify(paymentData, null, 2));
    if (!paymentResponse.ok) {
      console.error('PayPal payment creation error:', paymentData);
      return new Response(
        JSON.stringify({
          error: 'PayPal payment link creation failed',
          status: paymentResponse.status,
          details: paymentData,
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
    // Extract PayPal payment URL - try different link types
    console.log('PayPal response links:', paymentData.links);
    let paypalUrl = null;
    // Method 1: Look for 'approve' rel (most common)
    paypalUrl = paymentData.links?.find((link) => link.rel === 'approve')?.href;
    console.log('Method 1 (approve):', paypalUrl || 'Not found');
    // Method 2: Look for 'payer-action' rel
    if (!paypalUrl) {
      paypalUrl = paymentData.links?.find((link) => link.rel === 'payer-action')?.href;
      console.log('Method 2 (payer-action):', paypalUrl || 'Not found');
    }
    // Method 3: Look for any link containing 'checkout'
    if (!paypalUrl) {
      paypalUrl = paymentData.links?.find((link) => link.href?.includes('checkout'))?.href;
      console.log('Method 3 (checkout):', paypalUrl || 'Not found');
    }
    // Method 4: Look for any GET method link
    if (!paypalUrl) {
      paypalUrl = paymentData.links?.find((link) => link.method === 'GET')?.href;
      console.log('Method 4 (GET method):', paypalUrl || 'Not found');
    }
    // Method 5: Look for any HATEOAS link with rel containing 'approve'
    if (!paypalUrl) {
      paypalUrl = paymentData.links?.find((link) => link.rel?.includes('approve'))?.href;
      console.log('Method 5 (contains approve):', paypalUrl || 'Not found');
    }
    console.log('Final PayPal URL:', paypalUrl);
    if (!paypalUrl) {
      return new Response(
        JSON.stringify({
          error: 'No PayPal payment URL found in response',
          debug: {
            paypal_response: paymentData,
            available_links: paymentData.links?.map((l) => ({
              rel: l.rel,
              href: l.href,
              method: l.method,
            })),
            response_status: paymentResponse.status,
            response_headers: Object.fromEntries(paymentResponse.headers.entries()),
          },
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
    // Calculate expiration date
    const expiresAt =
      expires_in_hours > 0
        ? new Date(Date.now() + expires_in_hours * 60 * 60 * 1000).toISOString()
        : null;
    // Prepare database insert data with proper null handling
    const insertData = {
      link_code: linkCode,
      paypal_link_id: paymentData.id,
      title: title,
      description: description || null,
      amount: amount,
      currency: currency,
      quote_id: quote_id && quote_id.trim() !== '' ? quote_id : null,
      user_id: user_id && user_id.trim() !== '' ? user_id : null,
      created_by: user.id,
      expires_at: expiresAt,
      max_uses: max_uses,
      allow_partial_payment: allow_partial_payment,
      minimum_payment_amount:
        minimum_payment_amount && minimum_payment_amount > 0 ? minimum_payment_amount : null,
      payment_note: payment_note && payment_note.trim() !== '' ? payment_note : null,
      custom_redirect_url:
        custom_redirect_url && custom_redirect_url.trim() !== '' ? custom_redirect_url : null,
      is_public: is_public,
      metadata: metadata && Object.keys(metadata).length > 0 ? metadata : null,
      paypal_response: paymentData,
      status: 'active',
    };
    console.log('Inserting payment link with data:', {
      ...insertData,
      paypal_response: '[PayPal Response Object]', // Don't log full response
    });
    // Store payment link in database
    const { data: paymentLink, error: linkError } = await supabaseAdmin
      .from('paypal_payment_links')
      .insert(insertData)
      .select()
      .single();
    if (linkError) {
      console.error('Failed to store payment link:', linkError);
      console.error('Insert data that failed:', insertData);
      return new Response(
        JSON.stringify({
          error: 'Failed to store payment link',
          details: linkError.message,
          code: linkError.code,
          hint: linkError.hint,
          debug_data: {
            insert_data: insertData,
            user_id: user.id,
            link_code: linkCode,
          },
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
    console.log('PayPal payment link created:', {
      link_code: linkCode,
      paypal_id: paymentData.id,
      amount: amount,
      expires_at: expiresAt,
    });
    // Return the payment link details
    return new Response(
      JSON.stringify({
        success: true,
        link_code: linkCode,
        paypal_payment_id: paymentData.id,
        payment_url: paypalUrl,
        shareable_url: `${baseUrl}/pay/${linkCode}`,
        amount: amount,
        currency: currency,
        title: title,
        expires_at: expiresAt,
        max_uses: max_uses,
        status: 'active',
        details: {
          paypal_payment_id: paymentData.id,
          paypal_url: paypalUrl,
          success_url: successUrl,
          cancel_url: cancelUrl,
          link_id: paymentLink.id,
        },
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
    console.error('PayPal payment link creation error:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
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
