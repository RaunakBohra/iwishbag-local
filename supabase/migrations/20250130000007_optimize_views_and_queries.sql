-- Optimize Views and Remove Unnecessary Ones
-- This migration removes unused views and optimizes the remaining ones

BEGIN;

-- =====================================================
-- PART 1: DROP UNUSED VIEWS
-- =====================================================

-- These views are not used in the application
DROP VIEW IF EXISTS package_notifications_with_customer CASCADE;
DROP VIEW IF EXISTS payment_error_analytics CASCADE;
DROP VIEW IF EXISTS payment_links_summary CASCADE;
DROP VIEW IF EXISTS paypal_refund_summary CASCADE;
DROP VIEW IF EXISTS profiles_with_phone CASCADE;
DROP VIEW IF EXISTS user_addresses_formatted CASCADE;

-- =====================================================
-- PART 2: OPTIMIZE SUPPORT VIEWS
-- =====================================================

-- Drop existing support views to recreate with better performance
DROP VIEW IF EXISTS tickets CASCADE;
DROP VIEW IF EXISTS ticket_replies_view CASCADE;
DROP VIEW IF EXISTS support_tickets_view CASCADE;

-- Create optimized tickets view with better indexes
CREATE OR REPLACE VIEW tickets AS
SELECT 
    s.id,
    s.user_id,
    s.quote_id,
    s.ticket_data->>'subject' as subject,
    s.ticket_data->>'description' as description,
    s.ticket_data->>'status' as status,
    s.ticket_data->>'priority' as priority,
    s.ticket_data->>'category' as category,
    (s.ticket_data->>'assigned_to')::uuid as assigned_to,
    s.created_at,
    s.updated_at,
    s.is_active
FROM support_system s
WHERE s.system_type = 'ticket'
AND s.is_active = true;

-- Create optimized ticket replies view
CREATE OR REPLACE VIEW ticket_replies_view AS
SELECT 
    si.id,
    si.support_id as ticket_id,
    si.user_id,
    si.content->>'message' as message,
    si.content->>'from_status' as from_status,
    si.content->>'to_status' as to_status,
    si.content->>'to_user' as assigned_to_user,
    si.interaction_type,
    si.created_at,
    si.is_internal,
    p.email as user_email,
    p.full_name as user_name
FROM support_interactions si
LEFT JOIN profiles p ON p.id = si.user_id
WHERE si.interaction_type IN ('reply', 'status_change', 'assignment');

-- Create comprehensive support tickets view for admin dashboard
CREATE OR REPLACE VIEW support_tickets_view AS
WITH ticket_stats AS (
    SELECT 
        support_id,
        COUNT(*) FILTER (WHERE interaction_type = 'reply' AND NOT is_internal) as reply_count,
        MAX(created_at) FILTER (WHERE interaction_type = 'reply') as last_reply_at,
        MAX(created_at) FILTER (WHERE interaction_type = 'status_change') as last_status_change
    FROM support_interactions
    GROUP BY support_id
)
SELECT 
    t.id,
    t.user_id,
    t.quote_id,
    t.subject,
    t.description,
    t.status,
    t.priority,
    t.category,
    t.assigned_to,
    t.created_at,
    t.updated_at,
    t.is_active,
    u.email as user_email,
    u.raw_user_meta_data->>'full_name' as user_name,
    a.email as assigned_to_email,
    a.raw_user_meta_data->>'full_name' as assigned_to_name,
    COALESCE(ts.reply_count, 0) as reply_count,
    ts.last_reply_at,
    ts.last_status_change,
    CASE 
        WHEN t.status = 'closed' THEN 'closed'
        WHEN ts.last_reply_at > NOW() - INTERVAL '24 hours' THEN 'active'
        WHEN ts.last_reply_at > NOW() - INTERVAL '48 hours' THEN 'pending'
        ELSE 'stale'
    END as activity_status
FROM tickets t
LEFT JOIN auth.users u ON u.id = t.user_id
LEFT JOIN auth.users a ON a.id = t.assigned_to
LEFT JOIN ticket_stats ts ON ts.support_id = t.id;

-- =====================================================
-- PART 3: OPTIMIZE PAYMENT HEALTH DASHBOARD VIEW
-- =====================================================

-- Recreate payment health dashboard with better performance
DROP VIEW IF EXISTS payment_health_dashboard CASCADE;

CREATE OR REPLACE VIEW payment_health_dashboard AS
WITH daily_stats AS (
    SELECT 
        DATE(created_at) as date,
        COUNT(*) as total_transactions,
        COUNT(*) FILTER (WHERE status = 'completed') as successful_transactions,
        COUNT(*) FILTER (WHERE status = 'failed') as failed_transactions,
        SUM(amount) FILTER (WHERE status = 'completed') as total_amount,
        AVG(amount) FILTER (WHERE status = 'completed') as avg_amount,
        COUNT(DISTINCT payment_method) as payment_methods_used,
        COUNT(DISTINCT user_id) as unique_users
    FROM payment_transactions
    WHERE created_at >= NOW() - INTERVAL '30 days'
    GROUP BY DATE(created_at)
),
gateway_stats AS (
    SELECT 
        gateway_code,
        COUNT(*) as total_attempts,
        COUNT(*) FILTER (WHERE status = 'completed') as successful,
        COUNT(*) FILTER (WHERE status = 'failed') as failed,
        AVG(EXTRACT(EPOCH FROM (updated_at - created_at))) as avg_processing_time
    FROM payment_transactions
    WHERE created_at >= NOW() - INTERVAL '7 days'
    AND gateway_code IS NOT NULL
    GROUP BY gateway_code
)
SELECT 
    'daily_stats' as metric_type,
    date::text as dimension,
    jsonb_build_object(
        'total_transactions', total_transactions,
        'successful_transactions', successful_transactions,
        'failed_transactions', failed_transactions,
        'success_rate', ROUND((successful_transactions::numeric / NULLIF(total_transactions, 0) * 100), 2),
        'total_amount', total_amount,
        'avg_amount', avg_amount,
        'payment_methods_used', payment_methods_used,
        'unique_users', unique_users
    ) as data
FROM daily_stats
UNION ALL
SELECT 
    'gateway_performance' as metric_type,
    gateway_code as dimension,
    jsonb_build_object(
        'total_attempts', total_attempts,
        'successful', successful,
        'failed', failed,
        'success_rate', ROUND((successful::numeric / NULLIF(total_attempts, 0) * 100), 2),
        'avg_processing_time', ROUND(avg_processing_time::numeric, 2)
    ) as data
FROM gateway_stats;

-- =====================================================
-- PART 4: OPTIMIZE STORAGE FEE SUMMARY VIEW
-- =====================================================

DROP VIEW IF EXISTS storage_fee_summary CASCADE;

CREATE OR REPLACE VIEW storage_fee_summary AS
WITH package_fees AS (
    SELECT 
        rp.user_id,
        rp.id as package_id,
        rp.tracking_number,
        rp.storage_start_date,
        rp.free_storage_days_override,
        COALESCE(rp.free_storage_days_override, cs.free_storage_days, 30) as free_days,
        cs.storage_fee_per_day,
        cs.currency,
        GREATEST(0, 
            EXTRACT(DAY FROM NOW() - rp.storage_start_date)::integer - 
            COALESCE(rp.free_storage_days_override, cs.free_storage_days, 30)
        ) as billable_days,
        GREATEST(0, 
            EXTRACT(DAY FROM NOW() - rp.storage_start_date)::integer - 
            COALESCE(rp.free_storage_days_override, cs.free_storage_days, 30)
        ) * cs.storage_fee_per_day as total_fee
    FROM received_packages rp
    CROSS JOIN country_settings cs
    WHERE cs.country_code = 'US'
    AND rp.package_status IN ('in_warehouse', 'consolidation_requested')
    AND rp.storage_start_date IS NOT NULL
)
SELECT 
    user_id,
    COUNT(*) as total_packages,
    COUNT(*) FILTER (WHERE billable_days > 0) as packages_with_fees,
    SUM(billable_days) as total_billable_days,
    SUM(total_fee) as total_fees,
    MAX(total_fee) as max_package_fee,
    currency,
    jsonb_agg(
        jsonb_build_object(
            'package_id', package_id,
            'tracking_number', tracking_number,
            'storage_start_date', storage_start_date,
            'free_days', free_days,
            'billable_days', billable_days,
            'total_fee', total_fee
        ) ORDER BY total_fee DESC
    ) FILTER (WHERE billable_days > 0) as package_details
FROM package_fees
GROUP BY user_id, currency;

-- =====================================================
-- PART 5: CREATE OPTIMIZED INDEXES
-- =====================================================

-- Indexes for support views
CREATE INDEX IF NOT EXISTS idx_support_system_ticket_user_status 
ON support_system(user_id, (ticket_data->>'status')) 
WHERE system_type = 'ticket' AND is_active = true;

CREATE INDEX IF NOT EXISTS idx_support_system_ticket_assigned 
ON support_system((ticket_data->>'assigned_to')::uuid) 
WHERE system_type = 'ticket' AND is_active = true;

CREATE INDEX IF NOT EXISTS idx_support_interactions_support_type 
ON support_interactions(support_id, interaction_type, created_at DESC);

-- Indexes for payment health
CREATE INDEX IF NOT EXISTS idx_payment_transactions_health_daily 
ON payment_transactions(DATE(created_at), status, payment_method) 
WHERE created_at >= NOW() - INTERVAL '30 days';

CREATE INDEX IF NOT EXISTS idx_payment_transactions_gateway_recent 
ON payment_transactions(gateway_code, status, created_at) 
WHERE created_at >= NOW() - INTERVAL '7 days' AND gateway_code IS NOT NULL;

-- Indexes for storage fees
CREATE INDEX IF NOT EXISTS idx_received_packages_storage_fees 
ON received_packages(user_id, package_status, storage_start_date) 
WHERE package_status IN ('in_warehouse', 'consolidation_requested') 
AND storage_start_date IS NOT NULL;

-- =====================================================
-- PART 6: CREATE HELPER FUNCTIONS FOR COMMON QUERIES
-- =====================================================

-- Function to get ticket statistics for a user
CREATE OR REPLACE FUNCTION get_user_ticket_stats(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_stats jsonb;
BEGIN
    SELECT jsonb_build_object(
        'total_tickets', COUNT(*),
        'open_tickets', COUNT(*) FILTER (WHERE status IN ('open', 'in_progress')),
        'closed_tickets', COUNT(*) FILTER (WHERE status = 'closed'),
        'avg_resolution_time', AVG(
            CASE 
                WHEN status = 'closed' THEN 
                    EXTRACT(EPOCH FROM (updated_at - created_at)) / 3600
                ELSE NULL 
            END
        ),
        'tickets_by_status', jsonb_object_agg(status, count) FILTER (WHERE status IS NOT NULL),
        'tickets_by_priority', jsonb_object_agg(priority, count) FILTER (WHERE priority IS NOT NULL)
    )
    INTO v_stats
    FROM (
        SELECT status, priority, COUNT(*) as count
        FROM tickets
        WHERE user_id = p_user_id
        GROUP BY GROUPING SETS ((status), (priority))
    ) t
    JOIN tickets t2 ON t2.user_id = p_user_id;
    
    RETURN COALESCE(v_stats, '{}'::jsonb);
END;
$$;

-- Function to get payment health metrics
CREATE OR REPLACE FUNCTION get_payment_health_metrics(p_days integer DEFAULT 7)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_metrics jsonb;
BEGIN
    WITH metrics AS (
        SELECT 
            COUNT(*) as total_transactions,
            COUNT(*) FILTER (WHERE status = 'completed') as successful,
            COUNT(*) FILTER (WHERE status = 'failed') as failed,
            SUM(amount) FILTER (WHERE status = 'completed') as total_volume,
            AVG(amount) FILTER (WHERE status = 'completed') as avg_transaction,
            COUNT(DISTINCT user_id) as unique_users,
            COUNT(DISTINCT DATE(created_at)) as active_days
        FROM payment_transactions
        WHERE created_at >= NOW() - (p_days || ' days')::interval
    )
    SELECT jsonb_build_object(
        'period_days', p_days,
        'total_transactions', total_transactions,
        'successful_transactions', successful,
        'failed_transactions', failed,
        'success_rate', CASE 
            WHEN total_transactions > 0 
            THEN ROUND((successful::numeric / total_transactions * 100), 2)
            ELSE 0 
        END,
        'total_volume', COALESCE(total_volume, 0),
        'avg_transaction_value', COALESCE(ROUND(avg_transaction::numeric, 2), 0),
        'unique_users', unique_users,
        'daily_average', CASE 
            WHEN active_days > 0 
            THEN ROUND(total_transactions::numeric / active_days, 2)
            ELSE 0 
        END
    )
    INTO v_metrics
    FROM metrics;
    
    RETURN v_metrics;
END;
$$;

-- =====================================================
-- PART 7: ADD COMMENTS
-- =====================================================

COMMENT ON VIEW tickets IS 'Simplified view of support tickets from support_system table';
COMMENT ON VIEW ticket_replies_view IS 'View of ticket interactions including replies and status changes';
COMMENT ON VIEW support_tickets_view IS 'Comprehensive view for admin dashboard with user details and statistics';
COMMENT ON VIEW payment_health_dashboard IS 'Aggregated payment metrics for monitoring and analytics';
COMMENT ON VIEW storage_fee_summary IS 'Summary of storage fees by user with package details';
COMMENT ON FUNCTION get_user_ticket_stats IS 'Get ticket statistics for a specific user';
COMMENT ON FUNCTION get_payment_health_metrics IS 'Get payment health metrics for a specified time period';

COMMIT;