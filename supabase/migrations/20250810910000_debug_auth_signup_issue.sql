-- ============================================================================
-- DEBUG AUTH SIGNUP ISSUE
-- Investigate why profiles and user_roles aren't being created on signup
-- ============================================================================

DO $$
DECLARE
    trigger_record RECORD;
    function_record RECORD;
    schema_record RECORD;
BEGIN
    RAISE NOTICE '=== DEBUGGING USER SIGNUP ISSUE ===';
    RAISE NOTICE '';
    
    -- 1. Check if auth triggers exist and are enabled
    RAISE NOTICE '🔍 CHECKING AUTH TRIGGERS:';
    FOR trigger_record IN
        SELECT t.tgname as trigger_name, 
               t.tgenabled as is_enabled,
               p.proname as function_name,
               t.tgtype as trigger_type
        FROM pg_trigger t 
        JOIN pg_class c ON t.tgrelid = c.oid 
        JOIN pg_namespace n ON c.relnamespace = n.oid
        JOIN pg_proc p ON t.tgfoid = p.oid
        WHERE n.nspname = 'auth' 
        AND c.relname = 'users'
        AND t.tgname LIKE '%auth_user%'
        ORDER BY t.tgname
    LOOP
        RAISE NOTICE '   Trigger: % | Enabled: % | Function: %', 
            trigger_record.trigger_name, 
            CASE WHEN trigger_record.is_enabled = 'O' THEN 'YES' ELSE 'NO' END,
            trigger_record.function_name;
    END LOOP;
    
    -- 2. Check if the trigger functions exist and can be called
    RAISE NOTICE '';
    RAISE NOTICE '🔍 CHECKING TRIGGER FUNCTIONS:';
    FOR function_record IN
        SELECT routine_name, routine_definition
        FROM information_schema.routines 
        WHERE routine_name IN ('handle_new_user_simple', 'handle_new_user', 'handle_new_user_safe')
        AND routine_schema = 'public'
        ORDER BY routine_name
    LOOP
        RAISE NOTICE '   Function: % - EXISTS', function_record.routine_name;
    END LOOP;
    
    -- 3. Check profiles table schema
    RAISE NOTICE '';
    RAISE NOTICE '🔍 CHECKING PROFILES TABLE SCHEMA:';
    FOR schema_record IN
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_name = 'profiles' 
        AND table_schema = 'public'
        ORDER BY ordinal_position
    LOOP
        RAISE NOTICE '   Column: % | Type: % | Nullable: % | Default: %', 
            schema_record.column_name,
            schema_record.data_type,
            schema_record.is_nullable,
            COALESCE(schema_record.column_default, 'none');
    END LOOP;
    
    -- 4. Check user_roles table schema
    RAISE NOTICE '';
    RAISE NOTICE '🔍 CHECKING USER_ROLES TABLE:';
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_roles' AND table_schema = 'public') THEN
        RAISE NOTICE '   user_roles table EXISTS';
        FOR schema_record IN
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_name = 'user_roles' 
            AND table_schema = 'public'
            ORDER BY ordinal_position
        LOOP
            RAISE NOTICE '   Column: % | Type: % | Nullable: % | Default: %', 
                schema_record.column_name,
                schema_record.data_type,
                schema_record.is_nullable,
                COALESCE(schema_record.column_default, 'none');
        END LOOP;
    ELSE
        RAISE NOTICE '   user_roles table DOES NOT EXIST';
    END IF;
    
    -- 5. Test the function directly
    RAISE NOTICE '';
    RAISE NOTICE '🧪 TESTING FUNCTION DIRECTLY:';
    BEGIN
        -- Test if we can call the function (won't actually insert since we need NEW record)
        IF EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'handle_new_user_simple' AND routine_schema = 'public') THEN
            RAISE NOTICE '   handle_new_user_simple() function is callable';
        ELSE
            RAISE NOTICE '   ❌ handle_new_user_simple() function NOT FOUND';
        END IF;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '   ❌ Error testing function: %', SQLERRM;
    END;
    
    -- 6. Check current users and profiles count
    RAISE NOTICE '';
    RAISE NOTICE '📊 CURRENT DATA COUNT:';
    DECLARE
        user_count INTEGER;
        profile_count INTEGER;
        role_count INTEGER;
    BEGIN
        SELECT COUNT(*) INTO user_count FROM auth.users;
        SELECT COUNT(*) INTO profile_count FROM public.profiles;
        
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_roles' AND table_schema = 'public') THEN
            SELECT COUNT(*) INTO role_count FROM public.user_roles;
        ELSE
            role_count := 0;
        END IF;
        
        RAISE NOTICE '   Auth Users: %', user_count;
        RAISE NOTICE '   Profiles: %', profile_count;
        RAISE NOTICE '   User Roles: %', role_count;
        
        IF profile_count < user_count THEN
            RAISE NOTICE '   ⚠️  ISSUE: Some users missing profiles';
        END IF;
    END;
    
    -- 7. Check for any recent trigger errors in logs (if accessible)
    RAISE NOTICE '';
    RAISE NOTICE '💡 DIAGNOSTIC RECOMMENDATIONS:';
    RAISE NOTICE '   1. Check if triggers are enabled and firing';
    RAISE NOTICE '   2. Verify function has correct permissions';
    RAISE NOTICE '   3. Test manual profile creation';
    RAISE NOTICE '   4. Check for constraint violations';
END $$;

-- Test manual profile creation to see if there are constraint issues
DO $$
DECLARE
    test_uuid UUID := gen_random_uuid();
    error_msg TEXT;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🧪 TESTING MANUAL PROFILE CREATION:';
    
    BEGIN
        INSERT INTO public.profiles (id) VALUES (test_uuid);
        RAISE NOTICE '   ✅ Manual profile creation: SUCCESS';
        
        -- Clean up test record
        DELETE FROM public.profiles WHERE id = test_uuid;
        RAISE NOTICE '   🧹 Test record cleaned up';
        
    EXCEPTION WHEN OTHERS THEN
        GET STACKED DIAGNOSTICS error_msg = MESSAGE_TEXT;
        RAISE NOTICE '   ❌ Manual profile creation FAILED: %', error_msg;
    END;
END $$;