-- Add timestamp fields for quote lifecycle tracking
-- These fields are used by the quote timeline feature and triggers

-- Add timestamp columns
ALTER TABLE quotes 
ADD COLUMN IF NOT EXISTS sent_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS calculated_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS approved_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS paid_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS ordered_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS shipped_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS delivered_at timestamp with time zone;

-- Add comments to explain the purpose of each field
COMMENT ON COLUMN quotes.sent_at IS 'Timestamp when the quote was sent to the customer';
COMMENT ON COLUMN quotes.calculated_at IS 'Timestamp when the quote was calculated with final pricing';
COMMENT ON COLUMN quotes.approved_at IS 'Timestamp when the customer approved the quote';
COMMENT ON COLUMN quotes.paid_at IS 'Timestamp when payment was received';
COMMENT ON COLUMN quotes.ordered_at IS 'Timestamp when the order was placed with the merchant';
COMMENT ON COLUMN quotes.shipped_at IS 'Timestamp when the order was shipped';
COMMENT ON COLUMN quotes.delivered_at IS 'Timestamp when the order was delivered to the customer';

-- Create indexes for commonly queried timestamp fields
CREATE INDEX IF NOT EXISTS idx_quotes_sent_at ON quotes(sent_at);
CREATE INDEX IF NOT EXISTS idx_quotes_paid_at ON quotes(paid_at);
CREATE INDEX IF NOT EXISTS idx_quotes_shipped_at ON quotes(shipped_at);