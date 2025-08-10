-- ============================================================================
-- COMPREHENSIVE VERIFICATION OF RLS POLICIES, TRIGGERS, AND FUNCTIONS
-- ============================================================================

-- VERIFICATION 1: RLS POLICIES COUNT AND COVERAGE
DO $$
DECLARE
    rls_enabled_count INTEGER;
    total_policies_count INTEGER;
    public_policies_count INTEGER;
    auth_policies_count INTEGER;
    policy_record RECORD;
    missing_policies TEXT[] := ARRAY[]::TEXT[];
BEGIN
    -- Count RLS enabled tables
    SELECT COUNT(*) INTO rls_enabled_count 
    FROM pg_tables 
    WHERE schemaname = 'public' AND rowsecurity = true;
    
    -- Count total policies
    SELECT COUNT(*) INTO total_policies_count 
    FROM pg_policies;
    
    -- Count public schema policies
    SELECT COUNT(*) INTO public_policies_count 
    FROM pg_policies 
    WHERE schemaname = 'public';
    
    -- Count auth schema policies
    SELECT COUNT(*) INTO auth_policies_count 
    FROM pg_policies 
    WHERE schemaname = 'auth';
    
    RAISE NOTICE '=== RLS VERIFICATION REPORT ===';
    RAISE NOTICE 'RLS Enabled Tables: %', rls_enabled_count;
    RAISE NOTICE 'Total Policies (All Schemas): %', total_policies_count;
    RAISE NOTICE 'Public Schema Policies: %', public_policies_count;
    RAISE NOTICE 'Auth Schema Policies: %', auth_policies_count;
    RAISE NOTICE '';
    
    -- Check for critical tables that should have RLS
    RAISE NOTICE '=== CRITICAL TABLE RLS STATUS ===';
    FOR policy_record IN 
        SELECT t.tablename, 
               t.rowsecurity,
               COUNT(p.policyname) as policy_count
        FROM pg_tables t
        LEFT JOIN pg_policies p ON t.tablename = p.tablename AND t.schemaname = p.schemaname
        WHERE t.schemaname = 'public' 
        AND t.tablename IN ('profiles', 'quotes_v2', 'orders', 'user_addresses', 'support_system', 'payment_transactions')
        GROUP BY t.tablename, t.rowsecurity
        ORDER BY t.tablename
    LOOP
        RAISE NOTICE '% - RLS: %, Policies: %', 
            policy_record.tablename, 
            CASE WHEN policy_record.rowsecurity THEN 'ENABLED' ELSE 'DISABLED' END,
            policy_record.policy_count;
            
        IF NOT policy_record.rowsecurity THEN
            missing_policies := missing_policies || policy_record.tablename;
        END IF;
    END LOOP;
    
    IF array_length(missing_policies, 1) > 0 THEN
        RAISE NOTICE '';
        RAISE NOTICE '🚨 MISSING RLS: %', array_to_string(missing_policies, ', ');
    ELSE
        RAISE NOTICE '';
        RAISE NOTICE '✅ All critical tables have RLS enabled';
    END IF;
END $$;

-- VERIFICATION 2: CRITICAL FUNCTIONS EXISTENCE
DO $$
DECLARE
    func_record RECORD;
    missing_functions TEXT[] := ARRAY[]::TEXT[];
    critical_functions TEXT[] := ARRAY['is_admin', 'is_authenticated', 'has_role', 'generate_iwish_tracking_id', 'get_user_permissions_new', 'get_user_roles_new'];
    func_name TEXT;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '=== CRITICAL FUNCTIONS VERIFICATION ===';
    
    FOREACH func_name IN ARRAY critical_functions
    LOOP
        SELECT routine_name INTO func_record 
        FROM information_schema.routines 
        WHERE routine_name = func_name 
        AND routine_schema = 'public'
        AND routine_type = 'FUNCTION';
        
        IF func_record.routine_name IS NOT NULL THEN
            RAISE NOTICE '✅ %() - EXISTS', func_name;
        ELSE
            RAISE NOTICE '❌ %() - MISSING', func_name;
            missing_functions := missing_functions || func_name;
        END IF;
    END LOOP;
    
    IF array_length(missing_functions, 1) > 0 THEN
        RAISE NOTICE '';
        RAISE NOTICE '🚨 MISSING FUNCTIONS: %', array_to_string(missing_functions, ', ');
    END IF;
END $$;

-- VERIFICATION 3: TRIGGERS VERIFICATION
DO $$
DECLARE
    trigger_record RECORD;
    total_triggers INTEGER;
    public_triggers INTEGER;
    auth_triggers INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_triggers FROM pg_trigger;
    SELECT COUNT(*) INTO public_triggers FROM pg_trigger t JOIN pg_class c ON t.tgrelid = c.oid JOIN pg_namespace n ON c.relnamespace = n.oid WHERE n.nspname = 'public';
    SELECT COUNT(*) INTO auth_triggers FROM pg_trigger t JOIN pg_class c ON t.tgrelid = c.oid JOIN pg_namespace n ON c.relnamespace = n.oid WHERE n.nspname = 'auth';
    
    RAISE NOTICE '';
    RAISE NOTICE '=== TRIGGERS VERIFICATION ===';
    RAISE NOTICE 'Total Triggers: %', total_triggers;
    RAISE NOTICE 'Public Schema Triggers: %', public_triggers;
    RAISE NOTICE 'Auth Schema Triggers: %', auth_triggers;
    RAISE NOTICE '';
    
    -- Check critical triggers
    RAISE NOTICE 'Critical Triggers Status:';
    
    -- Check updated_at triggers
    FOR trigger_record IN
        SELECT DISTINCT t.tgname as trigger_name, 
               c.relname as table_name,
               n.nspname as schema_name
        FROM pg_trigger t 
        JOIN pg_class c ON t.tgrelid = c.oid 
        JOIN pg_namespace n ON c.relnamespace = n.oid
        WHERE t.tgname LIKE '%updated_at%' 
        AND n.nspname IN ('public', 'auth')
        ORDER BY n.nspname, c.relname
    LOOP
        RAISE NOTICE '✅ % on %.%', trigger_record.trigger_name, trigger_record.schema_name, trigger_record.table_name;
    END LOOP;
    
    -- Check auth triggers
    FOR trigger_record IN
        SELECT DISTINCT t.tgname as trigger_name,
               c.relname as table_name 
        FROM pg_trigger t 
        JOIN pg_class c ON t.tgrelid = c.oid 
        JOIN pg_namespace n ON c.relnamespace = n.oid
        WHERE n.nspname = 'auth' 
        AND c.relname = 'users'
        ORDER BY t.tgname
    LOOP
        RAISE NOTICE '✅ Auth Trigger: % on auth.users', trigger_record.trigger_name;
    END LOOP;
END $$;

-- VERIFICATION 4: POLICY DETAILS BY TABLE TYPE
DO $$
DECLARE
    policy_record RECORD;
    user_tables TEXT[] := ARRAY['profiles', 'quotes_v2', 'user_addresses', 'orders'];
    config_tables TEXT[] := ARRAY['country_settings', 'currency_rates', 'hsn_master'];
    admin_tables TEXT[] := ARRAY['user_roles', 'admin_overrides', 'system_settings'];
    table_name TEXT;
    table_category TEXT;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '=== DETAILED POLICY VERIFICATION ===';
    
    -- User Data Tables
    RAISE NOTICE '';
    RAISE NOTICE 'USER DATA TABLES:';
    FOREACH table_name IN ARRAY user_tables
    LOOP
        SELECT COUNT(*) as policy_count INTO policy_record
        FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = table_name;
        
        IF policy_record.policy_count > 0 THEN
            RAISE NOTICE '✅ % - % policies', table_name, policy_record.policy_count;
        ELSE
            RAISE NOTICE '❌ % - NO POLICIES', table_name;
        END IF;
    END LOOP;
    
    -- Configuration Tables
    RAISE NOTICE '';
    RAISE NOTICE 'CONFIGURATION TABLES:';
    FOREACH table_name IN ARRAY config_tables
    LOOP
        SELECT COUNT(*) as policy_count INTO policy_record
        FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = table_name;
        
        IF policy_record.policy_count > 0 THEN
            RAISE NOTICE '✅ % - % policies', table_name, policy_record.policy_count;
        ELSE
            RAISE NOTICE '❌ % - NO POLICIES', table_name;
        END IF;
    END LOOP;
    
    -- Admin Tables
    RAISE NOTICE '';
    RAISE NOTICE 'ADMIN TABLES:';
    FOREACH table_name IN ARRAY admin_tables
    LOOP
        SELECT COUNT(*) as policy_count INTO policy_record
        FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = table_name;
        
        IF policy_record.policy_count > 0 THEN
            RAISE NOTICE '✅ % - % policies', table_name, policy_record.policy_count;
        ELSE
            RAISE NOTICE '❌ % - NO POLICIES', table_name;
        END IF;
    END LOOP;
END $$;

-- VERIFICATION 5: TEST SAMPLE POLICIES
DO $$
DECLARE
    test_result BOOLEAN;
    error_message TEXT;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '=== POLICY TESTING ===';
    
    -- Test 1: Check if is_admin() function works
    BEGIN
        SELECT is_admin() INTO test_result;
        RAISE NOTICE '✅ is_admin() function - WORKS';
    EXCEPTION WHEN OTHERS THEN
        GET STACKED DIAGNOSTICS error_message = MESSAGE_TEXT;
        RAISE NOTICE '❌ is_admin() function - ERROR: %', error_message;
    END;
    
    -- Test 2: Check if is_authenticated() function works  
    BEGIN
        SELECT is_authenticated() INTO test_result;
        RAISE NOTICE '✅ is_authenticated() function - WORKS';
    EXCEPTION WHEN OTHERS THEN
        GET STACKED DIAGNOSTICS error_message = MESSAGE_TEXT;
        RAISE NOTICE '❌ is_authenticated() function - ERROR: %', error_message;
    END;
    
    -- Test 3: Check auth.uid() access
    BEGIN
        PERFORM auth.uid();
        RAISE NOTICE '✅ auth.uid() access - WORKS';
    EXCEPTION WHEN OTHERS THEN
        GET STACKED DIAGNOSTICS error_message = MESSAGE_TEXT;
        RAISE NOTICE '❌ auth.uid() access - ERROR: %', error_message;
    END;
END $$;

-- VERIFICATION 6: FINAL SUMMARY
DO $$
DECLARE
    final_rls_count INTEGER;
    final_policy_count INTEGER;
    coverage_percentage NUMERIC;
BEGIN
    SELECT COUNT(*) INTO final_rls_count 
    FROM pg_tables 
    WHERE schemaname = 'public' AND rowsecurity = true;
    
    SELECT COUNT(*) INTO final_policy_count 
    FROM pg_policies 
    WHERE schemaname = 'public';
    
    coverage_percentage := round((final_policy_count::numeric / 245) * 100, 1);
    
    RAISE NOTICE '';
    RAISE NOTICE '=== FINAL VERIFICATION SUMMARY ===';
    RAISE NOTICE 'RLS Tables: % / 95 target (% percent)', final_rls_count, round((final_rls_count::numeric / 95) * 100, 1);
    RAISE NOTICE 'Policies: % / 245+ target (% percent)', final_policy_count, coverage_percentage;
    
    IF final_rls_count >= 95 AND final_policy_count >= 200 THEN
        RAISE NOTICE '🎯 EXCELLENT: Both RLS and policies meet/exceed targets';
    ELSIF final_rls_count >= 95 THEN
        RAISE NOTICE '✅ GOOD: RLS tables exceed target, policies need improvement';
    ELSIF final_policy_count >= 200 THEN
        RAISE NOTICE '✅ GOOD: Policies strong, RLS tables could be improved';
    ELSE
        RAISE NOTICE '🔄 PROGRESS: Both areas have room for improvement';
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '=== VERIFICATION COMPLETE ===';
END $$;