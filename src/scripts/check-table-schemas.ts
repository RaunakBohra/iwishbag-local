import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkSchemas() {
  console.log('🔍 Checking table schemas...\n');

  // Get a sample from payment_transactions
  const { data: sampleTx, error: txError } = await supabase
    .from('payment_transactions')
    .select('*')
    .limit(1)
    .single();

  if (sampleTx) {
    console.log('📊 payment_transactions columns:');
    console.log(Object.keys(sampleTx).join(', '));
  }

  // Get a sample from webhook_logs
  const { data: sampleLog, error: logError } = await supabase
    .from('webhook_logs')
    .select('*')
    .limit(1)
    .single();

  if (sampleLog) {
    console.log('\n📋 webhook_logs columns:');
    console.log(Object.keys(sampleLog).join(', '));
  }

  // Get a sample from quotes
  const { data: sampleQuote, error: quoteError } = await supabase
    .from('quotes_v2')
    .select('*')
    .limit(1)
    .single();

  if (sampleQuote) {
    console.log('\n📝 quotes columns:');
    console.log(Object.keys(sampleQuote).join(', '));
  }
}

checkSchemas().catch(console.error);
