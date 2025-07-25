-- =============================================
-- User Activity Analytics Table Migration
-- =============================================
-- Creates the user_activity_analytics table for tracking user behavior and 
-- powering intelligent recommendations in the iwishBag platform.
-- Created: 2025-07-24
-- =============================================

-- Create user activity analytics table
CREATE TABLE user_activity_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_type VARCHAR(100) NOT NULL,
  activity_data JSONB NOT NULL DEFAULT '{}',
  session_id VARCHAR(255) NOT NULL,
  user_agent TEXT,
  referrer TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance optimization
CREATE INDEX idx_user_activity_user_id ON user_activity_analytics(user_id);
CREATE INDEX idx_user_activity_type ON user_activity_analytics(activity_type);
CREATE INDEX idx_user_activity_created_at ON user_activity_analytics(created_at DESC);
CREATE INDEX idx_user_activity_session_id ON user_activity_analytics(session_id);

-- Composite indexes for common query patterns
CREATE INDEX idx_user_activity_user_type ON user_activity_analytics(user_id, activity_type, created_at DESC);
CREATE INDEX idx_user_activity_user_created ON user_activity_analytics(user_id, created_at DESC);

-- GIN index for JSONB activity_data column for efficient queries on nested data
CREATE INDEX idx_user_activity_data_gin ON user_activity_analytics USING gin(activity_data);

-- Specific indexes for common activity data queries
CREATE INDEX idx_user_activity_product_name ON user_activity_analytics USING gin((activity_data->>'product_name') gin_trgm_ops);
CREATE INDEX idx_user_activity_quote_id ON user_activity_analytics((activity_data->>'quote_id'));
CREATE INDEX idx_user_activity_product_price ON user_activity_analytics(((activity_data->>'product_price')::numeric));

-- Enable Row Level Security
ALTER TABLE user_activity_analytics ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only access their own activity data
CREATE POLICY "Users can access own activity data" ON user_activity_analytics
  FOR ALL USING (user_id = auth.uid());

-- RLS Policy: Admins can access all activity data for analytics
CREATE POLICY "Admins can access all activity data" ON user_activity_analytics
  FOR ALL USING (is_admin());

-- Create trigger for updated_at column
CREATE TRIGGER update_user_activity_analytics_updated_at
  BEFORE UPDATE ON user_activity_analytics
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create function to clean up old activity data (keep last 6 months)
CREATE OR REPLACE FUNCTION cleanup_old_activity_data()
RETURNS void AS $$
BEGIN
  -- Delete activity data older than 6 months
  DELETE FROM user_activity_analytics 
  WHERE created_at < NOW() - INTERVAL '6 months';
  
  -- Log cleanup action
  RAISE NOTICE 'Cleaned up activity data older than 6 months';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get user activity summary for recommendations
CREATE OR REPLACE FUNCTION get_user_activity_summary(target_user_id UUID)
RETURNS TABLE(
  activity_type TEXT,
  activity_count BIGINT,
  latest_activity TIMESTAMPTZ,
  common_data JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ua.activity_type::TEXT,
    COUNT(*)::BIGINT as activity_count,
    MAX(ua.created_at) as latest_activity,
    jsonb_object_agg(
      key, 
      COUNT(*)
    ) FILTER (WHERE key IS NOT NULL) as common_data
  FROM user_activity_analytics ua,
       LATERAL jsonb_each_text(ua.activity_data) AS kv(key, value)
  WHERE ua.user_id = target_user_id
    AND ua.created_at > NOW() - INTERVAL '3 months'
  GROUP BY ua.activity_type;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION cleanup_old_activity_data() TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_activity_summary(UUID) TO authenticated;

-- Add comments for documentation
COMMENT ON TABLE user_activity_analytics IS 'Stores user activity data for behavioral analysis and intelligent recommendations';
COMMENT ON COLUMN user_activity_analytics.id IS 'Unique identifier for the activity record';
COMMENT ON COLUMN user_activity_analytics.user_id IS 'Reference to the user who performed this activity';
COMMENT ON COLUMN user_activity_analytics.activity_type IS 'Type of activity (e.g., product:view, quote:create, etc.)';
COMMENT ON COLUMN user_activity_analytics.activity_data IS 'Flexible JSONB data containing activity-specific information';
COMMENT ON COLUMN user_activity_analytics.session_id IS 'Browser session identifier for grouping related activities';
COMMENT ON COLUMN user_activity_analytics.user_agent IS 'Browser user agent string';
COMMENT ON COLUMN user_activity_analytics.referrer IS 'Page referrer information';
COMMENT ON COLUMN user_activity_analytics.created_at IS 'Timestamp when the activity occurred';
COMMENT ON COLUMN user_activity_analytics.updated_at IS 'Timestamp when the record was last updated';

-- Insert some sample activity types documentation
INSERT INTO user_activity_analytics (user_id, activity_type, activity_data, session_id, user_agent, referrer)
SELECT 
  auth.uid(),
  'system:documentation',
  jsonb_build_object(
    'activity_types', jsonb_build_array(
      'quote:view', 'quote:create_start', 'quote:create_complete', 'quote:approve', 'quote:reject',
      'product:view', 'product:search', 'product:add_to_cart',
      'order:view', 'order:track', 'order:complete',
      'dashboard:view', 'metrics:click',
      'support:request', 'support:message',
      'page:view', 'link:click', 'button:click'
    ),
    'description', 'Sample activity types supported by the user activity analytics system'
  ),
  'system-init',
  'iwishBag System',
  'internal'
WHERE auth.uid() IS NOT NULL;

-- Performance analysis query (for development/debugging)
-- SELECT 
--   activity_type,
--   COUNT(*) as total_activities,
--   COUNT(DISTINCT user_id) as unique_users,
--   MIN(created_at) as first_activity,
--   MAX(created_at) as latest_activity,
--   AVG(EXTRACT(EPOCH FROM (created_at - LAG(created_at) OVER (PARTITION BY user_id ORDER BY created_at)))/60) as avg_minutes_between_activities
-- FROM user_activity_analytics 
-- WHERE created_at > NOW() - INTERVAL '7 days'
-- GROUP BY activity_type 
-- ORDER BY total_activities DESC;

-- Success message
SELECT 'User activity analytics table created successfully with RLS policies and performance indexes!' as status;