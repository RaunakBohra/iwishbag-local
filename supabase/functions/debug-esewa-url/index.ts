import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { createCorsHeaders } from '../_shared/cors.ts';

serve(async (req) => {
  const corsHeaders = createCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get eSewa configuration
    const { data: esewaGateway, error } = await supabaseAdmin
      .from('payment_gateways')
      .select('code, config, test_mode')
      .eq('code', 'esewa')
      .single();

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const config = esewaGateway.config;
    const testUrl = config.test_url;
    const liveUrl = config.live_url;

    // Debug the URLs
    const debugInfo = {
      raw_config: config,
      test_url: testUrl,
      live_url: liveUrl,
      test_url_length: testUrl.length,
      live_url_length: liveUrl.length,
      test_url_chars: testUrl.split('').map((c, i) => ({ pos: i, char: c, code: c.charCodeAt(0) })),
      test_url_includes_epay: testUrl.includes('epay'),
      test_url_includes_e_pay: testUrl.includes('e  pay'),
      test_url_encoded: encodeURIComponent(testUrl),
      expected_url: 'https://rc-epay.esewa.com.np/api/epay/main/v2/form',
      urls_match: testUrl === 'https://rc-epay.esewa.com.np/api/epay/main/v2/form',
    };

    // Fix the URL if it's corrupted
    if (debugInfo.test_url_includes_e_pay || !debugInfo.urls_match) {
      console.log('🔧 Fixing corrupted eSewa URL...');
      
      const fixedConfig = {
        ...config,
        test_url: 'https://rc-epay.esewa.com.np/api/epay/main/v2/form',
        live_url: 'https://epay.esewa.com.np/api/epay/main/v2/form',
      };

      const { error: updateError } = await supabaseAdmin
        .from('payment_gateways')
        .update({ config: fixedConfig })
        .eq('code', 'esewa');

      if (updateError) {
        debugInfo.fix_error = updateError.message;
      } else {
        debugInfo.fixed = true;
        debugInfo.new_test_url = fixedConfig.test_url;
        debugInfo.new_live_url = fixedConfig.live_url;
      }
    }

    return new Response(JSON.stringify(debugInfo, null, 2), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});