-- Create manual_analysis_tasks table for products that need manual review
CREATE TABLE IF NOT EXISTS manual_analysis_tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  url TEXT,
  product_name TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'failed')),
  assigned_to UUID REFERENCES auth.users(id),
  analysis_result JSONB,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Create index for efficient querying
CREATE INDEX IF NOT EXISTS idx_manual_analysis_tasks_status ON manual_analysis_tasks(status);
CREATE INDEX IF NOT EXISTS idx_manual_analysis_tasks_created_at ON manual_analysis_tasks(created_at);

-- Add RLS policies
ALTER TABLE manual_analysis_tasks ENABLE ROW LEVEL SECURITY;

-- Admins can view and manage all tasks
CREATE POLICY "Admins can manage manual analysis tasks" ON manual_analysis_tasks
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_manual_analysis_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER update_manual_analysis_tasks_updated_at
  BEFORE UPDATE ON manual_analysis_tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_manual_analysis_tasks_updated_at(); 