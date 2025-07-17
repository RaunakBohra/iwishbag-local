-- Deploy Fonepay Live Configuration to Production
-- Run this in Supabase SQL Editor for production deployment

-- Update Fonepay configuration to live/production values
UPDATE payment_gateways SET 
  config = '{
    "pan_number": "603854741", 
    "secret_key": "dd3f7d1be3ad401a84b374aca469aa48", 
    "environment": "production", 
    "merchant_code": "2222050014849742", 
    "test_payment_url": "https://dev-clientapi.fonepay.com/api/merchantRequest", 
    "production_payment_url": "https://clientapi.fonepay.com/api/merchantRequest"
  }'::jsonb,
  test_mode = false,
  is_active = true,
  updated_at = now()
WHERE code = 'fonepay';

-- Verify the update
SELECT 
  code,
  test_mode,
  is_active,
  config->'merchant_code' as merchant_code,
  config->'environment' as environment,
  config->'production_payment_url' as production_url
FROM payment_gateways 
WHERE code = 'fonepay';

-- Log deployment
INSERT INTO audit_logs (
  table_name,
  operation,
  record_id,
  changes,
  created_at
) VALUES (
  'payment_gateways',
  'UPDATE',
  (SELECT id FROM payment_gateways WHERE code = 'fonepay'),
  '{"deployment": "fonepay_live_configuration", "date": "2025-07-17"}'::jsonb,
  now()
);