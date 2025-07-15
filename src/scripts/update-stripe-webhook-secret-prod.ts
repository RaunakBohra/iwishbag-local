import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL || ''
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_KEY || ''

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function updateWebhookSecret() {
  const webhookSecret = 'whsec_86XX51qdUUqd6jDJzNjbEwHOMh7jCyjY'
  
  console.log('🔄 Updating Stripe webhook secret with production secret...')
  
  const { data: stripeGateway, error: fetchError } = await supabase
    .from('payment_gateways')
    .select('config')
    .eq('code', 'stripe')
    .single()

  if (fetchError) {
    console.error('❌ Error fetching Stripe gateway:', fetchError)
    return
  }

  const updatedConfig = {
    ...stripeGateway.config,
    webhook_secret: webhookSecret
  }

  const { error: updateError } = await supabase
    .from('payment_gateways')
    .update({ config: updatedConfig })
    .eq('code', 'stripe')

  if (updateError) {
    console.error('❌ Error updating webhook secret:', updateError)
  } else {
    console.log('✅ Production webhook secret updated successfully!')
    console.log('🔑 Secret:', webhookSecret)
    console.log('\n🎉 Your Stripe webhook is now ready to receive payments!')
  }
}

updateWebhookSecret().catch(console.error)