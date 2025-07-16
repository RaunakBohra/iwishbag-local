-- Update Airwallex webhook secret with the actual secret from Airwallex dashboard

-- Since you're in test mode, update the test webhook secret
UPDATE payment_gateways 
SET config = jsonb_set(
    COALESCE(config, '{}'::jsonb),
    '{test_webhook_secret}',
    '"whsec_yBiHhAfRrRpMqmgGUohAZ92CBDFIt26L"'::jsonb
)
WHERE code = 'airwallex';

-- Also set it as the general webhook_secret for backwards compatibility
UPDATE payment_gateways 
SET config = jsonb_set(
    COALESCE(config, '{}'::jsonb),
    '{webhook_secret}',
    '"whsec_yBiHhAfRrRpMqmgGUohAZ92CBDFIt26L"'::jsonb
)
WHERE code = 'airwallex';

-- Verify the update
SELECT 
    code,
    name,
    test_mode,
    config->>'test_webhook_secret' as test_webhook_secret,
    config->>'webhook_secret' as webhook_secret,
    config->>'test_api_key' as test_api_key,
    config->>'client_id' as client_id
FROM payment_gateways 
WHERE code = 'airwallex';