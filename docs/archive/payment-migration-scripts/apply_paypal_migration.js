import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://grgvlrvywsfmnmkxrecd.supabase.co';
const supabaseKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdyZ3ZscnZ5d3NmbW5ta3hyZWNkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMDIxODEzNiwiZXhwIjoyMDQ1Nzk0MTM2fQ.aZenjDCQxwMifCEYRVbY_yLrpFyTVNXqmNt2Wh4wUGY'; // Service role key for admin operations

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyPayPalMigration() {
  console.log('🚀 Starting PayPal integration migration...');

  try {
    // 1. Add PayPal gateway
    console.log('📝 Adding PayPal gateway...');
    const { error: paypalError } = await supabase.from('payment_gateways').upsert(
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
          client_id: '',
          client_secret: '',
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
        ignoreDuplicates: false,
      },
    );

    if (paypalError) {
      console.error('❌ Error adding PayPal gateway:', paypalError);
      return;
    }

    console.log('✅ PayPal gateway added successfully');

    // 2. Add columns to profiles table
    console.log('📝 Adding preferred_payment_gateway column to profiles...');
    const { error: profileError } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE public.profiles 
        ADD COLUMN IF NOT EXISTS preferred_payment_gateway TEXT;
      `,
    });

    if (profileError) {
      console.log('⚠️ Profile column might already exist:', profileError.message);
    } else {
      console.log('✅ Profile column added');
    }

    // 3. Add columns to country_settings table
    console.log('📝 Adding gateway columns to country_settings...');
    const { error: countryError } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE public.country_settings 
        ADD COLUMN IF NOT EXISTS available_gateways TEXT[] DEFAULT ARRAY['bank_transfer'];
        
        ALTER TABLE public.country_settings 
        ADD COLUMN IF NOT EXISTS default_gateway TEXT DEFAULT 'bank_transfer';
        
        ALTER TABLE public.country_settings 
        ADD COLUMN IF NOT EXISTS gateway_config JSONB DEFAULT '{}';
      `,
    });

    if (countryError) {
      console.log('⚠️ Country columns might already exist:', countryError.message);
    } else {
      console.log('✅ Country columns added');
    }

    // 4. Update some key countries with PayPal configuration
    console.log('📝 Updating country configurations...');

    // Update US
    await supabase
      .from('country_settings')
      .update({
        available_gateways: ['stripe', 'paypal', 'bank_transfer'],
        default_gateway: 'paypal',
        gateway_config: {
          paypal_priority: 1,
          stripe_priority: 2,
          preferred_for_amount_above: 50.0,
        },
      })
      .eq('code', 'US');

    // Update India
    await supabase
      .from('country_settings')
      .update({
        available_gateways: ['payu', 'paypal', 'razorpay', 'upi', 'bank_transfer'],
        default_gateway: 'payu',
        gateway_config: {
          payu_priority: 1,
          paypal_priority: 2,
          razorpay_priority: 3,
          upi_priority: 4,
          preferred_for_amount_above: 500.0,
        },
      })
      .eq('code', 'IN');

    // Update Nepal
    await supabase
      .from('country_settings')
      .update({
        available_gateways: ['paypal', 'esewa', 'khalti', 'fonepay', 'bank_transfer'],
        default_gateway: 'paypal',
        gateway_config: {
          paypal_priority: 1,
          esewa_priority: 2,
          khalti_priority: 3,
          fonepay_priority: 4,
          preferred_for_amount_above: 100.0,
        },
      })
      .eq('code', 'NP');

    console.log('✅ Country configurations updated');

    console.log('🎉 PayPal integration migration completed successfully!');

    // Verify the setup
    console.log('🔍 Verifying setup...');
    const { data: gateways } = await supabase
      .from('payment_gateways')
      .select('code, name, is_active, priority')
      .order('priority');

    console.log('📊 Available gateways:', gateways);
  } catch (error) {
    console.error('❌ Migration failed:', error);
  }
}

applyPayPalMigration();
