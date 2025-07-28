-- ============================================================================
-- CUSTOMER PREFERENCES INTEGRATION
-- Migration: 20250128000016
-- Purpose: Add customer preferences table for package forwarding integration
-- ============================================================================

-- Create customer preferences table for package forwarding
CREATE TABLE IF NOT EXISTS customer_preferences (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Package forwarding preferences
  default_consolidation_preference text DEFAULT 'ask' CHECK (
    default_consolidation_preference IN ('individual', 'consolidate_always', 'ask')
  ),
  
  -- Notification preferences
  notification_preferences jsonb DEFAULT jsonb_build_object(
    'package_received', true,
    'consolidation_ready', true,
    'quote_available', true,
    'storage_fees_due', true
  ),
  
  -- Shipping preferences
  shipping_preferences jsonb DEFAULT jsonb_build_object(
    'speed_priority', 'medium',
    'cost_priority', 'high',
    'insurance_required', false
  ),
  
  -- Other preferences
  other_preferences jsonb DEFAULT '{}',
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_customer_preferences_user_id ON customer_preferences(user_id);
CREATE INDEX idx_customer_preferences_profile_id ON customer_preferences(profile_id);

-- Add updated_at trigger
CREATE TRIGGER update_customer_preferences_updated_at 
  BEFORE UPDATE ON customer_preferences 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies
ALTER TABLE customer_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own preferences" ON customer_preferences
  FOR SELECT USING (auth.uid() = user_id OR is_admin());

CREATE POLICY "Users can update own preferences" ON customer_preferences
  FOR UPDATE USING (auth.uid() = user_id OR is_admin());

CREATE POLICY "Users can insert own preferences" ON customer_preferences
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all preferences" ON customer_preferences
  FOR ALL USING (is_admin());

-- Grant permissions
GRANT ALL ON TABLE customer_preferences TO authenticated;
GRANT ALL ON TABLE customer_preferences TO service_role;

-- Function to get or create customer preferences
CREATE OR REPLACE FUNCTION get_or_create_customer_preferences(p_user_id uuid)
RETURNS customer_preferences
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_preferences customer_preferences;
  v_profile_id uuid;
BEGIN
  -- Try to get existing preferences
  SELECT * INTO v_preferences
  FROM customer_preferences
  WHERE user_id = p_user_id;
  
  -- If not found, create with defaults
  IF NOT FOUND THEN
    -- Get profile_id if exists
    SELECT id INTO v_profile_id
    FROM profiles
    WHERE id = p_user_id;
    
    INSERT INTO customer_preferences (user_id, profile_id)
    VALUES (p_user_id, v_profile_id)
    RETURNING * INTO v_preferences;
  END IF;
  
  RETURN v_preferences;
END;
$$;

GRANT EXECUTE ON FUNCTION get_or_create_customer_preferences(uuid) TO authenticated;

COMMENT ON TABLE customer_preferences IS 'Customer preferences for package forwarding and other services';
COMMENT ON FUNCTION get_or_create_customer_preferences(uuid) IS 'Get existing preferences or create with defaults';