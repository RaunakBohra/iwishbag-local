-- Drop unused tables and related objects

-- Drop MFA related tables (feature removed)
DROP TABLE IF EXISTS public.mfa_configurations CASCADE;
DROP TABLE IF EXISTS public.mfa_sessions CASCADE;
DROP TABLE IF EXISTS public.mfa_activity_log CASCADE;

-- Drop OAuth related tables (not being used)
DROP TABLE IF EXISTS public.oauth_tokens CASCADE;
DROP TABLE IF EXISTS public.user_oauth_data CASCADE;

-- Drop email queue (email templates feature removed)
DROP TABLE IF EXISTS public.email_queue CASCADE;

-- Drop campaign and segmentation tables (not being used)
DROP TABLE IF EXISTS public.campaign_triggers CASCADE;
DROP TABLE IF EXISTS public.user_segments CASCADE;
DROP TABLE IF EXISTS public.customer_segment_assignments CASCADE;

-- Drop any functions related to these tables
DROP FUNCTION IF EXISTS public.cleanup_expired_mfa_sessions() CASCADE;
DROP FUNCTION IF EXISTS public.cleanup_old_webhook_logs() CASCADE;

-- Remove from Supabase types as well
-- Note: Types will need to be regenerated after this migration