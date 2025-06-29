-- Remove item_currency column entirely from quote_items table
-- We will use quotes.currency for purchase country currency and profiles.currency for local currency

ALTER TABLE public.quote_items 
DROP COLUMN IF EXISTS item_currency; 