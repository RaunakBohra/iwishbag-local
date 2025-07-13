-- Remove CHECK constraints on status fields to enable dynamic status management
-- This allows the status management system to dynamically add/modify statuses
-- without requiring database schema changes

-- Remove quotes table status constraint
ALTER TABLE quotes DROP CONSTRAINT IF EXISTS valid_quote_status;

-- Remove payment_status constraint if it exists
ALTER TABLE quotes DROP CONSTRAINT IF EXISTS valid_payment_status;

-- Add comments to explain the new approach
COMMENT ON COLUMN quotes.status IS 
'Quote/Order status managed dynamically by the application. Valid values are configured in the status_management system settings table.';

COMMENT ON COLUMN quotes.payment_status IS 
'Payment status managed dynamically by the application. Valid values: unpaid, partial, paid, overpaid.';

-- Keep indexes for performance (these don't restrict values)
CREATE INDEX IF NOT EXISTS idx_quotes_status ON quotes(status);
CREATE INDEX IF NOT EXISTS idx_quotes_status_created ON quotes(status, created_at);
CREATE INDEX IF NOT EXISTS idx_quotes_payment_status ON quotes(payment_status);

-- Add validation function that can be used by the application layer
-- This is optional and doesn't enforce constraints at the database level
CREATE OR REPLACE FUNCTION is_valid_quote_status(status_value TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- This is a helper function for application-level validation
  -- It can be extended to check against the dynamic status configuration
  -- For now, it just ensures the status is not null/empty
  RETURN status_value IS NOT NULL AND trim(status_value) != '';
END;
$$;

-- Add comment explaining the new validation approach
COMMENT ON FUNCTION is_valid_quote_status(TEXT) IS 
'Application-level status validation helper. Actual validation is performed by the status management system.';