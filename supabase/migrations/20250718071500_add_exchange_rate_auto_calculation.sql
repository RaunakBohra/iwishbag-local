-- Add automatic exchange rate calculation for shipping routes
-- This migration adds a trigger to automatically calculate exchange rates
-- when new shipping routes are created or updated

-- Create function to auto-calculate exchange rate for shipping routes
CREATE OR REPLACE FUNCTION auto_calculate_exchange_rate()
RETURNS TRIGGER AS $$
BEGIN
    -- Only calculate if exchange_rate is not set or is 1.0 (default)
    IF NEW.exchange_rate IS NULL OR NEW.exchange_rate = 1.0 THEN
        -- Calculate exchange rate based on country_settings
        SELECT 
            ROUND((dest_settings.rate_from_usd / origin_settings.rate_from_usd)::numeric, 4)
        INTO NEW.exchange_rate
        FROM 
            country_settings origin_settings,
            country_settings dest_settings
        WHERE 
            origin_settings.code = NEW.origin_country 
            AND dest_settings.code = NEW.destination_country
            AND origin_settings.rate_from_usd > 0 
            AND dest_settings.rate_from_usd > 0;
        
        -- If calculation failed, keep the default value
        IF NEW.exchange_rate IS NULL THEN
            NEW.exchange_rate := 1.0;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-calculate exchange rate on insert/update
DROP TRIGGER IF EXISTS trigger_auto_calculate_exchange_rate ON shipping_routes;
CREATE TRIGGER trigger_auto_calculate_exchange_rate
    BEFORE INSERT OR UPDATE ON shipping_routes
    FOR EACH ROW
    EXECUTE FUNCTION auto_calculate_exchange_rate();

-- Add comment to document the trigger
COMMENT ON TRIGGER trigger_auto_calculate_exchange_rate ON shipping_routes IS 
'Automatically calculates exchange rates for shipping routes based on country_settings.rate_from_usd values. Only calculates when exchange_rate is NULL or 1.0 (default).';

COMMENT ON FUNCTION auto_calculate_exchange_rate() IS 
'Function to automatically calculate exchange rates for shipping routes using the formula: destination_rate / origin_rate. Used by trigger_auto_calculate_exchange_rate.';