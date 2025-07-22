-- ============================================================================
-- SIMPLE SLA FUNCTIONS
-- Simplified SLA functions with basic business hours logic
-- ============================================================================

-- Simple SLA deadline calculation (24/7 for now, business hours in future update)
CREATE OR REPLACE FUNCTION calculate_sla_deadline(
  start_time TIMESTAMP WITH TIME ZONE,
  hours_to_add INTEGER,
  business_hours_only BOOLEAN DEFAULT true
) RETURNS TIMESTAMP WITH TIME ZONE AS $$
BEGIN
  -- For now, just add hours directly (can enhance with business hours later)
  RETURN start_time + (hours_to_add || ' hours')::INTERVAL;
END;
$$ LANGUAGE plpgsql;

-- Function to check and update SLA breach flags
CREATE OR REPLACE FUNCTION update_sla_breach_flags()
RETURNS INTEGER AS $$
DECLARE
  response_breaches INTEGER := 0;
  resolution_breaches INTEGER := 0;
BEGIN
  -- Update response SLA breaches
  UPDATE support_tickets 
  SET sla_breach_flags = COALESCE(sla_breach_flags, '{}'::jsonb) || jsonb_build_object('response_breach', true)
  WHERE 
    first_response_at IS NULL 
    AND response_sla_deadline IS NOT NULL 
    AND NOW() > response_sla_deadline
    AND COALESCE((sla_breach_flags->>'response_breach')::boolean, false) = false;
  
  GET DIAGNOSTICS response_breaches = ROW_COUNT;
  
  -- Update resolution SLA breaches
  UPDATE support_tickets 
  SET sla_breach_flags = COALESCE(sla_breach_flags, '{}'::jsonb) || jsonb_build_object('resolution_breach', true)
  WHERE 
    status NOT IN ('resolved', 'closed')
    AND resolution_sla_deadline IS NOT NULL 
    AND NOW() > resolution_sla_deadline
    AND COALESCE((sla_breach_flags->>'resolution_breach')::boolean, false) = false;
  
  GET DIAGNOSTICS resolution_breaches = ROW_COUNT;
  
  RETURN response_breaches + resolution_breaches;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply SLA functions to existing tickets
DO $$
DECLARE
  ticket_record RECORD;
BEGIN
  FOR ticket_record IN 
    SELECT id FROM support_tickets 
    WHERE response_sla_deadline IS NULL OR resolution_sla_deadline IS NULL
    LIMIT 10  -- Limit for safety
  LOOP
    PERFORM update_ticket_sla_deadlines(ticket_record.id);
  END LOOP;
END $$;

SELECT 'SLA functions ready' as status;