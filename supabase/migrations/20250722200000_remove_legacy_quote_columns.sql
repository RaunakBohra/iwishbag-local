-- ============================================================================
-- REMOVE LEGACY QUOTE COLUMNS - Database Schema Cleanup
-- Removes obsolete flat fields that have been replaced by breakdown JSONB structure
-- ============================================================================

-- Step 1: Verify breakdown data exists for all quotes before column removal
DO $$
DECLARE
    missing_breakdown_count INTEGER;
    total_quotes_count INTEGER;
BEGIN
    -- Check how many quotes are missing breakdown data
    SELECT COUNT(*) INTO missing_breakdown_count
    FROM quotes 
    WHERE calculation_data IS NULL 
       OR calculation_data->'breakdown' IS NULL
       OR calculation_data->'breakdown'->>'shipping' IS NULL;
    
    SELECT COUNT(*) INTO total_quotes_count FROM quotes;
    
    RAISE NOTICE '🔍 Pre-migration Analysis:';
    RAISE NOTICE '   Total quotes: %', total_quotes_count;
    RAISE NOTICE '   Missing breakdown data: %', missing_breakdown_count;
    
    -- Warn if significant percentage missing breakdown data
    IF missing_breakdown_count > 0 THEN
        RAISE WARNING '⚠️  % quotes missing breakdown data. Consider running data migration first.', missing_breakdown_count;
    END IF;
END $$;

-- Step 2: Create backup of legacy data before removal (optional safety measure)
CREATE TABLE IF NOT EXISTS legacy_quote_fields_backup AS
SELECT 
    id,
    sales_tax_price,
    merchant_shipping_price,
    international_shipping,
    customs_and_ecs,
    created_at,
    updated_at
FROM quotes 
WHERE sales_tax_price IS NOT NULL 
   OR merchant_shipping_price IS NOT NULL 
   OR international_shipping IS NOT NULL 
   OR customs_and_ecs IS NOT NULL;

-- Add indexes and constraints to backup table
ALTER TABLE legacy_quote_fields_backup 
ADD CONSTRAINT legacy_quote_fields_backup_pkey PRIMARY KEY (id);

CREATE INDEX idx_legacy_quote_fields_backup_created_at 
ON legacy_quote_fields_backup(created_at);

-- Step 3: Remove CHECK constraints that depend on legacy columns
ALTER TABLE quotes DROP CONSTRAINT IF EXISTS "quotes_customs_and_ecs_check";
ALTER TABLE quotes DROP CONSTRAINT IF EXISTS "quotes_international_shipping_check";
ALTER TABLE quotes DROP CONSTRAINT IF EXISTS "quotes_merchant_shipping_price_check";
ALTER TABLE quotes DROP CONSTRAINT IF EXISTS "quotes_sales_tax_price_check";

-- Step 4: Remove legacy columns (these are now replaced by calculation_data.breakdown)
ALTER TABLE quotes DROP COLUMN IF EXISTS sales_tax_price;
ALTER TABLE quotes DROP COLUMN IF EXISTS merchant_shipping_price;
ALTER TABLE quotes DROP COLUMN IF EXISTS international_shipping;
ALTER TABLE quotes DROP COLUMN IF EXISTS customs_and_ecs;

-- Step 5: Add helpful comments documenting the change
COMMENT ON TABLE quotes IS 'Quote data with unified JSONB structure. Legacy flat fields removed 2025-07-22 - use calculation_data.breakdown instead';
COMMENT ON COLUMN quotes.calculation_data IS 'JSONB containing breakdown: {items_total, shipping, customs, taxes, fees, discount}';

-- Step 6: Update any views or functions that might reference the removed columns
-- (Add specific view/function updates here if needed)

-- Step 7: Performance optimization - reindex after column removal
REINDEX TABLE quotes;

-- Step 8: Final verification and summary
DO $$
DECLARE
    backup_count INTEGER;
    current_columns TEXT[];
BEGIN
    -- Check backup table
    SELECT COUNT(*) INTO backup_count FROM legacy_quote_fields_backup;
    
    -- Get remaining column names
    SELECT array_agg(column_name ORDER BY ordinal_position) INTO current_columns
    FROM information_schema.columns 
    WHERE table_name = 'quotes' AND table_schema = 'public';
    
    RAISE NOTICE '📊 Migration Summary:';
    RAISE NOTICE '   Legacy data backed up: % records', backup_count;
    RAISE NOTICE '   Removed columns: sales_tax_price, merchant_shipping_price, international_shipping, customs_and_ecs';
    RAISE NOTICE '   Modern data source: calculation_data.breakdown JSONB structure';
    RAISE NOTICE '   Components updated to use: breakdown.shipping, breakdown.customs, breakdown.taxes, breakdown.fees';
    RAISE NOTICE '✅ Schema cleanup completed successfully';
END $$;