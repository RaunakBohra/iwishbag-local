-- Sync auth.users to profiles table
-- This ensures all authenticated users have a profile entry with email

-- First, insert any missing profiles from auth.users
-- Updated to allow auto-set functionality by not defaulting to US/USD
INSERT INTO public.profiles (id, email, full_name, country, preferred_display_currency, created_at, updated_at)
SELECT 
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'full_name', split_part(au.email, '@', 1)) as full_name,
  au.raw_user_meta_data->>'country',  -- Only set if explicitly provided
  au.raw_user_meta_data->>'currency', -- Only set if explicitly provided
  au.created_at,
  au.updated_at
FROM auth.users au
LEFT JOIN public.profiles p ON p.id = au.id
WHERE p.id IS NULL
  AND au.email IS NOT NULL;

-- Update existing profiles that don't have email set
UPDATE public.profiles p
SET email = au.email
FROM auth.users au
WHERE p.id = au.id
  AND p.email IS NULL
  AND au.email IS NOT NULL;

-- Create a trigger to automatically sync new auth users to profiles
-- Updated to allow auto-set functionality by not defaulting to US/USD
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Insert new profile when user is created
  INSERT INTO public.profiles (id, email, full_name, country, preferred_display_currency, created_at, updated_at)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'country',  -- Only set if explicitly provided
    new.raw_user_meta_data->>'currency', -- Only set if explicitly provided
    new.created_at,
    new.updated_at
  )
  ON CONFLICT (id) DO UPDATE
  SET 
    email = EXCLUDED.email,
    updated_at = EXCLUDED.updated_at
  WHERE profiles.email IS NULL;
  
  -- Add user role
  INSERT INTO public.user_roles (user_id, role, created_by)
  VALUES (new.id, 'user', new.id)
  ON CONFLICT (user_id, role) DO NOTHING;
  
  -- Set referral code
  UPDATE public.profiles 
  SET referral_code = 'REF' || substr(md5(random()::text), 1, 8)
  WHERE id = new.id AND referral_code IS NULL;
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger for new users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create a function to get all user emails (for debugging)
CREATE OR REPLACE FUNCTION public.get_all_user_emails()
RETURNS TABLE (
  user_id uuid,
  email text,
  full_name text,
  source text
) 
LANGUAGE sql
SECURITY DEFINER
AS $$
  -- Get all emails from auth.users
  SELECT 
    id as user_id,
    email,
    COALESCE(raw_user_meta_data->>'full_name', split_part(email, '@', 1)) as full_name,
    'auth.users' as source
  FROM auth.users
  WHERE email IS NOT NULL
  
  UNION
  
  -- Get all emails from profiles
  SELECT 
    id as user_id,
    email,
    full_name,
    'profiles' as source
  FROM public.profiles
  WHERE email IS NOT NULL
  
  ORDER BY email;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_all_user_emails TO authenticated;