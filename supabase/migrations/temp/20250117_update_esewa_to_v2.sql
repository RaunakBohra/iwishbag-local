-- Update eSewa payment gateway to use v2 API with proper configuration

-- Update the existing eSewa configuration
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

-- Add a comment explaining the configuration
COMMENT ON COLUMN payment_gateways.config IS 'Gateway-specific configuration. For eSewa v2: api_version, product_code, secret_key, environment, test_url, live_url, verify_test_url, verify_live_url';