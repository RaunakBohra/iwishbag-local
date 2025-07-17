import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkRecentStripeActivity() {
  const since = new Date(Date.now() - 15 * 60 * 1000).toISOString(); // Last 15 minutes

  console.log('🔍 Checking recent Stripe activity (last 15 minutes)...\n');

  // Check webhook logs
  console.log('📨 Recent Stripe Webhook Logs:');
  const { data: webhooks, error: webhookError } = await supabase
    .from('webhook_logs')
    .select('*')
    .eq('webhook_type', 'stripe')
    .gte('created_at', since)
    .order('created_at', { ascending: false });

  if (webhookError) {
    console.error('❌ Error fetching webhooks:', webhookError);
  } else if (webhooks && webhooks.length > 0) {
    console.log(`Found ${webhooks.length} webhook(s):`);
    webhooks.forEach((w, i) => {
      console.log(`\n${i + 1}. Request ID: ${w.request_id}`);
      console.log(`   Status: ${w.status}`);
      console.log(`   Time: ${new Date(w.created_at).toLocaleTimeString()}`);
      if (w.error_message) {
        console.log(`   Error: ${w.error_message}`);
      }
    });
  } else {
    console.log('   No recent webhook activity');
  }

  // Check payment transactions
  console.log('\n\n💳 Recent Payment Transactions:');
  const { data: payments, error: payError } = await supabase
    .from('payment_transactions')
    .select('*')
    .gte('created_at', since)
    .order('created_at', { ascending: false });

  if (payError) {
    console.error('❌ Error fetching payments:', payError);
  } else if (payments && payments.length > 0) {
    console.log(`Found ${payments.length} payment(s):`);
    payments.forEach((p, i) => {
      console.log(`\n${i + 1}. Method: ${p.payment_method}`);
      console.log(`   Amount: ${p.amount} ${p.currency}`);
      console.log(`   Status: ${p.status}`);
      console.log(`   Time: ${new Date(p.created_at).toLocaleTimeString()}`);
      if (p.gateway_response?.id) {
        console.log(`   Gateway ID: ${p.gateway_response.id}`);
      }
    });
  } else {
    console.log('   No recent payments');
  }

  // Check payment ledger
  console.log('\n\n💰 Recent Payment Ledger Entries:');
  const { data: ledger, error: ledgerError } = await supabase
    .from('payment_ledger')
    .select('*')
    .gte('created_at', since)
    .order('created_at', { ascending: false });

  if (ledgerError) {
    console.error('❌ Error fetching ledger:', ledgerError);
  } else if (ledger && ledger.length > 0) {
    console.log(`Found ${ledger.length} ledger entries:`);
    ledger.forEach((l, i) => {
      console.log(`\n${i + 1}. Type: ${l.payment_type}`);
      console.log(`   Amount: ${l.amount} ${l.currency}`);
      console.log(`   Gateway: ${l.gateway_code}`);
      console.log(`   Time: ${new Date(l.created_at).toLocaleTimeString()}`);
    });
  } else {
    console.log('   No recent ledger entries');
  }

  // Check recent quote updates
  console.log('\n\n📝 Recent Quote Updates:');
  const { data: quotes, error: quoteError } = await supabase
    .from('quotes')
    .select('id, display_id, status, payment_status, payment_method, updated_at')
    .gte('updated_at', since)
    .order('updated_at', { ascending: false })
    .limit(10);

  if (quoteError) {
    console.error('❌ Error fetching quotes:', quoteError);
  } else if (quotes && quotes.length > 0) {
    console.log(`Found ${quotes.length} updated quote(s):`);
    quotes.forEach((q, i) => {
      console.log(`\n${i + 1}. ${q.display_id}: ${q.status}`);
      console.log(`   Payment: ${q.payment_status || 'null'} via ${q.payment_method || 'null'}`);
      console.log(`   Updated: ${new Date(q.updated_at).toLocaleTimeString()}`);
    });
  } else {
    console.log('   No recent quote updates');
  }
}

checkRecentStripeActivity().catch(console.error);
