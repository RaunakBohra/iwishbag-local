-- Update PayU with correct test keys from PayU's error message
-- PayU provided sample values: key=gtKFFx, salt=eCwWELxi

UPDATE payment_gateways 
SET config = jsonb_build_object(
  'merchant_key', 'gtKFFx',
  'salt_key', 'eCwWELxi',
  'test_mode', true
),
test_mode = true
WHERE code = 'payu';

-- Verify the update
SELECT 
  code,
  name,
  test_mode,
  config->>'merchant_key' as merchant_key,
  config->>'salt_key' as salt_key
FROM payment_gateways 
WHERE code = 'payu';