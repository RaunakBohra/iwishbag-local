-- ============================================================================
-- TAX SYSTEM STANDARDIZATION MIGRATION
-- Fix double conversion issue: standardize all tax values to percentage format
-- ============================================================================

-- CRITICAL: This migration fixes the double conversion bug where:
-- 1. Database stored 0.13 (decimal)
-- 2. Code applied /100 conversion again
-- 3. Result: 0.13% instead of 13%

-- BEFORE: country_settings.vat = 0.13 (decimal format)
-- AFTER:  country_settings.vat = 13.0 (percentage format)

BEGIN;

-- Step 1: Backup current tax data for rollback safety
CREATE TABLE IF NOT EXISTS tax_backup_20250128 AS
SELECT 
    code,
    vat,
    sales_tax,
    'backup_' || to_char(now(), 'YYYY_MM_DD_HH24_MI_SS') as backup_timestamp
FROM country_settings 
WHERE vat > 0 OR sales_tax > 0;

-- Step 2: Convert decimal values to percentage format
-- Only convert values that appear to be in decimal format (< 1.0)
UPDATE country_settings 
SET vat = vat * 100 
WHERE vat > 0 AND vat < 1.0;

UPDATE country_settings 
SET sales_tax = sales_tax * 100 
WHERE sales_tax > 0 AND sales_tax < 1.0;

-- Step 3: Add validation constraints to prevent future issues
-- Ensure all tax percentages are in valid range (0-100)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'check_vat_percentage_range'
    ) THEN
        ALTER TABLE country_settings 
        ADD CONSTRAINT check_vat_percentage_range 
        CHECK (vat >= 0 AND vat <= 100);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'check_sales_tax_percentage_range'
    ) THEN
        ALTER TABLE country_settings 
        ADD CONSTRAINT check_sales_tax_percentage_range 
        CHECK (sales_tax >= 0 AND sales_tax <= 100);
    END IF;
END $$;

-- Step 4: Update table comments for clarity
COMMENT ON COLUMN country_settings.vat IS 'VAT/GST percentage (0-100 range, e.g., 13 = 13%)';
COMMENT ON COLUMN country_settings.sales_tax IS 'Sales tax percentage (0-100 range, e.g., 8 = 8%)';

-- Step 5: Verify migration results
-- This will be logged for verification
DO $$
DECLARE
    total_countries INTEGER;
    vat_countries INTEGER;
    sales_tax_countries INTEGER;
    max_vat NUMERIC;
    max_sales_tax NUMERIC;
BEGIN
    SELECT COUNT(*) INTO total_countries FROM country_settings;
    SELECT COUNT(*) INTO vat_countries FROM country_settings WHERE vat > 0;
    SELECT COUNT(*) INTO sales_tax_countries FROM country_settings WHERE sales_tax > 0;
    SELECT MAX(vat) INTO max_vat FROM country_settings;
    SELECT MAX(sales_tax) INTO max_sales_tax FROM country_settings;
    
    RAISE NOTICE 'TAX MIGRATION RESULTS:';
    RAISE NOTICE '- Total countries: %', total_countries;
    RAISE NOTICE '- Countries with VAT: %', vat_countries;
    RAISE NOTICE '- Countries with sales tax: %', sales_tax_countries;
    RAISE NOTICE '- Max VAT rate: %', max_vat;
    RAISE NOTICE '- Max sales tax rate: %', max_sales_tax;
    
    -- Safety check: ensure no values are suspiciously high
    IF max_vat > 100 OR max_sales_tax > 100 THEN
        RAISE EXCEPTION 'MIGRATION ERROR: Tax rates exceed 100%%. VAT: %, Sales Tax: %', max_vat, max_sales_tax;
    END IF;
    
    RAISE NOTICE 'TAX MIGRATION COMPLETED SUCCESSFULLY';
END $$;

COMMIT;

-- Create rollback script for emergency use
-- This creates a function that can undo the migration if needed
CREATE OR REPLACE FUNCTION rollback_tax_standardization_20250128()
RETURNS VOID AS $$
BEGIN
    RAISE NOTICE 'ROLLING BACK TAX STANDARDIZATION MIGRATION...';
    
    -- Remove constraints
    ALTER TABLE country_settings DROP CONSTRAINT IF EXISTS check_vat_percentage_range;
    ALTER TABLE country_settings DROP CONSTRAINT IF EXISTS check_sales_tax_percentage_range;
    
    -- Restore from backup
    UPDATE country_settings 
    SET vat = backup.vat,
        sales_tax = backup.sales_tax
    FROM tax_backup_20250128 backup
    WHERE country_settings.code = backup.code;
    
    RAISE NOTICE 'ROLLBACK COMPLETED - Tax values restored to original decimal format';
END;
$$ LANGUAGE plpgsql;

-- Usage: SELECT rollback_tax_standardization_20250128(); (if needed)