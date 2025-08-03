-- Fix missing updated_at columns for tables that have updated_at triggers
-- This prevents "record has no field updated_at" errors

-- Add updated_at column to tables that have update triggers but missing the column
-- These are the main tables that might be missing the column based on the error pattern

-- Already fixed: discount_codes, customer_discount_usage
-- Let's add it to any other tables that might need it

DO $$
DECLARE
    tbl_name text;
    trigger_exists boolean;
    column_exists boolean;
BEGIN
    -- Get all tables with updated_at triggers
    FOR tbl_name IN 
        SELECT DISTINCT pc.relname
        FROM pg_trigger pt 
        JOIN pg_class pc ON pt.tgrelid = pc.oid 
        WHERE pt.tgname LIKE '%updated_at%'
        AND pc.relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
    LOOP
        -- Check if the table has the updated_at column
        SELECT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = tbl_name 
            AND column_name = 'updated_at' 
            AND table_schema = 'public'
        ) INTO column_exists;
        
        -- If column doesn't exist, add it
        IF NOT column_exists THEN
            EXECUTE format('ALTER TABLE %I ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW()', tbl_name);
            RAISE NOTICE 'Added updated_at column to table: %', tbl_name;
        END IF;
    END LOOP;
END $$;

-- Verify that all tables with updated_at triggers now have the column
SELECT 
    pc.relname as table_name,
    CASE WHEN c.column_name IS NOT NULL THEN '✓ HAS updated_at' ELSE '✗ MISSING updated_at' END as status
FROM (
    SELECT DISTINCT pc.relname
    FROM pg_trigger pt 
    JOIN pg_class pc ON pt.tgrelid = pc.oid 
    WHERE pt.tgname LIKE '%updated_at%'
    AND pc.relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
) AS tables_with_triggers
JOIN pg_class pc ON pc.relname = tables_with_triggers.relname
LEFT JOIN information_schema.columns c 
    ON c.table_name = pc.relname 
    AND c.column_name = 'updated_at'
    AND c.table_schema = 'public'
ORDER BY pc.relname;

-- Add comment for documentation
COMMENT ON SCHEMA public IS 'Updated all tables with updated_at triggers to have updated_at columns';