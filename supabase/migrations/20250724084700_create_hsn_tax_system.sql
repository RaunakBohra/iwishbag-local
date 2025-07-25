-- ============================================================================
-- HSN-BASED TAX SYSTEM IMPLEMENTATION
-- Migration: Create new tables for HSN code management and per-item tax calculation
-- Date: 2025-07-24
-- ============================================================================

-- 1. HSN Master Database - Global HSN code repository
CREATE TABLE hsn_master (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hsn_code TEXT UNIQUE NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  subcategory TEXT,
  keywords TEXT[] DEFAULT '{}',
  
  -- Weight intelligence data
  weight_data JSONB DEFAULT '{}'::jsonb,
  
  -- Tax and classification data
  tax_data JSONB DEFAULT '{}'::jsonb,
  
  -- Classification intelligence
  classification_data JSONB DEFAULT '{}'::jsonb,
  
  -- Meta information
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Admin Overrides - Centralized override system
CREATE TABLE admin_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Override type and scope
  override_type TEXT NOT NULL CHECK (override_type IN ('tax_rate', 'hsn_code', 'weight', 'minimum_valuation', 'exemption')),
  scope TEXT NOT NULL CHECK (scope IN ('route', 'category', 'product', 'global')),
  scope_identifier TEXT, -- route_id, category_name, product_pattern, etc.
  
  -- Override data (flexible JSONB structure)
  override_data JSONB NOT NULL,
  
  -- Admin metadata
  admin_id UUID,
  justification TEXT,
  
  -- Lifecycle management
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Unified Configuration - Replace scattered configs
CREATE TABLE unified_configuration (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Configuration type and key
  config_type TEXT NOT NULL, -- 'country', 'currency', 'payment_gateway', 'tax_rule', 'api_settings'
  config_key TEXT NOT NULL,
  
  -- Configuration data (flexible JSONB structure)
  config_data JSONB NOT NULL,
  
  -- Version control
  version INTEGER DEFAULT 1,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Ensure unique config per type-key combination
  UNIQUE(config_type, config_key)
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- HSN Master indexes
CREATE INDEX idx_hsn_master_hsn_code ON hsn_master(hsn_code);
CREATE INDEX idx_hsn_master_category ON hsn_master(category);
CREATE INDEX idx_hsn_master_keywords ON hsn_master USING GIN(keywords);
CREATE INDEX idx_hsn_master_active ON hsn_master(is_active);

-- Admin Overrides indexes
CREATE INDEX idx_admin_overrides_type ON admin_overrides(override_type);
CREATE INDEX idx_admin_overrides_scope ON admin_overrides(scope, scope_identifier);
CREATE INDEX idx_admin_overrides_active ON admin_overrides(is_active);
CREATE INDEX idx_admin_overrides_expires ON admin_overrides(expires_at);

-- Unified Configuration indexes
CREATE INDEX idx_unified_config_type_key ON unified_configuration(config_type, config_key);
CREATE INDEX idx_unified_config_active ON unified_configuration(is_active);

-- ============================================================================
-- ENHANCE EXISTING TABLES
-- ============================================================================

-- Add JSONB configuration columns to shipping_routes
ALTER TABLE shipping_routes ADD COLUMN IF NOT EXISTS tax_configuration JSONB DEFAULT '{}'::jsonb;
ALTER TABLE shipping_routes ADD COLUMN IF NOT EXISTS weight_configuration JSONB DEFAULT '{}'::jsonb;
ALTER TABLE shipping_routes ADD COLUMN IF NOT EXISTS api_configuration JSONB DEFAULT '{}'::jsonb;

-- Add per-item calculation support to quotes
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS item_level_calculations JSONB DEFAULT '{}'::jsonb;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS auto_classification_data JSONB DEFAULT '{}'::jsonb;

-- ============================================================================
-- INSERT SAMPLE DATA FOR TESTING
-- ============================================================================

-- Sample HSN codes for common products
INSERT INTO hsn_master (hsn_code, description, category, subcategory, keywords, weight_data, tax_data, classification_data) VALUES
-- Electronics
('8517', 'Mobile phones and communication equipment', 'electronics', 'communication_devices', 
 ARRAY['mobile', 'phone', 'iphone', 'samsung', 'smartphone', 'cellular'],
 '{"typical_weights": {"per_unit": {"min": 0.120, "max": 0.250, "average": 0.180}}, "packaging": {"additional_weight": 0.05}}'::jsonb,
 '{"typical_rates": {"customs": {"min": 15, "max": 25, "common": 20}, "gst": {"standard": 18}, "vat": {"common": 13}}}'::jsonb,
 '{"auto_classification": {"keywords": ["iphone", "samsung", "mobile", "smartphone"], "confidence": 0.95}}'::jsonb),

('8471', 'Computers and laptop computers', 'electronics', 'computers',
 ARRAY['laptop', 'computer', 'macbook', 'dell', 'hp', 'asus'],
 '{"typical_weights": {"per_unit": {"min": 1.000, "max": 3.000, "average": 1.500}}, "packaging": {"additional_weight": 0.20}}'::jsonb,
 '{"typical_rates": {"customs": {"min": 10, "max": 20, "common": 15}, "gst": {"standard": 18}, "vat": {"common": 13}}}'::jsonb,
 '{"auto_classification": {"keywords": ["laptop", "macbook", "computer", "notebook"], "confidence": 0.90}}'::jsonb),

-- Clothing
('6109', 'T-shirts and similar garments', 'clothing', 'tops',
 ARRAY['tshirt', 't-shirt', 'shirt', 'tee', 'polo'],
 '{"typical_weights": {"per_unit": {"min": 0.100, "max": 0.250, "average": 0.150}}, "packaging": {"additional_weight": 0.02}}'::jsonb,
 '{"typical_rates": {"customs": {"min": 10, "max": 15, "common": 12}, "gst": {"standard": 12}, "vat": {"common": 13}}}'::jsonb,
 '{"auto_classification": {"keywords": ["tshirt", "t-shirt", "shirt", "polo"], "confidence": 0.85}}'::jsonb),

('6204', 'Dresses and similar garments', 'clothing', 'dresses',
 ARRAY['dress', 'kurti', 'kurta', 'gown', 'frock'],
 '{"typical_weights": {"per_unit": {"min": 0.200, "max": 0.500, "average": 0.300}}, "packaging": {"additional_weight": 0.03}}'::jsonb,
 '{"typical_rates": {"customs": {"min": 10, "max": 15, "common": 12}, "gst": {"standard": 12}, "vat": {"common": 13}}}'::jsonb,
 '{"auto_classification": {"keywords": ["dress", "kurti", "kurta", "gown"], "confidence": 0.85}}'::jsonb),

-- Books (often tax-exempt)
('4901', 'Books and printed materials', 'books', 'educational',
 ARRAY['book', 'novel', 'textbook', 'manual', 'guide'],
 '{"typical_weights": {"per_unit": {"min": 0.100, "max": 1.000, "average": 0.300}}, "packaging": {"additional_weight": 0.05}}'::jsonb,
 '{"typical_rates": {"customs": {"min": 0, "max": 5, "common": 0}, "gst": {"standard": 0}, "vat": {"common": 0}}}'::jsonb,
 '{"auto_classification": {"keywords": ["book", "novel", "textbook", "manual"], "confidence": 0.90}}'::jsonb);

-- Sample unified configuration for major countries
INSERT INTO unified_configuration (config_type, config_key, config_data) VALUES
-- India configuration
('country', 'IN', '{
  "name": "India",
  "currency": "INR",
  "tax_system": "GST",
  "default_gst_rate": 18,
  "customs_rates": {
    "electronics": 20,
    "clothing": 12,
    "books": 0
  },
  "minimum_valuations": {},
  "api_endpoints": {
    "gst_lookup": "https://api.gst.gov.in/taxpayerapi/search/hsnsac"
  }
}'::jsonb),

-- Nepal configuration  
('country', 'NP', '{
  "name": "Nepal",
  "currency": "NPR",
  "tax_system": "VAT",
  "default_vat_rate": 13,
  "customs_rates": {
    "electronics": 15,
    "clothing": 12,
    "books": 0
  },
  "minimum_valuations": {
    "clothing": {"value": 10, "currency": "USD"},
    "electronics": {"value": 50, "currency": "USD"}
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
    "books": 0.0
  },
  "api_endpoints": {
    "taxjar": "https://api.taxjar.com/v2"
  }
}'::jsonb);

-- Sample admin override for electronics discount
INSERT INTO admin_overrides (override_type, scope, scope_identifier, override_data, justification) VALUES
('tax_rate', 'category', 'electronics', '{
  "original_rate": 20,
  "override_rate": 15,
  "tax_type": "customs",
  "reason": "electronics_promotion_2025"
}'::jsonb, 'Special electronics promotion for Q1 2025');

-- ============================================================================
-- FUNCTIONS FOR AUTOMATED TRIGGERS
-- ============================================================================

-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for timestamp updates
CREATE TRIGGER update_hsn_master_updated_at BEFORE UPDATE ON hsn_master FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_admin_overrides_updated_at BEFORE UPDATE ON admin_overrides FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_unified_configuration_updated_at BEFORE UPDATE ON unified_configuration FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify table creation and sample data
DO $$
BEGIN
  RAISE NOTICE 'HSN Tax System Migration Completed Successfully!';
  RAISE NOTICE 'HSN Master records: %', (SELECT COUNT(*) FROM hsn_master);
  RAISE NOTICE 'Unified Configuration records: %', (SELECT COUNT(*) FROM unified_configuration);
  RAISE NOTICE 'Admin Override records: %', (SELECT COUNT(*) FROM admin_overrides);
  RAISE NOTICE 'Shipping Routes enhanced: %', (SELECT COUNT(*) FROM shipping_routes WHERE tax_configuration IS NOT NULL);
END $$;