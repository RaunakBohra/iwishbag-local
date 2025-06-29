-- Add shipping carrier and delivery days fields to quotes table
-- This allows storing carrier information and delivery timeframes

-- Add new columns to quotes table
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS shipping_carrier TEXT;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS shipping_delivery_days TEXT;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_quotes_shipping_carrier ON quotes(shipping_carrier);
CREATE INDEX IF NOT EXISTS idx_quotes_shipping_delivery_days ON quotes(shipping_delivery_days);

-- Add comments for documentation
COMMENT ON COLUMN quotes.shipping_carrier IS 'Shipping carrier used (e.g., DHL, FedEx, USPS)';
COMMENT ON COLUMN quotes.shipping_delivery_days IS 'Expected delivery timeframe (e.g., 3-5 days, 5-10 days)';

-- Update existing quotes to have default values
UPDATE quotes 
SET 
  shipping_carrier = 'Standard',
  shipping_delivery_days = '7-14'
WHERE shipping_carrier IS NULL; 