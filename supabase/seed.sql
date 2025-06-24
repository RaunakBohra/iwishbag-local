-- Seed data for development and testing

-- Insert test countries
INSERT INTO country_settings (code, name, currency, rate_from_usd, sales_tax, vat, min_shipping, additional_shipping, additional_weight, weight_unit, volumetric_divisor, payment_gateway_fixed_fee, payment_gateway_percent_fee, purchase_allowed, shipping_allowed, payment_gateway) VALUES
('US', 'United States', 'USD', 1.0, 0.08, 0, 10, 0, 2, 'lbs', 5000, 0, 2.9, true, true, 'stripe'),
('IN', 'India', 'INR', 83.0, 0, 0.18, 500, 0, 100, 'kg', 5000, 0, 2.5, true, true, 'payu'),
('NP', 'Nepal', 'NPR', 133.0, 0, 0.13, 1000, 0, 200, 'kg', 5000, 0, 1.5, true, true, 'esewa'),
('JP', 'Japan', 'JPY', 150.0, 0, 0.10, 1500, 0, 200, 'kg', 5000, 0, 2.9, true, true, 'stripe')
ON CONFLICT (code) DO NOTHING;

-- Insert test payment gateways
INSERT INTO payment_gateways (code, name, description, is_active, supported_countries, supported_currencies, fee_percent, fee_fixed, config, test_mode) VALUES
('stripe', 'Stripe', 'International payment processing', true, ARRAY['US', 'IN', 'NP', 'JP'], ARRAY['USD', 'INR', 'NPR', 'JPY'], 2.9, 0.30, '{"publishable_key": "pk_test_...", "secret_key": "sk_test_..."}', true),
('payu', 'PayU', 'Indian payment gateway', true, ARRAY['IN'], ARRAY['INR'], 2.5, 0, '{"merchant_key": "test_key", "salt_key": "test_salt"}', true),
('esewa', 'eSewa', 'Nepali digital wallet', true, ARRAY['NP'], ARRAY['NPR'], 1.5, 0, '{"merchant_id": "test_id", "merchant_key": "test_key"}', true)
ON CONFLICT (code) DO NOTHING;

-- Insert test customs categories
INSERT INTO customs_categories (name, duty_percent) VALUES
('Electronics', 5.00),
('Clothing', 15.00),
('Books', 0.00),
('Food', 20.00)
ON CONFLICT (name) DO NOTHING;

-- Insert test email templates
INSERT INTO email_templates (name, subject, html_content, template_type, variables) VALUES
('quote_confirmation', 'Your Quote Request Confirmation', 'Dear {{customer_name}},<br><br>Thank you for your quote request for {{product_name}}.<br><br>We will review your request and get back to you within 24 hours.<br><br>Quote ID: {{quote_id}}<br>Estimated Total: {{estimated_total}}<br><br>Best regards,<br>iWishBag Team', 'quote_notification', '{"customer_name": "string", "product_name": "string", "quote_id": "string", "estimated_total": "string"}'),
('order_confirmation', 'Order Confirmation - {{order_id}}', 'Dear {{customer_name}},<br><br>Your order has been confirmed!<br><br>Order ID: {{order_id}}<br>Total Amount: {{total_amount}}<br>Payment Method: {{payment_method}}<br><br>We will keep you updated on your order status.<br><br>Best regards,<br>iWishBag Team', 'order_notification', '{"customer_name": "string", "order_id": "string", "total_amount": "string", "payment_method": "string"}'),
('cart_abandonment_recovery', 'Complete Your Purchase - Your Cart is Waiting!', 'Hi there!<br><br>We noticed you left some items in your cart. Don''t let them get away!<br><br>Your cart contains {product_name} worth {cart_value}.<br><br>Complete your purchase now and enjoy your items!<br><br>Best regards,<br>The Team', 'cart_abandonment', '{"product_name": "string", "cart_value": "string"}'),
('cart_abandonment_discount', 'Special Offer - 10% Off Your Abandoned Cart!', 'Hi there!<br><br>We noticed you left some items in your cart. As a special offer, we''re giving you 10% off!<br><br>Your cart contains {product_name} worth {cart_value}.<br>With your discount: {discounted_value}<br><br>Use code: ABANDON10<br><br>Complete your purchase now!<br><br>Best regards,<br>The Team', 'cart_abandonment', '{"product_name": "string", "cart_value": "string", "discounted_value": "string"}')
ON CONFLICT (name) DO NOTHING;

-- Insert test system settings
INSERT INTO system_settings (setting_key, setting_value, description) VALUES
('site_name', 'iWishBag', 'Website name'),
('site_description', 'Shop internationally and get anything delivered to your doorstep', 'Website description'),
('default_currency', 'USD', 'Default currency for the platform'),
('support_email', 'support@iwishbag.com', 'Customer support email'),
('max_quote_amount', '10000', 'Maximum quote amount in USD'),
('auto_approval_limit', '100', 'Auto-approval limit for quotes in USD')
ON CONFLICT (setting_key) DO NOTHING;

-- Insert test footer settings
INSERT INTO public.footer_settings (
  company_name, company_description, primary_phone, secondary_phone,
  primary_email, support_email, primary_address, secondary_address,
  business_hours, social_twitter, social_facebook, social_instagram,
  social_linkedin, website_logo_url, hero_banner_url, hero_headline,
  hero_subheadline, hero_cta_text, hero_cta_link, how_it_works_steps,
  value_props
)
SELECT
  'iWishBag',
  'Your trusted partner for international shopping and delivery',
  '+1-555-0123',
  '+1-555-0124',
  'info@iwishbag.com',
  'support@iwishbag.com',
  '123 Main Street, New York, NY 10001',
  '456 Business Ave, San Francisco, CA 94102',
  '{"monday": "9:00 AM - 6:00 PM", "tuesday": "9:00 AM - 6:00 PM", "wednesday": "9:00 AM - 6:00 PM", "thursday": "9:00 AM - 6:00 PM", "friday": "9:00 AM - 6:00 PM", "saturday": "10:00 AM - 4:00 PM", "sunday": "Closed"}',
  'https://twitter.com/iwishbag',
  'https://facebook.com/iwishbag',
  'https://instagram.com/iwishbag',
  'https://linkedin.com/company/iwishbag',
  'https://res.cloudinary.com/dto2xew5c/image/upload/v1749986460/iWishBag-india-logo_zqv8gs.png',
  'https://res.cloudinary.com/dto2xew5c/image/upload/v1749986460/hero-banner.jpg',
  'Shop The World',
  'Get anything delivered to your doorstep from international shopping websites',
  'Get Started',
  '/quote',
  '[{"step": 1, "title": "Request Quote", "description": "Tell us what you want to buy"}, {"step": 2, "title": "Get Pricing", "description": "We provide transparent pricing"}, {"step": 3, "title": "Place Order", "description": "Pay securely and track your order"}]',
  '[{"title": "Global Access", "description": "Shop from any international website"}, {"title": "Transparent Pricing", "description": "No hidden fees or surprises"}, {"title": "Secure Payments", "description": "Multiple secure payment options"}, {"title": "Fast Delivery", "description": "Quick and reliable shipping worldwide"}]'
WHERE NOT EXISTS (SELECT 1 FROM public.footer_settings);

-- Insert test rejection reasons
INSERT INTO rejection_reasons (reason, category) VALUES
('Restricted Item', 'customs'),
('High Value', 'value'),
('Unavailable', 'availability'),
('Pricing Issue', 'pricing')
ON CONFLICT (reason) DO NOTHING;

-- Insert test membership tiers
INSERT INTO membership_tiers (name, description, monthly_price, annual_price, benefits, free_shipping_threshold, service_fee_discount, priority_processing) VALUES
('Basic', 'Standard membership with basic benefits', 0, 0, '{"basic_support": true}', 100, 0, false),
('Premium', 'Enhanced membership with priority benefits', 9.99, 99.99, '{"priority_support": true, "advanced_analytics": true}', 50, 10, true),
('VIP', 'Exclusive membership with premium benefits', 29.99, 299.99, '{"dedicated_support": true, "custom_integrations": true, "white_label": true}', 0, 25, true)
ON CONFLICT (name) DO NOTHING;