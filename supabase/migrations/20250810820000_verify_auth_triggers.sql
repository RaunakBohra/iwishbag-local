-- ============================================================================
-- VERIFY AUTH TRIGGERS AND FUNCTIONS EXIST
-- Check critical auth triggers from local database
-- ============================================================================

DO $$
DECLARE
    trigger_record RECORD;
    function_record RECORD;
    missing_triggers TEXT[] := ARRAY[]::TEXT[];
    missing_functions TEXT[] := ARRAY[]::TEXT[];
    critical_auth_triggers TEXT[] := ARRAY[
        'on_auth_user_created', 
        'on_auth_user_created_safe', 
        'on_auth_user_updated',
        'sync_oauth_profile_data_trigger',
        'ensure_phone_e164_trigger'
    ];
    critical_auth_functions TEXT[] := ARRAY[
        'handle_new_user',
        'handle_new_user_safe', 
        'handle_user_update',
        'sync_oauth_profile_data',
        'ensure_phone_e164_format'
    ];
    trigger_name TEXT;
    function_name TEXT;
BEGIN
    RAISE NOTICE '=== AUTH TRIGGERS VERIFICATION ===';
    
    -- Check for critical auth triggers
    FOREACH trigger_name IN ARRAY critical_auth_triggers
    LOOP
        SELECT t.tgname INTO trigger_record 
        FROM pg_trigger t 
        JOIN pg_class c ON t.tgrelid = c.oid 
        JOIN pg_namespace n ON c.relnamespace = n.oid
        WHERE t.tgname = trigger_name 
        AND n.nspname = 'auth' 
        AND c.relname = 'users';
        
        IF trigger_record.tgname IS NOT NULL THEN
            RAISE NOTICE '✅ % - EXISTS on auth.users', trigger_name;
        ELSE
            RAISE NOTICE '❌ % - MISSING on auth.users', trigger_name;
            missing_triggers := missing_triggers || trigger_name;
        END IF;
    END LOOP;
    
    RAISE NOTICE '';
    RAISE NOTICE '=== AUTH FUNCTIONS VERIFICATION ===';
    
    -- Check for critical auth functions
    FOREACH function_name IN ARRAY critical_auth_functions
    LOOP
        SELECT routine_name INTO function_record 
        FROM information_schema.routines 
        WHERE routine_name = function_name 
        AND routine_schema = 'public'
        AND routine_type = 'FUNCTION';
        
        IF function_record.routine_name IS NOT NULL THEN
            RAISE NOTICE '✅ %() - EXISTS in public schema', function_name;
        ELSE
            RAISE NOTICE '❌ %() - MISSING in public schema', function_name;
            missing_functions := missing_functions || function_name;
        END IF;
    END LOOP;
    
    -- Summary
    RAISE NOTICE '';
    RAISE NOTICE '=== AUTH SYNC SUMMARY ===';
    IF array_length(missing_triggers, 1) > 0 THEN
        RAISE NOTICE '🚨 MISSING TRIGGERS: %', array_to_string(missing_triggers, ', ');
    ELSE
        RAISE NOTICE '✅ All critical auth triggers exist';
    END IF;
    
    IF array_length(missing_functions, 1) > 0 THEN
        RAISE NOTICE '🚨 MISSING FUNCTIONS: %', array_to_string(missing_functions, ', ');
    ELSE
        RAISE NOTICE '✅ All critical auth functions exist';
    END IF;
    
    IF array_length(missing_triggers, 1) > 0 OR array_length(missing_functions, 1) > 0 THEN
        RAISE NOTICE '';
        RAISE NOTICE '⚠️  AUTH INTEGRATION INCOMPLETE - Some triggers/functions missing';
        RAISE NOTICE 'This may affect user registration and profile creation';
    ELSE
        RAISE NOTICE '';
        RAISE NOTICE '✅ AUTH INTEGRATION COMPLETE - All triggers and functions exist';
    END IF;
END $$;

-- Check if profiles table properly creates for new users
DO $$
DECLARE
    test_user_count INTEGER;
    profile_count INTEGER;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '=== USER-PROFILE SYNC TEST ===';
    
    -- Count auth users vs profiles
    SELECT COUNT(*) INTO test_user_count FROM auth.users;
    SELECT COUNT(*) INTO profile_count FROM public.profiles;
    
    RAISE NOTICE 'Auth users: %', test_user_count;
    RAISE NOTICE 'Profile records: %', profile_count;
    
    IF profile_count >= test_user_count THEN
        RAISE NOTICE '✅ Profile sync appears healthy (profiles >= users)';
    ELSE
        RAISE NOTICE '⚠️  Profile sync may have issues (profiles < users)';
        RAISE NOTICE 'Expected: Every auth.user should have a public.profile';
    END IF;
END $$;