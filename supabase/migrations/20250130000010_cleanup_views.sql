-- Cleanup Unused Views
-- Simple migration to remove unused views

BEGIN;

-- Drop unused views that are not referenced in the application
DROP VIEW IF EXISTS package_notifications_with_customer CASCADE;
DROP VIEW IF EXISTS payment_error_analytics CASCADE;
DROP VIEW IF EXISTS payment_links_summary CASCADE;
DROP VIEW IF EXISTS paypal_refund_summary CASCADE;
DROP VIEW IF EXISTS profiles_with_phone CASCADE;
DROP VIEW IF EXISTS user_addresses_formatted CASCADE;

-- Keep these views as they are used by the application:
-- - tickets
-- - ticket_replies_view
-- - support_tickets_view
-- - payment_health_dashboard (may be used by admin dashboard)
-- - storage_fee_summary (used by storage fee automation)
-- - user_notification_settings (created by notification consolidation)

-- Add simple helper function for payment stats
CREATE OR REPLACE FUNCTION get_payment_stats_summary()
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT jsonb_build_object(
        'total_today', COUNT(*) FILTER (WHERE DATE(created_at) = CURRENT_DATE),
        'total_week', COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'),
        'success_rate_today', 
            CASE 
                WHEN COUNT(*) FILTER (WHERE DATE(created_at) = CURRENT_DATE) > 0
                THEN ROUND(
                    COUNT(*) FILTER (WHERE DATE(created_at) = CURRENT_DATE AND status = 'completed')::numeric * 100 / 
                    COUNT(*) FILTER (WHERE DATE(created_at) = CURRENT_DATE), 
                    2
                )
                ELSE 0 
            END,
        'total_volume_today', 
            COALESCE(SUM(amount) FILTER (WHERE DATE(created_at) = CURRENT_DATE AND status = 'completed'), 0)
    )
    FROM payment_transactions;
$$;

COMMENT ON FUNCTION get_payment_stats_summary IS 'Get summary payment statistics for dashboard';

COMMIT;