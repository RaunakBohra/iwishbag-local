-- Create comprehensive discount abuse detection and response system
-- This migration creates all necessary tables and functions for abuse monitoring

-- Create abuse_attempts table to track all abuse attempts
CREATE TABLE IF NOT EXISTS abuse_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  customer_id UUID REFERENCES auth.users(id),
  ip_address INET,
  user_agent TEXT,
  abuse_type TEXT NOT NULL CHECK (abuse_type IN ('rapid_attempts', 'invalid_codes_spam', 'account_farming', 'bot_detected', 'geographic_fraud', 'code_sharing')),
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  details JSONB NOT NULL DEFAULT '{}',
  detected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  response_action TEXT NOT NULL CHECK (response_action IN ('log_only', 'rate_limit', 'captcha_required', 'temporary_block', 'permanent_block')),
  block_duration INTEGER, -- in minutes
  resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create abuse_responses table to track automated responses
CREATE TABLE IF NOT EXISTS abuse_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  abuse_attempt_id UUID REFERENCES abuse_attempts(id),
  action_type TEXT NOT NULL CHECK (action_type IN ('log_only', 'rate_limit', 'captcha_required', 'temporary_block', 'permanent_block', 'ip_block')),
  duration_minutes INTEGER,
  escalation_level TEXT NOT NULL CHECK (escalation_level IN ('low', 'medium', 'high', 'critical')),
  automated BOOLEAN DEFAULT TRUE,
  applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  reason TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create active_blocks table to track currently active blocks
CREATE TABLE IF NOT EXISTS active_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_type TEXT NOT NULL CHECK (target_type IN ('session', 'ip', 'customer')),
  target_value TEXT NOT NULL,
  block_type TEXT NOT NULL CHECK (block_type IN ('rate_limit', 'captcha_required', 'temporary_block', 'permanent_block')),
  reason TEXT NOT NULL,
  applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  applied_by TEXT DEFAULT 'system',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(target_type, target_value, block_type)
);

-- Create abuse_patterns table to configure detection patterns
CREATE TABLE IF NOT EXISTS abuse_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern_type TEXT NOT NULL UNIQUE,
  threshold INTEGER NOT NULL,
  time_window_minutes INTEGER NOT NULL,
  response_action TEXT NOT NULL,
  enabled BOOLEAN DEFAULT TRUE,
  description TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create escalation_rules table to define escalation matrix
CREATE TABLE IF NOT EXISTS escalation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  violation_count INTEGER NOT NULL,
  time_window_hours INTEGER NOT NULL,
  response_action TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL,
  description TEXT NOT NULL,
  priority INTEGER DEFAULT 0,
  enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default abuse patterns
INSERT INTO abuse_patterns (pattern_type, threshold, time_window_minutes, response_action, description) VALUES
('rapid_attempts', 10, 5, 'rate_limit', 'More than 10 discount attempts in 5 minutes'),
('invalid_codes_spam', 15, 10, 'temporary_block', 'More than 15 invalid code attempts in 10 minutes'),
('bot_detected', 50, 5, 'captcha_required', 'Bot-like behavior detected (50+ attempts in 5 minutes)'),
('geographic_fraud', 3, 60, 'temporary_block', 'Geographic fraud indicators detected'),
('account_farming', 5, 1440, 'temporary_block', 'Multiple accounts from same source'),
('code_sharing', 10, 60, 'temporary_block', 'Same code used from multiple sources')
ON CONFLICT (pattern_type) DO UPDATE SET
  threshold = EXCLUDED.threshold,
  time_window_minutes = EXCLUDED.time_window_minutes,
  response_action = EXCLUDED.response_action,
  description = EXCLUDED.description,
  updated_at = NOW();

-- Insert default escalation rules
INSERT INTO escalation_rules (violation_count, time_window_hours, response_action, duration_minutes, description, priority) VALUES
(1, 1, 'rate_limit', 5, 'First offense - brief rate limiting', 1),
(2, 6, 'captcha_required', 15, 'Second offense - require CAPTCHA verification', 2),
(3, 24, 'temporary_block', 60, 'Third offense - 1 hour temporary block', 3),
(5, 24, 'temporary_block', 240, 'Multiple offenses - 4 hour block', 4),
(10, 48, 'temporary_block', 1440, 'Persistent abuse - 24 hour block', 5);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_abuse_attempts_session_detected ON abuse_attempts(session_id, detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_abuse_attempts_ip_detected ON abuse_attempts(ip_address, detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_abuse_attempts_customer_detected ON abuse_attempts(customer_id, detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_abuse_attempts_type_severity ON abuse_attempts(abuse_type, severity);
CREATE INDEX IF NOT EXISTS idx_abuse_attempts_detected_at ON abuse_attempts(detected_at DESC);

CREATE INDEX IF NOT EXISTS idx_abuse_responses_attempt_id ON abuse_responses(abuse_attempt_id);
CREATE INDEX IF NOT EXISTS idx_abuse_responses_applied_at ON abuse_responses(applied_at DESC);

CREATE INDEX IF NOT EXISTS idx_active_blocks_target ON active_blocks(target_type, target_value);
CREATE INDEX IF NOT EXISTS idx_active_blocks_expires_at ON active_blocks(expires_at) WHERE expires_at IS NOT NULL;

-- Create triggers for updated_at columns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_abuse_attempts_updated_at BEFORE UPDATE ON abuse_attempts 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_abuse_patterns_updated_at BEFORE UPDATE ON abuse_patterns 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_escalation_rules_updated_at BEFORE UPDATE ON escalation_rules 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create RPC function to get abuse statistics
CREATE OR REPLACE FUNCTION get_abuse_statistics(
  p_timeframe TEXT DEFAULT 'day'
)
RETURNS TABLE (
  total_attempts BIGINT,
  blocked_attempts BIGINT,
  active_blocks BIGINT,
  prevention_rate NUMERIC,
  top_abuse_types JSONB,
  geographic_distribution JSONB,
  hourly_trend JSONB
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  time_filter TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Set time filter based on timeframe
  CASE p_timeframe
    WHEN 'hour' THEN time_filter := NOW() - INTERVAL '1 hour';
    WHEN 'week' THEN time_filter := NOW() - INTERVAL '1 week';
    ELSE time_filter := NOW() - INTERVAL '1 day';
  END CASE;
  
  -- Get basic statistics
  SELECT 
    COUNT(*)::BIGINT,
    COUNT(CASE WHEN response_action != 'log_only' THEN 1 END)::BIGINT
  INTO total_attempts, blocked_attempts
  FROM abuse_attempts 
  WHERE detected_at >= time_filter;
  
  -- Get active blocks count
  SELECT COUNT(*)::BIGINT INTO active_blocks
  FROM active_blocks 
  WHERE expires_at IS NULL OR expires_at > NOW();
  
  -- Calculate prevention rate
  IF total_attempts > 0 THEN
    prevention_rate := (blocked_attempts::NUMERIC / total_attempts::NUMERIC) * 100;
  ELSE
    prevention_rate := 0;
  END IF;
  
  -- Get top abuse types
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'type', abuse_type,
        'count', count
      )
      ORDER BY count DESC
    ), '[]'::jsonb
  ) INTO top_abuse_types
  FROM (
    SELECT abuse_type, COUNT(*) as count
    FROM abuse_attempts 
    WHERE detected_at >= time_filter
    GROUP BY abuse_type
    ORDER BY count DESC
    LIMIT 10
  ) top_types;
  
  -- Get geographic distribution (simplified - using first 3 octets of IP)
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'country', COALESCE(country, 'Unknown'),
        'count', count
      )
      ORDER BY count DESC
    ), '[]'::jsonb
  ) INTO geographic_distribution
  FROM (
    SELECT 
      CASE 
        WHEN ip_address IS NULL THEN 'Unknown'
        WHEN host(ip_address) LIKE '192.168.%' OR host(ip_address) LIKE '10.%' OR host(ip_address) LIKE '172.%' THEN 'Private'
        ELSE 'Public'
      END as country,
      COUNT(*) as count
    FROM abuse_attempts 
    WHERE detected_at >= time_filter
    GROUP BY 1
    ORDER BY count DESC
    LIMIT 10
  ) geo_data;
  
  -- Get hourly trend (last 24 hours)
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'hour', hour_label,
        'attempts', attempts,
        'blocked', blocked
      )
      ORDER BY hour_start
    ), '[]'::jsonb
  ) INTO hourly_trend
  FROM (
    SELECT 
      date_trunc('hour', generate_series(
        NOW() - INTERVAL '23 hours', 
        NOW(), 
        '1 hour'::interval
      )) as hour_start,
      to_char(date_trunc('hour', generate_series(
        NOW() - INTERVAL '23 hours', 
        NOW(), 
        '1 hour'::interval
      )), 'HH24:MI') as hour_label,
      COALESCE(attempts, 0) as attempts,
      COALESCE(blocked, 0) as blocked
    FROM generate_series(
      NOW() - INTERVAL '23 hours', 
      NOW(), 
      '1 hour'::interval
    ) gs
    LEFT JOIN (
      SELECT 
        date_trunc('hour', detected_at) as hour,
        COUNT(*) as attempts,
        COUNT(CASE WHEN response_action != 'log_only' THEN 1 END) as blocked
      FROM abuse_attempts
      WHERE detected_at >= NOW() - INTERVAL '24 hours'
      GROUP BY date_trunc('hour', detected_at)
    ) stats ON date_trunc('hour', gs) = stats.hour
    ORDER BY hour_start
  ) trend_data;
  
  RETURN NEXT;
END;
$$;

-- Create RPC function to check if target is blocked
CREATE OR REPLACE FUNCTION is_target_blocked(
  p_target_type TEXT,
  p_target_value TEXT
)
RETURNS TABLE (
  is_blocked BOOLEAN,
  block_type TEXT,
  reason TEXT,
  expires_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    TRUE as is_blocked,
    ab.block_type,
    ab.reason,
    ab.expires_at
  FROM active_blocks ab
  WHERE ab.target_type = p_target_type 
    AND ab.target_value = p_target_value
    AND (ab.expires_at IS NULL OR ab.expires_at > NOW())
  LIMIT 1;
  
  -- If no active block found, return false
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, NULL::TEXT, NULL::TEXT, NULL::TIMESTAMP WITH TIME ZONE;
  END IF;
END;
$$;

-- Create RPC function to apply block
CREATE OR REPLACE FUNCTION apply_abuse_block(
  p_target_type TEXT,
  p_target_value TEXT,
  p_block_type TEXT,
  p_reason TEXT,
  p_duration_minutes INTEGER DEFAULT NULL,
  p_applied_by TEXT DEFAULT 'system'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  expires_at_val TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Calculate expiration time if duration provided
  IF p_duration_minutes IS NOT NULL THEN
    expires_at_val := NOW() + (p_duration_minutes || ' minutes')::INTERVAL;
  END IF;
  
  -- Insert or update the block
  INSERT INTO active_blocks (
    target_type, 
    target_value, 
    block_type, 
    reason, 
    expires_at, 
    applied_by
  ) VALUES (
    p_target_type,
    p_target_value,
    p_block_type,
    p_reason,
    expires_at_val,
    p_applied_by
  )
  ON CONFLICT (target_type, target_value, block_type) 
  DO UPDATE SET
    reason = EXCLUDED.reason,
    expires_at = EXCLUDED.expires_at,
    applied_by = EXCLUDED.applied_by,
    created_at = NOW();
    
  RETURN TRUE;
END;
$$;

-- Create RPC function to remove block
CREATE OR REPLACE FUNCTION remove_abuse_block(
  p_target_type TEXT,
  p_target_value TEXT,
  p_block_type TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF p_block_type IS NOT NULL THEN
    DELETE FROM active_blocks
    WHERE target_type = p_target_type 
      AND target_value = p_target_value
      AND block_type = p_block_type;
  ELSE
    DELETE FROM active_blocks
    WHERE target_type = p_target_type 
      AND target_value = p_target_value;
  END IF;
  
  RETURN TRUE;
END;
$$;

-- Create RPC function for cleanup expired blocks
CREATE OR REPLACE FUNCTION cleanup_expired_blocks()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM active_blocks 
  WHERE expires_at IS NOT NULL AND expires_at <= NOW();
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- Enable Row Level Security
ALTER TABLE abuse_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE abuse_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE active_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE abuse_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE escalation_rules ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (admin-only access)
CREATE POLICY "Admin can view all abuse attempts" ON abuse_attempts FOR SELECT USING (auth.uid() IN (SELECT id FROM profiles WHERE is_admin = true));
CREATE POLICY "Admin can insert abuse attempts" ON abuse_attempts FOR INSERT WITH CHECK (auth.uid() IN (SELECT id FROM profiles WHERE is_admin = true));
CREATE POLICY "Admin can update abuse attempts" ON abuse_attempts FOR UPDATE USING (auth.uid() IN (SELECT id FROM profiles WHERE is_admin = true));

CREATE POLICY "Admin can view all abuse responses" ON abuse_responses FOR SELECT USING (auth.uid() IN (SELECT id FROM profiles WHERE is_admin = true));
CREATE POLICY "Admin can insert abuse responses" ON abuse_responses FOR INSERT WITH CHECK (auth.uid() IN (SELECT id FROM profiles WHERE is_admin = true));

CREATE POLICY "Admin can view all active blocks" ON active_blocks FOR SELECT USING (auth.uid() IN (SELECT id FROM profiles WHERE is_admin = true));
CREATE POLICY "Admin can manage active blocks" ON active_blocks FOR ALL USING (auth.uid() IN (SELECT id FROM profiles WHERE is_admin = true));

CREATE POLICY "Admin can view abuse patterns" ON abuse_patterns FOR SELECT USING (auth.uid() IN (SELECT id FROM profiles WHERE is_admin = true));
CREATE POLICY "Admin can manage abuse patterns" ON abuse_patterns FOR ALL USING (auth.uid() IN (SELECT id FROM profiles WHERE is_admin = true));

CREATE POLICY "Admin can view escalation rules" ON escalation_rules FOR SELECT USING (auth.uid() IN (SELECT id FROM profiles WHERE is_admin = true));
CREATE POLICY "Admin can manage escalation rules" ON escalation_rules FOR ALL USING (auth.uid() IN (SELECT id FROM profiles WHERE is_admin = true));

-- Grant permissions to service role for API functions
GRANT ALL ON abuse_attempts TO service_role;
GRANT ALL ON abuse_responses TO service_role;
GRANT ALL ON active_blocks TO service_role;
GRANT ALL ON abuse_patterns TO service_role;
GRANT ALL ON escalation_rules TO service_role;

-- Create a comment to document this system
COMMENT ON TABLE abuse_attempts IS 'Tracks all discount abuse attempts detected by the system';
COMMENT ON TABLE abuse_responses IS 'Logs automated responses to abuse attempts';
COMMENT ON TABLE active_blocks IS 'Maintains currently active blocks (sessions, IPs, customers)';
COMMENT ON TABLE abuse_patterns IS 'Configuration for abuse detection patterns and thresholds';
COMMENT ON TABLE escalation_rules IS 'Defines escalation matrix based on violation history';

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Discount abuse detection and response system created successfully!';
  RAISE NOTICE '📊 Tables: abuse_attempts, abuse_responses, active_blocks, abuse_patterns, escalation_rules';
  RAISE NOTICE '🔧 RPC Functions: get_abuse_statistics, is_target_blocked, apply_abuse_block, remove_abuse_block, cleanup_expired_blocks';
  RAISE NOTICE '🛡️ RLS Policies: Admin-only access with service role permissions';
  RAISE NOTICE '⚡ Default patterns and escalation rules inserted';
END $$;