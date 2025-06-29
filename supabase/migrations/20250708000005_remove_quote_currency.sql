-- Remove quote_currency column from quotes table
-- This migration removes the quote_currency column as we're simplifying to use only final_currency

-- Drop the index first
DROP INDEX IF EXISTS idx_quotes_quote_currency;

-- Remove the column
ALTER TABLE quotes DROP COLUMN IF EXISTS quote_currency; 