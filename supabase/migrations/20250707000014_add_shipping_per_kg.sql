-- Add shipping_per_kg field to shipping routes for weight-based cost calculation
ALTER TABLE shipping_routes 
ADD COLUMN IF NOT EXISTS shipping_per_kg DECIMAL(10,2) DEFAULT 0.00;

-- Add comment explaining the shipping_per_kg field
COMMENT ON COLUMN shipping_routes.shipping_per_kg IS 'Additional shipping cost per kg of weight (multiplied by item weight and added to base cost)';

-- Update existing routes to have default shipping_per_kg values
UPDATE shipping_routes 
SET shipping_per_kg = cost_per_kg 
WHERE shipping_per_kg IS NULL OR shipping_per_kg = 0;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_shipping_routes_shipping_per_kg ON shipping_routes(shipping_per_kg); 