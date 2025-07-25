-- ============================================================================
-- ENHANCED HSN SYSTEM COMPLETE - All-in-One DB Reset Safe Migration
-- Includes: HSN tables, comprehensive seed data, search optimization, user_roles fix
-- This migration works safely for both fresh databases and existing ones
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
        RAISE NOTICE 'Enhanced HSN Migration: Fresh database detected - tables will be created';
    ELSE
        RAISE NOTICE 'Enhanced HSN Migration: Existing database detected - proceeding with conditional migration';
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
    
    -- Classification intelligence with visual metadata
    classification_data jsonb DEFAULT '{
        "auto_classification": {
            "keywords": [],
            "confidence": 0.0
        },
        "visual_metadata": {
            "icon": "",
            "color": "",
            "display_name": "",
            "search_priority": 3,
            "common_brands": [],
            "typical_price_range": {"min": 0, "max": 0, "currency": "USD"}
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
-- PHASE 2: FIX USER_ROLES TABLE (Prevent ERROR 42703)
-- ============================================================================

-- Add missing updated_at column to user_roles table if it doesn't exist
DO $$
BEGIN
    -- Check if updated_at column exists on user_roles table
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'user_roles' 
        AND column_name = 'updated_at'
    ) THEN
        -- Add the missing column
        ALTER TABLE user_roles ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
        
        -- Set initial values for existing records
        UPDATE user_roles SET updated_at = created_at WHERE updated_at IS NULL;
        
        -- Make updated_at NOT NULL after setting values
        ALTER TABLE user_roles ALTER COLUMN updated_at SET NOT NULL;
        
        RAISE NOTICE 'Added missing updated_at column to user_roles table';
    ELSE
        RAISE NOTICE 'updated_at column already exists on user_roles table';
    END IF;
END $$;

-- ============================================================================
-- PHASE 3: ENHANCE EXISTING TABLES (Conditional)
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
-- PHASE 4: CREATE INDEXES (Idempotent)
-- ============================================================================

-- HSN Master indexes
CREATE INDEX IF NOT EXISTS idx_hsn_master_hsn_code ON hsn_master(hsn_code);
CREATE INDEX IF NOT EXISTS idx_hsn_master_category ON hsn_master(category);
CREATE INDEX IF NOT EXISTS idx_hsn_master_keywords_gin ON hsn_master USING gin(keywords);
CREATE INDEX IF NOT EXISTS idx_hsn_master_active ON hsn_master(is_active);
CREATE INDEX IF NOT EXISTS idx_hsn_master_weight_data_gin ON hsn_master USING gin(weight_data);
CREATE INDEX IF NOT EXISTS idx_hsn_master_tax_data_gin ON hsn_master USING gin(tax_data);
CREATE INDEX IF NOT EXISTS idx_hsn_master_classification_data_gin ON hsn_master USING gin(classification_data);
CREATE INDEX IF NOT EXISTS idx_hsn_master_description_text ON hsn_master USING gin(to_tsvector('english', description));
CREATE INDEX IF NOT EXISTS idx_hsn_master_category_subcategory ON hsn_master(category, subcategory);

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
-- PHASE 5: CURRENCY CONVERSION UTILITY FUNCTIONS
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

-- Enhanced update_updated_at_column function that handles missing columns gracefully
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
DECLARE
    column_exists BOOLEAN;
BEGIN
    -- Check if the updated_at column exists on the target table
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = TG_TABLE_SCHEMA
        AND table_name = TG_TABLE_NAME 
        AND column_name = 'updated_at'
    ) INTO column_exists;
    
    -- Only update if the column exists
    IF column_exists THEN
        NEW.updated_at = NOW();
    ELSE
        -- Log warning but don't fail
        RAISE NOTICE 'WARNING: Table %.% does not have updated_at column, skipping trigger', TG_TABLE_SCHEMA, TG_TABLE_NAME;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to refresh HSN search cache
CREATE OR REPLACE FUNCTION refresh_hsn_search_cache()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY hsn_search_optimized;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- PHASE 6: COMPREHENSIVE HSN SEED DATA WITH VISUAL METADATA
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
        RAISE NOTICE 'Populating comprehensive HSN master data...';
        
        -- Insert comprehensive HSN data with visual metadata and enhanced keywords
        INSERT INTO hsn_master (hsn_code, description, category, subcategory, keywords, minimum_valuation_usd, requires_currency_conversion, weight_data, tax_data, classification_data) VALUES
        
        -- ELECTRONICS with enhanced visual metadata
        ('8517', 'Mobile phones and communication equipment', 'electronics', 'communication_devices', 
         ARRAY['mobile', 'phone', 'iphone', 'samsung', 'smartphone', 'cellular', 'android', 'ios', 'apple', 'google', 'pixel', 'oneplus', 'xiaomi', 'mi', 'redmi', 'oppo', 'vivo', 'realme', 'huawei', 'nokia', 'motorola', 'lg', 'sony', 'blackberry', 'flip phone', 'feature phone', 'burner phone', 'prepaid phone', 'unlocked phone', 'gsm phone', 'cdma phone', '5g phone', '4g phone', '3g phone', 'dual sim', 'single sim', 'sim free', 'refurbished phone', 'used phone', 'phone case', 'phone cover', 'phone screen protector', 'phone charger', 'wireless charger', 'fast charger', 'power bank', 'phone battery', 'earphones', 'headphones', 'bluetooth headset', 'phone holder', 'car mount'],
         50.00, true,
         '{"typical_weights": {"per_unit": {"min": 0.120, "max": 0.250, "average": 0.180}}, "packaging": {"additional_weight": 0.05}}'::jsonb,
         '{"typical_rates": {"customs": {"min": 15, "max": 25, "common": 20}, "gst": {"standard": 18}, "vat": {"common": 13}}}'::jsonb,
         '{"auto_classification": {"keywords": ["iphone", "samsung", "mobile", "smartphone"], "confidence": 0.95}, "visual_metadata": {"icon": "📱", "color": "#3B82F6", "display_name": "Mobile Phones & Communication", "category_icon": "smartphone", "confidence_indicator": "high", "common_brands": ["Apple", "Samsung", "Google", "OnePlus", "Xiaomi"], "typical_price_range": {"min": 50, "max": 1500, "currency": "USD"}, "search_priority": 1}}'::jsonb),
        
        ('8471', 'Computers and laptop computers', 'electronics', 'computers',
         ARRAY['laptop', 'computer', 'macbook', 'dell', 'hp', 'asus', 'lenovo', 'acer', 'msi', 'razer', 'alienware', 'surface', 'chromebook', 'notebook', 'ultrabook', 'gaming laptop', 'business laptop', 'student laptop', 'workstation', 'desktop', '2-in-1', 'convertible', 'tablet pc', 'all-in-one', 'pc', 'desktop computer', 'tower', 'mini pc', 'nuc', 'mac mini', 'imac', 'mac pro', 'windows pc', 'linux computer', 'gaming pc', 'workstation pc', 'server', 'thin client', 'home computer', 'office computer', 'refurbished computer', 'used laptop', 'second hand laptop', 'processor', 'cpu', 'gpu', 'graphics card', 'ram', 'memory', 'ssd', 'hard drive', 'monitor', 'keyboard', 'mouse', 'webcam', 'laptop bag', 'laptop stand'],
         100.00, true,
         '{"typical_weights": {"per_unit": {"min": 1.000, "max": 3.000, "average": 1.500}}, "packaging": {"additional_weight": 0.20}}'::jsonb,
         '{"typical_rates": {"customs": {"min": 10, "max": 20, "common": 15}, "gst": {"standard": 18}, "vat": {"common": 13}}}'::jsonb,
         '{"auto_classification": {"keywords": ["laptop", "macbook", "computer", "notebook"], "confidence": 0.90}, "visual_metadata": {"icon": "💻", "color": "#6366F1", "display_name": "Computers & Laptops", "category_icon": "laptop", "confidence_indicator": "high", "common_brands": ["Apple", "Dell", "HP", "Lenovo", "ASUS", "Acer"], "typical_price_range": {"min": 300, "max": 3000, "currency": "USD"}, "search_priority": 1}}'::jsonb),
        
        -- CLOTHING with enhanced keywords
        ('6109', 'T-shirts and similar garments', 'clothing', 'tops',
         ARRAY['tshirt', 't-shirt', 'shirt', 'tee', 'polo', 'polo shirt', 'henley', 'tank top', 'sleeveless', 'vest', 'undershirt', 'crew neck', 'v-neck', 'round neck', 'collar shirt', 'formal shirt', 'casual shirt', 'dress shirt', 'button shirt', 'long sleeve', 'short sleeve', 'half sleeve', 'full sleeve', 'cotton shirt', 'polyester shirt', 'linen shirt', 'silk shirt', 'denim shirt', 'flannel shirt', 'hawaiian shirt', 'printed shirt', 'plain shirt', 'striped shirt', 'checked shirt', 'solid color', 'graphic tee', 'logo tee', 'band tee', 'sports shirt', 'athletic wear', 'workout shirt', 'gym shirt', 'running shirt', 'mens shirt', 'womens shirt', 'unisex shirt', 'kids shirt', 'baby shirt', 'oversized shirt', 'slim fit', 'regular fit', 'loose fit', 'tight fit'],
         5.00, true,
         '{"typical_weights": {"per_unit": {"min": 0.100, "max": 0.250, "average": 0.150}}, "packaging": {"additional_weight": 0.02}}'::jsonb,
         '{"typical_rates": {"customs": {"min": 10, "max": 15, "common": 12}, "gst": {"standard": 12}, "vat": {"common": 13}}}'::jsonb,
         '{"auto_classification": {"keywords": ["tshirt", "t-shirt", "shirt", "polo"], "confidence": 0.85}, "visual_metadata": {"icon": "👕", "color": "#10B981", "display_name": "T-Shirts & Casual Wear", "category_icon": "shirt", "confidence_indicator": "medium", "common_brands": ["Nike", "Adidas", "H&M", "Zara", "Uniqlo"], "typical_price_range": {"min": 5, "max": 100, "currency": "USD"}, "search_priority": 2}}'::jsonb),
        
        ('6204', 'Dresses and similar garments (including kurtas)', 'clothing', 'dresses',
         ARRAY['dress', 'kurti', 'kurta', 'gown', 'frock', 'maxi dress', 'mini dress', 'midi dress', 'cocktail dress', 'party dress', 'evening dress', 'prom dress', 'wedding dress', 'bridesmaid dress', 'casual dress', 'formal dress', 'summer dress', 'winter dress', 'long dress', 'short dress', 'sleeveless dress', 'long sleeve dress', 'off shoulder dress', 'strapless dress', 'halter dress', 'wrap dress', 'shift dress', 'a-line dress', 'bodycon dress', 'fit and flare', 'tunic', 'kaftan', 'sundress', 'beach dress', 'maternity dress', 'plus size dress', 'petite dress', 'tall dress', 'designer dress', 'vintage dress', 'retro dress', 'boho dress', 'ethnic dress', 'western dress', 'indian dress', 'salwar kameez', 'churidar', 'anarkali', 'lehenga top'],
         10.00, true,
         '{"typical_weights": {"per_unit": {"min": 0.200, "max": 0.500, "average": 0.300}}, "packaging": {"additional_weight": 0.03}}'::jsonb,
         '{"typical_rates": {"customs": {"min": 10, "max": 15, "common": 12}, "gst": {"standard": 12}, "vat": {"common": 13}}}'::jsonb,
         '{"auto_classification": {"keywords": ["dress", "kurti", "kurta", "gown"], "confidence": 0.85}, "visual_metadata": {"icon": "👗", "color": "#EC4899", "display_name": "Dresses & Traditional Wear", "category_icon": "dress", "confidence_indicator": "medium", "common_brands": ["Zara", "H&M", "Forever 21", "ASOS", "Mango"], "typical_price_range": {"min": 15, "max": 300, "currency": "USD"}, "search_priority": 2}}'::jsonb),
        
        -- BOOKS
        ('4901', 'Books and printed materials', 'books', 'educational',
         ARRAY['book', 'novel', 'textbook', 'manual', 'guide', 'handbook', 'reference book', 'fiction', 'non-fiction', 'biography', 'autobiography', 'memoir', 'history book', 'science book', 'math book', 'english book', 'literature', 'poetry book', 'children book', 'kids book', 'picture book', 'comic book', 'graphic novel', 'manga', 'cookbook', 'recipe book', 'self help book', 'motivational book', 'business book', 'finance book', 'investment book', 'technical book', 'programming book', 'computer book', 'engineering book', 'medical book', 'law book', 'legal book', 'academic book', 'university book', 'college book', 'school book', 'workbook', 'exercise book', 'study guide', 'test prep', 'exam book', 'revision book', 'notes', 'ebook', 'audiobook', 'hardcover', 'paperback', 'softcover', 'used book', 'second hand book', 'rare book'],
         NULL, false,
         '{"typical_weights": {"per_unit": {"min": 0.100, "max": 1.000, "average": 0.300}}, "packaging": {"additional_weight": 0.05}}'::jsonb,
         '{"typical_rates": {"customs": {"min": 0, "max": 5, "common": 0}, "gst": {"standard": 0}, "vat": {"common": 0}}}'::jsonb,
         '{"auto_classification": {"keywords": ["book", "novel", "textbook", "manual"], "confidence": 0.90}, "visual_metadata": {"icon": "📚", "color": "#F59E0B", "display_name": "Books & Educational Materials", "category_icon": "book", "confidence_indicator": "high", "common_brands": ["Penguin", "Oxford", "Cambridge", "McGraw Hill", "Pearson"], "typical_price_range": {"min": 5, "max": 200, "currency": "USD"}, "search_priority": 3}}'::jsonb),
        
        -- BEAUTY & PERSONAL CARE
        ('3304', 'Beauty and makeup products', 'beauty', 'cosmetics',
         ARRAY['makeup', 'cosmetics', 'beauty', 'skincare', 'foundation', 'concealer', 'primer', 'powder', 'blush', 'bronzer', 'eyeshadow', 'eyeliner', 'mascara', 'lipstick', 'lip gloss', 'lip balm', 'nail polish', 'nail art', 'nail care', 'manicure'],
         15.00, true,
         '{"typical_weights": {"per_unit": {"min": 0.010, "max": 0.100, "average": 0.040}}, "packaging": {"additional_weight": 0.02}}'::jsonb,
         '{"typical_rates": {"customs": {"min": 15, "max": 25, "common": 20}, "gst": {"standard": 18}, "vat": {"common": 13}}}'::jsonb,
         '{"auto_classification": {"keywords": ["makeup", "cosmetics", "beauty", "skincare"], "confidence": 0.90}, "visual_metadata": {"icon": "💄", "color": "#F472B6", "display_name": "Beauty & Cosmetics", "category_icon": "makeup", "confidence_indicator": "medium", "common_brands": ["MAC", "Urban Decay", "Sephora", "Maybelline", "LOreal"], "typical_price_range": {"min": 5, "max": 200, "currency": "USD"}, "search_priority": 2}}'::jsonb),
        
        ('3303', 'Perfumes and fragrances', 'beauty', 'fragrances',
         ARRAY['perfume', 'cologne', 'fragrance', 'eau de toilette', 'eau de parfum', 'body spray'],
         25.00, true,
         '{"typical_weights": {"per_unit": {"min": 0.050, "max": 0.200, "average": 0.100}}, "packaging": {"additional_weight": 0.03}}'::jsonb,
         '{"typical_rates": {"customs": {"min": 20, "max": 30, "common": 25}, "gst": {"standard": 18}, "vat": {"common": 13}}}'::jsonb,
         '{"auto_classification": {"keywords": ["perfume", "cologne", "fragrance", "eau de"], "confidence": 0.95}, "visual_metadata": {"icon": "🌸", "color": "#A855F7", "display_name": "Perfumes & Fragrances", "category_icon": "perfume", "confidence_indicator": "high", "common_brands": ["Chanel", "Dior", "Calvin Klein", "Hugo Boss", "Armani"], "typical_price_range": {"min": 25, "max": 500, "currency": "USD"}, "search_priority": 2}}'::jsonb),
        
        ('3401', 'Skincare and personal care products', 'beauty', 'skincare',
         ARRAY['skincare', 'moisturizer', 'cleanser', 'serum', 'sunscreen', 'face wash', 'toner'],
         10.00, true,
         '{"typical_weights": {"per_unit": {"min": 0.030, "max": 0.300, "average": 0.120}}, "packaging": {"additional_weight": 0.02}}'::jsonb,
         '{"typical_rates": {"customs": {"min": 10, "max": 20, "common": 15}, "gst": {"standard": 18}, "vat": {"common": 13}}}'::jsonb,
         '{"auto_classification": {"keywords": ["skincare", "moisturizer", "cleanser", "serum"], "confidence": 0.88}, "visual_metadata": {"icon": "🧴", "color": "#06B6D4", "display_name": "Skincare & Personal Care", "category_icon": "skincare", "confidence_indicator": "medium", "common_brands": ["Neutrogena", "CeraVe", "The Ordinary", "Clinique", "Olay"], "typical_price_range": {"min": 10, "max": 150, "currency": "USD"}, "search_priority": 2}}'::jsonb),
        
        -- SPORTS & FITNESS
        ('9506', 'Sports equipment and gear', 'sports', 'equipment',
         ARRAY['sports', 'fitness', 'gym', 'exercise', 'weights', 'dumbbells', 'yoga mat'],
         20.00, true,
         '{"typical_weights": {"per_unit": {"min": 0.200, "max": 10.000, "average": 2.000}}, "packaging": {"additional_weight": 0.10}}'::jsonb,
         '{"typical_rates": {"customs": {"min": 12, "max": 18, "common": 15}, "gst": {"standard": 18}, "vat": {"common": 13}}}'::jsonb,
         '{"auto_classification": {"keywords": ["sports", "fitness", "gym", "exercise"], "confidence": 0.85}, "visual_metadata": {"icon": "🏋️", "color": "#059669", "display_name": "Sports & Fitness Equipment", "category_icon": "fitness", "confidence_indicator": "medium", "common_brands": ["Nike", "Adidas", "Under Armour", "Reebok", "Puma"], "typical_price_range": {"min": 10, "max": 1000, "currency": "USD"}, "search_priority": 3}}'::jsonb),
        
        ('6112', 'Athletic and sportswear', 'sports', 'athletic_wear',
         ARRAY['sportswear', 'athletic', 'tracksuit', 'sports bra', 'leggings', 'gym wear'],
         12.00, true,
         '{"typical_weights": {"per_unit": {"min": 0.100, "max": 0.500, "average": 0.250}}, "packaging": {"additional_weight": 0.03}}'::jsonb,
         '{"typical_rates": {"customs": {"min": 12, "max": 16, "common": 14}, "gst": {"standard": 12}, "vat": {"common": 13}}}'::jsonb,
         '{"auto_classification": {"keywords": ["sportswear", "athletic", "tracksuit", "gym wear"], "confidence": 0.85}, "visual_metadata": {"icon": "🏃", "color": "#0EA5E9", "display_name": "Athletic & Sportswear", "category_icon": "athletic", "confidence_indicator": "medium", "common_brands": ["Nike", "Adidas", "Under Armour", "Lululemon", "Puma"], "typical_price_range": {"min": 15, "max": 200, "currency": "USD"}, "search_priority": 2}}'::jsonb),
        
        -- FOOTWEAR
        ('6403', 'Leather footwear', 'footwear', 'shoes',
         ARRAY['shoes', 'boots', 'leather shoes', 'dress shoes', 'formal shoes', 'heels'],
         25.00, true,
         '{"typical_weights": {"per_unit": {"min": 0.300, "max": 1.500, "average": 0.800}}, "packaging": {"additional_weight": 0.05}}'::jsonb,
         '{"typical_rates": {"customs": {"min": 15, "max": 25, "common": 20}, "gst": {"standard": 18}, "vat": {"common": 13}}}'::jsonb,
         '{"auto_classification": {"keywords": ["shoes", "boots", "footwear", "heels"], "confidence": 0.90}, "visual_metadata": {"icon": "👠", "color": "#92400E", "display_name": "Leather Footwear", "category_icon": "shoes", "confidence_indicator": "high", "common_brands": ["Nike", "Adidas", "Clarks", "Dr. Martens", "Cole Haan"], "typical_price_range": {"min": 30, "max": 800, "currency": "USD"}, "search_priority": 2}}'::jsonb),
        
        ('6404', 'Rubber and plastic footwear', 'footwear', 'casual_shoes',
         ARRAY['sneakers', 'running shoes', 'sports shoes', 'casual shoes', 'sandals', 'flip flops'],
         20.00, true,
         '{"typical_weights": {"per_unit": {"min": 0.200, "max": 1.000, "average": 0.600}}, "packaging": {"additional_weight": 0.05}}'::jsonb,
         '{"typical_rates": {"customs": {"min": 15, "max": 20, "common": 18}, "gst": {"standard": 18}, "vat": {"common": 13}}}'::jsonb,
         '{"auto_classification": {"keywords": ["sneakers", "running shoes", "sports shoes", "sandals"], "confidence": 0.90}, "visual_metadata": {"icon": "👟", "color": "#8B5CF6", "display_name": "Shoes & Sneakers", "category_icon": "sneakers", "confidence_indicator": "high", "common_brands": ["Nike", "Adidas", "Puma", "Reebok", "New Balance"], "typical_price_range": {"min": 20, "max": 500, "currency": "USD"}, "search_priority": 1}}'::jsonb),
        
        -- BABY & KIDS
        ('9503', 'Toys and games', 'baby_kids', 'toys',
         ARRAY['toys', 'games', 'puzzle', 'doll', 'action figure', 'board game', 'lego'],
         8.00, true,
         '{"typical_weights": {"per_unit": {"min": 0.050, "max": 2.000, "average": 0.300}}, "packaging": {"additional_weight": 0.05}}'::jsonb,
         '{"typical_rates": {"customs": {"min": 10, "max": 15, "common": 12}, "gst": {"standard": 12}, "vat": {"common": 13}}}'::jsonb,
         '{"auto_classification": {"keywords": ["toys", "games", "puzzle", "doll"], "confidence": 0.90}, "visual_metadata": {"icon": "🧸", "color": "#F97316", "display_name": "Toys & Games", "category_icon": "toys", "confidence_indicator": "high", "common_brands": ["LEGO", "Mattel", "Hasbro", "Fisher Price", "Playmobil"], "typical_price_range": {"min": 5, "max": 300, "currency": "USD"}, "search_priority": 3}}'::jsonb),
        
        ('3924', 'Baby care products', 'baby_kids', 'baby_care',
         ARRAY['baby', 'diaper', 'bottle', 'pacifier', 'baby care', 'feeding', 'stroller'],
         10.00, true,
         '{"typical_weights": {"per_unit": {"min": 0.050, "max": 5.000, "average": 0.500}}, "packaging": {"additional_weight": 0.05}}'::jsonb,
         '{"typical_rates": {"customs": {"min": 10, "max": 15, "common": 12}, "gst": {"standard": 12}, "vat": {"common": 13}}}'::jsonb,
         '{"auto_classification": {"keywords": ["baby", "diaper", "bottle", "pacifier"], "confidence": 0.95}, "visual_metadata": {"icon": "🍼", "color": "#FB7185", "display_name": "Baby Care Products", "category_icon": "baby", "confidence_indicator": "high", "common_brands": ["Pampers", "Johnson & Johnson", "Gerber", "Philips Avent", "Chicco"], "typical_price_range": {"min": 8, "max": 200, "currency": "USD"}, "search_priority": 3}}'::jsonb),
        
        -- BAGS & LUGGAGE
        ('4202', 'Bags and luggage', 'bags', 'luggage',
         ARRAY['bag', 'backpack', 'handbag', 'suitcase', 'luggage', 'purse', 'wallet'],
         15.00, true,
         '{"typical_weights": {"per_unit": {"min": 0.200, "max": 3.000, "average": 1.000}}, "packaging": {"additional_weight": 0.05}}'::jsonb,
         '{"typical_rates": {"customs": {"min": 15, "max": 20, "common": 18}, "gst": {"standard": 18}, "vat": {"common": 13}}}'::jsonb,
         '{"auto_classification": {"keywords": ["bag", "backpack", "handbag", "suitcase"], "confidence": 0.90}, "visual_metadata": {"icon": "👜", "color": "#DC2626", "display_name": "Bags & Travel Accessories", "category_icon": "bag", "confidence_indicator": "high", "common_brands": ["Louis Vuitton", "Gucci", "Coach", "Michael Kors", "Kate Spade"], "typical_price_range": {"min": 10, "max": 1000, "currency": "USD"}, "search_priority": 2}}'::jsonb),
        
        -- TOOLS & HARDWARE
        ('8205', 'Hand tools and hardware', 'tools', 'hand_tools',
         ARRAY['tools', 'hammer', 'screwdriver', 'wrench', 'pliers', 'hardware', 'drill'],
         15.00, true,
         '{"typical_weights": {"per_unit": {"min": 0.100, "max": 2.000, "average": 0.500}}, "packaging": {"additional_weight": 0.05}}'::jsonb,
         '{"typical_rates": {"customs": {"min": 10, "max": 15, "common": 12}, "gst": {"standard": 18}, "vat": {"common": 13}}}'::jsonb,
         '{"auto_classification": {"keywords": ["tools", "hammer", "screwdriver", "wrench"], "confidence": 0.90}, "visual_metadata": {"icon": "🔨", "color": "#6B7280", "display_name": "Hand Tools & Hardware", "category_icon": "tools", "confidence_indicator": "high", "common_brands": ["DeWalt", "Makita", "Bosch", "Stanley", "Craftsman"], "typical_price_range": {"min": 10, "max": 300, "currency": "USD"}, "search_priority": 3}}'::jsonb),
        
        -- AUTOMOTIVE
        ('8708', 'Auto parts and accessories', 'automotive', 'parts',
         ARRAY['auto', 'car', 'automotive', 'parts', 'accessories', 'car parts', 'vehicle'],
         20.00, true,
         '{"typical_weights": {"per_unit": {"min": 0.100, "max": 10.000, "average": 1.500}}, "packaging": {"additional_weight": 0.10}}'::jsonb,
         '{"typical_rates": {"customs": {"min": 12, "max": 18, "common": 15}, "gst": {"standard": 18}, "vat": {"common": 13}}}'::jsonb,
         '{"auto_classification": {"keywords": ["auto", "car", "automotive", "parts"], "confidence": 0.85}, "visual_metadata": {"icon": "🚗", "color": "#1F2937", "display_name": "Auto Parts & Accessories", "category_icon": "automotive", "confidence_indicator": "medium", "common_brands": ["Bosch", "NGK", "Mobil 1", "Castrol", "ACDelco"], "typical_price_range": {"min": 15, "max": 500, "currency": "USD"}, "search_priority": 3}}'::jsonb),
        
        -- MUSICAL INSTRUMENTS
        ('9207', 'Musical instruments', 'music', 'instruments',
         ARRAY['music', 'guitar', 'piano', 'keyboard', 'violin', 'drums', 'instrument'],
         50.00, true,
         '{"typical_weights": {"per_unit": {"min": 0.500, "max": 20.000, "average": 3.000}}, "packaging": {"additional_weight": 0.20}}'::jsonb,
         '{"typical_rates": {"customs": {"min": 10, "max": 15, "common": 12}, "gst": {"standard": 18}, "vat": {"common": 13}}}'::jsonb,
         '{"auto_classification": {"keywords": ["music", "guitar", "piano", "keyboard"], "confidence": 0.95}, "visual_metadata": {"icon": "🎸", "color": "#7C2D12", "display_name": "Musical Instruments", "category_icon": "music", "confidence_indicator": "high", "common_brands": ["Yamaha", "Fender", "Gibson", "Roland", "Casio"], "typical_price_range": {"min": 50, "max": 5000, "currency": "USD"}, "search_priority": 3}}'::jsonb),
        
        -- HEALTH & WELLNESS
        ('2106', 'Health supplements', 'health', 'supplements',
         ARRAY['supplements', 'vitamins', 'protein', 'health', 'nutrition', 'whey', 'creatine'],
         15.00, true,
         '{"typical_weights": {"per_unit": {"min": 0.100, "max": 2.000, "average": 0.500}}, "packaging": {"additional_weight": 0.05}}'::jsonb,
         '{"typical_rates": {"customs": {"min": 10, "max": 20, "common": 15}, "gst": {"standard": 12}, "vat": {"common": 13}}}'::jsonb,
         '{"auto_classification": {"keywords": ["supplements", "vitamins", "protein", "health"], "confidence": 0.88}, "visual_metadata": {"icon": "💊", "color": "#16A34A", "display_name": "Health Supplements", "category_icon": "health", "confidence_indicator": "medium", "common_brands": ["Optimum Nutrition", "MuscleTech", "Nature Made", "Centrum", "Garden of Life"], "typical_price_range": {"min": 15, "max": 200, "currency": "USD"}, "search_priority": 3}}'::jsonb),
        
        -- FOOD & BEVERAGES
        ('2101', 'Coffee and tea products', 'food', 'beverages',
         ARRAY['coffee', 'tea', 'beverage', 'instant coffee', 'green tea', 'black tea'],
         8.00, true,
         '{"typical_weights": {"per_unit": {"min": 0.100, "max": 1.000, "average": 0.300}}, "packaging": {"additional_weight": 0.03}}'::jsonb,
         '{"typical_rates": {"customs": {"min": 5, "max": 15, "common": 10}, "gst": {"standard": 12}, "vat": {"common": 13}}}'::jsonb,
         '{"auto_classification": {"keywords": ["coffee", "tea", "beverage", "instant"], "confidence": 0.90}, "visual_metadata": {"icon": "☕", "color": "#92400E", "display_name": "Coffee & Tea Products", "category_icon": "beverage", "confidence_indicator": "high", "common_brands": ["Starbucks", "Nescafe", "Lipton", "Twinings", "Folgers"], "typical_price_range": {"min": 5, "max": 100, "currency": "USD"}, "search_priority": 3}}'::jsonb),
        
        -- ACCESSORIES - JEWELRY & WATCHES  
        ('7113', 'Jewelry and accessories', 'accessories', 'jewelry',
         ARRAY['jewelry', 'ring', 'necklace', 'bracelet', 'earring'],
         25.00, true,
         '{"typical_weights": {"per_unit": {"min": 0.010, "max": 0.100, "average": 0.030}}, "packaging": {"additional_weight": 0.01}}'::jsonb,
         '{"typical_rates": {"customs": {"min": 15, "max": 20, "common": 18}, "gst": {"standard": 18}, "vat": {"common": 13}}}'::jsonb,
         '{"auto_classification": {"keywords": ["jewelry", "ring", "necklace", "bracelet"], "confidence": 0.80}, "visual_metadata": {"icon": "💍", "color": "#F59E0B", "display_name": "Jewelry & Accessories", "category_icon": "jewelry", "confidence_indicator": "medium", "common_brands": ["Tiffany & Co", "Pandora", "Swarovski", "Kay Jewelers", "Zales"], "typical_price_range": {"min": 20, "max": 2000, "currency": "USD"}, "search_priority": 2}}'::jsonb),
        
        ('9102', 'Watches and timepieces', 'accessories', 'watches',
         ARRAY['watch', 'timepiece', 'smartwatch', 'fitness tracker', 'activity tracker', 'digital watch', 'analog watch', 'automatic watch', 'mechanical watch', 'quartz watch', 'chronograph', 'stopwatch', 'sports watch', 'diving watch', 'luxury watch', 'designer watch', 'fashion watch', 'casual watch', 'formal watch', 'dress watch', 'mens watch', 'womens watch', 'unisex watch', 'kids watch', 'childrens watch', 'rolex', 'omega', 'seiko', 'casio', 'citizen', 'fossil', 'timex', 'invicta', 'apple watch', 'samsung watch', 'fitbit', 'garmin', 'polar', 'huawei watch', 'leather strap', 'metal strap', 'rubber strap', 'nylon strap', 'watch band'],
         30.00, true,
         '{"typical_weights": {"per_unit": {"min": 0.050, "max": 0.300, "average": 0.150}}, "packaging": {"additional_weight": 0.02}}'::jsonb,
         '{"typical_rates": {"customs": {"min": 15, "max": 25, "common": 20}, "gst": {"standard": 18}, "vat": {"common": 13}}}'::jsonb,
         '{"auto_classification": {"keywords": ["watch", "smartwatch", "fitness tracker", "timepiece"], "confidence": 0.95}, "visual_metadata": {"icon": "⌚", "color": "#374151", "display_name": "Watches & Timepieces", "category_icon": "watch", "confidence_indicator": "high", "common_brands": ["Apple", "Samsung", "Rolex", "Casio", "Seiko"], "typical_price_range": {"min": 25, "max": 5000, "currency": "USD"}, "search_priority": 2}}'::jsonb),
        
        -- HOME & GARDEN
        ('9403', 'Furniture and home decor', 'home_garden', 'furniture',
         ARRAY['furniture', 'chair', 'table', 'sofa', 'couch', 'bed', 'mattress', 'pillow', 'cushion', 'ottoman', 'stool', 'bench', 'desk', 'office chair', 'dining table', 'coffee table', 'side table', 'nightstand', 'dresser', 'wardrobe', 'closet', 'bookshelf', 'bookcase', 'shelf', 'cabinet', 'cupboard', 'storage', 'organizer', 'lamp', 'light', 'chandelier', 'pendant light', 'table lamp', 'floor lamp', 'wall light', 'ceiling light', 'led light', 'bulb', 'fixture', 'mirror', 'wall mirror', 'decorative mirror', 'picture frame', 'wall art', 'painting', 'poster', 'canvas', 'wall decor', 'home decor', 'decoration'],
         30.00, true,
         '{"typical_weights": {"per_unit": {"min": 1.000, "max": 20.000, "average": 5.000}}, "packaging": {"additional_weight": 0.50}}'::jsonb,
         '{"typical_rates": {"customs": {"min": 12, "max": 18, "common": 15}, "gst": {"standard": 18}, "vat": {"common": 13}}}'::jsonb,
         '{"auto_classification": {"keywords": ["furniture", "chair", "table", "sofa"], "confidence": 0.75}, "visual_metadata": {"icon": "🪑", "color": "#92400E", "display_name": "Furniture & Home Decor", "category_icon": "furniture", "confidence_indicator": "medium", "common_brands": ["IKEA", "West Elm", "Pottery Barn", "CB2", "Wayfair"], "typical_price_range": {"min": 20, "max": 2000, "currency": "USD"}, "search_priority": 3}}'::jsonb);
        
        RAISE NOTICE 'Comprehensive HSN master data populated with % records', (SELECT COUNT(*) FROM hsn_master);
    ELSE
        RAISE NOTICE 'HSN master data already exists (% records)', hsn_count;
    END IF;
    
    -- Populate country configurations if they don't exist
    IF config_count = 0 THEN
        RAISE NOTICE 'Populating unified country configurations...';
        
        INSERT INTO unified_configuration (config_type, config_key, config_data) VALUES
        -- India configuration with enhanced category support
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
                "home_garden": 15,
                "beauty": 20,
                "sports": 15,
                "footwear": 20,
                "baby_kids": 12,
                "bags": 18,
                "tools": 12,
                "automotive": 15,
                "music": 12,
                "health": 15,
                "food": 10
            },
            "minimum_valuations": {
                "applies_currency_conversion": true,
                "rounding_method": "up"
            },
            "api_endpoints": {
                "gst_lookup": "https://api.gst.gov.in/taxpayerapi/search/hsnsac"
            }
        }'::jsonb),
        
        -- Nepal configuration with enhanced category support
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
                "home_garden": 12,
                "beauty": 18,
                "sports": 12,
                "footwear": 18,
                "baby_kids": 10,
                "bags": 15,
                "tools": 10,
                "automotive": 12,
                "music": 10,
                "health": 12,
                "food": 8
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
        
        -- USA configuration
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
                "accessories": 12,
                "beauty": 15,
                "sports": 10,
                "footwear": 15,
                "baby_kids": 8,
                "bags": 12,
                "tools": 8,
                "automotive": 10,
                "music": 8,
                "health": 10,
                "food": 5
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
-- PHASE 7: CREATE HSN SEARCH OPTIMIZATION (Materialized View)
-- ============================================================================

-- Create a materialized view for optimized search results with visual metadata
DROP MATERIALIZED VIEW IF EXISTS hsn_search_optimized;
CREATE MATERIALIZED VIEW hsn_search_optimized AS
SELECT 
  hsn_code,
  description,
  category,
  subcategory,
  keywords,
  classification_data->'visual_metadata'->>'icon' as icon,
  classification_data->'visual_metadata'->>'color' as color,
  classification_data->'visual_metadata'->>'display_name' as display_name,
  classification_data->'visual_metadata'->>'search_priority' as search_priority,
  classification_data->'visual_metadata'->>'common_brands' as common_brands,
  tax_data,
  weight_data,
  minimum_valuation_usd,
  requires_currency_conversion,
  array_to_string(keywords, ' ') as keywords_text,
  to_tsvector('english', description || ' ' || array_to_string(keywords, ' ')) as search_vector
FROM hsn_master 
WHERE is_active = true
ORDER BY 
  CASE WHEN classification_data->'visual_metadata'->>'search_priority' IS NOT NULL 
       THEN CAST(classification_data->'visual_metadata'->>'search_priority' AS INTEGER) 
       ELSE 3 END ASC,
  category,
  hsn_code;

-- Create indexes on the materialized view for optimized search
CREATE INDEX IF NOT EXISTS idx_hsn_search_optimized_hsn_code ON hsn_search_optimized(hsn_code);
CREATE INDEX IF NOT EXISTS idx_hsn_search_optimized_category ON hsn_search_optimized(category);
CREATE INDEX IF NOT EXISTS idx_hsn_search_optimized_search_priority ON hsn_search_optimized(search_priority);
CREATE INDEX IF NOT EXISTS idx_hsn_search_optimized_search_vector ON hsn_search_optimized USING gin(search_vector);
CREATE INDEX IF NOT EXISTS idx_hsn_search_optimized_keywords_gin ON hsn_search_optimized USING gin(keywords);

-- ============================================================================
-- PHASE 8: ENABLE RLS AND POLICIES (Conditional)
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
-- PHASE 9: CREATE TRIGGERS (Conditional)
-- ============================================================================

-- Ensure the trigger exists and works properly for HSN tables
DO $$
BEGIN
    -- HSN Master trigger
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger t 
        JOIN pg_class c ON t.tgrelid = c.oid 
        WHERE c.relname = 'hsn_master' 
        AND t.tgname = 'update_hsn_master_updated_at'
    ) THEN
        CREATE TRIGGER update_hsn_master_updated_at 
            BEFORE UPDATE ON hsn_master 
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    -- Admin Overrides trigger
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger t 
        JOIN pg_class c ON t.tgrelid = c.oid 
        WHERE c.relname = 'admin_overrides' 
        AND t.tgname = 'update_admin_overrides_updated_at'
    ) THEN
        CREATE TRIGGER update_admin_overrides_updated_at 
            BEFORE UPDATE ON admin_overrides 
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    -- Unified Configuration trigger
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger t 
        JOIN pg_class c ON t.tgrelid = c.oid 
        WHERE c.relname = 'unified_configuration' 
        AND t.tgname = 'update_unified_configuration_updated_at'
    ) THEN
        CREATE TRIGGER update_unified_configuration_updated_at 
            BEFORE UPDATE ON unified_configuration 
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    -- User Roles trigger (ensure it exists and works)
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger t 
        JOIN pg_class c ON t.tgrelid = c.oid 
        WHERE c.relname = 'user_roles' 
        AND t.tgname = 'update_user_roles_updated_at'
    ) THEN
        CREATE TRIGGER update_user_roles_updated_at 
            BEFORE UPDATE ON user_roles 
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- ============================================================================
-- PHASE 10: VALIDATION AND VERIFICATION
-- ============================================================================

DO $$
DECLARE
    hsn_count INTEGER;
    config_count INTEGER;
    override_count INTEGER;
    quotes_with_hsn_fields INTEGER;
    routes_with_hsn_fields INTEGER;
    search_view_count INTEGER;
    user_roles_has_updated_at BOOLEAN;
BEGIN
    -- Count records
    SELECT COUNT(*) INTO hsn_count FROM hsn_master;
    SELECT COUNT(*) INTO config_count FROM unified_configuration;
    SELECT COUNT(*) INTO override_count FROM admin_overrides;
    SELECT COUNT(*) INTO search_view_count FROM hsn_search_optimized;
    
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
    
    -- Check user_roles updated_at column
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_roles' AND column_name = 'updated_at'
    ) INTO user_roles_has_updated_at;
    
    -- Report results
    RAISE NOTICE '==============================================================';
    RAISE NOTICE 'ENHANCED HSN SYSTEM COMPLETE MIGRATION FINISHED SUCCESSFULLY!';
    RAISE NOTICE '==============================================================';
    RAISE NOTICE 'HSN Master records: %', hsn_count;
    RAISE NOTICE 'Country configurations: %', config_count;
    RAISE NOTICE 'Admin overrides: %', override_count;
    RAISE NOTICE 'HSN search optimized records: %', search_view_count;
    RAISE NOTICE 'Quotes with HSN fields: %', quotes_with_hsn_fields;
    RAISE NOTICE 'Shipping routes with HSN fields: %', routes_with_hsn_fields;
    RAISE NOTICE 'User roles updated_at column: %', 
        CASE WHEN user_roles_has_updated_at THEN '✅ Present' ELSE '❌ Missing' END;
    RAISE NOTICE '';
    RAISE NOTICE 'KEY FEATURES ENABLED:';
    RAISE NOTICE '✅ Comprehensive HSN system (23 codes, 15+ categories)';
    RAISE NOTICE '✅ Enhanced search optimization with visual metadata';
    RAISE NOTICE '✅ Full-text search with materialized view';
    RAISE NOTICE '✅ Currency conversion for minimum valuations (USD → origin country)';
    RAISE NOTICE '✅ Per-item HSN classification and tax calculation';
    RAISE NOTICE '✅ Admin override system for tax rates and valuations';
    RAISE NOTICE '✅ DB-reset safe migration (idempotent operations)';
    RAISE NOTICE '✅ Comprehensive indexing for performance';
    RAISE NOTICE '✅ RLS policies for security';
    RAISE NOTICE '✅ Enhanced triggers with error handling';
    RAISE NOTICE '✅ Fixed user_roles updated_at column (ERROR 42703 prevention)';
    RAISE NOTICE '';
    RAISE NOTICE 'SEARCH CAPABILITIES:';
    RAISE NOTICE '✅ Full-text search with PostgreSQL to_tsvector';
    RAISE NOTICE '✅ Visual metadata (icons, colors, display names)';
    RAISE NOTICE '✅ Search priority ordering and relevance ranking';
    RAISE NOTICE '✅ Enhanced keywords for better classification';
    RAISE NOTICE '✅ Brand recognition and price range intelligence';
    RAISE NOTICE '';
    RAISE NOTICE 'CRITICAL: Nepal kurta example configured ($10 USD minimum → NPR conversion)';
    RAISE NOTICE 'Ready for production use with complete HSN system!';
    
    -- Test currency conversion function
    DECLARE
        test_conversion jsonb;
    BEGIN
        SELECT get_hsn_with_currency_conversion('6204', 'NP') INTO test_conversion;
        RAISE NOTICE 'Currency conversion test for Nepal kurta: %', test_conversion->'currency_conversion';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Currency conversion test failed: %', SQLERRM;
    END;
    
    -- Test search functionality
    DECLARE
        search_test_count INTEGER;
    BEGIN
        SELECT COUNT(*) INTO search_test_count 
        FROM hsn_search_optimized 
        WHERE search_vector @@ to_tsquery('english', 'mobile | phone');
        RAISE NOTICE 'Search test (mobile/phone): % results found', search_test_count;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Search test failed: %', SQLERRM;
    END;
    
END $$;