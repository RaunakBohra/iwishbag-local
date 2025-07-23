-- ============================================================================
-- FIX QUOTE EXCHANGE RATES - Permanent Solution
-- Fixes quotes with hardcoded exchange_rate=1 by calculating real rates
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '🔄 [MIGRATION] Starting exchange rate fix for existing quotes...';
END $$;

-- Step 1: Fix quotes with exchange_rate = 1 where countries are different
UPDATE quotes 
SET calculation_data = jsonb_set(
    COALESCE(calculation_data, '{}'::jsonb),
    '{exchange_rate}',
    json_build_object(
        'rate', COALESCE(
            -- Try to get rate from country_settings cross-calculation
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
            -- Fallback: check shipping routes
            (
                SELECT exchange_rate 
                FROM shipping_routes 
                WHERE origin_country = quotes.origin_country 
                AND destination_country = quotes.destination_country 
                AND exchange_rate IS NOT NULL 
                AND exchange_rate > 0
                LIMIT 1
            ),
            -- Final fallback: keep 1
            1
        ),
        'source', 'migration_fix',
        'confidence', 0.90
    )::jsonb
),
updated_at = NOW()
WHERE 
    -- Target quotes with exchange_rate = 1 and different countries
    (calculation_data->'exchange_rate'->>'rate')::numeric = 1
    AND origin_country != destination_country
    AND origin_country IS NOT NULL 
    AND destination_country IS NOT NULL;

-- Step 2: Add exchange_rate field to quotes that don't have it
UPDATE quotes 
SET calculation_data = jsonb_set(
    COALESCE(calculation_data, '{}'::jsonb),
    '{exchange_rate}',
    json_build_object(
        'rate', COALESCE(
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
            1
        ),
        'source', 'migration_add',
        'confidence', 0.85
    )::jsonb
),
updated_at = NOW()
WHERE 
    -- Target quotes without exchange_rate field
    calculation_data->'exchange_rate' IS NULL
    AND origin_country IS NOT NULL 
    AND destination_country IS NOT NULL;

-- Step 3: Fix exchange rates with source 'direct' (usually wrong)
UPDATE quotes 
SET calculation_data = jsonb_set(
    calculation_data,
    '{exchange_rate}',
    json_build_object(
        'rate', COALESCE(
            (
                SELECT CASE 
                    WHEN orig.rate_from_usd > 0 AND dest.rate_from_usd > 0 
                    THEN ROUND((dest.rate_from_usd / orig.rate_from_usd)::numeric, 6)
                    ELSE (calculation_data->'exchange_rate'->>'rate')::numeric
                END
                FROM country_settings orig, country_settings dest
                WHERE orig.code = quotes.origin_country 
                AND dest.code = quotes.destination_country
            ),
            (calculation_data->'exchange_rate'->>'rate')::numeric
        ),
        'source', 'migration_recalc',
        'confidence', 0.90
    )::jsonb
),
updated_at = NOW()
WHERE 
    -- Target quotes with 'direct' source (usually incorrect)
    calculation_data->'exchange_rate'->>'source' = 'direct'
    AND origin_country != destination_country;

-- Step 4: Report results
DO $$
DECLARE
    fixed_count INTEGER;
    total_different_countries INTEGER;
    sample_quote RECORD;
BEGIN
    -- Count quotes with different countries
    SELECT COUNT(*) INTO total_different_countries
    FROM quotes 
    WHERE origin_country != destination_country;
    
    -- Count fixed quotes
    SELECT COUNT(*) INTO fixed_count
    FROM quotes 
    WHERE origin_country != destination_country
    AND calculation_data->'exchange_rate'->>'source' LIKE 'migration%';
    
    -- Get a sample fixed quote
    SELECT id, origin_country, destination_country, 
           calculation_data->'exchange_rate'->>'rate' as rate,
           calculation_data->'exchange_rate'->>'source' as source
    INTO sample_quote
    FROM quotes 
    WHERE calculation_data->'exchange_rate'->>'source' LIKE 'migration%'
    LIMIT 1;
    
    RAISE NOTICE '✅ [MIGRATION] Exchange rate fix completed:';
    RAISE NOTICE '   📊 Total quotes with different countries: %', total_different_countries;
    RAISE NOTICE '   🔧 Quotes fixed by migration: %', fixed_count;
    
    IF sample_quote.id IS NOT NULL THEN
        RAISE NOTICE '   📋 Sample fix: % (%) → % rate: %', 
            sample_quote.origin_country, 
            sample_quote.destination_country,
            sample_quote.source,
            sample_quote.rate;
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '🎯 [MIGRATION] Next steps:';
    RAISE NOTICE '   1. New quotes will automatically get correct exchange rates';
    RAISE NOTICE '   2. Admin dual currency display should work immediately';
    RAISE NOTICE '   3. VAT calculations will be triggered on quote updates';
    RAISE NOTICE '';
END $$;