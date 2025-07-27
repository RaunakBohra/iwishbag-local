-- Migration: Fix Admin User Permissions for User Management
-- Purpose: Update get_user_permissions_new function to return proper permissions for admins
-- Date: 2025-07-27

BEGIN;

-- Drop existing functions first to avoid return type conflicts
DROP FUNCTION IF EXISTS get_user_permissions_new(UUID);
DROP FUNCTION IF EXISTS get_user_roles_new(UUID);

-- Replace the get_user_permissions_new function to return proper permission objects
-- This fixes the issue where admins couldn't access user management
CREATE OR REPLACE FUNCTION get_user_permissions_new(user_uuid UUID)
RETURNS TABLE(permission_name TEXT, permission_description TEXT) AS $$
BEGIN
    -- For admin users, return all permissions from the permissions table
    IF EXISTS (SELECT 1 FROM user_roles WHERE user_id = user_uuid AND role = 'admin' AND is_active = true) THEN
        RETURN QUERY
        SELECT p.name as permission_name, p.description as permission_description
        FROM permissions p
        ORDER BY p.name;
    -- For moderator users, return specific permissions
    ELSIF EXISTS (SELECT 1 FROM user_roles WHERE user_id = user_uuid AND role = 'moderator' AND is_active = true) THEN
        RETURN QUERY
        SELECT p.name as permission_name, p.description as permission_description
        FROM permissions p
        WHERE p.name IN (
            'quote:create', 'quote:edit', 'quote:view', 'quote:approve', 'quote:reject', 
            'quote:calculate', 'quote:share', 'customer:view', 'customer:edit', 
            'customer:create', 'order:view', 'order:edit', 'support:view', 
            'support:respond', 'support:create', 'messaging:view', 'messaging:send',
            'shipping:view', 'country:view', 'customs:view'
        )
        ORDER BY p.name;
    ELSE
        -- For regular users, return basic permissions
        RETURN QUERY
        SELECT p.name as permission_name, p.description as permission_description
        FROM permissions p
        WHERE p.name IN (
            'quote:create', 'quote:view', 'messaging:view', 'messaging:send', 
            'support:create', 'support:view'
        )
        ORDER BY p.name;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update get_user_roles_new function to return proper role objects
CREATE OR REPLACE FUNCTION get_user_roles_new(user_uuid UUID)
RETURNS TABLE(role_name TEXT, role_description TEXT) AS $$
BEGIN
    -- Return roles mapped from user_roles table to new roles table
    RETURN QUERY
    SELECT 
        CASE 
            WHEN ur.role = 'admin' THEN 'Admin'
            WHEN ur.role = 'moderator' THEN 'Quote Manager'
            WHEN ur.role = 'user' THEN 'User'
            ELSE 'User'
        END as role_name,
        CASE 
            WHEN ur.role = 'admin' THEN 'Full system administrator with all permissions'
            WHEN ur.role = 'moderator' THEN 'Manages quotes and customer interactions'
            WHEN ur.role = 'user' THEN 'Basic user with minimal permissions'
            ELSE 'Basic user with minimal permissions'
        END as role_description
    FROM user_roles ur
    WHERE ur.user_id = user_uuid
    AND ur.is_active = true
    ORDER BY 
        CASE ur.role 
            WHEN 'admin' THEN 1
            WHEN 'moderator' THEN 2
            WHEN 'user' THEN 3
            ELSE 4
        END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_user_permissions_new(UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_user_roles_new(UUID) TO authenticated, anon;

-- Add comments
COMMENT ON FUNCTION get_user_permissions_new(UUID) IS 'Returns all permissions for a user based on their role, including user:view for admins';
COMMENT ON FUNCTION get_user_roles_new(UUID) IS 'Returns role information for a user mapped to the new role system';

COMMIT;

-- Migration Summary:
-- - Fixed get_user_permissions_new to return permission objects instead of single permission level
-- - Ensured admin users get ALL permissions including user:view
-- - Updated get_user_roles_new to return proper role name/description objects
-- - This should resolve the "Access Denied" issue for admin user management