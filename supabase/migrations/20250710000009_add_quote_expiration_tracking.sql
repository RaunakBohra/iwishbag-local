-- Add quote expiration tracking fields
-- This allows automatic expiration of quotes after a certain time period

-- Add new columns to quotes table
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_quotes_sent_at ON quotes(sent_at);
CREATE INDEX IF NOT EXISTS idx_quotes_expires_at ON quotes(expires_at);
CREATE INDEX IF NOT EXISTS idx_quotes_status_expires_at ON quotes(status, expires_at);

-- Add comments for documentation
COMMENT ON COLUMN quotes.sent_at IS 'Timestamp when quote was sent to customer';
COMMENT ON COLUMN quotes.expires_at IS 'Timestamp when quote expires (5 days after sent)';

-- Create a function to automatically set expiration when status changes to 'sent'
CREATE OR REPLACE FUNCTION set_quote_expiration()
RETURNS TRIGGER AS $$
BEGIN
  -- When status changes to 'sent', set sent_at and expires_at
  IF NEW.status = 'sent' AND (OLD.status IS NULL OR OLD.status != 'sent') THEN
    NEW.sent_at = NOW();
    NEW.expires_at = NOW() + INTERVAL '5 days';
  END IF;
  
  -- When status changes from 'sent' to something else, clear expiration
  IF OLD.status = 'sent' AND NEW.status != 'sent' THEN
    NEW.sent_at = NULL;
    NEW.expires_at = NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically set expiration
DROP TRIGGER IF EXISTS trigger_set_quote_expiration ON quotes;
CREATE TRIGGER trigger_set_quote_expiration
  BEFORE UPDATE ON quotes
  FOR EACH ROW
  EXECUTE FUNCTION set_quote_expiration();

-- Create a function to check and expire quotes
CREATE OR REPLACE FUNCTION expire_quotes()
RETURNS INTEGER AS $$
DECLARE
  expired_count INTEGER;
BEGIN
  -- Update quotes that have expired
  UPDATE quotes 
  SET 
    status = 'expired',
    updated_at = NOW()
  WHERE 
    status = 'sent' 
    AND expires_at IS NOT NULL 
    AND expires_at <= NOW();
  
  GET DIAGNOSTICS expired_count = ROW_COUNT;
  
  -- Log the expiration
  INSERT INTO status_transitions_log (
    quote_id, 
    from_status, 
    to_status, 
    trigger, 
    metadata
  )
  SELECT 
    id, 
    'sent', 
    'expired', 
    'auto_expiration', 
    jsonb_build_object('expired_at', NOW(), 'sent_at', sent_at)
  FROM quotes 
  WHERE 
    status = 'expired' 
    AND updated_at >= NOW() - INTERVAL '1 minute';
  
  RETURN expired_count;
END;
$$ LANGUAGE plpgsql; 