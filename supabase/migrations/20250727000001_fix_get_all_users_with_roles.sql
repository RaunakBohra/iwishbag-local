-- Migration: Fix get_all_users_with_roles Function for Existing Schema
-- Purpose: Update the function to work with current user_roles table structure (using role enum)
-- Date: 2025-07-27
-- IMPORTANT: This does NOT reset the database, only fixes the function

BEGIN;

-- Drop and recreate the function to work with existing user_roles structure
DROP FUNCTION IF EXISTS get_all_users_with_roles();

-- Function to get all users with their assigned roles (admin-only)
-- Modified to work with existing user_roles table that uses role enum
CREATE OR REPLACE FUNCTION get_all_users_with_roles()
RETURNS TABLE(
    user_id UUID,
    email TEXT,
    full_name TEXT,
    created_at TIMESTAMPTZ,
    last_sign_in_at TIMESTAMPTZ,
    roles JSON
) AS $$
DECLARE
    current_user_id UUID;
BEGIN
    -- Get the current user ID
    current_user_id := auth.uid();
    
    -- Security check: Only users with user:view permission can execute this
    IF NOT user_has_permission_new(current_user_id, 'user:view') THEN
        RAISE EXCEPTION 'Access denied: user:view permission required'
            USING ERRCODE = 'insufficient_privilege';
    END IF;
    
    RETURN QUERY
    SELECT 
        au.id as user_id,
        au.email::TEXT,
        COALESCE(p.full_name, 'Unknown') as full_name,
        au.created_at,
        au.last_sign_in_at,
        COALESCE(
            json_agg(
                json_build_object(
                    'role_id', CASE 
                        WHEN ur.role = 'admin' THEN 1
                        WHEN ur.role = 'moderator' THEN 2  
                        WHEN ur.role = 'user' THEN 3
                        ELSE 4
                    END,
                    'role_name', CASE 
                        WHEN ur.role = 'admin' THEN 'Admin'
                        WHEN ur.role = 'moderator' THEN 'Quote Manager'
                        WHEN ur.role = 'user' THEN 'User'
                        ELSE 'Unknown'
                    END,
                    'role_description', CASE 
                        WHEN ur.role = 'admin' THEN 'Full system administrator with all permissions'
                        WHEN ur.role = 'moderator' THEN 'Manages quotes and customer interactions'
                        WHEN ur.role = 'user' THEN 'Basic user with minimal permissions'
                        ELSE 'Unknown role'
                    END,
                    'is_active', ur.is_active,
                    'assigned_at', ur.created_at
                )
            ) FILTER (WHERE ur.role IS NOT NULL),
            '[]'::json
        ) as roles
    FROM auth.users au
    LEFT JOIN profiles p ON au.id = p.id
    LEFT JOIN user_roles ur ON au.id = ur.user_id AND ur.is_active = true
    WHERE au.deleted_at IS NULL
    GROUP BY au.id, au.email, p.full_name, au.created_at, au.last_sign_in_at
    ORDER BY au.created_at DESC;
    
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execution permissions
GRANT EXECUTE ON FUNCTION get_all_users_with_roles() TO authenticated;

-- Add comment
COMMENT ON FUNCTION get_all_users_with_roles() IS 'Returns all users with their roles, compatible with existing user_roles enum structure';

COMMIT;

-- Migration Summary:
-- - Fixed get_all_users_with_roles function to work with existing user_roles table
-- - Maps enum roles (admin, moderator, user) to proper role names and descriptions
-- - No database structure changes, only function compatibility fix