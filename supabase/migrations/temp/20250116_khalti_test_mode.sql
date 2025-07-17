-- Update Khalti to use test mode and ensure proper configuration
UPDATE payment_gateways 
SET 
  test_mode = true,
  config = jsonb_build_object(
    'test_public_key', 'test_public_key_bc76e6b77d8140de9ca3dcd7555d1dfa',
    'test_secret_key', 'test_secret_key_283050de1a8c412684889fde576bb65c',
    'live_public_key', 'live_public_key_496caf808f75472d97ab26d833784a8f',
    'live_secret_key', 'live_secret_key_a5b92431df324d14bd826ae2b5b64ebd',
    'sandbox_base_url', 'https://dev.khalti.com/api/v2',
    'production_base_url', 'https://khalti.com/api/v2',
    'environment', 'test',
    'demo_mode', true,
    'demo_message', 'Khalti integration in demo mode - awaiting valid API credentials from merchant dashboard'
  )
WHERE code = 'khalti';