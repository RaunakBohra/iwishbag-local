import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function monitorWebhook() {
  console.log('🔍 Monitoring Stripe webhook activity...\n');

  let lastCheckTime = new Date();

  setInterval(async () => {
    // Check for new webhook logs
    const { data: newLogs, error: logError } = await supabase
      .from('webhook_logs')
      .select('*')
      .gt('created_at', lastCheckTime.toISOString())
      .order('created_at', { ascending: false });

    if (newLogs && newLogs.length > 0) {
      console.log(`\n📨 [${new Date().toLocaleTimeString()}] New webhook logs:`);
      newLogs.forEach((log) => {
        console.log(`   Type: ${log.webhook_type || log.gateway_code}`);
        console.log(`   Event: ${log.event_type || log.webhook_type}`);
        console.log(`   Processed: ${log.processed ? '✅' : '❌'}`);
        if (log.error_message) {
          console.log(`   Error: ${log.error_message}`);
        }
      });
    }

    // Check for new payment transactions
    const { data: newPayments, error: payError } = await supabase
      .from('payment_transactions')
      .select('*')
      .eq('payment_method', 'stripe')
      .gt('created_at', lastCheckTime.toISOString())
      .order('created_at', { ascending: false });

    if (newPayments && newPayments.length > 0) {
      console.log(`\n💳 [${new Date().toLocaleTimeString()}] New Stripe payments:`);
      newPayments.forEach((payment) => {
        console.log(`   Amount: ${payment.amount} ${payment.currency}`);
        console.log(`   Status: ${payment.status}`);
        console.log(`   Gateway Response ID: ${payment.gateway_response?.id}`);
      });
    }

    // Check for updated quotes
    const { data: updatedQuotes, error: quoteError } = await supabase
      .from('quotes')
      .select('id, status, payment_status, payment_method')
      .eq('payment_method', 'stripe')
      .gt('updated_at', lastCheckTime.toISOString())
      .order('updated_at', { ascending: false });

    if (updatedQuotes && updatedQuotes.length > 0) {
      console.log(`\n📝 [${new Date().toLocaleTimeString()}] Updated quotes:`);
      updatedQuotes.forEach((quote) => {
        console.log(`   Quote ID: ${quote.id}`);
        console.log(`   Status: ${quote.status}`);
        console.log(`   Payment Status: ${quote.payment_status}`);
      });
    }

    lastCheckTime = new Date();
  }, 5000); // Check every 5 seconds

  console.log('Monitoring started. Press Ctrl+C to stop.');
  console.log('Checking for new activity every 5 seconds...');
}

monitorWebhook().catch(console.error);
