-- Create table to store all email messages (both sent and received)
CREATE TABLE IF NOT EXISTS email_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id TEXT NOT NULL UNIQUE,
  direction TEXT NOT NULL CHECK (direction IN ('sent', 'received')),
  
  -- Email headers
  from_address TEXT NOT NULL,
  to_addresses TEXT[] NOT NULL,
  cc_addresses TEXT[],
  subject TEXT NOT NULL,
  
  -- Email content
  text_body TEXT,
  html_body TEXT,
  raw_email TEXT, -- Full raw email for received messages
  
  -- S3 storage reference
  s3_key TEXT NOT NULL, -- Path in S3 bucket
  s3_bucket TEXT NOT NULL DEFAULT 'iwishbag-emails',
  
  -- Metadata
  size_bytes INTEGER,
  has_attachments BOOLEAN DEFAULT FALSE,
  attachment_count INTEGER DEFAULT 0,
  
  -- Processing status
  status TEXT NOT NULL DEFAULT 'unread' CHECK (status IN ('unread', 'read', 'replied', 'archived')),
  processed_at TIMESTAMPTZ,
  
  -- User association (if applicable)
  user_id UUID REFERENCES auth.users(id),
  customer_email TEXT,
  
  -- Business data
  quote_id UUID,
  order_id UUID,
  metadata JSONB DEFAULT '{}',
  
  -- Timestamps
  sent_at TIMESTAMPTZ,
  received_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX idx_email_messages_direction ON email_messages(direction);
CREATE INDEX idx_email_messages_from ON email_messages(from_address);
CREATE INDEX idx_email_messages_to ON email_messages USING GIN(to_addresses);
CREATE INDEX idx_email_messages_subject ON email_messages(subject);
CREATE INDEX idx_email_messages_status ON email_messages(status);
CREATE INDEX idx_email_messages_created_at ON email_messages(created_at DESC);
CREATE INDEX idx_email_messages_user_id ON email_messages(user_id);
CREATE INDEX idx_email_messages_customer_email ON email_messages(customer_email);

-- Create trigger for updated_at
CREATE TRIGGER update_email_messages_updated_at
  BEFORE UPDATE ON email_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS policies
ALTER TABLE email_messages ENABLE ROW LEVEL SECURITY;

-- Admin users can see all emails
CREATE POLICY "Admin users can view all emails" ON email_messages
  FOR SELECT
  USING (is_admin());

-- Admin users can manage emails
CREATE POLICY "Admin users can manage emails" ON email_messages
  FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- Service role has full access
CREATE POLICY "Service role has full access to emails" ON email_messages
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Users can see emails associated with them
CREATE POLICY "Users can view their emails" ON email_messages
  FOR SELECT
  USING (
    auth.uid() = user_id 
    OR auth.email() = customer_email
    OR auth.email() = ANY(to_addresses)
  );

-- Add comment
COMMENT ON TABLE email_messages IS 'Unified table for all email messages (sent and received) with S3 references';