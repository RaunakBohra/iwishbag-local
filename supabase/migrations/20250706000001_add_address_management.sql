-- =================================================================
-- ADDRESS MANAGEMENT SYSTEM MIGRATION
-- =================================================================
-- Adds flexible address management to quotes with full audit trail

-- Add address fields to quotes table
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS shipping_address JSONB;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS address_locked BOOLEAN DEFAULT false;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS address_updated_at TIMESTAMPTZ;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS address_updated_by UUID REFERENCES public.profiles(id);

-- Address history for tracking changes
CREATE TABLE IF NOT EXISTS quote_address_history (
  id SERIAL PRIMARY KEY,
  quote_id UUID REFERENCES quotes(id) ON DELETE CASCADE NOT NULL,
  old_address JSONB,
  new_address JSONB NOT NULL,
  changed_by UUID REFERENCES public.profiles(id),
  changed_at TIMESTAMPTZ DEFAULT NOW(),
  change_reason TEXT,
  change_type TEXT DEFAULT 'update' CHECK (change_type IN ('create', 'update', 'lock', 'unlock'))
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_quote_address_history_quote_id ON quote_address_history(quote_id);
CREATE INDEX IF NOT EXISTS idx_quotes_address_locked ON quotes(address_locked);
CREATE INDEX IF NOT EXISTS idx_quote_address_history_changed_at ON quote_address_history(changed_at);

-- Function to log address changes
CREATE OR REPLACE FUNCTION log_address_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Log the change in address history
  INSERT INTO quote_address_history (
    quote_id,
    old_address,
    new_address,
    changed_by,
    change_reason,
    change_type
  ) VALUES (
    NEW.id,
    CASE 
      WHEN TG_OP = 'UPDATE' THEN OLD.shipping_address
      ELSE NULL
    END,
    NEW.shipping_address,
    NEW.address_updated_by,
    'Address updated via ' || TG_OP,
    CASE 
      WHEN TG_OP = 'INSERT' THEN 'create'
      WHEN TG_OP = 'UPDATE' AND NEW.address_locked AND NOT OLD.address_locked THEN 'lock'
      WHEN TG_OP = 'UPDATE' AND NOT NEW.address_locked AND OLD.address_locked THEN 'unlock'
      ELSE 'update'
    END
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS trigger_log_address_change_insert ON quotes;
DROP TRIGGER IF EXISTS trigger_log_address_change_update ON quotes;

-- Create separate triggers for INSERT and UPDATE
CREATE TRIGGER trigger_log_address_change_insert
  AFTER INSERT ON quotes
  FOR EACH ROW
  WHEN (NEW.shipping_address IS NOT NULL)
  EXECUTE FUNCTION log_address_change();

CREATE TRIGGER trigger_log_address_change_update
  AFTER UPDATE ON quotes
  FOR EACH ROW
  WHEN (OLD.shipping_address IS DISTINCT FROM NEW.shipping_address OR OLD.address_locked IS DISTINCT FROM NEW.address_locked)
  EXECUTE FUNCTION log_address_change();

-- Function to lock address after payment
CREATE OR REPLACE FUNCTION lock_address_after_payment(quote_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE quotes 
  SET 
    address_locked = true,
    address_updated_at = NOW(),
    address_updated_by = user_id
  WHERE id = quote_uuid AND status IN ('paid', 'ordered', 'shipped', 'completed');
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS Policies for address history
ALTER TABLE quote_address_history ENABLE ROW LEVEL SECURITY;

-- Admins can view all address history
CREATE POLICY "Admins can view all address history" ON quote_address_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Users can view address history for their own quotes
CREATE POLICY "Users can view their own quote address history" ON quote_address_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM quotes q
      WHERE q.id = quote_address_history.quote_id 
      AND q.user_id = auth.uid()
    )
  );

-- Only system can insert address history (via trigger)
CREATE POLICY "System can insert address history" ON quote_address_history
  FOR INSERT WITH CHECK (true);

-- Comments for documentation
COMMENT ON TABLE quote_address_history IS 'Tracks all changes to quote shipping addresses for audit purposes';
COMMENT ON COLUMN quote_address_history.change_type IS 'Type of address change: create, update, lock, unlock';
COMMENT ON COLUMN quote_address_history.change_reason IS 'Optional reason for the address change';
COMMENT ON COLUMN quotes.shipping_address IS 'JSON object containing shipping address details';
COMMENT ON COLUMN quotes.address_locked IS 'Whether the address can be modified (locked after payment)';
COMMENT ON COLUMN quotes.address_updated_at IS 'Timestamp of last address update';
COMMENT ON COLUMN quotes.address_updated_by IS 'User who last updated the address'; 