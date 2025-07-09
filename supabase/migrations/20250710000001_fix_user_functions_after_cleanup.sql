-- Fix database functions after removing unused tables
-- This migration updates functions that were trying to access deleted tables

-- Fix the handle_new_user function to remove notification_preferences insert
-- Updated to allow auto-set functionality by not defaulting to US/USD
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone, country, preferred_display_currency)
  VALUES (
    new.id, 
    new.raw_user_meta_data->>'full_name', 
    new.raw_user_meta_data->>'phone',
    new.raw_user_meta_data->>'country',  -- Only set if explicitly provided
    new.raw_user_meta_data->>'currency'  -- Only set if explicitly provided
  );
  
  INSERT INTO public.user_roles (user_id, role, created_by)
  VALUES (new.id, 'user', new.id);
  
  -- Note: notification_preferences table was removed during cleanup
  -- No longer creating notification preferences for new users
  
  UPDATE public.profiles 
  SET referral_code = 'REF' || substr(md5(random()::text), 1, 8)
  WHERE id = new.id;
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix the ensure_user_profile function to remove notification_preferences insert
-- Updated to allow auto-set functionality by not defaulting to US/USD
CREATE OR REPLACE FUNCTION public.ensure_user_profile(_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if profile exists
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = _user_id) THEN
    -- Create profile with NULL country/currency to allow auto-set logic
    INSERT INTO public.profiles (id, full_name, phone, country, preferred_display_currency, referral_code)
    VALUES (
      _user_id, 
      'User', 
      NULL,
      NULL,  -- Let auto-set logic handle this
      NULL,  -- Let auto-set logic handle this
      'REF' || substr(md5(random()::text), 1, 8)
    );
    
    -- Create user role
    INSERT INTO public.user_roles (user_id, role, created_by)
    VALUES (_user_id, 'user', _user_id);
    
    -- Note: notification_preferences table was removed during cleanup
    -- No longer creating notification preferences for new users
    
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 