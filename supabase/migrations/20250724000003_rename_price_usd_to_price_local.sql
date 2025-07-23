-- Migration: Rename price_usd to costprice_origin in quotes.items JSONB
-- This fixes the misleading field name - prices are stored in origin currency, not USD

-- Update all existing quotes to rename price_usd to costprice_origin in items array
UPDATE quotes 
SET items = (
  SELECT jsonb_agg(
    CASE 
      WHEN item ? 'price_usd' 
      THEN item - 'price_usd' || jsonb_build_object('costprice_origin', item->'price_usd')
      WHEN item ? 'price_local'
      THEN item - 'price_local' || jsonb_build_object('costprice_origin', item->'price_local')
      ELSE item
    END
  )
  FROM jsonb_array_elements(items) AS item
)
WHERE items IS NOT NULL 
AND jsonb_typeof(items) = 'array'
AND EXISTS (
  SELECT 1 
  FROM jsonb_array_elements(items) AS item 
  WHERE item ? 'price_usd' OR item ? 'price_local'
);

-- Add comment to clarify the field purpose
COMMENT ON COLUMN quotes.items IS 'JSONB array of quote items. costprice_origin field stores cost prices in origin country currency (INR, NPR, etc.), not USD.';