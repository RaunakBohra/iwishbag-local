-- Comprehensive cleanup of remaining unused database objects

-- Drop backup table
DROP TABLE IF EXISTS public.tax_backup_20250128 CASCADE;

-- Drop MFA-related functions
DROP FUNCTION IF EXISTS public.disable_mfa() CASCADE;
DROP FUNCTION IF EXISTS public.create_mfa_session_after_setup() CASCADE;
DROP FUNCTION IF EXISTS public.get_mfa_status() CASCADE;
DROP FUNCTION IF EXISTS public.handle_mfa_failure() CASCADE;
DROP FUNCTION IF EXISTS public.requires_mfa() CASCADE;
DROP FUNCTION IF EXISTS public.setup_mfa() CASCADE;
DROP FUNCTION IF EXISTS public.verify_mfa_login() CASCADE;
DROP FUNCTION IF EXISTS public.verify_mfa_setup() CASCADE;

-- Drop OAuth-related functions
DROP FUNCTION IF EXISTS public.cleanup_expired_oauth_tokens() CASCADE;
DROP FUNCTION IF EXISTS public.ensure_user_profile_with_oauth() CASCADE;
DROP FUNCTION IF EXISTS public.extract_oauth_phone_to_auth_users() CASCADE;
DROP FUNCTION IF EXISTS public.extract_oauth_user_info() CASCADE;

-- Drop analytics/performance functions if not used
-- Keeping analyze_tax_method_performance as it might be used for tax calculations

-- Note: We cannot drop auth schema MFA tables as they are managed by Supabase
-- But they are empty and not being used in our application