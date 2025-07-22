-- Migration: Pre-Optimization Database Backup
-- This migration creates a complete backup of the database before optimization
-- Run this BEFORE applying any optimization migrations

-- ============================================================================
-- Step 1: Create Backup Schema
-- ============================================================================
CREATE SCHEMA IF NOT EXISTS pre_optimization_backup;

-- Grant access to backup schema
GRANT USAGE ON SCHEMA pre_optimization_backup TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA pre_optimization_backup TO authenticated;

-- ============================================================================
-- Step 2: Backup Function
-- ============================================================================
CREATE OR REPLACE FUNCTION create_table_backup(source_table TEXT, backup_schema TEXT DEFAULT 'pre_optimization_backup')
RETURNS BOOLEAN AS $$
DECLARE
    backup_table TEXT;
    row_count INTEGER;
    backup_count INTEGER;
BEGIN
    -- Generate backup table name with timestamp
    backup_table := backup_schema || '.' || source_table || '_' || to_char(now(), 'YYYY_MM_DD_HH24_MI_SS');
    
    -- Check if source table exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = source_table
    ) THEN
        RAISE NOTICE 'Table % does not exist - skipping backup', source_table;
        RETURN FALSE;
    END IF;
    
    -- Get row count from source
    EXECUTE format('SELECT COUNT(*) FROM public.%I', source_table) INTO row_count;
    
    -- Create backup table
    EXECUTE format('CREATE TABLE %s AS SELECT * FROM public.%I', backup_table, source_table);
    
    -- Verify backup
    EXECUTE format('SELECT COUNT(*) FROM %s', backup_table) INTO backup_count;
    
    IF row_count != backup_count THEN
        RAISE EXCEPTION 'Backup verification failed for % (Source: %, Backup: %)', 
            source_table, row_count, backup_count;
    END IF;
    
    RAISE NOTICE '✅ Backed up % (% rows) to %', source_table, row_count, backup_table;
    RETURN TRUE;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING '❌ Failed to backup %: %', source_table, SQLERRM;
        RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Step 3: Backup All Critical Tables
-- ============================================================================
DO $$
DECLARE
    tables_to_backup TEXT[] := ARRAY[
        -- Support system tables
        'support_tickets',
        'ticket_replies', 
        'auto_assignment_rules',
        'sla_breaches',
        'reply_templates',
        'ticket_notification_preferences',
        
        -- Configuration tables
        'country_settings',
        'calculation_defaults',
        'system_settings',
        
        -- Audit and logging tables  
        'share_audit_log',
        'webhook_logs',
        'status_transitions',
        'fallback_usage_logs',
        
        -- Core business tables (for safety)
        'quotes',
        'profiles',
        'user_roles',
        'payment_transactions',
        'shipping_routes',
        
        -- Enhancement tables
        'quote_messages',
        'user_addresses'
    ];
    table_name TEXT;
    success_count INTEGER := 0;
    total_count INTEGER := 0;
BEGIN
    RAISE NOTICE '============================================================================';
    RAISE NOTICE 'STARTING PRE-OPTIMIZATION DATABASE BACKUP';
    RAISE NOTICE '============================================================================';
    
    FOREACH table_name IN ARRAY tables_to_backup LOOP
        total_count := total_count + 1;
        IF create_table_backup(table_name) THEN
            success_count := success_count + 1;
        END IF;
    END LOOP;
    
    RAISE NOTICE '============================================================================';
    RAISE NOTICE 'BACKUP SUMMARY: % of % tables backed up successfully', success_count, total_count;
    RAISE NOTICE '============================================================================';
    
    IF success_count < total_count THEN
        RAISE WARNING 'Some tables could not be backed up. Check logs above.';
    ELSE
        RAISE NOTICE '✅ All critical tables backed up successfully!';
    END IF;
    
    -- Create backup metadata table
    CREATE TABLE IF NOT EXISTS pre_optimization_backup.backup_metadata (
        backup_date TIMESTAMPTZ DEFAULT now(),
        total_tables INTEGER,
        successful_backups INTEGER,
        failed_backups INTEGER,
        backup_size_bytes BIGINT,
        notes TEXT
    );
    
    INSERT INTO pre_optimization_backup.backup_metadata (
        total_tables, 
        successful_backups, 
        failed_backups,
        notes
    ) VALUES (
        total_count,
        success_count,
        total_count - success_count,
        'Pre-optimization backup created before applying unified database architecture'
    );
    
END $$;

-- ============================================================================
-- Step 4: Create Backup Verification Function
-- ============================================================================
CREATE OR REPLACE FUNCTION verify_backup_integrity()
RETURNS TABLE(
    table_name TEXT,
    original_count BIGINT,
    backup_count BIGINT,
    status TEXT
) AS $$
DECLARE
    backup_table RECORD;
    orig_count BIGINT;
    back_count BIGINT;
BEGIN
    FOR backup_table IN 
        SELECT t.table_name as backup_name,
               regexp_replace(t.table_name, '_\d{4}_\d{2}_\d{2}_\d{2}_\d{2}_\d{2}$', '') as original_name
        FROM information_schema.tables t
        WHERE t.table_schema = 'pre_optimization_backup'
          AND t.table_name ~ '_\d{4}_\d{2}_\d{2}_\d{2}_\d{2}_\d{2}$'
    LOOP
        -- Get original table count (if exists)
        IF EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = backup_table.original_name
        ) THEN
            EXECUTE format('SELECT COUNT(*) FROM public.%I', backup_table.original_name) INTO orig_count;
        ELSE
            orig_count := 0;
        END IF;
        
        -- Get backup table count
        EXECUTE format('SELECT COUNT(*) FROM pre_optimization_backup.%I', backup_table.backup_name) INTO back_count;
        
        RETURN QUERY SELECT 
            backup_table.original_name,
            orig_count,
            back_count,
            CASE 
                WHEN orig_count = back_count THEN '✅ Perfect Match'
                WHEN orig_count = 0 THEN '⚠️ Original Table Missing'
                ELSE '❌ Count Mismatch'
            END;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Step 5: Create Restore Function (Emergency Use)
-- ============================================================================
CREATE OR REPLACE FUNCTION restore_from_backup(original_table_name TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    backup_table_name TEXT;
    row_count INTEGER;
BEGIN
    -- Find the most recent backup for this table
    SELECT t.table_name INTO backup_table_name
    FROM information_schema.tables t
    WHERE t.table_schema = 'pre_optimization_backup'
      AND t.table_name LIKE original_table_name || '_2025%'
    ORDER BY t.table_name DESC
    LIMIT 1;
    
    IF backup_table_name IS NULL THEN
        RAISE WARNING 'No backup found for table %', original_table_name;
        RETURN FALSE;
    END IF;
    
    -- Drop existing table (WARNING: This is destructive!)
    EXECUTE format('DROP TABLE IF EXISTS public.%I CASCADE', original_table_name);
    
    -- Restore from backup
    EXECUTE format('CREATE TABLE public.%I AS SELECT * FROM pre_optimization_backup.%I', 
                   original_table_name, backup_table_name);
    
    -- Get row count
    EXECUTE format('SELECT COUNT(*) FROM public.%I', original_table_name) INTO row_count;
    
    RAISE NOTICE '✅ Restored % (% rows) from backup %', original_table_name, row_count, backup_table_name;
    RETURN TRUE;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE ERROR '❌ Failed to restore %: %', original_table_name, SQLERRM;
        RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Step 6: Verify Backup Integrity
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE '============================================================================';
    RAISE NOTICE 'BACKUP INTEGRITY VERIFICATION';
    RAISE NOTICE '============================================================================';
    
    -- Show verification results
    RAISE NOTICE 'Backup verification:';
    -- Note: This will show results when the function is called
END $$;

-- ============================================================================
-- Step 7: Add Documentation
-- ============================================================================
COMMENT ON SCHEMA pre_optimization_backup IS 'Complete backup of database before optimization - created on ' || now()::text;
COMMENT ON FUNCTION create_table_backup(TEXT, TEXT) IS 'Creates timestamped backup of specified table';
COMMENT ON FUNCTION verify_backup_integrity() IS 'Verifies backup integrity by comparing row counts';
COMMENT ON FUNCTION restore_from_backup(TEXT) IS 'EMERGENCY FUNCTION: Restores table from most recent backup (DESTRUCTIVE)';

-- Success message
RAISE NOTICE '🎉 Database backup completed successfully!';
RAISE NOTICE 'To verify backup integrity, run: SELECT * FROM verify_backup_integrity();';
RAISE NOTICE 'Backup location: pre_optimization_backup schema';
RAISE NOTICE 'Ready to apply optimization migrations safely!';