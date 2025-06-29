-- Add email settings table for controlling email sending
CREATE TABLE IF NOT EXISTS email_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT UNIQUE NOT NULL,
  setting_value JSONB NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default email settings
INSERT INTO email_settings (setting_key, setting_value, description) VALUES
('email_sending_enabled', 'true', 'Global toggle for enabling/disabling all email sending'),
('cart_abandonment_enabled', 'true', 'Toggle for cart abandonment emails specifically'),
('quote_notifications_enabled', 'true', 'Toggle for quote notification emails'),
('order_notifications_enabled', 'true', 'Toggle for order notification emails');

-- Add RLS policies for email_settings
ALTER TABLE email_settings ENABLE ROW LEVEL SECURITY;

-- Admin can read and update email settings
CREATE POLICY "Admin can read email settings" ON email_settings
  FOR SELECT USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Admin can update email settings" ON email_settings
  FOR UPDATE USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Admin can insert email settings" ON email_settings
  FOR INSERT WITH CHECK (auth.jwt() ->> 'role' = 'admin');

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_email_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER update_email_settings_updated_at
  BEFORE UPDATE ON email_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_email_settings_updated_at(); 