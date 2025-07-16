-- Update Airwallex Configuration (API Keys, Client ID, and Webhook Secret)
-- This script helps you configure all necessary credentials for Airwallex payment gateway

-- First, check current Airwallex configuration
SELECT 
    code,
    name,
    test_mode,
    config
FROM payment_gateways 
WHERE code = 'airwallex';

-- IMPORTANT: Airwallex requires the following credentials:
-- 1. API Key (for authentication)
-- 2. Client ID (for authentication)
-- 3. Webhook Secret (for webhook signature verification)

-- Update ALL Airwallex credentials for TEST mode
UPDATE payment_gateways 
SET config = config || jsonb_build_object(
    'test_api_key', 'your_test_api_key_here',
    'client_id', 'your_client_id_here',
    'test_webhook_secret', 'your_test_webhook_secret_here'
)
WHERE code = 'airwallex';

-- Update ALL Airwallex credentials for LIVE/PRODUCTION mode
UPDATE payment_gateways 
SET config = config || jsonb_build_object(
    'live_api_key', 'your_live_api_key_here',
    'api_key', 'your_live_api_key_here',  -- Fallback
    'client_id', 'your_client_id_here',    -- Same for test and live
    'live_webhook_secret', 'your_live_webhook_secret_here',
    'webhook_secret', 'your_live_webhook_secret_here'  -- Fallback
)
WHERE code = 'airwallex';

-- Alternative: Update credentials individually
-- Uncomment the specific updates you need:

/*
-- Update TEST API Key only
UPDATE payment_gateways 
SET config = jsonb_set(
    COALESCE(config, '{}'::jsonb),
    '{test_api_key}',
    '"your_test_api_key_here"'::jsonb
)
WHERE code = 'airwallex';

-- Update LIVE API Key only
UPDATE payment_gateways 
SET config = jsonb_set(
    COALESCE(config, '{}'::jsonb),
    '{live_api_key}',
    '"your_live_api_key_here"'::jsonb
)
WHERE code = 'airwallex';

-- Update Client ID (used for both test and live)
UPDATE payment_gateways 
SET config = jsonb_set(
    COALESCE(config, '{}'::jsonb),
    '{client_id}',
    '"your_client_id_here"'::jsonb
)
WHERE code = 'airwallex';

-- Update TEST webhook secret only
UPDATE payment_gateways 
SET config = jsonb_set(
    COALESCE(config, '{}'::jsonb),
    '{test_webhook_secret}',
    '"your_test_webhook_secret_here"'::jsonb
)
WHERE code = 'airwallex';

-- Update LIVE webhook secret only
UPDATE payment_gateways 
SET config = jsonb_set(
    COALESCE(config, '{}'::jsonb),
    '{live_webhook_secret}',
    '"your_live_webhook_secret_here"'::jsonb
)
WHERE code = 'airwallex';
*/

-- Verify the update
SELECT 
    code,
    name,
    test_mode,
    config->>'test_api_key' as test_api_key,
    config->>'live_api_key' as live_api_key,
    config->>'api_key' as api_key_fallback,
    config->>'client_id' as client_id,
    config->>'test_webhook_secret' as test_webhook_secret,
    config->>'live_webhook_secret' as live_webhook_secret,
    config->>'webhook_secret' as webhook_secret_fallback
FROM payment_gateways 
WHERE code = 'airwallex';

-- How to get your Airwallex credentials:
-- 1. Log into your Airwallex dashboard
-- 2. For API Key and Client ID:
--    - Go to Settings → API keys
--    - Create a new API key or use existing one
--    - You'll get both API Key and Client ID
-- 3. For Webhook Secret:
--    - Go to Developers → Webhooks
--    - Create or edit your webhook endpoint
--    - Copy the signing secret