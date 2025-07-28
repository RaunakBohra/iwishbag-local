-- Simplified fix for discount system functions

-- 1. Create a simple calculate_applicable_discounts function that works with existing schema
CREATE OR REPLACE FUNCTION calculate_applicable_discounts(
  p_customer_id UUID,
  p_subtotal DECIMAL,
  p_handling_fee DECIMAL,
  p_payment_method TEXT,
  p_country_code TEXT
)
RETURNS TABLE (
  discount_id UUID,
  discount_code TEXT,
  discount_type TEXT,
  value DECIMAL,
  applicable_amount DECIMAL,
  discount_amount DECIMAL,
  priority INTEGER
) AS $$
BEGIN
  -- For now, return payment method discounts if they exist
  RETURN QUERY
  SELECT 
    pmd.id as discount_id,
    pmd.country || '_' || pmd.payment_method as discount_code,
    'percentage' as discount_type,
    pmd.discount_percentage as value,
    p_handling_fee as applicable_amount,
    p_handling_fee * pmd.discount_percentage / 100 as discount_amount,
    100 as priority
  FROM payment_method_discounts pmd
  WHERE pmd.country = p_country_code
    AND pmd.payment_method = p_payment_method
    AND pmd.is_active = true
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Simplify check_customer_membership to avoid GROUP BY issues
CREATE OR REPLACE FUNCTION check_customer_membership(p_customer_id UUID)
RETURNS TABLE (
  has_membership BOOLEAN,
  membership_tier_id UUID,
  membership_tier_name TEXT,
  discount_percentage INTEGER,
  benefits JSONB
) AS $$
DECLARE
  v_membership RECORD;
BEGIN
  -- Get the active membership for the customer
  SELECT 
    mp.id as tier_id,
    mp.name as tier_name,
    mp.discount_percentage,
    mp.benefits
  INTO v_membership
  FROM customer_memberships cm
  JOIN membership_plans mp ON mp.id = cm.membership_tier_id
  WHERE cm.customer_id = p_customer_id 
    AND cm.status = 'active'
    AND (cm.expires_at IS NULL OR cm.expires_at > CURRENT_TIMESTAMP)
    AND mp.is_active = true
  ORDER BY mp.discount_percentage DESC
  LIMIT 1;

  IF v_membership.tier_id IS NOT NULL THEN
    RETURN QUERY SELECT 
      true,
      v_membership.tier_id,
      v_membership.tier_name,
      v_membership.discount_percentage,
      v_membership.benefits;
  ELSE
    RETURN QUERY SELECT 
      false,
      NULL::UUID,
      NULL::TEXT,
      0,
      '{}'::JSONB;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Add max_discounts column to stacking rules if missing
ALTER TABLE discount_stacking_rules
ADD COLUMN IF NOT EXISTS max_discounts INTEGER DEFAULT 1;

-- 4. Insert or update default stacking rule
INSERT INTO discount_stacking_rules (name, is_active, priority, max_discounts)
VALUES ('Default - No Stacking', true, 100, 1)
ON CONFLICT ON CONSTRAINT discount_stacking_rules_pkey DO NOTHING;