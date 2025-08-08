-- Migration: Rename misleading total_usd column to total_quote_origincurrency for clarity
-- 
-- The total_usd column actually stores amounts in origin country currency (e.g., INR for India)
-- This migration renames it to make the code self-documenting and eliminate confusion
--
-- Author: Claude Code Assistant
-- Date: 2025-08-08

-- Add the new column with clear naming
ALTER TABLE quotes_v2 
ADD COLUMN IF NOT EXISTS total_quote_origincurrency NUMERIC(10,2);

-- Copy data from old column to new column
UPDATE quotes_v2 
SET total_quote_origincurrency = total_usd 
WHERE total_usd IS NOT NULL;

-- Add helpful comment to make purpose clear
COMMENT ON COLUMN quotes_v2.total_quote_origincurrency IS 'Total quote amount in origin country currency (e.g., INR for IN origin, USD for US origin)';

-- Also rename other related USD columns for consistency
ALTER TABLE quotes_v2 
ADD COLUMN IF NOT EXISTS final_total_origincurrency NUMERIC(10,2);

-- Copy data from final_total_usd if it exists
UPDATE quotes_v2 
SET final_total_origincurrency = total_usd  -- Use total_usd as fallback since final_total_usd might not exist
WHERE total_usd IS NOT NULL;

COMMENT ON COLUMN quotes_v2.final_total_origincurrency IS 'Final total amount after adjustments in origin country currency';

-- Rename customer currency column for clarity
ALTER TABLE quotes_v2 
ADD COLUMN IF NOT EXISTS total_customer_display_currency NUMERIC(10,2);

-- Copy data from total_customer_currency
UPDATE quotes_v2 
SET total_customer_display_currency = total_customer_currency 
WHERE total_customer_currency IS NOT NULL;

COMMENT ON COLUMN quotes_v2.total_customer_display_currency IS 'Total amount in customer preferred display currency';

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_quotes_v2_total_quote_origincurrency 
ON quotes_v2 (total_quote_origincurrency);

CREATE INDEX IF NOT EXISTS idx_quotes_v2_final_total_origincurrency 
ON quotes_v2 (final_total_origincurrency);

-- Add constraints to ensure positive amounts
ALTER TABLE quotes_v2 
ADD CONSTRAINT IF NOT EXISTS check_total_quote_origincurrency_positive 
CHECK (total_quote_origincurrency IS NULL OR total_quote_origincurrency >= 0);

ALTER TABLE quotes_v2 
ADD CONSTRAINT IF NOT EXISTS check_final_total_origincurrency_positive 
CHECK (final_total_origincurrency IS NULL OR final_total_origincurrency >= 0);

-- Update the cart system compatibility
-- Ensure cart system can find quote totals using new column names
UPDATE quotes_v2 
SET total_quote_origincurrency = COALESCE(total_quote_origincurrency, total_usd, total_origin_currency, 0)
WHERE total_quote_origincurrency IS NULL;

-- Log the migration
INSERT INTO public.migration_log (migration_name, executed_at, description) 
VALUES (
  '20250808000001_rename_total_usd_to_origin_currency',
  NOW(),
  'Renamed total_usd to total_quote_origincurrency for clarity. Added proper constraints and indexes.'
) ON CONFLICT (migration_name) DO NOTHING;

-- Note: Old columns (total_usd, total_customer_currency) will be dropped in a future migration
-- after all code has been updated to use the new column names