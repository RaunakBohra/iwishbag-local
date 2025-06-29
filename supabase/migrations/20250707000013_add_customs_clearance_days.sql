-- Add customs clearance days to shipping routes
ALTER TABLE shipping_routes 
ADD COLUMN IF NOT EXISTS customs_clearance_days INTEGER DEFAULT 3;

-- Add comment explaining the customs_clearance_days
COMMENT ON COLUMN shipping_routes.customs_clearance_days IS 'Number of business days for customs clearance processing';

-- Update existing routes to have default customs clearance days
UPDATE shipping_routes 
SET customs_clearance_days = 3 
WHERE customs_clearance_days IS NULL; 