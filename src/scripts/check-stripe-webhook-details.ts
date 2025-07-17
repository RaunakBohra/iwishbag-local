import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkWebhookDetails() {
  console.log('🔍 Checking Stripe webhook details...\n');

  // Get recent Stripe webhook logs
  const { data: logs, error } = await supabase
    .from('webhook_logs')
    .select('*')
    .eq('webhook_type', 'stripe')
    .order('created_at', { ascending: false })
    .limit(5);

  if (error) {
    console.error('❌ Error:', error);
    return;
  }

  if (!logs || logs.length === 0) {
    console.log('No Stripe webhook logs found');
    return;
  }

  console.log(`Found ${logs.length} Stripe webhook logs:\n`);

  logs.forEach((log, index) => {
    console.log(`${index + 1}. Request ID: ${log.request_id}`);
    console.log(`   Status: ${log.status}`);
    console.log(`   Created: ${new Date(log.created_at).toLocaleString()}`);
    console.log(`   User Agent: ${log.user_agent}`);
    if (log.error_message) {
      console.log(`   Error: ${log.error_message}`);
    }
    console.log('---');
  });

  // Check if payment transactions were created
  console.log('\n📊 Checking for recent Stripe payment transactions...');
  const { data: payments } = await supabase
    .from('payment_transactions')
    .select('*')
    .eq('payment_method', 'stripe')
    .order('created_at', { ascending: false })
    .limit(5);

  if (payments && payments.length > 0) {
    console.log(`\nFound ${payments.length} Stripe payments:`);
    payments.forEach((payment, index) => {
      console.log(`\n${index + 1}. Amount: ${payment.amount} ${payment.currency}`);
      console.log(`   Status: ${payment.status}`);
      console.log(`   Created: ${new Date(payment.created_at).toLocaleString()}`);
      console.log(`   Gateway Response ID: ${payment.gateway_response?.id}`);
    });
  } else {
    console.log('No Stripe payments found in payment_transactions table');
  }
}

checkWebhookDetails().catch(console.error);
