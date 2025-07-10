-- Remove CHECK constraint on preferred_display_currency to allow dynamic currencies from country_settings table
-- This allows the system to use any currency available in the database instead of hardcoded list

-- Drop the existing constraint
ALTER TABLE public.profiles 
DROP CONSTRAINT IF EXISTS valid_currency;

-- Add a comment to document the change
COMMENT ON COLUMN public.profiles.preferred_display_currency IS 'User preferred display currency - now accepts any currency code from country_settings table instead of hardcoded list';