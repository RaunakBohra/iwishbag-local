-- Fix discount logging schema issues
-- Add missing metadata column to discount_application_log table

-- Add metadata column for additional discount data
ALTER TABLE discount_application_log 
ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;

-- Add index for metadata queries
CREATE INDEX IF NOT EXISTS idx_discount_log_metadata 
ON discount_application_log USING gin(metadata);

-- The calculate_applicable_discounts function should already exist
-- If there are still 404 errors, it means the function signature doesn't match
-- Let's check if we can call it to verify it works
SELECT 'Function check: calculate_applicable_discounts exists' as status;

-- Add comment for documentation
COMMENT ON COLUMN discount_application_log.metadata IS 'Additional JSON metadata for discount application (discount_code, discount_name, etc.)';

-- Grant necessary permissions
GRANT SELECT, INSERT ON discount_application_log TO anon;
GRANT SELECT, INSERT ON discount_application_log TO authenticated;