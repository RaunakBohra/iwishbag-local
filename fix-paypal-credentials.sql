-- Fix PayPal credentials
-- The client_secret_sandbox was incorrectly set to the same value as client_id_sandbox

-- First, let's clear the incorrect secret
UPDATE payment_gateways 
SET config = jsonb_set(
    config,
    '{client_secret_sandbox}',
    '""'::jsonb
)
WHERE code = 'paypal';

-- Instructions for setting correct credentials:
-- 1. Go to https://developer.paypal.com/dashboard/applications/sandbox
-- 2. Find your sandbox app or create a new one
-- 3. Copy the CLIENT ID (should match ARi806xV-dbFCS5E9OCYkapLEb-7V0P521rLUG9pYUk6kJ7Nm7exNudxamGEkQ1SXqUSzNgV3lEZyAXH)
-- 4. Copy the SECRET (will be different - something like EAZxxxxxxxxxxxxxxx)
-- 5. Run the following query with the actual secret:

/*
UPDATE payment_gateways 
SET config = jsonb_set(
    config,
    '{client_secret_sandbox}',
    '"YOUR_ACTUAL_PAYPAL_SECRET_HERE"'::jsonb
)
WHERE code = 'paypal';
*/

-- Verify the update:
SELECT 
  code,
  config->>'client_id_sandbox' as client_id,
  config->>'client_secret_sandbox' as client_secret,
  CASE 
    WHEN config->>'client_id_sandbox' = config->>'client_secret_sandbox' 
    THEN 'ERROR: Same values!' 
    ELSE 'OK: Different values' 
  END as status
FROM payment_gateways 
WHERE code = 'paypal';