-- Add more common and important HSN codes with comprehensive tax data
-- This migration adds frequently traded items across major categories

INSERT INTO hsn_master (
  hsn_code, description, category, subcategory, keywords,
  minimum_valuation_usd, requires_currency_conversion,
  weight_data, tax_data, classification_data, is_active
) VALUES

-- Electronics - Common Items
('851770', 'Mobile Phone Accessories (Cases, Chargers, Cables)', 'electronics', 'accessories', 
 ARRAY['phone case', 'charger', 'cable', 'power bank', 'screen protector', 'phone accessories'], 
 5, true,
 '{"typical_weights": {"per_unit": {"min": 0.02, "max": 0.5, "average": 0.1}, "packaging": {"additional_weight": 0.02}}}',
 '{"typical_rates": {"customs": {"common": 20}, "gst": {"standard": 18}, "vat": {"common": 20}, "import_duty": {"standard": 10}, "sales_tax": {"state": 6.5, "local": 2.5}}}',
 '{"auto_classification": {"enabled": true, "confidence": 0.9}, "visual_metadata": {"display_name": "Phone Accessories", "icon": "🔌"}}', true),

('847150', 'Desktop Computers and Workstations', 'electronics', 'computers', 
 ARRAY['desktop', 'pc', 'computer', 'workstation', 'cpu', 'tower'], 
 400, true,
 '{"typical_weights": {"per_unit": {"min": 5.0, "max": 15.0, "average": 8.0}, "packaging": {"additional_weight": 1.0}}}',
 '{"typical_rates": {"customs": {"common": 18}, "gst": {"standard": 18}, "vat": {"common": 21}, "import_duty": {"standard": 0}, "sales_tax": {"state": 7.25, "local": 2.0}}}',
 '{"auto_classification": {"enabled": true, "confidence": 0.95}, "visual_metadata": {"display_name": "Desktop Computers", "icon": "🖥️"}}', true),

('852352', 'Memory Cards and USB Flash Drives', 'electronics', 'storage', 
 ARRAY['memory card', 'sd card', 'usb', 'flash drive', 'pendrive', 'storage'], 
 10, true,
 '{"typical_weights": {"per_unit": {"min": 0.01, "max": 0.05, "average": 0.02}, "packaging": {"additional_weight": 0.01}}}',
 '{"typical_rates": {"customs": {"common": 15}, "gst": {"standard": 18}, "vat": {"common": 20}, "import_duty": {"standard": 0}, "sales_tax": {"state": 6.0, "local": 2.0}}}',
 '{"auto_classification": {"enabled": true, "confidence": 0.9}, "visual_metadata": {"display_name": "Storage Devices", "icon": "💾"}}', true),

('850110', 'Electric Motors and Generators', 'electronics', 'industrial', 
 ARRAY['motor', 'generator', 'electric motor', 'ac motor', 'dc motor'], 
 100, true,
 '{"typical_weights": {"per_unit": {"min": 1.0, "max": 50.0, "average": 10.0}, "packaging": {"additional_weight": 0.5}}}',
 '{"typical_rates": {"customs": {"common": 7.5}, "gst": {"standard": 18}, "vat": {"common": 20}, "import_duty": {"standard": 10}, "sales_tax": {"state": 6.5, "local": 1.5}}}',
 '{"auto_classification": {"enabled": true, "confidence": 0.85}, "visual_metadata": {"display_name": "Electric Motors", "icon": "⚡"}}', true),

-- Fashion & Textiles - Popular Items
('620520', 'Men''s Shirts (Formal and Casual)', 'clothing', 'tops', 
 ARRAY['shirt', 'formal shirt', 'dress shirt', 'casual shirt', 'mens shirt'], 
 15, true,
 '{"typical_weights": {"per_unit": {"min": 0.15, "max": 0.35, "average": 0.25}, "packaging": {"additional_weight": 0.03}}}',
 '{"typical_rates": {"customs": {"common": 20}, "gst": {"standard": 12}, "vat": {"common": 20}, "import_duty": {"standard": 16}, "sales_tax": {"state": 7.0, "local": 1.0}}}',
 '{"auto_classification": {"enabled": true, "confidence": 0.9}, "visual_metadata": {"display_name": "Men''s Shirts", "icon": "👔"}}', true),

('620462', 'Women''s Dresses and Gowns', 'clothing', 'dresses', 
 ARRAY['dress', 'gown', 'womens dress', 'party dress', 'casual dress', 'formal dress'], 
 25, true,
 '{"typical_weights": {"per_unit": {"min": 0.2, "max": 0.8, "average": 0.4}, "packaging": {"additional_weight": 0.05}}}',
 '{"typical_rates": {"customs": {"common": 20}, "gst": {"standard": 12}, "vat": {"common": 20}, "import_duty": {"standard": 16}, "sales_tax": {"state": 7.0, "local": 1.0}}}',
 '{"auto_classification": {"enabled": true, "confidence": 0.9}, "visual_metadata": {"display_name": "Women''s Dresses", "icon": "👗"}}', true),

('611030', 'Sweaters and Pullovers', 'clothing', 'knitwear', 
 ARRAY['sweater', 'pullover', 'jumper', 'knitwear', 'cardigan', 'hoodie'], 
 20, true,
 '{"typical_weights": {"per_unit": {"min": 0.3, "max": 0.8, "average": 0.5}, "packaging": {"additional_weight": 0.05}}}',
 '{"typical_rates": {"customs": {"common": 20}, "gst": {"standard": 12}, "vat": {"common": 20}, "import_duty": {"standard": 16}, "sales_tax": {"state": 6.5, "local": 1.5}}}',
 '{"auto_classification": {"enabled": true, "confidence": 0.85}, "visual_metadata": {"display_name": "Sweaters", "icon": "🧥"}}', true),

('420212', 'Backpacks and Rucksacks', 'accessories', 'bags', 
 ARRAY['backpack', 'rucksack', 'school bag', 'laptop bag', 'travel bag'], 
 25, true,
 '{"typical_weights": {"per_unit": {"min": 0.5, "max": 2.0, "average": 1.0}, "packaging": {"additional_weight": 0.1}}}',
 '{"typical_rates": {"customs": {"common": 20}, "gst": {"standard": 18}, "vat": {"common": 20}, "import_duty": {"standard": 10}, "sales_tax": {"state": 7.0, "local": 2.0}}}',
 '{"auto_classification": {"enabled": true, "confidence": 0.9}, "visual_metadata": {"display_name": "Backpacks", "icon": "🎒"}}', true),

-- Jewelry & Watches
('711319', 'Gold Jewelry', 'jewelry', 'precious', 
 ARRAY['gold jewelry', 'gold chain', 'gold ring', 'gold necklace', 'gold bracelet'], 
 200, true,
 '{"typical_weights": {"per_unit": {"min": 0.002, "max": 0.1, "average": 0.02}, "packaging": {"additional_weight": 0.05}}}',
 '{"typical_rates": {"customs": {"common": 10}, "gst": {"standard": 3}, "vat": {"common": 0}, "import_duty": {"standard": 10}, "sales_tax": {"state": 0, "local": 0}}}',
 '{"auto_classification": {"enabled": true, "confidence": 0.95}, "visual_metadata": {"display_name": "Gold Jewelry", "icon": "💍"}}', true),

('711790', 'Imitation Jewelry', 'jewelry', 'fashion', 
 ARRAY['artificial jewelry', 'fashion jewelry', 'costume jewelry', 'imitation jewelry'], 
 10, true,
 '{"typical_weights": {"per_unit": {"min": 0.02, "max": 0.2, "average": 0.08}, "packaging": {"additional_weight": 0.02}}}',
 '{"typical_rates": {"customs": {"common": 20}, "gst": {"standard": 28}, "vat": {"common": 20}, "import_duty": {"standard": 15}, "sales_tax": {"state": 7.5, "local": 2.5}}}',
 '{"auto_classification": {"enabled": true, "confidence": 0.85}, "visual_metadata": {"display_name": "Fashion Jewelry", "icon": "💎"}}', true),

('910211', 'Wrist Watches', 'accessories', 'watches', 
 ARRAY['watch', 'wrist watch', 'smartwatch', 'timepiece', 'chronograph'], 
 50, true,
 '{"typical_weights": {"per_unit": {"min": 0.05, "max": 0.3, "average": 0.15}, "packaging": {"additional_weight": 0.1}}}',
 '{"typical_rates": {"customs": {"common": 20}, "gst": {"standard": 28}, "vat": {"common": 21}, "import_duty": {"standard": 10}, "sales_tax": {"state": 8.0, "local": 2.0}}}',
 '{"auto_classification": {"enabled": true, "confidence": 0.9}, "visual_metadata": {"display_name": "Watches", "icon": "⌚"}}', true),

-- Home Appliances
('841810', 'Refrigerators and Freezers', 'appliances', 'kitchen', 
 ARRAY['refrigerator', 'fridge', 'freezer', 'deep freezer', 'mini fridge'], 
 200, true,
 '{"typical_weights": {"per_unit": {"min": 30.0, "max": 150.0, "average": 60.0}, "packaging": {"additional_weight": 5.0}}}',
 '{"typical_rates": {"customs": {"common": 20}, "gst": {"standard": 28}, "vat": {"common": 20}, "import_duty": {"standard": 20}, "sales_tax": {"state": 7.5, "local": 2.0}}}',
 '{"auto_classification": {"enabled": true, "confidence": 0.95}, "visual_metadata": {"display_name": "Refrigerators", "icon": "🧊"}}', true),

('850940', 'Food Processors and Blenders', 'appliances', 'kitchen', 
 ARRAY['blender', 'mixer', 'food processor', 'juicer', 'grinder'], 
 30, true,
 '{"typical_weights": {"per_unit": {"min": 1.0, "max": 5.0, "average": 2.5}, "packaging": {"additional_weight": 0.3}}}',
 '{"typical_rates": {"customs": {"common": 20}, "gst": {"standard": 18}, "vat": {"common": 20}, "import_duty": {"standard": 10}, "sales_tax": {"state": 6.5, "local": 2.0}}}',
 '{"auto_classification": {"enabled": true, "confidence": 0.9}, "visual_metadata": {"display_name": "Kitchen Appliances", "icon": "🥤"}}', true),

('841451', 'Electric Fans', 'appliances', 'cooling', 
 ARRAY['fan', 'ceiling fan', 'table fan', 'pedestal fan', 'exhaust fan'], 
 25, true,
 '{"typical_weights": {"per_unit": {"min": 2.0, "max": 8.0, "average": 4.0}, "packaging": {"additional_weight": 0.5}}}',
 '{"typical_rates": {"customs": {"common": 20}, "gst": {"standard": 18}, "vat": {"common": 20}, "import_duty": {"standard": 10}, "sales_tax": {"state": 6.0, "local": 1.5}}}',
 '{"auto_classification": {"enabled": true, "confidence": 0.85}, "visual_metadata": {"display_name": "Fans", "icon": "🌀"}}', true),

-- Toys & Games
('950390', 'Educational Toys and Puzzles', 'toys', 'educational', 
 ARRAY['puzzle', 'educational toy', 'building blocks', 'lego', 'stem toys'], 
 15, true,
 '{"typical_weights": {"per_unit": {"min": 0.1, "max": 2.0, "average": 0.5}, "packaging": {"additional_weight": 0.1}}}',
 '{"typical_rates": {"customs": {"common": 20}, "gst": {"standard": 12}, "vat": {"common": 20}, "import_duty": {"standard": 10}, "sales_tax": {"state": 6.5, "local": 1.5}}}',
 '{"auto_classification": {"enabled": true, "confidence": 0.85}, "visual_metadata": {"display_name": "Educational Toys", "icon": "🧩"}}', true),

('950450', 'Video Game Consoles and Games', 'electronics', 'gaming', 
 ARRAY['playstation', 'xbox', 'nintendo', 'gaming console', 'video games'], 
 100, true,
 '{"typical_weights": {"per_unit": {"min": 0.1, "max": 5.0, "average": 2.0}, "packaging": {"additional_weight": 0.3}}}',
 '{"typical_rates": {"customs": {"common": 20}, "gst": {"standard": 28}, "vat": {"common": 21}, "import_duty": {"standard": 10}, "sales_tax": {"state": 7.5, "local": 2.5}}}',
 '{"auto_classification": {"enabled": true, "confidence": 0.95}, "visual_metadata": {"display_name": "Gaming", "icon": "🎮"}}', true),

-- Books & Stationery
('490199', 'Books and Printed Materials', 'books', 'literature', 
 ARRAY['book', 'novel', 'textbook', 'magazine', 'printed book', 'paperback'], 
 10, true,
 '{"typical_weights": {"per_unit": {"min": 0.1, "max": 2.0, "average": 0.5}, "packaging": {"additional_weight": 0.05}}}',
 '{"typical_rates": {"customs": {"common": 0}, "gst": {"standard": 0}, "vat": {"common": 0}, "import_duty": {"standard": 0}, "sales_tax": {"state": 0, "local": 0}}}',
 '{"auto_classification": {"enabled": true, "confidence": 0.95}, "visual_metadata": {"display_name": "Books", "icon": "📚"}}', true),

('960839', 'Pens and Writing Instruments', 'stationery', 'writing', 
 ARRAY['pen', 'pencil', 'marker', 'highlighter', 'writing instruments'], 
 5, true,
 '{"typical_weights": {"per_unit": {"min": 0.01, "max": 0.05, "average": 0.02}, "packaging": {"additional_weight": 0.01}}}',
 '{"typical_rates": {"customs": {"common": 20}, "gst": {"standard": 18}, "vat": {"common": 20}, "import_duty": {"standard": 10}, "sales_tax": {"state": 6.5, "local": 1.5}}}',
 '{"auto_classification": {"enabled": true, "confidence": 0.9}, "visual_metadata": {"display_name": "Writing Instruments", "icon": "✏️"}}', true),

-- Personal Care & Hygiene
('340111', 'Soap and Bath Products', 'beauty', 'personal care', 
 ARRAY['soap', 'body wash', 'shower gel', 'bath products', 'bathing bar'], 
 5, true,
 '{"typical_weights": {"per_unit": {"min": 0.05, "max": 0.5, "average": 0.15}, "packaging": {"additional_weight": 0.02}}}',
 '{"typical_rates": {"customs": {"common": 20}, "gst": {"standard": 18}, "vat": {"common": 20}, "import_duty": {"standard": 20}, "sales_tax": {"state": 6.0, "local": 1.0}}}',
 '{"auto_classification": {"enabled": true, "confidence": 0.9}, "visual_metadata": {"display_name": "Bath Products", "icon": "🧼"}}', true),

('330720', 'Deodorants and Antiperspirants', 'beauty', 'personal care', 
 ARRAY['deodorant', 'antiperspirant', 'body spray', 'perfume', 'fragrance'], 
 10, true,
 '{"typical_weights": {"per_unit": {"min": 0.1, "max": 0.3, "average": 0.2}, "packaging": {"additional_weight": 0.02}}}',
 '{"typical_rates": {"customs": {"common": 20}, "gst": {"standard": 18}, "vat": {"common": 20}, "import_duty": {"standard": 20}, "sales_tax": {"state": 6.5, "local": 1.5}}}',
 '{"auto_classification": {"enabled": true, "confidence": 0.9}, "visual_metadata": {"display_name": "Deodorants", "icon": "🌸"}}', true),

-- Tools & Hardware
('820559', 'Hand Tools and Tool Sets', 'tools', 'hand tools', 
 ARRAY['hammer', 'screwdriver', 'pliers', 'wrench', 'tool set', 'hand tools'], 
 20, true,
 '{"typical_weights": {"per_unit": {"min": 0.1, "max": 5.0, "average": 1.0}, "packaging": {"additional_weight": 0.2}}}',
 '{"typical_rates": {"customs": {"common": 15}, "gst": {"standard": 18}, "vat": {"common": 20}, "import_duty": {"standard": 10}, "sales_tax": {"state": 6.5, "local": 1.5}}}',
 '{"auto_classification": {"enabled": true, "confidence": 0.85}, "visual_metadata": {"display_name": "Hand Tools", "icon": "🔧"}}', true),

('846729', 'Power Tools (Drills, Sanders, etc)', 'tools', 'power tools', 
 ARRAY['drill', 'power drill', 'sander', 'grinder', 'power tools', 'electric tools'], 
 50, true,
 '{"typical_weights": {"per_unit": {"min": 0.5, "max": 5.0, "average": 2.0}, "packaging": {"additional_weight": 0.3}}}',
 '{"typical_rates": {"customs": {"common": 10}, "gst": {"standard": 18}, "vat": {"common": 20}, "import_duty": {"standard": 7.5}, "sales_tax": {"state": 6.5, "local": 2.0}}}',
 '{"auto_classification": {"enabled": true, "confidence": 0.9}, "visual_metadata": {"display_name": "Power Tools", "icon": "🔨"}}', true),

-- Office Supplies
('847330', 'Computer Parts and Components', 'electronics', 'computer parts', 
 ARRAY['ram', 'graphics card', 'motherboard', 'processor', 'computer parts', 'pc components'], 
 50, true,
 '{"typical_weights": {"per_unit": {"min": 0.05, "max": 2.0, "average": 0.5}, "packaging": {"additional_weight": 0.1}}}',
 '{"typical_rates": {"customs": {"common": 0}, "gst": {"standard": 18}, "vat": {"common": 21}, "import_duty": {"standard": 0}, "sales_tax": {"state": 6.5, "local": 2.0}}}',
 '{"auto_classification": {"enabled": true, "confidence": 0.95}, "visual_metadata": {"display_name": "PC Components", "icon": "🖲️"}}', true),

('847989', 'Office Equipment and Accessories', 'office', 'equipment', 
 ARRAY['printer', 'scanner', 'shredder', 'laminator', 'office equipment'], 
 100, true,
 '{"typical_weights": {"per_unit": {"min": 2.0, "max": 20.0, "average": 8.0}, "packaging": {"additional_weight": 0.5}}}',
 '{"typical_rates": {"customs": {"common": 15}, "gst": {"standard": 18}, "vat": {"common": 20}, "import_duty": {"standard": 7.5}, "sales_tax": {"state": 6.5, "local": 2.0}}}',
 '{"auto_classification": {"enabled": true, "confidence": 0.85}, "visual_metadata": {"display_name": "Office Equipment", "icon": "🖨️"}}', true),

-- Musical Instruments
('920710', 'Keyboards and Digital Pianos', 'music', 'instruments', 
 ARRAY['keyboard', 'piano', 'digital piano', 'synthesizer', 'musical keyboard'], 
 100, true,
 '{"typical_weights": {"per_unit": {"min": 5.0, "max": 30.0, "average": 12.0}, "packaging": {"additional_weight": 1.0}}}',
 '{"typical_rates": {"customs": {"common": 15}, "gst": {"standard": 28}, "vat": {"common": 21}, "import_duty": {"standard": 10}, "sales_tax": {"state": 7.0, "local": 2.0}}}',
 '{"auto_classification": {"enabled": true, "confidence": 0.9}, "visual_metadata": {"display_name": "Keyboards", "icon": "🎹"}}', true),

('920600', 'Drums and Percussion Instruments', 'music', 'instruments', 
 ARRAY['drums', 'drum set', 'percussion', 'tabla', 'djembe', 'cymbals'], 
 150, true,
 '{"typical_weights": {"per_unit": {"min": 2.0, "max": 50.0, "average": 15.0}, "packaging": {"additional_weight": 2.0}}}',
 '{"typical_rates": {"customs": {"common": 15}, "gst": {"standard": 28}, "vat": {"common": 21}, "import_duty": {"standard": 10}, "sales_tax": {"state": 7.0, "local": 2.0}}}',
 '{"auto_classification": {"enabled": true, "confidence": 0.85}, "visual_metadata": {"display_name": "Drums", "icon": "🥁"}}', true),

-- Pet Supplies
('230910', 'Pet Food (Dog and Cat)', 'pet supplies', 'food', 
 ARRAY['dog food', 'cat food', 'pet food', 'kibble', 'pet treats'], 
 20, true,
 '{"typical_weights": {"per_unit": {"min": 0.5, "max": 20.0, "average": 5.0}, "packaging": {"additional_weight": 0.1}}}',
 '{"typical_rates": {"customs": {"common": 30}, "gst": {"standard": 18}, "vat": {"common": 20}, "import_duty": {"standard": 30}, "sales_tax": {"state": 6.0, "local": 1.0}}}',
 '{"auto_classification": {"enabled": true, "confidence": 0.9}, "visual_metadata": {"display_name": "Pet Food", "icon": "🐕"}}', true),

('420100', 'Pet Accessories and Supplies', 'pet supplies', 'accessories', 
 ARRAY['pet toys', 'collar', 'leash', 'pet bed', 'pet accessories', 'pet supplies'], 
 15, true,
 '{"typical_weights": {"per_unit": {"min": 0.05, "max": 5.0, "average": 0.5}, "packaging": {"additional_weight": 0.1}}}',
 '{"typical_rates": {"customs": {"common": 20}, "gst": {"standard": 18}, "vat": {"common": 20}, "import_duty": {"standard": 10}, "sales_tax": {"state": 6.5, "local": 1.5}}}',
 '{"auto_classification": {"enabled": true, "confidence": 0.85}, "visual_metadata": {"display_name": "Pet Accessories", "icon": "🐾"}}', true),

-- Outdoor & Camping
('630533', 'Camping Tents and Shelters', 'outdoor', 'camping', 
 ARRAY['tent', 'camping tent', 'shelter', 'canopy', 'outdoor tent'], 
 50, true,
 '{"typical_weights": {"per_unit": {"min": 2.0, "max": 10.0, "average": 4.0}, "packaging": {"additional_weight": 0.3}}}',
 '{"typical_rates": {"customs": {"common": 20}, "gst": {"standard": 18}, "vat": {"common": 20}, "import_duty": {"standard": 10}, "sales_tax": {"state": 6.5, "local": 2.0}}}',
 '{"auto_classification": {"enabled": true, "confidence": 0.85}, "visual_metadata": {"display_name": "Camping Tents", "icon": "⛺"}}', true),

('940490', 'Sleeping Bags and Camping Bedding', 'outdoor', 'camping', 
 ARRAY['sleeping bag', 'camping mat', 'air mattress', 'camping bedding'], 
 30, true,
 '{"typical_weights": {"per_unit": {"min": 0.5, "max": 3.0, "average": 1.5}, "packaging": {"additional_weight": 0.2}}}',
 '{"typical_rates": {"customs": {"common": 20}, "gst": {"standard": 18}, "vat": {"common": 20}, "import_duty": {"standard": 10}, "sales_tax": {"state": 6.5, "local": 1.5}}}',
 '{"auto_classification": {"enabled": true, "confidence": 0.85}, "visual_metadata": {"display_name": "Sleeping Bags", "icon": "🛌"}}', true),

-- Eyewear
('900410', 'Sunglasses', 'accessories', 'eyewear', 
 ARRAY['sunglasses', 'shades', 'uv protection', 'polarized sunglasses'], 
 20, true,
 '{"typical_weights": {"per_unit": {"min": 0.02, "max": 0.1, "average": 0.05}, "packaging": {"additional_weight": 0.05}}}',
 '{"typical_rates": {"customs": {"common": 20}, "gst": {"standard": 18}, "vat": {"common": 20}, "import_duty": {"standard": 10}, "sales_tax": {"state": 7.0, "local": 2.0}}}',
 '{"auto_classification": {"enabled": true, "confidence": 0.9}, "visual_metadata": {"display_name": "Sunglasses", "icon": "🕶️"}}', true),

('900490', 'Prescription Glasses and Frames', 'accessories', 'eyewear', 
 ARRAY['glasses', 'spectacles', 'eyeglasses', 'frames', 'prescription glasses'], 
 30, true,
 '{"typical_weights": {"per_unit": {"min": 0.02, "max": 0.1, "average": 0.04}, "packaging": {"additional_weight": 0.05}}}',
 '{"typical_rates": {"customs": {"common": 10}, "gst": {"standard": 12}, "vat": {"common": 10}, "import_duty": {"standard": 5}, "sales_tax": {"state": 5.0, "local": 1.0}}}',
 '{"auto_classification": {"enabled": true, "confidence": 0.9}, "visual_metadata": {"display_name": "Eyeglasses", "icon": "👓"}}', true);

-- Update the materialized view to include new HSN codes
REFRESH MATERIALIZED VIEW hsn_search_optimized;