-- Fix PayU salt key to match working test credentials
-- The issue was that database had wrong salt key causing hash mismatch

UPDATE payment_gateways 
SET config = jsonb_set(
  config,
  '{salt_key}',
  '"VIen2EwWiQbvsILF4Wt9p9Gh5ixOpSMe"'
)
WHERE code = 'payu';

-- Verify the update
SELECT 
  code,
  name,
  config->>'merchant_key' as merchant_key,
  config->>'salt_key' as salt_key,
  config->>'merchant_id' as merchant_id,
  config->>'environment' as environment
FROM payment_gateways 
WHERE code = 'payu';