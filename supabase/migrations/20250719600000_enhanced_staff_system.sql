-- Enhanced Staff Management System
-- Extends the existing user_roles table for comprehensive staff management

-- Create enum for staff roles
DO $$ BEGIN
    CREATE TYPE staff_role_enum AS ENUM (
        'admin',
        'manager', 
        'customer_service',
        'quote_specialist', 
        'accountant',
        'fulfillment',
        'moderator',
        'user'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create departments enum
DO $$ BEGIN
    CREATE TYPE department_enum AS ENUM (
        'administration',
        'customer_service',
        'quotes', 
        'accounting',
        'fulfillment',
        'marketing'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Enhance user_roles table
ALTER TABLE user_roles 
  DROP CONSTRAINT IF EXISTS user_roles_role_check;

-- Update role column to use new enum
ALTER TABLE user_roles 
  ALTER COLUMN role TYPE staff_role_enum USING role::staff_role_enum;

-- Add new columns for staff management
ALTER TABLE user_roles 
  ADD COLUMN IF NOT EXISTS department department_enum,
  ADD COLUMN IF NOT EXISTS permissions TEXT[], 
  ADD COLUMN IF NOT EXISTS scope TEXT DEFAULT 'global',
  ADD COLUMN IF NOT EXISTS manager_id UUID REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS start_date TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS end_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_roles_department ON user_roles(department);
CREATE INDEX IF NOT EXISTS idx_user_roles_active ON user_roles(is_active);
CREATE INDEX IF NOT EXISTS idx_user_roles_manager ON user_roles(manager_id);

-- Create staff profiles enhancement
ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS employee_id TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS job_title TEXT,
  ADD COLUMN IF NOT EXISTS department department_enum,
  ADD COLUMN IF NOT EXISTS hire_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS salary NUMERIC,
  ADD COLUMN IF NOT EXISTS is_staff BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS emergency_contact JSONB,
  ADD COLUMN IF NOT EXISTS work_schedule JSONB;

-- Create audit table for role changes
CREATE TABLE IF NOT EXISTS role_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) NOT NULL,
  changed_by UUID REFERENCES profiles(id) NOT NULL,
  old_role staff_role_enum,
  new_role staff_role_enum,
  old_department department_enum,
  new_department department_enum,
  old_permissions TEXT[],
  new_permissions TEXT[],
  change_reason TEXT,
  changed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for audit queries
CREATE INDEX IF NOT EXISTS idx_role_audit_user ON role_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_role_audit_date ON role_audit_log(changed_at);

-- Function to insert audit log when roles change
CREATE OR REPLACE FUNCTION audit_role_changes()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert audit record for updates
  IF TG_OP = 'UPDATE' THEN
    INSERT INTO role_audit_log (
      user_id, changed_by, old_role, new_role, 
      old_department, new_department,
      old_permissions, new_permissions
    ) VALUES (
      NEW.user_id, NEW.created_by, OLD.role, NEW.role,
      OLD.department, NEW.department,
      OLD.permissions, NEW.permissions
    );
  END IF;
  
  -- Insert audit record for new roles
  IF TG_OP = 'INSERT' THEN
    INSERT INTO role_audit_log (
      user_id, changed_by, new_role, new_department, new_permissions
    ) VALUES (
      NEW.user_id, NEW.created_by, NEW.role, NEW.department, NEW.permissions
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for role audit
DROP TRIGGER IF EXISTS trigger_audit_role_changes ON user_roles;
CREATE TRIGGER trigger_audit_role_changes
  AFTER INSERT OR UPDATE ON user_roles
  FOR EACH ROW EXECUTE FUNCTION audit_role_changes();

-- RLS Policies for staff management

-- Enhanced RLS for user_roles (staff can see their department)
DROP POLICY IF EXISTS "Users can read own role" ON user_roles;
DROP POLICY IF EXISTS "Admins can manage all roles" ON user_roles;

CREATE POLICY "Users can read own role" ON user_roles
  FOR SELECT USING (
    auth.uid() = user_id OR 
    is_admin() OR
    (manager_id = auth.uid() AND is_active = true)
  );

CREATE POLICY "Admins and managers can manage roles" ON user_roles
  FOR ALL USING (
    is_admin() OR 
    (EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'manager' 
      AND is_active = true
    ))
  );

-- RLS for audit log (admin and managers only)
ALTER TABLE role_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin and managers can view audit log" ON role_audit_log
  FOR SELECT USING (
    is_admin() OR
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'manager' 
      AND is_active = true
    )
  );

-- Helper function to check specific permissions
CREATE OR REPLACE FUNCTION has_permission(permission_name TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND is_active = true
    AND (
      role = 'admin' OR 
      permission_name = ANY(permissions)
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check department access
CREATE OR REPLACE FUNCTION has_department_access(dept department_enum)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND is_active = true
    AND (
      role = 'admin' OR 
      department = dept OR
      (role = 'manager' AND department = dept)
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION has_permission(TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION has_department_access(department_enum) TO authenticated, anon;