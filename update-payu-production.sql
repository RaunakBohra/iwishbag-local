-- Update PayU configuration to PRODUCTION credentials
-- Replace the placeholder values with your actual production credentials

UPDATE payment_gateways 
SET 
  config = jsonb_build_object(
    'merchant_id', 'YOUR_PRODUCTION_MERCHANT_ID',  -- Replace with your actual merchant ID
    'merchant_key', 'YOUR_PRODUCTION_MERCHANT_KEY', -- Replace with your actual merchant key
    'salt_key', 'YOUR_PRODUCTION_SALT_KEY',         -- Replace with your actual salt key
    'payment_url', 'https://secure.payu.in/_payment' -- Production URL
  ),
  test_mode = false, -- Set to false for production
  updated_at = NOW()
WHERE code = 'payu';

-- Verify the update
SELECT 
  name,
  code,
  is_active,
  test_mode,
  config,
  updated_at
FROM payment_gateways 
WHERE code = 'payu'; 