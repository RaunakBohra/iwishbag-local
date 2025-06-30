-- Remove unused tables that are not being used in the application
-- This will clean up the database schema and improve performance

-- Drop unused tables in dependency order
DROP TABLE IF EXISTS public.user_wishlist_items CASCADE;
DROP TABLE IF EXISTS public.referral_rewards CASCADE;
DROP TABLE IF EXISTS public.referrals CASCADE;
DROP TABLE IF EXISTS public.user_memberships CASCADE;
DROP TABLE IF EXISTS public.membership_tiers CASCADE;
DROP TABLE IF EXISTS public.order_tracking_events CASCADE;
DROP TABLE IF EXISTS public.tracking_templates CASCADE;
DROP TABLE IF EXISTS public.audit_logs CASCADE;
DROP TABLE IF EXISTS public.order_workflow_steps CASCADE;
DROP TABLE IF EXISTS public.notification_preferences CASCADE;
DROP TABLE IF EXISTS public.notifications CASCADE;
DROP TABLE IF EXISTS public.rejection_reasons CASCADE;
DROP TABLE IF EXISTS public.customs_categories CASCADE;

-- Note: payment_gateways table is kept as it might be used in future payment integrations
-- Note: message-attachments table is kept as it's referenced in messaging system 