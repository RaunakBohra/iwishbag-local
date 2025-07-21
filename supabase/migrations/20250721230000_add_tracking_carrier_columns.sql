-- Add missing tracking columns for carrier information
-- These columns are needed by TrackingService for carrier tracking functionality

ALTER TABLE quotes 
  ADD COLUMN IF NOT EXISTS shipping_carrier VARCHAR(100),
  ADD COLUMN IF NOT EXISTS tracking_number VARCHAR(100);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_quotes_shipping_carrier ON quotes(shipping_carrier);
CREATE INDEX IF NOT EXISTS idx_quotes_tracking_number ON quotes(tracking_number);

-- Add comments for documentation
COMMENT ON COLUMN quotes.shipping_carrier IS 'Shipping carrier name (e.g., DHL, FedEx, UPS)';
COMMENT ON COLUMN quotes.tracking_number IS 'External carrier tracking number';