-- Optimize Core Views and Remove Unused Ones
-- Simplified version focusing on essential views

BEGIN;

-- =====================================================
-- PART 1: DROP UNUSED VIEWS
-- =====================================================

DROP VIEW IF EXISTS package_notifications_with_customer CASCADE;
DROP VIEW IF EXISTS payment_error_analytics CASCADE;
DROP VIEW IF EXISTS payment_links_summary CASCADE;
DROP VIEW IF EXISTS paypal_refund_summary CASCADE;
DROP VIEW IF EXISTS profiles_with_phone CASCADE;
DROP VIEW IF EXISTS user_addresses_formatted CASCADE;

-- =====================================================
-- PART 2: OPTIMIZE SUPPORT VIEWS
-- =====================================================

-- Drop and recreate support views with better performance
DROP VIEW IF EXISTS support_tickets_view CASCADE;
DROP VIEW IF EXISTS ticket_replies_view CASCADE;
DROP VIEW IF EXISTS tickets CASCADE;

-- Create base tickets view
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

-- Create ticket replies view
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

-- Create comprehensive support tickets view
CREATE OR REPLACE VIEW support_tickets_view AS
WITH ticket_stats AS (
    SELECT 
        support_id,
        COUNT(*) FILTER (WHERE interaction_type = 'reply' AND NOT is_internal) as reply_count,
        MAX(created_at) FILTER (WHERE interaction_type = 'reply') as last_reply_at
    FROM support_interactions
    GROUP BY support_id
)
SELECT 
    t.*,
    u.email as user_email,
    u.raw_user_meta_data->>'full_name' as user_name,
    a.email as assigned_to_email,
    a.raw_user_meta_data->>'full_name' as assigned_to_name,
    COALESCE(ts.reply_count, 0) as reply_count,
    ts.last_reply_at
FROM tickets t
LEFT JOIN auth.users u ON u.id = t.user_id
LEFT JOIN auth.users a ON a.id = t.assigned_to
LEFT JOIN ticket_stats ts ON ts.support_id = t.id;

-- =====================================================
-- PART 3: CREATE OPTIMIZED INDEXES
-- =====================================================

-- Support system indexes
CREATE INDEX IF NOT EXISTS idx_support_system_ticket_composite 
ON support_system(system_type, is_active, created_at DESC) 
WHERE system_type = 'ticket';

CREATE INDEX IF NOT EXISTS idx_support_interactions_composite 
ON support_interactions(support_id, interaction_type, created_at DESC);

-- Payment indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_payment_transactions_daily_stats 
ON payment_transactions(DATE(created_at), status) 
WHERE created_at >= NOW() - INTERVAL '30 days';

CREATE INDEX IF NOT EXISTS idx_payment_transactions_user_recent 
ON payment_transactions(user_id, created_at DESC) 
WHERE status = 'completed';

-- =====================================================
-- PART 4: CREATE QUERY HELPER FUNCTIONS
-- =====================================================

-- Get ticket summary for dashboard
CREATE OR REPLACE FUNCTION get_ticket_summary()
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT jsonb_build_object(
        'total', COUNT(*),
        'open', COUNT(*) FILTER (WHERE status = 'open'),
        'in_progress', COUNT(*) FILTER (WHERE status = 'in_progress'),
        'closed', COUNT(*) FILTER (WHERE status = 'closed'),
        'high_priority', COUNT(*) FILTER (WHERE priority = 'high' AND status != 'closed')
    )
    FROM tickets;
$$;

-- Get recent payment activity
CREATE OR REPLACE FUNCTION get_recent_payment_activity(p_limit integer DEFAULT 10)
RETURNS TABLE(
    id uuid,
    user_id uuid,
    amount numeric,
    currency text,
    status text,
    payment_method text,
    created_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT 
        id,
        user_id,
        amount,
        currency,
        status,
        payment_method,
        created_at
    FROM payment_transactions
    ORDER BY created_at DESC
    LIMIT p_limit;
$$;

-- =====================================================
-- PART 5: CLEANUP AND DOCUMENTATION
-- =====================================================

-- Add helpful comments
COMMENT ON VIEW tickets IS 'Simplified view of support tickets';
COMMENT ON VIEW ticket_replies_view IS 'All ticket interactions and replies';
COMMENT ON VIEW support_tickets_view IS 'Complete ticket information with user details';
COMMENT ON FUNCTION get_ticket_summary IS 'Get summary statistics for support tickets';
COMMENT ON FUNCTION get_recent_payment_activity IS 'Get recent payment transactions';

-- Grant appropriate permissions
GRANT SELECT ON tickets TO authenticated;
GRANT SELECT ON ticket_replies_view TO authenticated;
GRANT SELECT ON support_tickets_view TO authenticated;

COMMIT;