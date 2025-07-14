-- ===================================================================
-- Complete PayPal Migration Script
-- Run this in your Supabase SQL Editor
-- ===================================================================

-- Step 1: PayPal gateway is already added ✅

-- Step 2: Add profile column for payment gateway preference
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS preferred_payment_gateway TEXT;

-- Step 3: Add country_settings columns for gateway configuration
ALTER TABLE public.country_settings 
ADD COLUMN IF NOT EXISTS available_gateways TEXT[] DEFAULT ARRAY['bank_transfer'];

ALTER TABLE public.country_settings 
ADD COLUMN IF NOT EXISTS default_gateway TEXT DEFAULT 'bank_transfer';

ALTER TABLE public.country_settings 
ADD COLUMN IF NOT EXISTS gateway_config JSONB DEFAULT '{}';

-- Step 4: Update country configurations
-- United States - PayPal as primary
UPDATE public.country_settings 
SET 
  available_gateways = ARRAY['stripe', 'paypal', 'bank_transfer'],
  default_gateway = 'paypal',
  gateway_config = '{"paypal_priority": 1, "stripe_priority": 2, "preferred_for_amount_above": 50.00}'::jsonb
WHERE code = 'US';

-- India - PayU primary, PayPal secondary
UPDATE public.country_settings 
SET 
  available_gateways = ARRAY['payu', 'paypal', 'razorpay', 'upi', 'bank_transfer'],
  default_gateway = 'payu',
  gateway_config = '{"payu_priority": 1, "paypal_priority": 2, "razorpay_priority": 3, "upi_priority": 4, "preferred_for_amount_above": 500.00}'::jsonb
WHERE code = 'IN';

-- Nepal - PayPal as primary
UPDATE public.country_settings 
SET 
  available_gateways = ARRAY['paypal', 'esewa', 'khalti', 'fonepay', 'bank_transfer'],
  default_gateway = 'paypal',
  gateway_config = '{"paypal_priority": 1, "esewa_priority": 2, "khalti_priority": 3, "fonepay_priority": 4, "preferred_for_amount_above": 100.00}'::jsonb
WHERE code = 'NP';

-- Canada - PayPal primary
UPDATE public.country_settings 
SET 
  available_gateways = ARRAY['stripe', 'paypal', 'bank_transfer'],
  default_gateway = 'paypal',
  gateway_config = '{"paypal_priority": 1, "stripe_priority": 2, "preferred_for_amount_above": 25.00}'::jsonb
WHERE code = 'CA';

-- United Kingdom - PayPal primary
UPDATE public.country_settings 
SET 
  available_gateways = ARRAY['stripe', 'paypal', 'bank_transfer'],
  default_gateway = 'paypal',
  gateway_config = '{"paypal_priority": 1, "stripe_priority": 2, "preferred_for_amount_above": 20.00}'::jsonb
WHERE code = 'GB';

-- Australia - PayPal primary
UPDATE public.country_settings 
SET 
  available_gateways = ARRAY['stripe', 'paypal', 'bank_transfer'],
  default_gateway = 'paypal',
  gateway_config = '{"paypal_priority": 1, "stripe_priority": 2, "preferred_for_amount_above": 30.00}'::jsonb
WHERE code = 'AU';

-- Germany - PayPal primary
UPDATE public.country_settings 
SET 
  available_gateways = ARRAY['stripe', 'paypal', 'bank_transfer'],
  default_gateway = 'paypal',
  gateway_config = '{"paypal_priority": 1, "stripe_priority": 2, "preferred_for_amount_above": 25.00}'::jsonb
WHERE code = 'DE';

-- Step 5: Create helper functions
CREATE OR REPLACE FUNCTION get_recommended_gateway(
  country_code TEXT,
  amount_usd NUMERIC DEFAULT 0
) RETURNS TEXT AS $$
DECLARE
  country_settings_rec RECORD;
BEGIN
  SELECT default_gateway, available_gateways, gateway_config 
  INTO country_settings_rec
  FROM country_settings 
  WHERE code = country_code;
  
  IF NOT FOUND THEN
    RETURN 'bank_transfer';
  END IF;
  
  IF country_settings_rec.gateway_config ? 'preferred_for_amount_above' THEN
    DECLARE
      threshold NUMERIC;
    BEGIN
      threshold := (country_settings_rec.gateway_config->>'preferred_for_amount_above')::NUMERIC;
      
      IF amount_usd >= threshold THEN
        IF 'paypal' = ANY(country_settings_rec.available_gateways) THEN
          RETURN 'paypal';
        ELSIF 'stripe' = ANY(country_settings_rec.available_gateways) THEN
          RETURN 'stripe';
        END IF;
      END IF;
    END;
  END IF;
  
  RETURN country_settings_rec.default_gateway;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_gateway_available(
  country_code TEXT,
  gateway_code TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  available_gateways TEXT[];
BEGIN
  SELECT cs.available_gateways 
  INTO available_gateways
  FROM country_settings cs 
  WHERE cs.code = country_code;
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  RETURN gateway_code = ANY(available_gateways);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 6: Add comments for documentation
COMMENT ON COLUMN public.profiles.preferred_payment_gateway IS 'User preferred payment gateway override';
COMMENT ON COLUMN public.country_settings.available_gateways IS 'Payment gateways available in this country';
COMMENT ON COLUMN public.country_settings.default_gateway IS 'Default payment gateway for this country';
COMMENT ON COLUMN public.country_settings.gateway_config IS 'Country-specific gateway configuration and preferences';
COMMENT ON FUNCTION get_recommended_gateway(TEXT, NUMERIC) IS 'Get recommended payment gateway for country and amount';
COMMENT ON FUNCTION is_gateway_available(TEXT, TEXT) IS 'Check if payment gateway is available in country';

-- Step 7: Verification queries
SELECT 'PayPal Gateway Status:' as info;
SELECT code, name, is_active, priority, fee_percent, fee_fixed 
FROM payment_gateways 
WHERE code = 'paypal';

SELECT 'Country Gateway Configurations:' as info;
SELECT code, name, default_gateway, available_gateways 
FROM country_settings 
WHERE code IN ('US', 'IN', 'NP', 'CA', 'GB', 'AU', 'DE')
ORDER BY code;

SELECT 'Profile Table Schema:' as info;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND column_name = 'preferred_payment_gateway';

-- ===================================================================
-- Migration Complete!
-- ===================================================================