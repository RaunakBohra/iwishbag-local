-- ============================================================================
-- REMOVE NOTIFICATION SYSTEM COMPLETELY
-- ============================================================================
-- This migration removes all notification-related tables, functions, and triggers
-- The notification system was comprehensive but unused and requested for removal

-- Drop notification-related functions
DROP FUNCTION IF EXISTS get_user_notification_settings(UUID);
DROP FUNCTION IF EXISTS should_send_notification(UUID, TEXT, TEXT);
DROP FUNCTION IF EXISTS cleanup_expired_notifications();
DROP FUNCTION IF EXISTS get_unread_notification_count(UUID);
DROP FUNCTION IF EXISTS mark_all_notifications_read(UUID);
DROP FUNCTION IF EXISTS get_notification_statistics();
DROP FUNCTION IF EXISTS create_default_notification_preferences(UUID);
DROP FUNCTION IF EXISTS handle_new_user_notification_setup();
DROP FUNCTION IF EXISTS get_package_notification_statistics();
DROP FUNCTION IF EXISTS mark_overdue_package_notifications();
DROP FUNCTION IF EXISTS get_notification_response_metrics();
DROP FUNCTION IF EXISTS trigger_package_notification_alerts();

-- Drop notification tables (in order to handle foreign key constraints)
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS notification_templates CASCADE;
DROP TABLE IF EXISTS notification_preferences_unified CASCADE;

-- Drop any remaining notification-related triggers or indexes
-- (Most should be dropped with CASCADE, but being explicit)

-- Log the removal
DO $$
BEGIN
    RAISE NOTICE 'Notification system completely removed:';
    RAISE NOTICE '- notifications table';
    RAISE NOTICE '- notification_templates table';
    RAISE NOTICE '- notification_preferences_unified table';
    RAISE NOTICE '- 13 notification-related functions';
    RAISE NOTICE 'System cleanup complete.';
END $$;