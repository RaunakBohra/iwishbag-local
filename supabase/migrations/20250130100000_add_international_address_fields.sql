-- Add new fields to delivery_addresses table for better international shipping support
ALTER TABLE delivery_addresses 
ADD COLUMN IF NOT EXISTS company_name TEXT,
ADD COLUMN IF NOT EXISTS tax_id TEXT,
ADD COLUMN IF NOT EXISTS delivery_instructions TEXT;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_delivery_addresses_company_name ON delivery_addresses(company_name) WHERE company_name IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_delivery_addresses_destination_country ON delivery_addresses(destination_country);

-- Add comments for documentation
COMMENT ON COLUMN delivery_addresses.company_name IS 'Company or organization name for business deliveries';
COMMENT ON COLUMN delivery_addresses.tax_id IS 'Tax ID, VAT number, or other customs identifier';
COMMENT ON COLUMN delivery_addresses.delivery_instructions IS 'Special delivery instructions (max 500 chars)';

-- Update RLS policies to include new fields
-- The existing policies should already cover these as they use SELECT *