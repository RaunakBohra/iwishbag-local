-- Fix missing admin policy for country_settings table
-- This ensures admins can perform INSERT, UPDATE, and DELETE operations

-- Drop existing policy if it exists (to avoid conflicts)
DROP POLICY IF EXISTS "Admins have full access" ON public.country_settings;

-- Create the admin policy for country_settings
CREATE POLICY "Admins have full access" ON public.country_settings
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Verify the policy was created
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'country_settings';
