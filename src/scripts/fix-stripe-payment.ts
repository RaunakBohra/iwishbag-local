import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL || ''
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_KEY || ''

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function fixStripePayment() {
  const paymentData = {
    paymentIntentId: 'pi_3RlCg8Qj80XSacOA0TQAIerV',
    chargeId: 'ch_3RlCg8Qj80XSacOA06eU011H',
    quoteId: '7507c37a-c892-4be6-91d0-0830c0d2403f',
    userId: '130ec316-970f-429f-8cb8-ff9adf751248',
    amount: 1155.57,
    currency: 'USD'
  }
  
  console.log('🔧 Fixing Stripe payment for order Q20250715-9e5a41...\n')
  
  // First, check if payment transaction already exists
  const { data: existingTx } = await supabase
    .from('payment_transactions')
    .select('id')
    .or(`gateway_response->id.eq.${paymentData.paymentIntentId},gateway_response->payment_intent.eq.${paymentData.paymentIntentId}`)
    .single()
  
  if (existingTx) {
    console.log('⚠️  Payment transaction already exists')
    return
  }
  
  // Create payment transaction
  console.log('💳 Creating payment transaction...')
  const { data: transaction, error: txError } = await supabase
    .from('payment_transactions')
    .insert({
      user_id: paymentData.userId,
      quote_id: paymentData.quoteId,
      amount: paymentData.amount,
      currency: paymentData.currency,
      status: 'completed',
      payment_method: 'stripe',
      gateway_response: {
        id: paymentData.paymentIntentId,
        charge_id: paymentData.chargeId,
        amount: paymentData.amount * 100,
        currency: paymentData.currency.toLowerCase(),
        status: 'succeeded'
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .select()
    .single()
  
  if (txError) {
    console.error('❌ Error creating payment transaction:', txError)
    return
  }
  
  console.log('✅ Payment transaction created:', transaction.id)
  
  // Update quote status
  console.log('\n📝 Updating quote status...')
  const { error: quoteError } = await supabase
    .from('quotes')
    .update({
      status: 'paid',
      payment_status: 'paid',
      payment_method: 'stripe',
      paid_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', paymentData.quoteId)
  
  if (quoteError) {
    console.error('❌ Error updating quote:', quoteError)
    return
  }
  
  console.log('✅ Quote updated to paid status')
  
  // Create payment ledger entry
  console.log('\n💰 Creating payment ledger entry...')
  try {
    const { error: ledgerError } = await supabase.rpc('create_payment_with_ledger_entry', {
      p_quote_id: paymentData.quoteId,
      p_amount: paymentData.amount,
      p_currency: paymentData.currency,
      p_payment_method: 'stripe',
      p_payment_type: 'customer_payment',
      p_reference_number: paymentData.paymentIntentId,
      p_gateway_code: 'stripe',
      p_gateway_transaction_id: paymentData.paymentIntentId,
      p_notes: 'Stripe payment - manually reconciled',
      p_user_id: paymentData.userId
    })
    
    if (ledgerError) {
      console.error('⚠️  Warning: Could not create ledger entry:', ledgerError.message)
    } else {
      console.log('✅ Payment ledger entry created')
    }
  } catch (error) {
    console.error('⚠️  Warning: Could not create ledger entry:', error)
  }
  
  console.log('\n✅ Order Q20250715-9e5a41 has been fixed!')
  console.log('   - Payment recorded')
  console.log('   - Quote status updated to "paid"')
  console.log('   - Customer should receive confirmation email')
}

fixStripePayment().catch(console.error)