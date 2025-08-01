-- Enhanced discount system to support discounts on any quote component
-- This migration extends the discount types to allow targeting specific cost components

-- First, let's add the new discount type options
ALTER TYPE discount_type_enum ADD VALUE IF NOT EXISTS 'customs' AFTER 'fixed_amount';
ALTER TYPE discount_type_enum ADD VALUE IF NOT EXISTS 'taxes' AFTER 'customs';
ALTER TYPE discount_type_enum ADD VALUE IF NOT EXISTS 'all_fees' AFTER 'taxes';

-- Update the discount_types table to support enhanced conditions
-- The conditions JSONB will now support:
-- {
--   "applicable_to": ["total", "shipping", "customs", "handling", "insurance", "taxes", "delivery"],
--   "min_order": 100,
--   "max_discount": 50,
--   "max_discount_percentage": 80,
--   "exclude_components": ["insurance"],
--   "stacking_allowed": true,
--   "tier_rules": [{...}]
-- }

-- Add new columns for better discount management
ALTER TABLE discount_types 
ADD COLUMN IF NOT EXISTS applicable_components TEXT[] DEFAULT ARRAY['total'],
ADD COLUMN IF NOT EXISTS tier_rules JSONB DEFAULT NULL,
ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 100;

-- Create a new table for country-specific discount rules
CREATE TABLE IF NOT EXISTS country_discount_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  discount_type_id UUID REFERENCES discount_types(id) ON DELETE CASCADE,
  country_code TEXT NOT NULL,
  component_discounts JSONB DEFAULT '{}', -- e.g., {"customs": 10, "shipping": 20}
  min_order_amount DECIMAL(10,2),
  max_uses_per_customer INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(discount_type_id, country_code)
);

-- Create a table for tiered volume discounts
CREATE TABLE IF NOT EXISTS discount_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  discount_type_id UUID REFERENCES discount_types(id) ON DELETE CASCADE,
  min_order_value DECIMAL(10,2) NOT NULL,
  max_order_value DECIMAL(10,2),
  discount_value DECIMAL(10,2) NOT NULL,
  applicable_components TEXT[] DEFAULT ARRAY['total'],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT valid_range CHECK (max_order_value IS NULL OR max_order_value > min_order_value)
);

-- Create index for faster tier lookups
CREATE INDEX idx_discount_tiers_lookup ON discount_tiers(discount_type_id, min_order_value);

-- Update existing discount types to use the new structure
UPDATE discount_types 
SET 
  applicable_components = CASE 
    WHEN type = 'shipping' THEN ARRAY['shipping']
    WHEN conditions->>'applicable_to' = 'handling' THEN ARRAY['handling']
    WHEN conditions->>'applicable_to' = 'shipping' THEN ARRAY['shipping']
    ELSE ARRAY['total']
  END,
  conditions = jsonb_set(
    COALESCE(conditions, '{}'::jsonb),
    '{stacking_allowed}',
    'true'::jsonb
  )
WHERE applicable_components IS NULL;

-- Create sample discount types for each component
INSERT INTO discount_types (name, code, type, value, conditions, applicable_components, is_active) 
VALUES 
  -- Customs discounts
  ('Customs Waiver - Large Orders', 'CUSTOMS_WAIVER_1000', 'percentage', 100, 
   '{"min_order": 1000, "applicable_to": ["customs"], "description": "Free customs duty on orders above $1000"}'::jsonb, 
   ARRAY['customs'], true),
  
  ('Plus Member Customs Discount', 'PLUS_CUSTOMS_50', 'percentage', 50, 
   '{"membership_required": true, "applicable_to": ["customs"], "description": "50% off customs for Plus members"}'::jsonb, 
   ARRAY['customs'], true),
  
  -- Handling fee discounts
  ('No Handling Fee - $500+', 'NO_HANDLING_500', 'percentage', 100, 
   '{"min_order": 500, "applicable_to": ["handling"], "description": "Handling fee waived for orders above $500"}'::jsonb, 
   ARRAY['handling'], true),
  
  ('Bulk Order Handling Discount', 'BULK_HANDLING_25', 'percentage', 25, 
   '{"min_items": 10, "applicable_to": ["handling"], "description": "25% off handling for 10+ items"}'::jsonb, 
   ARRAY['handling'], true),
  
  -- Multi-component discounts
  ('Premium Order - All Fees Waived', 'PREMIUM_ALL_FEES', 'percentage', 100, 
   '{"min_order": 2000, "applicable_to": ["customs", "handling", "delivery"], "description": "All fees waived for premium orders"}'::jsonb, 
   ARRAY['customs', 'handling', 'delivery'], true),
  
  ('First Time Customer - 50% Off Fees', 'FIRST_TIME_FEES_50', 'percentage', 50, 
   '{"first_time_only": true, "applicable_to": ["shipping", "handling"], "description": "50% off shipping and handling for new customers"}'::jsonb, 
   ARRAY['shipping', 'handling'], true)
ON CONFLICT (code) DO NOTHING;

-- Create tiered volume discount example
WITH volume_discount AS (
  INSERT INTO discount_types (name, code, type, value, conditions, applicable_components, is_active)
  VALUES ('Volume Purchase Discount', 'VOLUME_TIERED', 'percentage', 0, -- Value will come from tiers
    '{"description": "Tiered discounts based on order value", "use_tiers": true}'::jsonb,
    ARRAY['total', 'shipping', 'handling'], true)
  ON CONFLICT (code) DO NOTHING
  RETURNING id
)
INSERT INTO discount_tiers (discount_type_id, min_order_value, max_order_value, discount_value, applicable_components)
SELECT id, min_val, max_val, disc_val, components
FROM volume_discount,
LATERAL (VALUES 
  (100, 500, 5, ARRAY['total']),
  (500, 1000, 10, ARRAY['total', 'shipping']),
  (1000, NULL, 15, ARRAY['total', 'shipping', 'handling'])
) AS t(min_val, max_val, disc_val, components);

-- Create country-specific rules for Nepal (Dashain example)
INSERT INTO country_discount_rules (discount_type_id, country_code, component_discounts, min_order_amount)
SELECT dt.id, 'NP', '{"customs": 10, "shipping": 20, "handling": 15}'::jsonb, 50
FROM discount_types dt
WHERE dt.code = 'DASHAIN2025'
ON CONFLICT (discount_type_id, country_code) DO NOTHING;

-- Function to get applicable discounts for a quote with component breakdown
CREATE OR REPLACE FUNCTION get_component_discounts(
  p_customer_id UUID,
  p_order_total DECIMAL,
  p_country_code TEXT,
  p_is_first_order BOOLEAN DEFAULT FALSE,
  p_item_count INTEGER DEFAULT 1,
  p_discount_codes TEXT[] DEFAULT ARRAY[]::TEXT[]
) RETURNS TABLE (
  discount_type_id UUID,
  discount_name TEXT,
  discount_code TEXT,
  discount_value DECIMAL,
  applicable_components TEXT[],
  component_specific_values JSONB,
  source TEXT -- 'code', 'auto', 'membership', 'volume'
) AS $$
BEGIN
  -- Return all applicable discounts with their component breakdowns
  -- Implementation would check all conditions and return matching discounts
  -- This is a placeholder for the actual logic
  RETURN QUERY
  SELECT 
    dt.id,
    dt.name,
    dt.code,
    dt.value,
    dt.applicable_components,
    cdr.component_discounts,
    'auto'::TEXT as source
  FROM discount_types dt
  LEFT JOIN country_discount_rules cdr ON cdr.discount_type_id = dt.id AND cdr.country_code = p_country_code
  WHERE dt.is_active = true
    AND (dt.conditions->>'min_order' IS NULL OR (dt.conditions->>'min_order')::decimal <= p_order_total)
    AND (
      -- Check various conditions
      (dt.conditions->>'first_time_only' IS NULL OR (dt.conditions->>'first_time_only')::boolean = p_is_first_order)
      AND (dt.conditions->>'min_items' IS NULL OR (dt.conditions->>'min_items')::integer <= p_item_count)
    );
END;
$$ LANGUAGE plpgsql;

-- Add RLS policies
ALTER TABLE country_discount_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE discount_tiers ENABLE ROW LEVEL SECURITY;

-- Admin can manage all
CREATE POLICY "Admin can manage country discount rules" ON country_discount_rules
  FOR ALL USING (is_admin());

CREATE POLICY "Admin can manage discount tiers" ON discount_tiers
  FOR ALL USING (is_admin());

-- Everyone can read active discounts
CREATE POLICY "Public can view active discount rules" ON country_discount_rules
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM discount_types dt 
      WHERE dt.id = country_discount_rules.discount_type_id 
      AND dt.is_active = true
    )
  );

CREATE POLICY "Public can view discount tiers" ON discount_tiers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM discount_types dt 
      WHERE dt.id = discount_tiers.discount_type_id 
      AND dt.is_active = true
    )
  );

-- Create indexes for performance
CREATE INDEX idx_country_discount_rules_lookup ON country_discount_rules(country_code, discount_type_id);
CREATE INDEX idx_discount_types_components ON discount_types USING GIN(applicable_components);

-- Update the customer_discount_usage table to track component-level usage
ALTER TABLE customer_discount_usage
ADD COLUMN IF NOT EXISTS component_breakdown JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS components_discounted TEXT[] DEFAULT ARRAY['total'];

COMMENT ON COLUMN customer_discount_usage.component_breakdown IS 'Breakdown of discount amounts by component: {"shipping": 10.50, "customs": 25.00, "handling": 5.00}';
COMMENT ON COLUMN customer_discount_usage.components_discounted IS 'Array of components that received discounts';