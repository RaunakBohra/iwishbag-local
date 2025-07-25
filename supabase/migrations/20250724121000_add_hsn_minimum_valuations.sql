-- ============================================================================
-- ADD HSN MINIMUM VALUATIONS - Critical for Currency Conversion System
-- Adds missing minimum_valuation_usd and requires_currency_conversion fields
-- ============================================================================

-- Add minimum valuations for all HSN codes based on typical product values
-- These are used for customs calculations and currency conversion
-- Also fix any missing subcategories and ensure classification_data is complete

-- Electronics and Technology
UPDATE hsn_master SET 
  minimum_valuation_usd = 50.00,
  requires_currency_conversion = true
WHERE hsn_code = '8517' AND minimum_valuation_usd IS NULL; -- Mobile phones & communication

UPDATE hsn_master SET 
  minimum_valuation_usd = 200.00,
  requires_currency_conversion = true
WHERE hsn_code = '8471' AND minimum_valuation_usd IS NULL; -- Computers & laptops

UPDATE hsn_master SET 
  minimum_valuation_usd = 100.00,
  requires_currency_conversion = true
WHERE hsn_code = '9013' AND minimum_valuation_usd IS NULL; -- Watches & smartwatches

UPDATE hsn_master SET 
  minimum_valuation_usd = 30.00,
  requires_currency_conversion = true
WHERE hsn_code = '8518' AND minimum_valuation_usd IS NULL; -- Audio equipment (headphones, speakers)

-- Clothing and Textiles
UPDATE hsn_master SET 
  minimum_valuation_usd = 5.00,
  requires_currency_conversion = true
WHERE hsn_code = '6109' AND minimum_valuation_usd IS NULL; -- T-shirts & casual wear

UPDATE hsn_master SET 
  minimum_valuation_usd = 15.00,
  requires_currency_conversion = true
WHERE hsn_code = '6204' AND minimum_valuation_usd IS NULL; -- Dresses & ethnic wear

UPDATE hsn_master SET 
  minimum_valuation_usd = 10.00,
  requires_currency_conversion = true
WHERE hsn_code = '6203' AND minimum_valuation_usd IS NULL; -- Men's jackets & coats

UPDATE hsn_master SET 
  minimum_valuation_usd = 20.00,
  requires_currency_conversion = true
WHERE hsn_code = '6404' AND minimum_valuation_usd IS NULL; -- Footwear & shoes

-- Accessories and Personal Items
UPDATE hsn_master SET 
  minimum_valuation_usd = 10.00,
  requires_currency_conversion = true
WHERE hsn_code = '4202' AND minimum_valuation_usd IS NULL; -- Bags & luggage

UPDATE hsn_master SET 
  minimum_valuation_usd = 5.00,
  requires_currency_conversion = true
WHERE hsn_code = '3304' AND minimum_valuation_usd IS NULL; -- Cosmetics & beauty products

-- Home and Furniture
UPDATE hsn_master SET 
  minimum_valuation_usd = 25.00,
  requires_currency_conversion = true
WHERE hsn_code = '9403' AND minimum_valuation_usd IS NULL; -- Furniture & home decor

-- Sports and Recreation
UPDATE hsn_master SET 
  minimum_valuation_usd = 15.00,
  requires_currency_conversion = true
WHERE hsn_code = '9506' AND minimum_valuation_usd IS NULL; -- Sports equipment

-- Books and Media
UPDATE hsn_master SET 
  minimum_valuation_usd = 8.00,
  requires_currency_conversion = true
WHERE hsn_code = '4901' AND minimum_valuation_usd IS NULL; -- Books & printed matter

-- Toys and Games
UPDATE hsn_master SET 
  minimum_valuation_usd = 12.00,
  requires_currency_conversion = true
WHERE hsn_code = '9503' AND minimum_valuation_usd IS NULL; -- Toys & games

-- Add subcategories for HSN codes that don't have them
UPDATE hsn_master SET subcategory = 'Mobile Phones' WHERE hsn_code = '8517' AND subcategory IS NULL;
UPDATE hsn_master SET subcategory = 'Laptops & Computers' WHERE hsn_code = '8471' AND subcategory IS NULL;
UPDATE hsn_master SET subcategory = 'Casual Wear' WHERE hsn_code = '6109' AND subcategory IS NULL;
UPDATE hsn_master SET subcategory = 'Ethnic Wear' WHERE hsn_code = '6204' AND subcategory IS NULL;
UPDATE hsn_master SET subcategory = 'Outerwear' WHERE hsn_code = '6203' AND subcategory IS NULL;
UPDATE hsn_master SET subcategory = 'Footwear' WHERE hsn_code = '6404' AND subcategory IS NULL;
UPDATE hsn_master SET subcategory = 'Luggage & Bags' WHERE hsn_code = '4202' AND subcategory IS NULL;
UPDATE hsn_master SET subcategory = 'Beauty Products' WHERE hsn_code = '3304' AND subcategory IS NULL;
UPDATE hsn_master SET subcategory = 'Home Furniture' WHERE hsn_code = '9403' AND subcategory IS NULL;
UPDATE hsn_master SET subcategory = 'Sports Equipment' WHERE hsn_code = '9506' AND subcategory IS NULL;
UPDATE hsn_master SET subcategory = 'Smartwatches' WHERE hsn_code = '9013' AND subcategory IS NULL;
UPDATE hsn_master SET subcategory = 'Audio Equipment' WHERE hsn_code = '8518' AND subcategory IS NULL;
UPDATE hsn_master SET subcategory = 'Books' WHERE hsn_code = '4901' AND subcategory IS NULL;
UPDATE hsn_master SET subcategory = 'Toys' WHERE hsn_code = '9503' AND subcategory IS NULL;

-- Ensure classification_data has the auto_classification structure for new HSN codes
UPDATE hsn_master 
SET classification_data = jsonb_set(
  COALESCE(classification_data, '{}'::jsonb),
  '{auto_classification}',
  jsonb_build_object(
    'keywords', ARRAY[]::text[],
    'confidence', 0.0
  )
)
WHERE classification_data IS NULL 
   OR NOT (classification_data ? 'auto_classification');

-- For any remaining HSN codes without minimum valuation, set a default
UPDATE hsn_master SET 
  minimum_valuation_usd = 10.00,
  requires_currency_conversion = true
WHERE minimum_valuation_usd IS NULL;

-- Verify the update
DO $$
DECLARE
  total_count INTEGER;
  updated_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_count FROM hsn_master;
  SELECT COUNT(*) INTO updated_count FROM hsn_master WHERE minimum_valuation_usd IS NOT NULL;
  
  RAISE NOTICE 'HSN Minimum Valuations Update Complete:';
  RAISE NOTICE 'Total HSN codes: %', total_count;
  RAISE NOTICE 'Updated with minimum valuations: %', updated_count;
  RAISE NOTICE 'All HSN codes now have minimum valuation data for currency conversion';
END $$;

-- Create index for efficient minimum valuation queries
CREATE INDEX IF NOT EXISTS idx_hsn_master_minimum_valuation ON hsn_master(minimum_valuation_usd) WHERE minimum_valuation_usd IS NOT NULL;

-- Update the materialized view if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_matviews WHERE matviewname = 'hsn_search_optimized') THEN
    REFRESH MATERIALIZED VIEW CONCURRENTLY hsn_search_optimized;
    RAISE NOTICE 'HSN search optimized view refreshed with minimum valuation data';
  END IF;
EXCEPTION WHEN OTHERS THEN
  -- Ignore errors if view doesn't exist or can't be refreshed
  RAISE NOTICE 'Could not refresh materialized view (this is normal if view does not exist)';
END $$;