-- Migration: Create New Permissions System Tables (Safe Version)
-- Purpose: Add permissions system tables without modifying existing user_roles table
-- Author: Claude Code Assistant
-- Date: 2025-07-24

BEGIN;

-- ============================================================================
-- PHASE 1: CREATE NEW TABLES ONLY
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
-- PHASE 2: SEED INITIAL DATA
-- ============================================================================

-- Insert initial permissions
INSERT INTO permissions (name, description) VALUES
    ('quote:create', 'Create new quotes'),
    ('quote:edit', 'Edit existing quotes'),
    ('quote:delete', 'Delete quotes'),
    ('quote:view', 'View quotes'),
    ('quote:approve', 'Approve quotes'),
    ('quote:reject', 'Reject quotes'),
    ('quote:calculate', 'Calculate quote pricing'),
    ('quote:share', 'Share quotes with customers'),
    ('user:assign_role', 'Assign roles to users'),
    ('user:view', 'View user information'),
    ('user:edit', 'Edit user information'),
    ('user:delete', 'Delete users'),
    ('admin:dashboard', 'Access admin dashboard'),
    ('admin:settings', 'Manage system settings'),
    ('admin:reports', 'View system reports'),
    ('payment:view', 'View payment information'),
    ('payment:process', 'Process payments'),
    ('payment:refund', 'Process refunds'),
    ('payment:verify', 'Verify payment proofs'),
    ('order:view', 'View orders'),
    ('order:edit', 'Edit orders'),
    ('order:fulfill', 'Fulfill orders'),
    ('order:cancel', 'Cancel orders'),
    ('customer:view', 'View customer information'),
    ('customer:edit', 'Edit customer information'),
    ('customer:create', 'Create customer profiles'),
    ('customer:delete', 'Delete customer profiles'),
    ('support:view', 'View support tickets'),
    ('support:respond', 'Respond to support tickets'),
    ('support:assign', 'Assign support tickets'),
    ('support:create', 'Create support tickets'),
    ('support:delete', 'Delete support tickets'),
    ('messaging:view', 'View messages'),
    ('messaging:send', 'Send messages'),
    ('messaging:admin_broadcast', 'Send admin broadcast messages'),
    ('shipping:view', 'View shipping information'),
    ('shipping:edit', 'Edit shipping routes and rates'),
    ('shipping:track', 'Track shipments'),
    ('country:view', 'View country settings'),
    ('country:edit', 'Edit country settings'),
    ('system:backup', 'Create system backups'),
    ('system:maintenance', 'Perform system maintenance'),
    ('system:monitoring', 'Monitor system health'),
    ('email:view', 'View email templates'),
    ('email:edit', 'Edit email templates'),
    ('email:send', 'Send emails'),
    ('customs:view', 'View customs categories'),
    ('customs:edit', 'Edit customs categories'),
    ('bank:view', 'View bank account details'),
    ('bank:edit', 'Edit bank account details'),
    ('ml:view', 'View ML weight estimator'),
    ('ml:train', 'Train ML models'),
    ('blog:view', 'View blog posts'),
    ('blog:create', 'Create blog posts'),
    ('blog:edit', 'Edit blog posts'),
    ('blog:delete', 'Delete blog posts'),
    ('analytics:view', 'View analytics dashboard'),
    ('analytics:export', 'Export analytics data')
ON CONFLICT (name) DO NOTHING;

-- Insert initial roles
INSERT INTO roles (name, description) VALUES
    ('Admin', 'Full system administrator with all permissions'),
    ('Quote Manager', 'Manages quotes and customer interactions'),
    ('Finance Manager', 'Handles payments and financial operations'),
    ('Customer Support', 'Provides customer support and assistance'),
    ('Fulfillment Manager', 'Manages order fulfillment and shipping'),
    ('Marketing Manager', 'Manages blog content and marketing materials'),
    ('System Analyst', 'Views analytics and system reports'),
    ('User', 'Basic user with minimal permissions')
ON CONFLICT (name) DO NOTHING;

-- Assign ALL permissions to Admin role
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
    'quote:create', 'quote:edit', 'quote:view', 'quote:approve', 'quote:reject', 'quote:calculate', 'quote:share',
    'customer:view', 'customer:edit', 'customer:create',
    'order:view', 'order:edit',
    'support:view', 'support:respond', 'support:create',
    'messaging:view', 'messaging:send',
    'shipping:view', 'country:view', 'customs:view'
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
    'payment:view', 'payment:process', 'payment:refund', 'payment:verify',
    'quote:view', 'order:view',
    'customer:view',
    'bank:view', 'bank:edit',
    'analytics:view', 'analytics:export'
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
    'support:view', 'support:respond', 'support:assign', 'support:create',
    'customer:view', 'customer:edit', 'customer:create',
    'quote:view', 'order:view',
    'messaging:view', 'messaging:send',
    'shipping:view', 'shipping:track'
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
    'order:view', 'order:edit', 'order:fulfill', 'order:cancel',
    'quote:view', 'customer:view',
    'shipping:view', 'shipping:edit', 'shipping:track',
    'messaging:view', 'messaging:send'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Assign permissions to Marketing Manager role
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
    r.id as role_id,
    p.id as permission_id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'Marketing Manager'
AND p.name IN (
    'blog:view', 'blog:create', 'blog:edit', 'blog:delete',
    'email:view', 'email:edit', 'email:send',
    'customer:view', 'analytics:view',
    'messaging:view', 'messaging:send', 'messaging:admin_broadcast'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Assign permissions to System Analyst role
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
    r.id as role_id,
    p.id as permission_id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'System Analyst'
AND p.name IN (
    'analytics:view', 'analytics:export',
    'system:monitoring',
    'quote:view', 'order:view', 'customer:view',
    'payment:view', 'shipping:view'
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
    'quote:create', 'quote:view',
    'messaging:view', 'messaging:send',
    'support:create', 'support:view'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- ============================================================================
-- PHASE 3: CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

-- Indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_permissions_name ON permissions(name);
CREATE INDEX IF NOT EXISTS idx_roles_name ON roles(name);
CREATE INDEX IF NOT EXISTS idx_role_permissions_role_id ON role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission_id ON role_permissions(permission_id);

-- ============================================================================
-- PHASE 4: CREATE HELPER FUNCTIONS
-- ============================================================================

-- Function to check if a user has a specific permission (using new system)
-- Note: This function assumes role_id will be added to user_roles table later
CREATE OR REPLACE FUNCTION user_has_permission_new(user_uuid UUID, permission_name TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    -- For now, return admin status based on existing system
    -- This will be updated when role_id is added to user_roles
    RETURN EXISTS (
        SELECT 1
        FROM user_roles ur
        WHERE ur.user_id = user_uuid
        AND ur.is_active = true
        AND ur.role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if a user has a specific role (using new system)
CREATE OR REPLACE FUNCTION user_has_role_new(user_uuid UUID, role_name TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    -- For now, return based on existing enum system
    -- This will be updated when role_id is added to user_roles
    RETURN EXISTS (
        SELECT 1
        FROM user_roles ur
        WHERE ur.user_id = user_uuid
        AND ur.is_active = true
        AND (
            (role_name = 'Admin' AND ur.role = 'admin') OR
            (role_name = 'User' AND ur.role = 'user') OR
            (role_name = 'Quote Manager' AND ur.role = 'moderator')
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get all permissions for a user (using new system)
CREATE OR REPLACE FUNCTION get_user_permissions_new(user_uuid UUID)
RETURNS TABLE(permission_name TEXT, permission_description TEXT) AS $$
BEGIN
    -- For admin users, return all permissions
    IF EXISTS (SELECT 1 FROM user_roles WHERE user_id = user_uuid AND role = 'admin' AND is_active = true) THEN
        RETURN QUERY
        SELECT p.name, p.description
        FROM permissions p;
    ELSE
        -- For non-admin users, return basic permissions
        RETURN QUERY
        SELECT p.name, p.description
        FROM permissions p
        WHERE p.name IN ('quote:create', 'quote:view', 'messaging:view', 'messaging:send', 'support:create', 'support:view');
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get all roles for a user (using new system)
CREATE OR REPLACE FUNCTION get_user_roles_new(user_uuid UUID)
RETURNS TABLE(role_name TEXT, role_description TEXT) AS $$
BEGIN
    -- Map existing enum roles to new role names
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
    AND ur.is_active = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- PHASE 5: CREATE RLS POLICIES FOR NEW TABLES
-- ============================================================================

-- Enable RLS on new tables
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;

-- Permissions table policies (readable by all, modifiable by admins only)
CREATE POLICY "Anyone can read permissions" ON permissions FOR SELECT USING (true);
CREATE POLICY "Only admins can modify permissions" ON permissions 
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() 
            AND role = 'admin' 
            AND is_active = true
        )
    );

-- Roles table policies  
CREATE POLICY "Anyone can read roles" ON roles FOR SELECT USING (true);
CREATE POLICY "Only admins can modify roles" ON roles 
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() 
            AND role = 'admin' 
            AND is_active = true
        )
    );

-- Role permissions table policies
CREATE POLICY "Anyone can read role permissions" ON role_permissions FOR SELECT USING (true);
CREATE POLICY "Only admins can modify role permissions" ON role_permissions 
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() 
            AND role = 'admin' 
            AND is_active = true
        )
    );

-- ============================================================================
-- PHASE 6: GRANT PERMISSIONS TO DATABASE ROLES
-- ============================================================================

-- Grant permissions to authenticated users
GRANT SELECT ON permissions TO authenticated;
GRANT SELECT ON roles TO authenticated;
GRANT SELECT ON role_permissions TO authenticated;

-- Grant function execution permissions
GRANT EXECUTE ON FUNCTION user_has_permission_new(UUID, TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION user_has_role_new(UUID, TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_user_permissions_new(UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_user_roles_new(UUID) TO authenticated, anon;

COMMIT;

-- ============================================================================
-- MIGRATION SUMMARY
-- ============================================================================
-- Created tables: permissions, roles, role_permissions
-- Created helper functions with _new suffix to avoid conflicts
-- Applied RLS policies using existing user_roles enum system
-- Seeded comprehensive permissions and role data
-- Created performance indexes
-- Ready for future migration to connect with user_roles table
-- ============================================================================