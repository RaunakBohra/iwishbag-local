import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('🚀 Starting PayPal integration setup...')

    // 1. Add PayPal gateway
    console.log('📝 Adding PayPal gateway...')
    const { error: paypalError } = await supabaseClient
      .from('payment_gateways')
      .upsert({
        name: 'PayPal',
        code: 'paypal',
        is_active: true,
        supported_countries: ['US', 'CA', 'GB', 'AU', 'DE', 'FR', 'IT', 'ES', 'NL', 'BE', 'AT', 'CH', 'SE', 'NO', 'DK', 'FI', 'PL', 'CZ', 'HU', 'SG', 'MY', 'TH', 'PH', 'VN', 'IN', 'NP', 'BD', 'LK', 'PK', 'AE', 'SA', 'KW', 'QA', 'BH', 'OM', 'JO', 'LB', 'EG', 'MA', 'TN', 'DZ', 'NG', 'GH', 'KE', 'UG', 'TZ', 'ZA', 'BR', 'MX', 'AR', 'CL', 'CO', 'PE', 'UY', 'PY', 'BO', 'EC', 'VE'],
        supported_currencies: ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'SGD', 'MYR', 'THB', 'PHP', 'VND', 'INR', 'NPR', 'BDT', 'LKR', 'PKR', 'AED', 'SAR', 'KWD', 'QAR', 'BHD', 'OMR', 'JOD', 'LBP', 'EGP', 'MAD', 'TND', 'DZD', 'NGN', 'GHS', 'KES', 'UGX', 'TZS', 'ZAR', 'BRL', 'MXN', 'ARS', 'CLP', 'COP', 'PEN', 'UYU', 'PYG', 'BOB', 'VES'],
        fee_percent: 3.49,
        fee_fixed: 0.49,
        priority: 2,
        config: {
          environment: 'sandbox',
          client_id: '',
          client_secret: '',
          webhook_id: '',
          supported_funding_sources: ['paypal', 'card', 'venmo', 'applepay', 'googlepay'],
          supported_payment_methods: ['paypal', 'card'],
          merchant_account_id: '',
          partner_attribution_id: 'iwishBag_Cart_SPB'
        },
        test_mode: true
      }, { 
        onConflict: 'code',
        ignoreDuplicates: false 
      })

    if (paypalError) {
      console.error('❌ Error adding PayPal gateway:', paypalError)
      throw paypalError
    }

    console.log('✅ PayPal gateway added successfully')

    // 2. Add columns using raw SQL
    console.log('📝 Adding database columns...')
    
    const migrations = [
      // Add preferred_payment_gateway to profiles
      `ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS preferred_payment_gateway TEXT`,
      
      // Add gateway columns to country_settings
      `ALTER TABLE public.country_settings ADD COLUMN IF NOT EXISTS available_gateways TEXT[] DEFAULT ARRAY['bank_transfer']`,
      `ALTER TABLE public.country_settings ADD COLUMN IF NOT EXISTS default_gateway TEXT DEFAULT 'bank_transfer'`,
      `ALTER TABLE public.country_settings ADD COLUMN IF NOT EXISTS gateway_config JSONB DEFAULT '{}'`,
      
      // Create helper functions
      `CREATE OR REPLACE FUNCTION get_recommended_gateway(
        country_code TEXT,
        amount_usd NUMERIC DEFAULT 0
      ) RETURNS TEXT AS $$
      DECLARE
        country_settings_rec RECORD;
      BEGIN
        SELECT default_gateway, available_gateways, gateway_config 
        INTO country_settings_rec
        FROM country_settings 
        WHERE code = country_code;
        
        IF NOT FOUND THEN
          RETURN 'bank_transfer';
        END IF;
        
        IF country_settings_rec.gateway_config ? 'preferred_for_amount_above' THEN
          DECLARE
            threshold NUMERIC;
          BEGIN
            threshold := (country_settings_rec.gateway_config->>'preferred_for_amount_above')::NUMERIC;
            
            IF amount_usd >= threshold THEN
              IF 'paypal' = ANY(country_settings_rec.available_gateways) THEN
                RETURN 'paypal';
              ELSIF 'stripe' = ANY(country_settings_rec.available_gateways) THEN
                RETURN 'stripe';
              END IF;
            END IF;
          END;
        END IF;
        
        RETURN country_settings_rec.default_gateway;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER`,

      `CREATE OR REPLACE FUNCTION is_gateway_available(
        country_code TEXT,
        gateway_code TEXT
      ) RETURNS BOOLEAN AS $$
      DECLARE
        available_gateways TEXT[];
      BEGIN
        SELECT cs.available_gateways 
        INTO available_gateways
        FROM country_settings cs 
        WHERE cs.code = country_code;
        
        IF NOT FOUND THEN
          RETURN FALSE;
        END IF;
        
        RETURN gateway_code = ANY(available_gateways);
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER`
    ]

    for (const sql of migrations) {
      const { error } = await supabaseClient.rpc('exec_sql', { sql_query: sql })
      if (error) {
        console.error(`❌ Error executing SQL: ${sql.substring(0, 50)}...`, error)
        // Continue with other migrations even if one fails
      }
    }

    console.log('✅ Database columns added')

    // 3. Update country configurations
    console.log('📝 Updating country configurations...')
    
    const countryUpdates = [
      {
        code: 'US',
        available_gateways: ['stripe', 'paypal', 'bank_transfer'],
        default_gateway: 'paypal',
        gateway_config: {
          paypal_priority: 1,
          stripe_priority: 2,
          preferred_for_amount_above: 50.00
        }
      },
      {
        code: 'IN',
        available_gateways: ['payu', 'paypal', 'razorpay', 'upi', 'bank_transfer'],
        default_gateway: 'payu',
        gateway_config: {
          payu_priority: 1,
          paypal_priority: 2,
          razorpay_priority: 3,
          upi_priority: 4,
          preferred_for_amount_above: 500.00
        }
      },
      {
        code: 'NP',
        available_gateways: ['paypal', 'esewa', 'khalti', 'fonepay', 'bank_transfer'],
        default_gateway: 'paypal',
        gateway_config: {
          paypal_priority: 1,
          esewa_priority: 2,
          khalti_priority: 3,
          fonepay_priority: 4,
          preferred_for_amount_above: 100.00
        }
      }
    ]

    for (const update of countryUpdates) {
      const { error } = await supabaseClient
        .from('country_settings')
        .update({
          available_gateways: update.available_gateways,
          default_gateway: update.default_gateway,
          gateway_config: update.gateway_config
        })
        .eq('code', update.code)

      if (error) {
        console.error(`❌ Error updating ${update.code}:`, error)
      } else {
        console.log(`✅ Updated ${update.code} configuration`)
      }
    }

    // 4. Verify the setup
    console.log('🔍 Verifying setup...')
    const { data: gateways } = await supabaseClient
      .from('payment_gateways')
      .select('code, name, is_active, priority')
      .order('priority')
    
    console.log('📊 Available gateways:', gateways)

    const { data: countries } = await supabaseClient
      .from('country_settings')
      .select('code, default_gateway, available_gateways')
      .in('code', ['US', 'IN', 'NP'])
    
    console.log('📊 Country configurations:', countries)

    return new Response(
      JSON.stringify({
        success: true,
        message: 'PayPal integration setup completed successfully',
        data: {
          gateways: gateways,
          countries: countries,
          timestamp: new Date().toISOString()
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('❌ PayPal setup failed:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        message: 'PayPal integration setup failed'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})