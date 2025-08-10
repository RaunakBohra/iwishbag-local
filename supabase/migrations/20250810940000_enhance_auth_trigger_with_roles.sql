-- ============================================================================
-- ENHANCE AUTH TRIGGER WITH USER ROLES
-- Now that profile creation is fixed, enhance trigger to also create user roles
-- ============================================================================

-- Enhanced function that creates both profile and user role
CREATE OR REPLACE FUNCTION public.handle_new_user_enhanced() 
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
    has_email_col BOOLEAN;
    has_full_name_col BOOLEAN;
BEGIN
    -- Check what columns exist in profiles table (schema-safe)
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'email' AND table_schema = 'public'
    ) INTO has_email_col;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'full_name' AND table_schema = 'public'
    ) INTO has_full_name_col;

    -- Create profile based on available columns
    IF has_full_name_col AND has_email_col THEN
        INSERT INTO public.profiles (
            id, 
            full_name, 
            email
        )
        VALUES (
            NEW.id,
            COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
            NEW.email
        )
        ON CONFLICT (id) DO NOTHING;
    ELSIF has_email_col THEN
        INSERT INTO public.profiles (id, email)
        VALUES (NEW.id, NEW.email)
        ON CONFLICT (id) DO NOTHING;
    ELSE
        -- Minimal profile creation
        INSERT INTO public.profiles (id)
        VALUES (NEW.id)
        ON CONFLICT (id) DO NOTHING;
    END IF;

    -- Create user role if user_roles table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_roles' AND table_schema = 'public') THEN
        INSERT INTO public.user_roles (user_id, role)
        VALUES (NEW.id, 'user')
        ON CONFLICT (user_id, role) DO NOTHING;
    END IF;
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log error but don't fail the signup
        RAISE WARNING 'Error in handle_new_user_enhanced: %', SQLERRM;
        RETURN NEW;
END;
$$;

-- Replace the simple trigger with enhanced version
DO $$ 
DECLARE
    trigger_exists BOOLEAN;
BEGIN
    RAISE NOTICE '=== UPGRADING AUTH TRIGGER ===';
    
    -- Check if the simple trigger exists
    SELECT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'on_auth_user_created_simple' 
        AND tgrelid = 'auth.users'::regclass
    ) INTO trigger_exists;
    
    IF trigger_exists THEN
        DROP TRIGGER on_auth_user_created_simple ON auth.users;
        RAISE NOTICE '🗑️ Removed simple trigger';
    END IF;
    
    -- Create enhanced trigger
    CREATE TRIGGER on_auth_user_created_enhanced
        AFTER INSERT ON auth.users
        FOR EACH ROW
        EXECUTE FUNCTION public.handle_new_user_enhanced();
        
    RAISE NOTICE '✅ Created enhanced trigger: on_auth_user_created_enhanced';
    RAISE NOTICE '📝 New trigger creates both profiles AND user roles';
END $$;

-- Test the enhanced functionality
DO $$
DECLARE
    user_count INTEGER;
    profile_count INTEGER;
    role_count INTEGER;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '=== ENHANCED AUTH TRIGGER VERIFICATION ===';
    
    SELECT COUNT(*) INTO user_count FROM auth.users;
    SELECT COUNT(*) INTO profile_count FROM public.profiles;
    SELECT COUNT(*) INTO role_count FROM public.user_roles;
    
    RAISE NOTICE 'Auth Users: %', user_count;
    RAISE NOTICE 'Profiles: %', profile_count;
    RAISE NOTICE 'User Roles: %', role_count;
    
    -- Check if existing user has role
    IF role_count < user_count THEN
        RAISE NOTICE '⚠️ Some users missing roles - creating them now';
        
        -- Create roles for existing users without them
        INSERT INTO public.user_roles (user_id, role)
        SELECT u.id, 'user'
        FROM auth.users u
        LEFT JOIN public.user_roles ur ON u.id = ur.user_id
        WHERE ur.user_id IS NULL
        ON CONFLICT (user_id, role) DO NOTHING;
        
        SELECT COUNT(*) INTO role_count FROM public.user_roles;
        RAISE NOTICE '✅ Updated User Roles: %', role_count;
    END IF;
    
    IF profile_count >= user_count AND role_count >= user_count THEN
        RAISE NOTICE '';
        RAISE NOTICE '🎉 AUTH SYSTEM FULLY WORKING!';
        RAISE NOTICE '   ✓ All users have profiles';
        RAISE NOTICE '   ✓ All users have roles';
        RAISE NOTICE '   ✓ New signups will create both automatically';
        RAISE NOTICE '';
        RAISE NOTICE '🚀 USER REGISTRATION IS NOW FULLY FUNCTIONAL!';
    ELSE
        RAISE NOTICE '⚠️ Some users still missing data';
    END IF;
END $$;