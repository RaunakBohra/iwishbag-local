-- ============================================================================
-- AUTO-ASSIGNMENT SYSTEM
-- Simple lightweight auto-assignment system for support tickets
-- ============================================================================

-- Create auto_assignment_rules table
CREATE TABLE IF NOT EXISTS auto_assignment_rules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  assignment_method VARCHAR(20) DEFAULT 'round_robin' CHECK (assignment_method IN ('round_robin', 'least_assigned', 'random')),
  
  -- Assignment criteria (JSONB for flexibility)
  criteria JSONB DEFAULT '{}'::jsonb, -- e.g., {"priority": ["high", "urgent"], "category": ["payment"]}
  
  -- Eligible assignees
  eligible_user_ids UUID[] DEFAULT '{}', -- Array of user IDs who can be assigned
  
  -- Assignment tracking
  last_assigned_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  assignment_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE auto_assignment_rules ENABLE ROW LEVEL SECURITY;

-- RLS Policies (admin only)
CREATE POLICY "Admins can manage auto assignment rules" ON auto_assignment_rules
  FOR ALL USING (is_admin());

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_auto_assignment_rules_active ON auto_assignment_rules(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_auto_assignment_rules_method ON auto_assignment_rules(assignment_method);

-- Insert default auto-assignment rule (round robin for all tickets)
INSERT INTO auto_assignment_rules (name, assignment_method, criteria, eligible_user_ids) VALUES
(
  'Default Round Robin Assignment',
  'round_robin',
  '{}'::jsonb,
  (SELECT array_agg(profiles.id) FROM profiles 
   JOIN user_roles ON profiles.id = user_roles.user_id 
   WHERE user_roles.role IN ('admin', 'moderator'))
) ON CONFLICT DO NOTHING;

-- Function to get next assignee using round robin
CREATE OR REPLACE FUNCTION get_next_assignee(rule_id UUID)
RETURNS UUID AS $$
DECLARE
  rule_record RECORD;
  next_user_id UUID;
  current_index INTEGER;
  eligible_users UUID[];
BEGIN
  -- Get the assignment rule
  SELECT * INTO rule_record FROM auto_assignment_rules WHERE id = rule_id AND is_active = true;
  
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;
  
  eligible_users := rule_record.eligible_user_ids;
  
  IF array_length(eligible_users, 1) IS NULL OR array_length(eligible_users, 1) = 0 THEN
    RETURN NULL;
  END IF;
  
  -- Round robin logic
  IF rule_record.assignment_method = 'round_robin' THEN
    IF rule_record.last_assigned_user_id IS NULL THEN
      -- First assignment, start with first user
      next_user_id := eligible_users[1];
    ELSE
      -- Find current user's position and get next
      SELECT array_position(eligible_users, rule_record.last_assigned_user_id) INTO current_index;
      
      IF current_index IS NULL OR current_index >= array_length(eligible_users, 1) THEN
        -- Reset to first user
        next_user_id := eligible_users[1];
      ELSE
        -- Get next user
        next_user_id := eligible_users[current_index + 1];
      END IF;
    END IF;
    
  -- Least assigned logic (count current assignments)
  ELSIF rule_record.assignment_method = 'least_assigned' THEN
    SELECT user_id INTO next_user_id
    FROM (
      SELECT unnest(eligible_users) as user_id
    ) eligible
    LEFT JOIN (
      SELECT assigned_to, COUNT(*) as ticket_count
      FROM support_tickets
      WHERE status NOT IN ('resolved', 'closed')
      AND assigned_to = ANY(eligible_users)
      GROUP BY assigned_to
    ) assignments ON eligible.user_id = assignments.assigned_to
    ORDER BY COALESCE(assignments.ticket_count, 0) ASC, eligible.user_id ASC
    LIMIT 1;
    
  -- Random assignment
  ELSIF rule_record.assignment_method = 'random' THEN
    next_user_id := eligible_users[1 + floor(random() * array_length(eligible_users, 1))::integer];
  END IF;
  
  -- Update the rule with last assigned user
  UPDATE auto_assignment_rules 
  SET 
    last_assigned_user_id = next_user_id,
    assignment_count = assignment_count + 1,
    updated_at = NOW()
  WHERE id = rule_id;
  
  RETURN next_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to auto-assign a ticket
CREATE OR REPLACE FUNCTION auto_assign_ticket(ticket_id UUID)
RETURNS UUID AS $$
DECLARE
  ticket_record RECORD;
  rule_record RECORD;
  assigned_user_id UUID;
  criteria_match BOOLEAN;
BEGIN
  -- Get ticket details
  SELECT * INTO ticket_record FROM support_tickets WHERE id = ticket_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ticket not found: %', ticket_id;
  END IF;
  
  -- Skip if already assigned
  IF ticket_record.assigned_to IS NOT NULL THEN
    RETURN ticket_record.assigned_to;
  END IF;
  
  -- Find matching assignment rule
  FOR rule_record IN 
    SELECT * FROM auto_assignment_rules 
    WHERE is_active = true 
    ORDER BY created_at ASC -- First rule wins
  LOOP
    criteria_match := true;
    
    -- Check priority criteria
    IF rule_record.criteria ? 'priority' THEN
      IF NOT (ticket_record.priority = ANY(
        SELECT jsonb_array_elements_text(rule_record.criteria->'priority')
      )) THEN
        criteria_match := false;
      END IF;
    END IF;
    
    -- Check category criteria
    IF criteria_match AND rule_record.criteria ? 'category' THEN
      IF NOT (ticket_record.category = ANY(
        SELECT jsonb_array_elements_text(rule_record.criteria->'category')
      )) THEN
        criteria_match := false;
      END IF;
    END IF;
    
    -- If criteria match, get assignee
    IF criteria_match THEN
      assigned_user_id := get_next_assignee(rule_record.id);
      
      IF assigned_user_id IS NOT NULL THEN
        -- Assign the ticket
        UPDATE support_tickets 
        SET 
          assigned_to = assigned_user_id,
          updated_at = NOW()
        WHERE id = ticket_id;
        
        RETURN assigned_user_id;
      END IF;
    END IF;
  END LOOP;
  
  -- No assignment made
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-assign tickets on creation
CREATE OR REPLACE FUNCTION trigger_auto_assign_ticket()
RETURNS TRIGGER AS $$
BEGIN
  -- Only auto-assign if not already assigned
  IF NEW.assigned_to IS NULL THEN
    PERFORM auto_assign_ticket(NEW.id);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to support_tickets table
DROP TRIGGER IF EXISTS auto_assign_ticket_trigger ON support_tickets;
CREATE TRIGGER auto_assign_ticket_trigger
  AFTER INSERT ON support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION trigger_auto_assign_ticket();

-- Update trigger for timestamp
CREATE TRIGGER update_auto_assignment_rules_updated_at
  BEFORE UPDATE ON auto_assignment_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE auto_assignment_rules IS 'Configuration for automatic ticket assignment';
COMMENT ON FUNCTION get_next_assignee IS 'Get next assignee based on assignment method';
COMMENT ON FUNCTION auto_assign_ticket IS 'Automatically assign a ticket based on rules';

SELECT 'Auto-assignment system created successfully' as status;