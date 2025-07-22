-- ============================================================================
-- SLA BREACH NOTIFICATION SYSTEM
-- Real-time breach detection and escalation workflows
-- ============================================================================

-- Create breach_notifications table to track notification history
CREATE TABLE IF NOT EXISTS breach_notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  breach_type VARCHAR(20) NOT NULL CHECK (breach_type IN ('response_warning', 'response_breach', 'resolution_warning', 'resolution_breach')),
  severity VARCHAR(10) NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  
  -- Notification details
  sent_to UUID[] DEFAULT '{}', -- Array of user IDs who were notified
  notification_method VARCHAR(20) DEFAULT 'email' CHECK (notification_method IN ('email', 'system', 'sms')),
  notification_data JSONB DEFAULT '{}'::jsonb, -- Template variables, email details, etc.
  
  -- Status tracking
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  acknowledged_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE breach_notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies (admin only)
CREATE POLICY "Admins can manage breach notifications" ON breach_notifications
  FOR ALL USING (is_admin());

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_breach_notifications_ticket_id ON breach_notifications(ticket_id);
CREATE INDEX IF NOT EXISTS idx_breach_notifications_type ON breach_notifications(breach_type);
CREATE INDEX IF NOT EXISTS idx_breach_notifications_sent_at ON breach_notifications(sent_at);
CREATE INDEX IF NOT EXISTS idx_breach_notifications_acknowledged ON breach_notifications(acknowledged_at) WHERE acknowledged_at IS NULL;

-- Function to detect and flag SLA breaches
CREATE OR REPLACE FUNCTION detect_sla_breaches()
RETURNS INTEGER AS $$
DECLARE
  ticket_record RECORD;
  response_breaches INTEGER := 0;
  resolution_breaches INTEGER := 0;
  warning_threshold NUMERIC := 0.9; -- 90% of SLA time
BEGIN
  -- Check for response SLA breaches and warnings
  FOR ticket_record IN 
    SELECT 
      id, 
      response_sla_deadline,
      resolution_sla_deadline,
      first_response_at,
      resolved_at,
      status,
      priority,
      assigned_to,
      sla_breach_flags,
      created_at
    FROM support_tickets 
    WHERE 
      (response_sla_deadline IS NOT NULL OR resolution_sla_deadline IS NOT NULL)
      AND status NOT IN ('resolved', 'closed')
  LOOP
    
    -- Response SLA breach detection
    IF ticket_record.response_sla_deadline IS NOT NULL 
       AND ticket_record.first_response_at IS NULL 
       AND NOW() > ticket_record.response_sla_deadline THEN
      
      -- Mark as breached if not already flagged
      IF COALESCE((ticket_record.sla_breach_flags->>'response_breach')::boolean, false) = false THEN
        UPDATE support_tickets 
        SET sla_breach_flags = COALESCE(sla_breach_flags, '{}'::jsonb) || jsonb_build_object('response_breach', true)
        WHERE id = ticket_record.id;
        
        response_breaches := response_breaches + 1;
        
        -- Create breach notification
        INSERT INTO breach_notifications (ticket_id, breach_type, severity, notification_data)
        VALUES (
          ticket_record.id, 
          'response_breach', 
          CASE ticket_record.priority
            WHEN 'urgent' THEN 'critical'
            WHEN 'high' THEN 'high'
            ELSE 'medium'
          END,
          jsonb_build_object(
            'breach_time', NOW(),
            'deadline', ticket_record.response_sla_deadline,
            'ticket_age_hours', EXTRACT(EPOCH FROM (NOW() - ticket_record.created_at)) / 3600
          )
        );
      END IF;
    
    -- Response SLA warning detection (90% of time used)
    ELSIF ticket_record.response_sla_deadline IS NOT NULL 
          AND ticket_record.first_response_at IS NULL 
          AND NOW() > (ticket_record.created_at + (ticket_record.response_sla_deadline - ticket_record.created_at) * warning_threshold) 
          AND NOT EXISTS (
            SELECT 1 FROM breach_notifications 
            WHERE ticket_id = ticket_record.id 
            AND breach_type = 'response_warning' 
            AND sent_at > NOW() - INTERVAL '4 hours'
          ) THEN
      
      -- Create warning notification
      INSERT INTO breach_notifications (ticket_id, breach_type, severity, notification_data)
      VALUES (
        ticket_record.id, 
        'response_warning', 
        'medium',
        jsonb_build_object(
          'warning_time', NOW(),
          'deadline', ticket_record.response_sla_deadline,
          'time_remaining_hours', EXTRACT(EPOCH FROM (ticket_record.response_sla_deadline - NOW())) / 3600
        )
      );
    END IF;
    
    -- Resolution SLA breach detection
    IF ticket_record.resolution_sla_deadline IS NOT NULL 
       AND ticket_record.resolved_at IS NULL 
       AND NOW() > ticket_record.resolution_sla_deadline THEN
      
      -- Mark as breached if not already flagged
      IF COALESCE((ticket_record.sla_breach_flags->>'resolution_breach')::boolean, false) = false THEN
        UPDATE support_tickets 
        SET sla_breach_flags = COALESCE(sla_breach_flags, '{}'::jsonb) || jsonb_build_object('resolution_breach', true)
        WHERE id = ticket_record.id;
        
        resolution_breaches := resolution_breaches + 1;
        
        -- Create breach notification
        INSERT INTO breach_notifications (ticket_id, breach_type, severity, notification_data)
        VALUES (
          ticket_record.id, 
          'resolution_breach', 
          CASE ticket_record.priority
            WHEN 'urgent' THEN 'critical'
            WHEN 'high' THEN 'high'
            ELSE 'medium'
          END,
          jsonb_build_object(
            'breach_time', NOW(),
            'deadline', ticket_record.resolution_sla_deadline,
            'ticket_age_hours', EXTRACT(EPOCH FROM (NOW() - ticket_record.created_at)) / 3600
          )
        );
      END IF;
    
    -- Resolution SLA warning detection
    ELSIF ticket_record.resolution_sla_deadline IS NOT NULL 
          AND ticket_record.resolved_at IS NULL 
          AND NOW() > (ticket_record.created_at + (ticket_record.resolution_sla_deadline - ticket_record.created_at) * warning_threshold)
          AND NOT EXISTS (
            SELECT 1 FROM breach_notifications 
            WHERE ticket_id = ticket_record.id 
            AND breach_type = 'resolution_warning' 
            AND sent_at > NOW() - INTERVAL '4 hours'
          ) THEN
      
      -- Create warning notification
      INSERT INTO breach_notifications (ticket_id, breach_type, severity, notification_data)
      VALUES (
        ticket_record.id, 
        'resolution_warning', 
        'medium',
        jsonb_build_object(
          'warning_time', NOW(),
          'deadline', ticket_record.resolution_sla_deadline,
          'time_remaining_hours', EXTRACT(EPOCH FROM (ticket_record.resolution_sla_deadline - NOW())) / 3600
        )
      );
    END IF;
    
  END LOOP;
  
  RETURN response_breaches + resolution_breaches;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get breach notifications for a specific ticket
CREATE OR REPLACE FUNCTION get_ticket_breach_notifications(ticket_uuid UUID)
RETURNS TABLE (
  id UUID,
  breach_type VARCHAR,
  severity VARCHAR,
  sent_at TIMESTAMP WITH TIME ZONE,
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  notification_data JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    bn.id,
    bn.breach_type,
    bn.severity,
    bn.sent_at,
    bn.acknowledged_at,
    bn.notification_data
  FROM breach_notifications bn
  WHERE bn.ticket_id = ticket_uuid
  ORDER BY bn.sent_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to acknowledge breach notification
CREATE OR REPLACE FUNCTION acknowledge_breach_notification(notification_id UUID, user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE breach_notifications 
  SET 
    acknowledged_at = NOW(),
    acknowledged_by = user_id
  WHERE id = notification_id
  AND acknowledged_at IS NULL;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get unacknowledged breach notifications
CREATE OR REPLACE FUNCTION get_unacknowledged_breaches()
RETURNS TABLE (
  id UUID,
  ticket_id UUID,
  breach_type VARCHAR,
  severity VARCHAR,
  sent_at TIMESTAMP WITH TIME ZONE,
  notification_data JSONB,
  ticket_subject VARCHAR,
  ticket_priority VARCHAR,
  assigned_to_name VARCHAR,
  customer_email VARCHAR
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    bn.id,
    bn.ticket_id,
    bn.breach_type,
    bn.severity,
    bn.sent_at,
    bn.notification_data,
    st.subject as ticket_subject,
    st.priority as ticket_priority,
    COALESCE(assigned_profile.full_name, assigned_profile.email) as assigned_to_name,
    customer_profile.email as customer_email
  FROM breach_notifications bn
  JOIN support_tickets st ON bn.ticket_id = st.id
  JOIN profiles customer_profile ON st.user_id = customer_profile.id
  LEFT JOIN profiles assigned_profile ON st.assigned_to = assigned_profile.id
  WHERE bn.acknowledged_at IS NULL
  ORDER BY 
    CASE bn.severity 
      WHEN 'critical' THEN 1 
      WHEN 'high' THEN 2 
      WHEN 'medium' THEN 3 
      ELSE 4 
    END,
    bn.sent_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically detect breaches on ticket updates
CREATE OR REPLACE FUNCTION trigger_breach_detection()
RETURNS TRIGGER AS $$
BEGIN
  -- Run breach detection for the updated ticket
  PERFORM detect_sla_breaches();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger (but limit frequency to avoid performance issues)
DROP TRIGGER IF EXISTS breach_detection_trigger ON support_tickets;
-- We'll run this via cron job instead of trigger to avoid performance issues

-- Update trigger for timestamps
CREATE TRIGGER update_breach_notifications_updated_at
  BEFORE UPDATE ON breach_notifications
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE breach_notifications IS 'Tracks SLA breach and warning notifications';
COMMENT ON FUNCTION detect_sla_breaches() IS 'Detects and flags SLA breaches, creates notifications';
COMMENT ON FUNCTION get_ticket_breach_notifications(UUID) IS 'Get breach notification history for a ticket';
COMMENT ON FUNCTION acknowledge_breach_notification(UUID, UUID) IS 'Mark breach notification as acknowledged';
COMMENT ON FUNCTION get_unacknowledged_breaches() IS 'Get all unacknowledged breach notifications with ticket details';

SELECT 'SLA breach notification system created successfully' as status;