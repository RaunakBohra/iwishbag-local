-- Currency System Overhaul: Transform to USD-based universal system
-- This migration implements a comprehensive currency transformation to solve
-- payment gateway reconciliation issues and enable multi-currency support

-- Step 1: Handle view dependencies (payment_proof_verification_summary depends on quotes table)
DROP VIEW IF EXISTS payment_proof_verification_summary;

-- Step 2: Transform quotes table schema
-- Rename final_total to final_total_usd (universal base currency)
ALTER TABLE quotes RENAME COLUMN final_total TO final_total_usd;

-- Remove redundant currency fields
ALTER TABLE quotes DROP COLUMN IF EXISTS final_currency;
ALTER TABLE quotes DROP COLUMN IF EXISTS items_currency;

-- Add new currency system fields
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS destination_currency VARCHAR(3);
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS final_total_local NUMERIC;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS exchange_rate_source TEXT;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS exchange_rate_method TEXT;

-- Step 3: Update payment_transactions for perfect reconciliation
ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS usd_equivalent NUMERIC;
ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS exchange_rate_at_payment NUMERIC;
ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS local_currency VARCHAR(3);

-- Step 4: Enhance shipping_routes with exchange rate metadata
ALTER TABLE shipping_routes ADD COLUMN IF NOT EXISTS exchange_rate_last_updated TIMESTAMPTZ;
ALTER TABLE shipping_routes ADD COLUMN IF NOT EXISTS exchange_rate_source TEXT;

-- Step 5: Add currency system metadata to country_settings
ALTER TABLE country_settings ADD COLUMN IF NOT EXISTS payment_gateway_fixed_fee NUMERIC DEFAULT 0;
ALTER TABLE country_settings ADD COLUMN IF NOT EXISTS payment_gateway_percent_fee NUMERIC DEFAULT 0;
ALTER TABLE country_settings ADD COLUMN IF NOT EXISTS minimum_payment_amount NUMERIC DEFAULT 1;

-- Step 6: system_settings table already exists with different schema (setting_key, setting_value)
-- Insert default exchange rate API configuration using existing schema
INSERT INTO system_settings (setting_key, setting_value, description) VALUES 
('exchange_rate_api', '{"provider": "exchangerate-api", "base_currency": "USD", "cache_duration_minutes": 15}', 'Exchange rate API configuration')
ON CONFLICT (setting_key) DO NOTHING;

-- Step 7: Create optimal exchange rate cache table
CREATE TABLE IF NOT EXISTS exchange_rate_cache (
    from_currency VARCHAR(3) NOT NULL,
    to_currency VARCHAR(3) NOT NULL,
    rate NUMERIC NOT NULL,
    source TEXT NOT NULL,
    method TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    PRIMARY KEY (from_currency, to_currency, source)
);

-- Create index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_exchange_rate_cache_expiry ON exchange_rate_cache(expires_at);

-- Step 8: Update existing data to USD base
-- Set default destination_currency for existing quotes
UPDATE quotes 
SET destination_currency = COALESCE(
    (SELECT currency FROM country_settings WHERE code = quotes.destination_country),
    'USD'
)
WHERE destination_currency IS NULL;

-- Set default exchange rates for existing quotes
UPDATE quotes 
SET exchange_rate = COALESCE(exchange_rate, 1.0)
WHERE exchange_rate IS NULL;

-- Calculate final_total_local for existing quotes
UPDATE quotes 
SET final_total_local = final_total_usd * COALESCE(exchange_rate, 1.0)
WHERE final_total_local IS NULL AND final_total_usd IS NOT NULL;

-- Step 9: Set up constraints and defaults
ALTER TABLE quotes ALTER COLUMN destination_currency SET DEFAULT 'USD';
ALTER TABLE quotes ALTER COLUMN exchange_rate SET DEFAULT 1.0;
ALTER TABLE quotes ALTER COLUMN exchange_rate_source SET DEFAULT 'system';
ALTER TABLE quotes ALTER COLUMN exchange_rate_method SET DEFAULT 'fallback';

-- Step 10: Create a payment summary view with new currency schema
-- Note: payment_proofs table doesn't exist, using payment_transactions instead
CREATE OR REPLACE VIEW payment_summary_view AS
SELECT 
    q.id as quote_id,
    q.display_id,
    q.email,
    q.final_total_usd as quote_amount_usd,
    q.final_total_local as quote_amount_local,
    q.destination_currency as quote_currency,
    q.payment_method,
    q.payment_status,
    q.amount_paid,
    q.status as quote_status,
    q.created_at as quote_created_at,
    COUNT(pt.id) as transaction_count,
    SUM(CASE WHEN pt.status = 'completed' THEN 1 ELSE 0 END) as completed_count,
    SUM(CASE WHEN pt.status = 'completed' THEN COALESCE(pt.usd_equivalent, pt.amount) ELSE 0 END) as total_paid_usd,
    MAX(pt.created_at) as latest_payment_date
FROM quotes q
LEFT JOIN payment_transactions pt ON q.id = pt.quote_id
GROUP BY q.id, q.display_id, q.email, q.final_total_usd, q.final_total_local, 
         q.destination_currency, q.payment_method, q.payment_status, 
         q.amount_paid, q.status, q.created_at;

-- Step 11: Create RLS policies for new tables
ALTER TABLE exchange_rate_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- Allow public read access to exchange rates (they're public market data)
CREATE POLICY "Allow public read access to exchange rates" ON exchange_rate_cache
    FOR SELECT USING (true);

-- Allow service role to manage exchange rates
CREATE POLICY "Allow service role to manage exchange rates" ON exchange_rate_cache
    FOR ALL USING (auth.role() = 'service_role');

-- Allow admins to read system settings
CREATE POLICY "Allow admins to read system settings" ON system_settings
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- Allow service role to manage system settings
CREATE POLICY "Allow service role to manage system settings" ON system_settings
    FOR ALL USING (auth.role() = 'service_role');

-- Step 12: Add helpful comments
COMMENT ON COLUMN quotes.final_total_usd IS 'Universal base amount in USD for all calculations and storage';
COMMENT ON COLUMN quotes.final_total_local IS 'Display amount in destination currency for customer';
COMMENT ON COLUMN quotes.destination_currency IS 'Customer''s preferred currency for display and payment';
COMMENT ON COLUMN quotes.exchange_rate_source IS 'Source of exchange rate (route, api, fallback)';
COMMENT ON COLUMN quotes.exchange_rate_method IS 'Method used to obtain rate (direct, intermediary, fallback)';

COMMENT ON TABLE exchange_rate_cache IS 'Cached exchange rates from various sources with expiration';
COMMENT ON TABLE system_settings IS 'Global system configuration including API keys and settings';

-- Step 13: Create helpful functions
CREATE OR REPLACE FUNCTION get_optimal_exchange_rate(
    from_curr VARCHAR(3),
    to_curr VARCHAR(3)
) RETURNS NUMERIC AS $$
DECLARE
    cached_rate NUMERIC;
BEGIN
    -- Return 1.0 for same currency
    IF from_curr = to_curr THEN
        RETURN 1.0;
    END IF;
    
    -- Try to get from cache first
    SELECT rate INTO cached_rate
    FROM exchange_rate_cache 
    WHERE from_currency = from_curr 
    AND to_currency = to_curr 
    AND expires_at > NOW()
    ORDER BY created_at DESC
    LIMIT 1;
    
    -- Return cached rate if found
    IF cached_rate IS NOT NULL THEN
        RETURN cached_rate;
    END IF;
    
    -- Fallback to shipping routes
    SELECT exchange_rate INTO cached_rate
    FROM shipping_routes
    WHERE origin_country = (SELECT code FROM country_settings WHERE currency = from_curr LIMIT 1)
    AND destination_country = (SELECT code FROM country_settings WHERE currency = to_curr LIMIT 1)
    AND exchange_rate IS NOT NULL
    LIMIT 1;
    
    -- Return route rate if found
    IF cached_rate IS NOT NULL THEN
        RETURN cached_rate;
    END IF;
    
    -- Final fallback
    RETURN 1.0;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_optimal_exchange_rate IS 'Get optimal exchange rate with fallback chain: cache -> routes -> 1.0';