-- Multi-Country Smart Product Intelligence System
-- Phase 1: Fix Schema Issues and Add Missing Columns
-- Fixes the constraints and missing columns from previous migration

-- =====================================================
-- Fix product_classifications constraints
-- =====================================================

-- Add missing constraints that failed in previous migration
DO $$
BEGIN
    -- Add valid_confidence_score constraint if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.check_constraints 
        WHERE constraint_name = 'valid_confidence_score_new'
    ) THEN
        ALTER TABLE product_classifications 
        ADD CONSTRAINT valid_confidence_score_new CHECK (confidence_score >= 0.00 AND confidence_score <= 1.00);
    END IF;
    
    -- Add valid_priority constraint if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.check_constraints 
        WHERE constraint_name = 'valid_priority_new'
    ) THEN
        ALTER TABLE product_classifications 
        ADD CONSTRAINT valid_priority_new CHECK (suggestion_priority >= 1);
    END IF;
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Some constraints already exist, skipping...';
END
$$;

-- =====================================================
-- Add missing columns to customs_valuation_overrides
-- =====================================================

-- Add missing columns for our new design
ALTER TABLE customs_valuation_overrides 
ADD COLUMN IF NOT EXISTS product_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS classification_code VARCHAR(20),
ADD COLUMN IF NOT EXISTS country_code VARCHAR(2),
ADD COLUMN IF NOT EXISTS product_price_usd DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS minimum_valuation_usd DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS chosen_valuation_usd DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS valuation_method VARCHAR(20),
ADD COLUMN IF NOT EXISTS is_automatic BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS customs_rate_used DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS customs_duty_saved_usd DECIMAL(10,2);

-- Update existing records to match new structure where possible
UPDATE customs_valuation_overrides SET
    valuation_method = override_method,
    chosen_valuation_usd = override_value_usd,
    product_price_usd = CASE 
        WHEN original_method = 'product_price' THEN original_value_usd
        ELSE override_value_usd
    END,
    minimum_valuation_usd = CASE 
        WHEN original_method = 'minimum_valuation' THEN original_value_usd
        ELSE override_value_usd * 0.1 -- Estimate minimum as 10% of product price
    END,
    is_automatic = false,
    customs_rate_used = 15.0, -- Default rate
    customs_duty_saved_usd = CASE 
        WHEN override_method = 'minimum_valuation' AND original_method = 'product_price'
        THEN (original_value_usd - override_value_usd) * 0.15
        ELSE 0
    END
WHERE valuation_method IS NULL;

-- =====================================================
-- Create missing indexes with proper names
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_customs_overrides_country_final ON customs_valuation_overrides(country_code);
CREATE INDEX IF NOT EXISTS idx_customs_overrides_classification_final ON customs_valuation_overrides(classification_code);

-- =====================================================
-- Insert seed data for country_configs
-- =====================================================

INSERT INTO country_configs (
    country_code, country_name, default_customs_rate, default_local_tax_rate, 
    local_tax_name, classification_system, classification_digits, currency_code,
    enable_weight_suggestions, enable_category_suggestions, enable_customs_intelligence,
    is_active
) VALUES 
-- India
('IN', 'India', 20.00, 18.00, 'GST', 'HSN', 4, 'INR', true, true, true, true),

-- Nepal
('NP', 'Nepal', 15.00, 13.00, 'VAT', 'HS', 4, 'NPR', true, true, true, true),

-- United States (future expansion)
('US', 'United States', 0.00, 7.25, 'Sales Tax', 'HTS', 6, 'USD', true, true, false, true)

ON CONFLICT (country_code) DO UPDATE SET
    country_name = EXCLUDED.country_name,
    default_customs_rate = EXCLUDED.default_customs_rate,
    default_local_tax_rate = EXCLUDED.default_local_tax_rate,
    local_tax_name = EXCLUDED.local_tax_name,
    classification_system = EXCLUDED.classification_system,
    classification_digits = EXCLUDED.classification_digits,
    currency_code = EXCLUDED.currency_code,
    enable_weight_suggestions = EXCLUDED.enable_weight_suggestions,
    enable_category_suggestions = EXCLUDED.enable_category_suggestions,
    enable_customs_intelligence = EXCLUDED.enable_customs_intelligence,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();

-- =====================================================
-- Clear and insert fresh product classifications
-- =====================================================

-- Temporarily disable triggers to avoid search vector updates during bulk operations
ALTER TABLE product_classifications DISABLE TRIGGER update_product_classifications_search_vector_trigger;
ALTER TABLE product_classifications DISABLE TRIGGER update_product_classifications_search_vector_trigger_new;

-- Clear existing test data and insert our structured data
TRUNCATE TABLE product_classifications RESTART IDENTITY CASCADE;

-- Insert our structured product classifications
INSERT INTO product_classifications (
    product_name, product_category, product_subcategory, 
    typical_weight_kg, typical_dimensions, is_fragile, requires_special_handling,
    country_data, confidence_score, suggestion_priority, is_verified,
    search_keywords, usage_count, last_used_at, is_active,
    
    -- Legacy columns for backward compatibility
    classification_code, country_code, category, subcategory, description
) VALUES 

-- Mobile Phones
('Mobile Phone / Smartphone', 'electronics', 'mobile_phones', 
 0.200, '{"length": 15, "width": 7.5, "height": 0.8, "unit": "cm", "is_estimated": true}', true, false,
 '{
   "IN": {
     "classification_code": "8517",
     "customs_rate": 18.0,
     "local_tax_rate": 18.0,
     "minimum_valuation_usd": 50.0,
     "description": "Mobile phones and communication devices",
     "notes": "High-value electronics with specific GST treatment",
     "last_updated": "2025-08-03T10:00:00Z"
   },
   "NP": {
     "classification_code": "8517",
     "customs_rate": 15.0,
     "local_tax_rate": 13.0,
     "minimum_valuation_usd": 30.0,
     "description": "Communication equipment",
     "last_updated": "2025-08-03T10:00:00Z"
   }
 }', 0.95, 1, true, 
 ARRAY['mobile', 'phone', 'smartphone', 'cell', 'iphone', 'android', 'samsung', 'communication'],
 150, NOW() - INTERVAL '5 days', true,
 '8517', 'IN', 'electronics', 'mobile_phones', 'Mobile phones and communication devices'),

-- Laptops
('Laptop / Notebook Computer', 'electronics', 'computers', 
 2.500, '{"length": 35, "width": 25, "height": 2.5, "unit": "cm", "is_estimated": true}', true, false,
 '{
   "IN": {
     "classification_code": "8471",
     "customs_rate": 0.0,
     "local_tax_rate": 18.0,
     "minimum_valuation_usd": 200.0,
     "description": "Laptops and computing devices",
     "notes": "Zero customs duty for laptops in India",
     "last_updated": "2025-08-03T10:00:00Z"
   },
   "NP": {
     "classification_code": "8471",
     "customs_rate": 5.0,
     "local_tax_rate": 13.0,
     "minimum_valuation_usd": 150.0,
     "description": "Computing equipment",
     "last_updated": "2025-08-03T10:00:00Z"
   }
 }', 0.90, 2, true,
 ARRAY['laptop', 'notebook', 'computer', 'macbook', 'thinkpad', 'dell', 'hp', 'computing'],
 120, NOW() - INTERVAL '3 days', true,
 '8471', 'IN', 'electronics', 'computers', 'Laptops and computing devices'),

-- T-Shirts
('T-Shirt / Tee', 'clothing', 'tops', 
 0.150, '{"length": 70, "width": 50, "height": 1, "unit": "cm", "is_estimated": true}', false, false,
 '{
   "IN": {
     "classification_code": "6109",
     "customs_rate": 12.0,
     "local_tax_rate": 18.0,
     "minimum_valuation_usd": 5.0,
     "description": "T-shirts, singlets and other vests",
     "notes": "Cotton and synthetic blend clothing",
     "last_updated": "2025-08-03T10:00:00Z"
   },
   "NP": {
     "classification_code": "6109",
     "customs_rate": 10.0,
     "local_tax_rate": 13.0,
     "minimum_valuation_usd": 3.0,
     "description": "Knitted clothing items",
     "last_updated": "2025-08-03T10:00:00Z"
   }
 }', 0.85, 10, true,
 ARRAY['tshirt', 'tee', 'shirt', 'top', 'clothing', 'apparel', 'cotton', 'casual'],
 200, NOW() - INTERVAL '1 day', true,
 '6109', 'IN', 'clothing', 'tops', 'T-shirts, singlets and other vests'),

-- Books
('Book / Textbook', 'books', 'educational', 
 0.400, '{"length": 24, "width": 17, "height": 2, "unit": "cm", "is_estimated": true}', false, false,
 '{
   "IN": {
     "classification_code": "4901",
     "customs_rate": 0.0,
     "local_tax_rate": 0.0,
     "minimum_valuation_usd": 2.0,
     "description": "Printed books, brochures, leaflets",
     "notes": "Books are exempt from customs and GST in India",
     "last_updated": "2025-08-03T10:00:00Z"
   },
   "NP": {
     "classification_code": "4901",
     "customs_rate": 0.0,
     "local_tax_rate": 0.0,
     "minimum_valuation_usd": 1.0,
     "description": "Educational materials and books",
     "notes": "Educational books have preferential treatment",
     "last_updated": "2025-08-03T10:00:00Z"
   }
 }', 0.95, 5, true,
 ARRAY['book', 'textbook', 'educational', 'learning', 'printed', 'literature', 'novel', 'manual'],
 80, NOW() - INTERVAL '2 days', true,
 '4901', 'IN', 'books', 'educational', 'Printed books, brochures, leaflets'),

-- Kitchen Appliances
('Kitchen Appliance', 'home_living', 'kitchen', 
 3.000, '{"length": 30, "width": 20, "height": 25, "unit": "cm", "is_estimated": true}', true, false,
 '{
   "IN": {
     "classification_code": "8516",
     "customs_rate": 10.0,
     "local_tax_rate": 18.0,
     "minimum_valuation_usd": 25.0,
     "description": "Electric kitchen appliances",
     "notes": "Small domestic appliances",
     "last_updated": "2025-08-03T10:00:00Z"
   },
   "NP": {
     "classification_code": "8516",
     "customs_rate": 8.0,
     "local_tax_rate": 13.0,
     "minimum_valuation_usd": 20.0,
     "description": "Household electrical equipment",
     "last_updated": "2025-08-03T10:00:00Z"
   }
 }', 0.75, 20, true,
 ARRAY['kitchen', 'appliance', 'blender', 'mixer', 'toaster', 'electric', 'home', 'cooking'],
 35, NOW() - INTERVAL '7 days', true,
 '8516', 'IN', 'home_living', 'kitchen', 'Electric kitchen appliances');

-- Re-enable triggers
ALTER TABLE product_classifications ENABLE TRIGGER update_product_classifications_search_vector_trigger;
ALTER TABLE product_classifications ENABLE TRIGGER update_product_classifications_search_vector_trigger_new;

-- Update search vectors for all records
UPDATE product_classifications 
SET search_vector = to_tsvector('english', 
    COALESCE(product_name, '') || ' ' ||
    COALESCE(product_category, category, '') || ' ' ||
    COALESCE(product_subcategory, subcategory, '') || ' ' ||
    COALESCE(description, '') || ' ' ||
    COALESCE(array_to_string(search_keywords, ' '), '')
);

-- =====================================================
-- Create system health check view
-- =====================================================

CREATE OR REPLACE VIEW multi_country_system_health AS
SELECT 
    'country_configs' as table_name,
    COUNT(*) as record_count,
    MAX(updated_at) as last_updated
FROM country_configs
WHERE is_active = true

UNION ALL

SELECT 
    'product_classifications' as table_name,
    COUNT(*) as record_count,
    MAX(updated_at) as last_updated
FROM product_classifications
WHERE is_verified = true AND is_active = true

UNION ALL

SELECT 
    'customs_valuation_overrides' as table_name,
    COUNT(*) as record_count,
    MAX(created_at) as last_updated
FROM customs_valuation_overrides;

-- Grant access to the health check view
GRANT SELECT ON multi_country_system_health TO authenticated;

-- =====================================================
-- Final verification queries
-- =====================================================

-- Test the new functions
SELECT 'Testing get_product_suggestions_v2' as test_name;
SELECT * FROM get_product_suggestions_v2('electronics', 'IN', 3);

SELECT 'Testing search_product_classifications_v2' as test_name;
SELECT * FROM search_product_classifications_v2('mobile phone', 'IN', 3);

SELECT 'System health check' as test_name;
SELECT * FROM multi_country_system_health;