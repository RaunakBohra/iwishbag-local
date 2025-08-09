-- Add SLA tracking and customer satisfaction features
-- This migration adds comprehensive SLA metrics and satisfaction tracking

-- Add SLA tracking fields to support_system table
ALTER TABLE support_system 
ADD COLUMN IF NOT EXISTS first_response_at TIMESTAMPTZ DEFAULT NULL,
ADD COLUMN IF NOT EXISTS resolution_time_minutes INTEGER DEFAULT NULL,
ADD COLUMN IF NOT EXISTS first_response_time_minutes INTEGER DEFAULT NULL,
ADD COLUMN IF NOT EXISTS sla_status VARCHAR(20) DEFAULT 'on_track' CHECK (sla_status IN ('on_track', 'approaching_deadline', 'overdue')),
ADD COLUMN IF NOT EXISTS sla_breach_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS response_sla_target_minutes INTEGER DEFAULT 240, -- 4 hours default
ADD COLUMN IF NOT EXISTS resolution_sla_target_minutes INTEGER DEFAULT 2880; -- 48 hours default

-- Create customer satisfaction surveys table
CREATE TABLE IF NOT EXISTS customer_satisfaction_surveys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES support_system(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  overall_rating INTEGER NOT NULL CHECK (overall_rating BETWEEN 1 AND 5),
  response_time_rating INTEGER NOT NULL CHECK (response_time_rating BETWEEN 1 AND 5),
  resolution_quality_rating INTEGER NOT NULL CHECK (resolution_quality_rating BETWEEN 1 AND 5),
  agent_helpfulness_rating INTEGER NOT NULL CHECK (agent_helpfulness_rating BETWEEN 1 AND 5),
  would_recommend BOOLEAN DEFAULT NULL,
  feedback_text TEXT,
  improvement_suggestions TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure one survey per ticket per user
  UNIQUE(ticket_id, user_id)
);

-- Create SLA configuration table for different priority levels
CREATE TABLE IF NOT EXISTS sla_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  priority VARCHAR(10) NOT NULL UNIQUE CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  first_response_target_minutes INTEGER NOT NULL,
  resolution_target_minutes INTEGER NOT NULL,
  escalation_threshold_minutes INTEGER DEFAULT NULL,
  business_hours_only BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default SLA configurations
INSERT INTO sla_configurations (priority, first_response_target_minutes, resolution_target_minutes, escalation_threshold_minutes) VALUES
('urgent', 60, 480, 30),      -- 1 hour response, 8 hours resolution, escalate after 30 min
('high', 240, 1440, 120),     -- 4 hours response, 24 hours resolution, escalate after 2 hours
('medium', 480, 2880, 240),   -- 8 hours response, 48 hours resolution, escalate after 4 hours
('low', 1440, 5760, 720)      -- 24 hours response, 96 hours resolution, escalate after 12 hours
ON CONFLICT (priority) DO NOTHING;

-- Function to calculate SLA metrics for a ticket
CREATE OR REPLACE FUNCTION calculate_ticket_sla_metrics(p_ticket_id UUID)
RETURNS TABLE (
  ticket_id UUID,
  first_response_time_minutes INTEGER,
  total_response_time_minutes INTEGER,
  resolution_time_minutes INTEGER,
  sla_status TEXT,
  response_sla_met BOOLEAN,
  resolution_sla_met BOOLEAN
) AS $$
DECLARE
  ticket_record RECORD;
  sla_config RECORD;
  first_reply_time TIMESTAMPTZ;
  resolution_time TIMESTAMPTZ;
BEGIN
  -- Get ticket details
  SELECT * INTO ticket_record
  FROM support_system s
  WHERE s.id = p_ticket_id;
  
  IF NOT FOUND THEN
    RETURN;
  END IF;
  
  -- Get SLA configuration for this priority
  SELECT * INTO sla_config
  FROM sla_configurations
  WHERE priority = ticket_record.priority;
  
  -- Get first admin response time
  SELECT MIN(created_at) INTO first_reply_time
  FROM support_interactions si
  JOIN user_roles ur ON si.user_id = ur.user_id
  WHERE si.support_id = p_ticket_id
  AND si.interaction_type = 'reply'
  AND ur.role IN ('admin', 'moderator');
  
  -- Get resolution time (when ticket was marked as resolved/closed)
  SELECT created_at INTO resolution_time
  FROM support_interactions
  WHERE support_id = p_ticket_id
  AND interaction_type = 'status_change'
  AND content->>'new_status' IN ('resolved', 'closed')
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- If no status change found, use updated_at if ticket is resolved/closed
  IF resolution_time IS NULL AND ticket_record.status IN ('resolved', 'closed') THEN
    resolution_time = ticket_record.updated_at;
  END IF;
  
  -- Calculate metrics
  RETURN QUERY SELECT
    p_ticket_id,
    CASE 
      WHEN first_reply_time IS NOT NULL THEN 
        EXTRACT(EPOCH FROM (first_reply_time - ticket_record.created_at)) / 60
      ELSE NULL 
    END::INTEGER,
    CASE 
      WHEN first_reply_time IS NOT NULL THEN 
        EXTRACT(EPOCH FROM (COALESCE(resolution_time, NOW()) - ticket_record.created_at)) / 60
      ELSE NULL 
    END::INTEGER,
    CASE 
      WHEN resolution_time IS NOT NULL THEN 
        EXTRACT(EPOCH FROM (resolution_time - ticket_record.created_at)) / 60
      ELSE NULL 
    END::INTEGER,
    CASE
      WHEN ticket_record.status IN ('resolved', 'closed') THEN 'completed'
      WHEN first_reply_time IS NULL AND 
           EXTRACT(EPOCH FROM (NOW() - ticket_record.created_at)) / 60 > sla_config.first_response_target_minutes THEN 'overdue'
      WHEN first_reply_time IS NULL AND 
           EXTRACT(EPOCH FROM (NOW() - ticket_record.created_at)) / 60 > (sla_config.first_response_target_minutes * 0.8) THEN 'approaching_deadline'
      ELSE 'on_track'
    END,
    CASE 
      WHEN first_reply_time IS NOT NULL THEN
        EXTRACT(EPOCH FROM (first_reply_time - ticket_record.created_at)) / 60 <= sla_config.first_response_target_minutes
      ELSE FALSE
    END,
    CASE 
      WHEN resolution_time IS NOT NULL THEN
        EXTRACT(EPOCH FROM (resolution_time - ticket_record.created_at)) / 60 <= sla_config.resolution_target_minutes
      ELSE FALSE
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get SLA dashboard metrics
CREATE OR REPLACE FUNCTION get_sla_dashboard_metrics()
RETURNS TABLE (
  total_tickets INTEGER,
  tickets_on_track INTEGER,
  tickets_approaching_deadline INTEGER,
  tickets_overdue INTEGER,
  avg_first_response_minutes NUMERIC,
  avg_resolution_minutes NUMERIC,
  response_sla_compliance_rate NUMERIC,
  resolution_sla_compliance_rate NUMERIC,
  customer_satisfaction_avg NUMERIC,
  customer_satisfaction_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  WITH ticket_metrics AS (
    SELECT 
      s.*,
      sla.first_response_target_minutes,
      sla.resolution_target_minutes,
      (SELECT MIN(created_at) FROM support_interactions si 
       JOIN user_roles ur ON si.user_id = ur.user_id
       WHERE si.support_id = s.id AND si.interaction_type = 'reply' 
       AND ur.role IN ('admin', 'moderator')) as first_response_time,
      CASE 
        WHEN s.status IN ('resolved', 'closed') THEN s.updated_at
        ELSE NULL 
      END as resolution_time
    FROM support_system s
    LEFT JOIN sla_configurations sla ON s.priority = sla.priority
    WHERE s.created_at >= NOW() - INTERVAL '30 days' -- Last 30 days
  ),
  sla_status AS (
    SELECT 
      *,
      CASE
        WHEN status IN ('resolved', 'closed') THEN 'completed'
        WHEN first_response_time IS NULL AND 
             EXTRACT(EPOCH FROM (NOW() - created_at)) / 60 > first_response_target_minutes THEN 'overdue'
        WHEN first_response_time IS NULL AND 
             EXTRACT(EPOCH FROM (NOW() - created_at)) / 60 > (first_response_target_minutes * 0.8) THEN 'approaching_deadline'
        ELSE 'on_track'
      END as current_sla_status,
      CASE 
        WHEN first_response_time IS NOT NULL THEN
          EXTRACT(EPOCH FROM (first_response_time - created_at)) / 60 <= first_response_target_minutes
        ELSE FALSE
      END as response_sla_met,
      CASE 
        WHEN resolution_time IS NOT NULL THEN
          EXTRACT(EPOCH FROM (resolution_time - created_at)) / 60 <= resolution_target_minutes
        ELSE FALSE
      END as resolution_sla_met,
      CASE 
        WHEN first_response_time IS NOT NULL THEN
          EXTRACT(EPOCH FROM (first_response_time - created_at)) / 60
        ELSE NULL
      END as response_minutes,
      CASE 
        WHEN resolution_time IS NOT NULL THEN
          EXTRACT(EPOCH FROM (resolution_time - created_at)) / 60
        ELSE NULL
      END as total_resolution_minutes
    FROM ticket_metrics
  )
  SELECT 
    COUNT(*)::INTEGER,
    COUNT(CASE WHEN current_sla_status = 'on_track' THEN 1 END)::INTEGER,
    COUNT(CASE WHEN current_sla_status = 'approaching_deadline' THEN 1 END)::INTEGER,
    COUNT(CASE WHEN current_sla_status = 'overdue' THEN 1 END)::INTEGER,
    AVG(response_minutes)::NUMERIC,
    AVG(total_resolution_minutes)::NUMERIC,
    CASE WHEN COUNT(*) > 0 THEN 
      (COUNT(CASE WHEN response_sla_met THEN 1 END) * 100.0 / COUNT(*))::NUMERIC 
    ELSE 0 END,
    CASE WHEN COUNT(CASE WHEN resolution_time IS NOT NULL THEN 1 END) > 0 THEN
      (COUNT(CASE WHEN resolution_sla_met THEN 1 END) * 100.0 / COUNT(CASE WHEN resolution_time IS NOT NULL THEN 1 END))::NUMERIC
    ELSE 0 END,
    (SELECT AVG(overall_rating) FROM customer_satisfaction_surveys 
     WHERE created_at >= NOW() - INTERVAL '30 days')::NUMERIC,
    (SELECT COUNT(*) FROM customer_satisfaction_surveys 
     WHERE created_at >= NOW() - INTERVAL '30 days')::INTEGER
  FROM sla_status;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to automatically update SLA status when tickets are updated
CREATE OR REPLACE FUNCTION update_ticket_sla_status()
RETURNS TRIGGER AS $$
DECLARE
  sla_metrics RECORD;
BEGIN
  -- Calculate current SLA metrics for this ticket
  SELECT * INTO sla_metrics
  FROM calculate_ticket_sla_metrics(NEW.id)
  LIMIT 1;
  
  -- Update the ticket with calculated SLA data
  UPDATE support_system
  SET 
    first_response_time_minutes = sla_metrics.first_response_time_minutes,
    resolution_time_minutes = sla_metrics.resolution_time_minutes,
    sla_status = sla_metrics.sla_status,
    updated_at = NOW()
  WHERE id = NEW.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic SLA updates
DROP TRIGGER IF EXISTS trigger_update_sla_status ON support_system;
CREATE TRIGGER trigger_update_sla_status
  AFTER UPDATE ON support_system
  FOR EACH ROW
  EXECUTE FUNCTION update_ticket_sla_status();

-- Trigger to update SLA when new interactions are added
CREATE OR REPLACE FUNCTION update_sla_on_interaction()
RETURNS TRIGGER AS $$
DECLARE
  is_first_admin_response BOOLEAN := FALSE;
BEGIN
  -- Check if this is the first admin response
  IF NEW.interaction_type = 'reply' THEN
    SELECT NOT EXISTS (
      SELECT 1 FROM support_interactions si
      JOIN user_roles ur ON si.user_id = ur.user_id
      WHERE si.support_id = NEW.support_id
      AND si.interaction_type = 'reply'
      AND ur.role IN ('admin', 'moderator')
      AND si.id != NEW.id
    ) INTO is_first_admin_response
    FROM user_roles ur2
    WHERE ur2.user_id = NEW.user_id AND ur2.role IN ('admin', 'moderator');
    
    -- Update first_response_at if this is the first admin response
    IF is_first_admin_response THEN
      UPDATE support_system
      SET first_response_at = NEW.created_at
      WHERE id = NEW.support_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for SLA updates on interactions
DROP TRIGGER IF EXISTS trigger_update_sla_on_interaction ON support_interactions;
CREATE TRIGGER trigger_update_sla_on_interaction
  AFTER INSERT ON support_interactions
  FOR EACH ROW
  EXECUTE FUNCTION update_sla_on_interaction();

-- RLS Policies for customer satisfaction surveys
ALTER TABLE customer_satisfaction_surveys ENABLE ROW LEVEL SECURITY;

-- Users can only see their own surveys
CREATE POLICY "Users can view own satisfaction surveys"
  ON customer_satisfaction_surveys FOR SELECT
  USING (auth.uid() = user_id);

-- Users can only create surveys for their own tickets
CREATE POLICY "Users can create satisfaction surveys for own tickets"
  ON customer_satisfaction_surveys FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND 
    EXISTS (SELECT 1 FROM support_system WHERE id = ticket_id AND user_id = auth.uid())
  );

-- Users can update their own surveys
CREATE POLICY "Users can update own satisfaction surveys"
  ON customer_satisfaction_surveys FOR UPDATE
  USING (auth.uid() = user_id);

-- Admins can view all surveys
CREATE POLICY "Admins can view all satisfaction surveys"
  ON customer_satisfaction_surveys FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'moderator')
    )
  );

-- Grant permissions
GRANT ALL ON customer_satisfaction_surveys TO authenticated;
GRANT ALL ON sla_configurations TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_ticket_sla_metrics(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_sla_dashboard_metrics() TO authenticated;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_support_system_sla_status ON support_system(sla_status);
CREATE INDEX IF NOT EXISTS idx_support_system_priority_created ON support_system(priority, created_at);
CREATE INDEX IF NOT EXISTS idx_support_system_first_response_at ON support_system(first_response_at);
CREATE INDEX IF NOT EXISTS idx_customer_satisfaction_surveys_ticket_id ON customer_satisfaction_surveys(ticket_id);
CREATE INDEX IF NOT EXISTS idx_customer_satisfaction_surveys_rating ON customer_satisfaction_surveys(overall_rating, created_at);