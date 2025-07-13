-- Debug PayU payment issue
-- Run in Supabase Dashboard SQL Editor

-- 1. Check if there are ANY quotes that went through checkout recently
SELECT 
  'Recent Checkouts' as check,
  id,
  display_id,
  status,
  payment_status,
  payment_method,
  in_cart,
  created_at,
  updated_at,
  CASE 
    WHEN payment_method IS NOT NULL THEN 'Checkout attempted'
    WHEN in_cart = false THEN 'Removed from cart'
    ELSE 'Still in cart'
  END as checkout_status
FROM quotes 
WHERE updated_at > NOW() - INTERVAL '2 hours'
ORDER BY updated_at DESC;

-- 2. Check PayU configuration again
SELECT 
  'PayU Config' as check,
  code,
  is_active,
  test_mode,
  config->>'webhook_url' as webhook_url,
  config->>'merchant_key' as merchant_key,
  CASE 
    WHEN config->>'salt_key' = 'VIen2EwWiQbvsILF4Wt9p9Gh5ixOpSMe' THEN '✅ Salt OK'
    ELSE '❌ Salt Wrong'
  END as salt_check
FROM payment_gateways 
WHERE code = 'payu';

-- 3. Check if webhook logs table is working
INSERT INTO webhook_logs (request_id, webhook_type, status, user_agent, error_message)
VALUES ('debug-test-' || gen_random_uuid(), 'test', 'success', 'SQL Debug', 'Testing webhook logs table');

SELECT 'Webhook Logs Test' as check, COUNT(*) as test_logs_created 
FROM webhook_logs 
WHERE user_agent = 'SQL Debug';

-- 4. Check payment_transactions structure
SELECT 
  'Payment Transactions Columns' as check,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'payment_transactions'
  AND table_schema = 'public'
ORDER BY ordinal_position
LIMIT 10;

-- 5. Force update the stuck approved quote to test
-- UNCOMMENT if you want to manually fix it:
/*
UPDATE quotes 
SET 
  status = 'paid',
  payment_status = 'paid',
  payment_method = 'payu',
  paid_at = NOW()
WHERE id = '0c6a0ee3-5e0b-4329-b20c-47179d57e813'
RETURNING id, display_id, status, payment_status;
*/