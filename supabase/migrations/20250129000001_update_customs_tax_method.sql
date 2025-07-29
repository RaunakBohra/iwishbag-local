-- Update any items that still have 'customs' tax_method to use 'hsn' instead
UPDATE quote_items 
SET tax_method = 'hsn' 
WHERE tax_method = 'customs';

-- Add a check constraint to prevent 'customs' tax method in the future
ALTER TABLE quote_items 
DROP CONSTRAINT IF EXISTS quote_items_tax_method_check;

ALTER TABLE quote_items 
ADD CONSTRAINT quote_items_tax_method_check 
CHECK (tax_method IS NULL OR tax_method IN ('hsn', 'route', 'manual'));