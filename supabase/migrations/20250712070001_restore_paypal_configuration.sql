-- Restore PayPal configuration that was lost in database rollback
-- This migration restores only the essential PayPal gateway configuration

-- Insert or update PayPal payment gateway with comprehensive configuration
INSERT INTO payment_gateways (
  code, name, is_active, supported_countries, supported_currencies, 
  fee_percent, fee_fixed, config, test_mode, created_at, updated_at
) VALUES (
  'paypal',
  'PayPal',
  true,
  ARRAY[
    'US', 'CA', 'GB', 'AU', 'DE', 'FR', 'IT', 'ES', 'NL', 'SG', 'JP', 'IN',
    'AE', 'SA', 'KW', 'QA', 'BH', 'OM', 'KR', 'HK', 'TW', 'TH', 'MY', 'ID', 
    'PH', 'VN', 'BD', 'LK', 'PK'
  ],
  ARRAY[
    'USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'SGD', 'HKD', 'AED', 'SAR', 
    'KWD', 'QAR', 'BHD', 'OMR', 'KRW', 'TWD', 'THB', 'MYR', 'IDR', 'PHP', 
    'VND', 'BDT', 'LKR', 'PKR', 'INR'
  ],
  2.9,
  0.30,
  jsonb_build_object(
    'client_id', '',
    'client_secret', '',
    'mode', 'sandbox',
    'webhook_id', '',
    'return_url', '/payment/success',
    'cancel_url', '/payment/cancel',
    'brand_name', 'iwishBag',
    'landing_page', 'BILLING',
    'shipping_preference', 'SET_PROVIDED_ADDRESS',
    'user_action', 'PAY_NOW',
    'currency_specific_limits', jsonb_build_object(
      'USD', jsonb_build_object('min', 1.00, 'max', 10000.00),
      'EUR', jsonb_build_object('min', 1.00, 'max', 10000.00),
      'GBP', jsonb_build_object('min', 1.00, 'max', 10000.00),
      'AED', jsonb_build_object('min', 5.00, 'max', 25000.00),
      'SAR', jsonb_build_object('min', 5.00, 'max', 25000.00),
      'JPY', jsonb_build_object('min', 100.00, 'max', 1000000.00),
      'INR', jsonb_build_object('min', 85.00, 'max', 830000.00)
    ),
    'description', 'International payment gateway supporting multiple currencies and payment methods including credit/debit cards, bank accounts, and PayPal balance.',
    'webhook_endpoint', '/paypal-webhook',
    'priority', 2
  ),
  true,
  now(),
  now()
) ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  is_active = EXCLUDED.is_active,
  supported_countries = EXCLUDED.supported_countries,
  supported_currencies = EXCLUDED.supported_currencies,
  fee_percent = EXCLUDED.fee_percent,
  fee_fixed = EXCLUDED.fee_fixed,
  config = EXCLUDED.config,
  test_mode = EXCLUDED.test_mode,
  updated_at = now();

-- Add PayPal to country payment preferences where needed (only for existing countries)
INSERT INTO country_payment_preferences (country_code, gateway_code, priority, is_active)
VALUES 
  ('US', 'paypal', 2, true),
  ('CA', 'paypal', 2, true),
  ('GB', 'paypal', 2, true),
  ('AU', 'paypal', 2, true)
ON CONFLICT (country_code, gateway_code) DO UPDATE SET
  priority = EXCLUDED.priority,
  is_active = EXCLUDED.is_active,
  updated_at = now();

-- Add PayPal webhook verification table if it doesn't exist
CREATE TABLE IF NOT EXISTS paypal_webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id text UNIQUE NOT NULL,
  event_type text NOT NULL,
  resource_type text,
  resource_id text,
  summary text,
  payload jsonb NOT NULL,
  verification_status text DEFAULT 'pending',
  processed_at timestamptz,
  error_message text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create indexes for webhook event lookups
CREATE INDEX IF NOT EXISTS idx_paypal_webhook_events_event_id ON paypal_webhook_events(event_id);
CREATE INDEX IF NOT EXISTS idx_paypal_webhook_events_resource ON paypal_webhook_events(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_paypal_webhook_events_created ON paypal_webhook_events(created_at DESC);

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION trigger_paypal_webhook_events_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_paypal_webhook_events_updated_at ON paypal_webhook_events;
CREATE TRIGGER trigger_paypal_webhook_events_updated_at
  BEFORE UPDATE ON paypal_webhook_events
  FOR EACH ROW EXECUTE FUNCTION trigger_paypal_webhook_events_updated_at();

-- RLS policies for PayPal webhook events (admin only)
ALTER TABLE paypal_webhook_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin users can view PayPal webhook events" ON paypal_webhook_events;
CREATE POLICY "Admin users can view PayPal webhook events"
  ON paypal_webhook_events FOR SELECT
  TO authenticated
  USING (is_admin());

DROP POLICY IF EXISTS "Service role can manage PayPal webhook events" ON paypal_webhook_events;
CREATE POLICY "Service role can manage PayPal webhook events"
  ON paypal_webhook_events FOR ALL
  TO service_role
  USING (true);

-- Grant permissions
GRANT SELECT ON paypal_webhook_events TO authenticated;
GRANT ALL ON paypal_webhook_events TO service_role;

-- Add PayPal-specific fields to payment_transactions if they don't exist
ALTER TABLE payment_transactions 
ADD COLUMN IF NOT EXISTS paypal_order_id text,
ADD COLUMN IF NOT EXISTS paypal_capture_id text,
ADD COLUMN IF NOT EXISTS paypal_payer_id text,
ADD COLUMN IF NOT EXISTS paypal_payer_email text;

-- Create indexes for PayPal transaction lookups
CREATE INDEX IF NOT EXISTS idx_payment_transactions_paypal_order ON payment_transactions(paypal_order_id) WHERE paypal_order_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_payment_transactions_paypal_capture ON payment_transactions(paypal_capture_id) WHERE paypal_capture_id IS NOT NULL;

-- Verify PayPal configuration
SELECT 'PayPal configuration restored successfully!' as status;
SELECT 
  code, 
  name, 
  is_active, 
  array_length(supported_countries, 1) as country_count,
  array_length(supported_currencies, 1) as currency_count,
  fee_percent,
  fee_fixed
FROM payment_gateways 
WHERE code = 'paypal';