-- Add weight_unit column to shipping_routes table
ALTER TABLE shipping_routes 
ADD COLUMN weight_unit TEXT NOT NULL DEFAULT 'kg' CHECK (weight_unit IN ('kg', 'lb'));

-- Update existing routes to use 'kg' as default
UPDATE shipping_routes SET weight_unit = 'kg' WHERE weight_unit IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN shipping_routes.weight_unit IS 'Weight unit for this shipping route (kg or lb)'; 