-- Fix the ensure_user_profile_with_oauth function to remove phone column reference
-- Phone is stored in auth.users.phone, not in profiles table

-- Update the ensure_user_profile_with_oauth function to remove phone column
CREATE OR REPLACE FUNCTION public.ensure_user_profile_with_oauth(_user_id uuid, _user_metadata jsonb DEFAULT NULL)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  oauth_info jsonb;
  full_name_value text;
  avatar_url_value text;
BEGIN
  -- Check if profile exists
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = _user_id) THEN
    
    -- Extract OAuth information if provided
    IF _user_metadata IS NOT NULL THEN
      oauth_info = public.extract_oauth_user_info(_user_metadata);
      full_name_value = COALESCE(oauth_info->>'full_name', 'User');
      avatar_url_value = oauth_info->>'avatar_url';
    ELSE
      full_name_value = 'User';
      avatar_url_value = NULL;
    END IF;

    -- Create profile with OAuth data or defaults (removed phone column)
    INSERT INTO public.profiles (
      id, 
      full_name, 
      avatar_url,
      country, 
      preferred_display_currency, 
      referral_code
    )
    VALUES (
      _user_id,
      full_name_value,
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

-- Also update the simpler ensure_user_profile function to remove phone
CREATE OR REPLACE FUNCTION public.ensure_user_profile(_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  -- Check if profile exists
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = _user_id) THEN
    -- Create profile with default values (removed phone column)
    INSERT INTO public.profiles (
      id, 
      full_name, 
      country, 
      preferred_display_currency, 
      referral_code
    )
    VALUES (
      _user_id,
      'User',  -- Default name, user can update later
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