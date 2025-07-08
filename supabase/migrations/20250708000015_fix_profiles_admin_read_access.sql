-- Fix admin access to read all profiles
-- This allows admins to see all user emails when creating quotes

-- Drop the existing admin policy if it exists
DROP POLICY IF EXISTS "Admins have full access" ON public.profiles;

-- Create separate policies for better control
-- 1. Admin can read all profiles
CREATE POLICY "Admins can read all profiles" ON public.profiles
  FOR SELECT
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR auth.uid() = id -- Users can also read their own profile
  );

-- 2. Admin can insert/update/delete all profiles
CREATE POLICY "Admins can modify all profiles" ON public.profiles
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- 3. Users can update their own profile (keep existing policy)
-- The "Users can manage own profile" policy already exists and handles user's own profile updates