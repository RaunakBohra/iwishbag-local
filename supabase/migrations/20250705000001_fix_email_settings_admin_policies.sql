-- Fix admin policies for email_settings table
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admin can read email settings" ON email_settings;
DROP POLICY IF EXISTS "Admin can update email settings" ON email_settings;
DROP POLICY IF EXISTS "Admin can insert email settings" ON email_settings;

-- Recreate admin policies for email_settings
CREATE POLICY "Admin can read email settings" ON email_settings
  FOR SELECT USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Admin can update email settings" ON email_settings
  FOR UPDATE USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Admin can insert email settings" ON email_settings
  FOR INSERT WITH CHECK (auth.jwt() ->> 'role' = 'admin');

-- Ensure RLS is enabled
ALTER TABLE email_settings ENABLE ROW LEVEL SECURITY; 