-- Create SMS messages table for storing SMS history
CREATE TABLE IF NOT EXISTS sms_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id TEXT UNIQUE,
  direction TEXT NOT NULL CHECK (direction IN ('sent', 'received')),
  from_phone TEXT NOT NULL,
  to_phone TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'received')),
  provider TEXT CHECK (provider IN ('sparrow', 'msg91', 'twilio')),
  country_code TEXT,
  cost DECIMAL(10, 4),
  credits_used INTEGER,
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  user_id UUID REFERENCES auth.users(id),
  customer_phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_sms_messages_user_id ON sms_messages(user_id);
CREATE INDEX idx_sms_messages_customer_phone ON sms_messages(customer_phone);
CREATE INDEX idx_sms_messages_direction ON sms_messages(direction);
CREATE INDEX idx_sms_messages_status ON sms_messages(status);
CREATE INDEX idx_sms_messages_created_at ON sms_messages(created_at DESC);
CREATE INDEX idx_sms_messages_provider ON sms_messages(provider);

-- Create RLS policies
ALTER TABLE sms_messages ENABLE ROW LEVEL SECURITY;

-- Admin can see all SMS messages
CREATE POLICY "Admin can view all SMS messages" ON sms_messages
  FOR SELECT
  USING (is_admin());

-- Admin can insert SMS messages
CREATE POLICY "Admin can insert SMS messages" ON sms_messages
  FOR INSERT
  WITH CHECK (is_admin());

-- Admin can update SMS messages
CREATE POLICY "Admin can update SMS messages" ON sms_messages
  FOR UPDATE
  USING (is_admin());

-- Service role can do everything
CREATE POLICY "Service role has full access" ON sms_messages
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Create updated_at trigger
CREATE TRIGGER update_sms_messages_updated_at
  BEFORE UPDATE ON sms_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create function to get SMS statistics
CREATE OR REPLACE FUNCTION get_sms_statistics()
RETURNS TABLE (
  total_sent BIGINT,
  total_received BIGINT,
  total_failed BIGINT,
  sent_today BIGINT,
  received_today BIGINT,
  credits_used_today BIGINT,
  provider_stats JSONB
) AS $$
BEGIN
  RETURN QUERY
  WITH stats AS (
    SELECT
      COUNT(*) FILTER (WHERE direction = 'sent' AND status IN ('sent', 'delivered')) as total_sent,
      COUNT(*) FILTER (WHERE direction = 'received') as total_received,
      COUNT(*) FILTER (WHERE status = 'failed') as total_failed,
      COUNT(*) FILTER (WHERE direction = 'sent' AND status IN ('sent', 'delivered') AND created_at >= CURRENT_DATE) as sent_today,
      COUNT(*) FILTER (WHERE direction = 'received' AND created_at >= CURRENT_DATE) as received_today,
      COALESCE(SUM(credits_used) FILTER (WHERE created_at >= CURRENT_DATE), 0) as credits_used_today
    FROM sms_messages
  ),
  provider_counts AS (
    SELECT jsonb_object_agg(provider, cnt) as provider_stats
    FROM (
      SELECT provider, COUNT(*) as cnt
      FROM sms_messages
      WHERE provider IS NOT NULL
      GROUP BY provider
    ) t
  )
  SELECT 
    stats.total_sent,
    stats.total_received,
    stats.total_failed,
    stats.sent_today,
    stats.received_today,
    stats.credits_used_today,
    COALESCE(provider_counts.provider_stats, '{}'::jsonb) as provider_stats
  FROM stats, provider_counts;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;