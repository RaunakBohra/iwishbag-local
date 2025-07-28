-- ============================================================================
-- Add Shipping Fields to Consolidation Groups
-- ============================================================================
-- This migration adds shipping-related fields to the consolidation_groups table
-- to support the shipping label generation and tracking functionality.

-- Add shipping carrier field
ALTER TABLE consolidation_groups 
ADD COLUMN IF NOT EXISTS shipping_carrier text
CHECK (shipping_carrier IN ('ups', 'fedex', 'usps', 'dhl', 'other'));

-- Add shipping tracking number field
ALTER TABLE consolidation_groups 
ADD COLUMN IF NOT EXISTS shipping_tracking_number text;

-- Add shipped date field
ALTER TABLE consolidation_groups 
ADD COLUMN IF NOT EXISTS shipped_date timestamp with time zone;

-- Add delivered date field for future use
ALTER TABLE consolidation_groups 
ADD COLUMN IF NOT EXISTS delivered_date timestamp with time zone;

-- Create index for tracking number lookups
CREATE INDEX IF NOT EXISTS idx_consolidation_groups_tracking 
ON consolidation_groups(shipping_tracking_number) 
WHERE shipping_tracking_number IS NOT NULL;

-- Create index for shipped date queries
CREATE INDEX IF NOT EXISTS idx_consolidation_groups_shipped_date 
ON consolidation_groups(shipped_date) 
WHERE shipped_date IS NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN consolidation_groups.shipping_carrier IS 'Carrier used for final shipment (ups, fedex, usps, dhl, other)';
COMMENT ON COLUMN consolidation_groups.shipping_tracking_number IS 'Tracking number for the consolidated package shipment';
COMMENT ON COLUMN consolidation_groups.shipped_date IS 'Date when the consolidated package was shipped';
COMMENT ON COLUMN consolidation_groups.delivered_date IS 'Date when the consolidated package was delivered to customer';