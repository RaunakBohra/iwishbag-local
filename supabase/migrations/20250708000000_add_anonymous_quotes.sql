-- Add fields for anonymous quotes and social media tracking
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS is_anonymous BOOLEAN DEFAULT FALSE;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS social_handle TEXT;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS quote_source TEXT DEFAULT 'website';
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS share_token TEXT UNIQUE;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS customer_name TEXT;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS customer_phone TEXT;

-- Add comments for documentation
COMMENT ON COLUMN quotes.is_anonymous IS 'Whether this quote was created for an anonymous customer (no email/phone provided)';
COMMENT ON COLUMN quotes.social_handle IS 'Social media handle (e.g., @username) for tracking quotes from social media';
COMMENT ON COLUMN quotes.quote_source IS 'Source of the quote: website, facebook, instagram, whatsapp, etc.';
COMMENT ON COLUMN quotes.share_token IS 'Unique token for sharing anonymous quotes';
COMMENT ON COLUMN quotes.expires_at IS 'Expiration date for anonymous quote links';
COMMENT ON COLUMN quotes.customer_name IS 'Customer name for anonymous quotes';
COMMENT ON COLUMN quotes.customer_phone IS 'Customer phone for anonymous quotes';

-- Create function to generate share tokens
CREATE OR REPLACE FUNCTION generate_share_token()
RETURNS TEXT AS $$
BEGIN
  RETURN 'qt_' || substr(md5(random()::text), 1, 12);
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-generate share tokens for anonymous quotes
CREATE OR REPLACE FUNCTION set_share_token()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_anonymous AND NEW.share_token IS NULL THEN
    NEW.share_token := generate_share_token();
  END IF;
  
  -- Set expiration date for anonymous quotes (7 days from creation)
  IF NEW.is_anonymous AND NEW.expires_at IS NULL THEN
    NEW.expires_at := now() + interval '7 days';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS set_share_token_trigger ON quotes;
CREATE TRIGGER set_share_token_trigger
  BEFORE INSERT ON quotes
  FOR EACH ROW EXECUTE FUNCTION set_share_token();

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_quotes_share_token ON quotes(share_token);
CREATE INDEX IF NOT EXISTS idx_quotes_is_anonymous ON quotes(is_anonymous);
CREATE INDEX IF NOT EXISTS idx_quotes_quote_source ON quotes(quote_source);
CREATE INDEX IF NOT EXISTS idx_quotes_expires_at ON quotes(expires_at);

-- Update RLS policies to allow anonymous quote viewing
DROP POLICY IF EXISTS "Anyone can view anonymous quotes by token" ON quotes;
CREATE POLICY "Anyone can view anonymous quotes by token" ON quotes
  FOR SELECT USING (
    is_anonymous = true AND 
    share_token IS NOT NULL AND 
    (expires_at IS NULL OR expires_at > now())
  );

-- Update existing policies to include new columns
DROP POLICY IF EXISTS "Users can view their own quotes" ON quotes;
CREATE POLICY "Users can view their own quotes" ON quotes
  FOR SELECT USING (
    auth.uid() = user_id OR 
    (is_anonymous = true AND share_token IS NOT NULL AND (expires_at IS NULL OR expires_at > now()))
  );

DROP POLICY IF EXISTS "Admins can view all quotes" ON quotes;
CREATE POLICY "Admins can view all quotes" ON quotes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can update all quotes" ON quotes;
CREATE POLICY "Admins can update all quotes" ON quotes
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Allow admins to create quotes
DROP POLICY IF EXISTS "Admins can create quotes" ON quotes;
CREATE POLICY "Admins can create quotes" ON quotes
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  ); 