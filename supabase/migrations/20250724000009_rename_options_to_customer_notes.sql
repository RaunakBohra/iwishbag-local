-- Rename 'options' to 'customer_notes' in all quotes items JSON
-- This migration ensures that all existing data is properly updated
-- and that the column name change is permanent for all future data

-- First, update all existing quotes to rename the 'options' field to 'customer_notes' in items JSONB
UPDATE quotes 
SET items = (
  SELECT jsonb_agg(
    CASE 
      WHEN item ? 'options' THEN 
        (item - 'options') || jsonb_build_object('customer_notes', item->>'options')
      ELSE 
        item
    END
  )
  FROM jsonb_array_elements(items) AS item
) 
WHERE items IS NOT NULL 
AND jsonb_typeof(items) = 'array'
AND EXISTS (
  SELECT 1 
  FROM jsonb_array_elements(items) AS item 
  WHERE item ? 'options'
);

-- Add a comment to document this change
COMMENT ON COLUMN quotes.items IS 'JSONB array of quote items. Each item contains: id, name, url?, image?, customer_notes?, quantity, costprice_origin, weight_kg, smart_data. The customer_notes field was previously named options.';