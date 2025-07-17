-- Insert or update eSewa payment gateway configuration for cloud database
-- First check if eSewa already exists and delete it if needed
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
        "base_url": "https://uat.esewa.com.np",
        "payment_url": "https://uat.esewa.com.np/epay/main",
        "verify_url": "https://uat.esewa.com.np/epay/transrec"
    }'::jsonb,
    true,
    3,
    'eSewa digital wallet for Nepal - Test Environment'
);

-- Verify the insertion
SELECT code, name, is_active, supported_currencies, test_mode, priority, config FROM payment_gateways WHERE code = 'esewa';