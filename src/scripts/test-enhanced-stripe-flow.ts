import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL || ''
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_KEY || ''

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function testEnhancedStripeFlow() {
  console.log('🔍 Testing Enhanced Stripe Customer Details Flow\n')
  
  // 1. Check recent Stripe payments to see enhanced data
  console.log('📋 1. Recent Stripe Payments with Customer Details:')
  const { data: recentPayments } = await supabase
    .from('payment_transactions')
    .select('*')
    .eq('payment_method', 'stripe')
    .order('created_at', { ascending: false })
    .limit(3)
  
  if (recentPayments && recentPayments.length > 0) {
    recentPayments.forEach((payment, index) => {
      console.log(`\n--- Payment ${index + 1} ---`)
      console.log(`ID: ${payment.id}`)
      console.log(`Amount: ${payment.amount} ${payment.currency}`)
      console.log(`Created: ${payment.created_at}`)
      
      if (payment.gateway_response) {
        const response = payment.gateway_response
        
        // Check original metadata
        if (response.metadata) {
          console.log('\n📝 Metadata from Payment Intent:')
          console.log(`  customer_name: ${response.metadata.customer_name || 'Not sent'}`)
          console.log(`  customer_phone: ${response.metadata.customer_phone || 'Not sent'}`)
        }
        
        // Check shipping info
        if (response.shipping) {
          console.log('\n📦 Shipping Info from Stripe:')
          console.log(`  Name: ${response.shipping.name}`)
          console.log(`  Phone: ${response.shipping.phone || 'Not provided'}`)
          if (response.shipping.address) {
            console.log(`  Address: ${response.shipping.address.line1}`)
            console.log(`  City: ${response.shipping.address.city}`)
            console.log(`  State: ${response.shipping.address.state}`)
            console.log(`  Postal: ${response.shipping.address.postal_code}`)
            console.log(`  Country: ${response.shipping.address.country}`)
          }
        } else {
          console.log('\n⚠️  No shipping info in payment')
        }
        
        // Check customer details (from webhook enhancement)
        if (response.customer_details) {
          console.log('\n👤 Customer Details (from webhook):')
          console.log(`  Email: ${response.customer_details.email || 'Not captured'}`)
          console.log(`  Name: ${response.customer_details.name || 'Not captured'}`)
          console.log(`  Phone: ${response.customer_details.phone || 'Not captured'}`)
          console.log(`  Customer ID: ${response.customer_details.customer_id || 'Not created'}`)
        }
        
        // Check charge details (from charge webhook)
        if (response.charge_details) {
          console.log('\n💳 Billing Details (from charge):')
          const billing = response.charge_details.billing_details
          if (billing) {
            console.log(`  Name: ${billing.name || 'Not provided'}`)
            console.log(`  Email: ${billing.email || 'Not provided'}`)
            console.log(`  Phone: ${billing.phone || 'Not provided'}`)
            if (billing.address) {
              console.log(`  Address: ${billing.address.line1 || ''}`)
              console.log(`  City: ${billing.address.city || ''}`)
              console.log(`  State: ${billing.address.state || ''}`)
              console.log(`  Postal: ${billing.address.postal_code || ''}`)
              console.log(`  Country: ${billing.address.country || ''}`)
            }
          }
          if (response.charge_details.receipt_url) {
            console.log(`  Receipt URL: ${response.charge_details.receipt_url}`)
          }
        }
      }
    })
  } else {
    console.log('No recent Stripe payments found')
  }
  
  // 2. Check if quotes are being updated with customer info
  console.log('\n\n📋 2. Checking if Quotes Receive Customer Info from Stripe:')
  const { data: paidQuotes } = await supabase
    .from('quotes')
    .select('id, customer_name, email, payment_method, paid_at')
    .eq('payment_method', 'stripe')
    .eq('payment_status', 'paid')
    .order('paid_at', { ascending: false })
    .limit(5)
  
  if (paidQuotes && paidQuotes.length > 0) {
    console.log('\nRecent paid quotes via Stripe:')
    paidQuotes.forEach(quote => {
      console.log(`\nQuote ${quote.id}:`)
      console.log(`  Customer Name: ${quote.customer_name || 'Not set'}`)
      console.log(`  Email: ${quote.email || 'Not set'}`)
      console.log(`  Paid At: ${quote.paid_at}`)
    })
  }
  
  // 3. Summary and recommendations
  console.log('\n\n📊 3. Enhanced Flow Status:')
  console.log('\n✅ What we are now sending to Stripe:')
  console.log('   - Customer name (in metadata)')
  console.log('   - Customer phone (in metadata)')
  console.log('   - Customer email (as receipt_email)')
  console.log('   - Shipping address (if complete)')
  console.log('   - Creating/updating Stripe Customer records')
  
  console.log('\n✅ What we are now capturing from Stripe:')
  console.log('   - Billing details from PaymentElement')
  console.log('   - Receipt URLs')
  console.log('   - Customer IDs for repeat purchases')
  console.log('   - All customer-provided information')
  
  console.log('\n🎯 Next Steps:')
  console.log('   1. Deploy the updated Edge Functions')
  console.log('   2. Test a new payment with full address')
  console.log('   3. Verify customer creation in Stripe Dashboard')
  console.log('   4. Check if billing details are captured')
}

testEnhancedStripeFlow().catch(console.error)