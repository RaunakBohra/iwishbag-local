import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function findStripePayment() {
  const quoteId = '7507c37a-c892-4be6-91d0-0830c0d2403f';
  const amount = 1155.57;
  const userId = '130ec316-970f-429f-8cb8-ff9adf751248';

  console.log('🔍 Looking for Stripe payment...');
  console.log(`   Quote ID: ${quoteId}`);
  console.log(`   Amount: $${amount} USD`);
  console.log(`   User ID: ${userId}`);
  console.log(`   Time: Around 11:15 PM on July 15, 2025\n`);

  // Check Stripe CLI for recent events
  console.log('📋 Please check Stripe Dashboard or run:');
  console.log('stripe events list --limit 20\n');
  console.log('Look for:');
  console.log(`- payment_intent.succeeded events around 11:15 PM`);
  console.log(`- Amount: ${amount * 100} (in cents)`);
  console.log(`- Check the metadata for quote_ids\n`);

  // Check if webhooks were logged but not processed
  console.log('🔍 Checking webhook logs from around that time...');
  const startTime = new Date('2025-07-15T23:14:00Z');
  const endTime = new Date('2025-07-15T23:16:00Z');

  const { data: webhooks, error } = await supabase
    .from('webhook_logs')
    .select('*')
    .eq('webhook_type', 'stripe')
    .gte('created_at', startTime.toISOString())
    .lte('created_at', endTime.toISOString())
    .order('created_at', { ascending: false });

  if (webhooks && webhooks.length > 0) {
    console.log(`\nFound ${webhooks.length} Stripe webhooks in that time window:`);
    webhooks.forEach((w, i) => {
      console.log(`\n${i + 1}. Request ID: ${w.request_id}`);
      console.log(`   Status: ${w.status}`);
      console.log(`   Time: ${new Date(w.created_at).toLocaleTimeString()}`);
    });
  }

  console.log(
    "\n⚠️  The payment was likely made but the webhook didn't have the quote_ids in metadata",
  );
  console.log('\n📝 To fix this order:');
  console.log('1. Find the payment_intent ID from Stripe Dashboard');
  console.log('2. Manually create the payment record');
  console.log('3. Update the quote status to "paid"');
}

findStripePayment().catch(console.error);
