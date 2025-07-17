import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createLedgerDirectly() {
  console.log('🧪 Creating payment ledger entry directly...\n');

  // Get the most recent Stripe payment
  const { data: payment, error: payError } = await supabase
    .from('payment_transactions')
    .select('*')
    .eq('payment_method', 'stripe')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (payError || !payment) {
    console.error('❌ No Stripe payment found:', payError);
    return;
  }

  console.log('📊 Using payment:');
  console.log(`   Amount: ${payment.amount} ${payment.currency}`);
  console.log(`   Quote ID: ${payment.quote_id}`);
  console.log(`   Gateway Response ID: ${payment.gateway_response?.id}`);

  // Check if ledger entry already exists
  const { data: existingLedger } = await supabase
    .from('payment_ledger')
    .select('*')
    .eq('gateway_transaction_id', payment.gateway_response?.id)
    .single();

  if (existingLedger) {
    console.log('\n✅ Ledger entry already exists for this payment!');
    return;
  }

  // Try direct insert with all required fields
  console.log('\n🔧 Creating ledger entry directly...');
  const ledgerData = {
    quote_id: payment.quote_id,
    amount: payment.amount,
    currency: payment.currency,
    payment_type: 'customer_payment',
    payment_method: 'stripe', // This is the required field that was missing
    reference_number: payment.gateway_response?.id || 'test-ref',
    gateway_code: 'stripe',
    gateway_transaction_id: payment.gateway_response?.id || 'test-tx',
    notes: 'Stripe payment via webhook',
    created_at: new Date().toISOString(),
  };

  console.log('Ledger data:', ledgerData);

  const { data: newLedger, error: ledgerError } = await supabase
    .from('payment_ledger')
    .insert(ledgerData)
    .select()
    .single();

  if (ledgerError) {
    console.error('❌ Direct insert error:', ledgerError);

    // Try to understand the table structure
    console.log('\n📋 Checking payment_ledger columns...');
    const { data: columns } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable, column_default')
      .eq('table_schema', 'public')
      .eq('table_name', 'payment_ledger')
      .order('ordinal_position');

    if (columns) {
      console.log('Required columns (is_nullable = NO):');
      columns
        .filter((c) => c.is_nullable === 'NO' && !c.column_default)
        .forEach((c) => {
          console.log(`   - ${c.column_name} (${c.data_type})`);
        });
    }
  } else {
    console.log('✅ Ledger entry created successfully!');
    console.log(`   Ledger ID: ${newLedger.id}`);
    console.log(`   Amount: ${newLedger.amount} ${newLedger.currency}`);
  }
}

createLedgerDirectly().catch(console.error);
