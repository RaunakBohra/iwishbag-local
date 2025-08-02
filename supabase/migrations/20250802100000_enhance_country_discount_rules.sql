-- Enhance country_discount_rules table for hybrid discount approach
-- This migration adds support for both automatic and code-based country discounts

-- Add new columns to country_discount_rules
ALTER TABLE country_discount_rules 
ADD COLUMN IF NOT EXISTS requires_code BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS auto_apply BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 100,
ADD COLUMN IF NOT EXISTS discount_conditions JSONB DEFAULT '{}';

-- Add comments for documentation
COMMENT ON COLUMN country_discount_rules.requires_code IS 'If true, discount only applies when matching code is used';
COMMENT ON COLUMN country_discount_rules.auto_apply IS 'If true, discount applies automatically for eligible customers';
COMMENT ON COLUMN country_discount_rules.description IS 'Human-readable description of the discount rule';
COMMENT ON COLUMN country_discount_rules.priority IS 'Priority for discount application (higher = applied first)';
COMMENT ON COLUMN country_discount_rules.discount_conditions IS 'Additional conditions like min_items, customer_type, etc.';

-- Create index for better performance on country + auto_apply lookups
CREATE INDEX IF NOT EXISTS idx_country_rules_auto_apply 
ON country_discount_rules(country_code, auto_apply, requires_code) 
WHERE auto_apply = true;

-- Update existing India shipping discount to be code-based
UPDATE country_discount_rules 
SET 
  requires_code = true,
  auto_apply = false,
  description = '10% off shipping for Indian orders (requires INDIASHIP10 code)',
  priority = 100
WHERE country_code = 'IN' 
  AND discount_type_id = (
    SELECT id FROM discount_types WHERE code = 'INDIA_SHIP_10'
  );

-- Create some example automatic country benefits
INSERT INTO country_discount_rules (
  discount_type_id, 
  country_code, 
  component_discounts, 
  requires_code, 
  auto_apply, 
  description, 
  priority,
  min_order_amount
) VALUES 
-- India: Free shipping on orders over $100
((SELECT id FROM discount_types WHERE name = 'India Shipping Discount'), 
 'IN', 
 '{"shipping": 100}', 
 false, 
 true, 
 'Free shipping on orders over $100 (automatic)', 
 200,
 100),

-- Nepal: Reduced handling fee automatically  
((SELECT id FROM discount_types WHERE name = 'India Shipping Discount'), 
 'NP', 
 '{"handling": 50}', 
 false, 
 true, 
 '50% off handling fee (automatic)', 
 200,
 50)
ON CONFLICT (discount_type_id, country_code) DO NOTHING;

-- Create discount application audit log
CREATE TABLE IF NOT EXISTS discount_application_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quote_id UUID REFERENCES quotes_v2(id) ON DELETE SET NULL,
    delivery_order_id UUID REFERENCES delivery_orders(id) ON DELETE SET NULL,
    discount_code_id UUID REFERENCES discount_codes(id) ON DELETE SET NULL,
    discount_type_id UUID REFERENCES discount_types(id) ON DELETE CASCADE,
    country_rule_id UUID REFERENCES country_discount_rules(id) ON DELETE SET NULL,
    application_type TEXT CHECK (application_type IN ('automatic', 'manual', 'code', 'campaign')) DEFAULT 'manual',
    customer_id UUID,
    customer_country TEXT,
    discount_amount NUMERIC(10,2),
    original_amount NUMERIC(10,2),
    component_breakdown JSONB DEFAULT '{}',
    conditions_met JSONB DEFAULT '{}',
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for audit log
CREATE INDEX IF NOT EXISTS idx_discount_log_customer 
ON discount_application_log(customer_id, applied_at DESC);

CREATE INDEX IF NOT EXISTS idx_discount_log_quote 
ON discount_application_log(quote_id);

CREATE INDEX IF NOT EXISTS idx_discount_log_type 
ON discount_application_log(application_type, applied_at DESC);

-- Add RLS policies for audit log
ALTER TABLE discount_application_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all discount logs"
ON discount_application_log FOR SELECT
USING (is_admin());

CREATE POLICY "Users can view their own discount logs"
ON discount_application_log FOR SELECT
USING (customer_id = auth.uid());

CREATE POLICY "System can insert discount logs"
ON discount_application_log FOR INSERT
WITH CHECK (true);

-- Grant necessary permissions
GRANT SELECT ON discount_application_log TO authenticated;
GRANT INSERT ON discount_application_log TO authenticated;

-- Update discount_campaigns to ensure auto_apply logic is consistent
UPDATE discount_campaigns 
SET auto_apply = false 
WHERE auto_apply IS NULL;

-- Add index for better campaign performance
CREATE INDEX IF NOT EXISTS idx_campaigns_auto_apply_active 
ON discount_campaigns(auto_apply, is_active, start_date, end_date)
WHERE is_active = true;

-- Add function to check if customer is eligible for automatic discounts
CREATE OR REPLACE FUNCTION get_automatic_country_discounts(
  p_customer_country TEXT,
  p_order_total NUMERIC DEFAULT 0,
  p_customer_id UUID DEFAULT NULL
)
RETURNS TABLE(
  rule_id UUID,
  discount_type_id UUID,
  country_code TEXT,
  component_discounts JSONB,
  description TEXT,
  priority INTEGER,
  conditions_met BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cdr.id,
    cdr.discount_type_id,
    cdr.country_code,
    cdr.component_discounts,
    cdr.description,
    cdr.priority,
    CASE 
      WHEN cdr.min_order_amount IS NULL OR p_order_total >= cdr.min_order_amount THEN true
      ELSE false
    END as conditions_met
  FROM country_discount_rules cdr
  JOIN discount_types dt ON cdr.discount_type_id = dt.id
  WHERE cdr.country_code = p_customer_country
    AND cdr.auto_apply = true
    AND cdr.requires_code = false
    AND dt.is_active = true
  ORDER BY cdr.priority DESC, cdr.created_at DESC;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_automatic_country_discounts(TEXT, NUMERIC, UUID) TO authenticated;

-- Add function to validate discount code eligibility by country
CREATE OR REPLACE FUNCTION validate_country_discount_code(
  p_discount_code TEXT,
  p_customer_country TEXT,
  p_order_total NUMERIC DEFAULT 0
)
RETURNS TABLE(
  is_valid BOOLEAN,
  discount_code_id UUID,
  discount_type_id UUID,
  country_rule_id UUID,
  error_message TEXT,
  discount_details JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_code_record RECORD;
  v_country_rule RECORD;
BEGIN
  -- Check if discount code exists and is active
  SELECT dc.*, dt.* INTO v_code_record
  FROM discount_codes dc
  JOIN discount_types dt ON dc.discount_type_id = dt.id
  WHERE dc.code = UPPER(p_discount_code)
    AND dc.is_active = true
    AND dt.is_active = true
    AND (dc.valid_from IS NULL OR dc.valid_from <= NOW())
    AND (dc.valid_until IS NULL OR dc.valid_until >= NOW());
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, NULL::UUID, NULL::UUID, NULL::UUID, 'Invalid or expired discount code', NULL::JSONB;
    RETURN;
  END IF;
  
  -- Check if there's a country rule for this discount type and country
  SELECT cdr.* INTO v_country_rule
  FROM country_discount_rules cdr
  WHERE cdr.discount_type_id = v_code_record.discount_type_id
    AND cdr.country_code = p_customer_country
    AND cdr.requires_code = true
    AND (cdr.min_order_amount IS NULL OR p_order_total >= cdr.min_order_amount);
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, v_code_record.id, v_code_record.discount_type_id, NULL::UUID, 
      FORMAT('This discount code is not valid for %s or minimum order requirements not met', p_customer_country), 
      NULL::JSONB;
    RETURN;
  END IF;
  
  -- Valid! Return success with details
  RETURN QUERY SELECT 
    true,
    v_code_record.id,
    v_code_record.discount_type_id,
    v_country_rule.id,
    NULL::TEXT,
    jsonb_build_object(
      'component_discounts', v_country_rule.component_discounts,
      'description', v_country_rule.description,
      'max_discount', v_code_record.conditions->>'max_discount',
      'priority', v_country_rule.priority
    );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION validate_country_discount_code(TEXT, TEXT, NUMERIC) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION get_automatic_country_discounts(TEXT, NUMERIC, UUID) IS 'Returns automatic discount rules applicable for a country and order total';
COMMENT ON FUNCTION validate_country_discount_code(TEXT, TEXT, NUMERIC) IS 'Validates if a discount code is eligible for the given country and order';

-- Final verification query (for testing)
-- SELECT 'Migration completed successfully. Country discount rules enhanced for hybrid approach.' as status;