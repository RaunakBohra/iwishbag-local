-- Set up automated quote management
-- This includes expiry checking and reminder scheduling

-- Function to check and mark expired quotes
CREATE OR REPLACE FUNCTION check_expired_quotes()
RETURNS INTEGER AS $$
DECLARE
  expired_count INTEGER;
BEGIN
  UPDATE quotes_v2
  SET status = 'expired'
  WHERE expires_at IS NOT NULL
    AND expires_at < NOW()
    AND status IN ('sent', 'viewed')
    AND converted_to_order_id IS NULL;
  
  GET DIAGNOSTICS expired_count = ROW_COUNT;
  
  RETURN expired_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get quotes needing reminders
CREATE OR REPLACE FUNCTION get_quotes_needing_reminders()
RETURNS TABLE (
  id UUID,
  customer_email TEXT,
  customer_name TEXT,
  quote_number TEXT,
  reminder_count INTEGER,
  last_reminder_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  share_token TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    q.id,
    q.customer_email,
    q.customer_name,
    q.quote_number,
    q.reminder_count,
    q.last_reminder_at,
    q.created_at,
    q.share_token
  FROM quotes_v2 q
  WHERE q.status = 'sent'
    AND q.reminder_count < 3
    AND q.created_at < NOW() - INTERVAL '2 days'
    AND (
      q.last_reminder_at IS NULL 
      OR q.last_reminder_at < NOW() - INTERVAL '3 days'
    )
    AND q.converted_to_order_id IS NULL
    AND q.expires_at > NOW() -- Don't send reminders for expired quotes
  ORDER BY q.created_at ASC
  LIMIT 50; -- Process in batches
END;
$$ LANGUAGE plpgsql;

-- Create a function to run daily maintenance
CREATE OR REPLACE FUNCTION daily_quote_maintenance()
RETURNS JSON AS $$
DECLARE
  expired_count INTEGER;
  reminder_candidates INTEGER;
  result JSON;
BEGIN
  -- Check expired quotes
  expired_count := check_expired_quotes();
  
  -- Count quotes needing reminders
  SELECT COUNT(*) INTO reminder_candidates
  FROM get_quotes_needing_reminders();
  
  -- Build result
  result := json_build_object(
    'timestamp', NOW(),
    'expired_quotes_marked', expired_count,
    'quotes_needing_reminders', reminder_candidates
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION check_expired_quotes() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_quotes_needing_reminders() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION daily_quote_maintenance() TO authenticated, service_role;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_quotes_v2_reminder_check 
ON quotes_v2(status, reminder_count, created_at, last_reminder_at) 
WHERE status = 'sent' AND converted_to_order_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_quotes_v2_expiry_check 
ON quotes_v2(expires_at, status) 
WHERE expires_at IS NOT NULL AND status IN ('sent', 'viewed');

-- Example cron job setup (to be configured in Supabase dashboard)
-- This would run daily at 9 AM UTC
COMMENT ON FUNCTION daily_quote_maintenance() IS 
'Run daily at 9 AM UTC via pg_cron:
SELECT cron.schedule(
  ''daily-quote-maintenance'',
  ''0 9 * * *'',
  $$SELECT daily_quote_maintenance();$$
);';