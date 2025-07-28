-- Fix discount system database errors properly

-- 1. Add missing priority column to discount_codes table
ALTER TABLE discount_codes 
ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 0;

-- 2. Add priority column to discount_stacking_rules if missing
ALTER TABLE discount_stacking_rules
ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 0;

-- 3. Drop and recreate check_customer_membership function
DROP FUNCTION IF EXISTS check_customer_membership(UUID);

CREATE FUNCTION check_customer_membership(p_customer_id UUID)
RETURNS TABLE (
  has_membership BOOLEAN,
  membership_tier_id UUID,
  membership_tier_name TEXT,
  discount_percentage INTEGER,
  benefits JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    CASE WHEN cm.id IS NOT NULL THEN true ELSE false END as has_membership,
    mp.id as membership_tier_id,
    mp.name as membership_tier_name,
    mp.discount_percentage,
    mp.benefits
  FROM membership_plans mp
  LEFT JOIN customer_memberships cm ON cm.membership_tier_id = mp.id 
    AND cm.customer_id = p_customer_id 
    AND cm.status = 'active'
    AND cm.expires_at > CURRENT_TIMESTAMP
  WHERE mp.is_active = true
  ORDER BY mp.discount_percentage DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Drop and recreate calculate_applicable_discounts function
DROP FUNCTION IF EXISTS calculate_applicable_discounts(UUID, DECIMAL, DECIMAL, TEXT, TEXT);

CREATE FUNCTION calculate_applicable_discounts(
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
  RETURN QUERY
  WITH eligible_discounts AS (
    SELECT 
      d.id,
      d.code,
      d.type,
      d.value,
      COALESCE(d.priority, 0) as priority,
      d.conditions,
      CASE 
        WHEN d.type = 'percentage' THEN 
          CASE d.applies_to
            WHEN 'subtotal' THEN p_subtotal
            WHEN 'handling' THEN p_handling_fee
            WHEN 'total' THEN p_subtotal + p_handling_fee
            ELSE p_subtotal
          END
        ELSE d.value
      END as applicable_amount,
      CASE 
        WHEN d.type = 'percentage' THEN 
          (CASE d.applies_to
            WHEN 'subtotal' THEN p_subtotal
            WHEN 'handling' THEN p_handling_fee
            WHEN 'total' THEN p_subtotal + p_handling_fee
            ELSE p_subtotal
          END * d.value / 100)
        ELSE d.value
      END as discount_amount
    FROM discount_codes d
    WHERE d.is_active = true
      AND (d.valid_from IS NULL OR d.valid_from <= CURRENT_TIMESTAMP)
      AND (d.valid_until IS NULL OR d.valid_until >= CURRENT_TIMESTAMP)
      AND (
        -- Check usage limit
        d.usage_limit IS NULL OR 
        d.usage_count < d.usage_limit
      )
      AND (
        -- Check customer segment
        d.customer_segment IS NULL OR
        d.customer_segment = 'all' OR
        (d.customer_segment = 'new' AND NOT EXISTS (
          SELECT 1 FROM orders WHERE customer_id = p_customer_id AND status = 'completed'
        )) OR
        (d.customer_segment = 'returning' AND EXISTS (
          SELECT 1 FROM orders WHERE customer_id = p_customer_id AND status = 'completed'
        ))
      )
  )
  SELECT 
    ed.id as discount_id,
    ed.code as discount_code,
    ed.type as discount_type,
    ed.value,
    ed.applicable_amount,
    ed.discount_amount,
    ed.priority
  FROM eligible_discounts ed
  WHERE 
    -- Check minimum amount condition
    (ed.conditions->>'min_amount' IS NULL OR 
     (p_subtotal + p_handling_fee)::DECIMAL >= (ed.conditions->>'min_amount')::DECIMAL)
    -- Check payment method condition
    AND (ed.conditions->>'payment_method' IS NULL OR 
         ed.conditions->>'payment_method' = p_payment_method)
    -- Check country condition
    AND (ed.conditions->>'country' IS NULL OR 
         ed.conditions->>'country' = p_country_code)
  ORDER BY ed.priority DESC, ed.discount_amount DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Update existing stacking rule or insert new one
INSERT INTO discount_stacking_rules (name, is_active, priority, max_discounts)
VALUES ('Default - No Stacking', true, 100, 1)
ON CONFLICT (id) DO UPDATE 
SET priority = EXCLUDED.priority
WHERE discount_stacking_rules.priority IS NULL;

-- 6. Update discount_codes with default priority values
UPDATE discount_codes 
SET priority = CASE 
  WHEN type = 'membership' THEN 100
  WHEN applies_to = 'handling' THEN 90
  WHEN type = 'percentage' THEN 80
  ELSE 50
END
WHERE priority IS NULL;

-- 7. Also fix the GROUP BY issue in check_customer_membership by creating a simpler version
CREATE OR REPLACE FUNCTION get_customer_membership(p_customer_id UUID)
RETURNS TABLE (
  membership_id UUID,
  tier_id UUID,
  tier_name TEXT,
  tier_slug TEXT,
  discount_percentage INTEGER,
  benefits JSONB,
  status TEXT,
  expires_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cm.id as membership_id,
    mp.id as tier_id,
    mp.name as tier_name,
    mp.slug as tier_slug,
    mp.discount_percentage,
    mp.benefits,
    cm.status,
    cm.expires_at
  FROM customer_memberships cm
  JOIN membership_plans mp ON mp.id = cm.membership_tier_id
  WHERE cm.customer_id = p_customer_id 
    AND cm.status = 'active'
    AND (cm.expires_at IS NULL OR cm.expires_at > CURRENT_TIMESTAMP)
    AND mp.is_active = true
  ORDER BY mp.discount_percentage DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;