-- Make item_currency nullable in quote_items table
-- Since we removed item_currency from the form and use final_currency instead

ALTER TABLE public.quote_items 
ALTER COLUMN item_currency DROP NOT NULL;

-- Add a comment to explain the change
COMMENT ON COLUMN public.quote_items.item_currency IS 'Deprecated: Use final_currency from quotes table instead. This column is kept for backward compatibility.'; 