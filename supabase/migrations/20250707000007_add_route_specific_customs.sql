-- Add origin_country and destination_country to customs_rules table for route-specific customs
ALTER TABLE customs_rules ADD COLUMN origin_country VARCHAR(2);
ALTER TABLE customs_rules ADD COLUMN destination_country VARCHAR(2);

-- Create index for efficient route-based customs queries
CREATE INDEX idx_customs_rules_route 
ON customs_rules(origin_country, destination_country, is_active, priority);

-- Update existing customs rules to have default values
-- This ensures backward compatibility
UPDATE customs_rules 
SET origin_country = 'US', destination_country = 'US'
WHERE origin_country IS NULL OR destination_country IS NULL;

-- Add comments to explain the new columns
COMMENT ON COLUMN customs_rules.origin_country IS 'Origin country for route-specific customs rules (e.g., IN for India→US route)';
COMMENT ON COLUMN customs_rules.destination_country IS 'Destination country for route-specific customs rules (e.g., US for India→US route)'; 