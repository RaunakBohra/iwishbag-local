-- ============================================================================
-- SLA TIME TRACKING SYSTEM
-- Adds fields to support tickets for tracking response and resolution SLA
-- ============================================================================

-- Add SLA tracking fields to support_tickets table
ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS response_sla_deadline TIMESTAMP WITH TIME ZONE;
ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS resolution_sla_deadline TIMESTAMP WITH TIME ZONE;
ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS first_response_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS sla_breach_flags JSONB DEFAULT '{
  "response_breach": false,
  "resolution_breach": false
}'::jsonb;

-- Create indexes for SLA queries
CREATE INDEX IF NOT EXISTS idx_support_tickets_response_sla ON support_tickets(response_sla_deadline) WHERE response_sla_deadline IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_support_tickets_resolution_sla ON support_tickets(resolution_sla_deadline) WHERE resolution_sla_deadline IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_support_tickets_first_response ON support_tickets(first_response_at) WHERE first_response_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_support_tickets_resolved_at ON support_tickets(resolved_at) WHERE resolved_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_support_tickets_sla_breach ON support_tickets USING GIN (sla_breach_flags);

-- Create SLA configuration table
CREATE TABLE IF NOT EXISTS sla_policies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  priority VARCHAR(20) NOT NULL,
  response_time_hours INTEGER NOT NULL,
  resolution_time_hours INTEGER NOT NULL,
  business_hours_only BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  
  UNIQUE(priority)
);

-- Enable RLS on sla_policies
ALTER TABLE sla_policies ENABLE ROW LEVEL SECURITY;

-- RLS Policies for SLA configuration (admin only)
CREATE POLICY "Admins can manage SLA policies" ON sla_policies
  FOR ALL USING (is_admin());

-- Insert default SLA policies based on priority
INSERT INTO sla_policies (priority, response_time_hours, resolution_time_hours, business_hours_only) VALUES
  ('urgent', 1, 4, true),     -- Urgent: 1h response, 4h resolution
  ('high', 4, 24, true),      -- High: 4h response, 24h resolution  
  ('medium', 8, 48, true),    -- Medium: 8h response, 48h resolution
  ('low', 24, 72, true)       -- Low: 24h response, 72h resolution
ON CONFLICT (priority) DO NOTHING;

-- Function to calculate SLA deadline in business hours
CREATE OR REPLACE FUNCTION calculate_sla_deadline(
  start_time TIMESTAMP WITH TIME ZONE,
  hours_to_add INTEGER,
  business_hours_only BOOLEAN DEFAULT true
) RETURNS TIMESTAMP WITH TIME ZONE AS $$
DECLARE
  result_time TIMESTAMP WITH TIME ZONE;
  remaining_hours INTEGER := hours_to_add;
  current_time TIMESTAMP WITH TIME ZONE := start_time;
  business_start_hour INTEGER := 10; -- 10 AM
  business_end_hour INTEGER := 17;   -- 5 PM
  current_hour INTEGER;
  current_day INTEGER;
BEGIN
  -- If not business hours only, just add the hours directly
  IF NOT business_hours_only THEN
    RETURN start_time + (hours_to_add || ' hours')::INTERVAL;
  END IF;
  
  -- Calculate deadline considering business hours (Mon-Fri 10 AM - 5 PM)
  WHILE remaining_hours > 0 LOOP
    current_hour := EXTRACT(HOUR FROM current_time AT TIME ZONE 'Asia/Kolkata');
    current_day := EXTRACT(DOW FROM current_time AT TIME ZONE 'Asia/Kolkata'); -- 0=Sunday, 1=Monday, ..., 6=Saturday
    
    -- Skip weekends (Saturday=6, Sunday=0)
    IF current_day = 0 OR current_day = 6 THEN
      -- Move to next Monday 10 AM
      current_time := date_trunc('week', current_time AT TIME ZONE 'Asia/Kolkata') + INTERVAL '1 week' + INTERVAL '1 day' + INTERVAL '10 hours';
      current_time := current_time AT TIME ZONE 'Asia/Kolkata';
      CONTINUE;
    END IF;
    
    -- If before business hours, move to business start
    IF current_hour < business_start_hour THEN
      current_time := date_trunc('day', current_time AT TIME ZONE 'Asia/Kolkata') + (business_start_hour || ' hours')::INTERVAL;
      current_time := current_time AT TIME ZONE 'Asia/Kolkata';
      current_hour := business_start_hour;
    END IF;
    
    -- If after business hours, move to next business day start
    IF current_hour >= business_end_hour THEN
      current_time := date_trunc('day', current_time AT TIME ZONE 'Asia/Kolkata') + INTERVAL '1 day' + (business_start_hour || ' hours')::INTERVAL;
      current_time := current_time AT TIME ZONE 'Asia/Kolkata';
      CONTINUE;
    END IF;
    
    -- Calculate hours available in current business day
    DECLARE
      hours_left_today INTEGER := business_end_hour - current_hour;
      hours_to_use INTEGER := LEAST(remaining_hours, hours_left_today);
    BEGIN
      current_time := current_time + (hours_to_use || ' hours')::INTERVAL;
      remaining_hours := remaining_hours - hours_to_use;
      
      -- If we've used all remaining hours, we're done
      IF remaining_hours <= 0 THEN
        result_time := current_time;
        EXIT;
      END IF;
      
      -- Move to next business day
      current_time := date_trunc('day', current_time AT TIME ZONE 'Asia/Kolkata') + INTERVAL '1 day' + (business_start_hour || ' hours')::INTERVAL;
      current_time := current_time AT TIME ZONE 'Asia/Kolkata';
    END;
  END LOOP;
  
  RETURN result_time;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate and update SLA deadlines for a ticket
CREATE OR REPLACE FUNCTION update_ticket_sla_deadlines(ticket_id UUID)
RETURNS VOID AS $$
DECLARE
  ticket_record RECORD;
  sla_policy RECORD;
  response_deadline TIMESTAMP WITH TIME ZONE;
  resolution_deadline TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Get ticket details
  SELECT * INTO ticket_record FROM support_tickets WHERE id = ticket_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ticket not found: %', ticket_id;
  END IF;
  
  -- Get SLA policy for ticket priority
  SELECT * INTO sla_policy FROM sla_policies WHERE priority = ticket_record.priority;
  
  IF NOT FOUND THEN
    RAISE NOTICE 'No SLA policy found for priority: %, using default', ticket_record.priority;
    -- Use default medium priority SLA
    SELECT * INTO sla_policy FROM sla_policies WHERE priority = 'medium';
  END IF;
  
  -- Calculate response SLA deadline (only if not already responded)
  IF ticket_record.first_response_at IS NULL THEN
    response_deadline := calculate_sla_deadline(
      ticket_record.created_at,
      sla_policy.response_time_hours,
      sla_policy.business_hours_only
    );
  END IF;
  
  -- Calculate resolution SLA deadline (only if not already resolved)
  IF ticket_record.status NOT IN ('resolved', 'closed') THEN
    resolution_deadline := calculate_sla_deadline(
      ticket_record.created_at,
      sla_policy.resolution_time_hours,
      sla_policy.business_hours_only
    );
  END IF;
  
  -- Update ticket with SLA deadlines
  UPDATE support_tickets 
  SET 
    response_sla_deadline = response_deadline,
    resolution_sla_deadline = resolution_deadline,
    updated_at = NOW()
  WHERE id = ticket_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark first response time
CREATE OR REPLACE FUNCTION mark_ticket_first_response(ticket_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE support_tickets 
  SET 
    first_response_at = COALESCE(first_response_at, NOW()),
    updated_at = NOW()
  WHERE id = ticket_id AND first_response_at IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark ticket resolved
CREATE OR REPLACE FUNCTION mark_ticket_resolved(ticket_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE support_tickets 
  SET 
    resolved_at = COALESCE(resolved_at, NOW()),
    resolution_sla_deadline = NULL, -- Clear resolution SLA once resolved
    updated_at = NOW()
  WHERE id = ticket_id AND status = 'resolved' AND resolved_at IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check and update SLA breach flags
CREATE OR REPLACE FUNCTION update_sla_breach_flags()
RETURNS INTEGER AS $$
DECLARE
  breach_count INTEGER := 0;
BEGIN
  -- Update response SLA breaches
  UPDATE support_tickets 
  SET sla_breach_flags = sla_breach_flags || jsonb_build_object('response_breach', true)
  WHERE 
    first_response_at IS NULL 
    AND response_sla_deadline IS NOT NULL 
    AND NOW() > response_sla_deadline
    AND (sla_breach_flags->>'response_breach')::boolean IS NOT TRUE;
  
  GET DIAGNOSTICS breach_count = ROW_COUNT;
  
  -- Update resolution SLA breaches
  UPDATE support_tickets 
  SET sla_breach_flags = sla_breach_flags || jsonb_build_object('resolution_breach', true)
  WHERE 
    status NOT IN ('resolved', 'closed')
    AND resolution_sla_deadline IS NOT NULL 
    AND NOW() > resolution_sla_deadline
    AND (sla_breach_flags->>'resolution_breach')::boolean IS NOT TRUE;
  
  GET DIAGNOSTICS breach_count = breach_count + ROW_COUNT;
  
  RETURN breach_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update timestamp trigger for sla_policies
CREATE TRIGGER update_sla_policies_updated_at
  BEFORE UPDATE ON sla_policies
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger to automatically calculate SLA deadlines on ticket creation
CREATE OR REPLACE FUNCTION trigger_calculate_sla_deadlines()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate SLA deadlines for new ticket
  PERFORM update_ticket_sla_deadlines(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to support_tickets table
CREATE TRIGGER calculate_sla_deadlines_trigger
  AFTER INSERT ON support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION trigger_calculate_sla_deadlines();

-- Trigger to mark first response and update SLA when replies are created
CREATE OR REPLACE FUNCTION trigger_mark_first_response()
RETURNS TRIGGER AS $$
DECLARE
  ticket_record RECORD;
BEGIN
  -- Get ticket details
  SELECT * INTO ticket_record FROM support_tickets WHERE id = NEW.ticket_id;
  
  -- Only mark first response if this reply is from someone other than the ticket creator
  -- and it's not an internal note
  IF ticket_record.user_id != NEW.user_id AND (NEW.is_internal IS FALSE OR NEW.is_internal IS NULL) THEN
    PERFORM mark_ticket_first_response(NEW.ticket_id);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to ticket_replies table
CREATE TRIGGER mark_first_response_trigger
  AFTER INSERT ON ticket_replies
  FOR EACH ROW
  EXECUTE FUNCTION trigger_mark_first_response();

-- Trigger to mark resolved time when status changes
CREATE OR REPLACE FUNCTION trigger_mark_resolved()
RETURNS TRIGGER AS $$
BEGIN
  -- If status changed to resolved, mark resolved time
  IF OLD.status != 'resolved' AND NEW.status = 'resolved' THEN
    PERFORM mark_ticket_resolved(NEW.id);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to support_tickets table for status changes
CREATE TRIGGER mark_resolved_trigger
  AFTER UPDATE ON support_tickets
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION trigger_mark_resolved();

-- Update existing tickets with SLA deadlines (run once)
DO $$
DECLARE
  ticket_record RECORD;
BEGIN
  FOR ticket_record IN 
    SELECT id FROM support_tickets 
    WHERE response_sla_deadline IS NULL OR resolution_sla_deadline IS NULL
  LOOP
    PERFORM update_ticket_sla_deadlines(ticket_record.id);
  END LOOP;
END $$;

-- Comments
COMMENT ON COLUMN support_tickets.response_sla_deadline IS 'Deadline for first response based on SLA policy';
COMMENT ON COLUMN support_tickets.resolution_sla_deadline IS 'Deadline for resolution based on SLA policy';
COMMENT ON COLUMN support_tickets.first_response_at IS 'Timestamp when first response was provided by support team';
COMMENT ON COLUMN support_tickets.resolved_at IS 'Timestamp when ticket was marked as resolved';
COMMENT ON COLUMN support_tickets.sla_breach_flags IS 'JSON flags indicating SLA breaches';
COMMENT ON TABLE sla_policies IS 'SLA time limits by priority level';
COMMENT ON FUNCTION calculate_sla_deadline IS 'Calculate SLA deadline considering business hours';
COMMENT ON FUNCTION update_ticket_sla_deadlines IS 'Update SLA deadlines for a ticket based on priority';
COMMENT ON FUNCTION update_sla_breach_flags IS 'Check and flag SLA breaches for monitoring';