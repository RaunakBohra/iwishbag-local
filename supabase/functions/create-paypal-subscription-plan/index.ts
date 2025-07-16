import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};
serve(async (req)=>{
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }
  try {
    console.log('PayPal subscription plan creation started');
    // Parse request
    const planRequest = await req.json();
    const { plan_name, plan_description, plan_type, amount, setup_fee = 0, frequency, frequency_interval = 1, cycles = null, features = [], limits = {}, discount_percentage = 0, is_active = true, is_public = true, requires_approval = false, trial_days = 0, trial_amount = 0 } = planRequest;
    console.log('Plan creation request:', {
      plan_name,
      plan_type,
      amount,
      frequency
    });
    // Validate required fields
    if (!plan_name || !plan_type || amount <= 0 || !frequency) {
      return new Response(JSON.stringify({
        error: 'Missing required fields: plan_name, plan_type, amount, frequency'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    // Get authenticated user
    const authHeader = req.headers.get('authorization');
    const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(authHeader?.replace('Bearer ', '') || '');
    if (userError || !user) {
      console.error('Auth error:', userError);
      return new Response(JSON.stringify({
        error: 'Unauthorized'
      }), {
        status: 401,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    console.log('User authenticated:', user.id);
    // Get PayPal configuration
    const { data: paypalGateway, error: gatewayError } = await supabaseAdmin.from('payment_gateways').select('config, test_mode').eq('code', 'paypal').single();
    if (gatewayError || !paypalGateway) {
      return new Response(JSON.stringify({
        error: 'PayPal configuration not found'
      }), {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    const config = paypalGateway.config || {};
    const testMode = paypalGateway.test_mode;
    const paypalConfig = {
      client_id: config.client_id,
      client_secret: config.client_secret,
      base_url: testMode ? 'https://api-m.sandbox.paypal.com' : 'https://api-m.paypal.com'
    };
    if (!paypalConfig.client_id || !paypalConfig.client_secret) {
      return new Response(JSON.stringify({
        error: 'PayPal credentials not configured'
      }), {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    // Get PayPal access token
    const authString = btoa(`${paypalConfig.client_id}:${paypalConfig.client_secret}`);
    const tokenResponse = await fetch(`${paypalConfig.base_url}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${authString}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: 'grant_type=client_credentials'
    });
    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error('PayPal auth error:', errorData);
      return new Response(JSON.stringify({
        error: 'PayPal authentication failed'
      }), {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;
    // Step 1: Create PayPal Product
    const productRequest = {
      name: plan_name,
      description: plan_description || `${plan_name} subscription plan`,
      type: 'SERVICE',
      category: 'MERCHANDISE',
      home_url: 'https://whyteclub.com'
    };
    console.log('Creating PayPal product:', productRequest);
    const productResponse = await fetch(`${paypalConfig.base_url}/v1/catalogs/products`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'PayPal-Request-Id': `PRODUCT_${Date.now()}`,
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(productRequest)
    });
    if (!productResponse.ok) {
      const errorData = await productResponse.json();
      console.error('PayPal product creation error:', errorData);
      return new Response(JSON.stringify({
        error: 'PayPal product creation failed',
        details: errorData
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    const productData = await productResponse.json();
    console.log('PayPal product created:', productData.id);
    // Step 2: Create PayPal Billing Plan
    const intervalUnit = frequency.toUpperCase() === 'WEEKLY' ? 'WEEK' : frequency.toUpperCase() === 'MONTHLY' ? 'MONTH' : frequency.toUpperCase() === 'QUARTERLY' ? 'MONTH' : frequency.toUpperCase() === 'YEARLY' ? 'YEAR' : 'MONTH';
    const intervalCount = frequency.toUpperCase() === 'QUARTERLY' ? 3 : frequency_interval;
    // Build billing cycles
    const billingCycles = [];
    // Trial period (if any)
    if (trial_days > 0) {
      billingCycles.push({
        frequency: {
          interval_unit: 'DAY',
          interval_count: trial_days
        },
        tenure_type: 'TRIAL',
        sequence: 1,
        total_cycles: 1,
        pricing_scheme: {
          fixed_price: {
            value: trial_amount.toFixed(2),
            currency_code: 'USD'
          }
        }
      });
    }
    // Regular billing cycle
    const regularCycle = {
      frequency: {
        interval_unit: intervalUnit,
        interval_count: intervalCount
      },
      tenure_type: cycles ? 'REGULAR' : 'INFINITE',
      sequence: trial_days > 0 ? 2 : 1,
      pricing_scheme: {
        fixed_price: {
          value: amount.toFixed(2),
          currency_code: 'USD'
        }
      }
    };
    if (cycles && cycles > 0) {
      regularCycle.total_cycles = cycles;
    }
    billingCycles.push(regularCycle);
    const planRequest_PayPal = {
      product_id: productData.id,
      name: plan_name,
      description: plan_description || `${plan_name} subscription plan`,
      status: is_active ? 'ACTIVE' : 'INACTIVE',
      billing_cycles: billingCycles,
      payment_preferences: {
        auto_bill_outstanding: true,
        setup_fee_failure_action: 'CONTINUE',
        payment_failure_threshold: 3
      },
      quantity_supported: false
    };
    // Add setup fee if specified
    if (setup_fee > 0) {
      planRequest_PayPal.payment_preferences.setup_fee = {
        value: setup_fee.toFixed(2),
        currency_code: 'USD'
      };
    }
    console.log('Creating PayPal billing plan:', planRequest_PayPal);
    const planResponse = await fetch(`${paypalConfig.base_url}/v1/billing/plans`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'PayPal-Request-Id': `PLAN_${Date.now()}`,
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(planRequest_PayPal)
    });
    if (!planResponse.ok) {
      const errorData = await planResponse.json();
      console.error('PayPal plan creation error:', errorData);
      return new Response(JSON.stringify({
        error: 'PayPal plan creation failed',
        details: errorData
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    const planData = await planResponse.json();
    console.log('PayPal plan created:', planData.id);
    // Step 3: Store plan in database
    const { data: plan, error: planDbError } = await supabaseAdmin.from('paypal_subscription_plans').insert({
      paypal_plan_id: planData.id,
      plan_name,
      plan_description,
      plan_type,
      currency: 'USD',
      amount,
      setup_fee,
      frequency,
      frequency_interval,
      cycles,
      features,
      limits,
      discount_percentage,
      is_active,
      is_public,
      requires_approval,
      trial_days,
      trial_amount,
      paypal_product_id: productData.id,
      paypal_links: planData.links,
      paypal_response: planData,
      created_by: user.id
    }).select().single();
    if (planDbError) {
      console.error('Failed to store plan in database:', planDbError);
      return new Response(JSON.stringify({
        error: 'Failed to store plan in database',
        details: planDbError.message
      }), {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    console.log('PayPal subscription plan created successfully:', {
      plan_id: plan.id,
      paypal_plan_id: planData.id,
      paypal_product_id: productData.id
    });
    // Return the plan details
    return new Response(JSON.stringify({
      success: true,
      plan: {
        id: plan.id,
        paypal_plan_id: planData.id,
        paypal_product_id: productData.id,
        plan_name,
        plan_type,
        amount,
        frequency,
        status: planData.status,
        links: planData.links,
        created_at: plan.created_at
      },
      paypal_product: productData,
      paypal_plan: planData
    }), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('PayPal subscription plan creation error:', error);
    console.error('Error stack:', error.stack);
    return new Response(JSON.stringify({
      error: 'Internal server error',
      details: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});
