-- Update Fonepay configuration with actual credentials
UPDATE payment_gateways 
SET config = jsonb_build_object(
  'merchant_code', '2222050014849742',
  'pan_number', '603854741',
  'secret_key', 'dd3f7d1be3ad401a84b374aca469aa48',
  'environment', 'test',
  'test_payment_url', 'https://dev-clientapi.fonepay.com/api/merchantRequest',
  'production_payment_url', 'https://clientapi.fonepay.com/api/merchantRequest'
),
test_mode = true,
is_active = true,
description = 'Pay using Fonepay QR code'
WHERE code = 'fonepay';

-- Also ensure Fonepay is available for Nepal
UPDATE payment_gateways 
SET supported_countries = ARRAY['NP'],
    supported_currencies = ARRAY['NPR']
WHERE code = 'fonepay';