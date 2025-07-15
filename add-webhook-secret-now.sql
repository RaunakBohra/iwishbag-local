-- Add your Stripe webhook signing secret
-- Get it from: https://dashboard.stripe.com/test/webhooks/[your-webhook-id]

-- First check current config
SELECT 
    code,
    name,
    config,
    test_mode,
    enabled
FROM payment_gateways 
WHERE code = 'stripe';

-- Update with your webhook secret
-- REPLACE whsec_XXXXX with your actual webhook signing secret
UPDATE payment_gateways
SET config = jsonb_set(
    COALESCE(config, '{}'::jsonb),
    '{webhook_secret}',
    '"whsec_YOUR_ACTUAL_WEBHOOK_SECRET_HERE"'::jsonb
),
updated_at = NOW()
WHERE code = 'stripe';

-- Verify the update
SELECT 
    code,
    config->>'test_secret_key' as has_secret_key,
    config->>'webhook_secret' as webhook_secret,
    CASE 
        WHEN config->>'webhook_secret' LIKE 'whsec_%' THEN 'Valid format ✅'
        ELSE 'Invalid format ❌'
    END as webhook_format_check
FROM payment_gateways 
WHERE code = 'stripe';