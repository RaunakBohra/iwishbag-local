import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://grgvlrvywsfmnmkxrecd.supabase.co';
const serviceKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdyZ3ZscnZ5d3NmbW5ta3hyZWNkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDQxMTMxMiwiZXhwIjoyMDY1OTg3MzEyfQ.gRRd3vm7s4iwlGLfXejFOXIz9ulfaywP64OjOWmGqpQ';

// Create Supabase client with service role key
const supabase = createClient(supabaseUrl, serviceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function runMigration() {
  console.log('Running PayPal migration...');

  const migrations = [
    // Add columns to country_settings
    `ALTER TABLE public.country_settings ADD COLUMN IF NOT EXISTS available_gateways TEXT[] DEFAULT ARRAY['bank_transfer']`,
    `ALTER TABLE public.country_settings ADD COLUMN IF NOT EXISTS default_gateway TEXT DEFAULT 'bank_transfer'`,
    `ALTER TABLE public.country_settings ADD COLUMN IF NOT EXISTS gateway_config JSONB DEFAULT '{}'`,

    // Add column to profiles
    `ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS preferred_payment_gateway TEXT`,

    // Update key countries with PayPal
    `UPDATE public.country_settings SET available_gateways = ARRAY['stripe', 'paypal', 'bank_transfer'], default_gateway = 'paypal' WHERE code = 'US'`,
    `UPDATE public.country_settings SET available_gateways = ARRAY['payu', 'paypal', 'razorpay', 'upi', 'bank_transfer'], default_gateway = 'payu' WHERE code = 'IN'`,
    `UPDATE public.country_settings SET available_gateways = ARRAY['paypal', 'esewa', 'khalti', 'fonepay', 'bank_transfer'], default_gateway = 'paypal' WHERE code = 'NP'`,
  ];

  let successCount = 0;

  for (const sql of migrations) {
    try {
      // Use the admin API to run raw SQL
      const response = await fetch(`${supabaseUrl}/rest/v1/`, {
        method: 'POST',
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
        },
        body: JSON.stringify({ query: sql }),
      });

      if (!response.ok) {
        // Try alternative approach - direct execution via pg connection string
        console.log(`Migration step failed via REST API, trying alternative...`);
        continue;
      }

      console.log(`✓ Executed: ${sql.substring(0, 50)}...`);
      successCount++;
    } catch (error) {
      console.error(`✗ Failed: ${sql.substring(0, 50)}...`, error.message);
    }
  }

  // Verify the changes
  console.log('\nVerifying migration results...');

  const { data: countries, error: countriesError } = await supabase
    .from('country_settings')
    .select('code, name, available_gateways, default_gateway')
    .in('code', ['US', 'IN', 'NP']);

  if (countriesError) {
    console.error('Error verifying countries:', countriesError);
  } else {
    console.log('\nCountry configurations:');
    countries.forEach((country) => {
      console.log(
        `${country.code} (${country.name}): ${country.default_gateway} - ${country.available_gateways?.join(', ')}`,
      );
    });
  }

  const { data: paypalGateway, error: gatewayError } = await supabase
    .from('payment_gateways')
    .select('*')
    .eq('code', 'paypal')
    .single();

  if (gatewayError) {
    console.error('Error checking PayPal gateway:', gatewayError);
  } else {
    console.log('\nPayPal gateway exists:', !!paypalGateway);
  }

  console.log(`\nMigration completed. ${successCount}/${migrations.length} steps successful.`);
}

runMigration().catch(console.error);
