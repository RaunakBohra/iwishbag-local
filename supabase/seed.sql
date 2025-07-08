-- Seed data for development and testing

-- Clean tables before seeding
DELETE FROM public.footer_settings;
DELETE FROM system_settings;
DELETE FROM email_templates;
DELETE FROM payment_gateways;
DELETE FROM country_settings;
DELETE FROM shipping_routes;

-- Insert test countries
INSERT INTO country_settings (code, name, currency, rate_from_usd, sales_tax, vat, min_shipping, additional_shipping, additional_weight, weight_unit, volumetric_divisor, payment_gateway_fixed_fee, payment_gateway_percent_fee, purchase_allowed, shipping_allowed, payment_gateway, priority_thresholds) VALUES
('US', 'United States', 'USD', 1.0, 0.08, 0, 10, 0, 2, 'lbs', 5000, 0, 2.9, true, true, 'stripe', '{"low": 0, "normal": 500, "urgent": 2000}'),
('IN', 'India', 'INR', 83.0, 0, 0.18, 500, 0, 100, 'kg', 5000, 0, 2.5, true, true, 'payu', '{"low": 0, "normal": 41500, "urgent": 166000}'),
('NP', 'Nepal', 'NPR', 133.0, 0, 0.13, 1000, 0, 200, 'kg', 5000, 0, 1.5, true, true, 'esewa', '{"low": 0, "normal": 66500, "urgent": 266000}'),
('JP', 'Japan', 'JPY', 150.0, 0, 0.10, 1500, 0, 200, 'kg', 5000, 0, 2.9, true, true, 'stripe', '{"low": 0, "normal": 75000, "urgent": 300000}');

-- Insert test payment gateways
INSERT INTO payment_gateways (code, name, description, is_active, supported_countries, supported_currencies, fee_percent, fee_fixed, config, test_mode) VALUES
('stripe', 'Stripe', 'International payment processing', true, ARRAY['US', 'IN', 'NP', 'JP'], ARRAY['USD', 'INR', 'NPR', 'JPY'], 2.9, 0.30, '{"publishable_key": "pk_test_...", "secret_key": "sk_test_..."}', true),
('payu', 'PayU', 'Indian payment gateway', true, ARRAY['IN'], ARRAY['INR'], 2.5, 0, '{"merchant_key": "test_key", "salt_key": "test_salt"}', true),
('esewa', 'eSewa', 'Nepali digital wallet', true, ARRAY['NP'], ARRAY['NPR'], 1.5, 0, '{"merchant_id": "test_id", "merchant_key": "test_key"}', true);

-- Insert test email templates
INSERT INTO email_templates (name, subject, html_content, template_type, variables) VALUES
('quote_confirmation', 'Your Quote Request Confirmation', 'Dear {{customer_name}},<br><br>Thank you for your quote request for {{product_name}}.<br><br>We will review your request and get back to you within 24 hours.<br><br>Quote ID: {{quote_id}}<br>Estimated Total: {{estimated_total}}<br><br>Best regards,<br>iWishBag Team', 'quote_notification', '{"customer_name": "string", "product_name": "string", "quote_id": "string", "estimated_total": "string"}'),
('order_confirmation', 'Order Confirmation - {{order_id}}', 'Dear {{customer_name}},<br><br>Your order has been confirmed!<br><br>Order ID: {{order_id}}<br>Total Amount: {{total_amount}}<br>Payment Method: {{payment_method}}<br><br>We will keep you updated on your order status.<br><br>Best regards,<br>iWishBag Team', 'order_notification', '{"customer_name": "string", "order_id": "string", "total_amount": "string", "payment_method": "string"}'),
('cart_abandonment_recovery', 'Complete Your Purchase - Your Cart is Waiting!', 'Hi there!<br><br>We noticed you left some items in your cart. Don''t let them get away!<br><br>Your cart contains {product_name} worth {cart_value}.<br><br>Complete your purchase now and enjoy your items!<br><br>Best regards,<br>The Team', 'cart_abandonment', '{"product_name": "string", "cart_value": "string"}'),
('cart_abandonment_discount', 'Special Offer - 10% Off Your Abandoned Cart!', 'Hi there!<br><br>We noticed you left some items in your cart. As a special offer, we''re giving you 10% off!<br><br>Your cart contains {product_name} worth {cart_value}.<br>With your discount: {discounted_value}<br><br>Use code: ABANDON10<br><br>Complete your purchase now!<br><br>Best regards,<br>The Team', 'cart_abandonment', '{"product_name": "string", "cart_value": "string", "discounted_value": "string"}');

-- Insert email settings (if not exists)
INSERT INTO email_settings (setting_key, setting_value, description) VALUES
('email_sending_enabled', 'true', 'Global toggle for enabling/disabling all email sending'),
('cart_abandonment_enabled', 'true', 'Toggle for cart abandonment emails specifically'),
('quote_notifications_enabled', 'true', 'Toggle for quote notification emails'),
('order_notifications_enabled', 'true', 'Toggle for order notification emails'),
('status_notifications_enabled', 'true', 'Toggle for status change notification emails')
ON CONFLICT (setting_key) DO NOTHING;

-- Insert test system settings
INSERT INTO system_settings (setting_key, setting_value, description) VALUES
('site_name', 'iWishBag', 'Website name'),
('site_description', 'Shop internationally and get anything delivered to your doorstep', 'Website description'),
('default_currency', 'USD', 'Default currency for the platform'),
('support_email', 'support@iwishbag.com', 'Customer support email'),
('max_quote_amount', '10000', 'Maximum quote amount in USD'),
('auto_approval_limit', '100', 'Auto-approval limit for quotes in USD'),
('quote_statuses', '[
  {
    "id": "pending",
    "name": "pending",
    "label": "Pending",
    "description": "Quote request is awaiting review",
    "color": "secondary",
    "icon": "Clock",
    "isActive": true,
    "order": 1,
    "allowedTransitions": ["sent", "rejected"],
    "isTerminal": false,
    "category": "quote"
  },
  {
    "id": "sent",
    "name": "sent",
    "label": "Sent",
    "description": "Quote has been sent to customer",
    "color": "outline",
    "icon": "FileText",
    "isActive": true,
    "order": 2,
    "allowedTransitions": ["approved", "rejected", "expired"],
    "autoExpireHours": 168,
    "isTerminal": false,
    "category": "quote"
  },
  {
    "id": "approved",
    "name": "approved",
    "label": "Approved",
    "description": "Customer has approved the quote",
    "color": "default",
    "icon": "CheckCircle",
    "isActive": true,
    "order": 3,
    "allowedTransitions": ["rejected"],
    "isTerminal": false,
    "category": "quote"
  },
  {
    "id": "rejected",
    "name": "rejected",
    "label": "Rejected",
    "description": "Quote has been rejected",
    "color": "destructive",
    "icon": "XCircle",
    "isActive": true,
    "order": 4,
    "allowedTransitions": ["approved"],
    "isTerminal": true,
    "category": "quote"
  },
  {
    "id": "expired",
    "name": "expired",
    "label": "Expired",
    "description": "Quote has expired",
    "color": "destructive",
    "icon": "AlertTriangle",
    "isActive": true,
    "order": 5,
    "allowedTransitions": ["approved"],
    "isTerminal": true,
    "category": "quote"
  },
  {
    "id": "calculated",
    "name": "calculated",
    "label": "Calculated",
    "description": "Quote has been calculated and is ready for review",
    "color": "secondary",
    "icon": "Calculator",
    "isActive": true,
    "order": 6,
    "allowedTransitions": ["sent", "approved", "rejected"],
    "isTerminal": false,
    "category": "quote"
  }
]', 'Quote status configuration'),
('order_statuses', '[
  {
    "id": "paid",
    "name": "paid",
    "label": "Paid",
    "description": "Payment has been received",
    "color": "default",
    "icon": "DollarSign",
    "isActive": true,
    "order": 1,
    "allowedTransitions": ["ordered", "cancelled"],
    "isTerminal": false,
    "category": "order"
  },
  {
    "id": "ordered",
    "name": "ordered",
    "label": "Ordered",
    "description": "Order has been placed with merchant",
    "color": "default",
    "icon": "ShoppingCart",
    "isActive": true,
    "order": 2,
    "allowedTransitions": ["shipped", "cancelled"],
    "isTerminal": false,
    "category": "order"
  },
  {
    "id": "shipped",
    "name": "shipped",
    "label": "Shipped",
    "description": "Order has been shipped",
    "color": "secondary",
    "icon": "Truck",
    "isActive": true,
    "order": 3,
    "allowedTransitions": ["completed", "cancelled"],
    "isTerminal": false,
    "category": "order"
  },
  {
    "id": "completed",
    "name": "completed",
    "label": "Completed",
    "description": "Order has been delivered",
    "color": "outline",
    "icon": "CheckCircle",
    "isActive": true,
    "order": 4,
    "allowedTransitions": [],
    "isTerminal": true,
    "category": "order"
  },
  {
    "id": "cancelled",
    "name": "cancelled",
    "label": "Cancelled",
    "description": "Quote or order has been cancelled",
    "color": "destructive",
    "icon": "XCircle",
    "isActive": true,
    "order": 5,
    "allowedTransitions": [],
    "isTerminal": true,
    "category": "order"
  }
]', 'Order status configuration'),
('exchange_rate_markup_percentage', '2.5', 'Exchange rate markup percentage applied to all currency conversions'),
('auto_exchange_rate_enabled', 'true', 'Enable automatic exchange rate updates'),
('exchange_rate_update_interval_hours', '24', 'Interval in hours for automatic exchange rate updates'),
('wishlist_enabled', 'true', 'Enable wishlist feature for users'),
('email_notifications_enabled', 'true', 'Enable system-wide email notifications')
ON CONFLICT (setting_key) DO NOTHING;

-- Insert customs categories (required for quote calculations)
INSERT INTO public.customs_categories (name, duty_percent)
VALUES
('Electronics', 5.00),
('Clothing & Textiles', 15.00),
('Home & Garden', 8.00),
('Beauty & Health', 10.00),
('Sports & Outdoors', 12.00),
('Toys & Games', 5.00),
('Books & Media', 0.00),
('Automotive', 8.00),
('General Goods', 5.00)
ON CONFLICT (name) DO NOTHING;

-- Insert test footer settings
INSERT INTO footer_settings (company_name, company_description, primary_phone, secondary_phone, primary_email, support_email, primary_address, secondary_address, business_hours, social_twitter, social_facebook, social_instagram, social_linkedin, website_logo_url, hero_banner_url, hero_headline, hero_subheadline, hero_cta_text, hero_cta_link, how_it_works_steps, value_props) VALUES
('iWishBag', 'Your trusted partner for international shopping and delivery', '+1-555-0123', '+1-555-0124', 'hello@iwishbag.com', 'support@iwishbag.com', '123 Main St, New York, NY 10001', '456 Business Ave, San Francisco, CA 94102', 'Mon-Fri: 9AM-6PM EST', 'https://twitter.com/iwishbag', 'https://facebook.com/iwishbag', 'https://instagram.com/iwishbag', 'https://linkedin.com/company/iwishbag', 'https://iwishbag.com/logo.png', 'https://iwishbag.com/hero-banner.jpg', 'Shop Globally, Delivered Locally', 'Get anything from anywhere in the world delivered to your doorstep', 'Get Started', '/quote', '[
  {
    "title": "Find Your Product",
    "description": "Search for any product from global marketplaces",
    "icon": "Search"
  },
  {
    "title": "Get Your Quote",
    "description": "Receive a detailed quote with shipping and customs",
    "icon": "Calculator"
  },
  {
    "title": "Place Your Order",
    "description": "We handle the purchase and shipping for you",
    "icon": "ShoppingCart"
  },
  {
    "title": "Track & Receive",
    "description": "Track your package and receive it at your doorstep",
    "icon": "Truck"
  }
]', '[
  {
    "title": "Global Access",
    "description": "Shop from any country or marketplace worldwide",
    "icon": "Globe"
  },
  {
    "title": "Transparent Pricing",
    "description": "No hidden fees - see exactly what you pay",
    "icon": "DollarSign"
  },
  {
    "title": "Secure Shipping",
    "description": "Professional packaging and reliable delivery",
    "icon": "Shield"
  },
  {
    "title": "24/7 Support",
    "description": "Get help anytime with our customer support team",
    "icon": "Headphones"
  }
]')
ON CONFLICT (id) DO NOTHING;

-- Insert test shipping routes
INSERT INTO shipping_routes (origin_country, destination_country, base_shipping_cost, cost_per_kg, cost_percentage, carriers) VALUES
('US', 'IN', 30.00, 10.00, 2.5, '[
  {"name": "DHL", "cost_multiplier": 1.0, "days": "7-10"},
  {"name": "FedEx", "cost_multiplier": 0.9, "days": "8-12"}
]'),
('US', 'NP', 35.00, 12.00, 3.0, '[
  {"name": "DHL", "cost_multiplier": 1.0, "days": "10-14"},
  {"name": "FedEx", "cost_multiplier": 0.9, "days": "12-16"}
]'),
('IN', 'US', 40.00, 15.00, 3.5, '[
  {"name": "DHL", "cost_multiplier": 1.0, "days": "8-12"},
  {"name": "FedEx", "cost_multiplier": 0.9, "days": "10-14"}
]');

-- Sync auth.users to profiles table after seed
-- This ensures all authenticated users have a profile entry with email
DO $$
BEGIN
  -- Insert any missing profiles from auth.users
  INSERT INTO public.profiles (id, email, full_name, created_at, updated_at)
  SELECT 
    au.id,
    au.email,
    COALESCE(au.raw_user_meta_data->>'full_name', split_part(au.email, '@', 1)) as full_name,
    au.created_at,
    au.updated_at
  FROM auth.users au
  LEFT JOIN public.profiles p ON p.id = au.id
  WHERE p.id IS NULL
    AND au.email IS NOT NULL;

  -- Update existing profiles that don't have email set
  UPDATE public.profiles p
  SET email = au.email
  FROM auth.users au
  WHERE p.id = au.id
    AND p.email IS NULL
    AND au.email IS NOT NULL;
    
  -- Update iwbtracking@gmail.com profile with a proper name if it exists
  UPDATE public.profiles 
  SET full_name = 'IWB Tracking' 
  WHERE email = 'iwbtracking@gmail.com' AND (full_name IS NULL OR full_name = '');
END $$;

-- Verify database schema is correct for anonymous quotes
-- This checks that migrations have been applied correctly
DO $$
DECLARE
  v_user_id_nullable boolean;
  v_email_nullable boolean;
BEGIN
  -- Check if user_id column is nullable
  SELECT is_nullable = 'YES' INTO v_user_id_nullable
  FROM information_schema.columns 
  WHERE table_schema = 'public' 
    AND table_name = 'quotes' 
    AND column_name = 'user_id';
    
  -- Check if email column is nullable  
  SELECT is_nullable = 'YES' INTO v_email_nullable
  FROM information_schema.columns 
  WHERE table_schema = 'public' 
    AND table_name = 'quotes' 
    AND column_name = 'email';
    
  -- Raise notice about the current state
  IF NOT v_user_id_nullable THEN
    RAISE NOTICE 'WARNING: quotes.user_id is NOT NULL - admin quote creation may fail!';
    RAISE NOTICE 'Run migration 20250708000013_consolidate_anonymous_quotes.sql to fix this.';
  END IF;
  
  IF NOT v_email_nullable THEN
    RAISE NOTICE 'WARNING: quotes.email is NOT NULL - anonymous quote creation may fail!';
    RAISE NOTICE 'Run migration 20250708000013_consolidate_anonymous_quotes.sql to fix this.';
  END IF;
  
  IF v_user_id_nullable AND v_email_nullable THEN
    RAISE NOTICE 'Schema check passed: Anonymous quotes are properly supported.';
  END IF;
END $$;

-- Verify critical functions exist
DO $$
DECLARE
  v_function_count integer;
BEGIN
  -- Check for critical functions
  SELECT COUNT(*) INTO v_function_count
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public' 
    AND p.proname IN ('generate_display_id', 'get_shipping_cost', 'expire_quotes', 'has_role', 'handle_new_user', 'get_all_user_emails');
    
  IF v_function_count < 6 THEN
    RAISE NOTICE 'WARNING: Some critical functions are missing! Expected 6, found %', v_function_count;
    RAISE NOTICE 'Missing functions may include: generate_display_id, get_shipping_cost, expire_quotes, has_role, handle_new_user, get_all_user_emails';
  ELSE
    RAISE NOTICE 'Function check passed: All critical functions exist.';
  END IF;
  
  -- Check for critical tables with data
  PERFORM 1 FROM customs_categories LIMIT 1;
  IF NOT FOUND THEN
    RAISE NOTICE 'WARNING: customs_categories table is empty - quote calculations may fail!';
  END IF;
  
  PERFORM 1 FROM country_settings LIMIT 1;
  IF NOT FOUND THEN
    RAISE NOTICE 'WARNING: country_settings table is empty - shipping calculations may fail!';
  END IF;
  
  PERFORM 1 FROM system_settings WHERE setting_key = 'quote_statuses' LIMIT 1;
  IF NOT FOUND THEN
    RAISE NOTICE 'WARNING: quote_statuses not configured in system_settings!';
  END IF;
END $$;

-- Insert test customer profiles with names (commented out due to foreign key constraints)
-- INSERT INTO profiles (id, full_name, cod_enabled, internal_notes, created_at) VALUES
-- ('550e8400-e29b-41d4-a716-446655440001', 'John Smith', true, 'VIP customer - high value orders', NOW() - INTERVAL '30 days'),
-- ('550e8400-e29b-41d4-a716-446655440002', 'Sarah Johnson', false, 'New customer - first order pending', NOW() - INTERVAL '15 days'),
-- ('550e8400-e29b-41d4-a716-446655440003', 'Michael Brown', true, 'Regular customer - COD enabled', NOW() - INTERVAL '7 days'),
-- ('550e8400-e29b-41d4-a716-446655440004', 'Emily Davis', false, 'Customer from India', NOW() - INTERVAL '3 days'),
-- ('550e8400-e29b-41d4-a716-446655440005', 'David Wilson', true, 'VIP customer - multiple orders', NOW() - INTERVAL '1 day');

-- Insert test customer addresses (commented out due to foreign key constraints)
-- INSERT INTO user_addresses (id, user_id, address_line1, address_line2, city, state_province_region, postal_code, country, is_default, created_at) VALUES
-- ('660e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001', '123 Main Street', 'Apt 4B', 'New York', 'NY', '10001', 'US', true, NOW()),
-- ('660e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440002', '456 Oak Avenue', NULL, 'Los Angeles', 'CA', '90210', 'US', true, NOW()),
-- ('660e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440003', '789 Pine Road', 'Suite 12', 'Chicago', 'IL', '60601', 'US', true, NOW()),
-- ('660e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440004', '321 Elm Street', NULL, 'Mumbai', 'Maharashtra', '400001', 'IN', true, NOW()),
-- ('660e8400-e29b-41d4-a716-446655440005', '550e8400-e29b-41d4-a716-446655440005', '654 Maple Drive', 'Floor 3', 'Toronto', 'ON', 'M5V 3A8', 'CA', true, NOW());
