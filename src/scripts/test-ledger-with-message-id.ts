import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL || ''
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_KEY || ''

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function testLedgerWithMessageId() {
  console.log('🧪 Testing payment ledger entry with p_message_id parameter...\n')
  
  // Get the most recent Stripe payment
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
  console.log(`   Gateway Response ID: ${payment.gateway_response?.id}`)
  
  // Check if ledger entry already exists
  const { data: existingLedger } = await supabase
    .from('payment_ledger')
    .select('*')
    .eq('gateway_transaction_id', payment.gateway_response?.id)
    .single()
  
  if (existingLedger) {
    console.log('\n✅ Ledger entry already exists for this payment!')
    console.log(`   Ledger ID: ${existingLedger.id}`)
    console.log(`   Created: ${new Date(existingLedger.created_at).toLocaleString()}`)
    return
  }
  
  // Try to create ledger entry with p_message_id
  console.log('\n🔧 Creating ledger entry with RPC function...')
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
      p_notes: 'Manual ledger entry for Stripe payment',
      p_user_id: payment.user_id,
      p_message_id: null
    })
    
    if (error) {
      console.error('❌ RPC Error:', error)
    } else {
      console.log('✅ Success! Result:', data)
      
      // Check if ledger entry was created
      const { data: newLedger } = await supabase
        .from('payment_ledger')
        .select('*')
        .eq('gateway_transaction_id', payment.gateway_response?.id)
        .single()
      
      if (newLedger) {
        console.log('\n✅ Ledger entry created successfully!')
        console.log(`   Ledger ID: ${newLedger.id}`)
        console.log(`   Amount: ${newLedger.amount} ${newLedger.currency}`)
        console.log(`   Type: ${newLedger.payment_type}`)
      }
    }
  } catch (err) {
    console.error('❌ Exception:', err)
  }
}

testLedgerWithMessageId().catch(console.error)