-- Seed data to update PayU gateway with OAuth 2.0 support
-- This file should be executed after the migration to add OAuth credentials

-- Update PayU gateway configuration to include OAuth 2.0 credentials
-- NOTE: Replace the placeholder values with your actual PayU credentials

UPDATE public.payment_gateways 
SET 
    config = jsonb_set(
        jsonb_set(
            jsonb_set(
                COALESCE(config, '{}'),
                '{client_id}', 
                '"YOUR_PAYU_OAUTH_CLIENT_ID"'::jsonb
            ),
            '{client_secret}', 
            '"YOUR_PAYU_OAUTH_CLIENT_SECRET"'::jsonb
        ),
        '{merchant_id}', 
        '"YOUR_PAYU_MERCHANT_ID"'::jsonb
    ),
    priority = 1,
    description = 'PayU Payment Gateway with OAuth 2.0 support for enhanced payment links'
WHERE code = 'payu';

-- If PayU gateway doesn't exist, create it with OAuth support
INSERT INTO public.payment_gateways (
    name,
    code,
    is_active,
    supported_countries,
    supported_currencies,
    fee_percent,
    fee_fixed,
    config,
    test_mode,
    priority,
    description
) 
SELECT 
    'PayU India',
    'payu',
    true,
    ARRAY['IN']::TEXT[],
    ARRAY['INR']::TEXT[],
    2.95,
    0,
    jsonb_build_object(
        'merchant_key', 'YOUR_PAYU_MERCHANT_KEY',
        'salt_key', 'YOUR_PAYU_SALT_KEY',
        'client_id', 'YOUR_PAYU_OAUTH_CLIENT_ID',
        'client_secret', 'YOUR_PAYU_OAUTH_CLIENT_SECRET',
        'merchant_id', 'YOUR_PAYU_MERCHANT_ID',
        'webhook_url', 'https://yoursite.com/api/payu-webhook',
        'success_url', 'https://yoursite.com/payment-success',
        'failure_url', 'https://yoursite.com/payment-failure'
    ),
    true, -- test_mode, change to false for production
    1,
    'PayU Payment Gateway with OAuth 2.0 support for enhanced payment links'
WHERE NOT EXISTS (
    SELECT 1 FROM public.payment_gateways WHERE code = 'payu'
);

-- Add other payment gateways if they don't exist (for reference)
INSERT INTO public.payment_gateways (
    name,
    code,
    is_active,
    supported_countries,
    supported_currencies,
    fee_percent,
    fee_fixed,
    config,
    test_mode,
    priority,
    description
) VALUES 
(
    'Bank Transfer',
    'bank_transfer',
    true,
    ARRAY['IN', 'NP']::TEXT[],
    ARRAY['INR', 'NPR', 'USD']::TEXT[],
    0,
    0,
    jsonb_build_object(
        'requires_proof', true,
        'manual_verification', true
    ),
    false,
    3,
    'Direct bank transfer with manual verification'
),
(
    'Cash on Delivery',
    'cod',
    true,
    ARRAY['IN', 'NP']::TEXT[],
    ARRAY['INR', 'NPR']::TEXT[],
    0,
    50, -- Fixed COD fee
    jsonb_build_object(
        'max_amount', 10000,
        'requires_verification', true
    ),
    false,
    4,
    'Cash payment on delivery'
)
ON CONFLICT (code) DO NOTHING;

-- Insert sample OAuth token (this would normally be created by the token manager)
-- This is just for reference - actual tokens should be created via the API
INSERT INTO public.oauth_tokens (
    gateway_code,
    client_id,
    access_token,
    token_type,
    expires_in,
    scope,
    expires_at,
    is_active
) VALUES (
    'payu',
    'YOUR_PAYU_OAUTH_CLIENT_ID',
    'sample_access_token_will_be_replaced',
    'Bearer',
    3600,
    'create_payment_links',
    now() + interval '1 hour',
    false -- Set to false since this is just a placeholder
) ON CONFLICT (gateway_code, client_id, scope, is_active) DO NOTHING;

-- Add some sample rejection reasons if they don't exist
INSERT INTO public.rejection_reasons (reason, category) VALUES
('Invalid payment amount', 'payment'),
('Expired payment link', 'payment'),
('Payment gateway error', 'technical'),
('Insufficient payment details', 'payment'),
('Currency not supported', 'payment')
ON CONFLICT (reason) DO NOTHING;

-- Add sample customs categories if they don't exist
INSERT INTO public.customs_categories (name, duty_percent) VALUES
('Electronics', 10.0),
('Clothing', 12.0),
('Books', 0.0),
('Cosmetics', 30.0),
('Jewelry', 15.0),
('Toys', 8.0)
ON CONFLICT (name) DO NOTHING;

-- Create a function to update PayU configuration easily
CREATE OR REPLACE FUNCTION public.update_payu_config(
    p_merchant_key TEXT,
    p_salt_key TEXT,
    p_client_id TEXT,
    p_client_secret TEXT,
    p_merchant_id TEXT,
    p_test_mode BOOLEAN DEFAULT true
)
RETURNS void AS $$
BEGIN
    UPDATE public.payment_gateways 
    SET 
        config = jsonb_build_object(
            'merchant_key', p_merchant_key,
            'salt_key', p_salt_key,
            'client_id', p_client_id,
            'client_secret', p_client_secret,
            'merchant_id', p_merchant_id,
            'webhook_url', CASE 
                WHEN p_test_mode THEN 'https://yoursite.com/api/payu-webhook-test'
                ELSE 'https://yoursite.com/api/payu-webhook'
            END,
            'success_url', 'https://yoursite.com/payment-success',
            'failure_url', 'https://yoursite.com/payment-failure'
        ),
        test_mode = p_test_mode,
        updated_at = now()
    WHERE code = 'payu';
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'PayU gateway not found. Please run the migration first.';
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment for the function
COMMENT ON FUNCTION public.update_payu_config IS 'Helper function to update PayU gateway configuration with OAuth credentials';

-- Example usage (commented out - uncomment and replace with actual values):
-- SELECT public.update_payu_config(
--     'your_merchant_key',
--     'your_salt_key', 
--     'your_oauth_client_id',
--     'your_oauth_client_secret',
--     'your_merchant_id',
--     true -- test_mode
-- );