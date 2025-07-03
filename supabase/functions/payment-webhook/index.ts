import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@12.12.0?target=deno&deno-std=0.132.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') as string, {
  httpClient: Stripe.createFetchHttpClient(),
  apiVersion: '2023-10-16',
});

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get the webhook signature from headers
    const signature = req.headers.get('stripe-signature');
    const body = await req.text();

    if (!signature) {
      return new Response(JSON.stringify({ error: 'No signature found' }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    let event: Stripe.Event;

    try {
      // Verify the webhook signature
      const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
      if (!webhookSecret) {
        console.error('STRIPE_WEBHOOK_SECRET not configured');
        return new Response(JSON.stringify({ error: 'Webhook secret not configured' }), { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return new Response(JSON.stringify({ error: 'Invalid signature' }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('Received webhook event:', event.type);

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object as Stripe.Checkout.Session;
        await handlePaymentSuccess(session, supabaseAdmin);
        break;

      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await handlePaymentIntentSuccess(paymentIntent, supabaseAdmin);
        break;

      case 'payment_intent.payment_failed':
        const failedPaymentIntent = event.data.object as Stripe.PaymentIntent;
        await handlePaymentFailure(failedPaymentIntent, supabaseAdmin);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), { 
      status: 200, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(
      JSON.stringify({ error: 'Webhook handler failed', details: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

async function handlePaymentSuccess(session: Stripe.Checkout.Session, supabaseAdmin: any) {
  try {
    console.log('Processing successful payment for session:', session.id);

    // Extract quote IDs from metadata
    const quoteIds = session.metadata?.quoteIds?.split(',') || [];
    
    if (quoteIds.length === 0) {
      console.error('No quote IDs found in session metadata');
      return;
    }

    // Update all quotes to paid status
    for (const quoteId of quoteIds) {
      const { data: quote, error: fetchError } = await supabaseAdmin
        .from('quotes')
        .select('id, status, order_display_id, user_id')
        .eq('id', quoteId)
        .single();

      if (fetchError) {
        console.error(`Failed to fetch quote ${quoteId}:`, fetchError);
        continue;
      }

      if (!quote) {
        console.error(`Quote ${quoteId} not found`);
        continue;
      }

      // Only update if not already paid
      if (quote.status !== 'paid') {
        const updateData: any = {
          status: 'paid',
          paid_at: new Date().toISOString(),
          payment_method: 'stripe',
          in_cart: false // Remove from cart
        };

        // Generate order display ID if not exists
        if (!quote.order_display_id) {
          updateData.order_display_id = `ORD-${quoteId.substring(0, 6).toUpperCase()}`;
        }

        const { error: updateError } = await supabaseAdmin
          .from('quotes')
          .update(updateData)
          .eq('id', quoteId);

        if (updateError) {
          console.error(`Failed to update quote ${quoteId}:`, updateError);
        } else {
          console.log(`Successfully updated quote ${quoteId} to paid status`);
          
          // Log the status transition
          await logStatusTransition(supabaseAdmin, {
            quoteId,
            fromStatus: quote.status,
            toStatus: 'paid',
            trigger: 'payment_received',
            metadata: { 
              payment_method: 'stripe',
              session_id: session.id,
              amount: session.amount_total
            }
          });
        }
      }
    }

    // Create payment transaction record
    await createPaymentTransaction(supabaseAdmin, {
      quoteIds,
      gateway_code: 'stripe',
      transaction_id: session.id,
      gateway_transaction_id: session.payment_intent as string,
      amount: (session.amount_total || 0) / 100, // Convert from cents
      currency: session.currency || 'usd',
      status: 'completed',
      gateway_response: session
    });

  } catch (error) {
    console.error('Error handling payment success:', error);
  }
}

async function handlePaymentIntentSuccess(paymentIntent: Stripe.PaymentIntent, supabaseAdmin: any) {
  try {
    console.log('Processing successful payment intent:', paymentIntent.id);
    
    // This is a fallback for direct payment intents (not through checkout sessions)
    // You might need to implement additional logic to map payment intents to quotes
    
  } catch (error) {
    console.error('Error handling payment intent success:', error);
  }
}

async function handlePaymentFailure(paymentIntent: Stripe.PaymentIntent, supabaseAdmin: any) {
  try {
    console.log('Processing failed payment intent:', paymentIntent.id);
    
    // Handle payment failure - you might want to update quote status or send notifications
    
  } catch (error) {
    console.error('Error handling payment failure:', error);
  }
}

async function createPaymentTransaction(supabaseAdmin: any, transactionData: any) {
  try {
    const { error } = await supabaseAdmin
      .from('payment_transactions')
      .insert({
        quote_id: transactionData.quoteIds[0], // For now, link to first quote
        gateway_code: transactionData.gateway_code,
        transaction_id: transactionData.transaction_id,
        gateway_transaction_id: transactionData.gateway_transaction_id,
        amount: transactionData.amount,
        currency: transactionData.currency,
        status: transactionData.status,
        gateway_response: transactionData.gateway_response
      });

    if (error) {
      console.error('Failed to create payment transaction:', error);
    } else {
      console.log('Payment transaction created successfully');
    }
  } catch (error) {
    console.error('Error creating payment transaction:', error);
  }
}

async function logStatusTransition(supabaseAdmin: any, event: any) {
  try {
    const { error } = await supabaseAdmin
      .from('status_transitions')
      .insert({
        quote_id: event.quoteId,
        from_status: event.fromStatus,
        to_status: event.toStatus,
        trigger: event.trigger,
        metadata: event.metadata
      });

    if (error) {
      console.error('Failed to log status transition:', error);
    }
  } catch (error) {
    console.error('Error logging status transition:', error);
  }
} 