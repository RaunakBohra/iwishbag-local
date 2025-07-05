-- Fix PayU configuration with test credentials
-- Run this in the Supabase SQL editor

UPDATE payment_gateways 
SET 
  config = jsonb_build_object(
    'merchant_id', 'gtKFFx',
    'merchant_key', 'eCwWELxi', 
    'salt_key', '4R38IvwiV57FwVpsgOvTXBdLE4tHUXFW',
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