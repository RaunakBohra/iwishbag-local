-- Drop the old country and country_code columns from user_addresses table
-- Since we're now using only destination_country field

-- First check if there are any constraints or indexes on these columns
-- Drop any indexes if they exist
DROP INDEX IF EXISTS idx_user_addresses_country;
DROP INDEX IF EXISTS idx_user_addresses_country_code;

-- Now drop the columns
ALTER TABLE public.user_addresses 
DROP COLUMN IF EXISTS country,
DROP COLUMN IF EXISTS country_code;

-- Add comment explaining the change
COMMENT ON TABLE public.user_addresses IS 'User shipping addresses - simplified to use only destination_country field for country information';