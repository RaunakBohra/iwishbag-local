-- Strategic Database Indexes for Performance Optimization
-- 
-- This migration adds carefully selected indexes based on:
-- 1. Query pattern analysis from the codebase
-- 2. Table statistics showing high-volume tables
-- 3. Common filter and join patterns
-- 4. Performance monitoring insights

-- =============================================================================
-- QUOTES_V2 TABLE INDEXES
-- =============================================================================
-- The quotes_v2 table is heavily used with complex filtering needs

-- Index for admin quote filtering by status and creation date
CREATE INDEX IF NOT EXISTS idx_quotes_v2_status_created_at 
ON quotes_v2 (status, created_at DESC);

-- Index for customer quote lookup by user_id and status
CREATE INDEX IF NOT EXISTS idx_quotes_v2_user_status_created_at 
ON quotes_v2 (created_by, status, created_at DESC);

-- Index for quote search by customer information
CREATE INDEX IF NOT EXISTS idx_quotes_v2_customer_search 
ON quotes_v2 (customer_name, customer_email) 
WHERE customer_name IS NOT NULL OR customer_email IS NOT NULL;

-- Composite index for quote financial queries (dashboard, reporting)
CREATE INDEX IF NOT EXISTS idx_quotes_v2_financial_queries 
ON quotes_v2 (status, final_total_origin, total_origin_currency, created_at DESC) 
WHERE status IN ('sent', 'approved', 'paid');

-- Index for quote expiration tracking
CREATE INDEX IF NOT EXISTS idx_quotes_v2_expiration 
ON quotes_v2 (expires_at) 
WHERE expires_at IS NOT NULL AND status NOT IN ('expired', 'rejected');

-- Partial index for in-cart quotes (active cart management)
CREATE INDEX IF NOT EXISTS idx_quotes_v2_in_cart 
ON quotes_v2 (created_by, created_at DESC) 
WHERE in_cart = true;

-- Index for quote origin/destination analysis
CREATE INDEX IF NOT EXISTS idx_quotes_v2_route_analysis 
ON quotes_v2 (origin_country, destination_country, created_at DESC);

-- =============================================================================
-- ORDERS TABLE INDEXES
-- =============================================================================
-- Orders table needs efficient filtering by multiple criteria

-- Composite index for order dashboard queries
CREATE INDEX IF NOT EXISTS idx_orders_admin_dashboard 
ON orders (overall_status, payment_status, created_at DESC);

-- Index for customer order history
CREATE INDEX IF NOT EXISTS idx_orders_customer_history 
ON orders (customer_id, created_at DESC) 
WHERE customer_id IS NOT NULL;

-- Index for warehouse operations
CREATE INDEX IF NOT EXISTS idx_orders_warehouse_operations 
ON orders (primary_warehouse, overall_status, created_at DESC) 
WHERE primary_warehouse IS NOT NULL;

-- Index for payment processing queries
CREATE INDEX IF NOT EXISTS idx_orders_payment_processing 
ON orders (payment_status, payment_completed_at DESC) 
WHERE payment_status IN ('pending', 'processing', 'completed');

-- Index for tracking system queries
CREATE INDEX IF NOT EXISTS idx_orders_tracking_system 
ON orders (tracking_id, overall_status) 
WHERE tracking_id IS NOT NULL;

-- Index for delivery date analysis and notifications
CREATE INDEX IF NOT EXISTS idx_orders_delivery_schedule 
ON orders (estimated_delivery_date, overall_status) 
WHERE estimated_delivery_date IS NOT NULL;

-- =============================================================================
-- PROFILES TABLE INDEXES
-- =============================================================================
-- User profiles need efficient lookups for authentication and filtering

-- Index for country-based user analytics
CREATE INDEX IF NOT EXISTS idx_profiles_country_analytics 
ON profiles (country, created_at DESC) 
WHERE country IS NOT NULL;

-- Index for user search functionality
CREATE INDEX IF NOT EXISTS idx_profiles_search_optimization 
ON profiles (full_name, email) 
WHERE full_name IS NOT NULL OR email IS NOT NULL;

-- Index for referral system
CREATE INDEX IF NOT EXISTS idx_profiles_referral_system 
ON profiles (referral_code, referred_by) 
WHERE referral_code IS NOT NULL;

-- =============================================================================
-- QUOTE_ITEMS_V2 TABLE INDEXES
-- =============================================================================
-- Quote items need efficient aggregation and filtering

-- Index for quote item aggregation (total calculations)
CREATE INDEX IF NOT EXISTS idx_quote_items_v2_aggregation 
ON quote_items_v2 (quote_id, item_price, quantity);

-- Index for product analysis and recommendations
CREATE INDEX IF NOT EXISTS idx_quote_items_v2_product_analysis 
ON quote_items_v2 (product_name, item_price DESC, created_at DESC) 
WHERE product_name IS NOT NULL;

-- Index for weight-based calculations
CREATE INDEX IF NOT EXISTS idx_quote_items_v2_weight_calculations 
ON quote_items_v2 (quote_id, item_weight) 
WHERE item_weight IS NOT NULL;

-- =============================================================================
-- PRICING CACHE TABLE INDEXES
-- =============================================================================
-- Pricing calculation cache needs efficient lookups and cleanup

-- Index for cache lookup by calculation parameters
CREATE INDEX IF NOT EXISTS idx_pricing_cache_lookup 
ON pricing_calculation_cache (origin_country, destination_country, service_type, weight_range);

-- Index for cache cleanup (remove expired entries)
CREATE INDEX IF NOT EXISTS idx_pricing_cache_cleanup 
ON pricing_calculation_cache (created_at) 
WHERE expires_at < NOW();

-- Index for cache hit rate analysis
CREATE INDEX IF NOT EXISTS idx_pricing_cache_analytics 
ON pricing_calculation_cache (cache_key, created_at DESC);

-- =============================================================================
-- ORDER_ITEMS TABLE INDEXES
-- =============================================================================
-- Order items need efficient order composition queries

-- Index for order fulfillment
CREATE INDEX IF NOT EXISTS idx_order_items_fulfillment 
ON order_items (order_id, status, created_at);

-- Index for inventory and status tracking
CREATE INDEX IF NOT EXISTS idx_order_items_inventory 
ON order_items (product_name, status) 
WHERE product_name IS NOT NULL;

-- =============================================================================
-- SUPPORT AND NOTIFICATION INDEXES
-- =============================================================================
-- Support system tables need efficient queries for ticket management

-- Index for support ticket routing (if support_system table exists)
CREATE INDEX IF NOT EXISTS idx_support_system_routing 
ON support_system (status, priority, assigned_to, created_at DESC);

-- =============================================================================
-- PERFORMANCE MONITORING INDEXES
-- =============================================================================
-- Indexes for system performance and monitoring

-- Index for audit trail and logging
CREATE INDEX IF NOT EXISTS idx_pricing_change_log_timeline 
ON pricing_change_log (changed_at DESC, change_type);

-- Index for system health monitoring
CREATE INDEX IF NOT EXISTS idx_system_settings_lookup 
ON system_settings (setting_key, updated_at DESC);

-- =============================================================================
-- JSONB INDEXES FOR COMPLEX QUERIES
-- =============================================================================
-- GIN indexes for JSONB columns that are frequently queried

-- Index for quote calculation data queries
CREATE INDEX IF NOT EXISTS idx_quotes_v2_calculation_data_gin 
ON quotes_v2 USING GIN (calculation_data);

-- Index for quote customer data queries
CREATE INDEX IF NOT EXISTS idx_quotes_v2_customer_data_gin 
ON quotes_v2 USING GIN (customer_data);

-- Index for order operational data queries
CREATE INDEX IF NOT EXISTS idx_orders_order_data_gin 
ON orders USING GIN (order_data);

-- =============================================================================
-- TEXT SEARCH INDEXES
-- =============================================================================
-- Full-text search indexes for better search performance

-- Text search index for quotes (customer name and email)
CREATE INDEX IF NOT EXISTS idx_quotes_v2_text_search 
ON quotes_v2 USING GIN (
  to_tsvector('english', COALESCE(customer_name, '') || ' ' || COALESCE(customer_email, ''))
);

-- Text search index for orders (order number and customer info)
CREATE INDEX IF NOT EXISTS idx_orders_text_search 
ON orders USING GIN (
  to_tsvector('english', COALESCE(order_number, '') || ' ' || COALESCE(customer_notes, ''))
);

-- =============================================================================
-- CONDITIONAL INDEXES FOR SPECIFIC USE CASES
-- =============================================================================
-- These indexes only include rows that match specific conditions to save space

-- Index for active quotes only (excludes expired/rejected)
CREATE INDEX IF NOT EXISTS idx_quotes_v2_active_only 
ON quotes_v2 (created_at DESC, updated_at DESC) 
WHERE status NOT IN ('expired', 'rejected', 'archived');

-- Index for pending payments (high-priority monitoring)
CREATE INDEX IF NOT EXISTS idx_orders_pending_payments 
ON orders (created_at DESC, total_amount DESC) 
WHERE payment_status = 'pending' AND overall_status != 'cancelled';

-- Index for recent high-value orders (risk monitoring)
CREATE INDEX IF NOT EXISTS idx_orders_high_value_recent 
ON orders (created_at DESC, total_amount DESC) 
WHERE total_amount > 1000 AND created_at > NOW() - INTERVAL '30 days';

-- =============================================================================
-- CLEANUP AND MAINTENANCE
-- =============================================================================

-- Add comments for documentation
COMMENT ON INDEX idx_quotes_v2_status_created_at IS 'Optimizes admin dashboard queries filtering quotes by status and date';
COMMENT ON INDEX idx_quotes_v2_user_status_created_at IS 'Optimizes customer dashboard showing user quotes by status';
COMMENT ON INDEX idx_quotes_v2_financial_queries IS 'Optimizes financial reporting and analytics queries';
COMMENT ON INDEX idx_orders_admin_dashboard IS 'Optimizes order management dashboard queries';
COMMENT ON INDEX idx_orders_customer_history IS 'Optimizes customer order history page';
COMMENT ON INDEX idx_profiles_country_analytics IS 'Optimizes user analytics and country-based reporting';

-- =============================================================================
-- INDEX USAGE MONITORING
-- =============================================================================
-- Create a view to monitor index usage and effectiveness

CREATE OR REPLACE VIEW v_index_usage_stats AS
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan as scans,
  idx_tup_read as tuples_read,
  idx_tup_fetch as tuples_fetched,
  CASE 
    WHEN idx_scan = 0 THEN 'Never Used'
    WHEN idx_scan < 10 THEN 'Rarely Used'
    WHEN idx_scan < 100 THEN 'Moderately Used'
    ELSE 'Frequently Used'
  END as usage_frequency,
  CASE 
    WHEN idx_tup_read > 0 THEN 
      ROUND((idx_tup_fetch::numeric / idx_tup_read::numeric) * 100, 2)
    ELSE 0
  END as efficiency_percentage
FROM pg_stat_user_indexes 
WHERE schemaname = 'public'
  AND indexname LIKE 'idx_%'
ORDER BY idx_scan DESC, idx_tup_read DESC;

COMMENT ON VIEW v_index_usage_stats IS 'Monitors index usage and effectiveness for performance optimization';

-- =============================================================================
-- PERFORMANCE RECOMMENDATIONS
-- =============================================================================

/*
PERFORMANCE OPTIMIZATION NOTES:

1. MONITORING:
   - Use v_index_usage_stats to monitor index effectiveness
   - Remove unused indexes after monitoring for 30+ days
   - Watch for indexes with low efficiency_percentage

2. MAINTENANCE:
   - Run ANALYZE after adding indexes: ANALYZE quotes_v2, orders, profiles;
   - Monitor query performance with EXPLAIN ANALYZE
   - Consider REINDEX periodically for heavily updated tables

3. TRADE-OFFS:
   - These indexes improve SELECT performance but slow INSERT/UPDATE
   - Monitor write performance after deployment
   - Some indexes are partial to minimize storage impact

4. QUERY OPTIMIZATION TIPS:
   - Use ORDER BY with indexed columns when possible
   - Combine filters that use the same index
   - Consider covering indexes for frequently accessed columns
   - Use LIMIT with ORDER BY for pagination

5. NEXT STEPS:
   - Monitor slow query log
   - Use pg_stat_statements for query analysis
   - Consider materialized views for complex aggregations
   - Implement query result caching at application level
*/