-- Add Missing Currency Columns Migration
-- This migration adds the missing columns that were referenced in the code but not created in the schema migration

-- Add missing currency-related columns to quotes table
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS destination_currency VARCHAR(3);
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS final_total_local NUMERIC;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS exchange_rate_source VARCHAR(50);
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS exchange_rate_method VARCHAR(50);

-- Set default values for existing quotes
UPDATE quotes SET 
  destination_currency = 'USD',
  final_total_local = final_total_usd,
  exchange_rate_source = 'fallback',
  exchange_rate_method = 'migration_default'
WHERE destination_currency IS NULL;

-- Add missing columns to payment_transactions table
ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS usd_equivalent NUMERIC;
ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS exchange_rate_used NUMERIC;
ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS exchange_rate_source VARCHAR(50);

-- Set default values for existing payment transactions
UPDATE payment_transactions SET 
  usd_equivalent = amount,
  exchange_rate_used = 1.0,
  exchange_rate_source = 'migration_default'
WHERE usd_equivalent IS NULL AND currency = 'USD';

-- Add helpful comments
COMMENT ON COLUMN quotes.destination_currency IS 'User preferred display currency (derived from destination_country)';
COMMENT ON COLUMN quotes.final_total_local IS 'Quote total in user preferred currency (final_total_usd * exchange_rate)';
COMMENT ON COLUMN quotes.exchange_rate_source IS 'Source of exchange rate: shipping_route, country_settings, calculated, fallback';
COMMENT ON COLUMN quotes.exchange_rate_method IS 'Method used: direct, currency_match, usd_intermediary, hardcoded';

COMMENT ON COLUMN payment_transactions.usd_equivalent IS 'Payment amount converted to USD for reconciliation';
COMMENT ON COLUMN payment_transactions.exchange_rate_used IS 'Exchange rate used for USD conversion';
COMMENT ON COLUMN payment_transactions.exchange_rate_source IS 'Source of exchange rate used for conversion';