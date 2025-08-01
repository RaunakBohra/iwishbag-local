-- Migration: Enhance quotes_v2 with essential business logic fields
-- Description: Adds validity, expiry, communication tracking, and version control

-- Phase 1: Core Business Logic Fields
ALTER TABLE quotes_v2 ADD COLUMN IF NOT EXISTS validity_days INTEGER DEFAULT 7;
ALTER TABLE quotes_v2 ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
ALTER TABLE quotes_v2 ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ;
ALTER TABLE quotes_v2 ADD COLUMN IF NOT EXISTS viewed_at TIMESTAMPTZ;
ALTER TABLE quotes_v2 ADD COLUMN IF NOT EXISTS share_token TEXT UNIQUE;

-- Phase 2: Communication Tracking
ALTER TABLE quotes_v2 ADD COLUMN IF NOT EXISTS email_sent BOOLEAN DEFAULT false;
ALTER TABLE quotes_v2 ADD COLUMN IF NOT EXISTS customer_message TEXT;
ALTER TABLE quotes_v2 ADD COLUMN IF NOT EXISTS reminder_count INTEGER DEFAULT 0;
ALTER TABLE quotes_v2 ADD COLUMN IF NOT EXISTS last_reminder_at TIMESTAMPTZ;

-- Phase 3: Version Control
ALTER TABLE quotes_v2 ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;
ALTER TABLE quotes_v2 ADD COLUMN IF NOT EXISTS parent_quote_id UUID REFERENCES quotes_v2(id);
ALTER TABLE quotes_v2 ADD COLUMN IF NOT EXISTS revision_reason TEXT;
ALTER TABLE quotes_v2 ADD COLUMN IF NOT EXISTS is_latest_version BOOLEAN DEFAULT true;

-- Phase 4: Business Rules
ALTER TABLE quotes_v2 ADD COLUMN IF NOT EXISTS payment_terms TEXT;
ALTER TABLE quotes_v2 ADD COLUMN IF NOT EXISTS approval_required_above DECIMAL(10,2);
ALTER TABLE quotes_v2 ADD COLUMN IF NOT EXISTS max_discount_allowed DECIMAL(5,2);
ALTER TABLE quotes_v2 ADD COLUMN IF NOT EXISTS minimum_order_value DECIMAL(10,2);

-- Phase 5: Integration Points
ALTER TABLE quotes_v2 ADD COLUMN IF NOT EXISTS converted_to_order_id UUID;
ALTER TABLE quotes_v2 ADD COLUMN IF NOT EXISTS original_quote_id UUID;
ALTER TABLE quotes_v2 ADD COLUMN IF NOT EXISTS external_reference TEXT;
ALTER TABLE quotes_v2 ADD COLUMN IF NOT EXISTS api_version TEXT;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_quotes_v2_share_token ON quotes_v2(share_token) WHERE share_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_quotes_v2_expires_at ON quotes_v2(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_quotes_v2_parent_quote_id ON quotes_v2(parent_quote_id) WHERE parent_quote_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_quotes_v2_status_expires ON quotes_v2(status, expires_at);

-- Function to generate share token
CREATE OR REPLACE FUNCTION generate_quote_share_token()
RETURNS TEXT AS $$
DECLARE
  token TEXT;
  exists_count INT;
BEGIN
  LOOP
    -- Generate a secure random token (12 characters)
    token := encode(gen_random_bytes(9), 'base64');
    -- Remove special characters for URL safety
    token := regexp_replace(token, '[/+=]', '', 'g');
    token := substring(token, 1, 12);
    
    -- Check if token already exists
    SELECT COUNT(*) INTO exists_count FROM quotes_v2 WHERE share_token = token;
    
    -- Exit loop if token is unique
    EXIT WHEN exists_count = 0;
  END LOOP;
  
  RETURN token;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate expiry date
CREATE OR REPLACE FUNCTION calculate_quote_expiry()
RETURNS TRIGGER AS $$
BEGIN
  -- Set expiry date based on validity_days
  IF NEW.validity_days IS NOT NULL AND NEW.expires_at IS NULL THEN
    NEW.expires_at := NEW.created_at + (NEW.validity_days || ' days')::INTERVAL;
  END IF;
  
  -- Generate share token if not set
  IF NEW.share_token IS NULL THEN
    NEW.share_token := generate_quote_share_token();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-calculating expiry
CREATE TRIGGER set_quote_expiry
  BEFORE INSERT OR UPDATE ON quotes_v2
  FOR EACH ROW
  EXECUTE FUNCTION calculate_quote_expiry();

-- Function to check if quote is expired
CREATE OR REPLACE FUNCTION is_quote_expired(quote_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  expiry TIMESTAMPTZ;
BEGIN
  SELECT expires_at INTO expiry FROM quotes_v2 WHERE id = quote_id;
  
  IF expiry IS NULL THEN
    RETURN false;
  END IF;
  
  RETURN expiry < NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to handle version control
CREATE OR REPLACE FUNCTION create_quote_revision(
  original_quote_id UUID,
  revision_reason TEXT
)
RETURNS UUID AS $$
DECLARE
  new_quote_id UUID;
  original_data RECORD;
  new_version INT;
BEGIN
  -- Get original quote data
  SELECT * INTO original_data FROM quotes_v2 WHERE id = original_quote_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Original quote not found';
  END IF;
  
  -- Calculate new version number
  SELECT COALESCE(MAX(version), 0) + 1 INTO new_version
  FROM quotes_v2
  WHERE parent_quote_id = original_quote_id OR id = original_quote_id;
  
  -- Mark all previous versions as not latest
  UPDATE quotes_v2 
  SET is_latest_version = false 
  WHERE (parent_quote_id = original_quote_id OR id = original_quote_id)
    AND is_latest_version = true;
  
  -- Create new revision
  INSERT INTO quotes_v2 (
    customer_id,
    status,
    items,
    origin_country,
    destination_country,
    shipping_cost_usd,
    total_cost_usd,
    calculation_data,
    customer_data,
    notes,
    version,
    parent_quote_id,
    revision_reason,
    is_latest_version,
    validity_days,
    payment_terms,
    approval_required_above,
    max_discount_allowed,
    minimum_order_value
  ) VALUES (
    original_data.customer_id,
    'draft', -- New revisions start as draft
    original_data.items,
    original_data.origin_country,
    original_data.destination_country,
    original_data.shipping_cost_usd,
    original_data.total_cost_usd,
    original_data.calculation_data,
    original_data.customer_data,
    original_data.notes,
    new_version,
    original_quote_id,
    revision_reason,
    true,
    original_data.validity_days,
    original_data.payment_terms,
    original_data.approval_required_above,
    original_data.max_discount_allowed,
    original_data.minimum_order_value
  ) RETURNING id INTO new_quote_id;
  
  RETURN new_quote_id;
END;
$$ LANGUAGE plpgsql;

-- RLS Policies for share token access
CREATE POLICY "Quotes can be viewed with share token"
  ON quotes_v2
  FOR SELECT
  USING (
    auth.uid() = created_by 
    OR auth.uid() = customer_id
    OR share_token = current_setting('request.headers', true)::json->>'x-share-token'
    OR is_admin()
  );

-- Function to track quote views
CREATE OR REPLACE FUNCTION track_quote_view(quote_id UUID, token TEXT DEFAULT NULL)
RETURNS BOOLEAN AS $$
DECLARE
  quote_exists BOOLEAN;
BEGIN
  -- Check if quote exists and token matches (if provided)
  SELECT EXISTS(
    SELECT 1 FROM quotes_v2 
    WHERE id = quote_id 
    AND (token IS NULL OR share_token = token)
  ) INTO quote_exists;
  
  IF NOT quote_exists THEN
    RETURN false;
  END IF;
  
  -- Update viewed_at timestamp
  UPDATE quotes_v2 
  SET viewed_at = NOW() 
  WHERE id = quote_id 
  AND (viewed_at IS NULL OR viewed_at < NOW() - INTERVAL '1 minute');
  
  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Function to send quote reminder
CREATE OR REPLACE FUNCTION send_quote_reminder(quote_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE quotes_v2
  SET 
    reminder_count = COALESCE(reminder_count, 0) + 1,
    last_reminder_at = NOW()
  WHERE id = quote_id
  AND status IN ('sent', 'viewed')
  AND NOT is_quote_expired(id);
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Helper view for active quotes
CREATE OR REPLACE VIEW active_quotes AS
SELECT 
  q.*,
  NOT is_quote_expired(q.id) AS is_active,
  CASE 
    WHEN q.expires_at IS NULL THEN NULL
    ELSE q.expires_at - NOW()
  END AS time_remaining
FROM quotes_v2 q
WHERE q.is_latest_version = true;

-- Grant necessary permissions
GRANT SELECT ON active_quotes TO authenticated;
GRANT EXECUTE ON FUNCTION generate_quote_share_token() TO authenticated;
GRANT EXECUTE ON FUNCTION is_quote_expired(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION track_quote_view(UUID, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION create_quote_revision(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION send_quote_reminder(UUID) TO authenticated;