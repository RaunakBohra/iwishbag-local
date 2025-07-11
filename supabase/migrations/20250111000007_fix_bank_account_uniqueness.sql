-- Fix potential issues with multiple bank accounts per currency
-- This migration ensures proper handling of bank account selection

-- First, let's check if we need to update any existing bank accounts
-- Set is_fallback = true for accounts without destination_country
UPDATE public.bank_account_details
SET is_fallback = true
WHERE destination_country IS NULL 
  AND is_fallback IS NULL;

-- Ensure only one fallback account per country
-- Keep the first (oldest) as fallback if multiple exist
UPDATE public.bank_account_details bd1
SET is_fallback = false
WHERE is_fallback = true
  AND EXISTS (
    SELECT 1 
    FROM public.bank_account_details bd2
    WHERE bd2.country_code = bd1.country_code
      AND bd2.is_fallback = true
      AND bd2.created_at < bd1.created_at
  );

-- Add a comment to clarify the usage
COMMENT ON COLUMN public.bank_account_details.is_fallback IS 
'Indicates if this account should be used as fallback when no country-specific account is found. Only one fallback per currency allowed.';

-- Create a function to get the appropriate bank account
CREATE OR REPLACE FUNCTION get_bank_account_for_order(
  p_country_code TEXT,
  p_destination_country TEXT DEFAULT NULL
)
RETURNS SETOF public.bank_account_details AS $$
BEGIN
  -- First try to find country-specific account
  IF p_destination_country IS NOT NULL THEN
    RETURN QUERY
    SELECT * FROM public.bank_account_details
    WHERE country_code = p_country_code
      AND destination_country = p_destination_country
      AND is_active = true
    ORDER BY created_at DESC
    LIMIT 1;
    
    -- If found, return
    IF FOUND THEN
      RETURN;
    END IF;
  END IF;
  
  -- If no country-specific account, return fallback
  RETURN QUERY
  SELECT * FROM public.bank_account_details
  WHERE country_code = p_country_code
    AND is_fallback = true
    AND is_active = true
  ORDER BY created_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_bank_account_for_order(TEXT, TEXT) TO authenticated;