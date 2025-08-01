-- =====================================================
-- V2 Quote System - Essential Foundations
-- =====================================================

-- 1. QUOTE LIFECYCLE FIELDS
-- -------------------------
ALTER TABLE quotes_v2 
ADD COLUMN IF NOT EXISTS validity_days INTEGER DEFAULT 7,
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS viewed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS reminder_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_reminder_at TIMESTAMPTZ;

-- 2. CUSTOMER COMMUNICATION FIELDS
-- ---------------------------------
ALTER TABLE quotes_v2
ADD COLUMN IF NOT EXISTS share_token TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS customer_message TEXT,
ADD COLUMN IF NOT EXISTS email_sent BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS sms_sent BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS whatsapp_sent BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS preferred_contact TEXT DEFAULT 'email';

-- 3. VERSION CONTROL FIELDS
-- -------------------------
ALTER TABLE quotes_v2
ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS parent_quote_id UUID REFERENCES quotes_v2(id),
ADD COLUMN IF NOT EXISTS revision_reason TEXT,
ADD COLUMN IF NOT EXISTS changes_summary TEXT;

-- 4. BUSINESS RULES FIELDS
-- ------------------------
ALTER TABLE quotes_v2
ADD COLUMN IF NOT EXISTS payment_terms TEXT DEFAULT 'Full payment on order',
ADD COLUMN IF NOT EXISTS approval_required BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS max_discount_percentage DECIMAL(5,2) DEFAULT 20.00,
ADD COLUMN IF NOT EXISTS minimum_order_value DECIMAL(10,2);

-- 5. INTEGRATION FIELDS
-- ---------------------
ALTER TABLE quotes_v2
ADD COLUMN IF NOT EXISTS converted_to_order_id UUID,
ADD COLUMN IF NOT EXISTS original_quote_id UUID,
ADD COLUMN IF NOT EXISTS external_reference TEXT,
ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'calculator_v2';

-- 6. TRACKING FIELDS
-- ------------------
ALTER TABLE quotes_v2
ADD COLUMN IF NOT EXISTS ip_address INET,
ADD COLUMN IF NOT EXISTS user_agent TEXT,
ADD COLUMN IF NOT EXISTS utm_source TEXT,
ADD COLUMN IF NOT EXISTS utm_medium TEXT,
ADD COLUMN IF NOT EXISTS utm_campaign TEXT;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_quotes_v2_share_token ON quotes_v2(share_token);
CREATE INDEX IF NOT EXISTS idx_quotes_v2_expires_at ON quotes_v2(expires_at);
CREATE INDEX IF NOT EXISTS idx_quotes_v2_parent_quote_id ON quotes_v2(parent_quote_id);
CREATE INDEX IF NOT EXISTS idx_quotes_v2_converted_to_order_id ON quotes_v2(converted_to_order_id);

-- Function to generate share token
CREATE OR REPLACE FUNCTION generate_share_token()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..16 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate expiry date
CREATE OR REPLACE FUNCTION calculate_quote_expiry()
RETURNS TRIGGER AS $$
BEGIN
  -- Set expiry date based on validity_days
  IF NEW.validity_days IS NOT NULL THEN
    NEW.expires_at := NOW() + (NEW.validity_days || ' days')::INTERVAL;
  END IF;
  
  -- Generate share token if not exists
  IF NEW.share_token IS NULL THEN
    NEW.share_token := generate_share_token();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-calculate expiry
CREATE TRIGGER set_quote_expiry
  BEFORE INSERT OR UPDATE OF validity_days ON quotes_v2
  FOR EACH ROW
  EXECUTE FUNCTION calculate_quote_expiry();

-- Function to track quote status changes
CREATE OR REPLACE FUNCTION track_quote_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Track when quote is sent
  IF NEW.status = 'sent' AND OLD.status != 'sent' THEN
    NEW.sent_at := NOW();
  END IF;
  
  -- Track when quote is approved
  IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
    NEW.approved_at := NOW();
  END IF;
  
  -- Mark as expired if past expiry date
  IF NEW.expires_at IS NOT NULL AND NEW.expires_at < NOW() AND NEW.status NOT IN ('approved', 'rejected', 'converted') THEN
    NEW.status := 'expired';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for status tracking
CREATE TRIGGER track_status_changes
  BEFORE UPDATE ON quotes_v2
  FOR EACH ROW
  EXECUTE FUNCTION track_quote_status_change();

-- Function to increment version on revision
CREATE OR REPLACE FUNCTION increment_quote_version()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.parent_quote_id IS NOT NULL THEN
    -- Get parent version and increment
    SELECT COALESCE(MAX(version), 0) + 1 INTO NEW.version
    FROM quotes_v2
    WHERE id = NEW.parent_quote_id OR parent_quote_id = NEW.parent_quote_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for version management
CREATE TRIGGER manage_quote_versions
  BEFORE INSERT ON quotes_v2
  FOR EACH ROW
  EXECUTE FUNCTION increment_quote_version();

-- RLS Policies for share tokens
CREATE POLICY "Public can view quotes via share token" ON quotes_v2
  FOR SELECT
  TO anon
  USING (share_token IS NOT NULL);

-- Function to record quote view
CREATE OR REPLACE FUNCTION record_quote_view(p_share_token TEXT)
RETURNS JSONB AS $$
DECLARE
  v_quote_id UUID;
BEGIN
  -- Update viewed_at timestamp
  UPDATE quotes_v2
  SET viewed_at = NOW()
  WHERE share_token = p_share_token
  AND viewed_at IS NULL
  RETURNING id INTO v_quote_id;
  
  IF v_quote_id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', true,
      'quote_id', v_quote_id,
      'viewed_at', NOW()
    );
  ELSE
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Quote not found or already viewed'
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION generate_share_token() TO authenticated;
GRANT EXECUTE ON FUNCTION record_quote_view(TEXT) TO anon, authenticated;

-- Add helpful comments
COMMENT ON COLUMN quotes_v2.validity_days IS 'Number of days the quote is valid for';
COMMENT ON COLUMN quotes_v2.expires_at IS 'Calculated expiry date based on validity_days';
COMMENT ON COLUMN quotes_v2.share_token IS 'Unique token for public quote sharing';
COMMENT ON COLUMN quotes_v2.version IS 'Quote version number for tracking revisions';
COMMENT ON COLUMN quotes_v2.parent_quote_id IS 'Reference to original quote if this is a revision';