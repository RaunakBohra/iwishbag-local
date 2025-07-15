import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL || ''
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_KEY || ''

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkPayments() {
  console.log('🔍 Checking payment_transactions table...\n')

  // Get all recent payment transactions
  const { data: transactions, error } = await supabase
    .from('payment_transactions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10)

  if (error) {
    console.error('❌ Error:', error)
    return
  }

  if (!transactions || transactions.length === 0) {
    console.log('No payment transactions found')
    return
  }

  console.log(`Found ${transactions.length} transactions:\n`)
  
  transactions.forEach((tx, index) => {
    console.log(`${index + 1}. Payment Method: ${tx.payment_method}`)
    console.log(`   Amount: ${tx.amount} ${tx.currency}`)
    console.log(`   Status: ${tx.status}`)
    console.log(`   Created: ${new Date(tx.created_at).toLocaleString()}`)
    console.log(`   Gateway Response ID: ${tx.gateway_response?.id || 'N/A'}`)
    console.log('---')
  })
}

checkPayments().catch(console.error)