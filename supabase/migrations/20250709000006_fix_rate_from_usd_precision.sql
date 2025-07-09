-- Fix numeric precision for rate_from_usd to support large exchange rates
-- Current: NUMERIC(10,6) allows max 9999.999999 
-- New: NUMERIC(15,6) allows max 999999999.999999

ALTER TABLE country_settings 
ALTER COLUMN rate_from_usd TYPE NUMERIC(15,6);

-- Update the constraint check to be more explicit about positive values
ALTER TABLE country_settings 
DROP CONSTRAINT IF EXISTS country_settings_rate_from_usd_check;

ALTER TABLE country_settings 
ADD CONSTRAINT country_settings_rate_from_usd_check 
CHECK (rate_from_usd > 0);