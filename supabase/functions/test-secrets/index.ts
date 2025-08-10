import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

serve(async (req) => {
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Test accessing various secrets
    const secrets = {
      'Payment Gateways': {
        payu_merchant_key: Deno.env.get('PAYU_MERCHANT_KEY') ? '✅ Set' : '❌ Missing',
        stripe_secret: Deno.env.get('STRIPE_SECRET_KEY') ? '✅ Set' : '❌ Missing',
        paypal_client_id: Deno.env.get('PAYPAL_CLIENT_ID') ? '✅ Set' : '❌ Missing',
        airwallex_api_key: Deno.env.get('AIRWALLEX_API_KEY') ? '✅ Set' : '❌ Missing',
      },
      'Email & SMS': {
        resend_api_key: Deno.env.get('RESEND_API_KEY') ? '✅ Set' : '❌ Missing',
        twilio_account_sid: Deno.env.get('TWILIO_ACCOUNT_SID') ? '✅ Set' : '❌ Missing',
        aws_access_key: Deno.env.get('AWS_ACCESS_KEY_ID') ? '✅ Set' : '❌ Missing',
        msg91_auth_key: Deno.env.get('MSG91_AUTH_KEY') ? '✅ Set' : '❌ Missing',
      },
      'OAuth & APIs': {
        google_client_id: Deno.env.get('GOOGLE_CLIENT_ID') ? '✅ Set' : '❌ Missing',
        anthropic_api_key: Deno.env.get('ANTHROPIC_API_KEY') ? '✅ Set' : '❌ Missing',
        cloudflare_api_token: Deno.env.get('CLOUDFLARE_API_TOKEN') ? '✅ Set' : '❌ Missing',
        exchangerate_api_key: Deno.env.get('EXCHANGERATE_API_KEY') ? '✅ Set' : '❌ Missing',
      }
    }

    const response = {
      success: true,
      message: 'Secret access test completed',
      timestamp: new Date().toISOString(),
      environment: 'cloud-edge-function',
      secrets: secrets,
      summary: {
        total_secrets_checked: 12,
        secrets_available: Object.values(secrets).flatMap(category => 
          Object.values(category).filter(status => status.includes('✅'))
        ).length
      }
    }

    return new Response(
      JSON.stringify(response, null, 2),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        } 
      },
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        },
        status: 500 
      },
    )
  }
})