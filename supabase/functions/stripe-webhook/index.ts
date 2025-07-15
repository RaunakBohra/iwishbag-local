import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.11.0?target=deno'
import { createWebhookHeaders } from '../_shared/cors.ts'

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
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        await handlePaymentSuccess(supabaseAdmin, paymentIntent)
        break
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        await handlePaymentFailure(supabaseAdmin, paymentIntent)
        break
      }

      case 'payment_intent.canceled': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        await handlePaymentCanceled(supabaseAdmin, paymentIntent)
        break
      }

      case 'charge.succeeded': {
        const charge = event.data.object as Stripe.Charge
        await handleChargeSucceeded(supabaseAdmin, charge)
        break
      }

      case 'charge.failed': {
        const charge = event.data.object as Stripe.Charge
        await handleChargeFailed(supabaseAdmin, charge)
        break
      }

      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge
        await handleChargeRefunded(supabaseAdmin, charge)
        break
      }

      case 'charge.dispute.created': {
        const dispute = event.data.object as Stripe.Dispute
        await handleDisputeCreated(supabaseAdmin, dispute)
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    // Mark webhook as processed
    if (!webhookLogResult.error) {
      await supabaseAdmin
        .from('webhook_logs')
        .update({ 
          status: 'completed',
          updated_at: new Date().toISOString()
        })
        .eq('request_id', requestId)
    }

    return new Response(JSON.stringify({ received: true }), { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })
    
  } catch (err) {
    console.error('Webhook processing error:', err)
    return new Response(`Webhook Error: ${err.message}`, { 
      status: 500
    })
  }
})

async function handlePaymentSuccess(supabaseAdmin: any, paymentIntent: Stripe.PaymentIntent) {
  console.log('Processing successful payment:', paymentIntent.id)
  
  // Extract metadata
  const quoteIds = paymentIntent.metadata.quote_ids?.split(',') || []
  const userId = paymentIntent.metadata.user_id
  const amount = paymentIntent.amount / 100 // Convert from cents
  const currency = paymentIntent.currency.toUpperCase()

  if (!quoteIds.length) {
    console.error('No quote IDs found in payment metadata')
    return
  }

  // Create payment transaction record
  const { error: txError } = await supabaseAdmin
    .from('payment_transactions')
    .insert({
      user_id: userId,
      quote_id: quoteIds[0], // Primary quote
      amount: amount,
      currency: currency,
      status: 'completed',
      payment_method: 'stripe',
      gateway_response: paymentIntent,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })

  if (txError) {
    console.error('Error creating payment transaction:', txError)
  }

  // Update quote status for all quotes
  for (const quoteId of quoteIds) {
    const { error: quoteError } = await supabaseAdmin
      .from('quotes')
      .update({
        status: 'paid',
        payment_status: 'paid',
        payment_method: 'stripe',
        paid_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', quoteId)
      .neq('status', 'paid') // Only update if not already paid

    if (quoteError) {
      console.error(`Error updating quote ${quoteId}:`, quoteError)
    }
  }

  // Create payment ledger entry directly
  try {
    const { error: ledgerError } = await supabaseAdmin
      .from('payment_ledger')
      .insert({
        quote_id: quoteIds[0],
        amount: amount,
        currency: currency,
        payment_type: 'customer_payment',
        payment_method: 'stripe',
        reference_number: paymentIntent.id,
        gateway_code: 'stripe',
        gateway_transaction_id: paymentIntent.id,
        notes: `Stripe payment via webhook - ${paymentIntent.description || ''}`,
        created_by: userId, // Required field
        created_at: new Date().toISOString()
      })

    if (ledgerError) {
      console.error('Error creating ledger entry:', ledgerError)
    } else {
      console.log('Payment ledger entry created successfully')
    }
  } catch (error) {
    console.error('Error creating payment ledger entry:', error)
  }

  console.log(`Payment ${paymentIntent.id} processed successfully`)
}

async function handlePaymentFailure(supabaseAdmin: any, paymentIntent: Stripe.PaymentIntent) {
  console.log('Processing failed payment:', paymentIntent.id)
  
  const quoteIds = paymentIntent.metadata.quote_ids?.split(',') || []
  const userId = paymentIntent.metadata.user_id

  // Record failed payment attempt
  await supabaseAdmin
    .from('payment_transactions')
    .insert({
      user_id: userId,
      quote_id: quoteIds[0],
      amount: paymentIntent.amount / 100,
      currency: paymentIntent.currency.toUpperCase(),
      status: 'failed',
      payment_method: 'stripe',
      gateway_response: paymentIntent,
      created_at: new Date().toISOString()
    })

  // Log the failure reason
  if (paymentIntent.last_payment_error) {
    console.error('Payment failure reason:', paymentIntent.last_payment_error.message)
  }
}

async function handlePaymentCanceled(supabaseAdmin: any, paymentIntent: Stripe.PaymentIntent) {
  console.log('Processing canceled payment:', paymentIntent.id)
  
  const quoteIds = paymentIntent.metadata.quote_ids?.split(',') || []
  const userId = paymentIntent.metadata.user_id

  // Record canceled payment
  await supabaseAdmin
    .from('payment_transactions')
    .insert({
      user_id: userId,
      quote_id: quoteIds[0],
      amount: paymentIntent.amount / 100,
      currency: paymentIntent.currency.toUpperCase(),
      status: 'cancelled',
      payment_method: 'stripe',
      gateway_response: paymentIntent,
      created_at: new Date().toISOString()
    })
}

async function handleChargeSucceeded(supabaseAdmin: any, charge: Stripe.Charge) {
  console.log('Processing successful charge:', charge.id)
  
  // Update payment transaction with charge details
  if (charge.payment_intent) {
    await supabaseAdmin
      .from('payment_transactions')
      .update({
        gateway_response: charge,
        updated_at: new Date().toISOString()
      })
      .eq('gateway_response->id', charge.payment_intent)
  }

  // Store receipt URL if available
  if (charge.receipt_url) {
    console.log('Receipt URL available:', charge.receipt_url)
  }
}

async function handleChargeFailed(supabaseAdmin: any, charge: Stripe.Charge) {
  console.log('Processing failed charge:', charge.id)
  console.error('Charge failure reason:', charge.failure_message)
}

async function handleChargeRefunded(supabaseAdmin: any, charge: Stripe.Charge) {
  console.log('Processing refunded charge:', charge.id)
  
  const refundAmount = charge.amount_refunded / 100
  const currency = charge.currency.toUpperCase()
  
  // Create refund record in payment ledger
  if (charge.payment_intent && refundAmount > 0) {
    // Find the original quote
    const { data: transaction } = await supabaseAdmin
      .from('payment_transactions')
      .select('quote_id, user_id')
      .eq('gateway_response->id', charge.payment_intent)
      .single()

    if (transaction) {
      await supabaseAdmin.rpc('create_payment_with_ledger_entry', {
        p_quote_id: transaction.quote_id,
        p_amount: refundAmount,
        p_currency: currency,
        p_payment_method: 'stripe',
        p_payment_type: charge.amount_refunded === charge.amount ? 'refund' : 'partial_refund',
        p_reference_number: `${charge.id}_refund`,
        p_gateway_code: 'stripe',
        p_gateway_transaction_id: charge.id,
        p_notes: `Stripe refund via webhook`,
        p_user_id: transaction.user_id
      })
    }
  }
}

async function handleDisputeCreated(supabaseAdmin: any, dispute: Stripe.Dispute) {
  console.log('Processing new dispute:', dispute.id)
  console.log('Dispute reason:', dispute.reason)
  console.log('Dispute amount:', dispute.amount / 100, dispute.currency.toUpperCase())
  
  // TODO: Create notification for admin about the dispute
  // This is critical as disputes can lead to chargebacks
}