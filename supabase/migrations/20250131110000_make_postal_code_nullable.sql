-- Make postal_code column nullable in delivery_addresses table
-- This allows postal codes to be optional for countries where they're not commonly used

ALTER TABLE delivery_addresses 
ALTER COLUMN postal_code DROP NOT NULL;

-- Update any existing empty string postal codes to NULL for consistency
UPDATE delivery_addresses 
SET postal_code = NULL 
WHERE postal_code = '';

-- Add a comment to document the change
COMMENT ON COLUMN delivery_addresses.postal_code IS 'Postal code - optional for some countries like Nepal, required for others like US/India';