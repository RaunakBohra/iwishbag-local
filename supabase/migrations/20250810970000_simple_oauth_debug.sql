-- ============================================================================
-- SIMPLE OAUTH DEBUG
-- Simple check to see current state after Google OAuth signup
-- ============================================================================

DO $$
DECLARE
    user_record RECORD;
    auth_user_count INTEGER;
    profile_count INTEGER;
    role_count INTEGER;
BEGIN
    RAISE NOTICE '=== OAUTH SIGNUP INVESTIGATION ===';
    RAISE NOTICE '';
    
    -- Get counts
    SELECT COUNT(*) INTO auth_user_count FROM auth.users;
    SELECT COUNT(*) INTO profile_count FROM public.profiles;
    SELECT COUNT(*) INTO role_count FROM public.user_roles;
    
    RAISE NOTICE '📊 CURRENT COUNTS:';
    RAISE NOTICE '   Auth Users: %', auth_user_count;
    RAISE NOTICE '   Profiles: %', profile_count; 
    RAISE NOTICE '   User Roles: %', role_count;
    RAISE NOTICE '';
    
    -- Show all users and their data
    RAISE NOTICE '👥 ALL AUTH USERS:';
    FOR user_record IN
        SELECT 
            u.id, 
            u.email, 
            u.created_at,
            u.raw_user_meta_data,
            CASE WHEN p.id IS NOT NULL THEN 'HAS PROFILE' ELSE 'NO PROFILE' END as profile_status,
            CASE WHEN ur.user_id IS NOT NULL THEN 'HAS ROLE' ELSE 'NO ROLE' END as role_status
        FROM auth.users u
        LEFT JOIN public.profiles p ON u.id = p.id
        LEFT JOIN public.user_roles ur ON u.id = ur.user_id
        ORDER BY u.created_at DESC
    LOOP
        RAISE NOTICE '   User: % | % | %', 
            COALESCE(user_record.email, 'no-email'),
            user_record.profile_status,
            user_record.role_status;
        RAISE NOTICE '     ID: %', user_record.id;
        RAISE NOTICE '     Created: %', user_record.created_at;
        IF user_record.raw_user_meta_data IS NOT NULL THEN
            RAISE NOTICE '     OAuth Data: %', user_record.raw_user_meta_data;
        END IF;
        RAISE NOTICE '';
    END LOOP;
    
    -- Check trigger status
    RAISE NOTICE '🔧 TRIGGER STATUS:';
    SELECT COUNT(*) INTO auth_user_count FROM pg_trigger t 
        JOIN pg_class c ON t.tgrelid = c.oid 
        JOIN pg_namespace n ON c.relnamespace = n.oid
        WHERE n.nspname = 'auth' 
        AND c.relname = 'users'
        AND t.tgname = 'on_auth_user_created_enhanced';
        
    IF auth_user_count > 0 THEN
        RAISE NOTICE '   ✅ Enhanced trigger is active';
    ELSE
        RAISE NOTICE '   ❌ Enhanced trigger NOT FOUND';
    END IF;
    
END $$;

-- Fix any users missing profiles or roles
DO $$
DECLARE
    user_record RECORD;
    fixed_count INTEGER := 0;
BEGIN
    RAISE NOTICE '=== FIXING MISSING DATA ===';
    
    -- Create profiles for users who don't have them
    FOR user_record IN
        SELECT u.id, u.email, u.raw_user_meta_data
        FROM auth.users u
        LEFT JOIN public.profiles p ON u.id = p.id
        WHERE p.id IS NULL
    LOOP
        BEGIN
            INSERT INTO public.profiles (
                id, 
                full_name, 
                email
            )
            VALUES (
                user_record.id,
                COALESCE(user_record.raw_user_meta_data->>'full_name', 'User'),
                user_record.email
            );
            
            RAISE NOTICE '   ✅ Created profile for: %', COALESCE(user_record.email, user_record.id::text);
            fixed_count := fixed_count + 1;
            
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE '   ❌ Failed to create profile for %: %', 
                COALESCE(user_record.email, user_record.id::text), SQLERRM;
        END;
    END LOOP;
    
    -- Create roles for users who don't have them  
    FOR user_record IN
        SELECT u.id, u.email
        FROM auth.users u
        LEFT JOIN public.user_roles ur ON u.id = ur.user_id
        WHERE ur.user_id IS NULL
    LOOP
        BEGIN
            INSERT INTO public.user_roles (user_id, role)
            VALUES (user_record.id, 'user');
            
            RAISE NOTICE '   ✅ Created role for: %', COALESCE(user_record.email, user_record.id::text);
            fixed_count := fixed_count + 1;
            
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE '   ❌ Failed to create role for %: %', 
                COALESCE(user_record.email, user_record.id::text), SQLERRM;
        END;
    END LOOP;
    
    IF fixed_count > 0 THEN
        RAISE NOTICE '';
        RAISE NOTICE '✅ Fixed % missing records', fixed_count;
        RAISE NOTICE '🚀 OAuth user should now have complete profile and role!';
    ELSE
        RAISE NOTICE '   ℹ️ No missing data to fix';
    END IF;
END $$;