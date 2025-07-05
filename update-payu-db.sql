-- Update PayU configuration with test credentials
UPDATE payment_gateways 
SET 
  config = '{"merchant_id": "gtKFFx", "merchant_key": "eCwWELxi", "salt_key": "4R38IvwiV57FwVpsgOvTXBdLE4tHUXFW"}'::jsonb,
  test_mode = true,
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