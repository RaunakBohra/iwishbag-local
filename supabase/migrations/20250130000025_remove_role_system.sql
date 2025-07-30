-- ============================================================================
-- REMOVE ROLE-BASED ACCESS CONTROL SYSTEM COMPLETELY
-- ============================================================================
-- This migration removes all role-related tables, functions, and policies
-- Simplifying to authentication-only access control (logged in vs anonymous)

-- Drop role-related functions
DROP FUNCTION IF EXISTS has_role(UUID, TEXT);
DROP FUNCTION IF EXISTS has_role(TEXT);
DROP FUNCTION IF EXISTS has_any_role(UUID, TEXT[]);
DROP FUNCTION IF EXISTS is_admin();
DROP FUNCTION IF EXISTS is_admin_safe();
DROP FUNCTION IF EXISTS check_user_admin(UUID);
DROP FUNCTION IF EXISTS get_user_permissions_new(UUID);
DROP FUNCTION IF EXISTS get_user_roles_new(UUID);
DROP FUNCTION IF EXISTS maintain_role_hierarchy();
DROP FUNCTION IF EXISTS prevent_lower_role_insert();
DROP FUNCTION IF EXISTS cleanup_lower_roles();
DROP FUNCTION IF EXISTS create_user_role_on_signup();

-- Drop user_roles table and all its dependencies
DROP TABLE IF EXISTS user_roles CASCADE;

-- Create a simple function to check if user is authenticated
CREATE OR REPLACE FUNCTION is_authenticated()
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT auth.uid() IS NOT NULL;
$$;

-- Grant execute permissions on the new function
GRANT EXECUTE ON FUNCTION is_authenticated() TO authenticated;
GRANT EXECUTE ON FUNCTION is_authenticated() TO service_role;

-- Update RLS policies to use authentication-only instead of roles
-- We'll update individual table policies in a follow-up migration if needed

-- Log the removal
DO $$
BEGIN
    RAISE NOTICE 'Role-based access control system completely removed:';
    RAISE NOTICE '- user_roles table dropped';
    RAISE NOTICE '- All role-related functions removed';
    RAISE NOTICE '- Simplified to authentication-only access control';
    RAISE NOTICE '- Added is_authenticated() function for RLS policies';
    RAISE NOTICE 'System now uses simple authentication: authenticated vs anonymous';
END $$;