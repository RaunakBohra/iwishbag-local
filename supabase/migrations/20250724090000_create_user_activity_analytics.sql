-- Create user_activity_analytics table for Smart Recommendation Engine
-- This table tracks user interactions to enable intelligent recommendations

CREATE TABLE IF NOT EXISTS user_activity_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  activity_type VARCHAR(100) NOT NULL,
  activity_data JSONB DEFAULT '{}',
  session_id VARCHAR(255),
  ip_address INET,
  user_agent TEXT,
  referrer TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create indexes for optimal query performance
CREATE INDEX IF NOT EXISTS idx_user_activity_analytics_user_id ON user_activity_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_analytics_activity_type ON user_activity_analytics(activity_type);
CREATE INDEX IF NOT EXISTS idx_user_activity_analytics_created_at ON user_activity_analytics(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_activity_analytics_user_activity ON user_activity_analytics(user_id, activity_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_activity_analytics_session ON user_activity_analytics(session_id);

-- Create a GIN index for JSONB activity_data for efficient querying
CREATE INDEX IF NOT EXISTS idx_user_activity_analytics_activity_data ON user_activity_analytics USING GIN (activity_data);

-- Add Row Level Security (RLS) policies
ALTER TABLE user_activity_analytics ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own activity data
CREATE POLICY "Users can view own activity" ON user_activity_analytics
  FOR SELECT USING (auth.uid() = user_id);

-- Policy: Users can insert their own activity data
CREATE POLICY "Users can insert own activity" ON user_activity_analytics
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy: Admins can view all activity data
CREATE POLICY "Admins can view all activity" ON user_activity_analytics
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Add trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_activity_analytics_updated_at 
  BEFORE UPDATE ON user_activity_analytics 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE user_activity_analytics IS 'Tracks user interactions for smart recommendation engine and analytics';
COMMENT ON COLUMN user_activity_analytics.activity_type IS 'Type of activity: quote:view, product:view, quote:create_start, etc.';
COMMENT ON COLUMN user_activity_analytics.activity_data IS 'JSONB data specific to the activity type (product_id, quote_id, etc.)';
COMMENT ON COLUMN user_activity_analytics.session_id IS 'Session identifier for grouping related activities';
COMMENT ON COLUMN user_activity_analytics.ip_address IS 'User IP address for security and analytics';
COMMENT ON COLUMN user_activity_analytics.user_agent IS 'Browser user agent for device/browser analytics';
COMMENT ON COLUMN user_activity_analytics.referrer IS 'HTTP referrer for traffic source analysis';