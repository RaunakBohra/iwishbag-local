-- Create SLA functions for real data integration
-- This migration creates SLA calculation functions that work with existing support_system table

-- Create SLA policies table if it doesn't exist
CREATE TABLE IF NOT EXISTS sla_policies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  priority TEXT NOT NULL CHECK (priority IN ('urgent', 'high', 'medium', 'low')),
  response_time_hours INTEGER NOT NULL DEFAULT 24,
  resolution_time_hours INTEGER NOT NULL DEFAULT 72,
  business_hours_only BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(priority)
);

-- Insert default SLA policies
INSERT INTO sla_policies (priority, response_time_hours, resolution_time_hours, business_hours_only) 
VALUES 
  ('urgent', 1, 4, true),
  ('high', 4, 24, true), 
  ('medium', 8, 48, true),
  ('low', 24, 72, true)
ON CONFLICT (priority) DO NOTHING;

-- Function to get SLA summary with real data from support_system table
CREATE OR REPLACE FUNCTION get_sla_summary()
RETURNS JSON AS $$
DECLARE
  result JSON;
  total_tickets INTEGER;
  avg_response_hours NUMERIC;
  avg_resolution_hours NUMERIC;
BEGIN
  -- Get total tickets
  SELECT COUNT(*) INTO total_tickets
  FROM support_system
  WHERE ticket_data->>'status' NOT IN ('spam', 'deleted');
  
  -- Calculate average response time (time to first reply)
  SELECT COALESCE(AVG(
    EXTRACT(EPOCH FROM (
      (SELECT MIN(si.created_at) 
       FROM support_interactions si 
       WHERE si.support_system_id = s.id 
       AND si.interaction_type = 'reply'
       AND si.is_from_admin = true
      ) - s.created_at
    )) / 3600.0
  ), 0) INTO avg_response_hours
  FROM support_system s
  WHERE ticket_data->>'status' NOT IN ('spam', 'deleted');
  
  -- Calculate average resolution time for resolved tickets
  SELECT COALESCE(AVG(
    EXTRACT(EPOCH FROM (s.updated_at - s.created_at)) / 3600.0
  ), 0) INTO avg_resolution_hours
  FROM support_system s
  WHERE ticket_data->>'status' IN ('resolved', 'closed');
  
  -- Build result JSON
  result := json_build_object(
    'total_tickets', total_tickets,
    'response_sla_met', COALESCE((
      SELECT COUNT(*)
      FROM support_system s
      WHERE EXISTS (
        SELECT 1 FROM support_interactions si 
        WHERE si.support_system_id = s.id 
        AND si.is_from_admin = true
        AND si.created_at <= s.created_at + INTERVAL '24 hours'
      )
      AND ticket_data->>'status' NOT IN ('spam', 'deleted')
    ), 0),
    'response_sla_breached', COALESCE((
      SELECT COUNT(*)
      FROM support_system s
      WHERE NOT EXISTS (
        SELECT 1 FROM support_interactions si 
        WHERE si.support_system_id = s.id 
        AND si.is_from_admin = true
        AND si.created_at <= s.created_at + INTERVAL '24 hours'
      )
      AND ticket_data->>'status' NOT IN ('spam', 'deleted', 'resolved', 'closed')
      AND s.created_at < NOW() - INTERVAL '24 hours'
    ), 0),
    'resolution_sla_met', COALESCE((
      SELECT COUNT(*)
      FROM support_system s
      WHERE ticket_data->>'status' IN ('resolved', 'closed')
      AND s.updated_at <= s.created_at + INTERVAL '72 hours'
    ), 0),
    'resolution_sla_breached', COALESCE((
      SELECT COUNT(*)
      FROM support_system s
      WHERE ticket_data->>'status' NOT IN ('resolved', 'closed', 'spam', 'deleted')
      AND s.created_at < NOW() - INTERVAL '72 hours'
    ), 0),
    'avg_response_time_hours', ROUND(avg_response_hours, 2),
    'avg_resolution_time_hours', ROUND(avg_resolution_hours, 2)
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update SLA breach flags (simplified for existing schema)
CREATE OR REPLACE FUNCTION update_sla_breach_flags()
RETURNS INTEGER AS $$
DECLARE
  breach_count INTEGER := 0;
BEGIN
  -- This is a simplified version since we don't have breach flags in current schema
  -- Just return count of potentially breached tickets
  SELECT COUNT(*) INTO breach_count
  FROM support_system
  WHERE ticket_data->>'status' NOT IN ('resolved', 'closed', 'spam', 'deleted')
  AND created_at < NOW() - INTERVAL '24 hours';
  
  RETURN breach_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_sla_summary() TO authenticated;
GRANT EXECUTE ON FUNCTION update_sla_breach_flags() TO authenticated;

-- Grant read access to sla_policies
GRANT SELECT ON sla_policies TO authenticated;