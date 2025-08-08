-- =====================================================
-- Hierarchical Regional Pricing System Migration
-- =====================================================
-- Creates a flexible, hierarchical pricing system for add-on services
-- Supporting Global → Continental → Regional → Country pricing tiers
-- Created: 2025-08-08

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. ADDON SERVICES MASTER TABLE
-- =====================================================
-- Defines all available add-on services with their base configurations
CREATE TABLE addon_services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    service_key TEXT NOT NULL UNIQUE, -- e.g., 'package_protection', 'express_processing'
    service_name TEXT NOT NULL, -- Human-readable name
    service_description TEXT,
    service_category TEXT NOT NULL DEFAULT 'protection', -- 'protection', 'processing', 'support', 'extras'
    
    -- Pricing configuration
    pricing_type TEXT NOT NULL DEFAULT 'percentage', -- 'percentage', 'fixed', 'tiered'
    default_rate DECIMAL(10,4) NOT NULL DEFAULT 0, -- Base rate (percentage as decimal or fixed amount)
    min_amount DECIMAL(10,2) DEFAULT 0, -- Minimum charge
    max_amount DECIMAL(10,2), -- Maximum charge (NULL = no limit)
    
    -- Service behavior
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_default_enabled BOOLEAN DEFAULT false, -- Auto-enable for new orders
    requires_order_value BOOLEAN DEFAULT true, -- Whether service depends on order value
    supported_order_types TEXT[] DEFAULT ARRAY['quote', 'order'], -- Where this service applies
    
    -- Display settings
    display_order INTEGER DEFAULT 0,
    icon_name TEXT, -- Lucide icon name
    badge_text TEXT, -- Optional badge (e.g., "Popular", "Recommended")
    
    -- Business rules
    business_rules JSONB DEFAULT '{}', -- Custom rules and configurations
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- 2. CONTINENTAL PRICING TABLE
-- =====================================================
-- Defines pricing rates at the continent level
CREATE TABLE continental_pricing (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    service_id UUID NOT NULL REFERENCES addon_services(id) ON DELETE CASCADE,
    continent TEXT NOT NULL, -- Must match country_settings.continent values
    
    -- Pricing configuration
    rate DECIMAL(10,4) NOT NULL, -- Rate (percentage as decimal or fixed amount)
    min_amount DECIMAL(10,2) DEFAULT 0,
    max_amount DECIMAL(10,2),
    
    -- Metadata
    currency_code TEXT DEFAULT 'USD', -- Base currency for fixed rates
    notes TEXT, -- Admin notes for this pricing
    is_active BOOLEAN NOT NULL DEFAULT true,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    UNIQUE(service_id, continent),
    
    -- Validate continent names
    CONSTRAINT check_continent_name CHECK (
        continent IN ('Africa', 'Antarctica', 'Asia', 'Europe', 'North America', 'Oceania', 'South America')
    )
);

-- =====================================================
-- 3. REGIONAL PRICING TABLE  
-- =====================================================
-- Defines custom regional groupings and their pricing
CREATE TABLE regional_pricing (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    service_id UUID NOT NULL REFERENCES addon_services(id) ON DELETE CASCADE,
    region_key TEXT NOT NULL, -- e.g., 'south_asia', 'southeast_asia', 'western_europe'
    region_name TEXT NOT NULL, -- Human-readable name
    region_description TEXT,
    
    -- Countries in this region
    country_codes TEXT[] NOT NULL, -- Array of ISO country codes
    
    -- Pricing configuration
    rate DECIMAL(10,4) NOT NULL,
    min_amount DECIMAL(10,2) DEFAULT 0,
    max_amount DECIMAL(10,2),
    
    -- Metadata
    currency_code TEXT DEFAULT 'USD',
    notes TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    priority INTEGER DEFAULT 100, -- Higher priority = preferred when countries overlap regions
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    UNIQUE(service_id, region_key)
);

-- =====================================================
-- 4. COUNTRY PRICING OVERRIDES TABLE
-- =====================================================
-- Individual country-specific pricing that overrides all other tiers
CREATE TABLE country_pricing_overrides (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    service_id UUID NOT NULL REFERENCES addon_services(id) ON DELETE CASCADE,
    country_code TEXT NOT NULL, -- ISO 2-letter country code
    
    -- Pricing configuration
    rate DECIMAL(10,4) NOT NULL,
    min_amount DECIMAL(10,2) DEFAULT 0,
    max_amount DECIMAL(10,2),
    
    -- Metadata
    currency_code TEXT DEFAULT 'USD',
    reason TEXT, -- Why this country has special pricing
    notes TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    
    -- Effective dates
    effective_from TIMESTAMPTZ DEFAULT NOW(),
    effective_until TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    UNIQUE(service_id, country_code),
    
    -- Validate country code format
    CONSTRAINT check_country_code_format CHECK (country_code ~ '^[A-Z]{2}$')
);

-- =====================================================
-- 5. PRICING CALCULATION CACHE TABLE
-- =====================================================
-- Caches pricing calculations for performance
CREATE TABLE pricing_calculation_cache (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    service_id UUID NOT NULL REFERENCES addon_services(id) ON DELETE CASCADE,
    country_code TEXT NOT NULL,
    order_value DECIMAL(10,2) NOT NULL,
    
    -- Cached calculation results
    applicable_rate DECIMAL(10,4) NOT NULL,
    calculated_amount DECIMAL(10,2) NOT NULL,
    min_amount DECIMAL(10,2) DEFAULT 0,
    max_amount DECIMAL(10,2),
    
    -- Pricing source tracking
    pricing_tier TEXT NOT NULL, -- 'global', 'continental', 'regional', 'country'
    source_id UUID, -- ID of the pricing rule that was applied
    
    -- Cache metadata
    calculation_metadata JSONB DEFAULT '{}',
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '1 hour'),
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    UNIQUE(service_id, country_code, order_value)
);

-- =====================================================
-- 6. INDEXES FOR PERFORMANCE
-- =====================================================

-- Addon Services
CREATE INDEX idx_addon_services_category ON addon_services(service_category);
CREATE INDEX idx_addon_services_active ON addon_services(is_active);
CREATE INDEX idx_addon_services_display_order ON addon_services(display_order);

-- Continental Pricing  
CREATE INDEX idx_continental_pricing_continent ON continental_pricing(continent);
CREATE INDEX idx_continental_pricing_service_active ON continental_pricing(service_id, is_active);

-- Regional Pricing
CREATE INDEX idx_regional_pricing_countries ON regional_pricing USING GIN(country_codes);
CREATE INDEX idx_regional_pricing_service_active ON regional_pricing(service_id, is_active);
CREATE INDEX idx_regional_pricing_priority ON regional_pricing(priority DESC);

-- Country Pricing Overrides
CREATE INDEX idx_country_pricing_country ON country_pricing_overrides(country_code);
CREATE INDEX idx_country_pricing_service_active ON country_pricing_overrides(service_id, is_active);
CREATE INDEX idx_country_pricing_effective ON country_pricing_overrides(effective_from, effective_until);

-- Pricing Cache
CREATE INDEX idx_pricing_cache_lookup ON pricing_calculation_cache(service_id, country_code, order_value);
CREATE INDEX idx_pricing_cache_expires ON pricing_calculation_cache(expires_at);

-- =====================================================
-- 7. UPDATED_AT TRIGGERS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to all tables
CREATE TRIGGER update_addon_services_updated_at 
    BEFORE UPDATE ON addon_services
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_continental_pricing_updated_at
    BEFORE UPDATE ON continental_pricing  
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_regional_pricing_updated_at
    BEFORE UPDATE ON regional_pricing
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_country_pricing_overrides_updated_at
    BEFORE UPDATE ON country_pricing_overrides
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 8. RLS POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE addon_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE continental_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE regional_pricing ENABLE ROW LEVEL SECURITY; 
ALTER TABLE country_pricing_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_calculation_cache ENABLE ROW LEVEL SECURITY;

-- Addon Services: Public read, admin write
CREATE POLICY "Public read access on addon_services" ON addon_services
    FOR SELECT USING (is_active = true);

CREATE POLICY "Admin full access on addon_services" ON addon_services
    FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Continental Pricing: Public read active records, admin write
CREATE POLICY "Public read access on continental_pricing" ON continental_pricing
    FOR SELECT USING (is_active = true);

CREATE POLICY "Admin full access on continental_pricing" ON continental_pricing
    FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Regional Pricing: Public read active records, admin write  
CREATE POLICY "Public read access on regional_pricing" ON regional_pricing
    FOR SELECT USING (is_active = true);

CREATE POLICY "Admin full access on regional_pricing" ON regional_pricing
    FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Country Pricing Overrides: Public read active records, admin write
CREATE POLICY "Public read access on country_pricing_overrides" ON country_pricing_overrides
    FOR SELECT USING (
        is_active = true 
        AND (effective_from IS NULL OR effective_from <= NOW())
        AND (effective_until IS NULL OR effective_until > NOW())
    );

CREATE POLICY "Admin full access on country_pricing_overrides" ON country_pricing_overrides  
    FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Pricing Cache: Public read, system write
CREATE POLICY "Public read access on pricing_calculation_cache" ON pricing_calculation_cache
    FOR SELECT USING (expires_at > NOW());

CREATE POLICY "Admin full access on pricing_calculation_cache" ON pricing_calculation_cache
    FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- =====================================================
-- 9. HELPFUL VIEWS
-- =====================================================

-- View for easy pricing lookup
CREATE VIEW pricing_hierarchy_view AS
SELECT 
    s.service_key,
    s.service_name,
    s.service_category,
    s.pricing_type,
    s.default_rate,
    
    -- Continental rates
    cp.continent,
    cp.rate as continental_rate,
    
    -- Regional rates  
    rp.region_key,
    rp.region_name,
    rp.country_codes as regional_countries,
    rp.rate as regional_rate,
    rp.priority as regional_priority,
    
    -- Country overrides
    co.country_code,
    co.rate as country_rate,
    co.reason as country_reason,
    
    -- Metadata
    COALESCE(co.is_active, rp.is_active, cp.is_active, s.is_active) as is_active
FROM addon_services s
LEFT JOIN continental_pricing cp ON s.id = cp.service_id
LEFT JOIN regional_pricing rp ON s.id = rp.service_id  
LEFT JOIN country_pricing_overrides co ON s.id = co.service_id
WHERE s.is_active = true
ORDER BY s.display_order, s.service_key;

-- =====================================================
-- 10. CLEANUP FUNCTIONS
-- =====================================================

-- Function to clean expired cache entries
CREATE OR REPLACE FUNCTION cleanup_expired_pricing_cache()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM pricing_calculation_cache 
    WHERE expires_at < NOW();
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

-- Add comment to track migration
COMMENT ON TABLE addon_services IS 'Master table for add-on services with hierarchical regional pricing support - Created 2025-08-08';