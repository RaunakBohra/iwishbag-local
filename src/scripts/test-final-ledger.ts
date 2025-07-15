import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL || ''
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_KEY || ''

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function testFinalLedger() {
  console.log('🧪 Testing final ledger entry creation with created_by field...\n')
  
  // Get a Stripe payment that doesn't have a ledger entry
  const { data: payments, error: payError } = await supabase
    .from('payment_transactions')
    .select('*')
    .eq('payment_method', 'stripe')
    .order('created_at', { ascending: false })
  
  if (payError || !payments || payments.length === 0) {
    console.error('❌ No Stripe payments found:', payError)
    return
  }
  
  // Find a payment without a ledger entry
  let payment = null
  for (const p of payments) {
    const { data: existingLedger } = await supabase
      .from('payment_ledger')
      .select('id')
      .eq('gateway_transaction_id', p.gateway_response?.id)
      .single()
    
    if (!existingLedger) {
      payment = p
      break
    }
  }
  
  if (!payment) {
    console.log('✅ All Stripe payments already have ledger entries!')
    return
  }
  
  console.log('📊 Creating ledger entry for:')
  console.log(`   Amount: ${payment.amount} ${payment.currency}`)
  console.log(`   Quote ID: ${payment.quote_id}`)
  console.log(`   Gateway Response ID: ${payment.gateway_response?.id}`)
  console.log(`   User ID: ${payment.user_id}`)
  
  // Create ledger entry with all required fields
  const ledgerData = {
    quote_id: payment.quote_id,
    amount: payment.amount,
    currency: payment.currency,
    payment_type: 'customer_payment',
    payment_method: 'stripe',
    reference_number: payment.gateway_response?.id || 'test-ref',
    gateway_code: 'stripe',
    gateway_transaction_id: payment.gateway_response?.id || 'test-tx',
    notes: 'Stripe payment - manually created ledger entry',
    created_by: payment.user_id, // Required field
    created_at: new Date().toISOString()
  }
  
  const { data: newLedger, error: ledgerError } = await supabase
    .from('payment_ledger')
    .insert(ledgerData)
    .select()
    .single()
  
  if (ledgerError) {
    console.error('❌ Error creating ledger entry:', ledgerError)
  } else {
    console.log('\n✅ Ledger entry created successfully!')
    console.log(`   Ledger ID: ${newLedger.id}`)
    console.log(`   Amount: ${newLedger.amount} ${newLedger.currency}`)
    console.log(`   Type: ${newLedger.payment_type}`)
    console.log(`   Status: ${newLedger.status}`)
  }
}

testFinalLedger().catch(console.error)