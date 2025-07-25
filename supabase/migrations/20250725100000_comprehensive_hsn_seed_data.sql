-- ============================================================================
-- COMPREHENSIVE HSN SEED DATA
-- Adds extensive real-world HSN codes for common e-commerce categories
-- Date: 2025-07-25
-- ============================================================================

-- Add comprehensive HSN codes for major e-commerce categories
INSERT INTO hsn_master (hsn_code, description, category, subcategory, keywords, minimum_valuation_usd, requires_currency_conversion, weight_data, tax_data, classification_data) VALUES

-- BEAUTY & PERSONAL CARE
('3304', 'Beauty and makeup products', 'beauty', 'cosmetics',
 ARRAY['makeup', 'lipstick', 'foundation', 'eyeshadow', 'mascara', 'concealer', 'blush'],
 15.00, true,
 '{"typical_weights": {"per_unit": {"min": 0.010, "max": 0.100, "average": 0.040}}, "packaging": {"additional_weight": 0.02}}'::jsonb,
 '{"typical_rates": {"customs": {"min": 15, "max": 25, "common": 20}, "gst": {"standard": 18}, "vat": {"common": 13}}}'::jsonb,
 '{"auto_classification": {"keywords": ["makeup", "lipstick", "foundation", "cosmetics"], "confidence": 0.90}}'::jsonb),

('3303', 'Perfumes and fragrances', 'beauty', 'fragrances',
 ARRAY['perfume', 'cologne', 'fragrance', 'eau de toilette', 'eau de parfum', 'body spray'],
 25.00, true,
 '{"typical_weights": {"per_unit": {"min": 0.050, "max": 0.200, "average": 0.100}}, "packaging": {"additional_weight": 0.03}}'::jsonb,
 '{"typical_rates": {"customs": {"min": 20, "max": 30, "common": 25}, "gst": {"standard": 18}, "vat": {"common": 13}}}'::jsonb,
 '{"auto_classification": {"keywords": ["perfume", "cologne", "fragrance", "eau de"], "confidence": 0.95}}'::jsonb),

('3401', 'Skincare and personal care products', 'beauty', 'skincare',
 ARRAY['skincare', 'moisturizer', 'cleanser', 'serum', 'sunscreen', 'face wash', 'toner'],
 10.00, true,
 '{"typical_weights": {"per_unit": {"min": 0.030, "max": 0.300, "average": 0.120}}, "packaging": {"additional_weight": 0.02}}'::jsonb,
 '{"typical_rates": {"customs": {"min": 10, "max": 20, "common": 15}, "gst": {"standard": 18}, "vat": {"common": 13}}}'::jsonb,
 '{"auto_classification": {"keywords": ["skincare", "moisturizer", "cleanser", "serum"], "confidence": 0.88}}'::jsonb),

-- SPORTS & FITNESS
('9506', 'Sports equipment and gear', 'sports', 'equipment',
 ARRAY['sports', 'fitness', 'gym', 'exercise', 'weights', 'dumbbells', 'yoga mat'],
 20.00, true,
 '{"typical_weights": {"per_unit": {"min": 0.200, "max": 10.000, "average": 2.000}}, "packaging": {"additional_weight": 0.10}}'::jsonb,
 '{"typical_rates": {"customs": {"min": 12, "max": 18, "common": 15}, "gst": {"standard": 18}, "vat": {"common": 13}}}'::jsonb,
 '{"auto_classification": {"keywords": ["sports", "fitness", "gym", "exercise"], "confidence": 0.85}}'::jsonb),

('6112', 'Athletic and sportswear', 'sports', 'athletic_wear',
 ARRAY['sportswear', 'athletic', 'tracksuit', 'sports bra', 'leggings', 'gym wear'],
 12.00, true,
 '{"typical_weights": {"per_unit": {"min": 0.100, "max": 0.500, "average": 0.250}}, "packaging": {"additional_weight": 0.03}}'::jsonb,
 '{"typical_rates": {"customs": {"min": 12, "max": 16, "common": 14}, "gst": {"standard": 12}, "vat": {"common": 13}}}'::jsonb,
 '{"auto_classification": {"keywords": ["sportswear", "athletic", "tracksuit", "gym wear"], "confidence": 0.85}}'::jsonb),

-- FOOTWEAR
('6403', 'Leather footwear', 'footwear', 'shoes',
 ARRAY['shoes', 'boots', 'leather shoes', 'dress shoes', 'formal shoes', 'heels'],
 25.00, true,
 '{"typical_weights": {"per_unit": {"min": 0.300, "max": 1.500, "average": 0.800}}, "packaging": {"additional_weight": 0.05}}'::jsonb,
 '{"typical_rates": {"customs": {"min": 15, "max": 25, "common": 20}, "gst": {"standard": 18}, "vat": {"common": 13}}}'::jsonb,
 '{"auto_classification": {"keywords": ["shoes", "boots", "footwear", "heels"], "confidence": 0.90}}'::jsonb),

('6404', 'Rubber and plastic footwear', 'footwear', 'casual_shoes',
 ARRAY['sneakers', 'running shoes', 'sports shoes', 'casual shoes', 'sandals', 'flip flops'],
 20.00, true,
 '{"typical_weights": {"per_unit": {"min": 0.200, "max": 1.000, "average": 0.600}}, "packaging": {"additional_weight": 0.05}}'::jsonb,
 '{"typical_rates": {"customs": {"min": 15, "max": 20, "common": 18}, "gst": {"standard": 18}, "vat": {"common": 13}}}'::jsonb,
 '{"auto_classification": {"keywords": ["sneakers", "running shoes", "sports shoes", "sandals"], "confidence": 0.90}}'::jsonb),

-- BABY & KIDS
('9503', 'Toys and games', 'baby_kids', 'toys',
 ARRAY['toys', 'games', 'puzzle', 'doll', 'action figure', 'board game', 'lego'],
 8.00, true,
 '{"typical_weights": {"per_unit": {"min": 0.050, "max": 2.000, "average": 0.300}}, "packaging": {"additional_weight": 0.05}}'::jsonb,
 '{"typical_rates": {"customs": {"min": 10, "max": 15, "common": 12}, "gst": {"standard": 12}, "vat": {"common": 13}}}'::jsonb,
 '{"auto_classification": {"keywords": ["toys", "games", "puzzle", "doll"], "confidence": 0.90}}'::jsonb),

('3924', 'Baby care products', 'baby_kids', 'baby_care',
 ARRAY['baby', 'diaper', 'bottle', 'pacifier', 'baby care', 'feeding', 'stroller'],
 10.00, true,
 '{"typical_weights": {"per_unit": {"min": 0.050, "max": 5.000, "average": 0.500}}, "packaging": {"additional_weight": 0.05}}'::jsonb,
 '{"typical_rates": {"customs": {"min": 10, "max": 15, "common": 12}, "gst": {"standard": 12}, "vat": {"common": 13}}}'::jsonb,
 '{"auto_classification": {"keywords": ["baby", "diaper", "bottle", "pacifier"], "confidence": 0.95}}'::jsonb),

-- BAGS & LUGGAGE
('4202', 'Bags and luggage', 'bags', 'luggage',
 ARRAY['bag', 'backpack', 'handbag', 'suitcase', 'luggage', 'purse', 'wallet'],
 15.00, true,
 '{"typical_weights": {"per_unit": {"min": 0.200, "max": 3.000, "average": 1.000}}, "packaging": {"additional_weight": 0.05}}'::jsonb,
 '{"typical_rates": {"customs": {"min": 15, "max": 20, "common": 18}, "gst": {"standard": 18}, "vat": {"common": 13}}}'::jsonb,
 '{"auto_classification": {"keywords": ["bag", "backpack", "handbag", "suitcase"], "confidence": 0.90}}'::jsonb),

-- TOOLS & HARDWARE
('8205', 'Hand tools and hardware', 'tools', 'hand_tools',
 ARRAY['tools', 'hammer', 'screwdriver', 'wrench', 'pliers', 'hardware', 'drill'],
 15.00, true,
 '{"typical_weights": {"per_unit": {"min": 0.100, "max": 2.000, "average": 0.500}}, "packaging": {"additional_weight": 0.05}}'::jsonb,
 '{"typical_rates": {"customs": {"min": 10, "max": 15, "common": 12}, "gst": {"standard": 18}, "vat": {"common": 13}}}'::jsonb,
 '{"auto_classification": {"keywords": ["tools", "hammer", "screwdriver", "wrench"], "confidence": 0.90}}'::jsonb),

-- AUTOMOTIVE
('8708', 'Auto parts and accessories', 'automotive', 'parts',
 ARRAY['auto', 'car', 'automotive', 'parts', 'accessories', 'car parts', 'vehicle'],
 20.00, true,
 '{"typical_weights": {"per_unit": {"min": 0.100, "max": 10.000, "average": 1.500}}, "packaging": {"additional_weight": 0.10}}'::jsonb,
 '{"typical_rates": {"customs": {"min": 12, "max": 18, "common": 15}, "gst": {"standard": 18}, "vat": {"common": 13}}}'::jsonb,
 '{"auto_classification": {"keywords": ["auto", "car", "automotive", "parts"], "confidence": 0.85}}'::jsonb),

-- MUSICAL INSTRUMENTS
('9207', 'Musical instruments', 'music', 'instruments',
 ARRAY['music', 'guitar', 'piano', 'keyboard', 'violin', 'drums', 'instrument'],
 50.00, true,
 '{"typical_weights": {"per_unit": {"min": 0.500, "max": 20.000, "average": 3.000}}, "packaging": {"additional_weight": 0.20}}'::jsonb,
 '{"typical_rates": {"customs": {"min": 10, "max": 15, "common": 12}, "gst": {"standard": 18}, "vat": {"common": 13}}}'::jsonb,
 '{"auto_classification": {"keywords": ["music", "guitar", "piano", "keyboard"], "confidence": 0.95}}'::jsonb),

-- HEALTH & WELLNESS
('2106', 'Health supplements', 'health', 'supplements',
 ARRAY['supplements', 'vitamins', 'protein', 'health', 'nutrition', 'whey', 'creatine'],
 15.00, true,
 '{"typical_weights": {"per_unit": {"min": 0.100, "max": 2.000, "average": 0.500}}, "packaging": {"additional_weight": 0.05}}'::jsonb,
 '{"typical_rates": {"customs": {"min": 10, "max": 20, "common": 15}, "gst": {"standard": 12}, "vat": {"common": 13}}}'::jsonb,
 '{"auto_classification": {"keywords": ["supplements", "vitamins", "protein", "health"], "confidence": 0.88}}'::jsonb),

-- FOOD & BEVERAGES
('2101', 'Coffee and tea products', 'food', 'beverages',
 ARRAY['coffee', 'tea', 'beverage', 'instant coffee', 'green tea', 'black tea'],
 8.00, true,
 '{"typical_weights": {"per_unit": {"min": 0.100, "max": 1.000, "average": 0.300}}, "packaging": {"additional_weight": 0.03}}'::jsonb,
 '{"typical_rates": {"customs": {"min": 5, "max": 15, "common": 10}, "gst": {"standard": 12}, "vat": {"common": 13}}}'::jsonb,
 '{"auto_classification": {"keywords": ["coffee", "tea", "beverage", "instant"], "confidence": 0.90}}'::jsonb),

-- WATCH & ACCESSORIES
('9102', 'Watches and timepieces', 'accessories', 'watches',
 ARRAY['watch', 'timepiece', 'smartwatch', 'fitness tracker', 'clock', 'wristwatch'],
 30.00, true,
 '{"typical_weights": {"per_unit": {"min": 0.050, "max": 0.300, "average": 0.150}}, "packaging": {"additional_weight": 0.02}}'::jsonb,
 '{"typical_rates": {"customs": {"min": 15, "max": 25, "common": 20}, "gst": {"standard": 18}, "vat": {"common": 13}}}'::jsonb,
 '{"auto_classification": {"keywords": ["watch", "smartwatch", "fitness tracker", "timepiece"], "confidence": 0.95}}'::jsonb)

ON CONFLICT (hsn_code) DO NOTHING;

-- Update unified_configuration to include new categories in customs rates
UPDATE unified_configuration 
SET config_data = config_data || '{
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
  }
}'::jsonb
WHERE config_type = 'country' AND config_key = 'IN';

UPDATE unified_configuration 
SET config_data = config_data || '{
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
  }
}'::jsonb
WHERE config_type = 'country' AND config_key = 'NP';

UPDATE unified_configuration 
SET config_data = config_data || '{
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
  }
}'::jsonb
WHERE config_type = 'country' AND config_key = 'CN';

-- Verification
DO $$
DECLARE
    total_hsn_count INTEGER;
    new_categories_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_hsn_count FROM hsn_master;
    SELECT COUNT(DISTINCT category) INTO new_categories_count FROM hsn_master;
    
    RAISE NOTICE '==================================================';
    RAISE NOTICE 'COMPREHENSIVE HSN SEED DATA MIGRATION COMPLETED!';
    RAISE NOTICE '==================================================';
    RAISE NOTICE 'Total HSN codes: %', total_hsn_count;
    RAISE NOTICE 'Product categories: %', new_categories_count;
    RAISE NOTICE 'Coverage: Electronics, Clothing, Beauty, Sports, Footwear, Baby/Kids, Bags, Tools, Auto, Music, Health, Food';
    RAISE NOTICE 'Ready for real-world e-commerce product classification!';
END $$;