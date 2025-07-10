-- Fix handle_new_user function to properly extract user data from signup
-- The signup form passes 'name' and 'phone' in user metadata

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Extract user data from signup metadata
  -- Support both 'name' and 'full_name' fields for compatibility
  INSERT INTO public.profiles (
    id, 
    full_name, 
    phone, 
    email,
    country, 
    preferred_display_currency
  )
  VALUES (
    new.id, 
    COALESCE(
      new.raw_user_meta_data->>'name',
      new.raw_user_meta_data->>'full_name',
      'User'
    ),
    new.raw_user_meta_data->>'phone',
    new.email,
    new.raw_user_meta_data->>'country',  -- Only set if explicitly provided
    new.raw_user_meta_data->>'currency'  -- Only set if explicitly provided
  );
  
  -- Assign default user role
  INSERT INTO public.user_roles (user_id, role, created_by)
  VALUES (new.id, 'user', new.id);
  
  -- Generate referral code
  UPDATE public.profiles 
  SET referral_code = 'REF' || substr(md5(random()::text), 1, 8)
  WHERE id = new.id;
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure the trigger exists and points to the correct function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO supabase_auth_admin;