-- Update PayU with correct test keys
-- These are the standard PayU test environment keys

UPDATE payment_gateways 
SET config = jsonb_build_object(
  'merchant_key', 'rjQUPktU',
  'salt_key', 'e5iIg1jwi8UnzIZJJP9hK43y9PNYvBKBSFMvVHrOHx',
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