-- Fix quote status constraint to include all statuses from status management
-- This migration updates the constraint to match the statuses configured in the UI

-- First, drop the existing constraint
ALTER TABLE quotes DROP CONSTRAINT IF EXISTS valid_quote_status;

-- Add new constraint that includes all possible statuses
-- These should match what's configured in the status management system
ALTER TABLE quotes ADD CONSTRAINT valid_quote_status 
CHECK (status IN (
  -- Quote statuses
  'pending', 'sent', 'approved', 'rejected', 'expired', 'calculated',
  -- Order statuses (quotes become orders after payment)
  'payment_pending', 'processing', 'paid', 'ordered', 'shipped', 'completed', 'cancelled'
));

-- Add comment to explain the status flow
COMMENT ON CONSTRAINT valid_quote_status ON quotes IS 
'Quotes can have quote statuses (pending to approved) and then transition to order statuses (payment_pending/processing to completed) after checkout';

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_quotes_status ON quotes(status);
CREATE INDEX IF NOT EXISTS idx_quotes_status_created ON quotes(status, created_at);