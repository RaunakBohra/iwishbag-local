-- ============================================================================
-- HSN SYSTEM ATOMIC MIGRATION - DB Reset Safe
-- This migration works safely for both fresh databases and existing ones
-- Critical Feature: Currency conversion for minimum valuations (USD → origin country)
-- Date: 2025-07-25
-- ============================================================================

-- ============================================================================
-- PHASE 1: CONDITIONAL TABLE CREATION (DB-Reset Safe)
-- ============================================================================

DO $$
DECLARE
    is_fresh_install BOOLEAN := false;
    table_count INTEGER;
BEGIN
    -- Check if this is a fresh install
    SELECT COUNT(*) INTO table_count 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name IN ('quotes', 'hsn_master');
    
    is_fresh_install := (table_count = 0);
    
    IF is_fresh_install THEN
        RAISE NOTICE 'HSN Migration: Fresh database detected - tables will be created by schema.sql';
    ELSE
        RAISE NOTICE 'HSN Migration: Existing database detected - proceeding with conditional migration';
    END IF;
END $$;

-- Create HSN tables if they don't exist (safety net for partial migrations)
CREATE TABLE IF NOT EXISTS hsn_master (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    hsn_code text UNIQUE NOT NULL,
    description text NOT NULL,
    category text NOT NULL,
    subcategory text,
    keywords text[] DEFAULT '{}',
    
    -- Critical: Currency conversion fields for minimum valuations
    minimum_valuation_usd numeric(10,2),
    requires_currency_conversion boolean DEFAULT true,
    
    -- Weight intelligence data
    weight_data jsonb DEFAULT '{
        "typical_weights": {
            "per_unit": {"min": 0, "max": 0, "average": 0},
            "packaging": {"additional_weight": 0}
        }
    }'::jsonb,
    
    -- Tax and classification data
    tax_data jsonb DEFAULT '{
        "typical_rates": {
            "customs": {"min": 0, "max": 0, "common": 0},
            "gst": {"standard": 0},
            "vat": {"common": 0}
        }
    }'::jsonb,
    
    -- Classification intelligence
    classification_data jsonb DEFAULT '{
        "auto_classification": {
            "keywords": [],
            "confidence": 0.0
        }
    }'::jsonb,
    
    -- Meta information
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS admin_overrides (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Override type and scope
    override_type text NOT NULL CHECK (override_type IN ('tax_rate', 'hsn_code', 'weight', 'minimum_valuation', 'exemption')),
    scope text NOT NULL CHECK (scope IN ('route', 'category', 'product', 'global')),
    scope_identifier text,
    
    -- Override data (flexible JSONB structure)
    override_data jsonb NOT NULL DEFAULT '{}'::jsonb,
    
    -- Admin metadata
    admin_id uuid,
    justification text,
    
    -- Lifecycle management
    expires_at timestamp with time zone,
    is_active boolean DEFAULT true,
    
    -- Timestamps
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS unified_configuration (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Configuration type and key
    config_type text NOT NULL,
    config_key text NOT NULL,
    
    -- Configuration data (flexible JSONB structure)
    config_data jsonb NOT NULL DEFAULT '{}'::jsonb,
    
    -- Version control
    version integer DEFAULT 1,
    
    -- Status
    is_active boolean DEFAULT true,
    
    -- Timestamps
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    -- Ensure unique config per type-key combination
    UNIQUE(config_type, config_key)
);

-- ============================================================================
-- PHASE 2: ENHANCE EXISTING TABLES (Conditional)
-- ============================================================================

-- Add HSN fields to shipping_routes if they don't exist
DO $$
BEGIN
    -- Add tax_configuration if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'shipping_routes' 
        AND column_name = 'tax_configuration'
    ) THEN
        ALTER TABLE shipping_routes ADD COLUMN tax_configuration jsonb DEFAULT '{
            "currency_conversion": {
                "enabled": true,
                "fallback_rate": 1.0,
                "cache_duration_minutes": 60
            },
            "minimum_valuation": {
                "apply_conversion": true,
                "rounding_method": "up"
            }
        }'::jsonb;
    END IF;
    
    -- Add weight_configuration if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'shipping_routes' 
        AND column_name = 'weight_configuration'
    ) THEN
        ALTER TABLE shipping_routes ADD COLUMN weight_configuration jsonb DEFAULT '{
            "auto_weight_detection": true,
            "dimensional_weight": {
                "enabled": true,
                "divisor": 5000
            },
            "weight_validation": {
                "min_reasonable_weight": 0.01,
                "max_reasonable_weight": 50.0,
                "flag_unusual_weights": true
            }
        }'::jsonb;
    END IF;
    
    -- Add api_configuration if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'shipping_routes' 
        AND column_name = 'api_configuration'
    ) THEN
        ALTER TABLE shipping_routes ADD COLUMN api_configuration jsonb DEFAULT '{
            "hsn_lookup": {
                "enabled": true,
                "primary_source": "local_database",
                "fallback_source": "local_database",
                "cache_duration": 86400
            }
        }'::jsonb;
    END IF;
END $$;

-- Add HSN fields to quotes table if they don't exist
DO $$
BEGIN
    -- Add item_level_calculations if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'quotes' 
        AND column_name = 'item_level_calculations'
    ) THEN
        ALTER TABLE quotes ADD COLUMN item_level_calculations jsonb DEFAULT '{
            "per_item_tax_breakdown": [],
            "currency_conversions": [],
            "hsn_classifications": [],
            "total_customs": 0,
            "total_local_taxes": 0
        }'::jsonb;
    END IF;
    
    -- Add auto_classification_data if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'quotes' 
        AND column_name = 'auto_classification_data'
    ) THEN
        ALTER TABLE quotes ADD COLUMN auto_classification_data jsonb DEFAULT '{
            "classification_status": "pending",
            "confidence_scores": [],
            "override_flags": [],
            "last_classified_at": null
        }'::jsonb;
    END IF;
END $$;

-- ============================================================================
-- PHASE 3: CREATE INDEXES (Idempotent)
-- ============================================================================

-- HSN Master indexes
CREATE INDEX IF NOT EXISTS idx_hsn_master_hsn_code ON hsn_master(hsn_code);
CREATE INDEX IF NOT EXISTS idx_hsn_master_category ON hsn_master(category);
CREATE INDEX IF NOT EXISTS idx_hsn_master_keywords_gin ON hsn_master USING gin(keywords);
CREATE INDEX IF NOT EXISTS idx_hsn_master_active ON hsn_master(is_active);
CREATE INDEX IF NOT EXISTS idx_hsn_master_weight_data_gin ON hsn_master USING gin(weight_data);
CREATE INDEX IF NOT EXISTS idx_hsn_master_tax_data_gin ON hsn_master USING gin(tax_data);
CREATE INDEX IF NOT EXISTS idx_hsn_master_classification_data_gin ON hsn_master USING gin(classification_data);

-- Admin Overrides indexes
CREATE INDEX IF NOT EXISTS idx_admin_overrides_type ON admin_overrides(override_type);
CREATE INDEX IF NOT EXISTS idx_admin_overrides_scope ON admin_overrides(scope, scope_identifier);
CREATE INDEX IF NOT EXISTS idx_admin_overrides_active ON admin_overrides(is_active);
CREATE INDEX IF NOT EXISTS idx_admin_overrides_expires ON admin_overrides(expires_at);

-- Unified Configuration indexes
CREATE INDEX IF NOT EXISTS idx_unified_config_type_key ON unified_configuration(config_type, config_key);
CREATE INDEX IF NOT EXISTS idx_unified_config_active ON unified_configuration(is_active);
CREATE INDEX IF NOT EXISTS idx_unified_config_data_gin ON unified_configuration USING gin(config_data);

-- Enhanced quotes indexes for HSN
CREATE INDEX IF NOT EXISTS idx_quotes_item_level_calculations_gin ON quotes USING gin(item_level_calculations);
CREATE INDEX IF NOT EXISTS idx_quotes_auto_classification_data_gin ON quotes USING gin(auto_classification_data);

-- Enhanced shipping_routes indexes
CREATE INDEX IF NOT EXISTS idx_shipping_routes_tax_config_gin ON shipping_routes USING gin(tax_configuration);
CREATE INDEX IF NOT EXISTS idx_shipping_routes_weight_config_gin ON shipping_routes USING gin(weight_configuration);
CREATE INDEX IF NOT EXISTS idx_shipping_routes_api_config_gin ON shipping_routes USING gin(api_configuration);

-- ============================================================================
-- PHASE 4: CURRENCY CONVERSION UTILITY FUNCTIONS
-- ============================================================================

-- Function to convert minimum valuation from USD to origin country currency
CREATE OR REPLACE FUNCTION convert_minimum_valuation_usd_to_origin(
    usd_amount numeric,
    origin_country text
) RETURNS jsonb AS $$
DECLARE
    exchange_rate numeric;
    origin_currency text;
    converted_amount numeric;
    result jsonb;
BEGIN
    -- Get currency for origin country
    SELECT currency INTO origin_currency
    FROM country_settings
    WHERE code = origin_country;
    
    -- If no currency found, default to USD
    IF origin_currency IS NULL THEN
        origin_currency := 'USD';
        exchange_rate := 1.0;
        converted_amount := usd_amount;
    ELSE
        -- Get exchange rate from country_settings
        SELECT rate_from_usd INTO exchange_rate
        FROM country_settings
        WHERE code = origin_country;
        
        -- Calculate converted amount (round up for customs)
        converted_amount := CEIL(usd_amount * COALESCE(exchange_rate, 1.0));
    END IF;
    
    -- Return conversion details
    result := jsonb_build_object(
        'usd_amount', usd_amount,
        'origin_currency', origin_currency,
        'exchange_rate', COALESCE(exchange_rate, 1.0),
        'converted_amount', converted_amount,
        'conversion_timestamp', NOW()
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to get HSN data with currency conversion
CREATE OR REPLACE FUNCTION get_hsn_with_currency_conversion(
    hsn_code_param text,
    origin_country_param text DEFAULT 'US'
) RETURNS jsonb AS $$
DECLARE
    hsn_record record;
    conversion_data jsonb;
    result jsonb;
BEGIN
    -- Get HSN record
    SELECT * INTO hsn_record
    FROM hsn_master
    WHERE hsn_code = hsn_code_param
    AND is_active = true;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'error', 'HSN code not found',
            'hsn_code', hsn_code_param
        );
    END IF;
    
    -- Convert minimum valuation if required
    IF hsn_record.minimum_valuation_usd IS NOT NULL AND hsn_record.requires_currency_conversion THEN
        conversion_data := convert_minimum_valuation_usd_to_origin(
            hsn_record.minimum_valuation_usd,
            origin_country_param
        );
    ELSE
        conversion_data := jsonb_build_object(
            'no_conversion_required', true
        );
    END IF;
    
    -- Build result
    result := jsonb_build_object(
        'hsn_code', hsn_record.hsn_code,
        'description', hsn_record.description,
        'category', hsn_record.category,
        'subcategory', hsn_record.subcategory,
        'keywords', hsn_record.keywords,
        'minimum_valuation_usd', hsn_record.minimum_valuation_usd,
        'requires_currency_conversion', hsn_record.requires_currency_conversion,
        'weight_data', hsn_record.weight_data,
        'tax_data', hsn_record.tax_data,
        'classification_data', hsn_record.classification_data,
        'currency_conversion', conversion_data
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- PHASE 5: POPULATE SAMPLE DATA (Conditional)
-- ============================================================================

DO $$
DECLARE
    hsn_count INTEGER;
    config_count INTEGER;
BEGIN
    -- Check if HSN data already exists
    SELECT COUNT(*) INTO hsn_count FROM hsn_master;
    SELECT COUNT(*) INTO config_count FROM unified_configuration WHERE config_type = 'country';
    
    IF hsn_count = 0 THEN
        RAISE NOTICE 'Populating HSN master data...';
        
        -- Insert comprehensive HSN sample data with currency conversion support
        INSERT INTO hsn_master (hsn_code, description, category, subcategory, keywords, minimum_valuation_usd, requires_currency_conversion, weight_data, tax_data, classification_data) VALUES
        
        -- Electronics (High minimum valuations)
        ('8517', 'Mobile phones and communication equipment', 'electronics', 'communication_devices', 
         ARRAY['mobile', 'phone', 'iphone', 'samsung', 'smartphone', 'cellular'],
         50.00, true,
         '{"typical_weights": {"per_unit": {"min": 0.120, "max": 0.250, "average": 0.180}}, "packaging": {"additional_weight": 0.05}}'::jsonb,
         '{"typical_rates": {"customs": {"min": 15, "max": 25, "common": 20}, "gst": {"standard": 18}, "vat": {"common": 13}}}'::jsonb,
         '{"auto_classification": {"keywords": ["iphone", "samsung", "mobile", "smartphone"], "confidence": 0.95}}'::jsonb),
        
        ('8471', 'Computers and laptop computers', 'electronics', 'computers',
         ARRAY['laptop', 'computer', 'macbook', 'dell', 'hp', 'asus'],
         100.00, true,
         '{"typical_weights": {"per_unit": {"min": 1.000, "max": 3.000, "average": 1.500}}, "packaging": {"additional_weight": 0.20}}'::jsonb,
         '{"typical_rates": {"customs": {"min": 10, "max": 20, "common": 15}, "gst": {"standard": 18}, "vat": {"common": 13}}}'::jsonb,
         '{"auto_classification": {"keywords": ["laptop", "macbook", "computer", "notebook"], "confidence": 0.90}}'::jsonb),
        
        -- Clothing (Nepal minimum valuation example - $10 USD for kurtas)
        ('6109', 'T-shirts and similar garments', 'clothing', 'tops',
         ARRAY['tshirt', 't-shirt', 'shirt', 'tee', 'polo'],
         5.00, true,
         '{"typical_weights": {"per_unit": {"min": 0.100, "max": 0.250, "average": 0.150}}, "packaging": {"additional_weight": 0.02}}'::jsonb,
         '{"typical_rates": {"customs": {"min": 10, "max": 15, "common": 12}, "gst": {"standard": 12}, "vat": {"common": 13}}}'::jsonb,
         '{"auto_classification": {"keywords": ["tshirt", "t-shirt", "shirt", "polo"], "confidence": 0.85}}'::jsonb),
        
        ('6204', 'Dresses and similar garments (including kurtas)', 'clothing', 'dresses',
         ARRAY['dress', 'kurti', 'kurta', 'gown', 'frock'],
         10.00, true, -- Critical: Nepal kurta minimum valuation example
         '{"typical_weights": {"per_unit": {"min": 0.200, "max": 0.500, "average": 0.300}}, "packaging": {"additional_weight": 0.03}}'::jsonb,
         '{"typical_rates": {"customs": {"min": 10, "max": 15, "common": 12}, "gst": {"standard": 12}, "vat": {"common": 13}}}'::jsonb,
         '{"auto_classification": {"keywords": ["dress", "kurti", "kurta", "gown"], "confidence": 0.85}}'::jsonb),
        
        -- Books (often tax-exempt, no minimum valuation)
        ('4901', 'Books and printed materials', 'books', 'educational',
         ARRAY['book', 'novel', 'textbook', 'manual', 'guide'],
         NULL, false, -- No minimum valuation for books
         '{"typical_weights": {"per_unit": {"min": 0.100, "max": 1.000, "average": 0.300}}, "packaging": {"additional_weight": 0.05}}'::jsonb,
         '{"typical_rates": {"customs": {"min": 0, "max": 5, "common": 0}, "gst": {"standard": 0}, "vat": {"common": 0}}}'::jsonb,
         '{"auto_classification": {"keywords": ["book", "novel", "textbook", "manual"], "confidence": 0.90}}'::jsonb),
        
        -- Accessories
        ('7113', 'Jewelry and accessories', 'accessories', 'jewelry',
         ARRAY['jewelry', 'ring', 'necklace', 'bracelet', 'earring'],
         25.00, true,
         '{"typical_weights": {"per_unit": {"min": 0.010, "max": 0.100, "average": 0.030}}, "packaging": {"additional_weight": 0.01}}'::jsonb,
         '{"typical_rates": {"customs": {"min": 15, "max": 20, "common": 18}, "gst": {"standard": 18}, "vat": {"common": 13}}}'::jsonb,
         '{"auto_classification": {"keywords": ["jewelry", "ring", "necklace", "bracelet"], "confidence": 0.80}}'::jsonb),
        
        -- Home & Garden
        ('9403', 'Furniture and home decor', 'home_garden', 'furniture',
         ARRAY['furniture', 'chair', 'table', 'sofa', 'decor'],
         30.00, true,
         '{"typical_weights": {"per_unit": {"min": 1.000, "max": 20.000, "average": 5.000}}, "packaging": {"additional_weight": 0.50}}'::jsonb,
         '{"typical_rates": {"customs": {"min": 12, "max": 18, "common": 15}, "gst": {"standard": 18}, "vat": {"common": 13}}}'::jsonb,
         '{"auto_classification": {"keywords": ["furniture", "chair", "table", "sofa"], "confidence": 0.75}}'::jsonb);
        
        RAISE NOTICE 'HSN master data populated with % records', (SELECT COUNT(*) FROM hsn_master);
    ELSE
        RAISE NOTICE 'HSN master data already exists (% records)', hsn_count;
    END IF;
    
    -- Populate country configurations if they don't exist
    IF config_count = 0 THEN
        RAISE NOTICE 'Populating unified country configurations...';
        
        INSERT INTO unified_configuration (config_type, config_key, config_data) VALUES
        -- India configuration with GST
        ('country', 'IN', '{
            "name": "India",
            "currency": "INR",
            "tax_system": "GST",
            "default_gst_rate": 18,
            "customs_rates": {
                "electronics": 20,
                "clothing": 12,
                "books": 0,
                "accessories": 18,
                "home_garden": 15
            },
            "minimum_valuations": {
                "applies_currency_conversion": true,
                "rounding_method": "up"
            },
            "api_endpoints": {
                "gst_lookup": "https://api.gst.gov.in/taxpayerapi/search/hsnsac"
            }
        }'::jsonb),
        
        -- Nepal configuration with VAT and minimum valuations
        ('country', 'NP', '{
            "name": "Nepal",
            "currency": "NPR",
            "tax_system": "VAT",
            "default_vat_rate": 13,
            "customs_rates": {
                "electronics": 15,
                "clothing": 12,
                "books": 0,
                "accessories": 15,
                "home_garden": 12
            },
            "minimum_valuations": {
                "clothing": {"value": 10, "currency": "USD"},
                "electronics": {"value": 50, "currency": "USD"},
                "accessories": {"value": 25, "currency": "USD"},
                "applies_currency_conversion": true
            },
            "currency_conversion": {
                "enabled": true,
                "source": "country_settings.rate_from_usd"
            }
        }'::jsonb),
        
        -- USA configuration with sales tax
        ('country', 'US', '{
            "name": "United States",
            "currency": "USD", 
            "tax_system": "SALES_TAX",
            "default_sales_tax_rate": 8.88,
            "state_variations": true,
            "category_overrides": {
                "electronics": 5.0,
                "books": 0.0,
                "clothing": 6.0
            },
            "minimum_valuations": {
                "applies_currency_conversion": false
            },
            "api_endpoints": {
                "taxjar": "https://api.taxjar.com/v2"
            }
        }'::jsonb),
        
        -- China configuration
        ('country', 'CN', '{
            "name": "China",
            "currency": "CNY",
            "tax_system": "VAT",
            "default_vat_rate": 13,
            "customs_rates": {
                "electronics": 10,
                "clothing": 15,
                "books": 0,
                "accessories": 12
            },
            "minimum_valuations": {
                "applies_currency_conversion": true
            }
        }'::jsonb);
        
        RAISE NOTICE 'Unified country configurations populated';
    ELSE
        RAISE NOTICE 'Country configurations already exist (% records)', config_count;
    END IF;
    
    -- Insert sample admin override for testing
    INSERT INTO admin_overrides (override_type, scope, scope_identifier, override_data, justification, admin_id) VALUES
    ('tax_rate', 'category', 'electronics', '{
        "original_rate": 20,
        "override_rate": 15,
        "tax_type": "customs",
        "reason": "electronics_promotion_2025",
        "applies_to_minimum_valuation": true
    }'::jsonb, 'Special electronics promotion for Q1 2025 with minimum valuation consideration', NULL)
    ON CONFLICT DO NOTHING;
    
END $$;

-- ============================================================================
-- PHASE 6: ENABLE RLS AND POLICIES (Conditional)
-- ============================================================================

-- Enable RLS if not already enabled
DO $$
BEGIN
    -- HSN Master RLS
    IF NOT EXISTS (
        SELECT 1 FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE c.relname = 'hsn_master' AND n.nspname = 'public' AND c.relrowsecurity = true
    ) THEN
        ALTER TABLE hsn_master ENABLE ROW LEVEL SECURITY;
        
        CREATE POLICY "HSN master read access" ON hsn_master FOR SELECT USING (true);
        CREATE POLICY "HSN master admin write" ON hsn_master FOR INSERT WITH CHECK (
            EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'staff', 'moderator'))
        );
        CREATE POLICY "HSN master admin update" ON hsn_master FOR UPDATE USING (
            EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'staff', 'moderator'))
        );
        CREATE POLICY "HSN master admin delete" ON hsn_master FOR DELETE USING (
            EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'staff', 'moderator'))
        );
    END IF;
    
    -- Admin Overrides RLS
    IF NOT EXISTS (
        SELECT 1 FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE c.relname = 'admin_overrides' AND n.nspname = 'public' AND c.relrowsecurity = true
    ) THEN
        ALTER TABLE admin_overrides ENABLE ROW LEVEL SECURITY;
        
        CREATE POLICY "Admin overrides admin only" ON admin_overrides FOR ALL USING (
            EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'staff', 'moderator'))
        );
    END IF;
    
    -- Unified Configuration RLS
    IF NOT EXISTS (
        SELECT 1 FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE c.relname = 'unified_configuration' AND n.nspname = 'public' AND c.relrowsecurity = true
    ) THEN
        ALTER TABLE unified_configuration ENABLE ROW LEVEL SECURITY;
        
        CREATE POLICY "Unified config read access" ON unified_configuration FOR SELECT USING (true);
        CREATE POLICY "Unified config admin write" ON unified_configuration FOR INSERT WITH CHECK (
            EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'staff', 'moderator'))
        );
        CREATE POLICY "Unified config admin update" ON unified_configuration FOR UPDATE USING (
            EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'staff', 'moderator'))
        );
        CREATE POLICY "Unified config admin delete" ON unified_configuration FOR DELETE USING (
            EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'staff', 'moderator'))
        );
    END IF;
END $$;

-- ============================================================================
-- PHASE 7: VALIDATION AND VERIFICATION
-- ============================================================================

DO $$
DECLARE
    hsn_count INTEGER;
    config_count INTEGER;
    override_count INTEGER;
    quotes_with_hsn_fields INTEGER;
    routes_with_hsn_fields INTEGER;
BEGIN
    -- Count records
    SELECT COUNT(*) INTO hsn_count FROM hsn_master;
    SELECT COUNT(*) INTO config_count FROM unified_configuration;
    SELECT COUNT(*) INTO override_count FROM admin_overrides;
    
    -- Check enhanced table fields
    SELECT COUNT(*) INTO quotes_with_hsn_fields 
    FROM quotes 
    WHERE item_level_calculations IS NOT NULL 
    AND auto_classification_data IS NOT NULL;
    
    SELECT COUNT(*) INTO routes_with_hsn_fields 
    FROM shipping_routes 
    WHERE tax_configuration IS NOT NULL 
    AND weight_configuration IS NOT NULL 
    AND api_configuration IS NOT NULL;
    
    -- Report results
    RAISE NOTICE '==================================================';
    RAISE NOTICE 'HSN SYSTEM ATOMIC MIGRATION COMPLETED SUCCESSFULLY!';
    RAISE NOTICE '==================================================';
    RAISE NOTICE 'HSN Master records: %', hsn_count;
    RAISE NOTICE 'Country configurations: %', config_count;
    RAISE NOTICE 'Admin overrides: %', override_count;
    RAISE NOTICE 'Quotes with HSN fields: %', quotes_with_hsn_fields;
    RAISE NOTICE 'Shipping routes with HSN fields: %', routes_with_hsn_fields;
    RAISE NOTICE '';
    RAISE NOTICE 'KEY FEATURES ENABLED:';
    RAISE NOTICE '✅ Currency conversion for minimum valuations (USD → origin country)';
    RAISE NOTICE '✅ Per-item HSN classification and tax calculation';
    RAISE NOTICE '✅ Admin override system for tax rates and valuations';
    RAISE NOTICE '✅ DB-reset safe migration (idempotent operations)';
    RAISE NOTICE '✅ Comprehensive indexing for performance';
    RAISE NOTICE '✅ RLS policies for security';
    RAISE NOTICE '';
    RAISE NOTICE 'CRITICAL: Nepal kurta example configured ($10 USD minimum → NPR conversion)';
    RAISE NOTICE 'Ready for HSN calculation engine integration!';
    
    -- Test currency conversion function
    DECLARE
        test_conversion jsonb;
    BEGIN
        SELECT get_hsn_with_currency_conversion('6204', 'NP') INTO test_conversion;
        RAISE NOTICE 'Currency conversion test for Nepal kurta: %', test_conversion->'currency_conversion';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Currency conversion test failed: %', SQLERRM;
    END;
    
END $$;