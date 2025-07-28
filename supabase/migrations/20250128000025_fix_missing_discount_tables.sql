-- Fix missing discount_settings table and add seed data
CREATE TABLE IF NOT EXISTS discount_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  setting_key TEXT UNIQUE NOT NULL,
  setting_value JSONB NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Enable RLS
ALTER TABLE discount_settings ENABLE ROW LEVEL SECURITY;

-- Admin-only access
CREATE POLICY "Admin full access to discount settings"
  ON discount_settings FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Insert initial settings
INSERT INTO discount_settings (setting_key, setting_value, description)
VALUES (
  'payment_method_discounts',
  '{"bank_transfer": 2, "wire_transfer": 2, "credit_card": 0, "paypal": 0, "stripe": 0}'::jsonb,
  'Discount percentages for different payment methods'
) ON CONFLICT (setting_key) DO NOTHING;

-- Insert some initial discount types if not exists
INSERT INTO discount_types (name, code, type, value, conditions, is_active) 
SELECT * FROM (VALUES
  ('Plus Membership Discount', 'PLUS_MEMBER', 'percentage', 2::numeric, '{"requires_membership": true}'::jsonb, true),
  ('Bank Transfer Discount', 'BANK_TRANSFER', 'percentage', 2::numeric, '{"payment_method": "bank_transfer"}'::jsonb, true),
  ('Welcome Discount', 'WELCOME10', 'percentage', 10::numeric, '{"first_order": true}'::jsonb, true),
  ('Bulk Order Discount', 'BULK15', 'percentage', 15::numeric, '{"min_items": 5}'::jsonb, true)
) AS t(name, code, type, value, conditions, is_active)
WHERE NOT EXISTS (
  SELECT 1 FROM discount_types WHERE code = t.code
);

-- Create sample discount campaigns
INSERT INTO discount_campaigns (
  name, 
  description, 
  discount_type_id, 
  campaign_type, 
  start_date, 
  end_date,
  is_active,
  auto_apply,
  priority
)
SELECT 
  'Bank Transfer Incentive',
  'Automatic 2% discount for bank transfer payments',
  dt.id,
  'manual',
  NOW(),
  NOW() + INTERVAL '1 year',
  true,
  true,
  100
FROM discount_types dt
WHERE dt.code = 'BANK_TRANSFER'
AND NOT EXISTS (
  SELECT 1 FROM discount_campaigns WHERE name = 'Bank Transfer Incentive'
);

-- Create membership auto-discount campaign
INSERT INTO discount_campaigns (
  name, 
  description, 
  discount_type_id, 
  campaign_type, 
  start_date, 
  end_date,
  is_active,
  auto_apply,
  priority,
  target_audience
)
SELECT 
  'Plus Member Benefits',
  'Automatic 2% discount for Plus members',
  dt.id,
  'manual',
  NOW(),
  NOW() + INTERVAL '10 years',
  true,
  true,
  90,
  '{"membership_required": true}'::jsonb
FROM discount_types dt
WHERE dt.code = 'PLUS_MEMBER'
AND NOT EXISTS (
  SELECT 1 FROM discount_campaigns WHERE name = 'Plus Member Benefits'
);

-- Create welcome campaign
INSERT INTO discount_campaigns (
  name, 
  description, 
  discount_type_id, 
  campaign_type, 
  start_date, 
  end_date,
  is_active,
  auto_apply,
  priority,
  usage_limit
)
SELECT 
  'Welcome Offer',
  '10% off on your first order',
  dt.id,
  'user_triggered',
  NOW(),
  NOW() + INTERVAL '1 year',
  true,
  false,
  50,
  1000
FROM discount_types dt
WHERE dt.code = 'WELCOME10'
AND NOT EXISTS (
  SELECT 1 FROM discount_campaigns WHERE name = 'Welcome Offer'
);

-- Generate some discount codes for the welcome campaign
INSERT INTO discount_codes (campaign_id, code, usage_limit, is_active)
SELECT 
  dc.id,
  'WELCOME2025',
  100,
  true
FROM discount_campaigns dc
WHERE dc.name = 'Welcome Offer'
AND NOT EXISTS (
  SELECT 1 FROM discount_codes WHERE code = 'WELCOME2025'
);