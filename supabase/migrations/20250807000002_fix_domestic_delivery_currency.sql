-- Remove redundant domestic_delivery_currency column
-- The domestic delivery currency should be the same as country's main currency

-- Drop the redundant currency column
ALTER TABLE country_settings DROP COLUMN IF EXISTS domestic_delivery_currency;

-- Update the database function to use country's main currency instead
CREATE OR REPLACE FUNCTION get_domestic_delivery_config(country_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  config JSONB;
BEGIN
  SELECT jsonb_build_object(
    'provider', COALESCE(domestic_delivery_provider, 'generic'),
    'currency', cs.currency, -- Use country's main currency (INR, NPR, USD, etc.)
    'urban_rate', COALESCE(domestic_urban_rate, 10.00),
    'rural_rate', COALESCE(domestic_rural_rate, 20.00),
    'api_enabled', COALESCE(domestic_api_enabled, false),
    'fallback_enabled', COALESCE(domestic_fallback_enabled, true),
    'country_code', cs.code,
    'country_name', cs.name
  )
  INTO config
  FROM country_settings cs
  WHERE cs.code = get_domestic_delivery_config.country_code;
  
  -- Return default config if country not found
  IF config IS NULL THEN
    config := jsonb_build_object(
      'provider', 'generic',
      'currency', 'USD',
      'urban_rate', 10.00,
      'rural_rate', 20.00,
      'api_enabled', false,
      'fallback_enabled', true,
      'country_code', get_domestic_delivery_config.country_code,
      'country_name', 'Unknown'
    );
  END IF;
  
  RETURN config;
END;
$$;

-- Update the comment on domestic_delivery_provider
COMMENT ON COLUMN country_settings.domestic_delivery_provider IS 'Provider name (delhivery, ncm, etc.) - uses country currency automatically';

-- Test the updated function
SELECT get_domestic_delivery_config('IN') as india_config;
SELECT get_domestic_delivery_config('NP') as nepal_config;
SELECT get_domestic_delivery_config('US') as us_config;
SELECT get_domestic_delivery_config('DE') as germany_config;