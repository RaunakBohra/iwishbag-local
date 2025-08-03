-- Smart Product Intelligence System - Phase 1: Database Schema
-- Multi-country support for India HSN, Nepal HS, and future USA HTS codes

-- Drop existing tables if they exist (for clean deployment)
DROP TABLE IF EXISTS customs_valuation_overrides CASCADE;
DROP TABLE IF EXISTS product_classifications CASCADE;
DROP TABLE IF EXISTS country_configs CASCADE;

-- 1. Country-specific configuration table
CREATE TABLE country_configs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    country_code VARCHAR(2) NOT NULL UNIQUE, -- ISO 2-letter codes
    country_name VARCHAR(100) NOT NULL,
    
    -- Classification system info
    classification_system VARCHAR(20) NOT NULL, -- 'HSN', 'HS', 'HTS'
    classification_digits INTEGER NOT NULL DEFAULT 4, -- 4 for HSN/HS, 6-10 for HTS
    
    -- Default rates
    default_customs_rate DECIMAL(5,2) NOT NULL DEFAULT 10.00,
    default_local_tax_rate DECIMAL(5,2) NOT NULL DEFAULT 15.00,
    local_tax_name VARCHAR(50) NOT NULL DEFAULT 'VAT',
    
    -- Smart features configuration
    enable_weight_estimation BOOLEAN DEFAULT true,
    enable_category_suggestions BOOLEAN DEFAULT true,
    enable_customs_valuation_override BOOLEAN DEFAULT true,
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    
    -- Constraints
    CONSTRAINT valid_classification_system CHECK (classification_system IN ('HSN', 'HS', 'HTS')),
    CONSTRAINT valid_digits CHECK (classification_digits BETWEEN 4 AND 12),
    CONSTRAINT valid_rates CHECK (default_customs_rate >= 0 AND default_local_tax_rate >= 0)
);

-- 2. Product classifications table (HSN/HS/HTS codes with multi-country data)
CREATE TABLE product_classifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Classification code (HSN/HS/HTS)
    classification_code VARCHAR(20) NOT NULL,
    country_code VARCHAR(2) NOT NULL REFERENCES country_configs(country_code),
    
    -- Basic product info
    product_name VARCHAR(200) NOT NULL,
    category VARCHAR(100) NOT NULL,
    subcategory VARCHAR(100),
    description TEXT,
    
    -- Multi-country specific data stored as JSONB for flexibility
    country_data JSONB NOT NULL DEFAULT '{}',
    -- Structure: {
    --   "customs_rate": 15.5,
    --   "local_exemptions": ["student", "export"],
    --   "restricted": false,
    --   "documentation_required": ["invoice", "certificate"],
    --   "seasonal_adjustments": {...}
    -- }
    
    -- Weight and dimension intelligence
    typical_weight_kg DECIMAL(8,3), -- Typical weight for this product type
    weight_variance_factor DECIMAL(4,2) DEFAULT 1.0, -- Multiplier for weight estimation
    typical_dimensions JSONB, -- {length, width, height, unit, notes}
    volume_category VARCHAR(20), -- 'compact', 'bulky', 'oversized'
    
    -- Customs and pricing intelligence
    customs_rate DECIMAL(5,2), -- Specific rate for this classification
    valuation_method VARCHAR(20) DEFAULT 'product_price', -- 'product_price' or 'minimum_valuation'
    minimum_valuation_usd DECIMAL(10,2), -- Minimum customs value if applicable
    
    -- Meta information
    confidence_score DECIMAL(3,2) DEFAULT 0.8, -- AI/rule confidence 0.0-1.0
    usage_frequency INTEGER DEFAULT 0, -- How often this classification is used
    last_verified_at TIMESTAMP WITH TIME ZONE,
    
    -- Search and indexing
    search_keywords TEXT[], -- Additional keywords for search
    tags VARCHAR(50)[], -- Flexible tagging system
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    is_active BOOLEAN DEFAULT true,
    
    -- Constraints
    UNIQUE(classification_code, country_code),
    CONSTRAINT valid_confidence CHECK (confidence_score BETWEEN 0.0 AND 1.0),
    CONSTRAINT valid_weight CHECK (typical_weight_kg IS NULL OR typical_weight_kg > 0),
    CONSTRAINT valid_valuation_method CHECK (valuation_method IN ('product_price', 'minimum_valuation')),
    CONSTRAINT valid_volume_category CHECK (volume_category IN ('compact', 'standard', 'bulky', 'oversized'))
);

-- 3. Customs valuation overrides (audit trail for manual overrides)
CREATE TABLE customs_valuation_overrides (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Link to quote/order
    quote_id UUID, -- Links to quotes table when available
    order_id UUID, -- Links to orders table when available
    
    -- Override details
    product_classification_id UUID REFERENCES product_classifications(id),
    original_method VARCHAR(20) NOT NULL,
    override_method VARCHAR(20) NOT NULL,
    original_value_usd DECIMAL(10,2) NOT NULL,
    override_value_usd DECIMAL(10,2) NOT NULL,
    
    -- Justification and audit
    override_reason TEXT NOT NULL,
    justification_documents JSONB, -- Array of document references
    approved_by UUID REFERENCES auth.users(id),
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id) NOT NULL,
    
    -- Constraints
    CONSTRAINT valid_valuation_methods CHECK (
        original_method IN ('product_price', 'minimum_valuation') AND
        override_method IN ('product_price', 'minimum_valuation')
    ),
    CONSTRAINT different_methods CHECK (original_method != override_method),
    CONSTRAINT positive_values CHECK (original_value_usd > 0 AND override_value_usd > 0),
    CONSTRAINT quote_or_order_required CHECK (quote_id IS NOT NULL OR order_id IS NOT NULL)
);

-- Indexes for performance
CREATE INDEX idx_product_classifications_country_code ON product_classifications(country_code);
CREATE INDEX idx_product_classifications_classification_code ON product_classifications(classification_code);
CREATE INDEX idx_product_classifications_category ON product_classifications(category);
CREATE INDEX idx_product_classifications_active ON product_classifications(is_active) WHERE is_active = true;
CREATE INDEX idx_product_classifications_search ON product_classifications USING GIN(search_keywords);
CREATE INDEX idx_product_classifications_tags ON product_classifications USING GIN(tags);
CREATE INDEX idx_product_classifications_country_data ON product_classifications USING GIN(country_data);

CREATE INDEX idx_country_configs_country_code ON country_configs(country_code);
CREATE INDEX idx_customs_valuation_quote_id ON customs_valuation_overrides(quote_id);
CREATE INDEX idx_customs_valuation_order_id ON customs_valuation_overrides(order_id);
CREATE INDEX idx_customs_valuation_created_at ON customs_valuation_overrides(created_at);

-- Full-text search index for product classifications
CREATE INDEX idx_product_classifications_fts ON product_classifications USING GIN(
    to_tsvector('english', 
        COALESCE(product_name, '') || ' ' || 
        COALESCE(category, '') || ' ' || 
        COALESCE(subcategory, '') || ' ' || 
        COALESCE(description, '')
    )
);

-- RLS Policies

-- Country configs: readable by all authenticated users, writable by admins only
ALTER TABLE country_configs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Country configs readable by authenticated users" ON country_configs
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "Country configs writable by admins only" ON country_configs
    FOR ALL TO authenticated USING (is_admin());

-- Product classifications: readable by all, writable by admins
ALTER TABLE product_classifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Product classifications readable by authenticated users" ON product_classifications
    FOR SELECT TO authenticated USING (is_active = true OR is_admin());
CREATE POLICY "Product classifications writable by admins only" ON product_classifications
    FOR ALL TO authenticated USING (is_admin());

-- Customs valuation overrides: users can read their own, admins can read all
ALTER TABLE customs_valuation_overrides ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read their own customs overrides" ON customs_valuation_overrides
    FOR SELECT TO authenticated USING (created_by = auth.uid() OR is_admin());
CREATE POLICY "Users can create customs overrides" ON customs_valuation_overrides
    FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());
CREATE POLICY "Admins can manage all customs overrides" ON customs_valuation_overrides
    FOR ALL TO authenticated USING (is_admin());

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_country_configs_updated_at BEFORE UPDATE ON country_configs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_product_classifications_updated_at BEFORE UPDATE ON product_classifications
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert initial country configurations
INSERT INTO country_configs (country_code, country_name, classification_system, classification_digits, default_customs_rate, default_local_tax_rate, local_tax_name) VALUES
-- India
('IN', 'India', 'HSN', 4, 20.00, 18.00, 'GST'),
-- Nepal  
('NP', 'Nepal', 'HS', 4, 15.00, 13.00, 'VAT'),
-- USA (future)
('US', 'United States', 'HTS', 10, 5.00, 8.00, 'Sales Tax'),
-- Default countries for testing
('GB', 'United Kingdom', 'HS', 6, 10.00, 20.00, 'VAT'),
('AU', 'Australia', 'HS', 8, 5.00, 10.00, 'GST');

-- Insert sample product classifications for testing

-- India HSN Codes
INSERT INTO product_classifications (
    classification_code, country_code, product_name, category, subcategory, description,
    country_data, typical_weight_kg, customs_rate, confidence_score, search_keywords
) VALUES
('6109', 'IN', 'T-shirts and Tank Tops', 'Clothing', 'Casual Wear', 'Cotton and synthetic t-shirts, tank tops, vests', 
 '{"customs_rate": 12.0, "local_exemptions": [], "restricted": false}', 0.2, 12.00, 0.95, 
 ARRAY['tshirt', 'tank', 'vest', 'cotton', 'casual']),

('8517', 'IN', 'Mobile Phones', 'Electronics', 'Communication', 'Smartphones, feature phones, mobile devices',
 '{"customs_rate": 18.0, "documentation_required": ["invoice", "imei"], "restricted": false}', 0.18, 18.00, 0.98,
 ARRAY['mobile', 'phone', 'smartphone', 'cellular', 'communication']),

('8471', 'IN', 'Laptops and Computers', 'Electronics', 'Computing', 'Portable computers, laptops, notebooks',
 '{"customs_rate": 0.0, "local_exemptions": ["student", "business"], "restricted": false}', 2.5, 0.00, 0.95,
 ARRAY['laptop', 'computer', 'notebook', 'portable', 'pc']),

('6204', 'IN', 'Women''s Dresses', 'Clothing', 'Women''s Wear', 'Dresses, gowns, formal and casual wear for women',
 '{"customs_rate": 12.0, "local_exemptions": [], "restricted": false}', 0.5, 12.00, 0.92,
 ARRAY['dress', 'gown', 'women', 'formal', 'casual']),

('9503', 'IN', 'Toys and Games', 'Toys', 'Children', 'Educational toys, games, puzzles for children',
 '{"customs_rate": 20.0, "safety_standards": ["BIS"], "restricted": false}', 0.3, 20.00, 0.90,
 ARRAY['toy', 'game', 'puzzle', 'children', 'educational']);

-- Nepal HS Codes (similar structure)
INSERT INTO product_classifications (
    classification_code, country_code, product_name, category, subcategory, description,
    country_data, typical_weight_kg, customs_rate, confidence_score, search_keywords
) VALUES
('6109', 'NP', 'T-shirts and Casual Wear', 'Clothing', 'Casual Wear', 'Cotton t-shirts, casual tops and vests',
 '{"customs_rate": 10.0, "local_exemptions": [], "restricted": false}', 0.2, 10.00, 0.90,
 ARRAY['tshirt', 'casual', 'cotton', 'top']),

('8517', 'NP', 'Mobile Communication Devices', 'Electronics', 'Communication', 'Mobile phones and communication equipment',
 '{"customs_rate": 15.0, "documentation_required": ["invoice"], "restricted": false}', 0.18, 15.00, 0.93,
 ARRAY['mobile', 'phone', 'communication', 'cellular']),

('8471', 'NP', 'Computer Equipment', 'Electronics', 'Computing', 'Laptops, computers and computing devices',
 '{"customs_rate": 5.0, "local_exemptions": ["educational"], "restricted": false}', 2.5, 5.00, 0.90,
 ARRAY['laptop', 'computer', 'computing', 'pc']),

('6204', 'NP', 'Women''s Clothing', 'Clothing', 'Women''s Wear', 'Dresses and women''s clothing items',
 '{"customs_rate": 10.0, "local_exemptions": [], "restricted": false}', 0.5, 10.00, 0.88,
 ARRAY['dress', 'women', 'clothing', 'apparel']);

-- Grant necessary permissions
GRANT ALL ON country_configs TO authenticated;
GRANT ALL ON product_classifications TO authenticated;
GRANT ALL ON customs_valuation_overrides TO authenticated;

-- Create summary view for easy querying
CREATE VIEW smart_product_intelligence_summary AS
SELECT 
    cc.country_code,
    cc.country_name,
    cc.classification_system,
    COUNT(pc.id) as total_classifications,
    COUNT(CASE WHEN pc.is_active THEN 1 END) as active_classifications,
    AVG(pc.confidence_score) as avg_confidence,
    COUNT(DISTINCT pc.category) as categories_count
FROM country_configs cc
LEFT JOIN product_classifications pc ON cc.country_code = pc.country_code
GROUP BY cc.country_code, cc.country_name, cc.classification_system
ORDER BY cc.country_code;

GRANT SELECT ON smart_product_intelligence_summary TO authenticated;

-- Success confirmation
DO $$
BEGIN
    RAISE NOTICE 'Smart Product Intelligence Schema created successfully!';
    RAISE NOTICE 'Tables created: country_configs, product_classifications, customs_valuation_overrides';
    RAISE NOTICE 'Sample data inserted for India (HSN) and Nepal (HS) systems';
    RAISE NOTICE 'RLS policies applied and indexes created for performance';
END $$;