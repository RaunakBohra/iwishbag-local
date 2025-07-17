import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGINS') || 'https://iwishbag.com',
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Access-Control-Allow-Methods': 'GET',
  'Access-Control-Max-Age': '86400',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Check PayPal configuration
    const { data: paypalGateway, error: gatewayError } = await supabaseAdmin
      .from('payment_gateways')
      .select('*')
      .eq('code', 'paypal')
      .single();

    if (gatewayError) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'PayPal gateway not found in database',
          details: gatewayError,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    const config = paypalGateway.config || {};
    const isTestMode = paypalGateway.test_mode;

    // Check credentials
    const clientId = isTestMode ? config.client_id_sandbox : config.client_id_live;
    const clientSecret = isTestMode ? config.client_secret_sandbox : config.client_secret_live;

    const result = {
      success: true,
      gateway_found: true,
      is_active: paypalGateway.is_active,
      test_mode: isTestMode,
      has_client_id: !!clientId,
      has_client_secret: !!clientSecret,
      client_id_preview: clientId ? clientId.substring(0, 10) + '...' : 'NOT SET',
      config_keys: Object.keys(config),
      full_config: paypalGateway,
    };

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }
});
