import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Your Supabase credentials
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://grgvlrvywsfmnmkxrecd.supabase.co';
const supabaseServiceKey =
  process.env.VITE_SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
  console.error('❌ VITE_SUPABASE_SERVICE_KEY not found in .env file');
  process.exit(1);
}

console.log('✅ Using Supabase URL:', supabaseUrl);
console.log('✅ Service key found, length:', supabaseServiceKey.length);

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigrations() {
  console.log('🚀 Starting PayPal migration to cloud database...\n');

  const results = {
    success: [],
    failed: [],
  };

  // 1. Add PayPal gateway
  console.log('📝 Step 1: Adding PayPal gateway...');
  try {
    const { error } = await supabase.from('payment_gateways').upsert(
      {
        name: 'PayPal',
        code: 'paypal',
        is_active: true,
        supported_countries: [
          'US',
          'CA',
          'GB',
          'AU',
          'DE',
          'FR',
          'IT',
          'ES',
          'NL',
          'BE',
          'AT',
          'CH',
          'SE',
          'NO',
          'DK',
          'FI',
          'PL',
          'CZ',
          'HU',
          'SG',
          'MY',
          'TH',
          'PH',
          'VN',
          'IN',
          'NP',
          'BD',
          'LK',
          'PK',
          'AE',
          'SA',
          'KW',
          'QA',
          'BH',
          'OM',
          'JO',
          'LB',
          'EG',
          'MA',
          'TN',
          'DZ',
          'NG',
          'GH',
          'KE',
          'UG',
          'TZ',
          'ZA',
          'BR',
          'MX',
          'AR',
          'CL',
          'CO',
          'PE',
          'UY',
          'PY',
          'BO',
          'EC',
          'VE',
        ],
        supported_currencies: [
          'USD',
          'EUR',
          'GBP',
          'CAD',
          'AUD',
          'JPY',
          'SGD',
          'MYR',
          'THB',
          'PHP',
          'VND',
          'INR',
          'NPR',
          'BDT',
          'LKR',
          'PKR',
          'AED',
          'SAR',
          'KWD',
          'QAR',
          'BHD',
          'OMR',
          'JOD',
          'LBP',
          'EGP',
          'MAD',
          'TND',
          'DZD',
          'NGN',
          'GHS',
          'KES',
          'UGX',
          'TZS',
          'ZAR',
          'BRL',
          'MXN',
          'ARS',
          'CLP',
          'COP',
          'PEN',
          'UYU',
          'PYG',
          'BOB',
          'VES',
        ],
        fee_percent: 3.49,
        fee_fixed: 0.49,
        priority: 2,
        config: {
          environment: 'sandbox',
          client_id_sandbox: '',
          client_secret_sandbox: '',
          client_id_live: '',
          client_secret_live: '',
          webhook_id: '',
          supported_funding_sources: ['paypal', 'card', 'venmo', 'applepay', 'googlepay'],
          supported_payment_methods: ['paypal', 'card'],
          merchant_account_id: '',
          partner_attribution_id: 'iwishBag_Cart_SPB',
        },
        test_mode: true,
      },
      {
        onConflict: 'code',
      },
    );

    if (error) throw error;
    console.log('✅ PayPal gateway added successfully');
    results.success.push('PayPal gateway added');
  } catch (error) {
    console.error('❌ Failed to add PayPal gateway:', error.message);
    results.failed.push(`PayPal gateway: ${error.message}`);
  }

  // 2. Add profile column
  console.log('\n📝 Step 2: Adding preferred_payment_gateway column to profiles...');
  try {
    const { error } = await supabase.rpc('exec_sql', {
      sql: `ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS preferred_payment_gateway TEXT;`,
    });

    if (error && !error.message.includes('already exists')) throw error;
    console.log('✅ Profile column added successfully');
    results.success.push('Profile column added');
  } catch (error) {
    console.error('❌ Failed to add profile column:', error.message);
    results.failed.push(`Profile column: ${error.message}`);
  }

  // 3. Add country_settings columns
  console.log('\n📝 Step 3: Adding gateway columns to country_settings...');
  const countryColumns = [
    `ALTER TABLE public.country_settings ADD COLUMN IF NOT EXISTS available_gateways TEXT[] DEFAULT ARRAY['bank_transfer'];`,
    `ALTER TABLE public.country_settings ADD COLUMN IF NOT EXISTS default_gateway TEXT DEFAULT 'bank_transfer';`,
    `ALTER TABLE public.country_settings ADD COLUMN IF NOT EXISTS gateway_config JSONB DEFAULT '{}';`,
  ];

  for (const sql of countryColumns) {
    try {
      const { error } = await supabase.rpc('exec_sql', { sql });
      if (error && !error.message.includes('already exists')) throw error;
    } catch (error) {
      console.error('❌ Failed to add country column:', error.message);
      results.failed.push(`Country column: ${error.message}`);
    }
  }
  console.log('✅ Country settings columns added successfully');
  results.success.push('Country settings columns added');

  // 4. Update country configurations
  console.log('\n📝 Step 4: Updating country configurations...');

  const countryUpdates = [
    {
      code: 'US',
      available_gateways: ['stripe', 'paypal', 'bank_transfer'],
      default_gateway: 'paypal',
      gateway_config: {
        paypal_priority: 1,
        stripe_priority: 2,
        preferred_for_amount_above: 50.0,
      },
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
        preferred_for_amount_above: 500.0,
      },
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
        preferred_for_amount_above: 100.0,
      },
    },
  ];

  for (const update of countryUpdates) {
    try {
      const { error } = await supabase
        .from('country_settings')
        .update({
          available_gateways: update.available_gateways,
          default_gateway: update.default_gateway,
          gateway_config: update.gateway_config,
        })
        .eq('code', update.code);

      if (error) throw error;
      console.log(`✅ Updated ${update.code} configuration`);
      results.success.push(`${update.code} configuration updated`);
    } catch (error) {
      console.error(`❌ Failed to update ${update.code}:`, error.message);
      results.failed.push(`${update.code} update: ${error.message}`);
    }
  }

  // 5. Create helper functions
  console.log('\n📝 Step 5: Creating helper functions...');
  const functions = [
    {
      name: 'get_recommended_gateway',
      sql: `
        CREATE OR REPLACE FUNCTION get_recommended_gateway(
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
        $$ LANGUAGE plpgsql SECURITY DEFINER;
      `,
    },
    {
      name: 'is_gateway_available',
      sql: `
        CREATE OR REPLACE FUNCTION is_gateway_available(
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
        $$ LANGUAGE plpgsql SECURITY DEFINER;
      `,
    },
  ];

  for (const func of functions) {
    try {
      const { error } = await supabase.rpc('exec_sql', { sql: func.sql });
      if (error) throw error;
      console.log(`✅ Created function: ${func.name}`);
      results.success.push(`Function ${func.name} created`);
    } catch (error) {
      console.error(`❌ Failed to create function ${func.name}:`, error.message);
      results.failed.push(`Function ${func.name}: ${error.message}`);
    }
  }

  // 6. Verify setup
  console.log('\n🔍 Verifying setup...');

  // Check PayPal gateway
  const { data: paypalGateway } = await supabase
    .from('payment_gateways')
    .select('*')
    .eq('code', 'paypal')
    .single();

  // Check country configurations
  const { data: countries } = await supabase
    .from('country_settings')
    .select('code, default_gateway, available_gateways')
    .in('code', ['US', 'IN', 'NP']);

  console.log('\n📊 Migration Summary:');
  console.log('===================');
  console.log(`✅ Successful operations: ${results.success.length}`);
  results.success.forEach((op) => console.log(`   - ${op}`));

  if (results.failed.length > 0) {
    console.log(`\n❌ Failed operations: ${results.failed.length}`);
    results.failed.forEach((op) => console.log(`   - ${op}`));
  }

  console.log('\n📊 Verification Results:');
  console.log('PayPal Gateway:', paypalGateway ? '✅ Added' : '❌ Not found');
  console.log('Countries configured:', countries?.length || 0);

  if (countries) {
    countries.forEach((country) => {
      console.log(
        `   - ${country.code}: ${country.default_gateway} gateway, ${country.available_gateways.length} available`,
      );
    });
  }

  console.log('\n🎉 PayPal migration completed!');

  return {
    success: results.success.length,
    failed: results.failed.length,
    paypalGateway: !!paypalGateway,
    countriesConfigured: countries?.length || 0,
  };
}

// Run the migration
runMigrations()
  .then((result) => {
    console.log('\n✅ Migration finished successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  });
