-- Update Airwallex configuration with new webhook secret
UPDATE payment_gateways 
SET config = jsonb_build_object(
  'client_id', 'lVBya_cyR-WAtIqzMo4cZQ',
  'api_key', '1e02891ba7ab2c772f945bf20e9adcbb99173eb500f75bd414aa5bf85130e007a7959f8ba8e664bccf829f701926c0c5',
  'test_api_key', '1e02891ba7ab2c772f945bf20e9adcbb99173eb500f75bd414aa5bf85130e007a7959f8ba8e664bccf829f701926c0c5',
  'webhook_secret', 'whsec_yBiHhAfRrRpMqmgGUohAZ92CBDFIt26L'
),
updated_at = now()
WHERE code = 'airwallex'
RETURNING code, config;
