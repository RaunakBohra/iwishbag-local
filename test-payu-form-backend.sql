-- Test PayU form data generation directly via Edge Function invoke
-- This tests the backend directly without needing authentication

SELECT net.http_post(
  'https://grgvlrvywsfmnmkxrecd.supabase.co/functions/v1/create-payment',
  jsonb_build_object(
    'quoteIds', ARRAY['b6b97b98-744e-4ae5-91dd-0edfe4d02f6c']::text[],
    'email', 'test@example.com',
    'userId', '123e4567-e89b-12d3-a456-426614174000',
    'customerName', 'Test Customer',
    'customerPhone', '9999999999',
    'success_url', 'https://whyteclub.com/payment/success',
    'failure_url', 'https://whyteclub.com/payment/failure',
    'amount', 2069.46,
    'currency', 'USD',
    'destination_country', 'IN'
  )::text,
  headers => jsonb_build_object(
    'Content-Type', 'application/json',
    'x-supabase-gateway', 'payu',
    'Authorization', 'Bearer ' || current_setting('request.jwt')
  )
) AS payment_response;

-- Alternative: Check if the quote exists and get its details
SELECT 
  id,
  display_id,
  status,
  final_total,
  destination_country,
  origin_country,
  user_id
FROM quotes
WHERE id = 'b6b97b98-744e-4ae5-91dd-0edfe4d02f6c';

-- Check PayU gateway configuration
SELECT 
  code,
  name,
  test_mode,
  config->>'merchant_key' IS NOT NULL as has_merchant_key,
  config->>'salt_key' IS NOT NULL as has_salt_key
FROM payment_gateways
WHERE code = 'payu';