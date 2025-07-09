-- Add order-related statuses to quotes table check constraint
-- This allows quotes to transition into order statuses after payment

-- First, drop the existing constraint
ALTER TABLE quotes DROP CONSTRAINT IF EXISTS valid_quote_status;

-- Add new constraint that includes both quote and order statuses
ALTER TABLE quotes ADD CONSTRAINT valid_quote_status 
CHECK (status IN (
  -- Quote statuses
  'pending', 'sent', 'approved', 'rejected', 'expired', 'calculated',
  -- Order statuses (quotes become orders after payment)
  'payment_pending', 'paid', 'ordered', 'shipped', 'completed', 'cancelled'
));

-- Add comment to explain the status flow
COMMENT ON CONSTRAINT valid_quote_status ON quotes IS 
'Quotes can have quote statuses (pending to approved) and then transition to order statuses (payment_pending to completed) after checkout';