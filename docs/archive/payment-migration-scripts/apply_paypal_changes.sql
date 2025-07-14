-- ===================================================================
-- Apply PayPal Integration Changes to Database
-- ===================================================================

-- 1. Add PayPal gateway to payment_gateways table
INSERT INTO public.payment_gateways (
  name, code, is_active, supported_countries, supported_currencies, 
  fee_percent, fee_fixed, priority, config, test_mode
) VALUES (
  'PayPal',
  'paypal',
  true,
  ARRAY['US','CA','GB','AU','DE','FR','IT','ES','NL','BE','AT','CH','SE','NO','DK','FI','PL','CZ','HU','SG','MY','TH','PH','VN','IN','NP','BD','LK','PK','AE','SA','KW','QA','BH','OM','JO','LB','EG','MA','TN','DZ','NG','GH','KE','UG','TZ','ZA','BR','MX','AR','CL','CO','PE','UY','PY','BO','EC','VE'],
  ARRAY['USD','EUR','GBP','CAD','AUD','JPY','SGD','MYR','THB','PHP','VND','INR','NPR','BDT','LKR','PKR','AED','SAR','KWD','QAR','BHD','OMR','JOD','LBP','EGP','MAD','TND','DZD','NGN','GHS','KES','UGX','TZS','ZAR','BRL','MXN','ARS','CLP','COP','PEN','UYU','PYG','BOB','VES'],
  3.49,
  0.49,
  2,
  '{"environment":"sandbox","client_id_sandbox":"","client_secret_sandbox":"","client_id_live":"","client_secret_live":"","webhook_id":"","supported_funding_sources":["paypal","card","venmo","applepay","googlepay"],"supported_payment_methods":["paypal","card"],"merchant_account_id":"","partner_attribution_id":"iwishBag_Cart_SPB"}',
  true
) ON CONFLICT (code) DO UPDATE SET
  supported_countries = EXCLUDED.supported_countries,
  supported_currencies = EXCLUDED.supported_currencies,
  fee_percent = EXCLUDED.fee_percent,
  fee_fixed = EXCLUDED.fee_fixed,
  priority = EXCLUDED.priority,
  config = EXCLUDED.config,
  test_mode = EXCLUDED.test_mode,
  updated_at = now();

-- 2. Add customer preference column to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS preferred_payment_gateway TEXT;

-- 3. Add gateway configuration columns to country_settings
ALTER TABLE public.country_settings 
ADD COLUMN IF NOT EXISTS available_gateways TEXT[] DEFAULT ARRAY['bank_transfer'];

ALTER TABLE public.country_settings 
ADD COLUMN IF NOT EXISTS default_gateway TEXT DEFAULT 'bank_transfer';

ALTER TABLE public.country_settings 
ADD COLUMN IF NOT EXISTS gateway_config JSONB DEFAULT '{}';

-- 4. Update key countries with PayPal configuration

-- Update US to prefer PayPal
UPDATE public.country_settings 
SET 
  available_gateways = ARRAY['stripe', 'paypal', 'bank_transfer'],
  default_gateway = 'paypal',
  gateway_config = '{"paypal_priority": 1, "stripe_priority": 2, "preferred_for_amount_above": 50.00}'
WHERE code = 'US';

-- Update India to include PayPal as secondary option
UPDATE public.country_settings 
SET 
  available_gateways = ARRAY['payu', 'paypal', 'razorpay', 'upi', 'bank_transfer'],
  default_gateway = 'payu',
  gateway_config = '{"payu_priority": 1, "paypal_priority": 2, "razorpay_priority": 3, "upi_priority": 4, "preferred_for_amount_above": 500.00}'
WHERE code = 'IN';

-- Update Nepal to prefer PayPal
UPDATE public.country_settings 
SET 
  available_gateways = ARRAY['paypal', 'esewa', 'khalti', 'fonepay', 'bank_transfer'],
  default_gateway = 'paypal',
  gateway_config = '{"paypal_priority": 1, "esewa_priority": 2, "khalti_priority": 3, "fonepay_priority": 4, "preferred_for_amount_above": 100.00}'
WHERE code = 'NP';

-- 5. Create helper functions for gateway selection
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