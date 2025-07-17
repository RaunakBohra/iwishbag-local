-- Migration: Verify and create all critical triggers and functions
-- This ensures all essential database triggers persist through resets

-- Function to verify and fix critical triggers
CREATE OR REPLACE FUNCTION verify_critical_triggers()
RETURNS TEXT AS $$
DECLARE
    v_result TEXT := '';
    v_trigger_exists BOOLEAN;
BEGIN
    -- 1. Check auth.users trigger for handle_new_user
    SELECT EXISTS (
        SELECT 1 FROM pg_trigger t
        JOIN pg_class c ON t.tgrelid = c.oid
        JOIN pg_namespace n ON c.relnamespace = n.oid
        WHERE t.tgname = 'on_auth_user_created'
        AND n.nspname = 'auth'
        AND c.relname = 'users'
    ) INTO v_trigger_exists;
    
    IF NOT v_trigger_exists THEN
        -- Drop if exists (in case of naming issues)
        DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
        
        -- Create the trigger
        CREATE TRIGGER on_auth_user_created 
        AFTER INSERT ON auth.users 
        FOR EACH ROW 
        EXECUTE FUNCTION public.handle_new_user();
        
        v_result := v_result || 'Created on_auth_user_created trigger. ';
    ELSE
        v_result := v_result || 'on_auth_user_created trigger already exists. ';
    END IF;
    
    -- 2. Verify handle_new_user function exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_proc WHERE proname = 'handle_new_user'
    ) THEN
        v_result := v_result || 'ERROR: handle_new_user function is missing! ';
    END IF;
    
    -- 3. Fix any existing users without roles
    INSERT INTO public.user_roles (user_id, role)
    SELECT u.id, 'user'
    FROM auth.users u
    LEFT JOIN public.user_roles r ON u.id = r.user_id
    WHERE r.user_id IS NULL;
    
    GET DIAGNOSTICS v_result = v_result || ROW_COUNT || ' users fixed with roles. ';
    
    -- 4. Ensure admin user has admin role
    UPDATE public.user_roles 
    SET role = 'admin' 
    WHERE user_id IN (
        SELECT id FROM auth.users 
        WHERE email = 'iwbtracking@gmail.com'
    );
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- Execute the verification
SELECT verify_critical_triggers();

-- Add this function to be called after database resets
CREATE OR REPLACE FUNCTION post_reset_verification()
RETURNS void AS $$
BEGIN
    -- Call all verification functions
    PERFORM verify_critical_triggers();
    
    -- Log the verification
    RAISE NOTICE 'Post-reset verification completed at %', NOW();
END;
$$ LANGUAGE plpgsql;