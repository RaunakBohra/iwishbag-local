-- ============================================================================
-- Add Sales Tax Percentage to Route Customs Tiers
-- Date: 2025-01-28
-- Purpose: Enable route-specific sales tax configuration (e.g., US state tax)
-- ============================================================================

-- Add sales_tax_percentage column to route_customs_tiers table
ALTER TABLE route_customs_tiers 
ADD COLUMN IF NOT EXISTS sales_tax_percentage numeric(5,2) DEFAULT 0;

-- Add comment for documentation
COMMENT ON COLUMN route_customs_tiers.sales_tax_percentage IS 
'Sales tax percentage for origin country (e.g., US state tax). Only applies to specific routes like US->NP where origin country charges sales tax on international shipments.';

-- Add check constraint to ensure percentage is valid
ALTER TABLE route_customs_tiers
ADD CONSTRAINT check_sales_tax_percentage 
CHECK (sales_tax_percentage >= 0 AND sales_tax_percentage <= 100);

-- Update existing US->NP routes with typical sales tax (if any exist)
-- Note: This is optional and can be adjusted based on actual US state tax requirements
UPDATE route_customs_tiers 
SET sales_tax_percentage = 8.0  -- Example: 8% sales tax
WHERE origin_country = 'US' 
  AND destination_country = 'NP'
  AND sales_tax_percentage = 0;

-- Verification
DO $$
BEGIN
    RAISE NOTICE '==================================================';
    RAISE NOTICE 'Sales Tax Column Added to Route Customs Tiers!';
    RAISE NOTICE '==================================================';
    RAISE NOTICE 'Column: sales_tax_percentage (numeric 5,2)';
    RAISE NOTICE 'Default: 0%%';
    RAISE NOTICE 'Constraint: 0-100%% range';
    RAISE NOTICE 'Ready for route-specific sales tax configuration';
END $$;