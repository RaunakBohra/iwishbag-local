import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL || ''
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_KEY || ''

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function testLedgerEntry() {
  console.log('🧪 Testing payment ledger entry creation...\n')
  
  // Get a recent Stripe payment to test with
  const { data: payment, error: payError } = await supabase
    .from('payment_transactions')
    .select('*')
    .eq('payment_method', 'stripe')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()
  
  if (payError || !payment) {
    console.error('❌ No Stripe payment found:', payError)
    return
  }
  
  console.log('📊 Using payment:')
  console.log(`   Amount: ${payment.amount} ${payment.currency}`)
  console.log(`   Quote ID: ${payment.quote_id}`)
  console.log(`   User ID: ${payment.user_id}`)
  console.log(`   Gateway Response ID: ${payment.gateway_response?.id}`)
  
  // Try different parameter combinations
  console.log('\n🔧 Testing create_payment_with_ledger_entry RPC...')
  
  // Test 1: With all parameters
  console.log('\nTest 1: With all parameters including description')
  try {
    const { data, error } = await supabase.rpc('create_payment_with_ledger_entry', {
      p_quote_id: payment.quote_id,
      p_amount: payment.amount,
      p_currency: payment.currency,
      p_payment_method: 'stripe',
      p_payment_type: 'customer_payment',
      p_reference_number: payment.gateway_response?.id || 'test-ref',
      p_gateway_code: 'stripe',
      p_gateway_transaction_id: payment.gateway_response?.id || 'test-tx',
      p_notes: 'Test ledger entry from script',
      p_user_id: payment.user_id,
      p_description: 'Customer payment via Stripe' // Adding description parameter
    })
    
    if (error) {
      console.error('❌ Error:', error)
    } else {
      console.log('✅ Success! Result:', data)
    }
  } catch (err) {
    console.error('❌ Exception:', err)
  }
  
  // Test 2: Check what columns exist in financial_transactions
  console.log('\n📋 Checking financial_transactions table structure...')
  const { data: sample, error: sampleError } = await supabase
    .from('financial_transactions')
    .select('*')
    .limit(1)
    .single()
  
  if (sample) {
    console.log('Table columns:', Object.keys(sample).join(', '))
  } else if (sampleError) {
    console.log('Could not fetch sample:', sampleError.message)
  }
  
  // Test 3: Try direct insert into payment_ledger
  console.log('\n🔧 Testing direct payment_ledger insert...')
  const { data: ledgerData, error: ledgerError } = await supabase
    .from('payment_ledger')
    .insert({
      quote_id: payment.quote_id,
      amount: payment.amount,
      currency: payment.currency,
      payment_type: 'customer_payment',
      reference_number: payment.gateway_response?.id || 'test-ref',
      gateway_code: 'stripe',
      gateway_transaction_id: payment.gateway_response?.id || 'test-tx',
      notes: 'Test direct insert',
      created_at: new Date().toISOString()
    })
    .select()
    .single()
  
  if (ledgerError) {
    console.error('❌ Direct insert error:', ledgerError)
  } else {
    console.log('✅ Direct insert success:', ledgerData?.id)
  }
}

testLedgerEntry().catch(console.error)