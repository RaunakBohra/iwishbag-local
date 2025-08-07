-- ============================================================================
-- Fix USD to Origin Currency Schema Migration
-- Updates JSONB items structure and quote_items_v2 table to use origin currency
-- ============================================================================

-- Step 1: Update JSONB items structure in quotes table
-- Convert unit_price_usd to unit_price_origin in the items JSONB array
UPDATE quotes 
SET items = (
  SELECT jsonb_agg(
    CASE 
      WHEN item ? 'unit_price_usd' THEN
        -- Replace unit_price_usd with unit_price_origin
        (item - 'unit_price_usd') || jsonb_build_object('unit_price_origin', item->'unit_price_usd')
      ELSE 
        item
    END
  )
  FROM jsonb_array_elements(items) AS item
)
WHERE jsonb_typeof(items) = 'array'
AND EXISTS (
  SELECT 1 
  FROM jsonb_array_elements(items) AS item 
  WHERE item ? 'unit_price_usd'
);

-- Step 2: Update JSONB items structure in quotes_v2 table (if it exists)
UPDATE quotes_v2 
SET items = (
  SELECT jsonb_agg(
    CASE 
      WHEN item ? 'unit_price_usd' THEN
        -- Replace unit_price_usd with unit_price_origin
        (item - 'unit_price_usd') || jsonb_build_object('unit_price_origin', item->'unit_price_usd')
      ELSE 
        item
    END
  )
  FROM jsonb_array_elements(items) AS item
)
WHERE jsonb_typeof(items) = 'array'
AND EXISTS (
  SELECT 1 
  FROM jsonb_array_elements(items) AS item 
  WHERE item ? 'unit_price_usd'
);

-- Step 3: Rename columns in quote_items_v2 table (if it exists)
DO $$ 
BEGIN
  -- Check if quote_items_v2 table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'quote_items_v2') THEN
    
    -- Rename unit_price_usd to unit_price_origin
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quote_items_v2' AND column_name = 'unit_price_usd') THEN
      ALTER TABLE quote_items_v2 RENAME COLUMN unit_price_usd TO unit_price_origin;
    END IF;
    
    -- Rename subtotal_usd to subtotal_origin  
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quote_items_v2' AND column_name = 'subtotal_usd') THEN
      ALTER TABLE quote_items_v2 RENAME COLUMN subtotal_usd TO subtotal_origin;
    END IF;
    
    -- Update the generated column to use the new field names
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quote_items_v2' AND column_name = 'subtotal_origin') THEN
      -- Drop the old generated column
      ALTER TABLE quote_items_v2 DROP COLUMN IF EXISTS subtotal_origin;
      
      -- Recreate it with the correct formula
      ALTER TABLE quote_items_v2 ADD COLUMN subtotal_origin DECIMAL(10, 2) GENERATED ALWAYS AS (quantity * unit_price_origin) STORED;
    END IF;
    
  END IF;
END $$;

-- Step 4: Update calculation_data JSONB to ensure origin_currency is set
UPDATE quotes 
SET calculation_data = COALESCE(calculation_data, '{}'::jsonb) || 
  jsonb_build_object('origin_currency', 
    CASE origin_country 
      WHEN 'US' THEN 'USD'
      WHEN 'IN' THEN 'INR' 
      WHEN 'NP' THEN 'NPR'
      WHEN 'CN' THEN 'CNY'
      WHEN 'GB' THEN 'GBP'
      WHEN 'AU' THEN 'AUD'
      WHEN 'CA' THEN 'CAD'
      WHEN 'DE' THEN 'EUR'
      WHEN 'FR' THEN 'EUR'
      WHEN 'IT' THEN 'EUR'
      WHEN 'ES' THEN 'EUR'
      WHEN 'NL' THEN 'EUR'
      WHEN 'JP' THEN 'JPY'
      WHEN 'KR' THEN 'KRW'
      WHEN 'SG' THEN 'SGD'
      WHEN 'HK' THEN 'HKD'
      WHEN 'TH' THEN 'THB'
      WHEN 'MY' THEN 'MYR'
      WHEN 'ID' THEN 'IDR'
      WHEN 'PH' THEN 'PHP'
      WHEN 'VN' THEN 'VND'
      WHEN 'BD' THEN 'BDT'
      WHEN 'LK' THEN 'LKR'
      WHEN 'PK' THEN 'PKR'
      WHEN 'AE' THEN 'AED'
      WHEN 'SA' THEN 'SAR'
      WHEN 'ZA' THEN 'ZAR'
      WHEN 'BR' THEN 'BRL'
      WHEN 'MX' THEN 'MXN'
      WHEN 'RU' THEN 'RUB'
      WHEN 'TR' THEN 'TRY'
      WHEN 'EG' THEN 'EGP'
      WHEN 'NG' THEN 'NGN'
      WHEN 'KE' THEN 'KES'
      WHEN 'GH' THEN 'GHS'
      ELSE 'USD'
    END
  )
WHERE calculation_data IS NULL 
   OR NOT (calculation_data ? 'origin_currency')
   OR calculation_data->>'origin_currency' IS NULL;

-- Step 5: Do the same for quotes_v2 table
UPDATE quotes_v2 
SET calculation_data = COALESCE(calculation_data, '{}'::jsonb) || 
  jsonb_build_object('origin_currency', 
    CASE origin_country 
      WHEN 'US' THEN 'USD'
      WHEN 'IN' THEN 'INR' 
      WHEN 'NP' THEN 'NPR'
      WHEN 'CN' THEN 'CNY'
      WHEN 'GB' THEN 'GBP'
      WHEN 'AU' THEN 'AUD'
      WHEN 'CA' THEN 'CAD'
      WHEN 'DE' THEN 'EUR'
      WHEN 'FR' THEN 'EUR'
      WHEN 'IT' THEN 'EUR'
      WHEN 'ES' THEN 'EUR'
      WHEN 'NL' THEN 'EUR'
      WHEN 'JP' THEN 'JPY'
      WHEN 'KR' THEN 'KRW'
      WHEN 'SG' THEN 'SGD'
      WHEN 'HK' THEN 'HKD'
      WHEN 'TH' THEN 'THB'
      WHEN 'MY' THEN 'MYR'
      WHEN 'ID' THEN 'IDR'
      WHEN 'PH' THEN 'PHP'
      WHEN 'VN' THEN 'VND'
      WHEN 'BD' THEN 'BDT'
      WHEN 'LK' THEN 'LKR'
      WHEN 'PK' THEN 'PKR'
      WHEN 'AE' THEN 'AED'
      WHEN 'SA' THEN 'SAR'
      WHEN 'ZA' THEN 'ZAR'
      WHEN 'BR' THEN 'BRL'
      WHEN 'MX' THEN 'MXN'
      WHEN 'RU' THEN 'RUB'
      WHEN 'TR' THEN 'TRY'
      WHEN 'EG' THEN 'EGP'
      WHEN 'NG' THEN 'NGN'
      WHEN 'KE' THEN 'KES'
      WHEN 'GH' THEN 'GHS'
      ELSE 'USD'
    END
  )
WHERE calculation_data IS NULL 
   OR NOT (calculation_data ? 'origin_currency')
   OR calculation_data->>'origin_currency' IS NULL;

-- Step 6: Create a verification function to check the migration
CREATE OR REPLACE FUNCTION verify_usd_to_origin_migration()
RETURNS TABLE (
  table_name TEXT,
  total_quotes INTEGER,
  quotes_with_usd_fields INTEGER,
  quotes_with_origin_fields INTEGER,
  migration_success BOOLEAN
) AS $$
BEGIN
  -- Check quotes table
  RETURN QUERY
  SELECT 
    'quotes'::TEXT,
    COUNT(*)::INTEGER as total_quotes,
    COUNT(CASE WHEN EXISTS (
      SELECT 1 FROM jsonb_array_elements(items) AS item 
      WHERE item ? 'unit_price_usd'
    ) THEN 1 END)::INTEGER as quotes_with_usd_fields,
    COUNT(CASE WHEN EXISTS (
      SELECT 1 FROM jsonb_array_elements(items) AS item 
      WHERE item ? 'unit_price_origin'
    ) THEN 1 END)::INTEGER as quotes_with_origin_fields,
    COUNT(CASE WHEN EXISTS (
      SELECT 1 FROM jsonb_array_elements(items) AS item 
      WHERE item ? 'unit_price_usd'
    ) THEN 1 END) = 0 as migration_success
  FROM quotes;
  
  -- Check quotes_v2 table if it exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'quotes_v2') THEN
    RETURN QUERY
    SELECT 
      'quotes_v2'::TEXT,
      COUNT(*)::INTEGER as total_quotes,
      COUNT(CASE WHEN EXISTS (
        SELECT 1 FROM jsonb_array_elements(items) AS item 
        WHERE item ? 'unit_price_usd'
      ) THEN 1 END)::INTEGER as quotes_with_usd_fields,
      COUNT(CASE WHEN EXISTS (
        SELECT 1 FROM jsonb_array_elements(items) AS item 
        WHERE item ? 'unit_price_origin'
      ) THEN 1 END)::INTEGER as quotes_with_origin_fields,
      COUNT(CASE WHEN EXISTS (
        SELECT 1 FROM jsonb_array_elements(items) AS item 
        WHERE item ? 'unit_price_usd'
      ) THEN 1 END) = 0 as migration_success
    FROM quotes_v2;
  END IF;

END;
$$ LANGUAGE plpgsql;

-- Step 7: Run verification and display results
SELECT * FROM verify_usd_to_origin_migration();

-- Step 8: Add helpful comments to the migration comments table
INSERT INTO system_settings (setting_key, setting_value, description) 
VALUES (
  'usd_to_origin_migration_completed',
  NOW()::TEXT,
  'Timestamp when USD to origin currency schema migration was completed'
) ON CONFLICT (setting_key) DO UPDATE SET 
  setting_value = EXCLUDED.setting_value,
  description = EXCLUDED.description,
  updated_at = NOW();

-- Migration completed successfully
SELECT 'USD to Origin Currency Schema Migration Completed' as status;