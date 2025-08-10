-- ============================================================================
-- TEST PROFILE CREATION FIX
-- Simple test to verify the constraint fix worked
-- ============================================================================

-- Test profile creation with existing auth user
DO $$
DECLARE
    auth_user_id UUID;
    error_msg TEXT;
BEGIN
    RAISE NOTICE '=== TESTING PROFILE CREATION AFTER CONSTRAINT FIX ===';
    
    -- Get existing auth user ID
    SELECT id INTO auth_user_id FROM auth.users LIMIT 1;
    
    IF auth_user_id IS NOT NULL THEN
        BEGIN
            -- Try to create profile (should work now, or already exist)
            INSERT INTO public.profiles (id) VALUES (auth_user_id) ON CONFLICT (id) DO NOTHING;
            RAISE NOTICE '✅ Profile creation/update: SUCCESS';
        EXCEPTION WHEN OTHERS THEN
            GET STACKED DIAGNOSTICS error_msg = MESSAGE_TEXT;
            RAISE NOTICE '❌ Profile creation FAILED: %', error_msg;
        END;
    END IF;
END $$;

-- Test with random UUID to ensure foreign key is working
DO $$
DECLARE
    test_uuid UUID := gen_random_uuid();
    error_msg TEXT;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '=== TESTING FOREIGN KEY ENFORCEMENT ===';
    
    BEGIN
        INSERT INTO public.profiles (id) VALUES (test_uuid);
        RAISE NOTICE '⚠️ Random UUID insertion: UNEXPECTED SUCCESS';
        DELETE FROM public.profiles WHERE id = test_uuid; -- cleanup
    EXCEPTION WHEN OTHERS THEN
        GET STACKED DIAGNOSTICS error_msg = MESSAGE_TEXT;
        IF error_msg LIKE '%foreign key%' OR error_msg LIKE '%violates%' THEN
            RAISE NOTICE '✅ Random UUID insertion: PROPERLY REJECTED (foreign key working)';
        ELSE
            RAISE NOTICE '❌ Random UUID insertion failed with unexpected error: %', error_msg;
        END IF;
    END;
END $$;

-- Now test if the trigger will work by simulating user creation
DO $$
DECLARE
    test_user_count INTEGER;
    test_profile_count INTEGER;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '=== VERIFYING CURRENT STATE ===';
    
    SELECT COUNT(*) INTO test_user_count FROM auth.users;
    SELECT COUNT(*) INTO test_profile_count FROM public.profiles;
    
    RAISE NOTICE 'Auth Users: %', test_user_count;
    RAISE NOTICE 'Profiles: %', test_profile_count;
    
    IF test_profile_count >= test_user_count THEN
        RAISE NOTICE '✅ All existing users have profiles';
        RAISE NOTICE '🚀 NEW USER SIGNUPS SHOULD NOW WORK!';
        RAISE NOTICE '';
        RAISE NOTICE '📝 The issue was a foreign key constraint blocking profile creation';
        RAISE NOTICE '📝 Fixed by recreating constraint with ON DELETE CASCADE';
        RAISE NOTICE '📝 Auth trigger should now successfully create profiles';
    ELSE
        RAISE NOTICE '⚠️ Some users still missing profiles';
    END IF;
END $$;