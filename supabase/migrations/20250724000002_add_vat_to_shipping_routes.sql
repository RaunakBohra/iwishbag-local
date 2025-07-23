-- ============================================================================
-- ADD VAT HIERARCHY TO SHIPPING ROUTES
-- Implement VAT lookup hierarchy: shipping_routes → country_settings
-- Similar to exchange rate system for consistency
-- ============================================================================

-- Step 1: Add VAT percentage column to shipping_routes
ALTER TABLE shipping_routes 
ADD COLUMN IF NOT EXISTS vat_percentage NUMERIC(5,2) DEFAULT NULL;

-- Step 2: Add customs percentage column to shipping_routes (for completeness)
ALTER TABLE shipping_routes 
ADD COLUMN IF NOT EXISTS customs_percentage NUMERIC(5,2) DEFAULT NULL;

-- Step 3: Add comments for documentation
COMMENT ON COLUMN shipping_routes.vat_percentage IS 'VAT/GST percentage for destination country (e.g., 13.00 for 13%). Priority 1 in VAT lookup hierarchy.';
COMMENT ON COLUMN shipping_routes.customs_percentage IS 'Customs duty percentage (e.g., 5.00 for 5%). Priority 1 in customs lookup hierarchy.';
COMMENT ON COLUMN shipping_routes.exchange_rate IS 'Exchange rate from origin to destination currency. Priority 1 in exchange rate hierarchy.';

-- Step 4: Set up example VAT data for IN→NP route
UPDATE shipping_routes 
SET 
    vat_percentage = 13.00,  -- Nepal VAT rate
    customs_percentage = 0.00  -- No customs for IN→NP typically
WHERE origin_country = 'IN' 
AND destination_country = 'NP';

-- Step 5: Create index for efficient VAT lookups
CREATE INDEX IF NOT EXISTS idx_shipping_routes_vat_lookup 
ON shipping_routes (origin_country, destination_country, vat_percentage)
WHERE vat_percentage IS NOT NULL;

-- Step 6: Report the changes
DO $$
DECLARE
    route_record RECORD;
BEGIN
    RAISE NOTICE '🎯 [VAT-HIERARCHY] VAT hierarchy system implemented successfully!';
    RAISE NOTICE '';
    
    -- Show updated shipping routes with VAT data
    FOR route_record IN 
        SELECT origin_country, destination_country, exchange_rate, vat_percentage, customs_percentage
        FROM shipping_routes 
        WHERE vat_percentage IS NOT NULL
        ORDER BY origin_country, destination_country
    LOOP
        RAISE NOTICE '✅ Route: % → %', route_record.origin_country, route_record.destination_country;
        RAISE NOTICE '   Exchange Rate: %', COALESCE(route_record.exchange_rate::text, 'NULL');
        RAISE NOTICE '   VAT: %', COALESCE(route_record.vat_percentage::text, 'NULL') || '%';
        RAISE NOTICE '   Customs: %', COALESCE(route_record.customs_percentage::text, 'NULL') || '%';
        RAISE NOTICE '';
    END LOOP;
    
    RAISE NOTICE '🏗️ [VAT-HIERARCHY] Database schema enhanced:';
    RAISE NOTICE '   ✅ shipping_routes.vat_percentage column added';
    RAISE NOTICE '   ✅ shipping_routes.customs_percentage column added';  
    RAISE NOTICE '   ✅ Efficient lookup index created';
    RAISE NOTICE '   ✅ IN→NP route configured with 13% VAT';
    RAISE NOTICE '';
    
    RAISE NOTICE '📋 [VAT-HIERARCHY] New VAT lookup hierarchy:';
    RAISE NOTICE '   1. shipping_routes.vat_percentage (PRIORITY 1)';
    RAISE NOTICE '   2. country_settings.vat (PRIORITY 2 - fallback)';
    RAISE NOTICE '   3. Default 0% (PRIORITY 3 - final fallback)';
    RAISE NOTICE '';
    
    RAISE NOTICE '🔄 [VAT-HIERARCHY] Next steps:';
    RAISE NOTICE '   • Create VATService with hierarchical lookup';
    RAISE NOTICE '   • Update SmartCalculationEngine to use VATService';
    RAISE NOTICE '   • Test VAT hierarchy with existing quotes';
END $$;