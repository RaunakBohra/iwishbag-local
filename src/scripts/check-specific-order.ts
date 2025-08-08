import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkOrder(displayId: string) {
  console.log(`🔍 Checking order ${displayId}...\n`);

  // Get the quote details
  const { data: quote, error: quoteError } = await supabase
    .from('quotes_v2')
    .select('*')
    .eq('display_id', displayId)
    .single();

  if (quoteError || !quote) {
    console.error('❌ Quote not found:', quoteError);
    return;
  }

  console.log('📋 Quote Details:');
  console.log(`   ID: ${quote.id}`);
  console.log(`   Display ID: ${quote.display_id}`);
  console.log(`   Status: ${quote.status}`);
  console.log(`   Payment Status: ${quote.payment_status || 'null'}`);
  console.log(`   Payment Method: ${quote.payment_method || 'null'}`);
  console.log(`   Amount: ${quote.final_total_origincurrency} ${quote.currency}`);
  console.log(`   Created: ${new Date(quote.created_at).toLocaleString()}`);
  console.log(`   Updated: ${new Date(quote.updated_at).toLocaleString()}`);
  if (quote.paid_at) {
    console.log(`   Paid At: ${new Date(quote.paid_at).toLocaleString()}`);
  }

  // Check for payment transactions
  console.log('\n💳 Payment Transactions:');
  const { data: payments, error: payError } = await supabase
    .from('payment_transactions')
    .select('*')
    .eq('quote_id', quote.id)
    .order('created_at', { ascending: false });

  if (payError) {
    console.error('❌ Error fetching payments:', payError);
  } else if (payments && payments.length > 0) {
    payments.forEach((payment, index) => {
      console.log(`\n   ${index + 1}. Payment Method: ${payment.payment_method}`);
      console.log(`      Amount: ${payment.amount} ${payment.currency}`);
      console.log(`      Status: ${payment.status}`);
      console.log(`      Created: ${new Date(payment.created_at).toLocaleString()}`);
      if (payment.gateway_response?.id) {
        console.log(`      Gateway ID: ${payment.gateway_response.id}`);
      }
    });
  } else {
    console.log('   No payment transactions found');
  }

  // Check payment ledger
  console.log('\n💰 Payment Ledger Entries:');
  const { data: ledger, error: ledgerError } = await supabase
    .from('payment_ledger')
    .select('*')
    .eq('quote_id', quote.id)
    .order('created_at', { ascending: false });

  if (ledgerError) {
    console.error('❌ Error fetching ledger:', ledgerError);
  } else if (ledger && ledger.length > 0) {
    ledger.forEach((entry, index) => {
      console.log(`\n   ${index + 1}. Type: ${entry.payment_type}`);
      console.log(`      Amount: ${entry.amount} ${entry.currency}`);
      console.log(`      Gateway: ${entry.gateway_code}`);
      console.log(`      Created: ${new Date(entry.created_at).toLocaleString()}`);
    });
  } else {
    console.log('   No payment ledger entries found');
  }

  // Check recent webhook logs for this quote
  console.log('\n📨 Recent Webhook Activity:');
  const { data: webhooks, error: webhookError } = await supabase
    .from('webhook_logs')
    .select('*')
    .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Last 24 hours
    .order('created_at', { ascending: false })
    .limit(10);

  if (webhookError) {
    console.error('❌ Error fetching webhooks:', webhookError);
  } else if (webhooks && webhooks.length > 0) {
    const relevantWebhooks = webhooks.filter(
      (w) =>
        w.request_id?.includes(quote.id) ||
        w.error_message?.includes(quote.id) ||
        w.request_id?.includes('stripe'),
    );

    if (relevantWebhooks.length > 0) {
      console.log(`   Found ${relevantWebhooks.length} potentially related webhook(s)`);
      relevantWebhooks.forEach((webhook, index) => {
        console.log(`\n   ${index + 1}. Type: ${webhook.webhook_type}`);
        console.log(`      Status: ${webhook.status}`);
        console.log(`      Created: ${new Date(webhook.created_at).toLocaleString()}`);
        if (webhook.error_message) {
          console.log(`      Error: ${webhook.error_message}`);
        }
      });
    } else {
      console.log('   No related webhook activity found');
    }
  } else {
    console.log('   No recent webhook logs found');
  }

  // Check if this was a Stripe payment
  if (quote.payment_method === 'stripe' || !quote.payment_method) {
    console.log('\n🔍 Checking for Stripe-specific issues...');
    console.log('   - Payment method:', quote.payment_method || 'not set');
    console.log('   - User ID:', quote.user_id);
    console.log(
      '   - Quote is in "processing" status, which suggests payment may have been initiated',
    );
    console.log('\n⚠️  Possible issues:');
    console.log('   1. Payment was made but webhook failed to fire');
    console.log('   2. Payment was made through a different gateway');
    console.log("   3. Payment is still pending on Stripe's side");
    console.log('   4. Webhook received but failed to process due to missing quote_ids metadata');
  }
}

// Get the order ID from command line argument or use the provided one
const orderId = process.argv[2] || 'Q20250715-9e5a41';
checkOrder(orderId).catch(console.error);
