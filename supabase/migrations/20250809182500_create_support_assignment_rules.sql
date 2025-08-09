-- Create support assignment rules table for auto-assignment system
-- This table stores rules for automatically assigning tickets to admins/moderators

CREATE TABLE support_assignment_rules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  assignment_method TEXT NOT NULL CHECK (assignment_method IN ('round_robin', 'least_assigned', 'random')),
  criteria JSONB DEFAULT '{}' NOT NULL,
  eligible_user_ids UUID[] DEFAULT '{}' NOT NULL,
  is_active BOOLEAN DEFAULT true NOT NULL,
  priority INTEGER DEFAULT 1 NOT NULL,
  assignment_count INTEGER DEFAULT 0 NOT NULL,
  last_assigned_user_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Add indexes for performance
CREATE INDEX idx_support_assignment_rules_active ON support_assignment_rules (is_active);
CREATE INDEX idx_support_assignment_rules_priority ON support_assignment_rules (priority DESC);

-- Add RLS policies
ALTER TABLE support_assignment_rules ENABLE ROW LEVEL SECURITY;

-- Admin/moderator users can manage all assignment rules
CREATE POLICY "Admin users can manage assignment rules" ON support_assignment_rules
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur 
      WHERE ur.user_id = auth.uid() 
      AND ur.role IN ('admin', 'moderator')
      AND ur.is_active = true
    )
  );

-- Add trigger to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_support_assignment_rules_updated_at 
  BEFORE UPDATE ON support_assignment_rules 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert some default assignment rules
INSERT INTO support_assignment_rules (name, assignment_method, criteria, eligible_user_ids, is_active, priority) VALUES
('High Priority Tickets', 'round_robin', '{"priority": ["urgent", "high"]}', '{}', true, 10),
('General Support', 'least_assigned', '{"category": ["general", "technical"]}', '{}', true, 5),
('Billing Issues', 'round_robin', '{"category": ["billing"]}', '{}', true, 7);