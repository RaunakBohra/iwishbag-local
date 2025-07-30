-- Consolidate country columns in delivery_addresses table
-- Currently we have both 'country' and 'destination_country' which is redundant

-- Step 1: Copy any data from 'country' to 'destination_country' where destination_country is null
UPDATE public.delivery_addresses
SET destination_country = country
WHERE destination_country IS NULL AND country IS NOT NULL;

-- Step 2: Update destination_country to use proper 2-letter ISO codes if needed
UPDATE public.delivery_addresses
SET destination_country = UPPER(destination_country)
WHERE LENGTH(destination_country) = 2;

-- Step 3: Drop the redundant 'country' column
ALTER TABLE public.delivery_addresses DROP COLUMN IF EXISTS country;

-- Step 4: Add a check constraint to ensure destination_country is always 2 characters
ALTER TABLE public.delivery_addresses 
ADD CONSTRAINT destination_country_iso_code 
CHECK (LENGTH(destination_country) = 2);

-- Step 5: Make destination_country NOT NULL with a proper default
ALTER TABLE public.delivery_addresses 
ALTER COLUMN destination_country SET NOT NULL,
ALTER COLUMN destination_country SET DEFAULT 'US';

-- Step 6: Add comment for clarity
COMMENT ON COLUMN public.delivery_addresses.destination_country IS 'ISO 3166-1 alpha-2 country code';