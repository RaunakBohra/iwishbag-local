-- Fix PayU webhook configuration with production credentials

-- Update PayU gateway configuration with correct production credentials
UPDATE payment_gateways SET 
  config = jsonb_build_object(
    'salt_key', 'bDzDkAEh8yGt5Dzj2MLbFzV6BlSCv1e8',  -- Production salt key
    'environment', 'production',
    'merchant_id', '13012037',  -- Production merchant ID
    'merchant_key', '1fqqjb',   -- Production merchant key
    'success_url', '/payment/success',
    'failure_url', '/payment/failure',
    'webhook_url', 'https://grgvlrvywsfmnmkxrecd.supabase.co/functions/v1/payment-webhook'
  ),
  test_mode = false,  -- Set to production mode
  updated_at = NOW()
WHERE code = 'payu';

-- Log this configuration update
INSERT INTO webhook_logs (
  request_id, 
  webhook_type, 
  status, 
  user_agent, 
  error_message
) VALUES (
  'config-update-' || gen_random_uuid()::text,
  'payu',
  'success',
  'Migration',
  'Updated PayU configuration to production credentials with correct salt key'
);