-- Add more comprehensive HSN codes with 6-8 digit format
-- This migration adds additional HSN codes across various categories

-- First, update existing 4-digit HSN codes to 6-digit format
UPDATE hsn_master 
SET hsn_code = CASE 
  WHEN hsn_code = '6204' THEN '620442'
  WHEN hsn_code = '8517' THEN '851762'
  WHEN hsn_code = '3304' THEN '330410'
  WHEN hsn_code = '6403' THEN '640340'
  WHEN hsn_code = '9403' THEN '940360'
  WHEN hsn_code = '8544' THEN '854442'
  WHEN hsn_code = '9503' THEN '950300'
  WHEN hsn_code = '3926' THEN '392690'
  WHEN hsn_code = '4820' THEN '482010'
  WHEN hsn_code = '8504' THEN '850440'
  WHEN hsn_code = '8506' THEN '850610'
  WHEN hsn_code = '8536' THEN '853620'
  WHEN hsn_code = '8414' THEN '841410'
  WHEN hsn_code = '4901' THEN '490110'
  WHEN hsn_code = '2106' THEN '210690'
  WHEN hsn_code = '1901' THEN '190190'
  WHEN hsn_code = '2008' THEN '200819'
  WHEN hsn_code = '9613' THEN '961380'
  WHEN hsn_code = '9608' THEN '960810'
  WHEN hsn_code = '9401' THEN '940161'
  WHEN hsn_code = '8708' THEN '870829'
  WHEN hsn_code = '7113' THEN '711311'
  WHEN hsn_code = '6217' THEN '621710'
  ELSE hsn_code
END
WHERE LENGTH(hsn_code) = 4;

-- Insert additional HSN codes across various categories
INSERT INTO hsn_master (
  hsn_code, description, category, subcategory, keywords,
  minimum_valuation_usd, requires_currency_conversion,
  weight_data, tax_data, classification_data, is_active
) VALUES

-- Electronics & Technology (additional)
('851712', 'Smartphones and Mobile Phones', 'electronics', 'communications', 
 ARRAY['smartphone', 'mobile', 'cell phone', 'iphone', 'android', 'phone'], 
 100, true,
 '{"typical_weights": {"per_unit": {"min": 0.1, "max": 0.3, "average": 0.2}, "packaging": {"additional_weight": 0.05}}}',
 '{"typical_rates": {"customs": {"common": 20}, "gst": {"standard": 18}}}',
 '{"auto_classification": {"enabled": true, "confidence": 0.95}}',
 'Smartphones', '📱', true),

('847130', 'Laptops and Portable Computers', 'electronics', 'computers', 
 ARRAY['laptop', 'notebook', 'macbook', 'chromebook', 'ultrabook'], 
 300, true,
 '{"typical_weights": {"per_unit": {"min": 1.0, "max": 3.0, "average": 2.0}, "packaging": {"additional_weight": 0.3}}}',
 '{"typical_rates": {"customs": {"common": 18}, "gst": {"standard": 18}}}',
 '{"auto_classification": {"enabled": true, "confidence": 0.9}}',
 'Laptops', '💻', true),

('852851', 'Computer Monitors and Displays', 'electronics', 'computers', 
 ARRAY['monitor', 'display', 'screen', 'LED', 'LCD', 'OLED'], 
 150, true,
 '{"typical_weights": {"per_unit": {"min": 3.0, "max": 10.0, "average": 5.0}, "packaging": {"additional_weight": 0.5}}}',
 '{"typical_rates": {"customs": {"common": 15}, "gst": {"standard": 18}}}',
 '{"auto_classification": {"enabled": true, "confidence": 0.9}}',
 'Monitors', '🖥️', true),

('851810', 'Headphones and Earphones', 'electronics', 'audio', 
 ARRAY['headphone', 'earphone', 'airpods', 'earbuds', 'headset'], 
 20, true,
 '{"typical_weights": {"per_unit": {"min": 0.05, "max": 0.5, "average": 0.2}, "packaging": {"additional_weight": 0.05}}}',
 '{"typical_rates": {"customs": {"common": 20}, "gst": {"standard": 18}}}',
 '{"auto_classification": {"enabled": true, "confidence": 0.9}}',
 'Headphones', '🎧', true),

-- Fashion & Apparel (additional)
('610910', 'T-shirts and Casual Shirts', 'clothing', 'tops', 
 ARRAY['tshirt', 't-shirt', 'shirt', 'top', 'casual wear'], 
 10, true,
 '{"typical_weights": {"per_unit": {"min": 0.1, "max": 0.3, "average": 0.2}, "packaging": {"additional_weight": 0.02}}}',
 '{"typical_rates": {"customs": {"common": 20}, "gst": {"standard": 12}}}',
 '{"auto_classification": {"enabled": true, "confidence": 0.85}}',
 'T-shirts', '👕', true),

('620342', 'Men''s Jeans and Trousers', 'clothing', 'bottoms', 
 ARRAY['jeans', 'denim', 'trousers', 'pants', 'bottoms'], 
 20, true,
 '{"typical_weights": {"per_unit": {"min": 0.3, "max": 0.8, "average": 0.5}, "packaging": {"additional_weight": 0.05}}}',
 '{"typical_rates": {"customs": {"common": 20}, "gst": {"standard": 12}}}',
 '{"auto_classification": {"enabled": true, "confidence": 0.85}}',
 'Jeans', '👖', true),

('640299', 'Sports Shoes and Sneakers', 'footwear', 'athletic', 
 ARRAY['sneakers', 'sports shoes', 'running shoes', 'athletic footwear'], 
 30, true,
 '{"typical_weights": {"per_unit": {"min": 0.5, "max": 1.5, "average": 1.0}, "packaging": {"additional_weight": 0.2}}}',
 '{"typical_rates": {"customs": {"common": 25}, "gst": {"standard": 18}}}',
 '{"auto_classification": {"enabled": true, "confidence": 0.85}}',
 'Sneakers', '👟', true),

('420222', 'Handbags and Purses', 'accessories', 'bags', 
 ARRAY['handbag', 'purse', 'shoulder bag', 'tote', 'clutch'], 
 50, true,
 '{"typical_weights": {"per_unit": {"min": 0.3, "max": 1.5, "average": 0.8}, "packaging": {"additional_weight": 0.1}}}',
 '{"typical_rates": {"customs": {"common": 20}, "gst": {"standard": 18}}}',
 '{"auto_classification": {"enabled": true, "confidence": 0.85}}',
 'Handbags', '👜', true),

-- Home & Kitchen (additional)
('691110', 'Dinnerware and Tableware', 'home', 'kitchen', 
 ARRAY['plates', 'bowls', 'cups', 'dinnerware', 'tableware'], 
 30, true,
 '{"typical_weights": {"per_unit": {"min": 0.5, "max": 5.0, "average": 2.0}, "packaging": {"additional_weight": 0.3}}}',
 '{"typical_rates": {"customs": {"common": 20}, "gst": {"standard": 18}}}',
 '{"auto_classification": {"enabled": true, "confidence": 0.8}}',
 'Dinnerware', '🍽️', true),

('732393', 'Kitchen Utensils and Tools', 'home', 'kitchen', 
 ARRAY['utensils', 'knife', 'spoon', 'fork', 'kitchen tools'], 
 15, true,
 '{"typical_weights": {"per_unit": {"min": 0.1, "max": 2.0, "average": 0.5}, "packaging": {"additional_weight": 0.1}}}',
 '{"typical_rates": {"customs": {"common": 20}, "gst": {"standard": 18}}}',
 '{"auto_classification": {"enabled": true, "confidence": 0.8}}',
 'Utensils', '🍴', true),

('940350', 'Bedroom Furniture', 'furniture', 'bedroom', 
 ARRAY['bed', 'wardrobe', 'dresser', 'nightstand', 'bedroom'], 
 500, true,
 '{"typical_weights": {"per_unit": {"min": 20.0, "max": 150.0, "average": 70.0}, "packaging": {"additional_weight": 5.0}}}',
 '{"typical_rates": {"customs": {"common": 25}, "gst": {"standard": 18}}}',
 '{"auto_classification": {"enabled": true, "confidence": 0.8}}',
 'Bedroom Furniture', '🛏️', true),

-- Health & Beauty (additional)
('330499', 'Makeup and Cosmetics', 'beauty', 'makeup', 
 ARRAY['makeup', 'cosmetics', 'foundation', 'lipstick', 'mascara'], 
 20, true,
 '{"typical_weights": {"per_unit": {"min": 0.02, "max": 0.3, "average": 0.1}, "packaging": {"additional_weight": 0.02}}}',
 '{"typical_rates": {"customs": {"common": 20}, "gst": {"standard": 28}}}',
 '{"auto_classification": {"enabled": true, "confidence": 0.85}}',
 'Makeup', '💄', true),

('330510', 'Hair Care Products', 'beauty', 'hair care', 
 ARRAY['shampoo', 'conditioner', 'hair oil', 'hair serum', 'hair care'], 
 15, true,
 '{"typical_weights": {"per_unit": {"min": 0.2, "max": 1.0, "average": 0.5}, "packaging": {"additional_weight": 0.05}}}',
 '{"typical_rates": {"customs": {"common": 20}, "gst": {"standard": 18}}}',
 '{"auto_classification": {"enabled": true, "confidence": 0.85}}',
 'Hair Care', '🧴', true),

('300490', 'Medicines and Pharmaceuticals', 'health', 'medicine', 
 ARRAY['medicine', 'pharmaceutical', 'drug', 'tablet', 'capsule'], 
 50, true,
 '{"typical_weights": {"per_unit": {"min": 0.05, "max": 0.5, "average": 0.2}, "packaging": {"additional_weight": 0.05}}}',
 '{"typical_rates": {"customs": {"common": 10}, "gst": {"standard": 12}}}',
 '{"auto_classification": {"enabled": true, "confidence": 0.9}}',
 'Medicines', '💊', true),

-- Sports & Fitness (additional)
('950691', 'Gym and Fitness Equipment', 'sports', 'fitness', 
 ARRAY['dumbbell', 'weights', 'gym equipment', 'fitness', 'exercise'], 
 50, true,
 '{"typical_weights": {"per_unit": {"min": 1.0, "max": 50.0, "average": 10.0}, "packaging": {"additional_weight": 0.5}}}',
 '{"typical_rates": {"customs": {"common": 20}, "gst": {"standard": 18}}}',
 '{"auto_classification": {"enabled": true, "confidence": 0.85}}',
 'Fitness Equipment', '🏋️', true),

('950632', 'Golf Equipment', 'sports', 'golf', 
 ARRAY['golf', 'clubs', 'golf balls', 'golf bag', 'putter'], 
 100, true,
 '{"typical_weights": {"per_unit": {"min": 0.5, "max": 15.0, "average": 5.0}, "packaging": {"additional_weight": 0.5}}}',
 '{"typical_rates": {"customs": {"common": 20}, "gst": {"standard": 28}}}',
 '{"auto_classification": {"enabled": true, "confidence": 0.85}}',
 'Golf Equipment', '⛳', true),

-- Baby & Kids (additional)
('950341', 'Baby Toys and Games', 'toys', 'baby', 
 ARRAY['baby toys', 'infant toys', 'rattles', 'teethers', 'baby games'], 
 10, true,
 '{"typical_weights": {"per_unit": {"min": 0.05, "max": 0.5, "average": 0.2}, "packaging": {"additional_weight": 0.05}}}',
 '{"typical_rates": {"customs": {"common": 20}, "gst": {"standard": 12}}}',
 '{"auto_classification": {"enabled": true, "confidence": 0.85}}',
 'Baby Toys', '🍼', true),

('611120', 'Baby Clothing', 'clothing', 'baby', 
 ARRAY['baby clothes', 'infant wear', 'onesie', 'romper', 'baby dress'], 
 15, true,
 '{"typical_weights": {"per_unit": {"min": 0.05, "max": 0.2, "average": 0.1}, "packaging": {"additional_weight": 0.02}}}',
 '{"typical_rates": {"customs": {"common": 20}, "gst": {"standard": 5}}}',
 '{"auto_classification": {"enabled": true, "confidence": 0.85}}',
 'Baby Clothes', '👶', true),

-- Automotive (additional)
('870899', 'Car Parts and Accessories', 'automotive', 'parts', 
 ARRAY['car parts', 'auto parts', 'spare parts', 'car accessories'], 
 50, true,
 '{"typical_weights": {"per_unit": {"min": 0.5, "max": 20.0, "average": 5.0}, "packaging": {"additional_weight": 0.5}}}',
 '{"typical_rates": {"customs": {"common": 15}, "gst": {"standard": 28}}}',
 '{"auto_classification": {"enabled": true, "confidence": 0.8}}',
 'Car Parts', '🚗', true),

('401110', 'Car and Bike Tires', 'automotive', 'tires', 
 ARRAY['tires', 'tyres', 'car tires', 'bike tires', 'wheels'], 
 100, true,
 '{"typical_weights": {"per_unit": {"min": 5.0, "max": 25.0, "average": 10.0}, "packaging": {"additional_weight": 0.5}}}',
 '{"typical_rates": {"customs": {"common": 20}, "gst": {"standard": 28}}}',
 '{"auto_classification": {"enabled": true, "confidence": 0.85}}',
 'Tires', '🛞', true),

-- Food & Beverages
('090111', 'Coffee Beans and Products', 'food', 'beverages', 
 ARRAY['coffee', 'coffee beans', 'espresso', 'arabica', 'robusta'], 
 20, true,
 '{"typical_weights": {"per_unit": {"min": 0.25, "max": 2.0, "average": 0.5}, "packaging": {"additional_weight": 0.05}}}',
 '{"typical_rates": {"customs": {"common": 100}, "gst": {"standard": 18}}}',
 '{"auto_classification": {"enabled": true, "confidence": 0.9}}',
 'Coffee', '☕', true),

('170490', 'Chocolates and Confectionery', 'food', 'sweets', 
 ARRAY['chocolate', 'candy', 'sweets', 'confectionery', 'cocoa'], 
 10, true,
 '{"typical_weights": {"per_unit": {"min": 0.05, "max": 1.0, "average": 0.3}, "packaging": {"additional_weight": 0.05}}}',
 '{"typical_rates": {"customs": {"common": 30}, "gst": {"standard": 28}}}',
 '{"auto_classification": {"enabled": true, "confidence": 0.9}}',
 'Chocolates', '🍫', true);

-- Update unified_configuration to reflect new 6-digit format
UPDATE unified_configuration 
SET value = '6' 
WHERE key = 'hsn_code_min_length';

INSERT INTO unified_configuration (key, value, category, subcategory, is_active)
VALUES ('hsn_code_max_length', '8', 'validation', 'hsn', true)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;