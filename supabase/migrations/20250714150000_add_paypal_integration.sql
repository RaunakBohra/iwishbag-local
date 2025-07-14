-- ===================================================================
-- PayPal Integration & Enhanced Gateway Configuration
-- ===================================================================
-- Add PayPal gateway, enhance country-specific configuration, 
-- and add customer gateway preferences

-- Part 1: Ensure PayPal gateway exists with correct configuration
-- ===================================================================
INSERT INTO public.payment_gateways (
    name,
    code,
    is_active,
    supported_countries,
    supported_currencies,
    fee_percent,
    fee_fixed,
    priority,
    config,
    test_mode
) VALUES (
    'PayPal',
    'paypal',
    true,
    ARRAY['US', 'CA', 'GB', 'AU', 'DE', 'FR', 'IT', 'ES', 'NL', 'BE', 'AT', 'CH', 'SE', 'NO', 'DK', 'FI', 'PL', 'CZ', 'HU', 'SG', 'MY', 'TH', 'PH', 'VN', 'IN', 'NP', 'BD', 'LK', 'PK', 'AE', 'SA', 'KW', 'QA', 'BH', 'OM', 'JO', 'LB', 'EG', 'MA', 'TN', 'DZ', 'NG', 'GH', 'KE', 'UG', 'TZ', 'ZA', 'BR', 'MX', 'AR', 'CL', 'CO', 'PE', 'UY', 'PY', 'BO', 'EC', 'VE'], -- Major PayPal supported countries
    ARRAY['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'SGD', 'MYR', 'THB', 'PHP', 'VND', 'INR', 'NPR', 'BDT', 'LKR', 'PKR', 'AED', 'SAR', 'KWD', 'QAR', 'BHD', 'OMR', 'JOD', 'LBP', 'EGP', 'MAD', 'TND', 'DZD', 'NGN', 'GHS', 'KES', 'UGX', 'TZS', 'ZAR', 'BRL', 'MXN', 'ARS', 'CLP', 'COP', 'PEN', 'UYU', 'PYG', 'BOB', 'VES'], -- Major PayPal supported currencies
    3.49, -- PayPal international fee rate
    0.49, -- PayPal fixed fee (in USD)
    2, -- Priority 2 (after Stripe)
    jsonb_build_object(
        'environment', 'sandbox',
        'client_id', '',
        'client_secret', '',
        'webhook_id', '',
        'supported_funding_sources', ARRAY['paypal', 'card', 'venmo', 'applepay', 'googlepay'],
        'supported_payment_methods', ARRAY['paypal', 'card'],
        'merchant_account_id', '',
        'partner_attribution_id', 'iwishBag_Cart_SPB'
    ),
    true
) ON CONFLICT (code) DO UPDATE SET
    supported_countries = EXCLUDED.supported_countries,
    supported_currencies = EXCLUDED.supported_currencies,
    fee_percent = EXCLUDED.fee_percent,
    fee_fixed = EXCLUDED.fee_fixed,
    priority = EXCLUDED.priority,
    config = EXCLUDED.config,
    updated_at = now();

-- Part 2: Add customer gateway preferences to profiles
-- ===================================================================
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS preferred_payment_gateway TEXT;

-- Add check constraint for valid payment gateways
ALTER TABLE public.profiles
DROP CONSTRAINT IF EXISTS check_preferred_payment_gateway;

ALTER TABLE public.profiles
ADD CONSTRAINT check_preferred_payment_gateway 
CHECK (preferred_payment_gateway IS NULL OR preferred_payment_gateway IN (
    'stripe', 'paypal', 'payu', 'razorpay', 'airwallex', 'esewa', 'khalti', 
    'fonepay', 'upi', 'paytm', 'grabpay', 'alipay', 'bank_transfer', 'cod'
));

-- Part 3: Add gateway availability flags to country_settings
-- ===================================================================
ALTER TABLE public.country_settings 
ADD COLUMN IF NOT EXISTS available_gateways TEXT[] DEFAULT ARRAY['bank_transfer'];

ALTER TABLE public.country_settings 
ADD COLUMN IF NOT EXISTS default_gateway TEXT DEFAULT 'bank_transfer';

ALTER TABLE public.country_settings 
ADD COLUMN IF NOT EXISTS gateway_config JSONB DEFAULT '{}';

-- Add check constraint for default gateway
ALTER TABLE public.country_settings
DROP CONSTRAINT IF EXISTS check_default_gateway;

ALTER TABLE public.country_settings
ADD CONSTRAINT check_default_gateway 
CHECK (default_gateway = ANY(available_gateways));

-- Part 4: Create helper functions for gateway selection
-- ===================================================================

-- Function to get recommended gateway for a country and amount
CREATE OR REPLACE FUNCTION get_recommended_gateway(
    country_code TEXT,
    amount_usd NUMERIC DEFAULT 0
) RETURNS TEXT AS $$
DECLARE
    country_settings_rec RECORD;
    gateway TEXT;
BEGIN
    -- Get country settings
    SELECT 
        default_gateway, 
        available_gateways, 
        gateway_config 
    INTO country_settings_rec
    FROM country_settings 
    WHERE code = country_code;
    
    -- Return default if no settings found
    IF NOT FOUND THEN
        RETURN 'bank_transfer';
    END IF;
    
    -- Check if amount-based gateway switching is configured
    IF country_settings_rec.gateway_config ? 'preferred_for_amount_above' THEN
        DECLARE
            threshold NUMERIC;
        BEGIN
            threshold := (country_settings_rec.gateway_config->>'preferred_for_amount_above')::NUMERIC;
            
            -- If amount exceeds threshold, try to find a preferred gateway
            IF amount_usd >= threshold THEN
                -- Look for PayPal or Stripe for higher amounts
                IF 'paypal' = ANY(country_settings_rec.available_gateways) THEN
                    RETURN 'paypal';
                ELSIF 'stripe' = ANY(country_settings_rec.available_gateways) THEN
                    RETURN 'stripe';
                END IF;
            END IF;
        END;
    END IF;
    
    -- Return default gateway
    RETURN country_settings_rec.default_gateway;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if gateway is available for country
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
    
    -- Return false if country not found
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- Check if gateway is in available list
    RETURN gateway_code = ANY(available_gateways);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Part 5: Add indexes for performance
-- ===================================================================
CREATE INDEX IF NOT EXISTS idx_country_settings_default_gateway 
ON public.country_settings(default_gateway);

CREATE INDEX IF NOT EXISTS idx_country_settings_available_gateways 
ON public.country_settings USING GIN(available_gateways);

CREATE INDEX IF NOT EXISTS idx_profiles_preferred_payment_gateway 
ON public.profiles(preferred_payment_gateway);

-- Part 6: Comments for documentation
-- ===================================================================
COMMENT ON COLUMN public.profiles.preferred_payment_gateway IS 'User preferred payment gateway override';
COMMENT ON COLUMN public.country_settings.available_gateways IS 'Payment gateways available in this country';
COMMENT ON COLUMN public.country_settings.default_gateway IS 'Default payment gateway for this country';
COMMENT ON COLUMN public.country_settings.gateway_config IS 'Country-specific gateway configuration and preferences';
COMMENT ON FUNCTION get_recommended_gateway(TEXT, NUMERIC) IS 'Get recommended payment gateway for country and amount';
COMMENT ON FUNCTION is_gateway_available(TEXT, TEXT) IS 'Check if payment gateway is available in country';