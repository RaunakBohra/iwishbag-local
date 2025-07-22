-- ============================================================================
-- FIX SLA FUNCTIONS
-- Corrects syntax errors in SLA tracking functions
-- ============================================================================

-- Drop and recreate the calculate_sla_deadline function with fixed syntax
DROP FUNCTION IF EXISTS calculate_sla_deadline(TIMESTAMP WITH TIME ZONE, INTEGER, BOOLEAN);

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
  hours_left_today INTEGER;
  hours_to_use INTEGER;
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
    hours_left_today := business_end_hour - current_hour;
    hours_to_use := LEAST(remaining_hours, hours_left_today);
    
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
  END LOOP;
  
  RETURN result_time;
END;
$$ LANGUAGE plpgsql;

-- Drop and recreate the update_sla_breach_flags function with fixed syntax
DROP FUNCTION IF EXISTS update_sla_breach_flags();

CREATE OR REPLACE FUNCTION update_sla_breach_flags()
RETURNS INTEGER AS $$
DECLARE
  response_breach_count INTEGER := 0;
  resolution_breach_count INTEGER := 0;
  total_breach_count INTEGER := 0;
BEGIN
  -- Update response SLA breaches
  UPDATE support_tickets 
  SET sla_breach_flags = sla_breach_flags || jsonb_build_object('response_breach', true)
  WHERE 
    first_response_at IS NULL 
    AND response_sla_deadline IS NOT NULL 
    AND NOW() > response_sla_deadline
    AND (sla_breach_flags->>'response_breach')::boolean IS NOT TRUE;
  
  GET DIAGNOSTICS response_breach_count = ROW_COUNT;
  
  -- Update resolution SLA breaches
  UPDATE support_tickets 
  SET sla_breach_flags = sla_breach_flags || jsonb_build_object('resolution_breach', true)
  WHERE 
    status NOT IN ('resolved', 'closed')
    AND resolution_sla_deadline IS NOT NULL 
    AND NOW() > resolution_sla_deadline
    AND (sla_breach_flags->>'resolution_breach')::boolean IS NOT TRUE;
  
  GET DIAGNOSTICS resolution_breach_count = ROW_COUNT;
  
  total_breach_count := response_breach_count + resolution_breach_count;
  
  RETURN total_breach_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Test the functions work
SELECT 'SLA functions created successfully' as status;