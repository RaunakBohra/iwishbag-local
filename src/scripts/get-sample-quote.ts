import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL || ''
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_KEY || ''

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function getSampleQuote() {
  console.log('🔍 Getting a sample quote for testing...\n')
  
  // Get an approved quote that hasn't been paid yet
  let { data: quote, error } = await supabase
    .from('quotes')
    .select('id, display_id, status, final_total, currency, user_id, email, customer_name')
    .eq('status', 'approved')
    .is('payment_status', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()
  
  if (error || !quote) {
    console.log('No approved unpaid quotes found. Getting any recent quote...')
    
    const { data: anyQuote, error: anyError } = await supabase
      .from('quotes')
      .select('id, display_id, status, final_total, currency, user_id, email, customer_name')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
    
    if (anyError || !anyQuote) {
      console.error('❌ No quotes found:', anyError)
      return
    }
    
    quote = anyQuote
  }
  
  console.log('✅ Found quote:')
  console.log(`   Quote ID: ${quote.id}`)
  console.log(`   Display ID: ${quote.display_id}`)
  console.log(`   Status: ${quote.status}`)
  console.log(`   Amount: ${quote.final_total} ${quote.currency}`)
  console.log(`   User ID: ${quote.user_id}`)
  console.log(`   Customer: ${quote.customer_name || quote.email}`)
  
  console.log('\n📝 Use this for testing Stripe webhook:')
  console.log(`stripe trigger payment_intent.succeeded \\`)
  console.log(`  --override "payment_intent:metadata.quote_ids=${quote.id}" \\`)
  console.log(`  --override "payment_intent:metadata.user_id=${quote.user_id}" \\`)
  console.log(`  --override "payment_intent:amount=${Math.round(quote.final_total * 100)}" \\`)
  console.log(`  --override "payment_intent:currency=${quote.currency.toLowerCase()}"`)
}

getSampleQuote().catch(console.error)