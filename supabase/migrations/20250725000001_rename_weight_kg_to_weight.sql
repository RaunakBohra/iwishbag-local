-- ==========================================
-- MIGRATION: Rename weight_kg to weight in items JSONB
-- Simplifies field name as units are already implied
-- ==========================================

-- Update all existing quotes to rename weight_kg to weight in items array
UPDATE quotes 
SET items = (
  SELECT jsonb_agg(
    CASE 
      WHEN item ? 'weight_kg' THEN 
        item - 'weight_kg' || jsonb_build_object('weight', item->'weight_kg')
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
  WHERE item ? 'weight_kg'
);

-- Add comment to clarify the field purpose
COMMENT ON COLUMN quotes.items IS 'JSONB array of quote items. Fields: costprice_origin (cost in origin currency), weight (in kg), etc.';

-- Log the migration completion
DO $$
BEGIN
  RAISE NOTICE '✅ Weight field renaming completed:';
  RAISE NOTICE '   • items[].weight_kg → items[].weight';
END
$$;