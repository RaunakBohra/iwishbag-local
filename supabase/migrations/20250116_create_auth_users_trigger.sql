-- Migration: Create auth.users trigger for handle_new_user function
-- This ensures user profiles and roles are created automatically when users sign up

-- Create trigger on auth.users table
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created 
AFTER INSERT ON auth.users 
FOR EACH ROW 
EXECUTE FUNCTION public.handle_new_user();

-- Fix any existing users who don't have roles
INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'user'
FROM auth.users u
LEFT JOIN public.user_roles r ON u.id = r.user_id
WHERE r.user_id IS NULL;

-- Ensure admin user has admin role
UPDATE public.user_roles 
SET role = 'admin' 
WHERE user_id IN (
    SELECT id FROM auth.users 
    WHERE email = 'iwbtracking@gmail.com'
);