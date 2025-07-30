-- Seed data for development and testing with HSN system support

-- Clean tables before seeding (HSN-aware)
DELETE FROM system_settings;
DELETE FROM email_templates;
DELETE FROM payment_gateways;
DELETE FROM bank_account_details;
DELETE FROM country_settings;
DELETE FROM shipping_routes;

-- Clean HSN system tables (if they exist)
DELETE FROM admin_overrides WHERE true;
DELETE FROM unified_configuration WHERE true;
DELETE FROM hsn_master WHERE true;

-- Insert test countries
INSERT INTO country_settings (code, name, currency, rate_from_usd, sales_tax, vat, min_shipping, additional_shipping, additional_weight, weight_unit, volumetric_divisor, payment_gateway_fixed_fee, payment_gateway_percent_fee, purchase_allowed, shipping_allowed, payment_gateway, priority_thresholds) VALUES
('US', 'United States', 'USD', 1.0, 0.08, 0, 10, 0, 2, 'lbs', 5000, 0, 2.9, true, true, 'stripe', '{"low": 0, "normal": 500, "urgent": 2000}'),
('IN', 'India', 'INR', 83.0, 0, 0.18, 500, 0, 100, 'kg', 5000, 0, 2.5, true, true, 'payu', '{"low": 0, "normal": 41500, "urgent": 166000}'),
('NP', 'Nepal', 'NPR', 133.0, 0, 0.13, 1000, 0, 200, 'kg', 5000, 0, 1.5, true, true, 'esewa', '{"low": 0, "normal": 66500, "urgent": 266000}'),
('CN', 'China', 'CNY', 21.0, 0, 0.10, 1500, 0, 200, 'kg', 5000, 0, 2.9, true, true, 'stripe', '{"low": 0, "normal": 75000, "urgent": 300000}'),


-- Insert comprehensive payment gateways
INSERT INTO payment_gateways (code, name, description, is_active, supported_countries, supported_currencies, fee_percent, fee_fixed, config, test_mode) VALUES
-- Stripe for international payments
('stripe', 'Stripe', 'International payment gateway supporting cards and multiple currencies', true, ARRAY['US', 'CA', 'GB', 'AU', 'DE', 'FR', 'IT', 'ES', 'NL', 'SG', 'JP', 'IN'], ARRAY['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'SGD', 'AED', 'SAR', 'EGP', 'TRY'], 2.9, 0.30, '{"test_publishable_key": "pk_test_placeholder", "test_secret_key": "sk_test_placeholder", "environment": "test"}', true),
-- PayU for India
('payu', 'PayU', 'Leading payment gateway in India supporting cards, UPI, net banking, and wallets', true, ARRAY['IN'], ARRAY['INR'], 2.5, 0, '{"merchant_key": "test_payu_key", "salt_key": "test_payu_salt", "environment": "test"}', true),
-- eSewa for Nepal
('esewa', 'eSewa', 'Nepal''s most popular digital wallet and payment service', true, ARRAY['NP'], ARRAY['NPR'], 1.5, 0, '{"merchant_id": "test_esewa_merchant", "secret_key": "test_esewa_secret", "environment": "test"}', true),
-- Khalti for Nepal (alternative)
('khalti', 'Khalti', 'Nepal''s digital wallet service', true, ARRAY['NP'], ARRAY['NPR'], 2.0, 0, '{"public_key": "test_khalti_public", "secret_key": "test_khalti_secret", "environment": "test"}', true),
-- Fonepay for Nepal
('fonepay', 'Fonepay', 'Nepal''s mobile payment network', true, ARRAY['NP'], ARRAY['NPR'], 1.5, 0, '{"merchant_code": "test_fonepay_merchant", "username": "test_user", "password": "test_pass", "environment": "test"}', true),
-- Airwallex for international
('airwallex', 'Airwallex', 'Global payments infrastructure for modern businesses', true, ARRAY['US', 'CA', 'GB', 'AU', 'DE', 'FR', 'IT', 'ES', 'NL', 'SG', 'JP', 'HK', 'CN'], ARRAY['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'SGD', 'AED', 'SAR', 'EGP', 'TRY'], 1.8, 0.30, '{"client_id": "test_airwallex_client", "api_key": "test_airwallex_key", "environment": "demo"}', true),
-- PayPal for international
('paypal', 'PayPal', 'Global payment platform supporting multiple countries and currencies', true, ARRAY['US', 'CA', 'GB', 'AU', 'DE', 'FR', 'IT', 'ES', 'NL', 'SG', 'JP', 'IN'], ARRAY['USD', 'CAD', 'GBP', 'AUD', 'EUR', 'SGD', 'JPY', 'INR'], 3.4, 30, '{"client_id": "test_paypal_client", "client_secret": "test_paypal_secret", "environment": "sandbox"}', true),
-- Razorpay for India
('razorpay', 'Razorpay', 'Complete payments solution for Indian businesses', true, ARRAY['IN'], ARRAY['INR'], 2.0, 0, '{"key_id": "test_razorpay_key", "key_secret": "test_razorpay_secret", "environment": "test"}', true),
-- Bank Transfer (Universal)
('bank_transfer', 'Bank Transfer', 'Direct bank transfer with manual verification', true, ARRAY['US', 'CA', 'GB', 'AU', 'IN', 'NP', 'SG', 'JP', 'MY', 'TH', 'PH', 'ID', 'VN', 'KR'], ARRAY['USD', 'CAD', 'GBP', 'AUD', 'INR', 'NPR', 'SGD', 'JPY', 'MYR', 'THB', 'PHP', 'IDR', 'VND', 'KRW'], 0, 0, '{"requires_manual_verification": true, "processing_time": "1-3 business days"}', false),

-- Cash on Delivery (for supported regions)
('cod', 'Cash on Delivery', 'Pay with cash upon delivery', true, ARRAY['IN', 'NP', 'MY', 'TH', 'PH', 'ID', 'VN'], ARRAY['INR', 'NPR', 'MYR', 'THB', 'PHP', 'IDR', 'VND'], 0, 50, '{"max_amount_inr": 50000, "max_amount_npr": 80000, "verification_required": true}', false),
-- UPI for India
('upi', 'UPI', 'Unified Payments Interface for instant bank transfers', true, ARRAY['IN'], ARRAY['INR'], 0, 0, '{"vpa": "test@upi", "environment": "test"}', true),
-- Paytm for India
('paytm', 'Paytm', 'Leading mobile payments and financial services', true, ARRAY['IN'], ARRAY['INR'], 1.99, 0, '{"merchant_id": "test_paytm_merchant", "merchant_key": "test_paytm_key", "environment": "test"}', true),
-- GrabPay for Southeast Asia
('grabpay', 'GrabPay', 'Southeast Asia''s leading mobile wallet', true, ARRAY['SG', 'MY', 'TH', 'PH', 'VN', 'ID'], ARRAY['SGD', 'MYR', 'THB', 'PHP', 'VND', 'IDR'], 1.5, 0, '{"partner_id": "test_grab_partner", "partner_key": "test_grab_key", "environment": "test"}', true),
-- Alipay for China
('alipay', 'Alipay', 'China''s leading mobile and online payment platform', true, ARRAY['CN', 'HK', 'SG', 'MY', 'TH', 'PH', 'ID', 'IN'], ARRAY['CNY', 'HKD', 'SGD', 'MYR', 'THB', 'PHP', 'IDR', 'INR'], 1.8, 0, '{"partner_id": "test_alipay_partner", "private_key": "test_alipay_key", "environment": "test"}', true)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  is_active = EXCLUDED.is_active,
  supported_countries = EXCLUDED.supported_countries,
  supported_currencies = EXCLUDED.supported_currencies,
  fee_percent = EXCLUDED.fee_percent,
  fee_fixed = EXCLUDED.fee_fixed,
  config = EXCLUDED.config,
  test_mode = EXCLUDED.test_mode;

-- Insert test email templates
INSERT INTO email_templates (name, subject, html_content, template_type, variables) VALUES
('quote_confirmation', 'Your Quote Request Confirmation', 'Dear {{customer_name}},<br><br>Thank you for your quote request for {{product_name}}.<br><br>We will review your request and get back to you within 24 hours.<br><br>Quote ID: {{quote_id}}<br>Estimated Total: {{estimated_total}}<br><br>Best regards,<br>iWishBag Team', 'quote_notification', '{"customer_name": "string", "product_name": "string", "quote_id": "string", "estimated_total": "string"}'),
('order_confirmation', 'Order Confirmation - {{order_id}}', 'Dear {{customer_name}},<br><br>Your order has been confirmed!<br><br>Order ID: {{order_id}}<br>Total Amount: {{total_amount}}<br>Payment Method: {{payment_method}}<br><br>We will keep you updated on your order status.<br><br>Best regards,<br>iWishBag Team', 'order_notification', '{"customer_name": "string", "order_id": "string", "total_amount": "string", "payment_method": "string"}'),
('cart_abandonment_recovery', 'Complete Your Purchase - Your Cart is Waiting!', 'Hi there!<br><br>We noticed you left some items in your cart. Don''t let them get away!<br><br>Your cart contains {product_name} worth {cart_value}.<br><br>Complete your purchase now and enjoy your items!<br><br>Best regards,<br>The Team', 'cart_abandonment', '{"product_name": "string", "cart_value": "string"}'),
('cart_abandonment_discount', 'Special Offer - 10% Off Your Abandoned Cart!', 'Hi there!<br><br>We noticed you left some items in your cart. As a special offer, we''re giving you 10% off!<br><br>Your cart contains {product_name} worth {cart_value}.<br>With your discount: {discounted_value}<br><br>Use code: ABANDON10<br><br>Complete your purchase now!<br><br>Best regards,<br>The Team', 'cart_abandonment', '{"product_name": "string", "cart_value": "string", "discounted_value": "string"}'),
('bank_transfer_pending', 'Bank Transfer Instructions - Order {{order_id}}', 'Dear {{customer_name}},<br><br>Thank you for your order! Please complete the bank transfer to process your order.<br><br><strong>Order Details:</strong><br>Order ID: {{order_id}}<br>Total Amount: {{total_amount}} {{currency}}<br><br><strong>Bank Details:</strong><br>{{bank_details}}<br><br><strong>Important:</strong><br>• Please use your Order ID ({{order_id}}) as the payment reference<br>• Send payment confirmation to {{support_email}}<br>• Your order will be processed within 24 hours of payment confirmation<br><br>If you have any questions, please contact us.<br><br>Best regards,<br>iWishBag Team', 'payment_notification', '{"customer_name": "string", "order_id": "string", "total_amount": "string", "currency": "string", "bank_details": "string", "support_email": "string"}'),
('cod_order_confirmed', 'Cash on Delivery Order Confirmed - {{order_id}}', 'Dear {{customer_name}},<br><br>Your Cash on Delivery order has been confirmed!<br><br><strong>Order Details:</strong><br>Order ID: {{order_id}}<br>Total Amount: {{total_amount}} {{currency}}<br>Delivery Address: {{delivery_address}}<br><br><strong>What happens next:</strong><br>• We will process your order within 24 hours<br>• You will receive tracking information once shipped<br>• Payment will be collected upon delivery<br>• Please keep {{total_amount}} {{currency}} ready in cash<br><br>Thank you for choosing iWishBag!<br><br>Best regards,<br>iWishBag Team', 'order_notification', '{"customer_name": "string", "order_id": "string", "total_amount": "string", "currency": "string", "delivery_address": "string"}'),
('payment_received', 'Payment Received - Order {{order_id}}', 'Dear {{customer_name}},<br><br>Great news! We have received your payment.<br><br><strong>Payment Details:</strong><br>Order ID: {{order_id}}<br>Amount Paid: {{amount_paid}} {{currency}}<br>Payment Method: {{payment_method}}<br>Status: {{payment_status}}<br><br>Your order is now being processed and you will receive shipping information soon.<br><br>Thank you for your payment!<br><br>Best regards,<br>iWishBag Team', 'payment_notification', '{"customer_name": "string", "order_id": "string", "amount_paid": "string", "currency": "string", "payment_method": "string", "payment_status": "string"}'),
('partial_payment_received', 'Partial Payment Received - Order {{order_id}}', 'Dear {{customer_name}},<br><br>We have received a partial payment for your order.<br><br><strong>Payment Details:</strong><br>Order ID: {{order_id}}<br>Total Amount: {{total_amount}} {{currency}}<br>Amount Paid: {{amount_paid}} {{currency}}<br>Remaining Balance: {{remaining_amount}} {{currency}}<br><br><strong>Next Steps:</strong><br>Please pay the remaining balance of {{remaining_amount}} {{currency}} to process your order.<br><br>{{bank_details}}<br><br>If you have any questions about this payment, please contact us.<br><br>Best regards,<br>iWishBag Team', 'payment_notification', '{"customer_name": "string", "order_id": "string", "total_amount": "string", "amount_paid": "string", "remaining_amount": "string", "currency": "string", "bank_details": "string"}'),
('overpayment_received', 'Overpayment Received - Order {{order_id}}', 'Dear {{customer_name}},<br><br>We have received your payment. However, the amount paid exceeds your order total.<br><br><strong>Payment Details:</strong><br>Order ID: {{order_id}}<br>Order Total: {{total_amount}} {{currency}}<br>Amount Paid: {{amount_paid}} {{currency}}<br>Excess Amount: {{excess_amount}} {{currency}}<br><br><strong>Refund Options:</strong><br>• We can refund the excess amount to your original payment method<br>• Keep as credit for future orders<br>• Apply to another pending order<br><br>Please reply to this email with your preference or contact our support team.<br><br>Best regards,<br>iWishBag Team', 'payment_notification', '{"customer_name": "string", "order_id": "string", "total_amount": "string", "amount_paid": "string", "excess_amount": "string", "currency": "string"}'),
('payment_reminder_1', 'Payment Reminder - Order {{order_id}}', 'Dear {{customer_name}},<br><br>This is a friendly reminder that we are still waiting for your payment.<br><br><strong>Order Details:</strong><br>Order ID: {{order_id}}<br>Total Amount: {{total_amount}} {{currency}}<br>Days Pending: 3 days<br><br>{{bank_details}}<br><br>Please complete your payment soon to avoid order cancellation.<br><br>If you have already made the payment, please send us the confirmation.<br><br>Best regards,<br>iWishBag Team', 'payment_reminder', '{"customer_name": "string", "order_id": "string", "total_amount": "string", "currency": "string", "bank_details": "string"}'),
('payment_reminder_2', 'Second Payment Reminder - Order {{order_id}}', 'Dear {{customer_name}},<br><br>We haven''t received your payment yet. Your order has been pending for 7 days.<br><br><strong>Order Details:</strong><br>Order ID: {{order_id}}<br>Total Amount: {{total_amount}} {{currency}}<br><br><strong>⚠️ Important:</strong> Your order will be cancelled in 7 days if payment is not received.<br><br>{{bank_details}}<br><br>Please complete your payment as soon as possible.<br><br>Need help? Contact us at {{support_email}}<br><br>Best regards,<br>iWishBag Team', 'payment_reminder', '{"customer_name": "string", "order_id": "string", "total_amount": "string", "currency": "string", "bank_details": "string", "support_email": "string"}'),
('payment_reminder_final', 'Final Payment Reminder - Order {{order_id}}', 'Dear {{customer_name}},<br><br><strong>⚠️ FINAL NOTICE: Your order will be cancelled tomorrow if payment is not received.</strong><br><br>Order ID: {{order_id}}<br>Total Amount: {{total_amount}} {{currency}}<br>Days Pending: 14 days<br><br>This is your final reminder. Please make the payment today to keep your order active.<br><br>{{bank_details}}<br><br>After tomorrow, you will need to place a new order.<br><br>If you no longer wish to proceed with this order, please let us know.<br><br>Best regards,<br>iWishBag Team', 'payment_reminder', '{"customer_name": "string", "order_id": "string", "total_amount": "string", "currency": "string", "bank_details": "string"}');

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
('support_email', 'info@iwishbag.com', 'Customer support email'),
('max_quote_amount', '1000000', 'Maximum quote amount in USD'),
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
  }
 
]', 'Quote status configuration'),
('order_statuses', '[
  {
    "id": "payment_pending",
    "name": "payment_pending",
    "label": "Payment Pending",
    "description": "Awaiting bank transfer payment confirmation",
    "color": "secondary",
    "icon": "Clock",
    "isActive": true,
    "order": 1,
    "allowedTransitions": ["partial_payment", "paid", "cancelled"],
    "isTerminal": false,
    "category": "order",
    "triggersEmail": true,
    "emailTemplate": "bank_transfer_pending",
    "requiresAction": true,
    "showsInQuotesList": true,
    "showsInOrdersList": false,
    "canBePaid": false
  },
  {
    "id": "partial_payment",
    "name": "partial_payment",
    "label": "Partial Payment",
    "description": "Partial payment received",
    "color": "warning",
    "icon": "AlertTriangle",
    "isActive": true,
    "order": 2,
    "allowedTransitions": ["paid", "cancelled"],
    "isTerminal": false,
    "category": "order",
    "triggersEmail": false,
    "requiresAction": true,
    "showsInQuotesList": false,
    "showsInOrdersList": true,
    "canBePaid": false
  },
  {
    "id": "processing",
    "name": "processing",
    "label": "Processing",
    "description": "Order is being processed (Cash on Delivery)",
    "color": "default",
    "icon": "Package",
    "isActive": true,
    "order": 3,
    "allowedTransitions": ["ordered", "shipped", "cancelled"],
    "isTerminal": false,
    "category": "order",
    "triggersEmail": true,
    "emailTemplate": "cod_order_confirmed",
    "requiresAction": false,
    "showsInQuotesList": false,
    "showsInOrdersList": true,
    "canBePaid": false
  },
  {
    "id": "paid",
    "name": "paid",
    "label": "Paid",
    "description": "Payment has been received",
    "color": "default",
    "icon": "DollarSign",
    "isActive": true,
    "order": 4,
    "allowedTransitions": ["ordered", "cancelled"],
    "isTerminal": false,
    "category": "order",
    "triggersEmail": true,
    "emailTemplate": "payment_received",
    "requiresAction": true,
    "showsInQuotesList": false,
    "showsInOrdersList": true,
    "canBePaid": false
  },
  {
    "id": "ordered",
    "name": "ordered",
    "label": "Ordered",
    "description": "Order has been placed with merchant",
    "color": "default",
    "icon": "ShoppingCart",
    "isActive": true,
    "order": 5,
    "allowedTransitions": ["shipped", "cancelled"],
    "isTerminal": false,
    "category": "order",
    "triggersEmail": true,
    "emailTemplate": "order_placed",
    "requiresAction": false,
    "showsInQuotesList": false,
    "showsInOrdersList": true,
    "canBePaid": false
  },
  {
    "id": "shipped",
    "name": "shipped",
    "label": "Shipped",
    "description": "Order has been shipped",
    "color": "secondary",
    "icon": "Truck",
    "isActive": true,
    "order": 6,
    "allowedTransitions": ["completed", "cancelled"],
    "isTerminal": false,
    "category": "order",
    "triggersEmail": true,
    "emailTemplate": "order_shipped",
    "requiresAction": false,
    "showsInQuotesList": false,
    "showsInOrdersList": true,
    "canBePaid": false
  },
  {
    "id": "completed",
    "name": "completed",
    "label": "Completed",
    "description": "Order has been delivered",
    "color": "outline",
    "icon": "CheckCircle",
    "isActive": true,
    "order": 7,
    "allowedTransitions": [],
    "isTerminal": true,
    "category": "order",
    "triggersEmail": true,
    "emailTemplate": "order_completed",
    "requiresAction": false,
    "showsInQuotesList": false,
    "showsInOrdersList": true,
    "canBePaid": false
  },
  {
    "id": "cancelled",
    "name": "cancelled",
    "label": "Cancelled",
    "description": "Quote or order has been cancelled",
    "color": "destructive",
    "icon": "XCircle",
    "isActive": true,
    "order": 8,
    "allowedTransitions": [],
    "isTerminal": true,
    "category": "order",
    "triggersEmail": true,
    "emailTemplate": "order_cancelled",
    "requiresAction": false,
    "showsInQuotesList": true,
    "showsInOrdersList": true,
    "canBePaid": false
  }
]', 'Order status configuration'),
('exchange_rate_markup_percentage', '2.5', 'Exchange rate markup percentage applied to all currency conversions'),
('auto_exchange_rate_enabled', 'true', 'Enable automatic exchange rate updates'),
('exchange_rate_update_interval_hours', '24', 'Interval in hours for automatic exchange rate updates'),
('wishlist_enabled', 'true', 'Enable wishlist feature for users'),
('email_notifications_enabled', 'true', 'Enable system-wide email notifications'),
('payment_reminder_intervals', '[3, 7, 14]', 'Days after order to send payment reminders'),
('partial_payment_allowed', 'true', 'Whether to accept partial payments'),
('overpayment_handling', 'refund', 'How to handle overpayments: refund, credit, or manual'),
('bank_transfer_timeout_days', '15', 'Days before cancelling unpaid bank transfer orders'),
('cod_available_countries', '["IN", "NP"]', 'Countries where COD is available'),
('default_payment_instructions', '{"bank_transfer": "Please use your Order ID as the payment reference. Send payment confirmation to info@iwishbag.com", "cod": "Please keep the exact amount ready in cash. Our delivery partner will collect the payment upon delivery."}', 'Default payment instructions by method')
ON CONFLICT (setting_key) DO NOTHING;

-- Insert bank accounts for different countries
INSERT INTO bank_account_details (country_code, currency_code, bank_name, account_name, account_number, swift_code, custom_fields, is_active) VALUES
-- India (INR) - Axis Bank
('IN', 'INR', 'Axis Bank - Current', 'iWB Enterprises', '924020057946752', NULL, '{"ifsc": "UTIB0000056"}', true),
-- Nepal (NPR) - Citizens Bank
('NP', 'NPR', 'Citizens Bank - Teku', 'I WISH BAG', '1780100000613201', NULL, '{}', true),
-- USA (USD) - Community Federal Savings Bank
('US', 'USD', 'Community Federal Savings Bank', 'IWISHBAG PTE. LTD.', '8456220037', NULL, '{"ach": "026073150", "bank_address": "89-16 Jamaica Ave, Woodhaven, NY, United States, 11421"}', true);

-- Create storage buckets for file uploads
DO $$
BEGIN
  -- Create product-images bucket if it doesn't exist
  INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  VALUES 
    ('product-images', 'product-images', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
  ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

  -- Create message-attachments bucket if it doesn't exist
  INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  VALUES 
    ('message-attachments', 'message-attachments', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'])
  ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;
    
  RAISE NOTICE 'Storage buckets created/updated successfully';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error creating storage buckets: %', SQLERRM;
END $$;

-- Set up RLS policies for storage buckets
DO $$
BEGIN
  -- Policies for product-images bucket
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Enable read access for all users'
  ) THEN
    CREATE POLICY "Enable read access for all users" ON storage.objects
      FOR SELECT USING (bucket_id = 'product-images');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Enable upload for authenticated users'
  ) THEN
    CREATE POLICY "Enable upload for authenticated users" ON storage.objects
      FOR INSERT WITH CHECK (bucket_id = 'product-images' AND public.is_authenticated());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Enable update for users who uploaded'
  ) THEN
    CREATE POLICY "Enable update for users who uploaded" ON storage.objects
      FOR UPDATE USING (bucket_id = 'product-images' AND auth.uid() = owner);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Enable delete for users who uploaded'
  ) THEN
    CREATE POLICY "Enable delete for users who uploaded" ON storage.objects
      FOR DELETE USING (bucket_id = 'product-images' AND auth.uid() = owner);
  END IF;

  -- Policies for message-attachments bucket
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Enable read access for all users on message attachments'
  ) THEN
    CREATE POLICY "Enable read access for all users on message attachments" ON storage.objects
      FOR SELECT USING (bucket_id = 'message-attachments');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Enable upload for authenticated users on message attachments'
  ) THEN
    CREATE POLICY "Enable upload for authenticated users on message attachments" ON storage.objects
      FOR INSERT WITH CHECK (bucket_id = 'message-attachments' AND public.is_authenticated());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Enable update for users who uploaded message attachments'
  ) THEN
    CREATE POLICY "Enable update for users who uploaded message attachments" ON storage.objects
      FOR UPDATE USING (bucket_id = 'message-attachments' AND auth.uid() = owner);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Enable delete for users who uploaded message attachments'
  ) THEN
    CREATE POLICY "Enable delete for users who uploaded message attachments" ON storage.objects
      FOR DELETE USING (bucket_id = 'message-attachments' AND auth.uid() = owner);
  END IF;
  
  RAISE NOTICE 'Storage RLS policies created successfully';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error creating storage policies: %', SQLERRM;
END $$;

-- Customs categories removed - HSN system provides better customs duty rates


-- Insert test shipping routes
INSERT INTO shipping_routes (origin_country, destination_country, base_shipping_cost, cost_per_kg, cost_percentage, carriers) VALUES
('US', 'IN', 12.00, 11.00, 2.5, '[
  {"name": "DHL", "cost_multiplier": 5.0, "days": "7-10"}
]'),
('US', 'NP', 12.00, 11.00, 2.5, '[
  {"name": "GSH", "cost_multiplier": 5.0, "days": "10-14"},
  {"name": "GExpress", "cost_multiplier": 5.0, "days": "10-14"}
]'),
('IN', 'NP', 450.00, 400.00, 2.5, '[
  {"name": "Chain Express", "cost_multiplier": 5.0, "days": "8-12"}
]');

-- Sync auth.users to profiles table after seed
-- This ensures all authenticated users have a profile entry with email
-- Updated to allow auto-set functionality by not defaulting to US/USD
DO $$
BEGIN
  -- Insert any missing profiles from auth.users
  INSERT INTO public.profiles (id, email, full_name, country, preferred_display_currency, created_at, updated_at)
  SELECT 
    au.id,
    au.email,
    COALESCE(au.raw_user_meta_data->>'full_name', split_part(au.email, '@', 1)) as full_name,
    au.raw_user_meta_data->>'country',  -- Only set if explicitly provided
    au.raw_user_meta_data->>'currency', -- Only set if explicitly provided
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
  SET full_name = 'Raunak Bohra' 
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
  PERFORM 1 FROM country_settings LIMIT 1;
  IF NOT FOUND THEN
    RAISE NOTICE 'WARNING: country_settings table is empty - shipping calculations may fail!';
  END IF;
  
  PERFORM 1 FROM system_settings WHERE setting_key = 'quote_statuses' LIMIT 1;
  IF NOT FOUND THEN
    RAISE NOTICE 'WARNING: quote_statuses not configured in system_settings!';
  END IF;
END $$;

-- Verify payment system migrations
DO $$
DECLARE
  v_message_type_exists boolean;
  v_recipient_nullable boolean;
  v_payment_proof_count integer;
BEGIN
  -- Check if message_type column exists
  SELECT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'messages' 
      AND column_name = 'message_type'
  ) INTO v_message_type_exists;
  
  -- Check if recipient_id is nullable
  SELECT is_nullable = 'YES' 
  INTO v_recipient_nullable
  FROM information_schema.columns 
  WHERE table_schema = 'public' 
    AND table_name = 'messages' 
    AND column_name = 'recipient_id';
  
  -- Check for any payment proof messages
  IF v_message_type_exists THEN
    SELECT COUNT(*) INTO v_payment_proof_count
    FROM messages 
    WHERE message_type = 'payment_proof';
  ELSE
    v_payment_proof_count := 0;
  END IF;
  
  -- Report findings
  IF NOT v_message_type_exists THEN
    RAISE NOTICE 'WARNING: messages.message_type column does not exist!';
    RAISE NOTICE 'Run migration 20250109100001_add_message_type.sql to add payment proof support.';
  ELSE
    RAISE NOTICE 'Payment system check: message_type column exists ✓';
    RAISE NOTICE 'Payment proof messages found: %', v_payment_proof_count;
  END IF;
  
  IF NOT v_recipient_nullable THEN
    RAISE NOTICE 'WARNING: messages.recipient_id is NOT NULL - admin broadcast messages will fail!';
    RAISE NOTICE 'Run migration 20250109100000_fix_messages_recipient_nullable.sql to fix this.';
  ELSE
    RAISE NOTICE 'Message system check: recipient_id is nullable ✓';
  END IF;
  
  -- Summary
  IF v_message_type_exists AND v_recipient_nullable THEN
    RAISE NOTICE 'Payment proof system: All migrations applied successfully ✓';
    
    -- Show sample query for viewing payment proofs
    RAISE NOTICE 'To view payment proof messages, run:';
    RAISE NOTICE 'SELECT id, subject, message_type, attachment_url FROM messages WHERE message_type = ''payment_proof'';';
  ELSE
    RAISE NOTICE 'Payment proof system: Some migrations need to be applied!';
  END IF;
END $$;

-- Verify storage buckets exist
DO $$
DECLARE
  v_product_images_exists boolean;
  v_message_attachments_exists boolean;
BEGIN
  -- Check for product-images bucket
  SELECT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'product-images'
  ) INTO v_product_images_exists;
  
  -- Check for message-attachments bucket
  SELECT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'message-attachments'
  ) INTO v_message_attachments_exists;
  
  -- Report findings
  IF NOT v_product_images_exists THEN
    RAISE NOTICE 'WARNING: product-images storage bucket does not exist!';
  ELSE
    RAISE NOTICE 'Storage check: product-images bucket exists ✓';
  END IF;
  
  IF NOT v_message_attachments_exists THEN
    RAISE NOTICE 'WARNING: message-attachments storage bucket does not exist!';
  ELSE
    RAISE NOTICE 'Storage check: message-attachments bucket exists ✓';
  END IF;
  
  IF v_product_images_exists AND v_message_attachments_exists THEN
    RAISE NOTICE 'Storage system: All buckets configured correctly ✓';
  END IF;
END $$;

-- ============================================================================
-- AUTOMATIC SCHEMA VERIFICATION AND REPAIR
-- This section automatically fixes missing columns and functions after database resets
-- ============================================================================

-- Auto-apply schema verification migration if it exists
DO $$
DECLARE
  v_migration_path text := 'supabase/migrations/20250716120000_schema_verification_and_repair.sql';
  v_result text;
BEGIN
  -- Check if the verification functions exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.routines 
    WHERE routine_schema = 'public' 
    AND routine_name = 'verify_complete_schema'
  ) THEN
    RAISE NOTICE '🔧 Schema verification functions not found, applying migration...';
    -- Note: In practice, this would need to be done via the migration system
    -- For now, we'll inline the critical repair functions
  END IF;
  
  -- Inline schema verification and repair (essential columns only)
  -- Fix quotes table missing columns
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'quotes' 
    AND column_name = 'destination_country'
  ) THEN
    ALTER TABLE public.quotes ADD COLUMN destination_country VARCHAR(2);
    RAISE NOTICE '✅ Added destination_country column to quotes table';
    
    -- Migrate data from country_code if available
    UPDATE public.quotes 
    SET destination_country = country_code 
    WHERE destination_country IS NULL AND country_code IS NOT NULL;
  END IF;
  
  -- Fix origin_country column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'quotes' 
    AND column_name = 'origin_country'
  ) THEN
    ALTER TABLE public.quotes ADD COLUMN origin_country VARCHAR(2) DEFAULT 'US';
    RAISE NOTICE '✅ Added origin_country column to quotes table';
  END IF;
  
  -- Fix customer_name column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'quotes' 
    AND column_name = 'customer_name'
  ) THEN
    ALTER TABLE public.quotes ADD COLUMN customer_name TEXT;
    RAISE NOTICE '✅ Added customer_name column to quotes table';
  END IF;
  
  -- Fix breakdown column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'quotes' 
    AND column_name = 'breakdown'
  ) THEN
    ALTER TABLE public.quotes ADD COLUMN breakdown JSONB;
    RAISE NOTICE '✅ Added breakdown column to quotes table';
  END IF;
  
  -- Fix delivery_addresses table missing columns
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'delivery_addresses' 
    AND column_name = 'phone'
  ) THEN
    ALTER TABLE public.delivery_addresses ADD COLUMN phone TEXT;
    RAISE NOTICE '✅ Added phone column to delivery_addresses table';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'delivery_addresses' 
    AND column_name = 'recipient_name'
  ) THEN
    ALTER TABLE public.delivery_addresses ADD COLUMN recipient_name TEXT;
    RAISE NOTICE '✅ Added recipient_name column to delivery_addresses table';
  END IF;
  
  -- Fix profiles table missing email column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'email'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN email TEXT;
    RAISE NOTICE '✅ Added email column to profiles table';
    
    -- Populate email from auth.users for existing profiles
    UPDATE profiles 
    SET email = au.email 
    FROM auth.users au 
    WHERE profiles.id = au.id 
    AND profiles.email IS NULL;
  END IF;
  
  -- Verify user profile creation trigger exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'on_auth_user_created'
  ) THEN
    CREATE TRIGGER on_auth_user_created 
    AFTER INSERT ON auth.users 
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
    RAISE NOTICE '✅ Created user profile creation trigger';
  END IF;
  
  -- Remove item_currency column if it still exists (sync with cloud)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'quote_items' 
    AND column_name = 'item_currency'
  ) THEN
    ALTER TABLE public.quote_items DROP COLUMN item_currency;
    RAISE NOTICE '✅ Removed item_currency column from quote_items table';
  END IF;
  
  -- Update status configuration to match working cloud configuration
  UPDATE system_settings 
  SET setting_value = '[{\"id\": \"pending\", \"icon\": \"Clock\", \"name\": \"pending\", \"color\": \"secondary\", \"label\": \"Pending\", \"order\": 1, \"category\": \"quote\", \"isActive\": true, \"isTerminal\": false, \"description\": \"Quote request is awaiting review\", \"allowedTransitions\": [\"sent\", \"rejected\"]}, {\"id\": \"sent\", \"icon\": \"FileText\", \"name\": \"sent\", \"color\": \"outline\", \"label\": \"Sent\", \"order\": 2, \"category\": \"quote\", \"isActive\": true, \"isTerminal\": false, \"description\": \"Quote has been sent to customer\", \"autoExpireHours\": 168, \"allowedTransitions\": [\"approved\", \"rejected\", \"expired\"]}, {\"id\": \"approved\", \"icon\": \"CheckCircle\", \"name\": \"approved\", \"color\": \"default\", \"label\": \"Approved\", \"order\": 3, \"category\": \"quote\", \"isActive\": true, \"isTerminal\": false, \"description\": \"Customer has approved the quote\", \"allowedTransitions\": [\"rejected\"]}, {\"id\": \"rejected\", \"icon\": \"XCircle\", \"name\": \"rejected\", \"color\": \"destructive\", \"label\": \"Rejected\", \"order\": 4, \"category\": \"quote\", \"isActive\": true, \"isTerminal\": true, \"description\": \"Quote has been rejected\", \"allowedTransitions\": [\"approved\"]}, {\"id\": \"expired\", \"icon\": \"AlertTriangle\", \"name\": \"expired\", \"color\": \"destructive\", \"label\": \"Expired\", \"order\": 5, \"category\": \"quote\", \"isActive\": true, \"isTerminal\": true, \"description\": \"Quote has expired\", \"allowedTransitions\": [\"approved\"]}, {\"id\": \"calculated\", \"icon\": \"Calculator\", \"name\": \"calculated\", \"color\": \"secondary\", \"label\": \"Calculated\", \"order\": 6, \"category\": \"quote\", \"isActive\": true, \"isTerminal\": false, \"description\": \"Quote has been calculated and is ready for review\", \"allowedTransitions\": [\"sent\", \"approved\", \"rejected\"]}]'
  WHERE setting_key = 'quote_statuses';
  
  UPDATE system_settings 
  SET setting_value = '[{\"id\":\"partial_payment\",\"name\":\"partial_payment\",\"label\":\"Partial Payment\",\"description\":\"Partial payment received\",\"color\":\"warning\",\"icon\":\"AlertTriangle\",\"isActive\":true,\"order\":2,\"allowedTransitions\":[\"paid\",\"cancelled\"],\"isTerminal\":false,\"category\":\"order\",\"triggersEmail\":false,\"requiresAction\":true,\"showsInQuotesList\":false,\"showsInOrdersList\":true,\"canBePaid\":false},{\"id\":\"processing\",\"name\":\"processing\",\"label\":\"Processing\",\"description\":\"Order is being processed (Cash on Delivery)\",\"color\":\"default\",\"icon\":\"Package\",\"isActive\":true,\"order\":3,\"allowedTransitions\":[\"ordered\",\"shipped\",\"cancelled\"],\"isTerminal\":false,\"category\":\"order\",\"triggersEmail\":true,\"emailTemplate\":\"cod_order_confirmed\",\"requiresAction\":false,\"showsInQuotesList\":false,\"showsInOrdersList\":true,\"canBePaid\":false},{\"id\":\"paid\",\"name\":\"paid\",\"label\":\"Paid\",\"description\":\"Payment has been received\",\"color\":\"default\",\"icon\":\"DollarSign\",\"isActive\":true,\"order\":4,\"allowedTransitions\":[\"ordered\",\"cancelled\"],\"isTerminal\":false,\"category\":\"order\",\"triggersEmail\":true,\"emailTemplate\":\"payment_received\",\"requiresAction\":true,\"showsInQuotesList\":false,\"showsInOrdersList\":true,\"canBePaid\":false},{\"id\":\"ordered\",\"name\":\"ordered\",\"label\":\"Ordered\",\"description\":\"Order has been placed with merchant\",\"color\":\"default\",\"icon\":\"ShoppingCart\",\"isActive\":true,\"order\":5,\"allowedTransitions\":[\"shipped\",\"cancelled\"],\"isTerminal\":false,\"category\":\"order\",\"triggersEmail\":true,\"emailTemplate\":\"order_placed\",\"requiresAction\":false,\"showsInQuotesList\":false,\"showsInOrdersList\":true,\"canBePaid\":false},{\"id\":\"shipped\",\"name\":\"shipped\",\"label\":\"Shipped\",\"description\":\"Order has been shipped\",\"color\":\"secondary\",\"icon\":\"Truck\",\"isActive\":true,\"order\":6,\"allowedTransitions\":[\"completed\",\"cancelled\"],\"isTerminal\":false,\"category\":\"order\",\"triggersEmail\":true,\"emailTemplate\":\"order_shipped\",\"requiresAction\":false,\"showsInQuotesList\":false,\"showsInOrdersList\":true,\"canBePaid\":false},{\"id\":\"completed\",\"name\":\"completed\",\"label\":\"Completed\",\"description\":\"Order has been delivered\",\"color\":\"outline\",\"icon\":\"CheckCircle\",\"isActive\":true,\"order\":7,\"allowedTransitions\":[],\"isTerminal\":true,\"category\":\"order\",\"triggersEmail\":true,\"emailTemplate\":\"order_completed\",\"requiresAction\":false,\"showsInQuotesList\":false,\"showsInOrdersList\":true,\"canBePaid\":false},{\"id\":\"cancelled\",\"name\":\"cancelled\",\"label\":\"Cancelled\",\"description\":\"Quote or order has been cancelled\",\"color\":\"destructive\",\"icon\":\"XCircle\",\"isActive\":true,\"order\":8,\"allowedTransitions\":[],\"isTerminal\":true,\"category\":\"order\",\"triggersEmail\":true,\"emailTemplate\":\"order_cancelled\",\"requiresAction\":false,\"showsInQuotesList\":true,\"showsInOrdersList\":true,\"canBePaid\":false},{\"id\":\"payment_pending\",\"name\":\"payment_pending\",\"label\":\"Awaiting Payment\",\"description\":\"Order placed, awaiting payment verification\",\"color\":\"outline\",\"icon\":\"Clock\",\"isActive\":true,\"order\":1,\"allowedTransitions\":[\"paid\",\"ordered\",\"cancelled\"],\"isTerminal\":false,\"category\":\"order\",\"triggersEmail\":true,\"emailTemplate\":\"payment_instructions\",\"requiresAction\":false,\"showsInQuotesList\":false,\"showsInOrdersList\":true,\"canBePaid\":false,\"allowEdit\":false,\"allowApproval\":false,\"allowRejection\":false,\"allowCartActions\":false,\"allowCancellation\":true,\"allowRenewal\":false,\"allowShipping\":false,\"allowAddressEdit\":true,\"showInCustomerView\":true,\"showInAdminView\":true,\"showExpiration\":false,\"isSuccessful\":false,\"countsAsOrder\":true,\"progressPercentage\":70,\"customerMessage\":\"Order placed - Please complete payment\",\"customerActionText\":\"Pay Now\",\"cssClass\":\"status-payment-pending\",\"badgeVariant\":\"outline\"}]'
  WHERE setting_key = 'order_statuses';
  
  RAISE NOTICE '✅ Updated status configuration to match working cloud setup';
  
  -- Create essential missing tables
  CREATE TABLE IF NOT EXISTS public.payment_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quote_id UUID REFERENCES quotes(id) NOT NULL,
    payment_transaction_id UUID REFERENCES payment_transactions(id),
    payment_date TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    payment_type TEXT NOT NULL,
    payment_method TEXT NOT NULL,
    gateway_code TEXT,
    gateway_transaction_id TEXT,
    amount DECIMAL(15,4) NOT NULL,
    currency TEXT NOT NULL,
    reference_number TEXT,
    bank_reference TEXT,
    customer_reference TEXT,
    status TEXT DEFAULT 'pending',
    verified_by UUID,
    verified_at TIMESTAMPTZ,
    financial_transaction_id UUID,
    parent_payment_id UUID,
    payment_proof_message_id UUID,
    gateway_response JSONB,
    metadata JSONB DEFAULT '{}',
    notes TEXT,
    created_by UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
  );
  
  CREATE TABLE IF NOT EXISTS public.quote_statuses (
    id SERIAL PRIMARY KEY,
    value TEXT NOT NULL UNIQUE,
    label TEXT NOT NULL,
    color TEXT,
    icon TEXT,
    is_active BOOLEAN DEFAULT true
  );
  
  -- Create indexes if they don't exist
  CREATE INDEX IF NOT EXISTS idx_payment_ledger_quote ON payment_ledger(quote_id);
  CREATE INDEX IF NOT EXISTS idx_payment_ledger_date ON payment_ledger(payment_date);
  CREATE INDEX IF NOT EXISTS idx_payment_ledger_status ON payment_ledger(status);
  CREATE INDEX IF NOT EXISTS idx_payment_ledger_method ON payment_ledger(payment_method);
  CREATE INDEX IF NOT EXISTS idx_payment_ledger_gateway ON payment_ledger(gateway_code);
  
  -- Enable RLS if not already enabled
  ALTER TABLE payment_ledger ENABLE ROW LEVEL SECURITY;
  ALTER TABLE quote_statuses ENABLE ROW LEVEL SECURITY;
  
  RAISE NOTICE '✅ Created essential missing tables (payment_ledger, quote_statuses)';
  
  RAISE NOTICE '🎉 Automatic schema verification and repair completed!';
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '⚠️ Error during automatic schema repair: %', SQLERRM;
    RAISE NOTICE '💡 You may need to run: ./fix-database-schema.sh local';
END $$;

-- ============================================================================
-- PERMISSIONS SYSTEM SEED DATA
-- Comprehensive permissions, roles, and role mappings for the new permissions system
-- This data will persist through database resets
-- ============================================================================

-- Clean existing permissions data before seeding (safe because of foreign key constraints)
DELETE FROM role_permissions;
DELETE FROM permissions;
DELETE FROM roles;

-- Seed permissions table with comprehensive permissions
INSERT INTO permissions (name, description) VALUES
    ('quote:create', 'Create new quotes'),
    ('quote:edit', 'Edit existing quotes'),
    ('quote:delete', 'Delete quotes'),
    ('quote:view', 'View quotes'),
    ('quote:approve', 'Approve quotes'),
    ('quote:reject', 'Reject quotes'),
    ('quote:calculate', 'Calculate quote pricing'),
    ('quote:share', 'Share quotes with customers'),
    ('user:assign_role', 'Assign roles to users'),
    ('user:view', 'View user information'),
    ('user:edit', 'Edit user information'),
    ('user:delete', 'Delete users'),
    ('admin:dashboard', 'Access admin dashboard'),
    ('admin:settings', 'Manage system settings'),
    ('admin:reports', 'View system reports'),
    ('payment:view', 'View payment information'),
    ('payment:process', 'Process payments'),
    ('payment:refund', 'Process refunds'),
    ('payment:verify', 'Verify payment proofs'),
    ('order:view', 'View orders'),
    ('order:edit', 'Edit orders'),
    ('order:fulfill', 'Fulfill orders'),
    ('order:cancel', 'Cancel orders'),
    ('customer:view', 'View customer information'),
    ('customer:edit', 'Edit customer information'),
    ('customer:create', 'Create customer profiles'),
    ('customer:delete', 'Delete customer profiles'),
    ('support:view', 'View support tickets'),
    ('support:respond', 'Respond to support tickets'),
    ('support:assign', 'Assign support tickets'),
    ('support:create', 'Create support tickets'),
    ('support:delete', 'Delete support tickets'),
    ('messaging:view', 'View messages'),
    ('messaging:send', 'Send messages'),
    ('messaging:admin_broadcast', 'Send admin broadcast messages'),
    ('shipping:view', 'View shipping information'),
    ('shipping:edit', 'Edit shipping routes and rates'),
    ('shipping:track', 'Track shipments'),
    ('country:view', 'View country settings'),
    ('country:edit', 'Edit country settings'),
    ('system:backup', 'Create system backups'),
    ('system:maintenance', 'Perform system maintenance'),
    ('system:monitoring', 'Monitor system health'),
    ('email:view', 'View email templates'),
    ('email:edit', 'Edit email templates'),
    ('email:send', 'Send emails'),
    ('customs:view', 'View customs categories'),
    ('customs:edit', 'Edit customs categories'),
    ('bank:view', 'View bank account details'),
    ('bank:edit', 'Edit bank account details'),
    ('ml:view', 'View ML weight estimator'),
    ('ml:train', 'Train ML models'),
    ('blog:view', 'View blog posts'),
    ('blog:create', 'Create blog posts'),
    ('blog:edit', 'Edit blog posts'),
    ('blog:delete', 'Delete blog posts'),
    ('analytics:view', 'View analytics dashboard'),
    ('analytics:export', 'Export analytics data')
ON CONFLICT (name) DO NOTHING;

-- Seed roles table with comprehensive role structure
INSERT INTO roles (name, description) VALUES
    ('Admin', 'Full system administrator with all permissions'),
    ('Quote Manager', 'Manages quotes and customer interactions'),
    ('Finance Manager', 'Handles payments and financial operations'),
    ('Customer Support', 'Provides customer support and assistance'),
    ('Fulfillment Manager', 'Manages order fulfillment and shipping'),
    ('Marketing Manager', 'Manages blog content and marketing materials'),
    ('System Analyst', 'Views analytics and system reports'),
    ('User', 'Basic user with minimal permissions')
ON CONFLICT (name) DO NOTHING;

-- Assign ALL permissions to Admin role
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
    r.id as role_id,
    p.id as permission_id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'Admin'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Assign permissions to Quote Manager role
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
    r.id as role_id,
    p.id as permission_id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'Quote Manager'
AND p.name IN (
    'quote:create', 'quote:edit', 'quote:view', 'quote:approve', 'quote:reject', 'quote:calculate', 'quote:share',
    'customer:view', 'customer:edit', 'customer:create',
    'order:view', 'order:edit',
    'support:view', 'support:respond', 'support:create',
    'messaging:view', 'messaging:send',
    'shipping:view', 'country:view', 'customs:view'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Assign permissions to Finance Manager role
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
    r.id as role_id,
    p.id as permission_id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'Finance Manager'
AND p.name IN (
    'payment:view', 'payment:process', 'payment:refund', 'payment:verify',
    'quote:view', 'order:view',
    'customer:view',
    'bank:view', 'bank:edit',
    'analytics:view', 'analytics:export'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Assign permissions to Customer Support role
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
    r.id as role_id,
    p.id as permission_id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'Customer Support'
AND p.name IN (
    'support:view', 'support:respond', 'support:assign', 'support:create',
    'customer:view', 'customer:edit', 'customer:create',
    'quote:view', 'order:view',
    'messaging:view', 'messaging:send',
    'shipping:view', 'shipping:track'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Assign permissions to Fulfillment Manager role
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
    r.id as role_id,
    p.id as permission_id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'Fulfillment Manager'
AND p.name IN (
    'order:view', 'order:edit', 'order:fulfill', 'order:cancel',
    'quote:view', 'customer:view',
    'shipping:view', 'shipping:edit', 'shipping:track',
    'messaging:view', 'messaging:send'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Assign permissions to Marketing Manager role
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
    r.id as role_id,
    p.id as permission_id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'Marketing Manager'
AND p.name IN (
    'blog:view', 'blog:create', 'blog:edit', 'blog:delete',
    'email:view', 'email:edit', 'email:send',
    'customer:view', 'analytics:view',
    'messaging:view', 'messaging:send', 'messaging:admin_broadcast'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Assign permissions to System Analyst role
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
    r.id as role_id,
    p.id as permission_id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'System Analyst'
AND p.name IN (
    'analytics:view', 'analytics:export',
    'system:monitoring',
    'quote:view', 'order:view', 'customer:view',
    'payment:view', 'shipping:view'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Assign permissions to User role (basic permissions)
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
    r.id as role_id,
    p.id as permission_id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'User'
AND p.name IN (
    'quote:create', 'quote:view',
    'messaging:view', 'messaging:send',
    'support:create', 'support:view'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- ============================================================================
-- HSN SYSTEM COMPREHENSIVE SEED DATA
-- Enhanced seed data for HSN-based per-item tax calculation system
-- ============================================================================

DO $$
BEGIN
  -- Only populate HSN data if tables exist (they might not in fresh installs)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'hsn_master') THEN
    
    RAISE NOTICE '🏷️ Populating HSN Master Database with comprehensive product classifications...';
    
    -- Electronics HSN codes with currency conversion support
    INSERT INTO hsn_master (hsn_code, description, category, subcategory, keywords, minimum_valuation_usd, requires_currency_conversion, weight_data, tax_data, classification_data) VALUES
    
    -- Mobile Phones and Communication Devices
    ('8517', 'Mobile phones and smartphones', 'electronics', 'communication_devices', 
     ARRAY['mobile', 'phone', 'iphone', 'samsung', 'smartphone', 'cellular', 'android'],
     50.00, true,
     '{"typical_weights": {"per_unit": {"min": 0.120, "max": 0.250, "average": 0.180}}, "packaging": {"additional_weight": 0.05}, "dimensional_weight": {"length": 15, "width": 8, "height": 2}}'::jsonb,
     '{"typical_rates": {"customs": {"min": 15, "max": 25, "common": 20}, "gst": {"standard": 18}, "vat": {"common": 13}}, "exemptions": []}'::jsonb,
     '{"auto_classification": {"keywords": ["iphone", "samsung", "mobile", "smartphone", "android", "ios"], "confidence": 0.95}, "ml_features": ["screen_size", "storage", "brand"]}'::jsonb),
    
    -- Computers and Laptops
    ('8471', 'Computers, laptops and notebooks', 'electronics', 'computers',
     ARRAY['laptop', 'computer', 'macbook', 'dell', 'hp', 'asus', 'notebook', 'pc'],
     100.00, true,
     '{"typical_weights": {"per_unit": {"min": 1.000, "max": 3.500, "average": 1.800}}, "packaging": {"additional_weight": 0.30}, "dimensional_weight": {"length": 35, "width": 25, "height": 5}}'::jsonb,
     '{"typical_rates": {"customs": {"min": 10, "max": 20, "common": 15}, "gst": {"standard": 18}, "vat": {"common": 13}}, "exemptions": []}'::jsonb,
     '{"auto_classification": {"keywords": ["laptop", "macbook", "computer", "notebook", "gaming"], "confidence": 0.92}, "ml_features": ["ram", "storage", "processor"]}'::jsonb),
    
    -- Tablets and iPads
    ('8471', 'Tablets and iPads', 'electronics', 'tablets',
     ARRAY['tablet', 'ipad', 'android tablet', 'surface', 'kindle'],
     75.00, true,
     '{"typical_weights": {"per_unit": {"min": 0.300, "max": 0.800, "average": 0.500}}, "packaging": {"additional_weight": 0.08}, "dimensional_weight": {"length": 25, "width": 18, "height": 1}}'::jsonb,
     '{"typical_rates": {"customs": {"min": 15, "max": 20, "common": 18}, "gst": {"standard": 18}, "vat": {"common": 13}}, "exemptions": []}'::jsonb,
     '{"auto_classification": {"keywords": ["tablet", "ipad", "surface", "kindle"], "confidence": 0.90}, "ml_features": ["screen_size", "storage"]}'::jsonb),
    
    -- Clothing HSN codes (Critical for Nepal minimum valuation example)
    ('6109', 'T-shirts, tank tops and similar garments', 'clothing', 'tops',
     ARRAY['tshirt', 't-shirt', 'shirt', 'tee', 'polo', 'tank top', 'vest'],
     5.00, true,
     '{"typical_weights": {"per_unit": {"min": 0.100, "max": 0.300, "average": 0.180}}, "packaging": {"additional_weight": 0.02}, "dimensional_weight": {"folded": true}}'::jsonb,
     '{"typical_rates": {"customs": {"min": 10, "max": 15, "common": 12}, "gst": {"standard": 12}, "vat": {"common": 13}}, "exemptions": []}'::jsonb,
     '{"auto_classification": {"keywords": ["tshirt", "t-shirt", "shirt", "polo", "cotton"], "confidence": 0.88}, "ml_features": ["material", "size", "brand"]}'::jsonb),
    
    -- Kurtas and Dresses (Nepal minimum valuation example: $10 USD)
    ('6204', 'Kurtas, dresses and similar womens garments', 'clothing', 'dresses',
     ARRAY['dress', 'kurti', 'kurta', 'gown', 'frock', 'ethnic wear', 'traditional'],
     10.00, true, -- Critical: Nepal kurta minimum valuation
     '{"typical_weights": {"per_unit": {"min": 0.200, "max": 0.600, "average": 0.350}}, "packaging": {"additional_weight": 0.03}, "dimensional_weight": {"folded": true}}'::jsonb,
     '{"typical_rates": {"customs": {"min": 10, "max": 15, "common": 12}, "gst": {"standard": 12}, "vat": {"common": 13}}, "exemptions": []}'::jsonb,
     '{"auto_classification": {"keywords": ["dress", "kurti", "kurta", "gown", "ethnic"], "confidence": 0.85}, "ml_features": ["material", "style", "length"]}'::jsonb),
    
    -- Jeans and Trousers
    ('6203', 'Jeans, trousers and pants', 'clothing', 'bottoms',
     ARRAY['jeans', 'pants', 'trousers', 'denim', 'chinos', 'cargo'],
     15.00, true,
     '{"typical_weights": {"per_unit": {"min": 0.400, "max": 0.800, "average": 0.600}}, "packaging": {"additional_weight": 0.05}, "dimensional_weight": {"folded": true}}'::jsonb,
     '{"typical_rates": {"customs": {"min": 12, "max": 18, "common": 15}, "gst": {"standard": 12}, "vat": {"common": 13}}, "exemptions": []}'::jsonb,
     '{"auto_classification": {"keywords": ["jeans", "pants", "trousers", "denim"], "confidence": 0.90}, "ml_features": ["material", "size", "fit"]}'::jsonb),
    
    -- Books (Tax-exempt in most countries)
    ('4901', 'Books, novels and printed educational materials', 'books', 'educational',
     ARRAY['book', 'novel', 'textbook', 'manual', 'guide', 'fiction', 'non-fiction'],
     NULL, false, -- No minimum valuation for books
     '{"typical_weights": {"per_unit": {"min": 0.100, "max": 1.500, "average": 0.400}}, "packaging": {"additional_weight": 0.05}, "dimensional_weight": {"standard_book": true}}'::jsonb,
     '{"typical_rates": {"customs": {"min": 0, "max": 5, "common": 0}, "gst": {"standard": 0}, "vat": {"common": 0}}, "exemptions": ["educational", "religious"]}'::jsonb,
     '{"auto_classification": {"keywords": ["book", "novel", "textbook", "manual", "isbn"], "confidence": 0.95}, "ml_features": ["isbn", "pages", "publisher"]}'::jsonb),
    
    -- Jewelry and Accessories
    ('7113', 'Jewelry, rings, necklaces and precious accessories', 'accessories', 'jewelry',
     ARRAY['jewelry', 'ring', 'necklace', 'bracelet', 'earring', 'pendant', 'chain'],
     25.00, true,
     '{"typical_weights": {"per_unit": {"min": 0.005, "max": 0.150, "average": 0.040}}, "packaging": {"additional_weight": 0.01, "protective": true}, "dimensional_weight": {"small_items": true}}'::jsonb,
     '{"typical_rates": {"customs": {"min": 15, "max": 25, "common": 20}, "gst": {"standard": 18}, "vat": {"common": 13}}, "exemptions": []}'::jsonb,
     '{"auto_classification": {"keywords": ["jewelry", "ring", "necklace", "gold", "silver"], "confidence": 0.82}, "ml_features": ["material", "weight", "precious_metal"]}'::jsonb),
    
    -- Watches
    ('9102', 'Wrist watches and smart watches', 'accessories', 'watches',
     ARRAY['watch', 'smartwatch', 'fitness tracker', 'apple watch', 'rolex', 'timepiece'],
     40.00, true,
     '{"typical_weights": {"per_unit": {"min": 0.030, "max": 0.200, "average": 0.080}}, "packaging": {"additional_weight": 0.05, "protective": true}, "dimensional_weight": {"watch_box": true}}'::jsonb,
     '{"typical_rates": {"customs": {"min": 18, "max": 25, "common": 22}, "gst": {"standard": 18}, "vat": {"common": 13}}, "exemptions": []}'::jsonb,
     '{"auto_classification": {"keywords": ["watch", "smartwatch", "fitness", "tracker"], "confidence": 0.88}, "ml_features": ["brand", "smart_features", "material"]}'::jsonb),
    
    -- Home and Garden
    ('9403', 'Furniture and home decor items', 'home_garden', 'furniture',
     ARRAY['furniture', 'chair', 'table', 'sofa', 'decor', 'lamp', 'cushion'],
     30.00, true,
     '{"typical_weights": {"per_unit": {"min": 0.500, "max": 25.000, "average": 5.000}}, "packaging": {"additional_weight": 1.00, "fragile": true}, "dimensional_weight": {"varies_greatly": true}}'::jsonb,
     '{"typical_rates": {"customs": {"min": 12, "max": 20, "common": 16}, "gst": {"standard": 18}, "vat": {"common": 13}}, "exemptions": []}'::jsonb,
     '{"auto_classification": {"keywords": ["furniture", "chair", "table", "sofa", "decor"], "confidence": 0.78}, "ml_features": ["material", "size", "type"]}'::jsonb),
    
    -- Sports and Fitness
    ('9506', 'Sports equipment and fitness gear', 'sports', 'equipment',
     ARRAY['sports', 'fitness', 'gym', 'equipment', 'ball', 'racket', 'weights'],
     20.00, true,
     '{"typical_weights": {"per_unit": {"min": 0.050, "max": 10.000, "average": 1.500}}, "packaging": {"additional_weight": 0.20}, "dimensional_weight": {"sports_equipment": true}}'::jsonb,
     '{"typical_rates": {"customs": {"min": 10, "max": 18, "common": 14}, "gst": {"standard": 18}, "vat": {"common": 13}}, "exemptions": []}'::jsonb,
     '{"auto_classification": {"keywords": ["sports", "fitness", "gym", "ball", "equipment"], "confidence": 0.80}, "ml_features": ["sport_type", "material", "brand"]}'::jsonb),
    
    -- Toys and Games
    ('9503', 'Toys, games and recreational items', 'toys', 'recreational',
     ARRAY['toy', 'game', 'puzzle', 'doll', 'action figure', 'board game', 'lego'],
     8.00, true,
     '{"typical_weights": {"per_unit": {"min": 0.020, "max": 2.000, "average": 0.300}}, "packaging": {"additional_weight": 0.10, "colorful": true}, "dimensional_weight": {"toy_packaging": true}}'::jsonb,
     '{"typical_rates": {"customs": {"min": 8, "max": 15, "common": 12}, "gst": {"standard": 12}, "vat": {"common": 13}}, "exemptions": ["educational_toys"]}'::jsonb,
     '{"auto_classification": {"keywords": ["toy", "game", "puzzle", "lego", "children"], "confidence": 0.85}, "ml_features": ["age_group", "material", "educational"]}'::jsonb),
    
    -- Beauty and Personal Care
    ('3304', 'Beauty products and cosmetics', 'beauty', 'cosmetics',
     ARRAY['cosmetics', 'makeup', 'skincare', 'perfume', 'lipstick', 'foundation'],
     12.00, true,
     '{"typical_weights": {"per_unit": {"min": 0.010, "max": 0.500, "average": 0.100}}, "packaging": {"additional_weight": 0.05, "fragile": true}, "dimensional_weight": {"cosmetic_packaging": true}}'::jsonb,
     '{"typical_rates": {"customs": {"min": 15, "max": 25, "common": 20}, "gst": {"standard": 18}, "vat": {"common": 13}}, "exemptions": []}'::jsonb,
     '{"auto_classification": {"keywords": ["cosmetics", "makeup", "skincare", "beauty"], "confidence": 0.83}, "ml_features": ["brand", "type", "ingredients"]}'::jsonb)
    
    ON CONFLICT (hsn_code) DO UPDATE SET
      description = EXCLUDED.description,
      category = EXCLUDED.category,
      subcategory = EXCLUDED.subcategory,
      keywords = EXCLUDED.keywords,
      minimum_valuation_usd = EXCLUDED.minimum_valuation_usd,
      requires_currency_conversion = EXCLUDED.requires_currency_conversion,
      weight_data = EXCLUDED.weight_data,
      tax_data = EXCLUDED.tax_data,
      classification_data = EXCLUDED.classification_data,
      updated_at = NOW();
    
    RAISE NOTICE '✅ HSN Master data populated with % comprehensive product classifications', 
      (SELECT COUNT(*) FROM hsn_master);
    
    -- Populate Unified Configuration for Countries
    RAISE NOTICE '🌍 Populating unified country configurations with HSN support...';
    
    INSERT INTO unified_configuration (config_type, config_key, config_data) VALUES
    -- India - GST system with HSN integration
    ('country', 'IN', '{
      "name": "India",
      "currency": "INR",
      "tax_system": "GST",
      "default_gst_rate": 18,
      "customs_rates": {
        "electronics": 20,
        "clothing": 12,
        "books": 0,
        "accessories": 18,
        "home_garden": 15,
        "sports": 14,
        "toys": 12,
        "beauty": 20
      },
      "minimum_valuations": {
        "applies_currency_conversion": true,
        "rounding_method": "up",
        "enforcement": "strict"
      },
      "hsn_system": {
        "mandatory": true,
        "government_api": true,
        "auto_classification": true
      },
      "api_endpoints": {
        "gst_lookup": "https://api.gst.gov.in/taxpayerapi/search/hsnsac",
        "customs_rate": "https://www.cbic.gov.in/htdocs-cbec/customs/cs-act/formatted-htmls/cs-tariff2017-v2"
      },
      "special_rules": {
        "de_minimis": 0,
        "duty_free_allowance": 0
      }
    }'::jsonb),
    
    -- Nepal - VAT system with critical minimum valuations
    ('country', 'NP', '{
      "name": "Nepal",
      "currency": "NPR",
      "tax_system": "VAT",
      "default_vat_rate": 13,
      "customs_rates": {
        "electronics": 15,
        "clothing": 12,
        "books": 0,
        "accessories": 15,
        "home_garden": 12,
        "sports": 10,
        "toys": 8,
        "beauty": 18
      },
      "minimum_valuations": {
        "clothing": {"value": 10, "currency": "USD", "examples": ["kurta", "dress"]},
        "electronics": {"value": 50, "currency": "USD", "examples": ["mobile", "laptop"]},
        "accessories": {"value": 25, "currency": "USD", "examples": ["jewelry", "watch"]},
        "home_garden": {"value": 30, "currency": "USD"},
        "beauty": {"value": 12, "currency": "USD"},
        "applies_currency_conversion": true,
        "enforcement": "strict",
        "rounding_method": "up"
      },
      "currency_conversion": {
        "enabled": true,
        "source": "country_settings.rate_from_usd",
        "cache_duration": 3600,
        "fallback_rate": 133.0
      },
      "hsn_system": {
        "mandatory": false,
        "government_api": false,
        "auto_classification": true,
        "local_database": true
      },
      "special_rules": {
        "de_minimis": 200,
        "duty_free_allowance": 1500,
        "personal_use_exemption": 5000
      }
    }'::jsonb),
    
    -- USA - Sales tax system
    ('country', 'US', '{
      "name": "United States",
      "currency": "USD", 
      "tax_system": "SALES_TAX",
      "default_sales_tax_rate": 8.88,
      "state_variations": true,
      "category_overrides": {
        "electronics": 5.0,
        "books": 0.0,
        "clothing": 6.0,
        "accessories": 7.5,
        "home_garden": 8.0,
        "sports": 6.5,
        "toys": 5.5,
        "beauty": 8.25
      },
      "minimum_valuations": {
        "applies_currency_conversion": false,
        "enforcement": "none"
      },
      "hsn_system": {
        "mandatory": false,
        "government_api": true,
        "auto_classification": true,
        "api_provider": "taxjar"
      },
      "api_endpoints": {
        "taxjar": "https://api.taxjar.com/v2",
        "sales_tax_lookup": "https://api.taxjar.com/v2/rates"
      },
      "special_rules": {
        "de_minimis": 800,
        "state_nexus": true
      }
    }'::jsonb),
    
    -- China - VAT system
    ('country', 'CN', '{
      "name": "China",
      "currency": "CNY",
      "tax_system": "VAT",
      "default_vat_rate": 13,
      "customs_rates": {
        "electronics": 10,
        "clothing": 15,
        "books": 0,
        "accessories": 12,
        "home_garden": 8,
        "sports": 12,
        "toys": 10,
        "beauty": 15
      },
      "minimum_valuations": {
        "applies_currency_conversion": true,
        "enforcement": "moderate"
      },
      "hsn_system": {
        "mandatory": true,
        "government_api": false,
        "auto_classification": true,
        "local_database": true
      },
      "special_rules": {
        "de_minimis": 50,
        "personal_postal_limit": 1000
      }
    }'::jsonb),
    
    -- United Kingdom
    ('country', 'GB', '{
      "name": "United Kingdom",
      "currency": "GBP",
      "tax_system": "VAT",
      "default_vat_rate": 20,
      "customs_rates": {
        "electronics": 0,
        "clothing": 12,
        "books": 0,
        "accessories": 4.5,
        "home_garden": 6.5,
        "sports": 4.7,
        "toys": 4.2,
        "beauty": 6.5
      },
      "minimum_valuations": {
        "applies_currency_conversion": true,
        "enforcement": "strict"
      },
      "hsn_system": {
        "mandatory": true,
        "government_api": true,
        "auto_classification": true,
        "uk_trade_tariff": true
      },
      "special_rules": {
        "de_minimis": 15,
        "low_value_consignment": 135,
        "vat_threshold": 15
      }
    }'::jsonb)
    
    ON CONFLICT (config_type, config_key) DO UPDATE SET
      config_data = EXCLUDED.config_data,
      version = unified_configuration.version + 1,
      updated_at = NOW();
    
    RAISE NOTICE '✅ Country configurations populated with HSN support';
    
    -- Populate Admin Overrides for Testing
    RAISE NOTICE '⚙️ Setting up admin overrides for testing...';
    
    INSERT INTO admin_overrides (override_type, scope, scope_identifier, override_data, justification) VALUES
    
    -- Electronics promotion with minimum valuation consideration
    ('tax_rate', 'category', 'electronics', '{
      "original_rate": 20,
      "override_rate": 15,
      "tax_type": "customs",
      "reason": "electronics_promotion_2025",
      "applies_to_minimum_valuation": true,
      "valid_from": "2025-01-01",
      "valid_until": "2025-03-31"
    }'::jsonb, 'Special electronics promotion for Q1 2025 - reduces customs duty and applies to minimum valuation calculations'),
    
    -- Nepal clothing minimum valuation override
    ('minimum_valuation', 'route', 'CN-NP', '{
      "category": "clothing",
      "original_minimum_usd": 10.00,
      "override_minimum_usd": 7.50,
      "reason": "nepal_clothing_relief",
      "currency_conversion_required": true,
      "applies_to_hsn_codes": ["6109", "6204", "6203"]
    }'::jsonb, 'Temporary relief for Nepal clothing imports - reduced minimum valuation for traditional wear'),
    
    -- HSN code override for specific product
    ('hsn_code', 'product', 'iphone_15_pro', '{
      "original_hsn_code": "8517",
      "override_hsn_code": "8517",
      "custom_tax_rate": 18,
      "custom_minimum_valuation_usd": 800.00,
      "reason": "premium_device_classification",
      "product_patterns": ["iphone 15 pro", "iphone15pro"]
    }'::jsonb, 'Special classification for premium iPhone models with higher minimum valuations'),
    
    -- Weight detection override for bulky items
    ('weight', 'category', 'home_garden', '{
      "override_dimensional_weight": true,
      "dimensional_divisor": 3000,
      "reason": "bulky_furniture_adjustment",
      "apply_to_subcategories": ["furniture", "large_decor"]
    }'::jsonb, 'Adjusted dimensional weight calculation for bulky furniture items'),
    
    -- Tax exemption for educational materials
    ('exemption', 'global', 'educational_books', '{
      "applies_to_hsn_codes": ["4901"],
      "exemption_type": "full_tax_exemption",
      "conditions": ["educational", "textbook", "academic"],
      "keyword_triggers": ["textbook", "education", "learning", "academic"],
      "reason": "educational_exemption"
    }'::jsonb, 'Full tax exemption for educational books and materials')
    
    ON CONFLICT DO NOTHING;
    
    RAISE NOTICE '✅ Admin overrides configured for testing scenarios';
    
    -- Currency Conversion Testing Data
    RAISE NOTICE '💱 Setting up currency conversion test configurations...';
    
    INSERT INTO unified_configuration (config_type, config_key, config_data) VALUES
    ('currency_conversion', 'test_scenarios', '{
      "nepal_kurta_example": {
        "description": "Nepal kurta minimum valuation conversion",
        "usd_amount": 10.00,
        "nepal_rate": 133.0,
        "expected_npr": 1330,
        "hsn_code": "6204",
        "test_case": "minimum_valuation_enforcement"
      },
      "electronics_high_value": {
        "description": "Electronics minimum valuation conversion",
        "usd_amount": 50.00,
        "nepal_rate": 133.0,
        "expected_npr": 6650,
        "hsn_code": "8517",
        "test_case": "electronics_minimum"
      },
      "jewelry_mid_range": {
        "description": "Jewelry minimum valuation conversion",
        "usd_amount": 25.00,
        "nepal_rate": 133.0,
        "expected_npr": 3325,
        "hsn_code": "7113",
        "test_case": "accessories_minimum"
      }
    }'::jsonb),
    
    ('api_settings', 'government_endpoints', '{
      "india_gst": {
        "enabled": true,
        "base_url": "https://api.gst.gov.in",
        "endpoints": {
          "hsn_lookup": "/taxpayerapi/search/hsnsac",
          "rate_lookup": "/taxpayerapi/search/rate"
        },
        "cache_duration": 86400,
        "fallback_enabled": true
      },
      "nepal_customs": {
        "enabled": false,
        "note": "No official API available - using local database",
        "fallback_enabled": true
      },
      "us_taxjar": {
        "enabled": true,
        "base_url": "https://api.taxjar.com/v2",
        "endpoints": {
          "rates": "/rates",
          "categories": "/categories"
        },
        "cache_duration": 3600,
        "fallback_enabled": true
      }
    }'::jsonb)
    
    ON CONFLICT (config_type, config_key) DO UPDATE SET
      config_data = EXCLUDED.config_data,
      updated_at = NOW();
    
    RAISE NOTICE '✅ Currency conversion and API configurations set up';
    
    -- Final Summary
    DECLARE
      hsn_count INTEGER;
      config_count INTEGER;
      override_count INTEGER;
    BEGIN
      SELECT COUNT(*) INTO hsn_count FROM hsn_master;
      SELECT COUNT(*) INTO config_count FROM unified_configuration;
      SELECT COUNT(*) INTO override_count FROM admin_overrides;
      
      RAISE NOTICE '';
      RAISE NOTICE '🎉 HSN SYSTEM SEED DATA COMPLETED SUCCESSFULLY!';
      RAISE NOTICE '================================================';
      RAISE NOTICE '📊 HSN Master records: %', hsn_count;
      RAISE NOTICE '🌍 Country configurations: %', config_count; 
      RAISE NOTICE '⚙️ Admin overrides: %', override_count;
      RAISE NOTICE '';
      RAISE NOTICE '🔥 KEY FEATURES READY:';
      RAISE NOTICE '✅ Currency conversion (USD → origin country)';
      RAISE NOTICE '✅ Nepal kurta minimum valuation ($10 USD → NPR)';
      RAISE NOTICE '✅ Per-item HSN classification';
      RAISE NOTICE '✅ Admin override system';
      RAISE NOTICE '✅ Government API integration configs';
      RAISE NOTICE '✅ Comprehensive product database';
      RAISE NOTICE '';
      RAISE NOTICE '💡 Ready for HSN calculation engine integration!';
    END;
    
  ELSE
    RAISE NOTICE '⚠️ HSN tables not found - they will be created by migrations';
  END IF;
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '❌ Error populating HSN seed data: %', SQLERRM;
    RAISE NOTICE '💡 HSN seed data will be populated by migrations instead';
END $$;
