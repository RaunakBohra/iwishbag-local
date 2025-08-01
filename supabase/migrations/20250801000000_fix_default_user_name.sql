-- Fix default user name for phone signups
-- Best practice: Don't set a default name, let users enter their own name

-- Update the ensure_user_profile_with_oauth function to not set 'User' as default
CREATE OR REPLACE FUNCTION public.ensure_user_profile_with_oauth(_user_id uuid, _user_metadata jsonb DEFAULT NULL::jsonb) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
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
      -- Don't use 'User' as default - let it be NULL if not provided
      full_name_value = NULLIF(oauth_info->>'full_name', 'User');
      phone_value = oauth_info->>'phone';
      avatar_url_value = oauth_info->>'avatar_url';
    ELSE
      full_name_value = NULL; -- Changed from 'User' to NULL
      phone_value = NULL;
      avatar_url_value = NULL;
    END IF;

    -- Create profile with OAuth data or NULL (not 'User')
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
      full_name_value, -- Will be NULL for phone signups
      phone_value,
      avatar_url_value,
      NULL,
      NULL,
      'REF' || substr(md5(random()::text), 1, 8)
    );

    -- Create default user role (using text)
    INSERT INTO public.user_roles (user_id, role, created_by, is_active)
    VALUES (_user_id, 'user'::text, _user_id, true)
    ON CONFLICT (user_id, role) DO NOTHING;

    RETURN true;
  ELSE
    RETURN false;
  END IF;
END;
$$;

-- Update existing profiles that have 'User' as full name to NULL
-- This allows phone-only users to set their real name
UPDATE public.profiles 
SET full_name = NULL 
WHERE full_name = 'User' 
  AND id IN (
    SELECT id 
    FROM auth.users 
    WHERE email LIKE '%@phone.iwishbag.com'
  );

-- Add comment explaining the change
COMMENT ON FUNCTION public.ensure_user_profile_with_oauth(_user_id uuid, _user_metadata jsonb) IS 
'Creates user profile if it does not exist. Does not set default name for phone signups - users should enter their own name.';