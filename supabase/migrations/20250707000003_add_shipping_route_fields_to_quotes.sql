-- Add shipping route fields to quotes table
-- This allows tracking which shipping method was used and route information

-- Add new columns to quotes table
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS origin_country TEXT;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS shipping_method TEXT DEFAULT 'country_settings';
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS shipping_route_id INTEGER REFERENCES shipping_routes(id);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_quotes_origin_country ON quotes(origin_country);
CREATE INDEX IF NOT EXISTS idx_quotes_shipping_method ON quotes(shipping_method);
CREATE INDEX IF NOT EXISTS idx_quotes_shipping_route_id ON quotes(shipping_route_id);

-- Add comments for documentation
COMMENT ON COLUMN quotes.origin_country IS 'Country where the purchase is being made from (e.g., US, UK)';
COMMENT ON COLUMN quotes.shipping_method IS 'Method used for shipping calculation: route-specific or country_settings';
COMMENT ON COLUMN quotes.shipping_route_id IS 'Reference to shipping_routes table if route-specific method was used';

-- Update existing quotes to have default values
UPDATE quotes 
SET 
  origin_country = 'US',
  shipping_method = 'country_settings',
  shipping_route_id = NULL
WHERE origin_country IS NULL; 