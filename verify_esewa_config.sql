-- Verification script for eSewa configuration
-- Execute this in Supabase Dashboard after running the main script

-- Check if eSewa exists and is properly configured
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM payment_gateways WHERE code = 'esewa' AND is_active = true) 
        THEN '✅ eSewa is configured and active'
        ELSE '❌ eSewa is not configured or not active'
    END as status;

-- Detailed eSewa configuration
SELECT 
    'eSewa Configuration Details:' as section,
    code,
    name,
    is_active,
    supported_countries,
    supported_currencies,
    fee_percent,
    fee_fixed,
    test_mode,
    priority,
    description,
    config
FROM payment_gateways 
WHERE code = 'esewa';

-- Check config JSON structure
SELECT 
    'Config JSON Keys:' as section,
    jsonb_object_keys(config) as config_keys
FROM payment_gateways 
WHERE code = 'esewa';

-- Verify specific config values
SELECT 
    'Config Values Verification:' as section,
    config->>'product_code' as product_code,
    config->>'environment' as environment,
    config->>'success_url' as success_url,
    config->>'failure_url' as failure_url,
    CASE 
        WHEN config->>'secret_key' IS NOT NULL 
        THEN '✅ Secret key is set'
        ELSE '❌ Secret key is missing'
    END as secret_key_status
FROM payment_gateways 
WHERE code = 'esewa';