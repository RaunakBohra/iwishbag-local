-- Fix currency system to use purchase country currency for calculations
-- and final_currency only for display purposes

-- Add a comment to clarify the currency field purpose
COMMENT ON COLUMN public.quotes.currency IS 'Purchase country currency - used for all internal calculations (e.g., USD for US purchases)';

-- Add a comment to clarify the final_currency field purpose  
COMMENT ON COLUMN public.quotes.final_currency IS 'Customer display currency - used only for final display to customer (e.g., NPR for Nepali customers)';

-- Ensure currency is always set to the purchase country's currency
-- This will be handled by the application logic, but we add a constraint for clarity
ALTER TABLE public.quotes 
ADD CONSTRAINT quotes_currency_not_null CHECK (currency IS NOT NULL);

-- Add a comment to the deprecated item_currency column
COMMENT ON COLUMN public.quote_items.item_currency IS 'DEPRECATED: Use quotes.currency instead. This column is kept for backward compatibility only.'; 