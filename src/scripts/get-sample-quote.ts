import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseServiceKey = process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function getSampleQuote() {
  console.log('🔍 Getting a sample quote for testing...\n');

  // Get an approved quote that hasn't been paid yet
  const { data: quote, error } = await supabase
    .from('quotes')
    .select(
      'id, display_id, status, final_total_usd, destination_currency, user_id, email, customer_name',
    )
    .eq('status', 'approved')
    .is('payment_status', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  let finalQuote = quote;

  if (error || !quote) {
    console.log('No approved unpaid quotes found. Getting any recent quote...');

    const { data: anyQuote, error: anyError } = await supabase
      .from('quotes')
      .select(
        'id, display_id, status, final_total_usd, destination_currency, user_id, email, customer_name',
      )
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (anyError || !anyQuote) {
      console.error('❌ No quotes found:', anyError);
      return;
    }

    finalQuote = anyQuote;
  }

  console.log('✅ Found quote:');
  console.log(`   Quote ID: ${finalQuote.id}`);
  console.log(`   Display ID: ${finalQuote.display_id}`);
  console.log(`   Status: ${finalQuote.status}`);
  console.log(`   Amount: ${finalQuote.final_total_usd} ${finalQuote.destination_currency}`);
  console.log(`   User ID: ${finalQuote.user_id}`);
  console.log(`   Customer: ${finalQuote.customer_name || finalQuote.email}`);

  console.log('\n📝 Use this for testing Stripe webhook:');
  console.log(`stripe trigger payment_intent.succeeded \\`);
  console.log(`  --override "payment_intent:metadata.quote_ids=${finalQuote.id}" \\`);
  console.log(`  --override "payment_intent:metadata.user_id=${finalQuote.user_id}" \\`);
  console.log(
    `  --override "payment_intent:amount=${Math.round(finalQuote.final_total_usd * 100)}" \\`,
  );
  console.log(
    `  --override "payment_intent:currency=${finalQuote.destination_currency.toLowerCase()}"`,
  );
}

getSampleQuote().catch(console.error);
