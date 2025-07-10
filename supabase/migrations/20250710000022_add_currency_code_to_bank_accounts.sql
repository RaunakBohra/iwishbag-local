-- Add currency_code column to bank_account_details table
-- This fixes the schema mismatch where the get_bank_details_for_email function expects currency_code

-- Add currency_code column to bank_account_details table
ALTER TABLE public.bank_account_details 
ADD COLUMN IF NOT EXISTS currency_code TEXT;

-- Update existing records with currency codes based on country_code
UPDATE public.bank_account_details 
SET currency_code = CASE 
    WHEN country_code = 'US' THEN 'USD'
    WHEN country_code = 'IN' THEN 'INR' 
    WHEN country_code = 'NP' THEN 'NPR'
    WHEN country_code = 'GB' THEN 'GBP'
    WHEN country_code = 'AU' THEN 'AUD'
    WHEN country_code = 'CA' THEN 'CAD'
    WHEN country_code = 'JP' THEN 'JPY'
    WHEN country_code = 'EU' THEN 'EUR'
    ELSE 'USD' -- Default to USD for unknown countries
END
WHERE currency_code IS NULL;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_bank_account_details_currency_code 
ON public.bank_account_details(currency_code);

-- Add index for combined country_code and currency_code queries
CREATE INDEX IF NOT EXISTS idx_bank_account_details_country_currency 
ON public.bank_account_details(country_code, currency_code);

-- Add comment explaining the purpose
COMMENT ON COLUMN public.bank_account_details.currency_code IS 'Currency code for the bank account (e.g., USD, INR, NPR). Used by email functions to filter bank accounts by currency.';

-- Verify the update worked
DO $$
BEGIN
    RAISE NOTICE 'Bank account details updated with currency codes';
    RAISE NOTICE 'Records updated: %', (SELECT COUNT(*) FROM public.bank_account_details WHERE currency_code IS NOT NULL);
END $$;