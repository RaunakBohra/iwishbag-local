-- Membership and Discount System Schema
-- iwishBag Plus membership program with smart discount management

-- Membership Plans Table
CREATE TABLE IF NOT EXISTS membership_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  benefits JSONB NOT NULL DEFAULT '[]',
  pricing JSONB NOT NULL DEFAULT '{}', -- {"USD": 99, "INR": 4999, "NPR": 8999}
  duration_days INTEGER NOT NULL DEFAULT 365,
  warehouse_benefits JSONB DEFAULT '{}', -- {"free_storage_days": 90, "discount_after_free": 50}
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Customer Memberships Table
CREATE TABLE IF NOT EXISTS customer_memberships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES membership_plans(id),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired', 'paused')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMPTZ NOT NULL,
  auto_renew BOOLEAN DEFAULT true,
  payment_method TEXT,
  last_payment_id TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(customer_id, plan_id, status)
);

-- User Segments Table (for targeted campaigns)
CREATE TABLE IF NOT EXISTS user_segments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  conditions JSONB NOT NULL DEFAULT '{}', -- {"days_since_last_order": 30, "total_orders": {"min": 5}, "membership": ["plus"]}
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Discount Types Table
CREATE TABLE IF NOT EXISTS discount_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('percentage', 'fixed_amount', 'shipping', 'handling_fee')),
  value DECIMAL(10, 2) NOT NULL,
  conditions JSONB DEFAULT '{}', -- {"min_order": 100, "max_discount": 50, "applicable_to": "total|handling"}
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Discount Campaigns Table
CREATE TABLE IF NOT EXISTS discount_campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  discount_type_id UUID REFERENCES discount_types(id),
  campaign_type TEXT CHECK (campaign_type IN ('manual', 'time_based', 'user_triggered', 'seasonal')),
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ,
  usage_limit INTEGER,
  usage_count INTEGER DEFAULT 0,
  target_segments JSONB DEFAULT '[]', -- Array of segment IDs
  target_audience JSONB DEFAULT '{}', -- {"membership": ["plus"], "countries": ["IN", "NP"]}
  is_active BOOLEAN DEFAULT true,
  auto_apply BOOLEAN DEFAULT false,
  priority INTEGER DEFAULT 0,
  trigger_rules JSONB DEFAULT '{}', -- {"happy_hour": {"days": [5,6], "hours": [18,19,20]}, "birthday": true}
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Discount Stacking Rules Table
CREATE TABLE IF NOT EXISTS discount_stacking_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  allowed_combinations JSONB DEFAULT '[]', -- ["membership", "payment_method", "campaign"]
  max_stack_count INTEGER DEFAULT 2,
  max_total_discount_percentage DECIMAL(5, 2) DEFAULT 30.00,
  conditions JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Discount Codes Table (for manual coupon codes)
CREATE TABLE IF NOT EXISTS discount_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT UNIQUE NOT NULL,
  campaign_id UUID REFERENCES discount_campaigns(id),
  discount_type_id UUID REFERENCES discount_types(id),
  usage_limit INTEGER,
  usage_count INTEGER DEFAULT 0,
  usage_per_customer INTEGER DEFAULT 1,
  valid_from TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  valid_until TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Customer Discount Usage Table
CREATE TABLE IF NOT EXISTS customer_discount_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES profiles(id),
  discount_code_id UUID REFERENCES discount_codes(id),
  campaign_id UUID REFERENCES discount_campaigns(id),
  quote_id UUID REFERENCES quotes(id),
  order_id UUID REFERENCES orders(id),
  discount_amount DECIMAL(10, 2) NOT NULL,
  original_amount DECIMAL(10, 2) NOT NULL,
  currency TEXT NOT NULL,
  discount_breakdown JSONB DEFAULT '{}', -- {"membership": 20, "payment": 20, "campaign": 30}
  used_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Payment Method Discounts Table
CREATE TABLE IF NOT EXISTS payment_method_discounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  payment_method TEXT NOT NULL,
  discount_percentage DECIMAL(5, 2) NOT NULL,
  is_stackable BOOLEAN DEFAULT true,
  conditions JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Warehouse Storage Benefits Table
CREATE TABLE IF NOT EXISTS warehouse_storage_benefits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  benefit_type TEXT NOT NULL CHECK (benefit_type IN ('membership', 'promotional', 'loyalty')),
  reference_id UUID, -- membership_plan_id or campaign_id
  free_storage_days INTEGER NOT NULL DEFAULT 0,
  discount_percentage_after_free DECIMAL(5, 2) DEFAULT 0,
  conditions JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Automated Campaign Triggers Table
CREATE TABLE IF NOT EXISTS campaign_triggers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  trigger_type TEXT NOT NULL CHECK (trigger_type IN ('birthday', 'anniversary', 'dormant_user', 'first_purchase', 'milestone')),
  campaign_id UUID REFERENCES discount_campaigns(id),
  conditions JSONB NOT NULL DEFAULT '{}', -- {"days_before_birthday": 7, "dormant_days": 30}
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Customer Segment Assignments (cached for performance)
CREATE TABLE IF NOT EXISTS customer_segment_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES profiles(id),
  segment_id UUID NOT NULL REFERENCES user_segments(id),
  assigned_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  UNIQUE(customer_id, segment_id)
);

-- Indexes for performance
CREATE INDEX idx_customer_memberships_customer ON customer_memberships(customer_id);
CREATE INDEX idx_customer_memberships_status ON customer_memberships(status);
CREATE INDEX idx_customer_memberships_expires ON customer_memberships(expires_at);
CREATE INDEX idx_discount_campaigns_dates ON discount_campaigns(start_date, end_date);
CREATE INDEX idx_discount_campaigns_type ON discount_campaigns(campaign_type);
CREATE INDEX idx_discount_codes_code ON discount_codes(code);
CREATE INDEX idx_discount_usage_customer ON customer_discount_usage(customer_id);
CREATE INDEX idx_customer_segments_customer ON customer_segment_assignments(customer_id);
CREATE INDEX idx_customer_segments_segment ON customer_segment_assignments(segment_id);
CREATE INDEX idx_campaign_triggers_type ON campaign_triggers(trigger_type);

-- RLS Policies
ALTER TABLE membership_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE discount_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE discount_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE discount_stacking_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE discount_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_discount_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_method_discounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE warehouse_storage_benefits ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_triggers ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_segment_assignments ENABLE ROW LEVEL SECURITY;

-- Membership Plans - Public read, admin write
CREATE POLICY "Anyone can view active membership plans" ON membership_plans
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage membership plans" ON membership_plans
  FOR ALL USING (is_admin());

-- Customer Memberships - Users see own, admins see all
CREATE POLICY "Users can view own memberships" ON customer_memberships
  FOR SELECT USING (auth.uid() = customer_id OR is_admin());

CREATE POLICY "Users can update own membership settings" ON customer_memberships
  FOR UPDATE USING (auth.uid() = customer_id) 
  WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Admins can manage all memberships" ON customer_memberships
  FOR ALL USING (is_admin());

-- User Segments - Admin only
CREATE POLICY "Admins can manage user segments" ON user_segments
  FOR ALL USING (is_admin());

-- Discount Types - Public read, admin write
CREATE POLICY "Anyone can view active discount types" ON discount_types
  FOR SELECT USING (is_active = true OR is_admin());

CREATE POLICY "Admins can manage discount types" ON discount_types
  FOR ALL USING (is_admin());

-- Discount Campaigns - Public read active, admin all
CREATE POLICY "View active discount campaigns" ON discount_campaigns
  FOR SELECT USING (
    is_active = true 
    AND CURRENT_TIMESTAMP >= start_date 
    AND (end_date IS NULL OR CURRENT_TIMESTAMP <= end_date)
    OR is_admin()
  );

CREATE POLICY "Admins can manage campaigns" ON discount_campaigns
  FOR ALL USING (is_admin());

-- Stacking Rules - Admin only
CREATE POLICY "Admins can manage stacking rules" ON discount_stacking_rules
  FOR ALL USING (is_admin());

-- Discount Codes - Validate on use
CREATE POLICY "Anyone can validate discount codes" ON discount_codes
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage discount codes" ON discount_codes
  FOR ALL USING (is_admin());

-- Usage History - Users see own, admins see all
CREATE POLICY "Users can view own discount usage" ON customer_discount_usage
  FOR SELECT USING (auth.uid() = customer_id OR is_admin());

CREATE POLICY "System can record discount usage" ON customer_discount_usage
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can manage usage history" ON customer_discount_usage
  FOR ALL USING (is_admin());

-- Payment Method Discounts - Public read, admin write
CREATE POLICY "Anyone can view payment discounts" ON payment_method_discounts
  FOR SELECT USING (is_active = true OR is_admin());

CREATE POLICY "Admins can manage payment discounts" ON payment_method_discounts
  FOR ALL USING (is_admin());

-- Warehouse Benefits - Public read, admin write
CREATE POLICY "Anyone can view warehouse benefits" ON warehouse_storage_benefits
  FOR SELECT USING (is_active = true OR is_admin());

CREATE POLICY "Admins can manage warehouse benefits" ON warehouse_storage_benefits
  FOR ALL USING (is_admin());

-- Campaign Triggers - Admin only
CREATE POLICY "Admins can manage campaign triggers" ON campaign_triggers
  FOR ALL USING (is_admin());

-- Customer Segments - Users see own, admins see all
CREATE POLICY "Users can view own segments" ON customer_segment_assignments
  FOR SELECT USING (auth.uid() = customer_id OR is_admin());

CREATE POLICY "Admins can manage segment assignments" ON customer_segment_assignments
  FOR ALL USING (is_admin());

-- Helper Functions
CREATE OR REPLACE FUNCTION check_customer_membership(p_customer_id UUID)
RETURNS TABLE (
  has_membership BOOLEAN,
  membership_type TEXT,
  expires_at TIMESTAMPTZ,
  benefits JSONB,
  warehouse_benefits JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) > 0 as has_membership,
    mp.slug as membership_type,
    cm.expires_at,
    mp.benefits,
    mp.warehouse_benefits
  FROM customer_memberships cm
  JOIN membership_plans mp ON cm.plan_id = mp.id
  WHERE cm.customer_id = p_customer_id
    AND cm.status = 'active'
    AND cm.expires_at > CURRENT_TIMESTAMP
  ORDER BY cm.expires_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Calculate warehouse storage fees with membership benefits
CREATE OR REPLACE FUNCTION calculate_storage_fees(
  p_customer_id UUID,
  p_package_id UUID,
  p_storage_days INTEGER
)
RETURNS TABLE (
  base_fee DECIMAL,
  discount_percentage DECIMAL,
  final_fee DECIMAL,
  free_days_used INTEGER
) AS $$
DECLARE
  v_membership RECORD;
  v_base_daily_fee DECIMAL := 0.50; -- $0.50 per day base fee
  v_free_days INTEGER := 0;
  v_discount_pct DECIMAL := 0;
BEGIN
  -- Check membership benefits
  SELECT * FROM check_customer_membership(p_customer_id) INTO v_membership;
  
  IF v_membership.has_membership THEN
    v_free_days := COALESCE((v_membership.warehouse_benefits->>'free_storage_days')::INTEGER, 0);
    v_discount_pct := COALESCE((v_membership.warehouse_benefits->>'discount_percentage_after_free')::DECIMAL, 0);
  END IF;

  -- Calculate fees
  RETURN QUERY
  SELECT 
    (GREATEST(p_storage_days - v_free_days, 0) * v_base_daily_fee) as base_fee,
    v_discount_pct as discount_percentage,
    (GREATEST(p_storage_days - v_free_days, 0) * v_base_daily_fee * (1 - v_discount_pct/100)) as final_fee,
    LEAST(p_storage_days, v_free_days) as free_days_used;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Calculate applicable discounts for a quote with stacking rules
CREATE OR REPLACE FUNCTION calculate_applicable_discounts(
  p_customer_id UUID,
  p_quote_total DECIMAL,
  p_handling_fee DECIMAL,
  p_payment_method TEXT DEFAULT NULL,
  p_country_code TEXT DEFAULT NULL
)
RETURNS TABLE (
  discount_source TEXT,
  discount_type TEXT,
  discount_value DECIMAL,
  discount_amount DECIMAL,
  applies_to TEXT,
  is_stackable BOOLEAN
) AS $$
DECLARE
  v_has_membership BOOLEAN;
  v_membership_type TEXT;
  v_order_size_category TEXT;
  v_total_discount DECIMAL := 0;
  v_max_discount DECIMAL;
  v_stacking_rules RECORD;
BEGIN
  -- Determine order size category
  IF p_quote_total < 500 THEN
    v_order_size_category := 'small';
    v_max_discount := p_handling_fee; -- Can only discount handling fee
  ELSE
    v_order_size_category := 'large';
    v_max_discount := p_handling_fee * 0.5; -- Can discount up to 50% of handling fee from total
  END IF;

  -- Get stacking rules
  SELECT * INTO v_stacking_rules 
  FROM discount_stacking_rules 
  WHERE is_active = true 
  ORDER BY priority DESC 
  LIMIT 1;

  -- Check membership status
  SELECT (check_customer_membership(p_customer_id)).has_membership,
         (check_customer_membership(p_customer_id)).membership_type
  INTO v_has_membership, v_membership_type;

  -- Membership discount (2% for Plus members)
  IF v_has_membership AND v_membership_type = 'plus' THEN
    RETURN QUERY
    SELECT 
      'membership'::TEXT,
      'percentage'::TEXT,
      2.0::DECIMAL,
      CASE 
        WHEN v_order_size_category = 'small' THEN p_handling_fee * 0.02
        ELSE LEAST(p_quote_total * 0.02, v_max_discount * 0.4) -- Takes 40% of max discount allowance
      END,
      CASE 
        WHEN v_order_size_category = 'small' THEN 'handling'::TEXT
        ELSE 'total'::TEXT
      END,
      true::BOOLEAN;
  END IF;

  -- Payment method discount
  IF p_payment_method IS NOT NULL THEN
    RETURN QUERY
    SELECT 
      'payment_method'::TEXT,
      'percentage'::TEXT,
      pmd.discount_percentage,
      CASE 
        WHEN v_order_size_category = 'small' THEN p_handling_fee * (pmd.discount_percentage / 100)
        ELSE LEAST(p_quote_total * (pmd.discount_percentage / 100), v_max_discount * 0.4)
      END,
      CASE 
        WHEN v_order_size_category = 'small' THEN 'handling'::TEXT
        ELSE 'total'::TEXT
      END,
      pmd.is_stackable
    FROM payment_method_discounts pmd
    WHERE pmd.payment_method = p_payment_method
      AND pmd.is_active = true
    LIMIT 1;
  END IF;

  -- Auto-applied campaigns (time-based, user-triggered)
  RETURN QUERY
  WITH eligible_campaigns AS (
    SELECT 
      dc.*,
      dt.type as discount_type,
      dt.value as discount_value,
      dt.conditions
    FROM discount_campaigns dc
    JOIN discount_types dt ON dc.discount_type_id = dt.id
    WHERE dc.is_active = true
      AND dc.auto_apply = true
      AND CURRENT_TIMESTAMP BETWEEN dc.start_date AND COALESCE(dc.end_date, CURRENT_TIMESTAMP + INTERVAL '1 year')
      AND (dc.usage_limit IS NULL OR dc.usage_count < dc.usage_limit)
      AND (
        -- Check target audience
        dc.target_audience = '{}'::JSONB
        OR (v_has_membership AND dc.target_audience->'membership' ? v_membership_type)
        OR (p_country_code IS NOT NULL AND dc.target_audience->'countries' ? p_country_code)
      )
      AND (
        -- Check time-based triggers (happy hour, weekend, etc)
        dc.campaign_type != 'time_based'
        OR (
          dc.trigger_rules->>'happy_hour' IS NOT NULL
          AND EXTRACT(DOW FROM CURRENT_TIMESTAMP) = ANY(ARRAY(SELECT jsonb_array_elements_text(dc.trigger_rules->'happy_hour'->'days'))::INT[])
          AND EXTRACT(HOUR FROM CURRENT_TIMESTAMP) = ANY(ARRAY(SELECT jsonb_array_elements_text(dc.trigger_rules->'happy_hour'->'hours'))::INT[])
        )
      )
  )
  SELECT 
    'campaign'::TEXT,
    ec.discount_type,
    ec.discount_value,
    CASE 
      WHEN v_order_size_category = 'small' AND ec.conditions->>'applicable_to' != 'total' THEN
        CASE 
          WHEN ec.discount_type = 'percentage' THEN p_handling_fee * (ec.discount_value / 100)
          ELSE LEAST(ec.discount_value, p_handling_fee)
        END
      ELSE
        CASE 
          WHEN ec.discount_type = 'percentage' THEN 
            LEAST(p_quote_total * (ec.discount_value / 100), v_max_discount * 0.2) -- Takes 20% of max discount
          ELSE 
            LEAST(ec.discount_value, v_max_discount * 0.2)
        END
    END,
    COALESCE(ec.conditions->>'applicable_to', 
      CASE WHEN v_order_size_category = 'small' THEN 'handling' ELSE 'total' END
    )::TEXT,
    true::BOOLEAN
  FROM eligible_campaigns ec
  ORDER BY ec.priority DESC, ec.discount_value DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update customer segments (run periodically)
CREATE OR REPLACE FUNCTION update_customer_segments()
RETURNS void AS $$
DECLARE
  v_segment RECORD;
  v_customer RECORD;
BEGIN
  -- Clear expired assignments
  DELETE FROM customer_segment_assignments
  WHERE expires_at < CURRENT_TIMESTAMP;

  -- Process each segment
  FOR v_segment IN SELECT * FROM user_segments WHERE is_active = true
  LOOP
    -- Find customers matching segment conditions
    FOR v_customer IN 
      SELECT DISTINCT p.id
      FROM profiles p
      LEFT JOIN orders o ON o.customer_id = p.id
      LEFT JOIN customer_memberships cm ON cm.customer_id = p.id AND cm.status = 'active'
      WHERE 
        -- Check various conditions based on segment rules
        CASE 
          WHEN v_segment.conditions->>'days_since_last_order' IS NOT NULL THEN
            (SELECT MAX(created_at) FROM orders WHERE customer_id = p.id) < 
            CURRENT_TIMESTAMP - ((v_segment.conditions->>'days_since_last_order')::INTEGER || ' days')::INTERVAL
          ELSE true
        END
        AND CASE 
          WHEN v_segment.conditions->'total_orders'->>'min' IS NOT NULL THEN
            (SELECT COUNT(*) FROM orders WHERE customer_id = p.id) >= 
            (v_segment.conditions->'total_orders'->>'min')::INTEGER
          ELSE true
        END
        AND CASE 
          WHEN v_segment.conditions->'membership' IS NOT NULL THEN
            cm.plan_id IN (
              SELECT id FROM membership_plans 
              WHERE slug = ANY(ARRAY(SELECT jsonb_array_elements_text(v_segment.conditions->'membership')))
            )
          ELSE true
        END
    LOOP
      -- Assign to segment
      INSERT INTO customer_segment_assignments (customer_id, segment_id)
      VALUES (v_customer.id, v_segment.id)
      ON CONFLICT (customer_id, segment_id) DO NOTHING;
    END LOOP;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for automated campaigns (birthday, anniversary, etc)
CREATE OR REPLACE FUNCTION process_campaign_triggers()
RETURNS void AS $$
DECLARE
  v_trigger RECORD;
  v_customer RECORD;
BEGIN
  FOR v_trigger IN 
    SELECT ct.*, dc.* 
    FROM campaign_triggers ct
    JOIN discount_campaigns dc ON ct.campaign_id = dc.id
    WHERE ct.is_active = true AND dc.is_active = true
  LOOP
    CASE v_trigger.trigger_type
      WHEN 'birthday' THEN
        -- Find customers with upcoming birthdays
        FOR v_customer IN 
          SELECT id, email FROM profiles
          WHERE EXTRACT(MONTH FROM date_of_birth) = EXTRACT(MONTH FROM CURRENT_DATE)
            AND EXTRACT(DAY FROM date_of_birth) BETWEEN 
              EXTRACT(DAY FROM CURRENT_DATE) AND 
              EXTRACT(DAY FROM CURRENT_DATE) + COALESCE((v_trigger.conditions->>'days_before_birthday')::INTEGER, 7)
        LOOP
          -- Create personalized discount code or notification
          -- This would integrate with your notification system
          NULL; -- Placeholder for notification logic
        END LOOP;
        
      WHEN 'dormant_user' THEN
        -- Handled by segment updates
        NULL;
        
      -- Add more trigger types as needed
    END CASE;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Seed initial data
INSERT INTO membership_plans (name, slug, description, benefits, pricing, warehouse_benefits, duration_days)
VALUES (
  'iwishBag Plus',
  'plus',
  'Premium membership with exclusive benefits',
  '[
    "FREE warehouse address for 90 days",
    "2% additional discount on all orders",
    "Free insurance on all shipments",
    "Priority customer support",
    "Early access to deals",
    "Exclusive member-only offers"
  ]'::JSONB,
  '{"USD": 99, "INR": 4999, "NPR": 8999}'::JSONB,
  '{"free_storage_days": 90, "discount_percentage_after_free": 50}'::JSONB,
  365
) ON CONFLICT (slug) DO NOTHING;

-- Insert bank transfer discount
INSERT INTO payment_method_discounts (payment_method, discount_percentage, is_stackable)
VALUES 
  ('bank_transfer', 2.0, true),
  ('wire_transfer', 2.0, true)
ON CONFLICT DO NOTHING;

-- Insert default stacking rule
INSERT INTO discount_stacking_rules (name, description, allowed_combinations, max_stack_count, max_total_discount_percentage)
VALUES (
  'Default Stacking Rule',
  'Allows membership + payment method + one campaign',
  '["membership", "payment_method", "campaign"]'::JSONB,
  3,
  30.00
) ON CONFLICT DO NOTHING;

-- Insert user segments
INSERT INTO user_segments (name, slug, description, conditions) VALUES
  ('New Customers', 'new-customers', 'Customers with less than 2 orders', '{"total_orders": {"max": 1}}'::JSONB),
  ('VIP Customers', 'vip-customers', 'High-value customers with 10+ orders', '{"total_orders": {"min": 10}}'::JSONB),
  ('Dormant Users', 'dormant-users', 'Users inactive for 30+ days', '{"days_since_last_order": 30}'::JSONB),
  ('Plus Members', 'plus-members', 'Active Plus membership holders', '{"membership": ["plus"]}'::JSONB)
ON CONFLICT (slug) DO NOTHING;

-- Insert warehouse storage benefit for Plus membership
INSERT INTO warehouse_storage_benefits (benefit_type, reference_id, free_storage_days, discount_percentage_after_free)
SELECT 'membership', id, 90, 50
FROM membership_plans
WHERE slug = 'plus'
ON CONFLICT DO NOTHING;

-- Trigger to update membership expiry
CREATE OR REPLACE FUNCTION update_membership_expiry()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'active' AND OLD.status != 'active' THEN
    NEW.expires_at := NEW.started_at + (
      SELECT duration_days * INTERVAL '1 day' 
      FROM membership_plans 
      WHERE id = NEW.plan_id
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER membership_expiry_trigger
  BEFORE INSERT OR UPDATE ON customer_memberships
  FOR EACH ROW
  EXECUTE FUNCTION update_membership_expiry();

-- Update updated_at timestamp triggers
CREATE TRIGGER update_membership_plans_updated_at BEFORE UPDATE ON membership_plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customer_memberships_updated_at BEFORE UPDATE ON customer_memberships
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_discount_campaigns_updated_at BEFORE UPDATE ON discount_campaigns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_segments_updated_at BEFORE UPDATE ON user_segments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create scheduled jobs (these would be called by your backend cron/scheduler)
-- Run update_customer_segments() daily
-- Run process_campaign_triggers() hourly

-- Get membership statistics for admin dashboard
CREATE OR REPLACE FUNCTION get_membership_stats()
RETURNS TABLE (
  total_members BIGINT,
  active_members BIGINT,
  expired_members BIGINT,
  revenue_this_month DECIMAL,
  churn_rate DECIMAL,
  average_lifetime_value DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  WITH membership_data AS (
    SELECT 
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE status = 'active' AND expires_at > CURRENT_TIMESTAMP) as active,
      COUNT(*) FILTER (WHERE status = 'expired' OR expires_at < CURRENT_TIMESTAMP) as expired,
      COUNT(*) FILTER (WHERE status = 'cancelled' AND created_at > CURRENT_TIMESTAMP - INTERVAL '30 days') as churned_this_month,
      COUNT(*) FILTER (WHERE created_at > CURRENT_TIMESTAMP - INTERVAL '30 days') as new_this_month
    FROM customer_memberships
  ),
  revenue_data AS (
    SELECT 
      COALESCE(SUM(
        CASE 
          WHEN mp.pricing->>'USD' IS NOT NULL THEN (mp.pricing->>'USD')::DECIMAL
          ELSE 99 -- Default Plus price
        END
      ), 0) as monthly_revenue
    FROM customer_memberships cm
    JOIN membership_plans mp ON cm.plan_id = mp.id
    WHERE cm.created_at > CURRENT_TIMESTAMP - INTERVAL '30 days'
      AND cm.status = 'active'
  )
  SELECT 
    md.total,
    md.active,
    md.expired,
    rd.monthly_revenue,
    CASE 
      WHEN md.new_this_month > 0 THEN (md.churned_this_month::DECIMAL / md.new_this_month) * 100
      ELSE 0
    END as churn_rate,
    CASE 
      WHEN md.total > 0 THEN rd.monthly_revenue * 12 / md.total
      ELSE 0
    END as avg_ltv
  FROM membership_data md, revenue_data rd;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get discount statistics for admin dashboard
CREATE OR REPLACE FUNCTION get_discount_stats()
RETURNS TABLE (
  total_discounts_used BIGINT,
  total_savings DECIMAL,
  active_campaigns BIGINT,
  conversion_rate DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  WITH discount_data AS (
    SELECT 
      COUNT(DISTINCT cdu.id) as total_used,
      COALESCE(SUM(cdu.discount_amount), 0) as total_saved
    FROM customer_discount_usage cdu
  ),
  campaign_data AS (
    SELECT COUNT(*) as active_count
    FROM discount_campaigns
    WHERE is_active = true
      AND CURRENT_TIMESTAMP BETWEEN start_date AND COALESCE(end_date, CURRENT_TIMESTAMP + INTERVAL '1 year')
  ),
  conversion_data AS (
    SELECT 
      COUNT(DISTINCT q.id) FILTER (WHERE cdu.id IS NOT NULL)::DECIMAL / 
      GREATEST(COUNT(DISTINCT q.id), 1) * 100 as conv_rate
    FROM quotes q
    LEFT JOIN customer_discount_usage cdu ON cdu.quote_id = q.id
    WHERE q.created_at > CURRENT_TIMESTAMP - INTERVAL '30 days'
  )
  SELECT 
    dd.total_used,
    dd.total_saved,
    cd.active_count,
    cvd.conv_rate
  FROM discount_data dd, campaign_data cd, conversion_data cvd;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;