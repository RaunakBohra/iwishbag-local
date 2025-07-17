import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  console.log('🔍 Stripe Webhook Debug - Request received');
  console.log('Method:', req.method);
  console.log('Headers:', Object.fromEntries(req.headers.entries()));

  // Log all headers to see what's being sent
  const headers = Object.fromEntries(req.headers.entries());
  console.log('Authorization header:', headers['authorization']);
  console.log('Stripe-Signature header:', headers['stripe-signature']);

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const signature = req.headers.get('stripe-signature');

  if (!signature) {
    console.log('❌ No stripe-signature header found');
    return new Response('No signature', { status: 400 });
  }

  console.log('✅ Stripe signature found:', signature.substring(0, 50) + '...');

  try {
    const body = await req.text();
    console.log('📦 Request body length:', body.length);
    console.log('📦 Body preview:', body.substring(0, 200) + '...');

    // Initialize Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Get Stripe config from database
    const { data: stripeGateway, error: configError } = await supabaseAdmin
      .from('payment_gateways')
      .select('config, test_mode')
      .eq('code', 'stripe')
      .single();

    if (configError || !stripeGateway) {
      console.error('❌ Failed to get Stripe config:', configError);
      return new Response('Configuration error', { status: 500 });
    }

    console.log('✅ Stripe config loaded');
    console.log('Test mode:', stripeGateway.test_mode);
    console.log('Has webhook secret:', !!stripeGateway.config?.webhook_secret);
    console.log(
      'Webhook secret preview:',
      stripeGateway.config?.webhook_secret?.substring(0, 20) + '...',
    );

    return new Response(
      JSON.stringify({
        debug: true,
        message: 'Debug info logged - check function logs',
        hasSignature: !!signature,
        hasWebhookSecret: !!stripeGateway.config?.webhook_secret,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  } catch (err) {
    console.error('❌ Debug webhook error:', err);
    return new Response(`Debug Error: ${err.message}`, {
      status: 500,
    });
  }
});
