-- Migration: Add exchange_rate field to shipping_routes
-- Date: 2025-07-08
-- Description: Adds exchange_rate field to shipping_routes for route-specific currency conversion

-- Add exchange_rate field to shipping_routes table
ALTER TABLE shipping_routes 
ADD COLUMN exchange_rate DECIMAL(10,6) DEFAULT 1.0 CHECK (exchange_rate > 0);

-- Add comment to explain the field
COMMENT ON COLUMN shipping_routes.exchange_rate IS 'Exchange rate from origin country currency to destination country currency (e.g., USD to INR rate for US->IN route)';

-- Update existing routes with default exchange rates based on common currency pairs
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

-- UK routes
UPDATE shipping_routes SET exchange_rate = 1.25 WHERE origin_country = 'UK' AND destination_country = 'US';
UPDATE shipping_routes SET exchange_rate = 1.7 WHERE origin_country = 'UK' AND destination_country = 'CA';
UPDATE shipping_routes SET exchange_rate = 1.9 WHERE origin_country = 'UK' AND destination_country = 'AU';
UPDATE shipping_routes SET exchange_rate = 1.15 WHERE origin_country = 'UK' AND destination_country = 'DE';
UPDATE shipping_routes SET exchange_rate = 1.15 WHERE origin_country = 'UK' AND destination_country = 'FR';

-- AU routes
UPDATE shipping_routes SET exchange_rate = 0.67 WHERE origin_country = 'AU' AND destination_country = 'US';
UPDATE shipping_routes SET exchange_rate = 0.53 WHERE origin_country = 'AU' AND destination_country = 'UK';
UPDATE shipping_routes SET exchange_rate = 0.9 WHERE origin_country = 'AU' AND destination_country = 'CA';
UPDATE shipping_routes SET exchange_rate = 1.1 WHERE origin_country = 'AU' AND destination_country = 'NZ';

-- DE routes
UPDATE shipping_routes SET exchange_rate = 1.1 WHERE origin_country = 'DE' AND destination_country = 'US';
UPDATE shipping_routes SET exchange_rate = 0.87 WHERE origin_country = 'DE' AND destination_country = 'UK';
UPDATE shipping_routes SET exchange_rate = 1.0 WHERE origin_country = 'DE' AND destination_country = 'FR';
UPDATE shipping_routes SET exchange_rate = 1.0 WHERE origin_country = 'DE' AND destination_country = 'IT';

-- Set default for any remaining routes
UPDATE shipping_routes SET exchange_rate = 1.0 WHERE exchange_rate IS NULL; 