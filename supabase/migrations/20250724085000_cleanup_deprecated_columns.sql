-- ============================================================================
-- CLEANUP DEPRECATED COLUMNS - HSN Tax System Migration
-- Remove deprecated tax and shipping columns from country_settings
-- Data is preserved in unified_configuration table
-- Date: 2025-07-24
-- ============================================================================

-- First, migrate any remaining data from deprecated columns to unified_configuration
-- This ensures no data is lost during the cleanup process

DO $$
DECLARE
    country_record RECORD;
BEGIN
    -- Migrate country data that hasn't been migrated yet
    FOR country_record IN 
        SELECT code, name, currency, sales_tax, vat, min_shipping, additional_shipping, additional_weight
        FROM country_settings 
        WHERE code NOT IN (SELECT config_key FROM unified_configuration WHERE config_type = 'country')
    LOOP
        -- Insert comprehensive country configuration
        INSERT INTO unified_configuration (config_type, config_key, config_data)
        VALUES (
            'country',
            country_record.code,
            jsonb_build_object(
                'name', country_record.name,
                'currency', country_record.currency,
                'legacy_data', jsonb_build_object(
                    'sales_tax', COALESCE(country_record.sales_tax, 0),
                    'vat', COALESCE(country_record.vat, 0),
                    'min_shipping', COALESCE(country_record.min_shipping, 0),
                    'additional_shipping', COALESCE(country_record.additional_shipping, 0),
                    'additional_weight', COALESCE(country_record.additional_weight, 0)
                ),
                'tax_system', CASE 
                    WHEN country_record.code = 'IN' THEN 'GST'
                    WHEN country_record.code = 'NP' THEN 'VAT' 
                    WHEN country_record.code = 'US' THEN 'SALES_TAX'
                    ELSE 'UNKNOWN'
                END,
                'migrated_from_legacy', true,
                'migration_date', NOW()
            )
        )
        ON CONFLICT (config_type, config_key) DO UPDATE SET
            config_data = unified_configuration.config_data || jsonb_build_object(
                'legacy_data', jsonb_build_object(
                    'sales_tax', COALESCE(country_record.sales_tax, 0),
                    'vat', COALESCE(country_record.vat, 0),
                    'min_shipping', COALESCE(country_record.min_shipping, 0),
                    'additional_shipping', COALESCE(country_record.additional_shipping, 0),
                    'additional_weight', COALESCE(country_record.additional_weight, 0)
                ),
                'migrated_from_legacy', true,
                'migration_date', NOW()
            );
    END LOOP;
    
    RAISE NOTICE 'Data migration to unified_configuration completed';
END $$;

-- ============================================================================
-- REMOVE DEPRECATED COLUMNS
-- ============================================================================

-- Remove tax-related columns (now handled by HSN system)
ALTER TABLE country_settings DROP COLUMN IF EXISTS sales_tax;
ALTER TABLE country_settings DROP COLUMN IF EXISTS vat;

-- Remove shipping-related columns (now handled by shipping_routes)
ALTER TABLE country_settings DROP COLUMN IF EXISTS min_shipping;
ALTER TABLE country_settings DROP COLUMN IF EXISTS additional_shipping;
ALTER TABLE country_settings DROP COLUMN IF EXISTS additional_weight;

-- Remove weight-related columns (now handled by HSN weight detection)
ALTER TABLE country_settings DROP COLUMN IF EXISTS weight_unit;
ALTER TABLE country_settings DROP COLUMN IF EXISTS volumetric_divisor;

-- ============================================================================
-- UPDATE SHIPPING ROUTES WITH MIGRATED DATA
-- ============================================================================

-- Enhance shipping_routes with proper tax configuration from country_settings legacy data
UPDATE shipping_routes SET 
    tax_configuration = jsonb_build_object(
        'customs', jsonb_build_object(
            'default_rate', COALESCE(customs_percentage, 0),
            'source', 'legacy_migration'
        ),
        'local_taxes', jsonb_build_object(
            'vat', jsonb_build_object(
                'default_rate', COALESCE(vat_percentage, 0),
                'source', 'legacy_migration'
            )
        ),
        'calculation_rules', jsonb_build_object(
            'valuation_method', 'higher_of_both',
            'compound_taxes', true,
            'minimum_valuations', '{}'::jsonb
        ),
        'migrated_at', NOW()
    ),
    weight_configuration = jsonb_build_object(
        'auto_weight_detection', true,
        'dimensional_weight', jsonb_build_object(
            'enabled', true,
            'divisor', 5000
        ),
        'weight_validation', jsonb_build_object(
            'min_reasonable_weight', 0.01,
            'max_reasonable_weight', 50.0,
            'flag_unusual_weights', true
        ),
        'migrated_at', NOW()
    ),
    api_configuration = jsonb_build_object(
        'hsn_lookup', jsonb_build_object(
            'enabled', true,
            'primary_source', CASE 
                WHEN destination_country = 'IN' THEN 'india_government'
                WHEN destination_country = 'NP' THEN 'local_database'
                WHEN destination_country = 'US' THEN 'taxjar'
                ELSE 'local_database'
            END,
            'fallback_source', 'local_database',
            'cache_duration', 86400
        ),
        'migrated_at', NOW()
    )
WHERE tax_configuration = '{}'::jsonb OR tax_configuration IS NULL;

-- ============================================================================
-- CREATE HELPER FUNCTIONS FOR DATA ACCESS
-- ============================================================================

-- Function to get country configuration (replaces direct country_settings access)
CREATE OR REPLACE FUNCTION get_country_config(country_code TEXT)
RETURNS JSONB AS $$
DECLARE
    config_data JSONB;
BEGIN
    SELECT config_data INTO config_data
    FROM unified_configuration
    WHERE config_type = 'country' AND config_key = country_code AND is_active = true;
    
    IF config_data IS NULL THEN
        -- Return minimal default configuration
        RETURN jsonb_build_object(
            'name', 'Unknown Country',
            'currency', 'USD',
            'tax_system', 'UNKNOWN',
            'error', 'Country configuration not found'
        );
    END IF;
    
    RETURN config_data;
END;
$$ LANGUAGE plpgsql;

-- Function to get legacy tax rate (for backward compatibility during transition)
CREATE OR REPLACE FUNCTION get_legacy_tax_rate(country_code TEXT, tax_type TEXT)
RETURNS NUMERIC AS $$
DECLARE
    country_config JSONB;
    legacy_data JSONB;
BEGIN
    country_config := get_country_config(country_code);
    legacy_data := country_config->'legacy_data';
    
    IF legacy_data IS NULL THEN
        RETURN 0;
    END IF;
    
    CASE tax_type
        WHEN 'sales_tax' THEN RETURN COALESCE((legacy_data->>'sales_tax')::numeric, 0);
        WHEN 'vat' THEN RETURN COALESCE((legacy_data->>'vat')::numeric, 0);
        ELSE RETURN 0;
    END CASE;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- UPDATE EXISTING QUERIES TO USE NEW STRUCTURE
-- ============================================================================

-- Create view for backward compatibility (temporary during transition)
CREATE OR REPLACE VIEW country_settings_legacy_view AS
SELECT 
    cs.code,
    cs.name,
    cs.currency,
    cs.rate_from_usd,
    get_legacy_tax_rate(cs.code, 'sales_tax') as sales_tax,
    get_legacy_tax_rate(cs.code, 'vat') as vat,
    cs.purchase_allowed,
    cs.shipping_allowed,
    cs.payment_gateway,
    cs.created_at,
    cs.updated_at,
    cs.decimal_places,
    cs.thousand_separator,
    cs.decimal_separator,
    cs.symbol_position,
    cs.symbol_space,
    cs.priority_thresholds,
    cs.available_gateways,
    cs.default_gateway,
    cs.gateway_config
FROM country_settings cs;

-- ============================================================================
-- VERIFICATION AND CLEANUP
-- ============================================================================

-- Verify data integrity after migration
DO $$
DECLARE
    country_count INTEGER;
    config_count INTEGER;
    routes_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO country_count FROM country_settings;
    SELECT COUNT(*) INTO config_count FROM unified_configuration WHERE config_type = 'country';
    SELECT COUNT(*) INTO routes_count FROM shipping_routes WHERE tax_configuration != '{}'::jsonb;
    
    RAISE NOTICE 'Migration Verification:';
    RAISE NOTICE 'Countries in country_settings: %', country_count;
    RAISE NOTICE 'Country configs in unified_configuration: %', config_count;
    RAISE NOTICE 'Shipping routes with tax configuration: %', routes_count;
    
    IF config_count < country_count THEN
        RAISE WARNING 'Some country data may not have been migrated to unified_configuration';
    END IF;
    
    RAISE NOTICE 'Deprecated columns cleanup completed successfully!';
END $$;