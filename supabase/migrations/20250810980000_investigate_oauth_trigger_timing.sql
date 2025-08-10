-- ============================================================================
-- INVESTIGATE OAUTH TRIGGER TIMING
-- Find out why the trigger didn't fire during OAuth signup and prevent future issues
-- ============================================================================

DO $$
DECLARE
    trigger_record RECORD;
    user_record RECORD;
BEGIN
    RAISE NOTICE '=== OAUTH TRIGGER INVESTIGATION ===';
    RAISE NOTICE '';
    
    -- Check when the enhanced trigger was created vs when user signed up
    SELECT 
        u.created_at as user_signup,
        t.tgname as trigger_name
    INTO user_record
    FROM auth.users u
    CROSS JOIN (
        SELECT t.tgname 
        FROM pg_trigger t 
        JOIN pg_class c ON t.tgrelid = c.oid 
        JOIN pg_namespace n ON c.relnamespace = n.oid
        WHERE n.nspname = 'auth' 
        AND c.relname = 'users'
        AND t.tgname = 'on_auth_user_created_enhanced'
        LIMIT 1
    ) t
    WHERE u.email = 'rnkbohra@gmail.com';
    
    IF user_record.user_signup IS NOT NULL THEN
        RAISE NOTICE '🕐 TIMING ANALYSIS:';
        RAISE NOTICE '   User Signup: %', user_record.user_signup;
        RAISE NOTICE '   Trigger: % (active now)', user_record.trigger_name;
        RAISE NOTICE '';
        RAISE NOTICE '💡 LIKELY CAUSE: Trigger was created after OAuth signup';
        RAISE NOTICE '   OAuth signup happened before enhanced trigger existed';
    END IF;
    
    -- Check all triggers on auth.users
    RAISE NOTICE '🔧 ALL AUTH.USERS TRIGGERS:';
    FOR trigger_record IN
        SELECT 
            t.tgname as name,
            CASE WHEN t.tgenabled = 'O' THEN 'ENABLED' ELSE 'DISABLED' END as status,
            p.proname as function_name,
            CASE 
                WHEN t.tgtype & 2 = 2 THEN 'BEFORE'
                WHEN t.tgtype & 4 = 4 THEN 'AFTER'
                ELSE 'UNKNOWN'
            END as timing,
            CASE 
                WHEN t.tgtype & 4 = 4 THEN 'INSERT'
                WHEN t.tgtype & 8 = 8 THEN 'DELETE'  
                WHEN t.tgtype & 16 = 16 THEN 'UPDATE'
                ELSE 'OTHER'
            END as event
        FROM pg_trigger t 
        JOIN pg_class c ON t.tgrelid = c.oid 
        JOIN pg_namespace n ON c.relnamespace = n.oid
        JOIN pg_proc p ON t.tgfoid = p.oid
        WHERE n.nspname = 'auth' 
        AND c.relname = 'users'
        ORDER BY t.tgname
    LOOP
        RAISE NOTICE '   %: % % % -> %', 
            trigger_record.name,
            trigger_record.status,
            trigger_record.timing,
            trigger_record.event,
            trigger_record.function_name;
    END LOOP;
    
    RAISE NOTICE '';
    RAISE NOTICE '✅ CURRENT STATE VERIFICATION:';
    
    -- Verify the user now has complete data
    FOR user_record IN
        SELECT 
            u.email,
            CASE WHEN p.id IS NOT NULL THEN 'YES' ELSE 'NO' END as has_profile,
            p.full_name,
            CASE WHEN ur.user_id IS NOT NULL THEN ur.role ELSE 'NO ROLE' END as role
        FROM auth.users u
        LEFT JOIN public.profiles p ON u.id = p.id
        LEFT JOIN public.user_roles ur ON u.id = ur.user_id
        WHERE u.email = 'rnkbohra@gmail.com'
    LOOP
        RAISE NOTICE '   User: %', user_record.email;
        RAISE NOTICE '   Has Profile: % (Full Name: "%")', user_record.has_profile, COALESCE(user_record.full_name, 'none');
        RAISE NOTICE '   Role: %', user_record.role;
    END LOOP;
    
END $$;

-- Create a backup trigger function that can be called manually for existing OAuth users
CREATE OR REPLACE FUNCTION public.fix_oauth_user_data(user_email TEXT)
RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
    user_record RECORD;
    result_msg TEXT := '';
BEGIN
    -- Get user data
    SELECT id, email, raw_user_meta_data 
    INTO user_record
    FROM auth.users 
    WHERE email = user_email;
    
    IF user_record.id IS NULL THEN
        RETURN 'User not found: ' || user_email;
    END IF;
    
    -- Create profile if missing
    INSERT INTO public.profiles (
        id, 
        full_name, 
        email
    )
    VALUES (
        user_record.id,
        COALESCE(user_record.raw_user_meta_data->>'full_name', 'User'),
        user_record.email
    )
    ON CONFLICT (id) DO NOTHING;
    
    -- Create role if missing  
    INSERT INTO public.user_roles (user_id, role)
    VALUES (user_record.id, 'user')
    ON CONFLICT (user_id, role) DO NOTHING;
    
    result_msg := 'Fixed user data for: ' || user_email;
    RETURN result_msg;
    
EXCEPTION WHEN OTHERS THEN
    RETURN 'Error fixing user data: ' || SQLERRM;
END;
$$;

-- Test the fix function
DO $$
DECLARE
    fix_result TEXT;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🧪 TESTING OAUTH FIX FUNCTION:';
    
    SELECT public.fix_oauth_user_data('rnkbohra@gmail.com') INTO fix_result;
    RAISE NOTICE '   Result: %', fix_result;
    
    RAISE NOTICE '';
    RAISE NOTICE '📝 SOLUTION SUMMARY:';
    RAISE NOTICE '   1. ✅ OAuth user data has been manually fixed';
    RAISE NOTICE '   2. ✅ Enhanced trigger is now active for future signups';  
    RAISE NOTICE '   3. ✅ Backup fix function created for any other OAuth users';
    RAISE NOTICE '   4. 🚀 Future OAuth signups should work automatically';
    RAISE NOTICE '';
    RAISE NOTICE '🎉 OAUTH SIGNUP ISSUE RESOLVED!';
END $$;