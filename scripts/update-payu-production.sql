-- Update PayU configuration for production
-- This script updates the PayU gateway configuration from test to production settings

-- First, update the test_mode to false and set production config
UPDATE payment_gateways 
SET 
  test_mode = false,
  config = jsonb_set(
    config,
    '{environment}',
    '"production"'
  )
WHERE code = 'payu';

-- Update the webhook URL in environment variables
-- This needs to be set in your deployment environment:
-- PAYU_WEBHOOK_URL=https://your-production-domain.com/supabase/functions/payment-webhook

-- Production checklist (add these to your deployment process):
-- 1. Set environment variables in your production environment:
--    - PAYU_MERCHANT_KEY=your_production_merchant_key
--    - PAYU_SALT_KEY=your_production_salt_key
--    - PAYU_WEBHOOK_URL=https://your-domain.com/supabase/functions/payment-webhook
--
-- 2. Update the PayU merchant account with production webhook URL
-- 3. Test the webhook endpoint connectivity
-- 4. Verify SSL certificate on webhook endpoint

-- Optional: Update the config with actual production URLs if needed
UPDATE payment_gateways 
SET 
  config = jsonb_set(
    jsonb_set(
      config,
      '{payment_url}',
      '"https://secure.payu.in/_payment"'
    ),
    '{verify_url}',
    '"https://info.payu.in/merchant/postservice?form=2"'
  )
WHERE code = 'payu';

-- Add production-specific settings
UPDATE payment_gateways 
SET 
  config = jsonb_set(
    jsonb_set(
      config,
      '{production_notes}',
      '"Production PayU configuration - ensure webhook URL is properly configured"'
    ),
    '{webhook_timeout}',
    '30'
  )
WHERE code = 'payu';

-- Set minimum payment amount for production (₹1 minimum for PayU)
UPDATE country_settings 
SET 
  minimum_payment_amount = 1.0
WHERE code = 'IN' AND currency = 'INR';

-- Log the update
INSERT INTO system_logs (log_level, message, metadata, created_at) VALUES
('INFO', 'PayU configuration updated for production', 
 '{"gateway": "payu", "environment": "production", "updated_at": "' || now() || '"}', 
 now()
);

-- Display current configuration (for verification)
SELECT 
  code,
  name,
  test_mode,
  config->'environment' as environment,
  config->'payment_url' as payment_url,
  is_active
FROM payment_gateways 
WHERE code = 'payu';