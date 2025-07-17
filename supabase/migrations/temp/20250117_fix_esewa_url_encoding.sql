-- Fix eSewa URL encoding issue
-- Clean up any potential whitespace or encoding issues in the URLs

UPDATE payment_gateways
SET config = jsonb_build_object(
    'api_version', 'v2',
    'product_code', 'EPAYTEST',
    'secret_key', '8gBm/:&EnhH.1/q',
    'environment', 'test',
    'test_url', 'https://rc-epay.esewa.com.np/api/epay/main/v2/form',
    'live_url', 'https://epay.esewa.com.np/api/epay/main/v2/form',
    'verify_test_url', 'https://uat.esewa.com.np/epay/transrec',
    'verify_live_url', 'https://esewa.com.np/epay/transrec'
)
WHERE code = 'esewa';

-- Verify the update
SELECT 
    code,
    config->>'test_url' as test_url,
    config->>'live_url' as live_url,
    LENGTH(config->>'test_url') as test_url_length,
    LENGTH(config->>'live_url') as live_url_length
FROM payment_gateways 
WHERE code = 'esewa';