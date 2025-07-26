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
 '{"auto_classification": {"enabled": true, "confidence": 0.95}, "visual_metadata": {"display_name": "Smartphones", "icon": "📱"}}', true),

('847130', 'Laptops and Portable Computers', 'electronics', 'computers', 
 ARRAY['laptop', 'notebook', 'macbook', 'chromebook', 'ultrabook'], 
 300, true,
 '{"typical_weights": {"per_unit": {"min": 1.0, "max": 3.0, "average": 2.0}, "packaging": {"additional_weight": 0.3}}}',
 '{"typical_rates": {"customs": {"common": 18}, "gst": {"standard": 18}}}',
 '{"auto_classification": {"enabled": true, "confidence": 0.9}, "visual_metadata": {"display_name": "Laptops", "icon": "💻"}}', true),

('852851', 'Computer Monitors and Displays', 'electronics', 'computers', 
 ARRAY['monitor', 'display', 'screen', 'LED', 'LCD', 'OLED'], 
 150, true,
 '{"typical_weights": {"per_unit": {"min": 3.0, "max": 10.0, "average": 5.0}, "packaging": {"additional_weight": 0.5}}}',
 '{"typical_rates": {"customs": {"common": 15}, "gst": {"standard": 18}}}',
 '{"auto_classification": {"enabled": true, "confidence": 0.9}, "visual_metadata": {"display_name": "Monitors", "icon": "🖥️"}}', true),

('851810', 'Headphones and Earphones', 'electronics', 'audio', 
 ARRAY['headphone', 'earphone', 'airpods', 'earbuds', 'headset'], 
 20, true,
 '{"typical_weights": {"per_unit": {"min": 0.05, "max": 0.5, "average": 0.2}, "packaging": {"additional_weight": 0.05}}}',
 '{"typical_rates": {"customs": {"common": 20}, "gst": {"standard": 18}}}',
 '{"auto_classification": {"enabled": true, "confidence": 0.9}, "visual_metadata": {"display_name": "Headphones", "icon": "🎧"}}', true),

-- Fashion & Apparel (additional)
('610910', 'T-shirts and Casual Shirts', 'clothing', 'tops', 
 ARRAY['tshirt', 't-shirt', 'shirt', 'top', 'casual wear'], 
 10, true,
 '{"typical_weights": {"per_unit": {"min": 0.1, "max": 0.3, "average": 0.2}, "packaging": {"additional_weight": 0.02}}}',
 '{"typical_rates": {"customs": {"common": 20}, "gst": {"standard": 12}}}',
 '{"auto_classification": {"enabled": true, "confidence": 0.85}, "visual_metadata": {"display_name": "T-shirts", "icon": "👕"}}', true),

('620342', 'Men''s Jeans and Trousers', 'clothing', 'bottoms', 
 ARRAY['jeans', 'denim', 'trousers', 'pants', 'bottoms'], 
 20, true,
 '{"typical_weights": {"per_unit": {"min": 0.3, "max": 0.8, "average": 0.5}, "packaging": {"additional_weight": 0.05}}}',
 '{"typical_rates": {"customs": {"common": 20}, "gst": {"standard": 12}}}',
 '{"auto_classification": {"enabled": true, "confidence": 0.85}, "visual_metadata": {"display_name": "Jeans", "icon": "👖"}}', true),

('640299', 'Sports Shoes and Sneakers', 'footwear', 'athletic', 
 ARRAY['sneakers', 'sports shoes', 'running shoes', 'athletic footwear'], 
 30, true,
 '{"typical_weights": {"per_unit": {"min": 0.5, "max": 1.5, "average": 1.0}, "packaging": {"additional_weight": 0.2}}}',
 '{"typical_rates": {"customs": {"common": 25}, "gst": {"standard": 18}}}',
 '{"auto_classification": {"enabled": true, "confidence": 0.85}, "visual_metadata": {"display_name": "Sneakers", "icon": "👟"}}', true),

('420222', 'Handbags and Purses', 'accessories', 'bags', 
 ARRAY['handbag', 'purse', 'shoulder bag', 'tote', 'clutch'], 
 50, true,
 '{"typical_weights": {"per_unit": {"min": 0.3, "max": 1.5, "average": 0.8}, "packaging": {"additional_weight": 0.1}}}',
 '{"typical_rates": {"customs": {"common": 20}, "gst": {"standard": 18}}}',
 '{"auto_classification": {"enabled": true, "confidence": 0.85}, "visual_metadata": {"display_name": "Handbags", "icon": "👜"}}', true),

-- Home & Kitchen (additional)
('691110', 'Dinnerware and Tableware', 'home', 'kitchen', 
 ARRAY['plates', 'bowls', 'cups', 'dinnerware', 'tableware'], 
 30, true,
 '{"typical_weights": {"per_unit": {"min": 0.5, "max": 5.0, "average": 2.0}, "packaging": {"additional_weight": 0.3}}}',
 '{"typical_rates": {"customs": {"common": 20}, "gst": {"standard": 18}}}',
 '{"auto_classification": {"enabled": true, "confidence": 0.8}, "visual_metadata": {"display_name": "Dinnerware", "icon": "🍽️"}}', true),

('732393', 'Kitchen Utensils and Tools', 'home', 'kitchen', 
 ARRAY['utensils', 'knife', 'spoon', 'fork', 'kitchen tools'], 
 15, true,
 '{"typical_weights": {"per_unit": {"min": 0.1, "max": 2.0, "average": 0.5}, "packaging": {"additional_weight": 0.1}}}',
 '{"typical_rates": {"customs": {"common": 20}, "gst": {"standard": 18}}}',
 '{"auto_classification": {"enabled": true, "confidence": 0.8}, "visual_metadata": {"display_name": "Utensils", "icon": "🍴"}}', true),

('940350', 'Bedroom Furniture', 'furniture', 'bedroom', 
 ARRAY['bed', 'wardrobe', 'dresser', 'nightstand', 'bedroom'], 
 500, true,
 '{"typical_weights": {"per_unit": {"min": 20.0, "max": 150.0, "average": 70.0}, "packaging": {"additional_weight": 5.0}}}',
 '{"typical_rates": {"customs": {"common": 25}, "gst": {"standard": 18}}}',
 '{"auto_classification": {"enabled": true, "confidence": 0.8}, "visual_metadata": {"display_name": "Bedroom Furniture", "icon": "🛏️"}}', true),

-- Health & Beauty (additional)
('330499', 'Makeup and Cosmetics', 'beauty', 'makeup', 
 ARRAY['makeup', 'cosmetics', 'foundation', 'lipstick', 'mascara'], 
 20, true,
 '{"typical_weights": {"per_unit": {"min": 0.02, "max": 0.3, "average": 0.1}, "packaging": {"additional_weight": 0.02}}}',
 '{"typical_rates": {"customs": {"common": 20}, "gst": {"standard": 28}}}',
 '{"auto_classification": {"enabled": true, "confidence": 0.85}, "visual_metadata": {"display_name": "Makeup", "icon": "💄"}}', true),

('330510', 'Hair Care Products', 'beauty', 'hair care', 
 ARRAY['shampoo', 'conditioner', 'hair oil', 'hair serum', 'hair care'], 
 15, true,
 '{"typical_weights": {"per_unit": {"min": 0.2, "max": 1.0, "average": 0.5}, "packaging": {"additional_weight": 0.05}}}',
 '{"typical_rates": {"customs": {"common": 20}, "gst": {"standard": 18}}}',
 '{"auto_classification": {"enabled": true, "confidence": 0.85}, "visual_metadata": {"display_name": "Hair Care", "icon": "🧴"}}', true),

('300490', 'Medicines and Pharmaceuticals', 'health', 'medicine', 
 ARRAY['medicine', 'pharmaceutical', 'drug', 'tablet', 'capsule'], 
 50, true,
 '{"typical_weights": {"per_unit": {"min": 0.05, "max": 0.5, "average": 0.2}, "packaging": {"additional_weight": 0.05}}}',
 '{"typical_rates": {"customs": {"common": 10}, "gst": {"standard": 12}}}',
 '{"auto_classification": {"enabled": true, "confidence": 0.9}, "visual_metadata": {"display_name": "Medicines", "icon": "💊"}}', true),

-- Sports & Fitness (additional)
('950691', 'Gym and Fitness Equipment', 'sports', 'fitness', 
 ARRAY['dumbbell', 'weights', 'gym equipment', 'fitness', 'exercise'], 
 50, true,
 '{"typical_weights": {"per_unit": {"min": 1.0, "max": 50.0, "average": 10.0}, "packaging": {"additional_weight": 0.5}}}',
 '{"typical_rates": {"customs": {"common": 20}, "gst": {"standard": 18}}}',
 '{"auto_classification": {"enabled": true, "confidence": 0.85}, "visual_metadata": {"display_name": "Fitness Equipment", "icon": "🏋️"}}', true),

('950632', 'Golf Equipment', 'sports', 'golf', 
 ARRAY['golf', 'clubs', 'golf balls', 'golf bag', 'putter'], 
 100, true,
 '{"typical_weights": {"per_unit": {"min": 0.5, "max": 15.0, "average": 5.0}, "packaging": {"additional_weight": 0.5}}}',
 '{"typical_rates": {"customs": {"common": 20}, "gst": {"standard": 28}}}',
 '{"auto_classification": {"enabled": true, "confidence": 0.85}, "visual_metadata": {"display_name": "Golf Equipment", "icon": "⛳"}}', true),

-- Baby & Kids (additional)
('950341', 'Baby Toys and Games', 'toys', 'baby', 
 ARRAY['baby toys', 'infant toys', 'rattles', 'teethers', 'baby games'], 
 10, true,
 '{"typical_weights": {"per_unit": {"min": 0.05, "max": 0.5, "average": 0.2}, "packaging": {"additional_weight": 0.05}}}',
 '{"typical_rates": {"customs": {"common": 20}, "gst": {"standard": 12}}}',
 '{"auto_classification": {"enabled": true, "confidence": 0.85}, "visual_metadata": {"display_name": "Baby Toys", "icon": "🍼"}}', true),

('611120', 'Baby Clothing', 'clothing', 'baby', 
 ARRAY['baby clothes', 'infant wear', 'onesie', 'romper', 'baby dress'], 
 15, true,
 '{"typical_weights": {"per_unit": {"min": 0.05, "max": 0.2, "average": 0.1}, "packaging": {"additional_weight": 0.02}}}',
 '{"typical_rates": {"customs": {"common": 20}, "gst": {"standard": 5}}}',
 '{"auto_classification": {"enabled": true, "confidence": 0.85}, "visual_metadata": {"display_name": "Baby Clothes", "icon": "👶"}}', true),

-- Automotive (additional)
('870899', 'Car Parts and Accessories', 'automotive', 'parts', 
 ARRAY['car parts', 'auto parts', 'spare parts', 'car accessories'], 
 50, true,
 '{"typical_weights": {"per_unit": {"min": 0.5, "max": 20.0, "average": 5.0}, "packaging": {"additional_weight": 0.5}}}',
 '{"typical_rates": {"customs": {"common": 15}, "gst": {"standard": 28}}}',
 '{"auto_classification": {"enabled": true, "confidence": 0.8}, "visual_metadata": {"display_name": "Car Parts", "icon": "🚗"}}', true),

('401110', 'Car and Bike Tires', 'automotive', 'tires', 
 ARRAY['tires', 'tyres', 'car tires', 'bike tires', 'wheels'], 
 100, true,
 '{"typical_weights": {"per_unit": {"min": 5.0, "max": 25.0, "average": 10.0}, "packaging": {"additional_weight": 0.5}}}',
 '{"typical_rates": {"customs": {"common": 20}, "gst": {"standard": 28}}}',
 '{"auto_classification": {"enabled": true, "confidence": 0.85}, "visual_metadata": {"display_name": "Tires", "icon": "🛞"}}', true),

-- Food & Beverages
('090111', 'Coffee Beans and Products', 'food', 'beverages', 
 ARRAY['coffee', 'coffee beans', 'espresso', 'arabica', 'robusta'], 
 20, true,
 '{"typical_weights": {"per_unit": {"min": 0.25, "max": 2.0, "average": 0.5}, "packaging": {"additional_weight": 0.05}}}',
 '{"typical_rates": {"customs": {"common": 100}, "gst": {"standard": 18}}}',
 '{"auto_classification": {"enabled": true, "confidence": 0.9}, "visual_metadata": {"display_name": "Coffee", "icon": "☕"}}', true),

('170490', 'Chocolates and Confectionery', 'food', 'sweets', 
 ARRAY['chocolate', 'candy', 'sweets', 'confectionery', 'cocoa'], 
 10, true,
 '{"typical_weights": {"per_unit": {"min": 0.05, "max": 1.0, "average": 0.3}, "packaging": {"additional_weight": 0.05}}}',
 '{"typical_rates": {"customs": {"common": 30}, "gst": {"standard": 28}}}',
 '{"auto_classification": {"enabled": true, "confidence": 0.9}, "visual_metadata": {"display_name": "Chocolates", "icon": "🍫"}}', true);

-- Update configuration for HSN code length validation
INSERT INTO unified_configuration (config_type, config_key, config_data, is_active)
VALUES 
  ('validation', 'hsn_code_min_length', '{"value": 6}'::jsonb, true),
  ('validation', 'hsn_code_max_length', '{"value": 8}'::jsonb, true)
ON CONFLICT (config_type, config_key) DO UPDATE 
SET config_data = EXCLUDED.config_data;