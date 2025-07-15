# Test Your Stripe Webhook

## 1. Verify Your Webhook in Stripe Dashboard

Go to: https://dashboard.stripe.com/test/webhooks

Check:
- Is your webhook URL exactly: `https://grgvlrvywsfmnmkxrecd.supabase.co/functions/v1/stripe-webhook`
- Is there only ONE webhook with this URL?
- Click on the webhook and verify the signing secret matches: `whsec_86XX51qdUUqd6jDJzNjbEwHOMh7jCyjY`

## 2. Test with Stripe CLI (Most Reliable)

```bash
# Install Stripe CLI if you haven't
brew install stripe/stripe-cli/stripe

# Login to Stripe
stripe login

# Forward events to your webhook
stripe listen --forward-to https://grgvlrvywsfmnmkxrecd.supabase.co/functions/v1/stripe-webhook

# In another terminal, trigger a test event
stripe trigger payment_intent.succeeded
```

## 3. Test from Stripe Dashboard

In your webhook details page:
1. Click "Send test webhook"
2. Select event type: `payment_intent.succeeded`
3. Click "Send test webhook"

## 4. Check Function Logs

```bash
# Check the logs
npx supabase functions logs stripe-webhook --tail 50
```

## 5. Manual Test with cURL

```bash
# This will fail (no signature) but shows if endpoint is reachable
curl -X POST https://grgvlrvywsfmnmkxrecd.supabase.co/functions/v1/stripe-webhook \
  -H "Content-Type: application/json" \
  -d '{"test": true}'
```

Should return: "No signature"

## Common Issues:

1. **Multiple Webhooks**: If you have multiple webhooks in Stripe, make sure you're using the signing secret from the correct one

2. **Wrong Secret**: Double-check the webhook secret in both places:
   - Stripe Dashboard: The webhook's signing secret
   - Database: The `webhook_secret` in payment_gateways table

3. **Old Webhook**: Delete any old/unused webhooks in Stripe Dashboard to avoid confusion