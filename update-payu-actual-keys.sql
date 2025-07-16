-- Update PayU with your actual test credentials
-- Using the credentials you provided from your PayU account

UPDATE payment_gateways 
SET config = jsonb_build_object(
  'merchant_key', 'u7Ui5I',
  'salt_key', 'VIen2EwWiQbvsILF4Wt9p9Gh5ixOpSMe',
  'merchant_id', '8725115',
  'environment', 'test',
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
  config->>'salt_key' as salt_key,
  config->>'merchant_id' as merchant_id,
  config->>'environment' as environment
FROM payment_gateways 
WHERE code = 'payu';