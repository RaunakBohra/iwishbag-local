-- Fix user profile and role creation for OAuth sign-ups
-- This migration creates the missing trigger to automatically create profiles and user roles

-- First, let's make sure the ensure_user_profile function exists and is up to date
CREATE OR REPLACE FUNCTION public.ensure_user_profile(_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  -- Check if profile exists
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = _user_id) THEN
    -- Create profile with default values
    INSERT INTO public.profiles (
      id, 
      full_name, 
      phone, 
      country, 
      preferred_display_currency, 
      referral_code
    )
    VALUES (
      _user_id,
      'User',  -- Default name, user can update later
      NULL,
      NULL,  -- Will be auto-set by location detection logic
      NULL,  -- Will be auto-set based on country
      'REF' || substr(md5(random()::text), 1, 8)  -- Generate referral code
    );

    -- Create default user role
    INSERT INTO public.user_roles (user_id, role, created_by)
    VALUES (_user_id, 'user', _user_id);

    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$function$;

-- Create a function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  -- Call ensure_user_profile for the new user
  PERFORM public.ensure_user_profile(NEW.id);
  
  RETURN NEW;
END;
$function$;

-- Create the trigger on auth.users table
-- Drop the trigger if it exists to avoid conflicts
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create the trigger that fires after a new user is inserted
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.ensure_user_profile(uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO authenticated, anon;

-- For users that might have been created without profiles, let's create them
-- This will handle any existing users that don't have profiles
DO $$
DECLARE
  user_record RECORD;
BEGIN
  -- Find users without profiles
  FOR user_record IN 
    SELECT u.id 
    FROM auth.users u 
    LEFT JOIN public.profiles p ON u.id = p.id 
    WHERE p.id IS NULL
  LOOP
    -- Create profile and role for this user
    PERFORM public.ensure_user_profile(user_record.id);
  END LOOP;
END $$;

-- Create a function to extract user info from OAuth metadata
CREATE OR REPLACE FUNCTION public.extract_oauth_user_info(user_metadata jsonb)
RETURNS jsonb
LANGUAGE plpgsql
AS $function$
DECLARE
  result jsonb := '{}';
BEGIN
  -- Extract name from various OAuth providers
  IF user_metadata ? 'full_name' THEN
    result = result || jsonb_build_object('full_name', user_metadata->>'full_name');
  ELSIF user_metadata ? 'name' THEN
    result = result || jsonb_build_object('full_name', user_metadata->>'name');
  ELSIF user_metadata ? 'given_name' AND user_metadata ? 'family_name' THEN
    result = result || jsonb_build_object('full_name', 
      (user_metadata->>'given_name') || ' ' || (user_metadata->>'family_name'));
  END IF;

  -- Extract phone if available
  IF user_metadata ? 'phone' THEN
    result = result || jsonb_build_object('phone', user_metadata->>'phone');
  ELSIF user_metadata ? 'phone_number' THEN
    result = result || jsonb_build_object('phone', user_metadata->>'phone_number');
  END IF;

  -- Extract avatar URL if available
  IF user_metadata ? 'avatar_url' THEN
    result = result || jsonb_build_object('avatar_url', user_metadata->>'avatar_url');
  ELSIF user_metadata ? 'picture' THEN
    result = result || jsonb_build_object('avatar_url', user_metadata->>'picture');
  END IF;

  RETURN result;
END;
$function$;

-- Enhanced function to create profile with OAuth data
CREATE OR REPLACE FUNCTION public.ensure_user_profile_with_oauth(_user_id uuid, _user_metadata jsonb DEFAULT NULL)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  oauth_info jsonb;
  full_name_value text;
  phone_value text;
  avatar_url_value text;
BEGIN
  -- Check if profile exists
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = _user_id) THEN
    
    -- Extract OAuth information if provided
    IF _user_metadata IS NOT NULL THEN
      oauth_info = public.extract_oauth_user_info(_user_metadata);
      full_name_value = COALESCE(oauth_info->>'full_name', 'User');
      phone_value = oauth_info->>'phone';
      avatar_url_value = oauth_info->>'avatar_url';
    ELSE
      full_name_value = 'User';
      phone_value = NULL;
      avatar_url_value = NULL;
    END IF;

    -- Create profile with OAuth data or defaults
    INSERT INTO public.profiles (
      id, 
      full_name, 
      phone, 
      avatar_url,
      country, 
      preferred_display_currency, 
      referral_code
    )
    VALUES (
      _user_id,
      full_name_value,
      phone_value,
      avatar_url_value,
      NULL,  -- Will be auto-set by location detection logic
      NULL,  -- Will be auto-set based on country
      'REF' || substr(md5(random()::text), 1, 8)  -- Generate referral code
    );

    -- Create default user role
    INSERT INTO public.user_roles (user_id, role, created_by)
    VALUES (_user_id, 'user', _user_id);

    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$function$;

-- Update the trigger function to use OAuth metadata if available
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  -- Call ensure_user_profile with OAuth metadata if available
  PERFORM public.ensure_user_profile_with_oauth(NEW.id, NEW.user_metadata);
  
  RETURN NEW;
END;
$function$;

-- Grant permissions for new functions
GRANT EXECUTE ON FUNCTION public.extract_oauth_user_info(jsonb) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.ensure_user_profile_with_oauth(uuid, jsonb) TO authenticated, anon;