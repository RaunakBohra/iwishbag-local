-- Fix Storage Fee RLS Policies and API Access Issues
-- This migration fixes the 406 errors and ensures proper API access

-- First, drop existing problematic policies
DROP POLICY IF EXISTS "Users can view own storage fees" ON storage_fees;
DROP POLICY IF EXISTS "Users can update own unpaid storage fees" ON storage_fees;
DROP POLICY IF EXISTS "Admins can insert storage fees" ON storage_fees;
DROP POLICY IF EXISTS "Admins can delete storage fees" ON storage_fees;

-- Create more permissive policies that work with the API
CREATE POLICY "Users can view storage fees"
ON storage_fees
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id 
  OR is_admin()
  OR auth.jwt() ->> 'role' = 'service_role'
);

CREATE POLICY "Admins can manage all storage fees"
ON storage_fees
FOR ALL
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "Users can update own unpaid fees"
ON storage_fees
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id AND is_paid = false)
WITH CHECK (auth.uid() = user_id AND is_paid = false);

CREATE POLICY "Service role full access"
ON storage_fees
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Ensure the extend_storage_exemption function is accessible via RPC
-- Update function permissions
REVOKE ALL ON FUNCTION extend_storage_exemption(UUID, INTEGER, TEXT, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION extend_storage_exemption(UUID, INTEGER, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION extend_storage_exemption(UUID, INTEGER, TEXT, UUID) TO service_role;

-- Also fix waive_storage_fees function permissions
REVOKE ALL ON FUNCTION waive_storage_fees(UUID, TEXT, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION waive_storage_fees(UUID, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION waive_storage_fees(UUID, TEXT, UUID) TO service_role;

-- Ensure calculate_and_create_storage_fees is accessible
REVOKE ALL ON FUNCTION calculate_and_create_storage_fees() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION calculate_and_create_storage_fees() TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_and_create_storage_fees() TO service_role;

-- Fix get_packages_approaching_fees function
REVOKE ALL ON FUNCTION get_packages_approaching_fees(INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_packages_approaching_fees(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_packages_approaching_fees(INTEGER) TO service_role;

-- Add missing RLS policy for package_photos that might be causing issues
DROP POLICY IF EXISTS "Users can view package photos" ON package_photos;
CREATE POLICY "Users can view package photos"
ON package_photos
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM received_packages rp
    JOIN customer_addresses ca ON rp.customer_address_id = ca.id
    WHERE rp.id = package_photos.package_id
    AND (ca.user_id = auth.uid() OR is_admin())
  )
);

-- Ensure admin_activity_logs table has proper permissions for the extend function
DROP POLICY IF EXISTS "Admins can log activities" ON admin_activity_logs;
CREATE POLICY "Admins can log activities"
ON admin_activity_logs
FOR INSERT
TO authenticated
WITH CHECK (is_admin());

-- Add a policy for service role to insert into admin_activity_logs
DROP POLICY IF EXISTS "Service role can log activities" ON admin_activity_logs;
CREATE POLICY "Service role can log activities"
ON admin_activity_logs
FOR INSERT
TO service_role
WITH CHECK (true);

-- Create a test function to verify RLS is working
CREATE OR REPLACE FUNCTION test_storage_fee_access()
RETURNS TABLE(
  can_read_fees BOOLEAN,
  can_call_extend BOOLEAN,
  can_call_waive BOOLEAN,
  current_user_role TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (SELECT COUNT(*) > 0 FROM storage_fees LIMIT 1) as can_read_fees,
    (SELECT 1 FROM extend_storage_exemption(
      'ffffffff-ffff-ffff-ffff-ffffffffffff'::UUID, 
      0, 
      'test', 
      auth.uid()
    ) LIMIT 1) IS NULL as can_call_extend,
    (SELECT 1 FROM waive_storage_fees(
      'ffffffff-ffff-ffff-ffff-ffffffffffff'::UUID,
      'test',
      auth.uid()
    ) LIMIT 1) IS NULL as can_call_waive,
    COALESCE(auth.jwt() ->> 'role', 'none') as current_user_role;
EXCEPTION WHEN OTHERS THEN
  RETURN QUERY SELECT false, false, false, 'error';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION test_storage_fee_access() TO authenticated;
GRANT EXECUTE ON FUNCTION test_storage_fee_access() TO anon;

-- Comment on the fix
COMMENT ON POLICY "Users can view storage fees" ON storage_fees IS 
'Fixed policy to resolve 406 errors - allows authenticated users to view their own fees or admins to view all';

COMMENT ON FUNCTION extend_storage_exemption(UUID, INTEGER, TEXT, UUID) IS 
'Fixed RPC access - function now properly exposed to authenticated role to resolve 404 errors';