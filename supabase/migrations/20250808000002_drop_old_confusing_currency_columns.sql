-- Migration: Drop old confusing currency columns after successful migration
-- 
-- Now that we have clear column names (total_quote_origincurrency), we can safely
-- remove the misleading old columns (total_usd) that caused currency confusion
--
-- Author: Claude Code Assistant
-- Date: 2025-08-08

-- First, verify that new columns have data (safety check)
DO $$ 
BEGIN
    -- Check if migration was successful
    IF NOT EXISTS (
        SELECT 1 FROM quotes_v2 
        WHERE total_quote_origincurrency IS NOT NULL 
        LIMIT 1
    ) THEN
        RAISE EXCEPTION 'Migration safety check failed: total_quote_origincurrency has no data. Cannot drop old columns.';
    END IF;
    
    RAISE NOTICE 'Safety check passed: New currency columns contain data';
END $$;

-- Drop the old confusing columns
ALTER TABLE quotes_v2 DROP COLUMN IF EXISTS total_usd;
ALTER TABLE quotes_v2 DROP COLUMN IF EXISTS total_customer_currency;

-- Log the cleanup
COMMENT ON TABLE quotes_v2 IS 'Updated 2025-08-08: Removed confusing currency columns (total_usd, total_customer_currency). Use total_quote_origincurrency and total_customer_display_currency instead.';

-- Verify cleanup was successful
DO $$
BEGIN
    -- Check that old columns are gone
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'quotes_v2' 
        AND column_name IN ('total_usd', 'total_customer_currency')
    ) THEN
        RAISE EXCEPTION 'Cleanup failed: Old currency columns still exist';
    END IF;
    
    RAISE NOTICE 'Cleanup successful: Old confusing currency columns removed';
END $$;

-- Update any indexes that referenced old columns (cleanup)
-- Note: Indexes on dropped columns are automatically removed

-- Add final verification message
SELECT 
    'SUCCESS: Old confusing currency columns removed. Use total_quote_origincurrency for origin currency amounts.' as cleanup_status;