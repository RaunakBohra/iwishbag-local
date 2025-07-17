-- Setup eSewa payment gateway configuration for local database
-- Based on local database schema

DO $$
BEGIN
    -- Update or insert eSewa configuration
    INSERT INTO payment_gateways (
        code,
        name,
        config,
        test_mode,
        is_active,
        supported_currencies,
        priority,
        description
    ) VALUES (
        'esewa',
        'eSewa',
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
        3,
        'Pay using eSewa mobile app with QR code.'
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
        is_active = true,
        supported_currencies = ARRAY['NPR'],
        priority = 3,
        description = 'Pay using eSewa mobile app with QR code.',
        updated_at = now();

    RAISE NOTICE 'eSewa gateway configuration updated successfully in local database';
END
$$;