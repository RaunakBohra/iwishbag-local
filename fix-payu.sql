-- Fix PayU configuration with actual environment variables
-- Run this in the Supabase SQL editor

UPDATE payment_gateways 
SET 
  config = jsonb_build_object(
    'merchant_id', '8725115',
    'merchant_key', 'u7Ui5I', 
    'salt_key', 'VIen2EwWiQbvsILF4Wt9p9Gh5ixOpSMe',
    'payment_url', 'https://test.payu.in/_payment'
  ),
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