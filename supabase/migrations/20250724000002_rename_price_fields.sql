-- ==========================================
-- MIGRATION: Rename Price Fields for Currency Clarity
-- Renames confusing price field names to reflect actual currencies
-- ==========================================

-- 1. Rename base_total_usd to costprice_total_usd in quotes table
ALTER TABLE quotes RENAME COLUMN base_total_usd TO costprice_total_usd;

-- 2. Update constraint names to match new column name
ALTER TABLE quotes DROP CONSTRAINT quotes_base_total_check;
ALTER TABLE quotes ADD CONSTRAINT quotes_costprice_total_check CHECK (costprice_total_usd >= 0);

-- 3. Update items JSONB field to rename price_usd to costprice_origin
-- This updates all existing items arrays to use the new field name
UPDATE quotes 
SET items = (
  SELECT jsonb_agg(
    CASE 
      WHEN item ? 'price_usd' THEN 
        item - 'price_usd' || jsonb_build_object('costprice_origin', item->'price_usd')
      ELSE 
        item
    END
  )
  FROM jsonb_array_elements(items) AS item
)
WHERE items IS NOT NULL;

-- 4. Update indexes if they reference the old column name
-- (The existing indexes will be automatically updated by PostgreSQL)

-- 5. Add a comment to document the change
COMMENT ON COLUMN quotes.costprice_total_usd IS 'Total cost price in USD equivalent (converted from origin currency)';

-- Log the migration completion
DO $$
BEGIN
  RAISE NOTICE '✅ Price field renaming completed:';
  RAISE NOTICE '   • base_total_usd → costprice_total_usd';
  RAISE NOTICE '   • items[].price_usd → items[].costprice_origin';
  RAISE NOTICE '   • Constraint and indexes updated';
END
$$;