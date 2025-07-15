import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL || ''
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_KEY || ''

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkAllTables() {
  console.log('🔍 Checking recent database activity...\n')
  
  const since = new Date(Date.now() - 10 * 60 * 1000).toISOString() // Last 10 minutes
  
  // Check payment_transactions
  console.log('📊 Recent payment_transactions (last 10 min):')
  const { data: payments } = await supabase
    .from('payment_transactions')
    .select('payment_method, amount, currency, status, created_at')
    .gte('created_at', since)
    .order('created_at', { ascending: false })
  
  if (payments && payments.length > 0) {
    payments.forEach(p => {
      console.log(`- ${p.payment_method}: ${p.amount} ${p.currency} (${p.status}) at ${new Date(p.created_at).toLocaleTimeString()}`)
    })
  } else {
    console.log('- None found')
  }
  
  // Check webhook_logs
  console.log('\n📋 Recent webhook_logs (last 10 min):')
  const { data: logs } = await supabase
    .from('webhook_logs')
    .select('webhook_type, status, error_message, created_at')
    .gte('created_at', since)
    .order('created_at', { ascending: false })
  
  if (logs && logs.length > 0) {
    logs.forEach(l => {
      console.log(`- ${l.webhook_type}: ${l.status || 'processed'} at ${new Date(l.created_at).toLocaleTimeString()}`)
      if (l.error_message) console.log(`  Error: ${l.error_message}`)
    })
  } else {
    console.log('- None found')
  }
  
  // Check quotes with recent updates
  console.log('\n📝 Recent quote updates (last 10 min):')
  const { data: quotes } = await supabase
    .from('quotes')
    .select('id, status, payment_status, payment_method, updated_at')
    .gte('updated_at', since)
    .order('updated_at', { ascending: false })
    .limit(5)
  
  if (quotes && quotes.length > 0) {
    quotes.forEach(q => {
      console.log(`- Quote ${q.id.substring(0, 8)}: ${q.status} (payment: ${q.payment_status}) via ${q.payment_method} at ${new Date(q.updated_at).toLocaleTimeString()}`)
    })
  } else {
    console.log('- None found')
  }
  
  // Check payment_ledger
  console.log('\n💰 Recent payment_ledger entries (last 10 min):')
  const { data: ledger } = await supabase
    .from('payment_ledger')
    .select('payment_type, amount, currency, gateway_code, created_at')
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(5)
  
  if (ledger && ledger.length > 0) {
    ledger.forEach(l => {
      console.log(`- ${l.payment_type}: ${l.amount} ${l.currency} via ${l.gateway_code} at ${new Date(l.created_at).toLocaleTimeString()}`)
    })
  } else {
    console.log('- None found')
  }
}

checkAllTables().catch(console.error)