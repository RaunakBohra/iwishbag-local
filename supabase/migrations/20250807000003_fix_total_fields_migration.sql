-- ============================================================================
-- Fix Total Fields Migration - Corrected Version
-- Updates database total fields from USD-centric to origin currency system
-- ============================================================================

-- Step 1: Ensure origin currency total fields exist and are populated
UPDATE quotes_v2 
SET 
  total_origin_currency = COALESCE(
    total_origin_currency,
    -- Try to get from calculation_data first
    CAST(calculation_data->'calculation_steps'->>'total_origin_currency' AS DECIMAL(10,2)),
    -- For US quotes, use total_usd directly
    CASE WHEN origin_country = 'US' THEN total_usd END,
    -- For other quotes, prefer total_customer_currency if available
    CASE WHEN origin_country != 'US' THEN total_customer_currency END,
    -- Final fallback to total_usd
    total_usd,
    0
  )
WHERE total_origin_currency IS NULL;

-- Step 2: Populate costprice_total_origin and final_total_origin based on total_origin_currency
UPDATE quotes_v2 
SET 
  costprice_total_origin = COALESCE(costprice_total_origin, total_origin_currency * 0.8), -- Estimate 80% is cost price
  final_total_origin = COALESCE(final_total_origin, total_origin_currency)
WHERE costprice_total_origin IS NULL OR final_total_origin IS NULL;

-- Step 3: Add constraints with corrected syntax
DO $$
BEGIN
  -- Add constraints if they don't already exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'check_total_origin_currency_positive') THEN
    ALTER TABLE quotes_v2 ADD CONSTRAINT check_total_origin_currency_positive CHECK (total_origin_currency IS NULL OR total_origin_currency >= 0);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'check_costprice_total_origin_positive') THEN
    ALTER TABLE quotes_v2 ADD CONSTRAINT check_costprice_total_origin_positive CHECK (costprice_total_origin IS NULL OR costprice_total_origin >= 0);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'check_final_total_origin_positive') THEN
    ALTER TABLE quotes_v2 ADD CONSTRAINT check_final_total_origin_positive CHECK (final_total_origin IS NULL OR final_total_origin >= 0);
  END IF;
END $$;

-- Step 4: Update system setting
INSERT INTO system_settings (setting_key, setting_value, description) 
VALUES (
  'total_fields_migration_fixed',
  NOW()::TEXT,
  'Timestamp when total fields migration fix was completed'
) ON CONFLICT (setting_key) DO UPDATE SET 
  setting_value = EXCLUDED.setting_value,
  description = EXCLUDED.description,
  updated_at = NOW();

-- Step 5: Verification query
SELECT 
  'Fixed Total Fields Migration Summary' as summary,
  COUNT(*) as total_quotes,
  COUNT(CASE WHEN total_origin_currency IS NOT NULL AND total_origin_currency > 0 THEN 1 END) as quotes_with_valid_origin_totals,
  COUNT(CASE WHEN costprice_total_origin IS NOT NULL AND costprice_total_origin > 0 THEN 1 END) as quotes_with_costprice_origin,
  COUNT(CASE WHEN final_total_origin IS NOT NULL AND final_total_origin > 0 THEN 1 END) as quotes_with_final_origin,
  ROUND(AVG(total_origin_currency), 2) as avg_total_origin,
  COUNT(CASE WHEN total_usd IS NOT NULL THEN 1 END) as quotes_with_usd_totals
FROM quotes_v2;

SELECT 'Database Total Fields Migration Fixed Successfully' as status;