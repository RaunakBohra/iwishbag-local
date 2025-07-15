import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL || ''
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_KEY || ''

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function testStripeWebhook() {
  console.log('🚀 Creating test Stripe payment records...\n')
  
  // Create a test payment transaction
  const testPaymentIntent = {
    id: 'pi_test_manual_' + Date.now(),
    object: 'payment_intent',
    amount: 5000,
    currency: 'usd',
    status: 'succeeded',
    metadata: {
      quote_ids: 'test-quote-123',
      user_id: 'test-user-123'
    }
  }
  
  // Create payment transaction
  const { data: transaction, error: txError } = await supabase
    .from('payment_transactions')
    .insert({
      user_id: testPaymentIntent.metadata.user_id,
      quote_id: testPaymentIntent.metadata.quote_ids,
      amount: testPaymentIntent.amount / 100,
      currency: testPaymentIntent.currency.toUpperCase(),
      status: 'completed',
      payment_method: 'stripe',
      gateway_response: testPaymentIntent,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .select()
    .single()
  
  if (txError) {
    console.error('❌ Error creating payment transaction:', txError)
  } else {
    console.log('✅ Payment transaction created:')
    console.log(`   ID: ${transaction.id}`)
    console.log(`   Amount: ${transaction.amount} ${transaction.currency}`)
    console.log(`   Status: ${transaction.status}`)
  }
  
  // Create webhook log
  const { data: log, error: logError } = await supabase
    .from('webhook_logs')
    .insert({
      webhook_type: 'stripe',
      request_body: {
        id: 'evt_test_manual',
        type: 'payment_intent.succeeded',
        data: { object: testPaymentIntent }
      },
      processed: true,
      created_at: new Date().toISOString()
    })
    .select()
    .single()
  
  if (logError) {
    console.error('❌ Error creating webhook log:', logError)
  } else {
    console.log('\n✅ Webhook log created:')
    console.log(`   ID: ${log.id}`)
    console.log(`   Type: ${log.webhook_type}`)
  }
  
  console.log('\n✅ Test complete! Check the monitoring script for updates.')
}

testStripeWebhook().catch(console.error)