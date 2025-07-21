-- Enhanced OAuth data extraction for Google
-- Extracts phone, addresses, birthday, gender, organization info

-- Enhanced function to extract comprehensive user info from OAuth metadata
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

  -- Extract individual name components
  IF user_metadata ? 'given_name' THEN
    result = result || jsonb_build_object('given_name', user_metadata->>'given_name');
  END IF;
  
  IF user_metadata ? 'family_name' THEN
    result = result || jsonb_build_object('family_name', user_metadata->>'family_name');
  END IF;

  -- Extract avatar URL if available
  IF user_metadata ? 'avatar_url' THEN
    result = result || jsonb_build_object('avatar_url', user_metadata->>'avatar_url');
  ELSIF user_metadata ? 'picture' THEN
    result = result || jsonb_build_object('avatar_url', user_metadata->>'picture');
  END IF;

  -- Extract phone numbers (multiple formats)
  IF user_metadata ? 'phone_number' THEN
    result = result || jsonb_build_object('phone', user_metadata->>'phone_number');
  ELSIF user_metadata ? 'phone' THEN
    result = result || jsonb_build_object('phone', user_metadata->>'phone');
  END IF;

  -- Extract addresses (Google provides addresses array)
  IF user_metadata ? 'addresses' THEN
    result = result || jsonb_build_object('addresses', user_metadata->'addresses');
  END IF;

  -- Extract birthday information
  IF user_metadata ? 'birthday' THEN
    result = result || jsonb_build_object('birthday', user_metadata->>'birthday');
  END IF;

  -- Extract gender
  IF user_metadata ? 'gender' THEN
    result = result || jsonb_build_object('gender', user_metadata->>'gender');
  END IF;

  -- Extract locale/language preference
  IF user_metadata ? 'locale' THEN
    result = result || jsonb_build_object('locale', user_metadata->>'locale');
  END IF;

  -- Extract organization/work information
  IF user_metadata ? 'organizations' THEN
    result = result || jsonb_build_object('organizations', user_metadata->'organizations');
  END IF;

  -- Extract work/company info (if provided as separate fields)
  IF user_metadata ? 'company' THEN
    result = result || jsonb_build_object('company', user_metadata->>'company');
  END IF;

  IF user_metadata ? 'job_title' THEN
    result = result || jsonb_build_object('job_title', user_metadata->>'job_title');
  END IF;

  RETURN result;
END;
$function$;

-- Enhanced function to create profile with comprehensive OAuth data
CREATE OR REPLACE FUNCTION public.ensure_user_profile_with_oauth(_user_id uuid, _user_metadata jsonb DEFAULT NULL)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  oauth_info jsonb;
  full_name_value text;
  avatar_url_value text;
  addresses jsonb;
  primary_address jsonb;
  country_from_address text;
BEGIN
  -- Check if profile exists
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = _user_id) THEN
    
    -- Extract OAuth information if provided
    IF _user_metadata IS NOT NULL THEN
      oauth_info = public.extract_oauth_user_info(_user_metadata);
      full_name_value = COALESCE(oauth_info->>'full_name', 'User');
      avatar_url_value = oauth_info->>'avatar_url';
      
      -- Extract addresses and try to determine country
      addresses = oauth_info->'addresses';
      IF addresses IS NOT NULL AND jsonb_array_length(addresses) > 0 THEN
        -- Get first address as primary
        primary_address = addresses->0;
        -- Try to extract country from address
        country_from_address = COALESCE(
          primary_address->>'country',
          primary_address->>'countryCode'
        );
      END IF;
    ELSE
      full_name_value = 'User';
      avatar_url_value = NULL;
      country_from_address = NULL;
    END IF;

    -- Create profile with OAuth data or defaults
    INSERT INTO public.profiles (
      id, 
      full_name, 
      avatar_url,
      country, 
      preferred_display_currency, 
      referral_code,
      email  -- Add email from auth user
    )
    VALUES (
      _user_id,
      full_name_value,
      avatar_url_value,
      country_from_address,  -- Use country from address if available
      CASE 
        WHEN country_from_address = 'US' THEN 'USD'
        WHEN country_from_address = 'IN' THEN 'INR' 
        WHEN country_from_address = 'NP' THEN 'NPR'
        WHEN country_from_address = 'GB' THEN 'GBP'
        WHEN country_from_address = 'CA' THEN 'CAD'
        ELSE NULL  -- Will be auto-set based on location detection
      END,
      'REF' || substr(md5(random()::text), 1, 8),  -- Generate referral code
      (SELECT email FROM auth.users WHERE id = _user_id)  -- Get email from auth
    );

    -- Store extended OAuth data in a separate table for future use
    INSERT INTO public.user_oauth_data (
      user_id,
      provider,
      oauth_data,
      created_at
    ) VALUES (
      _user_id,
      'google',
      oauth_info,
      NOW()
    ) ON CONFLICT (user_id, provider) DO UPDATE SET
      oauth_data = EXCLUDED.oauth_data,
      updated_at = NOW();

    -- Create default user role
    INSERT INTO public.user_roles (user_id, role, created_by)
    VALUES (_user_id, 'user', _user_id);

    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$function$;

-- Create table to store extended OAuth data
CREATE TABLE IF NOT EXISTS public.user_oauth_data (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  provider text NOT NULL,
  oauth_data jsonb NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  UNIQUE(user_id, provider)
);

-- RLS policies for user_oauth_data
ALTER TABLE public.user_oauth_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own OAuth data" ON public.user_oauth_data
  FOR SELECT USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "System can insert OAuth data" ON public.user_oauth_data
  FOR INSERT WITH CHECK (true);

CREATE POLICY "System can update OAuth data" ON public.user_oauth_data
  FOR UPDATE USING (true);

-- Enhanced phone extraction function with better logic
CREATE OR REPLACE FUNCTION extract_oauth_phone_to_auth_users()
RETURNS TRIGGER AS $$
DECLARE
  extracted_phone text;
  provider text;
BEGIN
  -- Get the OAuth provider
  provider := NEW.raw_app_meta_data->>'provider';
  
  -- Only extract phone from Google OAuth (not Facebook)
  IF provider = 'google' THEN
    extracted_phone := COALESCE(
      NEW.raw_user_meta_data->>'phone_number',        -- Google OAuth primary
      NEW.raw_user_meta_data->>'phone',               -- Google OAuth alternative
      NEW.raw_user_meta_data->'phoneNumbers'->0->>'value'  -- Google People API format
    );

    -- Clean phone number (remove spaces, special chars)
    IF extracted_phone IS NOT NULL THEN
      extracted_phone := regexp_replace(extracted_phone, '[^\d\+]', '', 'g');
    END IF;

    -- Only update if we found a phone number and it's not already set
    IF extracted_phone IS NOT NULL AND extracted_phone != '' AND NEW.phone IS NULL THEN
      -- Update the phone field in the same record
      NEW.phone := extracted_phone;
      
      -- Log the extraction for debugging
      RAISE NOTICE 'Google OAuth phone extracted for user %: %', NEW.id, extracted_phone;
    END IF;
  ELSIF provider = 'facebook' THEN
    -- Log that Facebook user will need to provide phone later
    RAISE NOTICE 'Facebook OAuth user % - phone will be collected later', NEW.id;
  END IF;

  -- Still allow manual signup phone from user_metadata
  IF provider IS NULL AND NEW.phone IS NULL THEN
    extracted_phone := COALESCE(
      NEW.user_metadata->>'phone',                -- Manual signup phone
      NEW.user_metadata->>'phone_number'          -- Alternative format
    );
    
    IF extracted_phone IS NOT NULL AND extracted_phone != '' THEN
      NEW.phone := extracted_phone;
      RAISE NOTICE 'Manual signup phone extracted for user %: %', NEW.id, extracted_phone;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comments for documentation
COMMENT ON TABLE public.user_oauth_data IS 
'Stores extended OAuth provider data including addresses, birthday, gender, organization info';

COMMENT ON FUNCTION public.extract_oauth_user_info(jsonb) IS 
'Extracts comprehensive user information from OAuth providers including phone, addresses, birthday, gender, organization';

COMMENT ON FUNCTION public.ensure_user_profile_with_oauth(uuid, jsonb) IS 
'Creates user profile with comprehensive OAuth data and auto-detects country from address information';