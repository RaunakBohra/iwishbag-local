-- Drop all existing update policies on quotes to start fresh
DROP POLICY IF EXISTS "Users can update their own quotes" ON quotes;
DROP POLICY IF EXISTS "Admins can update all quotes" ON quotes;
DROP POLICY IF EXISTS "Admins can update payment fields" ON quotes;

-- Create a single comprehensive update policy for admins
CREATE POLICY "Admins can update all quotes" ON quotes
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- Also create a policy for users to update their own quotes (non-payment fields)
CREATE POLICY "Users can update own quotes" ON quotes
  FOR UPDATE
  USING (
    auth.uid() = user_id
    AND payment_status IS DISTINCT FROM 'paid' -- Can't update paid quotes
  );

-- Ensure the quotes table has RLS enabled
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;

-- Grant necessary permissions
GRANT ALL ON quotes TO authenticated;