import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { authenticateUser, requireAdmin, AuthError, createAuthErrorResponse, validateMethod } from '../_shared/auth.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGINS') || 'https://iwishbag.com',
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Access-Control-Allow-Methods': 'POST',
  'Access-Control-Max-Age': '86400',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Validate request method
    validateMethod(req, ['POST']);

    // Authenticate user and require admin access
    const { user, supabaseClient } = await authenticateUser(req);
    await requireAdmin(supabaseClient, user.id);

    console.log(`🔐 Admin user ${user.email} initiated SQL changes`);

    // Use service role for administrative operations
    const supabaseServiceClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    console.log('🚀 Applying PayPal integration changes...')

    // SQL commands to execute
    const sqlCommands = [
      // Add PayPal gateway
      `INSERT INTO public.payment_gateways (
        name, code, is_active, supported_countries, supported_currencies, 
        fee_percent, fee_fixed, priority, config, test_mode
      ) VALUES (
        'PayPal',
        'paypal',
        true,
        ARRAY['US','CA','GB','AU','DE','FR','IT','ES','NL','BE','AT','CH','SE','NO','DK','FI','PL','CZ','HU','SG','MY','TH','PH','VN','IN','NP','BD','LK','PK','AE','SA','KW','QA','BH','OM','JO','LB','EG','MA','TN','DZ','NG','GH','KE','UG','TZ','ZA','BR','MX','AR','CL','CO','PE','UY','PY','BO','EC','VE'],
        ARRAY['USD','EUR','GBP','CAD','AUD','JPY','SGD','MYR','THB','PHP','VND','INR','NPR','BDT','LKR','PKR','AED','SAR','KWD','QAR','BHD','OMR','JOD','LBP','EGP','MAD','TND','DZD','NGN','GHS','KES','UGX','TZS','ZAR','BRL','MXN','ARS','CLP','COP','PEN','UYU','PYG','BOB','VES'],
        3.49,
        0.49,
        2,
        '{"environment":"sandbox","client_id_sandbox":"","client_secret_sandbox":"","client_id_live":"","client_secret_live":"","webhook_id":"","supported_funding_sources":["paypal","card","venmo","applepay","googlepay"],"supported_payment_methods":["paypal","card"],"merchant_account_id":"","partner_attribution_id":"iwishBag_Cart_SPB"}',
        true
      ) ON CONFLICT (code) DO UPDATE SET
        supported_countries = EXCLUDED.supported_countries,
        supported_currencies = EXCLUDED.supported_currencies,
        fee_percent = EXCLUDED.fee_percent,
        fee_fixed = EXCLUDED.fee_fixed,
        priority = EXCLUDED.priority,
        config = EXCLUDED.config,
        test_mode = EXCLUDED.test_mode,
        updated_at = now()`,

      // Add customer preference column to profiles
      `ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS preferred_payment_gateway TEXT`,

      // Add gateway configuration columns to country_settings
      `ALTER TABLE public.country_settings ADD COLUMN IF NOT EXISTS available_gateways TEXT[] DEFAULT ARRAY['bank_transfer']`,
      `ALTER TABLE public.country_settings ADD COLUMN IF NOT EXISTS default_gateway TEXT DEFAULT 'bank_transfer'`,
      `ALTER TABLE public.country_settings ADD COLUMN IF NOT EXISTS gateway_config JSONB DEFAULT '{}'`
    ]

    const countryUpdates = [
      // Update US
      `UPDATE public.country_settings 
       SET available_gateways = ARRAY['stripe', 'paypal', 'bank_transfer'],
           default_gateway = 'paypal',
           gateway_config = '{"paypal_priority": 1, "stripe_priority": 2, "preferred_for_amount_above": 50.00}'
       WHERE code = 'US'`,

      // Update India  
      `UPDATE public.country_settings 
       SET available_gateways = ARRAY['payu', 'paypal', 'razorpay', 'upi', 'bank_transfer'],
           default_gateway = 'payu',
           gateway_config = '{"payu_priority": 1, "paypal_priority": 2, "razorpay_priority": 3, "upi_priority": 4, "preferred_for_amount_above": 500.00}'
       WHERE code = 'IN'`,

      // Update Nepal
      `UPDATE public.country_settings 
       SET available_gateways = ARRAY['paypal', 'esewa', 'khalti', 'fonepay', 'bank_transfer'],
           default_gateway = 'paypal',
           gateway_config = '{"paypal_priority": 1, "esewa_priority": 2, "khalti_priority": 3, "fonepay_priority": 4, "preferred_for_amount_above": 100.00}'
       WHERE code = 'NP'`
    ]

    // Execute SQL commands
    let successCount = 0
    let errorCount = 0
    
    for (const sql of sqlCommands) {
      try {
        console.log(`📝 Executing: ${sql.substring(0, 50)}...`)
        const { error } = await supabaseServiceClient.rpc('exec_sql', { sql_query: sql })
        if (error) {
          console.error(`❌ Error:`, error)
          errorCount++
        } else {
          console.log(`✅ Success`)
          successCount++
        }
      } catch (err) {
        console.error(`❌ Exception:`, err)
        errorCount++
      }
    }

    for (const sql of countryUpdates) {
      try {
        console.log(`📝 Executing country update...`)
        const { error } = await supabaseServiceClient.rpc('exec_sql', { sql_query: sql })
        if (error) {
          console.error(`❌ Error:`, error)
          errorCount++
        } else {
          console.log(`✅ Success`)
          successCount++
        }
      } catch (err) {
        console.error(`❌ Exception:`, err)
        errorCount++
      }
    }

    // Verify PayPal was added
    const { data: paypalGateway } = await supabaseServiceClient
      .from('payment_gateways')
      .select('*')
      .eq('code', 'paypal')
      .single()

    const { data: countries } = await supabaseServiceClient
      .from('country_settings')
      .select('code, default_gateway, available_gateways')
      .in('code', ['US', 'IN', 'NP'])

    return new Response(
      JSON.stringify({
        success: true,
        message: 'PayPal integration changes applied successfully',
        results: {
          successful_operations: successCount,
          failed_operations: errorCount,
          paypal_gateway_added: !!paypalGateway,
          countries_updated: countries?.length || 0
        },
        data: {
          paypal_gateway: paypalGateway,
          updated_countries: countries
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('❌ PayPal integration failed:', error)
    
    if (error instanceof AuthError) {
      return createAuthErrorResponse(error, corsHeaders);
    }
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        message: 'PayPal integration changes failed'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})