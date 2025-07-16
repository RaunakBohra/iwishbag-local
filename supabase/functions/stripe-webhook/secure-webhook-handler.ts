/**
 * Secure Stripe webhook handler with atomic operations and proper error handling
 * Implements security hardening and data integrity measures
 */

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

// Webhook processing configuration
const WEBHOOK_CONFIG = {
  MAX_PROCESSING_TIME: 25000, // 25 seconds max processing time
  MAX_RETRY_ATTEMPTS: 3,
  SUPPORTED_EVENTS: [
    'payment_intent.succeeded',
    'payment_intent.payment_failed',
    'payment_intent.canceled',
    'charge.succeeded',
    'charge.failed',
    'charge.refunded',
    'charge.dispute.created'
  ]
}

interface WebhookProcessingResult {
  success: boolean;
  eventType: string;
  eventId: string;
  processed: boolean;
  error?: string;
  processingTime?: number;
}

serve(async (req) => {
  const startTime = Date.now()
  
  // Webhooks only accept POST
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders })
  }

  const signature = req.headers.get('stripe-signature')
  
  if (!signature) {
    return new Response('Missing signature', { status: 400, headers: corsHeaders })
  }

  let requestId = ''
  let eventType = ''
  let eventId = ''

  try {
    const body = await req.text()
    
    // Initialize Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get Stripe configuration securely
    const stripeConfig = await getStripeConfiguration(supabaseAdmin)
    if (!stripeConfig.success) {
      return new Response('Configuration error', { 
        status: 500, 
        headers: corsHeaders 
      })
    }

    const stripe = new Stripe(stripeConfig.secretKey!, {
      apiVersion: '2023-10-16',
    })

    // Verify webhook signature
    const eventResult = await verifyWebhookSignature(
      stripe, 
      body, 
      signature, 
      stripeConfig.webhookSecret!
    )
    
    if (!eventResult.success) {
      return new Response(`Webhook Error: ${eventResult.error}`, { 
        status: 400, 
        headers: corsHeaders 
      })
    }

    const event = eventResult.event!
    eventType = event.type
    eventId = event.id
    requestId = `stripe-${eventId}-${Date.now()}`

    // Check if event is supported
    if (!WEBHOOK_CONFIG.SUPPORTED_EVENTS.includes(eventType)) {
      console.log(`Unsupported event type: ${eventType}`)
      return new Response(JSON.stringify({ 
        received: true, 
        processed: false,
        reason: 'Unsupported event type'
      }), { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Log webhook event securely
    const webhookLogResult = await logWebhookEvent(
      supabaseAdmin, 
      requestId, 
      eventType, 
      req.headers.get('user-agent') || 'Unknown'
    )

    // Process the event with timeout protection
    const processingResult = await Promise.race([
      processWebhookEvent(supabaseAdmin, event),
      new Promise<WebhookProcessingResult>((_, reject) => 
        setTimeout(() => reject(new Error('Processing timeout')), WEBHOOK_CONFIG.MAX_PROCESSING_TIME)
      )
    ])

    // Update webhook log with result
    if (!webhookLogResult.error) {
      await updateWebhookLog(supabaseAdmin, requestId, processingResult)
    }

    const processingTime = Date.now() - startTime

    return new Response(JSON.stringify({ 
      received: true,
      processed: processingResult.success,
      eventType,
      eventId,
      processingTime,
      error: processingResult.error
    }), { 
      status: processingResult.success ? 200 : 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
    
  } catch (err) {
    const processingTime = Date.now() - startTime
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    
    console.error('Webhook processing error:', {
      error: errorMessage,
      eventType,
      eventId,
      processingTime,
      requestId
    })

    return new Response(JSON.stringify({
      received: true,
      processed: false,
      error: 'Internal processing error',
      processingTime
    }), { 
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})

/**
 * Securely retrieves Stripe configuration from database
 */
async function getStripeConfiguration(supabaseAdmin: SupabaseClient): Promise<{
  success: boolean;
  secretKey?: string;
  webhookSecret?: string;
  error?: string;
}> {
  try {
    const { data: stripeGateway, error } = await supabaseAdmin
      .from('payment_gateways')
      .select('config, test_mode')
      .eq('code', 'stripe')
      .single()

    if (error || !stripeGateway) {
      console.error('Failed to get Stripe config:', error)
      return { success: false, error: 'Configuration not found' }
    }

    const config = stripeGateway.config || {}
    const testMode = stripeGateway.test_mode
    
    const secretKey = testMode 
      ? config.test_secret_key 
      : (config.live_secret_key || config.secret_key)
    const webhookSecret = config.webhook_secret

    if (!secretKey || !webhookSecret) {
      return { success: false, error: 'Missing required keys' }
    }

    return {
      success: true,
      secretKey,
      webhookSecret
    }
  } catch (error) {
    return { success: false, error: 'Configuration retrieval failed' }
  }
}

/**
 * Verifies webhook signature securely
 */
async function verifyWebhookSignature(
  stripe: Stripe,
  body: string,
  signature: string,
  webhookSecret: string
): Promise<{
  success: boolean;
  event?: Stripe.Event;
  error?: string;
}> {
  try {
    const event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret)
    return { success: true, event }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Signature verification failed'
    console.error('Webhook signature verification failed:', errorMessage)
    return { success: false, error: errorMessage }
  }
}

/**
 * Logs webhook event securely
 */
async function logWebhookEvent(
  supabaseAdmin: SupabaseClient,
  requestId: string,
  eventType: string,
  userAgent: string
): Promise<{ error?: unknown }> {
  try {
    const { error } = await supabaseAdmin.from('webhook_logs').insert({
      request_id: requestId,
      webhook_type: 'stripe',
      event_type: eventType,
      status: 'processing',
      user_agent: userAgent,
      created_at: new Date().toISOString()
    })
    
    return { error }
  } catch (error) {
    console.error('Failed to log webhook event:', error)
    return { error }
  }
}

/**
 * Updates webhook log with processing result
 */
async function updateWebhookLog(
  supabaseAdmin: SupabaseClient,
  requestId: string,
  result: WebhookProcessingResult
): Promise<void> {
  try {
    await supabaseAdmin
      .from('webhook_logs')
      .update({ 
        status: result.success ? 'completed' : 'failed',
        error_message: result.error || null,
        processing_time_ms: result.processingTime || 0,
        updated_at: new Date().toISOString()
      })
      .eq('request_id', requestId)
  } catch (error) {
    console.error('Failed to update webhook log:', error)
  }
}

/**
 * Processes webhook event with atomic operations
 */
async function processWebhookEvent(
  supabaseAdmin: SupabaseClient,
  event: Stripe.Event
): Promise<WebhookProcessingResult> {
  const startTime = Date.now()
  
  try {
    let result: Record<string, unknown>

    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        result = await processPaymentSuccessAtomic(supabaseAdmin, paymentIntent)
        break
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        result = await processPaymentFailureAtomic(supabaseAdmin, paymentIntent)
        break
      }

      case 'payment_intent.canceled': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        result = await processPaymentFailureAtomic(supabaseAdmin, paymentIntent)
        break
      }

      case 'charge.succeeded': {
        const charge = event.data.object as Stripe.Charge
        result = await processChargeSucceededAtomic(supabaseAdmin, charge)
        break
      }

      case 'charge.failed': {
        const charge = event.data.object as Stripe.Charge
        console.log('Processing failed charge:', charge.id)
        console.error('Charge failure reason:', charge.failure_message)
        result = { success: true } // Just log, no database changes needed
        break
      }

      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge
        result = await processRefundAtomic(supabaseAdmin, charge)
        break
      }

      case 'charge.dispute.created': {
        const dispute = event.data.object as Stripe.Dispute
        console.log('Processing new dispute:', dispute.id)
        console.log('Dispute reason:', dispute.reason)
        console.log('Dispute amount:', dispute.amount / 100, dispute.currency.toUpperCase())
        // TODO: Create admin notification for dispute
        result = { success: true } // Just log for now
        break
      }

      default:
        result = { success: false, error: `Unsupported event type: ${event.type}` }
    }

    const processingTime = Date.now() - startTime

    return {
      success: result.success,
      eventType: event.type,
      eventId: event.id,
      processed: result.success,
      error: result.error,
      processingTime
    }

  } catch (error) {
    const processingTime = Date.now() - startTime
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    
    console.error(`Error processing ${event.type}:`, errorMessage)
    
    return {
      success: false,
      eventType: event.type,
      eventId: event.id,
      processed: false,
      error: errorMessage,
      processingTime
    }
  }
}