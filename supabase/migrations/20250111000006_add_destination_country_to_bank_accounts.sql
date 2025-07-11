-- Add destination_country column to bank_account_details table
-- This field specifies which destination countries this bank account is intended for

ALTER TABLE public.bank_account_details 
ADD COLUMN IF NOT EXISTS destination_country TEXT;

-- Add comment to explain the purpose of this field
COMMENT ON COLUMN public.bank_account_details.destination_country IS 'Destination country this bank account is intended for (optional, for country-specific bank accounts)';

-- Create index for faster queries when filtering by destination country
CREATE INDEX IF NOT EXISTS idx_bank_account_details_destination_country 
ON public.bank_account_details(destination_country);

-- Add index for combined currency and destination country queries (if currency_code exists)
-- First check if currency_code column exists, if not skip this index
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'bank_account_details' 
        AND column_name = 'currency_code'
        AND table_schema = 'public'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_bank_account_details_currency_destination 
        ON public.bank_account_details(currency_code, destination_country);
    END IF;
END
$$;

-- Update RLS policies to ensure proper access control
-- Bank account details should be viewable by authenticated users for payment purposes
-- but only admins can modify them

-- Note: The existing RLS policies should continue to work with the new column
-- No additional RLS changes needed since this is just an additional filter field