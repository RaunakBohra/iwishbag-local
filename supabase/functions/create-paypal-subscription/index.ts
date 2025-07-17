import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders,
    });
  }
  try {
    console.log('PayPal subscription creation started');
    // Parse request
    const subscriptionRequest = await req.json();
    const {
      plan_id,
      return_url = 'https://whyteclub.com/dashboard?subscription=success',
      cancel_url = 'https://whyteclub.com/dashboard?subscription=cancelled',
      custom_id,
      subscriber_info,
    } = subscriptionRequest;
    console.log('Subscription creation request:', {
      plan_id,
      subscriber_email: subscriber_info?.email_address,
    });
    // Validate required fields
    if (!plan_id) {
      return new Response(
        JSON.stringify({
          error: 'Missing required field: plan_id',
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
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
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        },
      );
    }
    console.log('User authenticated:', user.id);
    // Get subscription plan details
    const { data: plan, error: planError } = await supabaseAdmin
      .from('paypal_subscription_plans')
      .select('*')
      .eq('id', plan_id)
      .single();
    if (planError || !plan) {
      console.error('Plan fetch error:', planError);
      return new Response(
        JSON.stringify({
          error: 'Subscription plan not found',
          details: planError?.message,
        }),
        {
          status: 404,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        },
      );
    }
    // Check if plan is active and public
    if (!plan.is_active) {
      return new Response(
        JSON.stringify({
          error: 'Subscription plan is not active',
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        },
      );
    }
    // TEST MODE: Check if using temporary plan IDs
    const isTestMode = plan.paypal_plan_id?.startsWith('TEMP-');
    if (isTestMode) {
      console.log('TEST MODE: Using temporary plan ID, creating mock subscription');
    }
    if (!plan.is_public && plan.requires_approval) {
      // TODO: Check if user has been approved for this plan
      console.log('Plan requires approval - would need approval check here');
    }
    // Check for existing active subscription
    const { data: existingSubscription } = await supabaseAdmin
      .from('paypal_subscriptions')
      .select('id, status, paypal_subscription_id')
      .eq('user_id', user.id)
      .eq('plan_id', plan_id)
      .in('status', ['approval_pending', 'approved', 'active'])
      .single();
    if (existingSubscription) {
      return new Response(
        JSON.stringify({
          error: 'User already has an active subscription to this plan',
          existing_subscription: existingSubscription,
        }),
        {
          status: 409,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        },
      );
    }
    // Get user profile for subscriber info
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('full_name, email, phone, country')
      .eq('id', user.id)
      .single();
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
            ...corsHeaders,
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
            ...corsHeaders,
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
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        },
      );
    }
    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;
    // Prepare subscriber information
    const customerName = profile?.full_name || 'Customer';
    const nameParts = customerName.split(' ');
    const subscriberFirstName = nameParts[0] || 'Customer';
    const subscriberLastName = nameParts.slice(1).join(' ') || '';
    const defaultSubscriber = {
      name: {
        given_name: subscriberFirstName,
        surname: subscriberLastName,
      },
      email_address: profile?.email || user.email || 'customer@example.com',
    };
    // Create PayPal subscription request
    const paypalSubscriptionRequest = {
      plan_id: plan.paypal_plan_id,
      start_time: new Date(Date.now() + 60000).toISOString(),
      quantity: '1',
      subscriber: subscriber_info || defaultSubscriber,
      application_context: {
        brand_name: 'WhyteClub',
        locale: 'en-US',
        shipping_preference: 'NO_SHIPPING',
        user_action: 'SUBSCRIBE_NOW',
        payment_method: {
          payer_selected: 'PAYPAL',
          payee_preferred: 'IMMEDIATE_PAYMENT_REQUIRED',
        },
        return_url: return_url,
        cancel_url: cancel_url,
      },
    };
    // Add custom ID if provided
    if (custom_id) {
      paypalSubscriptionRequest.custom_id = custom_id;
    }
    let paypalSubscription;
    if (isTestMode) {
      // TEST MODE: Create mock subscription
      console.log('TEST MODE: Creating mock subscription without PayPal API call');
      const mockSubscriptionId = `TEST_SUB_${Date.now()}`;
      paypalSubscription = {
        id: mockSubscriptionId,
        status: 'APPROVAL_PENDING',
        status_update_time: new Date().toISOString(),
        plan_id: plan.paypal_plan_id,
        start_time: new Date(Date.now() + 60000).toISOString(),
        quantity: '1',
        subscriber: {
          name: {
            given_name: subscriberFirstName,
            surname: subscriberLastName,
          },
          email_address: profile?.email || user.email || 'customer@example.com',
          payer_id: `TEST_PAYER_${Date.now()}`,
        },
        billing_info: {
          outstanding_balance: {
            currency_code: plan.currency,
            value: '0.00',
          },
          cycle_executions: [],
          failed_payments_count: 0,
        },
        create_time: new Date().toISOString(),
        update_time: new Date().toISOString(),
        links: [
          {
            href: `https://www.sandbox.paypal.com/checkoutnow?token=${mockSubscriptionId}`,
            rel: 'approve',
            method: 'GET',
          },
          {
            href: `${return_url}?subscription_id=${mockSubscriptionId}&test_mode=true`,
            rel: 'return',
            method: 'GET',
          },
        ],
      };
      console.log('TEST MODE: Mock subscription created:', mockSubscriptionId);
    } else {
      // PRODUCTION MODE: Create real PayPal subscription
      console.log('Creating PayPal subscription:', {
        plan_id: plan.paypal_plan_id,
        user_id: user.id,
        start_time: paypalSubscriptionRequest.start_time,
      });
      // Create subscription with PayPal
      const subscriptionResponse = await fetch(
        `${paypalConfig.base_url}/v1/billing/subscriptions`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'PayPal-Request-Id': `SUB_${user.id}_${Date.now()}`,
            Prefer: 'return=representation',
          },
          body: JSON.stringify(paypalSubscriptionRequest),
        },
      );
      const subscriptionData = await subscriptionResponse.json();
      console.log('PayPal Subscription API Response Status:', subscriptionResponse.status);
      console.log(
        'PayPal Subscription API Response Data:',
        JSON.stringify(subscriptionData, null, 2),
      );
      if (!subscriptionResponse.ok) {
        console.error('PayPal subscription creation error:', subscriptionData);
        return new Response(
          JSON.stringify({
            error: 'PayPal subscription creation failed',
            status: subscriptionResponse.status,
            details: subscriptionData,
          }),
          {
            status: 400,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
            },
          },
        );
      }
      paypalSubscription = subscriptionData;
    }
    // Store subscription in database
    const { data: subscription, error: subscriptionDbError } = await supabaseAdmin
      .from('paypal_subscriptions')
      .insert({
        user_id: user.id,
        plan_id: plan_id,
        paypal_subscription_id: paypalSubscription.id,
        paypal_subscriber_id: paypalSubscription.subscriber?.payer_id,
        status: 'approval_pending',
        currency: plan.currency,
        amount: plan.amount,
        setup_fee: plan.setup_fee,
        total_cycles: plan.cycles,
        trial_end_date:
          plan.trial_days > 0
            ? new Date(Date.now() + plan.trial_days * 24 * 60 * 60 * 1000).toISOString()
            : null,
        trial_amount: plan.trial_amount,
        current_usage: {},
        paypal_links: paypalSubscription.links,
        paypal_response: paypalSubscription,
      })
      .select()
      .single();
    if (subscriptionDbError) {
      console.error('Failed to store subscription in database:', subscriptionDbError);
      return new Response(
        JSON.stringify({
          error: 'Failed to store subscription in database',
          details: subscriptionDbError.message,
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
    // Find approval URL from PayPal links
    const approvalLink = paypalSubscription.links?.find((link) => link.rel === 'approve');
    console.log('PayPal subscription created successfully:', {
      subscription_id: subscription.id,
      paypal_subscription_id: paypalSubscription.id,
      status: paypalSubscription.status,
      approval_url: approvalLink?.href,
    });
    // Return the subscription details
    return new Response(
      JSON.stringify({
        success: true,
        subscription: {
          id: subscription.id,
          paypal_subscription_id: paypalSubscription.id,
          plan_id: plan_id,
          plan_name: plan.plan_name,
          amount: plan.amount,
          currency: plan.currency,
          frequency: plan.frequency,
          status: 'approval_pending',
          approval_url: approvalLink?.href,
          return_url: return_url,
          cancel_url: cancel_url,
          created_at: subscription.created_at,
          test_mode: isTestMode,
        },
        paypal_response: paypalSubscription,
        test_mode_info: isTestMode
          ? 'This is a test subscription. In production, replace the TEMP- plan IDs with real PayPal plan IDs.'
          : undefined,
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
    console.error('PayPal subscription creation error:', error);
    console.error('Error stack:', error.stack);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString(),
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
