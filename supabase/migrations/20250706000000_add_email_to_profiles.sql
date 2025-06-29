-- Migration: Add Email Column to Profiles Table
-- Date: 2025-07-06
-- Description: Adds email column to profiles table and populates it with existing user emails

-- Add email column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email TEXT;

-- Add constraint to ensure email format (drop first if exists)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_email_check') THEN
        ALTER TABLE profiles ADD CONSTRAINT profiles_email_check 
        CHECK (email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');
    END IF;
END $$;

-- Create index for email lookups
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- Populate email column for existing profiles from auth.users
-- This requires service role access, so we'll do it in a function
CREATE OR REPLACE FUNCTION populate_profiles_email()
RETURNS void AS $$
DECLARE
  user_record RECORD;
BEGIN
  -- Loop through all profiles that don't have an email
  FOR user_record IN 
    SELECT p.id 
    FROM profiles p 
    WHERE p.email IS NULL
  LOOP
    -- Update profile with email from auth.users
    UPDATE profiles 
    SET email = (
      SELECT au.email 
      FROM auth.users au 
      WHERE au.id = user_record.id
    )
    WHERE id = user_record.id;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Execute the population function
SELECT populate_profiles_email();

-- Drop the temporary function
DROP FUNCTION populate_profiles_email();

-- Update the handle_new_user function to include email
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone, country, preferred_display_currency, email)
  VALUES (
    new.id, 
    new.raw_user_meta_data->>'full_name', 
    new.raw_user_meta_data->>'phone',
    COALESCE(new.raw_user_meta_data->>'country', 'US'),
    COALESCE(new.raw_user_meta_data->>'currency', 'USD'),
    new.email
  );
  
  INSERT INTO public.user_roles (user_id, role, created_by)
  VALUES (new.id, 'user', new.id);
  
  INSERT INTO public.notification_preferences (user_id)
  VALUES (new.id);
  
  UPDATE public.profiles 
  SET referral_code = 'REF' || substr(md5(random()::text), 1, 8)
  WHERE id = new.id;
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the ensure_user_profile function to include email
CREATE OR REPLACE FUNCTION public.ensure_user_profile(_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  user_email TEXT;
BEGIN
  -- Check if profile exists
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = _user_id) THEN
    -- Get email from auth.users
    SELECT email INTO user_email FROM auth.users WHERE id = _user_id;
    
    -- Create profile
    INSERT INTO public.profiles (id, full_name, phone, country, preferred_display_currency, referral_code, email)
    VALUES (
      _user_id, 
      'User', 
      NULL,
      'US',
      'USD',
      'REF' || substr(md5(random()::text), 1, 8),
      user_email
    );
    
    -- Create user role
    INSERT INTO public.user_roles (user_id, role, created_by)
    VALUES (_user_id, 'user', _user_id);
    
    -- Create notification preferences
    INSERT INTO public.notification_preferences (user_id)
    VALUES (_user_id);
    
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 