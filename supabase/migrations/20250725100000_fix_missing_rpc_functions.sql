-- =============================================
-- FIX MISSING RPC FUNCTIONS
-- This migration ensures the RPC functions exist with correct signatures
-- Created: 2025-07-25
-- =============================================

-- Create get_user_permissions_new function
CREATE OR REPLACE FUNCTION get_user_permissions_new(user_uuid UUID)
RETURNS TABLE (
  permission_name TEXT,
  permission_description TEXT
) 
LANGUAGE plpgsql 
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    CASE 
      WHEN EXISTS (
        SELECT 1 FROM user_roles 
        WHERE user_id = user_uuid 
        AND role = 'admin' 
        AND is_active = true
      ) THEN 'admin'
      WHEN EXISTS (
        SELECT 1 FROM user_roles 
        WHERE user_id = user_uuid 
        AND role = 'moderator' 
        AND is_active = true
      ) THEN 'moderator'
      ELSE 'user'
    END as permission_name,
    CASE 
      WHEN EXISTS (
        SELECT 1 FROM user_roles 
        WHERE user_id = user_uuid 
        AND role = 'admin' 
        AND is_active = true
      ) THEN 'Full system access'
      WHEN EXISTS (
        SELECT 1 FROM user_roles 
        WHERE user_id = user_uuid 
        AND role = 'moderator' 
        AND is_active = true
      ) THEN 'Moderate content and users'
      ELSE 'Basic user access'
    END as permission_description;
END;
$$;

-- Create get_user_roles_new function
CREATE OR REPLACE FUNCTION get_user_roles_new(user_uuid UUID)
RETURNS TABLE (
  role_name TEXT,
  role_description TEXT
) 
LANGUAGE plpgsql 
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ur.role::TEXT as role_name,
    CASE ur.role
      WHEN 'admin' THEN 'Administrator with full system access'
      WHEN 'moderator' THEN 'Moderator with content management access'
      ELSE 'Standard user with basic access'
    END as role_description
  FROM user_roles ur
  WHERE ur.user_id = user_uuid 
    AND ur.is_active = true
  ORDER BY ur.created_at DESC;
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION get_user_permissions_new(UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_user_roles_new(UUID) TO authenticated, anon;

-- Add comments for documentation
COMMENT ON FUNCTION get_user_permissions_new(UUID) IS 'Returns permissions for a user';
COMMENT ON FUNCTION get_user_roles_new(UUID) IS 'Returns all roles assigned to a user';

-- Verify the functions were created
DO $$
BEGIN
  RAISE NOTICE 'RPC functions created successfully';
  RAISE NOTICE 'Functions: get_user_permissions_new(user_uuid), get_user_roles_new(user_uuid)';
END $$;