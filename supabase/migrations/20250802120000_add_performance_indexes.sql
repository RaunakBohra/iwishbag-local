-- Add additional performance indexes for discount system
-- This migration adds strategic indexes based on common query patterns

-- Index for discount codes lookup (used frequently in validation)
CREATE INDEX IF NOT EXISTS idx_discount_codes_code_active 
ON discount_codes(code, is_active, valid_from, valid_until)
WHERE is_active = true;

-- Index for discount types lookup with conditions
CREATE INDEX IF NOT EXISTS idx_discount_types_active_conditions 
ON discount_types(is_active, type)
WHERE is_active = true;

-- Composite index for country discount rules priority ordering
CREATE INDEX IF NOT EXISTS idx_country_rules_priority_order 
ON country_discount_rules(country_code, priority DESC, min_order_amount);

-- Index for customer discount usage lookups
CREATE INDEX IF NOT EXISTS idx_customer_discount_usage_lookup 
ON customer_discount_usage(customer_id, discount_code_id, used_at DESC);

-- Index for discount campaigns date range queries
CREATE INDEX IF NOT EXISTS idx_discount_campaigns_date_range 
ON discount_campaigns(start_date, end_date, is_active)
WHERE is_active = true;

-- Index for volume discount tiers
CREATE INDEX IF NOT EXISTS idx_discount_tiers_order_value 
ON discount_tiers(min_order_value ASC, max_order_value ASC, discount_value DESC);

-- Partial index for active membership discounts
CREATE INDEX IF NOT EXISTS idx_membership_discounts_active 
ON membership_tier_discounts(tier_name, discount_percentage)
WHERE is_active = true;

-- Index for payment method discounts
CREATE INDEX IF NOT EXISTS idx_payment_method_discounts_active 
ON payment_method_discounts(payment_method, discount_percentage)
WHERE is_active = true;

-- Composite index for discount stacking rules
CREATE INDEX IF NOT EXISTS idx_discount_stacking_rules_priority 
ON discount_stacking_rules(is_active, priority DESC)
WHERE is_active = true;

-- Index for quote discounts lookup (if table exists)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'quotes_v2') THEN
        CREATE INDEX IF NOT EXISTS idx_quotes_v2_discount_codes 
        ON quotes_v2 USING GIN (discount_codes)
        WHERE discount_codes IS NOT NULL AND array_length(discount_codes, 1) > 0;
    END IF;
END $$;

-- Add statistics refresh for PostgreSQL query planner
ANALYZE country_discount_rules;
ANALYZE discount_codes;
ANALYZE discount_types;
ANALYZE discount_campaigns;

-- Add comments for documentation
COMMENT ON INDEX idx_discount_codes_code_active IS 'Optimizes discount code validation queries';
COMMENT ON INDEX idx_country_rules_priority_order IS 'Optimizes country-specific discount rule lookups with ordering';
COMMENT ON INDEX idx_customer_discount_usage_lookup IS 'Optimizes customer usage limit checks';
COMMENT ON INDEX idx_discount_campaigns_date_range IS 'Optimizes active campaign queries with date filtering';

-- Update table statistics for better query planning
CREATE OR REPLACE FUNCTION refresh_discount_statistics()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Refresh statistics for all discount-related tables
    ANALYZE country_discount_rules;
    ANALYZE discount_codes;
    ANALYZE discount_types;
    ANALYZE discount_campaigns;
    ANALYZE customer_discount_usage;
    ANALYZE discount_application_log;
    
    RAISE NOTICE 'Discount system statistics refreshed successfully';
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION refresh_discount_statistics() TO authenticated;

-- Schedule periodic statistics refresh (commented out - enable if needed)
-- SELECT cron.schedule('refresh-discount-stats', '0 2 * * *', 'SELECT refresh_discount_statistics();');

-- Verification query
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename IN (
    'country_discount_rules',
    'discount_codes', 
    'discount_types',
    'discount_campaigns',
    'customer_discount_usage'
)
AND schemaname = 'public'
ORDER BY tablename, indexname;