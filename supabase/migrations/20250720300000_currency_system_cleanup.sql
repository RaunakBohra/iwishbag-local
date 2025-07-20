-- Currency System Cleanup Migration
-- Remove redundant tables, columns, and over-engineered complexity
-- Simplify to a lean 2-tier system: Shipping Routes → Country Settings → Error

-- Step 1: Remove redundant exchange rate cache table
-- This was over-engineering - we'll use simple 2-tier fallback instead
DROP TABLE IF EXISTS exchange_rate_cache CASCADE;

-- Step 2: Remove over-engineered tracking columns from quotes table
-- These were adding unnecessary complexity without business value
ALTER TABLE quotes DROP COLUMN IF EXISTS exchange_rate_source;
ALTER TABLE quotes DROP COLUMN IF EXISTS exchange_rate_method;
ALTER TABLE quotes DROP COLUMN IF EXISTS final_total_local;

-- Step 3: Remove over-engineered payment reconciliation columns
-- USD equivalent can be calculated on-demand, no need to store
ALTER TABLE payment_transactions DROP COLUMN IF EXISTS usd_equivalent;
ALTER TABLE payment_transactions DROP COLUMN IF EXISTS exchange_rate_at_payment;
ALTER TABLE payment_transactions DROP COLUMN IF EXISTS local_currency;

-- Step 4: Remove unused payment gateway fee columns
-- These were added but never used by the business
ALTER TABLE country_settings DROP COLUMN IF EXISTS payment_gateway_fixed_fee;
ALTER TABLE country_settings DROP COLUMN IF EXISTS payment_gateway_percent_fee;
ALTER TABLE country_settings DROP COLUMN IF EXISTS minimum_payment_amount;

-- Step 5: Remove unused exchange rate metadata from shipping routes
-- Only the exchange_rate field itself is needed
ALTER TABLE shipping_routes DROP COLUMN IF EXISTS exchange_rate_last_updated;
ALTER TABLE shipping_routes DROP COLUMN IF EXISTS exchange_rate_source;

-- Step 6: Remove over-engineered system settings for exchange rate API
-- We'll use simple database-driven approach instead
DELETE FROM system_settings WHERE setting_key = 'exchange_rate_api';

-- Step 7: Add critical direct exchange rates to shipping routes
-- Business requirement: INR→NPR should be 1.6, not USD conversion
INSERT INTO shipping_routes (origin_country, destination_country, exchange_rate, base_shipping_cost, cost_per_kg) 
VALUES 
  ('IN', 'NP', 1.6, 25.0, 5.0),
  ('NP', 'IN', 0.625, 25.0, 5.0)
ON CONFLICT (origin_country, destination_country) 
DO UPDATE SET exchange_rate = EXCLUDED.exchange_rate;

-- Step 8: Drop the complex get_optimal_exchange_rate function
-- Will be replaced with simple 2-tier logic in application code
DROP FUNCTION IF EXISTS get_optimal_exchange_rate(VARCHAR(3), VARCHAR(3));

-- Step 9: Drop the over-engineered payment summary view
-- Simple queries are better than complex views for this use case
DROP VIEW IF EXISTS payment_summary_view;

-- Step 10: Ensure essential shipping routes have proper exchange rates
-- These are critical for business operations
UPDATE shipping_routes 
SET exchange_rate = 83.0 
WHERE origin_country = 'US' AND destination_country = 'IN' AND (exchange_rate IS NULL OR exchange_rate = 1.0);

UPDATE shipping_routes 
SET exchange_rate = 132.8 
WHERE origin_country = 'US' AND destination_country = 'NP' AND (exchange_rate IS NULL OR exchange_rate = 1.0);

-- Step 11: Set up proper constraints for cleaned schema
ALTER TABLE quotes ALTER COLUMN destination_currency SET DEFAULT 'USD';
ALTER TABLE quotes ALTER COLUMN exchange_rate SET DEFAULT 1.0;

-- Step 12: Update comments for simplified schema
COMMENT ON COLUMN quotes.final_total_usd IS 'Universal base amount in USD - single source of truth';
COMMENT ON COLUMN quotes.destination_currency IS 'Customer display currency preference';
COMMENT ON COLUMN quotes.exchange_rate IS 'Exchange rate used for this quote (from shipping routes or country settings)';

COMMENT ON TABLE shipping_routes IS 'Direct exchange rates for specific country pairs - highest priority';
COMMENT ON TABLE country_settings IS 'USD-based fallback exchange rates via rate_from_usd field';

-- Step 13: Clean up RLS policies for removed tables
-- Note: exchange_rate_cache policies are automatically dropped with the table

-- Summary of cleanup:
-- REMOVED: exchange_rate_cache table (unnecessary complexity)
-- REMOVED: 8 over-engineered columns across 3 tables
-- REMOVED: Complex functions and views
-- ADDED: Critical IN→NP and NP→IN direct exchange rates (1.6 and 0.625)
-- RESULT: Simple 2-tier system - Shipping Routes → Country Settings → Error