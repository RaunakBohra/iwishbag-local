import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkStripePayments() {
  console.log('🔍 Checking for Stripe payments in the database...\n');

  // Check payment_transactions table
  const { data: transactions, error: txError } = await supabase
    .from('payment_transactions')
    .select('*')
    .eq('payment_method', 'stripe')
    .order('created_at', { ascending: false })
    .limit(5);

  if (txError) {
    console.error('❌ Error fetching payment transactions:', txError);
  } else {
    console.log('📊 Payment Transactions (Stripe):');
    if (transactions && transactions.length > 0) {
      console.log('Found transactions:', transactions);
    } else {
      console.log('   No Stripe transactions found');
    }
  }

  // Check for the specific payment intents from earlier
  const paymentIntentIds = ['pi_3Rl8rPQj80XSacOA1MNBnuwT', 'pi_3Rl8zxQj80XSacOA0VhHgBCN'];

  console.log('\n\n🔍 Checking for specific payment intents:');
  for (const piId of paymentIntentIds) {
    const { data: tx, error } = await supabase
      .from('payment_transactions')
      .select('*')
      .or(`transaction_id.eq.${piId},gateway_transaction_id.eq.${piId}`)
      .single();

    if (error) {
      console.log(`\n❌ ${piId}: Not found in database`);
    } else if (tx) {
      console.log(`\n✅ ${piId}: Found!`);
      console.log(`   Status: ${tx.status}`);
      console.log(`   Amount: ${tx.amount} ${tx.currency}`);
      console.log(`   Quote ID: ${tx.quote_id}`);
    }
  }

  // Check webhook logs
  console.log('\n\n📋 Recent Stripe Webhook Logs:');
  const { data: webhookLogs, error: logError } = await supabase
    .from('webhook_logs')
    .select('*')
    .or('webhook_type.eq.stripe,gateway_code.eq.stripe')
    .order('created_at', { ascending: false })
    .limit(5);

  if (logError) {
    console.error('❌ Error fetching webhook logs:', logError);
  } else if (webhookLogs && webhookLogs.length > 0) {
    console.log('Found webhook logs:', webhookLogs);
  } else {
    console.log('   No Stripe webhook logs found');
  }

  // Check quotes that might be missing payment records
  console.log('\n\n🔍 Checking quotes with payment_completed_at but no transaction:');
  const { data: quotes, error: quoteError } = await supabase
    .from('quotes_v2')
    .select('*')
    .eq('payment_method', 'stripe')
    .not('payment_completed_at', 'is', null)
    .limit(10);

  if (quoteError) {
    console.error('❌ Error fetching quotes:', quoteError);
  } else if (quotes && quotes.length > 0) {
    for (const quote of quotes) {
      const { data: tx } = await supabase
        .from('payment_transactions')
        .select('id')
        .eq('quote_id', quote.id)
        .single();

      if (!tx) {
        console.log(`\n⚠️  Quote ${quote.id} marked as paid but no transaction record`);
        console.log(`   Status: ${quote.status}`);
        console.log(`   Payment Status: ${quote.payment_status}`);
        console.log(`   Completed At: ${new Date(quote.payment_completed_at).toLocaleString()}`);
      }
    }
  }

  console.log('\n\n✅ Check complete!');
}

checkStripePayments().catch(console.error);
