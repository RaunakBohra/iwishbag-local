import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function getWebhookSecret() {
  console.log('🔍 Fetching Stripe webhook secret from database...\n');

  const { data: stripeGateway, error } = await supabase
    .from('payment_gateways')
    .select('config')
    .eq('code', 'stripe')
    .single();

  if (error) {
    console.error('❌ Error fetching Stripe gateway:', error);
    return;
  }

  console.log('Current Stripe configuration:');
  console.log('- Test mode:', stripeGateway.config.test_mode !== false);
  console.log(
    '- Has test keys:',
    !!stripeGateway.config.test_secret_key && !!stripeGateway.config.test_publishable_key,
  );
  console.log('- Has webhook secret:', !!stripeGateway.config.webhook_secret);

  if (stripeGateway.config.webhook_secret) {
    console.log('\n🔑 Webhook secret found:');
    console.log(stripeGateway.config.webhook_secret);

    // Check if it's the CLI secret or a real one
    if (
      stripeGateway.config.webhook_secret.startsWith(
        'whsec_879fb65ea8800b283ebf57b86f81d8075897fcaa',
      )
    ) {
      console.log('\n⚠️  This is the Stripe CLI webhook secret (for local testing)');
    } else {
      console.log('\n✅ This appears to be the production webhook secret');
    }
  } else {
    console.log('\n❌ No webhook secret found in database');
  }
}

getWebhookSecret().catch(console.error);
