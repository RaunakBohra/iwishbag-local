-- Update create-payment function to read Stripe config from database
-- This SQL creates a new version of the function that reads from payment_gateways config

-- First, let's check the current Stripe config
SELECT id, name, code, config, test_mode 
FROM payment_gateways 
WHERE code = 'stripe';

-- Update Stripe config with your actual keys
UPDATE payment_gateways
SET config = jsonb_build_object(
    'environment', 'test',
    'test_secret_key', 'sk_test_51Rl8fNQj80XSacOA5Fl0j68UEt7xb9IEPGmF3OyKzMQdDJubpJ8k4cm0FeWecOpV5qEu6gYVdV7kLtT5e7iBJls3005PIg8XXN',
    'test_publishable_key', 'pk_test_51Rl8fNQj80XSacOAJ2td5E9Rqzr4hUVBYudosqjLeCilTnK68UNnaxZbkIaxqrsTHhvfU97gfcvNeSaC6iJFXxyy00F7jg6W6b',
    'webhook_secret', 'whsec_your_webhook_secret_here',
    'api_version', '2023-10-16',
    'live_secret_key', '',  -- Add your live keys when ready
    'live_publishable_key', ''
),
updated_at = NOW()
WHERE code = 'stripe';

-- Verify the update
SELECT id, name, code, config, test_mode 
FROM payment_gateways 
WHERE code = 'stripe';