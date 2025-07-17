-- =====================================
-- iwishBag Seed Data
-- =====================================
-- This file contains all the initial data needed for the application

-- Clear existing payment gateways data
DELETE FROM payment_gateways;

-- Insert payment gateways from CSV
INSERT INTO payment_gateways (id, name, code, enabled, supported_countries, supported_currencies, fee_percent, fee_fixed, config, test_mode, created_at, updated_at, priority, description) VALUES
('3c3db53e-bada-49af-b63c-3dba5c801a65', 'Bank Transfer', 'bank_transfer', true, '{US,CA,GB,AU,IN,NP,SG,JP,MY,TH,PH,ID,VN,KR}'::text[], '{USD,CAD,GBP,AUD,INR,NPR,SGD,JPY,MYR,THB,PHP,IDR,VND,KRW}'::text[], 0.00, 0.00, '{"processing_time": "1-3 business days", "requires_manual_verification": true}'::jsonb, false, '2025-07-12 15:25:53.325565+00', '2025-07-12 15:25:53.325565+00', 999, 'Direct bank transfer with manual verification'),
('680f07ec-1502-45df-bbae-390749f01767', 'Khalti', 'khalti', true, '{NP}'::text[], '{NPR}'::text[], 2.00, 0.00, '{"public_key": "test_khalti_public", "secret_key": "test_khalti_secret", "environment": "test"}'::jsonb, true, '2025-07-12 15:25:53.325565+00', '2025-07-12 15:25:53.325565+00', 999, 'Nepal''s digital wallet service'),
('a6bb0734-b2c1-4829-8c80-9529a230de40', 'PayU', 'payu', true, '{IN}'::text[], '{INR}'::text[], 2.50, 0.00, '{"salt_key": "VIen2EwWiQbvsILF4Wt9p9Gh5ixOpSMe", "client_id": "2e64183e25e481e5859741d0e458ed3c48852c2100b552e032cd37f273caef30", "environment": "test", "failure_url": "/functions/v1/payu-failure", "merchant_id": "8725115", "success_url": "/functions/v1/payu-success", "webhook_url": "https://grgvlrvywsfmnmkxrecd.supabase.co/functions/v1/payment-webhook", "merchant_key": "u7Ui5I", "client_secret": "cb2c6b7f39a3ffae9442cb270de49971381ad2c04b0800d9c14ca634a83aaad8"}'::jsonb, true, '2025-07-12 15:25:53.325565+00', '2025-07-12 15:25:53.325565+00', 999, 'Leading payment gateway in India supporting cards, UPI, net banking, and wallets'),
('b45d125e-a00a-47af-ae0c-79a8636cb7cd', 'eSewa', 'esewa', true, '{NP}'::text[], '{NPR}'::text[], 1.50, 0.00, '{"secret_key": "test_esewa_secret", "environment": "test", "merchant_id": "test_esewa_merchant"}'::jsonb, true, '2025-07-12 15:25:53.325565+00', '2025-07-12 15:25:53.325565+00', 999, 'Nepal''s most popular digital wallet and payment service'),
('db2f4ce8-2f44-4313-a73b-7548e325d1e9', 'Stripe', 'stripe', true, '{US,CA,GB,AU,DE,FR,IT,ES,NL,SG,JP,IN}'::text[], '{USD,EUR,GBP,CAD,AUD,JPY,SGD,AED,SAR,EGP,TRY}'::text[], 2.90, 0.30, '{"api_version": "2023-10-16", "environment": "test", "webhook_secret": "whsec_yBiHhAfRrRpMqmgGUohAZ92CBDFIt26L", "test_secret_key": "47f7720482238943c8ff85be904bcfc657b36d5602a09521be901725771473032459f6c8478d3c6193c7910391a0cfb1", "test_publishable_key": "lVBya_cyR-WAtIqzMo4cZQ"}'::jsonb, true, '2025-07-12 15:25:53.325565+00', '2025-07-15 16:08:44.286008+00', 999, 'International payment gateway supporting cards and multiple currencies'),
('e4750bd8-886f-4b39-b65c-f36832a11d3f', 'Fonepay', 'fonepay', true, '{NP}'::text[], '{NPR}'::text[], 1.50, 0.00, '{"password": "test_pass", "username": "test_user", "environment": "test", "merchant_code": "test_fonepay_merchant"}'::jsonb, true, '2025-07-12 15:25:53.325565+00', '2025-07-12 15:25:53.325565+00', 999, 'Nepal''s mobile payment network'),
('e88a0b55-5838-4851-a7bd-260f2c1f1b43', 'PayPal', 'paypal', true, '{US,CA,GB,AU,DE,FR,IT,ES,NL,BE,AT,CH,SE,NO,DK,FI,PL,CZ,HU,SG,MY,TH,PH,VN,IN,NP,BD,LK,PK,AE,SA,KW,QA,BH,OM,JO,LB,EG,MA,TN,DZ,NG,GH,KE,UG,TZ,ZA,BR,MX,AR,CL,CO,PE,UY,PY,BO,EC,VE}'::text[], '{USD,EUR,GBP,CAD,AUD,JPY,SGD,MYR,THB,PHP,VND,INR,NPR,BDT,LKR,PKR,AED,SAR,KWD,QAR,BHD,OMR,JOD,LBP,EGP,MAD,TND,DZD,NGN,GHS,KES,UGX,TZS,ZAR,BRL,MXN,ARS,CLP,COP,PEN,UYU,PYG,BOB,VES}'::text[], 3.49, 0.49, '{"client_id": "ARi806xV-dbFCS5E9OCYkapLEb-7V0P521rLUG9pYUk6kJ7Nm7exNudxamGEkQ1SXqUSzNgV3lEZyAXH", "webhook_id": "8ME41227A0068401Y", "environment": "sandbox", "client_secret": "EDn63sc7pr715BvR2X2VvgKsBYy09iTafm9AOnxcbNLztd3YJrc2X-0DiTk4uYyxBh7fcYq3nn8lKyKl", "client_id_live": "", "client_id_sandbox": "ARi806xV-dbFCS5E9OCYkapLEb-7V0P521rLUG9pYUk6kJ7Nm7exNudxamGEkQ1SXqUSzNgV3lEZyAXH", "client_secret_live": "", "merchant_account_id": "", "client_secret_sandbox": "EDn63sc7pr715BvR2X2VvgKsBYy09iTafm9AOnxcbNLztd3YJrc2X-0DiTk4uYyxBh7fcYq3nn8lKyKl", "partner_attribution_id": "iwishBag_Cart_SPB", "supported_funding_sources": ["paypal", "card", "applepay", "googlepay"], "supported_payment_methods": ["paypal", "card"]}'::jsonb, true, '2025-07-12 15:25:53.325565+00', '2025-07-12 15:25:53.325565+00', 2, 'Global payment platform supporting multiple countries and currencies'),
('ea7bf93c-40ab-4fde-af3e-bc05fcd4b507', 'Razorpay', 'razorpay', true, '{IN}'::text[], '{INR}'::text[], 2.00, 0.00, '{"key_id": "test_razorpay_key", "key_secret": "test_razorpay_secret", "environment": "test"}'::jsonb, true, '2025-07-12 15:25:53.325565+00', '2025-07-12 15:25:53.325565+00', 999, 'Complete payments solution for Indian businesses'),
('ec841dca-79b7-4751-8d71-f2639e0bbc16', 'Cash on Delivery', 'cod', true, '{IN,NP,MY,TH,PH,ID,VN}'::text[], '{INR,NPR,MYR,THB,PHP,IDR,VND}'::text[], 0.00, 50.00, '{"max_amount_inr": 50000, "max_amount_npr": 80000, "verification_required": true}'::jsonb, false, '2025-07-12 15:25:53.325565+00', '2025-07-12 15:25:53.325565+00', 999, 'Pay with cash upon delivery'),
('ff709a62-1436-4f2f-a37c-81ca9682693f', 'Airwallex', 'airwallex', true, '{US,CA,GB,AU,DE,FR,IT,ES,NL,SG,JP,HK,CN}'::text[], '{USD,EUR,GBP,CAD,AUD,JPY,SGD,AED,SAR,EGP,TRY}'::text[], 1.80, 0.30, '{"api_key": "1e02891ba7ab2c772f945bf20e9adcbb99173eb500f75bd414aa5bf85130e007a7959f8ba8e664bccf829f701926c0c5", "client_id": "lVBya_cyR-WAtIqzMo4cZQ", "test_mode": true, "environment": "demo", "test_api_key": "1e02891ba7ab2c772f945bf20e9adcbb99173eb500f75bd414aa5bf85130e007a7959f8ba8e664bccf829f701926c0c5", "webhook_secret": "whsec_yBiHhAfRrRpMqmgGUohAZ92CBDFIt26L"}'::jsonb, true, '2025-07-12 15:25:53.325565+00', '2025-07-16 03:16:22.73004+00', 999, 'Global payments infrastructure for modern businesses');

-- Clear existing bank account details
DELETE FROM bank_account_details;

-- Insert bank account details from CSV
INSERT INTO bank_account_details (id, account_name, account_number, bank_name, branch_name, iban, swift_code, country_code, is_fallback, custom_fields, field_labels, display_order, is_active, created_at, updated_at, destination_country, upi_id, upi_qr_string, payment_qr_url, instructions, currency_code) VALUES
('054784a9-263e-4dc3-b270-1f40319d27a8', 'iWB Enterprises', '924020057946752', 'Axis Bank - Current', NULL, NULL, NULL, 'IN', false, '{"ifsc": "UTIB0000056"}'::jsonb, '{}'::jsonb, 0, true, '2025-07-12 15:25:53.325565+00', '2025-07-12 15:25:53.325565+00', NULL, NULL, NULL, NULL, NULL, 'INR'),
('21df7298-785c-4204-b26c-99811054d0ed', 'IWISHBAG PTE. LTD.', '8456220037', 'Community Federal Savings Bank', NULL, NULL, NULL, 'US', false, '{"ach": "026073150", "bank_address": "89-16 Jamaica Ave, Woodhaven, NY, United States, 11421"}'::jsonb, '{}'::jsonb, 0, true, '2025-07-12 15:25:53.325565+00', '2025-07-12 15:25:53.325565+00', NULL, NULL, NULL, NULL, NULL, 'USD'),
('fa226c85-c032-40f5-ac01-7a714550f25f', 'I WISH BAG', '1780100000613201', 'Citizens Bank - Teku', NULL, NULL, NULL, 'NP', false, '{}'::jsonb, '{}'::jsonb, 0, true, '2025-07-12 15:25:53.325565+00', '2025-07-12 15:25:53.325565+00', NULL, NULL, NULL, NULL, NULL, 'NPR');

-- Clear existing country settings (this will fail if there are foreign key references)
-- So we'll use ON CONFLICT instead
-- DELETE FROM country_settings;

-- Insert country settings from CSV
INSERT INTO country_settings (code, name, currency, rate_from_usd, sales_tax, vat, min_shipping, additional_shipping, additional_weight, weight_unit, volumetric_divisor, payment_gateway_fixed_fee, payment_gateway_percent_fee, purchase_allowed, shipping_allowed, payment_gateway, created_at, updated_at, minimum_payment_amount, decimal_places, thousand_separator, decimal_separator, symbol_position, symbol_space, priority_thresholds, available_gateways, default_gateway, gateway_config) VALUES
('AU', 'Australia', 'AUD', 1.530000, 0.00, 0.10, 15.00, 0.00, 2.00, 'kg', 5000, 0.00, 2.90, true, true, 'stripe', '2025-07-12 15:25:53.325565+00', '2025-07-12 15:25:53.325565+00', 10.00, 2, ',', '.', 'before', false, '{"low": 0, "normal": 760, "urgent": 3040}'::jsonb, '{bank_transfer,airwallex}'::text[], 'bank_transfer', '{}'::jsonb),
('GB', 'United Kingdom', 'GBP', 0.740000, 0.00, 0.20, 12.00, 0.00, 2.00, 'kg', 5000, 0.00, 2.90, true, true, 'stripe', '2025-07-12 15:25:53.325565+00', '2025-07-12 15:25:53.325565+00', 10.00, 2, ',', '.', 'before', false, '{"low": 0, "normal": 395, "urgent": 1580}'::jsonb, '{bank_transfer,airwallex}'::text[], 'bank_transfer', '{}'::jsonb),
('IN', 'India', 'INR', 89.020000, 0.00, 18.00, 500.00, 0.00, 100.00, 'kg', 5000, 0.00, 2.50, true, true, 'payu', '2025-07-12 15:25:53.325565+00', '2025-07-12 15:25:53.325565+00', 10.00, 2, ',', '.', 'before', false, '{"low": 0, "normal": 41500, "urgent": 166000}'::jsonb, '{payu,paypal,razorpay,upi,bank_transfer}'::text[], 'payu', '{}'::jsonb),
('JP', 'Japan', 'JPY', 147.620000, 0.00, 0.10, 1500.00, 0.00, 200.00, 'kg', 5000, 0.00, 2.90, true, true, 'stripe', '2025-07-12 15:25:53.325565+00', '2025-07-12 15:25:53.325565+00', 10.00, 2, ',', '.', 'before', false, '{"low": 0, "normal": 75000, "urgent": 300000}'::jsonb, '{bank_transfer,airwallex}'::text[], 'bank_transfer', '{}'::jsonb),
('NP', 'Nepal', 'NPR', 139.630000, 0.00, 0.13, 1000.00, 0.00, 200.00, 'kg', 5000, 0.00, 1.50, true, true, 'esewa', '2025-07-12 15:25:53.325565+00', '2025-07-12 15:25:53.325565+00', 10.00, 2, ',', '.', 'before', false, '{"low": 0, "normal": 66500, "urgent": 266000}'::jsonb, '{paypal,esewa,khalti,fonepay,bank_transfer}'::text[], 'paypal', '{}'::jsonb),
('US', 'United States', 'USD', 1.000000, 0.08, 0.00, 10.00, 0.00, 2.00, 'lbs', 5000, 0.00, 2.90, true, true, 'stripe', '2025-07-12 15:25:53.325565+00', '2025-07-12 15:25:53.325565+00', 10.00, 2, ',', '.', 'before', false, '{"low": 0, "normal": 500, "urgent": 2000}'::jsonb, '{stripe,paypal,bank_transfer,airwallex}'::text[], 'paypal', '{}'::jsonb)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  currency = EXCLUDED.currency,
  rate_from_usd = EXCLUDED.rate_from_usd,
  sales_tax = EXCLUDED.sales_tax,
  vat = EXCLUDED.vat,
  min_shipping = EXCLUDED.min_shipping,
  additional_shipping = EXCLUDED.additional_shipping,
  additional_weight = EXCLUDED.additional_weight,
  weight_unit = EXCLUDED.weight_unit,
  volumetric_divisor = EXCLUDED.volumetric_divisor,
  payment_gateway_fixed_fee = EXCLUDED.payment_gateway_fixed_fee,
  payment_gateway_percent_fee = EXCLUDED.payment_gateway_percent_fee,
  purchase_allowed = EXCLUDED.purchase_allowed,
  shipping_allowed = EXCLUDED.shipping_allowed,
  payment_gateway = EXCLUDED.payment_gateway,
  minimum_payment_amount = EXCLUDED.minimum_payment_amount,
  decimal_places = EXCLUDED.decimal_places,
  thousand_separator = EXCLUDED.thousand_separator,
  decimal_separator = EXCLUDED.decimal_separator,
  symbol_position = EXCLUDED.symbol_position,
  symbol_space = EXCLUDED.symbol_space,
  priority_thresholds = EXCLUDED.priority_thresholds,
  available_gateways = EXCLUDED.available_gateways,
  default_gateway = EXCLUDED.default_gateway,
  gateway_config = EXCLUDED.gateway_config,
  updated_at = NOW();

-- Clear existing quote statuses
DELETE FROM quote_statuses;

-- Insert quote statuses from CSV
INSERT INTO quote_statuses (id, value, label, color, icon, is_active) VALUES
(1, 'pending', 'Pending', '#fbbf24', 'clock', true),
(2, 'sent', 'Sent', '#3b82f6', 'send', true),
(3, 'approved', 'Approved', '#22c55e', 'check-circle', true),
(4, 'rejected', 'Rejected', '#ef4444', 'x-circle', true),
(5, 'expired', 'Expired', '#6b7280', 'hourglass', true),
(6, 'payment_pending', 'Awaiting Payment', 'orange', 'clock', true),
(7, 'calculated', 'Calculated', 'blue', 'calculator', true),
(8, 'processing', 'Processing', 'yellow', 'loader', true),
(9, 'paid', 'Paid', 'green', 'check-circle', true),
(10, 'ordered', 'Ordered', 'green', 'shopping-cart', true),
(11, 'shipped', 'Shipped', 'green', 'truck', true),
(12, 'completed', 'Completed', 'green', 'check-circle-2', true),
(13, 'cancelled', 'Cancelled', 'red', 'x-circle', true);

-- Reset the sequence to continue from the last ID
SELECT setval('quote_statuses_id_seq', 13, true);

-- Note: This seed file contains payment gateways, bank account details, country settings, and quote statuses
-- Other seed data should be handled by migrations or separate seed files