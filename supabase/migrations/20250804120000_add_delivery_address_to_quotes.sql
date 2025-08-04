-- Add delivery_address_id to quotes_v2 table to link quotes with user addresses
-- This enables address tracking and display on admin side

-- Add delivery_address_id column to quotes_v2 table
ALTER TABLE quotes_v2 
ADD COLUMN delivery_address_id UUID REFERENCES delivery_addresses(id);

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_quotes_v2_delivery_address_id 
ON quotes_v2(delivery_address_id);

-- Add delivery_address_id column to existing quotes table as well for consistency
ALTER TABLE quotes 
ADD COLUMN delivery_address_id UUID REFERENCES delivery_addresses(id);

-- Add index for existing quotes table
CREATE INDEX IF NOT EXISTS idx_quotes_delivery_address_id 
ON quotes(delivery_address_id);

-- Add comment for documentation
COMMENT ON COLUMN quotes_v2.delivery_address_id IS 'References the delivery address selected by the customer during quote creation';
COMMENT ON COLUMN quotes.delivery_address_id IS 'References the delivery address selected by the customer during quote creation';