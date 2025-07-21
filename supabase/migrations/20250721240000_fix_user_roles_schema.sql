-- Add missing columns to user_roles table
-- Required by useEnsureUserRole hook for proper role management

ALTER TABLE user_roles 
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true NOT NULL,
  ADD COLUMN IF NOT EXISTS scope TEXT DEFAULT 'global' NOT NULL;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_roles_is_active ON user_roles(is_active);
CREATE INDEX IF NOT EXISTS idx_user_roles_scope ON user_roles(scope);

-- Add comments for documentation
COMMENT ON COLUMN user_roles.is_active IS 'Whether the role assignment is currently active';
COMMENT ON COLUMN user_roles.scope IS 'Scope of the role (global, organization, etc.)';