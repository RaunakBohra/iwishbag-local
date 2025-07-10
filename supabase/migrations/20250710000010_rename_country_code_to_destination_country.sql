-- Rename country_code to destination_country for clarity
-- This migration directly renames the confusing country_code field to destination_country
-- to make it clear that this field represents where the package is being shipped TO

-- Step 1: Rename the column
ALTER TABLE quotes 
RENAME COLUMN country_code TO destination_country;

-- Step 2: Add comments to clarify field purposes
COMMENT ON COLUMN quotes.destination_country IS 'The country where the package will be shipped to (customer location)';
COMMENT ON COLUMN quotes.origin_country IS 'The country where the product is being purchased from (merchant location, e.g., US for Amazon.com)';

-- Step 3: Update any indexes that might reference country_code
-- (Add any specific index updates here if needed)

-- Step 4: Update any views that might reference country_code
-- (Add any specific view updates here if needed)