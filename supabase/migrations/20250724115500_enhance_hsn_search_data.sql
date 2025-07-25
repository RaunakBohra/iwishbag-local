-- ============================================================================
-- ENHANCE HSN SEARCH DATA - Comprehensive Keywords and Visual Metadata
-- Migration: Enhance existing HSN master table with better search capabilities
-- Date: 2025-07-24
-- ============================================================================

-- 1. Add comprehensive search keywords and visual metadata to existing HSN entries
UPDATE hsn_master SET 
  keywords = ARRAY[
    'mobile', 'phone', 'iphone', 'samsung', 'smartphone', 'cellular', 'android', 
    'ios', 'apple', 'google', 'pixel', 'oneplus', 'xiaomi', 'mi', 'redmi', 
    'oppo', 'vivo', 'realme', 'huawei', 'nokia', 'motorola', 'lg', 'sony',
    'blackberry', 'flip phone', 'feature phone', 'burner phone', 'prepaid phone',
    'unlocked phone', 'gsm phone', 'cdma phone', '5g phone', '4g phone', '3g phone',
    'dual sim', 'single sim', 'sim free', 'refurbished phone', 'used phone',
    'phone case', 'phone cover', 'phone screen protector', 'phone charger',
    'wireless charger', 'fast charger', 'power bank', 'phone battery',
    'earphones', 'headphones', 'bluetooth headset', 'phone holder', 'car mount'
  ],
  classification_data = jsonb_set(
    classification_data,
    '{visual_metadata}',
    '{
      "icon": "📱",
      "color": "#3B82F6",
      "display_name": "Mobile Phones & Communication",
      "category_icon": "smartphone",
      "confidence_indicator": "high",
      "common_brands": ["Apple", "Samsung", "Google", "OnePlus", "Xiaomi"],
      "typical_price_range": {"min": 50, "max": 1500, "currency": "USD"},
      "search_priority": 1
    }'::jsonb
  )
WHERE hsn_code = '8517';

UPDATE hsn_master SET 
  keywords = ARRAY[
    'laptop', 'computer', 'macbook', 'dell', 'hp', 'asus', 'lenovo', 'acer',
    'msi', 'razer', 'alienware', 'surface', 'chromebook', 'notebook', 'ultrabook',
    'gaming laptop', 'business laptop', 'student laptop', 'workstation',
    'desktop', '2-in-1', 'convertible', 'tablet pc', 'all-in-one',
    'pc', 'desktop computer', 'tower', 'mini pc', 'nuc', 'mac mini',
    'imac', 'mac pro', 'windows pc', 'linux computer', 'gaming pc',
    'workstation pc', 'server', 'thin client', 'home computer',
    'office computer', 'refurbished computer', 'used laptop', 'second hand laptop',
    'processor', 'cpu', 'gpu', 'graphics card', 'ram', 'memory', 'ssd', 'hard drive',
    'monitor', 'keyboard', 'mouse', 'webcam', 'laptop bag', 'laptop stand'
  ],
  classification_data = jsonb_set(
    classification_data,
    '{visual_metadata}',
    '{
      "icon": "💻",
      "color": "#6366F1",
      "display_name": "Computers & Laptops",
      "category_icon": "laptop",
      "confidence_indicator": "high",
      "common_brands": ["Apple", "Dell", "HP", "Lenovo", "ASUS", "Acer"],
      "typical_price_range": {"min": 300, "max": 3000, "currency": "USD"},
      "search_priority": 1
    }'::jsonb
  )
WHERE hsn_code = '8471';

UPDATE hsn_master SET 
  keywords = ARRAY[
    'tshirt', 't-shirt', 'shirt', 'tee', 'polo', 'polo shirt', 'henley',
    'tank top', 'sleeveless', 'vest', 'undershirt', 'crew neck', 'v-neck',
    'round neck', 'collar shirt', 'formal shirt', 'casual shirt', 'dress shirt',
    'button shirt', 'long sleeve', 'short sleeve', 'half sleeve', 'full sleeve',
    'cotton shirt', 'polyester shirt', 'linen shirt', 'silk shirt', 'denim shirt',
    'flannel shirt', 'hawaiian shirt', 'printed shirt', 'plain shirt', 'striped shirt',
    'checked shirt', 'solid color', 'graphic tee', 'logo tee', 'band tee',
    'sports shirt', 'athletic wear', 'workout shirt', 'gym shirt', 'running shirt',
    'mens shirt', 'womens shirt', 'unisex shirt', 'kids shirt', 'baby shirt',
    'oversized shirt', 'slim fit', 'regular fit', 'loose fit', 'tight fit'
  ],
  classification_data = jsonb_set(
    classification_data,
    '{visual_metadata}',
    '{
      "icon": "👕",
      "color": "#10B981",
      "display_name": "T-Shirts & Casual Wear",
      "category_icon": "shirt",
      "confidence_indicator": "medium",
      "common_brands": ["Nike", "Adidas", "H&M", "Zara", "Uniqlo"],
      "typical_price_range": {"min": 5, "max": 100, "currency": "USD"},
      "search_priority": 2
    }'::jsonb
  )
WHERE hsn_code = '6109';

UPDATE hsn_master SET 
  keywords = ARRAY[
    'dress', 'kurti', 'kurta', 'gown', 'frock', 'maxi dress', 'mini dress',
    'midi dress', 'cocktail dress', 'party dress', 'evening dress', 'prom dress',
    'wedding dress', 'bridesmaid dress', 'casual dress', 'formal dress',
    'summer dress', 'winter dress', 'long dress', 'short dress', 'sleeveless dress',
    'long sleeve dress', 'off shoulder dress', 'strapless dress', 'halter dress',
    'wrap dress', 'shift dress', 'a-line dress', 'bodycon dress', 'fit and flare',
    'tunic', 'kaftan', 'sundress', 'beach dress', 'maternity dress',
    'plus size dress', 'petite dress', 'tall dress', 'designer dress',
    'vintage dress', 'retro dress', 'boho dress', 'ethnic dress', 'western dress',
    'indian dress', 'salwar kameez', 'churidar', 'anarkali', 'lehenga top'
  ],
  classification_data = jsonb_set(
    classification_data,
    '{visual_metadata}',
    '{
      "icon": "👗",
      "color": "#EC4899",
      "display_name": "Dresses & Traditional Wear",
      "category_icon": "dress",
      "confidence_indicator": "medium",
      "common_brands": ["Zara", "H&M", "Forever 21", "ASOS", "Mango"],
      "typical_price_range": {"min": 15, "max": 300, "currency": "USD"},
      "search_priority": 2
    }'::jsonb
  )
WHERE hsn_code = '6204';

UPDATE hsn_master SET 
  keywords = ARRAY[
    'book', 'novel', 'textbook', 'manual', 'guide', 'handbook', 'reference book',
    'fiction', 'non-fiction', 'biography', 'autobiography', 'memoir', 'history book',
    'science book', 'math book', 'english book', 'literature', 'poetry book',
    'children book', 'kids book', 'picture book', 'comic book', 'graphic novel',
    'manga', 'cookbook', 'recipe book', 'self help book', 'motivational book',
    'business book', 'finance book', 'investment book', 'technical book',
    'programming book', 'computer book', 'engineering book', 'medical book',
    'law book', 'legal book', 'academic book', 'university book', 'college book',
    'school book', 'workbook', 'exercise book', 'study guide', 'test prep',
    'exam book', 'revision book', 'notes', 'ebook', 'audiobook', 'hardcover',
    'paperback', 'softcover', 'used book', 'second hand book', 'rare book'
  ],
  classification_data = jsonb_set(
    classification_data,
    '{visual_metadata}',
    '{
      "icon": "📚",
      "color": "#F59E0B",
      "display_name": "Books & Educational Materials",
      "category_icon": "book",
      "confidence_indicator": "high",
      "common_brands": ["Penguin", "Oxford", "Cambridge", "McGraw Hill", "Pearson"],
      "typical_price_range": {"min": 5, "max": 200, "currency": "USD"},
      "search_priority": 3
    }'::jsonb
  )
WHERE hsn_code = '4901';

-- 2. Add more comprehensive HSN entries for common e-commerce categories
INSERT INTO hsn_master (hsn_code, description, category, subcategory, keywords, weight_data, tax_data, classification_data) VALUES

-- Footwear
('6403', 'Footwear - Shoes and Sneakers', 'footwear', 'shoes', 
 ARRAY[
   'shoes', 'sneakers', 'running shoes', 'walking shoes', 'casual shoes', 'formal shoes',
   'dress shoes', 'oxford shoes', 'loafers', 'moccasins', 'boat shoes', 'derby shoes',
   'athletic shoes', 'sports shoes', 'gym shoes', 'training shoes', 'cross training',
   'basketball shoes', 'football shoes', 'soccer shoes', 'tennis shoes', 'golf shoes',
   'hiking shoes', 'trekking shoes', 'work shoes', 'safety shoes', 'steel toe shoes',
   'canvas shoes', 'leather shoes', 'suede shoes', 'patent leather', 'synthetic shoes',
   'mens shoes', 'womens shoes', 'kids shoes', 'baby shoes', 'toddler shoes',
   'nike', 'adidas', 'puma', 'reebok', 'new balance', 'converse', 'vans', 'jordan'
 ],
 '{"typical_weights": {"per_unit": {"min": 0.300, "max": 1.500, "average": 0.800}}, "packaging": {"additional_weight": 0.10}}'::jsonb,
 '{"typical_rates": {"customs": {"min": 15, "max": 25, "common": 20}, "gst": {"standard": 18}, "vat": {"common": 13}}}'::jsonb,
 '{
   "auto_classification": {"keywords": ["shoes", "sneakers", "footwear"], "confidence": 0.90},
   "visual_metadata": {
     "icon": "👟",
     "color": "#8B5CF6",
     "display_name": "Shoes & Sneakers",
     "category_icon": "shoes",
     "confidence_indicator": "high",
     "common_brands": ["Nike", "Adidas", "Puma", "Reebok", "New Balance"],
     "typical_price_range": {"min": 20, "max": 500, "currency": "USD"},
     "search_priority": 1
   }
 }'::jsonb),

-- Bags and Accessories
('4202', 'Bags, Handbags and Travel Goods', 'accessories', 'bags',
 ARRAY[
   'bag', 'handbag', 'purse', 'wallet', 'backpack', 'rucksack', 'school bag',
   'laptop bag', 'messenger bag', 'sling bag', 'crossbody bag', 'shoulder bag',
   'tote bag', 'shopping bag', 'travel bag', 'duffel bag', 'gym bag', 'sports bag',
   'suitcase', 'luggage', 'trolley bag', 'cabin bag', 'check-in bag', 'hard case',
   'soft case', 'rolling bag', 'wheeled bag', 'garment bag', 'suit bag',
   'clutch', 'evening bag', 'wristlet', 'pouch', 'cosmetic bag', 'makeup bag',
   'toiletry bag', 'wash bag', 'pencil case', 'pencil box', 'lunch bag', 'cooler bag',
   'diaper bag', 'baby bag', 'camera bag', 'laptop sleeve', 'tablet case'
 ],
 '{"typical_weights": {"per_unit": {"min": 0.100, "max": 2.000, "average": 0.500}}, "packaging": {"additional_weight": 0.05}}'::jsonb,
 '{"typical_rates": {"customs": {"min": 15, "max": 20, "common": 18}, "gst": {"standard": 18}, "vat": {"common": 13}}}'::jsonb,
 '{
   "auto_classification": {"keywords": ["bag", "handbag", "backpack", "luggage"], "confidence": 0.85},
   "visual_metadata": {
     "icon": "👜",
     "color": "#DC2626",
     "display_name": "Bags & Travel Accessories",
     "category_icon": "bag",
     "confidence_indicator": "high",
     "common_brands": ["Louis Vuitton", "Gucci", "Coach", "Michael Kors", "Kate Spade"],
     "typical_price_range": {"min": 10, "max": 1000, "currency": "USD"},
     "search_priority": 2
   }
 }'::jsonb),

-- Watches and Jewelry
('9102', 'Watches and Timepieces', 'accessories', 'watches',
 ARRAY[
   'watch', 'wristwatch', 'timepiece', 'smartwatch', 'fitness tracker', 'activity tracker',
   'digital watch', 'analog watch', 'automatic watch', 'mechanical watch', 'quartz watch',
   'chronograph', 'stopwatch', 'sports watch', 'diving watch', 'luxury watch',
   'designer watch', 'fashion watch', 'casual watch', 'formal watch', 'dress watch',
   'mens watch', 'womens watch', 'unisex watch', 'kids watch', 'childrens watch',
   'rolex', 'omega', 'seiko', 'casio', 'citizen', 'fossil', 'timex', 'invicta',
   'apple watch', 'samsung watch', 'fitbit', 'garmin', 'polar', 'huawei watch',
   'leather strap', 'metal strap', 'rubber strap', 'nylon strap', 'watch band'
 ],
 '{"typical_weights": {"per_unit": {"min": 0.050, "max": 0.300, "average": 0.120}}, "packaging": {"additional_weight": 0.03}}'::jsonb,
 '{"typical_rates": {"customs": {"min": 20, "max": 30, "common": 25}, "gst": {"standard": 18}, "vat": {"common": 13}}}'::jsonb,
 '{
   "auto_classification": {"keywords": ["watch", "smartwatch", "timepiece"], "confidence": 0.92},
   "visual_metadata": {
     "icon": "⌚",
     "color": "#374151",
     "display_name": "Watches & Timepieces",
     "category_icon": "watch",
     "confidence_indicator": "high",
     "common_brands": ["Apple", "Samsung", "Rolex", "Casio", "Seiko"],
     "typical_price_range": {"min": 25, "max": 5000, "currency": "USD"},
     "search_priority": 2
   }
 }'::jsonb),

-- Home and Kitchen
('9403', 'Furniture and Home Decor', 'home_garden', 'furniture',
 ARRAY[
   'furniture', 'chair', 'table', 'sofa', 'couch', 'bed', 'mattress', 'pillow',
   'cushion', 'ottoman', 'stool', 'bench', 'desk', 'office chair', 'dining table',
   'coffee table', 'side table', 'nightstand', 'dresser', 'wardrobe', 'closet',
   'bookshelf', 'bookcase', 'shelf', 'cabinet', 'cupboard', 'storage', 'organizer',
   'lamp', 'light', 'chandelier', 'pendant light', 'table lamp', 'floor lamp',
   'wall light', 'ceiling light', 'led light', 'bulb', 'fixture',
   'mirror', 'wall mirror', 'decorative mirror', 'picture frame', 'wall art',
   'painting', 'poster', 'canvas', 'wall decor', 'home decor', 'decoration'
 ],
 '{"typical_weights": {"per_unit": {"min": 0.500, "max": 50.000, "average": 5.000}}, "packaging": {"additional_weight": 1.00}}'::jsonb,
 '{"typical_rates": {"customs": {"min": 10, "max": 20, "common": 15}, "gst": {"standard": 18}, "vat": {"common": 13}}}'::jsonb,
 '{
   "auto_classification": {"keywords": ["furniture", "chair", "table", "sofa"], "confidence": 0.80},
   "visual_metadata": {
     "icon": "🪑",
     "color": "#92400E",
     "display_name": "Furniture & Home Decor",
     "category_icon": "furniture",
     "confidence_indicator": "medium",
     "common_brands": ["IKEA", "West Elm", "Pottery Barn", "CB2", "Wayfair"],
     "typical_price_range": {"min": 20, "max": 2000, "currency": "USD"},
     "search_priority": 3
   }
 }'::jsonb),

-- Beauty and Personal Care
('3304', 'Beauty and Cosmetic Products', 'beauty_health', 'cosmetics',
 ARRAY[
   'makeup', 'cosmetics', 'beauty', 'skincare', 'foundation', 'concealer', 'primer',
   'powder', 'blush', 'bronzer', 'eyeshadow', 'eyeliner', 'mascara', 'lipstick',
   'lip gloss', 'lip balm', 'nail polish', 'nail art', 'nail care', 'manicure',
   'perfume', 'cologne', 'fragrance', 'body spray', 'deodorant', 'antiperspirant',
   'shampoo', 'conditioner', 'hair oil', 'hair mask', 'hair serum', 'hair spray',
   'gel', 'mousse', 'hair dye', 'hair color', 'hair treatment', 'hair care',
   'face wash', 'cleanser', 'toner', 'moisturizer', 'serum', 'face mask',
   'face pack', 'sunscreen', 'sunblock', 'spf', 'anti aging', 'wrinkle cream'
 ],
 '{"typical_weights": {"per_unit": {"min": 0.010, "max": 0.500, "average": 0.100}}, "packaging": {"additional_weight": 0.02}}'::jsonb,
 '{"typical_rates": {"customs": {"min": 15, "max": 25, "common": 20}, "gst": {"standard": 18}, "vat": {"common": 13}}}'::jsonb,
 '{
   "auto_classification": {"keywords": ["makeup", "cosmetics", "beauty", "skincare"], "confidence": 0.88},
   "visual_metadata": {
     "icon": "💄",
     "color": "#F472B6",
     "display_name": "Beauty & Cosmetics",
     "category_icon": "makeup",
     "confidence_indicator": "medium",
     "common_brands": ["MAC", "Urban Decay", "Sephora", "Maybelline", "L''Oreal"],
     "typical_price_range": {"min": 5, "max": 200, "currency": "USD"},
     "search_priority": 2
   }
 }'::jsonb),

-- Sports and Fitness
('9506', 'Sports Equipment and Fitness Gear', 'sports_fitness', 'equipment',
 ARRAY[
   'sports', 'fitness', 'gym', 'workout', 'exercise', 'equipment', 'gear',
   'dumbbell', 'barbell', 'weight', 'kettlebell', 'resistance band', 'yoga mat',
   'exercise mat', 'foam roller', 'massage roller', 'fitness tracker', 'heart rate monitor',
   'treadmill', 'elliptical', 'stationary bike', 'exercise bike', 'rowing machine',
   'basketball', 'football', 'soccer ball', 'tennis ball', 'cricket ball', 'baseball',
   'volleyball', 'badminton', 'table tennis', 'ping pong', 'squash', 'racket',
   'tennis racket', 'badminton racket', 'cricket bat', 'baseball bat', 'golf club',
   'golf ball', 'golf bag', 'skateboard', 'longboard', 'scooter', 'roller skates'
 ],
 '{"typical_weights": {"per_unit": {"min": 0.100, "max": 20.000, "average": 2.000}}, "packaging": {"additional_weight": 0.20}}'::jsonb,
 '{"typical_rates": {"customs": {"min": 10, "max": 20, "common": 15}, "gst": {"standard": 18}, "vat": {"common": 13}}}'::jsonb,
 '{
   "auto_classification": {"keywords": ["sports", "fitness", "gym", "exercise"], "confidence": 0.85},
   "visual_metadata": {
     "icon": "🏋️",
     "color": "#059669",
     "display_name": "Sports & Fitness Equipment",
     "category_icon": "fitness",
     "confidence_indicator": "medium",
     "common_brands": ["Nike", "Adidas", "Under Armour", "Reebok", "Puma"],
     "typical_price_range": {"min": 10, "max": 1000, "currency": "USD"},
     "search_priority": 3
   }
 }'::jsonb);

-- 3. Create indexes for enhanced search capabilities
CREATE INDEX IF NOT EXISTS idx_hsn_master_keywords_gin ON hsn_master USING GIN(keywords);
CREATE INDEX IF NOT EXISTS idx_hsn_master_classification_data ON hsn_master USING GIN(classification_data);
CREATE INDEX IF NOT EXISTS idx_hsn_master_description_text ON hsn_master USING GIN(to_tsvector('english', description));
CREATE INDEX IF NOT EXISTS idx_hsn_master_category_subcategory ON hsn_master(category, subcategory);

-- 4. Create a materialized view for faster search results
CREATE MATERIALIZED VIEW IF NOT EXISTS hsn_search_optimized AS
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
  array_to_string(keywords, ' ') as keywords_text,
  to_tsvector('english', description || ' ' || array_to_string(keywords, ' ')) as search_vector
FROM hsn_master 
WHERE is_active = true
ORDER BY 
  CAST(classification_data->'visual_metadata'->>'search_priority' AS INTEGER) ASC,
  category,
  hsn_code;

-- Create index on the materialized view
CREATE INDEX IF NOT EXISTS idx_hsn_search_optimized_vector ON hsn_search_optimized USING GIN(search_vector);
CREATE INDEX IF NOT EXISTS idx_hsn_search_optimized_category ON hsn_search_optimized(category);
CREATE INDEX IF NOT EXISTS idx_hsn_search_optimized_priority ON hsn_search_optimized(search_priority);

-- 5. Create a function to refresh the materialized view
CREATE OR REPLACE FUNCTION refresh_hsn_search_cache()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY hsn_search_optimized;
END;
$$ LANGUAGE plpgsql;

-- 6. Verification and statistics
DO $$
BEGIN
  RAISE NOTICE 'HSN Search Enhancement Migration Completed!';
  RAISE NOTICE 'Total HSN records: %', (SELECT COUNT(*) FROM hsn_master);
  RAISE NOTICE 'Records with visual metadata: %', (SELECT COUNT(*) FROM hsn_master WHERE classification_data ? 'visual_metadata');
  RAISE NOTICE 'Average keywords per record: %', (SELECT ROUND(AVG(array_length(keywords, 1)), 1) FROM hsn_master);
  RAISE NOTICE 'Search optimized view records: %', (SELECT COUNT(*) FROM hsn_search_optimized);
END $$;