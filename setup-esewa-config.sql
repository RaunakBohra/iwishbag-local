-- Setup eSewa payment gateway configuration
-- Based on eSewa documentation and test credentials

-- First check if eSewa gateway exists
DO $$
BEGIN
    -- Update or insert eSewa configuration
    INSERT INTO payment_gateways (
        code,
        name,
        type,
        config,
        test_mode,
        enabled,
        supported_currencies,
        priority
    ) VALUES (
        'esewa',
        'eSewa',
        'wallet',
        '{
            "product_code": "EPAYTEST",
            "secret_key": "8gBm/:&EnhH.1/q",
            "environment": "test",
            "success_url": "/payment-callback/esewa-success",
            "failure_url": "/payment-callback/esewa-failure"
        }'::jsonb,
        true,
        true,
        ARRAY['NPR'],
        3
    )
    ON CONFLICT (code) 
    DO UPDATE SET
        config = '{
            "product_code": "EPAYTEST",
            "secret_key": "8gBm/:&EnhH.1/q",
            "environment": "test",
            "success_url": "/payment-callback/esewa-success",
            "failure_url": "/payment-callback/esewa-failure"
        }'::jsonb,
        test_mode = true,
        enabled = true,
        supported_currencies = ARRAY['NPR'],
        priority = 3,
        updated_at = now();

    RAISE NOTICE 'eSewa gateway configuration updated successfully';
END
$$;