-- Create table to store all sent emails
CREATE TABLE IF NOT EXISTS sent_emails (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id TEXT NOT NULL, -- AWS SES Message ID
  to_addresses TEXT[] NOT NULL, -- Array of recipient emails
  from_address TEXT NOT NULL,
  reply_to TEXT,
  subject TEXT NOT NULL,
  html_body TEXT,
  text_body TEXT,
  status TEXT NOT NULL DEFAULT 'sent', -- sent, bounced, complained, delivered
  provider TEXT NOT NULL DEFAULT 'AWS SES',
  metadata JSONB DEFAULT '{}', -- Store additional data like quote_id, user_id, etc.
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX idx_sent_emails_message_id ON sent_emails(message_id);
CREATE INDEX idx_sent_emails_to_addresses ON sent_emails USING GIN(to_addresses);
CREATE INDEX idx_sent_emails_sent_at ON sent_emails(sent_at DESC);
CREATE INDEX idx_sent_emails_subject ON sent_emails(subject);
CREATE INDEX idx_sent_emails_metadata ON sent_emails USING GIN(metadata);

-- Create trigger for updated_at
CREATE TRIGGER update_sent_emails_updated_at
  BEFORE UPDATE ON sent_emails
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS policies
ALTER TABLE sent_emails ENABLE ROW LEVEL SECURITY;

-- Admin users can see all emails
CREATE POLICY "Admin users can view all sent emails" ON sent_emails
  FOR SELECT
  USING (is_admin());

-- Admin users can insert emails
CREATE POLICY "Admin users can insert sent emails" ON sent_emails
  FOR INSERT
  WITH CHECK (is_admin());

-- Service role can do everything (for edge functions)
CREATE POLICY "Service role has full access to sent emails" ON sent_emails
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Users can see emails sent to them
CREATE POLICY "Users can view emails sent to them" ON sent_emails
  FOR SELECT
  USING (
    auth.email() = ANY(to_addresses)
    OR metadata->>'user_id' = auth.uid()::text
  );

-- Add comment
COMMENT ON TABLE sent_emails IS 'Stores all emails sent through the system for audit trail and customer support';