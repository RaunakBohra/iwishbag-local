-- Update Khalti payment gateway with new credentials
UPDATE payment_gateways 
SET 
  config = jsonb_build_object(
    'test_secret_key', 'test_secret_key_283050de1a8c412684889fde576bb65c',
    'test_public_key', 'test_public_key_bc76e6b77d8140de9ca3dcd7555d1dfa',
    'live_secret_key', 'live_secret_key_a5b92431df324d14bd826ae2b5b64ebd',
    'live_public_key', 'live_public_key_496caf808f75472d97ab26d833784a8f',
    'sandbox_base_url', 'https://dev.khalti.com/api/v2',
    'production_base_url', 'https://khalti.com/api/v2',
    'demo_mode', false,
    'environment', 'test'
  ),
  test_mode = true,
  is_active = true,
  updated_at = now()
WHERE code = 'khalti';

-- Ensure Khalti supports NPR currency
UPDATE payment_gateways 
SET supported_currencies = 
  CASE 
    WHEN 'NPR' = ANY(supported_currencies) THEN supported_currencies
    ELSE array_append(supported_currencies, 'NPR')
  END
WHERE code = 'khalti';

-- Ensure Khalti supports Nepal
UPDATE payment_gateways 
SET supported_countries = 
  CASE 
    WHEN 'NP' = ANY(supported_countries) THEN supported_countries
    ELSE array_append(supported_countries, 'NP')
  END
WHERE code = 'khalti';