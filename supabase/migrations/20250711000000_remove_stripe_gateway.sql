-- Remove Stripe payment gateway and related configurations
-- This removes all Stripe-related entries to prepare for fresh integration

BEGIN;

-- Remove Stripe from country payment preferences
DELETE FROM public.country_payment_preferences 
WHERE gateway_code = 'stripe';

-- Remove Stripe gateway configuration
DELETE FROM public.payment_gateways 
WHERE code = 'stripe';

-- Add comment to document the removal
COMMENT ON TABLE public.payment_gateways IS 'Payment gateway configurations - Stripe removed for fresh integration';

COMMIT;