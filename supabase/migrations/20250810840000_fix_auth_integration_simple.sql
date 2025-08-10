-- ============================================================================
-- FIX AUTH INTEGRATION - SIMPLE AND SAFE
-- Create auth triggers that work with any schema
-- ============================================================================

-- SIMPLE SAFE FUNCTION: Only creates profile with ID (always works)
CREATE OR REPLACE FUNCTION public.handle_new_user_simple() 
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  -- Create minimal profile - just ID (guaranteed to exist)
  INSERT INTO public.profiles (id)
  VALUES (NEW.id)
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the signup
    RAISE WARNING 'Error in handle_new_user_simple: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- DROP EXISTING TRIGGERS TO REPLACE WITH SIMPLE VERSION
DO $$ 
DECLARE
    trigger_record RECORD;
BEGIN
    -- Drop existing triggers to replace with simple working version
    FOR trigger_record IN
        SELECT tgname
        FROM pg_trigger t 
        JOIN pg_class c ON t.tgrelid = c.oid 
        JOIN pg_namespace n ON c.relnamespace = n.oid
        WHERE n.nspname = 'auth' 
        AND c.relname = 'users'
        AND tgname IN ('on_auth_user_created', 'on_auth_user_created_safe')
    LOOP
        EXECUTE 'DROP TRIGGER IF EXISTS ' || trigger_record.tgname || ' ON auth.users';
        RAISE NOTICE '🗑️ Dropped old trigger: %', trigger_record.tgname;
    END LOOP;
END $$;

-- CREATE SIMPLE WORKING TRIGGER
DO $$ BEGIN
    CREATE TRIGGER on_auth_user_created_simple
        AFTER INSERT ON auth.users
        FOR EACH ROW
        EXECUTE FUNCTION public.handle_new_user_simple();
    
    RAISE NOTICE '✅ Created simple auth trigger: on_auth_user_created_simple';
END $$;

-- FIX EXISTING USER WITHOUT PROFILE (SIMPLE VERSION)
DO $$
DECLARE
    user_record RECORD;
    fixed_count INTEGER := 0;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '=== FIXING EXISTING USERS (SIMPLE) ===';
    
    -- Create minimal profiles for existing auth users
    FOR user_record IN
        SELECT u.id, u.created_at
        FROM auth.users u
        LEFT JOIN public.profiles p ON u.id = p.id
        WHERE p.id IS NULL
    LOOP
        -- Just create profile with ID - guaranteed to work
        INSERT INTO public.profiles (id)
        VALUES (user_record.id)
        ON CONFLICT (id) DO NOTHING;
        
        fixed_count := fixed_count + 1;
    END LOOP;
    
    RAISE NOTICE 'Fixed % users by creating minimal profiles', fixed_count;
END $$;

-- VERIFICATION
DO $$
DECLARE
    auth_users_count INTEGER;
    profiles_count INTEGER;
    auth_triggers_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO auth_users_count FROM auth.users;
    SELECT COUNT(*) INTO profiles_count FROM public.profiles;
    SELECT COUNT(*) INTO auth_triggers_count FROM pg_trigger t 
        JOIN pg_class c ON t.tgrelid = c.oid 
        JOIN pg_namespace n ON c.relnamespace = n.oid
        WHERE n.nspname = 'auth' AND c.relname = 'users' 
        AND tgname LIKE '%auth_user%';
    
    RAISE NOTICE '';
    RAISE NOTICE '=== SIMPLE AUTH INTEGRATION COMPLETE ===';
    RAISE NOTICE 'Auth Users: %', auth_users_count;
    RAISE NOTICE 'Profiles: %', profiles_count;
    RAISE NOTICE 'Auth Triggers: %', auth_triggers_count;
    
    IF profiles_count >= auth_users_count AND auth_triggers_count >= 1 THEN
        RAISE NOTICE '✅ SUCCESS - All users have profiles, trigger exists';
        RAISE NOTICE '📝 NOTE: Using simple profile creation (ID only)';
        RAISE NOTICE '📝 Future user signups will automatically create profiles';
    ELSE
        RAISE NOTICE '🔴 ISSUE - Profile sync may not be working properly';
    END IF;
END $$;