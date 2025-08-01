-- Create BNPL System Tables

-- BNPL Plans
CREATE TABLE IF NOT EXISTS bnpl_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  installments INTEGER NOT NULL CHECK (installments > 0),
  interest_rate DECIMAL(5,2) DEFAULT 0 CHECK (interest_rate >= 0),
  processing_fee DECIMAL(5,2) DEFAULT 0 CHECK (processing_fee >= 0),
  late_fee DECIMAL(5,2) DEFAULT 25 CHECK (late_fee >= 0),
  min_amount DECIMAL(10,2) NOT NULL CHECK (min_amount >= 0),
  max_amount DECIMAL(10,2) NOT NULL CHECK (max_amount > min_amount),
  countries TEXT[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- BNPL Applications
CREATE TABLE IF NOT EXISTS bnpl_applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  order_id UUID NOT NULL, -- References orders table
  amount_usd DECIMAL(10,2) NOT NULL CHECK (amount_usd > 0),
  currency VARCHAR(3) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'active', 'completed', 'defaulted')),
  credit_score INTEGER,
  risk_level VARCHAR(20) CHECK (risk_level IN ('low', 'medium', 'high')),
  decision_reason TEXT,
  deposit_amount DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Payment Schedules
CREATE TABLE IF NOT EXISTS bnpl_schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id UUID REFERENCES bnpl_applications(id) ON DELETE CASCADE NOT NULL,
  installment_number INTEGER NOT NULL CHECK (installment_number > 0),
  due_date DATE NOT NULL,
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  status VARCHAR(50) NOT NULL DEFAULT 'scheduled'
    CHECK (status IN ('scheduled', 'pending', 'paid', 'late', 'defaulted')),
  paid_date TIMESTAMP WITH TIME ZONE,
  payment_method VARCHAR(50),
  transaction_id VARCHAR(255),
  late_fee DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(application_id, installment_number)
);

-- Customer Credit Profiles
CREATE TABLE IF NOT EXISTS customer_credit_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id),
  credit_score INTEGER DEFAULT 500 CHECK (credit_score >= 300 AND credit_score <= 850),
  credit_limit DECIMAL(10,2) DEFAULT 100 CHECK (credit_limit >= 0),
  available_credit DECIMAL(10,2) DEFAULT 100 CHECK (available_credit >= 0),
  payment_history_score INTEGER DEFAULT 100 CHECK (payment_history_score >= 0 AND payment_history_score <= 100),
  total_bnpl_used INTEGER DEFAULT 0,
  on_time_payments INTEGER DEFAULT 0,
  late_payments INTEGER DEFAULT 0,
  defaulted_payments INTEGER DEFAULT 0,
  kyc_verified BOOLEAN DEFAULT false,
  kyc_documents JSONB DEFAULT '{}',
  risk_flags JSONB DEFAULT '{}',
  monthly_income DECIMAL(10,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Payment Reminders
CREATE TABLE IF NOT EXISTS bnpl_reminders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  schedule_id UUID REFERENCES bnpl_schedules(id) ON DELETE CASCADE NOT NULL,
  reminder_type VARCHAR(50) NOT NULL CHECK (reminder_type IN ('email', 'sms', 'push', 'in_app')),
  sent_at TIMESTAMP WITH TIME ZONE,
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  response JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX idx_bnpl_applications_user_id ON bnpl_applications(user_id);
CREATE INDEX idx_bnpl_applications_order_id ON bnpl_applications(order_id);
CREATE INDEX idx_bnpl_applications_status ON bnpl_applications(status);
CREATE INDEX idx_bnpl_schedules_application_id ON bnpl_schedules(application_id);
CREATE INDEX idx_bnpl_schedules_due_date ON bnpl_schedules(due_date);
CREATE INDEX idx_bnpl_schedules_status ON bnpl_schedules(status);
CREATE INDEX idx_bnpl_reminders_schedule_id ON bnpl_reminders(schedule_id);
CREATE INDEX idx_bnpl_reminders_status ON bnpl_reminders(status);

-- RLS Policies
ALTER TABLE bnpl_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE bnpl_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_credit_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE bnpl_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE bnpl_plans ENABLE ROW LEVEL SECURITY;

-- Customers can view their own BNPL data
CREATE POLICY "Users can view own BNPL applications"
  ON bnpl_applications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view own payment schedules"
  ON bnpl_schedules FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM bnpl_applications
      WHERE bnpl_applications.id = bnpl_schedules.application_id
      AND bnpl_applications.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view own credit profile"
  ON customer_credit_profiles FOR SELECT
  USING (auth.uid() = user_id);

-- Admin policies
CREATE POLICY "Admins can manage all BNPL data"
  ON bnpl_applications FOR ALL
  USING (is_admin());

CREATE POLICY "Admins can manage all schedules"
  ON bnpl_schedules FOR ALL
  USING (is_admin());

CREATE POLICY "Admins can manage all credit profiles"
  ON customer_credit_profiles FOR ALL
  USING (is_admin());

CREATE POLICY "Admins can manage all reminders"
  ON bnpl_reminders FOR ALL
  USING (is_admin());

CREATE POLICY "Everyone can view active BNPL plans"
  ON bnpl_plans FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage BNPL plans"
  ON bnpl_plans FOR ALL
  USING (is_admin());

-- Functions for BNPL system
CREATE OR REPLACE FUNCTION calculate_payment_schedule(
  p_amount DECIMAL,
  p_installments INTEGER,
  p_start_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  installment_number INTEGER,
  due_date DATE,
  amount DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    generate_series(1, p_installments) AS installment_number,
    p_start_date + (generate_series(1, p_installments) - 1) * INTERVAL '1 month' AS due_date,
    ROUND(p_amount / p_installments, 2) AS amount;
END;
$$ LANGUAGE plpgsql;

-- Function to check BNPL eligibility
CREATE OR REPLACE FUNCTION check_bnpl_eligibility(
  p_user_id UUID,
  p_order_amount DECIMAL
)
RETURNS JSONB AS $$
DECLARE
  v_credit_profile customer_credit_profiles%ROWTYPE;
  v_eligible BOOLEAN := false;
  v_reason TEXT;
BEGIN
  -- Get or create credit profile
  SELECT * INTO v_credit_profile
  FROM customer_credit_profiles
  WHERE user_id = p_user_id;

  IF NOT FOUND THEN
    -- Create default profile
    INSERT INTO customer_credit_profiles (user_id)
    VALUES (p_user_id)
    RETURNING * INTO v_credit_profile;
  END IF;

  -- Check eligibility
  IF v_credit_profile.credit_score < 400 THEN
    v_reason := 'Credit score too low';
  ELSIF p_order_amount > v_credit_profile.available_credit THEN
    v_reason := 'Insufficient available credit';
  ELSIF v_credit_profile.defaulted_payments > 0 THEN
    v_reason := 'Previous payment defaults';
  ELSE
    v_eligible := true;
  END IF;

  RETURN jsonb_build_object(
    'eligible', v_eligible,
    'reason', v_reason,
    'credit_score', v_credit_profile.credit_score,
    'credit_limit', v_credit_profile.credit_limit,
    'available_credit', v_credit_profile.available_credit,
    'requires_kyc', NOT v_credit_profile.kyc_verified AND p_order_amount > 500
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Triggers
CREATE OR REPLACE FUNCTION update_bnpl_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_bnpl_applications_updated_at
  BEFORE UPDATE ON bnpl_applications
  FOR EACH ROW EXECUTE FUNCTION update_bnpl_updated_at();

CREATE TRIGGER update_bnpl_schedules_updated_at
  BEFORE UPDATE ON bnpl_schedules
  FOR EACH ROW EXECUTE FUNCTION update_bnpl_updated_at();

CREATE TRIGGER update_customer_credit_profiles_updated_at
  BEFORE UPDATE ON customer_credit_profiles
  FOR EACH ROW EXECUTE FUNCTION update_bnpl_updated_at();

-- Insert default BNPL plans
INSERT INTO bnpl_plans (name, description, installments, interest_rate, processing_fee, min_amount, max_amount, countries) VALUES
('Pay in 2', 'Split your purchase into 2 interest-free payments', 2, 0, 0, 50, 1000, ARRAY['US', 'IN', 'SG', 'MY', 'TH', 'PH', 'VN', 'ID']),
('Pay in 3', 'Split your purchase into 3 interest-free payments', 3, 0, 0, 100, 2000, ARRAY['US', 'IN', 'SG', 'MY', 'TH', 'PH', 'VN', 'ID']),
('Pay in 4', 'Split your purchase into 4 interest-free payments', 4, 0, 0, 200, 3000, ARRAY['US', 'IN', 'SG', 'MY', 'TH', 'PH', 'VN', 'ID']),
('Pay in 6', 'Split your purchase into 6 monthly payments', 6, 0, 2.5, 500, 5000, ARRAY['US', 'IN', 'SG'])
ON CONFLICT DO NOTHING;