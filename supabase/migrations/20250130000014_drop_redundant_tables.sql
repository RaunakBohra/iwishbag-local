-- Drop redundant tables after successful consolidation
-- WARNING: This is irreversible! Make sure all systems are working with the new structure

BEGIN;

-- =====================================================
-- PAYMENT SYSTEM - Drop old tables
-- =====================================================

-- Drop payment-related tables that were consolidated into payment_transactions
DROP TABLE IF EXISTS payment_ledger CASCADE;
DROP TABLE IF EXISTS financial_transactions CASCADE;
DROP TABLE IF EXISTS guest_checkout_sessions CASCADE;
DROP TABLE IF EXISTS authenticated_checkout_sessions CASCADE;
DROP TABLE IF EXISTS payment_links CASCADE;
DROP TABLE IF EXISTS payment_links_usage CASCADE;
DROP TABLE IF EXISTS payu_payment_links CASCADE;
DROP TABLE IF EXISTS payment_error_logs CASCADE;
DROP TABLE IF EXISTS payment_reconciliation CASCADE;
DROP TABLE IF EXISTS paypal_webhooks CASCADE;
DROP TABLE IF EXISTS payu_webhooks CASCADE;
DROP TABLE IF EXISTS stripe_payment_intents CASCADE;
DROP TABLE IF EXISTS airwallex_payment_intents CASCADE;
DROP TABLE IF EXISTS paypal_refunds CASCADE;

-- =====================================================
-- NOTIFICATION SYSTEM - Drop old tables
-- =====================================================

-- Drop notification-related tables that were consolidated
DROP TABLE IF EXISTS customer_notification_preferences CASCADE;
DROP TABLE IF EXISTS customer_notification_profiles CASCADE;
DROP TABLE IF EXISTS customer_package_notifications CASCADE;
DROP TABLE IF EXISTS package_notifications CASCADE;
DROP TABLE IF EXISTS payment_alert_thresholds CASCADE;
DROP TABLE IF EXISTS notification_logs CASCADE;

-- =====================================================
-- REFUND SYSTEM - Drop old column
-- =====================================================

-- Drop the deprecated payment_ledger_id column from refund_requests
ALTER TABLE refund_requests 
DROP COLUMN IF EXISTS payment_ledger_id;

-- =====================================================
-- LOG CLEANUP SUMMARY
-- =====================================================

DO $$
DECLARE
    v_payment_tables integer := 14;
    v_notification_tables integer := 6;
    v_total_removed integer := 20;
BEGIN
    RAISE NOTICE '====================================';
    RAISE NOTICE 'Database Cleanup Complete:';
    RAISE NOTICE '====================================';
    RAISE NOTICE 'Payment tables removed: %', v_payment_tables;
    RAISE NOTICE 'Notification tables removed: %', v_notification_tables;
    RAISE NOTICE 'Total tables removed: %', v_total_removed;
    RAISE NOTICE '';
    RAISE NOTICE 'Database is now fully consolidated!';
    RAISE NOTICE '====================================';
END $$;

COMMIT;