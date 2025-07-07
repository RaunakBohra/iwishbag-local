-- Add exchange_rate column to shipping_routes table
ALTER TABLE shipping_routes 
ADD COLUMN IF NOT EXISTS exchange_rate DECIMAL(10,6) DEFAULT 1.0 CHECK (exchange_rate > 0);

-- Update existing routes with default exchange rates
UPDATE shipping_routes SET exchange_rate = 83.0 WHERE origin_country = 'US' AND destination_country = 'IN';
UPDATE shipping_routes SET exchange_rate = 1.0 WHERE origin_country = 'US' AND destination_country = 'CA';
UPDATE shipping_routes SET exchange_rate = 0.8 WHERE origin_country = 'US' AND destination_country = 'UK';
UPDATE shipping_routes SET exchange_rate = 1.5 WHERE origin_country = 'US' AND destination_country = 'AU';
UPDATE shipping_routes SET exchange_rate = 0.9 WHERE origin_country = 'US' AND destination_country = 'DE';
UPDATE shipping_routes SET exchange_rate = 0.9 WHERE origin_country = 'US' AND destination_country = 'FR';
UPDATE shipping_routes SET exchange_rate = 150.0 WHERE origin_country = 'US' AND destination_country = 'JP';
UPDATE shipping_routes SET exchange_rate = 5.0 WHERE origin_country = 'US' AND destination_country = 'BR';
UPDATE shipping_routes SET exchange_rate = 18.0 WHERE origin_country = 'US' AND destination_country = 'MX';
UPDATE shipping_routes SET exchange_rate = 1.35 WHERE origin_country = 'US' AND destination_country = 'SG';

-- Set specific rates for your existing routes
UPDATE shipping_routes SET exchange_rate = 83.0 WHERE origin_country = 'US' AND destination_country = 'IN';
UPDATE shipping_routes SET exchange_rate = 1.0 WHERE origin_country = 'IN' AND destination_country = 'US';
UPDATE shipping_routes SET exchange_rate = 1.6 WHERE origin_country = 'IN' AND destination_country = 'NP';
UPDATE shipping_routes SET exchange_rate = 0.625 WHERE origin_country = 'NP' AND destination_country = 'IN';
UPDATE shipping_routes SET exchange_rate = 1.0 WHERE origin_country = 'US' AND destination_country = 'NP';

-- Set default for any remaining routes
UPDATE shipping_routes SET exchange_rate = 1.0 WHERE exchange_rate IS NULL;

-- Verify the changes
SELECT origin_country, destination_country, exchange_rate FROM shipping_routes ORDER BY origin_country, destination_country; 