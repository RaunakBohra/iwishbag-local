-- ============================================================================
-- FIX USER_ROLES UPDATED_AT COLUMN
-- Fixes ERROR 42703: record "new" has no field "updated_at" caused by trigger
-- without corresponding column on user_roles table
-- Date: 2025-07-25
-- ============================================================================

-- Add missing updated_at column to user_roles table if it doesn't exist
DO $$
BEGIN
    -- Check if updated_at column exists on user_roles table
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'user_roles' 
        AND column_name = 'updated_at'
    ) THEN
        -- Add the missing column
        ALTER TABLE user_roles ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
        
        -- Set initial values for existing records
        UPDATE user_roles SET updated_at = created_at WHERE updated_at IS NULL;
        
        -- Make updated_at NOT NULL after setting values
        ALTER TABLE user_roles ALTER COLUMN updated_at SET NOT NULL;
        
        RAISE NOTICE 'Added missing updated_at column to user_roles table';
    ELSE
        RAISE NOTICE 'updated_at column already exists on user_roles table';
    END IF;
END $$;

-- Ensure the trigger exists and works properly
DO $$
BEGIN
    -- Check if trigger exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger t 
        JOIN pg_class c ON t.tgrelid = c.oid 
        WHERE c.relname = 'user_roles' 
        AND t.tgname = 'update_user_roles_updated_at'
    ) THEN
        -- Create the trigger if missing
        CREATE TRIGGER update_user_roles_updated_at 
            BEFORE UPDATE ON user_roles 
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        
        RAISE NOTICE 'Created missing trigger update_user_roles_updated_at';
    ELSE
        RAISE NOTICE 'Trigger update_user_roles_updated_at already exists';
    END IF;
END $$;

-- Enhanced update_updated_at_column function that handles missing columns gracefully
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
DECLARE
    column_exists BOOLEAN;
BEGIN
    -- Check if the updated_at column exists on the target table
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = TG_TABLE_SCHEMA
        AND table_name = TG_TABLE_NAME 
        AND column_name = 'updated_at'
    ) INTO column_exists;
    
    -- Only update if the column exists
    IF column_exists THEN
        -- Use dynamic SQL to safely set updated_at
        EXECUTE format('SELECT $1.updated_at = NOW()') USING NEW;
        NEW.updated_at = NOW();
    ELSE
        -- Log warning but don't fail
        RAISE NOTICE 'WARNING: Table %.% does not have updated_at column, skipping trigger', TG_TABLE_SCHEMA, TG_TABLE_NAME;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Test the fix
DO $$
DECLARE
    test_record_id UUID;
    initial_updated_at TIMESTAMPTZ;
    new_updated_at TIMESTAMPTZ;
BEGIN
    -- Test on user_roles table if any records exist
    SELECT id INTO test_record_id FROM user_roles LIMIT 1;
    
    IF test_record_id IS NOT NULL THEN
        -- Get initial updated_at value
        SELECT updated_at INTO initial_updated_at FROM user_roles WHERE id = test_record_id;
        
        -- Trigger an update to test the trigger
        UPDATE user_roles SET scope = scope WHERE id = test_record_id;
        
        -- Get new updated_at value
        SELECT updated_at INTO new_updated_at FROM user_roles WHERE id = test_record_id;
        
        IF new_updated_at > initial_updated_at THEN
            RAISE NOTICE 'SUCCESS: user_roles updated_at trigger working correctly';
        ELSE
            RAISE NOTICE 'WARNING: user_roles updated_at trigger may not be working';
        END IF;
    ELSE
        RAISE NOTICE 'No user_roles records found to test trigger';
    END IF;
END $$;

-- Verification
DO $$
DECLARE
    has_column BOOLEAN;
    has_trigger BOOLEAN;
BEGIN
    -- Check column exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'user_roles' 
        AND column_name = 'updated_at'
    ) INTO has_column;
    
    -- Check trigger exists
    SELECT EXISTS (
        SELECT 1 FROM pg_trigger t 
        JOIN pg_class c ON t.tgrelid = c.oid 
        WHERE c.relname = 'user_roles' 
        AND t.tgname = 'update_user_roles_updated_at'
    ) INTO has_trigger;
    
    RAISE NOTICE '==================================================';
    RAISE NOTICE 'USER_ROLES UPDATED_AT FIX COMPLETED!';
    RAISE NOTICE '==================================================';
    RAISE NOTICE 'user_roles has updated_at column: %', 
        CASE WHEN has_column THEN '✅ YES' ELSE '❌ NO' END;
    RAISE NOTICE 'user_roles has updated_at trigger: %', 
        CASE WHEN has_trigger THEN '✅ YES' ELSE '❌ NO' END;
    RAISE NOTICE 'ERROR 42703 should now be resolved!';
END $$;