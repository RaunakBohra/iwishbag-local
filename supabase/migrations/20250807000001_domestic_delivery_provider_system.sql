-- Scalable Domestic Delivery Provider System
-- Enhance country_settings with domestic delivery configuration

-- Add domestic delivery provider columns to country_settings
ALTER TABLE country_settings 
ADD COLUMN IF NOT EXISTS domestic_delivery_provider TEXT,
ADD COLUMN IF NOT EXISTS domestic_delivery_currency TEXT,
ADD COLUMN IF NOT EXISTS domestic_urban_rate DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS domestic_rural_rate DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS domestic_api_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS domestic_fallback_enabled BOOLEAN DEFAULT true;

-- Add comments for clarity
COMMENT ON COLUMN country_settings.domestic_delivery_provider IS 'Provider name (delhivery, ncm, etc.)';
COMMENT ON COLUMN country_settings.domestic_delivery_currency IS 'Local currency for domestic rates (INR, NPR, etc.)';
COMMENT ON COLUMN country_settings.domestic_urban_rate IS 'Urban delivery rate in local currency';
COMMENT ON COLUMN country_settings.domestic_rural_rate IS 'Rural delivery rate in local currency';
COMMENT ON COLUMN country_settings.domestic_api_enabled IS 'Whether to use provider API';
COMMENT ON COLUMN country_settings.domestic_fallback_enabled IS 'Whether fallback rates are available';

-- Configure existing providers
UPDATE country_settings 
SET 
  domestic_delivery_provider = 'delhivery',
  domestic_delivery_currency = 'INR',
  domestic_urban_rate = 150.00,
  domestic_rural_rate = 250.00,
  domestic_api_enabled = true,
  domestic_fallback_enabled = true
WHERE code = 'IN';

UPDATE country_settings 
SET 
  domestic_delivery_provider = 'ncm',
  domestic_delivery_currency = 'NPR', 
  domestic_urban_rate = 200.00,
  domestic_rural_rate = 350.00,
  domestic_api_enabled = true,
  domestic_fallback_enabled = true
WHERE code = 'NP';

-- Configure other countries with generic providers (example)
UPDATE country_settings 
SET 
  domestic_delivery_provider = 'usps',
  domestic_delivery_currency = 'USD',
  domestic_urban_rate = 15.00,
  domestic_rural_rate = 25.00,
  domestic_api_enabled = false,
  domestic_fallback_enabled = true
WHERE code = 'US';

-- Create index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_country_settings_domestic_provider 
ON country_settings(code, domestic_delivery_provider);

-- Create function to get domestic delivery configuration
CREATE OR REPLACE FUNCTION get_domestic_delivery_config(country_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  config JSONB;
BEGIN
  SELECT jsonb_build_object(
    'provider', domestic_delivery_provider,
    'currency', domestic_delivery_currency,
    'urban_rate', domestic_urban_rate,
    'rural_rate', domestic_rural_rate,
    'api_enabled', domestic_api_enabled,
    'fallback_enabled', domestic_fallback_enabled,
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

-- Test the function
SELECT get_domestic_delivery_config('IN') as india_config;
SELECT get_domestic_delivery_config('NP') as nepal_config;
SELECT get_domestic_delivery_config('XX') as unknown_config;