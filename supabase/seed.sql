-- Seed data for development and testing

-- Clean tables before seeding
DELETE FROM public.footer_settings;
DELETE FROM system_settings;
DELETE FROM email_templates;
DELETE FROM payment_gateways;
DELETE FROM country_settings;
DELETE FROM shipping_routes;

-- Insert test countries
INSERT INTO country_settings (code, name, currency, rate_from_usd, sales_tax, vat, min_shipping, additional_shipping, additional_weight, weight_unit, volumetric_divisor, payment_gateway_fixed_fee, payment_gateway_percent_fee, purchase_allowed, shipping_allowed, payment_gateway) VALUES
('US', 'United States', 'USD', 1.0, 0.08, 0, 10, 0, 2, 'lbs', 5000, 0, 2.9, true, true, 'stripe'),
('IN', 'India', 'INR', 83.0, 0, 0.18, 500, 0, 100, 'kg', 5000, 0, 2.5, true, true, 'payu'),
('NP', 'Nepal', 'NPR', 133.0, 0, 0.13, 1000, 0, 200, 'kg', 5000, 0, 1.5, true, true, 'esewa'),
('JP', 'Japan', 'JPY', 150.0, 0, 0.10, 1500, 0, 200, 'kg', 5000, 0, 2.9, true, true, 'stripe');

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
]', 'Order status configuration')
ON CONFLICT (setting_key) DO NOTHING;

-- Insert test footer settings
INSERT INTO footer_settings (company_name, company_description, primary_phone, secondary_phone, primary_email, support_email, primary_address, secondary_address, business_hours, social_twitter, social_facebook, social_instagram, social_linkedin, website_logo_url, hero_banner_url, hero_headline, hero_subheadline, hero_cta_text, hero_cta_link, how_it_works_steps, value_props) VALUES
('iWishBag', 'Your trusted partner for international shopping and delivery', '+1-555-0123', '+1-555-0124', 'hello@iwishbag.com', 'support@iwishbag.com', '123 Main St, New York, NY 10001', '456 Business Ave, San Francisco, CA 94102', 'Mon-Fri: 9AM-6PM EST', 'https://twitter.com/iwishbag', 'https://facebook.com/iwishbag', 'https://instagram.com/iwishbag', 'https://linkedin.com/company/iwishbag', 'https://iwishbag.com/logo.png', 'https://iwishbag.com/hero-banner.jpg', 'Shop Globally, Delivered Locally', 'Get anything from anywhere in the world delivered to your doorstep', 'Get Started', '/quote', '[
  {"step": 1, "title": "Find your product", "description": "Tell us what you want to buy"},
  {"step": 2, "title": "Get a quote", "description": "We provide transparent pricing"},
  {"step": 3, "title": "Place order", "description": "Pay securely and track your order"}
]', '[
  {"title": "Global Access", "description": "Shop from any international website"},
  {"title": "Transparent Pricing", "description": "No hidden fees or surprises"},
  {"title": "Secure Payments", "description": "Multiple secure payment options"},
  {"title": "Fast Delivery", "description": "Quick and reliable shipping worldwide"}
]');

-- Insert test shipping routes
INSERT INTO shipping_routes (origin_country, destination_country, base_shipping_cost, cost_per_kg, shipping_per_kg, cost_percentage, processing_days, customs_clearance_days, weight_unit, delivery_options, weight_tiers, carriers, max_weight, restricted_items, requires_documentation, is_active) VALUES
('US', 'IN', 25.00, 5.00, 3.00, 2.5, 2, 3, 'kg', '[
  {"id": "express", "name": "Express Delivery", "carrier": "DHL", "min_days": 3, "max_days": 5, "price": 45.00, "active": true},
  {"id": "standard", "name": "Standard Delivery", "carrier": "FedEx", "min_days": 7, "max_days": 12, "price": 25.00, "active": true},
  {"id": "economy", "name": "Economy Delivery", "carrier": "USPS", "min_days": 14, "max_days": 21, "price": 15.00, "active": true}
]', '[
  {"min": 0, "max": 1, "cost": 15.00},
  {"min": 1, "max": 3, "cost": 25.00},
  {"min": 3, "max": 5, "cost": 35.00},
  {"min": 5, "max": null, "cost": 45.00}
]', '[
  {"name": "DHL", "costMultiplier": 1.0, "days": "3-5"},
  {"name": "FedEx", "costMultiplier": 0.9, "days": "5-7"},
  {"name": "USPS", "costMultiplier": 0.7, "days": "7-14"}
]', 50.0, ARRAY['liquids', 'batteries'], false, true),
('US', 'NP', 30.00, 6.00, 4.00, 3.0, 3, 4, 'kg', '[
  {"id": "express", "name": "Express Delivery", "carrier": "DHL", "min_days": 4, "max_days": 6, "price": 55.00, "active": true},
  {"id": "standard", "name": "Standard Delivery", "carrier": "FedEx", "min_days": 8, "max_days": 14, "price": 30.00, "active": true}
]', '[
  {"min": 0, "max": 1, "cost": 20.00},
  {"min": 1, "max": 3, "cost": 30.00},
  {"min": 3, "max": 5, "cost": 40.00},
  {"min": 5, "max": null, "cost": 50.00}
]', '[
  {"name": "DHL", "costMultiplier": 1.0, "days": "4-6"},
  {"name": "FedEx", "costMultiplier": 0.9, "days": "8-14"}
]', 40.0, ARRAY['liquids', 'batteries'], false, true);
