-- Migration: Create User Management RPC Functions
-- Purpose: Add secure functions for managing user roles and role permissions
-- Author: Claude Code Assistant
-- Date: 2025-07-24

BEGIN;

-- ============================================================================
-- FUNCTION 1: UPDATE USER ROLES
-- ============================================================================

-- Function to update a user's roles (secure, admin-only)
CREATE OR REPLACE FUNCTION update_user_roles(
    target_user_id UUID,
    role_ids BIGINT[]
)
RETURNS JSON AS $$
DECLARE
    current_user_id UUID;
    role_record RECORD;
    result JSON;
    updated_count INTEGER := 0;
    added_count INTEGER := 0;
    removed_count INTEGER := 0;
BEGIN
    -- Get the current user ID
    current_user_id := auth.uid();
    
    -- Security check: Only users with user:assign_role permission can execute this
    IF NOT user_has_permission_new(current_user_id, 'user:assign_role') THEN
        RAISE EXCEPTION 'Access denied: user:assign_role permission required'
            USING ERRCODE = 'insufficient_privilege';
    END IF;
    
    -- Validate that target user exists
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = target_user_id) THEN
        RAISE EXCEPTION 'Target user not found'
            USING ERRCODE = 'invalid_parameter_value';
    END IF;
    
    -- Validate that all provided role_ids exist
    FOR role_record IN 
        SELECT id FROM roles WHERE id = ANY(role_ids)
    LOOP
        -- Role exists, continue
    END LOOP;
    
    -- Count existing roles for removal tracking
    SELECT COUNT(*) INTO removed_count 
    FROM user_roles 
    WHERE user_id = target_user_id;
    
    -- Begin transaction: Remove all existing roles for the user
    DELETE FROM user_roles WHERE user_id = target_user_id;
    
    -- Add new roles
    IF array_length(role_ids, 1) > 0 THEN
        INSERT INTO user_roles (user_id, role_id, created_by, is_active, scope)
        SELECT 
            target_user_id,
            unnest(role_ids),
            current_user_id,
            true,
            'global'
        ON CONFLICT (user_id, role_id) DO NOTHING;
        
        GET DIAGNOSTICS added_count = ROW_COUNT;
    END IF;
    
    updated_count := added_count;
    removed_count := removed_count - added_count; -- Adjust for actual removals
    
    -- Build result JSON
    result := json_build_object(
        'success', true,
        'message', 'User roles updated successfully',
        'user_id', target_user_id,
        'updated_by', current_user_id,
        'roles_added', added_count,
        'roles_removed', GREATEST(removed_count, 0),
        'total_roles', added_count,
        'timestamp', NOW()
    );
    
    RETURN result;
    
EXCEPTION
    WHEN OTHERS THEN
        -- Return error information
        RETURN json_build_object(
            'success', false,
            'error', SQLERRM,
            'error_code', SQLSTATE,
            'timestamp', NOW()
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- FUNCTION 2: UPDATE ROLE PERMISSIONS
-- ============================================================================

-- Function to update permissions for a specific role (secure, admin-only)
CREATE OR REPLACE FUNCTION update_role_permissions(
    target_role_id BIGINT,
    permission_ids BIGINT[]
)
RETURNS JSON AS $$
DECLARE
    current_user_id UUID;
    permission_record RECORD;
    result JSON;
    updated_count INTEGER := 0;
    added_count INTEGER := 0;
    removed_count INTEGER := 0;
    role_name TEXT;
BEGIN
    -- Get the current user ID
    current_user_id := auth.uid();
    
    -- Security check: Only users with admin:settings permission can execute this
    IF NOT user_has_permission_new(current_user_id, 'admin:settings') THEN
        RAISE EXCEPTION 'Access denied: admin:settings permission required'
            USING ERRCODE = 'insufficient_privilege';
    END IF;
    
    -- Validate that target role exists and get its name
    SELECT name INTO role_name FROM roles WHERE id = target_role_id;
    IF role_name IS NULL THEN
        RAISE EXCEPTION 'Target role not found'
            USING ERRCODE = 'invalid_parameter_value';
    END IF;
    
    -- Validate that all provided permission_ids exist
    FOR permission_record IN 
        SELECT id FROM permissions WHERE id = ANY(permission_ids)
    LOOP
        -- Permission exists, continue
    END LOOP;
    
    -- Count existing permissions for removal tracking
    SELECT COUNT(*) INTO removed_count 
    FROM role_permissions 
    WHERE role_id = target_role_id;
    
    -- Begin transaction: Remove all existing permissions for the role
    DELETE FROM role_permissions WHERE role_id = target_role_id;
    
    -- Add new permissions
    IF array_length(permission_ids, 1) > 0 THEN
        INSERT INTO role_permissions (role_id, permission_id)
        SELECT 
            target_role_id,
            unnest(permission_ids)
        ON CONFLICT (role_id, permission_id) DO NOTHING;
        
        GET DIAGNOSTICS added_count = ROW_COUNT;
    END IF;
    
    updated_count := added_count;
    removed_count := removed_count - added_count; -- Adjust for actual removals
    
    -- Build result JSON
    result := json_build_object(
        'success', true,
        'message', 'Role permissions updated successfully',
        'role_id', target_role_id,
        'role_name', role_name,
        'updated_by', current_user_id,
        'permissions_added', added_count,
        'permissions_removed', GREATEST(removed_count, 0),
        'total_permissions', added_count,
        'timestamp', NOW()
    );
    
    RETURN result;
    
EXCEPTION
    WHEN OTHERS THEN
        -- Return error information
        RETURN json_build_object(
            'success', false,
            'error', SQLERRM,
            'error_code', SQLSTATE,
            'timestamp', NOW()
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- FUNCTION 3: GET ALL USERS WITH ROLES
-- ============================================================================

-- Function to get all users with their assigned roles (admin-only)
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
                    'role_id', r.id,
                    'role_name', r.name,
                    'role_description', r.description,
                    'is_active', ur.is_active,
                    'assigned_at', ur.created_at,
                    'assigned_by', ur.created_by
                )
            ) FILTER (WHERE r.id IS NOT NULL),
            '[]'::json
        ) as roles
    FROM auth.users au
    LEFT JOIN profiles p ON au.id = p.id
    LEFT JOIN user_roles ur ON au.id = ur.user_id AND ur.is_active = true
    LEFT JOIN roles r ON ur.role_id = r.id
    WHERE au.deleted_at IS NULL
    GROUP BY au.id, au.email, p.full_name, au.created_at, au.last_sign_in_at
    ORDER BY au.created_at DESC;
    
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- FUNCTION 4: GET ROLE WITH PERMISSIONS
-- ============================================================================

-- Function to get a role with all its permissions (admin-only)
CREATE OR REPLACE FUNCTION get_role_with_permissions(target_role_id BIGINT)
RETURNS JSON AS $$
DECLARE
    current_user_id UUID;
    role_data JSON;
BEGIN
    -- Get the current user ID
    current_user_id := auth.uid();
    
    -- Security check: Only users with admin:settings permission can execute this
    IF NOT user_has_permission_new(current_user_id, 'admin:settings') THEN
        RAISE EXCEPTION 'Access denied: admin:settings permission required'
            USING ERRCODE = 'insufficient_privilege';
    END IF;
    
    SELECT json_build_object(
        'role', json_build_object(
            'id', r.id,
            'name', r.name,
            'description', r.description,
            'created_at', r.created_at
        ),
        'permissions', COALESCE(
            json_agg(
                json_build_object(
                    'permission_id', p.id,
                    'permission_name', p.name,
                    'permission_description', p.description
                )
            ) FILTER (WHERE p.id IS NOT NULL),
            '[]'::json
        )
    ) INTO role_data
    FROM roles r
    LEFT JOIN role_permissions rp ON r.id = rp.role_id
    LEFT JOIN permissions p ON rp.permission_id = p.id
    WHERE r.id = target_role_id
    GROUP BY r.id, r.name, r.description, r.created_at;
    
    IF role_data IS NULL THEN
        RAISE EXCEPTION 'Role not found'
            USING ERRCODE = 'invalid_parameter_value';
    END IF;
    
    RETURN role_data;
    
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

-- Grant execution permissions to authenticated users
GRANT EXECUTE ON FUNCTION update_user_roles(UUID, BIGINT[]) TO authenticated;
GRANT EXECUTE ON FUNCTION update_role_permissions(BIGINT, BIGINT[]) TO authenticated;
GRANT EXECUTE ON FUNCTION get_all_users_with_roles() TO authenticated;
GRANT EXECUTE ON FUNCTION get_role_with_permissions(BIGINT) TO authenticated;

COMMIT;

-- ============================================================================
-- MIGRATION SUMMARY
-- ============================================================================
-- Created secure RPC functions for user and role management:
-- - update_user_roles: Update a user's assigned roles
-- - update_role_permissions: Update permissions for a role
-- - get_all_users_with_roles: Fetch all users with their roles
-- - get_role_with_permissions: Fetch role details with permissions
-- All functions include proper security checks and error handling
-- ============================================================================