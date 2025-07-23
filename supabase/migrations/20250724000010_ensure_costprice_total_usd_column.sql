-- Ensure costprice_total_usd column exists in quotes table
-- This migration fixes the missing column issue permanently
-- It handles different table states: quotes, quotes_unified, or missing tables

-- First, handle quotes_unified table rename if it exists
DO $$ 
BEGIN
    -- Check if quotes_unified exists (from nuclear migration) but quotes doesn't
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'quotes_unified'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'quotes'
    ) THEN
        -- Rename quotes_unified to quotes
        ALTER TABLE quotes_unified RENAME TO quotes;
        RAISE NOTICE 'Renamed quotes_unified table to quotes';
    END IF;
END $$;

-- Now ensure the quotes table has the correct costprice_total_usd column
DO $$ 
BEGIN
    -- Check if quotes table exists at all
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'quotes'
    ) THEN
        RAISE EXCEPTION 'quotes table does not exist. Please run the nuclear migration first.';
    END IF;

    -- If costprice_total_usd doesn't exist, try to rename from base_total_usd or create new
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'quotes' 
        AND column_name = 'costprice_total_usd'
    ) THEN
        -- Check if base_total_usd exists to rename it
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'quotes' 
            AND column_name = 'base_total_usd'
        ) THEN
            -- Rename base_total_usd to costprice_total_usd
            ALTER TABLE quotes RENAME COLUMN base_total_usd TO costprice_total_usd;
            RAISE NOTICE 'Renamed base_total_usd to costprice_total_usd';
        ELSE
            -- Create costprice_total_usd column from scratch
            ALTER TABLE quotes ADD COLUMN costprice_total_usd NUMERIC(12,2) DEFAULT 0 NOT NULL;
            RAISE NOTICE 'Created new costprice_total_usd column';
        END IF;
    ELSE
        RAISE NOTICE 'costprice_total_usd column already exists';
    END IF;
    
    -- Ensure proper constraint exists
    BEGIN
        ALTER TABLE quotes DROP CONSTRAINT IF EXISTS quotes_base_total_check;
        ALTER TABLE quotes DROP CONSTRAINT IF EXISTS quotes_costprice_total_check;
        ALTER TABLE quotes ADD CONSTRAINT quotes_costprice_total_check CHECK (costprice_total_usd >= 0::numeric);
        RAISE NOTICE 'Added costprice_total_usd check constraint';
    EXCEPTION 
        WHEN OTHERS THEN 
            RAISE NOTICE 'Constraint update failed, but continuing...';
    END;
END $$;

-- Add comment to clarify the field purpose
COMMENT ON COLUMN quotes.costprice_total_usd IS 'Total cost price in USD (sum of all item costprice_origin values converted to USD using exchange rates). This is the base cost price before shipping, taxes, and fees.';

-- Update any existing records that might have NULL values
UPDATE quotes 
SET costprice_total_usd = COALESCE(costprice_total_usd, 0) 
WHERE costprice_total_usd IS NULL OR costprice_total_usd < 0;

-- Ensure the column is NOT NULL
ALTER TABLE quotes ALTER COLUMN costprice_total_usd SET NOT NULL;