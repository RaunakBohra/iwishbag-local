-- Enable demo mode for Khalti to bypass authentication during testing
UPDATE payment_gateways 
SET config = jsonb_set(config, '{demo_mode}', 'true'::jsonb)
WHERE code = 'khalti';

-- Also update the base URLs to remove trailing slashes
UPDATE payment_gateways 
SET config = jsonb_set(
  jsonb_set(config, '{sandbox_base_url}', '"https://dev.khalti.com/api/v2"'::jsonb),
  '{production_base_url}', '"https://khalti.com/api/v2"'::jsonb
)
WHERE code = 'khalti';