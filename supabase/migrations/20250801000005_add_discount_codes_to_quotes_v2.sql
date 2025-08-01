-- Add discount_codes column to quotes_v2 table to track applied discount codes
ALTER TABLE quotes_v2 
ADD COLUMN IF NOT EXISTS discount_codes TEXT[] DEFAULT NULL;

-- Add applied_discounts column to store detailed discount information
ALTER TABLE quotes_v2 
ADD COLUMN IF NOT EXISTS applied_discounts JSONB DEFAULT NULL;

-- Create index for efficient discount code queries
CREATE INDEX IF NOT EXISTS idx_quotes_v2_discount_codes ON quotes_v2 USING GIN(discount_codes);

-- Add comments for documentation
COMMENT ON COLUMN quotes_v2.discount_codes IS 'Array of discount codes applied to this quote';
COMMENT ON COLUMN quotes_v2.applied_discounts IS 'Detailed information about applied discounts including amounts and components';