-- Create trigger to automatically assign user role on signup

-- First, create or replace the function that handles new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Create profile
  INSERT INTO public.profiles (
    id,
    full_name,
    email,
    referral_code
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    NEW.email,
    'REF' || substr(md5(random()::text), 1, 8)
  )
  ON CONFLICT (id) DO NOTHING;

  -- Assign default user role
  INSERT INTO public.user_roles (
    user_id,
    role,
    is_active,
    created_by,
    granted_by
  )
  VALUES (
    NEW.id,
    'user',
    true,
    NEW.id,
    NEW.id
  )
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger on auth.users table
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO postgres;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO anon;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;

-- Test: Show current role distribution
SELECT 
    ur.role,
    COUNT(DISTINCT ur.user_id) as unique_users,
    COUNT(*) as total_assignments
FROM public.user_roles ur
WHERE ur.is_active = true
GROUP BY ur.role
ORDER BY ur.role;