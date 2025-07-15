# Setting Up Stripe Webhook for Payment Confirmation

## 1. Create Webhook Endpoint in Stripe Dashboard

1. Go to https://dashboard.stripe.com/test/webhooks
2. Click "Add endpoint"
3. Enter endpoint URL: `https://grgvlrvywsfmnmkxrecd.supabase.co/functions/v1/stripe-webhook`
4. Select events to listen to:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `payment_intent.canceled`
5. Copy the webhook signing secret (starts with `whsec_`)

## 2. Update payment_gateways Table

```sql
UPDATE payment_gateways
SET config = jsonb_set(
    config,
    '{webhook_secret}',
    '"YOUR_WEBHOOK_SECRET_HERE"'::jsonb
)
WHERE code = 'stripe';
```

## 3. Create Stripe Webhook Function

Create a new Edge Function at `supabase/functions/stripe-webhook/index.ts`:

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.11.0?target=deno'

serve(async (req) => {
  const signature = req.headers.get('stripe-signature')
  
  if (!signature) {
    return new Response('No signature', { status: 400 })
  }

  try {
    const body = await req.text()
    
    // Get Stripe config from database
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { data: stripeGateway } = await supabaseAdmin
      .from('payment_gateways')
      .select('config')
      .eq('code', 'stripe')
      .single()

    const webhookSecret = stripeGateway?.config?.webhook_secret
    const stripeSecretKey = stripeGateway?.config?.test_secret_key

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16',
    })

    // Verify webhook signature
    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      webhookSecret
    )

    // Handle the event
    switch (event.type) {
      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object
        
        // Extract quote ID from metadata
        const quoteId = paymentIntent.metadata.quote_ids
        const userId = paymentIntent.metadata.user_id
        
        // Create payment records
        await supabaseAdmin.from('payment_transactions').insert({
          user_id: userId,
          quote_id: quoteId,
          amount: paymentIntent.amount / 100, // Convert from cents
          currency: paymentIntent.currency.toUpperCase(),
          status: 'completed',
          payment_method: 'stripe',
          gateway_response: paymentIntent,
        })

        // Update quote status
        await supabaseAdmin
          .from('quotes')
          .update({
            status: 'paid',
            payment_status: 'paid',
            payment_method: 'stripe',
            payment_completed_at: new Date().toISOString(),
          })
          .eq('id', quoteId)

        // Create payment ledger entry
        await supabaseAdmin.rpc('create_payment_with_ledger_entry', {
          p_quote_id: quoteId,
          p_amount: paymentIntent.amount / 100,
          p_currency: paymentIntent.currency.toUpperCase(),
          p_payment_method: 'stripe',
          p_payment_type: 'customer_payment',
          p_reference_number: paymentIntent.id,
          p_gateway_code: 'stripe',
          p_gateway_transaction_id: paymentIntent.id,
          p_notes: 'Stripe payment via webhook',
          p_user_id: userId,
        })

        break

      case 'payment_intent.payment_failed':
        // Handle failed payment
        console.log('Payment failed:', event.data.object)
        break
    }

    return new Response(JSON.stringify({ received: true }), { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })
    
  } catch (err) {
    console.error('Webhook error:', err.message)
    return new Response(`Webhook Error: ${err.message}`, { status: 400 })
  }
})
```

## 4. Deploy the Webhook Function

```bash
npx supabase functions deploy stripe-webhook
```

## 5. Test the Webhook

Use Stripe CLI to test locally:
```bash
stripe listen --forward-to https://grgvlrvywsfmnmkxrecd.supabase.co/functions/v1/stripe-webhook
```

Or use the Stripe Dashboard webhook testing tools.