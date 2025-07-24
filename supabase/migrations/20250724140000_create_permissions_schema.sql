-- Migration: Create New Permissions System Schema
-- Purpose: Replace simple enum-based roles with flexible permissions system
-- Author: Claude Code Assistant
-- Date: 2025-07-24

BEGIN;

-- ============================================================================
-- PHASE 1: CREATE NEW TABLES
-- ============================================================================

-- Create permissions table to store all granular permissions
CREATE TABLE IF NOT EXISTS permissions (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create roles table to define user roles
CREATE TABLE IF NOT EXISTS roles (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create role_permissions linking table (many-to-many relationship)
CREATE TABLE IF NOT EXISTS role_permissions (
    role_id BIGINT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id BIGINT NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

-- ============================================================================
-- PHASE 2: BACKUP EXISTING USER_ROLES DATA
-- ============================================================================

-- Create temporary backup table for existing user roles
CREATE TABLE IF NOT EXISTS user_roles_backup AS 
SELECT 
    id,
    user_id,
    role::text as role_name,
    created_at,
    created_by,
    is_active,
    scope
FROM user_roles;

-- ============================================================================
-- PHASE 3: MODIFY EXISTING USER_ROLES TABLE
-- ============================================================================

-- Drop existing constraints and indexes that reference the role column
DROP POLICY IF EXISTS "Admins can manage all roles" ON user_roles;
DROP POLICY IF EXISTS "Enable admin full access to user_roles" ON user_roles;
DROP POLICY IF EXISTS "Users can view own roles" ON user_roles;

-- Drop the unique constraint that includes the role column
ALTER TABLE user_roles DROP CONSTRAINT IF EXISTS user_roles_user_id_role_key;

-- Drop the role column (this also drops the enum dependency)
ALTER TABLE user_roles DROP COLUMN IF EXISTS role;

-- Add new role_id column
ALTER TABLE user_roles ADD COLUMN role_id BIGINT;

-- ============================================================================
-- PHASE 4: SEED INITIAL DATA
-- ============================================================================

-- Insert initial permissions
INSERT INTO permissions (name, description) VALUES
    ('quote:create', 'Create new quotes'),
    ('quote:edit', 'Edit existing quotes'),
    ('quote:delete', 'Delete quotes'),
    ('quote:view', 'View quotes'),
    ('quote:approve', 'Approve quotes'),
    ('quote:reject', 'Reject quotes'),
    ('user:assign_role', 'Assign roles to users'),
    ('user:view', 'View user information'),
    ('user:edit', 'Edit user information'),
    ('user:delete', 'Delete users'),
    ('admin:dashboard', 'Access admin dashboard'),
    ('admin:settings', 'Manage system settings'),
    ('payment:view', 'View payment information'),
    ('payment:process', 'Process payments'),
    ('payment:refund', 'Process refunds'),
    ('order:view', 'View orders'),
    ('order:edit', 'Edit orders'),
    ('order:fulfill', 'Fulfill orders'),
    ('customer:view', 'View customer information'),
    ('customer:edit', 'Edit customer information'),
    ('support:view', 'View support tickets'),
    ('support:respond', 'Respond to support tickets'),
    ('support:assign', 'Assign support tickets'),
    ('system:backup', 'Create system backups'),
    ('system:maintenance', 'Perform system maintenance')
ON CONFLICT (name) DO NOTHING;

-- Insert initial roles
INSERT INTO roles (name, description) VALUES
    ('Admin', 'Full system administrator with all permissions'),
    ('Quote Manager', 'Manages quotes and customer interactions'),
    ('Finance Manager', 'Handles payments and financial operations'),
    ('Customer Support', 'Provides customer support and assistance'),
    ('Fulfillment Manager', 'Manages order fulfillment and shipping'),
    ('User', 'Basic user with minimal permissions')
ON CONFLICT (name) DO NOTHING;

-- Assign permissions to Admin role (all permissions)
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
    r.id as role_id,
    p.id as permission_id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'Admin'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Assign permissions to Quote Manager role
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
    r.id as role_id,
    p.id as permission_id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'Quote Manager'
AND p.name IN (
    'quote:create', 'quote:edit', 'quote:view', 'quote:approve', 'quote:reject',
    'customer:view', 'customer:edit',
    'order:view', 'order:edit',
    'support:view', 'support:respond'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Assign permissions to Finance Manager role
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
    r.id as role_id,
    p.id as permission_id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'Finance Manager'
AND p.name IN (
    'payment:view', 'payment:process', 'payment:refund',
    'quote:view', 'order:view',
    'customer:view'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Assign permissions to Customer Support role
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
    r.id as role_id,
    p.id as permission_id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'Customer Support'
AND p.name IN (
    'support:view', 'support:respond', 'support:assign',
    'customer:view', 'customer:edit',
    'quote:view', 'order:view'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Assign permissions to Fulfillment Manager role
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
    r.id as role_id,
    p.id as permission_id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'Fulfillment Manager'
AND p.name IN (
    'order:view', 'order:edit', 'order:fulfill',
    'quote:view', 'customer:view'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Assign permissions to User role (basic permissions)
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
    r.id as role_id,
    p.id as permission_id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'User'
AND p.name IN (
    'quote:create', 'quote:view'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- ============================================================================
-- PHASE 5: MIGRATE EXISTING USER ROLE DATA
-- ============================================================================

-- Update user_roles table with new role_id references
-- Map old enum values to new role IDs
UPDATE user_roles 
SET role_id = (
    CASE 
        WHEN EXISTS (SELECT 1 FROM user_roles_backup b WHERE b.id = user_roles.id AND b.role_name = 'admin') 
        THEN (SELECT id FROM roles WHERE name = 'Admin')
        WHEN EXISTS (SELECT 1 FROM user_roles_backup b WHERE b.id = user_roles.id AND b.role_name = 'moderator') 
        THEN (SELECT id FROM roles WHERE name = 'Quote Manager')
        WHEN EXISTS (SELECT 1 FROM user_roles_backup b WHERE b.id = user_roles.id AND b.role_name = 'user') 
        THEN (SELECT id FROM roles WHERE name = 'User')
        ELSE (SELECT id FROM roles WHERE name = 'User')
    END
);

-- Make role_id NOT NULL and add foreign key constraint
ALTER TABLE user_roles ALTER COLUMN role_id SET NOT NULL;
ALTER TABLE user_roles ADD CONSTRAINT user_roles_role_id_fkey 
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE;

-- Create new primary key on (user_id, role_id) to support multiple roles per user
ALTER TABLE user_roles DROP CONSTRAINT IF EXISTS user_roles_pkey;
ALTER TABLE user_roles ADD CONSTRAINT user_roles_pkey PRIMARY KEY (user_id, role_id);

-- ============================================================================
-- PHASE 6: CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

-- Indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_permissions_name ON permissions(name);
CREATE INDEX IF NOT EXISTS idx_roles_name ON roles(name);
CREATE INDEX IF NOT EXISTS idx_role_permissions_role_id ON role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission_id ON role_permissions(permission_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON user_roles(role_id);

-- ============================================================================
-- PHASE 7: CREATE HELPER FUNCTIONS
-- ============================================================================

-- Function to check if a user has a specific permission
CREATE OR REPLACE FUNCTION user_has_permission(user_uuid UUID, permission_name TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM user_roles ur
        JOIN role_permissions rp ON ur.role_id = rp.role_id
        JOIN permissions p ON rp.permission_id = p.id
        WHERE ur.user_id = user_uuid
        AND ur.is_active = true
        AND p.name = permission_name
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if a user has a specific role
CREATE OR REPLACE FUNCTION user_has_role(user_uuid UUID, role_name TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = user_uuid
        AND ur.is_active = true
        AND r.name = role_name
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get all permissions for a user
CREATE OR REPLACE FUNCTION get_user_permissions(user_uuid UUID)
RETURNS TABLE(permission_name TEXT, permission_description TEXT) AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT p.name, p.description
    FROM user_roles ur
    JOIN role_permissions rp ON ur.role_id = rp.role_id
    JOIN permissions p ON rp.permission_id = p.id
    WHERE ur.user_id = user_uuid
    AND ur.is_active = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get all roles for a user
CREATE OR REPLACE FUNCTION get_user_roles(user_uuid UUID)
RETURNS TABLE(role_name TEXT, role_description TEXT) AS $$
BEGIN
    RETURN QUERY
    SELECT r.name, r.description
    FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = user_uuid
    AND ur.is_active = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- PHASE 8: CREATE NEW RLS POLICIES
-- ============================================================================

-- Enable RLS on new tables
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;

-- Permissions table policies
CREATE POLICY "Anyone can read permissions" ON permissions FOR SELECT USING (true);
CREATE POLICY "Only admins can modify permissions" ON permissions 
    FOR ALL USING (user_has_permission(auth.uid(), 'admin:settings'));

-- Roles table policies  
CREATE POLICY "Anyone can read roles" ON roles FOR SELECT USING (true);
CREATE POLICY "Only admins can modify roles" ON roles 
    FOR ALL USING (user_has_permission(auth.uid(), 'admin:settings'));

-- Role permissions table policies
CREATE POLICY "Anyone can read role permissions" ON role_permissions FOR SELECT USING (true);
CREATE POLICY "Only admins can modify role permissions" ON role_permissions 
    FOR ALL USING (user_has_permission(auth.uid(), 'admin:settings'));

-- Updated user_roles table policies
CREATE POLICY "Users can view own roles" ON user_roles 
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all user roles" ON user_roles 
    FOR SELECT USING (user_has_permission(auth.uid(), 'user:view'));
CREATE POLICY "Only admins can assign roles" ON user_roles 
    FOR ALL USING (user_has_permission(auth.uid(), 'user:assign_role'));

-- ============================================================================
-- PHASE 9: GRANT PERMISSIONS TO DATABASE ROLES
-- ============================================================================

-- Grant permissions to authenticated users
GRANT SELECT ON permissions TO authenticated;
GRANT SELECT ON roles TO authenticated;
GRANT SELECT ON role_permissions TO authenticated;
GRANT SELECT ON user_roles TO authenticated;

-- Grant function execution permissions
GRANT EXECUTE ON FUNCTION user_has_permission(UUID, TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION user_has_role(UUID, TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_user_permissions(UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_user_roles(UUID) TO authenticated, anon;

-- ============================================================================
-- PHASE 10: CLEANUP
-- ============================================================================

-- Drop the old app_role enum (only if no other tables reference it)
-- Note: Keeping this commented for safety - remove manually after verification
-- DROP TYPE IF EXISTS app_role CASCADE;

-- Add comment to backup table for future reference
COMMENT ON TABLE user_roles_backup IS 'Backup of user_roles data before permissions system migration - safe to drop after verification';

COMMIT;

-- ============================================================================
-- MIGRATION SUMMARY
-- ============================================================================
-- Created tables: permissions, roles, role_permissions
-- Modified table: user_roles (removed role enum, added role_id FK)
-- Created functions: user_has_permission, user_has_role, get_user_permissions, get_user_roles
-- Migrated existing user role data to new schema
-- Applied RLS policies for security
-- Created performance indexes
-- ============================================================================