-- ===================================================
-- eSewa Payment Gateway Configuration Script
-- Execute this in Supabase Dashboard > SQL Editor
-- ===================================================

-- Check current payment gateways
SELECT 'Current payment gateways:' as info;
SELECT code, name, is_active, supported_currencies, test_mode, priority 
FROM payment_gateways 
ORDER BY priority;

-- Remove existing eSewa configuration if it exists
DELETE FROM payment_gateways WHERE code = 'esewa';

-- Insert eSewa configuration
INSERT INTO payment_gateways (
    code,
    name,
    is_active,
    supported_countries,
    supported_currencies,
    fee_percent,
    fee_fixed,
    config,
    test_mode,
    priority,
    description
) VALUES (
    'esewa',
    'eSewa',
    true,
    ARRAY['NP'],
    ARRAY['NPR'],
    2.5,
    0,
    '{
        "product_code": "EPAYTEST",
        "secret_key": "8gBm/:&EnhH.1/q",
        "environment": "test",
        "success_url": "/payment-callback/esewa-success",
        "failure_url": "/payment-callback/esewa-failure"
    }'::jsonb,
    true,
    3,
    'eSewa digital wallet for Nepal - Test Environment'
);

-- Verify the insertion
SELECT 'eSewa configuration after insertion:' as info;
SELECT 
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

-- Show all payment gateways ordered by priority
SELECT 'All payment gateways after eSewa addition:' as info;
SELECT code, name, is_active, supported_currencies, test_mode, priority 
FROM payment_gateways 
ORDER BY priority;