-- Get the webhook signing secret from Stripe Dashboard
-- Go to: https://dashboard.stripe.com/test/webhooks/we_YOUR_WEBHOOK_ID
-- Click "Reveal" under "Signing secret" 
-- It will look like: whsec_XXXXXXXXXXXXXXXXXXXXXXXX

-- Update the Stripe configuration with your webhook secret
UPDATE payment_gateways
SET config = jsonb_set(
    COALESCE(config, '{}'::jsonb),
    '{webhook_secret}',
    '"whsec_YOUR_ACTUAL_WEBHOOK_SECRET_HERE"'::jsonb
),
updated_at = NOW()
WHERE code = 'stripe';

-- Verify the configuration
SELECT 
    code,
    name,
    config->>'test_secret_key' as has_test_key,
    config->>'webhook_secret' as webhook_secret,
    test_mode,
    updated_at
FROM payment_gateways 
WHERE code = 'stripe';