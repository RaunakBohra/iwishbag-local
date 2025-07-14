-- Check PayPal configuration in payment_gateways table
SELECT 
    code,
    is_active,
    test_mode,
    config,
    jsonb_pretty(config) as config_pretty
FROM payment_gateways 
WHERE code = 'paypal';

-- Check what keys are present in the config
SELECT 
    code,
    is_active,
    test_mode,
    jsonb_object_keys(config) as config_keys
FROM payment_gateways 
WHERE code = 'paypal';