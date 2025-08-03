-- Add description and analytics fields to discount_tiers table

-- Add description field for admin notes
ALTER TABLE discount_tiers 
ADD COLUMN IF NOT EXISTS description TEXT;

-- Add analytics fields for tracking tier performance
ALTER TABLE discount_tiers 
ADD COLUMN IF NOT EXISTS usage_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_savings DECIMAL(12,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS avg_order_value DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMPTZ;

-- Add priority field for tier ordering
ALTER TABLE discount_tiers 
ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 100;

-- Update any existing tiers to have default priority
UPDATE discount_tiers 
SET priority = 100 
WHERE priority IS NULL;

-- Create index for priority-based ordering
CREATE INDEX IF NOT EXISTS idx_discount_tiers_priority 
ON discount_tiers(discount_type_id, priority DESC, min_order_value ASC);

-- Create a function to update tier analytics when a tier is used
CREATE OR REPLACE FUNCTION update_tier_usage_analytics(
  tier_id UUID,
  order_value DECIMAL(10,2),
  discount_amount DECIMAL(10,2)
) RETURNS VOID AS $$
BEGIN
  UPDATE discount_tiers 
  SET 
    usage_count = COALESCE(usage_count, 0) + 1,
    total_savings = COALESCE(total_savings, 0) + discount_amount,
    avg_order_value = (
      CASE 
        WHEN usage_count = 0 THEN order_value
        ELSE (COALESCE(avg_order_value, 0) * COALESCE(usage_count, 0) + order_value) / (COALESCE(usage_count, 0) + 1)
      END
    ),
    last_used_at = NOW()
  WHERE id = tier_id;
END;
$$ LANGUAGE plpgsql;

-- Create a function to get tier analytics
CREATE OR REPLACE FUNCTION get_tier_analytics(tier_id UUID)
RETURNS TABLE(
  usage_count INTEGER,
  total_savings DECIMAL(12,2),
  avg_order_value DECIMAL(10,2),
  avg_discount_per_use DECIMAL(10,2),
  last_used_at TIMESTAMPTZ,
  effectiveness_score DECIMAL(5,2)
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    dt.usage_count,
    dt.total_savings,
    dt.avg_order_value,
    CASE 
      WHEN dt.usage_count > 0 THEN dt.total_savings / dt.usage_count
      ELSE 0
    END as avg_discount_per_use,
    dt.last_used_at,
    CASE 
      WHEN dt.usage_count > 0 AND dt.avg_order_value > 0 THEN 
        LEAST(100, (dt.total_savings / (dt.avg_order_value * dt.usage_count)) * 100)
      ELSE 0
    END as effectiveness_score
  FROM discount_tiers dt
  WHERE dt.id = tier_id;
END;
$$ LANGUAGE plpgsql;

-- Create a function to get all tiers with analytics for a discount type
CREATE OR REPLACE FUNCTION get_discount_type_tiers_with_analytics(discount_type_id UUID)
RETURNS TABLE(
  id UUID,
  min_order_value DECIMAL(10,2),
  max_order_value DECIMAL(10,2),
  discount_value DECIMAL(10,2),
  applicable_components TEXT[],
  description TEXT,
  priority INTEGER,
  usage_count INTEGER,
  total_savings DECIMAL(12,2),
  avg_order_value DECIMAL(10,2),
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    dt.id,
    dt.min_order_value,
    dt.max_order_value,
    dt.discount_value,
    dt.applicable_components,
    dt.description,
    dt.priority,
    COALESCE(dt.usage_count, 0) as usage_count,
    COALESCE(dt.total_savings, 0) as total_savings,
    dt.avg_order_value,
    dt.last_used_at,
    dt.created_at
  FROM discount_tiers dt
  WHERE dt.discount_type_id = get_discount_type_tiers_with_analytics.discount_type_id
  ORDER BY dt.priority DESC, dt.min_order_value ASC;
END;
$$ LANGUAGE plpgsql;

-- Add comment for documentation
COMMENT ON TABLE discount_tiers IS 'Volume discount tiers with analytics tracking for performance monitoring and optimization';
COMMENT ON COLUMN discount_tiers.description IS 'Admin description/notes for the tier';
COMMENT ON COLUMN discount_tiers.usage_count IS 'Number of times this tier has been applied';
COMMENT ON COLUMN discount_tiers.total_savings IS 'Total amount saved by customers using this tier';
COMMENT ON COLUMN discount_tiers.avg_order_value IS 'Average order value for orders using this tier';
COMMENT ON COLUMN discount_tiers.priority IS 'Priority for tier matching (higher values = higher priority)';