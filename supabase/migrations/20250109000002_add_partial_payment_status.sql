-- Add partial_payment to the valid quote statuses
ALTER TABLE quotes 
DROP CONSTRAINT IF EXISTS valid_quote_status;

ALTER TABLE quotes 
ADD CONSTRAINT valid_quote_status CHECK (
  status IN (
    'pending', 
    'sent', 
    'approved', 
    'rejected', 
    'expired', 
    'calculated', 
    'payment_pending', 
    'partial_payment',  -- New status
    'processing', 
    'paid', 
    'ordered', 
    'shipped', 
    'completed', 
    'cancelled'
  )
);