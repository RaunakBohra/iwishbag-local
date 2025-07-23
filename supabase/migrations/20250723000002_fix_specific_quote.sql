-- ============================================================================
-- FIX SPECIFIC QUOTE a74c0599-0c9b-4a7f-a683-6c299f88c2b8
-- Add proper exchange rate and calculation data structure
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '🔧 [SPECIFIC-FIX] Fixing quote a74c0599-0c9b-4a7f-a683-6c299f88c2b8...';
END $$;

-- Step 1: Fix the specific quote with proper exchange rate and calculation structure
UPDATE quotes 
SET calculation_data = COALESCE(
    calculation_data,
    '{}'::jsonb
) || jsonb_build_object(
    'exchange_rate', jsonb_build_object(
        'rate', COALESCE(
            -- Priority 1: Get exchange rate from shipping route (should be 2.0 for IN→NP)
            (
                SELECT exchange_rate 
                FROM shipping_routes 
                WHERE origin_country = quotes.origin_country 
                AND destination_country = quotes.destination_country 
                AND exchange_rate IS NOT NULL 
                AND exchange_rate > 0
                LIMIT 1
            ),
            -- Priority 2: Calculate from country settings
            (
                SELECT CASE 
                    WHEN orig.rate_from_usd > 0 AND dest.rate_from_usd > 0 
                    THEN ROUND((dest.rate_from_usd / orig.rate_from_usd)::numeric, 6)
                    ELSE 1
                END
                FROM country_settings orig, country_settings dest
                WHERE orig.code = quotes.origin_country 
                AND dest.code = quotes.destination_country
            ),
            -- Fallback: keep existing or default to 1
            1
        ),
        'source', CASE 
            WHEN EXISTS (
                SELECT 1 FROM shipping_routes 
                WHERE origin_country = quotes.origin_country 
                AND destination_country = quotes.destination_country 
                AND exchange_rate IS NOT NULL
            ) THEN 'shipping_route'
            ELSE 'country_settings'
        END,
        'confidence', 0.95,
        'updated_at', NOW()::text
    ),
    'breakdown', COALESCE(
        calculation_data->'breakdown',
        jsonb_build_object(
            'items_total', COALESCE(costprice_total_usd, 0),
            'shipping', 0,
            'customs', 0,
            'taxes', 0,
            'fees', 0,
            'discount', 0
        )
    ),
    'customs_data', jsonb_build_object(
        'percentage', COALESCE(
            (SELECT sales_tax FROM country_settings WHERE code = quotes.destination_country),
            0
        ),
        'source', 'country_settings'
    ),
    'vat_data', jsonb_build_object(
        'percentage', COALESCE(
            (SELECT vat FROM country_settings WHERE code = quotes.destination_country),
            0
        ),
        'source', 'country_settings'
    )
),
updated_at = NOW()
WHERE id = 'a74c0599-0c9b-4a7f-a683-6c299f88c2b8';

-- Step 2: Report the fix results
DO $$
DECLARE
    quote_record RECORD;
    exchange_rate_value NUMERIC;
    vat_percentage NUMERIC;
    customs_percentage NUMERIC;
    exchange_source TEXT;
BEGIN
    -- Get the fixed quote data
    SELECT 
        id,
        origin_country,
        destination_country,
        calculation_data->'exchange_rate'->>'rate' as rate,
        calculation_data->'exchange_rate'->>'source' as source,
        calculation_data->'vat_data'->>'percentage' as vat,
        calculation_data->'customs_data'->>'percentage' as customs
    INTO quote_record
    FROM quotes 
    WHERE id = 'a74c0599-0c9b-4a7f-a683-6c299f88c2b8';
    
    IF quote_record.id IS NOT NULL THEN
        exchange_rate_value := quote_record.rate::numeric;
        vat_percentage := quote_record.vat::numeric;
        customs_percentage := quote_record.customs::numeric;
        exchange_source := quote_record.source;
        
        RAISE NOTICE '✅ [SPECIFIC-FIX] Quote successfully fixed:';
        RAISE NOTICE '   📋 Quote ID: %', quote_record.id;
        RAISE NOTICE '   🛣️  Route: % to %', quote_record.origin_country, quote_record.destination_country;
        RAISE NOTICE '   💱 Exchange rate: % from %', exchange_rate_value, exchange_source;
        RAISE NOTICE '   📊 VAT: %', vat_percentage || '%';
        RAISE NOTICE '   🏛️  Customs: %', customs_percentage || '%';
        RAISE NOTICE '';
        
        -- Validate the fix
        IF exchange_rate_value > 1 AND exchange_source = 'shipping_route' THEN
            RAISE NOTICE '🎯 [SPECIFIC-FIX] SUCCESS: Quote now has proper shipping route exchange rate!';
        ELSIF exchange_rate_value > 1 THEN
            RAISE NOTICE '⚠️ [SPECIFIC-FIX] PARTIAL: Using country settings rate, shipping route may be missing';
        ELSE
            RAISE NOTICE '❌ [SPECIFIC-FIX] WARNING: Exchange rate still 1, may need manual intervention';
        END IF;
        
        IF vat_percentage > 0 THEN
            RAISE NOTICE '✅ [SPECIFIC-FIX] VAT data properly configured';
        ELSE
            RAISE NOTICE '⚠️ [SPECIFIC-FIX] No VAT data found for destination country';
        END IF;
        
    ELSE
        RAISE NOTICE '❌ [SPECIFIC-FIX] Quote not found or not updated';
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '🔗 [SPECIFIC-FIX] View the fixed quote at:';
    RAISE NOTICE '   Admin: http://localhost:8082/admin/quotes/a74c0599-0c9b-4a7f-a683-6c299f88c2b8';
END $$;