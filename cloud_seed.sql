-- Essential payment gateways for cloud database
INSERT INTO payment_gateways (code, name, description, is_active, supported_countries, supported_currencies, fee_percent, fee_fixed, config, test_mode) VALUES
-- PayU for India with your test credentials
('payu', 'PayU', 'Leading payment gateway in India supporting cards, UPI, net banking, and wallets', true, ARRAY['IN'], ARRAY['INR'], 2.5, 0, '{"salt_key": "VIen2EwWiQbvsILF4Wt9p9Gh5ixOpSMe", "environment": "test", "merchant_id": "8725115", "merchant_key": "u7Ui5I", "success_url": "/payment/success", "failure_url": "/payment/failure", "webhook_url": "/functions/v1/payment-webhook"}', true),
-- Bank Transfer (Universal)
('bank_transfer', 'Bank Transfer', 'Direct bank transfer with manual verification', true, ARRAY['US', 'CA', 'GB', 'AU', 'IN', 'NP', 'SG', 'JP', 'MY', 'TH', 'PH', 'ID', 'VN', 'KR'], ARRAY['USD', 'CAD', 'GBP', 'AUD', 'INR', 'NPR', 'SGD', 'JPY', 'MYR', 'THB', 'PHP', 'IDR', 'VND', 'KRW'], 0, 0, '{"requires_manual_verification": true, "processing_time": "1-3 business days"}', false),
-- Cash on Delivery (for supported regions)
('cod', 'Cash on Delivery', 'Pay with cash upon delivery', true, ARRAY['IN', 'NP', 'MY', 'TH', 'PH', 'ID', 'VN'], ARRAY['INR', 'NPR', 'MYR', 'THB', 'PHP', 'IDR', 'VND'], 0, 50, '{"max_amount_inr": 50000, "max_amount_npr": 80000, "verification_required": true}', false)
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

-- Verify the update
SELECT code, name, is_active, supported_currencies FROM payment_gateways WHERE is_active = true ORDER BY code;