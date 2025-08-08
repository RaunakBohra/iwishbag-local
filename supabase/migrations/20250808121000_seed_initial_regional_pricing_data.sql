-- =====================================================
-- Seed Initial Regional Pricing Data
-- =====================================================
-- Populates the hierarchical pricing system with realistic rates
-- Based on market research and business requirements
-- Created: 2025-08-08

-- =====================================================
-- 1. ADDON SERVICES MASTER DATA
-- =====================================================

INSERT INTO addon_services (
    service_key, service_name, service_description, service_category,
    pricing_type, default_rate, min_amount, max_amount,
    is_active, is_default_enabled, requires_order_value,
    supported_order_types, display_order, icon_name, badge_text,
    business_rules
) VALUES 
-- Package Protection Insurance
(
    'package_protection', 
    'Package Protection Insurance', 
    'Comprehensive protection against loss, damage, and theft during shipping',
    'protection',
    'percentage',
    0.025, -- 2.5% default
    2.00,  -- $2 minimum
    250.00, -- $250 maximum
    true, true, true,
    ARRAY['quote', 'order'],
    1, 'Shield', 'Popular',
    '{
        "coverage_types": ["loss", "damage", "theft"],
        "claim_process": "24-48 hours",
        "max_claim_value": 5000,
        "auto_enable_threshold": 100,
        "exclusions": ["perishables", "fragile_electronics"]
    }'
),

-- Express Processing
(
    'express_processing',
    'Express Processing',
    'Priority handling and faster processing of your order',
    'processing', 
    'fixed',
    15.00, -- $15 default
    5.00,  -- $5 minimum
    75.00, -- $75 maximum
    true, false, false,
    ARRAY['quote', 'order'],
    2, 'Zap', 'Fast',
    '{
        "processing_time_reduction": "50%",
        "priority_level": "high",
        "includes": ["priority_queue", "dedicated_handler", "express_packaging"]
    }'
),

-- Priority Support  
(
    'priority_support',
    'Priority Customer Support',
    'Dedicated support line with faster response times',
    'support',
    'fixed', 
    12.50, -- $12.50 default
    5.00,  -- $5 minimum
    50.00, -- $50 maximum
    true, false, false,
    ARRAY['quote', 'order'],
    3, 'Headphones', 'VIP',
    '{
        "response_time": "2-4 hours",
        "channels": ["phone", "email", "chat"],
        "languages": ["english", "hindi", "nepali"],
        "escalation_priority": "high"
    }'
),

-- Gift Wrapping
(
    'gift_wrapping',
    'Professional Gift Wrapping',
    'Beautiful gift wrapping with premium materials and custom message',
    'extras',
    'fixed',
    8.00, -- $8 default
    3.00, -- $3 minimum  
    25.00, -- $25 maximum
    true, false, false,
    ARRAY['quote', 'order'],
    4, 'Gift', null,
    '{
        "materials": ["premium_paper", "ribbon", "bow"],
        "custom_message": true,
        "gift_receipt": true,
        "styles": ["classic", "modern", "festive"]
    }'
),

-- Photo Documentation
(
    'photo_documentation',
    'Photo Documentation Service',
    'Professional photos of your package contents before shipping',
    'extras',
    'fixed',
    5.00, -- $5 default
    2.00, -- $2 minimum
    15.00, -- $15 maximum  
    true, false, false,
    ARRAY['quote', 'order'],
    5, 'Camera', 'Peace of Mind',
    '{
        "photo_count": "5-10 photos",
        "resolution": "high_res",
        "delivery_method": "email_link",
        "storage_duration": "90_days"
    }'
);

-- =====================================================
-- 2. CONTINENTAL PRICING DATA
-- =====================================================

-- Package Protection Insurance - Continental Rates
INSERT INTO continental_pricing (service_id, continent, rate, min_amount, max_amount, notes) 
SELECT 
    id, 'Asia', 0.020, 1.50, 200.00, 'Lower risk profile, efficient logistics'
FROM addon_services WHERE service_key = 'package_protection';

INSERT INTO continental_pricing (service_id, continent, rate, min_amount, max_amount, notes)
SELECT 
    id, 'Europe', 0.015, 3.00, 300.00, 'Premium market, excellent infrastructure'
FROM addon_services WHERE service_key = 'package_protection';

INSERT INTO continental_pricing (service_id, continent, rate, min_amount, max_amount, notes)
SELECT 
    id, 'North America', 0.015, 3.00, 400.00, 'Premium market, high order values'
FROM addon_services WHERE service_key = 'package_protection';

INSERT INTO continental_pricing (service_id, continent, rate, min_amount, max_amount, notes)
SELECT 
    id, 'Africa', 0.035, 1.00, 150.00, 'Higher risk profile, developing logistics'
FROM addon_services WHERE service_key = 'package_protection';

INSERT INTO continental_pricing (service_id, continent, rate, min_amount, max_amount, notes)
SELECT 
    id, 'South America', 0.030, 1.50, 200.00, 'Moderate risk, improving infrastructure'
FROM addon_services WHERE service_key = 'package_protection';

INSERT INTO continental_pricing (service_id, continent, rate, min_amount, max_amount, notes)
SELECT 
    id, 'Oceania', 0.020, 2.00, 250.00, 'Stable market, island logistics premium'
FROM addon_services WHERE service_key = 'package_protection';

-- Express Processing - Continental Rates  
INSERT INTO continental_pricing (service_id, continent, rate, min_amount, max_amount, notes)
SELECT 
    id, 'Asia', 10.00, 5.00, 50.00, 'Cost-efficient operations'
FROM addon_services WHERE service_key = 'express_processing';

INSERT INTO continental_pricing (service_id, continent, rate, min_amount, max_amount, notes)
SELECT 
    id, 'Europe', 25.00, 10.00, 75.00, 'Premium service expectations'
FROM addon_services WHERE service_key = 'express_processing';

INSERT INTO continental_pricing (service_id, continent, rate, min_amount, max_amount, notes)
SELECT 
    id, 'North America', 30.00, 12.00, 85.00, 'High labor costs, premium market'
FROM addon_services WHERE service_key = 'express_processing';

INSERT INTO continental_pricing (service_id, continent, rate, min_amount, max_amount, notes)
SELECT 
    id, 'Africa', 20.00, 8.00, 60.00, 'Infrastructure challenges'
FROM addon_services WHERE service_key = 'express_processing';

INSERT INTO continental_pricing (service_id, continent, rate, min_amount, max_amount, notes)
SELECT 
    id, 'South America', 18.00, 7.00, 55.00, 'Moderate operational costs'
FROM addon_services WHERE service_key = 'express_processing';

INSERT INTO continental_pricing (service_id, continent, rate, min_amount, max_amount, notes)
SELECT 
    id, 'Oceania', 22.00, 9.00, 65.00, 'Remote location premium'
FROM addon_services WHERE service_key = 'express_processing';

-- Priority Support - Continental Rates
INSERT INTO continental_pricing (service_id, continent, rate, min_amount, max_amount, notes)
SELECT 
    id, 'Asia', 8.00, 3.00, 35.00, 'Regional support centers'
FROM addon_services WHERE service_key = 'priority_support';

INSERT INTO continental_pricing (service_id, continent, rate, min_amount, max_amount, notes)
SELECT 
    id, 'Europe', 18.00, 8.00, 50.00, 'Multilingual support premium'
FROM addon_services WHERE service_key = 'priority_support';

INSERT INTO continental_pricing (service_id, continent, rate, min_amount, max_amount, notes)
SELECT 
    id, 'North America', 20.00, 10.00, 60.00, 'Premium support standards'
FROM addon_services WHERE service_key = 'priority_support';

-- Gift Wrapping - Continental Rates (smaller variations)
INSERT INTO continental_pricing (service_id, continent, rate, min_amount, max_amount, notes)
SELECT 
    id, 'Asia', 6.00, 2.50, 20.00, 'Cost-efficient materials'
FROM addon_services WHERE service_key = 'gift_wrapping';

INSERT INTO continental_pricing (service_id, continent, rate, min_amount, max_amount, notes)
SELECT 
    id, 'Europe', 12.00, 5.00, 30.00, 'Premium materials and craftsmanship'
FROM addon_services WHERE service_key = 'gift_wrapping';

INSERT INTO continental_pricing (service_id, continent, rate, min_amount, max_amount, notes)
SELECT 
    id, 'North America', 15.00, 6.00, 35.00, 'Premium presentation standards'
FROM addon_services WHERE service_key = 'gift_wrapping';

-- Photo Documentation - Continental Rates
INSERT INTO continental_pricing (service_id, continent, rate, min_amount, max_amount, notes)
SELECT 
    id, 'Asia', 3.50, 1.50, 12.00, 'Standard documentation'
FROM addon_services WHERE service_key = 'photo_documentation';

INSERT INTO continental_pricing (service_id, continent, rate, min_amount, max_amount, notes)
SELECT 
    id, 'Europe', 7.00, 3.00, 18.00, 'High-resolution professional photos'
FROM addon_services WHERE service_key = 'photo_documentation';

INSERT INTO continental_pricing (service_id, continent, rate, min_amount, max_amount, notes)
SELECT 
    id, 'North America', 8.50, 4.00, 20.00, 'Professional studio documentation'
FROM addon_services WHERE service_key = 'photo_documentation';

-- =====================================================
-- 3. REGIONAL PRICING DATA
-- =====================================================

-- South Asia Region (Lower rates, high volume)
INSERT INTO regional_pricing (service_id, region_key, region_name, country_codes, rate, min_amount, max_amount, priority, notes)
SELECT 
    id, 'south_asia', 'South Asia', 
    ARRAY['IN', 'PK', 'BD', 'LK', 'NP', 'BT', 'MV', 'AF'],
    0.018, 1.00, 180.00, 150, 
    'High volume, price-sensitive market'
FROM addon_services WHERE service_key = 'package_protection';

-- Southeast Asia Region  
INSERT INTO regional_pricing (service_id, region_key, region_name, country_codes, rate, min_amount, max_amount, priority, notes)
SELECT 
    id, 'southeast_asia', 'Southeast Asia',
    ARRAY['TH', 'VN', 'ID', 'MY', 'SG', 'PH', 'MM', 'KH', 'LA', 'BN'],
    0.022, 1.50, 220.00, 140,
    'Growing market with improving infrastructure'
FROM addon_services WHERE service_key = 'package_protection';

-- East Asia Region (Premium market)
INSERT INTO regional_pricing (service_id, region_key, region_name, country_codes, rate, min_amount, max_amount, priority, notes)
SELECT 
    id, 'east_asia', 'East Asia',
    ARRAY['JP', 'KR', 'CN', 'TW', 'HK', 'MO'],
    0.012, 4.00, 350.00, 160,
    'Premium market, high-value orders'
FROM addon_services WHERE service_key = 'package_protection';

-- Western Europe Region
INSERT INTO regional_pricing (service_id, region_key, region_name, country_codes, rate, min_amount, max_amount, priority, notes)
SELECT 
    id, 'western_europe', 'Western Europe',
    ARRAY['DE', 'FR', 'GB', 'IT', 'ES', 'NL', 'BE', 'CH', 'AT', 'IE'],
    0.012, 3.50, 320.00, 160,
    'Premium market, excellent infrastructure'
FROM addon_services WHERE service_key = 'package_protection';

-- Express Processing Regional Rates
INSERT INTO regional_pricing (service_id, region_key, region_name, country_codes, rate, min_amount, max_amount, priority, notes)
SELECT 
    id, 'south_asia', 'South Asia',
    ARRAY['IN', 'PK', 'BD', 'LK', 'NP', 'BT', 'MV', 'AF'],
    8.00, 3.00, 40.00, 150,
    'Cost-efficient processing centers'
FROM addon_services WHERE service_key = 'express_processing';

INSERT INTO regional_pricing (service_id, region_key, region_name, country_codes, rate, min_amount, max_amount, priority, notes)
SELECT 
    id, 'east_asia', 'East Asia',
    ARRAY['JP', 'KR', 'CN', 'TW', 'HK', 'MO'],
    12.00, 6.00, 55.00, 160,
    'Advanced logistics infrastructure'
FROM addon_services WHERE service_key = 'express_processing';

-- =====================================================
-- 4. COUNTRY-SPECIFIC OVERRIDES
-- =====================================================

-- United States - Premium pricing
INSERT INTO country_pricing_overrides (service_id, country_code, rate, min_amount, max_amount, reason, notes)
SELECT 
    id, 'US', 0.012, 5.00, 500.00, 
    'Premium market with high order values and excellent infrastructure',
    'Largest market segment, premium service expectations'
FROM addon_services WHERE service_key = 'package_protection';

-- United Kingdom - Brexit logistics premium
INSERT INTO country_pricing_overrides (service_id, country_code, rate, min_amount, max_amount, reason, notes)
SELECT 
    id, 'GB', 0.014, 4.00, 350.00,
    'Post-Brexit logistics complexity requires premium handling',
    'Special handling for customs and regulations'
FROM addon_services WHERE service_key = 'package_protection';

-- India - Volume discount
INSERT INTO country_pricing_overrides (service_id, country_code, rate, min_amount, max_amount, reason, notes)
SELECT 
    id, 'IN', 0.015, 0.75, 150.00,
    'Largest volume market, competitive pricing strategy',
    'Home market advantage, local processing'
FROM addon_services WHERE service_key = 'package_protection';

-- Nepal - Strategic market  
INSERT INTO country_pricing_overrides (service_id, country_code, rate, min_amount, max_amount, reason, notes)
SELECT 
    id, 'NP', 0.016, 0.50, 120.00,
    'Key strategic market, competitive entry pricing',
    'Growing market with strong potential'
FROM addon_services WHERE service_key = 'package_protection';

-- Japan - Premium service expectations
INSERT INTO country_pricing_overrides (service_id, country_code, rate, min_amount, max_amount, reason, notes)
SELECT 
    id, 'JP', 0.010, 6.00, 400.00,
    'Ultra-premium market with highest service standards',
    'Premium positioning, excellent service delivery'
FROM addon_services WHERE service_key = 'package_protection';

-- Singapore - Hub operations
INSERT INTO country_pricing_overrides (service_id, country_code, rate, min_amount, max_amount, reason, notes)
SELECT 
    id, 'SG', 0.018, 3.00, 280.00,
    'Regional logistics hub, operational efficiencies',
    'Hub location advantage for regional operations'
FROM addon_services WHERE service_key = 'package_protection';

-- Express Processing Country Overrides
INSERT INTO country_pricing_overrides (service_id, country_code, rate, min_amount, max_amount, reason, notes)
SELECT 
    id, 'IN', 6.00, 2.50, 35.00,
    'Home market operational efficiency',
    'Local processing centers, cost advantage'
FROM addon_services WHERE service_key = 'express_processing';

INSERT INTO country_pricing_overrides (service_id, country_code, rate, min_amount, max_amount, reason, notes)
SELECT 
    id, 'US', 35.00, 15.00, 95.00,
    'Premium market with high labor costs',
    'Premium service standards, high operational costs'
FROM addon_services WHERE service_key = 'express_processing';

INSERT INTO country_pricing_overrides (service_id, country_code, rate, min_amount, max_amount, reason, notes)
SELECT 
    id, 'JP', 28.00, 12.00, 80.00,
    'Highly efficient but premium market',
    'Advanced logistics, premium service expectations'
FROM addon_services WHERE service_key = 'express_processing';

-- =====================================================
-- 5. DATA VALIDATION AND SUMMARY
-- =====================================================

-- Verify data integrity
DO $$
DECLARE
    service_count INTEGER;
    continental_count INTEGER;
    regional_count INTEGER;
    country_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO service_count FROM addon_services;
    SELECT COUNT(*) INTO continental_count FROM continental_pricing;
    SELECT COUNT(*) INTO regional_count FROM regional_pricing;
    SELECT COUNT(*) INTO country_count FROM country_pricing_overrides;
    
    RAISE NOTICE 'Regional Pricing Data Summary:';
    RAISE NOTICE '- Addon Services: %', service_count;
    RAISE NOTICE '- Continental Pricing Rules: %', continental_count;
    RAISE NOTICE '- Regional Pricing Rules: %', regional_count;
    RAISE NOTICE '- Country Override Rules: %', country_count;
    
    IF service_count < 5 THEN
        RAISE EXCEPTION 'Expected at least 5 addon services, got %', service_count;
    END IF;
END $$;

-- Create summary view for admin reference
CREATE OR REPLACE VIEW pricing_summary_admin AS
SELECT 
    s.service_key,
    s.service_name,
    s.default_rate,
    
    -- Count of pricing rules
    COUNT(DISTINCT cp.continent) as continental_rules,
    COUNT(DISTINCT rp.region_key) as regional_rules,
    COUNT(DISTINCT co.country_code) as country_overrides,
    
    -- Rate ranges
    MIN(COALESCE(co.rate, rp.rate, cp.rate)) as min_rate,
    MAX(COALESCE(co.rate, rp.rate, cp.rate)) as max_rate,
    
    s.is_active,
    s.created_at
FROM addon_services s
LEFT JOIN continental_pricing cp ON s.id = cp.service_id AND cp.is_active = true
LEFT JOIN regional_pricing rp ON s.id = rp.service_id AND rp.is_active = true  
LEFT JOIN country_pricing_overrides co ON s.id = co.service_id AND co.is_active = true
WHERE s.is_active = true
GROUP BY s.id, s.service_key, s.service_name, s.default_rate, s.is_active, s.created_at
ORDER BY s.display_order;

-- Add helpful comments
COMMENT ON TABLE addon_services IS 'Master table for add-on services - 5 core services: package protection, express processing, priority support, gift wrapping, photo documentation';
COMMENT ON TABLE continental_pricing IS 'Continental-level pricing for 6 continents with market-based rates';
COMMENT ON TABLE regional_pricing IS 'Custom regional groupings for more granular pricing control (South Asia, East Asia, etc.)';
COMMENT ON TABLE country_pricing_overrides IS 'Country-specific pricing overrides for strategic markets (US, IN, JP, etc.)';

-- =====================================================
-- SEED DATA COMPLETE
-- =====================================================