-- ============================================================================
-- ENSURE ESSENTIAL FUNCTIONS - Create all required RPC functions and tables
-- This migration ensures these functions exist after any DB reset
-- ============================================================================

-- 1. Create user_activity_analytics table if not exists
CREATE TABLE IF NOT EXISTS user_activity_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL,
  activity_data JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for user_activity_analytics
CREATE INDEX IF NOT EXISTS idx_user_activity_analytics_user_id ON user_activity_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_analytics_type ON user_activity_analytics(activity_type);
CREATE INDEX IF NOT EXISTS idx_user_activity_analytics_created_at ON user_activity_analytics(created_at);

-- Enable RLS on user_activity_analytics
ALTER TABLE user_activity_analytics ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_activity_analytics
DROP POLICY IF EXISTS "Users can view own activity" ON user_activity_analytics;
CREATE POLICY "Users can view own activity" ON user_activity_analytics
  FOR SELECT USING (user_id = auth.uid() OR is_admin());

DROP POLICY IF EXISTS "Users can insert own activity" ON user_activity_analytics;
CREATE POLICY "Users can insert own activity" ON user_activity_analytics
  FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can manage all activity" ON user_activity_analytics;
CREATE POLICY "Admins can manage all activity" ON user_activity_analytics
  FOR ALL USING (is_admin());

-- 2. Create or replace get_user_permissions_new function
CREATE OR REPLACE FUNCTION get_user_permissions_new(user_uuid UUID)
RETURNS TABLE (
  permission TEXT,
  resource TEXT,
  granted_at TIMESTAMP WITH TIME ZONE,
  granted_by UUID
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ur.role::TEXT as permission,
    'all'::TEXT as resource,
    ur.created_at as granted_at,
    ur.created_by as granted_by
  FROM user_roles ur
  WHERE ur.user_id = user_uuid AND ur.is_active = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create or replace get_user_roles_new function
CREATE OR REPLACE FUNCTION get_user_roles_new(user_uuid UUID)
RETURNS TABLE (
  role app_role,
  granted_at TIMESTAMP WITH TIME ZONE,
  created_by UUID,
  is_active BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ur.role,
    ur.created_at as granted_at,
    ur.created_by,
    ur.is_active
  FROM user_roles ur
  WHERE ur.user_id = user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Ensure core auth functions exist (these should already exist, but just in case)
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'::app_role AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_authenticated()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN auth.uid() IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION has_role(role_name TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() AND role = role_name::app_role AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Alternative has_role function with UUID parameter (used in some RLS policies)
CREATE OR REPLACE FUNCTION has_role(user_uuid UUID, role_name app_role)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = user_uuid AND role = role_name AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Create update_updated_at_column function if not exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Add updated_at trigger to user_activity_analytics if column exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_activity_analytics' AND column_name = 'updated_at'
  ) THEN
    DROP TRIGGER IF EXISTS update_user_activity_analytics_updated_at ON user_activity_analytics;
    CREATE TRIGGER update_user_activity_analytics_updated_at
      BEFORE UPDATE ON user_activity_analytics
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- 7. Grant necessary permissions to all functions
GRANT EXECUTE ON FUNCTION get_user_permissions_new(UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_user_roles_new(UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION is_admin() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION is_authenticated() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION has_role(TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION has_role(UUID, app_role) TO authenticated, anon;

-- 8. Grant table permissions
GRANT SELECT, INSERT ON user_activity_analytics TO authenticated;
GRANT ALL ON user_activity_analytics TO service_role;

-- 9. Remove any problematic triggers from user_roles (the updated_at trigger issue)
DROP TRIGGER IF EXISTS update_user_roles_updated_at ON user_roles;

-- 10. Refresh HSN search cache if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_matviews WHERE matviewname = 'hsn_search_optimized') THEN
    REFRESH MATERIALIZED VIEW CONCURRENTLY hsn_search_optimized;
  END IF;
EXCEPTION WHEN OTHERS THEN
  -- Ignore errors if view doesn't exist or can't be refreshed
  NULL;
END $$;

-- Verification
DO $$
BEGIN
  RAISE NOTICE 'Essential Functions Migration Completed!';
  RAISE NOTICE 'Created functions: get_user_permissions_new, get_user_roles_new, core auth functions';
  RAISE NOTICE 'Created table: user_activity_analytics';
  RAISE NOTICE 'Removed problematic triggers from user_roles';
  RAISE NOTICE 'All functions have proper permissions granted';
END $$;