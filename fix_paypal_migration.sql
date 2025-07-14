-- Fix PayPal Migration - Add missing columns
-- Run this in Supabase SQL Editor

-- Add columns to country_settings if they don't exist
ALTER TABLE public.country_settings 
ADD COLUMN IF NOT EXISTS available_gateways TEXT[] DEFAULT ARRAY['bank_transfer'];

ALTER TABLE public.country_settings 
ADD COLUMN IF NOT EXISTS default_gateway TEXT DEFAULT 'bank_transfer';

ALTER TABLE public.country_settings 
ADD COLUMN IF NOT EXISTS gateway_config JSONB DEFAULT '{}';

-- Add column to profiles if it doesn't exist  
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS preferred_payment_gateway TEXT;

-- Update some key countries with PayPal
UPDATE public.country_settings 
SET 
  available_gateways = ARRAY['stripe', 'paypal', 'bank_transfer'],
  default_gateway = 'paypal'
WHERE code = 'US';

UPDATE public.country_settings 
SET 
  available_gateways = ARRAY['payu', 'paypal', 'razorpay', 'upi', 'bank_transfer'],
  default_gateway = 'payu'
WHERE code = 'IN';

UPDATE public.country_settings 
SET 
  available_gateways = ARRAY['paypal', 'esewa', 'khalti', 'fonepay', 'bank_transfer'],
  default_gateway = 'paypal'
WHERE code = 'NP';

-- Verify the changes
SELECT code, name, currency, available_gateways, default_gateway 
FROM country_settings 
WHERE code IN ('US', 'IN', 'NP');

-- Check PayPal gateway
SELECT * FROM payment_gateways WHERE code = 'paypal';