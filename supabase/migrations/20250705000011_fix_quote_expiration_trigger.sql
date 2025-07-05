-- Fix quote expiration trigger to only set expiration when status changes to 'sent'
-- This ensures expiration is calculated from when quote was first sent, not when approved

-- Drop the existing trigger first
DROP TRIGGER IF EXISTS trigger_set_quote_expiration ON quotes;

-- Create the updated function with dynamic expiration
CREATE OR REPLACE FUNCTION set_quote_expiration()
RETURNS TRIGGER AS $$
DECLARE 
  status_settings JSONB;
  status_config JSONB;
  auto_expire_hours INTEGER := 168; -- default fallback
BEGIN
  -- When status changes to 'sent', set sent_at and expires_at (only when first sent)
  IF NEW.status = 'sent' AND (OLD.status IS NULL OR OLD.status != 'sent') THEN
    NEW.sent_at = NOW();
    -- Get all status settings
    SELECT setting_value::jsonb INTO status_settings
    FROM system_settings 
    WHERE setting_key = 'quote_statuses';
    -- Find the config for the 'sent' status
    SELECT value INTO status_config
    FROM jsonb_array_elements(status_settings) AS elem(value)
    WHERE value->>'name' = 'sent';
    -- Extract autoExpireHours if present
    IF status_config IS NOT NULL AND status_config ? 'autoExpireHours' THEN
      auto_expire_hours := (status_config->>'autoExpireHours')::INTEGER;
    END IF;
    -- Set expiration based on config
    IF auto_expire_hours IS NOT NULL AND auto_expire_hours > 0 THEN
      NEW.expires_at = NOW() + (auto_expire_hours || ' hours')::INTERVAL;
    ELSE
      NEW.expires_at = NOW() + INTERVAL '168 hours'; -- fallback
    END IF;
  END IF;
  
  -- When status changes from 'sent' to something else (but not 'approved'), clear expiration
  -- Keep expiration when moving from 'sent' to 'approved' so customers can still see the timer
  IF OLD.status = 'sent' AND NEW.status NOT IN ('sent', 'approved') THEN
    NEW.sent_at = NULL;
    NEW.expires_at = NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
CREATE TRIGGER trigger_set_quote_expiration
  BEFORE UPDATE ON quotes
  FOR EACH ROW
  EXECUTE FUNCTION set_quote_expiration(); 