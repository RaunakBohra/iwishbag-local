-- Update Stripe webhook secret in payment_gateways table
-- Replace 'whsec_YOUR_WEBHOOK_SECRET_HERE' with the actual webhook secret from Stripe

UPDATE payment_gateways
SET config = jsonb_set(
    config,
    '{webhook_secret}',
    '"whsec_YOUR_WEBHOOK_SECRET_HERE"'::jsonb
),
updated_at = NOW()
WHERE code = 'stripe';

-- Verify the update
SELECT 
    code,
    name,
    config->>'webhook_secret' as webhook_secret,
    config->>'test_secret_key' as has_test_key,
    config->>'test_publishable_key' as has_publishable_key,
    test_mode
FROM payment_gateways 
WHERE code = 'stripe';