-- =============================================
-- Missing RPC Functions Migration
-- =============================================
-- This migration creates the missing RPC functions that were causing 404 errors
-- after database resets. These functions are essential for the admin system.
-- Created: 2025-07-24
-- =============================================

-- Create get_user_permissions_new function
-- This function returns user permissions for the admin interface
CREATE OR REPLACE FUNCTION get_user_permissions_new(user_uuid UUID)
RETURNS TABLE (
  permission TEXT
) 
LANGUAGE sql 
SECURITY DEFINER
AS $$
  SELECT 
    CASE 
      WHEN EXISTS (
        SELECT 1 FROM user_roles 
        WHERE user_id = user_uuid AND role = 'admin'
      ) THEN 'admin'
      WHEN EXISTS (
        SELECT 1 FROM user_roles 
        WHERE user_id = user_uuid AND role = 'moderator'
      ) THEN 'moderator'
      ELSE 'user'
    END as permission;
$$;

-- Create get_user_roles_new function  
-- This function returns all roles for a specific user
CREATE OR REPLACE FUNCTION get_user_roles_new(user_uuid UUID)
RETURNS TABLE (
  role TEXT,
  granted_at TIMESTAMPTZ,
  granted_by UUID
) 
LANGUAGE sql 
SECURITY DEFINER
AS $$
  SELECT 
    ur.role,
    ur.created_at as granted_at,
    ur.granted_by
  FROM user_roles ur
  WHERE ur.user_id = user_uuid
  ORDER BY ur.created_at DESC;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION get_user_permissions_new(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_roles_new(UUID) TO authenticated;

-- Add comments for documentation
COMMENT ON FUNCTION get_user_permissions_new(UUID) IS 'Returns the highest permission level for a user (admin, moderator, or user)';
COMMENT ON FUNCTION get_user_roles_new(UUID) IS 'Returns all roles assigned to a user with timestamps and granting information';

-- Ensure user_roles table exists with proper structure
-- (This is defensive programming in case the table doesn't exist)
CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'moderator', 'user')),
  granted_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, role)
);

-- Create index on user_roles for performance
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role);

-- Enable RLS on user_roles table
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for user_roles
DROP POLICY IF EXISTS "Users can view own roles" ON user_roles;
CREATE POLICY "Users can view own roles" ON user_roles
  FOR SELECT USING (user_id = auth.uid() OR is_admin());

DROP POLICY IF EXISTS "Admins can manage all roles" ON user_roles;  
CREATE POLICY "Admins can manage all roles" ON user_roles
  FOR ALL USING (is_admin());

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_user_roles_updated_at ON user_roles;
CREATE TRIGGER update_user_roles_updated_at
  BEFORE UPDATE ON user_roles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();