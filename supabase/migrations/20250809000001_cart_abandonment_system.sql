-- Cart Abandonment Recovery System
-- Creates tables and functions for tracking and recovering abandoned carts

-- Cart abandonment events table
CREATE TABLE IF NOT EXISTS cart_abandonment_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL, -- For guest users
  cart_items JSONB NOT NULL, -- Snapshot of cart items at abandonment
  cart_value DECIMAL(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  abandonment_stage TEXT NOT NULL CHECK (abandonment_stage IN ('cart', 'checkout', 'payment')),
  user_email TEXT, -- Store email for guest users
  user_phone TEXT, -- Optional for SMS recovery
  
  -- Context data
  page_url TEXT,
  user_agent TEXT,
  referrer TEXT,
  country TEXT,
  
  -- Timestamps
  abandoned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Recovery status
  is_recovered BOOLEAN DEFAULT FALSE,
  recovered_at TIMESTAMPTZ,
  recovery_method TEXT, -- 'email', 'notification', 'organic'
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cart recovery attempts table
CREATE TABLE IF NOT EXISTS cart_recovery_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  abandonment_event_id UUID REFERENCES cart_abandonment_events(id) ON DELETE CASCADE,
  
  -- Attempt details
  attempt_type TEXT NOT NULL CHECK (attempt_type IN ('email', 'push_notification', 'sms')),
  sequence_number INTEGER NOT NULL DEFAULT 1, -- 1st email, 2nd email, etc.
  
  -- Email/notification details
  subject_line TEXT,
  template_id TEXT,
  incentive_offered TEXT, -- 'none', '5_percent_off', 'free_shipping', etc.
  
  -- Delivery status
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  delivered_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  
  -- Response tracking
  user_returned BOOLEAN DEFAULT FALSE,
  returned_at TIMESTAMPTZ,
  conversion_achieved BOOLEAN DEFAULT FALSE,
  converted_at TIMESTAMPTZ,
  
  -- A/B testing
  variant_group TEXT DEFAULT 'control', -- For A/B testing
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cart recovery analytics table (for aggregated insights)
CREATE TABLE IF NOT EXISTS cart_recovery_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  
  -- Abandonment stats
  total_abandonments INTEGER DEFAULT 0,
  cart_stage_abandonments INTEGER DEFAULT 0,
  checkout_stage_abandonments INTEGER DEFAULT 0,
  payment_stage_abandonments INTEGER DEFAULT 0,
  
  -- Recovery stats
  total_recovery_attempts INTEGER DEFAULT 0,
  email_attempts INTEGER DEFAULT 0,
  notification_attempts INTEGER DEFAULT 0,
  
  -- Success metrics
  total_recoveries INTEGER DEFAULT 0,
  email_recoveries INTEGER DEFAULT 0,
  notification_recoveries INTEGER DEFAULT 0,
  organic_recoveries INTEGER DEFAULT 0, -- Users who returned without prompt
  
  -- Revenue impact
  abandoned_value DECIMAL(12,2) DEFAULT 0,
  recovered_value DECIMAL(12,2) DEFAULT 0,
  recovery_rate DECIMAL(5,2) DEFAULT 0, -- Percentage
  
  -- Segmentation
  country TEXT,
  user_type TEXT CHECK (user_type IN ('new', 'returning', 'guest')),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure one record per date/country/user_type combination
  UNIQUE(date, country, user_type)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_cart_abandonment_user_id ON cart_abandonment_events(user_id);
CREATE INDEX IF NOT EXISTS idx_cart_abandonment_session_id ON cart_abandonment_events(session_id);
CREATE INDEX IF NOT EXISTS idx_cart_abandonment_abandoned_at ON cart_abandonment_events(abandoned_at);
CREATE INDEX IF NOT EXISTS idx_cart_abandonment_is_recovered ON cart_abandonment_events(is_recovered);
CREATE INDEX IF NOT EXISTS idx_cart_recovery_attempts_abandonment_id ON cart_recovery_attempts(abandonment_event_id);
CREATE INDEX IF NOT EXISTS idx_cart_recovery_analytics_date ON cart_recovery_analytics(date);

-- RLS Policies
ALTER TABLE cart_abandonment_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_recovery_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_recovery_analytics ENABLE ROW LEVEL SECURITY;

-- Users can only see their own abandonment events
CREATE POLICY "Users can view own abandonment events" ON cart_abandonment_events
  FOR SELECT USING (auth.uid() = user_id);

-- Admins can see all abandonment events
CREATE POLICY "Admins can view all abandonment events" ON cart_abandonment_events
  FOR ALL USING (is_admin());

-- Similar policies for recovery attempts
CREATE POLICY "Users can view own recovery attempts" ON cart_recovery_attempts
  FOR SELECT USING (
    auth.uid() IN (
      SELECT user_id FROM cart_abandonment_events 
      WHERE id = abandonment_event_id
    )
  );

CREATE POLICY "Admins can view all recovery attempts" ON cart_recovery_attempts
  FOR ALL USING (is_admin());

-- Analytics are admin-only
CREATE POLICY "Admins can view recovery analytics" ON cart_recovery_analytics
  FOR ALL USING (is_admin());

-- Functions for cart abandonment detection
CREATE OR REPLACE FUNCTION detect_cart_abandonment(
  p_user_id UUID DEFAULT NULL,
  p_session_id TEXT DEFAULT NULL,
  p_cart_items JSONB DEFAULT '[]'::jsonb,
  p_cart_value DECIMAL DEFAULT 0,
  p_currency TEXT DEFAULT 'USD',
  p_stage TEXT DEFAULT 'cart',
  p_user_email TEXT DEFAULT NULL,
  p_context JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_abandonment_id UUID;
  v_existing_id UUID;
BEGIN
  -- Check if there's already a recent abandonment event for this user/session
  SELECT id INTO v_existing_id
  FROM cart_abandonment_events
  WHERE (
    (p_user_id IS NOT NULL AND user_id = p_user_id) OR
    (p_session_id IS NOT NULL AND session_id = p_session_id)
  )
  AND abandoned_at > NOW() - INTERVAL '1 hour'
  AND is_recovered = FALSE
  ORDER BY abandoned_at DESC
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    -- Update existing abandonment event
    UPDATE cart_abandonment_events
    SET 
      cart_items = p_cart_items,
      cart_value = p_cart_value,
      currency = p_currency,
      abandonment_stage = p_stage,
      last_activity_at = NOW(),
      updated_at = NOW()
    WHERE id = v_existing_id;
    
    RETURN v_existing_id;
  ELSE
    -- Create new abandonment event
    INSERT INTO cart_abandonment_events (
      user_id,
      session_id,
      cart_items,
      cart_value,
      currency,
      abandonment_stage,
      user_email,
      page_url,
      user_agent,
      country
    ) VALUES (
      p_user_id,
      COALESCE(p_session_id, gen_random_uuid()::text),
      p_cart_items,
      p_cart_value,
      p_currency,
      p_stage,
      p_user_email,
      p_context->>'page_url',
      p_context->>'user_agent',
      p_context->>'country'
    )
    RETURNING id INTO v_abandonment_id;
    
    RETURN v_abandonment_id;
  END IF;
END;
$$;

-- Function to mark cart as recovered
CREATE OR REPLACE FUNCTION mark_cart_recovered(
  p_abandonment_id UUID,
  p_recovery_method TEXT DEFAULT 'organic'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE cart_abandonment_events
  SET 
    is_recovered = TRUE,
    recovered_at = NOW(),
    recovery_method = p_recovery_method,
    updated_at = NOW()
  WHERE id = p_abandonment_id
  AND is_recovered = FALSE;
  
  RETURN FOUND;
END;
$$;

-- Function to schedule recovery attempt
CREATE OR REPLACE FUNCTION schedule_recovery_attempt(
  p_abandonment_id UUID,
  p_attempt_type TEXT,
  p_sequence_number INTEGER DEFAULT 1,
  p_template_id TEXT DEFAULT NULL,
  p_incentive TEXT DEFAULT 'none'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_attempt_id UUID;
BEGIN
  INSERT INTO cart_recovery_attempts (
    abandonment_event_id,
    attempt_type,
    sequence_number,
    template_id,
    incentive_offered
  ) VALUES (
    p_abandonment_id,
    p_attempt_type,
    p_sequence_number,
    p_template_id,
    p_incentive
  )
  RETURNING id INTO v_attempt_id;
  
  RETURN v_attempt_id;
END;
$$;

-- Trigger to update updated_at columns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
CREATE TRIGGER update_cart_abandonment_events_updated_at
  BEFORE UPDATE ON cart_abandonment_events
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cart_recovery_attempts_updated_at
  BEFORE UPDATE ON cart_recovery_attempts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cart_recovery_analytics_updated_at
  BEFORE UPDATE ON cart_recovery_analytics
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert some initial analytics data
INSERT INTO cart_recovery_analytics (date, country, user_type)
VALUES 
  (CURRENT_DATE, 'IN', 'new'),
  (CURRENT_DATE, 'IN', 'returning'),
  (CURRENT_DATE, 'NP', 'new'),
  (CURRENT_DATE, 'NP', 'returning'),
  (CURRENT_DATE, 'US', 'guest')
ON CONFLICT (date, country, user_type) DO NOTHING;