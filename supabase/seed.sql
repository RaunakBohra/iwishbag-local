-- Seed data for development and testing

-- Clean tables before seeding
DELETE FROM system_settings;
DELETE FROM email_templates;
DELETE FROM payment_gateways;
DELETE FROM bank_account_details;
DELETE FROM country_settings;
DELETE FROM shipping_routes;

-- Insert test countries
INSERT INTO country_settings (code, name, currency, rate_from_usd, sales_tax, vat, min_shipping, additional_shipping, additional_weight, weight_unit, volumetric_divisor, payment_gateway_fixed_fee, payment_gateway_percent_fee, purchase_allowed, shipping_allowed, payment_gateway, priority_thresholds) VALUES
('US', 'United States', 'USD', 1.0, 0.08, 0, 10, 0, 2, 'lbs', 5000, 0, 2.9, true, true, 'stripe', '{"low": 0, "normal": 500, "urgent": 2000}'),
('IN', 'India', 'INR', 83.0, 0, 0.18, 500, 0, 100, 'kg', 5000, 0, 2.5, true, true, 'payu', '{"low": 0, "normal": 41500, "urgent": 166000}'),
('NP', 'Nepal', 'NPR', 133.0, 0, 0.13, 1000, 0, 200, 'kg', 5000, 0, 1.5, true, true, 'esewa', '{"low": 0, "normal": 66500, "urgent": 266000}'),
('JP', 'Japan', 'JPY', 150.0, 0, 0.10, 1500, 0, 200, 'kg', 5000, 0, 2.9, true, true, 'stripe', '{"low": 0, "normal": 75000, "urgent": 300000}'),
('GB', 'United Kingdom', 'GBP', 0.79, 0, 0.20, 12, 0, 2, 'kg', 5000, 0, 2.9, true, true, 'stripe', '{"low": 0, "normal": 395, "urgent": 1580}'),
('AU', 'Australia', 'AUD', 1.52, 0, 0.10, 15, 0, 2, 'kg', 5000, 0, 2.9, true, true, 'stripe', '{"low": 0, "normal": 760, "urgent": 3040}');

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

-- Insert customs categories (required for quote calculations)
INSERT INTO public.customs_categories (name, duty_percent)
VALUES
('Electronics', 5.00),
('Clothing', 10.00),
('Cosmetics', 15.00),
('Accessories', 20.00)
ON CONFLICT (name) DO NOTHING;


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
