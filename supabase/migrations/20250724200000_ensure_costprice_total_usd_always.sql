-- Ensure costprice_total_usd column always exists in quotes table
-- This migration fixes the missing column issue permanently for database resets
-- It handles different table states and ensures proper column existence

-- This migration runs after nuclear migrations to ensure costprice_total_usd column exists

DO $$ 
BEGIN
    -- Check if quotes table exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'quotes'
    ) THEN
        RAISE EXCEPTION 'quotes table does not exist. Please run core migrations first.';
    END IF;

    -- Ensure costprice_total_usd column exists
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

    -- Ensure the column is NOT NULL and has default value
    BEGIN
        -- Update any NULL values to 0
        UPDATE quotes 
        SET costprice_total_usd = 0 
        WHERE costprice_total_usd IS NULL;
        
        -- Set NOT NULL constraint
        ALTER TABLE quotes ALTER COLUMN costprice_total_usd SET NOT NULL;
        
        -- Set default value for future inserts
        ALTER TABLE quotes ALTER COLUMN costprice_total_usd SET DEFAULT 0;
        
        RAISE NOTICE 'Set costprice_total_usd as NOT NULL with default 0';
    EXCEPTION 
        WHEN OTHERS THEN 
            RAISE NOTICE 'Column constraint update failed, but continuing...';
    END;
END $$;

-- Add helpful comment
COMMENT ON COLUMN quotes.costprice_total_usd IS 'Total cost price in USD (sum of all item costprice_origin values converted to USD using exchange rates). This is the base cost price before shipping, taxes, and fees.';