-- Migration: Rename base_total_usd to costprice_total_usd for clarity
-- This makes it clear that this field represents the total cost price in USD

-- Rename the column
ALTER TABLE quotes 
RENAME COLUMN base_total_usd TO costprice_total_usd;

-- Update the check constraint name to match new column name
ALTER TABLE quotes 
DROP CONSTRAINT IF EXISTS quotes_base_total_check;

ALTER TABLE quotes 
ADD CONSTRAINT quotes_costprice_total_check CHECK (costprice_total_usd >= 0::numeric);

-- Add comment to clarify the field purpose
COMMENT ON COLUMN quotes.costprice_total_usd IS 'Total cost price in USD (sum of all item costprice_origin values converted to USD using exchange rates)';