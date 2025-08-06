-- Fix customer_discount_usage table to include missing columns for coupon system
-- Corrected version without invalid references

-- First, add the missing columns without foreign key constraints
ALTER TABLE customer_discount_usage
ADD COLUMN IF NOT EXISTS order_id UUID,
ADD COLUMN IF NOT EXISTS campaign_id UUID,
ADD COLUMN IF NOT EXISTS original_amount NUMERIC(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'USD',
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Add indexes for performance (only for columns that now exist)
CREATE INDEX IF NOT EXISTS idx_customer_discount_usage_order ON customer_discount_usage(order_id) WHERE order_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_customer_discount_usage_campaign ON customer_discount_usage(campaign_id) WHERE campaign_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_customer_discount_usage_quote ON customer_discount_usage(quote_id) WHERE quote_id IS NOT NULL;

-- Update the unique constraint to allow multiple uses of same discount (for different quotes/orders)
-- First drop the existing constraint
ALTER TABLE customer_discount_usage DROP CONSTRAINT IF EXISTS customer_discount_usage_customer_id_discount_code_id_key;

-- Add a new constraint that allows multiple uses but prevents duplicate uses on same quote
-- Only add this if quote_id column exists and is being used
ALTER TABLE customer_discount_usage 
ADD CONSTRAINT customer_discount_usage_customer_quote_code_unique 
UNIQUE (customer_id, quote_id, discount_code_id);

-- Add comments for documentation
COMMENT ON COLUMN customer_discount_usage.order_id IS 'Reference to future order when quote becomes an order (nullable during quote stage)';
COMMENT ON COLUMN customer_discount_usage.campaign_id IS 'Reference to discount campaign (if applicable)';
COMMENT ON COLUMN customer_discount_usage.original_amount IS 'Original amount before discount was applied';
COMMENT ON COLUMN customer_discount_usage.currency IS 'Currency code for the discount amounts';
COMMENT ON COLUMN customer_discount_usage.created_at IS 'When the discount usage record was created';

-- Update existing records to have created_at based on used_at
UPDATE customer_discount_usage 
SET created_at = COALESCE(used_at, NOW())
WHERE created_at IS NULL;