-- ============================================================================
-- REMOVE ROLE SYSTEM WITH CASCADE - HANDLE ALL DEPENDENCIES
-- ============================================================================
-- This migration removes role system and updates all dependent policies
-- to use authentication-only access control

-- First, let's create a temporary is_admin function that returns true for all authenticated users
-- This will be used to replace admin-only policies with authenticated-user policies
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT auth.uid() IS NOT NULL;
$$;

-- Update all RLS policies that used is_admin() to check for authentication instead
-- This effectively gives all authenticated users admin access

-- Now drop all role-related functions with CASCADE to remove dependencies
DROP FUNCTION IF EXISTS has_role(UUID, TEXT) CASCADE;
DROP FUNCTION IF EXISTS has_role(TEXT) CASCADE;
DROP FUNCTION IF EXISTS has_any_role(UUID, TEXT[]) CASCADE;
DROP FUNCTION IF EXISTS check_user_admin(UUID) CASCADE;
DROP FUNCTION IF EXISTS get_user_permissions_new(UUID) CASCADE;
DROP FUNCTION IF EXISTS get_user_roles_new(UUID) CASCADE;
DROP FUNCTION IF EXISTS maintain_role_hierarchy() CASCADE;
DROP FUNCTION IF EXISTS prevent_lower_role_insert() CASCADE;
DROP FUNCTION IF EXISTS cleanup_lower_roles() CASCADE;
DROP FUNCTION IF EXISTS create_user_role_on_signup() CASCADE;

-- Drop user_roles table with CASCADE
DROP TABLE IF EXISTS user_roles CASCADE;

-- Keep the simplified is_admin function (which now just checks authentication)
-- This maintains compatibility with existing policies
COMMENT ON FUNCTION is_admin() IS 'Simplified admin check - returns true for all authenticated users';

-- Create the is_authenticated function as well
CREATE OR REPLACE FUNCTION is_authenticated()
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT auth.uid() IS NOT NULL;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION is_admin() TO service_role;
GRANT EXECUTE ON FUNCTION is_authenticated() TO authenticated;
GRANT EXECUTE ON FUNCTION is_authenticated() TO service_role;

-- Log the changes
DO $$
BEGIN
    RAISE NOTICE '============================================================';
    RAISE NOTICE 'ROLE SYSTEM REMOVAL COMPLETED WITH CASCADE';
    RAISE NOTICE '============================================================';
    RAISE NOTICE 'Changes made:';
    RAISE NOTICE '- Dropped user_roles table and all dependencies';
    RAISE NOTICE '- Removed all role-related functions';
    RAISE NOTICE '- Updated is_admin() to return true for all authenticated users';
    RAISE NOTICE '- All authenticated users now have full system access';
    RAISE NOTICE '- Access control simplified to: authenticated vs anonymous';
    RAISE NOTICE '============================================================';
END $$;