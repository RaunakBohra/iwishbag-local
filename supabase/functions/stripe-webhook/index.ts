import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.11.0?target=deno'
import { createWebhookHeaders } from '../_shared/cors.ts'
import { 
  processPaymentSuccessAtomic,
  processPaymentFailureAtomic,
  processChargeSucceededAtomic,
  processRefundAtomic
} from './atomic-operations.ts'

// Get webhook headers (empty object for webhooks)
const corsHeaders = createWebhookHeaders()

serve(async (req) => {
  // Webhooks only accept POST
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const signature = req.headers.get('stripe-signature')
  
  if (!signature) {
    return new Response('No signature', { status: 400 })
  }

  try {
    const body = await req.text()
    
    // Initialize Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get Stripe config from database
    const { data: stripeGateway, error: configError } = await supabaseAdmin
      .from('payment_gateways')
      .select('config, test_mode')
      .eq('code', 'stripe')
      .single()

    if (configError || !stripeGateway) {
      console.error('Failed to get Stripe config:', configError)
      return new Response('Configuration error', { status: 500 })
    }

    const config = stripeGateway.config || {}
    const testMode = stripeGateway.test_mode
    
    // Get the appropriate keys based on test mode
    const stripeSecretKey = testMode 
      ? config.test_secret_key 
      : (config.live_secret_key || config.secret_key)
    const webhookSecret = config.webhook_secret

    if (!stripeSecretKey || !webhookSecret) {
      console.error('Missing Stripe keys or webhook secret')
      return new Response('Configuration incomplete', { status: 500 })
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16',
    })

    // Verify webhook signature
    let event: Stripe.Event
    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret)
    } catch (err) {
      console.error('Webhook signature verification failed:', err.message)
      return new Response(`Webhook Error: ${err.message}`, { status: 400 })
    }

    // Log the webhook event
    const requestId = `stripe-${event.id}-${Date.now()}`
    const webhookLogResult = await supabaseAdmin.from('webhook_logs').insert({
      request_id: requestId,
      webhook_type: 'stripe',
      status: 'processing',
      user_agent: req.headers.get('user-agent') || 'Unknown',
      created_at: new Date().toISOString()
    })
    
    if (webhookLogResult.error) {
      console.error('Failed to log webhook:', webhookLogResult.error)
    }

    console.log(`Processing Stripe webhook: ${event.type}`)

    // Handle the event
    let processingSuccess = false
    let processingError: string | undefined

    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        const result = await processPaymentSuccessAtomic(supabaseAdmin, paymentIntent)
        processingSuccess = result.success
        processingError = result.error
        break
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        const result = await processPaymentFailureAtomic(supabaseAdmin, paymentIntent)
        processingSuccess = result.success
        processingError = result.error
        break
      }

      case 'payment_intent.canceled': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        const result = await processPaymentFailureAtomic(supabaseAdmin, paymentIntent)
        processingSuccess = result.success
        processingError = result.error
        break
      }

      case 'charge.succeeded': {
        const charge = event.data.object as Stripe.Charge
        const result = await processChargeSucceededAtomic(supabaseAdmin, charge)
        processingSuccess = result.success
        processingError = result.error
        break
      }

      case 'charge.failed': {
        const charge = event.data.object as Stripe.Charge
        console.log('Processing failed charge:', charge.id)
        console.error('Charge failure reason:', charge.failure_message)
        processingSuccess = true // Just log, no database changes needed
        break
      }

      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge
        const result = await processRefundAtomic(supabaseAdmin, charge)
        processingSuccess = result.success
        processingError = result.error
        break
      }

      case 'charge.dispute.created': {
        const dispute = event.data.object as Stripe.Dispute
        console.log('Processing new dispute:', dispute.id)
        console.log('Dispute reason:', dispute.reason)
        console.log('Dispute amount:', dispute.amount / 100, dispute.currency.toUpperCase())
        // TODO: Create admin notification for dispute
        processingSuccess = true // Just log for now
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
        processingSuccess = true // Don't fail for unknown events
    }

    // Mark webhook as processed
    if (!webhookLogResult.error) {
      await supabaseAdmin
        .from('webhook_logs')
        .update({ 
          status: processingSuccess ? 'completed' : 'failed',
          error_message: processingError || null,
          updated_at: new Date().toISOString()
        })
        .eq('request_id', requestId)
    }

    return new Response(JSON.stringify({ 
      received: true, 
      processed: processingSuccess,
      error: processingError 
    }), { 
      status: processingSuccess ? 200 : 500,
      headers: { 'Content-Type': 'application/json' }
    })
    
  } catch (err) {
    console.error('Webhook processing error:', err)
    return new Response(`Webhook Error: ${err.message}`, { 
      status: 500
    })
  }
})

// Legacy handler functions removed - now using atomic operations from atomic-operations.ts
// This ensures data consistency and proper error handling